//@ts-ignore
import transitions from "gl-transitions"
import {Filter, GlProgram, RenderTexture, Sprite} from "pixi.js"

import {vertex} from "./parts/vertex.js"
import {uniforms} from "./parts/uniforms.js"
import {fragment} from "./parts/fragment.js"
import {GLTransition, TransitionOptions, TransitionRendererOptions} from "./parts/types.js"

export function makeTransition({name, renderer}: TransitionOptions) {
	const transition = transitions.find((t: GLTransition) => t.name === name) as GLTransition
	const transitionSprite = new Sprite()
	const output = RenderTexture.create({width: 1, height: 1})

	const filter = new Filter({
		glProgram: new GlProgram({
			vertex,
			fragment: fragment(transition.glsl),
		}),
		resources: {
			uniforms: {
				...uniforms.basics,
				...uniforms.custom(transition)
			}
		}
	})

	transitionSprite.filters = [filter]

	const resize = (width: number, height: number) => {
		if (transitionSprite.width !== width || transitionSprite.height !== height) {
			transitionSprite.setSize({width, height})
			output.resize(width, height)
		}
	}

	return {
		dispose() {
			transitionSprite.destroy(true)
			output.destroy(true)
		},
		render({from, to, width, height, progress}: TransitionRendererOptions) {
			resize(width, height)
			filter.resources.from = from.source
			filter.resources.to = to.source
			filter.resources.uniforms.uniforms.progress = progress

			renderer.render({
				container: transitionSprite,
				target: output,
				clear: true,
				width,
				height
			})

			return output
		}
	}
}
