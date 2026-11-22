
import {ALL_FORMATS, BlobSource, Input} from "mediabunny"

export async function probe(blob: Blob) {
	const file = {type: blob.type, sizeBytes: blob.size}

	if (blob.type.startsWith("image/")) {
		const image = await createImageBitmap(blob)
		try {
			return {
				...file,
				image: {
					width: image.width,
					height: image.height
				}
			}
		}
		finally {image.close()}
	}

	const input = new Input({
		source: new BlobSource(blob),
		formats: ALL_FORMATS
	})

	try {
		const [format, duration, video, audio] = await Promise.all([
			input.getFormat(),
			input.computeDuration(),
			input.getPrimaryVideoTrack(),
			input.getPrimaryAudioTrack(),
		])

		return {
			...file,
			durationMs: duration * 1000,
			format: format.name,
			video: video && {
				codec: await video.getCodec(),
				width: await video.getDisplayWidth(),
				height: await video.getDisplayHeight(),
				estimatedFps: (await video.computePacketStats(100)).averagePacketRate,
			},
			audio: audio && {
				codec: await audio.getCodec(),
				sampleRate: await audio.getSampleRate(),
				channels: await audio.getNumberOfChannels(),
			},
		}
	}

	finally {input.dispose()}
}

