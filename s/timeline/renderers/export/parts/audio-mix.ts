
export type AudioPlanesInput = {
	planes: Float32Array[]
	sampleRate: number
	timestamp: number
}

export type MixedChunk = {
	planar: Float32Array
	sampleRate: number
	channels: number
	frames: number
	startFrame: number
}

type ActiveSample = {
	startFrame: number
	endFrame: number
	data: Float32Array[]
}

export type AudioMixOptions = {
	chunkFrames?: number
	clamp?: boolean
}

export class AudioMix {
	readonly #chunkFrames: number
	readonly #clamp: boolean

	constructor(options: AudioMixOptions = {}) {
		this.#chunkFrames = options.chunkFrames ?? 1024
		this.#clamp = options.clamp ?? true
	}

	async *mix(samples: AsyncIterable<AudioPlanesInput>): AsyncGenerator<MixedChunk> {
		const chunkFrames = this.#chunkFrames
		let sampleRate: number | null = null
		let channels: number | null = null
		const active: ActiveSample[] = []
		let nextFrame = 0
		let maxEnd = 0

		for await (const input of samples) {
			if (channels === null) {
				channels = input.planes.length
				sampleRate = input.sampleRate
			} else {
				if (input.planes.length !== channels) throw new Error(`Channel count changed`)
				if (input.sampleRate !== sampleRate) throw new Error(`Sample rate changed`)
			}

			const inputStart = Math.round(input.timestamp * sampleRate)
			const frames = input.planes[0]?.length ?? 0

			while (nextFrame + chunkFrames <= inputStart) {
				yield this.#processChunk(active, nextFrame, channels, sampleRate)
				nextFrame += chunkFrames
			}

			active.push({
				startFrame: inputStart,
				endFrame: inputStart + frames,
				data: input.planes
			})

			maxEnd = Math.max(maxEnd, inputStart + frames)
		}

		if (channels !== null && sampleRate !== null) {
			while (nextFrame < maxEnd) {
				yield this.#processChunk(active, nextFrame, channels, sampleRate)
				nextFrame += chunkFrames
			}
		}
	}

	#processChunk(
		active: ActiveSample[],
		currentStartFrame: number,
		channels: number,
		sampleRate: number
	): MixedChunk {
		const chunkFrames = this.#chunkFrames
		const outputBuffer = new Float32Array(channels * chunkFrames)
		const chunkEnd = currentStartFrame + chunkFrames

		for (let ch = 0; ch < channels; ch++) {
			const channelOffset = ch * chunkFrames
			const outChannelView = outputBuffer.subarray(channelOffset, channelOffset + chunkFrames)

			for (const sample of active) {
				const data = sample.data[ch]
				if (!data) continue

				const start = Math.max(currentStartFrame, sample.startFrame)
				const end = Math.min(chunkEnd, sample.endFrame)

				if (start >= end) continue

				const dstIdx = start - currentStartFrame
				const srcIdx = start - sample.startFrame
				const len = end - start

				for (let i = 0; i < len; i++) {
					outChannelView[dstIdx + i] += data[srcIdx + i]
				}
			}

			if (this.#clamp) {
				for (let i = 0; i < chunkFrames; i++) {
					const v = outChannelView[i]
					outChannelView[i] = v < -1.0 ? -1.0 : (v > 1.0 ? 1.0 : v)
				}
			}
		}

		for (let i = active.length - 1; i >= 0; i--) {
			if (active[i].endFrame <= chunkEnd) {
				active.splice(i, 1)
			}
		}

		return {
			planar: outputBuffer,
			sampleRate,
			channels,
			frames: chunkFrames,
			startFrame: currentStartFrame
		}
	}
}

