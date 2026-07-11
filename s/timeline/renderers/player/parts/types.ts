
import {Ms} from "../../../../units/ms.js"
import {Id} from "../../../parts/basics.js"

export type AudioLevel = {
	time: Ms
	peak: number
	rms: number
}

export type AudioItemSelector = () => Iterable<Id>
export type AudioLevelListener = (level: AudioLevel) => void

export type AudioLevelObserver = {
	on(items: AudioItemSelector, listener: AudioLevelListener): () => void
}

export type Meter = {
	items: AudioItemSelector
	listener: AudioLevelListener
	analyser: AnalyserNode
	silent: GainNode
	samples: Float32Array<ArrayBuffer>
	nodes: Set<GainNode>
}

