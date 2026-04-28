
export type Interpolation =
	| "linear"
	| "ease"
	| "easeIn"
	| "easeOut"
	| "bounce"
	| "catmullRom"

export type Keyframe<Value = number> = [time: number, value: Value]
export type Keyframes<Value = number> = Keyframe<Value>[]
export type Vec2 = [x: number, y: number]
export type Transform = [position: Vec2, scale: Vec2, rotation: number]

export type TrackVec2 = {
	x: Keyframes
	y: Keyframes
}

export type Anim<T> = {
  terp: Interpolation
  track: T
}

export type TrackTransform = {
	position: TrackVec2
	scale: TrackVec2
	rotation: Keyframes
}

export type ScalarAnimation = Anim<Keyframes>
export type Vec2Animation = Anim<TrackVec2>
export type TransformAnimation = Anim<TrackTransform>
export type VisualAnimations = {
	opacity?: ScalarAnimation
}
export interface AnimateAction<TItem, TAnimation> {
	(
		item: TItem,
		terp: Interpolation,
		track: Keyframes
	): TItem
	make(terp: Interpolation, track: Keyframes): TAnimation
}
export type AnimateActions<TItem, TAnimation, TAnimations> = {
	[TKey in keyof TAnimations]-?: AnimateAction<TItem, TAnimation>
}

// export type Animations = Anim<TrackTransform>

export type TransformOptions = {
  position?: Vec2
  scale?: Vec2
  rotation?: number
}

