
import {Driver} from "../driver3/driver.js"

const workerUrl = new URL("../driver3/driver.worker.bundle.js", import.meta.url)

const driver = await Driver.setup({workerUrl})
await driver.thread.work.hello()

if (driver.machina.count === 1)
	console.log("✅ driver works")
else
	console.error("❌ FAIL driver call didn't work")

