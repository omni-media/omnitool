
import {AsSchematic} from "@e280/comrade"

export type DriverSchematic = AsSchematic<{

	// happens on the web worker
	work: {
		demux(input: {
			id: number
			buffer: ArrayBuffer
			start: number
			end: number
		}): Promise<{
			config: VideoDecoderConfig
			id: number
			video: EncodedVideoChunk[]
			audio: ArrayBuffer[]
			subtitle: ArrayBuffer[]
		}>

		decode(input: {
			id: number
			chunks: EncodedVideoChunk[]
			config: VideoDecoderConfig
		}): Promise<void>

		encode(input: {
			id: number
			config: VideoEncoderConfig
			frames: VideoFrame[]
		}): Promise<void>

		mux(input: {
			width: number
			height: number
			chunks: {chunk: EncodedVideoChunk, meta: EncodedVideoChunkMetadata | undefined}[]
		}): Promise<Uint8Array>
	}

	// happens on the main thread
	host: {
		decoder: {
			deliverFrame(input: {
				id: number
				frame: VideoFrame
			}): Promise<void>
		}
		encoder: {
			deliverChunk(input: {
				id: number
				chunk: EncodedVideoChunk
				meta: EncodedVideoChunkMetadata | undefined
			}): Promise<void>
		}
		// deliverDemuxedPacket: {
		// 	video(output: {id: number, buffer: ArrayBuffer}): Promise<void>
		// 	audio(output: {id: number, buffer: ArrayBuffer}): Promise<void>
		// 	subtitle(output: {id: number, buffer: ArrayBuffer}): Promise<void>
		// }
	}
}>

