
import {PipelineSpec} from "../parts/types.js"


export const defaultBgRemoverSpec = (): PipelineSpec => ({
	model: "Xenova/modnet",
	dtype: "auto",
	device: "webgpu"
})


