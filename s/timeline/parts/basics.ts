
import {Item} from "./item.js"

/** sha256 hash */
export type Hash = string

/** item identifier */
export type Id = number

export type TimelineFile = {
	info: "https://omniclip.app/"
	format: "timeline"
	version: number
	root: Id
	items: Item.Any[]
}

