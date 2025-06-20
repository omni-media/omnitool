import {defer} from "@e280/stz"
import {WebMediaInfo} from "web-demuxer"
import {Comrade, tune} from "@e280/comrade"

import {Machina} from "./parts/machina.js"
import {setupDriverHost} from "./fns/host.js"
import {AudioEncoderOutput, Composition, DemuxInput} from "./fns/schematic.js"
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
		const videoStream = new TransformStream<EncodedVideoChunk, EncodedVideoChunk>()
		const audioStream = new TransformStream<EncodedVideoChunk, EncodedVideoChunk>()

		this.machina.register(id, event => {
			if (event.type === "config") {
				input.onConfig(event.config)
			}
			if (event.type === "info") {
				input.onInfo?.(event.data)
			}
		})

		this.thread.work.demux[tune]({transfer: [input.buffer, videoStream.writable, audioStream.writable]})({
			id,
			buffer: input.buffer,
			stream: input.stream,
			writables: {video: videoStream.writable, audio: audioStream.writable}
		})

		return {
			readables: {
				video: videoStream.readable,
				audio: audioStream.readable
			}
		}
	}

	videoDecoder(onFrame?: (frame: VideoFrame) => Promise<VideoFrame>) {
		const id = this.#id++
		let config: VideoDecoderConfig | null = null
		const haveConfig = defer<void>()
		let lastFrame: VideoFrame | null = null

		const {writable, readable} = new TransformStream<VideoFrame, VideoFrame>({
			async transform(chunk, controller) {
				const frame = await onFrame?.(chunk) ?? chunk
				// code to prevent mem leaks and hardware accelerated decoder stall
				lastFrame?.close()
				controller.enqueue(frame)
				lastFrame = frame
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

	audioDecoder() {
		const id = this.#id++
		let config: AudioDecoderConfig | null = null
		const haveConfig = defer<void>()
		const {writable, readable} = new TransformStream<AudioData, AudioData>()

		return {
			configure: (c: AudioDecoderConfig) => {
				config = c
				haveConfig.resolve()
			},
			decode: async (readable: ReadableStream<EncodedAudioChunk>) => {
				await haveConfig.promise
				await this.thread.work.decodeAudio[tune]({transfer: [readable, writable]})({
					id,
					config: config!,
					writable,
					readable
				})
			},
			readable
		}
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
		config: AudioEncoderConfig
	) {
		const id = this.#id++
		const {writable, readable} = new TransformStream<AudioEncoderOutput, AudioEncoderOutput>()

		return {
			encode: async (readable: ReadableStream<AudioData>) => {
				await this.thread.work.encodeAudio[tune]({transfer: [readable, writable]})({
					id,
					config,
					readable,
					writable
				})
			},
			readable
		}
	}

	async mux(opts: MuxOpts): Promise<Uint8Array> {
		const transfer = opts.readables.audio ? [opts.readables.video, opts.readables.audio] : [opts.readables.video]
		return await this.thread.work.mux[tune]({transfer})(opts)
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

