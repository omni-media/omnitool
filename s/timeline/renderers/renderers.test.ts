
import {Science, test, expect} from "@e280/science"

import {O} from "../sugar/o.js"
import {ms} from "../../units/ms.js"
import {Omni} from "../sugar/omni.js"
import {fps} from "../../units/fps.js"
import {Datafile} from "../utils/datafile.js"
import {Driver} from "../../driver/driver.js"
import {loadVideo} from "../../demo/routines/load-video.js"
import {produceVideo} from "./export/parts/produce-video.js"
import {CursorVisualSampler} from "./export/parts/cursor.js"
import {createVisualSampler} from "./parts/samplers/visual/sampler.js"

const workerUrl = new URL("../driver/driver.worker.bundle.min.js", import.meta.url)
export async function setupTest() {
	const driver = await Driver.setup({workerUrl})
	const omni = new Omni(driver)

	const testVideo = await loadVideo("/assets/temp/test.mp4")
	const {videoA} = await omni.load({videoA: Datafile.make(testVideo, "test.mp4")})

	const resolveMedia = (hash: string) => omni.resources.require(hash).blob

	return {driver, omni, testVideo, videoA, resolveMedia}
}

export default Science.suite({

	"cursor visual sampler cannot get previous samples": test(async () => {
		const {omni, videoA, resolveMedia, driver} = await setupTest()
		const {timeline} = new O(omni.timeline(o => o.sequence(
			o.video(videoA, {duration: 2000}),
			o.gap(500),
			o.video(videoA, {duration: 2000}),
			o.audio(videoA, {duration: 500}),
		)))
		const sampler = new CursorVisualSampler(driver, resolveMedia)
		const cursor = sampler.cursor(timeline)
		await cursor.next(ms(1000))
		await expect(async () => await cursor.next(ms(100))).throwsAsync()
	}),

	"visual sampler gives correct layer at x time": test(async () => {
		const {omni, videoA, resolveMedia} = await setupTest()
		const {timeline} = new O(omni.timeline(o => o.sequence(
			o.video(videoA, {duration: 2000}),
			o.gap(500),
			o.video(videoA, {duration: 2000}),
			o.audio(videoA, {duration: 500}),
			o.text("123", {duration: 1000})
		)))
		const sampler = createVisualSampler(resolveMedia)
		const imgLayer = await sampler.sample(timeline, ms(1000))
		expect(imgLayer[0].kind).is("image")
		const gapLayer = await sampler.sample(timeline, ms(2300))
		expect(gapLayer[0].kind).is("gap")
		const imgLayer1 = await sampler.sample(timeline, ms(2700))
		expect(imgLayer1[0].kind).is("image")
		const textLayer = await sampler.sample(timeline, ms(5500))
		expect(textLayer[0].kind).is("text")
	}),

	"5s long export at 30fps renders exacly 150 frames": test(async () => {
		const {omni, videoA, driver, resolveMedia} = await setupTest()
		const {timeline} = new O(omni.timeline(o => o.sequence(
			o.video(videoA, {duration: 2000}),
			o.gap(500),
			o.video(videoA, {duration: 2000}),
			o.audio(videoA, {duration: 500})
		)))
		const readable = produceVideo({timeline, fps: fps(30), driver, resolveMedia})
		let frames = 0
		for await (const frame of readable) {
			frame.close()
			frames++
		}
		expect(frames).is(150)
	})

})

