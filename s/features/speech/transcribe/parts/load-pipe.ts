
import {pipeline} from "@huggingface/transformers"

import {TranscriberPipeOptions} from "../types.js"

export async function loadPipe(options: TranscriberPipeOptions) {
	const {spec, onLoading} = options

	const pipe = await pipeline("automatic-speech-recognition", spec.model, {
		device: spec.device,
		dtype: spec.dtype,
		progress_callback: (data: any) => {
			onLoading({total: data.total, progress: data.progress})
		},
	})

	return pipe
}

