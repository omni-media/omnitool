import {Renderer} from "pixi.js"

export interface TransitionOptions {
	name: "Dreamy"
	renderer: Renderer
}

export interface TransitionRendererOptions {
	from: VideoFrame
	to: VideoFrame
	progress: number
	width: number
	height: number
}

export interface GLTransition {
	author: string
	createdAt: string
	glsl: string
	license: string
	name: string
	updatedAt: string
	defaultParams: any
	paramsTypes: any
}
