
import {ms} from '../../../units/ms.js'
import {Sampler} from './parts/sampler.js'
import {TimelineFile} from '../basics.js'
import {fps} from '../../../units/fps.js'
import {AudioMix} from './parts/audio-mix.js'
import {VideoCursor} from './parts/cursor.js'
import {fixedStep} from './parts/schedulers.js'
import {Driver} from '../../../driver/driver.js'
import {resampleToPlanar} from './parts/resamplers.js'
import {applyGainToPlanar} from './parts/audio-gain.js'
import {computeTimelineDuration } from './parts/handy.js'
import {DecoderSource} from '../../../driver/fns/schematic.js'

export class Export {
	#cursor

	constructor(
		private driver: Driver,
		private resolveMedia: (hash: string) => DecoderSource
	) {
		this.#cursor = new VideoCursor(driver, resolveMedia)
	}

	async render(timeline: TimelineFile, framerate: number) {
		const frameRate = fps(framerate)
		const cursor = this.#cursor.cursor(timeline)
		const sampler = new Sampler(this.resolveMedia)

		const videoStream = new TransformStream<VideoFrame, VideoFrame>()
		const audioStream = new TransformStream<AudioData, AudioData>()

		const encodePromise = this.driver.encode({
			video: videoStream.readable,
			audio: audioStream.readable,
			config: {
				audio: {codec: 'opus', bitrate: 128000},
				video: {codec: 'vp9', bitrate: 1000000}
			}
		})

		const videoWriter = videoStream.writable.getWriter()
		const audioWriter = audioStream.writable.getWriter()

		const audioPromise = (async () => {
			const mixer = new AudioMix()
			const inputs = (async function* () {
				for await (const {sample, timestamp, gain} of sampler.sampleAudio(timeline, ms(0))) {
					const {data} = resampleToPlanar(sample, 48000)
					applyGainToPlanar(data, gain)
					yield {
						planes: data,
						sampleRate: 48000,
						timestamp
					}
					sample.close()
				}
			})()

			for await (const chunk of mixer.mix(inputs)) {
				const data = new AudioData({
					format: 'f32-planar',
					sampleRate: chunk.sampleRate,
					numberOfFrames: chunk.frames,
					numberOfChannels: chunk.channels,
					timestamp: Math.round((chunk.startFrame / chunk.sampleRate) * 1_000_000),
					data: new Float32Array(chunk.planar)
				})
				await audioWriter.write(data)
			}

			await audioWriter.close()
		})()

		const videoPromise = (async () => {
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
	}
}

