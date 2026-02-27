
import {VideoSink} from "./sink.js"
import {Ms} from "../../../../../../units/ms.js"
import {Item} from "../../../../../parts/item.js"

export type VideoSampler = (item: Item.Video, time: Ms) => Promise<VideoFrame | undefined>

export function createDefaultVideoSampler(sink: VideoSink): VideoSampler {
	return async (item, time) => {
		const s = await sink.getSink(item.mediaHash)
		const sample = await s?.getSample(time / 1000)
		const frame = sample?.toVideoFrame()
		sample?.close()
		return frame ?? undefined
	}
}
