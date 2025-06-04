
import {Comrade} from "@e280/comrade"
import {Machina} from "./parts/machina.js"
import {setupDriverHost} from "./fns/host.js"
import {DriverSchematic} from "./fns/schematic.js"

export class Driver {
	static async setup() {
		const machina = new Machina()
		const thread = await Comrade.thread<DriverSchematic>({
			label: "OmnitoolDriver",
			workerUrl: new URL("./driver.worker.js", import.meta.url),
			setupHost: setupDriverHost(machina),
		})
		return new this(machina, thread)
	}

	constructor(
		public machina: Machina,
		public thread: Comrade.Thread<DriverSchematic>,
	) {}

	async hello() {
		return this.thread.work.hello()
	}
}

