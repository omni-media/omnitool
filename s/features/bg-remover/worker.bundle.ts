
import {defer, once} from "@e280/stz"
import {Comrade, Host} from "@e280/comrade"
import {BackgroundRemovalPipeline} from "@huggingface/transformers"

import {PipelineSpec} from "../parts/types.js"
import {BgRemoverSchematic} from "./types.js"
import {loadPipe} from "../parts/load-pipe.js"

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

const canvas = new OffscreenCanvas(1920, 1080)
const ctx = canvas.getContext("2d")

await Comrade.worker<BgRemoverSchematic>(shell => {
	const prepare = makePrepare(shell.host)
	return {
		prepare,
		async remove(request) {
			const {pipe} = await deferred.promise

			canvas.width = request.codedWidth
			canvas.height = request.codedHeight
			ctx?.drawImage(request, 0, 0)

			const output = await pipe(canvas)
			const mask = output[0]

			const frame = new VideoFrame(mask.toCanvas(), {
				timestamp: request.timestamp,
				duration: request.duration ?? undefined,
			})

			request.close()
			shell.transfer = [frame]
			return frame
		}
	}
})


