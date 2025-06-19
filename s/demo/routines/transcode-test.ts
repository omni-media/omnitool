
import {Driver} from "../../driver/driver.js"
import {encoderDefaultConfig} from "../../driver/parts/constants.js"

export function setupTranscodeTest(driver: Driver, buffer: ArrayBuffer) {

	// TODO this should somehow be detected from the video.. by the.. demuxer??
	const dimensions = {width: 1920, height: 1080}
	const canvas = document.createElement("canvas")
	canvas.width = dimensions.width
	canvas.height = dimensions.height

	// const ctx = canvas.getContext("2d")

	async function run() {
		const videoDecoder = driver.videoDecoder()
		const videoEncoder = driver.videoEncoder(encoderDefaultConfig)

		const demux = driver.demux({buffer, stream: "both",
			onConfig(config) {
				videoDecoder.configure(config.video)
			},
			onInfo(info) {}
		})

		videoEncoder.encode(videoDecoder.readable)
		videoDecoder.decode(demux.readable)

		const bytes = await driver.mux({
			readables: {video: videoEncoder.readable},
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

