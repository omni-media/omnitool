
import {Comrade} from "@e280/comrade"
import {DriverSchematic} from "./schematic.js"

export const setupDriverWork = Comrade.work<DriverSchematic>(({host}, rig) => ({

	async hello() {
		await host.world()
	},
}))

