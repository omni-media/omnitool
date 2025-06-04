
import {AsSchematic} from "@e280/comrade"

export type DriverSchematic = AsSchematic<{

	// happens on the web worker
	work: {
		hello(): Promise<void>
	}

	// happens on the main thread
	host: {
		world(): Promise<void>
	}
}>

