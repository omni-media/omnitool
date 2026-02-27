
import {Science, test, expect} from "@e280/science"

import {O} from "../sugar/o.js"
import {ms} from "../../units/ms.js"
import {Omni} from "../sugar/omni.js"
import {fps} from "../../units/fps.js"
import {Datafile} from "../utils/datafile.js"
import {Driver} from "../../driver/driver.js"
import {AudioMix} from "./export/parts/audio-mix.js"
import {produceAudio} from "./export/parts/produce-audio.js"
import {resampleToPlanar} from "./export/parts/resamplers.js"
import {loadVideo} from "../../demo/routines/load-video.js"
import {produceVideo} from "./export/parts/produce-video.js"
import {CursorVisualSampler} from "./export/parts/cursor.js"
import {applyGainToPlanar} from "./export/parts/audio-gain.js"
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

async function collect<T>(iterable: AsyncIterable<T>) {
	const out: T[] = []
	for await (const item of iterable)
		out.push(item)
	return out
}

const near = (actual: number, expected: number, eps = 1e-6) =>
	Math.abs(actual - expected) < eps

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

	"audio mix sums overlapping chunks": test(async () => {
		const mixer = new AudioMix({chunkFrames: 4, clamp: false})
		async function *samples() {
			yield {
				planes: [new Float32Array([0.25, 0.25, 0.25, 0.25])],
				sampleRate: 4,
				timestamp: 0
			}
			yield {
				planes: [new Float32Array([0.5, 0.5, 0.5, 0.5])],
				sampleRate: 4,
				timestamp: 0.5
			}
		}

		const mixed = await collect(mixer.mix(samples()))
		expect(mixed.length).is(2)
		expect(mixed[0].startFrame).is(0)
		expect(mixed[0].frames).is(4)
		expect(mixed[0].channels).is(1)
		expect(mixed[0].planar[0]).is(0.25)
		expect(mixed[0].planar[1]).is(0.25)
		expect(mixed[0].planar[2]).is(0.75)
		expect(mixed[0].planar[3]).is(0.75)
		expect(mixed[1].startFrame).is(4)
		expect(mixed[1].planar[0]).is(0.5)
		expect(mixed[1].planar[1]).is(0.5)
		expect(mixed[1].planar[2]).is(0)
		expect(mixed[1].planar[3]).is(0)
	}),

	"audio mix clamps output to [-1, 1]": test(async () => {
		const mixer = new AudioMix({chunkFrames: 4, clamp: true})
		async function *samples() {
			yield {
				planes: [new Float32Array([0.9, 0.9, 0.9, 0.9])],
				sampleRate: 4,
				timestamp: 0
			}
			yield {
				planes: [new Float32Array([0.8, 0.8, 0.8, 0.8])],
				sampleRate: 4,
				timestamp: 0
			}
		}

		const mixed = await collect(mixer.mix(samples()))
		expect(mixed.length).is(1)
		expect(mixed[0].planar[0]).is(1)
		expect(mixed[0].planar[1]).is(1)
		expect(mixed[0].planar[2]).is(1)
		expect(mixed[0].planar[3]).is(1)
	}),

	"audio mix fills gaps with silence": test(async () => {
		const mixer = new AudioMix({chunkFrames: 4, clamp: false})
		async function *samples() {
			yield {
				planes: [new Float32Array([1, 1, 1, 1])],
				sampleRate: 4,
				timestamp: 0
			}
			yield {
				planes: [new Float32Array([2, 2, 2, 2])],
				sampleRate: 4,
				timestamp: 2
			}
		}

		const mixed = await collect(mixer.mix(samples()))
		expect(mixed.length).is(3)
		expect(mixed[0].startFrame).is(0)
		expect(mixed[0].planar[0]).is(1)

		expect(mixed[1].startFrame).is(4)
		expect(mixed[1].planar[0]).is(0)
		expect(mixed[1].planar[3]).is(0)

		expect(mixed[2].startFrame).is(8)
		expect(mixed[2].planar[0]).is(2)
	}),

	"audio mix truncates negative timestamps": test(async () => {
		const mixer = new AudioMix({chunkFrames: 4, clamp: false})
		async function *samples() {
			yield {
				planes: [new Float32Array([1, 2, 3, 4])],
				sampleRate: 4,
				timestamp: -0.5
			}
		}

		const mixed = await collect(mixer.mix(samples()))
		expect(mixed.length).is(1)
		expect(mixed[0].startFrame).is(0)
		expect(mixed[0].planar[0]).is(3)
		expect(mixed[0].planar[1]).is(4)
		expect(mixed[0].planar[2]).is(0)
		expect(mixed[0].planar[3]).is(0)
	}),

	"audio mix handles stereo planar layout": test(async () => {
		const mixer = new AudioMix({chunkFrames: 4, clamp: false})
		async function *samples() {
			yield {
				planes: [
					new Float32Array([1, 1, 1, 1]),
					new Float32Array([2, 2, 2, 2])
				],
				sampleRate: 4,
				timestamp: 0
			}
		}

		const mixed = await collect(mixer.mix(samples()))
		expect(mixed.length).is(1)
		expect(mixed[0].channels).is(2)
		expect(mixed[0].planar.length).is(8)
		expect(mixed[0].planar[0]).is(1)
		expect(mixed[0].planar[4]).is(2)
	}),

	"applyGainToPlanar scales values across multiple channels": test(async () => {
		const planes = [
			new Float32Array([0.2, -0.4]),
			new Float32Array([0.6, -0.8])
		]

		applyGainToPlanar(planes, 0.5)

		expect(near(planes[0][0], 0.1)).ok()
		expect(near(planes[0][1], -0.2)).ok()
		expect(near(planes[1][0], 0.3)).ok()
		expect(near(planes[1][1], -0.4)).ok()
	}),

	"applyGainToPlanar does not mutate when gain is 1": test(async () => {
		const planes = [new Float32Array([0.5, -0.5])]

		applyGainToPlanar(planes, 1)

		expect(near(planes[0][0], 0.5)).ok()
		expect(near(planes[0][1], -0.5)).ok()
	}),

	"applyGainToPlanar mutes entirely when gain is 0": test(async () => {
		const planes = [new Float32Array([0.9, -0.9])]

		applyGainToPlanar(planes, 0)

		expect(planes[0][0]).is(0)
		expect(planes[0][1]).is(0)
	}),

	"resampleToPlanar returns original data when sample rates match": test(async () => {
		const sample = {
			numberOfFrames: 3,
			numberOfChannels: 1,
			sampleRate: 48000,
			copyTo: (dest: Float32Array) => dest.set([0.1, 0.2, 0.3])
		}

		const result = resampleToPlanar(sample, 48000)

		expect(result.frames).is(3)
		expect(result.data.length).is(1)
		expect(near(result.data[0][0], 0.1)).ok()
		expect(near(result.data[0][1], 0.2)).ok()
		expect(near(result.data[0][2], 0.3)).ok()
	}),

	"resampleToPlanar upsamples using linear interpolation": test(async () => {
		const sample = {
			numberOfFrames: 2,
			numberOfChannels: 1,
			sampleRate: 1,
			copyTo: (dest: Float32Array) => dest.set([10, 20])
		}

		const result = resampleToPlanar(sample as any, 2)

		expect(result.frames).is(4)
		expect(near(result.data[0][0], 10)).ok()
		expect(near(result.data[0][1], 15)).ok()
		expect(near(result.data[0][2], 20)).ok()
		expect(near(result.data[0][3], 20)).ok()
	}),

	"resampleToPlanar downsamples correctly": test(async () => {
		const sample = {
			numberOfFrames: 4,
			numberOfChannels: 1,
			sampleRate: 4,
			copyTo: (dest: Float32Array) => dest.set([1, 2, 3, 4])
		}

		const result = resampleToPlanar(sample, 2)

		expect(result.frames).is(2)
		expect(near(result.data[0][0], 1)).ok()
		expect(near(result.data[0][1], 3)).ok()
	}),

	"resampleToPlanar processes multi-channel planar data": test(async () => {
		const planes = [
			new Float32Array([1, 2]),
			new Float32Array([3, 4])
		]

		const sample = {
			numberOfFrames: 2,
			numberOfChannels: 2,
			sampleRate: 1,
			copyTo: (dest: Float32Array, options: { planeIndex: number }) => {
				dest.set(planes[options.planeIndex])
			}
		}

		const result = resampleToPlanar(sample, 2)

		expect(result.data.length).is(2)
		expect(near(result.data[0][1], 1.5)).ok()
		expect(near(result.data[1][1], 3.5)).ok()
	}),

	"resampleToPlanar handles zero channels gracefully": test(async () => {
		const sample = {
			numberOfFrames: 10,
			numberOfChannels: 0,
			sampleRate: 48000,
			copyTo: () => { throw new Error("Should not be called") }
		}

		const result = resampleToPlanar(sample, 44100)

		expect(result.data.length).is(0)
		expect(result.frames).is(0)
	}),

	"resampleToPlanar enforces minimum of 1 frame on aggressive downsample": test(async () => {
		const sample = {
			numberOfFrames: 1,
			numberOfChannels: 1,
			sampleRate: 48000,
			copyTo: (dest: Float32Array) => dest.set([0.8])
		}

		const result = resampleToPlanar(sample, 8000)

		expect(result.frames).is(1)
		expect(result.data[0].length).is(1)
		expect(near(result.data[0][0], 0.8)).ok()
	}),

	"resampleToPlanar calls copyTo with strict contract shape": test(async () => {
		let passedOptions: any = null
		const sample = {
			numberOfFrames: 2,
			numberOfChannels: 1,
			sampleRate: 48000,
			copyTo: (dest: Float32Array, options: any) => {
				passedOptions = options
			}
		}

		resampleToPlanar(sample, 44100)

		expect(passedOptions).not.is(null)
		expect(passedOptions.planeIndex).is(0)
		expect(passedOptions.format).is("f32-planar")
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
	}),

	"5s long audio export at 48000Hz renders exactly 240000 frames": test(async () => {
		const {omni, videoA, resolveMedia} = await setupTest()
		const {timeline} = new O(omni.timeline(o => o.sequence(
			o.video(videoA, {duration: 2000}),
			o.gap(500),
			o.video(videoA, {duration: 2000}),
			o.audio(videoA, {duration: 500})
		)))

		const readable = produceAudio({timeline, resolveMedia})
		let totalFrames = 0

		for await (const chunk of readable) {
			totalFrames += chunk.numberOfFrames
			chunk.close()
		}

		expect(totalFrames).is(240000)
	})
})

