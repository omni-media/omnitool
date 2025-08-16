
import {defer, once} from "@e280/stz"
import {Comrade, Host} from "@e280/comrade"
import {BackgroundRemovalPipeline} from "@huggingface/transformers"

import {PipelineSpec} from "../types.js"
import {BgRemoverSchematic} from "./types.js"
import {loadPipe} from "../speech/transcribe/parts/load-pipe.js"

const deferred = defer<{spec: PipelineSpec, pipe: BackgroundRemovalPipeline}>()
const makePrepare = (host: Host<BgRemoverSchematic>) => once(async(spec: PipelineSpec) => {
	deferred.resolve({
		spec,
		pipe: await loadPipe({
			spec,
			task: "background-removal",
			onLoading: loading => host.loading(loading),
		}) as BackgroundRemovalPipeline
	})
})

await Comrade.worker<BgRemoverSchematic>(shell => {
	const prepare = makePrepare(shell.host)
	return {
		prepare,
		async remove(request) {
			const {pipe} = await deferred.promise
			const output = await pipe(request)
			const mask = output[0]
    	const bitmap = await createImageBitmap(mask.toCanvas())
			shell.transfer = [bitmap]
			return bitmap
		}
	}
})


