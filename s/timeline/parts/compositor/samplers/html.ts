import {Item} from "../../item.js"
import {Sampler} from "../parts/node-tree.js"
import {DecoderSource} from "../../../../driver/fns/schematic.js"

export type DrawThunk = (ctx: CanvasRenderingContext2D) => void
const toUrl = (src: DecoderSource) => (src instanceof Blob ? URL.createObjectURL(src) : String(src))

export function makeHtmlVideoSampler(
	canvas: HTMLCanvasElement,
	resolveMedia: (hash: string) => DecoderSource,
): Sampler<DrawThunk> {
	let paused = false
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

	return {
		async text(item) {
			return {
				duration: Infinity,
				sampleAt: async () => [
					(ctx) => {
						ctx.fillStyle = "white"
						ctx.font = "48px sans-serif"
						ctx.textBaseline = "top"
						ctx.fillText(item.content, 40, 40)
					},
				],
			}
		},

		async clip(item) {
			const video = getOrCreateVideoElement(item)
			return {
				duration: item.duration,
				sampleAt: async (t) => {
					if (t < 0 || t >= item.duration) return []
					if(!paused && video.paused)
						await video.play()
					return [
						(ctx) => {
							ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
						},
					]
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
			for (const v of videoElements.values()) {
				p ? v.pause() : await v.play()
			}
		},
	}
}

