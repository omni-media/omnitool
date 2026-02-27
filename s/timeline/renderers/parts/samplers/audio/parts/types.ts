
import {AudioSample} from "mediabunny"
import {Seconds} from "../../../../../../units/seconds.js"

export type ActiveStream = {
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
