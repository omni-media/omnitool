
import {Driver} from "../../driver/driver.js"
import {Datafile, Item, Omni} from "../../timeline/index.js"

export async function TimelineSchemaTest(driver: Driver, file: File) {
	const omni = new Omni(driver)
	const {videoA} = await omni.load({videoA: Datafile.make(file)})
	const timeline = omni.timeline(o => {
		const text = o.text("content", {duration: 3000})
		const fade = o.animate.opacity.make("easeIn", [
			[0, 0],
			[700, 1],
			[2200, 1],
			[3000, 0.35],
		])
		const style = o.textStyle({fill: "green", fontSize: 100})
		const videoSpatial = o.spatial(
			o.transform({
				position: [240, 160],
				scale: [1.4, 1.4],
				rotation: 0.08,
			}),
			[0.15, 0.1, 0.05, 0.2],
		)
		const textSpatial = o.animatedSpatial(
			o.anim.transform("linear", [
				[0, o.transform({position: [-320, 80], scale: [0.7, 0.7]})],
				[1000, o.transform({position: [120, 80], scale: [1, 1]})],
				[2000, o.transform({position: [200, 40], scale: [1.35, 1.35], rotation: 8})],
				[3000, o.transform({position: [320, 0], scale: [1.15, 1.15], rotation: 0})],
			]),
		)

		const video = o.video(videoA, {duration: 3000, start: 1000})
		o.set<Item.Text>(text.id, {styleId: style.id, spatialId: textSpatial.id, animationId: fade.id})
		o.set<Item.Video>(video.id, {spatialId: videoSpatial.id})

		return o.sequence(
			o.stack(
				text,
				video,
				o.audio(videoA, {duration: 1000})
			),
			o.gap(500),
			o.video(videoA, {duration: 7000, start: 5000})
		)
	})

	return {timeline, omni}
}
