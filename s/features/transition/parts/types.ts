
import {Renderer, Texture} from "pixi.js"
import {TransitionName} from "../../../timeline/parts/transitions.js"

export interface TransitionOptions {
	name: TransitionName
	renderer: Renderer
}

export interface TransitionRendererOptions {
	from: Texture
	to: Texture
	progress: number
	width: number
	height: number
}

export interface GLTransition {
	author: string
	createdAt: string
	glsl: string
	license: string
	name: TransitionName
	updatedAt: string
	defaultParams: any
	paramsTypes: any
}

