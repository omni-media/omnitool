
import {AsSchematic} from "@e280/comrade"
import type {AudioEncodingConfig, VideoEncodingConfig} from "mediabunny"

export type DriverSchematic = AsSchematic<{

	// happens on the web worker
	work: {
		hello(): Promise<void>

		decode(input: {
			buffer: ArrayBuffer
			video: WritableStream<VideoFrame>
			audio: WritableStream<AudioData>
		}): Promise<void>

		encode(input: EncoderInput): Promise<ArrayBuffer | undefined>

		composite(input: Composition): Promise<VideoFrame>
	}

	// happens on the main thread
	host: {
		world(): Promise<void>
	}
}>

export interface EncoderInput {
	readables: {
		video: ReadableStream<VideoFrame>
		audio: ReadableStream<AudioData>
	},
	config: {
		video: VideoEncodingConfig
		audio: AudioEncodingConfig
	}
}

export interface DecoderInput {
	buffer: ArrayBuffer
	onFrame?: (frame: VideoFrame) => Promise<VideoFrame>
}

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

