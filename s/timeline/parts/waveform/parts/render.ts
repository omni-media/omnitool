
import type {WaveformTileRenderer} from "./types.js"

export function renderTile(
	peaks: Float32Array,
	opts: {
		width: number
		height: number
		color: string
	},
	draw?: WaveformTileRenderer,
) {
	const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
	const canvas = document.createElement("canvas")
	canvas.width = opts.width * dpr
	canvas.height = opts.height * dpr
	canvas.style.width = `${opts.width}px`
	canvas.style.height = `${opts.height}px`

	const ctx = canvas.getContext("2d")
	if (!ctx) return canvas

	ctx.scale(dpr, dpr)
	const input = {
		context: ctx,
		peaks,
		bounds: {width: opts.width, height: opts.height},
	}
	if (draw)
		draw(input)
	else
		drawDefaultWaveformTile(input, opts.color)

	return canvas
}

function drawDefaultWaveformTile({context, peaks, bounds}: Parameters<WaveformTileRenderer>[0], color: string) {
	const {width, height} = bounds
	context.fillStyle = color

	const centerY = height / 2
	const columns = Math.max(1, width)
	const peaksPerPixel = peaks.length / columns

	for (let px = 0; px < columns; px++) {
		const startIndex = Math.floor(px * peaksPerPixel)
		const endIndex = Math.max(
			startIndex + 1,
			Math.floor((px + 1) * peaksPerPixel)
		)

		let maxPeak = 0
		for (let i = startIndex; i < endIndex && i < peaks.length; i++) {
			if (peaks[i]! > maxPeak) maxPeak = peaks[i]!
		}

		const barHeight = maxPeak * height
		context.fillRect(px, centerY - barHeight / 2, 1, barHeight)
	}
}

