import {hex} from "@e280/stz"
import {TextStyleOptions} from "pixi.js"

import {Media} from "../parts/media.js"
import {Id, TimelineFile} from "../parts/basics.js"
import {FilterAction, FilterActions} from "../parts/filters.js"
import {filters, FilterParams, FilterType} from "../parts/filters.js"
import {Transcription} from "../../features/speech/transcribe/types.js"
import {Crop, Effect, FilterableItem, Item, Kind, VisualAnimatableItem} from "../parts/item.js"
import {animationPresets, makeAnimationPresets, visualAnimations} from "../parts/animations/registry.js"
import {AnimationPreset, PresetAnimateAction, PresetAnimateActions, PresetAnimation, PresetOptions} from "../parts/animations/types.js"
import {CaptionAction, CaptionActions, captionDuration, CaptionOptions, CaptionPreset, captionPresets, CaptionSourceItem} from "../parts/captions.js"
import {Anim, AnimateAction, Interpolation, Keyframes, ScalarAnimation, TrackTransform, Transform, TransformAnimation, TransformOptions, Vec2, VisualAnimationInput, VisualAnimationValue, VisualAnimations} from "../types.js"

type VisualAnimateActions = {
	[TKey in keyof VisualAnimations]-?: AnimateAction<TKey>
}

export class O {
	constructor(public state: {timeline: TimelineFile}) {}

	require<T extends Item.Any>(id: Id | undefined) {
    if (id === undefined)
    	return undefined
    const item = this.state.timeline.items.find(item => item.id === id)
    return item as T | undefined
	}

	get timeline() {
		return this.state.timeline
	}

	getId() {
		return hex.toInteger(hex.random())
	}

