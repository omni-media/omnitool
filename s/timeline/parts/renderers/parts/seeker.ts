import {debounce} from "@e280/stz"
import {ALL_FORMATS, Input, VideoSampleSink} from "mediabunny"

import {Item} from "../../item.js"
import {Seconds} from "../../../../units/seconds.js"
import {DecoderSource} from "../../../../driver/fns/schematic.js"
import {loadDecoderSource} from "../../../../driver/utils/load-decoder-source.js"

type VideoSeekerState = {
	input: Input
	sink: VideoSampleSink | null
}

export class MediaSeeker {
	readonly #videoSeekers = new Map<number, VideoSeekerState>()

	constructor(private resolveMedia: (hash: string) => DecoderSource) {}

	async seekVideo(
		clip: Item.Video,
		video: HTMLVideoElement,
		time: Seconds,
	) {
		const sink = await this.#getOrCreateVideoSeeker(clip)

		if (!sink)
			return null

		const sample = await sink.getSample(time)

		if (!sample)
			return null

		const frame = sample.toVideoFrame()
		sample.close()

		this.#sync(video, time)
		return frame
	}

	seekAudio(media: HTMLAudioElement, time: Seconds) {
		return media.currentTime = time
	}

	dispose() {
		for (const {input} of this.#videoSeekers.values()) {
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

		this.#videoSeekers.set(clip.id, {input, sink})
		return sink
	}

	#sync = debounce(500, async (video: HTMLVideoElement, time: Seconds) => {
		video.currentTime = time
	})
}
