
import {pub} from "@e280/stz"
import {autoDetectRenderer, Container, Renderer, Sprite, Text, Texture} from "pixi.js"

import {Id} from "../../timeline/index.js"
import {Composition, Layer} from "../fns/schematic.js"
import {Mat6, mat6ToMatrix} from "../../timeline/utils/matrix.js"
import {makeTransition} from "../../features/transition/transition.js"

export class Compositor {
	onPointerDown = pub<[{id: Id, object: Container}]>()
	onPointerUp = pub<[{id: Id, object: Container}]>()

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
	// objects rendered for current Composition
	#activeObjects = new Map<number, Container>()

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

	/**
	 * get object for current Composition
	 * */
	getActiveObject(id: Id) {
		return this.#activeObjects.get(id)
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
		const {sprite, dispose} = this.#findOrCreate<Text>(layer)!
		this.#applyTransform(sprite, layer.matrix)
		parent.addChild(sprite)
		return {
			dispose: () => dispose()
		}
	}

	#renderImageLayer(
		layer: Extract<Layer, {kind: 'image'}>,
		parent: Container,
	) {
		const texture = Texture.from(layer.frame)
		const {sprite, dispose} = this.#findOrCreate<Sprite>(layer)!
		sprite.texture = texture
		this.#applyTransform(sprite, layer.matrix)
		parent.addChild(sprite)
		return {
			dispose: () => {
				texture.destroy(true)
				layer.frame.close()
				dispose()
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
		const object = this.#activeObjects.get(layer.id)
		if(!object) {
			switch (layer.kind) {
				case 'text': {
					const text = new Text({
						text: layer.content,
						style: layer.style
					})
					text.eventMode = "static"
					const down = () => this.onPointerDown.publish({id: layer.id, object: text})
					const up = () => this.onPointerUp.publish({id: layer.id, object: text})
					text.on("pointerdown", down)
					text.on("pointerup", up)

					return {
						sprite: this.#activeObjects
							.set(layer.id, text)
							.get(layer.id) as T,
						dispose: () => {
							text.off("pointerdown", down)
							text.off("pointerup", up)
						}
					}
				}
				case 'image': {
					const sprite = new Sprite()
					sprite.eventMode = "static"
					const down = () => this.onPointerDown.publish({id: layer.id, object: sprite})
					const up = () => this.onPointerUp.publish({id: layer.id, object: sprite})
					sprite.on("pointerdown", down)
					sprite.on("pointerup", up)

					return {
						sprite: this.#activeObjects
							.set(layer.id, sprite)
							.get(layer.id) as T,
						dispose: () => {
							sprite.off("pointerdown", down)
							sprite.off("pointerup", up)
						}
					}
				}
			}
		} else return {
			sprite: object,
			dispose: () => {}} as {
				sprite: T
				dispose: () => void
			}
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
		for (const id of this.#activeObjects.keys()) {
			if (!activeIds.has(id)) {
				const obj = this.#activeObjects.get(id)!
				obj.destroy(true)
				this.#activeObjects.delete(id)
			}
		}
	}
}
