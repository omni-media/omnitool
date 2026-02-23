
import {VideoSink} from "./parts/sink.js"
import {sampleVisual} from "./parts/sample.js"
import {Ms} from "../../../../../units/ms.js"
import {TimelineFile} from "../../../../parts/basics.js"
import {DecoderSource} from "../../../../../driver/fns/schematic.js"
import {createDefaultVideoSampler, VideoSampler} from "./parts/defaults.js"

export function createVisualSampler(
	resolveMedia: (hash: string) => DecoderSource,
	sampleVideo?: VideoSampler
) {
	const sink = new VideoSink(resolveMedia)
	const videoSampler = sampleVideo ?? createDefaultVideoSampler(sink)

	return {
		async sample(timeline: TimelineFile, timecode: Ms) {
			const items = new Map(timeline.items.map(item => [item.id, item]))
			const root = items.get(timeline.rootId)

			if (!root)
				return []

			return sampleVisual({videoSampler, timeline, items}, root, timecode, [])
		}
	}
}

