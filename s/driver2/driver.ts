import {tune, Work} from "@e280/comrade"

import {Batcher} from "./utils/batcher.js"
import {Conduit} from "./parts/conduit.js"
import {Composition, DemuxInput, DemuxOutput, DriverSchematic, MuxOpts} from "./fns/schematic.js"
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

	async demux<T extends DemuxInput>(input: T): Promise<DemuxOutput<T>> {
		const id = this.#id++
		const result = await this.clusterWork.demux[tune]({transfer: [input.buffer]})({
			id,
			...input
		})

		return {
			id: result.id,
			video: result.video,
			audio: result.audio,
			config: result.config
		} as DemuxOutput<T>
	}

	async decodeVideo(
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

		await this.clusterWork.decodeVideo[tune]({transfer: chunks})({
			id,
			config,
			chunks,
		})

		this.conduit.unregister(id)
	}

	async decodeAudio(
		config: AudioDecoderConfig,
		chunks: EncodedAudioChunk[],
		onData: (data: AudioData) => void
	) {
		const id = this.#id++

		this.conduit.register(id, event => {
			if (event.type === "audioData") {
				onData(event.data)
			}
		})

		await this.clusterWork.decodeAudio[tune]({transfer: chunks})({
			id,
			config,
			chunks,
		})

		this.conduit.unregister(id)
	}

	videoEncoder(
		config: VideoEncoderConfig,
		onChunk: (chunk: EncodedVideoChunk, meta: EncodedVideoChunkMetadata | undefined) => void,
	) {
		const id = this.#id++

		this.conduit.register(id, event => {
			if (event.type === "videoChunk")
				onChunk(event.data.chunk, event.data.meta)
		})

		const batcher = new Batcher<VideoFrame, any>({
			size: 10,
			onBatch: async batch => {
				await this.clusterWork.encodeVideo[tune]({transfer: batch})({
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

	audioEncoder(
		config: AudioEncoderConfig,
		onChunk: (chunk: EncodedAudioChunk, meta: EncodedAudioChunkMetadata | undefined) => void,
	) {
		const id = this.#id++

		this.conduit.register(id, event => {
			if (event.type === "audioChunk")
				onChunk(event.data.chunk, event.data.meta)
		})

		const batcher = new Batcher<AudioData, any>({
			size: 10,
			onBatch: async batch => {
				await this.clusterWork.encodeAudio[tune]({transfer: batch})({
					id,
					config,
					data: batch
				})
				for (const f of batch) f.close()
			}
		})

		return {
			encode: (data: AudioData) => batcher.push(data),
			flush: async () => {
				await batcher.flush()
				this.conduit.unregister(id) // maybe it should not unregister here ..
			}
		}
	}

	async mux(opts: MuxOpts): Promise<Uint8Array> {
		return await this.clusterWork.mux[tune]({transfer: [opts.chunks.videoChunks, opts.chunks.audioChunks ?? []]})(opts)
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
