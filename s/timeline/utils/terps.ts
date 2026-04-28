
import {Interpolation, Keyframes} from "../types.js"

type EasingFn = (x: number, a: number, b: number) => number

class TerpKeys {
	constructor(
		private keys: Keyframes,
		private index: number,
	) {}

	near(offset: number): number {
		const next = this.keys[Math.max(0, Math.min(this.keys.length - 1, this.index + offset))]
		return next[1]
	}
}

type TerpFn = (x: number, keys: TerpKeys) => number

const asTerp = (fn: TerpFn): TerpFn => fn

const fromEasingFn = (easing: EasingFn): TerpFn =>
	asTerp((x, keys) => easing(x, keys.near(0), keys.near(1)))

const lerp = (x: number, a: number, b: number) => a + (b - a) * x

export const terps: Record<Interpolation, TerpFn> = {
	linear: fromEasingFn(lerp),

	ease: fromEasingFn((x, a, b) => {
		const eased = x < 0.5
			? 4 * x * x * x
			: 1 - Math.pow(-2 * x + 2, 3) / 2
		return lerp(eased, a, b)
	}),

	easeIn: fromEasingFn((x, a, b) => lerp(x * x * x, a, b)),

	easeOut: fromEasingFn((x, a, b) => lerp(1 - Math.pow(1 - x, 3), a, b)),

	bounce: fromEasingFn((x, a, b) => {
		const n1 = 7.5625
		const d1 = 2.75
		const eased = x < 1 / d1
			? n1 * x * x
			: x < 2 / d1
				? n1 * (x - 1.5 / d1) ** 2 + 0.75
				: x < 2.5 / d1
					? n1 * (x - 2.25 / d1) ** 2 + 0.9375
					: n1 * (x - 2.625 / d1) ** 2 + 0.984375
		return lerp(eased, a, b)
	}),

	catmullRom: asTerp((x, keys) => {
		const p1 = keys.near(-1)
		const p2 = keys.near(0)
		const p3 = keys.near(1)
		const p4 = keys.near(2)
		const x2 = x * x
		const x3 = x2 * x
		return 0.5 * (
			(2 * p2) +
			(-p1 + p3) * x +
			(2 * p1 - 5 * p2 + 4 * p3 - p4) * x2 +
			(-p1 + 3 * p2 - 3 * p3 + p4) * x3
		)
	}),
}

export const resolveTerp =(
	terp: Interpolation,
	x: number,
	keys: Keyframes,
	index: number,
): number => {
	const fn = terps[terp]
	if (!fn)
		throw new Error(`unknown terp "${terp}"`)

	return fn(x, new TerpKeys(keys, index))
}
