import {TextStyleOptions} from "pixi.js"

import {Id, Hash} from "./basics.js"
import {Transform} from "../types.js"

export enum Kind {
	Sequence,
	Stack,
	Video,
	Audio,
	Text,
	Gap,
	Spatial,
	Transition,
}

export enum Effect {
	Crossfade,
}

export namespace Item {
  export type Spatial = {
    id: Id
    kind: Kind.Spatial
    transform: Transform
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
	}

	export type Stack = {
		id: Id
		kind: Kind.Stack
		childrenIds: Id[]
		spatialId?: Id
	}

	export type Video = {
		id: Id
		kind: Kind.Video
		mediaHash: Hash
		start: number
		duration: number
		spatialId?: Id
	}

	export type Audio = {
		id: Id
		kind: Kind.Audio
		mediaHash: Hash
		start: number
		duration: number
	}

	export type Text = {
		id: Id
		kind: Kind.Text
		content: string
		duration: number
		spatialId?: Id
		style: TextStyleOptions
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
	)
}

