// import "@benev/slate/x/node.js"
import {encoderDefaultConfig} from "./constants.js"
import {establishClusterDriver, establishSimpleDriver} from "../driver2/parts/establishers.js"
import {FileSystemHelper} from "../driver2/utils/file-system-helper.js"
import { Driver } from "../driver3/driver.js"
import fs from "fs/promises"
import path from "path"
// const {driver} = await establishClusterDriver()
// const {driver} = await establishSimpleDriver()
const driver = await Driver.setup()
const fileSystem = new FileSystemHelper()
// const input = document.querySelector("input")
// const canvas = document.querySelector("canvas")
// const saveButton = document.querySelector(".save") as HTMLButtonElement
// const canvas = new OffscreenCanvas(1920, 1080)
// const ctx = canvas?.getContext("2d")
let result: Uint8Array | null = null

// saveButton?.addEventListener("click", () => {
// 	if(result)
// 		fileSystem.save(result)
// })



// input?.addEventListener("change", async () => {
// 	const file = input.files?.[0]
// 	if(file)
// 		demo(file)
// })

const content = await fs.readFile('test.mp4')
demo(content)

async function demo(buffer: Uint8Array) {
	const {video, config, audio} = await driver.demux({buffer, stream: "both"})
	const encodedChunks: {chunk: EncodedVideoChunk, meta: EncodedVideoChunkMetadata | undefined}[] = []
	const encodedAudioChunks: {chunk: EncodedAudioChunk, meta: EncodedAudioChunkMetadata | undefined}[] = []
	const videoEncoder = driver.videoEncoder(encoderDefaultConfig, (chunk, meta) => encodedChunks.push({chunk, meta}))
	const audioEncoder = driver.audioEncoder(config.audio, (chunk, meta) => encodedAudioChunks.push({chunk, meta}))
	await driver.decodeAudio(config.audio, audio, (data) => audioEncoder.encode(data))
	await audioEncoder.flush()
	await driver.decodeVideo(config.video, video, async (frame) => {
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
		// ctx!.drawImage(composed, 0, 0)
		await videoEncoder.encode(composed)
	})

	await videoEncoder.flush()
	result = await driver.mux({
		chunks: {videoChunks: encodedChunks, audioChunks: encodedAudioChunks},
		config: {
			video: {width: 1920, height: 1080},
			audio: {
				...config.audio,
				codec: "aac"
			}
		}
	})
	// saveButton.disabled = false
}
