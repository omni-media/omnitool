import WaveSurfer from "wavesurfer.js"

import {context} from "../../context.js"
import {DecoderSource} from "../../driver/fns/schematic.js"

export class Waveform {
	wavesurfer: WaveSurfer

	constructor(peaks: number[], container: HTMLElement, duration: number) {
		this.wavesurfer = WaveSurfer.create({
  		container,
  		waveColor: 'rgb(200, 0, 200)',
  		progressColor: 'rgb(100, 0, 100)',
  		barWidth: 10,
  		barRadius: 10,
  		barGap: 2,
  		peaks: [peaks],
  		duration
		})
	}

	static async init(source: DecoderSource, container: HTMLElement) {
		const driver = await context.driver
		const reader = driver.decode({ source }).audio.getReader()

		const peaks: number[] = []
		let buffer: number[] = []
		const samplesPerPeak = 1024
		const duration = await driver.getAudioDuration(source)

		while (true) {
			const {done, value: audioData} = await reader.read()
			if (done) break

			const frames = audioData.numberOfFrames
			const plane = new Float32Array(frames)
			audioData.copyTo(plane, {planeIndex: 0}) // Use left channel only

			for (let i = 0; i < plane.length; i++) {
				buffer.push(plane[i])
				if (buffer.length >= samplesPerPeak) {
					const chunk = buffer.splice(0, samplesPerPeak)
					const min = Math.min(...chunk)
					const max = Math.max(...chunk)
					peaks.push(min, max)
				}
			}

			audioData.close()
		}

		return new Waveform(peaks, container, duration ?? 0)
	}

	// set zoom(value: number) {
	// 	this.wavesurfer.zoom(value)
	// }

	set width(value: number) {
		this.wavesurfer.setOptions({width: value})
	}
}
