
import {SampleContext} from "./types.js"
import {sampleSequence} from "./sequence.js"
import {Ms} from "../../../../../../units/ms.js"
import {Item, Kind} from "../../../../../parts/item.js"
import {segmentTranscript} from "../../../../../parts/captions.js"
import {FilterSpec, Layer} from "../../../../../../driver/fns/schematic.js"
import {AncestorAt, computeOpacity, computeWorldMatrix} from "../../../handy.js"

export async function sampleVisual(
	ctx: SampleContext,
	item: Item.Any,
	time: Ms,
	ancestors: AncestorAt[],
	options: {
		/** Allow sampling trimmed media handles. */
		allowHandles?: boolean
	} = {}
): Promise<Layer[]> {
	if ("enabled" in item && item.enabled === false)
		return item.kind === Kind.Gap ? [{id: item.id, kind: "gap"}] : []

	const matrix = computeWorldMatrix(ctx.items, ancestors, item, time)
	const alpha = computeOpacity(ctx, item, time)
	const crop = "spatialId" in item && item.spatialId
		? (ctx.items.get(item.spatialId) as Item.Spatial | undefined)?.crop
		: undefined
	const filters = "filterIds" in item && item.filterIds
		? item.filterIds
			.map(id => ctx.items.get(id) as Item.Filter | undefined)
			.filter((filter): filter is Item.Filter => !!filter && filter.enabled !== false)
			.map(filter => ({type: filter.type, params: filter.params}) as FilterSpec)
		: undefined

	switch (item.kind) {
		case Kind.Stack: {
			const nextAnc = [...ancestors, {item, localTime: time}]

			const layers = await Promise.all(
				item.childrenIds
					.map(id => ctx.items.get(id))
					.filter((child): child is Item.Any => !!child)
					.map(child => sampleVisual(ctx, child, time, nextAnc, options))
			)

			return layers.flat()
		}

		case Kind.Sequence:
			return sampleSequence(ctx, item, time, ancestors)

		case Kind.Video: {
			if (!options.allowHandles && (time < 0 || time >= item.duration)) return []

			const frame = await ctx.videoSampler(item, time)
			return frame ? [{kind: "image", frame, matrix, alpha, crop, filters, id: item.id}] : []
		}

		case Kind.Image: {
			if (!options.allowHandles && (time < 0 || time >= item.duration)) return []

			const frame = await ctx.imageSampler(item, time)
			return frame ? [{kind: "image", frame, matrix, alpha, crop, filters, id: item.id}] : []
		}

		case Kind.Text: {
			if (!options.allowHandles && (time < 0 || time >= item.duration)) return []

			const textStyle = item.styleId
				? ctx.items.get(item.styleId) as Item.TextStyle | undefined
				: undefined
			const style = textStyle?.enabled !== false ? textStyle?.style : undefined

			return [{id: item.id, kind: "text", content: item.content, style, matrix, alpha, crop, filters}]
		}

		case Kind.Caption: {
			if (!options.allowHandles && (time < 0 || time >= item.duration)) return []

			const transcriptTime = item.start + time
			const segment = segmentTranscript(item.transcript, item).find(segment => {
				const [start, end] = segment.timestamp
				return transcriptTime >= start && transcriptTime < end
			})
			if (!segment)
				return []

			const textStyle = item.styleId
				? ctx.items.get(item.styleId) as Item.TextStyle | undefined
				: undefined
			const style = textStyle?.enabled !== false ? textStyle?.style : undefined

			return [{id: item.id, kind: "text", content: segment.text, style, matrix, alpha, crop, filters}]
		}

		case Kind.Gap: {
			return [{id: item.id, kind: "gap"}]
		}

		default:
			return []
	}
}

