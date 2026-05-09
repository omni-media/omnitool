
import {animationPresets} from "./presets.js"
import type {Item, VisualAnimatableItem} from "../item.js"
import {visualAnimations, animatableProperties} from "./properties.js"
import type {Anim, Interpolation, Keyframes, ScalarAnimation, TrackTransform, TransformAnimation, TransformOptions, Vec2} from "../../types.js"

export type AnimationType = "scalar" | "transform"
export type AnimationChannelType = "number"
export type AnimationUnit = "pixel" | "scale" | "degree" | "ratio"

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
	defaults: Required<Omit<MotionAnimationOptions, "offset">>
	transform: {
		from: TransformOptions
		to: TransformOptions
	}
}

export type ScalarAnimationPresetDefinition = {
	type: "scalar"
	label: string
	defaults: Required<Omit<ScalarAnimationOptions, "offset">>
}

export type AnimationPresetDefinition =
	| MotionAnimationPresetDefinition
	| ScalarAnimationPresetDefinition

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
	offset?: number
	from?: Value
	to?: Value
	terp?: Interpolation
}

export type MotionAnimationOptions = AnimationPresetOptions<Vec2>
export type ScalarAnimationOptions = AnimationPresetOptions<number>
export type PresetAnimation = ScalarAnimation | TransformAnimation
export type PresetOptions = MotionAnimationOptions | ScalarAnimationOptions

export interface PresetAnimateAction {
	<T extends VisualAnimatableItem>(item: T, options?: PresetOptions): T
	make(options?: PresetOptions): Item.Animation
}

export type PresetAnimateActions = {
	[TKey in AnimationPreset]: PresetAnimateAction
}
