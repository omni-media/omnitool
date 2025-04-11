
import Comrade from "@e280/comrade"
import {DriverSchematic} from "./schematic.js"

export const setupDriverWork = Comrade.work<DriverSchematic>((host, _rig) => ({
	async demux(input) {
		const {id} = input
		const transfer: Transferable[] = []
		for (const _ of [...Array(10)]) {
			const bytes = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF])
			transfer.push(bytes)

			// TODO host is undefined!
			if (!host) throw new Error("no host!")

			await host.deliverDemuxedPacket.video({id, bytes})
		}
	},

	async mux(_input) {
		return new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF])
	},
}))

