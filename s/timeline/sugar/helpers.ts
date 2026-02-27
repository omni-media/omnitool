
import {TextStyleOptions} from "pixi.js"

import {O} from "./o.js"
import {Item} from "../parts/item.js"
import {Transform} from "../types.js"
import {Media} from "../parts/media.js"
import {TimelineFile} from "../parts/basics.js"

type Build<T extends Item.Any = Item.Any> = (o: O) => T

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
	const o = new O(createTimeline())
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

export function spatial(transform: Transform): Build<Item.Spatial> {
	return o => o.spatial(transform)
}

export function textStyle(style: TextStyleOptions): Build<Item.TextStyle> {
	return o => o.textStyle(style)
}

export const transition = {
	crossfade(duration: number): Build<Item.Transition> {
		return o => o.transition.crossfade(duration)
	}
}

