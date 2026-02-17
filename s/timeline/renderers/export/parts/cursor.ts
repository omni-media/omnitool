
import {ms, Ms} from "../../../../units/ms.js"
import {Item} from "../../../parts/item.js"
import {Driver} from "../../../../driver/driver.js"
import {TimelineFile} from "../../../parts/basics.js"
import {LayerSampler} from "../../parts/samplers/visual/sampler.js"
import {DecoderSource} from "../../../../driver/fns/schematic.js"

/**
 * forward-only frame cursor optimized for export purposes.
 * it uses mediabunny internally so the support for non-clients
 * should be done from mediabunny custom decoder/encoder
 */

export class CursorLayerSampler {
	#sampler: LayerSampler
	#videoCursors = new Map<number, VideoFrameCursor>()

	constructor(
		private driver: Driver,
		private resolveMedia: (hash: string) => DecoderSource
	) {
		this.#sampler = new LayerSampler(resolveMedia, (item, time) => {
			const mediaTime = toUs(ms(item.start + time))
			const cursor = this.#getCursorForVideo(item)
			return cursor.next(mediaTime)
		})
	}

	cursor(timeline: TimelineFile) {
		return {
			next: (timecode: Ms) => this.#sampler.sample(timeline, timecode),
			cancel: () => this.#cancel(),
		}
	}

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

	async #cancel() {
		await Promise.all(
			[...this.#videoCursors.values()].map(cursor => cursor.cancel())
		)
		this.#videoCursors.clear()
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
}

const toUs = (ms: Ms) => Math.round(ms * 1_000)

type StreamCursor<T> = {
	next(target: number): Promise<T | undefined>
	cancel(): Promise<void>
}

type VideoFrameCursor = StreamCursor<VideoFrame>

