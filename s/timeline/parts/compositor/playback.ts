import {TimelineFile} from "../basics.js"
import {context} from "../../../context.js"
import {realtime} from "./parts/schedulers.js"
import {makeHtmlSampler} from "./samplers/html.js"
import {buildHTMLNodeTree} from "./parts/html-tree.js"
import {DecoderSource} from "../../../driver/fns/schematic.js"
import {AudioPlaybackComponent, HTMLSampler, Node} from "./parts/tree-builder.js"

type ResolveMedia = (hash: string) => DecoderSource

export class VideoPlayer {
	#controller = realtime(t => this.#tick(t))

	constructor(
		public canvas: HTMLCanvasElement,
		private root: Node<AudioPlaybackComponent>,
		private sampler: HTMLSampler,
		private resolveMedia: ResolveMedia = _hash => "/assets/temp/gl.mp4"
	) {
		this.#controller.setFPS(30)
	}

	get context() {
		return this.canvas.getContext("2d")!
	}

	static async create(timeline: TimelineFile) {
		const rootItem = new Map(timeline.items.map(i => [i.id, i])).get(timeline.rootId)!
		const items = new Map(timeline.items.map(i => [i.id, i]))
		const sampler = makeHtmlSampler(() => "/assets/temp/gl.mp4")
		const root = await buildHTMLNodeTree(rootItem, items, sampler)
		const canvas = document.createElement("canvas")
		canvas.width = 1920
		canvas.height = 1080
		return new this(canvas, root, sampler)
	}

	async #tick(t: number) {
		const driver = await context.driver
		const dur = this.root.duration
		const tt = t > dur ? dur : t
		this.root.audio?.onTimeUpdate(tt)
		for (const layer of await this.root.visuals?.sampleAt(tt) ?? []) {
			const frame = await driver.composite(layer)
			this.context.drawImage(frame, 0, 0)
			frame.close()
		}
		if (t >= dur) this.pause()
	}

	async play() {
		if (!this.#controller.isPlaying()) {
			this.sampler.setPaused!(false)
			this.#controller.play()
		}
	}

	pause() {
		if(this.#controller.isPlaying()) {
			this.#controller.pause()
			this.sampler.setPaused!(true)
		}
	}

	async seek(time: number) {
		const driver = await context.driver
		this.pause()
		this.#controller.seek(time)
		this.root.audio?.onTimeUpdate(time)
		for (const draw of await this.root.visuals?.sampleAt(time) ?? []) {
			const frame = await driver.composite(draw)
			this.context.drawImage(frame, 0, 0)
			frame.close()
		}
	}

	setFPS(value: number) {
		this.#controller.setFPS(value)
	}
}

