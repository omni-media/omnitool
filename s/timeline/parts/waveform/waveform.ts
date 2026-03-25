
import {renderTile} from "./parts/render.js"
import {Driver} from "../../../driver/driver.js"
import {collectPeakLevels} from "./parts/collect.js"
import {DecoderSource} from "../../../driver/fns/schematic.js"
import {WaveformOptions, WaveformPeakLevel, WaveformTileData, WaveformTimeRange} from "./parts/types.js"

const MAX_TILE_WIDTH = 4096

export class Waveform {
	#tiles = new Map<number, WaveformTileData>()
	#activeRange: WaveformTimeRange = [0, 0]

	#zoom
	#levels
	#onChange
	#updateQueued = false

	readonly color
	readonly duration
	readonly tileSize
	readonly tileHeight
	readonly preloadMargin

	private constructor(levels: WaveformPeakLevel[], duration: number, options: WaveformOptions) {
		this.#levels = levels
		this.duration = duration
		this.tileSize = options.tileSize ?? 1
		this.#zoom = options.zoom ?? ((options.tileWidth ?? 256) / this.tileSize)
		this.tileHeight = options.tileHeight ?? 96
		this.preloadMargin = options.preloadMargin ?? 2
		this.color = options.color ?? "rgb(3, 148, 129)"
		this.#onChange = options.onChange
	}

	static async init(driver: Driver, source: DecoderSource, options: WaveformOptions = {}) {
		const {duration, levels} = await collectPeakLevels(driver, source)
		return new Waveform(levels, duration, options)
	}

	set zoom(value: number) {
		const next = Math.max(1, value)
		if (next === this.#zoom)
			return

		this.#zoom = next
		this.#tiles.clear()
		this.#queueUpdate()
	}

	get zoom() {
		return this.#zoom
	}

	#computeActiveRange([start, end]: WaveformTimeRange, margin = 1): WaveformTimeRange {
		const visibleSize = end - start
		return [
			Math.max(0, start - visibleSize * margin),
			Math.min(this.duration, end + visibleSize * margin),
		]
	}

	set range(visibleRange: WaveformTimeRange) {
		const [visibleStart, visibleEnd] = visibleRange
		const visibleSize = visibleEnd - visibleStart
		const [activeStart, activeEnd] = this.#activeRange

		const leftTrigger = activeStart + visibleSize
		const rightTrigger = activeEnd - visibleSize

		if (visibleStart >= leftTrigger && visibleEnd <= rightTrigger) return

		this.#activeRange = this.#computeActiveRange(visibleRange, this.preloadMargin)
		this.#queueUpdate()
	}

	#queueUpdate() {
		if (this.#updateQueued) return
		this.#updateQueued = true

		queueMicrotask(() => {
			this.#updateQueued = false
			this.#generateTiles()
		})
	}

	#generateTiles() {
		const [rangeStart, rangeEnd] = this.#activeRange
		const neededStarts = new Set<number>()
		const level = this.#levelForZoom()

		const firstStart = Math.max(0, Math.floor(rangeStart / this.tileSize) * this.tileSize)
		const lastStart = Math.min(this.duration, rangeEnd)

		for (let startTime = firstStart; startTime <= lastStart; startTime += this.tileSize) {
			neededStarts.add(startTime)
		}

		for (const startTime of neededStarts) {
			if (!this.#tiles.has(startTime)) {
				const endTime = Math.min(startTime + this.tileSize, this.duration)
				this.#tiles.set(startTime, this.#buildTileData(startTime, endTime, level))
			}
		}

		for (const startTime of this.#tiles.keys()) {
			if (!neededStarts.has(startTime)) this.#tiles.delete(startTime)
		}

		this.#emit()
	}

	#buildTileData(startTime: number, endTime: number, level: WaveformPeakLevel): WaveformTileData {
		const peaks = this.#slicePeaks(level, startTime, endTime)
		return {
			startTime,
			endTime,
			peaks,
			canvas: renderTile(peaks, {
				width: this.#tilePixelWidth(startTime, endTime),
				height: this.tileHeight,
				color: this.color,
			}),
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

	#emit() {
		if (!this.#onChange) return
		this.#onChange([...this.#tiles.values()].sort((a, b) => a.startTime - b.startTime))
	}

	getTiles() {
		return this.#tiles
	}
}

