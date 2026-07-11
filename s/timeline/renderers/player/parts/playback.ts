
import {AudioLevels} from "./audio-levels.js"
import {Fps} from '../../../../units/fps.js'
import {ms, Ms} from '../../../../units/ms.js'
import {Driver} from '../../../../driver/driver.js'
import {realtime} from '../../parts/schedulers.js'
import {seconds} from '../../../../units/seconds.js'
import {TimelineFile} from '../../../parts/basics.js'
import {computeItemDuration} from '../../parts/handy.js'
import {CursorVisualSampler, ReverseCursorVisualSampler} from '../../export/parts/cursor.js'
import {DecoderSource} from '../../../../driver/fns/schematic.js'
import {createAudioSampler} from '../../parts/samplers/audio/sampler.js'
import {createVisualSampler} from '../../parts/samplers/visual/sampler.js'

export class Playback {
	audioLevels
	audioSampler
	seekVisualSampler
	playVisualSampler: CursorVisualSampler | null = null
	reversePlayVisualSampler: ReverseCursorVisualSampler | null = null

	#playbackStart = ms(0)
	#audioStartSec: number | null = null
	#playbackRate = 1

	#controller = realtime()
	onTick = this.#controller.onTick

	audioContext = new AudioContext({sampleRate: 48000})
	audioGain = this.audioContext.createGain()
	audioNodes = new Map<AudioBufferSourceNode, GainNode>()
	#audioAbort: AbortController | null = null

	constructor(
		private driver: Driver,
		private timeline: TimelineFile,
		private resolveMedia: (hash: string) => DecoderSource
	) {
		this.audioGain.connect(this.audioContext.destination)
		this.audioGain.gain.value = 0.7 ** 2
		this.audioLevels = new AudioLevels(
			this.audioContext,
			() => this.currentTime,
			() => this.#controller.isPlaying()
		)
		this.seekVisualSampler = createVisualSampler(this.resolveMedia)
		this.audioSampler = createAudioSampler(this.resolveMedia)
		this.#samples()
	}

	update(timeline: TimelineFile) {
		this.timeline = timeline
	}

	get isPlaying() {
		return this.#controller.isPlaying()
	}

	async #samples() {
		for await (const _ of this.#controller.ticks()) {
			const time = this.currentTime
			const layers = this.#playbackRate >= 0
				? await this.playVisualSampler?.next(time) ?? []
				: await this.reversePlayVisualSampler?.next(time) ?? []

			const frame = await this.driver.composite(layers)
			frame.close()

			const hasEnded = this.#playbackRate >= 0
				? time >= this.duration
				: time <= 0

			if (hasEnded)
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

		this.#stopAudio()
		this.playVisualSampler = new CursorVisualSampler(this.driver, this.resolveMedia, this.timeline)
		this.reversePlayVisualSampler = new ReverseCursorVisualSampler(this.driver, this.resolveMedia, this.timeline)

		this.#controller.play()
		this.audioLevels.start()
		this.#startAudio()
	}

	pause() {
		this.#playbackStart = this.currentTime
		this.#controller.pause()
		this.audioLevels.stop()
		this.#stopAudio()

		if (this.playVisualSampler) {
			this.playVisualSampler.cancel()
			this.playVisualSampler = null
		}
		if (this.reversePlayVisualSampler) {
			this.reversePlayVisualSampler.cancel()
			this.reversePlayVisualSampler = null
		}

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
		const current = this.#playbackStart + elapsedMs * this.#playbackRate
		return ms(Math.max(0, Math.min(this.duration, current)))
	}

	get playbackRate() {
		return this.#playbackRate
	}

	set playbackRate(rate: number) {
		if (!Number.isFinite(rate) || rate === 0)
			throw new Error(`Invalid playback rate "${rate}".`)

		this.#playbackStart = this.currentTime
		this.#audioStartSec = this.#controller.isPlaying()
			? this.audioContext.currentTime
			: null
		const wasReversed = this.#playbackRate < 0
		this.#playbackRate = rate

		if (this.#controller.isPlaying()) {
			if (wasReversed && rate > 0) {
				this.playVisualSampler?.cancel()
				this.playVisualSampler = new CursorVisualSampler(this.driver, this.resolveMedia, this.timeline)
			}
			else if (!wasReversed && rate < 0) {
				this.reversePlayVisualSampler?.cancel()
				this.reversePlayVisualSampler = new ReverseCursorVisualSampler(this.driver, this.resolveMedia, this.timeline)
			}

			this.#syncAudio()
		}
	}

	setFps(fps: Fps) {
		this.#controller.setFPS(fps)
	}

	#syncAudio() {
		this.#stopAudio()
		this.#startAudio()
	}

	#stopAudio() {
		this.#audioAbort?.abort()
		this.#audioAbort = null

		for (const [node, gain] of this.audioNodes) {
			node.stop()
			this.audioLevels.detach(gain)
		}

		this.audioNodes.clear()
	}

	async #startAudio() {
		if (this.#playbackRate !== 1)
			return

		const from = seconds(this.#playbackStart / 1000)
		this.#audioAbort = new AbortController()
		const signal = this.#audioAbort.signal

		const ctx = this.audioContext

		if (this.#audioStartSec === null)
			return

		for await (const {itemId, sample, timestamp, gain} of this.audioSampler.sampleAudio(
			this.timeline, ms(from * 1000)
		)) {

			if (signal.aborted || !this.#controller.isPlaying())
				return

			while (timestamp - (ctx.currentTime - this.#audioStartSec + from) > 0.75)
				await new Promise(r => setTimeout(r, 25))

			const node = ctx.createBufferSource()
			const itemGain = ctx.createGain()
			node.buffer = sample.toAudioBuffer()
			itemGain.gain.value = gain
			node.connect(itemGain)
			itemGain.connect(this.audioGain)

			node.onended = () => {
				this.audioNodes.delete(node)
				this.audioLevels.detach(itemGain)
			}

			this.audioNodes.set(node, itemGain)
			this.audioLevels.attach(itemId, itemGain)

			const startAt = this.#audioStartSec + timestamp - from

			startAt >= ctx.currentTime
				? node.start(startAt)
				: node.start(ctx.currentTime, ctx.currentTime - startAt)

		}
	}
}

