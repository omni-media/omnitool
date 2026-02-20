
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

		const encode = this.driver.encode({
			video: videoStream.readable,
			audio: audioStream.readable,
			config: {
				audio: {codec: 'opus', bitrate: 128000},
				video: {codec: 'vp9', bitrate: 1000000}
			}
		})

		const audio = this.#produceAudio(timeline, audioWriter)
		const video = this.#produceVideo(timeline, frameRate, videoWriter)

		await Promise.all([
			audio,
			video,
			encode
		])
	}

	async #produceAudio(
		timeline: TimelineFile,
		writer: WritableStreamDefaultWriter<AudioData>
	) {
		const mixer = new AudioMix()
		const stream = this.#streamAudio(timeline)

		for await (const chunk of mixer.mix(stream)) {
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
		fps: Fps,
		writer: WritableStreamDefaultWriter<VideoFrame>
	) {
		const cursor = this.#cursor.cursor(timeline)
		const dt = 1 / fps
		const duration = computeTimelineDuration(timeline.rootId, timeline)

		await fixedStep({fps, duration}, async (timecode, i) => {
			const layers = await cursor.next(timecode)
			const composed = await this.driver.composite(layers)

			const frame = new VideoFrame(composed, {
				timestamp: Math.round(i * dt * 1_000_000),
				duration: Math.round(dt * 1_000_000)
			})

			await writer.write(frame)
			composed.close()
		})

		await writer.close()
	}

	async *#streamAudio(timeline: TimelineFile) {
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

