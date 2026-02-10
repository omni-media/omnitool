import {Omni, TimelineFile} from "../../timeline/index.js"

export function exportTest(
	omni: Omni,
	timeline: TimelineFile,
	exportButton: HTMLButtonElement,
	onStatus?: (state: "running" | "done") => void
) {
	exportButton.addEventListener("click", () => {
		onStatus?.("running")
		omni.render(timeline).then(() => {
			console.log("done")
			onStatus?.("done")
		})
	})
}
