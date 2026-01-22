import {Item} from "../../item.js"
import {Ms, ms} from "../../../../units/ms.js"
import {AudioPlaybackComponent, HTMLSampler, Node, TreeBuilder} from "./tree-builder.js"

class HTMLNodeBuilder extends TreeBuilder<AudioPlaybackComponent> {
	constructor(protected items: Map<number, Item.Any>, protected sampler: HTMLSampler) {
		super(items, sampler)
	}

	composeAudio_Stack(children: Node<AudioPlaybackComponent>[]) {
		return {
			onTimeUpdate: (time: Ms) => {
				for (const child of children) {
					if (child.audio) child.audio.onTimeUpdate(time)
				}
			}
		}
	}
	composeAudio_Sequence(children: Node<AudioPlaybackComponent>[]) {
		return {
			onTimeUpdate: (time: Ms) => {
				let localTime = ms(Math.round(time))
				for (const child of children) {
					if (localTime <= child.duration) {
						if (child.audio) child.audio.onTimeUpdate(localTime)
						break
					}
					localTime = ms(localTime - child.duration)
				}
			}
		}
	}
}

export function buildHTMLNodeTree(root: Item.Any, items: Map<number, Item.Any>, sampler: HTMLSampler) {
	const builder = new HTMLNodeBuilder(items, sampler)
	return builder.build(root)
}
