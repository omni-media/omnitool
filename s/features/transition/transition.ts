//@ts-ignore
import transitions from "gl-transitions"
import {Filter, GlProgram, Sprite, Texture} from "pixi.js"

import {vertex} from "./parts/vertex.js"
import {uniforms} from "./parts/uniforms.js"
import {fragment} from "./parts/fragment.js"
import {GLTransition, TransitionOptions, TransitionRendererOptions} from "./parts/types.js"

export function makeTransition({name, renderer}: TransitionOptions) {
	const transition = transitions.find((t: GLTransition) => t.name === name) as GLTransition
	const transitionSprite = new Sprite()
	const transitionTexture = new Texture()
	const textureFrom = new Texture()
	const textureTo = new Texture()

	const filter = new Filter({
		glProgram: new GlProgram({
			vertex,
			fragment: fragment(transition.glsl),
		}),
		resources: {
			from: textureFrom.source,
			to: textureTo.source,
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
				transitionTexture.source.resize(options.width, options.height)
			}
			const from = Texture.from(options.from).source
			const to = Texture.from(options.to).source

			filter.resources.from = from
			filter.resources.to = to
			filter.resources.uniforms.uniforms.progress = options.progress

			renderer.render({
				container: transitionSprite,
				target: transitionTexture,
				clear: false,
				width: options.width,
				height: options.height
			})

			from.destroy()
			to.destroy()

			return transitionTexture
		}
	}
}

