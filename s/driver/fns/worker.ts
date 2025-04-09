import {WebDemuxer} from "web-demuxer"
import {worker, AsSchematic} from "@e280/comrade"
import {Muxer, ArrayBufferTarget} from 'mp4-muxer'

import {encoderDefaultConfig} from "../constants.js"
import {DriverWorkerFns, CompositeOpts, Decoder, Encoder, MuxOpts, Muxer as XMuxer, EncoderOpts} from "./types.js"

export type MySchematic = AsSchematic<{
	workerFns: DriverWorkerFns
	mainFns: {
		whatever(a: number, b: number): Promise<number>
	}
}>

/** driver functions that live on the web worker */
const main = await worker<MySchematic>((main, rig) => ({
	muxer: async function (opts: MuxOpts): Promise<XMuxer> {
		const muxer = new Muxer({
			target: new ArrayBufferTarget(),
			video: {
				width: opts.width,
				height: opts.height,
				codec: "avc"
			},
			fastStart: 'in-memory'
		})

		return {
			addChunk(chunk: EncodedVideoChunk) {
				muxer.addVideoChunk(chunk)
			},

			async finalize() {
				muxer.finalize()
				const output = new Uint8Array(muxer.target.buffer)
				rig.transfer = [output.buffer]
			}
		}
	},

	async demux({bytes, start, end, id}) {
		const webdemuxer = new WebDemuxer({
			wasmLoaderPath: import.meta.resolve("web-demuxer/dist/wasm-files/ffmpeg.min.js")
		})
		const file = new File([bytes], "123")
		await webdemuxer.load(file)
		const config = await webdemuxer.getVideoDecoderConfig()

		// await daddy.decoderConfigResult[advanced]({ transfer: [config] })(config)

		const oneSecondOffset = 1000
		const reader = webdemuxer
			.readAVPacket(
				start ? (start - oneSecondOffset) / 1000 : undefined,
				end ? (end + oneSecondOffset) / 1000 : undefined
			)
			.getReader()

		while (true) {
			const { done, value } = await reader.read()
			if (done) break

			const chunk = webdemuxer.genEncodedVideoChunk(value)
			rig.transfer = [chunk]
		}

		return {id}
	},

	decoder: async function (opts): Promise<Decoder> {
		const decoder = new VideoDecoder({
			async output(frame) {
				rig.transfer = [frame]
				frame.close()
			},
			error: (e) => console.error("Decoder error:", e)
		})

		decoder.configure(opts.config)
		await decoder.flush()

		return {
			decode(chunk) {
				decoder.decode(chunk)
			},
			close() {
				decoder.close()
			}
		}
	},

	encoder: async function (config: EncoderOpts): Promise<Encoder> {
		const encoder = new VideoEncoder({
			async output(chunk) {
				rig.transfer = [chunk]
			},
			error(e) {
				console.error("Encoder error:", e)
			}
		})

		encoder.configure({...encoderDefaultConfig, ...config})

		return {
			encode(frame) {
				encoder.encode(frame)
			},

			async flush() {
				await encoder.flush()
			},

			close() {
				encoder.close()
			}
		}
	},

	async composite({frame, text}: CompositeOpts): Promise<VideoFrame> {
		// use Pixi.js or canvas for this
		return frame
	}

}))
