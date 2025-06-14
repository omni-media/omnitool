
import {Comrade} from "@e280/comrade"
import {Machina} from "../parts/machina.js"
import {DriverSchematic} from "./schematic.js"

export const setupDriverHost = (machina: Machina) => Comrade.host<DriverSchematic>(({work}, rig) => ({

	async world() {
		machina.count++
	},
	demuxer: {
		async deliverConfig({id, config}) {
			machina.dispatch(id, {type: "config", config})
		},
		async deliverAudioChunk({id, chunk, done}) {
			machina.dispatch(id, {type: "audioChunk", data: {chunk, meta: undefined, batchNumber: 1, done}})
		},
		async deliverChunk({id, chunk, done}) {
			machina.dispatch(id, {type: "videoChunk", data: {chunk, meta: undefined, batchNumber: 1, done}})
		},
	},
	decoder: {
		async deliverFrame({id, frame}) {
			machina.dispatch(id, {type: "frame", data: frame})
		},
		async deliverAudioData({id, data}) {
			machina.dispatch(id, {type: "audioData", data, batchNumber: 1})
		},
	},
	encoder: {
		async deliverChunk({id, chunk, meta, batchNumber}) {
			machina.dispatch(id, {type: "videoChunk", data: {chunk, meta, batchNumber, done: false}})
		},
		async deliverAudioChunk({id, chunk, meta}) {
			machina.dispatch(id, {type: "audioChunk", data: {chunk, meta, batchNumber: 1, done: false}})
		}
	}
}))

