
import {Item} from "../../../../../parts/item.js"
import {ImageLayer, Layer} from "../../../../../../driver/fns/schematic.js"

export async function sampleTransition(
	item: Item.Transition,
	progress: number,
	p1: Promise<Layer[]>,
	p2: Promise<Layer[]>
): Promise<Layer[]> {
	const [l1, l2] = await Promise.all([p1, p2])
	const from = l1.find((layer): layer is ImageLayer => layer.kind === "image")
	const to = l2.find((layer): layer is ImageLayer => layer.kind === "image")

	const rest = [
		...l1.filter(l => l.kind !== "image"),
		...l2.filter(l => l.kind !== "image")
	]

	return from && to ? [{
		id: item.id,
		kind: "transition",
		name: item.name,
		progress,
		from,
		to,
	}, ...rest] : rest
}
