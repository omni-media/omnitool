import {setupDriver} from "./setup-driver.js"

export async function example() {
	const driver = await setupDriver()
	const dummyData = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF])
	// make call to init demuxer, mark data as transferable
	const demuxer = await driver.machine.createDemuxer({bytes: dummyData})
	// start demuxing
	demuxer.start()
	// listen for incoming chunks
	demuxer.onChunk(chunk => console.log(chunk))
	// shutdown the worker gracefully
	driver.dispose()
}

