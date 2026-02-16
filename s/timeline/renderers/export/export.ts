
import {ms} from '../../../units/ms.js'
import {AudioMix} from './parts/audio-mix.js'
import {Fps, fps} from '../../../units/fps.js'
import {fixedStep} from '../parts/schedulers.js'
import {Driver} from '../../../driver/driver.js'
import {TimelineFile} from '../../parts/basics.js'
import {CursorLayerSampler} from './parts/cursor.js'
import {resampleToPlanar} from './parts/resamplers.js'
import {applyGainToPlanar} from './parts/audio-gain.js'
import {computeTimelineDuration} from '../parts/handy.js'
import {DecoderSource} from '../../../driver/fns/schematic.js'
import {AudioSampler} from '../parts/samplers/audio/sampler.js'

export class Export {
	#cursor

	constructor(
		private driver: Driver,
		private resolveMedia: (hash: string) => DecoderSource
	) {
		this.#cursor = new CursorLayerSampler(driver, resolveMedia)
	}

	async render(timeline: TimelineFile, framerate: number) {
		const frameRate = fps(framerate)

		const videoStream = new TransformStream<VideoFrame, VideoFrame>()
		const audioStream = new TransformStream<AudioData, AudioData>()

		const videoWriter = videoStream.writable.getWriter()
		const audioWriter = audioStream.writable.getWriter()

		const encodePromise = this.driver.encode({
			video: videoStream.readable,
			audio: audioStream.readable,
			config: {
				audio: {codec: 'opus', bitrate: 128000},
				video: {codec: 'vp9', bitrate: 1000000}
			}
		})

		const audioPromise = this.#produceAudio(timeline, audioWriter)
		const videoPromise = this.#produceVideo(timeline, frameRate, videoWriter)

		await audioPromise
		await videoPromise
		await encodePromise
	}

	async #produceAudio(
		timeline: TimelineFile,
		writer: WritableStreamDefaultWriter<AudioData>
	) {
		const mixer = new AudioMix()
		const inputs = this.makeAudioInputs(timeline)

		for await (const chunk of mixer.mix(inputs)) {
			const data = new AudioData({
				format: 'f32-planar',
				sampleRate: chunk.sampleRate,
				numberOfFrames: chunk.frames,
				numberOfChannels: chunk.channels,
				timestamp: Math.round(
					(chunk.startFrame / chunk.sampleRate) * 1_000_000
				),
				data: new Float32Array(chunk.planar)
			})

			await writer.write(data)
		}

		await writer.close()
	}

	async #produceVideo(
		timeline: TimelineFile,
		frameRate: Fps,
		writer: WritableStreamDefaultWriter<VideoFrame>
	) {
		const cursor = this.#cursor.cursor(timeline)
		let i = 0
		const dt = 1 / frameRate
		const duration = computeTimelineDuration(timeline.rootId, timeline)

		await fixedStep(
			{fps: frameRate, duration},
			async timecode => {
				const layers = await cursor.next(timecode)
				const composed = await this.driver.composite(layers)

				const vf = new VideoFrame(composed, {
					timestamp: Math.round(i * dt * 1_000_000),
					duration: Math.round(dt * 1_000_000)
				})

				await writer.write(vf)
				composed.close()
				i++
			}
		)
		await writer.close()
	}

	async *makeAudioInputs(timeline: TimelineFile) {
		const audioSampler = new AudioSampler(this.resolveMedia)

		for await (const {sample, timestamp, gain}
			of audioSampler.sampleAudio(timeline, ms(0))) {

			const {data} = resampleToPlanar(sample, 48000)
			applyGainToPlanar(data, gain)

			yield {
				planes: data,
				sampleRate: 48000,
				timestamp
			}

			sample.close()
		}
	}
}

