import {Filmstrip} from "../../driver/utils/filmstrip.js"

export async function filmstripTest(fileHandle: FileSystemFileHandle) {
	const rangeSlider = document.querySelector(".range") as HTMLInputElement
	const rangeView = document.querySelector(".range-view")!
	const rangeSizeSlider = document.querySelector(".range-size")! as HTMLInputElement
	const frequencySlider = document.querySelector(".frequency")! as HTMLInputElement
	const frequencyView = document.querySelector(".frequency-view")!
	const container = document.querySelector("#filmstrip")!
	const FPS_10 = 1000/10 / 1000
	let rangeSize = 0.5
	const filmstrip = await Filmstrip.init(
			fileHandle,
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
	rangeSizeSlider.addEventListener("change", () => {
		rangeSize = +rangeSizeSlider.value
		const [start, end] = [+rangeSlider.value, +rangeSlider.value+rangeSize]
		filmstrip.range = [start, end]
		rangeView.textContent = `visible time range: [${start}, ${end}]`
	})
	rangeSlider.addEventListener("change", () => {
		const [start, end] = [+rangeSlider.value, +rangeSlider.value+rangeSize]
		filmstrip.range = [start, end]
		rangeView.textContent = `visible time range: [${start}, ${end}]`
	})
	frequencySlider.addEventListener("change", () => {
		filmstrip.frequency = 1000/+frequencySlider.value/1000
		frequencyView.textContent = `frame every ${filmstrip.frequency.toFixed(3)} second (${frequencySlider.value} frames per second)`
	})
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
