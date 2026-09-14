# Spatial (kind 6)

```json
{"id": 20, "kind": 6, "transform": [[120, 40], [0.6, 0.6], 12], "crop": [0, 0.1, 0, 0]}
```

Attach with `spatialId: 20`. `transform` is `[position, scale, rotation]`: position `[x,y]` in pixels, scale `[x,y]` as multipliers, rotation in degrees. Identity is `[[0,0],[1,1],0]`. Coordinates begin at the top left, x rightward and y downward; objects use their natural dimensions, with no automatic fitting or centering. Use host canvas/media dimensions for placement. Canvas size is runtime configuration, not a `TimelineFile` field.

Optional `crop` is `[top,right,bottom,left]`, fractions of local bounds removed from each edge. Use values from 0 to 1 with opposing sums below 1 for a visible result. Cropping masks pixels without resizing or repositioning the object. Current sampler reads crop directly from the leaf's Spatial even if that Spatial has `enabled: false`; clear crop explicitly when removing it. Container crop is not propagated.

Container spatial transforms affect descendants. Current multiplication order is `local × accumulatedParent`, followed by animated transforms in `animationIds` order. Prefer a leaf transform for simple placement; do not assume ordinary parent-first scene-graph composition for nested transforms.
