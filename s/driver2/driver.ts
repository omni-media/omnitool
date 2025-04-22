import {tune, Work} from "@e280/comrade"

import {Batcher} from "./utils/batcher.js"
import {Conduit} from "./parts/conduit.js"
import {Composition, DriverSchematic} from "./fns/schematic.js"
import {establishClusterDriver, establishSimpleDriver} from "./parts/establishers.js"

export class Driver {
	static simple = establishSimpleDriver
	static cluster = establishClusterDriver

	#id = 0
	constructor(
		private conduit: Conduit,
		private clusterWork: Work<DriverSchematic>,
		private threadWork: Work<DriverSchematic>
	) {}

	async demux(buffer: Uint8Array) {
		const id = this.#id++
		const result = await this.clusterWork.demux[tune]({transfer: [buffer]})({
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

		await this.clusterWork.decode[tune]({transfer: chunks})({
			id,
			config,
			chunks,
		})

		this.conduit.unregister(id)
	}

	encoder(
		config: VideoEncoderConfig,
		onChunk: (chunk: EncodedVideoChunk, meta: EncodedVideoChunkMetadata | undefined) => void,
	) {
		const id = this.#id++

		this.conduit.register(id, event => {
			if (event.type === "chunk")
				onChunk(event.data.chunk, event.data.meta)
		})

		const batcher = new Batcher<VideoFrame>({
			size: 10,
			onBatch: async batch => {
				await this.clusterWork.encode[tune]({transfer: batch})({
					id,
					config,
					frames: batch
				})
				for (const f of batch) f.close()
			}
		})

		return {
			encode: (frame: VideoFrame) => batcher.push(frame),
			flush: async () => {
				await batcher.flush()
				this.conduit.unregister(id) // maybe it should not unregister here ..
			}
		}
	}

	async mux(
		config: {width: number, height: number},
		chunks: {chunk: EncodedVideoChunk, meta: EncodedVideoChunkMetadata | undefined}[]
	): Promise<Uint8Array> {
		return await this.clusterWork.mux[tune]({transfer: chunks})({
			width: config.width,
			height: config.height,
			chunks
		})
	}

	async composite(
		composition: Composition,
	) {
		const transfer = this.#collectTransferablesFromComposition(composition)
		return await this.threadWork.composite[tune]({transfer})(composition)
	}

	#collectTransferablesFromComposition(composition: Composition) {
		const transferables: Transferable[] = []

		const visit = (node: Composition) => {
			if (Array.isArray(node)) {
				for (const child of node)
					visit(child)
			}
			else if (node && typeof node === 'object' && 'kind' in node) {
				if (node.kind === 'image' && node.frame instanceof VideoFrame)
					transferables.push(node.frame)
			}
		}

		visit(composition)
		return transferables
	}
}
