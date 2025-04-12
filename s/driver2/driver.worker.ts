
// this module is a web worker

import {worker} from "@e280/comrade"
import {setupDriverWork} from "./fns/work.js"
import {DriverSchematic} from "./fns/schematic.js"

await worker<DriverSchematic>(setupDriverWork)

