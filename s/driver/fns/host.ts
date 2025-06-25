
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
		async deliverInfo({id, info}) {
			machina.dispatch(id, {type: "info", data: info})
		}
	},
	decoder: {},
	encoder: {
		async deliverQueueSize({id, size}) {
			machina.dispatch(id, {type: "encoderQueueSize", size})
		},
	}
}))

