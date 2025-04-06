
import {fns, Logistics, Remote} from "renraku"
import {DriverDaddyFns, DriverWorkerFns} from "./types.js"

/** driver functions that live on the web worker */
export const makeDriverWorkerFns = (
		worker: Remote<DriverDaddyFns>,
		logistics: Logistics,
	) => fns<DriverWorkerFns>({

	async mux(data) {},
	async demux(data) {},
})

