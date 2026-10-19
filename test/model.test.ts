import { describe, expect, it } from 'vitest';
import { buildGraph, changes, remember } from '@npmegar/tequio';
import type { GraphData, Memory } from '@npmegar/tequio';
import { demoData } from '../demo/data.js';

const small: GraphData = {
    projects: [
        { id: 'a', name: 'Alpha', progress: 0.5, counts: { pass: 2, pending: 2 } },
        { id: 'b', name: 'Beta', progress: 0, counts: {} },
    ],
    people: [
        { id: 'x', name: 'Xia', metric: 3, active: true },
        { id: 'y', name: 'Yan', metric: 1, active: false },
    ],
    links: [
        { person: 'x', project: 'a', weight: 2 },
        { person: 'x', project: 'a', weight: 1 },
        { person: 'y', project: 'b', weight: 1 },
        { person: 'y', project: 'missing', weight: 4 },
        { person: 'ghost', project: 'a', weight: 4 },
        { person: 'x', project: 'b', weight: 0 },
    ],
};

describe('buildGraph', () => {
    it('builds one node per project and person with prefixed ids', () => {
        const graph = buildGraph(small);
        expect(graph.nodes.map((n) => n.id)).toEqual(['p:a', 'p:b', 'u:x', 'u:y']);
        expect(graph.added).toBe(4);
    });

    it('merges duplicate links and drops dangling or empty ones', () => {
        const graph = buildGraph(small);
        expect(graph.links.map((l) => [l.id, l.weight])).toEqual([['u:x>p:a', 3], ['u:y>p:b', 1]]);
    });

    it('draws heavier links wider and shorter', () => {
        const [heavy, light] = buildGraph(small).links;
        expect(heavy?.width).toBeGreaterThan(light?.width ?? Infinity);
        expect((heavy?.length ?? 0) - (heavy?.target.r ?? 0)).toBeLessThan((light?.length ?? 0) - (light?.target.r ?? 0));
    });

    it('gives every person the same radius and grows projects with their work', () => {
        const graph = buildGraph(demoData());
        const people = new Set(graph.nodes.filter((n) => n.kind === 'person').map((n) => n.r));
        expect(people.size).toBe(1);
        const projects = graph.nodes.filter((n) => n.kind === 'project').sort((a, b) => a.total - b.total);
        expect(projects[0]?.r).toBeLessThanOrEqual(projects.at(-1)?.r ?? 0);
    });

    it('scales radii with the canvas', () => {
        const full = buildGraph(small);
        const half = buildGraph(small, { layout: { width: 960, height: 540 } });
        expect(half.nodes[2]?.r).toBeCloseTo((full.nodes[2]?.r ?? 0) / 2);
    });

    it('is deterministic', () => {
        const a = buildGraph(demoData());
        const b = buildGraph(demoData());
        expect(a.nodes.map((n) => [n.x, n.y])).toEqual(b.nodes.map((n) => [n.x, n.y]));
    });
});

describe('memory', () => {
    it('keeps positions of known nodes between builds', () => {
        const memory: Memory = new Map();
        const first = buildGraph(small, { memory });
        const moved = first.nodes[0];
        if (moved) moved.x = 123;
        remember(first, memory);
        const second = buildGraph(small, { memory });
        expect(second.nodes[0]?.x).toBe(123);
        expect(second.added).toBe(0);
    });

    it('reports nodes whose signature changed', () => {
        const memory: Memory = new Map();
        remember(buildGraph(small), memory);
        const next: GraphData = {
            ...small,
            people: [{ id: 'x', name: 'Xia', metric: 4, active: true }, small.people[1] as GraphData['people'][number]],
            projects: [{ ...small.projects[0] as GraphData['projects'][number], progress: 0.75 }, small.projects[1] as GraphData['projects'][number]],
        };
        const pulses = changes(buildGraph(next, { memory }), memory, 7);
        expect(pulses).toEqual([{ id: 'p:a', key: 'p:a:7' }, { id: 'u:x', key: 'u:x:7' }]);
    });

    it('does not pulse brand new nodes', () => {
        const memory: Memory = new Map();
        remember(buildGraph(small), memory);
        const next: GraphData = { ...small, people: [...small.people, { id: 'z', name: 'Zed', metric: 1 }] };
        expect(changes(buildGraph(next, { memory }), memory)).toEqual([]);
    });
});
