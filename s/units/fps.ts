declare const FpsBrand: unique symbol

export type Fps = number & {
	readonly [FpsBrand]: "fps"
}

export const fps = (value: number): Fps =>
	value as Fps
