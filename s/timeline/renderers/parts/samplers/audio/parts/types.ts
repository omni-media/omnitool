
import {AudioSample} from "mediabunny"
import {Id} from "../../../../../parts/basics.js"
import {Seconds} from "../../../../../../units/seconds.js"

export type ActiveStream = {
	offset: Seconds
	gain: number
	currentSample: AudioSample
	timelineTime: () => Seconds
	output: () => {
		itemId: Id
		sample: AudioSample
		timestamp: number
		gain: number
	}
	advance: () => Promise<boolean>
}
