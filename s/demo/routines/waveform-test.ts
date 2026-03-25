
import {Driver} from "../../driver/driver.js"
import {Waveform} from "../../timeline/parts/waveform/waveform.js"

export async function waveformTest(driver: Driver, source: File, root: HTMLElement) {
	const container = root.querySelector(".waveform-canvas") as HTMLDivElement
	const widthSlider = root.querySelector(".width") as HTMLInputElement

	container.replaceChildren()
	container.style.position = "relative"
	container.style.height = "96px"
	container.style.overflow = "hidden"

	const waveform = await Waveform.init(driver, source, {
		tileHeight: 96,
		onChange: () => renderTiles()
	})

	const renderTiles = () => {
		const width = +widthSlider.value
		const zoom = pixelsPerSecond(width, waveform.duration)
		waveform.zoom = zoom
		container.style.width = `${width}px`
		container.replaceChildren(...[...waveform.getTiles().values()].map(tile => {
			tile.canvas.style.position = "absolute"
			tile.canvas.style.top = "0"
			tile.canvas.style.left = `${tile.startTime * pixelsPerSecond(width, waveform.duration)}px`
			tile.canvas.style.height = "100%"
			return tile.canvas
		}))
	}

	widthSlider.oninput = renderTiles
	waveform.range = [0, waveform.duration]
}

function pixelsPerSecond(width: number, duration: number) {
	return duration > 0 ? width / duration : 0
}
