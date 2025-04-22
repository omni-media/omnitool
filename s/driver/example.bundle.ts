// import "@benev/slate/x/node.js"
import {encoderDefaultConfig} from "./constants.js"
import {establishSimpleDriver} from "../driver2/parts/establishers.js"
import {FileSystemHelper} from "../driver2/utils/file-system-helper.js"

// const {driver} = await establishClusterDriver()
const {driver} = await establishSimpleDriver()
const fileSystem = new FileSystemHelper()
const input = document.querySelector("input")
const canvas = document.querySelector("canvas")
const saveButton = document.querySelector(".save") as HTMLButtonElement
const ctx = canvas?.getContext("2d")
let result: Uint8Array | null = null

saveButton?.addEventListener("click", () => {
	if(result)
		fileSystem.save(result)
})

input?.addEventListener("change", async () => {
	const file = input.files?.[0]
	const buffer = await file?.arrayBuffer()
	if(buffer) {
		const bytes = new Uint8Array(buffer)
		const {video, config} = await driver.demux(bytes)
		const encodedChunks: {chunk: EncodedVideoChunk, meta: EncodedVideoChunkMetadata | undefined}[] = []
		const encoder = driver.encoder(encoderDefaultConfig, (chunk, meta) => encodedChunks.push({chunk, meta}))
		await driver.decode(config, video, async (frame) => {
			const composed = await driver.composite([
				{
					kind: "image",
					frame
				},
				{
					kind: "text",
					content: "omnitool",
					fontSize: 50,
					color: "red"
				}
			])
			ctx!.drawImage(composed, 0, 0)
			await encoder.encode(composed)
		})
		await encoder.flush()
		result = await driver.mux({width: 1920, height: 1080}, encodedChunks)
		saveButton.disabled = false
	}
})

