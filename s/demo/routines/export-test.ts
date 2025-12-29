import {Omni, TimelineFile} from "../../timeline/index.js"

export function exportTest(omni: Omni, timeline: TimelineFile) {
	const exportButton = document.querySelector(".export") as HTMLButtonElement
	exportButton?.addEventListener("click", () => {
		omni.render(timeline, {
			video: {},
			audio: {}
		}).then(() => console.log("done"))
	})
}
