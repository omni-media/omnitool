// import {fns, Remote, advanced} from "renraku"
// import {generate_id, DeferPromise} from "@benev/slate"

// import {createOperation} from "./fns/create-operation.js"
// import {DemuxerOpts, DriverAPI, DriverDaddyFns, DriverWorkerFns} from "./fns/types.js"

// export class DriverMachine implements DriverAPI {
// 	#demuxHandlers = new Map<string, (chunk: EncodedVideoChunk) => void>()

// 	constructor(private remote: Remote<DriverWorkerFns>) {}

// 	static withDaddy(
// 		remote: Remote<DriverWorkerFns>,
// 		readyprom: DeferPromise<void>
// 	) {
// 		const machine = new DriverMachine(remote)
// 		const daddy = machine.#createDaddyFns(readyprom)
// 		return {machine, daddy}
// 	}

// 	#createDaddyFns(readyprom: DeferPromise<void>) {
// 		const self = this

// 		return fns<DriverDaddyFns>({
// 			async ready() {
// 				readyprom.resolve()
// 			},

// 			async demuxResult(chunk, id) {
// 				self.#demuxHandlers.get(id)?.(chunk)
// 			},

// 			async muxResult() {},
// 			async decodeResult() {},
// 			async encodeResult() {},
// 			async decoderConfigResult() {}
// 		})
// 	}

// 	async createDemuxer(opts: Omit<DemuxerOpts, "id">) {
// 		const op = createOperation<EncodedVideoChunk>(
// 			() => generate_id(),
// 			(id, handler) => this.#demuxHandlers.set(id, handler),
// 			id => this.#demuxHandlers.delete(id)
// 		)

// 		const demuxer = await this.remote.demuxer[advanced]({transfer: [{bytes: opts.bytes}]})({...opts, id: op.id})

// 		return {
// 			onChunk: op.on,
// 			start: () => demuxer.start(),
// 			dispose: op.dispose
// 		}
// 	}
// }
