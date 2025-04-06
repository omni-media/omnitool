
import {DeferPromise} from "@benev/slate"
import {fns, Logistics, Remote} from "renraku"
import {DriverDaddyFns, DriverWorkerFns} from "./types.js"

export const makeDriverDaddyFns = (
		main: Remote<DriverWorkerFns>,
		logistics: Logistics,
		readyprom: DeferPromise<void>
	) => fns<DriverDaddyFns>({

	async ready() { readyprom.resolve() },
	async demuxResult() {},
})

