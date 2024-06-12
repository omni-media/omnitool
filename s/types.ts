export interface Effect {
	start: number
	end: number
	duration: number
}

export interface TextEffect {
	font: Font
	content: string
	color: string
	size: number
	style: FontStyle
	align: TextAlign
	rect: Rect
}

export interface SubtitleEffect {
	content: string
}

export interface FillEffect {
	backgroundColor: string
}

export type FontStyle = "italic" | "bold" | "normal"
export type Font = "Arial" | "Lato"
export type TextAlign = "left" | "right" | "center"

export interface AudioClip extends Effect {
	file: string
}

export interface VideoClip extends Effect {
	file: string
	rect: Rect
}

export interface ImageEffect extends Effect {
	file: string
	rect: Rect
}

export interface Transition {
	type: TransitonType
	duration: number
}

export type TransitonType = "crossfade" | "blur" | "fade"

export type AudioItem = ["audio", AudioClip]
export type VideoItem = ["video", VideoClip]
export type TransitionItem = ["transition", Transition]
export type SubtitleItem = ["subtitle", SubtitleEffect]
export type TextItem = ["text", Text]
export type ImageItem = ["image", ImageEffect]
export type FillItem = ["fill", FillEffect]
export type Sequence = ["sequence", {children: string[]}]
export type Stack = ["stack", {children: string[]}]

type Item =
	| AudioItem
	| VideoItem
	| TransitionItem
	| SubtitleItem
	| TextItem
	| ImageItem
	| FillItem
	| Sequence
	| Stack

export type Items = [string, Item]

export interface Timeline {
	root: string
	items: Items[]
}

export interface Rect {
	width: number
	height: number
	scaleX: number
	scaleY: number
	position_on_canvas: {
		x: number
		y: number
	}
	rotation: number
}

const defaultRect: Rect = {
	width: 0,
	height: 0,
	scaleX: 0,
	scaleY: 0,
	position_on_canvas: {x: 0, y: 0},
	rotation: 0,
}

const timeline: Timeline = {
	root: "213",
	items: [
		[
			"12321",
			["video", { file: "", start: 0, end: 5, duration: 5, rect: defaultRect }],
		],
	],
}
