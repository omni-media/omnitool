import {Comrade} from "@e280/comrade"
import {autoDetectRenderer, Container, Renderer, Sprite, Text, Texture, DOMAdapter, WebWorkerAdapter} from "pixi.js"
import {Input, ALL_FORMATS, VideoSampleSink, Output, Mp4OutputFormat, VideoSampleSource, VideoSample, AudioSampleSink, AudioSampleSource, AudioSample, StreamTarget, BlobSource, UrlSource} from "mediabunny"

import {makeTransition} from "../../features/transition/transition.js"
import {Composition, DecoderSource, DriverSchematic, Layer, Transform} from "./schematic.js"

DOMAdapter.set(WebWorkerAdapter)

const loadSource = async (source: DecoderSource) => {
	if(source instanceof Blob) {
		return new BlobSource(source)
	} else {
		return new UrlSource(source)
	}
}

export const setupDriverWork = (
	Comrade.work<DriverSchematic>(shell => ({
		async hello() {
			await shell.host.world()
		},

		async decodeAudio({source, audio, start, end}) {
			const input = new Input({
				source: await loadSource(source),
				formats: ALL_FORMATS
			})

			const audioTrack = await input.getPrimaryAudioTrack()
			const audioDecodable = await audioTrack?.canDecode()
			const audioWriter = audio.getWriter()

			if (audioDecodable && audioTrack) {
				const sink = new AudioSampleSink(audioTrack)
				for await (const sample of sink.samples(start, end)) {
					const frame = sample.toAudioData()
					await audioWriter.write(frame)
					sample.close()
					frame.close()
				}
				await audioWriter.close()
			}
		},

		async decodeVideo({source, video, start, end}) {
			const input = new Input({
				source: await loadSource(source),
				formats: ALL_FORMATS
			})

			const videoTrack = await input.getPrimaryVideoTrack()
			const videoDecodable = await videoTrack?.canDecode()
			const videoWriter = video.getWriter()

			if (videoDecodable && videoTrack) {
				const sink = new VideoSampleSink(videoTrack)
				for await (const sample of sink.samples(start, end)) {
					const frame = sample.toVideoFrame()
					await videoWriter.write(frame)
					sample.close()
					frame.close()
				}
				await videoWriter.close()
			}
		},

		async encode({video, audio, config, bridge}) {
			const output = new Output({
				format: new Mp4OutputFormat(),
				target: new StreamTarget(bridge, {chunked: true})
			})
			// since AudioSample is not transferable it fails to transfer encoder bitrate config
			// so it needs to be hardcoded not set through constants eg QUALITY_LOW

			const promises = []

			if(video) {
				const videoSource = new VideoSampleSource(config.video)
				output.addVideoTrack(videoSource)
				const videoReader = video.getReader()
				promises.push((async () => {
					while (true) {
						const {done, value} = await videoReader.read()
						if (done) break
						const sample = new VideoSample(value)
						await videoSource.add(sample)
						sample.close()
					}
				})())
			}

			if(audio) {
				const audioSource = new AudioSampleSource(config.audio)
				output.addAudioTrack(audioSource)
				const audioReader = audio.getReader()
				promises.push((async () => {
					while (true) {
						const {done, value} = await audioReader.read()
						if (done) break
						const sample = new AudioSample(value)
						await audioSource.add(sample)
						sample.close()
						value.close()
					}
				})())
			}

			await output.start()
			await Promise.all(promises)
			await output.finalize()
		},

		async composite(composition) {
			const {stage, renderer} = await renderPIXI(1920, 1080)
			stage.removeChildren()

			const {dispose} = await renderLayer(composition, stage)
			renderer.render(stage)

			// make sure browser support webgl/webgpu otherwise it might take much longer to construct frame
			// if its very slow on eg edge try chrome
			const frame = new VideoFrame(renderer.canvas, {
				timestamp: 0,
				duration: 0,
			})

			renderer.clear()
			dispose()

			shell.transfer = [frame]
			return frame
		}
	}))
)

// TODO suspicious global, probably bad
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

const transitions: Map<string, ReturnType<typeof makeTransition>> = new Map()

type RenderableObject = Sprite | Text | Texture

async function renderLayer(
	layer: Layer | Composition,
	parent: Container,
) {
	if (Array.isArray(layer)) {
		const disposers: (() => void)[] = []
		for (const child of layer) {
			const result = await renderLayer(child, parent)
			disposers.push(result.dispose)
		}
		return {dispose: () => disposers.forEach(d => d())}
	}

	switch (layer.kind) {
		case 'text':
			return renderTextLayer(layer, parent)
		case 'image':
			return renderImageLayer(layer, parent)
		case 'transition':
			return renderTransitionLayer(layer, parent)
		case 'gap': {
			pixi?.renderer.clear()
			return {dispose: () => {}}
		}
		default:
			console.warn('Unknown layer kind', (layer as any).kind)
			return {dispose: () => {}}
	}
}

function renderTextLayer(
	layer: Extract<Layer, {kind: 'text'}>,
	parent: Container,
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
	return {dispose: () => text.destroy(true)}
}

function renderImageLayer(
	layer: Extract<Layer, {kind: 'image'}>,
	parent: Container,
) {
	const texture = Texture.from(layer.frame)
	const sprite = new Sprite(texture)
	applyTransform(sprite, layer)
	parent.addChild(sprite)
	return {dispose: () => {
		sprite.destroy(true)
		texture.destroy(true)
		layer.frame.close()
	}}
}

function renderTransitionLayer(
	{from, to, progress, name}: Extract<Layer, {kind: 'transition'}>,
	parent: Container,
) {
	const transition = transitions.get(name) ??
		(transitions.set(name, makeTransition({
			name: "circle",
			renderer: pixi!.renderer
		})),
	  transitions.get(name)!
	)
	const texture = transition.render({from, to, progress, width: from.displayWidth, height: from.displayHeight})
	const sprite = new Sprite(texture)
	parent.addChild(sprite)
	return {dispose: () => sprite.destroy(false)}
}

function applyTransform(target: Sprite | Text, t: Transform = {}) {
	if(t.x) target.x = t.x
	if(t.y) target.y = t.y
	if(t.scale) target.scale.set(t.scale)
	if(t.opacity) target.alpha = t.opacity
	if(t.anchor && 'anchor' in target) target.anchor.set(t.anchor)
}
