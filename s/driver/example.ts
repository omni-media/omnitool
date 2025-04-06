
import {advanced} from "renraku"
import {setupDriver} from "./setup-driver.js"

export async function example() {
	const driver = await setupDriver()
	const dummyData = new Uint8Array([1, 2, 3, 4])

	// making calls
	await driver.remote.mux(dummyData)
	await driver.remote.demux(dummyData)

	// making calls and marking binary data transferable
	await driver.remote.mux[advanced]({transfer: [dummyData]})(dummyData)

	// shutdown the worker gracefully
	driver.dispose()
}

