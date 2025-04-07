export class DriverMachine {
	constructor() {}

	#nextId = 0
	#demuxOperations = new Map<number, (result: any) => void>()

	onDemuxedChunk(handleResult: (result: EncodedVideoChunk) => void) {
		const id = this.#nextId++
		this.#demuxOperations.set(id, handleResult)
	}

	reportDemuxedChunk(id: number, result: any) {
		const fn = this.#demuxOperations.get(id)
		if (fn)
			fn(result)
	}

	onDecoderConfig(id: number, result: VideoDecoderConfig) {}
}
