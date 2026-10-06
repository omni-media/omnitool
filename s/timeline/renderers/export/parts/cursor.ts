
import {ALL_FORMATS, Input, VideoSampleSink} from "mediabunny"

import {ms, Ms} from "../../../../units/ms.js"
import {Item, Kind} from "../../../parts/item.js"
import {Driver} from "../../../../driver/driver.js"
import {Id, TimelineFile} from "../../../parts/basics.js"
import {DecoderSource} from "../../../../driver/fns/schematic.js"
import {itemsFrom, transitionDurationAfter} from "../../parts/handy.js"
import {createVisualSampler} from "../../parts/samplers/visual/sampler.js"
import {loadDecoderSource} from "../../../../driver/utils/load-decoder-source.js"

type VideoFrameCursor = {
	next(target: number): Promise<VideoFrame | undefined>
	cancel(): Promise<void>
}

abstract class BaseVisualSampler {
	protected readonly videoCursors = new Map<Id, {cursor: VideoFrameCursor, ready?: Promise<void>}>()
	readonly #sampler

	constructor(
		protected driver: Driver,
		protected resolveMedia: (hash: string) => DecoderSource,
		protected timeline: TimelineFile
	) {
		this.#sampler = createVisualSampler(this.resolveMedia, async (item, time) => {
			const targetUs = toUs(ms(item.start + time))
			const entry = this.getCursor(item, targetUs)
			await entry.ready
			return entry.cursor.next(targetUs)
		})
	}

	protected getCursor(item: Item.Video | Item.Clip, startUs: number) {
		let entry = this.videoCursors.get(item.id)
		if (!entry) {
			const source = this.resolveMedia(item.mediaHash)
			const endUs = toUs(ms(item.start + item.duration + transitionDurationAfter(this.timeline, item.id)))
			entry = {cursor: this.createCursor(source, startUs, endUs)}
			this.videoCursors.set(item.id, entry)
		}
		return entry
	}

	protected abstract createCursor(source: DecoderSource, startUs: number, endUs: number): VideoFrameCursor

	protected sample(timecode: Ms) {
		return this.#sampler.sample(this.timeline, timecode)
	}

	async cancel() {
		await Promise.all([...this.videoCursors.values()].map(({cursor}) => cursor.cancel()))
		this.videoCursors.clear()
	}
}

/**
 * forward-only frame cursor optimized for export purposes.
 * it uses mediabunny internally so the support for non-clients
 * should be done from mediabunny custom decoder/encoder
 */

export class CursorVisualSampler extends BaseVisualSampler {
	#lastTimecode = -Infinity
	#preparing: Promise<void> | null = null
	#canceled = false
	#upcoming = upcomingVideos(this.timeline)

	next(timecode: Ms) {
		if (timecode < this.#lastTimecode)
			throw new Error(`Forward-only cursor regression: ${timecode}ms < ${this.#lastTimecode}ms`)

		this.#lastTimecode = timecode
		for (const {item, end} of this.#upcoming) {
			const entry = end <= timecode && this.videoCursors.get(item.id)
			if (!entry) continue
			this.videoCursors.delete(item.id)
			entry.cursor.cancel().catch(error => console.error("Video cursor cleanup failed", error))
		}
		if (!this.#preparing && !this.#canceled) {
			this.#preparing = this.#prepareAhead()
				.catch(error => console.error("Video lookahead preparation failed", error))
				.finally(() => this.#preparing = null)
		}
		return this.sample(timecode)
	}

	async #prepareAhead() {
		while (!this.#canceled) {
			const next = this.#upcoming.find(({item, start}) => start > this.#lastTimecode &&
				start <= this.#lastTimecode + 500 && !this.videoCursors.has(item.id))
			if (!next) return
			const targetUs = toUs(ms(next.mediaStart))
			const entry = this.getCursor(next.item, targetUs)
			entry.ready = entry.cursor.next(targetUs).then(frame => frame?.close())
			await entry.ready
		}
	}

	async cancel() {
		this.#canceled = true
		await super.cancel()
		await this.#preparing
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

			if (ended) {
				value.close()
				return null
			}

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
					if (!current) return undefined

					if (!nextFrame) return new VideoFrame(current)

					const currentUs = current.timestamp
					const nextUs = nextFrame.timestamp

					const useNext = nextUs < targetUs ||
						Math.abs(nextUs - targetUs) < Math.abs(currentUs - targetUs)

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

				while (true) {
					const {done, value} = await reader.read()
					if (done) break
					value.close()
				}
				reader.releaseLock()
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

	protected createCursor(source: DecoderSource, startUs: number, endUs: number): VideoFrameCursor {
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
					const distance = Math.abs(frame.timestamp - targetUs)
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

type UpcomingVideo = {
	item: Item.Video | Item.Clip
	start: number
	end: number
	mediaStart: number
}

const upcomingVideos = (timeline: TimelineFile): UpcomingVideo[] => {
	const items = new Map(timeline.items.map(item => [item.id, item]))
	const incomingHandles = new Map<Id, number>()

	for (const sequence of timeline.items.filter(item => item.kind === Kind.Sequence)) {
		for (const [index, id] of sequence.childrenIds.entries()) {
			const previous = items.get(sequence.childrenIds[index - 1])
			if (previous?.kind === Kind.Transition && previous.enabled !== false)
				incomingHandles.set(id, previous.duration)
		}
	}

	const upcoming: UpcomingVideo[] = []

	for (const {item, timelineStart, ancestors} of itemsFrom({timeline, from: ms(0)})) {
		if (
			(item.kind !== Kind.Video && item.kind !== Kind.Clip) ||
			item.duration <= 0 ||
			item.enabled === false ||
			ancestors.some(({item}) => item.enabled === false)
		)
			continue

		const handle = incomingHandles.get(item.id) ?? 0
		const ancestorHandles = ancestors.reduce(
			(duration, {item}) => duration + transitionDurationAfter(timeline, item.id),
			0
		)

		upcoming.push({
			item,
			start: timelineStart - handle,
			end: timelineStart + item.duration + transitionDurationAfter(timeline, item.id) + ancestorHandles,
			mediaStart: Math.max(0, item.start - handle)
		})
	}

	return upcoming.sort((a, b) => a.start - b.start)
}

