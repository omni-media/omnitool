//@ts-ignore
import {pipeline} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.0/dist/transformers.min.js"

import {ProgressCallback} from "../speech-recognition/whisper/parts/types.js"

export class PipelineFactory {
	instance: any = null
	model: string | null = null

	constructor(public task: string) {}

	async createInstance(model: string, progressCallback?: ProgressCallback) {
		this.model = model
		return this.instance = await pipeline(this.task, this.model, {
			dtype: {
				encoder_model:
					this.model === "onnx-community/whisper-large-v3-turbo"
						? "fp16"
						: "fp32",
				decoder_model_merged: "q4",
			},
			device: "webgpu",
			progress_callback: progressCallback,
		})
	}
}
