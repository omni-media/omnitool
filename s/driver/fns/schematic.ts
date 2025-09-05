
import {AsSchematic} from "@e280/comrade"
import type {AudioEncodingConfig, StreamTargetChunk, VideoEncodingConfig} from "mediabunny"

export type DriverSchematic = AsSchematic<{

	// happens on the web worker
	work: {
		hello(): Promise<void>

		decode(input: {
			source: DecoderSource
			video: WritableStream<VideoFrame>
			audio: WritableStream<AudioData>
		}): Promise<void>

		encode(input: EncoderInput & {bridge: WritableStream<StreamTargetChunk>}): Promise<void>

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
	config: RenderConfig
}

export interface RenderConfig {
	video: VideoEncodingConfig
	audio: AudioEncodingConfig
}

export type DecoderSource = Blob | string | URL

export interface DecoderInput {
	source: DecoderSource
	onFrame?: (frame: VideoFrame) => Promise<VideoFrame>
}

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

export type GapLayer = {
	kind: 'gap'
}

export type Layer = TextLayer | ImageLayer | GapLayer

