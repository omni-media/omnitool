// import "@benev/slate/x/node.js"
import {setupDriver} from "./setup-driver.js"

const input = document.querySelector("input")
input?.addEventListener("change", async () => {
	const file = input.files?.[0]
	const buffer = await file?.arrayBuffer()
	if(buffer) {
		const bytes = new Uint8Array(buffer)
		example(bytes)
	}
})

export async function example(bytes: Uint8Array) {
	const driver = await setupDriver()
	const demuxer = await driver.remote.createDemuxer(bytes)
	await demuxer.start()
	demuxer.onChunk(chunk => console.log(chunk))
}
