
import {AudioSinkPool} from "./sink.js"
import {ActiveStream} from "./types.js"
import {itemsFrom} from "../../../handy.js"
import {Ms} from "../../../../../../units/ms.js"
import {Kind} from "../../../../../parts/item.js"
import {seconds} from "../../../../../../units/seconds.js"

export async function initStreams(
	pool: AudioSinkPool,
	items: ReturnType<typeof itemsFrom>,
	from: Ms
): Promise<ActiveStream[]> {
	const streams = await Promise.all(
		items.map(async ({item, localTime}) => {
			if (item.kind !== Kind.Audio)
				return

			const sink = await pool.getSink(item.mediaHash)
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

