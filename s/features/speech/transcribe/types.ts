
import {AsSchematic} from "@e280/comrade"
import {Driver} from "../../../driver/driver.js"

export type TranscriberSchematic = AsSchematic<{
	work: {
		prepare(spec: TranscriberSpec): Promise<void>
		transcribe(request: TranscriptionRequest): Promise<void>
	},

	host: {
		loading(load: Loading): Promise<void>
		deliverReport(report: TranscriptionReport): Promise<void>
		deliverTranscription(transcription: Transcription): Promise<void>
	}
}>

export type Pipe = any

export type Loading = {
	total: number
	progress: number
}

export type TranscribeOptions = {
	pipe: Pipe
	spec: TranscriberSpec
	request: TranscriptionRequest
	callbacks: TranscriptionCallbacks
}

export type TranscriberPipeOptions = {
	spec: TranscriberSpec
	onLoading: (loading: Loading) => void
}

export type SpeechTime = [start: number, end: number]

export type Transcription = {
	text: string
	time: SpeechTime
	offset: number
}

export type TranscriberSpec = {
	model: string
	dtype: string
	device: string
	chunkLength: number
	strideLength: number
}

export type TranscriptionOptions = {
	source: Blob
	language: string | null
} & TranscriptionCallbacks

export type TranscriptionRequest = {
	audio: ArrayBuffer
	language: string | null
	duration: number
}

export type TranscriptionReport = {
	progress: number
	tokensPerSecond: number
}

export type TranscriptionCallbacks = {
	onReport: (report: TranscriptionReport) => void
	onTranscription: (transcription: Transcription) => void
}

export type TranscriberOptions = {
	driver: Driver
	spec: TranscriberSpec
	workerUrl: URL | string
	onLoading: (loading: Loading) => void
}

