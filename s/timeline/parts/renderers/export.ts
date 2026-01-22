import {TimelineFile} from "../basics.js"
import {fps} from "../../../units/fps.js"
import {fixedStep} from "./parts/schedulers.js"
import {Driver} from "../../../driver/driver.js"
import {makeWebCodecsSampler} from "./samplers/webcodecs.js"
import {DecoderSource} from "../../../driver/fns/schematic.js"
import {buildWebCodecsNodeTree} from "./parts/webcodecs-tree.js"

export class Export {
	#sampler
	constructor(
		private driver: Driver,
		private resolveMedia: (hash: string) => DecoderSource
	) {
		this.#sampler = makeWebCodecsSampler(this.driver, this.resolveMedia)
	}

	async #build(timeline: TimelineFile) {
		const rootItem = new Map(timeline.items.map(i => [i.id, i])).get(timeline.rootId)!
		const items = new Map(timeline.items.map(i => [i.id, i]))
		return await buildWebCodecsNodeTree(rootItem, items, this.#sampler)
	}

	async render(timeline: TimelineFile, framerate: number) {
		const root = await this.#build(timeline)
		const frameRate = fps(framerate)

		const videoStream = new TransformStream<VideoFrame, VideoFrame>()
		const audioStream = new TransformStream<AudioData, AudioData>()

		const encodePromise = this.driver.encode({
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
			const dt = 1 / frameRate

			await fixedStep(
				{fps: frameRate, duration: root.duration},
				async t => {
					const layers = await root.visuals?.sampleAt(t) ?? []
					const composed = await this.driver.composite(layers)
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
