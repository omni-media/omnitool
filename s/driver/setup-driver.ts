// import "@benev/slate/x/node.js"
import Comrade from "@e280/comrade"

import {DriverMachine} from "./driver-machine.js"
import {setupWork, type MySchematic} from "./fns/worker.js"

/** spin up a worker-based driver */
export async function setupDriver() {
	let machine!: DriverMachine

	Comrade.mocks<MySchematic>({
		setupWork,
		setupHost: Comrade.host(DriverMachine.setupHost(d => machine = d))
	})

	return {
		remote: machine,
		dispose: () => {
			// workers.terminate()
		}
	}
}
