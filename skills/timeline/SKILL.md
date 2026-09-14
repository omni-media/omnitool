---
name: timeline
description: Create and edit Omnitool timeline JSON for downstream video editors and apps. Use for Omnitool composition, media timing, text, captions, transforms, animation, and effects; not for unrelated timeline formats.
---

# Omnitool timelines

Describes Omnitool timeline version `0`. Preserve the input version and app-specific fields. For another timeline version, verify changed behavior against the app's installed Omnitool types/implementation before using it. Exact transition and filter catalogs are bundled with their references.

## Editing

Create or edit raw timeline JSON. Use the host's supplied document or patch interface; JavaScript construction helpers are outside this skill's scope.

Inspect the supplied timeline and media inventory. Follow `rootId` and references to identify the requested content; `items` array order is not playback order. Make the requested edit using the model below, then check IDs, references, timing, and the resulting duration. Use the host app's validation/preview when available; valid JSON alone does not prove correct playback.

Two common edits have format-specific consequences:

- Removing a child ID from a Sequence is a ripple delete: later siblings move earlier. To preserve their times, replace the child with a same-duration Gap. Delete the removed object and its attachments only when nothing else references them.
- To split a Video, Audio, or Clip at local time `p` (`0 < p < duration`), replace it in its parent with two objects: the left keeps `start` and has `duration: p`; the right gets a fresh ID, `start: old.start + p`, and `duration: old.duration - p`. Preserve other fields, then clone or rebase animations/captions as their references describe.

Derive other edits from the composition and reference rules below. If the model cannot represent a requested behavior, report that limitation instead of inventing fields.

Read references for features affected by the edit, including existing attachments and neighboring transitions:

- Position, scale, rotation, crop, or nested transforms: [spatial.md](references/spatial.md).
- Text or caption styling: [text.md](references/text.md).
- Adding or changing filters: [filters.md](references/filters.md).
- Keyframes or editing animated items: [animation.md](references/animation.md).
- Captions or editing captioned media: [captions.md](references/captions.md).
- Adding/changing transitions, or trimming/reordering their neighbors: [transitions.md](references/transitions.md).

## Document and references

```json
{
  "format": "timeline",
  "info": "https://omniclip.app/",
  "version": 0,
  "rootId": 1,
  "items": [
    {"id": 1, "kind": 1, "childrenIds": [2, 3]},
    {"id": 2, "kind": 4, "content": "Hello", "duration": 1500},
    {"id": 3, "kind": 0, "childrenIds": [4, 5]},
    {"id": 4, "kind": 5, "duration": 500},
    {"id": 5, "kind": 4, "content": "World", "duration": 2000}
  ]
}
```

This lasts 2500 ms. `Hello` starts at 0; `World` starts at 500. Both have default styling/position, so `Hello` appears above `World` during their overlap.

- `items` is a flat array of objects with unique numeric `id` and numeric `kind`. `rootId` identifies the root content item, usually a Sequence or Stack.
- Existing numeric IDs are opaque identifiers. Copy them exactly; never recalculate, shorten, round, renumber, or substitute them. Use fresh positive integer IDs for new objects; avoid `0` for new references because some attachment lookups use truthiness. Reference targets must exist and have the appropriate kind; container ancestry must be acyclic.
- Structural links are `childrenIds`. Attachments are `spatialId` → Spatial, `animationIds` → Animation, `filterIds` → Filter, `styleId` → TextStyle. Attachments belong in `items`, not in `childrenIds`.
- Shared attachments affect every referencing item. Clone an attachment before changing it for only one owner. Use separate content objects/IDs for separately editable or simultaneously visible occurrences. Remove referenced objects only after accounting for all their users.
- Optional `enabled` defaults to true. Disabled content retains its duration; disabled containers suppress descendants. Content kinds accept optional `label`; labels do not identify objects uniquely.

## Content fields

Fields below are required unless marked `?`; all items also have `id`, `kind`. JSON stores numbers for kinds, not these names.

| Kind | Name | Fields beyond identity | Optional attachments |
| --- | --- | --- | --- |
| 0 | Sequence | `childrenIds: number[]` | `spatialId`, `filterIds` |
| 1 | Stack | `childrenIds: number[]` | `spatialId`, `filterIds` |
| 2 | Video (silent) | `mediaHash: string`, `start`, `duration` | `spatialId`, `animationIds`, `filterIds` |
| 3 | Audio | `mediaHash: string`, `start`, `duration`, `gain?` | — |
| 4 | Text | `content: string`, `duration` | `spatialId`, `animationIds`, `filterIds`, `styleId` |
| 5 | Gap | `duration` | — |
| 8 | Transition | `name: string`, `duration` | — |
| 11 | Caption | `transcript`, `start`, `duration`, `itemId?`, `maxChars?`, `maxDuration?`, `maxSilence?` | `spatialId`, `animationIds`, `filterIds`, `styleId` |
| 12 | Image | `mediaHash: string`, `duration` | `spatialId`, `animationIds`, `filterIds` |
| 13 | Clip (video and/or audio) | `mediaHash: string`, `start`, `duration`, `gain?` | `spatialId`, `animationIds`, `filterIds` |

Attachment kinds: `6` Spatial, `7` Animation, `9` TextStyle, `10` Filter. Their shapes are in the relevant references above.

## Timing and sound

- Times are milliseconds, except transcript chunk timestamps, which are seconds. Use finite, nonnegative `start` and `duration`. Content occupies `[0, duration)` in its local clock.
- `start` is a source-media trim offset (or transcript offset for captions), never timeline placement. At local time `t`, source time is `start + t`. Keep source intervals within known media bounds.
- Sequence children run consecutively in `childrenIds` order. Its duration is the sum of child durations, including gaps and transitions. Transitions add time; they do not automatically overlap or shorten neighboring clips.
- Stack children start together at local time 0. Its duration is the longest child; earlier children are visually on top. Nest a Sequence containing a Gap before content to delay that content in a Stack.
- Containers have computed duration; there are no core `tracks`, timeline-position, `end`, or per-item speed fields. Changing a child's duration shifts subsequent Sequence siblings. Disabling an item does not close its space.
- `mediaHash` refers to a resource supplied by the host app, not a filename or URL. Reuse supplied hashes; do not invent media identities or missing metadata. Timeline JSON does not contain the media files.
- Only Audio and Clip produce sound. Their `gain` is linear (default 1); `gain: 0` mutes a Clip while preserving its picture. `enabled: false` disables both picture and sound. Optional document-level `audio: {gain?: number, enabled?: boolean}` controls the whole mix. There is no core keyframed gain or container gain.
