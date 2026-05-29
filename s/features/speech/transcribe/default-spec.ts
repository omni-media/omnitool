
import {TranscriberSpec} from "./types.js"

export const defaultTranscriberSpec = (): TranscriberSpec => ({
	model: "onnx-community/whisper-tiny_timestamped",
	dtype: "auto",
	device: "webgpu",
	chunkLength: 20,
	strideLength: 3,
})

