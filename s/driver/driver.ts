import {Comrade, tune, Thread} from "@e280/comrade"
import type {StreamTargetChunk} from "mediabunny"

import {Machina} from "./parts/machina.js"
import {setupDriverHost} from "./fns/host.js"
import {DecoderInput, DriverSchematic, Composition, EncoderInput} from "./fns/schematic.js"

export type DriverOptions = {
	workerUrl: URL | string
}

export class Driver {
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
		public thread: Thread<DriverSchematic>
	) {}

	async hello() {
		return this.thread.work.hello()
	}

	decode(input: DecoderInput) {
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
		const audioTransform = new TransformStream<AudioData, AudioData>()
		this.thread.work.decode[tune]({transfer: [videoTransform.writable, audioTransform.writable]})({
			source: input.source,
			video: videoTransform.writable,
			audio: audioTransform.writable,
		})
		return {
			audio: audioTransform.readable,
			video: videoTransform.readable
		}
	}

	async encode({readables, config}: EncoderInput) {
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
		return await this.thread.work.encode[tune]({transfer: [readables.audio, readables.video, bridge]})({readables, config, bridge})
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

