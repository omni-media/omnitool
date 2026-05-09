
import type {AnimationDefinition} from "./types.js"

export const visualAnimations = {
	transform: {
		type: "transform",
		defaultTerp: "linear",
		channels: [
			{path: "position.x", type: "number", default: 0, unit: "pixel"},
			{path: "position.y", type: "number", default: 0, unit: "pixel"},
			{path: "scale.x", type: "number", default: 1, unit: "scale"},
			{path: "scale.y", type: "number", default: 1, unit: "scale"},
			{path: "rotation", type: "number", default: 0, unit: "degree"},
		],
	},
	opacity: {
		type: "scalar",
		defaultTerp: "linear",
		channels: [
			{type: "number", default: 1, unit: "ratio", range: [0, 1]},
		],
	},
} as const satisfies Record<string, AnimationDefinition>

// const audioAnimations = {}

export const animatableProperties = {
	...visualAnimations,
} as const

