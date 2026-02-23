
import {AudioSample} from "mediabunny"

import {itemsFrom} from "../../handy.js"
import {AudioSink} from "./parts/sink.js"
import {Ms} from "../../../../../units/ms.js"
import {Kind} from "../../../../parts/item.js"
import {TimelineFile} from "../../../../parts/basics.js"
import {seconds, Seconds} from "../../../../../units/seconds.js"
import {DecoderSource} from "../../../../../driver/fns/schematic.js"

type ActiveStream = {
	offset: Seconds
	gain: number
	currentSample: AudioSample
	timelineTime: () => Seconds
	output: () => {
		sample: AudioSample
		timestamp: number
		gain: number
	}
	advance: () => Promise<boolean>
}

export class AudioSampler {
	readonly #sink: AudioSink

	constructor(resolveMedia: (hash: string) => DecoderSource) {
		this.#sink = new AudioSink(resolveMedia)
	}

	async *sampleAudio(timeline: TimelineFile, from: Ms) {
		const items = itemsFrom({timeline, from})
		const streams = await this.#initStreams(items, from)

		while (streams.length > 0) {
			const {stream, index} = this.#findEarliestStream(streams)

			yield stream.output()

			const advancing = await stream.advance()

			if (!advancing) {
				streams.splice(index, 1)
			}
		}
	}

	async #initStreams(items: ReturnType<typeof itemsFrom>, from: Ms): Promise<ActiveStream[]> {
		const streams = await Promise.all(
			items.map(async ({item, localTime}) => {
				if (item.kind !== Kind.Audio)
					return

				const sink = await this.#sink.getSink(item.mediaHash)
				if (!sink)
					return

				const mediaTime = item.start + localTime
				const offset = seconds((from - mediaTime) / 1000)
				const iter = sink.samples(mediaTime / 1000)

				const first = await iter.next()
				if (first.done)
					return

				let currentSample = first.value
				let nextPromise = iter.next()

				return {
					offset,
					gain: item.gain ?? 1,
					get currentSample() {return currentSample},
					timelineTime: () => seconds(offset + currentSample.timestamp),
					output: () => ({
						sample: currentSample,
						timestamp: offset + currentSample.timestamp,
						gain: item.gain ?? 1
					}),
					advance: async () => {
						const result = await nextPromise
						if (result.done)
							return false

						currentSample = result.value
						nextPromise = iter.next()

						return true
					}
				}
			})
		)

		return streams.filter((stream): stream is ActiveStream => !!stream)
	}

	#findEarliestStream(streams: ActiveStream[]) {
		let earliest = {
			index: 0,
			stream: streams[0],
			time: streams[0].timelineTime()
		}

		for (const [index, stream] of streams.entries()) {
			const time = stream.timelineTime()
			if (time < earliest.time) {
				earliest = {time, stream, index}
			}
		}

		return earliest
	}
}

