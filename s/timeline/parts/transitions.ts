import type {Item, ItemBase} from "./item.js"

export const transitionNames = [
	"AdvancedMosaic",
	"BlockDissolve",
	"BookFlip",
	"Bounce",
	"BowTieHorizontal",
	"BowTieVertical",
	"BowTieWithParameter",
	"Box",
	"ButterflyWaveScrawler",
	"CircleCrop",
	"ColourDistance",
	"CrazyParametricFun",
	"CrossZoom",
	"DefocusBlur",
	"Directional",
	"DirectionalScaled",
	"DoomScreenTransition",
	"Dreamy",
	"DreamyZoom",
	"Drop_Zone_Flicker",
	"EdgeTransition",
	"FilmBurn",
	"Fold",
	"GlitchDisplace",
	"GlitchMemories",
	"GridFlip",
	"HSVfade",
	"HorizontalClose",
	"HorizontalOpen",
	"InvertedPageCurl",
	"LeftRight",
	"LinearBlur",
	"Mosaic",
	"Overexposure",
	"PolkaDotsCurtain",
	"PuzzleRight",
	"Radial",
	"Rectangle",
	"RectangleCrop",
	"Revolve_Left",
	"Rolls",
	"RotateScaleVanish",
	"SimpleFlip",
	"SimpleZoom",
	"SimpleZoomOut",
	"Slides",
	"StarWipe",
	"StaticFade",
	"StereoViewer",
	"StripDatamoshGlitch",
	"Swirl",
	"TVStatic",
	"TilesWave",
	"TopBottom",
	"VerticalClose",
	"VerticalOpen",
	"WaterDrop",
	"ZoomInCircles",
	"ZoomLeftWipe",
	"ZoomRigthWipe",
	"angular",
	"burn",
	"burn0",
	"cannabisleaf",
	"chessboard",
	"circle",
	"circleopen",
	"colorphase",
	"coord-from-in",
	"crosshatch",
	"crosswarp",
	"cube",
	"directional-easing",
	"directionalwarp",
	"directionalwipe",
	"displacement",
	"dissolve",
	"doorway",
	"fade",
	"fadecolor",
	"fadegrayscale",
	"flyeye",
	"fragment",
	"heart",
	"hexagonalize",
	"kaleidoscope",
	"luma",
	"luminance_melt",
	"morph",
	"mosaic_transition",
	"multiply_blend",
	"old_tv_lost_signal",
	"parametric_glitch",
	"perlin",
	"pinwheel",
	"pixelize",
	"polar_function",
	"powerKaleido",
	"randomNoisex",
	"randomsquares",
	"ripple",
	"rotateTransition",
	"rotate_scale_fade",
	"scale-in",
	"splitSlideInHorizontal",
	"splitSlideInOutHorizontal",
	"splitSlideInOutVertical",
	"splitSlideInVertical",
	"splitSlideOutHorizontal",
	"splitSlideOutVertical",
	"squareswire",
	"squeeze",
	"static_wipe",
	"swap",
	"tangentMotionBlur",
	"undulatingBurnOut",
	"wind",
	"windowblinds",
	"windowslice",
	"wipeDown",
	"wipeLeft",
	"wipeRight",
	"wipeUp",
	"x_axis_translation",
	"zoomInOut",
] as const

export type TransitionName = typeof transitionNames[number]

export type Transition = {
	name: TransitionName
	label: string
}

export interface TransitionAction {
	(duration: number, options?: ItemBase): Item.Transition
}

export type TransitionActions = {
	[TName in TransitionName]: TransitionAction
}

export const transitionRegistry = Object.fromEntries(
	transitionNames.map(name => [name, {
		name,
		label: labelizeTransitionName(name),
	}])
) as Record<TransitionName, Transition>

export const transitions = transitionRegistry

function labelizeTransitionName(name: string) {
	return name
		.replace(/_/g, " ")
		.replace(/([a-z])([A-Z])/g, "$1 $2")
		.replace(/\b\w/g, letter => letter.toUpperCase())
}
