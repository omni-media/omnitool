//@ts-ignore
import {WebDemuxer} from "web-demuxer/dist/web-demuxer.js"
import {AsSchematic, Comrade} from "@e280/comrade"
import {Muxer, ArrayBufferTarget} from 'mp4-muxer'

import {DriverWorkerFns} from "./types.js"
import {encoderDefaultConfig} from "../constants.js"

export type MySchematic = AsSchematic<{
	work: DriverWorkerFns
	host: {
		onDemuxedChunk({chunk, id}: {chunk: EncodedVideoChunk, id: string}): Promise<void>
		onEncodedChunk({chunk, id}: {chunk: EncodedVideoChunk, id: string}): Promise<void>
		onFrame({frame, id}: {frame: VideoFrame, id: string}): Promise<void>
	}
}>

const decoders = new Map<string, VideoDecoder>()
const encoders = new Map<string, VideoEncoder>()
const demuxers = new Map<string, WebDemuxer>()
const muxers = new Map<string, Muxer<ArrayBufferTarget>>()

/** driver functions that live on the web worker */
export const setupWork = Comrade.work<MySchematic>((host, rig) => {
	return {
		muxer: {
			async init({ id, width, height }) {
				const muxer = new Muxer({
					target: new ArrayBufferTarget(),
					video: {
						width,
						height,
						codec: "avc"
					},
					fastStart: 'in-memory'
				})
				muxers.set(id, muxer)
			},

			async addChunk({ id, chunk }) {
				const muxer = muxers.get(id)
				if (!muxer) throw new Error(`No muxer found for id ${id}`)
				muxer.addVideoChunk(chunk)
			},

			async finalize({ id }) {
				const muxer = muxers.get(id)
				if (!muxer) throw new Error(`No muxer found for id ${id}`)
				muxer.finalize()
				const output = new Uint8Array(muxer.target.buffer)
				rig.transfer = [output.buffer]
				muxers.delete(id)
				return output
			}
		},

		demuxer: {
			async init({ id, bytes }) {
				const webdemuxer = new WebDemuxer({
					wasmLoaderPath: import.meta.resolve("web-demuxer/dist/wasm-files/ffmpeg.js")
				})
				const file = new File([bytes], "video.mp4")
				await webdemuxer.load(file)
				demuxers.set(id, webdemuxer)
			},

			async start({ id, start, end }) {
				const webdemuxer = demuxers.get(id)
				if (!webdemuxer)
					throw new Error(`No demuxer for id: ${id}`)

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
					// rig.transfer = [chunk]
					console.log(host, rig, chunk)
					// host.onDemuxedChunk({chunk, id})
				}
			},

			async dispose({ id }) {
				demuxers.delete(id)
			}
		},

		decoder: {
			async init({ id, config }) {
				const decoder = new VideoDecoder({
					async output(frame) {
						frame.close()
					},
					error(e) {
						console.error("Decoder error:", e)
					}
				})
				decoder.configure(config)
				await decoder.flush()
				decoders.set(id, decoder)
			},

			async decode({ id, chunk }) {
				const decoder = decoders.get(id)
				if (!decoder) throw new Error(`No decoder for id ${id}`)
				decoder.decode(chunk)
			},

			async close({ id }) {
				const decoder = decoders.get(id)
				if (decoder) {
					decoder.close()
					decoders.delete(id)
				}
			}
		},

		encoder: {
			async init({ id, config }) {
				const encoder = new VideoEncoder({
					async output(chunk) {
					},
					error(e) {
						console.error("Encoder error:", e)
					}
				})
				encoder.configure({ ...encoderDefaultConfig, ...config })
				encoders.set(id, encoder)
			},

			async encode({ id, frame }) {
				const encoder = encoders.get(id)
				if (!encoder) throw new Error(`No encoder for id ${id}`)
				encoder.encode(frame)
			},

			async flush({ id }) {
				const encoder = encoders.get(id)
				if (!encoder) throw new Error(`No encoder for id ${id}`)
				await encoder.flush()
			},

			async close({ id }) {
				const encoder = encoders.get(id)
				if (encoder) {
					encoder.close()
					encoders.delete(id)
				}
			}
		},

		async composite({ frame, text }) {
			// return frame
		}
	}
})
