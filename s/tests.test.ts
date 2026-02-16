
import { Science } from "@e280/science"
import driver from "./driver/driver.test.js"
import treeTest from "./timeline/renderers/tree.test.js"

await Science.run({
	treeTest,
	driver,
})

