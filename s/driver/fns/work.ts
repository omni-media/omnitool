import {Comrade} from "@e280/comrade"
import {Sprite, Text, Texture, DOMAdapter, WebWorkerAdapter} from "pixi.js"
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

		async encode({video, audio, config, writable}) {
			const output = new Output({
				format: new Mp4OutputFormat(),
				target: new StreamTarget(writable, {chunked: true})
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
	}))
)

type RenderableObject = Sprite | Text | Texture
