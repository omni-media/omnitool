
import {Hex, Map2} from "@benev/slate"
import {Item} from "../parts/item.js"
import {Id} from "../parts/basics.js"
import {TimelineFile} from "../parts/timeline.js"

export class O {
	#items = new Map2<Id, Item.Any>()
	#ids = new Map2<Item.Any, Id>()

	register(item: Item.Any) {
		const existingId = this.#ids.get(item)
		if (existingId)
			return existingId
		const newId = Hex.random()
		this.#items.set(newId, item)
		this.#ids.set(item, newId)
		return newId
	}

	get items() {
		return this.#items.array()
	}

	sequence = (...items: Item.Any[]): Item.Sequence => ({
		kind: "sequence",
		children: items.map(item => this.register(item)),
	})

	stack = (...items: Item.Any[]): Item.Stack => ({
		kind: "stack",
		children: items.map(item => this.register(item)),
	})

	clip = (media: Id, start: number, duration: number): Item.Clip => ({
		kind: "clip",
		media,
		start,
		duration,
	})

	text = (content: string): Item.Text => ({
		kind: "text",
		content,
	})

	transition = {
		crossfade: (duration: number): Item.Transition => ({
			kind: "transition",
			effect: "crossfade",
			duration,
		}),
	}
}

export function makeTimeline(fn: (o: O) => Item.Sequence): TimelineFile {
	const o = new O()
	const sequence = fn(o)
	return {
		format: "timeline",
		info: "https://omniclip.app/",
		version: 0,
		root: o.register(sequence),
		items: o.items,
	}
}

