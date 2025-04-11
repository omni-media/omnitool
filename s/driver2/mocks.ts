
import Comrade from "@e280/comrade"
import {setupDriverHost} from "./fns/host.js"
import {setupDriverWork} from "./fns/work.js"
import {DriverSchematic} from "./schematic.js"

export function driverMocks() {
	return Comrade.mocks<DriverSchematic>({
		setupHost: setupDriverHost,
		setupWork: setupDriverWork,
	})
}

