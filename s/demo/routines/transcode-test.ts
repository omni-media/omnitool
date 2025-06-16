
import {Driver} from "../../driver/driver.js"
import {encoderDefaultConfig} from "../../driver/parts/constants.js"

export function setupTranscodeTest(driver: Driver, buffer: ArrayBuffer) {

	// TODO this should somehow be detected from the video.. by the.. demuxer??
	const dimensions = {width: 1920, height: 1080}

	const canvas = document.createElement("canvas")
	canvas.width = dimensions.width
	canvas.height = dimensions.height
	const ctx = canvas.getContext("2d")

	async function run() {
		driver.demux({buffer, stream: "both",
			onConfig(config) {
				videoDecoder.configure(config.video)
			},
			onChunk(data) {
				videoDecoder.decode(data)
			},
			onInfo(info) {
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

		const bytes = await driver.mux({
			chunks: {videoChunks: encodedChunks, audioChunks: encodedAudioChunks},
			config: {
				video: dimensions,
				// audio: {
				// 	...config.audio,
				// 	codec: "aac"
				// }
			}
		})

		return bytes
	}

	return {canvas, run}
}

