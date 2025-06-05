
import {AsSchematic} from "@e280/comrade"

export type DriverSchematic = AsSchematic<{

	// happens on the web worker
	work: {
		hello(): Promise<void>

		demux(input: {id: number} & DemuxInput): Promise<DemuxOutput<DemuxInput>>

		decodeAudio(input: {
			id: number
			chunks: EncodedAudioChunk[]
			config: AudioDecoderConfig
		}): Promise<void>

		decodeVideo(input: {
			id: number
			chunks: EncodedVideoChunk[]
			config: VideoDecoderConfig
		}): Promise<void>

		encodeVideo(input: {
			id: number
			config: VideoEncoderConfig
			frames: VideoFrame[]
		}): Promise<void>

		encodeAudio(input: {
			id: number
			config: AudioEncoderConfig
			data: AudioData[]
		}): Promise<void>

		mux(input: MuxOpts): Promise<Uint8Array>

		composite(input: Composition): Promise<VideoFrame>
	}

	// happens on the main thread
	host: {
		world(): Promise<void>

		decoder: {
			deliverFrame(input: {
				id: number
				frame: VideoFrame
			}): Promise<void>
			deliverAudioData(input: {
				id: number
				data: AudioData
			}): Promise<void>
		}
		encoder: {
			deliverChunk(input: {
				id: number
				chunk: EncodedVideoChunk
				meta: EncodedVideoChunkMetadata | undefined
			}): Promise<void>
			deliverAudioChunk(input: {
				id: number
				chunk: EncodedAudioChunk
				meta: EncodedAudioChunkMetadata | undefined
			}): Promise<void>
		}
		// deliverDemuxedPacket: {
		// 	video(output: {id: number, buffer: ArrayBuffer}): Promise<void>
		// 	audio(output: {id: number, buffer: ArrayBuffer}): Promise<void>
		// 	subtitle(output: {id: number, buffer: ArrayBuffer}): Promise<void>
		// }
	}
}>

export type DemuxStreamKind = "video" | "audio" | "both"

export type DemuxOutput<T extends DemuxInput> =
	T extends VideoOnlyDemuxInput ? {
		id: number
		video: EncodedVideoChunk[]
		audio: []
		config: {video: VideoDecoderConfig, audio?: undefined}
	} : T extends AudioOnlyDemuxInput ? {
		id: number
		video: []
		audio: EncodedAudioChunk[]
		config: {audio: AudioDecoderConfig, video?: undefined}
	} : {
		id: number
		video: EncodedVideoChunk[]
		audio: EncodedAudioChunk[]
		config: {
			video: VideoDecoderConfig
			audio: AudioDecoderConfig
		}
	}

type TimeRange<T extends DemuxStreamKind> =
	T extends 'video' ? {video?: number}
	: T extends 'audio' ? {audio?: number}
	: {video?: number; audio?: number}

interface BaseDemuxInput<T extends DemuxStreamKind> {
	buffer: ArrayBuffer
	stream: T
	start?: TimeRange<T>
	end?: TimeRange<T>
}

export type VideoOnlyDemuxInput = BaseDemuxInput<'video'>
export type AudioOnlyDemuxInput = BaseDemuxInput<'audio'>
export type BothStreamsDemuxInput = BaseDemuxInput<'both'>

export type DemuxInput =
	| VideoOnlyDemuxInput
	| AudioOnlyDemuxInput
	| BothStreamsDemuxInput

export interface MuxOpts {
	config: {
		video: {
			width: number
			height: number
		},
		audio?: {
			codec: "opus" | "aac"
			numberOfChannels: number
			sampleRate: number
		}
	}
	chunks: {
		videoChunks: {chunk: EncodedVideoChunk, meta: EncodedVideoChunkMetadata | undefined}[]
		audioChunks?: {chunk: EncodedAudioChunk, meta: EncodedAudioChunkMetadata | undefined}[]
	}
}

export type Composition = Layer | (Layer | Composition)[]

export type Transform = {
	x?: number
	y?: number
	scale?: number
	opacity?: number
	anchor?: number
}

export type TextLayer = {
	kind: 'text'
	content: string
	fontSize?: number
	color?: string
} & Transform

export type ImageLayer = {
	kind: 'image'
	frame: VideoFrame
} & Transform

export type Layer = TextLayer | ImageLayer