  #mutate(fn: (project: TimelineFile) => TimelineFile) {
    this.state.timeline = fn(this.state.timeline)
  }

	register(item: Item.Any) {
		this.#mutate(state => ({
			...state,
			items: [...state.items, item]
		}))
	}

  textStyle = (style: TextStyleOptions): Item.TextStyle => {
		const item = {
			id: this.getId(),
			kind: Kind.TextStyle,
			style
		} as Item.TextStyle
		this.register(item)
		return item
  }

  spatial = (transform?: Transform, crop?: Crop): Item.Spatial => {
  	const item: Item.Spatial = {
  		id: this.getId(),
  		kind: Kind.Spatial,
  		transform: transform ?? this.transform(),
  		crop,
  		enabled: true
  	}
		this.register(item)
  	return item
  }

	#registerAnimation = (anims: VisualAnimations): Item.Animation => {
		const item: Item.Animation = {
			id: this.getId(),
			kind: Kind.Animation,
			anims,
			enabled: true
		}
		this.register(item)
		return item
	}

	#attachAnimation = <T extends VisualAnimatableItem>(item: T, animation: Item.Animation): T => {
		const next = {
			...item,
			animationIds: [...(item.animationIds ?? []), animation.id]
		}
		this.set<T>(item.id, next as Partial<T>)
		return next
	}

	anim = {
		scalar: (terp: Interpolation, track: Keyframes): Anim<Keyframes> => ({terp, track}),

		vec2: (terp: Interpolation, source: Keyframes<Vec2>) => {
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
		},
	}

	#animationPresets = makeAnimationPresets(
		(terp, track) => ({terp, track}),
		(terp, source) => this.anim.transform(terp, source),
		options => this.transform(options),
	)

	#makeFilter = <TFilter extends FilterType>(type: TFilter) => {
		const make = (params?: FilterParams<TFilter>) => {
			const item: Item.Filter<TFilter> = {
				id: this.getId(),
				kind: Kind.Filter,
				type,
				params,
				enabled: true
			}
			this.register(item)
			return item
		}

		const action = (<T extends FilterableItem>(item: T, params?: FilterParams<TFilter>): T => {
			const filter = make(params)
			const next = {
				...item,
				filterIds: [...(item.filterIds ?? []), filter.id]
			}
			this.set<T>(item.id, next as Partial<T>)
			return next
		}) as FilterAction<TFilter>

		action.make = make
		return action
	}

	#makeFilters = (): FilterActions => {
		const entries = Object.entries(filters)
			.map(([name, filter]) => [name, this.#makeFilter(filter.type)])
		return Object.fromEntries(entries) as FilterActions
	}

	filter = this.#makeFilters()

	#makeAnimationValue = <TKey extends keyof VisualAnimations>(
		key: TKey,
		terp: Interpolation,
		track: VisualAnimationInput<TKey>
	): VisualAnimationValue<TKey> =>
		(
			key === "transform"
				? this.anim.transform(terp, track as Keyframes<Transform>)
				: this.anim.scalar(terp, track as Keyframes)
		) as VisualAnimationValue<TKey>

	#makeAnimate = <TKey extends keyof VisualAnimations>(key: TKey): AnimateAction<TKey> => {
		const make = (terp: Interpolation, track: VisualAnimationInput<TKey>) =>
			this.#registerAnimation({
				[key]: this.#makeAnimationValue(key, terp, track)
			} as Pick<VisualAnimations, TKey>)

		const action = (<T extends VisualAnimatableItem>(
			item: T,
			terp: Interpolation,
			track: VisualAnimationInput<TKey>
		): T => {
			const animation = make(terp, track)
			return this.#attachAnimation(item, animation)
		}) as AnimateAction<TKey>

		action.make = make
		return action
	}

	#makePresetAnimate = <TKey extends AnimationPreset>(key: TKey): PresetAnimateAction => {
		const make = (options?: PresetOptions) => {
			const preset = animationPresets[key]
			const anim = this.#animationPresets[key](options as never) as PresetAnimation
			return this.#registerAnimation(
				preset.type === "motion"
					? {transform: anim as TransformAnimation}
					: {opacity: anim as ScalarAnimation}
			)
		}

		const action = (<T extends VisualAnimatableItem>(item: T, options?: PresetOptions): T => {
			const animation = make(options)
			return this.#attachAnimation(item, animation)
		}) as PresetAnimateAction

		action.make = make
		return action
	}

	#makeAnimateActions = (): VisualAnimateActions => {
		const entries = Object.keys(visualAnimations)
			.map(key => [key, this.#makeAnimate(key as keyof VisualAnimations)])
		return Object.fromEntries(entries) as VisualAnimateActions
	}

	#makePresetAnimateActions = (): PresetAnimateActions => {
		const entries = Object.keys(animationPresets)
			.map(key => [key, this.#makePresetAnimate(key as AnimationPreset)])
		return Object.fromEntries(entries) as PresetAnimateActions
	}

	animate = {
		...this.#makeAnimateActions(),
		presets: this.#makePresetAnimateActions(),
	}

	sequence = (...items: Item.Any[]): Item.Sequence => {
		const item =  {
			id: this.getId(),
			kind: Kind.Sequence,
			childrenIds: items.map(item => item.id)
		} as Item.Sequence
		this.register(item)
		return item
	}

	stack = (...items: Item.Any[]): Item.Stack => {
		const item = {
			kind: Kind.Stack,
			id: this.getId(),
			childrenIds: items.map(item => item.id)
		} as Item.Stack
		this.register(item)
		return item
	}

	video = (
		media: Media,
		options?: {
			start?: number,
			duration?: number
		}): Item.Video => {

		if(!media.hasVideo)
			throw new Error(`Video clip error: media "${media.datafile.filename}" has no video track.`)

		const item: Item.Video = {
			kind: Kind.Video,
			id: this.getId(),
			mediaHash: media.datafile.checksum.hash,
			start: options?.start ?? 0,
			duration: options?.duration ?? media.duration
		}
		this.register(item)
		return item
	}

	audio = (
		media: Media,
		options?: {
			start?: number,
			duration?: number,
			gain?: number
		}): Item.Audio => {

		if(!media.hasAudio)
			throw new Error(`Audio clip error: media "${media.datafile.filename}" has no audio track.`)

		const item: Item.Audio = {
			kind: Kind.Audio,
			id: this.getId(),
			mediaHash: media.datafile.checksum.hash,
			start: options?.start ?? 0,
			duration: options?.duration ?? media.duration,
			gain: options?.gain ?? 1
		}
		this.register(item)
		return item
	}

	text = (content: string, options?: {
			duration?: number,
			styles?: TextStyleOptions
		}): Item.Text => {

		const item = {
			id: this.getId(),
			content,
			kind: Kind.Text,
			duration: options?.duration ?? 2000
		} as Item.Text

		if(options?.styles)
			item.styleId = this.textStyle(options.styles).id

		this.register(item)
		return item
	}

	#makeCaption = (
		transcript: Transcription,
		preset: CaptionPreset,
		options?: CaptionOptions,
	): Item.Caption => {
		const start = options?.start ?? 0
		const duration = options?.duration ?? Math.max(0, captionDuration(transcript, options) - start)
		const item: Item.Caption = {
			id: this.getId(),
			kind: Kind.Caption,
			transcript,
			start,
			duration,
			maxChars: options?.maxChars,
			maxDuration: options?.maxDuration,
			maxSilence: options?.maxSilence,
		}

		item.styleId = this.textStyle(options?.styles ?? preset.styles).id
		item.spatialId = this.spatial(this.transform(preset.transform)).id

		this.register(item)
		return item
	}

	#makeCaptionAction = (preset: CaptionPreset): CaptionAction => {
		const make = (transcript: Transcription, options?: CaptionOptions) =>
			this.#makeCaption(transcript, preset, options)

		const action = ((item: CaptionSourceItem, transcript: Transcription, options?: CaptionOptions): Item.Stack => {
			const caption = make(transcript, {
				...options,
				start: options?.start ?? item.start,
				duration: options?.duration ?? item.duration,
			})
			this.set<CaptionSourceItem>(item.id, {captionId: caption.id})
			return this.stack(caption, item)
		}) as CaptionAction

		action.make = make
		return action
	}

	#makeCaptionPresetActions = () => {
		const entries = Object.entries(captionPresets)
			.map(([name, preset]) => [name, this.#makeCaptionAction(preset)])
		return Object.fromEntries(entries) as CaptionActions["presets"]
	}

	captions = Object.assign(
		this.#makeCaptionAction(captionPresets.default),
		{presets: this.#makeCaptionPresetActions()}
	) as CaptionActions

	gap = (duration: number): Item.Gap => {
		const item = {
			id: this.getId(),
			kind: Kind.Gap,
			duration
		} as Item.Gap
		this.register(item)
		return item
	}

	transition = {
		crossfade: (duration: number): Item.Transition => {
			const item = {
				id: this.getId(),
				kind: Kind.Transition,
				effect: Effect.Crossfade,
				duration,
			} as Item.Transition
			this.register(item)
			return item
		},
	}

  transform = (options?: TransformOptions): Transform => {
    const position: Vec2 = [
    	options?.position?.[0] ?? 0,
    	options?.position?.[1] ?? 0
    ]
    const scale: Vec2 = [
    	options?.scale?.[0] ?? 1,
    	options?.scale?.[1] ?? 1
    ]
    const rotation = options?.rotation ?? 0
    return [position, scale, rotation]
  }

  addChildren(parent: Item.Stack | Item.Sequence, ...items: Item.Any[]) {
		this.#mutate(state => {
			const parentItem = state.items.find(({id}) => id === parent.id) as Item.Stack
			parentItem.childrenIds.push(...items.map(item => item.id))
			return state
		})
  }

	set = <K extends Item.Any>(
		id: Id,
		partial: Partial<K>
	) => {
		this.#mutate(project => ({
			...project,
			items: project.items.map(item =>
				item.id === id
					? { ...item, ...partial }
					: item
			)
		}))
	}
}

