
import {ALL_FORMATS, AudioSample, AudioSampleSink, Input, VideoSampleSink} from "mediabunny"

import {ContainerItem, Item, Kind} from "../../item.js"
import {TimelineFile} from "../../basics.js"
import {ms, Ms} from "../../../../units/ms.js"
import {Mat6} from "../../../utils/matrix.js"
import {DecoderSource, Layer} from "../../../../driver/fns/schematic.js"
import {computeTimelineDuration, computeWorldMatrix, itemsFrom} from "./handy.js"
import {loadDecoderSource} from "../../../../driver/utils/load-decoder-source.js"

type SinkState = {
	input: Input
	videoSink?: VideoSampleSink | null
	audioSink?: AudioSampleSink | null
}

type AudioStreamState = {
	iter: AsyncGenerator<AudioSample>
	offsetSec: number
	gain: number
	current: AudioSample | null
	nextPromise: Promise<IteratorResult<AudioSample>> | null
}

export class Sampler {
	readonly #sinks = new Map<string, SinkState>()

	constructor(
		private resolveMedia: (hash: string) => DecoderSource
	) { }

	async sample(timeline: TimelineFile, timecode: Ms) {
		const items = new Map(timeline.items.map(item => [item.id, item]))
		const root = items.get(timeline.rootId)
		if (!root)
			return []

		return await this.#sampleItem(timeline, items, root, timecode, [])
	}

	async *sampleAudio(
		timeline: TimelineFile,
		from: Ms
	): AsyncGenerator<{
		sample: AudioSample
		timestamp: number
		gain: number
	}> {
		const timelineFromSec = from / 1000
		const items = itemsFrom({ timeline, from })

		const streams: AudioStreamState[] = []

		await Promise.all(items.map(async ({ item, localTime }) => {
			if (item.kind !== Kind.Audio)
				return

			const sink = await this.#getOrCreateSink(item.mediaHash)
			if (!sink?.audioSink)
				return

			const localTimeSec = (item.start + localTime) / 1000
			const offset = timelineFromSec - localTimeSec
			const iter = sink.audioSink.samples(localTimeSec)
			const first = await iter.next()

			if (first.done)
				return

			streams.push({
				iter,
				offsetSec: offset,
				gain: item.gain ?? 1,
				current: first.value,
				nextPromise: iter.next()
			})
		}))

		while (streams.length > 0) {
			let bestIndex = 0
			let bestTime =
				streams[0].offsetSec +
				streams[0].current!.timestamp

			for (let i = 1; i < streams.length; i++) {
				const ts =
					streams[i].offsetSec +
					streams[i].current!.timestamp

				if (ts < bestTime) {
					bestTime = ts
					bestIndex = i
				}
			}

			const stream = streams[bestIndex]

			yield {
				sample: stream.current!,
				timestamp: stream.offsetSec + stream.current!.timestamp,
				gain: stream.gain
			}

			const result = await stream.nextPromise!

			if (result.done) {
				streams.splice(bestIndex, 1)
			} else {
				stream.current = result.value
				stream.nextPromise = stream.iter.next()
			}
		}
	}

	protected async video(item: Item.Video, time: Ms, matrix: Mat6): Promise<Layer[]> {
		const sink = await this.#getOrCreateSink(item.mediaHash)

		if (!sink?.videoSink)
			return []

		const sample = await sink.videoSink.getSample(time / 1000)

		if (!sample)
			return []

		const frame = sample.toVideoFrame()
		sample.close()

		return frame ? [{ kind: "image", frame, matrix, id: item.id }] : []
	}

	protected text(items: Item.Any[], item: Item.Text, time: Ms, matrix: Mat6): Layer[] {
		const styleItem = item.styleId !== undefined
			? items.find(({ id }) => id === item.styleId) as Item.TextStyle
			: undefined

		const duration = ms(item.duration)
		if (time < 0 || time >= duration)
			return []

		else return [{
			id: item.id,
			kind: "text",
			content: item.content,
			style: styleItem?.style,
			matrix
		}]
	}

