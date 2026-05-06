
import {animationPresets} from "./presets.js"
import {animatableProperties} from "./properties.js"

export const animationRegistry = {
	presets: animationPresets,
	properties: animatableProperties,
} as const

export * from "./make.js"
export * from "./presets.js"
export * from "./properties.js"
export * from "./types.js"
