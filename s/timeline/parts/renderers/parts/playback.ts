
import {signal} from '@e280/strata'

import {Sampler} from './sampler.js'
import {realtime} from './schedulers.js'
import {TimelineFile} from '../../basics.js'
import {Fps} from '../../../../units/fps.js'
import {ms, Ms} from '../../../../units/ms.js'
import {seconds, Seconds} from '../../../../units/seconds.js'
import {DecoderSource, Layer} from '../../../../driver/fns/schematic.js'

export class Playback {
	private resolveNext: ((layers: Layer[]) => void) | null = null
	readonly currentTime = signal(ms(0))

	sampler: Sampler
	#playbackStart = ms(0)

	#audioStartSec: number | null = null

	#controller = realtime(
		() => this.#tick(this.getPlaybackTime()),
		(time) => this.currentTime.value = time
	)

	audioContext = new AudioContext({sampleRate: 48000})
	audioGain = this.audioContext.createGain()
	audioTask: Promise<void> | null = null
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

	async *samples(): AsyncGenerator<Layer[]> {
		while (this.#controller.isPlaying()) {
			yield await new Promise<Layer[]>(resolve => {
				this.resolveNext = resolve
			})
		}
	}

	async seek(time: Ms) {
		this.pause()
		this.#controller.seek(time)
		this.#playbackStart = time

		return await this.sampler.sample(this.timeline, time)
	}

	async start(timeline: TimelineFile) {
		this.timeline = timeline
		await this.audioContext.resume()

		this.#playbackStart = this.currentTime.value
		this.#audioStartSec = this.audioContext.currentTime

		this.#audioAbort?.abort()
		this.#audioAbort = new AbortController()

		for (const node of this.audioNodes)
			node.stop()

		this.audioNodes.clear()

		this.#controller.play()
		this.audioTask = this.#startAudio(this.#audioAbort.signal, seconds(this.#playbackStart / 1000))
	}

	pause() {
		this.#playbackStart = this.getPlaybackTime()
		this.#controller.pause()
		this.#audioAbort?.abort()

		for (const node of this.audioNodes)
			node.stop()

		this.audioNodes.clear()
	}

	getPlaybackTime(): Ms {
		if (!this.#controller.isPlaying() || !this.#audioStartSec)
			return this.#playbackStart

		const elapsedMs = (this.audioContext.currentTime - this.#audioStartSec) * 1000
		return ms(this.#playbackStart + elapsedMs)
	}

	async #tick(time: Ms) {
		if (!this.#controller.isPlaying()) return
		if (!this.resolveNext) return

		const resolve = this.resolveNext
		this.resolveNext = null

		resolve(await this.sampler.sample(this.timeline, time))
	}

	setFps(fps: Fps) {
		this.#controller.setFPS(fps)
	}

	async #startAudio(signal: AbortSignal, from: Seconds) {
		const ctx = this.audioContext

		if (!this.#audioStartSec || signal.aborted)
			return

		for await (const {buffer, timestamp} of this.sampler.sampleAudio(this.timeline, ms(from * 1000))) {

			if (signal.aborted)
				return

			if (!this.#controller.isPlaying())
				return

			const node = ctx.createBufferSource()
			node.buffer = buffer
			node.connect(this.audioGain)
			this.audioNodes.add(node)
			node.onended = () => this.audioNodes.delete(node)
			const startTimestamp = this.#audioStartSec + timestamp - from

			if (startTimestamp >= ctx.currentTime) {
				node.start(startTimestamp)
			} else {
				const offset = ctx.currentTime - startTimestamp
				node.start(ctx.currentTime, offset)
			}

			while (!signal.aborted && this.#controller.isPlaying()) {
				const playbackSec = ctx.currentTime - this.#audioStartSec + from
				const aheadSec = timestamp - playbackSec
				if (aheadSec < 0.75) break
				await new Promise(r => setTimeout(r, 25))
			}

		}
	}
}

