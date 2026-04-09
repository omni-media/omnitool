
import {ms, Ms} from "../../../../units/ms.js"
import {Driver} from "../../../../driver/driver.js"
import {TimelineFile} from "../../../parts/basics.js"
import {DecoderSource} from "../../../../driver/fns/schematic.js"
import {createVisualSampler} from "../../parts/samplers/visual/sampler.js"

/**
 * forward-only frame cursor optimized for export purposes.
 * it uses mediabunny internally so the support for non-clients
 * should be done from mediabunny custom decoder/encoder
 */

export class CursorVisualSampler {
	#lastTimecode = -Infinity
	#videoCursors = new Map<number, VideoFrameCursor>()
	#sampler

	constructor(
		private driver: Driver,
		private resolveMedia: (hash: string) => DecoderSource,
		private timeline: TimelineFile
	) {
		this.#sampler = createVisualSampler(this.resolveMedia, (item, time) => {
			const targetUs = toUs(time)
			let cursor = this.#videoCursors.get(item.id)

			if (!cursor) {
				const source = this.resolveMedia(item.mediaHash)
				const endUs = toUs(ms(item.start + item.duration))
				cursor = this.#createVideoCursor(source, targetUs, endUs)
				this.#videoCursors.set(item.id, cursor)
			}

			return cursor.next(targetUs)
		})
	}

	next(timecode: Ms) {
		if (timecode < this.#lastTimecode)
			throw new Error(`Forward-only cursor regression: ${timecode}ms < ${this.#lastTimecode}ms`)

		this.#lastTimecode = timecode
		return this.#sampler.sample(this.timeline, timecode)
	}

	async cancel() {
		await Promise.all([...this.#videoCursors.values()].map(c => c.cancel()))
		this.#videoCursors.clear()
	}

	#createVideoCursor(source: DecoderSource, startUs: number, endUs: number): VideoFrameCursor {
		const video = this.driver.decodeVideo({source, start: startUs / 1_000_000, end: endUs / 1_000_000})
		const reader = video.readable.getReader()

		let current: VideoFrame | null = null
		let nextPromise: Promise<VideoFrame | null> | null = null
		let ended = false

		const readNext = async () => {
			if (ended) return null
			const {done, value} = await reader.read()
			if (done) return (ended = true, null)

			const frame = new VideoFrame(value)
			value.close()
			return frame
		}

		return {
			async next(targetUs: number): Promise<VideoFrame | undefined> {
				current ??= await readNext()
				if (!current) return undefined

				while (true) {
					nextPromise ??= readNext()
					const nextFrame = await nextPromise

					if (!nextFrame) return new VideoFrame(current)

					const currentUs = current.timestamp ?? -Infinity
					const nextUs = nextFrame.timestamp ?? currentUs

					if (nextUs < targetUs) {
						current.close()
						current = nextFrame
						nextPromise = null
						continue
					}

					const useNext = Math.abs(nextUs - targetUs) < Math.abs(currentUs - targetUs)

					if (useNext) {
						current.close()
						current = nextFrame
						nextPromise = null
						continue
					}

					return new VideoFrame(current)
				}
			},

			async cancel() {
				const pending = nextPromise
				nextPromise = null
				ended = true

				const buffered = await pending?.catch(() => null)
				buffered?.close()

				current?.close()
				current = null

				video.cancel()
			}
		}
	}
}

const toUs = (ms: Ms) => Math.round(ms * 1_000)

type StreamCursor<T> = {
	next(target: number): Promise<T | undefined>
	cancel(): Promise<void>
}

type VideoFrameCursor = StreamCursor<VideoFrame>

