
import {ALL_FORMATS, Input, VideoSampleSink} from "mediabunny"

import {DecoderSource} from "../../../../../../driver/fns/schematic.js"
import {loadDecoderSource} from "../../../../../../driver/utils/load-decoder-source.js"

type SinkState = {
	input: Input
	sink: VideoSampleSink | null
}

export class VideoSink {
	readonly #sinks = new Map<string, SinkState>()

	constructor(
		private resolveMedia: (hash: string) => DecoderSource
	) {}

	async getSink(hash: string) {
		const existing = this.#sinks.get(hash)

		if (existing)
			return existing.sink

		const input = new Input({
			formats: ALL_FORMATS,
			source: await loadDecoderSource(this.resolveMedia(hash)),
		})

		const videoTrack = await input.getPrimaryVideoTrack()
		const canDecodeVideo = !!videoTrack && await videoTrack.canDecode()
		const sink = canDecodeVideo && videoTrack ? new VideoSampleSink(videoTrack) : null

		this.#sinks.set(hash, {input, sink})

		return sink
	}
}
