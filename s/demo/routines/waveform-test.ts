import {Driver} from "../../driver/driver.js"
import {Waveform} from "../../timeline/parts/waveform.js"

export async function waveformTest(driver: Driver) {
	const container = document.querySelector(".waveform-demo") as HTMLElement
	const widthSlider = document.querySelector(".width") as HTMLInputElement
	const waveform = await Waveform.init(driver, "/assets/temp/gl.mp4", container)

	widthSlider.addEventListener("change", () => {
		const width = +widthSlider.value
		waveform.width = width
	})
}
