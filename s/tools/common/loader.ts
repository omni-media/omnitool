import {pub, Pub} from "@e280/stz"
import {ProgressItem} from "../speech-recognition/whisper/parts/types.js"

export interface LoaderEvents {
	onModelLoadProgress: Pub<ProgressItem[]>
	onTpsUpdate: Pub<[number]>
}

export abstract class Loader {
	tps = 0

	static loaderEvents = {
		onModelLoadProgress: pub<ProgressItem[]>(),
		onTpsUpdate: pub<[number]>()
	}

	constructor(public readonly name: string, public model: string) {}

	abstract init(): Promise<void>

	abstract setModel(model: string): void

	setTps(value: number) {
		this.tps = value
	}
}
