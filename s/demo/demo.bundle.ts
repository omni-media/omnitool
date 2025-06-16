
import {Driver} from "../driver/driver.js"
import {loadVideo} from "./routines/load-video.js"
import {setupTranscodeTest} from "./routines/transcode-test.js"
import {FileSystemHelper} from "../driver/utils/file-system-helper.js"

const workerUrl = new URL("../driver/driver.worker.bundle.js", import.meta.url)

const driver = await Driver.setup({workerUrl})
const fileSystem = new FileSystemHelper()
const results = document.querySelector(".results")!

// hello world test
{
	await driver.thread.work.hello()
	if (driver.machina.count === 1) console.log("✅ driver works")
	else console.error("❌ FAIL driver call didn't work")
}

// transcoding tests
{

	// which videos to run tests on
	const videos = [
		"/assets/temp/gl.mp4",
	]

	// running each test in sequence
	for (const url of videos) {
		const mp4 = await loadVideo(url)
		const transcode = setupTranscodeTest(driver, mp4)

		// create result div
		const div = document.createElement("div")
		results.append(div)

		// add video label
		const p = document.createElement("p")
		p.textContent = url
		div.append(p)

		// add the canvas to dom
		div.append(transcode.canvas)

		// run the test
		const bytes = await transcode.run()

		// add the save button
		const save = document.createElement("button")
		save.onclick = async() => fileSystem.save(bytes)
		save.textContent = "save"
		div.append(save)
	}
}

