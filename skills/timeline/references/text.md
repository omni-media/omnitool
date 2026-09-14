# Text styles (kind 9)

Text and Caption content is normally plain text. Their optional `styleId` points to a TextStyle item:

```json
{
  "id": 21,
  "kind": 9,
  "style": {
    "fontFamily": "Arial",
    "fontSize": 48,
    "fill": "#ffffff",
    "stroke": {"color": "#000000", "width": 4},
    "align": "center",
    "wordWrap": true,
    "wordWrapWidth": 800
  }
}
```

`style` is a JSON-serializable subset of PixiJS 8 `TextStyleOptions`, not CSS. Omit properties to use Pixi defaults. Use only fonts supplied by the host. `align` aligns lines within the text's own layout; position the whole object with a Spatial attachment. Optional `enabled: false` bypasses the style.

## Safe style fields

| Field | JSON value |
| --- | --- |
| `align` | `"left"`, `"center"`, `"right"`, or `"justify"` |
| `breakWords` | boolean; applies when `wordWrap` is true |
| `fill` | CSS color string or numeric color |
| `fontFamily` | string or array of fallback strings |
| `fontSize` | pixel number, or CSS size string such as `"48px"` |
| `fontStyle` | `"normal"`, `"italic"`, or `"oblique"` |
| `fontVariant` | `"normal"` or `"small-caps"` |
| `fontWeight` | `"normal"`, `"bold"`, `"bolder"`, `"lighter"`, or string `"100"` through `"900"` |
| `leading`, `letterSpacing`, `lineHeight`, `padding` | numbers in pixels |
| `textBaseline` | `"alphabetic"`, `"top"`, `"hanging"`, `"middle"`, `"ideographic"`, or `"bottom"` |
| `trim` | boolean; removes transparent edge padding but costs extra processing |
| `whiteSpace` | `"normal"`, `"pre"`, or `"pre-line"` |
| `wordWrap` | boolean |
| `wordWrapWidth` | number in pixels; applies when `wordWrap` is true |
| `dropShadow` | boolean, or the object described below |
| `stroke` | color, or the object described below |
| `tagStyles` | object mapping tag names to nested style objects from this table; when nonempty, matching markup in `content` is parsed |

Portable shadow and stroke shapes:

```json
{
  "dropShadow": {
    "alpha": 0.6,
    "angle": 0.5235987756,
    "blur": 4,
    "color": "#000000",
    "distance": 6
  },
  "stroke": {
    "color": "#000000",
    "alpha": 1,
    "width": 4,
    "alignment": 0.5,
    "cap": "butt",
    "join": "round",
    "miterLimit": 10
  }
}
```

Shadow `angle` is radians. Stroke `alignment` is `0` outside, `0.5` centered, or `1` inside; `cap` is `butt`, `round`, or `square`; `join` is `miter`, `round`, or `bevel`.

Do not put Pixi runtime objects such as textures, gradients, patterns, matrices, or Filter instances in raw timeline JSON. Use `filterIds` for Omnitool filters. If an input timeline already contains other serializable Pixi style fields, preserve them unless the requested edit targets them.
