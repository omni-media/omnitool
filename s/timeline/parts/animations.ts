
import type {Interpolation} from "../types.js"

export type AnimationType = "scalar" | "transform"
export type AnimationChannelType = "number"
export type AnimationUnit = "pixel" | "scale" | "radian" | "ratio"

export type AnimationChannel = {
	path?: string
	type: AnimationChannelType
	default: number
	unit?: AnimationUnit
	range?: readonly [min: number, max: number]
}

export type AnimationDefinition = {
	type: AnimationType
	defaultTerp: Interpolation
	channels: readonly AnimationChannel[]
}

export const spatialAnimations = {
	transform: {
		type: "transform",
		defaultTerp: "linear",
		channels: [
			{path: "position.x", type: "number", default: 0, unit: "pixel"},
			{path: "position.y", type: "number", default: 0, unit: "pixel"},
			{path: "scale.x", type: "number", default: 1, unit: "scale"},
			{path: "scale.y", type: "number", default: 1, unit: "scale"},
			{path: "rotation", type: "number", default: 0, unit: "radian"},
		],
	},
} as const satisfies Record<string, AnimationDefinition>

export const visualAnimations = {
	opacity: {
		type: "scalar",
		defaultTerp: "linear",
		channels: [
			{type: "number", default: 1, unit: "ratio", range: [0, 1]},
		],
	},
} as const satisfies Record<string, AnimationDefinition>

// const audioAnimations = {}

export const animations = {
	...spatialAnimations,
	...visualAnimations,
} as const

export type SpatialAnimationProperty = keyof typeof spatialAnimations
export type VisualAnimationProperty = keyof typeof visualAnimations
export type AnimationProperty = keyof typeof animations

