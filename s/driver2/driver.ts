
import {Comrade, tune, Work} from "@e280/comrade"
import {setupDriverWork} from "./fns/work.js"
import {DriverSchematic} from "./fns/schematic.js"

export class Driver {
	static mocks() {
		const m = Comrade.mockWork<DriverSchematic>(setupDriverWork)
		const driver = new this(m.work)
		m.mockHost(driver.setupHost)
		return driver
	}

	constructor(private work: Work<DriverSchematic>) {}

	setupHost = Comrade.host<DriverSchematic>(() => ({
		deliverDemuxedPacket: {
			async video(stuff) {
				console.log("got video packet", stuff.id)
			},
			async audio(_stuff) {},
			async subtitle(_stuff) {},
		},
	}))

	#id = 0

	async demux() {
		const id = this.#id++
		const bytes = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF])
		this.work.demux[tune]({transfer: [bytes]})({
			id,
			bytes,
			start: 0,
			end: bytes.length - 1,
		})
	}
}

