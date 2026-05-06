
import {animationPresets} from "./presets.js"
import {spatialAnimations, visualAnimations, animatableProperties} from "./properties.js"
import {Anim, Interpolation, Keyframes, TrackTransform, TransformOptions, Vec2} from "../../types.js"

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

export type MotionAnimationPresetDefinition = {
	type: "motion"
	label: string
	defaults: Required<MotionAnimationOptions>
	transform: {
		from: TransformOptions
		to: TransformOptions
	}
}

export type ScalarAnimationPresetDefinition = {
	type: "scalar"
	label: string
	defaults: Required<ScalarAnimationOptions>
}

export type AnimationPresetDefinition =
	| MotionAnimationPresetDefinition
	| ScalarAnimationPresetDefinition

export type SpatialAnimationProperty = keyof typeof spatialAnimations
export type VisualAnimationProperty = keyof typeof visualAnimations
export type AnimationProperty = keyof typeof animatableProperties
export type AnimationPreset = keyof typeof animationPresets

type AnimationPresetAction<TPreset extends AnimationPresetDefinition> =
	TPreset extends MotionAnimationPresetDefinition
		? (options?: MotionAnimationOptions) => Anim<TrackTransform>
		: TPreset extends ScalarAnimationPresetDefinition
			? (options?: ScalarAnimationOptions) => Anim<Keyframes>
			: never

export type AnimationPresetActions = {
	[TName in AnimationPreset]: AnimationPresetAction<(typeof animationPresets)[TName]>
}

export type AnimationPresetOptions<Value> = {
	duration?: number
	from?: Value
	to?: Value
	terp?: Interpolation
}

export type MotionAnimationOptions = AnimationPresetOptions<Vec2>
export type ScalarAnimationOptions = AnimationPresetOptions<number>
