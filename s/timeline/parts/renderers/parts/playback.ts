
import {Sampler} from './sampler.js'
import {realtime} from './schedulers.js'
import {TimelineFile} from '../../basics.js'
import {Fps} from '../../../../units/fps.js'
import {ms, Ms} from '../../../../units/ms.js'
import {seconds, Seconds} from '../../../../units/seconds.js'
import {DecoderSource} from '../../../../driver/fns/schematic.js'

export class Playback {

	sampler: Sampler
	#playbackStart = ms(0)

	#audioStartSec: number | null = null

	#controller = realtime()
	onTick = this.#controller.onTick

	audioContext = new AudioContext({sampleRate: 48000})
	audioGain = this.audioContext.createGain()
	audioNodes = new Set<AudioBufferSourceNode>()

	#audioAbort: AbortController | null = null

	constructor(
		private timeline: TimelineFile,
		private resolveMedia: (hash: string) => DecoderSource
	) {
		this.audioGain.connect(this.audioContext.destination)
		this.audioGain.gain.value = 0.7 ** 2
		this.sampler = new Sampler(this.resolveMedia)
	}

	async *samples() {
		for await (const _ of this.#controller.ticks()) {
			yield this.sampler.sample(this.timeline, this.currentTime)
		}
	}

	async seek(time: Ms) {
		this.pause()
		this.#playbackStart = time

		return await this.sampler.sample(this.timeline, time)
	}

	async start(timeline: TimelineFile) {
		this.timeline = timeline
		await this.audioContext.resume()

		this.#playbackStart = this.currentTime
		this.#audioStartSec = this.audioContext.currentTime

		this.#audioAbort?.abort()
		this.#audioAbort = new AbortController()

		for (const node of this.audioNodes)
			node.stop()

		this.audioNodes.clear()

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
	}

	get currentTime() {
		if (!this.#controller.isPlaying() || !this.#audioStartSec)
			return this.#playbackStart

		const elapsedMs = (this.audioContext.currentTime - this.#audioStartSec) * 1000
		return ms(this.#playbackStart + elapsedMs)
	}

	setFps(fps: Fps) {
		this.#controller.setFPS(fps)
	}

	async #startAudio(signal: AbortSignal, from: Seconds) {
		const ctx = this.audioContext

		if (!this.#audioStartSec)
			return

		for await (const {sample, timestamp} of this.sampler.sampleAudio(
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

