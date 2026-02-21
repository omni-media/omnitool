
import {TextStyleOptions} from "pixi.js"
import {AsSchematic} from "@e280/comrade"
import type {AudioEncodingConfig, StreamTargetChunk, VideoEncodingConfig} from "mediabunny"

import {Mat6} from "../../timeline/utils/matrix.js"
import {Id} from "../../timeline/index.js"

export type DriverSchematic = AsSchematic<{

	// happens on the web worker
	work: {
		hello(): Promise<void>

		decodeAudio(input: {
			source: DecoderSource
			audio: WritableStream<AudioData>
			start?: number
			end?: number
		}): Promise<void>

		decodeVideo(input: {
			source: DecoderSource
			video: WritableStream<VideoFrame>
			start?: number
			end?: number
		}): Promise<void>

		encode(input: EncoderInput & {writable: WritableStream<StreamTargetChunk>}): Promise<void>
	}

	// happens on the main thread
	host: {
		world(): Promise<void>
	}
}>

export interface EncoderInput {
	video?: ReadableStream<VideoFrame>
	audio?: ReadableStream<AudioData>
	config: RenderConfig
}

export interface RenderConfig {
	video: VideoEncodingConfig
	audio: AudioEncodingConfig
}

export type DecoderSource = Blob | string | URL

export interface DecoderInput {
	source: DecoderSource
	start?: number
	end?: number
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

export type TextLayer = {
	id: Id
	kind: 'text'
	content: string
	style?: TextStyleOptions
	matrix?: Mat6
}

export type ImageLayer = {
	id: Id
	kind: 'image'
	frame: VideoFrame
	matrix?: Mat6
}

export type TransitionLayer = {
	id: Id
  kind: 'transition'
  name: string
  progress: number
  from: VideoFrame
  to: VideoFrame
}

export type GapLayer = {
	id: Id
	kind: 'gap'
}

export type Audio = {
	id: Id
	kind: "audio"
	data: AudioData
}

export type Layer = TextLayer | ImageLayer | TransitionLayer | GapLayer

