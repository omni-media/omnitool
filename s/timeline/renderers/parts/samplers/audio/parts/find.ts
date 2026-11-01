
import type {ActiveStream} from "./types.js"

export function findEarliestStream(streams: ActiveStream[], resampling = false) {
	// Resampling can produce contributions before the sample's timestamp.
	const timeOf = (stream: ActiveStream) => stream.timelineTime()
		- (resampling ? 1 / stream.currentSample.sampleRate : 0)
	let earliest = {
		index: 0,
		stream: streams[0],
		time: timeOf(streams[0])
	}

	for (const [index, stream] of streams.entries()) {
		const time = timeOf(stream)
		if (time < earliest.time) {
			earliest = {time, stream, index}
		}
	}

	return earliest
}
