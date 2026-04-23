import type {
	AlphaFilterOptions,
	BlurFilterOptions,
	ColorMatrix,
	FilterOptions as PixiFilterOptions,
	NoiseFilterOptions,
	Point,
} from "pixi.js"
import type * as PixiFilters from "pixi-filters"
import {FilterableItem, Item} from "./item.js"

export type PixelateFilterOptions = {size?: number | number[] | Point}
export type EmbossFilterOptions = {strength?: number}

export type ChoiceOptions = string[] | Record<string, string | number> | number[]

export type ChoiceFilterProperty = {
	type: "choice"
	options: ChoiceOptions
	default: string | number
}

export type NumericFilterProperty = {
	type: "number"
	min: number
	max: number
	default: number
	step?: number
}

export type ColorFilterProperty = {
	type: "color"
	default: string
}

export type BooleanFilterProperty = {
	type: "boolean"
	default: boolean
}

export type ObjectFilterProperty = {
	type: "object"
	properties: Record<string, FilterPropertyConfig>
}

export type ArrayFilterProperty = {
	type: "array"
	items: FilterPropertyConfig[]
}

export type FilterPropertyConfig =
	| NumericFilterProperty
	| ColorFilterProperty
	| BooleanFilterProperty
	| ChoiceFilterProperty
	| ObjectFilterProperty
	| ArrayFilterProperty

export interface FilterSchema {
	[property: string]: FilterPropertyConfig
}

export type SchemaFromOptions<T> = {
	[K in keyof Required<T>]?: FilterPropertyConfig
}

type FilterDefinition<TType extends string, TParams> = {
	type: TType
	schema: SchemaFromOptions<TParams>
	_params?: TParams
}

const num =(
	min: number,
	max: number,
	defaultValue: number,
	step?: number,
): NumericFilterProperty => ({
	type: "number",
	min,
	max,
	default: defaultValue,
	...(step === undefined ? {} : {step}),
})

const color =(defaultValue: string): ColorFilterProperty => ({
	type: "color",
	default: defaultValue,
})

const bool =(defaultValue: boolean): BooleanFilterProperty => ({
	type: "boolean",
	default: defaultValue,
})

const choice =(
	options: ChoiceOptions,
	defaultValue: string | number,
): ChoiceFilterProperty => ({
	type: "choice",
	options,
	default: defaultValue,
})

const object =(properties: Record<string, FilterPropertyConfig>): ObjectFilterProperty => ({
	type: "object",
	properties,
})

const array =(items: FilterPropertyConfig[]): ArrayFilterProperty => ({
	type: "array",
	items,
})

const kernelSizes = [3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25]
const glitchFillModes = {
	TRANSPARENT: 0,
	ORIGINAL: 1,
	LOOP: 2,
	CLAMP: 3,
	MIRROR: 4,
} as const

const defineFilter = <TParams>() =>
	<TType extends string>(
		type: TType,
		schema: SchemaFromOptions<TParams> = {},
	): FilterDefinition<TType, TParams> => ({type, schema})

