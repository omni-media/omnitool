export type Keyframe<Value = number> = [time: number, value: Value]
export type Keyframes<Value = number> = Keyframe<Value>[]
export type Vec2 = [x: number, y: number]
export type Transform = [position: Vec2, scale: Vec2, rotation: number]

export type TrackVec2 = {
	x: Keyframes
	y: Keyframes
}

export type TrackTransform = {
	position: TrackVec2
	scale: TrackVec2
	rotation: Keyframes
}

export type TransformOptions = {
  position: {
  	x?: number
  	y?: number
  }
  scale: {
  	x?: number
  	y?: number
  }
  rotation: number
}