	async #sampleItem(
		timeline: TimelineFile,
		items: Map<number, Item.Any>,
		item: Item.Any,
		time: Ms,
		ancestors: ContainerItem[]
	): Promise<Layer[]> {
		const matrix = computeWorldMatrix(items, ancestors, item)

		switch (item.kind) {
			case Kind.Stack: {
				const layers = await Promise.all(
					item.childrenIds.map(id => {
						const child = items.get(id)
						return child
							? this.#sampleItem(timeline, items, child, time, [...ancestors, item])
							: Promise.resolve([])
					})
				)
				return layers.flat()
			}

			case Kind.Sequence:
				return await this.#sampleSequence(timeline, items, item, time, ancestors)

			case Kind.Video:
				if (time < 0 || time >= item.duration)
					return []
				return await this.video(item, time, matrix)

			case Kind.Text:
				return this.text(timeline.items, item, time, matrix)

			case Kind.Gap:
			case Kind.Audio:
			case Kind.Transition:
			case Kind.Spatial:
			case Kind.TextStyle:
				return []

			default:
				return []
		}
	}

	async #sampleSequence(
		timeline: TimelineFile,
		items: Map<number, Item.Any>,
		sequence: Item.Sequence,
		time: Ms,
		ancestors: ContainerItem[]
	): Promise<Layer[]> {
		let offset = ms(0)
		const children = this.#sequenceChildren(items, sequence)

		for (let i = 0; i < children.length; i++) {
			const child = children[i]

			if (child.kind === Kind.Transition)
				continue

			const next = children[i + 1]
			const nextNext = children[i + 2]

			if (next?.kind === Kind.Transition && nextNext && nextNext.kind !== Kind.Transition) {
				const meta = this.#transitionMeta(timeline, child, nextNext, next, offset)

				const isBeforeTransition = time < meta.transitionStart
				const isDuringTransition = time < meta.transitionEnd
				const isWithinCombined = time < ms(offset + meta.combined)

				if (isBeforeTransition) {
					return await this.#sampleItem(timeline, items, child, ms(time - offset), [...ancestors, sequence])
				}

				if (isDuringTransition) {
					const layers = await this.#sampleTransition(
						timeline,
						items,
						child,
						next,
						nextNext,
						time,
						offset,
						[...ancestors, sequence],
						meta
					)
					return layers
				}

				if (isWithinCombined) {
					const localIncomingTime = ms(time - meta.incomingStart)
					return await this.#sampleItem(timeline, items, nextNext, localIncomingTime, [...ancestors, sequence])
				}

				offset = ms(offset + meta.combined)
				i += 2
				continue
			}

			const duration = computeTimelineDuration(child.id, timeline)

			const isWithinChild = time < ms(offset + duration)
			if (isWithinChild)
				return await this.#sampleItem(timeline, items, child, ms(time - offset), [...ancestors, sequence])

			offset = ms(offset + duration)
		}

		return []
	}

	#sequenceChildren(items: Map<number, Item.Any>, sequence: Item.Sequence) {
		return sequence.childrenIds
			.map(id => items.get(id))
			.filter(Boolean) as Item.Any[]
	}

	async #sampleTransition(
		timeline: TimelineFile,
		items: Map<number, Item.Any>,
		outgoing: Item.Any,
		transition: Item.Transition,
		incoming: Item.Any,
		time: Ms,
		offset: Ms,
		ancestors: ContainerItem[],
		meta: {overlap: Ms; transitionStart: Ms; combined: Ms}
	): Promise<Layer[]> {
		const localTime = ms(time - meta.transitionStart)
		const progress = meta.overlap > 0 ? (localTime / Number(meta.overlap)) : 1
		const fromLayers = await this.#sampleItem(
			timeline,
			items,
			outgoing,
			ms(time - offset),
			ancestors
		)
		const toLayers = await this.#sampleItem(
			timeline,
			items,
			incoming,
			localTime,
			ancestors
		)
		const fromImage = fromLayers.find(l => l.kind === "image")
		const toImage = toLayers.find(l => l.kind === "image")

		if (!fromImage?.frame || !toImage?.frame)
			return []

		return [{
			id: transition.id,
			kind: "transition",
			name: "circle",
			progress,
			from: fromImage.frame,
			to: toImage.frame,
		}]
	}

	#transitionMeta(
		timeline: TimelineFile,
		outgoing: Item.Any,
		incoming: Item.Any,
		transition: Item.Transition,
		offset: Ms
	) {
		const outgoingDur = computeTimelineDuration(outgoing.id, timeline)
		const incomingDur = computeTimelineDuration(incoming.id, timeline)
		const overlap = ms(Math.max(
			0,
			Math.min(transition.duration, outgoingDur, incomingDur)
		))

		const transitionStart = ms(offset + outgoingDur - overlap)
		const transitionEnd = ms(offset + outgoingDur)
		const incomingStart = transitionStart
		const combined = ms(outgoingDur + incomingDur - overlap)

		return {outgoingDur, incomingDur, overlap, transitionStart, transitionEnd, incomingStart, combined}
	}

	async #getOrCreateSink(hash: string) {
		const existing = this.#sinks.get(hash)

		if (existing)
			return existing

		const input = new Input({
			formats: ALL_FORMATS,
			source: await loadDecoderSource(this.resolveMedia(hash)),
		})

		const videoTrack = await input.getPrimaryVideoTrack()
		const audioTrack = await input.getPrimaryAudioTrack()

		const canDecodeAudio = !!audioTrack && await audioTrack.canDecode()
		const canDecodeVideo = !!videoTrack && await videoTrack.canDecode()

		const videoSink = canDecodeVideo && videoTrack ? new VideoSampleSink(videoTrack) : null
		const audioSink = canDecodeAudio && audioTrack ? new AudioSampleSink(audioTrack) : null

		this.#sinks.set(hash, {input, videoSink, audioSink})

		return {input, videoSink, audioSink}
	}

}

