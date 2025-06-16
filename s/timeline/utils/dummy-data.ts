
import {Datafile} from "./datafile.js"

export const dummyData = () => Datafile.make(
	new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF])
)

