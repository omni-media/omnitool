
import {Driver} from "../../driver/driver.js"
import {audioEncoderDefaultConfig, encoderDefaultConfig} from "../../driver/parts/constants.js"

export function setupTranscodeTest(driver: Driver, buffer: ArrayBuffer) {

	// TODO this should somehow be detected from the video.. by the.. demuxer??
	const dimensions = {width: 1920, height: 1080}
	const canvas = document.createElement("canvas")
	canvas.width = dimensions.width
	canvas.height = dimensions.height

	// const ctx = canvas.getContext("2d")

	async function run() {
		const videoDecoder = driver.videoDecoder()
		const audioDecoder = driver.audioDecoder()
		const videoEncoder = driver.videoEncoder(encoderDefaultConfig)
		const audioEncoder = driver.audioEncoder(audioEncoderDefaultConfig)

		const demux = driver.demux({buffer, stream: "both",
			onConfig(config) {
				videoDecoder.configure(config.video)
				audioDecoder.configure(config.audio)
			},
			onInfo(info) {}
		})

		videoEncoder.encode(videoDecoder.readable)
		videoDecoder.decode(demux.readables.video)
		audioDecoder.decode(demux.readables.audio)
		audioEncoder.encode(audioDecoder.readable)

		// muxer config must match encoder config to work
		const bytes = await driver.mux({
			readables: {
				video: videoEncoder.readable,
				audio: audioEncoder.readable
				},
			config: {
				video: dimensions,
				audio: {
					sampleRate: 44100,
					numberOfChannels: 2,
					codec: "aac"
				}
			}
		})

		return bytes
	}

	return {canvas, run}
}

