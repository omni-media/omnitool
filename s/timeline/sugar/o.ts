
import {MapG} from "@e280/stz"
import {Id} from "../parts/basics.js"
import {Media} from "../parts/media.js"
import {Effect, Item, Kind} from "../parts/item.js"

export class O {
	#nextId = 0
	#items = new MapG<Id, Item.Any>()

	#getId() {
		return this.#nextId++
	}

	register(item: Item.Any) {
		if (!this.#items.has(item.id))
			this.#items.set(item.id, item)
		return item.id
	}

	get items() {
		return [...this.#items.values()]
	}

	sequence = (...items: Item.Any[]): Item.Sequence => ({
		id: this.#getId(),
		kind: Kind.Sequence,
		children: items.map(item => this.register(item)),
	})

	stack = (...items: Item.Any[]): Item.Stack => ({
		id: this.#getId(),
		kind: Kind.Stack,
		children: items.map(item => this.register(item)),
	})

	clip = (media: Media, start?: number, duration?: number): Item.Clip => ({
		id: this.#getId(),
		kind: Kind.Clip,
		mediaHash: media.datafile.checksum.hash,
		start: start ?? 0,
		duration: duration ?? media.duration,
	})

	text = (content: string): Item.Text => ({
		id: this.#getId(),
		kind: Kind.Text,
		content,
	})

	transition = {
		crossfade: (duration: number): Item.Transition => ({
			id: this.#getId(),
			kind: Kind.Transition,
			effect: Effect.Crossfade,
			duration,
		}),
	}
}

