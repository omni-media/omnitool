// import "@benev/slate/x/node.js"
import {Workers, Remote} from "@e280/comrade"

import type {MySchematic} from "./fns/worker.js"

/** spin up a worker-based driver */
export async function setupDriver() {
	const workers = await Workers.setup<MySchematic>({
		workerUrl: new URL("./fns/worker.js", import.meta.url),
		setupMainFns: () => ({
			async whatever(a: number, b: number) {
				return a * b
			},
		}),
	})

	return {
		remote: workers.remote as Remote<MySchematic["workerFns"]>,
		dispose: () => {
			// workers.terminate()
		}
	}
}
