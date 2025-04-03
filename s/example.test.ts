
import "@benev/slate/x/node.js"
import {Omni} from "./sugar/omni.js"
import {dummyData} from "./utils/dummy-data.js"

//
// create an omni context
//

const omni = new Omni()

//
// load in some media resources
//

const {mediaA, mediaB} = await omni.load({
	mediaA: dummyData(),
	mediaB: dummyData(),
})

//
// create a timeline
//

const timeline = omni.timeline(o => o.sequence(
	o.clip(mediaA),
	o.transition.crossfade(600),
	o.stack(
		o.clip(mediaB),
		o.text("hello world"),
	),
))

//
// log the timeline
//

console.log(JSON.stringify(timeline, undefined, "  "))

