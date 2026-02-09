
import {ALL_FORMATS, Input, VideoSampleSink} from "mediabunny"

import {Item} from "../../item.js"
import {Sampler} from "./sampler.js"
import {Ms} from "../../../../units/ms.js"
import {TimelineFile} from "../../basics.js"
import {DecoderSource} from "../../../../driver/fns/schematic.js"
import {loadDecoderSource} from "../../../../driver/utils/load-decoder-source.js"

type VideoSeekerState = {
	input: Input
	sink: VideoSampleSink | null
}

export class VideoSeeker {
	readonly #videoSeekers = new Map<number, VideoSeekerState>()

	sampler = new Sampler(
		async (item, time, matrix) => {
			const sink = await this.#getOrCreateVideoSeeker(item)

			if (!sink)
				return []

			const sample = await sink.getSample(time / 1000)

			if (!sample)
				return []

			const frame = sample.toVideoFrame()
			sample.close()

			return frame ? [{ kind: "image", frame, matrix, id: item.id }] : []
		},
	)

	constructor(private resolveMedia: (hash: string) => DecoderSource) { }

	async seek(
		timeline: TimelineFile,
		time: Ms,

	) {
		return this.sampler.sample(timeline, time)
	}

	dispose() {
		for (const { input } of this.#videoSeekers.values()) {
			input.dispose()
		}
		this.#videoSeekers.clear()
	}

	async #getOrCreateVideoSeeker(clip: Item.Video) {
		const existing = this.#videoSeekers.get(clip.id)
		if (existing)
			return existing.sink

		const input = new Input({
			formats: ALL_FORMATS,
			source: await loadDecoderSource(this.resolveMedia(clip.mediaHash)),
		})
		const track = await input.getPrimaryVideoTrack()
		const canDecode = !!track && await track.canDecode()
		const sink = canDecode && track ? new VideoSampleSink(track) : null

		this.#videoSeekers.set(clip.id, { input, sink })
		return sink
	}
}

