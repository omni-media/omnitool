
import {O, Omni, TimelineFile} from "../../timeline/index.js"

export async function playbackTest(timeline: TimelineFile, omni: Omni, root: HTMLElement) {
	const playButton = root.querySelector(".play") as HTMLButtonElement
	const stopButton = root.querySelector(".stop") as HTMLButtonElement
	const scrub = root.querySelector(".scrub") as HTMLInputElement
	const playhead = root.querySelector(".playhead") as HTMLDivElement
	const timecode = root.querySelector(".timecode") as HTMLDivElement
	const canvasSlot = root.querySelector(".player-canvas") as HTMLDivElement
	const o = new O(timeline)
	const player = await omni.playback(timeline)
	canvasSlot.replaceChildren(player.canvas)

	playButton.disabled = false
	stopButton.disabled = false

	playButton.addEventListener("click", () => player.play())
	stopButton.addEventListener("click", () => player.pause())
	scrub.max = String(Math.ceil(player.getDuration()))

	let isScrubbing = false
	let pendingSeek: number | null = null
	let seekInFlight = false

	player.playback.onTick.on(() => setScrubState(player.currentTime(), player.getDuration()))

	const queueSeek = async (timeMs: number) => {
		pendingSeek = timeMs
		if (seekInFlight)
			return
		seekInFlight = true
		while (pendingSeek) {
			const next = pendingSeek
			pendingSeek = null
			await player.seek(next)
		}
		seekInFlight = false
	}

	const updateTimecode = (currentMs: number, durationMs: number) => {
		timecode.textContent = `${formatTime(currentMs)} / ${formatTime(durationMs)}`
	}

	scrub.addEventListener("input", async () => {
		isScrubbing = true
		const next = Math.max(0, Math.min(+scrub.value, player.getDuration()))
		updateTimecode(next, player.getDuration())
		await queueSeek(next)
	})

	scrub.addEventListener("change", async () => {
		isScrubbing = false
		const next = Math.max(0, Math.min(+scrub.value, player.getDuration()))
		await queueSeek(next)
	})

	const setScrubState = (timeMs: number, durationMs: number) => {
		const clamped = Math.max(0, Math.min(timeMs, durationMs))
		if (!isScrubbing) scrub.value = String(Math.round(clamped))
		const progress = durationMs ? (clamped / durationMs) * 100 : 0
		playhead.style.left = `${progress}%`
		updateTimecode(clamped, durationMs)
	}

	player.update(o.timeline)
}

function formatTime(ms: number) {
	const clamped = Math.max(0, ms)
	const totalSeconds = Math.floor(clamped / 1000)
	const minutes = Math.floor(totalSeconds / 60)
	const seconds = totalSeconds % 60
	const millis = Math.floor(clamped % 1000)
	return `${minutes}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`
}

