import {Item} from "../../item.js"
import {TimelineFile} from "../../basics.js"
import {buildNode, Node, Sampler} from "./node-tree.js"

export abstract class TimelineEngine {
	protected items = new Map<number, Item.Any>()
	protected rootNode: Node | null = null

	protected abstract sampler(): Sampler

	get duration() {
		return this.rootNode?.duration ?? 0
	}

	async load(timeline: TimelineFile) {
		this.items = new Map(timeline.items.map(i => [i.id, i]))
		const rootItem = this.items.get(timeline.root)!
		this.rootNode = await buildNode(rootItem, this.items, this.sampler())
	}

	async sampleAt(t: number) {
		return this.rootNode!.sampleAt(t)
	}
}

