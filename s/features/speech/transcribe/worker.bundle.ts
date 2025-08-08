
import {defer, once} from "@e280/stz"
import {Comrade, Host} from "@e280/comrade"
import {Pipeline} from "@huggingface/transformers"

import {loadPipe} from "./parts/load-pipe.js"
import {transcribe} from "./parts/transcribe.js"
import {TranscriberSchematic, TranscriberSpec} from "./types.js"

const deferred = defer<{pipe: Pipeline, spec: TranscriberSpec}>()

const makePrepare = (host: Host<TranscriberSchematic>) => once(async(spec: TranscriberSpec) => {
	deferred.resolve({
		spec,
		pipe: await loadPipe({
			spec,
			onLoading: loading => host.loading(loading),
		}),
	})
})

await Comrade.worker<TranscriberSchematic>(shell => {
	const prepare = makePrepare(shell.host)
	return {
		prepare,
		async transcribe(request) {
			const {pipe, spec} = await deferred.promise
			return transcribe({
				pipe,
				spec,
				request,
				callbacks: {
					onReport: report => shell.host.deliverReport(report),
					onTranscription: transcription => shell.host.deliverTranscription(transcription),
				},
			})
		}
	}
})

