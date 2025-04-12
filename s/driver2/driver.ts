
import {ClusterOptions, Comrade, tune, Work} from "@e280/comrade"
import {Conduit} from "./parts/conduit.js"
import {setupDriverWork} from "./fns/work.js"
import {prepareDriverHost} from "./fns/host.js"
import {DriverSchematic} from "./fns/schematic.js"

export class Driver {

	// setup a mock that only runs on the main thread
	static async mock() {
		const m = Comrade.mockWork<DriverSchematic>(setupDriverWork)
		const conduit = new Conduit()
		const driver = new this(conduit, m.work)
		const setupHost = prepareDriverHost(driver.conduit)
		m.mockHost(setupHost)
		return {driver}
	}

	// setup a cluster of web workers with load balancing
	static async cluster(options: ClusterOptions = {}) {
		const conduit = new Conduit()
		const cluster = await Comrade.cluster({
			...options,
			workerUrl: new URL("./driver.worker.js", import.meta.url),
			setupHost: prepareDriverHost(conduit),
		})
		const driver = new this(conduit, cluster.work)
		return {driver, cluster}
	}

	#id = 0
	constructor(private conduit: Conduit, private work: Work<DriverSchematic>) {}

	async demux() {
		console.log("demux called")
		const id = this.#id++
		const bytes = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF])
		const buffer = bytes.buffer
		this.work.demux[tune]({transfer: [buffer]})({
			id,
			buffer,
			start: 0,
			end: bytes.length - 1,
		})
	}
}

