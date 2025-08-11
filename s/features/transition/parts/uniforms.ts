import {GLTransition} from "./types.js"

export const uniforms = (transition: GLTransition) =>
	Object.fromEntries(
		Object.entries(transition.defaultParams).map(([name, value]) => [
			name,
			{
				value,
				type: getUniformType(transition.paramsTypes[name])
			}
		])
	)

const getUniformType = (type: string) => {
	if(type === "f32" || type === "i32") {
		return type
	} else if(type === "float") {
		return "f32"
	}
	else return `${type}<f32>`
}
