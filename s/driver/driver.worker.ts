
import {endpoint, Messenger} from "renraku"
import {DriverDaddyFns} from "./fns/types.js"
import {makeDriverWorkerFns} from "./fns/worker-fns.js"

const messenger = new Messenger<DriverDaddyFns>({
	timeout: 120_000,
	remotePortal: new Messenger.MessagePortal(self),
	getLocalEndpoint: (remote, logistics) => endpoint(
		makeDriverWorkerFns(remote, logistics)
	),
})

// signal to host that we're done loading
await messenger.remote.ready()

