import {Item} from "../../item.js"
import {TimelineFile} from "../../basics.js"
import {buildNode, Node, Samplers} from "./node-tree.js"

export abstract class TimelineEngine<T> {
	protected items = new Map<number, Item.Any>()
	protected rootNode: Node<T> | null = null

	protected abstract samplers(): Samplers<T>

	get duration() {
		return this.rootNode?.duration ?? 0
	}

	async load(timeline: TimelineFile) {
		this.items = new Map(timeline.items.map(i => [i.id, i]))
		const rootItem = this.items.get(timeline.root)!
		this.rootNode = await buildNode(rootItem, this.items, this.samplers())
	}

	async sampleAt(t: number) {
		return this.rootNode!.sampleAt(t)
	}
}

