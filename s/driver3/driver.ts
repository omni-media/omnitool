import {Comrade, tune} from "@e280/comrade"

import {Machina} from "./parts/machina.js"
import {setupDriverHost} from "./fns/host.js"
import {Batcher} from "../driver2/utils/batcher.js"
import {DriverSchematic, MuxOpts} from "./fns/schematic.js"
import {Composition, DemuxInput, DemuxOutput} from "../driver2/fns/schematic.js"

export type DriverOptions = {
	workerUrl: URL | string
}

export class Driver {
	#id = 0

	static async setup(options: DriverOptions) {
		const machina = new Machina()
		const thread = await Comrade.thread<DriverSchematic>({
			label: "OmnitoolDriver",
			workerUrl: options.workerUrl,
			setupHost: setupDriverHost(machina),
		})
		return new this(machina, thread)
	}

	constructor(
		public machina: Machina,
		public thread: Comrade.Thread<DriverSchematic>,
	) {}

	async hello() {
		return this.thread.work.hello()
	}

	async demux<T extends DemuxInput>(input: T): Promise<DemuxOutput<T>> {
		const id = this.#id++
		const result = await this.thread.work.demux[tune]({transfer: [input.buffer]})({
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

		this.machina.register(id, event => {
			if (event.type === "frame") {
				onFrame(event.data)
			}
		})

		await this.thread.work.decodeVideo[tune]({transfer: []})({
			id,
			config,
			chunks,
		})

		this.machina.unregister(id)
	}

	async decodeAudio(
		config: AudioDecoderConfig,
		chunks: EncodedAudioChunk[],
		onData: (data: AudioData) => void
	) {
		const id = this.#id++

		this.machina.register(id, event => {
			if (event.type === "audioData") {
				onData(event.data)
			}
		})

		await this.thread.work.decodeAudio[tune]({transfer: []})({
			id,
			config,
			chunks,
		})

		this.machina.unregister(id)
	}

	videoEncoder(
		config: VideoEncoderConfig,
		onChunk: (chunk: EncodedVideoChunk, meta: EncodedVideoChunkMetadata | undefined) => void,
	) {
		let currentBatchNumber = 1
		const batchSize = 10
		const id = this.#id++
		const encodePromises: Promise<void>[] = []

		type QueuedChunk = {
			chunk: EncodedVideoChunk
			meta: EncodedVideoChunkMetadata | undefined
			batchNumber: number
		}

		const queue = new Map<number, (QueuedChunk | undefined)[]>()

		this.machina.register(id, event => {
			if (event.type === "videoChunk") {
				const data = event.data as QueuedChunk

				if (!queue.has(data.batchNumber))
					queue.set(data.batchNumber, [])

				const batch = queue.get(event.data.batchNumber)!
				batch.push(data)
				const currentBatchQueue = queue.get(currentBatchNumber)

				if (data.batchNumber === currentBatchNumber) {
					for (const element of batch) {
						if (element) {
							const index = batch.indexOf(element)
							onChunk(element.chunk, element.meta)
							batch[index] = undefined
						}
					}
				}

				if (currentBatchQueue?.length === batchSize)
					currentBatchNumber++
			}
		})

		const batcher = new Batcher<VideoFrame>({
			size: batchSize,
			onBatch: async (batch, batchNumber) => {
				const encodePromise = this.thread.work.encodeVideo[tune]({transfer: batch})({
					id,
					config,
					batchNumber,
					frames: batch
				})
				encodePromises.push(encodePromise)
				for (const f of batch) f.close()
			}
		})

		return {
			encode: (frame: VideoFrame) => {batcher.push(frame)},
			flush: async () => {
				await batcher.flush()
				await Promise.all(encodePromises)
				this.machina.unregister(id)
			}
		}
	}

	audioEncoder(
		config: AudioEncoderConfig,
		onChunk: (chunk: EncodedAudioChunk, meta: EncodedAudioChunkMetadata | undefined) => void,
	) {
		const id = this.#id++

		this.machina.register(id, event => {
			if (event.type === "audioChunk")
				onChunk(event.data.chunk, event.data.meta)
		})

		const batcher = new Batcher<AudioData>({
			size: 10,
			onBatch: async batch => {
				await this.thread.work.encodeAudio[tune]({transfer: batch})({
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
				this.machina.unregister(id) // maybe it should not unregister here ..
			}
		}
	}

	async mux(opts: MuxOpts): Promise<Uint8Array> {
		return await this.thread.work.mux[tune]({transfer: [
			// opts.chunks.videoChunks,
			// opts.chunks.audioChunks
			// ?? []
			]
			})(opts)
	}

	async composite(
		composition: Composition,
	) {
		const transfer = this.#collectTransferablesFromComposition(composition)
		return await this.thread.work.composite[tune]({transfer})(composition)
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

