import {Comrade} from "@e280/comrade"
//@ts-ignore
import {pipeline, WhisperTextStreamer} from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.0/dist/transformers.min.js"

import {WhisperSchematic} from "./schematic.js"
import {TranscriptionChunk} from "../parts/types.js"
import {PipelineFactory} from "../../../common/transformer-pipeline.js"

// TODO suspicious globals, probably bad
const pipeline = new PipelineFactory("automatic-speech-recognition")
let transcriber: any

export const setupWhisperWork = Comrade.work<WhisperSchematic>(shell => ({
	async transcribe({audio, model, language, duration}) {
		const isDistil = model.startsWith("distil-whisper/")

		if(!pipeline.model || pipeline.model !== model) {
			pipeline.instance?.dispose()?.()
			pipeline.instance = null
			transcriber = await pipeline.createInstance(
				model,
				(data) => {
					if(data.progress)
						shell.host.updateModelLoadProgress({
							id: data.file,
							progress: data.progress
						})
				}
			)
		}

		const timePrecision =
			transcriber.processor.feature_extractor.config.chunk_length /
			transcriber.model.config.max_source_positions

		const chunkLength = isDistil ? 20 : 30
		const strideLength = isDistil ? 3 : 5

		let chunkCount = 0
		let startTime: number | null = null
		let tokenCount = 0
		let tps = 0

		const chunkDuration = chunkLength - strideLength

		const estimateProgress = () => {
			const audioProgressSeconds = chunkCount * chunkDuration
			return Math.min(audioProgressSeconds / duration, 1)
		}

		const streamer = new WhisperTextStreamer(transcriber.tokenizer, {
			time_precision: timePrecision,
			token_callback_function: () => {
				startTime ??= performance.now()
				if (++tokenCount > 1) {
					tps = (tokenCount / (performance.now() - startTime)) * 1000
					shell.host.updateTps(tps)
				}
			},
			callback_function: (textChunk: any) => {
				shell.host.deliverTranscriptionChunk(textChunk)
			},
			on_finalize: () => {
				startTime = null
				tokenCount = 0
				chunkCount++
				const progress = estimateProgress()
				shell.host.updateTranscribeProgress(progress)
			},
		})

		const output = await transcriber(audio, {
			top_k: 0,
			do_sample: false,
			chunk_length_s: chunkLength,
			stride_length_s: strideLength,
			language,
			task: "transcribe",
			return_timestamps: "word", // if using "word" the on_chunk_start & end is not called thus we cant retrieve timestamps, only after whole thing finishes
			force_full_sequences: false,
			streamer,
		})

		if (!output) return null

		return {
			tps,
			...output,
		}
	}
}))
