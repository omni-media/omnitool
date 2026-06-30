
import type {Item} from "./item.js"
import {TextStyleOptions} from "pixi.js"
import {TransformOptions, Vec2} from "../types.js"
import {Transcription, TranscriptSegment} from "../../features/speech/transcribe/types.js"

export type CaptionOptions = {
	label?: string
	itemId?: Item.Caption["itemId"]
	start?: number
	duration?: number
	styles?: TextStyleOptions
	maxChars?: number
	maxDuration?: number
	maxSilence?: number
}

export const captionPresets = {
	default: {
		styles: {
			fontFamily: "Arial",
			fontSize: 56,
			fill: "#ffffff",
			align: "center",
			wordWrap: true,
			wordWrapWidth: 1440,
		} satisfies TextStyleOptions,
		transform: {
			position: [240, 860] as Vec2
		} satisfies TransformOptions,
	}
}

export type CaptionPreset = (typeof captionPresets)[keyof typeof captionPresets]
export type CaptionSourceItem = Item.Video | Item.Audio
export type CaptionAction = {
	(item: CaptionSourceItem, transcript: Transcription, options?: CaptionOptions): Item.Stack
	make: (transcript: Transcription, options?: CaptionOptions) => Item.Caption
}

export type CaptionActions = CaptionAction & {
	presets: {
		[TName in keyof typeof captionPresets]: CaptionAction
	}
}

const CAPTION_DEFAULTS = {
	maxChars: 42,
	maxDuration: 3500,
	maxSilence: 750,
} satisfies CaptionOptions

export function segmentTranscript(transcript: Transcription, options?: CaptionOptions): TranscriptSegment[] {
	const {maxChars, maxDuration, maxSilence} = {...CAPTION_DEFAULTS, ...options}
	const segments: TranscriptSegment[] = []
	let current: TranscriptSegment | null = null

	for (const {timestamp: [t0, t1], text: rawText} of transcript.chunks) {
		const [start, end] = [t0 * 1000, t1 * 1000]
		const text = rawText.trim()

		if (!Number.isFinite(start) || !Number.isFinite(end) || !text) continue

		if (!current) {
			current = {text, timestamp: [start, end]}
			continue
		}

		const [currentStart, currentEnd]: [number, number] = current.timestamp
		const nextText = `${current.text} ${text}`.trim()
		const shouldBreak =
			nextText.length > maxChars ||
			end - currentStart > maxDuration ||
			start - currentEnd > maxSilence

		if (shouldBreak) {
			segments.push(current)
			current = {text, timestamp: [start, end]}
		}
		else {
			current = {text: nextText, timestamp: [currentStart, end]}
		}
	}

	if (current) segments.push(current)
	return segments
}

export function captionDuration(transcript: Transcription, options?: CaptionOptions) {
	const segments = segmentTranscript(transcript, options)
	return Math.max(0, ...segments.map(segment => segment.timestamp[1]))
}
