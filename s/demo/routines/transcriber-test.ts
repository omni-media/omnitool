import {Driver} from "../../driver/driver.js"
import {makeTranscriber} from "../../features/speech/transcribe/transcriber.js"

export async function transcriberTest(driver: Driver) {
	const transcriber = await makeTranscriber({
		driver,
		spec: {
			model: "onnx-community/whisper-tiny_timestamped",
			device: "webgpu",
			strideLength: 5,
			chunkLength: 30,
			dtype: "fp32"
		},
		workerUrl: new URL("/features/speech/transcribe/worker.bundle.min.js", import.meta.url),
		onLoading({progress, total}) {
	  	console.log(progress, total, "total")
		},
	})
	return {
		transcribe: async (file: File) => {
			const result = await transcriber.transcribe({
				source: file,
				language: "english",
				onReport(report) {
	  			console.log("report", report)
				},
				onTranscription(transcription) {
	  			console.log("transcript", transcription)
				}
			})
			console.log(result, "transcript result")
		}
	}
}
