
import {Science} from "@e280/science"
import omniTest from "./timeline/sugar/omni.test.js"
import renderersTest from "./timeline/renderers/renderers.test.js"

await Science.run
({
	omniTest,
	renderersTest
})

