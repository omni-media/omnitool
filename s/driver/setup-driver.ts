
import {deferPromise} from "@benev/slate"
import {endpoint, Messenger, Remote} from "renraku"

import {DriverWorkerFns} from "./fns/types.js"
import {DriverMachine} from "./driver-machine.js"
import {makeDriverDaddyFns} from "./fns/daddy-fns.js"

/** spin up a worker-based driver */
export async function setupDriver() {
	const path = new URL("./worker.js", import.meta.url)
	const worker = new Worker(path, {type: "module"})
	const readyprom = deferPromise<void>()

	const machine = new DriverMachine()

	// setting up the renraku messenger with the fns
	const messenger = new Messenger<DriverWorkerFns>({
		timeout: 120_000,
		remotePortal: new Messenger.MessagePortal(worker),
		getLocalEndpoint: (remote, logistics) => endpoint(
			makeDriverDaddyFns(remote, logistics, readyprom, machine)
		),
	})

	// wait for the worker to report that it's done loading
	await readyprom.promise

	// returning remote access to the worker's fns, and a disposer for shutdown
	return {
		machine,
		remote: messenger.remote as Remote<DriverWorkerFns>,
		dispose: () => {
			messenger.dispose()
			worker.terminate()
		},
	}
}

