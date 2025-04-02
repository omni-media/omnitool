
import {Id} from "./basics.js"
import {Item} from "./item.js"

export type TimelineFile = {
	info: "https://dev.omniclip.app/"
	format: "timeline"
	version: number
	root: Id
	items: [Id, Item.Any][]
}

