
import {tune, Work} from "@e280/comrade"

import {Conduit} from "./parts/conduit.js"
import {DriverSchematic} from "./fns/schematic.js"
import {establishClusterDriver, establishSimpleDriver} from "./parts/establishers.js"

export class Driver {
	static simple = establishSimpleDriver
	static cluster = establishClusterDriver

	#id = 0
	constructor(private conduit: Conduit, private work: Work<DriverSchematic>) {}

	async demux() {
		void this.conduit // the conduit is where the host fns do stately stuff

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

