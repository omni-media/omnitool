//@ts-ignore
import transitions from "gl-transitions"
import {Filter, GlProgram, RenderTexture, Sprite, Texture} from "pixi.js"

import {vertex} from "./parts/vertex.js"
import {uniforms} from "./parts/uniforms.js"
import {fragment} from "./parts/fragment.js"
import {GLTransition, TransitionOptions, TransitionRendererOptions} from "./parts/types.js"

export function makeTransition({name, renderer}: TransitionOptions) {
	const transition = transitions.find((t: GLTransition) => t.name === name) as GLTransition
	const transitionSprite = new Sprite()
	const target = RenderTexture.create({})
	let blank = RenderTexture.create({})

	const filter = new Filter({
		glProgram: new GlProgram({
			vertex,
			fragment: fragment(transition.glsl),
		}),
		resources: {
			from: blank,
			to: blank,
			uniforms: {
				_fromR: {value: 1, type: "f32"},
				_toR: {value: 1, type: "f32"},
				ratio: {value: 1, type: "f32"},
				progress: {value: 0, type: "f32"},
				customUniform: {value: 0, type: "f32"},
				...uniforms(transition)
			}
		}
	})

	transitionSprite.filters = [filter]

	return {
		render(options: TransitionRendererOptions) {
			if(transitionSprite.width !== options.width || transitionSprite.height !== options.height) {
				transitionSprite.setSize({width: options.width, height: options.height})
				target.resize(options.width, options.height)
			}

			filter.resources.from = Texture.from(options.from).source
			filter.resources.to = Texture.from(options.to).source
			filter.resources.uniforms.uniforms.progress = options.progress
			renderer.render({container: transitionSprite, target: target, clear: false, width: options.width, height: options.height})

			return target
		}
	}
}

