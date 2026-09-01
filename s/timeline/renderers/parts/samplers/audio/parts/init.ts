
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
			const iter = sink.samples(mediaTime / 1000, mediaEnd / 1000)

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
					itemId: item.id,
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

