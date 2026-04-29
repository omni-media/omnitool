export type AnimationValue = "scalar" | "transform"

export type AnimationDefinition = {
	value: AnimationValue
}

export const spatialAnimations = {
	transform: {value: "transform"},
} as const satisfies Record<string, AnimationDefinition>

export const visualAnimations = {
	opacity: {value: "scalar"},
} as const satisfies Record<string, AnimationDefinition>

// const audioAnimations = {}

export const animations = {
	...spatialAnimations,
	...visualAnimations,
} as const

export type SpatialAnimationProperty = keyof typeof spatialAnimations
export type VisualAnimationProperty = keyof typeof visualAnimations
export type AnimationProperty = keyof typeof animations
