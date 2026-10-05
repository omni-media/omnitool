
import {AudioSampleSink} from "mediabunny"

import {AudioSinkPool} from "./sink.js"
import {ActiveStream} from "./types.js"
import {itemsFrom} from "../../../handy.js"
import {Kind} from "../../../../../parts/item.js"
import {seconds} from "../../../../../../units/seconds.js"

export async function initStreams(
	pool: AudioSinkPool,
	items: ReturnType<typeof itemsFrom>
): Promise<ActiveStream[]> {
	const streams = await Promise.all(
		items.map(async ({item, localTime, timelineStart, ancestors}) => {
			if (item.kind !== Kind.Audio && item.kind !== Kind.Clip)
				return
			if (item.enabled === false || ancestors.some(({item}) => item.enabled === false))
				return
			if (localTime >= item.duration)
				return

			const sink = await pool.getSink(item.mediaHash)
			if (!sink)
				return

			const mediaTime = item.start + localTime
			const mediaEnd = item.start + item.duration
			const offset = seconds((timelineStart - item.start) / 1000)
			const iter = trimmedSamples(sink, mediaTime / 1000, mediaEnd / 1000)

			const first = await iter.next()
			if (first.done)
				return

			let currentSample = first.value

			return {
				offset,
				gain: item.gain ?? 1,
				get currentSample() {return currentSample},
				timelineTime: () => seconds(offset + currentSample.timestamp),
				output: () => ({
					itemId: item.id,
					sample: currentSample,
					timestamp: offset + currentSample.timestamp,
					gain: item.gain ?? 1
				}),
				advance: async () => {
					const result = await iter.next()
					if (result.done)
						return false

					currentSample = result.value

					return true
				},
				cancel: async () => {
					currentSample.close()
					await iter.return()
				}
			}
		})
	)

	return streams.filter((stream): stream is ActiveStream => !!stream)
}

async function* trimmedSamples(sink: AudioSampleSink, start: number, end: number) {
	for await (const sample of sink.samples(Math.max(0, start - 0.1), end)) {
		const frameAt = (time: number) => clamp(
			Math.round((time - sample.timestamp) * sample.sampleRate), 0, sample.numberOfFrames
		)

		const from = frameAt(start)
		const to = frameAt(end)

		if (!from && to === sample.numberOfFrames) {
			yield sample
			continue
		}

		const trimmed = to > from && sample.trim(from, to)
		sample.close()

		if (trimmed)
			yield trimmed
	}
}

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value))
}

