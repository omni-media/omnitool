import {Comrade} from "@e280/comrade"
import {WebDemuxer} from "web-demuxer"
import {ArrayBufferTarget, Muxer} from "mp4-muxer"
import {autoDetectRenderer, Container, Renderer, Sprite, Text, Texture, DOMAdapter, WebWorkerAdapter} from "pixi.js"

import {encoderDefaultConfig} from "../parts/constants.js"
import {Composition, DriverSchematic, Layer, Transform} from "./schematic.js"

DOMAdapter.set(WebWorkerAdapter)

export const setupDriverWork = Comrade.work<DriverSchematic>(({host}, rig) => ({

	async hello() {
		await host.world()
	},

	async demux({id, buffer, start, end, stream}) {
		const demuxer = new WebDemuxer({wasmLoaderPath: "https://cdn.jsdelivr.net/npm/web-demuxer@latest/dist/wasm-files/ffmpeg.min.js"})
		const file = new File([new Uint8Array(buffer)], "video.mp4")
		await demuxer.load(file)

		const videoDecoderConfig = await demuxer.getVideoDecoderConfig()
		const audioDecoderConfig = await demuxer.getAudioDecoderConfig()

		await host.demuxer.deliverConfig({id, config: {audio: audioDecoderConfig, video: videoDecoderConfig}})

		if (stream !== 'audio') {
			const reader = demuxer.readAVPacket(start?.video, end?.video).getReader()
			while (true) {
				const { done, value } = await reader.read()
				if (done) {
					await host.demuxer.deliverChunk({id, chunk: undefined, done: true})
					break
				}
				await host.demuxer.deliverChunk({id, chunk: demuxer.genEncodedVideoChunk(value), done: false})
			}
		}

		if (stream !== 'video') {
			const reader = demuxer.readAVPacket(start?.audio, end?.audio, 1).getReader()
			while (true) {
				const { done, value } = await reader.read()
				if (done) {
					await host.demuxer.deliverAudioChunk({id, chunk: undefined, done: true})
					break
				}
				await host.demuxer.deliverAudioChunk({id, chunk: demuxer.genEncodedAudioChunk(value), done: false})
			}
		}

		// rig.transfer = [video, audio]
		demuxer.destroy()
	},

	async decodeVideo({config, chunks, id}) {
		const decoder = new VideoDecoder({
			async output(frame) {
				rig.transfer = [frame]
				await host.decoder.deliverFrame({id, frame})
				frame.close()
			},
			error(e) {
				console.error("Decoder error:", e)
			}
		})

		decoder.configure({...config})

		for (const chunk of chunks) {
			decoder.decode(chunk)
		}

		await decoder.flush()
		decoder.close()
	},

	async decodeAudio({config, chunks, id}) {
		const decoder = new AudioDecoder({
			async output(data) {
				// rig.transfer = [data]
				await host.decoder.deliverAudioData({id, data})
				data.close()
			},
			error(e) {
				console.error("Decoder error:", e)
			}
		})

		decoder.configure(config)

		for (const chunk of chunks) {
			decoder.decode(chunk)
		}

		await decoder.flush()
		decoder.close()
	},

	async encodeVideo({id, config, frames, batchNumber}) {
		const encoder = new VideoEncoder({
			async output(chunk, meta) {
				// rig.transfer = [chunk]
				await host.encoder.deliverChunk({id, chunk, meta, batchNumber})
			},
			error(e) {
				console.error("Encoder error:", e)
			}
		})

		encoder.configure({...encoderDefaultConfig, ...config})

		for (const frame of frames) {
			encoder.encode(frame)
			frame.close()
		}

		await encoder.flush()
		encoder.close()
	},

	async encodeAudio({id, config, data}) {
		const encoder = new AudioEncoder({
			async output(chunk, meta) {
				// rig.transfer = [chunk]
				await host.encoder.deliverAudioChunk({id, chunk, meta})
			},
			error(e) {
				console.error("Encoder error:", e)
			}
		})

		encoder.configure({...config})

		for (const audio of data) {
			encoder.encode(audio)
			audio.close()
		}

		await encoder.flush()
		encoder.close()
	},

	async mux({chunks, config}) {
		const muxer = new Muxer({
			target: new ArrayBufferTarget(),
			video: {
				...config.video,
				codec: "avc"
			},
			audio: config.audio ?? undefined,
			firstTimestampBehavior: "offset",
			fastStart: "in-memory"
		})

		for (const {chunk, meta} of chunks.videoChunks)
			muxer.addVideoChunk(chunk, meta)

		if(chunks.audioChunks)
			for(const {chunk, meta} of chunks.audioChunks) {
				muxer.addAudioChunk(chunk, meta)
			}

		muxer.finalize()

		const output = new Uint8Array(muxer.target.buffer)
		// rig.transfer = [output.buffer]
		return output
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
