
import {Comrade} from "@e280/comrade"
import {setupDriverWork} from "./fns/work.js"
import {DriverSchematic} from "./fns/schematic.js"
import {exposeErrors} from "../features/parts/expose-errors.js"

export async function driverWorker() {
	await Comrade.worker<DriverSchematic>(shell => {
		const work = setupDriverWork(shell)
		return {
			hello: exposeErrors(work.hello),
			decodeAudio: exposeErrors(work.decodeAudio),
			decodeVideo: exposeErrors(work.decodeVideo),
			encode: exposeErrors(work.encode)
		}
	})
}

