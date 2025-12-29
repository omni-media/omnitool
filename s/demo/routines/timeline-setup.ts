
import {Driver} from "../../driver/driver.js"
import {Datafile, Item, Omni} from "../../timeline/index.js"

export async function TimelineSchemaTest(driver: Driver) {
	const omni = new Omni(driver)
	const file = await fetch("/assets/temp/gl.mp4")
	const buffer = await file.arrayBuffer()
	const uint = new Uint8Array(buffer)

	const {videoA} = await omni.load({videoA: Datafile.make(uint)})
	const timeline =omni.timeline(o => {
	const text = o.text("content")
	const style = o.textStyle({fill: "green", fontSize: 100})

	o.set<Item.Text>(text.id, {styleId: style.id})
		return o.sequence(
		o.stack(
			text,
			o.video(videoA, {duration: 5000}),
			o.audio(videoA, {duration: 8000})
		),
		o.video(videoA, {duration: 7000})
	)})

	return {timeline, omni}
}
