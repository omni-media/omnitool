//@ts-ignore
import transitions from "gl-transitions"
import {Filter, GlProgram, Sprite, Texture, ImageSource} from "pixi.js"

import {vertex} from "./parts/vertex.js"
import {uniforms} from "./parts/uniforms.js"
import {fragment} from "./parts/fragment.js"
import {GLTransition, TransitionOptions, TransitionRendererOptions} from "./parts/types.js"

export function makeTransition({name, renderer}: TransitionOptions) {
	const transition = transitions.find((t: GLTransition) => t.name === name) as GLTransition
	const transitionSprite = new Sprite()
	const transitionTexture = new Texture()
	const sourceFrom = new ImageSource({})
	const sourceTo = new ImageSource({})

	const filter = new Filter({
		glProgram: new GlProgram({
			vertex,
			fragment: fragment(transition.glsl),
		}),
		resources: {
			from: sourceFrom,
			to: sourceTo,
			uniforms: {
				...uniforms.basics,
				...uniforms.custom(transition)
			}
		}
	})

	transitionSprite.filters = [filter]

	return {
		render({width, height, from, to, progress}: TransitionRendererOptions) {
			if(transitionSprite.width !== width || transitionSprite.height !== height) {
				transitionSprite.setSize({width, height})
				transitionTexture.source.resize(width, height)
			}

			sourceFrom.resource = from
			sourceTo.resource = to
			sourceFrom.update()
			sourceTo.update()

			filter.resources.uniforms.uniforms.progress = progress

			renderer.render({
				container: transitionSprite,
				target: transitionTexture,
				clear: false,
				width,
				height
			})

			return transitionTexture
		}
	}
}

