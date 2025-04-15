import {Comrade} from "@e280/comrade"
import {ArrayBufferTarget, Muxer} from "mp4-muxer"
// @ts-ignore
import {WebDemuxer} from "web-demuxer/dist/web-demuxer.js"

import {DriverSchematic} from "./schematic.js"
import {encoderDefaultConfig} from "../../driver/constants.js"

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

		decoder.configure({...config, hardwareAcceleration: "prefer-hardware"})

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

	async mux({width, height, chunks}): Promise<Uint8Array> {
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
	}
}))
