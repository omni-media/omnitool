import {Item} from "../../item.js"
import {HTMLSampler} from "../parts/tree-builder.js"
import {DecoderSource} from "../../../../driver/fns/schematic.js"

const toUrl = (src: DecoderSource) => (src instanceof Blob ? URL.createObjectURL(src) : String(src))

export function makeHtmlSampler(resolveMedia: (hash: string) => DecoderSource): HTMLSampler {
	const videoElements = new Map<number, HTMLVideoElement>()
	const audioElements = new Map<number, HTMLAudioElement>()

	function getOrCreateVideoElement(clip: Item.Video) {
		let video = videoElements.get(clip.id)
		if (!video) {
			video = document.createElement("video")
			video.playsInline = true
			video.muted = true
			video.preload = "auto"
			video.crossOrigin = "anonymous"
			video.src = toUrl(resolveMedia(clip.mediaHash))
			videoElements.set(clip.id, video)
		}
		return video
	}

	function getOrCreateAudioElement(clip: Item.Audio) {
		let audio = audioElements.get(clip.id)
		if (!audio) {
			audio = document.createElement("audio")
			audio.preload = "auto"
			audio.crossOrigin = "anonymous"
			audio.src = toUrl(resolveMedia(clip.mediaHash))
			audio.volume = 0.2
			audioElements.set(clip.id, audio)
		}
		return audio
	}

	let paused = true

	return {
		async video(item, matrix) {
			const video = getOrCreateVideoElement(item)
			return {
				duration: item.duration,
				// if paused seek otherwise play
				visuals: {
					sampleAt: async (ms) => {
						const mediaTime = item.start + ms
						const endTime = item.start + item.duration

						if (mediaTime < item.start || mediaTime >= endTime) {
							video.pause()
							return []
						}

						if(video.paused && paused) {
							await seek(video, mediaTime / 1000)
						}

						if(video.paused && !paused) {
							await video.play()
						}

						const frame = new VideoFrame(video)
						return frame ? [{kind: "image", frame, matrix, id: item.id}] : []
					}
				}
			}
		},
		async audio(item) {
			const audio = getOrCreateAudioElement(item)
			return {
				duration: item.duration,
				audio: {
					onTimeUpdate: async (ms) => {
						const mediaTime = item.start + ms
						const endTime = item.start + item.duration

						if (mediaTime < item.start || mediaTime >= endTime) {
							audio.pause()
							return []
						}

						if(audio.paused && paused) {
							await seek(audio, mediaTime / 1000)
						}

						if(audio.paused && !paused) {
							await audio.play()
						}

						return []
					}
				}
			}
		},
		async dispose() {
			const elements = [...videoElements.values(), ...audioElements.values()]
      for (const element of elements) {
        element.pause()
        if (element.src.startsWith("blob:"))
        	URL.revokeObjectURL(element.src)
        element.remove()
      }
      videoElements.clear()
      audioElements.clear()
		},
		async setPaused(p) {
			paused = p
			const elements = [...videoElements.values(), ...audioElements.values()]
			for(const element of elements) {
				if(p) element.pause()
			}
		},
	}
}

function seek(media: HTMLVideoElement | HTMLAudioElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const onSeeked = () => {
      media.removeEventListener("seeked", onSeeked)
      resolve()
    }
    media.addEventListener("seeked", onSeeked)
    if(media.fastSeek) {
    	media.fastSeek(time)
    } else media.currentTime = time
  })
}
