
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

## 💬 Captions

Captions render transcript data as timed, styled text.
The transcript can come from anywhere, as long as it follows the structure.

```ts
const transcript = {
	text: "Hello world. This is a caption.",
	chunks: [
		{text: "Hello", timestamp: [0, 0.4]},
		{text: "world.", timestamp: [0.4, 1.2]},
		{text: "This", timestamp: [1.3, 1.6]},
		{text: "is", timestamp: [1.6, 1.8]},
		{text: "a", timestamp: [1.8, 1.9]},
		{text: "caption.", timestamp: [1.9, 2.6]},
	],
}

const timeline = omni.timeline(o => {
	const video = o.video(clip, {duration: 3000})
	return o.captions(video, transcript)
})
```

Use a caption preset to pick a built-in caption style:

```ts
const timeline = omni.timeline(o => {
	const video = o.video(clip, {duration: 3000})
	return o.captions.presets.default(video, transcript)
})
```

or do your own styled captions:

```ts
const timeline = omni.timeline(o => {
	const video = o.video(clip, {duration: 3000})
	return o.captions(video, transcript, {
		styles: {
			fontFamily: "Inter",
			fontSize: 64,
			fill: "#fff7d6",
			stroke: {color: "#111111", width: 8},
			align: "center",
		},
	})
})
```

Use omnitool's built in speech-to-text with default model:

```ts
import {makeTranscriber, defaultTranscriberSpec} from "@omnimedia/omnitool"

// uses onnx-community/whisper-tiny_timestamped
const transcriber = await makeTranscriber({
	driver,
	spec: defaultTranscriberSpec(),
	workerUrl: new URL("/features/speech/transcribe/worker.bundle.min.js", import.meta.url),
	onLoading: loading => console.log("loading", loading),
})

const transcript = await transcriber.transcribe({
	source: file,
	language: "english",
	onReport: report => console.log("report", report),
	onTranscription: text => console.log("transcribing", text),
})

const timeline = omni.timeline(o => {
	const video = o.video(clip)
	return o.captions(video, transcript)
})
```

Load a custom speech-to-text model:

```ts
const transcriber = await makeTranscriber({
	driver,
	spec: {
	  model: "onnx-community/whisper-tiny_timestamped",
	  dtype: "q4",
	  device: "wasm",
	  chunkLength: 20,
	  strideLength: 3
	},
	workerUrl: new URL("/features/speech/transcribe/worker.bundle.min.js", import.meta.url),
	onLoading: loading => console.log("loading", loading),
})
```

> [!IMPORTANT]
> Use a Transformers.js-compatible speech-to-text model, for example `onnx-community/*_timestamped`.
> The model must support word-level timestamps because captions use `return_timestamps: "word"`.
> `device` and `dtype` are passed to Transformers.js and depend on your runtime/model.
> Browser usage commonly uses `"wasm"` or `"webgpu"`. `"webgpu"` for speed, `"wasm"` for more device support
> `workerUrl` depends on where you host the worker bundle.

`o.captions(video, transcript, options)` creates captions for a video or audio.
`o.captions` uses `captionPresets.default` preset.
use `o.captions.presets` to choose from available pre-styled captions.
pass `styles` in options to override preset styles.
transcript chunk timestamps are in seconds.

Update caption options after creation:

```ts
const caption = o.captions.make(transcript, {maxChars: 42})
const style = o.textStyle({fill: "#00ff00"})
o.set(caption.id, {
	maxChars: 32,
	styleId: style.id,
})
```

Caption options:
`styles` - sets styles, it overrides the preset's styles.
`start` - transcript time where captions begin, in milliseconds.
`duration` - caption layer duration, in milliseconds.
`maxChars` - maximum characters in one generated caption line.
`maxDuration` - maximum duration of one generated caption line, in milliseconds.
`maxSilence` - maximum silence allowed inside one caption; longer pauses start a new caption, in milliseconds.

import `captionPresets` to list available caption looks.

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
		rotation: 12
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

Animations:

