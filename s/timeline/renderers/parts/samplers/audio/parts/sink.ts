
import {ALL_FORMATS, Input, AudioSampleSink} from "mediabunny"

import {DecoderSource} from "../../../../../../driver/fns/schematic.js"
import {loadDecoderSource} from "../../../../../../driver/utils/load-decoder-source.js"

type SinkState = {
	input: Input
	sink: AudioSampleSink | null
}

export class AudioSink {
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

		const audioTrack = await input.getPrimaryAudioTrack()

		const canDecodeAudio = !!audioTrack && await audioTrack.canDecode()

		const sink = canDecodeAudio && audioTrack ? new AudioSampleSink(audioTrack) : null

		this.#sinks.set(hash, {input, sink})

		return sink
	}
}
