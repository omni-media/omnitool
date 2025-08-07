
import {Comrade} from "@e280/comrade"
import {coalesce, queue, sub} from "@e280/stz"

import {prepAudio} from "./parts/prep-audio.js"
import {TranscriberOptions, TranscriberSchematic, TranscriptionOptions, TranscriptionReport} from "./types.js"

export async function makeTranscriber({driver, spec, workerUrl, onLoading}: TranscriberOptions) {
	const onReport = sub<[report: TranscriptionReport]>()
	const onTranscription = sub<[transcription: string]>()

	const thread = await Comrade.thread<TranscriberSchematic>({
		label: "OmnitoolSpeechTranscriber",
		workerUrl,
		setupHost: () => ({
			loading: async loading => onLoading(loading),
			deliverReport: async report => onReport.pub(report),
			deliverTranscription: async transcription => onTranscription.pub(transcription),
		}),
	})

	await thread.work.prepare(spec)

	return {
		transcribe: queue(async(info: TranscriptionOptions) => {
			const {source, language} = info
			const {audio, duration} = await prepAudio(driver, source)

			const detachCallbacks = coalesce(
				onReport(info.onReport),
				onTranscription(info.onTranscription),
			)

			const result = await thread.work.transcribe({
				duration,
				language,
				audio: audio.buffer,
			})

			detachCallbacks()
			return result
		}),
	}
}

