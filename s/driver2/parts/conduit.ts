type ConduitEvent =
	| {type: "frame", data: VideoFrame}
	| {type: "videoChunk", data: {chunk: EncodedVideoChunk, meta: EncodedVideoChunkMetadata | undefined}}
	| {type: "audioChunk", data: {chunk: EncodedAudioChunk, meta: EncodedAudioChunkMetadata | undefined}}
	| {type: "packet", data: Uint8Array}
	| {type: "audioData", data: AudioData}

type Handler = (event: ConduitEvent) => void
/** stately functionality that the host fns need belongs here */
export class Conduit {
	#handlers = new Map<number, Handler>()

	register(id: number, handler: Handler) {
		this.#handlers.set(id, handler)
	}

	unregister(id: number) {
		this.#handlers.delete(id)
	}

	dispatch(id: number, event: ConduitEvent) {
		this.#handlers.get(id)?.(event)
	}
}

