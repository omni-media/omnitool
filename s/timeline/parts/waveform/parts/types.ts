export interface WaveformTileData {
	startTime: number
	endTime: number
	peaks: Float32Array
	canvas: HTMLCanvasElement
}

export type WaveformTileRenderInput = {
	context: CanvasRenderingContext2D
	peaks: Float32Array
	bounds: {
		width: number
		height: number
	}
}

export type WaveformTileRenderer = (input: WaveformTileRenderInput) => void

export interface WaveformOptions {
	tileSize?: number
	zoom?: number
	tileWidth?: number
	tileHeight?: number
	preloadMargin?: number
	color?: string
	drawTile?: WaveformTileRenderer
	onChange?: (tiles: WaveformTileData[]) => void
}

export type WaveformTimeRange = [start: number, end: number]

export type WaveformPeakLevel = {
	samplesPerPeak: number
	peaks: Float32Array
	peaksPerSecond: number
}
