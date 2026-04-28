
import {TextStyleOptions} from "pixi.js"

import {Id, Hash} from "./basics.js"
import {Ms} from "../../units/ms.js"
import type {FilterParams, FilterType} from "./filters.js"
import {Anim, TrackTransform, Transform, VisualAnimations} from "../types.js"

export type Crop = [top: number, right: number, bottom: number, left: number]

export enum Kind {
	Sequence,
	Stack,
	Video,
	Audio,
	Text,
	Gap,
	Spatial,
	AnimatedSpatial,
	Animation,
	Transition,
	TextStyle,
	Filter
}

export enum Effect {
	Crossfade,
}

export namespace Item {
	export type TextStyle = {
		id: Id
		kind: Kind.TextStyle
		style: TextStyleOptions
	}

	export type Spatial = {
		id: Id
		kind: Kind.Spatial
		transform: Transform
		crop?: Crop
		enabled: boolean
	}

	export type AnimatedSpatial = {
		id: Id
		kind: Kind.AnimatedSpatial
		anim: Anim<TrackTransform>
		crop?: Crop
		enabled: boolean
	}

	export type Animation = {
		id: Id
		kind: Kind.Animation
		anims: VisualAnimations
		enabled: boolean
	}

	export type Filter<T extends FilterType = FilterType> = {
		id: Id
		kind: Kind.Filter
		type: T
		params?: FilterParams<T>
		enabled: boolean
	}

	export type Gap = {
		id: Id
		kind: Kind.Gap
		duration: number
	}

	export type Sequence = {
		id: Id
		kind: Kind.Sequence
		childrenIds: Id[]
		spatialId?: Id
		filterIds?: Id[]
	}

	export type Stack = {
		id: Id
		kind: Kind.Stack
		childrenIds: Id[]
		spatialId?: Id
		filterIds?: Id[]
	}

	export type Video = {
		id: Id
		kind: Kind.Video
		mediaHash: Hash
		start: number
		duration: number
		spatialId?: Id
		animationId?: Id
		filterIds?: Id[]
	}

	export type Audio = {
		id: Id
		kind: Kind.Audio
		mediaHash: Hash
		start: number
		duration: number
		gain?: number
	}

	export type Text = {
		id: Id
		kind: Kind.Text
		content: string
		duration: number
		spatialId?: Id
		animationId?: Id
		styleId?: Id
		filterIds?: Id[]
	}

	export type Transition = {
		id: Id
		kind: Kind.Transition
		effect: Effect.Crossfade
		duration: number
	}

	export type Any = (
		| Sequence
		| Stack
		| Video
		| Audio
		| Text
		| Gap
		| Transition
		| Spatial
		| AnimatedSpatial
		| Animation
		| TextStyle
		| Filter
	)
}

export type ContainerItem = Item.Sequence | Item.Stack
export type NonContainerItem = Exclude<Item.Any, ContainerItem>
export type FilterableItem = Item.Sequence | Item.Stack | Item.Video | Item.Text
export type SpatialItem = Item.Spatial | Item.AnimatedSpatial
export type VisualAnimatableItem = Item.Video | Item.Text

export type PlayableItem = Item.Any & {
	start: Ms
	duration: Ms
}
