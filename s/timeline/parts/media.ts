
import {ALL_FORMATS, Input} from "mediabunny"

import {Datafile} from "../utils/datafile.js"
import {DecoderSource} from "../../driver/fns/schematic.js"
import {loadDecoderSource} from "../../driver/utils/load-decoder-source.js"

export class Media {
	duration = 0
	isImage = false
	hasVideo = false
	hasAudio = false

	constructor(public datafile: Datafile) {}

	static async analyze(datafile: Datafile) {
		const media = new this(datafile)

		if (this.#isImage(datafile)) {
			media.isImage = true
			return media
		}

		const duration = (await this.duration(datafile.url)) * 1000
		media.duration = duration
		const {video, audio} = await this.#has(datafile.url)
		media.hasAudio = audio
		media.hasVideo = video
		return media
	}

	static #isImage(datafile: Datafile) {
		return datafile.blob.type.startsWith("image/")
	}

	static async duration(source: DecoderSource) {
		const input = new Input({
			formats: ALL_FORMATS,
			source: await loadDecoderSource(source)
		})
		const duration =  await input.computeDuration()
		return Number(duration.toFixed(5)) // fix weird floating points
	}

	static async #has(source: DecoderSource) {
		const input = new Input({
			formats: ALL_FORMATS,
			source: await loadDecoderSource(source)
		})
		return {
			audio: !!(await input.getPrimaryAudioTrack()),
			video: !!(await input.getPrimaryVideoTrack())
		}
	}
}

