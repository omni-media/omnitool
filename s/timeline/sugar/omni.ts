
import {O} from "./o.js"
import {Item} from "../parts/item.js"
import {fps} from "../../units/fps.js"
import {Media} from "../parts/media.js"
import {Driver} from "../../driver/driver.js"
import {Datafile} from "../utils/datafile.js"
import {TimelineFile} from "../parts/basics.js"
import {ResourcePool} from "../parts/resource-pool.js"
import {VideoPlayer} from "../renderers/player/player.js"
import {produce} from "../renderers/export/produce.js"

export class Omni {
	resources = new ResourcePool()

	constructor(private driver: Driver) {}

	load = async<S extends Record<string, Promise<Datafile>>>(spec: S) => {
		return Object.fromEntries(await Promise.all(Object.entries(spec).map(
			async ([key, value]) => [key, await this.resources.store(await value)]
		))) as {[K in keyof S]: Media}
	}

	timeline = (fn: (o: O) => Item.Any): TimelineFile => {
		const o = new O({
			format: "timeline",
			info: "https://omniclip.app/",
			version: 0,
			items: [],
			rootId: 0
		})
		const root = fn(o)
		o.timeline.rootId = root.id
		return o.timeline
	}

	playback = async (timeline: TimelineFile) => {
		return new VideoPlayer(
			this.driver,
			(hash) => this.resources.require(hash).url,
			timeline
		)
	}

	render = async (timeline: TimelineFile, framerate: number = 30) => {
		return produce({
			timeline,
			fps: fps(framerate),
			driver: this.driver,
			resolveMedia: (hash) => this.resources.require(hash).url
		})
	}
}

