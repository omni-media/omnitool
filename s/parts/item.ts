
import {Id} from "./basics.js"

export namespace Item {
	export type Sequence = {
		kind: "sequence"
		children: Id[]
	}

	export type Stack = {
		kind: "stack"
		children: Id[]
	}

	export type Clip = {
		kind: "clip"
		media: Id
		start: number
		duration: number
	}

	export type Text = {
		kind: "text"
		content: string
	}

	export type Transition = {
		kind: "transition"
		effect: "crossfade"
		duration: number
	}

	export type Any = (
		| Sequence
		| Stack
		| Clip
		| Text
		| Transition
	)
}

