import {hex} from "@e280/stz"
import {TextStyleOptions} from "pixi.js"

import {Media} from "../parts/media.js"
import {Id, TimelineFile} from "../parts/basics.js"
import {FilterAction, FilterActions} from "../parts/filters.js"
import {filters, FilterParams, FilterType} from "../parts/filters.js"
import {Crop, Effect, FilterableItem, Item, Kind, VisualAnimatableItem} from "../parts/item.js"
import {Anim, AnimateAction, AnimateActions, Interpolation, Keyframes, TrackTransform, Transform, TransformOptions, Vec2, VisualAnimations} from "../types.js"

export class O {
	constructor(public state: {timeline: TimelineFile}) {}

	require<T extends Item.Any>(id: Id | undefined) {
    if (id === undefined)
    	return undefined
    const item = this.state.timeline.items.find(item => item.id === id)
    return item as T | undefined
	}

	get timeline() {
		return this.state.timeline
	}

	getId() {
		return hex.toInteger(hex.random())
	}

  #mutate(fn: (project: TimelineFile) => TimelineFile) {
    this.state.timeline = fn(this.state.timeline)
  }

	register(item: Item.Any) {
		this.#mutate(state => ({
			...state,
			items: [...state.items, item]
		}))
	}

  textStyle = (style: TextStyleOptions): Item.TextStyle => {
		const item = {
			id: this.getId(),
			kind: Kind.TextStyle,
			style
		} as Item.TextStyle
		this.register(item)
		return item
  }

  spatial = (transform?: Transform, crop?: Crop): Item.Spatial => {
  	const item: Item.Spatial = {
  		id: this.getId(),
  		kind: Kind.Spatial,
  		transform: transform ?? this.transform(),
  		crop,
  		enabled: true
  	}
		this.register(item)
  	return item
  }

	animatedSpatial = (anim: Anim<TrackTransform>, crop?: Crop): Item.AnimatedSpatial => {
		const item: Item.AnimatedSpatial = {
			id: this.getId(),
			kind: Kind.AnimatedSpatial,
			anim,
			crop,
			enabled: true
		}
		this.register(item)
		return item
	}

	#registerAnimation = (anims: VisualAnimations): Item.Animation => {
		const item: Item.Animation = {
			id: this.getId(),
			kind: Kind.Animation,
			anims,
			enabled: true
		}
		this.register(item)
		return item
	}

	anim = {
		scalar: (terp: Interpolation, track: Keyframes): Anim<Keyframes> => ({terp, track}),

		vec2: (terp: Interpolation, source: Keyframes<Vec2>) => {
			const track = {x: [] as Keyframes, y: [] as Keyframes}

			for (const [time, [x, y]] of source) {
				track.x.push([time, x])
				track.y.push([time, y])
			}

			return {terp, track}
		},

		transform: (terp: Interpolation, source: Keyframes<Transform>): Anim<TrackTransform> => {
			const track: TrackTransform = {
				position: {x: [], y: []},
				scale: {x: [], y: []},
				rotation: [],
			}

			for (const [time, [position, scale, rotation]] of source) {
				track.position.x.push([time, position[0]])
				track.position.y.push([time, position[1]])
				track.scale.x.push([time, scale[0]])
				track.scale.y.push([time, scale[1]])
				track.rotation.push([time, rotation])
			}

			return {terp, track}
		},
	}

	#makeFilter = <TFilter extends FilterType>(type: TFilter) => {
		const make = (params?: FilterParams<TFilter>) => {
			const item: Item.Filter<TFilter> = {
				id: this.getId(),
				kind: Kind.Filter,
				type,
				params,
				enabled: true
			}
			this.register(item)
			return item
		}

		const action = (<T extends FilterableItem>(item: T, params?: FilterParams<TFilter>): T => {
			const filter = make(params)
			const next = {
				...item,
				filterIds: [...(item.filterIds ?? []), filter.id]
			}
			this.set<T>(item.id, next as Partial<T>)
			return next
		}) as FilterAction<TFilter>

		action.make = make
		return action
	}

	#makeFilters = (): FilterActions => {
		const entries = Object.entries(filters)
			.map(([name, filter]) => [name, this.#makeFilter(filter.type)])
		return Object.fromEntries(entries) as FilterActions
	}

	filter = this.#makeFilters()

	#makeAnimate = <TKey extends keyof VisualAnimations>(key: TKey): AnimateAction<VisualAnimatableItem, Item.Animation> => {
		const make = (terp: Interpolation, track: Keyframes) =>
			this.#registerAnimation({
				[key]: this.anim.scalar(terp, track)
			} as Pick<VisualAnimations, TKey>)

		const action = (<T extends VisualAnimatableItem>(
			item: T,
			terp: Interpolation,
			track: Keyframes
		): T => {
			const animation = make(terp, track)
			const next = {
				...item,
				animationId: animation.id
			}
			this.set<T>(item.id, next as Partial<T>)
			return next
		}) as AnimateAction<VisualAnimatableItem, Item.Animation>

		action.make = make
		return action
	}

	#makeAnimateActions = (): AnimateActions<VisualAnimatableItem, Item.Animation, VisualAnimations> => ({
		opacity: this.#makeAnimate("opacity")
	})

	animate = this.#makeAnimateActions()

	sequence = (...items: Item.Any[]): Item.Sequence => {
		const item =  {
			id: this.getId(),
			kind: Kind.Sequence,
			childrenIds: items.map(item => item.id)
		} as Item.Sequence
		this.register(item)
		return item
	}

	stack = (...items: Item.Any[]): Item.Stack => {
		const item = {
			kind: Kind.Stack,
			id: this.getId(),
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
			id: this.getId(),
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
			duration?: number,
			gain?: number
		}): Item.Audio => {

		if(!media.hasAudio)
			throw new Error(`Audio clip error: media "${media.datafile.filename}" has no audio track.`)

		const item: Item.Audio = {
			kind: Kind.Audio,
			id: this.getId(),
			mediaHash: media.datafile.checksum.hash,
			start: options?.start ?? 0,
			duration: options?.duration ?? media.duration,
			gain: options?.gain ?? 1
		}
		this.register(item)
		return item
	}

	text = (content: string, options?: {
			duration?: number,
			styles?: TextStyleOptions
		}): Item.Text => {

		const item = {
			id: this.getId(),
			content,
			kind: Kind.Text,
			duration: options?.duration ?? 2000
		} as Item.Text

		if(options?.styles)
			item.styleId = this.textStyle(options.styles).id

		this.register(item)
		return item
	}

	gap = (duration: number): Item.Gap => {
		const item = {
			id: this.getId(),
			kind: Kind.Gap,
			duration
		} as Item.Gap
		this.register(item)
		return item
	}

	transition = {
		crossfade: (duration: number): Item.Transition => {
			const item = {
				id: this.getId(),
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

	set = <K extends Item.Any>(
		id: Id,
		partial: Partial<K>
	) => {
		this.#mutate(project => ({
			...project,
			items: project.items.map(item =>
				item.id === id
					? { ...item, ...partial }
					: item
			)
		}))
	}
}

