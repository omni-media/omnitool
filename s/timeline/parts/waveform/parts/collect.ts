
import {Driver} from "../../../../driver/driver.js"
import {DecoderSource} from "../../../../driver/fns/schematic.js"

export const PEAK_LEVELS = [2048, 1024, 512, 256, 128, 64, 32] as const

export async function collectPeakLevels(driver: Driver, source: DecoderSource) {
	const duration = (await driver.getAudioDuration(source)) ?? 0
	const readable = driver.decodeAudio({source}).readable
	const finestSamplesPerPeak = PEAK_LEVELS[PEAK_LEVELS.length - 1]
	const finestPeaks: number[] = []

	let currentMax = 0
	let sampleCount = 0
	let sampleRate = 0

	for await (const audioData of readable) {
		sampleRate ||= audioData.sampleRate

		const frames = audioData.numberOfFrames
		const plane = new Float32Array(frames)
		audioData.copyTo(plane, {planeIndex: 0})

		for (let i = 0; i < plane.length; i++) {
			const amplitude = Math.abs(plane[i]!)
			if (amplitude > currentMax) currentMax = amplitude

			sampleCount++
			if (sampleCount >= finestSamplesPerPeak) {
				finestPeaks.push(currentMax)
				currentMax = 0
				sampleCount = 0
			}
		}

		audioData.close()
	}

	if (sampleCount > 0) finestPeaks.push(currentMax)

	const base = new Float32Array(finestPeaks)
	const levels = PEAK_LEVELS.map(samplesPerPeak => {
		const factor = Math.max(1, Math.round(samplesPerPeak / finestSamplesPerPeak))
		const peaks = factor === 1 ? base : downsampleMax(base, factor)
		return {
			samplesPerPeak,
			peaks,
			peaksPerSecond: sampleRate > 0 ? sampleRate / samplesPerPeak : 0,
		}
	})

	return {duration, levels}
}

function downsampleMax(peaks: Float32Array, factor: number) {
	const downsampled = new Float32Array(Math.ceil(peaks.length / factor))

	for (let i = 0; i < downsampled.length; i++) {
		let maxPeak = 0
		const start = i * factor
		const end = Math.min(start + factor, peaks.length)

		for (let j = start; j < end; j++) {
			if (peaks[j]! > maxPeak) maxPeak = peaks[j]!
		}

		downsampled[i] = maxPeak
	}

	return downsampled
}

