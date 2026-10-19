# <picture><source media="(prefers-color-scheme: dark)" srcset=".github/assets/icon-dark.svg"><img src=".github/assets/icon-light.svg" width="36" height="36" alt=""></picture> tequio

[![npm](https://img.shields.io/npm/v/@npmegar/tequio)](https://www.npmjs.com/package/@npmegar/tequio)
[![size](https://img.shields.io/bundlejs/size/@npmegar/tequio)](https://bundlejs.com/?q=@npmegar/tequio)
[![license](https://img.shields.io/github/license/GHEgar/tequio)](LICENSE)

Live participation graph: projects at the center, people around, links as thick as the work. TV and print.

![Five projects and forty people: two live updates pulse the nodes that changed, then the same graph in the light theme](.github/assets/demo.gif)

**[Live demo](https://ghegar.github.io/tequio/)**

tequio owns the picture and its motion: a force layout of its own that runs in `requestAnimationFrame`
and moves the DOM through refs, positions remembered between updates so the graph never jumps, pulses
on the nodes whose numbers changed, and a deterministic export to SVG and PNG. You own the data and
the colors: two themes ship as plain token objects (dark for a TV, light for print) and every token can
be overridden. Names never appear on the canvas; they live in `<title>`, `aria-label` and the table view.

## Install

```bash
npm install @npmegar/tequio
```

| Entry | What it is | Needs |
|---|---|---|
| `@npmegar/tequio` | Model, simulation, store, scene, themes, `toSvg` and `toPng` | nothing (`toPng` needs a browser) |
| `@npmegar/tequio/react` | `<Tequio>`, `useTequio`, `<TequioTable>` | `react >= 19` |

## Quick start

```tsx
import { Tequio } from '@npmegar/tequio/react';
import type { GraphData } from '@npmegar/tequio';

const data: GraphData = {
    statuses: [{ key: 'done', label: 'Done', tone: 'good' }, { key: 'todo', label: 'To do', tone: 'neutral' }],
    projects: [{ id: 'web', name: 'Website', progress: 0.6, counts: { done: 6, todo: 4 } }],
    people: [{ id: 'ana', name: 'Ana', metric: 6, active: true }],
    links: [{ person: 'ana', project: 'web', weight: 6 }],
};

export const Wall = () => <Tequio data={data} theme="dark" table />;
```

The SVG scales to its container through `viewBox`; give the container a size, such as `100vw` × `100vh` on a TV.

## Preparing your data

1. Pick what a **link weight** measures: tasks closed, hours, commits. It sets the link width and pulls
   heavier contributors closer to the project.
2. Pick the **metric** printed inside each person: usually the sum of their weights, but any number works.
3. List the **statuses** once, in ring order. Each project only sends `counts` by status key.
4. Send a **new object** on every update. The store skips the same object twice and pulses the nodes
   whose `progress`, `counts`, `metric` or `active` changed.

| Field | Drawn as |
|---|---|
| `project.progress` (0–1) | percentage inside the project |
| `project.counts` | segmented ring around the project, in `statuses` order |
| `project.logo` | image inside the project; without it, the initial |
| `project.color` | identity ring and link color (default: theme palette by order) |
| `person.metric` | number inside the person |
| `person.avatar` | photo behind the number; without it, `person.color` |
| `person.active` | outer ring when active, faded when `false` |
| `link.weight` | link width and length, relative to the heaviest link |

Every person has the same size. Projects grow with the total weight of their links.

## Themes

`dark` and `light` are token objects (`background`, `surface`, `text`, `muted`, `track`, `font`,
`palette`, `tones`, `linkOpacity`, `inactiveOpacity`). Pass a name or partial overrides:

```ts
const theme = { base: 'light', font: 'Inter, sans-serif', tones: { critical: '#b42318' } } as const;
```

Status colors come from `status.color`, then from its `tone` (`good`, `warning`, `serious`,
`critical`, `neutral`), then from the palette. The palette is the validated eight-hue categorical
order; text always uses ink tokens with a surface halo, never a series color.

## Layout

`layout` takes `width`, `height`, `padding`, `legend` and `personRadius`. Padding, legend band and
radii are in 1920×1080 units and scale with the canvas. Nothing is placed under the legend band; set
`legend: 0` (or `legend={false}`) to drop it.

The simulation follows d3-force's vocabulary: `forces` (`charge`, `reach`, `linkStrength`, `gravity`,
`overlap`, `velocityDecay`) and `cooling` (`alphaDecay`, `alphaTarget`). Live graphs keep a small
`alphaTarget` so they breathe; `settle(graph, steps)` runs the same steps ahead of the first frame.

## Export

```ts
import { toPng, toSvg } from '@npmegar/tequio';

const svg = toSvg(data, { theme: 'light', layout: { width: 1600, height: 1000 } });
const png = await toPng(data, { theme: 'light', scale: 2 });
```

`toSvg` builds, settles and serializes without a DOM, so it runs in Node, in a worker or at build time.
The same data and options always give the same string. `toPng` inlines remote logos and avatars as
data URIs before drawing, so the canvas is never tainted.

![The light theme exported for print at 960 × 600](.github/assets/print.png)

## Core

| Function | Does |
|---|---|
| `buildGraph(data, { layout, memory })` | Nodes and links, positions from memory or a hash of the id |
| `remember(graph, memory)` · `changes(graph, memory)` | Keep positions; list the nodes to pulse |
| `step` · `settle` · `cool` | One tick, many ticks, alpha decay |
| `createStore({ layout, forces })` | `update(data)`, `subscribe`, `getSnapshot`, `clearPulses` |
| `buildScene(graph, options)` | Shapes per node, links, legend and labels: what any renderer draws |
| `sceneToSvg(scene)` | Serialize a scene |

## React

```tsx
<Tequio data={data} theme="dark" animated onNode={(node) => open(node.data.id)} table />
```

| Prop | Default | |
|---|---|---|
| `theme` | `'dark'` | name or overrides |
| `animated` | `true` | `false` draws once; `prefers-reduced-motion` turns motion and pulses off |
| `onNode` | — | makes nodes focusable buttons (Enter and Space) |
| `table` | `false` | renders `<TequioTable>` visually hidden after the SVG |
| `layout`, `locale`, `labels`, `legend`, `forces`, `cooling`, `background` | | as in the core |

`useTequio(data, options)` returns `scene`, `pulses` and `register` for your own SVG: render the
scene and pass `register({ kind: 'node', id })` or `register({ kind: 'link', id })` as the ref. Only
nodes whose fingerprint changed re-render; motion never goes through React.

## Known limitations

- Built for tens of projects and a few hundred people: the repulsion is pairwise, without a quadtree.
- More than eight projects reuse palette hues; logos, initials and the table keep them apart.
- The light palette has three hues under 3:1 against white; the legend text and table view carry them.
- Fonts are not embedded in exported SVG or PNG: use a font the reader has, or a system stack.

## Development

```bash
npm test
npm run lint
npm run typecheck
npm run build
npm run demo
npm run e2e
```

The demo shows ten projects and 150 people whose data changes every three seconds, with a TV mode
(full screen), both themes and SVG/PNG export. Its production build holds 60 fps at 1920 × 1080 with
no long frames, including updates.

## Contributing

Issues are welcome. Open one before sending a pull request.

## License

AGPL-3.0-only © GHEgar
