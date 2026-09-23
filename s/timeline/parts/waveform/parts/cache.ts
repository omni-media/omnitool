
import {collectPeakLevels} from "./collect.js"
import type {Driver} from "../../../../driver/driver.js"
import type {DecoderSource} from "../../../../driver/fns/schematic.js"

type PeakData = Awaited<ReturnType<typeof collectPeakLevels>>
const entries = new Map<Blob | string, Promise<PeakData>>()

export function getWaveformPeaks(driver: Driver, source: DecoderSource) {
	const key = source instanceof URL ? source.href : source
	const existing = entries.get(key)
	if (existing)
		return existing

	const peaks = collectPeakLevels(driver, source)
	entries.set(key, peaks)
	peaks.catch(() => entries.delete(key))
	return peaks
}

