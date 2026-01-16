
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

	return o.sequence(
		o.stack(
			o.video(clip, {start: 0, duration: 3000}),
			caption
		),
		o.gap(400),
		xfade,
		o.video(clip, {start: 5000, duration: 2500}),
		o.audio(clip, {start: 5000, duration: 2500})
	)
})
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

## 🗺️ Roadmap
- Planned CLI commands (not available in this repo yet):

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
- server-side, not just browsers

