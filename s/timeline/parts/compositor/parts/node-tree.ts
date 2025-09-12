import {Item, Kind} from "../../item.js"
import {ImageLayer, Layer} from "../../../../driver/fns/schematic.js"

export type SampleAt = (time: number) => Promise<Layer[]>
export type Node = {
	duration: number
	sampleAt: SampleAt
	audioStream?: () => AsyncGenerator<AudioData>
}

export type Sampler = {
	video(item: Item.Video): Promise<Node>
	audio(item: Item.Audio): Promise<Node>
	dispose(): Promise<void>
	setPaused?(v: boolean): void
}

const requireItem = (items: Map<number, Item.Any>, id: number) => items.get(id)!

export async function buildNode(
	root: Item.Any,
	items: Map<number, Item.Any>,
	sampler: Sampler
): Promise<Node> {
	switch (root.kind) {
		case Kind.Gap:
			return {
				duration: root.duration,
				sampleAt: async () => [],
			}
		case Kind.Text:
			return {
				duration: Infinity,
				sampleAt: async () => [{kind: "text", content: root.content, color: "white", fontSize: 48}],
			}
		case Kind.Video:
			return sampler.video(root)

		case Kind.Audio: {
			return sampler.audio(root)
		}
		case Kind.Stack: {
			const children = await Promise.all(
				root.children.map(id => buildNode(requireItem(items, id), items, sampler))
			)
			const duration = Math.max(0, ...children.map(k => (Number.isFinite(k.duration) ? k.duration : 0)))
			return {
				duration,
				sampleAt: async (t) => (await Promise.all(children.map(k => k.sampleAt(t)))).flat(),
				audioStream: async function*() {
					for (const child of children) {
						if(child.audioStream) {
							yield* child.audioStream()
						}
					}
				}
			}
		}

		case Kind.Sequence: {
			const childItems = root.children.map(id => items.get(id)!)
			const children = await processSequenceChildren(childItems, items, sampler)
			const duration = children.reduce((a, k) => a + k.duration, 0)
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
				audioStream: async function*() {
					for (const child of children) {
						if(child.audioStream) {
							yield* child.audioStream()
						}
					}
				}
			}
		}

		default: {
			return {
				duration: 0,
				sampleAt: async () => []
			}
		}
	}
}

async function processSequenceChildren(
  childItems: Item.Any[],
  items: Map<number, Item.Any>,
  sampler: Sampler
): Promise<Node[]> {
  const processedNodes: Node[] = []

  for (let i = 0; i < childItems.length; i++) {
    const item = childItems[i]

    if (item.kind !== Kind.Transition) {
      processedNodes.push(await buildNode(item, items, sampler))
      continue
    }

    const outgoingNode = processedNodes.pop()
    const incomingItem = childItems[i + 1]

		// TODO - make sure there is incoming and outgoing items both of clip kind (video)
    if (!outgoingNode || !incomingItem || incomingItem.kind === Kind.Transition) {
      if (outgoingNode) processedNodes.push(outgoingNode)
      continue
    }

    const incomingNode = await buildNode(incomingItem, items, sampler)
    const transitionNode = await createTransitionNode(item, outgoingNode, incomingNode)

    processedNodes.push(transitionNode)
    i++
  }

  return processedNodes
}

async function createTransitionNode(
  transitionItem: Item.Transition,
  outgoingNode: Node,
  incomingNode: Node
): Promise<Node> {
  const overlap = Math.max(0, Math.min(transitionItem.duration, outgoingNode.duration, incomingNode.duration))
  const start = Math.max(0, outgoingNode.duration - overlap)
  const combinedDuration = outgoingNode.duration + incomingNode.duration - overlap
  return {
    duration: combinedDuration,
    sampleAt: async (t) => {
      // Before the overlap, sample the outgoing node
      if (t < start) {
        return outgoingNode.sampleAt(t)
      }
      // During the overlap, create the transition composition
      if (t < outgoingNode.duration) {
        const localTime = t - start
        const progress = overlap > 0 ? (localTime / overlap) : 1
				const from = await outgoingNode.sampleAt(t) as ImageLayer[]
				const to = await incomingNode.sampleAt(localTime) as ImageLayer[]
        return [{
          kind: "transition",
          name: "circle",
          progress,
          from: from[0].frame,
          to: to[0].frame,
        }]
      }
      // After the overlap, sample the incoming node
      return await incomingNode.sampleAt(t - start)
    },
    audioStream: async function*() {
    	if(outgoingNode.audioStream)
				yield* outgoingNode.audioStream()
			if(incomingNode.audioStream)
				yield* incomingNode.audioStream()
		}
  }
}
