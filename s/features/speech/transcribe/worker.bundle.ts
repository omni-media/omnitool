
import {defer, once} from "@e280/stz"
import {Comrade} from "@e280/comrade"

import {loadPipe} from "./parts/load-pipe.js"
import {transcribe} from "./parts/transcribe.js"
import {Pipe, TranscriberSchematic, TranscriberSpec} from "./types.js"

await Comrade.worker<TranscriberSchematic>(({host}, _rig) => {
	let deferred = defer<{pipe: Pipe, spec: TranscriberSpec}>()

	const prepare = once(async(spec: TranscriberSpec) => {
		deferred.resolve({
			spec,
			pipe: await loadPipe({
				spec,
				onLoading: loading => host.loading(loading),
			}),
		})
	})

	return {
		prepare,
		async transcribe(request) {
			const {pipe, spec} = await deferred.promise
			return transcribe({
				pipe,
				spec,
				request,
				callbacks: {
					onReport: report => host.deliverReport(report),
					onTranscription: transcription => host.deliverTranscription(transcription),
				},
			})
		},
	}
})

