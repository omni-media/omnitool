# Filters (kind 10)

Attach filters to a visual item with `filterIds`, in application order:

```json
{
  "id": 50,
  "kind": 10,
  "type": "BlurFilter",
  "params": {"strength": 8, "quality": 4}
}
```

Read skill path `assets/filters/index.json` to choose an exact case-sensitive filter `type`, then read only the matching `assets/filters/<type>.json` file for its parameter schema. In a schema, `type` is `number`, `boolean`, `color`, `choice`, `object`, or `array`; numeric entries include authoring `min`, `max`, `default`, and sometimes `step`. Object properties become nested JSON objects, not dotted keys. Array `items` describe entries in order.

Use only cataloged types and fields. `params` and its fields are optional; omitted values use the underlying filter library's runtime defaults, which can differ from schema authoring defaults. An empty schema means Omnitool exposes no safe raw parameter schema for that filter, so omit `params` rather than guessing. If the host supplies a catalog for a different Omnitool version, prefer that catalog.

Optional `enabled: false` bypasses the filter. A shared Filter affects every item that references it; clone it before changing only one owner. Container filters are currently not applied by the sampler, so attach filters to leaf Video, Text, Caption, Image, or Clip items.
