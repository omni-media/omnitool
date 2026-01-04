
import {Comrade} from "@e280/comrade"
import {setupDriverWork} from "./fns/work.js"
import {DriverSchematic} from "./fns/schematic.js"

export async function driverWorker() {
	await Comrade.worker<DriverSchematic>(setupDriverWork)
}

