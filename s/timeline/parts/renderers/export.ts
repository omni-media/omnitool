
import {Item} from "../item.js"
import {I6} from "../../utils/matrix.js"
import {TimelineFile} from "../basics.js"
import {fps} from "../../../units/fps.js"
import {VideoCursor} from "./parts/cursor.js"
import {fixedStep} from "./parts/schedulers.js"
import {Driver} from "../../../driver/driver.js"
import {seconds} from "../../../units/seconds.js"
import {AudioStream} from "./parts/streams/audio.js"
import {computeTimelineDuration, walk} from "./parts/handy.js"
import {DecoderSource} from "../../../driver/fns/schematic.js"

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
		const items = new Map(timeline.items.map(item => [item.id, item]))

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
			const audioItems: Item.Audio[] = []
			walk(
				timeline.rootId,
				items,
				I6,
				{
					audio: item => audioItems.push(item)
				}
			)

			for (const item of audioItems) {
				const source = this.resolveMedia(item.mediaHash)
				const start = seconds(item.start / 1000)
				const end = seconds((item.start + item.duration) / 1000)

				const audio = this.driver.decodeAudio({ source, start, end })
				const stream = new AudioStream(audio.getReader())

				for await (const chunk of stream.stream()) {
					await audioWriter.write(chunk)
				}
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
	}
}

