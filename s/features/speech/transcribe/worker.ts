import {defer, once} from "@e280/stz"
import {Comrade} from "@e280/comrade"
import type {AutomaticSpeechRecognitionPipeline} from "@huggingface/transformers"

import {loadPipe} from "../../parts/load-pipe.js"
import {transcribe} from "./parts/transcribe.js"
import {exposeErrors} from "../../parts/expose-errors.js"
import {TranscriberSchematic, TranscriberSpec} from "./types.js"

export async function setupTranscriberWorker() {
	const deferred = defer<{pipe: AutomaticSpeechRecognitionPipeline, spec: TranscriberSpec}>()

	await Comrade.worker<TranscriberSchematic>(shell => ({
		prepare: exposeErrors(once(async(spec: TranscriberSpec) => {
			deferred.resolve({
				spec,
				pipe: await loadPipe({
					spec,
					task: "automatic-speech-recognition",
					onLoading: loading => shell.host.loading(loading),
				}) as AutomaticSpeechRecognitionPipeline
			})
		})),
		transcribe: exposeErrors(async(request) => {
			const {pipe, spec} = await deferred.promise
			return transcribe({
				pipe,
				spec,
				request,
				callbacks: {
					onReport: report => shell.host.deliverReport(report),
					onTranscription: text => shell.host.deliverTranscription(text),
				},
			})
		})
	}))
}
