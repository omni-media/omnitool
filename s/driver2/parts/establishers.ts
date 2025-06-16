
import {Comrade, LoggerTap} from "@e280/comrade"

import {Driver} from "../driver.js"
import {Conduit} from "./conduit.js"
import {setupDriverWork} from "../fns/work.js"
import {prepareDriverHost} from "../fns/host.js"
import {DriverSchematic} from "../fns/schematic.js"

/** single-threaded driver, runs entirely the main thread */
export async function establishSimpleDriver() {
	const m = Comrade.mockWork<DriverSchematic>(setupDriverWork)
	const conduit = new Conduit()
	const driver = new Driver(conduit, m.work, m.work)
	const setupHost = prepareDriverHost(conduit)
	m.mockHost(setupHost)
	return {driver}
}

/** multi-threaded load-balanced web-worker cluster */
export async function establishClusterDriver() {
	const tap = new LoggerTap()
	const conduit = new Conduit()

	const cluster = await Comrade.cluster({
		workerUrl: new URL("../driver.worker.js", import.meta.url),
		setupHost: prepareDriverHost(conduit),
		label: "omnitool_driver_cluster",
		tap,
	})

	const thread = await Comrade.thread({
		workerUrl: new URL('./driver.worker.js', import.meta.url),
		setupHost: prepareDriverHost(conduit),
		label: "omnitool_driver_thread",
		tap,
	})

	const driver = new Driver(conduit, cluster.work, thread.work)

	return {driver, cluster, thread}
}

