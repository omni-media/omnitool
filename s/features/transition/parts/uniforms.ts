import {GLTransition} from "./types.js"

export const uniforms = {
	custom: (transition: GLTransition) => Object.fromEntries(
		Object.entries(transition.defaultParams).map(([name, value]) => [
			name,
			{
				value: typeof value === "boolean" ? Number(value) : value,
				type: getUniformType(transition.paramsTypes[name])
			}
		])
	),
	basics: {
		_fromR: {value: 1, type: "f32"},
		_toR: {value: 1, type: "f32"},
		ratio: {value: 1, type: "f32"},
		progress: {value: 0, type: "f32"},
		customUniform: {value: 0, type: "f32"},
	}
}

const getUniformType = (type: string) => {
	if (type === "float" || type === "f32")
		return "f32"
	if (type === "int" || type === "bool" || type === "i32")
		return "i32"
	if (type === "ivec2")
		return "vec2<i32>"
	return `${type}<f32>`
}
