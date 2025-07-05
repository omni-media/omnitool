import {Driver} from "../../driver/driver.js"

export function setupTranscodeTest(driver: Driver, buffer: ArrayBuffer) {
	const dimensions = {width: 1920, height: 1080}

	const canvas = document.createElement("canvas")
	canvas.width = dimensions.width
	canvas.height = dimensions.height
	const ctx = canvas.getContext("2d")

	async function run() {
		const readables = driver.decode({
			buffer,
			async onFrame(frame) {
				const composed = await driver.composite([
					{
						kind: "image",
						frame
					},
					{
						kind: "text",
						content: "omnitool!!!!",
						fontSize: 50,
						color: "green"
					}
				])
				frame.close()
				ctx?.drawImage(composed, 0, 0)
				return composed
			}
		})

		const output = await driver.encode({
			readables,
			config: {
				audio: {codec: "opus", bitrate: 128000},
				video: {codec: "vp9", bitrate: 1000000}
			}
		})

		return output ?? buffer
	}

	return {canvas, run}
}
