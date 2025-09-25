
import {O} from "./o.js"
import {Media} from "../parts/media.js"
import {TimelineItem} from "./builders.js"
import {Datafile} from "../utils/datafile.js"
import {TimelineFile} from "../parts/basics.js"
import {Export} from "../parts/compositor/export.js"
import {ResourcePool} from "../parts/resource-pool.js"
import {RenderConfig} from "../../driver/fns/schematic.js"

export class Omni {
	resources = new ResourcePool()
	export = new Export()

	load = async<S extends Record<string, Promise<Datafile>>>(spec: S) => {
		return Object.fromEntries(await Promise.all(Object.entries(spec).map(
			async([key, value]) => [key, await this.resources.store(await value)]
		))) as {[K in keyof S]: Media}
	}

	timeline = (fn: (o: O) => TimelineItem): TimelineFile => {
		const o = new O()
		const sequence = fn(o)
		return {
			format: "timeline",
			info: "https://omniclip.app/",
			version: 0,
			rootId: o.register(sequence.item),
			items: o.items,
		}
	}

	render = async (timeline: TimelineFile, config: RenderConfig) => {
		await this.export.render(timeline)
	}
}

