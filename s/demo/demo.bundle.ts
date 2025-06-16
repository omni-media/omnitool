import {Driver} from "../driver3/driver.js"
import {encoderDefaultConfig} from "../driver3/parts/constants.js"
import {FileSystemHelper} from "../driver3/utils/file-system-helper.js"

const workerUrl = new URL("../driver3/driver.worker.bundle.js", import.meta.url)

const driver = await Driver.setup({workerUrl})
await driver.thread.work.hello()

if (driver.machina.count === 1)
	console.log("✅ driver works")
else
	console.error("❌ FAIL driver call didn't work")

const input = document.querySelector("input")
const canvas = document.querySelector("canvas")
const saveButton = document.querySelector(".save") as HTMLButtonElement
const ctx = canvas?.getContext("2d")
let result: Uint8Array | null = null

const fileSystem = new FileSystemHelper()

saveButton?.addEventListener("click", () => {
	if(result)
		fileSystem.save(result)
})

input?.addEventListener("change", async () => {
	const file = input.files?.[0]
	if(file) {
		demo(file)
	}
})

async function demo(file: File) {
	const buffer = await file.arrayBuffer()
	driver.demux({buffer, stream: "both",
		onConfig(config) {
			videoDecoder.configure(config.video)
		},
		onChunk(data) {
			videoDecoder.decode(data)
		}
	})
	const videoDecoder = await driver.videoDecoder(async (frame) => {
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
		videoEncoder.encode(composed)
		frame.close()
	})
	const encodedChunks: {chunk: EncodedVideoChunk, meta: EncodedVideoChunkMetadata | undefined}[] = []
	const encodedAudioChunks: {chunk: EncodedAudioChunk, meta: EncodedAudioChunkMetadata | undefined}[] = []
	const videoEncoder = driver.videoEncoder(encoderDefaultConfig, (chunk, meta) => encodedChunks.push({chunk, meta}))
	// const audioEncoder = driver.audioEncoder(config.audio, (chunk, meta) => encodedAudioChunks.push({chunk, meta}))
	// await driver.decodeAudio(config.audio, audio, (data) => audioEncoder.encode(data))
	console.log("flush")
	await videoDecoder.flush()
	await videoEncoder.flush()
	// await audioEncoder.flush()
	console.log("mux", encodedChunks)
	result = await driver.mux({
		chunks: {videoChunks: encodedChunks, audioChunks: encodedAudioChunks},
		config: {
			video: {width: 1920, height: 1080},
			// audio: {
			// 	...config.audio,
			// 	codec: "aac"
			// }
		}
	})
	saveButton.disabled = false
}
