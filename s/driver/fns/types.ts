export type MuxerHandler = {
	handle(chunk: EncodedVideoChunk): Promise<void>
	finalize(): Promise<void>
}
/** driver functions that live on the main thread */
export type DriverDaddyFns = {
	ready(): Promise<void>
	demuxResult(data: EncodedVideoChunk, id: string): Promise<void>
	decoderConfigResult(config: VideoDecoderConfig): Promise<void>
	muxResult(data: Uint8Array): Promise<void>
	encodeResult(data: EncodedVideoChunk): Promise<void>
	decodeResult(data: VideoFrame): Promise<void>
}

/** driver functions that live on the web worker */
export type DriverWorkerFns = {
	muxer: {
		init(opts: {id: string, width: number, height: number}): Promise<void>
		addChunk(opts: {id: string; chunk: EncodedVideoChunk}): Promise<void>
		finalize(opts: {id: string}): Promise<Uint8Array>
	}
	demuxer: {
		init(opts: {id: string; bytes: Uint8Array}): Promise<void>
		start(opts: {id: string; start?: number; end?: number}): Promise<void>
		dispose(opts: {id: string}): Promise<void>
	}
	decoder: {
		init(opts: {id: string; config: VideoDecoderConfig}): Promise<void>
		decode(opts: {id: string; chunk: EncodedVideoChunk}): Promise<void>
		close(opts: {id: string}): Promise<void>
	}
	encoder: {
		init(opts: {id: string; config: VideoEncoderConfig}): Promise<void>
		encode(opts: {id: string; frame: VideoFrame}): Promise<void>
		flush(opts: {id: string}): Promise<void>
		close(opts: {id: string}): Promise<void>
	}
	composite(opts: CompositeOpts): Promise<void>
}

export interface DriverAPI {
	createDemuxer(bytes: Uint8Array): Promise<Demuxer>
}

export interface Encoder {
	encode(frame: VideoFrame): void
	flush(): Promise<void>
	close(): void
	onChunk(fn: (chunk: EncodedVideoChunk) => void): void
}

export interface DemuxerOpts {
	id: string
	bytes: Uint8Array
	start?: number
	end?: number
}

export interface Processor {
	close(): void
}

export interface Decoder {
	decode(chunk: EncodedVideoChunk): void
	close(): void
	onFrame(fn: (frame: VideoFrame) => void): void
}

export interface Muxer {
	addChunk(chunk: EncodedVideoChunk): void
	finalize(): Promise<Uint8Array>
}

export interface Demuxer {
	start(): Promise<void>
	onChunk: (fn: (chunk: EncodedVideoChunk) => void) => void
	dispose(): void
}

export interface DecoderOpts {
	config: VideoDecoderConfig
}

export interface EncoderOpts {
	width: number
	height: number
	bitrate: number
	framerate: number
}

export interface MuxOpts {
	video: Uint8Array
	audio?: Uint8Array
	timebase?: number
	width: number
	height: number
}

export interface CompositeOpts {
	frame: VideoFrame
	text?: string
}
