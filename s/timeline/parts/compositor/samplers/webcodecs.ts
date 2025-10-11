import {Item} from "../../item.js"
import {Driver} from "../../../../driver/driver.js"
import {WebcodecsSampler} from "../parts/tree-builder.js"
import {VideoCursor} from "../../../utils/video-cursor.js"
import {AudioStream} from "../../../utils/audio-stream.js"

const toUs = (seconds: number) => Math.round(seconds * 1_000_000)

export function makeWebCodecsSampler(
	driver: Driver,
	resolveMedia: (hash: string) => any
): WebcodecsSampler {
	const videoCursors = new Map<number, VideoCursor>()

	async function getCursorForVideo(videoItem: Item.Video): Promise<VideoCursor> {
		const existing = videoCursors.get(videoItem.id)
		if (existing) return existing
		const source = resolveMedia(videoItem.mediaHash)
		const video = driver.decodeVideo({source})
		const cursor = new VideoCursor(video.getReader())
		videoCursors.set(videoItem.id, cursor)
		return cursor
	}

	return {
		async video(item, matrix) {
			const cursor = await getCursorForVideo(item)
			const baseUs = toUs(item.start ?? 0)
			return {
				duration: item.duration,
				visuals: {
					sampleAt: async (time: number) => {
						const frame = await cursor.atOrNear(baseUs + toUs(time))
						return frame ? [{kind: "image", frame, matrix}] : []
					}
				}
			}
		},
		async audio(item) {
			return {
				duration: item.duration,
				audio: {
					getStream: async function*() {
						const source = resolveMedia(item.mediaHash)
						const startUs = item.start
						const endUs = (item.start + item.duration)
						const audio = driver.decodeAudio({source, start: startUs, end: endUs})
						const audioStream = new AudioStream(audio.getReader())
						yield* audioStream.stream()
					},
				}
			}
		},
  	async dispose() {
    	const tasks = Array.from([...videoCursors.values()], c => c.cancel())
    	videoCursors.clear()
    	await Promise.all(tasks)
  	}
	}
}

