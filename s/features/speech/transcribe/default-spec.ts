
import {TranscriberSpec} from "./types.js"

export const defaultTranscriberSpec = (): TranscriberSpec => ({
	model: "onnx-community/whisper-tiny_timestamped",
	dtype: "q4",
	device: "wasm",
	chunkLength: 20,
	strideLength: 3,
})

