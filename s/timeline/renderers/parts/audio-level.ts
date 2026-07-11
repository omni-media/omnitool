
export function measureAudioLevel(samples: Float32Array<ArrayBufferLike>) {
	let peak = 0
	let sumSquares = 0

	for (const value of samples) {
		peak = Math.max(peak, Math.abs(value))
		sumSquares += value ** 2
	}

	return {
		peak,
		rms: samples.length > 0 ? Math.sqrt(sumSquares / samples.length) : 0
	}
}

