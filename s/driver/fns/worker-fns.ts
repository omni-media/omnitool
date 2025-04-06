
import {advanced, fns, Logistics, Remote} from "renraku"
import {DriverDaddyFns, DriverWorkerFns} from "./types.js"

/** driver functions that live on the web worker */
export const makeDriverWorkerFns = (
		daddy: Remote<DriverDaddyFns>,
		logistics: Logistics,
	) => fns<DriverWorkerFns>({

	async mux(_data): Promise<Uint8Array> {
		const buffer = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF])

		// signal to renraku that this buffer should be transferred
		logistics.transfer = [buffer]

		// return the buffer, which will now be transferred (not copied)
		return buffer
	},

	async demux(_data) {
		const buffer1 = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF])
		const buffer2 = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF])

		// instead of returning data, we can make fresh calls to the main thread
		await daddy.demuxResult[advanced]({transfer: [buffer1]})(buffer1)
		await daddy.demuxResult[advanced]({transfer: [buffer2]})(buffer2)
	},
})

