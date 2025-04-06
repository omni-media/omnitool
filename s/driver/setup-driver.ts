
import {deferPromise} from "@benev/slate"
import {endpoint, Messenger, Remote} from "renraku"

import {DriverWorkerFns} from "./fns/types.js"
import {makeDriverDaddyFns} from "./fns/daddy-fns.js"

export async function setupDriver() {
	const path = new URL("./worker.js", import.meta.url)
	const worker = new Worker(path, {type: "module"})
	const readyprom = deferPromise<void>()

	const messenger = new Messenger<DriverWorkerFns>({
		timeout: 120_000,
		remotePortal: new Messenger.MessagePortal(worker),
		getLocalEndpoint: (remote, logistics) => endpoint(
			makeDriverDaddyFns(remote, logistics, readyprom)
		),
	})

	// wait for the worker to report that it's done loading
	await readyprom.promise

	return {
		remote: messenger.remote as Remote<DriverWorkerFns>,
		dispose: () => {
			messenger.dispose()
			worker.terminate()
		},
	}
}

