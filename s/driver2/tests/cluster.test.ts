
import {Driver} from "../driver.js"

const {driver, cluster} = await Driver.cluster()
// await driver.demux()
cluster.terminate()

