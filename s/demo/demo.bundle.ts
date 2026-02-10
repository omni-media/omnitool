
import {Driver} from "../driver/driver.js"
import type {Omni, TimelineFile} from "../timeline/index.js"
import {playbackTest} from "./routines/playback-test.js"
import {waveformTest} from "./routines/waveform-test.js"
import {TimelineSchemaTest } from "./routines/timeline-setup.js"
import {filmstripTest} from "./routines/filmstrip-test.js"
import {setupTranscodeTest} from "./routines/transcode-test.js"

const driver = await Driver.setup({workerUrl: new URL("../driver/driver.worker.bundle.min.js", import.meta.url)})

const transcodeCard = document.querySelector("[data-demo='transcode']") as HTMLElement
const filmstripCard = document.querySelector("[data-demo='filmstrip']") as HTMLElement
const waveformCard = document.querySelector("[data-demo='waveform']") as HTMLElement
const playbackCard = document.querySelector("[data-demo='playback']") as HTMLElement
const exportCard = document.querySelector("[data-demo='export']") as HTMLElement
const exportButton = exportCard.querySelector("[data-action='export']") as HTMLButtonElement

let exportState: {timeline: TimelineFile; omni: Omni} | null = null

// hello world test
{
	await driver.thread.work.hello()
	if (driver.machina.count === 1) console.log("✅ driver works")
	else console.error("❌ FAIL driver call didn't work")
}

const setProgress = (card: HTMLElement, state: "idle" | "running" | "done") => {
	const progress = card.querySelector(".progress") as HTMLProgressElement
	const status = card.querySelector(".status") as HTMLSpanElement

	if (state === "running") {
		progress.removeAttribute("value")
		status.textContent = "running"
	} else if (state === "done") {
		progress.value = 1
		status.textContent = "done"
	} else {
		progress.value = 0
		status.textContent = "idle"
	}
}

const bindDemo = (
	card: HTMLElement,
	run: (file: File, card: HTMLElement) => Promise<void>
) => {
	const input = card.querySelector("input[type='file']") as HTMLInputElement
	const button = card.querySelector("[data-action='run']") as HTMLButtonElement

	button.disabled = true
	input.addEventListener("input", () => {
		button.disabled = !input.files?.length
	})

	button.addEventListener("click", async () => {
		const file = input.files?.[0]
		if (!file)
			return

		button.disabled = true
		setProgress(card, "running")
		try {
			await run(file, card)
			setProgress(card, "done")
		} finally {
			button.disabled = false
		}
	})
}

bindDemo(transcodeCard, async (file, card) => {
	const preview = card.querySelector(".demo-preview") as HTMLDivElement
	const transcode = setupTranscodeTest(driver, file)
	preview.replaceChildren(transcode.canvas)
	await transcode.run()
})

bindDemo(filmstripCard, async (file, card) => {
	await filmstripTest(file, card)
})

bindDemo(waveformCard, async (file, card) => {
	await waveformTest(driver, file, card)
})

{
	const input = playbackCard.querySelector("input[type='file']") as HTMLInputElement
	input.addEventListener("input", async () => {
		const file = input.files?.[0]
		if (!file)
			return

		const {timeline, omni} = await TimelineSchemaTest(driver, file)
		await playbackTest(timeline, omni, playbackCard)
	})
}

{
	const input = exportCard.querySelector("input[type='file']") as HTMLInputElement
	input.addEventListener("input", async () => {
		const file = input.files?.[0]
		if (!file)
			return

		setProgress(exportCard, "running")
		const {timeline, omni} = await TimelineSchemaTest(driver, file)
		exportState = {timeline, omni}
		exportButton.disabled = false

		const preview = exportCard.querySelector(".demo-preview") as HTMLDivElement
		const player = await omni.playback(timeline)
		await player.seek(0)
		preview.replaceChildren(player.canvas)
		setProgress(exportCard, "done")
	})
}

exportButton.addEventListener("click", async () => {
	if (!exportState)
		return

	setProgress(exportCard, "running")
	await exportState.omni.render(exportState.timeline)
	setProgress(exportCard, "done")
})

