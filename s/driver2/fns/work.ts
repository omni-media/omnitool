import {Comrade} from "@e280/comrade"
import {ArrayBufferTarget, Muxer} from "mp4-muxer"
// @ts-ignore
import {WebDemuxer} from "web-demuxer/dist/web-demuxer.js"
//@ts-ignore
import {autoDetectRenderer, Container, Sprite, Text, Texture, Renderer} from "pixi.js/dist/pixi.mjs"

import {encoderDefaultConfig} from "../../driver/constants.js"
import {Composition, DriverSchematic, Layer, Transform} from "./schematic.js"

/** these functions are executed on a web worker */
export const setupDriverWork = Comrade.work<DriverSchematic>((shell, rig) => ({
	async demux({id, buffer, start, end}) {
		const demuxer = new WebDemuxer({
			wasmLoaderPath: import.meta.resolve("web-demuxer/dist/wasm-files/ffmpeg.js"),
		})
		const file = new File([buffer], "video.mp4")
		await demuxer.load(file)

		const video: EncodedVideoChunk[] = []
		const audio: ArrayBuffer[] = []
		const subtitle: ArrayBuffer[] = []

		const reader = demuxer
			.readAVPacket(
				start ? start / 1000 : undefined,
				end ? end / 1000 : undefined
			)
			.getReader()

		while (true) {
			const { done, value } = await reader.read()
			if (done) break

			const chunk = demuxer.genEncodedVideoChunk(value)
			video.push(chunk)
		}

		const config = await demuxer.getVideoDecoderConfig()
		rig.transfer = video // or [...video, ...audio, ...subtitle] if needed
		return {id, video, audio, subtitle, config}
	},

	async decode({config, chunks, id}) {
		const decoder = new VideoDecoder({
			async output(frame) {
				rig.transfer = [frame]
				await shell.host.decoder.deliverFrame({id, frame})
				// frame.close()
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

	async encode({id, config, frames}) {
		const encoder = new VideoEncoder({
			async output(chunk, meta) {
				rig.transfer = [chunk]
				await shell.host.encoder.deliverChunk({id, chunk, meta})
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

	async mux({width, height, chunks}) {
		const muxer = new Muxer({
			target: new ArrayBufferTarget(),
			video: {
				width,
				height,
				codec: "avc"
			},
			firstTimestampBehavior: "offset",
			fastStart: "in-memory"
		})

		for (const chunk of chunks)
			muxer.addVideoChunk(chunk.chunk, chunk.meta)

		muxer.finalize()

		const output = new Uint8Array(muxer.target.buffer)
		rig.transfer = [output.buffer]
		return output
	},

	async composite(composition) {
		const {stage, renderer} = await renderPIXI(1920, 1080)
		stage.removeChildren()

		const {baseFrame, disposables} = await renderLayer(composition, stage)
		renderer.render(stage)

		// make sure browser support webgl/webgpu otherwise it might take much longer to construct frame
		const frame = new VideoFrame(renderer.canvas, {
			timestamp: baseFrame?.timestamp,
			duration: baseFrame?.duration ?? undefined,
		})

		baseFrame?.close()
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
		preference: "webgpu", // webgl and webgl2 causes memory leaks on chrome
		background: "black"
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
