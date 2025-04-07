
// import {DeferPromise} from "@benev/slate"
// import {fns, Logistics, Remote} from "renraku"
// import {DriverMachine} from "../driver-machine.js"
// import {DriverDaddyFns, DriverWorkerFns} from "./types.js"

// /** driver functions that live on the main thread */
// export const makeDriverDaddyFns = (
// 		_worker: Remote<DriverWorkerFns>,
// 		_logistics: Logistics,
// 		readyprom: DeferPromise<void>,
// 		machine: DriverMachine,
// 	) => fns<DriverDaddyFns>({

// 	async ready() { readyprom.resolve() },
// 	async demuxResult(chunk, id) {machine.reportDemuxedChunk(id, chunk)},
// 	async muxResult() {},
// 	async decodeResult() {},
// 	async encodeResult() {},
// 	async decoderConfigResult() {}
// })

