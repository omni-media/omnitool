import {Comrade} from "@e280/comrade"

import {ProgressItem} from "../parts/types.js"
import {SpeechRecognizerHostEvents, WhisperSchematic} from "./schematic.js"

export const setupWhisperHost = (events: SpeechRecognizerHostEvents) => Comrade.host<WhisperSchematic>(({work}, rig) => ({
	async updateModelLoadProgress(item) {
		events.onModelLoadProgress.pub(item)
	},
	async deliverTranscriptionChunk(chunk) {
		events.onTranscriptionChunk.pub({
			text: chunk.text,
			timestamp: chunk.timestamp
		})
	},
	async updateTps(value) {
		events.onTpsUpdate.pub(value)
	},
	async updateTranscribeProgress(value) {
		events.onTranscribeProgress(value)
	}
}))

