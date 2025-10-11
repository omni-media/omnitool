import {Comrade, tune, Thread} from "@e280/comrade"
import {ALL_FORMATS, Input, type StreamTargetChunk} from "mediabunny"

import {Machina} from "./parts/machina.js"
import {setupDriverHost} from "./fns/host.js"
import {loadDecoderSource} from "./utils/load-decoder-source.js"
import {DecoderInput, DriverSchematic, Composition, EncoderInput, DecoderSource} from "./fns/schematic.js"

export type DriverOptions = {
	workerUrl: URL | string
}

export class Driver {
	static async setup(options?: DriverOptions) {
		const machina = new Machina()
		const thread = await Comrade.thread<DriverSchematic>({
			label: "OmnitoolDriver",
			workerUrl: options?.workerUrl ?? "/node_modules/@omnimedia/omnitool/x/driver/driver.worker.bundle.min.js",
			setupHost: setupDriverHost(machina),
		})
		return new this(machina, thread)
	}

	constructor(
		public machina: Machina,
		public thread: Thread<DriverSchematic>
	) {}

	async hello() {
		return this.thread.work.hello()
	}

	async getAudioDuration(source: DecoderSource) {
		const input = new Input({
			source: await loadDecoderSource(source),
			formats: ALL_FORMATS
		})

		const audioTrack = await input.getPrimaryAudioTrack()
		return await audioTrack?.computeDuration()
	}

	async getVideoDuration(source: DecoderSource) {
		const input = new Input({
			source: await loadDecoderSource(source),
			formats: ALL_FORMATS
		})

		const videoTrack = await input.getPrimaryVideoTrack()
		return await videoTrack?.computeDuration()
	}

	decodeVideo(input: DecoderInput) {
		let lastFrame: VideoFrame | null = null
		const videoTransform = new TransformStream<VideoFrame, VideoFrame>({
			async transform(chunk, controller) {
				const frame = await input.onFrame?.(chunk) ?? chunk
				// below code is to prevent mem leaks and hardware accelerated decoder stall
				lastFrame?.close()
				controller.enqueue(frame)
				lastFrame = frame
			}
		})
		this.thread.work.decodeVideo[tune]({transfer: [videoTransform.writable]})({
			source: input.source,
			video: videoTransform.writable,
			start: input.start,
			end: input.end
		})
		return videoTransform.readable
	}

	decodeAudio(input: DecoderInput) {
		const audioTransform = new TransformStream<AudioData, AudioData>()
		this.thread.work.decodeAudio[tune]({transfer: [audioTransform.writable]})({
			source: input.source,
			audio: audioTransform.writable,
			start: input.start,
			end: input.end
		})
		return audioTransform.readable
	}

	async encode({video, audio, config}: EncoderInput) {
		const handle = await window.showSaveFilePicker()
		const writable = await handle.createWritable()
		// making bridge because file picker writable is not transferable
		const bridge = new WritableStream<StreamTargetChunk>({
			async write(chunk) {
				await writable.write(chunk)
			},
			async close() {
				await writable.close()
			}
		})
		return await this.thread.work.encode[tune]({transfer: [audio ?? [], video ?? [], bridge]})({video, audio, config, bridge})
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

