export interface WaveformTileData {
	startTime: number
	endTime: number
	peaks: Float32Array
	canvas: HTMLCanvasElement
}

export interface WaveformOptions {
	tileSize?: number
	zoom?: number
	tileWidth?: number
	tileHeight?: number
	preloadMargin?: number
	color?: string
	onChange?: (tiles: WaveformTileData[]) => void
}

export type WaveformTimeRange = [start: number, end: number]

export type WaveformPeakLevel = {
	samplesPerPeak: number
	peaks: Float32Array
	peaksPerSecond: number
}
