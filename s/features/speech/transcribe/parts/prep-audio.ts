
import {Driver} from "../../../../driver/driver.js"

export async function prepAudio(driver: Driver, source: Blob) {
	const arrayBuffer = await source.arrayBuffer()
	const audioCTX = new AudioContext({sampleRate: 16000})
	const audioData = await audioCTX.decodeAudioData(arrayBuffer)
	let audio: Float32Array
	if (audioData.numberOfChannels === 2) {
		const SCALING_FACTOR = Math.sqrt(2)
		const left = audioData.getChannelData(0)
		const right = audioData.getChannelData(1)
		audio = new Float32Array(left.length)
		for (let i = 0; i < audioData.length; ++i) {
			audio[i] = (SCALING_FACTOR * (left[i] + right[i])) / 2
		}
	} else {
		audio = audioData.getChannelData(0)
	}
	const duration = await driver.getAudioDuration(source)
	return {audio, duration}
}

