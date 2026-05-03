
# 🚧 Work In Progress

> **Note:** Omnitool is under development. Expect breaking changes, evolving APIs, and experimental features.

---

## ✅ What this library is

- API for building and rendering timelines in the browser
- Uses WebCodecs, Web Workers, and the File System Access API for export
- usage is currently JavaScript/TypeScript only, cli soon

## 🚀 Install

```bash
npm i @omnimedia/omnitool
```

## 📦 Quick Start

#### Declaring the timeline

```ts
import {Driver, Omni, Datafile} from "@omnimedia/omnitool"

const driver = await Driver.setup()
const omni = new Omni(driver)

const {clip} = await omni.load({
	clip: Datafile.make(file) // file is a File or Blob
})

const timeline = omni.timeline(o => {
	const caption = o.text("Hello world", {
		duration: 1500,
		styles: {fill: "white", fontSize: 48}
	})
	const xfade = o.transition.crossfade(500)
	const softened = o.filter.blur.make({strength: 8, quality: 4})

	return o.sequence(
		o.stack(
			o.video(clip, {start: 0, duration: 3000, filterIds: [softened.id]}),
			caption
		),
		o.gap(400),
		xfade,
		o.video(clip, {start: 5000, duration: 2500}),
		o.audio(clip, {start: 5000, duration: 2500})
	)
})
```

Declarative helper style (no explicit `o` in timeline declarations):

```ts
import {
	Driver, Omni, Datafile,
	timeline, stack, video, audio, text, gap, transition, filter
} from "@omnimedia/omnitool"

const driver = await Driver.setup()
const omni = new Omni(driver)
const {clip} = await omni.load({clip: Datafile.make(file)})

const timeline = timeline(
	stack(
		filter.blur(
			video(clip, {start: 0, duration: 3000}),
			{strength: 8, quality: 4}
		),
		text("Hello world", {duration: 1500}),
	),
	gap(400),
	transition.crossfade(500),
	video(clip, {start: 5000, duration: 2500}),
	audio(clip, {start: 5000, duration: 2500})
)
```

## 🎛 Filters

Filter application:

```ts
const timeline = omni.timeline(o =>
	o.stack(
		o.filter.blur(
			o.video(clip, {duration: 3000}),
			{strength: 8, quality: 4}
		),
		o.filter.glow(
			o.text("Hello world", {duration: 3000}),
			{distance: 12, outerStrength: 2, color: "#ffffff"}
		)
	)
)
```

Reusable filter items:

```ts
const timeline = omni.timeline(o => {
	const blur = o.filter.blur.make({strength: 8, quality: 4})

	return o.stack(
		o.video(clip, {duration: 3000, filterIds: [blur.id]}),
		o.text("Caption", {duration: 3000, styles: {fill: "white"}})
	)
})
```

Filter metadata for UI:

```ts
import {
	filters
} from "@omnimedia/omnitool"

const available = Object.entries(filters)
const blur = filters.blur
const schema = blur.schema
```

## 🧭 Spatial Transforms

```ts
const timeline = omni.timeline(o => {
	const move = o.spatial(o.transform({
		position: [120, 40],
		scale: [0.6, 0.6],
		rotation: 0.2
	}))

	const title = o.text("Lower third", {
		duration: 2000,
		styles: {fill: "white", fontSize: 36}
	})
	o.set(title.id, {spatialId: move.id})

	return o.stack(
		o.video(clip, {duration: 4000}),
		title
	)
})
```

Animated spatial transforms:

```ts
const timeline = omni.timeline(o => {
	const slideIn = o.animatedSpatial(
		o.anim.transform("linear", [
			[0, o.transform({position: [-400, 0]})],
			[1000, o.transform({position: [0, 0]})],
		])
	)

	const title = o.text("Lower third", {
		duration: 2000,
		styles: {fill: "white", fontSize: 36}
	})
	o.set(title.id, {spatialId: slideIn.id})

	return o.stack(
		o.video(clip, {duration: 4000}),
		title
	)
})
```

Animation application:

