export type Interpolation = "linear" | "catmullRom"
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

export type Animations = Anim<TrackTransform>

export type TrackTransform = {
	position: TrackVec2
	scale: TrackVec2
	rotation: Keyframes
}

export type TransformOptions = {
  position?: Vec2
  scale?: Vec2
  rotation?: number
}
