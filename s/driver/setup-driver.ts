import {deferPromise} from "@benev/slate"
import {endpoint, Messenger} from "renraku"

import {DriverWorkerFns} from "./fns/types.js"
import {DriverMachine} from "./driver-machine.js"

/** spin up a worker-based driver */
export async function setupDriver() {
	const path = new URL("./worker.js", import.meta.url)
	const worker = new Worker(path, {type: "module"})
	const readyprom = deferPromise<void>()

	let machine!: DriverMachine

	const messenger = new Messenger<DriverWorkerFns>({
		timeout: 120_000,
		remotePortal: new Messenger.MessagePortal(worker),
		getLocalEndpoint: (remote, logistics) => {
			const result = DriverMachine.withDaddy(remote, readyprom)
			machine = result.machine
			return endpoint(result.daddy)
		}
	})

	await readyprom.promise

	return {
		machine,
		dispose: () => {
			messenger.dispose()
			worker.terminate()
		}
	}
}
