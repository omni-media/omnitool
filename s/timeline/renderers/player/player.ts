
import {ms} from "../../../units/ms.js"
import {fps} from "../../../units/fps.js"
import {Playback} from "./parts/playback.js"
import {Driver} from "../../../driver/driver.js"
import {TimelineFile} from "../../parts/basics.js"
import {DecoderSource} from "../../../driver/fns/schematic.js"

type ResolveMedia = (hash: string) => DecoderSource

export class VideoPlayer {
	canvas: HTMLCanvasElement
	playback: Playback

	#pendingSeek: number | null = null
	#flushTask: Promise<void> | null = null

	constructor(
		private driver: Driver,
		resolveMedia: ResolveMedia,
		timeline: TimelineFile
	) {
		this.playback = new Playback(driver, timeline, resolveMedia)
		this.canvas = driver.compositor.pixi.renderer.canvas
	}

	async play() {
		await this.playback.start()
	}

	pause() {
		this.playback.pause()
	}

	seek(timeMs: number) {
		this.#pendingSeek = timeMs
		return this.#flushTask ??= this.#flushSeeks().finally(() => this.#flushTask = null)
	}

	setFPS(value: number) {
		this.playback.setFps(fps(value))
	}

	get isSeeking() {
		return this.#flushTask !== null
	}

	get isPlaying() {
		return this.playback.isPlaying
	}

	get duration() {
		return this.playback.duration
	}

	get currentTime() {
		return this.playback.currentTime
	}

	/**
	 call this whenever your timeline state changes
	*/
	update(timeline: TimelineFile) {
		this.playback.update(timeline)
	}

	async #flushSeeks() {
		while (this.#pendingSeek !== null) {
			const next = this.#pendingSeek
			this.#pendingSeek = null
			const layers = await this.playback.seek(ms(next))
			const frame = await this.driver.composite(layers)
			frame.close()
		}
	}
}

