import {Comrade} from "@e280/comrade"

import {
	Input, BufferSource, ALL_FORMATS, VideoSampleSink, Output, Mp4OutputFormat, BufferTarget,
	VideoSampleSource, VideoSample, AudioSampleSink, AudioSampleSource, AudioSample
} from "mediabunny"
import {autoDetectRenderer, Container, Renderer, Sprite, Text, Texture, DOMAdapter, WebWorkerAdapter} from "pixi.js"

import {Composition, DriverSchematic, Layer, Transform} from "./schematic.js"

DOMAdapter.set(WebWorkerAdapter)

export const setupDriverWork = Comrade.work<DriverSchematic>(({host}, rig) => ({

	async hello() {
		await host.world()
	},

	async decode({buffer, video, audio}) {
		const input = new Input({
			source: new BufferSource(buffer),
			formats: ALL_FORMATS
		})

		const [videoTrack, audioTrack] = await Promise.all([
			input.getPrimaryVideoTrack(),
			input.getPrimaryAudioTrack()
		])

		const videoDecodable = await videoTrack?.canDecode()
		const audioDecodable = await audioTrack?.canDecode()

		const videoWriter = video.getWriter()
		const audioWriter = audio.getWriter()

		await Promise.all([
			(async () => {
				if (videoDecodable && videoTrack) {
					const sink = new VideoSampleSink(videoTrack)
					for await (const sample of sink.samples()) {
						const frame = sample.toVideoFrame()
						await videoWriter.write(frame)
						sample.close()
						frame.close()
					}
					await videoWriter.close()
				}
			})(),
			(async () => {
				if (audioDecodable && audioTrack) {
					const sink = new AudioSampleSink(audioTrack)
					for await (const sample of sink.samples()) {
						const frame = sample.toAudioData()
						await audioWriter.write(frame)
						sample.close()
						frame.close()
					}
					await audioWriter.close()
				}
			})()
		])
	},

	async encode({readables, config}) {
		const output = new Output({
			format: new Mp4OutputFormat(),
			target: new BufferTarget()
		})
		const videoSource = new VideoSampleSource(config.video)
		output.addVideoTrack(videoSource)
		// since AudioSample is not transferable it fails to transfer encoder bitrate config
		// so it needs to be hardcoded not set through constants eg QUALITY_LOW
		const audioSource = new AudioSampleSource(config.audio)
		output.addAudioTrack(audioSource)

		await output.start()

		const videoReader = readables.video.getReader()
		const audioReader = readables.audio.getReader()

		await Promise.all([
			(async () => {
				while (true) {
					const {done, value} = await videoReader.read()
					if (done) break
					const sample = new VideoSample(value)
					await videoSource.add(sample)
					sample.close()
				}
			})(),
			(async () => {
				while (true) {
					const {done, value} = await audioReader.read()
					if (done) break
					const sample = new AudioSample(value)
					await audioSource.add(sample)
					sample.close()
					value.close()
				}
			})()
		])

		await output.finalize()

		const {buffer} = output.target
		if (buffer) {
			rig.transfer = [buffer]
			return buffer
		}
	},

	async composite(composition) {
		const {stage, renderer} = await renderPIXI(1920, 1080)
		stage.removeChildren()

		const {baseFrame, disposables} = await renderLayer(composition, stage)
		renderer.render(stage)

		// make sure browser support webgl/webgpu otherwise it might take much longer to construct frame
		// if its very slow on eg edge try chrome
		const frame = new VideoFrame(renderer.canvas, {
			timestamp: baseFrame?.timestamp,
			duration: baseFrame?.duration ?? undefined,
		})

		baseFrame?.close()
		renderer.clear()

		for (const disposable of disposables) {
			disposable.destroy(true)
		}

		rig.transfer = [frame]
		return frame
	}
}))


let pixi: {
	renderer: Renderer
	stage: Container
} | null = null

async function renderPIXI(width: number, height: number) {
	if (pixi)
		return pixi

	const renderer = await autoDetectRenderer({
		width,
		height,
		preference: "webgl", // webgl and webgl2 causes memory leaks on chrome
		background: "black",
		preferWebGLVersion: 2
	})

	const stage = new Container()
	pixi = {renderer, stage}

	return pixi
}

type RenderableObject = Sprite | Text | Texture

async function renderLayer(
	layer: Layer | Composition,
	parent: Container,
	disposables: RenderableObject[] = []
) {
	if (Array.isArray(layer)) {
		let baseFrame: VideoFrame | undefined
		for (const child of layer) {
			const result = await renderLayer(child, parent, disposables)
			baseFrame ??= result.baseFrame
		}
		return {baseFrame, disposables}
	}

	if (!isRenderableLayer(layer)) {
		console.warn('Invalid layer', layer)
		return {disposables}
	}

	switch (layer.kind) {
		case 'text':
			return renderTextLayer(layer, parent, disposables)
		case 'image':
			return renderImageLayer(layer, parent, disposables)
		default:
			console.warn('Unknown layer kind', (layer as any).kind)
			return {disposables}
	}
}

function isRenderableLayer(layer: any): layer is Layer {
	return !!layer && typeof layer === 'object' && typeof layer.kind === 'string'
}

function renderTextLayer(
	layer: Extract<Layer, {kind: 'text'}>,
	parent: Container,
	disposables: RenderableObject[]
) {
	const text = new Text({
		text: layer.content,
		style: {
			fontFamily: 'sans-serif',
			fontSize: layer.fontSize ?? 48,
			fill: layer.color ?? 'white'
		}
	})
	applyTransform(text, layer)
	parent.addChild(text)
	disposables.push(text)
	return {disposables}
}

function renderImageLayer(
	layer: Extract<Layer, {kind: 'image'}>,
	parent: Container,
	disposables: RenderableObject[]
) {
	const texture = Texture.from(layer.frame)
	const sprite = new Sprite(texture)
	applyTransform(sprite, layer)
	parent.addChild(sprite)
	disposables.push(sprite, texture)
	return {baseFrame: layer.frame, disposables}
}

function applyTransform(target: Sprite | Text, t: Transform = {}) {
	if(t.x) target.x = t.x
	if(t.y) target.y = t.y
	if(t.scale) target.scale.set(t.scale)
	if(t.opacity) target.alpha = t.opacity
	if(t.anchor && 'anchor' in target) target.anchor.set(t.anchor)
}
