
import {VideoSink} from "./parts/sink.js"
import {ms, Ms} from "../../../../../units/ms.js"
import {TimelineFile} from "../../../../parts/basics.js"
import {ContainerItem, Item, Kind} from "../../../../parts/item.js"
import {computeTimelineDuration, computeWorldMatrix} from "../../handy.js"
import {DecoderSource, Layer} from "../../../../../driver/fns/schematic.js"

export class LayerSampler {
	readonly #sink

	constructor(resolveMedia: (hash: string) => DecoderSource) {
		this.#sink = new VideoSink(resolveMedia)
	}

	async sample(timeline: TimelineFile, timecode: Ms) {
		const items = new Map(timeline.items.map(item => [item.id, item]))
		const root = items.get(timeline.rootId)
		return root ? this.#sampleItem(timeline, items, root, timecode, []) : []
	}

	async #sampleItem(
		timeline: TimelineFile,
		items: Map<number, Item.Any>,
		item: Item.Any,
		time: Ms,
		ancestors: ContainerItem[]
	): Promise<Layer[]> {
		if (item.kind === Kind.Video || item.kind === Kind.Text) {
			const duration = item.kind === Kind.Video ? item.duration : ms(item.duration)
			if (time < 0 || time >= duration) return []
		}

		const matrix = computeWorldMatrix(items, ancestors, item)

		switch (item.kind) {
			case Kind.Stack: {
				const stackAncestors = [...ancestors, item]
				return (await Promise.all(
					item.childrenIds.map(id => {
						const child = items.get(id)
						return child
							? this.#sampleItem(timeline, items, child, time, stackAncestors)
							: []
					})
				)).flat()
			}

			case Kind.Sequence:
				return this.#sequence(timeline, items, item, time, ancestors)

			case Kind.Video: {
				const sink = await this.#sink.getSink(item.mediaHash)
				const sample = await sink?.getSample(time / 1000)
				const frame = sample?.toVideoFrame()
				sample?.close()
				return frame ? [{ kind: "image", frame, matrix, id: item.id }] : []
			}

			case Kind.Text: {
				const style = item.styleId
					? (items.get(item.styleId) as Item.TextStyle)?.style
					: undefined
				return [{ id: item.id, kind: "text", content: item.content, style, matrix }]
			}

			default:
				return []
		}
	}

	async #sequence(
		timeline: TimelineFile,
		items: Map<number, Item.Any>,
		seq: Item.Sequence,
		time: Ms,
		ancestors: ContainerItem[]
	): Promise<Layer[]> {
		const children = seq.childrenIds
			.map(id => items.get(id))
			.filter((i): i is Item.Any => !!i)

		const nextAncestors = [...ancestors, seq]
		let cursor = ms(0)

		for (let i = 0; i < children.length; i++) {
			const outgoing = children[i]
			if (outgoing.kind === Kind.Transition)
				continue

			const outgoingDuration = computeTimelineDuration(outgoing.id, timeline)
			const outgoingStart = cursor
			const outgoingEnd = ms(outgoingStart + outgoingDuration)

			const nextItem = children[i + 1]
			const hasTransition = nextItem?.kind === Kind.Transition

			if (!hasTransition) {
				const isInsideOutgoing = time < outgoingEnd

				if (isInsideOutgoing) {
					const outgoingLocalTime = ms(time - outgoingStart)
					return this.#sampleItem(timeline, items, outgoing, outgoingLocalTime, nextAncestors)
				}

				cursor = outgoingEnd
				continue
			}

			const transition = nextItem as Item.Transition
			const incoming = children[i + 2]
			const validIncoming = incoming && incoming.kind !== Kind.Transition

			if (!validIncoming) {
				cursor = outgoingEnd
				continue
			}

			const incomingDuration = computeTimelineDuration(incoming.id, timeline)
			const overlapDuration = Math.max(0, Math.min(transition.duration, outgoingDuration, incomingDuration))
			const outgoingSoloEnd = ms(outgoingEnd - overlapDuration)

			const isInsideOutgoingSolo = time < outgoingSoloEnd
			const isInsideTransition = time < outgoingEnd

			if (isInsideOutgoingSolo) {
				const outgoingLocalTime = ms(time - outgoingStart)
				return this.#sampleItem(timeline, items, outgoing, outgoingLocalTime, nextAncestors)
			}

			if (isInsideTransition) {
				const incomingLocalTime = ms(time - outgoingSoloEnd)
				const outgoingLocalTime = ms(time - outgoingStart)
				const progress = overlapDuration > 0 ? incomingLocalTime / overlapDuration : 1

				return this.#transition(
					transition,
					progress,
					this.#sampleItem(timeline, items, outgoing, outgoingLocalTime, nextAncestors),
					this.#sampleItem(timeline, items, incoming, incomingLocalTime, nextAncestors)
				)
			}

			cursor = outgoingSoloEnd
			i++
		}

		return []
	}

	async #transition(
		trans: Item.Transition,
		progress: number,
		p1: Promise<Layer[]>,
		p2: Promise<Layer[]>
	): Promise<Layer[]> {
		const [l1, l2] = await Promise.all([p1, p2])
		const f1 = l1.find(l => l.kind === "image")?.frame
		const f2 = l2.find(l => l.kind === "image")?.frame

		return f1 && f2 ? [{
			id: trans.id,
			kind: "transition",
			name: "circle",
			progress,
			from: f1,
			to: f2
		}] : []
	}
}

