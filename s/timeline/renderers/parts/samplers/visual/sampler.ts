
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
		const matrix = computeWorldMatrix(items, ancestors, item)

		switch (item.kind) {
			case Kind.Stack: {
				const nextAnc = [...ancestors, item]

				const layers = await Promise.all(
					item.childrenIds
						.map(id => items.get(id))
						.filter((item): item is Item.Any => !!item)
						.map(child =>
							this.#sampleItem(timeline, items, child, time, nextAnc)
						)
				)

				return layers.flat()
			}

			case Kind.Sequence:
				return this.#sequence(timeline, items, item, time, ancestors)

			case Kind.Video: {
				if (time < 0 || time >= item.duration)
					return []

				const frame = await this.sampleVideo(item, time)
				return frame
					? [{kind: "image", frame, matrix, id: item.id}]
					: []
			}

			case Kind.Text: {
				if (time < 0 || time >= item.duration)
					return []

				const style = item.styleId
					? (items.get(item.styleId) as Item.TextStyle)?.style
					: undefined

				return [{id: item.id, kind: "text", content: item.content, style, matrix}]
			}

			default:
				return []
		}
	}

	protected async sampleVideo(item: Item.Video, time: Ms) {
		const sink = await this.#sink.getSink(item.mediaHash)
		const sample = await sink?.getSample(time / 1000)
		const frame = sample?.toVideoFrame()
		sample?.close()
		return frame ?? undefined
	}

	async #sequence(
		timeline: TimelineFile,
		items: Map<number, Item.Any>,
		seq: Item.Sequence,
		time: Ms,
		ancestors: ContainerItem[]
	): Promise<Layer[]> {

		const state = this.#resolveSequenceAtTime(
			timeline,
			items,
			seq,
			time
		)

		if (!state)
			return []

		const nextAnc = [...ancestors, seq]

		if (state.type === 'single') {
			return this.#sampleItem(
				timeline,
				items,
				state.item,
				state.localTime,
				nextAnc
			)
		}

		return this.#transition(
			state.transition,
			state.progress,
			this.#sampleItem(
				timeline,
				items,
				state.outgoing,
				state.outgoingTime,
				nextAnc
			),
			this.#sampleItem(
				timeline,
				items,
				state.incoming,
				state.incomingTime,
				nextAnc
			)
		)
	}

	#resolveSequenceAtTime(
		timeline: TimelineFile,
		items: Map<number, Item.Any>,
		seq: Item.Sequence,
		time: Ms
	) {

		const children = seq.childrenIds
			.map(id => items.get(id))
			.filter((i): i is Item.Any => !!i)

		let cursor = ms(0)

		for (let i = 0; i < children.length; i++) {

			const outgoing = children[i]
			if (outgoing.kind === Kind.Transition)
				continue

			const outDur = computeTimelineDuration(outgoing.id, timeline)

			const outStart = cursor
			const outEnd = ms(outStart + outDur)

			const next = children[i + 1]
			const hasTransition = next?.kind === Kind.Transition

			if (!hasTransition) {
				if (time < outEnd) {
					return {
						type: 'single',
						item: outgoing,
						localTime: ms(time - outStart)
					} as const
				}

				cursor = outEnd
				continue
			}

			const transition = next as Item.Transition
			const incoming = children[i + 2]

			if (!incoming || incoming.kind === Kind.Transition) {
				cursor = outEnd
				continue
			}

			const inDur = computeTimelineDuration(incoming.id, timeline)

			const overlap =
				Math.max(0, Math.min(transition.duration, outDur, inDur))

			const outSoloEnd = ms(outEnd - overlap)

			if (time < outSoloEnd) {
				return {
					type: 'single',
					item: outgoing,
					localTime: ms(time - outStart)
				} as const
			}

			if (time < outEnd) {
				const inLocal = ms(time - outSoloEnd)
				const outLocal = ms(time - outStart)

				return {
					type: 'transition',
					outgoing,
					incoming,
					outgoingTime: outLocal,
					incomingTime: inLocal,
					progress: overlap > 0 ? inLocal / overlap : 1,
					transition
				} as const
			}

			cursor = outSoloEnd
			i++
		}

		return null
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

		const rest = [
			...l1.filter(l => l.kind !== "image"),
			...l2.filter(l => l.kind !== "image")
		]

		return f1 && f2 ? [{
			id: trans.id,
			kind: "transition",
			name: "circle",
			progress,
			from: f1,
			to: f2
		}, ...rest] : rest
	}
}

