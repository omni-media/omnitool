
import {Driver} from "../driver/driver.js"
import {setupTranscodeTest} from "./routines/transcode-test.js"

const workerUrl = new URL("../driver/driver.worker.bundle.js", import.meta.url)

const driver = await Driver.setup({workerUrl})
const results = document.querySelector(".results")!

const fetchButton = document.querySelector(".fetch")
const importButton = document.querySelector(".import") as HTMLButtonElement

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
	const transcode = setupTranscodeTest(driver, {value: fileHandle, type: "handle"})
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
		const transcode = setupTranscodeTest(driver, {value: "/assets/temp/gl.mp4", type: "stream"})
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
