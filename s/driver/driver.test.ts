
import {Driver} from "./driver.js"
import {Science, test, expect} from "@e280/science"

const workerUrl = new URL("../demo/driver.worker.bundle.min.js", import.meta.url)

export default Science.suite({
	"driver hello world": test.skip(async() => {
		const driver = await Driver.setup({workerUrl})
		expect(driver.machina.count).is(0)
		await driver.thread.work.hello()
		expect(driver.machina.count).is(1)
	}),
})

