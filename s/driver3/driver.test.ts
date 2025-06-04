
import {Driver} from "./driver.js"
import {Science, test, expect} from "@e280/science"

export default Science.suite({
	"driver hello world": test(async() => {
		const driver = await Driver.setup()
		expect(driver.machina.count).is(0)

		await driver.thread.work.hello()
		expect(driver.machina.count).is(1)
	}),
})

