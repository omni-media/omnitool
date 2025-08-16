import {DataType, DeviceType, TaskType} from "@huggingface/transformers"

export type Loading = {
	total: number
	progress: number
}

export type PipelineSpec<T = string> = {
	model: T
	dtype: DataType
	device: DeviceType
}

export type PipeOptions = {
	spec: PipelineSpec
	task: TaskType
	onLoading: (loading: Loading) => void
}
