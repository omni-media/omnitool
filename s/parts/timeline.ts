
import {Id} from "./basics.js"
import {Item} from "./item.js"

export type TimelineFile = {
	format: "omnitimeline@1",
	root: Id,
	graph: [Id, Item.Any][]
}

