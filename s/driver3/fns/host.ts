
import {Comrade} from "@e280/comrade"
import {Machina} from "../parts/machina.js"
import {DriverSchematic} from "./schematic.js"

export const setupDriverHost = (machina: Machina) => Comrade.host<DriverSchematic>(({work}, rig) => ({

	async world() {
		machina.count++
	},

	decoder: {
		async deliverFrame({id, frame}) {
			machina.dispatch(id, {type: "frame", data: frame})
		},
		async deliverAudioData({id, data}) {
			machina.dispatch(id, {type: "audioData", data})
		},
	},
	encoder: {
		async deliverChunk({id, chunk, meta}) {
			machina.dispatch(id, {type: "videoChunk", data: {chunk, meta}})
		},
		async deliverAudioChunk({id, chunk, meta}) {
			machina.dispatch(id, {type: "audioChunk", data: {chunk, meta}})
		}
	}
}))

