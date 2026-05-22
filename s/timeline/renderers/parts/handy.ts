
import {ms, Ms} from '../../../units/ms.js'
import {Id, TimelineFile} from '../../parts/basics.js'
import {Keyframes, TransformAnimation} from '../../types.js'
import { SampleContext } from './samplers/visual/parts/types.js'
import {I6, Mat6, mul6, transformToMat6} from '../../utils/matrix.js'
import {ContainerItem, Item, Kind, PlayableItem} from '../../parts/item.js'
import {resolveScalarAnimation, resolveTransformAnimation} from '../../utils/anim.js'

function isPlayableItem(item: Item.Any): item is PlayableItem {
	return 'duration' in item
}

type WalkAtCallbacks = {
	sequence: (x: Item.Sequence, localTime: Ms, ancestors: AncestorAt[]) => void
	stack: (x: Item.Stack, localTime: Ms, ancestors: AncestorAt[]) => void
	video: (x: Item.Video, localTime: Ms, ancestors: AncestorAt[]) => void
	text: (x: Item.Text, localTime: Ms, ancestors: AncestorAt[]) => void
	caption: (x: Item.Caption, localTime: Ms, ancestors: AncestorAt[]) => void
	audio: (x: Item.Audio, localTime: Ms, ancestors: AncestorAt[]) => void
}

type WalkCallbacks = {
	sequence?: (x: Item.Sequence, matrix: Mat6, ancestors: AncestorAt[]) => void
	stack?: (x: Item.Stack, matrix: Mat6, ancestors: AncestorAt[]) => void
	video?: (x: Item.Video, matrix: Mat6, ancestors: AncestorAt[]) => void
	text?: (x: Item.Text, matrix: Mat6, ancestors: AncestorAt[]) => void
	caption?: (x: Item.Caption, matrix: Mat6, ancestors: AncestorAt[]) => void
	audio?: (x: Item.Audio) => void
}

interface Props {
	timeline: TimelineFile
	timecode: Ms
}

export interface AncestorAt {
	item: ContainerItem
	localTime: Ms
}

interface At {
	item: Item.Any
	localTime: Ms
	ancestors: AncestorAt[]
}

export function itemsAt(p: Props): At[] {
	const results: At[] = []
	const itemMap = new Map(p.timeline.items.map(item => [item.id, item]))

	walkAt(p.timeline.rootId, itemMap, p.timecode, {
		sequence: () => { },
		stack: () => { },
		video: (item, localTime, ancestors) => results.push({ item, localTime, ancestors }),
		text: (item, localTime, ancestors) => results.push({ item, localTime, ancestors }),
		caption: (item, localTime, ancestors) => results.push({ item, localTime, ancestors }),
		audio: (item, localTime, ancestors) => results.push({ item, localTime, ancestors })
	})

	return results
}

interface FromProps {
	timeline: TimelineFile
	from: Ms
}

export function itemsFrom(p: FromProps): At[] {
	const results: At[] = []
	const itemMap = new Map(p.timeline.items.map(item => [item.id, item]))

	walkFrom(p.timeline.rootId, itemMap, p.from, {
		sequence: () => { },
		stack: () => { },
		video: (item, localTime, ancestors) => results.push({ item, localTime, ancestors }),
		text: (item, localTime, ancestors) => results.push({ item, localTime, ancestors }),
		caption: (item, localTime, ancestors) => results.push({ item, localTime, ancestors }),
		audio: (item, localTime, ancestors) => results.push({ item, localTime, ancestors })
	})

	return results
}

export function computeWorldMatrix(
	items: Map<Id, Item.Any>,
	ancestors: AncestorAt[],
	item: Item.Any,
	localTime: Ms,
): Mat6 {
	let world = I6

	for (const ancestor of ancestors) {
		world = applySpatialIfAny(items, ancestor.item, world, ancestor.localTime)
	}

	return applySpatialIfAny(items, item, world, localTime)
}

