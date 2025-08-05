import {Comrade, Thread} from "@e280/comrade"

import {WordGroup} from "./parts/types.js"
import {context} from "../../../context.js"
import {setupWhisperHost} from "./fns/host.js"
import {SpeechRecognizer} from "../common/model.js"
import {WhisperSchematic} from "./fns/schematic.js"

export class Whisper extends SpeechRecognizer {
	constructor(public thread: Thread<WhisperSchematic>) {
		super('whisper', "onnx-community/whisper-tiny_timestamped")
	}

	static async setup() {
		const thread = await Comrade.thread<WhisperSchematic>({
			label: "OmnitoolDriver",
			workerUrl: new URL("/tools/speech-recognition/whisper/parts/worker.bundle.min.js", import.meta.url),
			setupHost: setupWhisperHost({
				...this.loaderEvents,
				...this.speechRecognizerEvents
			})
		})
		return new this(thread)
	}

	async init() {
		// there should be called loading of the model in worker instead when transcribe is called ..
	}

	async #transcribe(source: Blob, options?: {multilingual?: boolean, language?: string}) {
		const arrayBuffer = await source.arrayBuffer()
		const audioCTX = new AudioContext({sampleRate: 16000})
		const audioData = await audioCTX.decodeAudioData(arrayBuffer)
		let audio
		if (audioData.numberOfChannels === 2) {
			const SCALING_FACTOR = Math.sqrt(2)
			const left = audioData.getChannelData(0)
			const right = audioData.getChannelData(1)
			audio = new Float32Array(left.length)
			for (let i = 0; i < audioData.length; ++i) {
				audio[i] = (SCALING_FACTOR * (left[i] + right[i])) / 2
			}
		} else {
			audio = audioData.getChannelData(0)
		}
		const driver = await context.driver
		const duration = await driver.getAudioDuration(source)
		return await this.thread.work.transcribe({
			audio,
			duration,
			model: this.model,
			subtask: this.multilingual ? "transcribe" : null,
			language:
				this.multilingual && options?.language !== "auto"
					? options?.language ?? "english"
					: null
		})
	}

	async transcribe(source: Blob): Promise<WordGroup> {
		const result = await this.#transcribe(source)

		const words = result?.chunks.map((chunk: any) => ({
			text: chunk.text.trim(),
			timestamp: chunk.timestamp,
		})) as WordGroup

		return words
	}
}
