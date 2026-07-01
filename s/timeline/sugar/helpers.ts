
import {TextStyleOptions} from "pixi.js"

import {O} from "./o.js"
import {Media} from "../parts/media.js"
import {TimelineFile} from "../parts/basics.js"
import {FilterAction} from "../parts/filters.js"
import {TransitionName, transitions} from "../parts/transitions.js"
import {filters, FilterParams, FilterType} from "../parts/filters.js"
import {CaptionOptions, CaptionSourceItem} from "../parts/captions.js"
import {Transcription} from "../../features/speech/transcribe/types.js"
import {AnimationPreset, PresetOptions} from "../parts/animations/types.js"
import {Crop, FilterableItem, Item, ItemBase, VisualAnimatableItem} from "../parts/item.js"
import {animationPresets, visualAnimations} from "../parts/animations/registry.js"
import {Anim, AnimateAction, Interpolation, Keyframes, TrackTransform, Transform, Vec2, VisualAnimationInput, VisualAnimations} from "../types.js"

export type Build<T extends Item.Any = Item.Any> = (o: O) => T
type BuildVisualAnimateActions = {
	[TKey in keyof VisualAnimations]-?: BuildAnimateAction<TKey>
}
type BuildPresetAnimateActions = {
	[TKey in AnimationPreset]: BuildPresetAnimateAction
}
type BuildTransitionActions = {
	[TKey in TransitionName]: (duration: number, options?: ItemBase) => Build<Item.Transition>
}
type ContainerInput = [label: string, ...items: Build[]] | Build[]

function createTimeline(): TimelineFile {
	return {
		format: "timeline",
		info: "https://omniclip.app/",
		version: 0,
		items: [],
		rootId: 0
	}
}

export function timeline(root: Build): TimelineFile {
	const o = new O({timeline: createTimeline()})
	const item = root(o)
	o.timeline.rootId = item.id
	return o.timeline
}

export function sequence(...input: ContainerInput): Build<Item.Sequence> {
	const [first, ...rest] = input
	const label = typeof first === "string" ? first : undefined
	const items = (label ? rest : input) as Build[]
	return o => {
		const built = items.map(item => item(o))
		return label ? o.sequence(label, ...built) : o.sequence(...built)
	}
}

export function stack(...input: ContainerInput): Build<Item.Stack> {
	const [first, ...rest] = input
	const label = typeof first === "string" ? first : undefined
	const items = (label ? rest : input) as Build[]
	return o => {
		const built = items.map(item => item(o))
		return label ? o.stack(label, ...built) : o.stack(...built)
	}
}

export function video(
	media: Media,
	options?: {
		start?: number,
		duration?: number
		label?: string
		enabled?: boolean
	}
): Build<Item.Video> {
	return o => o.video(media, options)
}

export function image(
	media: Media,
	options?: {
		duration?: number
		label?: string
		enabled?: boolean
	}
): Build<Item.Image> {
	return o => o.image(media, options)
}

export function audio(
	media: Media,
	options?: {
		start?: number,
		duration?: number,
		gain?: number
		label?: string
		enabled?: boolean
	}
): Build<Item.Audio> {
	return o => o.audio(media, options)
}

export function text(
	content: string,
	options?: {
		duration?: number,
		styles?: TextStyleOptions
		label?: string
		enabled?: boolean
	}
): Build<Item.Text> {
	return o => o.text(content, options)
}

export function captions(
	item: Build<CaptionSourceItem>,
	transcript: Transcription,
	options?: CaptionOptions
): Build<Item.Stack> {
	return o => o.captions(item(o), transcript, options)
}

export function gap(duration: number, options?: ItemBase): Build<Item.Gap> {
	return o => o.gap(duration, options)
}

export function spatial(transform?: Transform, crop?: Crop): Build<Item.Spatial> {
	return o => o.spatial(transform, crop)
}

