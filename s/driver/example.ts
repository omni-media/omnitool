// import "@benev/slate/x/node.js"
import {setupDriver} from "./setup-driver.js"
import {Batcher} from "../driver2/utils/batcher.js"
import {encoderDefaultConfig} from "./constants.js"
import {establishSimpleDriver} from "../driver2/parts/establishers.js"
import {FileSystemHelper} from "../driver2/utils/file-system-helper.js"

const fileSystem = new FileSystemHelper()
const input = document.querySelector("input")
const saveButton = document.querySelector(".save") as HTMLButtonElement
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
		const batcher = new Batcher<VideoFrame>({
			size: 10, // if using prefer-hardware in decoder the bigger the size the bigger probability of decoder getting stale
			onBatch: async frames => {
				await driver.encode(encoderDefaultConfig, frames, (chunk, meta) =>
					encodedChunks.push({chunk, meta})
				)
				frames.forEach(frame => frame.close()) // if we make it work in worker then it should be closed in worker before sending to main
			}
		})
		await driver.decode(config, video, (frame) => batcher.push(frame))
		await batcher.flush()
		result = await driver.mux({width: 1920, height: 1080}, encodedChunks)
		saveButton.disabled = false
	}
})

export async function example(bytes: Uint8Array) {
	const driver = await setupDriver()
	const demuxer = await driver.remote.createDemuxer(bytes)
	await demuxer.start()
	demuxer.onChunk(chunk => console.log(chunk))
}

const {driver} = await establishSimpleDriver()

