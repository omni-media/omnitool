import {Matrix} from "pixi.js"
import {Transform} from "../types.js"

export const transformToMat6 = (t: Transform): Mat6 => {
	const [pos, scl, rotDeg] = t
	const [x, y] = pos
	const [sx, sy] = scl
	const r = rotDeg * Math.PI / 180
	const cos = Math.cos(r)
	const sin = Math.sin(r)
	return [cos * sx, sin * sx, -sin * sy, cos * sy, x, y]
}

export const mat6ToMatrix = ([a, b, c, d, tx, ty]: Mat6): Matrix =>
	new Matrix(a, b, c, d, tx, ty)

export const transformToMatrix = (t: Transform) => mat6ToMatrix(transformToMat6(t))

export const mul6 = (local: Mat6, parent: Mat6): Mat6 => {
	const [a1, b1, c1, d1, tx1, ty1] = local
	const [a2, b2, c2, d2, tx2, ty2] = parent
	return [
		a1 * a2 + c1 * b2,
		b1 * a2 + d1 * b2,
		a1 * c2 + c1 * d2,
		b1 * c2 + d1 * d2,
		a1 * tx2 + c1 * ty2 + tx1,
		b1 * tx2 + d1 * ty2 + ty1
	]
}

export const I6: Mat6 = [1, 0, 0, 1, 0, 0]
export type Mat6 = [a: number, b: number, c: number, d: number, tx: number, ty: number]
