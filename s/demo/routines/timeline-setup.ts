
import {Driver} from "../../driver/driver.js"
import {Datafile, Item, Omni} from "../../timeline/index.js"

export async function TimelineSchemaTest(driver: Driver, file: File) {
	const omni = new Omni(driver)
	const {videoA} = await omni.load({videoA: Datafile.make(file)})
	const timeline = omni.timeline(o => {
	const text = o.text("content", {duration: 1000})
	const style = o.textStyle({fill: "green", fontSize: 100})
	const spatial = o.spatial(
		o.transform({
			position: [240, 160],
			scale: [1.4, 1.4],
			rotation: 0.08,
		}),
		[0.15, 0.1, 0.05, 0.2],
	)

	const video = o.video(videoA, {duration: 3000, start: 1000})
	o.set<Item.Text>(text.id, {styleId: style.id})
	o.set<Item.Video>(video.id, {spatialId: spatial.id})

	return o.sequence(
		o.stack(
			text,
			video,
			o.audio(videoA, {duration: 1000})
		),
		o.gap(500),
		o.video(videoA, {duration: 7000, start: 5000})
	)})

	return {timeline, omni}
}
