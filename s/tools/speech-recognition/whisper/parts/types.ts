export interface ProgressItem {
	id: string
	progress: number
}

export type Word = {
	text: string
	timestamp: [start: number, end: number]
}

export type WordGroup = Word[]
export type Transcript = WordGroup[]

export interface TranscriptionChunk {
	text: string
	offset: number
	timestamp: [number, number]
	finalised: boolean
}

export interface TranscriptionMessage {
	audio: Float32Array
	model: string
	subtask: string | null
	language: string | null
	duration: number
}

export interface TranscriptionResult {
	text: string
	chunks: TranscriptionChunk[]
	tps: number
}

export type ProgressCallback = (data: any) => void

export type SpeechRecognizerModels = "onnx-community/whisper-tiny_timestamped"
export type SpeechRecognizerSubtasks = "transcribe"
