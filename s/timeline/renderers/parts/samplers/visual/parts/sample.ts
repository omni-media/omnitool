
import {SampleContext} from "./types.js"
import {sampleSequence} from "./sequence.js"
import {Ms} from "../../../../../../units/ms.js"
import {computeWorldMatrix} from "../../../handy.js"
import {Layer} from "../../../../../../driver/fns/schematic.js"
import {ContainerItem, Item, Kind} from "../../../../../parts/item.js"

export async function sampleVisual(
	ctx: SampleContext,
	item: Item.Any,
	time: Ms,
	ancestors: ContainerItem[]
): Promise<Layer[]> {
	const matrix = computeWorldMatrix(ctx.items, ancestors, item)

	switch (item.kind) {
		case Kind.Stack: {
			const nextAnc = [...ancestors, item]

			const layers = await Promise.all(
				item.childrenIds
					.map(id => ctx.items.get(id))
					.filter((child): child is Item.Any => !!child)
					.map(child => sampleVisual(ctx, child, time, nextAnc))
			)

			return layers.flat()
		}

		case Kind.Sequence:
			return sampleSequence(ctx, item, time, ancestors)

		case Kind.Video: {
			if (time < 0 || time >= item.duration) return []

			const frame = await ctx.videoSampler(item, time)
			return frame ? [{kind: "image", frame, matrix, id: item.id}] : []
		}

		case Kind.Text: {
			if (time < 0 || time >= item.duration) return []

			const style = item.styleId
				? (ctx.items.get(item.styleId) as Item.TextStyle)?.style
				: undefined

			return [{id: item.id, kind: "text", content: item.content, style, matrix}]
		}

		default:
			return []
	}
}

