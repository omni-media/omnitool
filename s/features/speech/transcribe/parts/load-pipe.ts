
import {pipeline} from "@huggingface/transformers"

import {PipeOptions} from "../../../types.js"

export async function loadPipe(options: PipeOptions) {
	const {spec, onLoading} = options

	const pipe = await pipeline(options.task, spec.model, {
		device: spec.device,
		dtype: spec.dtype,
		progress_callback: (data: any) => {
			onLoading({total: data.total, progress: data.progress})
		},
	})

	return pipe
}

