
import Comrade from "@e280/comrade"
import {DriverSchematic} from "../schematic.js"

export const setupDriverWork = Comrade.work<DriverSchematic>(() => ({
	async add(a, b) {
		return a + b
	}
}))

