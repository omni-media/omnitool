import {Item, Kind} from "../../item.js"
import {ImageLayer, Layer} from "../../../../driver/fns/schematic.js"
import {I6, Mat6, mul6, transformToMat6} from "../../../utils/matrix.js"

export type AudioStreamComponent = {
	getStream: () => AsyncGenerator<AudioData>
}
export type AudioPlaybackComponent = {
	onTimeUpdate: (time: number) => void
}
export type VisualComponent = {
	sampleAt: (time: number) => Promise<Layer[]>
}

export type Node<T> = {
	duration: number
	visuals?: VisualComponent
	audio?: T
}

interface Sampler<T> {
	video(item: Item.Video, parentMatrix: Mat6): Promise<Node<T>>
	audio(item: Item.Audio): Promise<Node<T>>
	dispose(): Promise<void>
}

const requireItem = (items: Map<number, Item.Any>, id: number) => items.get(id)!
export const getWorldMat6 = (
	items: Map<number, Item.Any>,
	item: Item.Text | Item.Sequence | Item.Stack | Item.Video,
	parent?: Mat6
): Mat6 => {
	let world = parent ?? I6
	if (item.spatialId) {
		const spatial = requireItem(items, item.spatialId) as Item.Spatial
		if(spatial.enabled) {
			// reason we put transfrom to matrix is because its easier to calculate
			const local = transformToMat6(spatial.transform)
			world = mul6(local, world)
		}
	}
	return world
}

export type WebcodecsSampler = Sampler<AudioStreamComponent>
export interface HTMLSampler extends Sampler<AudioPlaybackComponent> {
	setPaused(v: boolean): void
}

export abstract class TreeBuilder<T> {
	constructor(protected items: Map<number, Item.Any>, protected sampler: Sampler<T>) {}

	async build(root: Item.Any, parentMatrix?: Mat6): Promise<Node<T>> {
		switch (root.kind) {
			case Kind.Video: return this.sampler.video(root, getWorldMat6(this.items, root, parentMatrix))
			case Kind.Audio: return this.sampler.audio(root)
			case Kind.Text: {
				const matrix = getWorldMat6(this.items, root, parentMatrix)
				const styleItem = root.styleId !== undefined
					? this.items.get(root.styleId) as Item.TextStyle
					: undefined
				return {
					duration: root.duration,
					visuals: {
						sampleAt: async (t) => {
							if (t < 0 || t >= root.duration)
								return []
							else return [{
								id: root.id,
								kind: "text",
								content: root.content,
								style: styleItem?.style,
								matrix
							}]
						}
					}
				}
			}
			case Kind.Gap: return {
				duration: root.duration,
				visuals: {
					sampleAt: async () => []
				}
			}
			case Kind.Stack: {
				const matrix = getWorldMat6(this.items, root, parentMatrix)
				const children = await Promise.all(root.childrenIds.map(id => this.build(requireItem(this.items, id), matrix)))
				return this.#composeStack(children)
			}
			case Kind.Sequence: {
				const matrix = getWorldMat6(this.items, root, parentMatrix)
				return this.#composeSequence(root, matrix)
			}
			default: return {duration: 0}
		}
	}

	abstract composeAudio_Stack(children: Node<T>[]): T | undefined
	abstract composeAudio_Sequence(children: Node<T>[]): T | undefined

	// Visual composition is the same for both builders, so it lives here.
	#composeVisuals_Stack(children: Node<T>[]): VisualComponent {
		return {
			sampleAt: async (time) => {
				const layers = await Promise.all(children.map(c => c.visuals ? c.visuals.sampleAt(time) : Promise.resolve([])))
				return layers.flat()
			}
		}
	}

	#composeVisuals_Sequence(children: Node<T>[]): VisualComponent {
		return {
			sampleAt: async (time) => {
				let localTime = Math.round(time)
				for (const child of children) {
					if (localTime <= child.duration) return child.visuals ? child.visuals.sampleAt(localTime) : []
					localTime -= child.duration
				}
				return []
			}
		}
	}

	#composeStack(children: Node<T>[]): Node<T> {
		const duration = Math.max(0, ...children.map(k => (Number.isFinite(k.duration) ? k.duration : 0)))
		return {
			duration,
			visuals: this.#composeVisuals_Stack(children),
			audio: this.composeAudio_Stack(children),
		}
	}

	async #composeSequence(sequence: Item.Sequence, parentMatrix?: Mat6): Promise<Node<T>> {
		const childItems = sequence.childrenIds.map(id => requireItem(this.items, id))
		const children = await this.#processChildren(childItems, parentMatrix)
		const duration = children.reduce((a, k) => a + k.duration, 0)
		return {
			duration,
			visuals: this.#composeVisuals_Sequence(children),
			audio: this.composeAudio_Sequence(children),
		}
	}

	async #processChildren(childItems: Item.Any[], parentMatrix?: Mat6): Promise<Node<T>[]> {
		const processedNodes: Node<T>[] = []
		for (let i = 0; i < childItems.length; i++) {
			const item = childItems[i]

			if (item.kind !== Kind.Transition) {
				processedNodes.push(await this.build(item, parentMatrix))
				continue
			}

			const outgoingNode = processedNodes.pop()
			const incomingItem = childItems[i + 1]

			if (!outgoingNode || !incomingItem || incomingItem.kind === Kind.Transition) {
				if (outgoingNode) processedNodes.push(outgoingNode)
				continue
			}

			const incomingNode = await this.build(incomingItem, parentMatrix)
			const transitionNode = await this.#createTransitionNode(item, outgoingNode, incomingNode)
			processedNodes.push(transitionNode)
			i++
		}
		return processedNodes
	}

	async #createTransitionNode(transitionItem: Item.Transition, outgoingNode: Node<T>, incomingNode: Node<T>): Promise<Node<T>> {
		const overlap = Math.max(0, Math.min(transitionItem.duration, outgoingNode.duration, incomingNode.duration))
		const start = Math.max(0, outgoingNode.duration - overlap)
		const combinedDuration = outgoingNode.duration + incomingNode.duration - overlap
		return {
			duration: combinedDuration,
			visuals: {
				sampleAt: async (t) => {
					if (!outgoingNode.visuals || !incomingNode.visuals) return []
					if (t < start) return outgoingNode.visuals.sampleAt(t)
					if (t < outgoingNode.duration) {
						const localTime = t - start
						const progress = overlap > 0 ? (localTime / overlap) : 1
						const from = await outgoingNode.visuals.sampleAt(t) as ImageLayer[]
						const to = await incomingNode.visuals.sampleAt(localTime) as ImageLayer[]
						if(!from[0]?.frame || !to[0]?.frame) return []
						return [{
							id: transitionItem.id,
							kind: "transition",
							name: "circle",
							progress,
							from: from[0].frame,
							to: to[0].frame,
						}]
					}
					return incomingNode.visuals.sampleAt(t - outgoingNode.duration + overlap)
				}
			},
			audio: this.composeAudio_Sequence([outgoingNode, incomingNode])
		}
	}
}
