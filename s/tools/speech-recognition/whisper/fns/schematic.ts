import {Pub} from "@e280/stz"
import {AsSchematic} from "@e280/comrade"

import {LoaderEvents} from "../../../common/loader.js"
import {ProgressItem, TranscriptionChunk, TranscriptionMessage, TranscriptionResult, Word} from "../parts/types.js"

export type WhisperSchematic = AsSchematic<{
	work: {
		transcribe(input: TranscriptionMessage): Promise<TranscriptionResult | null>
	},

	host: {
		updateModelLoadProgress(item: ProgressItem): Promise<void>
		deliverTranscriptionChunk(chunk: TranscriptionChunk): Promise<void>
		updateTps(value: number): Promise<void>
		updateTranscribeProgress(value: number): Promise<void>
	}
}>

export interface SpeechRecognizerHostEvents extends LoaderEvents {
	onTranscriptionChunk: Pub<Word[]>
	onTranscribeProgress: Pub<[number]>
}
