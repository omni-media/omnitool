
import {ms} from "../../../units/ms.js"
import {TimelineFile} from "../basics.js"
import {fps} from "../../../units/fps.js"
import {Playback} from "./parts/playback.js"
import {Driver} from "../../../driver/driver.js"
import {computeTimelineDuration} from "./parts/handy.js"
import {DecoderSource} from "../../../driver/fns/schematic.js"

type ResolveMedia = (hash: string) => DecoderSource

export class VideoPlayer {
	canvas: HTMLCanvasElement
	playback: Playback

	constructor(
		private driver: Driver,
		resolveMedia: ResolveMedia,
		private timeline: TimelineFile,
	) {
		this.playback = new Playback(timeline, resolveMedia)
		this.canvas = driver.compositor.pixi.renderer.canvas
	}

	async play() {
		await this.playback.start(this.timeline)

		for await (const layers of this.playback.samples()) {
			const frame = await this.driver.composite(layers)
			frame.close()

			if (this.currentTime() >= this.getDuration())
				this.pause()
		}
	}

	pause() {
		this.playback.pause()
	}

	async seek(timeMs: number) {
		const layers = await this.playback.seek(ms(timeMs))
		const frame = await this.driver.composite(layers)
		frame.close()
	}

	setFPS(value: number) {
		this.playback.setFps(fps(value))
	}

	getDuration() {
		return computeTimelineDuration(
			this.timeline.rootId,
			this.timeline
		)
	}

	currentTime() {
		return this.playback.currentTime.value
	}

	/**
	 call this whenever your timeline state changes
	*/
	async update(timeline: TimelineFile) {
		this.timeline = timeline
	}

}

const toUrl = (src: DecoderSource) => (src instanceof Blob ? URL.createObjectURL(src) : String(src))
