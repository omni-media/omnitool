
import {ActiveStream} from "./types.js"

export function findEarliestStream(streams: ActiveStream[]) {
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
