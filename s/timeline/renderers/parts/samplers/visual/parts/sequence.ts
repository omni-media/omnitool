
import {sampleVisual} from "./sample.js"
import {SampleContext} from "./types.js"
import {sampleTransition} from "./transition.js"
import {ms, Ms} from "../../../../../../units/ms.js"
import {computeItemDuration} from "../../../handy.js"
import {Layer} from "../../../../../../driver/fns/schematic.js"
import {ContainerItem, Item, Kind} from "../../../../../parts/item.js"

export async function sampleSequence(
	ctx: SampleContext,
	seq: Item.Sequence,
	time: Ms,
	ancestors: ContainerItem[]
): Promise<Layer[]> {
	const state = sampleSequenceAt(ctx, seq, time)

	if (!state) return []

	const nextAnc = [...ancestors, seq]

	if (!state.isTransitioning) {
		return sampleVisual(ctx, state.item, state.localTime, nextAnc)
	}

	return sampleTransition(
		state.transition,
		state.progress,
		sampleVisual(ctx, state.outgoing, state.outgoingTime, nextAnc),
		sampleVisual(ctx, state.incoming, state.incomingTime, nextAnc)
	)
}

function sampleSequenceAt(
	ctx: SampleContext,
	seq: Item.Sequence,
	time: Ms
) {
	const children = seq.childrenIds
		.map(id => ctx.items.get(id))
		.filter((i): i is Item.Any => !!i)

	let cursor = ms(0)

	for (let i = 0; i < children.length; i++) {
		const currentItem = children[i]
		if (currentItem.kind === Kind.Transition)
			continue

		const currentItemStart = cursor
		const currentItemDuration = computeItemDuration(currentItem.id, ctx.timeline)
		const currentItemEnd = ms(currentItemStart + currentItemDuration)

		const next = children[i + 1]
		const hasTransition = next?.kind === Kind.Transition

		if (!hasTransition) {
			if (time < currentItemEnd) {
				return {
					isTransitioning: false,
					item: currentItem,
					localTime: ms(time - currentItemStart)
				} as const
			}

			cursor = currentItemEnd
			continue
		}

		const transition = next as Item.Transition
		const incoming = children[i + 2]

		if (!incoming || incoming.kind === Kind.Transition) {
			cursor = currentItemEnd
			continue
		}

		const incomingItemDuration = computeItemDuration(incoming.id, ctx.timeline)
		const overlap = Math.max(0, Math.min(transition.duration, currentItemDuration, incomingItemDuration))
		const currentItemSoloEnd = ms(currentItemEnd - overlap)

		if (time < currentItemSoloEnd) {
			return {
				isTransitioning: false,
				item: currentItem,
				localTime: ms(time - currentItemStart)
			} as const
		}

		if (time < currentItemEnd) {
			const inLocal = ms(time - currentItemSoloEnd)
			const outLocal = ms(time - currentItemStart)

			return {
				isTransitioning: true,
				incoming,
				outgoing: currentItem,
				outgoingTime: outLocal,
				incomingTime: inLocal,
				progress: overlap > 0 ? inLocal / overlap : 1,
				transition
			} as const
		}

		cursor = currentItemSoloEnd
		i++
	}

	return null
}

