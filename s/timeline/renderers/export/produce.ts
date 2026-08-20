
import {Fps} from "../../../units/fps.js"
import {Driver} from "../../../driver/driver.js"
import {TimelineFile} from "../../parts/basics.js"
import {produceAudio} from "./parts/produce-audio.js"
import {produceVideo} from "./parts/produce-video.js"
import {DecoderSource} from "../../../driver/fns/schematic.js"

export type ExportProgress = {
	frame: number
	total: number
	ratio: number
}

export function produce(opts: {
	timeline: TimelineFile
	fps: Fps
	driver: Driver
	resolveMedia: (hash: string) => DecoderSource
	onProgress?: (progress: ExportProgress) => void
}) {

	const audio = produceAudio({...opts})
	const video = produceVideo({...opts})

	return opts.driver.encode({
		video,
		audio,
		config: {
			audio: {codec: 'opus', bitrate: 128000},
			video: {codec: 'vp9', bitrate: 1000000}
		}
	})
}

