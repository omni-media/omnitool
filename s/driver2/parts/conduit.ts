type ConduitEvent =
	| {type: "frame", data: VideoFrame}
	| {type: "chunk", data: {chunk: EncodedVideoChunk, meta: EncodedVideoChunkMetadata | undefined}}
	| {type: "packet", data: Uint8Array}

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

