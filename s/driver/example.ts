
import {advanced} from "renraku"
import {setupDriver} from "./setup-driver.js"

export async function example() {
	const driver = await setupDriver()
	const dummyData = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF])

	// making calls and marking binary data transferable
	const demuxer = await driver.remote.demuxer[advanced]({transfer: [{bytes: dummyData}]})({bytes: dummyData})
	// start demuxing
	// demuxer.start()
	// shutdown the worker gracefully
	driver.dispose()
}

