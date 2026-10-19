import { describe, expect, it } from 'vitest';
import { buildGraph, buildScene, dark, focusOf, linkEnds, ringRadius, scaleOf, settle, toSvg } from '@npmegar/tequio';
import type { GraphData } from '@npmegar/tequio';

const data: GraphData = {
    projects: [{ id: 'a', name: 'A', progress: 0.5 }, { id: 'b', name: 'B', progress: 0.2 }],
    people: [{ id: 'x', name: 'X', metric: 2 }, { id: 'y', name: 'Y', metric: 1 }, { id: 'z', name: 'Z', metric: 1, active: false }],
    links: [{ person: 'x', project: 'a', weight: 2 }, { person: 'y', project: 'b', weight: 1 }, { person: 'z', project: 'a', weight: 1 }],
};

describe('focusOf', () => {
    it('keeps the node, its direct neighbors and the links between them', () => {
        const graph = buildGraph(data);
        const focus = focusOf(graph, 'p:a');
        expect([...(focus?.nodes ?? [])].sort()).toEqual(['p:a', 'u:x', 'u:z']);
        expect([...(focus?.links ?? [])].sort()).toEqual(['u:x>p:a', 'u:z>p:a']);
        expect([...(focusOf(graph, 'u:y')?.nodes ?? [])].sort()).toEqual(['p:b', 'u:y']);
        expect(focusOf(graph, null)).toBeNull();
        expect(focusOf(graph, 'nope')).toBeNull();
    });

    it('dims everything else in the scene, on top of inactive fading', () => {
        const graph = buildGraph(data);
        const scene = buildScene(graph, { focus: 'p:a' });
        const byId = new Map(scene.nodes.map((n) => [n.id, n]));
        expect(byId.get('p:a')?.dimmed).toBe(false);
        expect(byId.get('p:b')?.opacity).toBe(dark.dimOpacity);
        expect(byId.get('u:z')?.opacity).toBe(dark.inactiveOpacity);
        expect(scene.links.find((l) => l.id === 'u:y>p:b')?.fade).toBe(dark.dimOpacity);
        expect(buildScene(graph).nodes.every((n) => !n.dimmed)).toBe(true);
        expect(toSvg(data, { focus: 'p:a' })).toContain(`opacity="${dark.dimOpacity}"`);
    });
});

describe('linkEnds', () => {
    it('starts and ends on the outer edge of both nodes', () => {
        const graph = settle(buildGraph(data), 200);
        const s = scaleOf(graph.layout);
        for (const link of graph.links) {
            const e = linkEnds(link, s);
            const { source: a, target: b } = link;
            expect(Math.hypot(e.x1 - a.x, e.y1 - a.y)).toBeCloseTo(a.r + 5.5 * s, 5);
            expect(Math.hypot(e.x2 - b.x, e.y2 - b.y)).toBeCloseTo(ringRadius(b, s) + 4 * s, 5);
        }
    });

    it('collapses to a point when the nodes overlap', () => {
        const graph = buildGraph(data);
        const [link] = graph.links;
        if (!link) return;
        link.source.x = link.target.x;
        link.source.y = link.target.y;
        const e = linkEnds(link, 1);
        expect([e.x1, e.y1]).toEqual([e.x2, e.y2]);
    });
});
