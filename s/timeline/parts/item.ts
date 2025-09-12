
import {Id, Hash} from "./basics.js"

export enum Kind {
	Sequence,
	Stack,
	Video,
	Audio,
	Text,
	Gap,
	Transition,
}

export enum Effect {
	Crossfade,
}

export namespace Item {
	export type Gap = {
		id: Id
		kind: Kind.Gap
		duration: number
	}

	export type Sequence = {
		id: Id
		kind: Kind.Sequence
		children: Id[]
	}

	export type Stack = {
		id: Id
		kind: Kind.Stack
		children: Id[]
	}

	export type Video = {
		id: Id
		kind: Kind.Video
		mediaHash: Hash
		start: number
		duration: number
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
	)
}