function applySpatialIfAny(
	items: Map<Id, Item.Any>,
	item: Item.Any,
	parentMatrix: Mat6,
	time: Ms,
) {
	let matrix = parentMatrix
	if ("spatialId" in item && item.spatialId) {
		const spatial = items.get(item.spatialId) as Item.Spatial | undefined
		if (spatial?.enabled) {
			const local = transformToMat6(spatial.transform)
			matrix = mul6(local, matrix)
		}
	}

	if ("animationIds" in item && item.animationIds) {
		for (const id of item.animationIds) {
			const animation = items.get(id) as Item.Animation | undefined
			const anim = animation?.anims.transform
			if (animation?.enabled && anim && transformActiveAt(anim, time)) {
				const local = transformToMat6(resolveTransformAnimation(time, anim))
				matrix = mul6(local, matrix)
			}
		}
	}

	return matrix
}

export function walk(
	id: Id,
	items: Map<Id, Item.Any>,
	parentMatrix: Mat6,
	localTime: Ms,
	callbacks: WalkCallbacks,
	ancestors: AncestorAt[] = []
) {
	const item = items.get(id)
	if (!item) return

	const currentMatrix = applySpatialIfAny(items, item, parentMatrix, localTime)

	switch (item.kind) {
		case Kind.Stack:
			callbacks.stack?.(item, currentMatrix, ancestors)
			for (const childId of item.childrenIds) {
				walk(childId, items, currentMatrix, localTime, callbacks, [...ancestors, {item, localTime}])
			}
			break

		case Kind.Sequence: {
			callbacks.sequence?.(item, currentMatrix, ancestors)

			for (const childId of item.childrenIds) {
				const child = items.get(childId)

				if (!child)
					continue
				if (!isPlayableItem(child)) {
					continue
				}

				walk(
					childId,
					items,
					currentMatrix,
					localTime,
					callbacks,
					[...ancestors, {item, localTime}]
				)
			}

			break
		}

		case Kind.Video:
			callbacks.video?.(item, currentMatrix, ancestors)
			break

		case Kind.Text:
			callbacks.text?.(item, currentMatrix, ancestors)
			break

		case Kind.Caption:
			callbacks.caption?.(item, currentMatrix, ancestors)
			break

		case Kind.Audio:
			callbacks.audio?.(item)
			break
	}
}


function walkAt(
	id: Id,
	items: Map<Id, Item.Any>,
	time: Ms,
	callbacks: WalkAtCallbacks,
	ancestors: AncestorAt[] = []
) {
	const item = items.get(id)
	if (!item) return

	switch (item.kind) {
		case Kind.Stack:
			callbacks.stack(item, time, ancestors)
			for (const childId of item.childrenIds) {
				walkAt(childId, items, time, callbacks, [...ancestors, {item, localTime: time}])
			}
			break

		case Kind.Sequence: {
			callbacks.sequence(item, time, ancestors)

			let offset = ms(0)

			for (const childId of item.childrenIds) {
				const child = items.get(childId)

				if (!child)
					continue

				const duration = computeItemDurationFromMap(child.id, items)
				if (duration <= 0)
					continue

				if (time >= offset && time < offset + duration) {
					const localTime = ms(time - offset)
					walkAt(
						childId,
						items,
						localTime,
						callbacks,
						[...ancestors, {item, localTime: time}]
					)
					break
				}

				offset = ms(offset + duration)
			}

			break
		}

		case Kind.Video:
			callbacks.video(item, time, ancestors)
			break

		case Kind.Text:
			callbacks.text(item, time, ancestors)
			break

		case Kind.Caption:
			callbacks.caption(item, time, ancestors)
			break

		case Kind.Audio:
			callbacks.audio(item, time, ancestors)
			break
	}
}

