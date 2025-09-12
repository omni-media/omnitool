import {context} from "../../../context.js"
import {Sampler} from "./parts/node-tree.js"
import {realtime} from "./parts/schedulers.js"
import {TimelineEngine} from "./parts/engine.js"
import {makeHtmlSampler} from "./samplers/html.js"
import {DecoderSource} from "../../../driver/fns/schematic.js"

type ResolveMedia = (hash: string) => DecoderSource

export class VideoPlayer extends TimelineEngine {
	#controller = realtime(t => this.#tick(t))
	#sampler!: Sampler

	constructor(
		public canvas: HTMLCanvasElement,
		private resolveMedia: ResolveMedia = _hash => "/assets/temp/gl.mp4"
	) {
		super()
		this.#controller.setFPS(30)
	}

	get context() {
		return this.canvas.getContext("2d")!
	}

	protected sampler() {
		this.#sampler = makeHtmlSampler(this.resolveMedia)
		return this.#sampler
	}

	async #tick(t: number) {
		const driver = await context.driver
		const dur = this.duration
		const tt = t > dur ? dur : t
		for (const layer of await this.sampleAt(tt)) {
			const frame = await driver.composite(layer)
			this.context.drawImage(frame, 0, 0)
			frame.close()
		}
		if (t >= dur) this.pause()
	}

	async play() {
		if (!this.#controller.isPlaying()) {
			this.#sampler.setPaused!(false)
			this.#controller.play()
		}
	}

	pause() {
		if(this.#controller.isPlaying()) {
			this.#controller.pause()
			this.#sampler.setPaused!(true)
		}
	}

	async seek(time: number) {
		const driver = await context.driver
		this.pause()
		this.#controller.seek(time)
		for (const draw of await this.sampleAt(time)) {
			const frame = await driver.composite(draw)
			this.context.drawImage(frame, 0, 0)
			frame.close()
		}
	}

	setFPS(value: number) {
		this.#controller.setFPS(value)
	}
}

