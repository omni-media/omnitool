
import {AsSchematic} from "@e280/comrade"

export type DriverSchematic = AsSchematic<{
	work: {
		add(a: number, b: number): Promise<number>
	}
	host: {}
}>

