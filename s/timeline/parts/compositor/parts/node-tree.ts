import {Item, Kind} from "../../item.js"

export type SampleAt<TLayer> = (time: number) => Promise<TLayer[]>
export type Node<TLayer> = {
	duration: number
	sampleAt: SampleAt<TLayer>
}

export type Sampler<TLayer> = {
	clip(item: Item.Clip): Promise<Node<TLayer>>
	text(item: Item.Text): Promise<Node<TLayer>>
	gap(item: Item.Gap): Promise<Node<TLayer>>
	dispose(): Promise<void>
	setPaused?(v: boolean): void
}

const requireItem = (items: Map<number, Item.Any>, id: number) => items.get(id)!

export async function buildNode<TLayer>(
	root: Item.Any,
	items: Map<number, Item.Any>,
	sampler: Sampler<TLayer>
): Promise<Node<TLayer>> {
	switch (root.kind) {
		case Kind.Gap:
			return sampler.gap(root)
		case Kind.Text:
			return sampler.text(root)
		case Kind.Clip:
			return sampler.clip(root)

		case Kind.Stack: {
			const children = await Promise.all(
				root.children.map(id => buildNode(requireItem(items, id), items, sampler))
			)
			const duration = Math.max(0, ...children.map(k => (Number.isFinite(k.duration) ? k.duration : 0)))
			return {
				duration,
				sampleAt: async (t) => (await Promise.all(children.map(k => k.sampleAt(t)))).flat(),
			}
		}

		case Kind.Sequence: {
			const children = await Promise.all(
				root.children
					.map(id => requireItem(items, id))
					.filter(k => k.kind !== Kind.Transition)
					.map(k => buildNode(k, items, sampler))
			)
			const duration = children.reduce((a, k) => a + k.duration, 0);
			return {
				duration,
				sampleAt: async (t) => {
					let local = t
					for (const k of children) {
						if (local < k.duration) return k.sampleAt(local)
						local -= k.duration
					}
					return []
				},
			}
		}

		default: {
			return {
				duration: 0,
				sampleAt: async () => [],
			}
		}
	}
}

