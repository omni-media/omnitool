import {autoDetectRenderer, Container, Renderer, Sprite, Text, Texture} from "pixi.js"

import {Composition, Layer} from "../fns/schematic.js"
import {Mat6, mat6ToMatrix} from "../../timeline/utils/matrix.js"
import {makeTransition} from "../../features/transition/transition.js"

export class Compositor {

	static async setup() {
		const renderer = await autoDetectRenderer({
			width: 1920,
			height: 1080,
			preference: "webgl", // webgl and webgl2 causes memory leaks on chrome
			background: "black",
			preferWebGLVersion: 2
		})
		const stage = new Container()
		stage.interactive = true
		return new this({renderer, stage})
	}

	constructor(public pixi: {renderer: Renderer, stage: Container}) {}

	#transitions: Map<string, ReturnType<typeof makeTransition>> = new Map()
	#objects = new Map<number, Container>()

	async composite(
		composition: Composition,
	) {
		const {stage, renderer} = this.pixi

		this.#cleanup(this.#collectIds(composition))
		const {dispose} = await this.#renderLayer(composition, stage)
		renderer.render(stage)

		// make sure browser support webgl/webgpu otherwise it might take much longer to construct frame
		// if its very slow on eg edge try chrome
		const frame = new VideoFrame(renderer.canvas, {
			timestamp: 0,
			duration: 0,
		})

		dispose()

		return frame
	}

	async #renderLayer(
		layer: Layer | Composition,
		parent: Container,
	) {
		if (Array.isArray(layer)) {
			layer.reverse()
			const disposers: (() => void)[] = []
			for (const child of layer) {
				const result = await this.#renderLayer(child, parent)
				disposers.push(result.dispose)
			}
			return {dispose: () => disposers.forEach(d => d())}
		}

		switch (layer.kind) {
			case 'text':
				return this.#renderTextLayer(layer, parent)
			case 'image':
				return this.#renderImageLayer(layer, parent)
			case 'transition':
				return this.#renderTransitionLayer(layer, parent)
			case 'gap': {
				this.pixi?.renderer.clear()
				return {dispose: () => {}}
			}
			default:
				console.warn('Unknown layer kind', (layer as any).kind)
				return {dispose: () => {}}
		}
	}

	#renderTextLayer(
		layer: Extract<Layer, {kind: 'text'}>,
		parent: Container,
	) {
		const text = this.#findOrCreate<Text>(layer)!
		this.#applyTransform(text, layer.matrix)
		parent.addChild(text)
		return {
			dispose: () => {}
		}
	}

	#renderImageLayer(
		layer: Extract<Layer, {kind: 'image'}>,
		parent: Container,
	) {
		const texture = Texture.from(layer.frame)
		const sprite = this.#findOrCreate<Sprite>(layer)!
		sprite.texture = texture
		this.#applyTransform(sprite, layer.matrix)
		parent.addChild(sprite)
		return {
			dispose: () => {
				texture.destroy(true)
				layer.frame.close()
			}
		}
	}

	#renderTransitionLayer(
		{from, to, progress, name}: Extract<Layer, {kind: 'transition'}>,
		parent: Container,
	) {
		const transition = this.#transitions.get(name) ??
			(this.#transitions.set(name, makeTransition({
				name: "circle",
				renderer: this.pixi.renderer
			})),
	  	this.#transitions.get(name)!
		)
		const texture = transition.render({from, to, progress, width: from.displayWidth, height: from.displayHeight})
		const sprite = new Sprite(texture)
		parent.addChild(sprite)
		return {dispose: () => sprite.destroy(false)}
	}

	#applyTransform(target: Sprite | Text, worldMatrix?: Mat6) {
  	if (!worldMatrix) return
		const mx = mat6ToMatrix(worldMatrix)
  	target.setFromMatrix(mx)
	}

	#findOrCreate<T = Container>(layer: Layer) {
		const object = this.#objects.get(layer.id)
		if(!object) {
			switch (layer.kind) {
				case 'text': {
					const text = new Text({
						text: layer.content,
						style: layer.style
					})
					text.onmouseenter = () => console.log("enter text")
					return this.#objects
						.set(layer.id, text)
						.get(layer.id) as T
				}
				case 'image': {
					const sprite = new Sprite()
					sprite.onmouseenter = () => console.log("enter")
					return this.#objects
						.set(layer.id, sprite)
						.get(layer.id) as T
				}
			}
		} else return object as T
	}

	#collectIds(layers: Layer | Composition): Set<number> {
		const result = new Set<number>()
		const traverse = (node: Layer | Composition) => {
			if (Array.isArray(node)) {
				for (const child of node) traverse(child)
			} else {
				result.add(node.id)
			}
		}
		traverse(layers)
		return result
	}

	#cleanup(activeIds: Set<number>) {
		for (const id of this.#objects.keys()) {
			if (!activeIds.has(id)) {
				const obj = this.#objects.get(id)!
				obj.destroy(true)
				this.#objects.delete(id)
			}
		}
	}
}
