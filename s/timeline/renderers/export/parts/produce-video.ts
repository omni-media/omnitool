
import {Fps} from "../../../../units/fps.js"
import {CursorLayerSampler} from "./cursor.js"
import {Driver} from "../../../../driver/driver.js"
import {fixedStep} from "../../parts/schedulers.js"
import {TimelineFile} from "../../../parts/basics.js"
import {computeTimelineDuration} from "../../parts/handy.js"
import {DecoderSource} from "../../../../driver/fns/schematic.js"

export function produceVideo({
	timeline,
	fps,
	driver,
	resolveMedia,
}: {
	driver: Driver
	resolveMedia: (hash: string) => DecoderSource
	timeline: TimelineFile
	fps: Fps
}) {

	const stream = new TransformStream<VideoFrame, VideoFrame>()
	const writer = stream.writable.getWriter()
	const sampler = new CursorLayerSampler(driver, resolveMedia)
	const cursor = sampler.cursor(timeline)
	const dt = 1 / fps
	const duration = computeTimelineDuration(timeline.rootId, timeline)

	async function produce() {
		await fixedStep({fps, duration}, async (timecode, i) => {
			const layers = await cursor.next(timecode)
			const composed = await driver.composite(layers)

			const frame = new VideoFrame(composed, {
				timestamp: Math.round(i * dt * 1_000_000),
				duration: Math.round(dt * 1_000_000)
			})

			await writer.write(frame)
			composed.close()
		})

		await writer.close()
	}

	produce()

	return stream.readable
}

