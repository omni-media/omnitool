
import {TextStyleOptions} from "pixi.js"

import {O} from "./o.js"
import {Media} from "../parts/media.js"
import {TimelineFile} from "../parts/basics.js"
import {FilterAction} from "../parts/filters.js"
import {filters, FilterParams, FilterType} from "../parts/filters.js"
import {Crop, FilterableItem, Item, VisualAnimatableItem} from "../parts/item.js"
import {makeAnimationPresets, visualAnimations} from "../parts/animations/registry.js"
import {Anim, AnimateAction, Interpolation, Keyframes, TrackTransform, Transform, TransformOptions, Vec2, VisualAnimations} from "../types.js"

const transformFrom = (options: TransformOptions): Transform => [
	options.position ?? [0, 0],
	options.scale ?? [1, 1],
	options.rotation ?? 0,
]

const transformAnimation = (terp: Interpolation, source: Keyframes<Transform>): Anim<TrackTransform> => {
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

export type Build<T extends Item.Any = Item.Any> = (o: O) => T
type BuildVisualAnimateActions = {
	[TKey in keyof VisualAnimations]-?: BuildAnimateAction
}

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

export function sequence(...items: Build[]): Build<Item.Sequence> {
	return o => o.sequence(...items.map(item => item(o)))
}

export function stack(...items: Build[]): Build<Item.Stack> {
	return o => o.stack(...items.map(item => item(o)))
}

export function video(
	media: Media,
	options?: {
		start?: number,
		duration?: number
	}
): Build<Item.Video> {
	return o => o.video(media, options)
}

export function audio(
	media: Media,
	options?: {
		start?: number,
		duration?: number,
		gain?: number
	}
): Build<Item.Audio> {
	return o => o.audio(media, options)
}

export function text(
	content: string,
	options?: {
		duration?: number,
		styles?: TextStyleOptions
	}
): Build<Item.Text> {
	return o => o.text(content, options)
}

export function gap(duration: number): Build<Item.Gap> {
	return o => o.gap(duration)
}

export function spatial(transform?: Transform, crop?: Crop): Build<Item.Spatial> {
	return o => o.spatial(transform, crop)
}

export function animatedSpatial(anim: Anim<TrackTransform>, crop?: Crop): Build<Item.AnimatedSpatial> {
	return o => o.animatedSpatial(anim, crop)
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

	transform: transformAnimation,

	presets: makeAnimationPresets(
		(terp, track) => ({terp, track}),
		transformAnimation,
		transformFrom,
	),
}

interface BuildFilterAction<TFilter extends FilterType> {
	<T extends FilterableItem>(item: Build<T>, params?: FilterParams<TFilter>): Build<T>
	make(params?: FilterParams<TFilter>): Build<Item.Filter<TFilter>>
}

interface BuildAnimateAction {
	<T extends VisualAnimatableItem>(
		item: Build<T>,
		terp: Interpolation,
		track: Keyframes
	): Build<T>
	make(terp: Interpolation, track: Keyframes): Build<Item.Animation>
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

function makeAnimate(
	get: (o: O) => AnimateAction
): BuildAnimateAction {
	const action = (<T extends VisualAnimatableItem>(
		item: Build<T>,
		terp: Interpolation,
		track: Keyframes
	): Build<T> => o => get(o)(item(o), terp, track)) as BuildAnimateAction
	action.make = (terp: Interpolation, track: Keyframes) => o => get(o).make(terp, track)
	return action
}

function makeAnimateActions(): BuildVisualAnimateActions {
	const entries = Object.keys(visualAnimations)
		.map(key => [key, makeAnimate(o => o.animate[key as keyof VisualAnimations] as AnimateAction)])
	return Object.fromEntries(entries) as BuildVisualAnimateActions
}

export const animate = makeAnimateActions()

export function textStyle(style: TextStyleOptions): Build<Item.TextStyle> {
	return o => o.textStyle(style)
}

export const transition = {
	crossfade(duration: number): Build<Item.Transition> {
		return o => o.transition.crossfade(duration)
	}
}

