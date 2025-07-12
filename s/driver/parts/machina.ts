import {WebMediaInfo} from "web-demuxer"

type Events =
	| {type: "config", config: {audio: AudioDecoderConfig, video: VideoDecoderConfig}}
	| {type: "info", data: WebMediaInfo}
	| {type: "encoderQueueSize", size: number}

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

