
import {TextStyleOptions} from "pixi.js"

import {O} from "./o.js"
import {Media} from "../parts/media.js"
import {TimelineFile} from "../parts/basics.js"
import {FilterAction} from "../parts/filters.js"
import {filters, FilterParams, FilterType} from "../parts/filters.js"
import {Crop, FilterableItem, Item, VisualAnimatableItem} from "../parts/item.js"
import {Anim, Interpolation, Keyframes, TrackTransform, Transform, Vec2} from "../types.js"

export type Build<T extends Item.Any = Item.Any> = (o: O) => T

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

	transform(terp: Interpolation, source: Keyframes<Transform>): Anim<TrackTransform> {
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
	},
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

interface RuntimeAnimateAction {
	<T extends VisualAnimatableItem>(
		item: T,
		terp: Interpolation,
		track: Keyframes
	): T
	make(terp: Interpolation, track: Keyframes): Item.Animation
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
	get: (o: O) => RuntimeAnimateAction
): BuildAnimateAction {
	const action = (<T extends VisualAnimatableItem>(
		item: Build<T>,
		terp: Interpolation,
		track: Keyframes
	): Build<T> => o => get(o)(item(o), terp, track)) as BuildAnimateAction
	action.make = (terp: Interpolation, track: Keyframes) => o => get(o).make(terp, track)
	return action
}

export const animate = {
	opacity: makeAnimate(o => o.animate.opacity as RuntimeAnimateAction),
}

export function textStyle(style: TextStyleOptions): Build<Item.TextStyle> {
	return o => o.textStyle(style)
}

export const transition = {
	crossfade(duration: number): Build<Item.Transition> {
		return o => o.transition.crossfade(duration)
	}
}

