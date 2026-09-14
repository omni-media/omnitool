# Captions (kind 11)

```json
{
  "id": 40,
  "kind": 11,
  "transcript": {
    "text": "Hello world.",
    "chunks": [
      {"text": "Hello", "timestamp": [0, 0.4]},
      {"text": "world.", "timestamp": [0.4, 1.2]}
    ]
  },
  "start": 0,
  "duration": 1500,
  "maxChars": 42,
  "maxDuration": 3500,
  "maxSilence": 750
}
```

`transcript.text` is the full text; `chunks` supplies ordered timed text, usually words. Chunk timestamps are finite `[start,end]` values in **seconds**. All Caption timing fields are **milliseconds**. Use supplied transcription data; do not present invented speech/timestamps as a transcription.

At caption-local time `t`, the renderer looks up transcript time `caption.start + t`. Chunks are grouped using optional `maxChars`, `maxDuration`, `maxSilence` (defaults shown above). The renderer displays grouped chunk text; editing only `transcript.text` does not change the displayed words.

Caption has optional `itemId` pointing to its source Video, Audio, or Clip. This is a relationship hint, not automatic timing synchronization. When editing source timing/placement, update corresponding caption timing/placement explicitly. Do not shift both transcript timestamps and `start` for the same trim.

Compose the caption and source in a Stack with caption first so text appears on top. `styleId`, `spatialId`, `animationIds`, `filterIds`, `label`, and `enabled` work as documented in the relevant references. JSON has no automatic caption preset styling: create the TextStyle and Spatial attachments when needed.

To find an existing related caption, inspect Caption items' `itemId`; core source items have no `captionId` field.
