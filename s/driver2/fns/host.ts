
import {Comrade} from "@e280/comrade"
import {Conduit} from "../parts/conduit.js"
import {DriverSchematic} from "./schematic.js"

/** these functions are executed on the main thread */
export const prepareDriverHost = (conduit: Conduit) => Comrade.host<DriverSchematic>(() => ({
	// deliverDemuxedPacket: {
	// 	async video() {
	// 		console.log("got video packet")
	// 	},
	// 	async audio() {},
	// 	async subtitle() {},
	// },
	decoder: {
		async deliverFrame({id, frame}) {
			conduit.dispatch(id, {type: "frame", data: frame})
		}
	},
	encoder: {
		async deliverChunk({id, chunk, meta}) {
			conduit.dispatch(id, {type: "chunk", data: {chunk, meta}})
		}
	}
}))

