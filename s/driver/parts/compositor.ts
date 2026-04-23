
import {pub} from "@e280/stz"
import {
	autoDetectRenderer,
	ColorMatrixFilter,
	Container,
	FederatedPointerEvent,
	Filter,
	Graphics,
	Renderer,
	Sprite,
	Text,
	Texture
} from "pixi.js"
import * as PixiFilters from "pixi-filters"

import {Id} from "../../timeline/index.js"
import {Crop} from "../../timeline/parts/item.js"
import {findPixiFilter} from "../utils/find-pixi-filter.js"
import {Composition, FilterSpec, Layer} from "../fns/schematic.js"
import {Mat6, mat6ToMatrix} from "../../timeline/utils/matrix.js"
import {makeTransition} from "../../features/transition/transition.js"

export class Compositor {
	onPointerDown = pub<[{event: FederatedPointerEvent, id: Id, object: Container}]>()
	onPointerMove = pub<[{event: FederatedPointerEvent, id: Id, object: Container}]>()
	onPointerUp = pub<[{event: FederatedPointerEvent, id: Id, object: Container}]>()
	onDispose = pub<[{id: Id, object: Container}]>()

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
	#activeObjects = new Map<number, {sprite: Container, dispose: () => void}>()
	#cropMasks = new WeakMap<Container, Graphics>()

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
		return this.#activeObjects.get(id)?.sprite
	}

	async #renderLayer(
		layer: Layer | Composition,
		parent: Container,
	) {
		if (Array.isArray(layer)) {
			const disposers: (() => void)[] = []
			for (const child of [...layer].reverse()) {
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
		const sprite = this.#findOrCreate<Text>(layer)!
		this.#applyTransform(sprite, layer.matrix)
		this.#applyCrop(sprite, layer.crop)
		this.#applyFilters(sprite, layer.filters)
		parent.addChild(sprite)
		return {
			dispose: () => {}
		}
	}

	#renderImageLayer(
		layer: Extract<Layer, {kind: 'image'}>,
		parent: Container,
	) {
		const sprite = this.#findOrCreate<Sprite>(layer)!

		if (sprite.texture && sprite.texture !== Texture.EMPTY) {
			sprite.texture.destroy(true)
		}

		const texture = Texture.from(layer.frame)
		sprite.texture = texture
		this.#applyTransform(sprite, layer.matrix)
		this.#applyCrop(sprite, layer.crop)
		this.#applyFilters(sprite, layer.filters)
		parent.addChild(sprite)

		return {
			dispose: () => {
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

	#applyCrop(target: Container, crop?: Crop) {
		const existing = this.#cropMasks.get(target)
		if (existing) {
			if (target.mask === existing)
				target.mask = null
			existing.removeFromParent()
			existing.clear()
		}

		if (!crop || crop.every(value => value === 0))
			return

		const [top, right, bottom, left] = crop
		const activeMask = target.mask
		target.mask = null
		const bounds = target.getLocalBounds()
		target.mask = activeMask
		const x = bounds.x + bounds.width * left
		const y = bounds.y + bounds.height * top
		const width = bounds.width * Math.max(0, 1 - left - right)
		const height = bounds.height * Math.max(0, 1 - top - bottom)

		const mask = existing ?? new Graphics()
		mask.clear()
		mask.beginFill(0xffffff)
		mask.drawRect(x, y, width, height)
		mask.endFill()
		target.addChild(mask)
		target.mask = mask
		this.#cropMasks.set(target, mask)
	}

	#applyFilters(target: Container, specs: FilterSpec[] | undefined) {
		if (!specs?.length) {
			target.filters = null
			return
		}

		target.filters = specs
			.map((spec): Filter | undefined => {
				switch (spec.type) {
					case "ColorMatrixFilter": {
						const {matrix, ...params} = spec.params ?? {}
						const filter = new ColorMatrixFilter(params)
						if (matrix)
							filter.matrix = matrix
						return filter
					}
					case "EmbossFilter":
						return new PixiFilters.EmbossFilter(spec.params?.strength)
					case "PixelateFilter":
						return new PixiFilters.PixelateFilter(spec.params?.size)
					default: {
						const PixiFilter = findPixiFilter(spec.type)
						return PixiFilter ? new PixiFilter(spec.params) : undefined
					}
				}
			})
			.filter((filter): filter is Filter => !!filter)
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
					const down = (event: FederatedPointerEvent) => this.onPointerDown.publish({event, id: layer.id, object: text})
					const up = (event: FederatedPointerEvent) => this.onPointerUp.publish({event, id: layer.id, object: text})
					const move = (event: FederatedPointerEvent) => this.onPointerUp.publish({event, id: layer.id, object: text})

					text.on("pointerdown", down)
					text.on("pointerup", up)
					text.on("pointermove", move)

					return this.#activeObjects
						.set(layer.id, {
							sprite: text,
							dispose: () => {
								this.onDispose.publish({id: layer.id, object: text})
								text.off("pointermove", move)
								text.off("pointerdown", down)
								text.off("pointerup", up)
							}
						})
						.get(layer.id)?.sprite as T
				}
				case 'image': {
					const sprite = new Sprite()
					sprite.eventMode = "static"
					const down = (event: FederatedPointerEvent) => this.onPointerDown.publish({event, id: layer.id, object: sprite})
					const up = (event: FederatedPointerEvent) => this.onPointerUp.publish({event, id: layer.id, object: sprite})
					const move = (event: FederatedPointerEvent) => this.onPointerUp.publish({event, id: layer.id, object: sprite})

					sprite.on("pointerdown", down)
					sprite.on("pointermove", move)
					sprite.on("pointerup", up)

					return this.#activeObjects
						.set(layer.id, {
							sprite,
							dispose: () => {
								this.onDispose.publish({id: layer.id, object: sprite})
								sprite.off("pointerdown", down)
								sprite.off("pointermove", move)
								sprite.off("pointerup", up)
							}
						})
						.get(layer.id)?.sprite as T
				}
			}
		} else return object.sprite as T
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
				const {sprite, dispose} = this.#activeObjects.get(id)!
				dispose()
				sprite.destroy(true)
				this.#activeObjects.delete(id)
			}
		}
	}
}
