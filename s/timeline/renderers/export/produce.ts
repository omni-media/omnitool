
import {fps} from "../../../units/fps.js"
import {Driver} from "../../../driver/driver.js"
import {TimelineFile} from "../../parts/basics.js"
import {produceAudio} from "./parts/produce-audio.js"
import {produceVideo} from "./parts/produce-video.js"
import type {DecoderSource, RenderConfig} from "../../../driver/fns/schematic.js"

export type {RenderContainer} from "../../../driver/fns/schematic.js"

export type ExportProgress = {
	frame: number
	total: number
	ratio: number
}

export type ExportConfig = {
	container?: RenderConfig["container"]
	framerate?: RenderConfig["framerate"]
	audio?: Partial<RenderConfig["audio"]>
	video?: Partial<RenderConfig["video"]>
}

export function produce(opts: {
	timeline: TimelineFile
	driver: Driver
	config?: ExportConfig
	resolveMedia: (hash: string) => DecoderSource
	onProgress?: (progress: ExportProgress) => void
}) {
	const sampleRate = opts.config?.audio?.sampleRate ?? 48000
	const numberOfChannels = opts.config?.audio?.numberOfChannels ?? 2

	if (!Number.isInteger(sampleRate) || sampleRate <= 0)
		throw new RangeError(`Invalid audio sample rate: ${sampleRate}`)

	const config: RenderConfig = {
		container: opts.config?.container ?? "webm",
		framerate: opts.config?.framerate ?? 30,
		audio: {codec: "opus", bitrate: 128000, ...opts.config?.audio, sampleRate, numberOfChannels},
		video: {codec: "vp9", bitrate: 1000000, ...opts.config?.video}
	}

	const audio = produceAudio({...opts, sampleRate, numberOfChannels})
	const video = produceVideo({...opts, fps: fps(config.framerate)})

	return opts.driver.encode({
		video,
		audio,
		config
	})
}

