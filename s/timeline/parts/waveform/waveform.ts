
import {renderTile} from "./parts/render.js"
import {Driver} from "../../../driver/driver.js"
import {getWaveformPeaks} from "./parts/cache.js"
import {DecoderSource} from "../../../driver/fns/schematic.js"
import {WaveformOptions, WaveformPeakLevel, WaveformTileData, WaveformTimeRange} from "./parts/types.js"

const MAX_TILE_WIDTH = 4096
const TARGET_TILE_WIDTH = 512
const yieldToBrowser = () => new Promise<void>(resolve => setTimeout(resolve))

export class Waveform {
	#tiles = new Map<number, WaveformTileData>()
	#activeRange: WaveformTimeRange = [0, 0]
	#visibleRange: WaveformTimeRange = [0, 0]

	#zoom
	#levels
	#onChange
	#drawTile
	#generation = 0

	readonly color
	readonly duration
	readonly tileSize
	readonly tileHeight
	readonly preloadMargin

	private constructor(
		levels: WaveformPeakLevel[],
		duration: number,
		options: WaveformOptions,
	) {
		this.#levels = levels
		this.duration = duration
		this.tileSize = options.tileSize ?? 1
		this.#zoom = options.zoom ?? ((options.tileWidth ?? 256) / this.tileSize)
		this.tileHeight = options.tileHeight ?? 96
		this.preloadMargin = options.preloadMargin ?? 2
		this.color = options.color ?? "rgb(3, 148, 129)"
		this.#onChange = options.onChange
		this.#drawTile = options.drawTile
	}

	static async init(driver: Driver, source: DecoderSource, options: WaveformOptions = {}) {
		const {duration, levels} = await getWaveformPeaks(driver, source)
		return new Waveform(levels, duration, options)
	}

	/** Waveform render density in pixels per second. */
	set zoom(pixelsPerSecond: number) {
		const next = Math.max(1, pixelsPerSecond)
		if (next === this.#zoom)
			return

		this.#zoom = next
		this.#tiles.clear()
		this.#queueUpdate()
	}

	get zoom() {
		return this.#zoom
	}

	get range() {
		return this.#visibleRange
	}

	#computeActiveRange([start, end]: WaveformTimeRange, margin = 1): WaveformTimeRange {
		const visibleSize = end - start
		return [
			Math.max(0, start - visibleSize * margin),
			Math.min(this.duration, end + visibleSize * margin),
		]
	}

	set range(visibleRange: WaveformTimeRange) {
		this.#visibleRange = visibleRange

		const [visibleStart, visibleEnd] = visibleRange
		const visibleSize = visibleEnd - visibleStart
		const [activeStart, activeEnd] = this.#activeRange

		const leftBuffered = activeStart > 0
		const rightBuffered = activeEnd < this.duration
		const leftSettled = !leftBuffered || visibleStart >= activeStart + visibleSize
		const rightSettled = !rightBuffered || visibleEnd <= activeEnd - visibleSize

		if (leftSettled && rightSettled) return

		this.#activeRange = this.#computeActiveRange(visibleRange, this.preloadMargin)
		this.#queueUpdate()
	}

	#queueUpdate() {
		const generation = ++this.#generation
		queueMicrotask(() => {
			if (generation === this.#generation)
				void this.#generateTiles(generation)
		})
	}

	async #generateTiles(generation: number) {
		const [rangeStart, rangeEnd] = this.#activeRange
		const neededStarts = new Set<number>()
		const tileSize = this.#tileDuration()

		const firstIndex = Math.max(0, Math.floor(rangeStart / tileSize))
		const lastIndex = Math.floor(Math.min(this.duration, rangeEnd) / tileSize)

		for (let index = firstIndex; index <= lastIndex; index++) {
			const startTime = index * tileSize
			neededStarts.add(startTime)
		}

		const starts = [...neededStarts].sort((a, b) =>
			this.#tileDistance(a, tileSize) - this.#tileDistance(b, tileSize)
		)
		const visibleStarts = new Set(starts.filter(startTime =>
			this.#tileDistance(startTime, tileSize) === 0 && !this.#tiles.has(startTime)
		))

		for (const startTime of starts) {
			if (generation !== this.#generation)
				return

			if (!this.#tiles.has(startTime)) {
				const endTime = Math.min(startTime + tileSize, this.duration)
				this.#tiles.set(startTime, this.#buildTileData(startTime, endTime))
				visibleStarts.delete(startTime)
				if (visibleStarts.size === 0 || this.#tileDistance(startTime, tileSize) > 0)
					this.#emit()
				await yieldToBrowser()
			}
		}
		if (generation !== this.#generation)
			return

		for (const startTime of this.#tiles.keys()) {
			if (!neededStarts.has(startTime)) this.#tiles.delete(startTime)
		}
		this.#emit()
	}

	#buildTileData(startTime: number, endTime: number): WaveformTileData {
		const level = this.#levelForZoom()
		const peaks = this.#slicePeaks(level, startTime, endTime)
		return {
			startTime,
			endTime,
			peaks,
			canvas: renderTile(peaks, {
				width: this.#tilePixelWidth(startTime, endTime),
				height: this.tileHeight,
				color: this.color,
			}, this.#drawTile),
		}
	}

	#levelForZoom() {
		return this.#levels.find(level => level.peaksPerSecond >= this.#zoom)
			?? this.#levels[this.#levels.length - 1]!
	}

	#slicePeaks(level: WaveformPeakLevel, startTime: number, endTime: number) {
		if (!level.peaksPerSecond) return new Float32Array()
		const from = Math.max(0, Math.floor(startTime * level.peaksPerSecond))
		const to = Math.max(from + 1, Math.min(level.peaks.length, Math.ceil(endTime * level.peaksPerSecond)))
		return level.peaks.slice(from, to)
	}

	#tilePixelWidth(startTime: number, endTime: number) {
		return Math.min(MAX_TILE_WIDTH, Math.max(1, Math.ceil((endTime - startTime) * this.#zoom)))
	}

	#tileDuration() {
		return Math.max(this.tileSize, TARGET_TILE_WIDTH / this.#zoom)
	}

	#tileDistance(startTime: number, tileSize: number) {
		const [visibleStart, visibleEnd] = this.#visibleRange
		const endTime = startTime + tileSize
		if (endTime < visibleStart)
			return visibleStart - endTime
		if (startTime > visibleEnd)
			return startTime - visibleEnd
		return 0
	}

	#emit() {
		if (!this.#onChange) return
		this.#onChange([...this.#tiles.values()].sort((a, b) => a.startTime - b.startTime))
	}

	getTiles() {
		return this.#tiles
	}
}
