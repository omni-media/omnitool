import {defer} from "@e280/stz"
import {WebMediaInfo} from "web-demuxer"
import {Comrade, tune} from "@e280/comrade"

import {Machina} from "./parts/machina.js"
import {Batcher} from "./utils/batcher.js"
import {setupDriverHost} from "./fns/host.js"
import {Composition, DemuxInput} from "./fns/schematic.js"
import {DriverSchematic, VideoEncoderOutput, MuxOpts} from "./fns/schematic.js"

export type DriverOptions = {
	workerUrl: URL | string
}

interface DemuxHandlers {
	onConfig: (config: {audio: AudioDecoderConfig, video: VideoDecoderConfig}) => void
	onInfo?: (info: WebMediaInfo) => void
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
		const {writable, readable} = new TransformStream<EncodedVideoChunk, EncodedVideoChunk>()

		this.machina.register(id, event => {
			if (event.type === "config") {
				input.onConfig(event.config)
			}
			if (event.type === "info") {
				input.onInfo?.(event.data)
			}
		})

		this.thread.work.demux[tune]({transfer: [input.buffer, writable]})({
			id,
			buffer: input.buffer,
			stream: input.stream,
			writable
		})

		return {
			readable
		}
	}

	videoDecoder() {
		const id = this.#id++
		let config: VideoDecoderConfig | null = null
		const haveConfig = defer<void>()
		let lastFrame: VideoFrame | null = null

		const {writable, readable} = new TransformStream<VideoFrame, VideoFrame>({
			transform(chunk, controller) {
				// code to prevent mem leaks and hardware accelerated decoder stall
				lastFrame?.close()
				controller.enqueue(chunk)
				lastFrame = chunk
			}
		})

		return {
			configure: (c: VideoDecoderConfig) => {
				config = c
				haveConfig.resolve()
			},
			decode: async (readable: ReadableStream<EncodedVideoChunk>) => {
				await haveConfig.promise
				await this.thread.work.decodeVideo[tune]({transfer: [readable, writable]})({
					id,
					readable,
					writable,
					config: config!
				})
			},
			readable
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
	) {
		const id = this.#id++
		const {writable, readable} = new TransformStream<VideoEncoderOutput, VideoEncoderOutput>()

		return {
			encode: async (readable: ReadableStream<VideoFrame>) => {
				await this.thread.work.encodeVideo[tune]({transfer: [readable, writable]})({
					id,
					config,
					readable,
					writable
				})
			},
			readable
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
		return await this.thread.work.mux[tune]({transfer: [opts.readables.video]})(opts)
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

