
import {DataType, DeviceType, TaskType} from "@huggingface/transformers"

export type Loading = {
	total: number
	progress: number
}

export type PipelineSpec<Extras extends object = {}> = {
	model: string
	dtype: DataType
	device: DeviceType
} & Extras

export type PipeOptions = {
	spec: PipelineSpec
	task: TaskType
	onLoading: (loading: Loading) => void
}
