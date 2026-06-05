
import {sampleVisual} from "./sample.js"
import {SampleContext} from "./types.js"
import {sampleTransition} from "./transition.js"
import {ms, Ms} from "../../../../../../units/ms.js"
import {Item, Kind} from "../../../../../parts/item.js"
import {Layer} from "../../../../../../driver/fns/schematic.js"
import {AncestorAt, computeItemDuration} from "../../../handy.js"

export async function sampleSequence(
	ctx: SampleContext,
	seq: Item.Sequence,
	time: Ms,
	ancestors: AncestorAt[]
): Promise<Layer[]> {
	const state = sampleSequenceAt(ctx, seq, time)
	if (!state) return []

	const nextAnc = [...ancestors, {item: seq, localTime: time}]

	if (!state.isTransitioning)
		return sampleVisual(ctx, state.item, state.localTime, nextAnc)

	return sampleTransition(
		state.transition,
		state.progress,
		sampleTransitionHandle(ctx, state.outgoing, state.outgoingTime, nextAnc),
		sampleTransitionHandle(ctx, state.incoming, state.incomingTime, nextAnc)
	)
}

function sampleSequenceAt(ctx: SampleContext, seq: Item.Sequence, time: Ms) {
	const children = seq.childrenIds
		.map(id => ctx.items.get(id))
		.filter((i): i is Item.Any => !!i)

	let cursor = ms(0)

	for (let index = 0; index < children.length; index++) {
		const child = children[index]
		const duration = computeItemDuration(child.id, ctx.timeline)
		const end = ms(cursor + duration)

		if (duration <= 0) {
			cursor = end
			continue
		}

		if (time < cursor || time >= end) {
			cursor = end
			continue
		}

		const localTime = ms(time - cursor)

		if (child.kind !== Kind.Transition)
			return {isTransitioning: false, item: child, localTime} as const

		const outgoing = children[index - 1]
		const incoming = children[index + 1]
		const isValidTransition =
			outgoing && incoming &&
			outgoing.kind !== Kind.Transition &&
			incoming.kind !== Kind.Transition

		if (!isValidTransition) return null

		const outgoingDuration = computeItemDuration(outgoing.id, ctx.timeline)
		return {
			isTransitioning: true,
			incoming,
			outgoing,
			outgoingTime: ms(outgoingDuration + localTime),
			incomingTime: ms(localTime - duration),
			progress: localTime / duration,
			transition: child
		} as const
	}

	return null
}

async function sampleTransitionHandle(
	ctx: SampleContext,
	item: Item.Any,
	time: Ms,
	ancestors: AncestorAt[]
) {
	const handleLayers = await sampleVisual(ctx, item, time, ancestors, {allowHandles: true})
	if (handleLayers.some(layer => layer.kind === "image"))
		return handleLayers

	const duration = computeItemDuration(item.id, ctx.timeline)
	const clampedTime = ms(Math.max(0, Math.min(time, duration > 0 ? duration - 1 : 0)))
	return sampleVisual(ctx, item, clampedTime, ancestors)
}

