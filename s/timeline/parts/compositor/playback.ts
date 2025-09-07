import {Sampler} from "./parts/node-tree.js"
import {realtime} from "./parts/schedulers.js"
import {TimelineEngine} from "./parts/engine.js"
import {DecoderSource} from "../../../driver/fns/schematic.js"
import {DrawThunk, makeHtmlVideoSampler} from "./samplers/html.js"

type ResolveMedia = (hash: string) => DecoderSource

export class VideoPlayer extends TimelineEngine<DrawThunk> {
	#controller = realtime(t => this.#tick(t))
	#sampler!: Sampler<DrawThunk>

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
		this.#sampler = makeHtmlVideoSampler(
			this.canvas,
			this.resolveMedia,
		)
		return this.#sampler
	}

	async #tick(t: number) {
		const dur = this.duration
		const tt = t > dur ? dur : t

		const thunks = await this.sampleAt(tt)
		for (const draw of thunks) draw(this.context)

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
		this.pause()
		this.#controller.seek(time)
		const thunks = await this.sampleAt(time)
		for (const draw of thunks) draw(this.context)
	}

	setFPS(value: number) {
		this.#controller.setFPS(value)
	}
}

