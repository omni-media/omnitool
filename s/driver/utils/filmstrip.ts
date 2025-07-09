import {
  ALL_FORMATS,
	CanvasSink,
	CanvasSinkOptions,
	Input,
	InputVideoTrack,
	WrappedCanvas,
	//@ts-ignore
} from 'mediabunny/dist/mediabunny.mjs'
import {DecoderSource} from '../fns/schematic.js'
import {loadDecoderSource} from './load-decoder-source.js'

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
					granularity: options.granularity ?? 1,
					canvasSinkOptions: options.canvasSinkOptions ?? {width: 80, height: 50, fit: "fill"},
					onChange: options.onChange
			})
		else throw new Error("Source has no video track")
	}

	#snapRangeToTile([start, end]: TimeRange): TimeRange {
		const tileSize = end - start
		const tileStart = Math.floor(start / tileSize) * tileSize
		return [tileStart - tileSize, tileStart + tileSize * 2]
	}

	async update(range: TimeRange) {
		const newRange = this.#snapRangeToTile(range)

		// Avoid redundant updates
		if (
			this.#activeRange[0] === newRange[0] &&
			this.#activeRange[1] === newRange[1]
		)
			return

		this.#activeRange = newRange

		const [rangeStart, rangeEnd] = newRange
		const neededTimestamps = new Set<number>()

		// duration should be computed but with trim etc also
		const duration = await this.videoTrack.computeDuration()
		for (
			let timestamp = rangeStart;
			timestamp <= rangeEnd;
			timestamp += this.options.granularity
		) {
			// Clamp to valid time range
			if (timestamp >= 0 && timestamp <= duration)
				neededTimestamps.add(+timestamp.toFixed(3))
		}

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

	getThumbnail(time: number) {
		return this.#cache.get(time)
	}
}

type TimeRange = [number, number]

interface FilmstripOptions {
	granularity?: number
	canvasSinkOptions?: CanvasSinkOptions
	onChange: (tiles: {
		time: number
		canvas: WrappedCanvas
	}[]) => void
}
