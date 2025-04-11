import {Remote} from "@e280/comrade"
import {generate_id} from "@benev/slate"

import {MySchematic} from "./fns/worker.js"
import {createOperation, Operation} from "./fns/create-operation.js"
import type {Decoder, Demuxer, DriverAPI, Encoder, Muxer} from "./fns/types.js"

export class DriverMachine implements DriverAPI {
	#demuxOperations = new Map<string, Operation<EncodedVideoChunk>>()
	#decoderOperations = new Map<string, Operation<VideoFrame>>()
	#encoderOperations = new Map<string, Operation<EncodedVideoChunk>>()

	constructor(private remote: Remote<MySchematic["work"]>) {}

	static setupHost(setDriver: (driver: DriverMachine) => void) {
		return (remote: Remote<MySchematic["work"]>, _rig: any): MySchematic["host"] => {
			const driver = new DriverMachine(remote)
			setDriver(driver)
			return driver.#createMainFns()
		}
	}

	#createMainFns(): MySchematic["host"] {
		const self = this
		return {
			async onDemuxedChunk({id, chunk}) {
				self.#demuxOperations.get(id)?.dispatch(chunk)
			},
			async onFrame({id, frame}) {
				self.#decoderOperations.get(id)?.dispatch(frame)
			},
			async onEncodedChunk({id, chunk}) {
				self.#encoderOperations.get(id)?.dispatch(chunk)
			}
		}
	}

	async createDemuxer(bytes: Uint8Array): Promise<Demuxer> {
		const op = createOperation<EncodedVideoChunk>(
			generate_id,
			(id, handler) => {
				this.#demuxOperations.set(id, {
					id,
					on(fn) {handler = fn},
					dispatch(data) {handler(data)},
					dispose: () => {this.#demuxOperations.delete(id)}
				})
			},
			id => this.#demuxOperations.delete(id)
		)

		await this.remote.demuxer.init({id: op.id, bytes})

		return {
			start: () => this.remote.demuxer.start({id: op.id}),
			onChunk: op.on,
			dispose: () => {
				this.remote.demuxer.dispose({id: op.id})
				op.dispose()
			}
		}
	}

	async createDecoder(config: VideoDecoderConfig): Promise<Decoder> {
		const op = createOperation<VideoFrame>(
			generate_id,
			(id, handler) => {
				this.#decoderOperations.set(id, {
					id,
					on(fn) {handler = fn},
					dispatch(data) {handler(data)},
					dispose: () => {this.#decoderOperations.delete(id)}
				})
			},
			id => this.#decoderOperations.delete(id)
		)

		await this.remote.decoder.init({id: op.id, config})

		return {
			decode: chunk => this.remote.decoder.decode({id: op.id, chunk}),
			close: () => {
				this.remote.decoder.close({id: op.id})
				op.dispose()
			},
			onFrame: op.on
		}
	}

	async createEncoder(config: VideoEncoderConfig): Promise<Encoder> {
		const op = createOperation<EncodedVideoChunk>(
			generate_id,
			(id, handler) => {
				this.#encoderOperations.set(id, {
					id,
					on(fn) {handler = fn},
					dispatch(data) {handler(data)},
					dispose: () => {this.#encoderOperations.delete(id)}
				})
			},
			id => this.#encoderOperations.delete(id)
		)

		await this.remote.encoder.init({id: op.id, config})

		return {
			encode: frame => this.remote.encoder.encode({id: op.id, frame}),
			flush: () => this.remote.encoder.flush({id: op.id}),
			close: () => {
				this.remote.encoder.close({id: op.id})
				op.dispose()
			},
			onChunk: op.on
		}
	}

	async createMuxer(config: {width: number, height: number}): Promise<Muxer> {
		const id = generate_id()
		await this.remote.muxer.init({id, ...config})

		return {
			addChunk: chunk => this.remote.muxer.addChunk({id, chunk}),
			finalize: () => this.remote.muxer.finalize({id})
		}
	}
}
