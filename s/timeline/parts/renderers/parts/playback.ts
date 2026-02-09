
import {pub} from "@e280/stz"
import {signal} from "@e280/strata"

import {Sampler} from "./sampler.js"
import {realtime} from "./schedulers.js"
import {Ms} from "../../../../units/ms.js"
import {TimelineFile} from "../../basics.js"
import {Fps} from "../../../../units/fps.js"
import {Layer} from "../../../../driver/fns/schematic.js"

export class Playback {
	timeline: TimelineFile | null = null
	onSeek = pub<[Ms]>()
	private resolveNext: ((layers: Layer[]) => void) | null = null

	readonly currentTime = signal(0)
	#controller = realtime(
		compositeTime => this.#tick(compositeTime),
		currentTime => this.currentTime(currentTime)
	)

	constructor(private sampler: Sampler) { }

	async *samples(): AsyncGenerator<Layer[]> {
		while (this.#controller.isPlaying()) {
			yield await new Promise<Layer[]>(resolve => {
				this.resolveNext = resolve
			})
		}
	}

	/**
		seeks internal clock, no sampling happens when seeking
	*/
	seekTime(time: Ms) {
		this.#controller.seek(time)
		this.onSeek(time)
	}

	start(timeline: TimelineFile) {
		this.timeline = timeline
		this.#controller.play()
	}

	pause() {
		this.#controller.pause()
	}

	async #tick(time: Ms) {
		if (!this.timeline) return
		if (!this.#controller.isPlaying()) return
		if (!this.resolveNext) return

		const resolve = this.resolveNext
		this.resolveNext = null

		resolve(await this.sampler.sample(this.timeline, time))

	}

	setFps(fps: Fps) {
		this.#controller.setFPS(fps)
	}
}