```ts
const timeline = omni.timeline(o => {
	const fadeIn = o.animate.opacity.make("easeIn", [
		[0, 0],
		[700, 1],
	])
	const slideOut = o.animate.transform.make("linear", [
		[0, o.transform({position: [0, 0]})],
		[1000, o.transform({position: [400, 0]})],
	])

	const title = o.text("Lower third", {
		duration: 2000,
		styles: {fill: "white", fontSize: 36}
	})
	o.set(title.id, {animationIds: [fadeIn.id, slideOut.id]})

	return o.stack(
		o.video(clip, {duration: 4000}),
		title
	)
})
```

Built-in transform animations:

```ts
const animOut = {
	duration: 500,
	offset: item.duration - 500,
}
const slideIn = o.animate.presets.slideIn.make()
const slideOut = o.animate.presets.slideOut.make(animOut)
const spinIn = o.animate.presets.spinIn.make()
const spinOut = o.animate.presets.spinOut.make(animOut)
const zoomIn = o.animate.presets.zoomIn.make()
const zoomOut = o.animate.presets.zoomOut.make(animOut)
const bounceIn = o.animate.presets.bounceIn.make()
const bounceOut = o.animate.presets.bounceOut.make(animOut)
```

Built-in scalar animations:

```ts
const fadeIn = o.animate.presets.fadeIn.make()
const fadeOut = o.animate.presets.fadeOut.make(animOut)
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
	o.set(title.id, {animationIds: [fadeIn.id]})

	return o.stack(
		o.video(clip, {duration: 4000}),
		title
	)
})
```

Animation metadata:

```ts
import {animatableProperties, animationPresets} from "@omnimedia/omnitool"

Object.entries(animatableProperties).forEach(([property, meta]) => {
	console.log(property, meta.type, meta.defaultTerp, meta.channels)
	// transform transform linear [...]
	// opacity scalar linear [...]
})

Object.entries(animationPresets).forEach(([preset, meta]) => {
	console.log(preset, meta.type, meta.label, meta.defaults)
	// slideIn motion Slide in {...}
	// slideOut motion Slide out {...}
	// spinIn motion Spin in {...}
	// spinOut motion Spin out {...}
	// zoomIn motion Zoom in {...}
	// zoomOut motion Zoom out {...}
	// bounceIn motion Bounce in {...}
	// bounceOut motion Bounce out {...}
	// fadeIn scalar Fade in {...}
	// fadeOut scalar Fade out {...}
})
```

Animatable properties describe what can be keyframed, such as `transform` and `opacity`.
Animation presets describe built-in recipes, such as `slideIn` and `fadeIn`.
Use `animationPresets` to list available recipes, and `o.animate.presets` to create animation items.
Use `o.animate` to create or apply animation items.

Preset options:
- `duration` sets the animation duration, defaulting to `700`.
- `offset` shifts generated keyframes in item-local time.
  Useful for out animations: `item.duration - 500` starts `slideOut` 500ms before the item ends.
- `from` sets the start value, like opacity `0` or position `[-400, 0]`.
- `to` sets the end value, like opacity `1` or position `[0, 0]`.
- `terp` sets interpolation, defaulting to the preset's `terp`.

Utils:

```ts
import {resolveScalarAnimation, resolveTransformAnimation} from "@omnimedia/omnitool"

const transform = resolveTransformAnimation(localTime, transformAnimation)
const opacity = resolveScalarAnimation(localTime, opacityAnimation)
```

`resolveTransformAnimation` resolves an animated transform at the given local time.
`resolveScalarAnimation` resolves an animated scalar value at the given local time.
`localTime` is time relative to the item being resolved.
`clamp` is the default and currently only extrapolation mode, holding the first or last keyframe value outside the authored range.

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
await player.play()
player.playbackRate = 0.5 // slow motion
player.playbackRate = -1 // reverse
```

Notes:
- Call `await player.update(timeline)` if you update the timeline.
- `playbackRate` supports slower, faster, and reverse visual playback. Audio currently plays only at `1`.

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
- 7 `Animation`
- 8 `Transition`
- 9 `TextStyle`
- 10 `Filter`
- 11 `Caption`

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
