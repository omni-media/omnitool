import type {Item, ItemMeta} from "./item.js"

export const transitionNames = [
	"Bounce",
	"BowTieHorizontal",
	"BowTieVertical",
	"ButterflyWaveScrawler",
	"CircleCrop",
	"ColourDistance",
	"CrazyParametricFun",
	"CrossZoom",
	"Directional",
	"DoomScreenTransition",
	"Dreamy",
	"DreamyZoom",
	"GlitchDisplace",
	"GlitchMemories",
	"GridFlip",
	"InvertedPageCurl",
	"LinearBlur",
	"Mosaic",
	"PolkaDotsCurtain",
	"Radial",
	"SimpleZoom",
	"StereoViewer",
	"Swirl",
	"WaterDrop",
	"ZoomInCircles",
	"angular",
	"burn",
	"cannabisleaf",
	"circle",
	"circleopen",
	"colorphase",
	"crosshatch",
	"crosswarp",
	"cube",
	"directionalwarp",
	"directionalwipe",
	"displacement",
	"doorway",
	"fade",
	"fadecolor",
	"fadegrayscale",
	"flyeye",
	"heart",
	"hexagonalize",
	"kaleidoscope",
	"luma",
	"luminance_melt",
	"morph",
	"multiply_blend",
	"perlin",
	"pinwheel",
	"pixelize",
	"polar_function",
	"randomsquares",
	"ripple",
	"rotate_scale_fade",
	"squareswire",
	"squeeze",
	"swap",
	"undulatingBurnOut",
	"wind",
	"windowblinds",
	"windowslice",
	"wipeDown",
	"wipeLeft",
	"wipeRight",
	"wipeUp",
] as const

export type TransitionName = typeof transitionNames[number]

export type Transition = {
	name: TransitionName
	label: string
}

export interface TransitionAction {
	(duration: number, options?: ItemMeta): Item.Transition
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
