
const resampleLinear = (
	src: Float32Array,
	fromRate: number,
	targetRate: number
) => {
	if (fromRate === targetRate)
		return src

	const ratio = targetRate / fromRate
	const outFrames = Math.max(1, Math.round(src.length * ratio))
	const out = new Float32Array(outFrames)

	for (let i = 0; i < outFrames; i++) {
		const t = i / ratio
		const i0 = Math.floor(t)
		const i1 = Math.min(i0 + 1, src.length - 1)
		const frac = t - i0
		out[i] = src[i0] * (1 - frac) + src[i1] * frac
	}

	return out
}

export const resampleToPlanar = (
	sample: {
		numberOfFrames: number
		numberOfChannels: number
		sampleRate: number
		copyTo: (dest: Float32Array, options: {planeIndex: number; format: 'f32-planar'}) => void
	},
	targetRate: number
): {data: Float32Array[]; frames: number} => {
	const channels = sample.numberOfChannels
	const data = new Array<Float32Array>(channels)
	let frames = 0

	for (let ch = 0; ch < channels; ch++) {
		const plane = new Float32Array(sample.numberOfFrames)
		sample.copyTo(plane, {planeIndex: ch, format: 'f32-planar'})
		const resampled = resampleLinear(plane, sample.sampleRate, targetRate)
		data[ch] = resampled
		frames = resampled.length
	}

	return {data, frames}
}

