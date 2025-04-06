
import {DeferPromise} from "@benev/slate"
import {fns, Logistics, Remote} from "renraku"
import {DriverDaddyFns, DriverWorkerFns} from "./types.js"

/** driver functions that live on the main thread */
export const makeDriverDaddyFns = (
		main: Remote<DriverWorkerFns>,
		logistics: Logistics,
		readyprom: DeferPromise<void>
	) => fns<DriverDaddyFns>({

	async ready() { readyprom.resolve() },
	async demuxResult() {},
})

