import {Item, Kind} from "./item.js"
import {TimelineFile} from "./basics.js"
import {context} from "../../context.js"
import {ClipCursor} from "../utils/clip-cursor.js"
import {Composition, Layer, DecoderSource} from "../../driver/fns/schematic.js"

type ItemNode = {
	duration: number
	sampleAt: (time: number) => Promise<Composition>
}

export class Compositor {
	private items: Item.Any[] = []
	private cursors = new Map<number, ClipCursor>()
 	canvas = document.createElement("canvas")
  ctx = this.canvas.getContext("2d")!

	constructor(
		private framerate = 30,
		private resolveMedia: (hash: string) => DecoderSource = _hash => "/assets/temp/gl.mp4",
	) {
 		this.canvas.width = 1920
    this.canvas.height = 1080
    document.body.appendChild(this.canvas)
	}

	async render(timeline: TimelineFile) {
		this.items = timeline.items

		const frameDurS = 1 / this.framerate
		const videoStream = new TransformStream<VideoFrame, VideoFrame>()
		const audioStream = new TransformStream<AudioData, AudioData>()

		const driver = await context.driver
		const encodePromise = driver.encode({
			readables: {video: videoStream.readable, audio: audioStream.readable},
			config: {
				audio: {codec: "opus", bitrate: 128000},
				video: {codec: "vp9", bitrate: 1000000}
			},
		})

		const videoWriter = videoStream.writable.getWriter()
		const audioWriter = audioStream.writable.getWriter()

		let frameCount = 0
		const root = this.#requireItem(timeline.root)
		for await (const composition of this.#stream(root)) {
			const tsUs = Math.round(frameCount * frameDurS * 1_000_000)
			const durUs = Math.round(frameDurS * 1_000_000)
			const composed = await driver.composite(composition)
			const stamped = new VideoFrame(composed, {timestamp: tsUs, duration: durUs})
			this.ctx.drawImage(stamped, 0, 0) // test by drawing
			await videoWriter.write(stamped)
			composed.close()
			frameCount++
		}
		await videoWriter.close()
		await audioWriter.close()
		await this.#cancelAllCursors()
		await encodePromise
	}

	async* #stream(root: Item.Any): AsyncGenerator<Composition> {
		const nodes = await this.#makeNodes(root)
		yield* this.#streamComposition(nodes)
	}

	async #makeNodes(node: Item.Any): Promise<ItemNode> {
		switch (node.kind) {
			case Kind.Text: {
				const layer: Layer = {kind: 'text', content: node.content, color: 'white', fontSize: 48}
				return {
					duration: 0,
					sampleAt: async _time => [layer]
				}
			}

			case Kind.Clip: {
				const cursor = await this.#cursorForClip(node)
				const baseUs = this.#toUs(node.start ?? 0)
				return {
					duration: node.duration,
					sampleAt: async time => {
						const frame = await cursor.atOrNear(baseUs + this.#toUs(time))
						return frame ? [{kind: 'image', frame}] : []
					},
				}
			}

			case Kind.Stack: {
				const childNodes = await Promise.all(node.children.map(id => this.#makeNodes(this.#requireItem(id))))
				return {
					duration: Math.max(0, ...childNodes.map(d => d.duration)),
					sampleAt: async time => (await Promise.all(childNodes.map(d => d.sampleAt(time)))).flat()
				}
			}

			case Kind.Sequence: {
				const childNodes = await Promise.all(
					node.children
						.map(id => this.#requireItem(id))
						.filter(item => item.kind !== Kind.Transition)
						.map(item => this.#makeNodes(item))
				)
				return {
					duration: childNodes.reduce((acc, d) => acc + d.duration, 0),
					sampleAt: async time => {
  					for (const node of childNodes) {
    					if (time < node.duration)
      					return await node.sampleAt(time)
    					time -= node.duration
  					}
  					return []
					},
				}
			}

			default:
				return {duration: 0, sampleAt: async _t => []}
		}
	}

	async* #streamComposition(node: ItemNode): AsyncGenerator<Composition> {
		const frameDurS = 1 / this.framerate
		const totalFrames = Math.max(0, Math.ceil(node.duration * this.framerate))
		for (let i = 0; i < totalFrames; i++) {
			const time = i * frameDurS
			yield await node.sampleAt(time)
		}
	}

	#requireItem = (id: number) => this.items.find(i => i.id === id)!
	#toUs = (seconds: number) => Math.round(seconds * 1_000_000)

	async #cursorForClip(clip: Item.Clip): Promise<ClipCursor> {
		const existing = this.cursors.get(clip.id)
		if (existing)
			return existing
		const driver = await context.driver
		const source = this.resolveMedia(clip.mediaHash)
		const {video} = driver.decode({source})
		const cursor = new ClipCursor(video.tee()[0].getReader())
		this.cursors.set(clip.id, cursor)
		return cursor
	}

	async #cancelAllCursors() {
		const tasks = Array.from(this.cursors.values(), c => c.cancel())
		this.cursors.clear()
		await Promise.all(tasks)
	}
}

