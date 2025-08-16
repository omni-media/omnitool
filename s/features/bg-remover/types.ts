import {AsSchematic} from "@e280/comrade"
import {Loading, PipelineSpec} from "../types.js"

export type BgRemoverSchematic = AsSchematic<{
	work: {
		prepare(spec: PipelineSpec): Promise<void>
		remove(request: Blob): Promise<ImageBitmap>
	},

	host: {
		loading(load: Loading): Promise<void>
	}
}>

export type RemoverOptions = {
	frame: Blob
}

export type BgRemoverModels = "onnx-community/ISNet-ONNX" | "Xenova/modnet"

export type BgRemoverOptions = {
	spec: PipelineSpec<BgRemoverModels>
	workerUrl: URL | string
	onLoading: (loading: Loading) => void
}
