
import {AudioMix} from "./audio-mix.js"
import {ms} from "../../../../units/ms.js"
import {resampleToPlanar} from "./resamplers.js"
import {applyGainToPlanar} from "./audio-gain.js"
import {TimelineFile} from "../../../parts/basics.js"
import {convertAudioChannels} from "./audio-channels.js"
import {resolveAudioGain} from "../../../parts/audio.js"
import {DecoderSource} from "../../../../driver/fns/schematic.js"
import {createAudioSampler} from "../../parts/samplers/audio/sampler.js"

export function produceAudio({
	timeline,
	resolveMedia,
	sampleRate,
	numberOfChannels
}: {
	timeline: TimelineFile,
	resolveMedia: (hash: string) => DecoderSource,
	sampleRate: number,
	numberOfChannels: 1 | 2 | 6
}) {
	const mixer = new AudioMix()
	const audio = streamAudio(timeline, resolveMedia, sampleRate, numberOfChannels)
	const stream = new TransformStream<AudioData, AudioData>()
	const writer = stream.writable.getWriter()

	async function produce() {
		try {
			for await (const chunk of mixer.mix(audio)) {
				const data = new AudioData({
					format: 'f32-planar',
					sampleRate: chunk.sampleRate,
					numberOfFrames: chunk.frames,
					numberOfChannels: chunk.channels,
					timestamp: Math.round(
						(chunk.startFrame / chunk.sampleRate) * 1_000_000
					),
					data: chunk.planar
				})

				await writer.write(data)
			}

			await writer.close()
		}
		catch (error) {
			await writer.abort(error).catch(() => {})
		}
	}

	produce()

	return stream.readable
}

async function *streamAudio(
	timeline: TimelineFile,
	resolveMedia: (hash: string) => DecoderSource,
	sampleRate: number,
	numberOfChannels: 1 | 2 | 6
) {
	const audioSampler = createAudioSampler(resolveMedia)
	const masterGain = resolveAudioGain(timeline.audio)

	for await (const {sample, timestamp, gain}
		of audioSampler.sampleAudio(timeline, ms(0), sampleRate)) {

		try {
			const {data, timestamp: outputTimestamp} = resampleToPlanar(sample, sampleRate, timestamp)
			applyGainToPlanar(data, gain * masterGain)
			yield {
				planes: convertAudioChannels(data, numberOfChannels),
				sampleRate,
				timestamp: outputTimestamp
			}
		}
		finally { sample.close() }
	}
}

