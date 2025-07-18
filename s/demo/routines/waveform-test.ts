import {Waveform} from "../../timeline/parts/waveform.js"

export async function waveformTest() {
	const container = document.querySelector(".waveform-demo") as HTMLElement
	const widthSlider = document.querySelector(".width") as HTMLInputElement
	const waveform = await Waveform.init("/assets/temp/gl.mp4", container)

	widthSlider.addEventListener("change", () => {
		const width = +widthSlider.value
		waveform.width = width
	})
}
