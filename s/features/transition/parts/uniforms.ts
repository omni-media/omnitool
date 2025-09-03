import {GLTransition} from "./types.js"

export const uniforms = {
	custom: (transition: GLTransition) => Object.fromEntries(
		Object.entries(transition.defaultParams).map(([name, value]) => [
			name,
			{
				value,
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
	if(type === "f32" || type === "i32") {
		return type
	} else if(type === "float") {
		return "f32"
	}
	else return `${type}<f32>`
}
