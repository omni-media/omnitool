import {pub} from "@e280/stz"

import {Loader} from "../../common/loader.js"
import {DecoderSource} from "../../../driver/fns/schematic.js"
import {SpeechRecognizerModels, Word, WordGroup} from "../whisper/parts/types.js"

export abstract class SpeechRecognizer extends Loader {
	multilingual = true

	static speechRecognizerEvents = {
		onTranscriptionChunk: pub<Word[]>(),
		onTranscribeProgress: pub<[number]>()
	}

	abstract transcribe(input: DecoderSource): Promise<WordGroup>

	setMultilingual(value: boolean) {
		this.multilingual = value
	}

	detectLanguage?(input: Blob | AudioBuffer): Promise<string>

	setModel(value: SpeechRecognizerModels) {
		this.model = value
	}
}
