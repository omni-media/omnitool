
import {expect, Science, test} from "@e280/science"

import {O} from "./o.js"
import {Omni} from "./omni.js"
import {Item} from "../parts/item.js"
import {Driver} from "../../driver/driver.js"
import {Datafile} from "../utils/datafile.js"
import {loadVideo} from "../../demo/routines/load-video.js"
import {computeItemDuration} from "../renderers/parts/handy.js"

const workerUrl = new URL("../driver/driver.worker.bundle.min.js", import.meta.url)
export async function setupTest() {
	const driver = await Driver.setup({workerUrl})
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

		const videoDuration = computeItemDuration(video.id, o.timeline)
		const timelineDuration = computeItemDuration(o.timeline.rootId, o.timeline)

		expect(videoDuration).is(timelineDuration)
	}),

	"sequence duration is 3x": test(async () => {
		const {omni, videoA} = await setupTest()
		const o = new O(omni.timeline(o => o.sequence(
			o.video(videoA),
			o.video(videoA),
			o.video(videoA),
		)))
		const timelineDuration = computeItemDuration(o.timeline.rootId, o.timeline)
		expect(timelineDuration).is(videoA.duration * 3)
	}),

	"stack duration is 1x": test(async () => {
		const {omni, videoA} = await setupTest()
		const o = new O(omni.timeline(o => o.stack(
			o.video(videoA),
			o.video(videoA),
			o.video(videoA),
		)))
		const timelineDuration = computeItemDuration(o.timeline.rootId, o.timeline)
		expect(timelineDuration).is(videoA.duration)
	}),

	"nested stack inside sequence": test(async () => {
		const {omni, videoA} = await setupTest()
		const o = new O(omni.timeline(o => o.sequence(
			o.video(videoA),
			o.stack(
				o.video(videoA),
				o.video(videoA)
			),
			o.video(videoA),
		)))
		const timelineDuration = computeItemDuration(o.timeline.rootId, o.timeline)
		expect(timelineDuration).is(videoA.duration * 3)
	}),

	"nested sequence inside stack": test(async () => {
		const {omni, videoA} = await setupTest()
		const o = new O(omni.timeline(o => o.stack(
			o.video(videoA),
			o.sequence(
				o.video(videoA),
				o.video(videoA)
			)
		)))
		const timelineDuration = computeItemDuration(o.timeline.rootId, o.timeline)
		expect(timelineDuration).is(videoA.duration * 2)
	}),

	"empty timeline duration is 0": test(async () => {
		const {omni} = await setupTest()
		const o1 = new O(omni.timeline(o => o.sequence()))
		const o2 = new O(omni.timeline(o => o.stack()))
		const duration1 = computeItemDuration(o1.timeline.rootId, o1.timeline)
		const duration2 = computeItemDuration(o2.timeline.rootId, o2.timeline)
		expect(duration1).is(0)
		expect(duration2).is(0)
	}),

	"transition in a sequence": test(async () => {
		const {omni, videoA} = await setupTest()
		const transitionDuration = 1000
		const o = new O(omni.timeline(o => o.sequence(
			o.video(videoA),
			o.transition.crossfade(transitionDuration),
			o.video(videoA)
		)))
		const timelineDuration = computeItemDuration(o.timeline.rootId, o.timeline)
		const expectedDuration = (videoA.duration * 2) - transitionDuration
		expect(timelineDuration).is(expectedDuration)
	}),

	"transition in a stack": test(async () => {
		const {omni, videoA} = await setupTest()
		const transitionDuration = 1000
		const o = new O(omni.timeline(o => o.stack(
			o.video(videoA),
			o.transition.crossfade(transitionDuration),
			o.video(videoA)
		)))
		const timelineDuration = computeItemDuration(o.timeline.rootId, o.timeline)
		expect(timelineDuration).is(videoA.duration)
	}),

	"ignore invalid transition": test(async () => {
		const {omni, videoA} = await setupTest()
		const o = new O(omni.timeline(o => o.sequence(
			o.transition.crossfade(1000),
			o.video(videoA),
			o.video(videoA),
			o.transition.crossfade(1000),
		)))
		const timelineDuration = computeItemDuration(o.timeline.rootId, o.timeline)
		expect(timelineDuration).is(videoA.duration * 2)
	}),

	"clamp transition duration on overflow": test(async () => {
		const {omni, videoA} = await setupTest()
		const duration = 3000
		const o = new O(omni.timeline(o => o.sequence(
			o.video(videoA, {duration}),
			o.transition.crossfade(duration * 2),
			o.video(videoA, {duration})
		)))
		const timelineDuration = computeItemDuration(o.timeline.rootId, o.timeline)
		expect(timelineDuration).is(duration)
	}),

	"multiple transitions": test(async () => {
		const {omni, videoA} = await setupTest()
		const transitionDuration = 1000
		const o = new O(omni.timeline(o => o.sequence(
			o.video(videoA),
			o.transition.crossfade(transitionDuration),
			o.video(videoA),
			o.transition.crossfade(transitionDuration),
			o.video(videoA)
		)))
		const timelineDuration = computeItemDuration(o.timeline.rootId, o.timeline)
		const expected = (videoA.duration * 3) - (transitionDuration * 2)
		expect(timelineDuration).is(expected)
	}),

	"gap item in a sequence": test(async () => {
		const {omni, videoA} = await setupTest()
		const gapDuration = 1000
		const o = new O(omni.timeline(o => o.sequence(
			o.video(videoA),
			o.gap(gapDuration),
			o.video(videoA)
		)))
		const timelineDuration = computeItemDuration(o.timeline.rootId, o.timeline)
		const expected = videoA.duration * 2 + gapDuration
		expect(timelineDuration).is(expected)
	}),

	"gap item in a stack": test(async () => {
		const {omni, videoA} = await setupTest()
		const o = new O(omni.timeline(o => o.stack(
			o.video(videoA),
			o.gap(1000),
			o.video(videoA)
		)))
		const timelineDuration = computeItemDuration(o.timeline.rootId, o.timeline)
		expect(timelineDuration).is(videoA.duration)
	}),

	"load media into Omni": test(async () => {
		const driver = await Driver.setup({workerUrl})
		const omni = new Omni(driver)
		const testVideo = await loadVideo("/assets/temp/test.mp4")
		const {videoA} = await omni.load({videoA: Datafile.make(testVideo, "test.mp4")})
		expect(omni.resources.require(videoA.datafile.checksum.hash)).happy()
	}),

	"playback seeks to correct time": test(async () => {
		const {omni, videoA} = await setupTest()
		const o = new O(omni.timeline(o => o.sequence(
			o.video(videoA, {duration: 2000}),
			o.gap(500),
			o.video(videoA, {duration: 2500})
		)))
		const playback = await omni.playback(o.timeline)
		await playback.seek(1000)
		expect(playback.currentTime).is(1000)
	})
})

