import {TimelineFile} from "../basics.js"
import {context} from "../../../context.js"
import {Sampler} from "./parts/node-tree.js"
import {fixedStep} from "./parts/schedulers.js"
import {TimelineEngine} from "./parts/engine.js"
import {makeWebCodecsSampler} from "./samplers/webcodecs.js"
import {DecoderSource, Layer} from "../../../driver/fns/schematic.js"

export class Compositor extends TimelineEngine<Layer> {
	#sampler!: Sampler<Layer>

	constructor(
		private framerate = 30,
		private resolveMedia: (hash: string) => DecoderSource = _hash => "/assets/temp/gl.mp4"
	) {super()}

	protected sampler() {
		this.#sampler =  makeWebCodecsSampler(this.resolveMedia)
		return this.#sampler
	}

	async render(timeline: TimelineFile) {
		await this.load(timeline)

		const driver = await context.driver
		const videoStream = new TransformStream<VideoFrame, VideoFrame>()
		const audioStream = new TransformStream<AudioData, AudioData>()

		const encodePromise = driver.encode({
			readables: {video: videoStream.readable, audio: audioStream.readable},
			config: {
				audio: {codec: "opus", bitrate: 128000},
				video: {codec: "vp9", bitrate: 1000000},
			},
		})

		const videoWriter = videoStream.writable.getWriter()
		const audioWriter = audioStream.writable.getWriter()

		let i = 0
		const dt = 1 / this.framerate

		await fixedStep(
			{fps: this.framerate, duration: this.duration},
			async t => {
				const layers = await this.sampleAt(t)
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
		await Promise.allSettled([
			videoWriter.close(),
			audioWriter.close(),
			encodePromise,
			this.#sampler.dispose()
		])
	}
}
