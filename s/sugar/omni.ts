
import {O} from "./o.js"
import {Item} from "../parts/item.js"
import {Media} from "../parts/media.js"
import {Datafile} from "../utils/datafile.js"
import {TimelineFile} from "../parts/basics.js"
import {ResourcePool} from "../parts/resource-pool.js"

export class Omni {
	resources = new ResourcePool()

	load = async<S extends Record<string, Promise<Datafile>>>(spec: S) => {
		return Object.fromEntries(await Promise.all(Object.entries(spec).map(
			async([key, value]) => [key, await this.resources.store(await value)]
		))) as {[K in keyof S]: Media}
	}

	timeline = (fn: (o: O) => Item.Sequence): TimelineFile => {
		const o = new O()
		const sequence = fn(o)
		return {
			format: "timeline",
			info: "https://omniclip.app/",
			version: 0,
			root: o.register(sequence),
			items: o.items,
		}
	}
}

