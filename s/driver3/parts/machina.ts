
type Events =
	| {type: "frame", data: VideoFrame}
	| {type: "videoChunk", data: {chunk: EncodedVideoChunk, meta: EncodedVideoChunkMetadata | undefined, batchNumber: number}}
	| {type: "audioChunk", data: {chunk: EncodedAudioChunk, meta: EncodedAudioChunkMetadata | undefined}}
	| {type: "packet", data: Uint8Array}
	| {type: "audioData", data: AudioData}

type Handler = (event: Events) => void

export class Machina {
	count = 0

	#handlers = new Map<number, Handler>()

	register(id: number, handler: Handler) {
		this.#handlers.set(id, handler)
	}

	unregister(id: number) {
		this.#handlers.delete(id)
	}

	dispatch(id: number, event: Events) {
		this.#handlers.get(id)?.(event)
	}
}

