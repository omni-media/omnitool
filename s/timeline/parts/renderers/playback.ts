import {signal} from "@e280/strata"

import {TimelineFile} from "../basics.js"
import {realtime} from "./parts/schedulers.js"
import {Driver} from "../../../driver/driver.js"
import {makeHtmlSampler} from "./samplers/html.js"
import {buildHTMLNodeTree} from "./parts/html-tree.js"
import {DecoderSource} from "../../../driver/fns/schematic.js"
import {AudioPlaybackComponent, HTMLSampler, Node} from "./parts/tree-builder.js"

type ResolveMedia = (hash: string) => DecoderSource

export class VideoPlayer {
	readonly currentTime = signal(0)
	#controller = realtime(
		compositeTime => this.#tick(compositeTime),
		currentTime => this.currentTime(currentTime)
	)

	constructor(
		private driver: Driver,
		public canvas: HTMLCanvasElement,
		private root: Node<AudioPlaybackComponent>,
		private sampler: HTMLSampler,
		private resolveMedia: ResolveMedia = _hash => "/assets/temp/gl.mp4"
	) {
		this.#controller.setFPS(30)
	}

	static async create(driver: Driver, timeline: TimelineFile) {
		const rootItem = new Map(timeline.items.map(i => [i.id, i])).get(timeline.rootId)!
		const items = new Map(timeline.items.map(i => [i.id, i]))
		const sampler = makeHtmlSampler(() => "/assets/temp/gl.mp4")
		const root = await buildHTMLNodeTree(rootItem, items, sampler)
		const view = driver.compositor.pixi.renderer.canvas
		return new this(driver, view, root, sampler)
	}

	async #tick(ms: number) {
		const duration = this.root.duration
		const tt = ms > duration ? duration : ms
		this.root.audio?.onTimeUpdate(tt)
		const layers = await this.root.visuals?.sampleAt(tt) ?? []
		const frame = await this.driver.composite(layers)
		frame.close()
		if (ms >= duration) this.pause()
	}

	async play() {
		if (!this.#controller.isPlaying()) {
			this.sampler.setPaused!(false)
			this.#controller.play()
		}
	}

	pause() {
		if(this.#controller.isPlaying()) {
			this.#controller.pause()
			this.sampler.setPaused!(true)
		}
	}

	async seek(ms: number) {
		this.pause()
		this.#controller.seek(ms)
		this.root.audio?.onTimeUpdate(ms)
		const layers = await this.root.visuals?.sampleAt(ms) ?? []
		const frame = await this.driver.composite(layers)
		frame.close()
	}

	setFPS(value: number) {
		this.#controller.setFPS(value)
	}

	/**
	 call this whenever your timeline state changes
	*/
	async update(timeline: TimelineFile) {
		const rootItem = new Map(timeline.items.map(i => [i.id, i])).get(timeline.rootId)!
		const items = new Map(timeline.items.map(i => [i.id, i]))
		this.root = await buildHTMLNodeTree(rootItem, items, this.sampler)
		await this.seek(this.currentTime())
	}
}

