
# 🚧 Work In Progress

> **Note:** Omni Tools is under development. Expect breaking changes, evolving APIs, and experimental features.

---

# 🎬 Omnitool

> Code-first video editing toolkit behind [Omniclip](https://omniclip.app) — build timelines, render videos, and automate workflows.

---

## 🧱 Modular by Design

Omni Tools is a collection of composable utilities for working with Omniclip timelines — via code, JSON, or CLI.

- ✅ Define timelines in JSON or TypeScript
- ✅ Automate rendering with CLI tools
- ✅ Ideal for scripting, CI/CD, and AI-generated workflows

---

## 🚀 Quick Start

### Install

```bash
npm install @omni/tools
```

---

## 📦 Example (Programmatic Timeline)

```ts
import { subtitle, crossfade, sequence, stack, video } from "@omni/tools"

const watermark = subtitle("omniclip")
const xfade = crossfade(500)

const timeline = sequence(
  video("opening-credits.mp4"),
  xfade,
  stack(
    video("skateboarding.mp4"),
    watermark
  ),
  xfade,
  stack(
    video("biking.mp4"),
    watermark
  )
)
	
```

---

## 🧩 Timeline Format (Omni Timeline Format)

Every timeline is defined as a graph:

```json
{
  "format": "omni-timeline@1",
  "root": "root-1",
  "items": [
    ["root-1", ["sequence", { "children": ["video-1", "stack-1"] }]],
    ["video-1", ["video", { ... }]],
    ["stack-1", ["stack", { "children": ["text-1", "audio-1"] }]],
    ["text-1", ["text", { ... }]],
    ["audio-1", ["audio", { ... }]]
  ]
}
```

Each item is a `[id, item]` pair. Items can reference others by ID, forming a directed graph of reusable, composable blocks.

---

## 🖥 CLI Usage

```bash
# Build a timeline (manually or via AI)
omnitool build-template promo.json

# Validate structure
omnitool validate promo.json

# Render video
omnitool export promo.json --output final.mp4

# Batch render
omnitool batch-export ./projects/* --output-dir ./exports
```

---

## ✅ Use Cases

- Render videos from scripts, templates, or AI
- Build and test timelines without opening the UI
- Generate video pipelines from code or prompts

---

## 📘 More to come

- `omnitool preview` – headless timeline viewer
- `omnitool optimize` – auto-fit timeline elements
- `omnitool ai` – native prompt-to-timeline generation

---

## 🧠 Learn More

Omni Tools powers AI agents, programmatic editing, and upcoming new version of omniclip video editor.

→ [Visit Omniclip](https://omniclip.app)
