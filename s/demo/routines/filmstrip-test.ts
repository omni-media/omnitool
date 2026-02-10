import {Filmstrip} from "../../timeline/parts/filmstrip.js"

export async function filmstripTest(file: File, root: HTMLElement) {
	const rangeSlider = root.querySelector(".range") as HTMLInputElement
	const rangeView = root.querySelector(".range-view")!
	const rangeSizeSlider = root.querySelector(".range-size")! as HTMLInputElement
	const frequencySlider = root.querySelector(".frequency")! as HTMLInputElement
	const frequencyView = root.querySelector(".frequency-view")!
	const container = root.querySelector(".filmstrip")!
	const FPS_10 = 1 / 10
	let rangeSize = 0.5
	container.replaceChildren()

	const filmstrip = await Filmstrip.init(
			file,
			{
				onChange(tiles) {
					// Sort by time (optional, for clean ordering)
					const sorted = tiles.sort((a, b) => a.time - b.time)
					// Clear previous thumbnails
					container.replaceChildren(
						...sorted.map(({ time, canvas }) => createLabeledCanvas(time, canvas.canvas as HTMLCanvasElement))
					)
				},
				frequency: FPS_10,
				canvasSinkOptions: {
					width: 80,
					height: 50,
					fit: "fill"
				}
			}
	)
	rangeSizeSlider.oninput = () => {
		rangeSize = +rangeSizeSlider.value
		const start = +rangeSlider.value
		const end = start + rangeSize
		filmstrip.range = [start, end]
		rangeView.textContent = `visible time range: [${start}, ${end}]`
	}
	rangeSlider.oninput = () => {
		const start = +rangeSlider.value
		const end = start + rangeSize
		filmstrip.range = [start, end]
		rangeView.textContent = `visible time range: [${start}, ${end}]`
	}
	frequencySlider.oninput = () => {
		filmstrip.frequency = 1 / +frequencySlider.value
		frequencyView.textContent = `frame every ${filmstrip.frequency.toFixed(3)} second (${frequencySlider.value} frames per second)`
	}
	filmstrip.range = [10, 10.5]
}

function createLabeledCanvas(time: number, canvas: HTMLCanvasElement) {
	const wrapper = document.createElement('div')
	wrapper.style.position = 'relative'
	wrapper.style.display = 'inline-block'
	wrapper.style.marginRight = '4px'
	wrapper.appendChild(canvas)
	const label = document.createElement('div')
	label.textContent = `${time.toFixed(2)}s`
	label.style.position = 'absolute'
	label.style.top = '2px'
	label.style.right = '4px'
	label.style.fontSize = '10px'
	label.style.color = 'white'
	label.style.background = 'rgba(0,0,0,0.6)'
	label.style.padding = '2px 4px'
	label.style.borderRadius = '4px'
	label.style.pointerEvents = 'none'
	wrapper.appendChild(label)
	return wrapper
}
