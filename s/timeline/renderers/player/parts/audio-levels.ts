
import {Ms} from '../../../../units/ms.js'
import {Id} from '../../../parts/basics.js'
import {measureAudioLevel} from '../../parts/audio-level.js'
import {AudioItemSelector, AudioLevelListener, AudioLevelObserver, Meter} from './types.js'

export class AudioLevels implements AudioLevelObserver {
	#meters = new Set<Meter>()
	#items = new Map<GainNode, Id>()
	#frame: number | null = null
	#running = false

	constructor(
		private context: AudioContext,
		private time: () => Ms,
		private isPlaying: () => boolean
	) {}

	on(items: AudioItemSelector, listener: AudioLevelListener) {
		const silent = this.context.createGain()
		const analyser = this.context.createAnalyser()

		silent.gain.value = 0
		analyser.smoothingTimeConstant = 0

		analyser.connect(silent)
		silent.connect(this.context.destination)

		const meter: Meter = {
			items,
			silent,
			listener,
			analyser,
			nodes: new Set(),
			samples: new Float32Array(analyser.fftSize) as Float32Array<ArrayBuffer>
		}

		this.#meters.add(meter)

		if (this.isPlaying())
			this.start()

		return () => {
			if (!this.#meters.delete(meter))
				return

			for (const node of meter.nodes)
				node.disconnect(analyser)

			analyser.disconnect()
			silent.disconnect()

			if (!this.#meters.size)
				this.stop()
		}
	}

	attach(itemId: Id, node: GainNode) {
		this.#items.set(node, itemId)
	}

	detach(node: GainNode) {
		this.#items.delete(node)

		for (const meter of this.#meters) {
			if (meter.nodes.delete(node))
				node.disconnect(meter.analyser)
		}
	}

	start() {
		if (this.#running || !this.#meters.size)
			return

		this.#running = true
		this.#frame = requestAnimationFrame(() => this.#tick())
	}

	stop() {
		this.#running = false

		if (this.#frame !== null)
			cancelAnimationFrame(this.#frame)

		this.#frame = null
	}

	#tick() {
		if (!this.#running)
			return

		for (const meter of this.#meters) {
			this.#sync(meter)
			meter.analyser.getFloatTimeDomainData(meter.samples)
			meter.listener({time: this.time(), ...measureAudioLevel(meter.samples)})
		}

		if (this.#running)
			this.#frame = requestAnimationFrame(() => this.#tick())
	}

	#sync(meter: Meter) {
		const selected = new Set(meter.items())

		for (const [node, itemId] of this.#items) {
			const connected = meter.nodes.has(node)
			const shouldConnect = selected.has(itemId)

			if (shouldConnect && !connected) {
				node.connect(meter.analyser)
				meter.nodes.add(node)
			}
			else if (!shouldConnect && connected) {
				node.disconnect(meter.analyser)
				meter.nodes.delete(node)
			}
		}
	}
}

