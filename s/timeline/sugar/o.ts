import {TextStyleOptions} from "pixi.js"

import {Media} from "../parts/media.js"
import {Id, TimelineFile} from "../parts/basics.js"
import {Effect, Item, Kind} from "../parts/item.js"
import {Transform, TransformOptions, Vec2} from "../types.js"

export class O {
	#nextId = 0

	constructor(public state: {project: TimelineFile}) {}

	require<T extends Item.Any>(id: Id | undefined) {
    if (id === undefined)
    	return undefined
    const item = this.state.project.items.find(item => item.id === id)
    return item as T | undefined
	}

	#getId() {
		return this.#nextId++
	}

  #mutate(fn: (project: TimelineFile) => TimelineFile) {
    this.state.project = fn(this.state.project)
  }

	register(item: Item.Any) {
   	this.#mutate(state => {
      state.items.push(item)
      return state
   	})
	}

  textStyle = (style: TextStyleOptions): Item.TextStyle => {
		const item = {
			id: this.#getId(),
			kind: Kind.TextStyle,
			style
		} as Item.TextStyle
		this.register(item)
		return item
  }

  spatial = (transform: Transform): Item.Spatial => {
  	const item: Item.Spatial = {
  		id: this.#getId(),
  		kind: Kind.Spatial,
  		transform
  	}
		this.register(item)
  	return item
  }

	sequence = (...items: Item.Any[]): Item.Any => {
		const item =  {
			id: this.#getId(),
			kind: Kind.Sequence,
			childrenIds: items.map(item => item.id)
		} as Item.Sequence
		this.register(item)
		return item
	}

	stack = (...items: Item.Any[]): Item.Any => {
		const item = {
			kind: Kind.Stack,
			id: this.#getId(),
			childrenIds: items.map(item => item.id)
		} as Item.Stack
		this.register(item)
		return item
	}

	video = (
		media: Media,
		options?: {
			start?: number,
			duration?: number
		}): Item.Video => {

		if(!media.hasVideo)
			throw new Error(`Video clip error: media "${media.datafile.filename}" has no video track.`)

		const item: Item.Video = {
			kind: Kind.Video,
			id: this.#getId(),
			mediaHash: media.datafile.checksum.hash,
			start: options?.start ?? 0,
			duration: options?.duration ?? media.duration
		}
		this.register(item)
		return item
	}

	audio = (
		media: Media,
		options?: {
			start?: number,
			duration?: number
		}): Item.Audio => {

		if(!media.hasAudio)
			throw new Error(`Audio clip error: media "${media.datafile.filename}" has no audio track.`)

		const item: Item.Audio = {
			kind: Kind.Audio,
			id: this.#getId(),
			mediaHash: media.datafile.checksum.hash,
			start: options?.start ?? 0,
			duration: options?.duration ?? media.duration
		}
		this.register(item)
		return item
	}

	text = (content: string): Item.Text => {
		const item = {
			id: this.#getId(),
			content,
			kind: Kind.Text,
			duration: 2000
		} as Item.Text
		this.register(item)
		return item
	}

	gap = (duration: number): Item.Gap => {
		const item = {
			id: this.#getId(),
			kind: Kind.Gap,
			duration
		} as Item.Gap
		this.register(item)
		return item
	}

	transition = {
		crossfade: (duration: number): Item.Transition => {
			const item = {
				id: this.#getId(),
				kind: Kind.Transition,
				effect: Effect.Crossfade,
				duration,
			} as Item.Transition
			this.register(item)
			return item
		},
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

  addChildren(parent: Item.Stack | Item.Sequence, ...items: Item.Any[]) {
		this.#mutate(state => {
			const parentItem = state.items.find(({id}) => id === parent.id) as Item.Stack
			parentItem.childrenIds.push(...items.map(item => item.id))
			return state
		})
  }

	update = <T extends Item.Any, K extends keyof T>({id}: T, key: K, value: T[K]) => {
    this.#mutate(project => {
      const newItems = project.items.map(item => {
        if (item.id === id) {
          return {
            ...item,
            [key]: value,
          }
        }
        return item
      })
      return {...project, items: newItems}
    })
	}
}

