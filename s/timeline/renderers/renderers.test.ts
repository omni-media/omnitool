
import {Science, test, expect} from "@e280/science"

import {O} from "../sugar/o.js"
import {ms} from "../../units/ms.js"
import {Omni} from "../sugar/omni.js"
import {fps} from "../../units/fps.js"
import {Datafile} from "../utils/datafile.js"
import {Driver} from "../../driver/driver.js"
import {AudioMix} from "./export/parts/audio-mix.js"
import {resolveTransformAnimation} from "../utils/anim.js"
import {produceAudio} from "./export/parts/produce-audio.js"
import {resampleToPlanar} from "./export/parts/resamplers.js"
import {loadVideo} from "../../demo/routines/load-video.js"
import {produceVideo} from "./export/parts/produce-video.js"
import {CursorVisualSampler} from "./export/parts/cursor.js"
import {applyGainToPlanar} from "./export/parts/audio-gain.js"
import {convertAudioChannels} from "./export/parts/audio-channels.js"
import {createVisualSampler} from "./parts/samplers/visual/sampler.js"
import {findEarliestStream} from "./parts/samplers/audio/parts/find.js"

const workerUrl = new URL("../../demo/driver.worker.bundle.min.js", import.meta.url)
export async function setupTest() {
	const driver = await Driver.setup({workerUrl})
	const omni = new Omni(driver)

	const testVideo = await loadVideo("/assets/temp/test.mp4")
	const {videoA} = await omni.load({videoA: Datafile.make(testVideo, {filename: "test.mp4"})})

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

	"empty transform animation tracks resolve to identity transform defaults": test(async () => {
		const transform = resolveTransformAnimation(ms(100), {
			terp: "linear",
			track: {
				position: {x: [], y: []},
				scale: {x: [], y: []},
				rotation: [],
			},
		})

		expect(transform[0][0]).is(0)
		expect(transform[0][1]).is(0)
		expect(transform[1][0]).is(1)
		expect(transform[1][1]).is(1)
		expect(transform[2]).is(0)
	}),

	"cursor visual sampler cannot get previous samples": test(async () => {
		const {omni, videoA, resolveMedia, driver} = await setupTest()
		const {timeline} = new O({timeline: omni.timeline(o => o.sequence(
			o.video(videoA, {duration: 2000}),
			o.gap(500),
			o.video(videoA, {duration: 2000}),
			o.audio(videoA, {duration: 500}),
		))})
		const cursor = new CursorVisualSampler(driver, resolveMedia, timeline)
		await cursor.next(ms(1000))
		await expect(async () => await cursor.next(ms(100))).throwsAsync()
	}),

	"visual sampler gives correct layer at x time": test(async () => {
		const {omni, videoA, resolveMedia} = await setupTest()
		const {timeline} = new O({timeline: omni.timeline(o => o.sequence(
			o.video(videoA, {duration: 2000}),
			o.gap(500),
			o.video(videoA, {duration: 2000}),
			o.audio(videoA, {duration: 500}),
			o.text("123", {duration: 1000})
		))})
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

	"disabled visual item keeps sequence time but does not render": test(async () => {
		const {omni, videoA, resolveMedia} = await setupTest()
		const {timeline} = new O({timeline: omni.timeline(o => o.sequence(
			o.video(videoA, {duration: 2000, enabled: false}),
			o.video(videoA, {duration: 2000}),
		))})
		const sampler = createVisualSampler(resolveMedia)

		const disabledLayers = await sampler.sample(timeline, ms(1000))
		expect(disabledLayers.length).is(0)

		const nextLayers = await sampler.sample(timeline, ms(2500))
		expect(nextLayers[0].kind).is("image")
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
		expect(mixed[1].frames).is(2)
		expect(mixed[1].planar[0]).is(0.5)
		expect(mixed[1].planar[1]).is(0.5)
		expect(mixed[1].planar.length).is(2)
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
		expect(mixed[0].frames).is(2)
		expect(mixed[0].planar.length).is(2)
	}),

	"audio mix packs the final partial stereo chunk": test(async () => {
		async function *samples() {
			yield {planes: [new Float32Array([1, 2, 3, 4, 5, 6]), new Float32Array([7, 8, 9, 10, 11, 12])], sampleRate: 4, timestamp: 0}
		}
		const mixed = await collect(new AudioMix({chunkFrames: 4, clamp: false}).mix(samples()))
		expect(mixed.length).is(2)
		expect(mixed[1].startFrame).is(4)
		expect(mixed[1].frames).is(2)
		expect(mixed[1].planar.length).is(4)
		expect(Array.from(mixed[1].planar).join(",")).is("5,6,11,12")
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

		expect(result.frames).is(5)
		expect(result.timestamp).is(-0.5)
		expect(near(result.data[0][0], 5)).ok()
		expect(near(result.data[0][1], 10)).ok()
		expect(near(result.data[0][2], 15)).ok()
		expect(near(result.data[0][3], 20)).ok()
		expect(near(result.data[0][4], 10)).ok()
	}),

	"resampleToPlanar preserves a constant signal when downsampling": test(async () => {
		const sample = {
			numberOfFrames: 256,
			numberOfChannels: 1,
			sampleRate: 96000,
			copyTo: (dest: Float32Array) => dest.fill(1)
		}
		const result = resampleToPlanar(sample, 48000)
		const offset = Math.round(-result.timestamp * 48000)
		expect(near(result.data[0][offset + 32], 1)).ok()
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
		expect(near(result.data[0][2], 1.5)).ok()
		expect(near(result.data[1][2], 3.5)).ok()
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

	"resampleToPlanar retains a short input during downsampling": test(async () => {
		const sample = {
			numberOfFrames: 1,
			numberOfChannels: 1,
			sampleRate: 48000,
			copyTo: (dest: Float32Array) => dest.set([0.8])
		}

		const result = resampleToPlanar(sample, 8000)

		expect(result.frames > 0).ok()
		expect(result.data[0].some(value => value > 0)).ok()
	}),

	"audio channel conversion handles mono stereo and surround": test(async () => {
		const mono = [new Float32Array([0.5])]
		const stereo = convertAudioChannels(mono, 2)
		expect(stereo[0][0]).is(0.5)
		expect(stereo[1][0]).is(0.5)
		const surround = convertAudioChannels(mono, 6)
		expect(surround[2][0]).is(0.5)
		expect(surround[0][0]).is(0)
		expect(convertAudioChannels([new Float32Array([1]), new Float32Array([-1])], 1)[0][0]).is(0)
		const downmix = convertAudioChannels([0.1, 0.2, 0.3, 0.4, 0.5, 0.6].map(v => new Float32Array([v])), 2)
		expect(near(downmix[0][0], 0.1 + Math.SQRT1_2 * 0.8)).ok()
		expect(near(downmix[1][0], 0.2 + Math.SQRT1_2 * 0.9)).ok()
	}),

	"mono and stereo tracks can be mixed into the same stereo output": test(async () => {
		async function* inputs() {
			yield {planes: convertAudioChannels([new Float32Array([0.2])], 2), sampleRate: 48000, timestamp: 0}
			yield {planes: convertAudioChannels([new Float32Array([0.1]), new Float32Array([0.3])], 2), sampleRate: 48000, timestamp: 0}
		}
		const [chunk] = await collect(new AudioMix({chunkFrames: 1, clamp: false}).mix(inputs()))
		expect(near(chunk.planar[0], 0.3)).ok()
		expect(near(chunk.planar[1], 0.5)).ok()
	}),

	"downsampling attenuates frequencies above the output Nyquist limit": test(async () => {
		const sample = {
			numberOfFrames: 4096, numberOfChannels: 1, sampleRate: 96000,
			copyTo: (dest: Float32Array) => {
				for (let i = 0; i < dest.length; i++) dest[i] = Math.sin(2 * Math.PI * 30000 * i / 96000)
			}
		}
		const result = resampleToPlanar(sample, 48000)
		const offset = Math.round(-result.timestamp * 48000)
		let power = 0
		for (let i = 100; i < 1900; i++) power += result.data[0][offset + i] ** 2
		expect(Math.sqrt(power / 1800) < 0.01).ok()
	}),

	"filtered downsampling is continuous across chunk boundaries": test(async () => {
		const source = Float32Array.from({length: 4096}, (_, i) => Math.sin(2 * Math.PI * 1000 * i / 96000))
		async function render(chunkSize: number) {
			async function* inputs() {
				for (let start = 0; start < source.length; start += chunkSize) {
					const plane = source.subarray(start, start + chunkSize)
					const sample = {numberOfFrames: plane.length, numberOfChannels: 1, sampleRate: 96000,
						copyTo: (dest: Float32Array) => dest.set(plane)}
					const result = resampleToPlanar(sample, 44100, start / 96000)
					yield {planes: result.data, sampleRate: 44100, timestamp: result.timestamp}
				}
			}
			return collect(new AudioMix({clamp: false}).mix(inputs()))
		}
		const whole = await render(source.length)
		const split = await render(257)
		expect(split.length).is(whole.length)
		for (let chunk = 0; chunk < whole.length; chunk++)
			for (let i = 0; i < whole[chunk].frames; i++)
				expect(near(split[chunk].planar[i], whole[chunk].planar[i])).ok()
	}),

	"resampling consecutive chunks and overlapping tracks mixes correctly": test(async () => {
		const makeSample = (values: number[]) => ({
			numberOfFrames: values.length, numberOfChannels: 1, sampleRate: 4,
			copyTo: (dest: Float32Array) => dest.set(values)
		})
		const first = resampleToPlanar(makeSample([0, 1]), 6, 0)
		const second = resampleToPlanar(makeSample([2, 3]), 6, 0.5)
		async function* inputs() {
			for (const result of [first, first, second, second])
				yield {planes: result.data, sampleRate: 6, timestamp: result.timestamp}
		}
		const chunks = await collect(new AudioMix({chunkFrames: 1, clamp: false}).mix(inputs()))
		for (let i = 0; i < 5; i++)
			expect(near(chunks[i].planar[0], 2 * i * 4 / 6)).ok()
	}),

	"resampling orders tracks by earliest contribution": test(async () => {
		const streams = [
			{timelineTime: () => 1, currentSample: {sampleRate: 48000}},
			{timelineTime: () => 1.00005, currentSample: {sampleRate: 8000}}
		] as any
		expect(findEarliestStream(streams).index).is(0)
		expect(findEarliestStream(streams, 48000).index).is(1)
		streams[0].currentSample.sampleRate = 44100
		streams[1].currentSample.sampleRate = 96000
		expect(findEarliestStream(streams, 44100).index).is(1)
	}),

	"44.1 kHz chunks match continuous interpolation at 48 kHz": test(async () => {
		async function* inputs() {
			for (let chunk = 0; chunk < 8; chunk++) {
				const start = chunk * 1024
				const sample = {
					numberOfFrames: 1024, numberOfChannels: 1, sampleRate: 44100,
					copyTo: (dest: Float32Array) => {
						for (let i = 0; i < dest.length; i++) dest[i] = Math.sin((start + i) * 0.03)
					}
				}
				const result = resampleToPlanar(sample, 48000, start / 44100)
				yield {planes: result.data, sampleRate: 48000, timestamp: result.timestamp}
			}
		}
		const chunks = await collect(new AudioMix({clamp: false}).mix(inputs()))
		for (const chunk of chunks) for (let i = 0; i < chunk.frames; i++) {
			const frame = chunk.startFrame + i
			const position = frame * 44100 / 48000
			if (position >= 8191) break
			const lower = Math.floor(position)
			const fraction = position - lower
			const expected = Math.sin(lower * 0.03) * (1 - fraction) + Math.sin((lower + 1) * 0.03) * fraction
			expect(near(chunk.planar[i], expected)).ok()
		}
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
		const {timeline} = new O({timeline: omni.timeline(o => o.sequence(
			o.video(videoA, {duration: 2000}),
			o.gap(500),
			o.video(videoA, {duration: 2000}),
			o.audio(videoA, {duration: 500})
		))})
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
		const {timeline} = new O({timeline: omni.timeline(o => o.sequence(
			o.video(videoA, {duration: 2000}),
			o.gap(500),
			o.video(videoA, {duration: 2000}),
			o.audio(videoA, {duration: 500})
		))})

		const readable = produceAudio({timeline, resolveMedia, sampleRate: 48000, numberOfChannels: 2})
		let totalFrames = 0

		for await (const chunk of readable) {
			totalFrames += chunk.numberOfFrames
			chunk.close()
		}

		expect(totalFrames).is(240000)
	})
})
