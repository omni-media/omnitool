import {defer, once} from "@e280/stz"
import {Comrade} from "@e280/comrade"
import type {BackgroundRemovalPipeline} from "@huggingface/transformers"

import {BgRemoverSchematic} from "./types.js"
import {loadPipe} from "../parts/load-pipe.js"
import {PipelineSpec} from "../parts/types.js"
import {exposeErrors} from "../parts/expose-errors.js"

export async function setupBgRemoverWorker() {
	const deferred = defer<BackgroundRemovalPipeline>()
	const canvas = new OffscreenCanvas(1920, 1080)
	const ctx = canvas.getContext("2d")

	await Comrade.worker<BgRemoverSchematic>(shell => ({
		prepare: exposeErrors(once(async(spec: PipelineSpec) => {
			deferred.resolve(await loadPipe({
				spec,
				task: "background-removal",
				onLoading: loading => shell.host.loading(loading),
			}) as BackgroundRemovalPipeline)
		})),
		remove: exposeErrors(async(request) => {
			const pipe = await deferred.promise

			canvas.width = request.displayWidth
			canvas.height = request.displayHeight
			ctx?.drawImage(request, 0, 0)

			const mask = await pipe(canvas)
			const frame = new VideoFrame(mask.toCanvas(), {
				timestamp: request.timestamp,
				duration: request.duration ?? undefined,
			})

			request.close()
			shell.transfer = [frame]
			return frame
		})
	}))
}
