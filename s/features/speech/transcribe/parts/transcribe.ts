
import {WhisperTextStreamer} from "@huggingface/transformers"
import {TranscribeOptions} from "../types.js"

export async function transcribe(options: TranscribeOptions) {
	const {pipe, spec, request, callbacks} = options

	const timePrecision = (
		pipe.processor.feature_extractor.config.chunk_length /
		pipe.model.config.max_source_positions
	)

	let chunkCount = 0
	let startTime: number | null = null
	let tokenCount = 0
	let tokensPerSecond = 0

	const chunkDuration = spec.chunkLength - spec.strideLength

	const calculateProgress = () => {
		const audioProgressSeconds = chunkCount * chunkDuration
		return Math.min(audioProgressSeconds / request.duration, 1)
	}

	const streamer = new WhisperTextStreamer(pipe.tokenizer, {
		time_precision: timePrecision,
		token_callback_function: () => {
			startTime ??= performance.now()
			if (++tokenCount > 1) {
				tokensPerSecond = (tokenCount / (performance.now() - startTime)) * 1000
			}
		},
		callback_function: (textChunk: any) => {
			// TODO
			callbacks.onTranscription(textChunk)
			callbacks.onReport({tokensPerSecond, progress: calculateProgress()})
		},
		on_finalize: () => {
			startTime = null
			tokenCount = 0
			chunkCount++
			callbacks.onReport({tokensPerSecond, progress: calculateProgress()})
		},
	})

	await pipe(new Float32Array(request.audio), {
		top_k: 0,
		do_sample: false,
		chunk_length_s: spec.chunkLength,
		stride_length_s: spec.strideLength,
		language: request.language,
		task: "transcribe",
		return_timestamps: "word", // if using "word" the on_chunk_start & end is not called thus we cant retrieve timestamps, only after whole thing finishes
		force_full_sequences: false,
		streamer,
	})
}

