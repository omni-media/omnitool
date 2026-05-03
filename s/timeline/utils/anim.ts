
import {resolveTerp} from "./terps.js"
import {Item, Kind} from "../parts/item.js"
import {Anim, Keyframes, ScalarAnimation, TrackTransform, Transform} from "../types.js"

const resolveScalar =(
	time: number,
	keys: Keyframes,
	terp: Anim<Keyframes>["terp"],
	fallback = 0,
): number => {
	if (keys.length === 0)
		return fallback

	if (keys.length === 1)
		return keys[0][1]

	const sorted = [...keys].sort((a, b) => a[0] - b[0])

	if (time <= sorted[0][0])
		return sorted[0][1]

	const last = sorted[sorted.length - 1]
	if (time >= last[0])
		return last[1]

	let index = 0
	for (let i = 0; i < sorted.length - 1; i++) {
		const a = sorted[i]
		const b = sorted[i + 1]
		if (time >= a[0] && time <= b[0]) {
			index = i
			break
		}
	}

	const [t2] = sorted[index]
	const [t3] = sorted[index + 1]
	const span = t3 - t2
	const x = span === 0 ? 0 : (time - t2) / span

	return resolveTerp(terp, x, sorted, index)
}

export const resolveTransformAnimation =(
	time: number,
	anim: Anim<TrackTransform>,
): Transform => ([
	[
		resolveScalar(time, anim.track.position.x, anim.terp),
		resolveScalar(time, anim.track.position.y, anim.terp),
	],
	[
		resolveScalar(time, anim.track.scale.x, anim.terp, 1),
		resolveScalar(time, anim.track.scale.y, anim.terp, 1),
	],
	resolveScalar(time, anim.track.rotation, anim.terp),
])

export const resolveScalarAnimation =(
	time: number,
	anim: ScalarAnimation,
): number => resolveScalar(time, anim.track, anim.terp)

export const resolveTransform =(
	spatial: Item.Spatial | Item.AnimatedSpatial,
	time: number,
): Transform =>
	spatial.kind === Kind.AnimatedSpatial
		? resolveTransformAnimation(time, spatial.anim)
		: spatial.transform

