# Transitions (kind 8)

A Transition has `id`, `kind: 8`, `name`, and positive `duration` in milliseconds; optional `label` and `enabled` follow the core rules. Place it directly between two visual content items in a Sequence, never at an end or adjacent to another Transition.

`name` is case-sensitive. Before adding or changing one, read `transitions` in [transitions.json](../assets/transitions.json) and use a listed name exactly. Transitions have no serialized parameter object—do not invent one. If the host supplies a catalog for a different Omnitool version, prefer that catalog; otherwise do not guess.

`[A (3000), fade (500), B (2000)]` lasts **5500 ms**. A occupies `[0,3000)`, the transition `[3000,3500)`, and B `[3500,5500)`.

At transition-local time `t`, outgoing local time is `A.duration + t`, incoming local time is `t - transition.duration`, and progress is `t / transition.duration`. For media items, add the item's `start` to get source time. These samples use media beyond A's trimmed end and before B's trimmed start. The sampler falls back to boundary samples when no image layer is returned. Account for these handles when trimming either neighbor.

Current limitations: transitions blend the first image layer from each side, not whole nested compositions or text-only items. They do not crossfade audio; neighboring audio items leave a transition-sized interval. A disabled Transition retains its duration but produces no transition image.
