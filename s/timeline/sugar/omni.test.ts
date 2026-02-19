
import {expect, Science, test} from "@e280/science"

import {O} from "./o.js"
import {Omni} from "./omni.js"
import {Item} from "../parts/item.js"
import {Driver} from "../../driver/driver.js"
import {Datafile} from "../utils/datafile.js"
import {loadVideo} from "../../demo/routines/load-video.js"
import {computeTimelineDuration} from "../renderers/parts/handy.js"

export async function setupTest() {
	const driver = await Driver.setup({workerUrl: new URL("../driver/driver.worker.bundle.min.js", import.meta.url)})
	const omni = new Omni(driver)

	const testVideo = await loadVideo("/assets/temp/test.mp4")
	const {videoA} = await omni.load({videoA: Datafile.make(testVideo, "test.mp4")})

	return {driver, omni, testVideo, videoA}
}

export default Science.suite({
	"basic demo": test(async () => {
		const driver = await Driver.setup({workerUrl: new URL("../driver/driver.worker.bundle.min.js", import.meta.url)})
		const omni = new Omni(driver)

		const testVideo = await loadVideo("/assets/temp/test.mp4")
		const {videoA} = await omni.load({videoA: Datafile.make(testVideo, "test.mp4")})

		const o = new O(omni.timeline(o => o.sequence()))
		const rootItem = o.require<Item.Sequence>(o.timeline.rootId)!

		const video = o.video(videoA)
		o.addChildren(rootItem, video)

		const videoDuration = computeTimelineDuration(video.id, o.timeline)
		const timelineDuration = computeTimelineDuration(o.timeline.rootId, o.timeline)

		expect(videoDuration).is(timelineDuration)
	}),
	"sequence duration is 3x": test(async () => {
		const {omni, videoA} = await setupTest()

		const o = new O(omni.timeline(o => o.sequence(
			o.video(videoA),
			o.video(videoA),
			o.video(videoA),
		)))

		const timelineDuration = computeTimelineDuration(o.timeline.rootId, o.timeline)

		expect(timelineDuration).is(videoA.duration * 3)
	}),
	"stack duration is 1x": test(async () => {
		const {omni, videoA} = await setupTest()

		const o = new O(omni.timeline(o => o.stack(
			o.video(videoA),
			o.video(videoA),
			o.video(videoA),
		)))

		const timelineDuration = computeTimelineDuration(o.timeline.rootId, o.timeline)

		expect(timelineDuration).is(videoA.duration)
	}),
})

