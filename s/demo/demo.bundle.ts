
import {context} from "../context.js"
import {waveformTest} from "./routines/waveform-test.js"
import {filmstripTest} from "./routines/filmstrip-test.js"
import {transcriberTest} from "./routines/transcriber-test.js"
import {setupTranscodeTest} from "./routines/transcode-test.js"

const driver = await context.driver
const results = document.querySelector(".results")!

const fetchButton = document.querySelector(".fetch")
const importButton = document.querySelector(".import") as HTMLButtonElement

fetchButton?.addEventListener("click", startDemoFetch)
importButton?.addEventListener("click", startDemoImport)

waveformTest()
const transcriber = await transcriberTest(driver)

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
	const file = await fileHandle.getFile()
	const transcode = setupTranscodeTest(driver, file)
	await filmstripTest(file)
	run(transcode, fileHandle.name)
	await transcriber.transcribe(file)
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
