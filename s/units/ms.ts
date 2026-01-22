declare const MsBrand: unique symbol

export type Ms = number & {
	readonly [MsBrand]: "ms"
}

export const ms = (value: number): Ms =>
	value as Ms
