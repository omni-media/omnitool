/** Convert planar channels using the Web Audio speaker layouts: L, R, C, LFE, SL, SR. */
export function convertAudioChannels(planes: Float32Array[], channels: 1 | 2 | 6): Float32Array[] {
	const source = planes.length
	if (source === channels) return planes
	if (![1, 2, 4, 6].includes(source))
		throw new Error(`Unsupported audio channel count: ${source}`)

	const length = planes[0].length
	const out = Array.from({length: channels}, () => new Float32Array(length))
	for (let i = 0; i < length; i++) {
		const l = planes[0][i], r = planes[1]?.[i] ?? 0, c = planes[2]?.[i] ?? 0
		const sl = planes[4]?.[i] ?? 0, sr = planes[5]?.[i] ?? 0
		if (source === 1) {
			if (channels === 2) out[0][i] = out[1][i] = l
			else out[2][i] = l
		} else if (source === 2) {
			if (channels === 1) out[0][i] = (l + r) / 2
			else { out[0][i] = l; out[1][i] = r }
		} else if (source === 4) {
			const leftSurround = planes[2][i], rightSurround = planes[3][i]
			if (channels === 1) out[0][i] = (l + r + leftSurround + rightSurround) / 4
			else if (channels === 2) {
				out[0][i] = (l + leftSurround) / 2
				out[1][i] = (r + rightSurround) / 2
			} else {
				out[0][i] = l; out[1][i] = r; out[4][i] = leftSurround; out[5][i] = rightSurround
			}
		} else if (channels === 1) {
			out[0][i] = Math.SQRT1_2 * (l + r) + c + 0.5 * (sl + sr)
		} else {
			out[0][i] = l + Math.SQRT1_2 * (c + sl)
			out[1][i] = r + Math.SQRT1_2 * (c + sr)
		}
	}
	return out
}
