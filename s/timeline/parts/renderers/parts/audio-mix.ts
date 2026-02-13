
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

export class AudioMix {
	#chunkFrames = 1024
	#clamp = true

	withChunkFrames(frames: number) {
		this.#chunkFrames = frames
		return this
	}

	clamp(enable: boolean) {
		this.#clamp = enable
		return this
	}

	async *mix(samples: AsyncIterable<AudioPlanesInput>): AsyncGenerator<MixedChunk> {
		const chunkFrames = this.#chunkFrames
		let sampleRate: number | null = null
		let channels: number | null = null
		const active: ActiveSample[] = []
		let nextFrame = 0
		let maxEnd = 0

		const emitChunk = async () => {
			if (!channels)
				return null

			const outPlanes = Array.from({ length: channels }, () => new Float32Array(chunkFrames))

			const chunkStart = nextFrame
			const chunkEnd = nextFrame + chunkFrames

			this.#mixChunk(outPlanes, active, chunkStart, chunkEnd, channels)

			if (this.#clamp) {
				for (let ch = 0; ch < channels; ch++) {
					const plane = outPlanes[ch]
					for (let i = 0; i < plane.length; i++) {
						const v = plane[i]
						plane[i] = v < -1 ? -1 : v > 1 ? 1 : v
					}
				}
			}

			const planarPacked = new Float32Array(channels * chunkFrames)
			for (let ch = 0; ch < channels; ch++) {
				planarPacked.set(outPlanes[ch], ch * chunkFrames)
			}

			nextFrame = chunkEnd

			for (let i = active.length - 1; i >= 0; i--) {
				if (active[i].endFrame <= nextFrame)
					active.splice(i, 1)
			}

			return {
				planar: planarPacked,
				sampleRate: sampleRate!,
				channels,
				frames: chunkFrames,
				startFrame: chunkStart
			} satisfies MixedChunk
		}

		for await (const { planes, sampleRate: inputRate, timestamp } of samples) {
			if (channels === null)
				channels = planes.length
			else if (planes.length !== channels) {
				throw new Error(`Audio channel mismatch: ${planes.length} != ${channels}`)
			}

			if (sampleRate === null)
				sampleRate = inputRate
			else if (inputRate !== sampleRate)
				throw new Error(`Audio sample rate mismatch: ${inputRate} != ${sampleRate}`)

			const startFrame = Math.round(timestamp * sampleRate)
			while (nextFrame + chunkFrames <= startFrame) {
				const chunk = await emitChunk()
				if (chunk) yield chunk
			}

			const data = planes
			const frames = data[0]?.length ?? 0

			active.push({
				startFrame,
				endFrame: startFrame + frames,
				data
			})

			if (startFrame + frames > maxEnd)
				maxEnd = startFrame + frames

		}

		if (channels === null || sampleRate === null)
			return

		while (nextFrame < maxEnd) {
			const chunk = await emitChunk()
			if (chunk) yield chunk
		}
	}

	#mixChunk(
		outPlanes: Float32Array[],
		active: ActiveSample[],
		chunkStart: number,
		chunkEnd: number,
		channels: number
	) {
		for (const sample of active) {
			const overlapStart = Math.max(chunkStart, sample.startFrame)
			const overlapEnd = Math.min(chunkEnd, sample.endFrame)
			if (overlapStart >= overlapEnd)
				continue

			const dstOffset = overlapStart - chunkStart
			const srcOffset = overlapStart - sample.startFrame
			const len = overlapEnd - overlapStart

			for (let ch = 0; ch < channels; ch++) {
				const dst = outPlanes[ch]
				const src = sample.data[ch]
				for (let i = 0; i < len; i++) {
					dst[dstOffset + i] += src[srcOffset + i]
				}
			}
		}
	}
}

