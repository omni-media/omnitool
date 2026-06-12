
import {Item} from "./item.js"

/** BLAKE3 hash */
export type Hash = string

/** item identifier */
export type Id = number

export type TimelineFile = {
	info: "https://omniclip.app/"
	format: "timeline"
	version: number
	rootId: Id
	items: Item.Any[]
}

