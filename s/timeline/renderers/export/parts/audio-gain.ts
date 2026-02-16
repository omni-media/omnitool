// this is mutating fn
export const applyGainToPlanar = (
	planes: Float32Array[],
	gain: number
) => {
	if (gain === 1)
		return
	// planes

	for (const plane of planes) {
		for (let i = 0; i < plane.length; i++) {
			plane[i] *= gain
		}
	}

	// return planes
}
