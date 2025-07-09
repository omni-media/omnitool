
import {Driver} from "../driver/driver.js"
import {Filmstrip} from "../driver/utils/filmstrip.js"
import {setupTranscodeTest} from "./routines/transcode-test.js"

const workerUrl = new URL("../driver/driver.worker.bundle.js", import.meta.url)

const driver = await Driver.setup({workerUrl})
const results = document.querySelector(".results")!

const fetchButton = document.querySelector(".fetch")
const importButton = document.querySelector(".import") as HTMLButtonElement
const slider = document.querySelector(".seconds") as HTMLInputElement
const range = document.querySelector(".range")!

fetchButton?.addEventListener("click", startDemoFetch)
importButton?.addEventListener("click", startDemoImport)

// hello world test
{
	await driver.thread.work.hello()
	if (driver.machina.count === 1) console.log("✅ driver works")
	else console.error("❌ FAIL driver call didn't work")
}

// transcoding tests
async function startDemoImport()
{
	const [fileHandle] = await window.showOpenFilePicker()
	const transcode = setupTranscodeTest(driver, fileHandle)
	const container = document.querySelector("#filmstrip")!
	const FPS_30 = 1000/30 / 1000
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
				granularity: FPS_30,
				canvasSinkOptions: {
					width: 80,
					height: 50,
					fit: "fill"
				}
			}
		)
	slider.addEventListener("input", () => {
		const [start, end] = [+slider.value, +slider.value+1]
		filmstrip.update([start, end])
		range.textContent = `visible time range: [${start}, ${end}]`
	})
	await filmstrip.update([10, 11])
	run(transcode, fileHandle.name)
}

async function startDemoFetch()
{

	// which videos to run tests on
	const videos = [
		"/assets/temp/gl.mp4",
	]

	// running each test in sequence
	for (const url of videos) {
		const transcode = setupTranscodeTest(driver, "/assets/temp/gl.mp4")
		run(transcode, url)
	}
}

async function run(transcode: ReturnType<typeof setupTranscodeTest>, label: string) {
	// create result div
	const div = document.createElement("div")
	results.append(div)

	// add video label
	const p = document.createElement("p")
	p.textContent = label
	div.append(p)

	// add the canvas to dom
	div.append(transcode.canvas)

	// run the test
	await transcode.run()
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
