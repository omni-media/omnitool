import {
	AlphaFilter,
	BlurFilter,
	ColorMatrixFilter,
	NoiseFilter,
	Filter,
} from "pixi.js"
import * as PixiFilters from "pixi-filters"

import type {FilterType} from "../../timeline/parts/filters.js"

type FilterConstructor = new (options?: any) => Filter

const pixiFilters: Partial<Record<FilterType, FilterConstructor>> = {
	AlphaFilter,
	BlurFilter,
	ColorMatrixFilter,
	NoiseFilter,
	...PixiFilters
}

export function findPixiFilter(type: FilterType) {
	return pixiFilters[type]
}
