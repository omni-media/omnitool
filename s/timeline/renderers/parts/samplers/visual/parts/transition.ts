
import {Item} from "../../../../../parts/item.js"
import {Layer} from "../../../../../../driver/fns/schematic.js"

export async function sampleTransition(
	item: Item.Transition,
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
		id: item.id,
		kind: "transition",
		name: "circle",
		progress,
		from: f1,
		to: f2
	}, ...rest] : rest
}
