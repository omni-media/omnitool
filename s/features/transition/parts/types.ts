import {Renderer} from "pixi.js"

export interface TransitionOptions {
	name: Transition
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
	name: Transition
	updatedAt: string
	defaultParams: any
	paramsTypes: any
}

export type Transition =
  | "Bounce"
  | "BowTieHorizontal"
  | "BowTieVertical"
  | "ButterflyWaveScrawler"
  | "CircleCrop"
  | "ColourDistance"
  | "CrazyParametricFun"
  | "CrossZoom"
  | "Directional"
  | "DoomScreenTransition"
  | "Dreamy"
  | "DreamyZoom"
  | "GlitchDisplace"
  | "GlitchMemories"
  | "GridFlip"
  | "InvertedPageCurl"
  | "LinearBlur"
  | "Mosaic"
  | "PolkaDotsCurtain"
  | "Radial"
  | "SimpleZoom"
  | "StereoViewer"
  | "Swirl"
  | "WaterDrop"
  | "ZoomInCircles"
  | "angular"
  | "burn"
  | "cannabisleaf"
  | "circle"
  | "circleopen"
  | "colorphase"
  | "crosshatch"
  | "crosswarp"
  | "cube"
  | "directionalwarp"
  | "directionalwipe"
  | "displacement"
  | "doorway"
  | "fade"
  | "fadecolor"
  | "fadegrayscale"
  | "flyeye"
  | "heart"
  | "hexagonalize"
  | "kaleidoscope"
  | "luma"
  | "luminance_melt"
  | "morph"
  | "multiply_blend"
  | "perlin"
  | "pinwheel"
  | "pixelize"
  | "polar_function"
  | "randomsquares"
  | "ripple"
  | "rotate_scale_fade"
  | "squareswire"
  | "squeeze"
  | "swap"
  | "undulatingBurnOut"
  | "wind"
  | "windowblinds"
  | "windowslice"
  | "wipeDown"
  | "wipeLeft"
  | "wipeRight"
  | "wipeUp"
