import {Comrade} from "@e280/comrade"

import {setupWhisperWork} from "../fns/work.js"
import {WhisperSchematic} from "../fns/schematic.js"

await Comrade.worker<WhisperSchematic>(setupWhisperWork)

