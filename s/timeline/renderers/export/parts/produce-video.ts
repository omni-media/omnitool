
import {Fps} from "../../../../units/fps.js"
import {ExportProgress} from "../produce.js"
import {CursorVisualSampler} from "./cursor.js"
import {Driver} from "../../../../driver/driver.js"
import {fixedStep} from "../../parts/schedulers.js"
import {TimelineFile} from "../../../parts/basics.js"
import {computeItemDuration} from "../../parts/handy.js"
import {DecoderSource} from "../../../../driver/fns/schematic.js"

export function produceVideo({
	timeline,
	fps,
	driver,
	resolveMedia,
	onProgress,
}: {
	fps: Fps
	driver: Driver
	timeline: TimelineFile
	resolveMedia: (hash: string) => DecoderSource
	onProgress?: (progress: ExportProgress) => void
}) {

	const stream = new TransformStream<VideoFrame, VideoFrame>()
	const writer = stream.writable.getWriter()
	const sampler = new CursorVisualSampler(driver, resolveMedia, timeline)
	const dt = 1 / fps
	const duration = computeItemDuration(timeline.rootId, timeline)
	const total = Math.max(1, Math.ceil((duration / 1000) * fps))

	async function produce() {
		await fixedStep({fps, duration}, async (timecode, i) => {
			const layers = await sampler.next(timecode)
			const composed = await driver.composite(layers)

			const frame = new VideoFrame(composed, {
				timestamp: Math.round(i * dt * 1_000_000),
				duration: Math.round(dt * 1_000_000)
			})

			await writer.write(frame)
			composed.close()

			onProgress?.({
				frame: i + 1,
				total,
				ratio: (i + 1) / total,
			})
		})

		await writer.close()
	}

	produce()

	return stream.readable
}

