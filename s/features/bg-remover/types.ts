
import {AsSchematic} from "@e280/comrade"
import {Loading, PipelineSpec} from "../parts/types.js"

export type BgRemoverSchematic = AsSchematic<{
	work: {
		prepare(spec: PipelineSpec): Promise<void>
		remove(request: VideoFrame): Promise<VideoFrame>
	},

	host: {
		loading(load: Loading): Promise<void>
	}
}>

export type RemoverOptions = {
	frame: VideoFrame
}

export type BgRemoverModels = "onnx-community/ISNet-ONNX" | "Xenova/modnet" | "briaai/RMBG-1.4"

export type BgRemoverOptions = {
	spec: PipelineSpec
	workerUrl: URL | string
	onLoading: (loading: Loading) => void
}

