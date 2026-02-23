
import {AudioMix} from "./audio-mix.js"
import {ms} from "../../../../units/ms.js"
import {resampleToPlanar} from "./resamplers.js"
import {applyGainToPlanar} from "./audio-gain.js"
import {TimelineFile} from "../../../parts/basics.js"
import {DecoderSource} from "../../../../driver/fns/schematic.js"
import {createAudioSampler} from "../../parts/samplers/audio/sampler.js"

export function produceAudio({
	timeline,
	resolveMedia
}: {
	timeline: TimelineFile,
	resolveMedia: (hash: string) => DecoderSource
}) {
	const mixer = new AudioMix()
	const audio = streamAudio(timeline, resolveMedia)
	const stream = new TransformStream<AudioData, AudioData>()
	const writer = stream.writable.getWriter()

	async function produce() {
		for await (const chunk of mixer.mix(audio)) {
			const data = new AudioData({
				format: 'f32-planar',
				sampleRate: chunk.sampleRate,
				numberOfFrames: chunk.frames,
				numberOfChannels: chunk.channels,
				timestamp: Math.round(
					(chunk.startFrame / chunk.sampleRate) * 1_000_000
				),
				data: new Float32Array(chunk.planar)
			})

			await writer.write(data)
		}

		await writer.close()
	}

	produce()

	return stream.readable
}

async function *streamAudio(timeline: TimelineFile, resolveMedia: (hash: string) => DecoderSource) {
	const audioSampler = createAudioSampler(resolveMedia)

	for await (const {sample, timestamp, gain}
		of audioSampler.sampleAudio(timeline, ms(0))) {

		const {data} = resampleToPlanar(sample, 48000)
		applyGainToPlanar(data, gain)

		yield {
			planes: data,
			sampleRate: 48000,
			timestamp
		}

		sample.close()
	}
}

