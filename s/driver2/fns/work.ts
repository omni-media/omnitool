
import {Comrade} from "@e280/comrade"
import {DriverSchematic} from "./schematic.js"

// these functions are executed on a web worker
export const setupDriverWork = Comrade.work<DriverSchematic>((shell, _rig) => ({
	async demux(input) {
		const {id} = input
		const transfer: Transferable[] = []
		for (const _ of [...Array(10)]) {
			const bytes = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF])
			const buffer = bytes.buffer
			transfer.push(buffer)
			await shell.host.deliverDemuxedPacket.video({id, buffer})
		}
	},

	async mux(_input) {
		return new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]).buffer
	},
}))

