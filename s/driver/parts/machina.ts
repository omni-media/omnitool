
type Events =
	| {type: "frame", data: VideoFrame}
	| {type: "videoChunk", data: {chunk: EncodedVideoChunk | undefined, meta: EncodedVideoChunkMetadata | undefined, batchNumber: number, done: boolean}}
	| {type: "audioChunk", data: {chunk: EncodedAudioChunk | undefined, meta: EncodedAudioChunkMetadata | undefined, batchNumber: number, done: boolean}}
	| {type: "packet", data: Uint8Array}
	| {type: "audioData", data: AudioData, batchNumber: number}
	| {type: "config", config: {audio: AudioDecoderConfig, video: VideoDecoderConfig}}

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

