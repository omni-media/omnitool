
import {ms, Ms} from '../../../units/ms.js'
import {Id, TimelineFile} from '../../parts/basics.js'
import {I6, Mat6, mul6, transformToMat6} from '../../utils/matrix.js'
import {ContainerItem, Item, Kind, PlayableItem} from '../../parts/item.js'

function isPlayableItem(item: Item.Any): item is PlayableItem {
	return 'duration' in item
}

type WalkAtCallbacks = {
	sequence: (x: Item.Sequence, localTime: Ms, ancestors: ContainerItem[]) => void
	stack: (x: Item.Stack, localTime: Ms, ancestors: ContainerItem[]) => void
	video: (x: Item.Video, localTime: Ms, ancestors: ContainerItem[]) => void
	text: (x: Item.Text, localTime: Ms, ancestors: ContainerItem[]) => void
	audio: (x: Item.Audio, localTime: Ms, ancestors: ContainerItem[]) => void
}

type WalkCallbacks = {
	sequence?: (x: Item.Sequence, matrix: Mat6, ancestors: ContainerItem[]) => void
	stack?: (x: Item.Stack, matrix: Mat6, ancestors: ContainerItem[]) => void
	video?: (x: Item.Video, matrix: Mat6, ancestors: ContainerItem[]) => void
	text?: (x: Item.Text, matrix: Mat6, ancestors: ContainerItem[]) => void
	audio?: (x: Item.Audio) => void
}

interface Props {
	timeline: TimelineFile
	timecode: Ms
}

interface At {
	item: Item.Any
	localTime: Ms
	ancestors: ContainerItem[]
}

export function itemsAt(p: Props): At[] {
	const results: At[] = []
	const itemMap = new Map(p.timeline.items.map(item => [item.id, item]))

	walkAt(p.timeline.rootId, itemMap, p.timecode, {
		sequence: () => { },
		stack: () => { },
		video: (item, localTime, ancestors) => results.push({ item, localTime, ancestors }),
		text: (item, localTime, ancestors) => results.push({ item, localTime, ancestors }),
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
		audio: (item, localTime, ancestors) => results.push({ item, localTime, ancestors })
	})

	return results
}

export function computeWorldMatrix(
	items: Map<Id, Item.Any>,
	ancestors: ContainerItem[],
	item: Item.Any
): Mat6 {
	let world = I6

	for (const ancestor of ancestors) {
		world = applySpatialIfAny(items, ancestor, world)
	}

	return applySpatialIfAny(items, item, world)
}

function applySpatialIfAny(
	items: Map<Id, Item.Any>,
	item: Item.Any,
	parentMatrix: Mat6
) {
	if ("spatialId" in item && item.spatialId) {
		const spatial = items.get(item.spatialId) as Item.Spatial | undefined
		if (spatial?.enabled) {
			const local = transformToMat6(spatial.transform)
			return mul6(local, parentMatrix)
		}
	}
	return parentMatrix
}

export function walk(
	id: Id,
	items: Map<Id, Item.Any>,
	parentMatrix: Mat6,
	callbacks: WalkCallbacks,
	ancestors: ContainerItem[] = []
) {
	const item = items.get(id)
	if (!item) return

	let currentMatrix = parentMatrix

	if ("spatialId" in item && item.spatialId) {
		const spatial = items.get(item.spatialId) as Item.Spatial
		if (spatial.enabled) {
			const local = transformToMat6(spatial.transform)
			currentMatrix = mul6(local, currentMatrix)
		}
	}

	switch (item.kind) {
		case Kind.Stack:
			callbacks.stack?.(item, currentMatrix, ancestors)
			for (const childId of item.childrenIds) {
				walk(childId, items, currentMatrix, callbacks, [...ancestors, item])
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
					callbacks,
					[...ancestors, item]
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
	ancestors: ContainerItem[] = []
) {
	const item = items.get(id)
	if (!item) return

	switch (item.kind) {
		case Kind.Stack:
			callbacks.stack(item, time, ancestors)
			for (const childId of item.childrenIds) {
				walkAt(childId, items, time, callbacks, [...ancestors, item])
			}
			break

		case Kind.Sequence: {
			callbacks.sequence(item, time, ancestors)

			let offset = ms(0)

			for (const childId of item.childrenIds) {
				const child = items.get(childId)

				if (!child)
					continue
				if (!isPlayableItem(child)) {
					continue
				}

				if (time >= offset && time < offset + child.duration) {
					const localTime = ms(time - offset)
					walkAt(
						childId,
						items,
						localTime,
						callbacks,
						[...ancestors, item]
					)
					break
				}

				offset = ms(offset + child.duration)
			}

			break
		}

		case Kind.Video:
			callbacks.video(item, time, ancestors)
			break

		case Kind.Text:
			callbacks.text(item, time, ancestors)
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
	ancestors: ContainerItem[] = []
) {
	const item = items.get(id)
	if (!item) return

	switch (item.kind) {
		case Kind.Stack:
			callbacks.stack(item, from, ancestors)
			for (const childId of item.childrenIds) {
				walkFrom(childId, items, from, callbacks, [...ancestors, item])
			}
			break

		case Kind.Sequence: {
			callbacks.sequence(item, from, ancestors)

			let offset = ms(0)

			for (const childId of item.childrenIds) {
				const child = items.get(childId)

				if (!child)
					continue
				if (!isPlayableItem(child)) {
					continue
				}

				const end = ms(offset + child.duration)
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
					[...ancestors, item]
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

		case Kind.Audio:
			callbacks.audio(item, from, ancestors)
			break
	}
}

export function computeTimelineDuration(
	id: number,
	timeline: TimelineFile
): Ms {
	const item = timeline.items
		.find(item => item.id === id)

	if (!item) return ms(0)

	switch (item.kind) {
		case Kind.Sequence: {
			const children = item.childrenIds
				.map(childId => timeline.items.find(x => x.id === childId))
				.filter(Boolean) as Item.Any[]

			let total = ms(0)

			for (let i = 0; i < children.length; i++) {
				const child = children[i]

				if (child.kind === Kind.Transition)
					continue

				const next = children[i + 1]
				const nextNext = children[i + 2]

				if (next?.kind === Kind.Transition && nextNext && nextNext.kind !== Kind.Transition) {
					const outgoingDur = computeTimelineDuration(child.id, timeline)
					const incomingDur = computeTimelineDuration(nextNext.id, timeline)
					const overlap = Math.max(
						0,
						Math.min(next.duration, outgoingDur, incomingDur)
					)
					total = ms(total + outgoingDur + incomingDur - overlap)
					i += 2
					continue
				}

				total = ms(total + computeTimelineDuration(child.id, timeline))
			}

			return total
		}

		case Kind.Stack: {
			let longest = ms(0)

			for (const childId of item.childrenIds) {
				const duration = computeTimelineDuration(childId, timeline)
				if (duration > longest)
					longest = duration
			}

			return longest
		}

		default:
			// audio / video / text
			return isPlayableItem(item) ? item.duration : ms(0)
	}
}

