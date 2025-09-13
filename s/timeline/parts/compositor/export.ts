import {TimelineFile} from "../basics.js"
import {context} from "../../../context.js"
import {fixedStep} from "./parts/schedulers.js"
import {makeWebCodecsSampler} from "./samplers/webcodecs.js"
import {DecoderSource} from "../../../driver/fns/schematic.js"
import {buildWebCodecsNodeTree} from "./parts/webcodecs-tree.js"

export class Export {
	#sampler
	constructor(
		private framerate = 30,
		private resolveMedia: (hash: string) => DecoderSource = _hash => "/assets/temp/gl.mp4"
	) {
		this.#sampler = makeWebCodecsSampler(this.resolveMedia)
	}

	async #build(timeline: TimelineFile) {
		const rootItem = new Map(timeline.items.map(i => [i.id, i])).get(timeline.root)!
		const items = new Map(timeline.items.map(i => [i.id, i]))
		return await buildWebCodecsNodeTree(rootItem, items, this.#sampler)
	}

	async render(timeline: TimelineFile) {
		const root = await this.#build(timeline)

		const driver = await context.driver
		const videoStream = new TransformStream<VideoFrame, VideoFrame>()
		const audioStream = new TransformStream<AudioData, AudioData>()

		const encodePromise = driver.encode({
			video: videoStream.readable,
			audio: audioStream.readable,
			config: {
				audio: {codec: "opus", bitrate: 128000},
				video: {codec: "vp9", bitrate: 1000000},
			},
		})

		const videoWriter = videoStream.writable.getWriter()
		const audioWriter = audioStream.writable.getWriter()

		const audioPromise = (async () => {
			if (root.audio) {
				for await (const chunk of root.audio.getStream()) {
					await audioWriter.write(chunk)
				}
			}
			await audioWriter.close()
		})()

		const videoPromise = (async () => {
			let i = 0
			const dt = 1 / this.framerate

			await fixedStep(
				{fps: this.framerate, duration: root.duration ?? 0},
				async t => {
					const layers = await root.visuals?.sampleAt(t) ?? []
					const composed = await driver.composite(layers)
					const vf = new VideoFrame(composed, {
						timestamp: Math.round(i * dt * 1_000_000),
						duration: Math.round(dt * 1_000_000),
					})
					await videoWriter.write(vf)
					composed.close()
					i++
				}
			)
			await videoWriter.close()
		})()

		await audioPromise
		await videoPromise
		await encodePromise
		// this.#sampler.dispose()
	}
}
