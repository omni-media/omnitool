
import {TextStyleOptions} from "pixi.js"

import {Id, Hash} from "./basics.js"
import {Ms} from "../../units/ms.js"
import {Transform, VisualAnimations} from "../types.js"
import type {FilterParams, FilterType} from "./filters.js"
import type {Transcription} from "../../features/speech/transcribe/types.js"

export type Crop = [top: number, right: number, bottom: number, left: number]

export enum Kind {
	Sequence,
	Stack,
	Video,
	Audio,
	Text,
	Gap,
	Spatial,
	Animation,
	Transition,
	TextStyle,
	Filter,
	Caption,
	Image
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
		animationIds?: Id[]
		filterIds?: Id[]
	}

	export type Image = {
		id: Id
		kind: Kind.Image
		mediaHash: Hash
		duration: number
		spatialId?: Id
		animationIds?: Id[]
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
		animationIds?: Id[]
		styleId?: Id
		filterIds?: Id[]
	}


	export type Caption = {
		id: Id
		kind: Kind.Caption
		transcript: Transcription
		itemId?: Id
		start: number
		duration: number
		maxChars?: number
		maxDuration?: number
		maxSilence?: number
		spatialId?: Id
		animationIds?: Id[]
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
		| Image
		| Audio
		| Text
		| Caption
		| Gap
		| Transition
		| Spatial
		| Animation
		| TextStyle
		| Filter
	)
}

export type ContainerItem = Item.Sequence | Item.Stack
export type NonContainerItem = Exclude<Item.Any, ContainerItem>
export type FilterableItem = Item.Sequence | Item.Stack | Item.Video | Item.Image | Item.Text | Item.Caption
export type VisualAnimatableItem = Item.Video | Item.Image | Item.Text | Item.Caption

export type PlayableItem = Item.Any & {
	start: Ms
	duration: Ms
}
