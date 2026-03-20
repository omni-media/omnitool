import {Comrade} from "@e280/comrade"
import {DOMAdapter, WebWorkerAdapter} from "pixi.js"
import {Input, ALL_FORMATS, VideoSampleSink, Output, Mp4OutputFormat, VideoSampleSource, VideoSample, AudioSampleSink, AudioSampleSource, AudioSample, StreamTarget, BlobSource, UrlSource} from "mediabunny"

import {DecoderSource, DriverSchematic} from "./schematic.js"

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

		async decodeAudio({source, audio, start, end, cancel}) {
			const input = new Input({
				source: await loadSource(source),
				formats: ALL_FORMATS
			})

			const audioTrack = await input.getPrimaryAudioTrack()
			const audioDecodable = await audioTrack?.canDecode()
			const audioWriter = audio.getWriter()

			if(!audioDecodable || !audioTrack)
				return

			const sink = new AudioSampleSink(audioTrack)
			const samples = sink.samples(start, end)

			cancel.onmessage = async () => {
				samples.return()
				input.dispose()
				cancel.close()
			}

			for await (const sample of samples) {
				const frame = sample.toAudioData()
				sample.close()
				await audioWriter.write(frame)
				frame.close()
			}

			await audioWriter.close()
		},

		async decodeVideo({source, video, start, end, cancel}) {
			const input = new Input({
				source: await loadSource(source),
				formats: ALL_FORMATS
			})

			const videoTrack = await input.getPrimaryVideoTrack()
			const videoDecodable = await videoTrack?.canDecode()
			const videoWriter = video.getWriter()

			if(!videoDecodable || !videoTrack)
				return

			const sink = new VideoSampleSink(videoTrack)
			const samples = sink.samples(start, end)

			cancel.onmessage = async () => {
				samples.return()
				input.dispose()
				cancel.close()
			}

			for await (const sample of samples) {
				const frame = sample.toVideoFrame()
				sample.close()
				await videoWriter.write(frame)
				frame.close()
			}

			await videoWriter.close()
		},

		async encode({video, audio, config, writable}) {
			const output = new Output({
				format: new Mp4OutputFormat(),
				target: new StreamTarget(writable, {chunked: true})
			})

			async function encodeVideo() {
				if(!video) return
				const videoSource = new VideoSampleSource(config.video)
				output.addVideoTrack(videoSource)
				for await (const frame of video) {
					const sample = new VideoSample(frame)
					await videoSource.add(sample)
					sample.close()
					frame.close()
				}
			}

			async function encodeAudio() {
				if(!audio) return
				const audioSource = new AudioSampleSource(config.audio)
				output.addAudioTrack(audioSource)
				for await (const data of audio) {
					const sample = new AudioSample(data)
					await audioSource.add(sample)
					sample.close()
					data.close()
				}
			}

			const audioTask = encodeAudio()
			const videoTask = encodeVideo()

			await output.start()
			await Promise.all([audioTask, videoTask])
			await output.finalize()
		},
	}))
)

