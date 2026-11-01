
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
	// A chunk contributes to interpolation for up to one source frame on either side.
	const start = Math.floor((timestamp - 1 / sample.sampleRate) * targetRate) + 1
	const end = Math.ceil((timestamp + sample.numberOfFrames / sample.sampleRate) * targetRate)
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

	for (let ch = 0; ch < sample.numberOfChannels; ch++) {
		const plane = new Float32Array(sample.numberOfFrames)
		sample.copyTo(plane, {planeIndex: ch, format: 'f32-planar'})
		data[ch] = resampleLinear(plane)
	}

	return {data, frames: data.length ? frames : 0, timestamp: start / targetRate}
}

