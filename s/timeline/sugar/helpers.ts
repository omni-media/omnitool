import type {Anim, Interpolation, Keyframes, TrackTransform, Transform, TransformOptions, Vec2} from "../types.js"

export function transform(options?: TransformOptions): Transform {
	const position: Vec2 = [
		options?.position?.[0] ?? 0,
		options?.position?.[1] ?? 0,
	]
	const scale: Vec2 = [
		options?.scale?.[0] ?? 1,
		options?.scale?.[1] ?? 1,
	]
	const rotation = options?.rotation ?? 0
	return [position, scale, rotation]
}

export const anim = {
	scalar(terp: Interpolation, track: Keyframes): Anim<Keyframes> {
		return {terp, track}
	},

	vec2(terp: Interpolation, source: Keyframes<Vec2>): Anim<{x: Keyframes, y: Keyframes}> {
		const track = {x: [] as Keyframes, y: [] as Keyframes}
		for (const [time, [x, y]] of source) {
			track.x.push([time, x])
			track.y.push([time, y])
		}
		return {terp, track}
	},

	transform(terp: Interpolation, source: Keyframes<Transform>): Anim<TrackTransform> {
		const track: TrackTransform = {
			position: {x: [], y: []},
			scale: {x: [], y: []},
			rotation: [],
		}
		for (const [time, [position, scale, rotation]] of source) {
			track.position.x.push([time, position[0]])
			track.position.y.push([time, position[1]])
			track.scale.x.push([time, scale[0]])
			track.scale.y.push([time, scale[1]])
			track.rotation.push([time, rotation])
		}
		return {terp, track}
	},
}
