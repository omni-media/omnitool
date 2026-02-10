import {Driver} from "../../driver/driver.js"
import {Waveform} from "../../timeline/parts/waveform.js"

export async function waveformTest(driver: Driver, source: File, root: HTMLElement) {
	const container = root.querySelector(".waveform-canvas") as HTMLElement
	const widthSlider = root.querySelector(".width") as HTMLInputElement
	container.replaceChildren()
	const waveform = await Waveform.init(driver, source, container)

	widthSlider.oninput = () => {
		const width = +widthSlider.value
		waveform.width = width
	}
}
