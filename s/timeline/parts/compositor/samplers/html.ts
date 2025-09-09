import {Item} from "../../item.js"
import {Sampler} from "../parts/node-tree.js"
import {DecoderSource} from "../../../../driver/fns/schematic.js"

const toUrl = (src: DecoderSource) => (src instanceof Blob ? URL.createObjectURL(src) : String(src))

export function makeHtmlVideoSampler(resolveMedia: (hash: string) => DecoderSource): Sampler {
	const videoElements = new Map<number, HTMLVideoElement>()

	function getOrCreateVideoElement(clip: Item.Clip): HTMLVideoElement {
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

	let paused = true

	return {
		async gap(item) {
			return {
				duration: item.duration,
				sampleAt: async () => []
			}
		},
		async text(item) {
			return {
				duration: Infinity,
				sampleAt: async () => [{kind: "text", content: item.content, color: "white", fontSize: 48}],
			}
		},

		async clip(item) {
			const video = getOrCreateVideoElement(item)
			return {
				duration: item.duration,
				// if paused seek otherwise play
				sampleAt: async (t) => {
					if (t < 0 || t >= item.duration)
						return []

					if(video.paused && paused) {
						await seek(video, t)
					}

					if(video.paused && !paused) {
						await video.play()
					}

					const frame = new VideoFrame(video)
					return frame ? [{kind: "image", frame}] : []
				},
			}
		},
		async dispose() {
      for (const element of videoElements.values()) {
        element.pause()
        if (element.src.startsWith("blob:"))
        	URL.revokeObjectURL(element.src)
        element.remove()
      }
      videoElements.clear()
		},
		async setPaused(p) {
			paused = p
			for(const video of videoElements.values()) {
				if(p) video.pause()
			}
		},
	}
}

function seek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked)
      resolve()
    }
    video.addEventListener("seeked", onSeeked)
    if(video.fastSeek) {
    	video.fastSeek(time)
    } else video.currentTime = time
  })
}
