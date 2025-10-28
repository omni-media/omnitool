import {
	ALL_FORMATS,
	CanvasSink,
	CanvasSinkOptions,
	Input,
	InputVideoTrack,
	WrappedCanvas,
} from "mediabunny"

import {DecoderSource} from '../../driver/fns/schematic.js'
import {loadDecoderSource} from '../../driver/utils/load-decoder-source.js'

export class Filmstrip {
	#sink: CanvasSink
	#cache: Map<number, WrappedCanvas> = new Map()
	#activeRange: TimeRange = [0, 0]

	private constructor(
		private videoTrack: InputVideoTrack,
		private options: Required<FilmstripOptions>
	) {
		this.#sink = new CanvasSink(videoTrack, options.canvasSinkOptions)
	}

	static async init(source: DecoderSource, options: FilmstripOptions) {
		const input = new Input({
			formats: ALL_FORMATS,
			source: await loadDecoderSource(source)
		})
		const videoTrack = await input.getPrimaryVideoTrack()
		if(videoTrack)
			return new Filmstrip(
				videoTrack, {
					frequency: options.frequency ?? 1,
					canvasSinkOptions: options.canvasSinkOptions ?? {width: 80, height: 50, fit: "fill"},
					onChange: options.onChange
			})
		else throw new Error("Source has no video track")
	}

	/**
 	* Sets the frequency (granularity) of filmstrip thumbnails.
 	* Changing this triggers a filmstrip refresh after any ongoing update finishes.
 	* @param value - The new frequency in seconds.
 	*/
	set frequency(value: number) {
		if(value !== this.options.frequency) {
			this.options.frequency = value
			this.#update()
		}
	}

	get frequency() {
		return this.options.frequency
	}

	#computeActiveRange([start, end]: TimeRange, margin = 1): TimeRange {
		const tileSize = end - start
		return [start - tileSize * margin, end + tileSize * margin]
	}

	async #generateTiles() {
		const [rangeStart, rangeEnd] = this.#activeRange
		const neededTimestamps = new Set<number>()

		// duration should be computed but with trim etc also
		const duration = await this.videoTrack.computeDuration()
		for (
			let timestamp = rangeStart;
			timestamp <= rangeEnd;
			timestamp += this.options.frequency
		) {
			// Clamp to valid time range
			if (timestamp >= 0 && timestamp <= duration)
				neededTimestamps.add(+timestamp.toFixed(3))
		}

		this.options.onPlaceholders?.([...neededTimestamps])

		const missingTimestamps = [...neededTimestamps]
			.filter(t => !this.#cache.has(t))

		let i = 0
		for await (const canvas of this.#sink.canvasesAtTimestamps(missingTimestamps)) {
			if(canvas) {
				const requestedTime = missingTimestamps[i++]
				this.#cache.set(requestedTime, canvas)
			}
		}

		// Dispose canvases outside the new range
		for (const key of this.#cache.keys()) {
			if (!neededTimestamps.has(key)) {
				this.#cache.delete(key)
			}
		}

		const tiles = [...this.#cache.entries()]
			.map(([time, canvas]) => ({time, canvas}))
		this.options.onChange(tiles)
	}

	/**
 	* Updates the visible time range for the filmstrip.
 	*
 	* Triggers a thumbnails update, with extended margins to preload
 	* thumbnails slightly outside the visible range.
 	* @param visibleRange - The current timeline viewport as a [start, end] tuple in seconds.
 	*/
	set range(visibleRange: TimeRange) {
		const [visStart, visEnd] = visibleRange
		const visibleSize = visEnd - visStart
		const [actStart, actEnd] = this.#activeRange

		// trigger when we're 1x visible width away from margin edges
		const leftTrigger = actStart + visibleSize
		const rightTrigger = actEnd - visibleSize

		const nearLeftEdge = visStart < leftTrigger
		const nearRightEdge = visEnd > rightTrigger

		if (!nearLeftEdge && !nearRightEdge) return

		this.#activeRange = this.#computeActiveRange(visibleRange, 2)
		this.#update()
	}

	#updating: Promise<void> | null = null
	#shouldRunAgain = false

	async #update() {
		// Perform update immediately. If multiple updates are requested while updating,
		// only the latest one will run after the current finishes (skips intermediate ones).
		if(this.#updating) {
			this.#shouldRunAgain = true
			return
		}

		this.#updating = this.#generateTiles()
		await this.#updating
		this.#updating = null

		if(this.#shouldRunAgain) {
			this.#shouldRunAgain = false
			await this.#update()
		}
	}
	/**
 	* Returns the cached thumbnail (if any) for a given timestamp.
 	* @param time - The timestamp to retrieve the canvas for.
 	*/
	getThumbnail(time: number) {
		return this.#cache.get(time)
	}
}

type TimeRange = [number, number]

interface FilmstripOptions {
	frequency?: number
	canvasSinkOptions?: CanvasSinkOptions
	onPlaceholders?: (timestamps: number[]) => void
	onChange: (tiles: {
		time: number
		canvas: WrappedCanvas
	}[]) => void
}
