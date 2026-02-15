
import {Item} from "../../item.js"
import {LayerSampler} from "./sampler.js"
import {TimelineFile} from "../../basics.js"
import {ms, Ms} from "../../../../units/ms.js"
import {Driver} from "../../../../driver/driver.js"
import {Mat6} from "../../../utils/matrix.js"
import {DecoderSource, Layer} from "../../../../driver/fns/schematic.js"

/**
 * forward-only frame cursor optimized for export purposes.
 * it uses mediabunny internally so the support for non-clients
 * should be done from mediabunny custom decoder/encoder
 */

class CursorLayerSampler extends LayerSampler {
	#videoCursors = new Map<number, VideoFrameCursor>()

	constructor(
		private driver: Driver,
		private resolveMediaFn: (hash: string) => DecoderSource
	) {
		super(resolveMediaFn)
	}

	#getCursorForVideo(videoItem: Item.Video) {
		const existing = this.#videoCursors.get(videoItem.id)
		if (existing)
			return existing

		const source = this.resolveMediaFn(videoItem.mediaHash)
		const video = this.driver.decodeVideo({ source })
		const cursor = this.#cursor(video.getReader())

		this.#videoCursors.set(videoItem.id, cursor)
		return cursor
	}

	async video(
		item: Item.Video,
		time: Ms,
		matrix: Mat6
	): Promise<Layer[]> {
		const mediaTime = toUs(ms(item.start + time))
		const cursor = this.#getCursorForVideo(item)
		const frame = await cursor.next(mediaTime)
		return frame
			? [{ kind: "image", frame, matrix, id: item.id }]
			: []
	}

	async cancel() {
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

export class VideoCursor {
	#sampler: CursorLayerSampler

	constructor(
		driver: Driver,
		resolveMedia: (hash: string) => DecoderSource
	) {
		this.#sampler = new CursorLayerSampler(driver, resolveMedia)
	}

	cursor(timeline: TimelineFile) {
		return {
			next: (timecode: Ms) => this.#sampler.sample(timeline, timecode),
			cancel: () => this.#sampler.cancel(),
		}
	}
}

const toUs = (ms: Ms) => Math.round(ms * 1_000)

type StreamCursor<T> = {
	next(target: number): Promise<T | undefined>
	cancel(): Promise<void>
}

type VideoFrameCursor = StreamCursor<VideoFrame>