export const anim = {
	scalar(terp: Interpolation, track: Keyframes): Anim<Keyframes> {
		return {terp, track}
	},

	vec2(terp: Interpolation, source: Keyframes<Vec2>): Anim<{x: Keyframes, y: Keyframes}> {
		const track = {x: [] as Keyframes, y: [] as Keyframes}

		for (const [time, [x, y]] of source) {
			track.x.push([time, x])
			track.y.push([time, y])
		}

		return {terp, track}
	},

	transform: (terp: Interpolation, source: Keyframes<Transform>): Anim<TrackTransform> => {
		const track: TrackTransform = {
			position: {x: [], y: []},
			scale: {x: [], y: []},
			rotation: [],
		}

		for (const [time, [position, scale, rotation]] of source) {
			track.position.x.push([time, position[0]])
			track.position.y.push([time, position[1]])
			track.scale.x.push([time, scale[0]])
			track.scale.y.push([time, scale[1]])
			track.rotation.push([time, rotation])
		}

		return {terp, track}
	}
}

interface BuildFilterAction<TFilter extends FilterType> {
	<T extends FilterableItem>(item: Build<T>, params?: FilterParams<TFilter>): Build<T>
	make(params?: FilterParams<TFilter>): Build<Item.Filter<TFilter>>
}

interface BuildAnimateAction<TKey extends keyof VisualAnimations = keyof VisualAnimations> {
	<T extends VisualAnimatableItem>(
		item: Build<T>,
		terp: Interpolation,
		track: VisualAnimationInput<TKey>
	): Build<T>
	make(terp: Interpolation, track: VisualAnimationInput<TKey>): Build<Item.Animation>
}

interface BuildPresetAnimateAction {
	<T extends VisualAnimatableItem>(item: Build<T>, options?: PresetOptions): Build<T>
	make(options?: PresetOptions): Build<Item.Animation>
}

type BuildFilterActions = {
	[TName in keyof typeof filters]: BuildFilterAction<(typeof filters)[TName]["type"]>
}

function makeFilter<TFilter extends FilterType>(
	get: (o: O) => FilterAction<TFilter>
): BuildFilterAction<TFilter> {
	const action = (<T extends FilterableItem>(
		item: Build<T>,
		params?: FilterParams<TFilter>
	): Build<T> => o => get(o)(item(o), params)) as BuildFilterAction<TFilter>
	action.make = (params?: FilterParams<TFilter>) => o => get(o).make(params)
	return action
}

function makeFilters(): BuildFilterActions {
	const names = Object.keys(filters) as (keyof typeof filters)[]
	const entries = names.map(name => [
		name,
		makeFilter(o => o.filter[name] as FilterAction<any>)
	])
	return Object.fromEntries(entries) as BuildFilterActions
}

export const filter = makeFilters()

function makeAnimate<TKey extends keyof VisualAnimations>(
	get: (o: O) => AnimateAction<TKey>
): BuildAnimateAction<TKey> {
	const action = (<T extends VisualAnimatableItem>(
		item: Build<T>,
		terp: Interpolation,
		track: VisualAnimationInput<TKey>
	): Build<T> => o => get(o)(item(o), terp, track)) as BuildAnimateAction<TKey>
	action.make = (terp: Interpolation, track: VisualAnimationInput<TKey>) => o => get(o).make(terp, track)
	return action
}

function makeAnimateActions(): BuildVisualAnimateActions {
	const entries = Object.keys(visualAnimations)
		.map(key => [key, makeAnimate(o => o.animate[key as keyof VisualAnimations] as AnimateAction<any>)])
	return Object.fromEntries(entries) as BuildVisualAnimateActions
}

function makePresetAnimate(
	key: AnimationPreset
): BuildPresetAnimateAction {
	const action = (<T extends VisualAnimatableItem>(
		item: Build<T>,
		options?: PresetOptions
	): Build<T> => o => o.animate.presets[key](item(o), options)) as BuildPresetAnimateAction
	action.make = (options?: PresetOptions) => o => o.animate.presets[key].make(options)
	return action
}

function makePresetAnimateActions(): BuildPresetAnimateActions {
	const entries = Object.keys(animationPresets)
		.map(key => [key, makePresetAnimate(key as AnimationPreset)])
	return Object.fromEntries(entries) as BuildPresetAnimateActions
}

export const animate = {
	...makeAnimateActions(),
	presets: makePresetAnimateActions(),
}

export function textStyle(style: TextStyleOptions): Build<Item.TextStyle> {
	return o => o.textStyle(style)
}

function makeTransitionActions(): BuildTransitionActions {
	const entries = Object.keys(transitions)
		.map(key => [key, (duration: number, options?: ItemBase) => (o: O) => o.transition[key as TransitionName](duration, options)])
	return Object.fromEntries(entries) as BuildTransitionActions
}

export const transition = makeTransitionActions()