export const filters = {
	adjustment: defineFilter<PixiFilters.AdjustmentFilterOptions>()("AdjustmentFilter", {
		gamma: num(0, 5, 1),
		saturation: num(0, 5, 1),
		contrast: num(0, 5, 1),
		brightness: num(0, 5, 1),
		red: num(0, 5, 1),
		green: num(0, 5, 1),
		blue: num(0, 5, 1),
		alpha: num(0, 1, 1, 0.01),
	}),
	advancedBloom: defineFilter<PixiFilters.AdvancedBloomFilterOptions>()("AdvancedBloomFilter", {
		threshold: num(0.1, 0.9, 0.5, 0.01),
		bloomScale: num(0.5, 1.5, 1, 0.01),
		brightness: num(0.5, 1.5, 1, 0.01),
		blur: num(0, 20, 8, 0.1),
		quality: num(1, 20, 4, 1),
	}),
	alpha: defineFilter<AlphaFilterOptions>()("AlphaFilter", {
		alpha: num(0, 1, 1, 0.01),
	}),
	ascii: defineFilter<PixiFilters.AsciiFilterOptions>()("AsciiFilter", {
		size: num(2, 20, 8, 1),
		color: color("#ffffff"),
		replaceColor: bool(false),
	}),
	backdropBlur: defineFilter<BlurFilterOptions>()("BackdropBlurFilter", {
		strength: num(0, 100, 8, 0.1),
		quality: num(1, 10, 4, 1),
	}),
	bevel: defineFilter<PixiFilters.BevelFilterOptions>()("BevelFilter", {
		rotation: num(0, 360, 45, 1),
		thickness: num(0, 10, 2, 0.1),
		lightColor: color("#ffffff"),
		lightAlpha: num(0, 1, 0.7, 0.01),
		shadowColor: color("#000000"),
		shadowAlpha: num(0, 1, 0.7, 0.01),
	}),
	bloom: defineFilter<PixiFilters.BloomFilterOptions>()("BloomFilter", {
		strength: object({
			x: num(0, 20, 2, 0.1),
			y: num(0, 20, 2, 0.1),
		}),
		quality: num(1, 20, 4, 1),
		resolution: num(0.25, 4, 1, 0.01),
		kernelSize: choice([5, 7, 9, 11, 13, 15], 5),
	}),
	blur: defineFilter<BlurFilterOptions>()("BlurFilter", {
		strength: num(0, 100, 8, 0.1),
		quality: num(1, 10, 4, 1),
	}),
	bulgePinch: defineFilter<PixiFilters.BulgePinchFilterOptions>()("BulgePinchFilter", {
		radius: num(0, 1000, 100, 1),
		strength: num(-1, 1, 1, 0.01),
		center: object({
			x: num(0, 1, 0.5, 0.01),
			y: num(0, 1, 0.5, 0.01),
		}),
	}),
	colorGradient: defineFilter<PixiFilters.ColorGradientFilterOptions | PixiFilters.ColorGradientFilterCSSOptions>()("ColorGradientFilter"),
	colorMatrix: defineFilter<PixiFilterOptions & {matrix?: ColorMatrix}>()("ColorMatrixFilter"),
	colorOverlay: defineFilter<PixiFilters.ColorOverlayFilterOptions>()("ColorOverlayFilter", {
		color: color("#ff0000"),
		alpha: num(0, 1, 0.5, 0.01),
	}),
	colorReplace: defineFilter<PixiFilters.ColorReplaceFilterOptions>()("ColorReplaceFilter", {
		originalColor: color("#ff0000"),
		targetColor: color("#000000"),
		tolerance: num(0, 1, 0.4, 0.01),
	}),
	convolution: defineFilter<PixiFilters.ConvolutionFilterOptions>()("ConvolutionFilter", {
		width: num(0, 500, 300, 1),
		height: num(0, 500, 300, 1),
		matrix: array([
			num(0, 1, 0),
			num(0, 1, 0.5, 0.01),
			num(0, 1, 0),
			num(0, 1, 0.5, 0.01),
			num(0, 1, 1, 0.01),
			num(0, 1, 0.5, 0.01),
			num(0, 1, 0),
			num(0, 1, 0.5, 0.01),
			num(0, 1, 0),
		]),
	}),
	crossHatch: defineFilter<{}>()("CrossHatchFilter"),
	crt: defineFilter<PixiFilters.CRTFilterOptions>()("CRTFilter", {
		curvature: num(0, 10, 1, 0.01),
		lineWidth: num(0, 5, 3, 0.01),
		lineContrast: num(0, 1, 0.3, 0.01),
		verticalLine: bool(false),
		noise: num(0, 1, 0.2, 0.01),
		noiseSize: num(1, 10, 1, 0.1),
		vignetting: num(0, 1, 0.3, 0.01),
		vignettingAlpha: num(0, 1, 1, 0.01),
		vignettingBlur: num(0, 1, 0.3, 0.01),
		seed: num(0, 1, 0, 0.01),
		time: num(0.5, 20, 0.5, 0.01),
	}),
	dot: defineFilter<PixiFilters.DotFilterOptions>()("DotFilter", {
		scale: num(0.3, 1, 1, 0.01),
		angle: num(0, 5, 5, 0.01),
		grayscale: bool(true),
	}),
	dropShadow: defineFilter<PixiFilters.DropShadowFilterOptions>()("DropShadowFilter", {
		blur: num(0, 20, 2, 0.1),
		quality: num(1, 20, 3, 1),
		alpha: num(0, 1, 0.5, 0.01),
		offset: object({
			x: num(-50, 50, 4, 1),
			y: num(-50, 50, 4, 1),
		}),
		color: color("#000000"),
		shadowOnly: bool(false),
	}),
	emboss: defineFilter<EmbossFilterOptions>()("EmbossFilter", {
		strength: num(0, 20, 5, 0.1),
	}),
	glitch: defineFilter<PixiFilters.GlitchFilterOptions>()("GlitchFilter", {
		slices: num(0, 64, 5, 1),
		seed: num(0, 1, 0.5, 0.01),
		offset: num(-400, 400, 100, 1),
		direction: num(-180, 180, 0, 1),
		fillMode: choice(glitchFillModes, "LOOP"),
		average: bool(false),
		minSize: num(0, 64, 8, 1),
		sampleSize: num(1, 2048, 512, 1),
		red: object({
			x: num(-50, 50, 2, 1),
			y: num(-50, 50, 2, 1),
		}),
		blue: object({
			x: num(-50, 50, 10, 1),
			y: num(-50, 50, -4, 1),
		}),
		green: object({
			x: num(-50, 50, -10, 1),
			y: num(-50, 50, 4, 1),
		}),
	}),
	glow: defineFilter<PixiFilters.GlowFilterOptions>()("GlowFilter", {
		distance: num(0, 20, 15, 0.1),
		innerStrength: num(0, 20, 0, 0.1),
		outerStrength: num(0, 20, 2, 0.1),
		color: color("#ffffff"),
		quality: num(0, 1, 0.2, 0.01),
		alpha: num(0, 1, 1, 0.01),
		knockout: bool(false),
	}),
	godray: defineFilter<PixiFilters.GodrayFilterOptions>()("GodrayFilter", {
		time: num(0, 1, 0, 0.01),
		gain: num(0, 1, 0.6, 0.01),
		lacunarity: num(0, 5, 2.75, 0.01),
		alpha: num(0, 1, 1, 0.01),
		parallel: bool(true),
		angle: num(-60, 60, 30, 1),
		center: object({
			x: num(-100, 2012, 956, 1),
			y: num(-1000, -100, -100, 1),
		}),
	}),
	grayscale: defineFilter<{}>()("GrayscaleFilter"),
	hslAdjustment: defineFilter<PixiFilters.HslAdjustmentFilterOptions>()("HslAdjustmentFilter", {
		hue: num(-180, 180, 0, 1),
		saturation: num(-1, 1, 0, 0.01),
		lightness: num(-1, 1, 0, 0.01),
		colorize: bool(false),
		alpha: num(0, 1, 1, 0.01),
	}),
	kawaseBlur: defineFilter<PixiFilters.KawaseBlurFilterOptions>()("KawaseBlurFilter", {
		strength: num(0, 20, 4, 0.1),
		quality: num(1, 20, 3, 1),
		pixelSize: object({
			x: num(0, 10, 1, 0.1),
			y: num(0, 10, 1, 0.1),
		}),
	}),
	motionBlur: defineFilter<PixiFilters.MotionBlurFilterOptions>()("MotionBlurFilter", {
		velocity: object({
			x: num(-90, 90, 40, 1),
			y: num(-90, 90, 40, 1),
		}),
		kernelSize: choice(kernelSizes, 15),
		offset: num(-150, 150, 0, 1),
	}),
	multiColorReplace: defineFilter<PixiFilters.MultiColorReplaceFilterOptions>()("MultiColorReplaceFilter"),
	noise: defineFilter<NoiseFilterOptions>()("NoiseFilter", {
		noise: num(0, 1, 0.5, 0.01),
		seed: num(0.01, 10, 0.5, 0.01),
	}),
	oldFilm: defineFilter<PixiFilters.OldFilmFilterOptions>()("OldFilmFilter", {
		sepia: num(0, 1, 0.3, 0.01),
		noise: num(0, 1, 0.3, 0.01),
		noiseSize: num(1, 10, 1, 0.1),
		scratch: num(-1, 1, 0.5, 0.01),
		scratchDensity: num(0, 1, 0.3, 0.01),
		scratchWidth: num(1, 20, 1, 0.1),
		vignetting: num(0, 1, 0.3, 0.01),
		vignettingAlpha: num(0, 1, 1, 0.01),
		vignettingBlur: num(0, 1, 0.3, 0.01),
	}),
	outline: defineFilter<PixiFilters.OutlineFilterOptions>()("OutlineFilter", {
		thickness: num(0, 10, 4, 0.1),
		color: color("#000000"),
		alpha: num(0, 1, 1, 0.01),
		knockout: bool(false),
	}),
	pixelate: defineFilter<PixelateFilterOptions>()("PixelateFilter", {
		size: object({
			x: num(4, 40, 10, 1),
			y: num(4, 40, 10, 1),
		}),
	}),
	radialBlur: defineFilter<PixiFilters.RadialBlurFilterOptions>()("RadialBlurFilter", {
		angle: num(-180, 180, 20, 1),
		radius: num(-1, 1912, 300, 1),
		center: object({
			x: num(0, 1912, 956, 1),
			y: num(0, 920, 460, 1),
		}),
		kernelSize: choice(kernelSizes, 15),
	}),
	reflection: defineFilter<PixiFilters.ReflectionFilterOptions>()("ReflectionFilter", {
		mirror: bool(true),
		boundary: num(0, 1, 0.5, 0.01),
		amplitude: object({
			start: num(0, 50, 0, 0.1),
			end: num(0, 50, 20, 0.1),
		}),
		waveLength: object({
			start: num(10, 200, 30, 1),
			end: num(10, 200, 100, 1),
		}),
		alpha: object({
			start: num(0, 1, 1, 0.01),
			end: num(0, 1, 1, 0.01),
		}),
		time: num(0, 20, 0, 0.01),
	}),
	rgbSplit: defineFilter<PixiFilters.RGBSplitFilterOptions>()("RGBSplitFilter", {
		red: object({
			x: num(-20, 20, -10, 1),
			y: num(-20, 20, 0, 1),
		}),
		blue: object({
			x: num(-20, 20, 0, 1),
			y: num(-20, 20, 0, 1),
		}),
		green: object({
			x: num(-20, 20, 0, 1),
			y: num(-20, 20, 10, 1),
		}),
	}),
	shockwave: defineFilter<PixiFilters.ShockwaveFilterOptions>()("ShockwaveFilter", {
		speed: num(500, 2000, 500, 1),
		amplitude: num(1, 100, 30, 1),
		wavelength: num(2, 400, 160, 1),
		brightness: num(0.2, 2, 1, 0.01),
		radius: num(100, 2000, -1, 1),
		center: object({
			x: num(0, 1912, 956, 1),
			y: num(0, 920, 460, 1),
		}),
	}),
	simplexNoise: defineFilter<PixiFilters.SimplexNoiseFilterOptions>()("SimplexNoiseFilter", {
		strength: num(0, 1, 0.5, 0.01),
		noiseScale: num(0, 50, 10, 0.1),
		offsetX: num(0, 5, 0, 0.01),
		offsetY: num(0, 5, 0, 0.01),
		offsetZ: num(0, 5, 0, 0.01),
		step: num(-1, 1, -1, 0.01),
	}),
	tiltShift: defineFilter<PixiFilters.TiltShiftFilterOptions>()("TiltShiftFilter", {
		blur: num(0, 200, 100, 0.1),
		gradientBlur: num(0, 1000, 600, 1),
		start: object({
			x: num(0, 1912, 0, 1),
			y: num(0, 920, 460, 1),
		}),
		end: object({
			x: num(0, 1912, 1912, 1),
			y: num(0, 920, 460, 1),
		}),
	}),
	twist: defineFilter<Partial<PixiFilters.TwistFilterOptions>>()("TwistFilter", {
		angle: num(-10, 10, 4, 0.01),
		radius: num(0, 1912, 200, 1),
		offset: object({
			x: num(0, 1912, 956, 1),
			y: num(0, 920, 460, 1),
		}),
	}),
	zoomBlur: defineFilter<PixiFilters.ZoomBlurFilterOptions>()("ZoomBlurFilter", {
		strength: num(0.01, 0.5, 0.1, 0.01),
		center: object({
			x: num(0, 1912, 956, 1),
			y: num(0, 920, 460, 1),
		}),
		innerRadius: num(0, 956, 80, 1),
		radius: num(0, 956, -1, 1),
	}),
} as const

type FilterDefinitions = typeof filters
type FilterDefinitionParams<T> =
	T extends FilterDefinition<string, infer TParams>
		? TParams
		: never

export type FilterOptions = {
	[TName in keyof FilterDefinitions as FilterDefinitions[TName]["type"]]:
		FilterDefinitionParams<FilterDefinitions[TName]>
}

export type FilterType = FilterDefinitions[keyof FilterDefinitions]["type"]
export type FilterParams<T extends FilterType = FilterType> = FilterOptions[T]

export interface FilterAction<TFilter extends FilterType> {
	<T extends FilterableItem>(item: T, params?: FilterParams<TFilter>): T
	make(params?: FilterParams<TFilter>): Item.Filter<TFilter>
}
export type FilterActions = {
	[TName in keyof typeof filters]: FilterAction<(typeof filters)[TName]["type"]>
}
