
import {Omni} from "./omni.js"
import {Driver} from "../../driver/driver.js"
import {dummyData} from "../utils/dummy-data.js"

const driver = await Driver.setup()
//
// create an omni context
//

const omni = new Omni(driver)

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
	o.video(mediaA),
	o.transition.crossfade(600),
	o.stack(
		o.video(mediaB),
		o.text("hello world"),
	),
))

//
// log the timeline
//

console.log(JSON.stringify(timeline, undefined, "  "))

