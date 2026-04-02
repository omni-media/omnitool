
import {Fps} from '../../../../units/fps.js'
import {ms, Ms} from '../../../../units/ms.js'
import {Driver} from '../../../../driver/driver.js'
import {realtime} from '../../parts/schedulers.js'
import {TimelineFile} from '../../../parts/basics.js'
import {computeItemDuration} from '../../parts/handy.js'
import {seconds, Seconds} from '../../../../units/seconds.js'
import {CursorVisualSampler} from '../../export/parts/cursor.js'
import {DecoderSource} from '../../../../driver/fns/schematic.js'
import {createAudioSampler} from '../../parts/samplers/audio/sampler.js'
import {createVisualSampler} from '../../parts/samplers/visual/sampler.js'

export class Playback {
	audioSampler
	seekVisualSampler
	playVisualSampler: CursorVisualSampler | null = null

	#playbackStart = ms(0)
	#audioStartSec: number | null = null

	#controller = realtime()
	onTick = this.#controller.onTick

	audioContext = new AudioContext({sampleRate: 48000})
	audioGain = this.audioContext.createGain()
	audioNodes = new Set<AudioBufferSourceNode>()
	#audioAbort: AbortController | null = null

	constructor(
		private driver: Driver,
		private timeline: TimelineFile,
		private resolveMedia: (hash: string) => DecoderSource
	) {
		this.audioGain.connect(this.audioContext.destination)
		this.audioGain.gain.value = 0.7 ** 2
		this.seekVisualSampler = createVisualSampler(this.resolveMedia)
		this.audioSampler = createAudioSampler(this.resolveMedia)
		this.#samples()
	}

	update(timeline: TimelineFile) {
		this.timeline = timeline
	}

	async #samples() {
		for await (const _ of this.#controller.ticks()) {
			const layers = await this.playVisualSampler?.next(this.currentTime) ?? []

			const frame = await this.driver.composite(layers)
			frame.close()

			if (this.currentTime >= this.duration)
				this.pause()
		}
	}

	async seek(time: Ms) {
		this.pause()
		this.#playbackStart = time
		return await this.seekVisualSampler.sample(this.timeline, time)
	}

	async start() {
		if(this.#controller.isPlaying())
			return

		await this.audioContext.resume()

		this.#playbackStart = this.currentTime
		this.#audioStartSec = this.audioContext.currentTime

		this.#audioAbort?.abort()
		this.#audioAbort = new AbortController()

		for (const node of this.audioNodes)
			node.stop()

		this.audioNodes.clear()

		this.playVisualSampler?.cancel()
		this.playVisualSampler = new CursorVisualSampler(this.driver, this.resolveMedia, this.timeline)

		this.#controller.play()
		this.#startAudio(this.#audioAbort.signal, seconds(this.#playbackStart / 1000))
	}

	pause() {
		this.#playbackStart = this.currentTime
		this.#controller.pause()
		this.#audioAbort?.abort()

		for (const node of this.audioNodes)
			node.stop()

		this.audioNodes.clear()

		this.playVisualSampler?.cancel()
		this.playVisualSampler = null
	}

	get duration() {
		return computeItemDuration(
			this.timeline.rootId,
			this.timeline
		)
	}

	get currentTime() {
		if (!this.#controller.isPlaying() || this.#audioStartSec === null)
			return this.#playbackStart

		const elapsedMs = (this.audioContext.currentTime - this.#audioStartSec) * 1000
		return ms(this.#playbackStart + elapsedMs)
	}

	setFps(fps: Fps) {
		this.#controller.setFPS(fps)
	}

	async #startAudio(signal: AbortSignal, from: Seconds) {
		const ctx = this.audioContext

		if (this.#audioStartSec === null)
			return

		for await (const {sample, timestamp} of this.audioSampler.sampleAudio(
			this.timeline,
			ms(from * 1000)
		)) {

			if (signal.aborted || !this.#controller.isPlaying())
				return

			while (timestamp - (ctx.currentTime - this.#audioStartSec + from) > 0.75)
				await new Promise(r => setTimeout(r, 25))

			const node = ctx.createBufferSource()
			node.buffer = sample.toAudioBuffer()
			node.connect(this.audioGain)
			node.onended = () => this.audioNodes.delete(node)
			this.audioNodes.add(node)

			const startAt = this.#audioStartSec + timestamp - from

			startAt >= ctx.currentTime
				? node.start(startAt)
				: node.start(ctx.currentTime, ctx.currentTime - startAt)

		}
	}
}

