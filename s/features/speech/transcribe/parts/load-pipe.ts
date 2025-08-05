
//@ts-ignore
import {pipeline} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.0/dist/transformers.min.js"

import {TranscriberPipeOptions} from "../types.js"

export async function loadPipe(options: TranscriberPipeOptions) {
	const {spec, onLoading} = options

	const pipe = await pipeline("automatic-speech-recognition", spec.model, {
		device: spec.device,
		dtype: spec.dtype,
		progress_callback: (_data: any) => {
			// TODO update progress
			onLoading({total: 100, progress: 0})
		},
	})

	return pipe
}

