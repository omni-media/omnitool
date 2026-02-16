
import {AudioSample} from "mediabunny"

import {itemsFrom} from "../../handy.js"
import {Kind} from "../../../../parts/item.js"
import {AudioSink} from "./parts/sink.js"
import {Ms} from "../../../../../units/ms.js"
import {TimelineFile} from "../../../../parts/basics.js"
import {DecoderSource} from "../../../../../driver/fns/schematic.js"

type AudioStreamState = {
	iter: AsyncGenerator<AudioSample>
	offsetSec: number
	gain: number
	current: AudioSample | null
	nextPromise: Promise<IteratorResult<AudioSample>> | null
}

export class AudioSampler {
	#sink

	constructor(
		resolveMedia: (hash: string) => DecoderSource
	) {
		this.#sink = new AudioSink(resolveMedia)
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

			const sink = await this.#sink.getSink(item.mediaHash)
			if (!sink)
				return

			const localTimeSec = (item.start + localTime) / 1000
			const offset = timelineFromSec - localTimeSec
			const iter = sink.samples(localTimeSec)
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
}

