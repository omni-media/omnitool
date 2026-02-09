
import {itemsAt} from "./handy.js"
import {Item, Kind} from "../../item.js"
import {TimelineFile} from "../../basics.js"
import {Mat6} from "../../../utils/matrix.js"
import {ms, Ms} from "../../../../units/ms.js"
import {Layer} from "../../../../driver/fns/schematic.js"

export class Sampler {
	constructor(
		public video: (
			item: Item.Video,
			time: Ms,
			parentMatrix: Mat6
		) => Promise<Layer[]>,
	) { }

	async sample(timeline: TimelineFile, timecode: Ms) {
		const items = itemsAt({ timeline, timecode })
		const promises = items.map(({ item, matrix, localTime }) => {
			switch (item.kind) {
				case Kind.Video:
					return this.video(item, localTime, matrix)

				case Kind.Text:
					return this.text(timeline.items, item, localTime, matrix)

				default:
					return Promise.resolve([])
			}
		})

		const layers = await Promise.all(promises)
		return layers.flat()
	}

	text(items: Item.Any[], item: Item.Text, time: Ms, matrix: Mat6): Layer[] {
		const styleItem = item.styleId !== undefined
			? items.find(({ id }) => id === item.styleId) as Item.TextStyle
			: undefined

		const duration = ms(item.duration)
		if (time < 0 || time >= duration)
			return []

		else return [{
			id: item.id,
			kind: "text",
			content: item.content,
			style: styleItem?.style,
			matrix
		}]
	}

}

