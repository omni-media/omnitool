
import {Driver} from "../driver/driver.js"
import {exportTest} from "./routines/export-test.js"
import {playbackTest} from "./routines/playback-test.js"
import {waveformTest} from "./routines/waveform-test.js"
import {TimelineSchemaTest } from "./routines/timeline-setup.js"
import {filmstripTest} from "./routines/filmstrip-test.js"
import {setupTranscodeTest} from "./routines/transcode-test.js"

const driver = await Driver.setup({workerUrl: new URL("../driver/driver.worker.bundle.min.js", import.meta.url)})
const results = document.querySelector(".results")!

const fetchButton = document.querySelector(".fetch")
const fileInput = document.querySelector(".file-input") as HTMLInputElement

fetchButton?.addEventListener("click", startDemoFetch)
fileInput?.addEventListener("input", startDemoImport)

waveformTest(driver)
// const transcriber = await transcriberTest(driver)

// hello world test
{
	await driver.thread.work.hello()
	if (driver.machina.count === 1) console.log("✅ driver works")
	else console.error("❌ FAIL driver call didn't work")
}

// transcoding tests
async function startDemoImport(e: Event)
{
	const file = fileInput.files?.[0]
	if(file) {
		const transcode = setupTranscodeTest(driver, file)
		await filmstripTest(file)
		run(transcode, file.name)
		// await transcriber.transcribe(file)

		const {timeline, omni} = await TimelineSchemaTest(driver, file)

		playbackTest(timeline, omni)
		exportTest(omni, timeline)
	}
	// const [fileHandle] = await window.showOpenFilePicker()
	// const file = await fileHandle.getFile()
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