function walkFrom(
	id: Id,
	items: Map<Id, Item.Any>,
	from: Ms,
	callbacks: WalkAtCallbacks,
	ancestors: AncestorAt[] = []
) {
	const item = items.get(id)
	if (!item) return

	switch (item.kind) {
		case Kind.Stack:
			callbacks.stack(item, from, ancestors)
			for (const childId of item.childrenIds) {
				walkFrom(childId, items, from, callbacks, [...ancestors, {item, localTime: from}])
			}
			break

		case Kind.Sequence: {
			callbacks.sequence(item, from, ancestors)

			let offset = ms(0)

			for (const childId of item.childrenIds) {
				const child = items.get(childId)

				if (!child)
					continue

				const duration = computeItemDurationFromMap(child.id, items)
				if (duration <= 0)
					continue

				const end = ms(offset + duration)
				if (from >= end) {
					offset = end
					continue
				}

				const localTime = ms(Math.max(0, from - offset))
				walkFrom(
					childId,
					items,
					localTime,
					callbacks,
					[...ancestors, {item, localTime: from}]
				)

				offset = end
			}

			break
		}

		case Kind.Video:
			callbacks.video(item, from, ancestors)
			break

		case Kind.Text:
			callbacks.text(item, from, ancestors)
			break

		case Kind.Caption:
			callbacks.caption(item, from, ancestors)
			break

		case Kind.Audio:
			callbacks.audio(item, from, ancestors)
			break
	}
}

export function computeItemDuration(
	id: number,
	timeline: TimelineFile
): Ms {
	return computeItemDurationFromMap(
		id,
		new Map(timeline.items.map(item => [item.id, item]))
	)
}

function computeItemDurationFromMap(
	id: number,
	items: Map<Id, Item.Any>
): Ms {
	const item = items.get(id)

	if (!item) return ms(0)

	switch (item.kind) {
		case Kind.Sequence: {
			const children = item.childrenIds
				.map(childId => items.get(childId))
				.filter(Boolean) as Item.Any[]

			let total = ms(0)

			for (let i = 0; i < children.length; i++) {
				const child = children[i]

				if (child.kind === Kind.Transition) {
					const prev = children[i - 1]
					const next = children[i + 1]

					if (prev && next && prev.kind !== Kind.Transition && next.kind !== Kind.Transition) {
						const prevDur = computeItemDurationFromMap(prev.id, items)
						const nextDur = computeItemDurationFromMap(next.id, items)
						const overlap = Math.max(0, Math.min(child.duration, prevDur, nextDur))

						total = ms(total - overlap)
					}
					continue
				}

				total = ms(total + computeItemDurationFromMap(child.id, items))
			}

			return total
		}

		case Kind.Stack: {
			let longest = ms(0)

			for (const childId of item.childrenIds) {
				const duration = computeItemDurationFromMap(childId, items)
				if (duration > longest) {
					longest = duration
				}
			}

			return longest
		}

		default: {
			if (!isPlayableItem(item))
				return ms(0)

			return item.duration
		}
	}
}

export function computeOpacity(
	ctx: SampleContext,
	item: Item.Any,
	time: Ms,
) {
	if (!("animationIds" in item) || item.animationIds === undefined)
		return 1

	let opacity = 1
	for (const id of item.animationIds) {
		const animation = ctx.items.get(id) as Item.Animation | undefined
		const anim = animation?.anims.opacity
		if (animation?.enabled && anim && keyframesActiveAt(anim.track, time))
			opacity = resolveScalarAnimation(time, anim)
	}
	return opacity
}

function keyframesActiveAt(keys: Keyframes, time: Ms) {
	if (keys.length === 0)
		return false

	let start = keys[0][0]
	let end = keys[0][0]
	for (const [keyTime] of keys) {
		start = Math.min(start, keyTime)
		end = Math.max(end, keyTime)
	}

	return time >= start && time <= end
}

function transformActiveAt(anim: TransformAnimation, time: Ms) {
	return (
		keyframesActiveAt(anim.track.position.x, time) ||
		keyframesActiveAt(anim.track.position.y, time) ||
		keyframesActiveAt(anim.track.scale.x, time) ||
		keyframesActiveAt(anim.track.scale.y, time) ||
		keyframesActiveAt(anim.track.rotation, time)
	)
}
