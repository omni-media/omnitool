
import {animationPresets} from "./presets.js"
import {AnimationPresetActions, MotionAnimationOptions, ScalarAnimationOptions} from "./types.js"
import {Anim, Interpolation, Keyframes, TrackTransform, Transform, TransformOptions} from "../../types.js"

export function makeAnimationPresets(
	scalar: (terp: Interpolation, track: Keyframes) => Anim<Keyframes>,
	transform: (terp: Interpolation, source: Keyframes<Transform>) => Anim<TrackTransform>,
	transformFrom: (options: TransformOptions) => Transform,
): AnimationPresetActions {
	const entries = Object.entries(animationPresets).map(([name, preset]) => {
		const action = preset.type === "motion"
			? (options?: MotionAnimationOptions): Anim<TrackTransform> => {
				const offset = options?.offset ?? 0
				return transform(options?.terp ?? preset.defaults.terp, [
					[offset, transformFrom({
						...preset.transform.from,
						...(options?.from === undefined ? {} : {position: options.from}),
					})],
					[offset + (options?.duration ?? preset.defaults.duration), transformFrom({
						...preset.transform.to,
						...(options?.to === undefined ? {} : {position: options.to}),
					})],
				])
			}
			: (options?: ScalarAnimationOptions): Anim<Keyframes> => {
				const offset = options?.offset ?? 0
				return scalar(options?.terp ?? preset.defaults.terp, [
					[offset, options?.from ?? preset.defaults.from],
					[offset + (options?.duration ?? preset.defaults.duration), options?.to ?? preset.defaults.to],
				])
			}

		return [name, action]
	})

	return Object.fromEntries(entries) as AnimationPresetActions
}
