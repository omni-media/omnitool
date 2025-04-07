export type MuxerHandler = {
	handle(chunk: EncodedVideoChunk): Promise<void>
	finalize(): Promise<void>
}
/** driver functions that live on the main thread */
export type DriverDaddyFns = {
	ready(): Promise<void>
	demuxResult(data: EncodedVideoChunk): Promise<void>
	decoderConfigResult(config: VideoDecoderConfig): Promise<void>
	muxResult(data: Uint8Array): Promise<void>
	encodeResult(data: EncodedVideoChunk): Promise<void>
	decodeResult(data: VideoFrame): Promise<void>
}

/** driver functions that live on the web worker */
export type DriverWorkerFns = {
	decoder(opts: DecoderOpts): Promise<Decoder>
	encoder(opts: EncoderOpts): Promise<Encoder>
	muxer(opts: MuxOpts): Promise<Muxer>
	demuxer(opts: DemuxerOpts): Promise<Demuxer>
	composite(opts: CompositeOpts): Promise<VideoFrame>
}

interface DemuxerOpts {
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
}

export interface Encoder {
	encode(frame: VideoFrame): void
	close(): void
	flush(): Promise<void>
}

export interface Muxer {
	addChunk(chunk: EncodedVideoChunk): void
	finalize(): Promise<void>
}

export interface Demuxer {
	start(): Promise<void>
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
