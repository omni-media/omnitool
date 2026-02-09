
import {debounce} from "@e280/stz"

import {Kind} from "../item.js"
import {TimelineFile} from "../basics.js"
import {fps} from "../../../units/fps.js"
import {Sampler} from "./parts/sampler.js"
import {Ms, ms} from "../../../units/ms.js"
import {Playback} from "./parts/playback.js"
import {VideoSeeker} from "./parts/seeker.js"
import {Driver} from "../../../driver/driver.js"
import {DecoderSource} from "../../../driver/fns/schematic.js"
import {computeTimelineDuration, itemsAt} from "./parts/handy.js"

type ResolveMedia = (hash: string) => DecoderSource

export class VideoPlayer {
	private videos = new Map<number, HTMLVideoElement>()
	private audios = new Map<number, HTMLAudioElement>()

	canvas: HTMLCanvasElement

	videoSeeker: VideoSeeker
	playback = new Playback(
		new Sampler(async (item, _time, matrix) => {
			const video = this.videos.get(item.id)
			const audio = this.audios.get(item.id)

			if (video?.paused)
				video.play()

			if (audio?.paused)
				audio.play()

			return video ? [{ kind: "image", frame: new VideoFrame(video), matrix, id: item.id }] : []
		}))

	constructor(
		private driver: Driver,
		private resolveMedia: ResolveMedia,
		private timeline: TimelineFile,
	) {
		this.canvas = driver.compositor.pixi.renderer.canvas
		this.videoSeeker = new VideoSeeker(resolveMedia)
		this.playback.onSeek.on(this.#seekMediaElements)
	}

	async play() {
		this.playback.start(this.timeline)

		for await (const layers of this.playback.samples()) {
			const frame = await this.driver.composite(layers)
			frame.close()

			if (this.currentTime() >= this.getDuration())
				this.pause()
		}
	}

	pause() {
		this.playback.pause()
		for (const video of this.videos.values())
			video.pause()
		for (const audio of this.audios.values())
			audio.pause()
	}

	async seek(timeMs: number) {
		this.pause()
		const layers = await this.videoSeeker.seek(this.timeline, ms(timeMs))
		const frame = await this.driver.composite(layers)
		this.playback.seekTime(ms(timeMs))
		frame.close()
	}

	#seekMediaElements = debounce(500, async (timecode: Ms) => {
		const items = itemsAt({ timeline: this.timeline, timecode })
		for (const { item, localTime } of items) {
			const video = this.videos.get(item.id)
			const audio = this.audios.get(item.id)
			if (video)
				video.currentTime = localTime / 1000
			if (audio)
				audio.currentTime = localTime / 1000
		}
	})

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
		this.#createMediaElements()
	}

	#createMediaElements() {
		for (const item of this.timeline.items) {
			if (item.kind === Kind.Video) {
				let video = this.videos.get(item.id)
				if (!video) {
					video = document.createElement('video')
					video.src = toUrl(this.resolveMedia(item.mediaHash))
					video.muted = true
					video.playsInline = true
					video.preload = 'auto'
					this.videos.set(item.id, video)
				}
			}
			if (item.kind === Kind.Audio) {
				let audio = this.audios.get(item.id)
				if (!audio) {
					audio = document.createElement("audio")
					audio.preload = "auto"
					audio.crossOrigin = "anonymous"
					audio.src = toUrl(this.resolveMedia(item.mediaHash))
					audio.volume = 0.2
					this.audios.set(item.id, audio)
				}
			}
		}
	}
}

const toUrl = (src: DecoderSource) => (src instanceof Blob ? URL.createObjectURL(src) : String(src))

