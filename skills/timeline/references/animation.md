# Animation (kind 7)

Attach with the visual item's `animationIds`. Supported properties are `opacity` and `transform`; Audio and containers do not have `animationIds`.

```json
{
  "id": 30,
  "kind": 7,
  "anims": {
    "opacity": {"terp": "linear", "track": [[0, 0], [500, 1], [2000, 1]]},
    "transform": {
      "terp": "linear",
      "track": {
        "position": {"x": [[0, 0], [2000, 200]], "y": []},
        "scale": {"x": [], "y": []},
        "rotation": []
      }
    }
  }
}
```

Each keyframe is `[timeMs, value]` in the owning item's local clock, independent of its media `start`. Author ascending times with no duplicate times per channel. Opacity normally ranges from 0 to 1. Transform units match Spatial: pixels, scale multipliers, degrees. Include all five transform channel arrays; empty position/rotation channels resolve to 0 and empty scale channels to 1.

`terp` is one of `linear`, `ease`, `easeIn`, `easeOut`, `bounce`, `catmullRom`. Both properties are optional within `anims`. Optional `enabled: false` bypasses the Animation.

Playback applies opacity only between that track's first and last key times, inclusive; outside all active opacity tracks the value is 1. Among active animations, the last opacity in `animationIds` wins. Transform animation is active while any channel is within its key range; active transforms compose in array order with the base Spatial rather than replacing it. Individual channels clamp to endpoint values while the transform is active. Extend keys across the needed interval to hold a final value.

When trimming or splitting animated content, preserve the intended mapping between original and new local time. Rebase keys and preserve values at edit boundaries as needed; copying `animationIds` blindly can restart animation, and changing shared keyframes changes other owners. This is separate from adjusting the source-media `start`.

Author effects such as fades or slides using these keyframes; there is no serialized preset field.
