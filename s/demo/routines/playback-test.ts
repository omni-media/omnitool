
import {Driver} from "../../driver/driver.js"
import {O, TimelineFile, VideoPlayer} from "../../timeline/index.js"

export async function playbackTest(driver: Driver, timeline: TimelineFile) {
	const playButton = document.querySelector(".play") as HTMLButtonElement
	const stopButton = document.querySelector(".stop") as HTMLButtonElement
	const seekButton = document.querySelector(".seek") as HTMLButtonElement
	const o = new O({project: timeline})
	const player = await VideoPlayer.create(driver, timeline)
	document.body.appendChild(player.canvas)

	playButton.addEventListener("click", () => player.play())
	stopButton.addEventListener("click", () => player.pause())
	seekButton.addEventListener("change", async (e: Event) => {
		const target = e.target as HTMLInputElement
		await player.seek(+target.value)
	})

	player.update(o.state.project)
}
