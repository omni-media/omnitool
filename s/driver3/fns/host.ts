
import {Comrade} from "@e280/comrade"
import {Machina} from "../parts/machina.js"
import {DriverSchematic} from "./schematic.js"

export const setupDriverHost = (machina: Machina) => Comrade.host<DriverSchematic>(({work}, rig) => ({

	async world() {
		machina.count++
	},
}))

