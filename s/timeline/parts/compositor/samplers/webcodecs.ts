import {Item} from "../../item.js"
import {context} from "../../../../context.js"
import {Sampler} from "../parts/node-tree.js"
import {ClipCursor} from "../../../utils/clip-cursor.js"
import {Layer} from "../../../../driver/fns/schematic.js"

const toUs = (seconds: number) => Math.round(seconds * 1_000_000)

export function makeWebCodecsSampler(
	resolveMedia: (hash: string) => any
): Sampler<Layer> {
	const cursors = new Map<number, ClipCursor>()

	async function getCursorForClip(clip: Item.Clip): Promise<ClipCursor> {
		const existing = cursors.get(clip.id)
		if (existing) return existing
		const driver = await context.driver
		const source = resolveMedia(clip.mediaHash)
		const {video} = driver.decode({source})
		const cursor = new ClipCursor(video.getReader())
		cursors.set(clip.id, cursor)
		return cursor
	}

	return {
		async text(item) {
			const layer: Layer = { kind: "text", content: item.content, color: "white", fontSize: 48 }
			return {
				duration: Infinity,
				sampleAt: async () => [layer],
			}
		},

		async clip(item) {
			const cursor = await getCursorForClip(item)
			const baseUs = toUs(item.start ?? 0)
			return {
				duration: item.duration,
				sampleAt: async (time) => {
					const frame = await cursor.atOrNear(baseUs + toUs(time))
					return frame ? [{kind: "image", frame}] : []
				},
			}
		},
  	async dispose() {
    	const tasks = Array.from(cursors.values(), c => c.cancel())
    	cursors.clear()
    	await Promise.all(tasks)
  	}
	}
}

