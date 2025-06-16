import {defer} from "@e280/stz"
import {Comrade, tune} from "@e280/comrade"

import {Machina} from "./parts/machina.js"
import {Batcher} from "./utils/batcher.js"
import {setupDriverHost} from "./fns/host.js"
import {DriverSchematic, MuxOpts} from "./fns/schematic.js"
import {Composition, DemuxInput} from "./fns/schematic.js"

export type DriverOptions = {
	workerUrl: URL | string
}

interface DemuxHandlers {
	onChunk: (data: {chunk: EncodedVideoChunk | undefined, done: boolean}) => void
	onConfig: (config: {audio: AudioDecoderConfig, video: VideoDecoderConfig}) => void
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

	demux(input: DemuxInput & DemuxHandlers) {
		const id = this.#id++

		this.machina.register(id, event => {
			if (event.type === "videoChunk") {
				if(event.data.chunk) {
					input.onChunk({chunk: event.data.chunk, done: event.data.done})
				} else input.onChunk({chunk: event.data.chunk, done: event.data.done})
			}
			if (event.type === "config") {
				input.onConfig(event.config)
			}
		})

		this.thread.work.demux[tune]({transfer: [input.buffer]})({
			id,
			buffer: input.buffer,
			stream: input.stream
		})
	}

	async videoDecoder(
		onFrame: (frame: VideoFrame) => void
	) {
		const id = this.#id++
		let config: VideoDecoderConfig | null = null
		let currentGroup: EncodedVideoChunk[] = []

		this.machina.register(id, event => {
			if (event.type === "frame") {
				onFrame(event.data)
			}
		})

		let lastDecode = Promise.resolve()
		let done = defer<void>()

		const sendToWork = (chunks: EncodedVideoChunk[]) => {
			lastDecode = lastDecode.then(() => this.thread.work.decodeVideo[tune]({transfer: []})({
				id,
				chunks,
				config: config!
			}))
		}

		const decodeGroup = async () => {
			const first = currentGroup[0]
			const last = currentGroup[currentGroup.length - 1]
			const same = first.timestamp === last.timestamp
			if (first.type === "key" && last.type === "key" && !same) {
				const last = currentGroup.pop()
				sendToWork(currentGroup)
				currentGroup = [last!]
				await lastDecode
			}
		}

		return {
			configure: (c: VideoDecoderConfig) => {
				config = c
			},
			decode: async (data: {chunk: EncodedVideoChunk | undefined, done: boolean}) => {
				if(data.chunk) {
					currentGroup.push(data.chunk)
				}
				await decodeGroup()
				if(data.done) {
					sendToWork(currentGroup)
					done.resolve()
				}
			},
			flush: async () => {
				await done.promise
				await lastDecode
				await decodeGroup()
				this.machina.unregister(id)
			}
		}
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
		const batchSize = 100
		const id = this.#id++
		const encodePromises: Promise<void>[] = []
		const queue: {chunk: EncodedVideoChunk, meta: EncodedVideoChunkMetadata | undefined}[][] = []
		let process = 0
		let flushing = false

		this.machina.register(id, event => {
			if (event.type === "videoChunk") {
				if(event.data.chunk) {
					if(flushing) {
						onChunk(event.data.chunk, event.data.meta)
						return
					}
					(queue[event.data.batchNumber] ??= []).push({
						chunk: event.data.chunk,
						meta : event.data.meta
					});
					if(queue[process].length === batchSize) {
						for(const item of queue[process]) {
							onChunk(item.chunk, item.meta)
						}
						process += 1
					}
				}
			}
		})

		const batcher = new Batcher<VideoFrame, {chunk: EncodedVideoChunk, meta: EncodedVideoChunkMetadata | undefined}>({
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
			encode: (frame: VideoFrame) => {
				batcher.push(frame)
			},
			flush: async () => {
				await Promise.all(encodePromises)
				await batcher.flush()
				flushing = true
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
				if(event.data.chunk)
					onChunk(event.data.chunk, event.data.meta)
		})

		const batcher = new Batcher<AudioData, any>({
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

