
import {Driver} from "../driver.js"

const {driver} = await Driver.mock()
await driver.demux()

