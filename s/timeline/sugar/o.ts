
import {MapG} from "@e280/stz"
import {Id} from "../parts/basics.js"
import {Media} from "../parts/media.js"
import {Effect, Item, Kind} from "../parts/item.js"
import {Transform, TransformOptions, Vec2} from "../types.js"
import {Video, Gap, Sequence, Stack, Text, TimelineItem, Spatial, Audio, Transition} from "./builders.js"

export class O {
	#nextId = 0
	#items = new MapG<Id, TimelineItem>()

	#getId() {
		return this.#nextId++
	}

	register(item: TimelineItem) {
		if (!this.#items.has(item.id))
			this.#items.set(item.id, item)
		return item.id
	}

	get items() {
		return [...this.#items.values()]
	}

	get itemsMap() {
		return this.#items
	}

  spatial = (transform: Transform) => {
  	const item: Item.Spatial = {
  		id: this.#getId(),
  		kind: Kind.Spatial,
  		transform
  	}
  	const spatial = new Spatial(item)
  	this.register(spatial)
  	return spatial
  }

	sequence = (...items: TimelineItem[]) => new Sequence(this, {
		id: this.#getId(),
		kind: Kind.Sequence,
		childrenIds: items.map((item) => this.register(item))
	})

	stack = (...items: TimelineItem[]) => new Stack(this, {
		kind: Kind.Stack,
		id: this.#getId(),
		childrenIds: items.map(item => this.register(item))
	})

	video = (media: Media, options?: {start?: number, duration?: number}) => {
		if(!media.hasVideo)
			throw new Error(`Video clip error: media "${media.datafile.filename}" has no video track.`)

		const item: Item.Video = {
			kind: Kind.Video,
			id: this.#getId(),
			mediaHash: media.datafile.checksum.hash,
			start: options?.start ?? 0,
			duration: options?.duration ?? media.duration
		}

		return new Video(item)
	}

	audio = (media: Media, options?: {start?: number, duration?: number}) => {
		if(!media.hasAudio)
			throw new Error(`Audio clip error: media "${media.datafile.filename}" has no audio track.`)

		const item: Item.Audio = {
			kind: Kind.Audio,
			id: this.#getId(),
			mediaHash: media.datafile.checksum.hash,
			start: options?.start ?? 0,
			duration: options?.duration ?? media.duration
		}

		return new Audio(item)
	}

	text = (content: string) => new Text({
		id: this.#getId(),
		content,
		kind: Kind.Text,
		color: "#FFFFF"
	})

	gap = (duration: number) => new Gap({
		id: this.#getId(),
		kind: Kind.Gap,
		duration
	})

	transition = {
		crossfade: (duration: number) => new Transition({
			id: this.#getId(),
			kind: Kind.Transition,
			effect: Effect.Crossfade,
			duration,
		}),
	}

  transform = (options?: TransformOptions): Transform => {
    const position: Vec2 = [
    	options?.position?.[0] ?? 0,
    	options?.position?.[1] ?? 0
    ]
    const scale: Vec2 = [
    	options?.scale?.[0] ?? 1,
    	options?.scale?.[1] ?? 1
    ]
    const rotation = options?.rotation ?? 0
    return [position, scale, rotation]
  }
}

