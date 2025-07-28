
import {Comrade} from "@e280/comrade"
import {setupDriverWork} from "./fns/work.js"
import {DriverSchematic} from "./fns/schematic.js"

await Comrade.worker<DriverSchematic>(setupDriverWork)

