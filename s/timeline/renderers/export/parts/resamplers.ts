
const FILTER_RADIUS = 32

export const resampleRadius = (sourceRate: number, targetRate: number) =>
	sourceRate > targetRate ? FILTER_RADIUS : 1

export const resampleToPlanar = (
	sample: {
		numberOfFrames: number
		numberOfChannels: number
		sampleRate: number
		copyTo: (dest: Float32Array, options: {planeIndex: number; format: 'f32-planar'}) => void
	},
	targetRate: number,
	timestamp = 0
): {data: Float32Array[]; frames: number; timestamp: number} => {
	const radius = resampleRadius(sample.sampleRate, targetRate)
	// Include the full filter support so adjacent chunks contribute to the same output frames.
	const start = Math.floor((timestamp - radius / sample.sampleRate) * targetRate) + 1
	const end = Math.ceil((timestamp + (sample.numberOfFrames - 1 + radius) / sample.sampleRate) * targetRate)
	const frames = sample.numberOfFrames ? Math.max(0, end - start) : 0
	const data = new Array<Float32Array>(sample.numberOfChannels)

	const resampleLinear = (plane: Float32Array) => {
		const out = new Float32Array(frames)
		for (let i = 0; i < frames; i++) {
			const position = ((start + i) / targetRate - timestamp) * sample.sampleRate
			const lower = Math.floor(position)
			const fraction = position - lower
			out[i] = (plane[lower] ?? 0) * (1 - fraction) + (plane[lower + 1] ?? 0) * fraction
		}
		return out
	}

	const resampleSinc = (plane: Float32Array) => {
		const out = new Float32Array(frames)
		const cutoff = 0.94 * targetRate / sample.sampleRate
		for (let i = 0; i < frames; i++) {
			const position = ((start + i) / targetRate - timestamp) * sample.sampleRate
			const lower = Math.floor(position)
			let value = 0, weight = 0
			for (let j = lower - radius + 1; j <= lower + radius; j++) {
				const distance = position - j
				if (Math.abs(distance) >= radius) continue
				const x = Math.PI * distance * cutoff
				const sinc = x === 0 ? cutoff : Math.sin(x) / (Math.PI * distance)
				const w = sinc * (0.5 + 0.5 * Math.cos(Math.PI * distance / radius))
				weight += w
				value += (plane[j] ?? 0) * w
			}
			out[i] = value / weight
		}
		return out
	}
	const resample = radius === 1 ? resampleLinear : resampleSinc

	for (let ch = 0; ch < sample.numberOfChannels; ch++) {
		const plane = new Float32Array(sample.numberOfFrames)
		sample.copyTo(plane, {planeIndex: ch, format: 'f32-planar'})
		data[ch] = resample(plane)
	}

	return {data, frames: data.length ? frames : 0, timestamp: start / targetRate}
}

