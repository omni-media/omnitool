
import {ImageSampler, VideoSampler} from "./defaults.js"
import {Item} from "../../../../../parts/item.js"
import {Id, TimelineFile} from "../../../../../parts/basics.js"

export type SampleContext = {
	imageSampler: ImageSampler
	videoSampler: VideoSampler
	timeline: TimelineFile
	items: Map<Id, Item.Any>
}
