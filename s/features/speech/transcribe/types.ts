
import {AsSchematic} from "@e280/comrade"
import {Pipeline} from "@huggingface/transformers"

import {PipelineSpec} from "../../types.js"
import {Driver} from "../../../driver/driver.js"

export type TranscriberSchematic = AsSchematic<{
	work: {
		prepare(spec: TranscriberSpec): Promise<void>
		transcribe(request: TranscriptionRequest): Promise<Transcription>
	},

	host: {
		loading(load: Loading): Promise<void>
		deliverReport(report: TranscriptionReport): Promise<void>
		deliverTranscription(transcription: string): Promise<void>
	}
}>

export type Loading = {
	total: number
	progress: number
}

export type TranscribeOptions = {
	pipe: Pipeline
	spec: TranscriberSpec
	request: TranscriptionRequest
	callbacks: TranscriptionCallbacks
}

export type SpeechTime = [start: number, end: number]

export type Transcription = {
	text: string
	chunks: {
		text: string
		timestamp: SpeechTime
	}[]
}

type TranscriberModels = "onnx-community/whisper-tiny_timestamped"

export interface TranscriberSpec extends PipelineSpec<TranscriberModels> {
	chunkLength: number
	strideLength: number
}

export type TranscriptionOptions = {
	source: Blob
	language: string | null
} & TranscriptionCallbacks

export type TranscriptionRequest = {
	audio: ArrayBufferLike
	language: string | null
	duration: number
}

export type TranscriptionReport = {
	progress: number
	tokensPerSecond: number
}

export type TranscriptionCallbacks = {
	onReport: (report: TranscriptionReport) => void
	onTranscription: (transcription: string) => void
}

export type TranscriberOptions = {
	driver: Driver
	spec: TranscriberSpec
	workerUrl: URL | string
	onLoading: (loading: Loading) => void
}

