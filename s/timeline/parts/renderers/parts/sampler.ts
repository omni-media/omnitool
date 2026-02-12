
import {ALL_FORMATS, AudioBufferSink, Input, VideoSampleSink} from "mediabunny"

import {itemsAt, itemsFrom} from "./handy.js"
import {Item, Kind} from "../../item.js"
import {TimelineFile} from "../../basics.js"
import {Mat6} from "../../../utils/matrix.js"
import {ms, Ms} from "../../../../units/ms.js"
import {DecoderSource, Layer} from "../../../../driver/fns/schematic.js"
import {loadDecoderSource} from "../../../../driver/utils/load-decoder-source.js"

type SinkState = {
	input: Input
	videoSink?: VideoSampleSink | null
	audioSink?: AudioBufferSink | null
}

type AudioStreamState = {
	iter: AsyncGenerator<{
		buffer: AudioBuffer;
		timestamp: number
	}>
	offsetSec: number
	current: {
		buffer: AudioBuffer
		timestamp: number
	} | null
	nextPromise: Promise<IteratorResult<{
		buffer: AudioBuffer
		timestamp: number
	}>> | null
}

export class Sampler {
	readonly #sinks = new Map<string, SinkState>()

	constructor(
		private resolveMedia: (hash: string) => DecoderSource
	) { }

	async sample(timeline: TimelineFile, timecode: Ms) {
		const items = itemsAt({ timeline, timecode })
		const promises = items.map(({ item, matrix, localTime }) => {
			switch (item.kind) {
				case Kind.Video:
					return this.video(item, localTime, matrix)

				case Kind.Text:
					return this.text(timeline.items, item, localTime, matrix)

				default:
					return Promise.resolve([])
			}
		})

		const layers = await Promise.all(promises)
		return layers.flat()
	}

	async *sampleAudio(
		timeline: TimelineFile,
		from: Ms
	): AsyncGenerator<{ buffer: AudioBuffer; timestamp: number }> {
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
			const iter = sink.audioSink.buffers(localTimeSec)
			const first = await iter.next()

			if (first.done)
				return

			streams.push({
				iter,
				offsetSec: offset,
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
				buffer: stream.current!.buffer,
				timestamp: stream.offsetSec + stream.current!.timestamp
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

	async video(item: Item.Video, time: Ms, matrix: Mat6): Promise<Layer[]> {
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

	text(items: Item.Any[], item: Item.Text, time: Ms, matrix: Mat6): Layer[] {
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
		const audioSink = canDecodeAudio && audioTrack ? new AudioBufferSink(audioTrack) : null

		this.#sinks.set(hash, {input, videoSink, audioSink})

		return {input, videoSink, audioSink}
	}

}

