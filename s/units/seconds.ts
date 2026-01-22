declare const SecondsBrand: unique symbol

export type Seconds = number & {
	readonly [SecondsBrand]: "s"
}

export const seconds = (value: number): Seconds =>
	value as Seconds
