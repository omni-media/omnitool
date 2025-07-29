import {Driver} from "./driver/driver.js"

const workerUrl = new URL("../driver/driver.worker.bundle.min.js", import.meta.url)

export const context = {
	driver: Driver.setup({workerUrl})
}
