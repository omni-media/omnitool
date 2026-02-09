
import {ms, Ms} from '../../../../units/ms.js'
import {Id, TimelineFile} from '../../basics.js'
import {ContainerItem, Item, Kind, PlayableItem} from '../../item.js'
import {I6, Mat6, mul6, transformToMat6} from '../../../utils/matrix.js'

function isPlayableItem(item: Item.Any): item is PlayableItem {
	return 'duration' in item
}

type WalkAtCallbacks = {
	sequence: (x: Item.Sequence, localTime: Ms, matrix: Mat6, ancestors: ContainerItem[]) => void
	stack: (x: Item.Stack, localTime: Ms, matrix: Mat6, ancestors: ContainerItem[]) => void
	video: (x: Item.Video, localTime: Ms, matrix: Mat6, ancestors: ContainerItem[]) => void
	text: (x: Item.Text, localTime: Ms, matrix: Mat6, ancestors: ContainerItem[]) => void
	audio: (x: Item.Audio, localTime: Ms) => void
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
	matrix: Mat6
}

export function itemsAt(p: Props): At[] {
	const results: At[] = []
	const itemMap = new Map(p.timeline.items.map(item => [item.id, item]))

	walkAt(p.timeline.rootId, itemMap, p.timecode, I6, {
		sequence: () => { },
		stack: () => { },
		video: (item, localTime, matrix) => results.push({ item, localTime, matrix }),
		text: (item, localTime, matrix) => results.push({ item, localTime, matrix }),
		audio: (item, localTime) => results.push({ item, localTime, matrix: I6 })
	})

	return results
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
	parentMatrix: Mat6,
	callbacks: WalkAtCallbacks,
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
			callbacks.stack(item, time, currentMatrix, ancestors)
			for (const childId of item.childrenIds) {
				walkAt(childId, items, time, currentMatrix, callbacks, [...ancestors, item])
			}
			break

		case Kind.Sequence: {
			callbacks.sequence(item, time, currentMatrix, ancestors)

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
						currentMatrix,
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
			callbacks.video(item, time, currentMatrix, ancestors)
			break

		case Kind.Text:
			callbacks.text(item, time, currentMatrix, ancestors)
			break

		case Kind.Audio:
			callbacks.audio(item, time)
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
			let total = ms(0)

			for (const childId of item.childrenIds) {
				total = ms(total + computeTimelineDuration(childId, timeline))
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

