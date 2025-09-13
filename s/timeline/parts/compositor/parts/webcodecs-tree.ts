import {Item} from "../../item.js"
import {AudioStreamComponent, Node, WebcodecsSampler, TreeBuilder} from "./tree-builder.js"

class WebCodecsNodeBuilder extends TreeBuilder<AudioStreamComponent> {
	composeAudio_Stack(children: Node<AudioStreamComponent>[]) {
		if (!children.some(c => c.audio))
			return undefined
		return {
			getStream: async function*() {
				for (const child of children) {
					if (child.audio)
						yield* child.audio.getStream()
				}
			}
		}
	}
	composeAudio_Sequence(children: Node<AudioStreamComponent>[]) {
		if (!children.some(c => c.audio))
			return undefined
		return {
			getStream: async function*() {
				for (const child of children) {
					if (child.audio)
						yield* child.audio.getStream()
				}
			}
		}
	}
}

export function buildWebCodecsNodeTree(root: Item.Any, items: Map<number, Item.Any>, sampler: WebcodecsSampler) {
	const builder = new WebCodecsNodeBuilder(items, sampler)
	return builder.build(root)
}
