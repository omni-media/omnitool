
import {O} from "./o.js"
import {Item} from "../parts/item.js"
import {Media} from "../parts/media.js"
import {Driver} from "../../driver/driver.js"
import {Datafile} from "../utils/datafile.js"
import {TimelineFile} from "../parts/basics.js"
import {Export} from "../parts/compositor/export.js"
import {ResourcePool} from "../parts/resource-pool.js"
import {RenderConfig} from "../../driver/fns/schematic.js"

export class Omni {
	resources = new ResourcePool()
	#export: Export

	constructor(private driver: Driver) {
		this.#export = new Export(driver)
	}

	load = async<S extends Record<string, Promise<Datafile>>>(spec: S) => {
		return Object.fromEntries(await Promise.all(Object.entries(spec).map(
			async([key, value]) => [key, await this.resources.store(await value)]
		))) as {[K in keyof S]: Media}
	}

	timeline = (fn: (o: O) => Item.Any): TimelineFile => {
		const o = new O({
			project: {
				format: "timeline",
				info: "https://omniclip.app/",
				version: 0,
				items: [],
				rootId: 0
			}
		})
		const root = fn(o)
		o.state.project.rootId = root.id
		return o.state.project
	}

	render = async (timeline: TimelineFile, config: RenderConfig) => {
		await this.#export.render(timeline)
	}
}

