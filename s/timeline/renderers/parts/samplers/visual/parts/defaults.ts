
import {VideoSink} from "./video-sink.js"
import {ImageSink} from "./image-sink.js"
import {Ms} from "../../../../../../units/ms.js"
import {Item} from "../../../../../parts/item.js"

export type VideoSampler = (item: Item.Video, time: Ms) => Promise<VideoFrame | undefined>
export type ImageSampler = (item: Item.Image, time: Ms) => Promise<VideoFrame | undefined>

export function createDefaultVideoSampler(sink: VideoSink): VideoSampler {
	return async (item, time) => {
		const s = await sink.getSink(item.mediaHash)
		const mediaTime = item.start + time
		const sample = await s?.getSample(mediaTime / 1000)
		const frame = sample?.toVideoFrame()
		sample?.close()
		return frame ?? undefined
	}
}

export function createDefaultImageSampler(sink: ImageSink): ImageSampler {
	return async (_item, time) => await sink.getFrame(_item.mediaHash, time)
}
