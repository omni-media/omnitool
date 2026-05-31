
import {VideoSink} from "./parts/video-sink.js"
import {ImageSink} from "./parts/image-sink.js"
import {sampleVisual} from "./parts/sample.js"
import {Ms} from "../../../../../units/ms.js"
import {TimelineFile} from "../../../../parts/basics.js"
import {DecoderSource} from "../../../../../driver/fns/schematic.js"
import {createDefaultImageSampler, createDefaultVideoSampler, VideoSampler} from "./parts/defaults.js"

export function createVisualSampler(
	resolveMedia: (hash: string) => DecoderSource,
	sampleVideo?: VideoSampler
) {
	const imageSink = new ImageSink(resolveMedia)
	const videoSink = new VideoSink(resolveMedia)
	const imageSampler = createDefaultImageSampler(imageSink)
	const videoSampler = sampleVideo ?? createDefaultVideoSampler(videoSink)

	return {
		async sample(timeline: TimelineFile, timecode: Ms) {
			const items = new Map(timeline.items.map(item => [item.id, item]))
			const root = items.get(timeline.rootId)

			if (!root)
				return []

			return sampleVisual({imageSampler, videoSampler, timeline, items}, root, timecode, [])
		}
	}
}

