
import {Driver} from "../driver.js"

const {driver} = await Driver.simple()
await driver.demux()