```ts
const timeline = omni.timeline(o => {
	const title = o.animate.opacity(
		o.text("Lower third", {
			duration: 2000,
			styles: {fill: "white", fontSize: 36},
		}),
		"easeIn",
		[
			[0, 0],
			[700, 1],
		]
	)

	return o.stack(
		o.video(clip, {duration: 4000}),
		title
	)
})
```

Reusable animation:

```ts
const timeline = omni.timeline(o => {
	const fadeIn = o.animate.opacity.make("easeIn", [
		[0, 0],
		[700, 1],
	])

	const title = o.text("Lower third", {
		duration: 2000,
		styles: {fill: "white", fontSize: 36},
	})
	o.set(title.id, {animationId: fadeIn.id})

	return o.stack(
		o.video(clip, {duration: 4000}),
		title
	)
})
```

Animation registry:

```ts
import {animations} from "@omnimedia/omnitool"

Object.entries(animations).forEach(([property, meta]) => {
	console.log(property, meta.type, meta.defaultTerp, meta.channels)
	// transform transform linear [...]
	// opacity scalar linear [...]
})
```

Each animation definition describes the semantic shape of the animation: its value kind, default interpolation, and numeric channels with defaults and units. This is useful for tools that need to create valid keyframes without hardcoding Omnitool's track layout.

Utils:

```ts
import {resolveTransform} from "@omnimedia/omnitool"

const transform = resolveTransform(spatial, localTime)
```

`resolveTransform` gets a spatial item's current transform. It returns the static transform for `Item.Spatial`, or resolves the animated transform for `Item.AnimatedSpatial` at the given local time.

Worker URL notes:
- `Driver.setup()` defaults to `/node_modules/@omnimedia/omnitool/x/driver/driver.worker.bundle.min.js`.
- If you serve the worker from a different location, pass `workerUrl`:

```ts
const workerUrl = new URL(
	"/path/to/driver.worker.bundle.min.js",
	window.location.href
)
const driver = await Driver.setup({workerUrl})
```

## ▶️ Playback

```ts
const player = await omni.playback(timeline)

document.body.appendChild(player.canvas)
player.play()
```

Notes:
- Call `player.update(timeline)` if you update the timeline.

## 📤 Export

```ts
await omni.render(timeline, framerate)
```

## 🧩 Timeline Format (TimelineFile)

All durations and timestamps are in milliseconds.

```json
{
	"format": "timeline",
	"info": "https://omniclip.app/",
	"version": 0,
	"rootId": 123,
	"items": [
		{"id": 123, "kind": 0, "childrenIds": [456, 789]},
		{"id": 456, "kind": 2, "mediaHash": "...", "start": 0, "duration": 3000},
		{"id": 789, "kind": 4, "content": "Hello", "duration": 1500}
	]
}
```

Timeline items:
- 0 `Sequence`
- 1 `Stack`
- 2 `Video`
- 3 `Audio`
- 4 `Text`
- 5 `Gap`
- 6 `Spatial`
- 7 `Transition`
- 8 `TextStyle`
- 9 `Filter`

## 🗺️ Roadmap
- CLI commands:

```bash
# build a reusable template from a timeline
omnitool build-template promo.json
# validate a timeline file
omnitool validate promo.json
# export a timeline to a video file
omnitool export promo.json --output final.mp4
# batch export multiple timelines
omnitool batch-export ./projects/* --output-dir ./exports
# headless timeline viewer
omnitool preview promo.json
# auto-fit timeline elements
omnitool optimize promo.json
# prompt-to-timeline generation
omnitool ai "make a 15s promo for tea"
```

- smooth seeking
- keyframes
- custom filters, likely via driver-side registration with timeline sugar such as:

```ts
// Register custom filter
driver.registerFilter({
	type: "vhs",
	make: params => new Filter(/* ... */),
	schema: {
		intensity: {type: "number", min: 0, max: 1, default: 0.5},
		scanlines: {type: "boolean", default: true},
	},
})

// Use custom filter
const timeline = omni.timeline(o =>
	o.filter.custom(
		"vhs",
		o.video(clip, {duration: 3000}),
		{intensity: 0.8}
	)
)
```

- server-side, not just browsers
