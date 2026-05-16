
import {ALL_FORMATS, Input, VideoSampleSink} from "mediabunny"

import {ms, Ms} from "../../../../units/ms.js"
import {Driver} from "../../../../driver/driver.js"
import {TimelineFile} from "../../../parts/basics.js"
import {DecoderSource} from "../../../../driver/fns/schematic.js"
import {loadDecoderSource} from "../../../../driver/utils/load-decoder-source.js"
import {createVisualSampler} from "../../parts/samplers/visual/sampler.js"

type StreamCursor<T> = {
	next(target: number): Promise<T | undefined>
	cancel(): Promise<void>
}

type VideoFrameCursor = StreamCursor<VideoFrame>

abstract class BaseVisualSampler {
	readonly #videoCursors = new Map<number, VideoFrameCursor>()
	readonly #sampler

	constructor(
		protected driver: Driver,
		protected resolveMedia: (hash: string) => DecoderSource,
		protected timeline: TimelineFile
	) {
		this.#sampler = createVisualSampler(this.resolveMedia, (item, time) => {
			const targetUs = toUs(time)
			let cursor = this.#videoCursors.get(item.id)

			if (!cursor) {
				const source = this.resolveMedia(item.mediaHash)
				const endUs = toUs(ms(item.start + item.duration))
				cursor = this.createCursor(source, targetUs, endUs)
				this.#videoCursors.set(item.id, cursor)
			}

			return cursor.next(targetUs)
		})
	}

	protected abstract createCursor(source: DecoderSource, startUs: number, endUs: number): VideoFrameCursor

	protected sample(timecode: Ms) {
		return this.#sampler.sample(this.timeline, timecode)
	}

	async cancel() {
		await Promise.all([...this.#videoCursors.values()].map(c => c.cancel()))
		this.#videoCursors.clear()
	}
}

/**
 * forward-only frame cursor optimized for export purposes.
 * it uses mediabunny internally so the support for non-clients
 * should be done from mediabunny custom decoder/encoder
 */

export class CursorVisualSampler extends BaseVisualSampler {
	#lastTimecode = -Infinity

	next(timecode: Ms) {
		if (timecode < this.#lastTimecode)
			throw new Error(`Forward-only cursor regression: ${timecode}ms < ${this.#lastTimecode}ms`)

		this.#lastTimecode = timecode
		return this.sample(timecode)
	}

	protected createCursor(source: DecoderSource, startUs: number, endUs: number): VideoFrameCursor {
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

export class ReverseCursorVisualSampler extends BaseVisualSampler {
	#lastTimecode = Infinity

	next(timecode: Ms) {
		if (timecode > this.#lastTimecode)
			throw new Error(`Reverse-only cursor regression: ${timecode}ms > ${this.#lastTimecode}ms`)

		this.#lastTimecode = timecode
		return this.sample(timecode)
	}

	protected createCursor(source: DecoderSource, _initialTargetUs: number, endUs: number): VideoFrameCursor {
		const startUs = 0
		const windowUs = 1_000_000
		const prefetchThreshold = windowUs * 0.5

		let frames: VideoFrame[] = []
		let windowStart = Infinity
		let windowEnd = -Infinity
		let input: Input | null = null
		let sink: VideoSampleSink | null = null
		let prefetchPromise: Promise<{frames: VideoFrame[], windowStart: number, windowEnd: number}> | null = null
		let activeFetches = 0
		let idle: Promise<void> = Promise.resolve()
		let resolveIdle: (() => void) | null = null
		let canceled = false

		const clear = () => {
			for (const frame of frames)
				frame.close()
			frames = []
		}

		const startFetch = () => {
			if (activeFetches++ === 0)
				idle = new Promise<void>(resolve => resolveIdle = resolve)
		}

		const endFetch = () => {
			if (--activeFetches === 0) {
				resolveIdle?.()
				resolveIdle = null
			}
		}

		const getSink = async () => {
			if (sink) return sink

			input = new Input({
				source: await loadDecoderSource(source),
				formats: ALL_FORMATS,
			})

			const track = await input.getPrimaryVideoTrack()
			sink = track && await track.canDecode()
				? new VideoSampleSink(track)
				: null

			return sink
		}

		const fetchFrames = async (targetUs: number) => {
			startFetch()
			const wEnd = Math.min(endUs, targetUs + 1)
			const wStart = Math.max(startUs, wEnd - windowUs)
			const newFrames: VideoFrame[] = []

			const videoSink = await getSink()
			if (videoSink) {
				for await (const sample of videoSink.samples(wStart / 1_000_000, wEnd / 1_000_000)) {
					newFrames.push(sample.toVideoFrame())
					sample.close()
				}
			}

			endFetch()
			return {frames: newFrames, windowStart: wStart, windowEnd: wEnd}
		}

		const loadWindow = async (targetUs: number) => {
			clear()
			const result = await fetchFrames(targetUs)
			frames = result.frames
			windowStart = result.windowStart
			windowEnd = result.windowEnd
		}

		return {
			async next(targetUs: number): Promise<VideoFrame | undefined> {
				if (canceled)
					return undefined

				if (targetUs < windowStart || targetUs > windowEnd) {
					if (prefetchPromise) {
						const prefetched = await prefetchPromise
						prefetchPromise = null

						if (canceled) {
							for (const f of prefetched.frames) f.close()
							return undefined
						}

						if (targetUs >= prefetched.windowStart && targetUs <= prefetched.windowEnd) {
							clear()
							frames = prefetched.frames
							windowStart = prefetched.windowStart
							windowEnd = prefetched.windowEnd
						} else {
							for (const f of prefetched.frames) f.close()
							await loadWindow(targetUs)
						}
					} else {
						await loadWindow(targetUs)
					}
				}

				if (!prefetchPromise && targetUs < windowStart + prefetchThreshold && windowStart > startUs)
					prefetchPromise = fetchFrames(windowStart - 1)

				let best: VideoFrame | undefined
				let bestDistance = Infinity

				for (const frame of frames) {
					const distance = Math.abs((frame.timestamp ?? targetUs) - targetUs)
					if (distance < bestDistance) {
						best = frame
						bestDistance = distance
					}
				}

				return best ? new VideoFrame(best) : undefined
			},

			async cancel() {
				canceled = true
				const pending = prefetchPromise
				prefetchPromise = null

				const prefetched = await pending?.catch(() => null)
				if (prefetched)
					for (const f of prefetched.frames) f.close()

				await idle
				clear()
				input?.dispose()
				input = null
				sink = null
			}
		}
	}
}

const toUs = (ms: Ms) => Math.round(ms * 1_000)
