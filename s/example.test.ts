
import {makeTimeline} from "./sugar/sketch.js"
import {ResourcePool} from "./parts/resource-pool.js"

const resources = new ResourcePool()
const media1 = await resources.storeMedia(new Uint8Array([1, 2, 3, 4]))
const media2 = await resources.storeMedia(new Uint8Array([1, 2, 3, 4]))

const timeline = makeTimeline(o => o.sequence(
	o.clip(media1, 0, 1),
	o.transition.crossfade(600),
	o.stack(
		o.clip(media2, 0, 1),
		o.text("hello world"),
	),
))

console.log(timeline)

