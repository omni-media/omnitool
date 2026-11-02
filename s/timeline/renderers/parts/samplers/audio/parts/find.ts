
import type {ActiveStream} from "./types.js"
import {resampleRadius} from "../../../../export/parts/resamplers.js"

export function findEarliestStream(streams: ActiveStream[], targetSampleRate?: number) {
	// Resampling can produce contributions before the sample's timestamp.
	const timeOf = (stream: ActiveStream) => {
		const sampleRate = stream.currentSample.sampleRate
		const radius = targetSampleRate ? resampleRadius(sampleRate, targetSampleRate) : 0
		return stream.timelineTime() - radius / sampleRate
	}

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
