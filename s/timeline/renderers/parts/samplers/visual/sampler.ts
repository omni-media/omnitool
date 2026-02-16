
import {VideoSink} from "./parts/sink.js"
import {Mat6} from "../../../../utils/matrix.js"
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

		if (!root) return []

		return await this.#sampleItem(timeline, items, root, timecode, [])
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
				const nextAncestors = [...ancestors, item]
				const layers = await Promise.all(
					item.childrenIds.map(id => {
						const child = items.get(id)
						return child
							? this.#sampleItem(timeline, items, child, time, nextAncestors)
							: Promise.resolve([])
					})
				)
				return layers.flat()
			}

			case Kind.Sequence:
				return await this.#sequence(timeline, items, item, time, ancestors)

			case Kind.Video:
				return await this.#video(item, time, matrix)

			case Kind.Text:
				return this.#text(items, item, matrix)

			default:
				return []
		}
	}

	async #sequence(
		timeline: TimelineFile,
		items: Map<number, Item.Any>,
		sequence: Item.Sequence,
		seqTime: Ms,
		ancestors: ContainerItem[]
	): Promise<Layer[]> {
		const children = sequence.childrenIds.map(id => items.get(id)).filter((i): i is Item.Any => !!i)
		const nextAncestors = [...ancestors, sequence]

		let cursor = ms(0)

		for (let i = 0; i < children.length; i++) {
			const current = children[i]

			if (current.kind === Kind.Transition) continue

			const next = children[i + 1]
			const nextNext = children[i + 2]

			const currentDur = computeTimelineDuration(current.id, timeline)

			if (next?.kind === Kind.Transition && nextNext && nextNext.kind !== Kind.Transition) {
				const nextDur = computeTimelineDuration(nextNext.id, timeline)
				const overlap = Math.max(0, Math.min(next.duration, currentDur, nextDur))

				const endOfSolo = cursor + currentDur - overlap
				const endOfTransition = cursor + currentDur

				if (seqTime < endOfSolo) {
					return this.#sampleItem(timeline, items, current, ms(seqTime - cursor), nextAncestors)
				}

				if (seqTime < endOfTransition) {
					const transitionLocal = ms(seqTime - endOfSolo)
					return this.#transition(
						timeline, items, nextAncestors,
						current, nextNext, next,
						ms(seqTime - cursor),
						transitionLocal,
						ms(overlap)
					)
				}

				cursor = ms(cursor + currentDur - overlap)
				i += 1
				continue
			}

			if (seqTime < cursor + currentDur) {
				return this.#sampleItem(timeline, items, current, ms(seqTime - cursor), nextAncestors)
			}

			cursor = ms(cursor + currentDur)
		}

		return []
	}

	async #transition(
		timeline: TimelineFile,
		items: Map<number, Item.Any>,
		ancestors: ContainerItem[],
		fromItem: Item.Any,
		toItem: Item.Any,
		transition: Item.Transition,
		fromTime: Ms,
		toTime: Ms,
		overlap: Ms
	): Promise<Layer[]> {
		const [fromLayers, toLayers] = await Promise.all([
			this.#sampleItem(timeline, items, fromItem, fromTime, ancestors),
			this.#sampleItem(timeline, items, toItem, toTime, ancestors)
		])

		const fromFrame = fromLayers.find(l => l.kind === "image")
		const toFrame = toLayers.find(l => l.kind === "image")

		if (!fromFrame?.frame || !toFrame?.frame) return []

		return [{
			id: transition.id,
			kind: "transition",
			name: "circle",
			progress: overlap > 0 ? (toTime / overlap) : 1,
			from: fromFrame.frame,
			to: toFrame.frame,
		}]
	}

	async #video(item: Item.Video, time: Ms, matrix: Mat6): Promise<Layer[]> {
		const sink = await this.#sink.getSink(item.mediaHash)
		if (!sink) return []

		const sample = await sink.getSample(time / 1000)
		if (!sample) return []

		const frame = sample.toVideoFrame()
		sample.close()

		return frame ? [{ kind: "image", frame, matrix, id: item.id }] : []
	}

	#text(items: Map<number, Item.Any>, item: Item.Text, matrix: Mat6): Layer[] {
		const styleItem = item.styleId !== undefined
			? items.get(item.styleId) as Item.TextStyle
			: undefined

		return [{
			id: item.id,
			kind: "text",
			content: item.content,
			style: styleItem?.style,
			matrix
		}]
	}
}

