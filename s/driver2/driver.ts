import {tune, Work} from "@e280/comrade"

import {Conduit} from "./parts/conduit.js"
import {DriverSchematic} from "./fns/schematic.js"
import {establishClusterDriver, establishSimpleDriver} from "./parts/establishers.js"

export class Driver {
	static simple = establishSimpleDriver
	static cluster = establishClusterDriver

	#id = 0
	constructor(private conduit: Conduit, private work: Work<DriverSchematic>) {}

	async demux(buffer: Uint8Array) {
		const id = this.#id++
		const result = await this.work.demux[tune]({ transfer: [buffer] })({
			id,
			buffer,
			start: 0,
			end: buffer.byteLength - 1,
		})

		return {
			id: result.id,
			video: result.video,
			audio: result.audio.map(buf => new Uint8Array(buf)),
			subtitle: result.subtitle.map(buf => new Uint8Array(buf)),
			config: result.config
		}
	}

	async decode(
		config: VideoDecoderConfig,
		chunks: EncodedVideoChunk[],
		onFrame: (frame: VideoFrame) => void
	) {
		const id = this.#id++

		this.conduit.register(id, event => {
			if (event.type === "frame") {
				onFrame(event.data)
			}
		})

		await this.work.decode[tune]({ transfer: chunks })({
			id,
			config,
			chunks,
		})

		this.conduit.unregister(id)
	}

	async encode(
		config: VideoEncoderConfig,
		frames: VideoFrame[],
		onChunk: (chunk: EncodedVideoChunk, meta: EncodedVideoChunkMetadata | undefined) => void
	) {
		const id = this.#id++

		this.conduit.register(id, event => {
			if (event.type === "chunk")
				onChunk(event.data.chunk, event.data.meta)
		})

		await this.work.encode[tune]({ transfer: frames })({
			id,
			config,
			frames
		})

		this.conduit.unregister(id)
	}

	async mux(
		config: {width: number, height: number},
		chunks: {chunk: EncodedVideoChunk, meta: EncodedVideoChunkMetadata | undefined}[]
	): Promise<Uint8Array> {
		return await this.work.mux[tune]({ transfer: chunks })({
			width: config.width,
			height: config.height,
			chunks
		})
	}
}
