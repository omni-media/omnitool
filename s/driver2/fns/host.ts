
import {Comrade} from "@e280/comrade"
import {DriverSchematic} from "./schematic.js"

export const setupDriverHost = Comrade.host<DriverSchematic>(() => ({
	deliverDemuxedPacket: {
		async video(stuff) {
			console.log("got video packet", stuff.id)
		},
		async audio(_stuff) {},
		async subtitle(_stuff) {},
	},
}))

