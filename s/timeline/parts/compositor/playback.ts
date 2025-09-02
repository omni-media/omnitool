import {Samplers} from "./parts/node-tree.js"
import {TimelineEngine} from "./parts/engine.js"
import {DecoderSource} from "../../../driver/fns/schematic.js"
import {DrawThunk, makeHtmlVideoSampler} from "./samplers/html.js"
import {realtime, RealtimeController} from "./parts/schedulers.js"

type ResolveMedia = (hash: string) => DecoderSource

export class VideoPlayer extends TimelineEngine<DrawThunk> {
	private controller: RealtimeController | null = null
	#sampler!: Samplers<DrawThunk>

	constructor(
		public canvas: HTMLCanvasElement,
		private resolveMedia: ResolveMedia = _hash => "/assets/temp/gl.mp4"
	) {super()}

	get context() {
		return this.canvas.getContext("2d")!
	}

	protected samplers() {
		this.#sampler = makeHtmlVideoSampler(
			this.canvas,
			this.resolveMedia,
		)
		return this.#sampler
	}

	play() {
		if (this.controller?.isPlaying()) return
		this.controller ??= realtime(async t => {
			console.log(t)
			const dur = this.duration
			const tt = t > dur ? dur : t

			const ctx = this.context
			ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

			const thunks = await this.sampleAt(tt)
			for (const draw of thunks) draw(ctx)

			if (t >= dur) this.pause()
		})
		this.controller?.play()
	}

	pause() {
		this.controller?.pause()
		this.#sampler.setPaused?.(true)
	}

	seek(time: number) {
		this.controller?.seek(time)
	}

}

