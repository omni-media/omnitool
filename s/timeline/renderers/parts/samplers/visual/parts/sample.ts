
import {SampleContext} from "./types.js"
import {sampleSequence} from "./sequence.js"
import {Ms} from "../../../../../../units/ms.js"
import {Item, Kind, SpatialItem} from "../../../../../parts/item.js"
import {FilterSpec, Layer} from "../../../../../../driver/fns/schematic.js"
import {AncestorAt, computeOpacity, computeWorldMatrix} from "../../../handy.js"

export async function sampleVisual(
	ctx: SampleContext,
	item: Item.Any,
	time: Ms,
	ancestors: AncestorAt[]
): Promise<Layer[]> {
	const matrix = computeWorldMatrix(ctx.items, ancestors, item, time)
	const alpha = computeOpacity(ctx, item, time)
	const crop = "spatialId" in item && item.spatialId
		? (ctx.items.get(item.spatialId) as SpatialItem | undefined)?.crop
		: undefined
	const filters = "filterIds" in item && item.filterIds
		? item.filterIds
			.map(id => ctx.items.get(id) as Item.Filter | undefined)
			.filter((filter): filter is Item.Filter => !!filter?.enabled)
			.map(filter => ({type: filter.type, params: filter.params}) as FilterSpec)
		: undefined

	switch (item.kind) {
		case Kind.Stack: {
			const nextAnc = [...ancestors, {item, localTime: time}]

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
			return frame ? [{kind: "image", frame, matrix, alpha, crop, filters, id: item.id}] : []
		}

		case Kind.Text: {
			if (time < 0 || time >= item.duration) return []

			const style = item.styleId
				? (ctx.items.get(item.styleId) as Item.TextStyle)?.style
				: undefined

			return [{id: item.id, kind: "text", content: item.content, style, matrix, alpha, crop, filters}]
		}

		case Kind.Gap: {
			return [{id: item.id, kind: "gap"}]
		}

		default:
			return []
	}
}

