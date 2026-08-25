
import {Item} from "./item.js"
import {AudioSettings} from "./audio.js"

/** Media resource identity. Omnitool generates a BLAKE3 hash by default. */
export type Hash = string

/** item identifier */
export type Id = number

export type TimelineFile = {
	info: "https://omniclip.app/"
	format: "timeline"
	version: number
	rootId: Id
	items: Item.Any[]
	audio?: AudioSettings
}

