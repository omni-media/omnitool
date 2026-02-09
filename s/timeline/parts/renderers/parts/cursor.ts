
import {Item} from "../../item.js"
import {Sampler} from "./sampler.js"
import {TimelineFile} from "../../basics.js"
import {ms, Ms} from "../../../../units/ms.js"
import {Driver} from "../../../../driver/driver.js"

/**
 * forward-only frame cursor for a single clip instance.
 * it uses mediabunny internally so the support for non-clients
 * should be done from mediabunny custom decoder/encoder
 */

export class VideoCursor {
	#sampler = new Sampler(async (item, localTime, matrix) => {
		const mediaTime = toUs(ms(item.start + localTime))
		const cursor = this.#getCursorForVideo(item)
		const frame = await cursor.next(mediaTime)
		return frame
			? [{ kind: "image", frame, matrix, id: item.id }]
			: []
	})

	#videoCursors = new Map<number, VideoFrameCursor>()

	constructor(
		private driver: Driver,
		private resolveMedia: (hash: string) => any
	) { }

	#getCursorForVideo(videoItem: Item.Video) {
		const existing = this.#videoCursors.get(videoItem.id)
		if (existing)
			return existing

		const source = this.resolveMedia(videoItem.mediaHash)
		const video = this.driver.decodeVideo({ source })
		const cursor = this.#cursor(video.getReader())

		this.#videoCursors.set(videoItem.id, cursor)
		return cursor
	}

	// forward only
	#cursor(reader: ReadableStreamDefaultReader<VideoFrame>) {
		return {
			async next(targetUs: number): Promise<VideoFrame | undefined> {
				let prev: VideoFrame | null = null
				while (true) {
					const { done, value: hit } = await reader.read()

					if (done) {
						const out = prev ? new VideoFrame(prev) : undefined
						prev?.close()
						return out
					}

					const hitUs = hit.timestamp ?? 0
					if (hitUs >= targetUs) {
						const prevUs = prev?.timestamp ?? Number.NEGATIVE_INFINITY
						const usePrev = !!prev && Math.abs(prevUs - targetUs) < Math.abs(hitUs - targetUs)

						const chosen = usePrev ? prev! : hit
						const other = usePrev ? hit : prev

						const copy = new VideoFrame(chosen)
						chosen.close()
						other?.close()
						return copy
					}

					prev?.close()
					prev = hit
				}
			},

			cancel: async () => await reader.cancel()
		}
	}

	cursor(timeline: TimelineFile) {
		return {
			next: (timecode: Ms) => this.#sampler.sample(timeline, timecode)
		}
	}
}

const toUs = (ms: Ms) => Math.round(ms * 1_000)

type StreamCursor<T> = {
	next(target: number): Promise<T | undefined>
	cancel(): Promise<void>
}

type VideoFrameCursor = StreamCursor<VideoFrame>


