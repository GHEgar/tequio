import { describe, expect, it } from 'vitest';
import { buildGraph, cool, initialSteps, settle, step } from '@npmegar/tequio';
import type { Graph, GraphNode } from '@npmegar/tequio';
import { demoData } from '../demo/data.js';

const settled = (projects = 10, people = 150): Graph => settle(buildGraph(demoData({ projects, people })), 360);

const distance = (a: GraphNode, b: GraphNode): number => Math.hypot(a.x - b.x, a.y - b.y);

describe('settle', () => {
    it('keeps every node inside the area, clear of the legend band', () => {
        const graph = settled();
        for (const n of graph.nodes) {
            expect(n.x - n.r).toBeGreaterThanOrEqual(graph.area.x0 - 0.01);
            expect(n.x + n.r).toBeLessThanOrEqual(graph.area.x1 + 0.01);
            expect(n.y - n.r).toBeGreaterThanOrEqual(graph.area.y0 - 0.01);
            expect(n.y + n.r).toBeLessThanOrEqual(graph.area.y1 + 0.01);
        }
    });

    it('keeps projects well apart', () => {
        const graph = settled();
        const projects = graph.nodes.filter((n) => n.kind === 'project');
        for (let i = 0; i < projects.length; i += 1) {
            for (let j = i + 1; j < projects.length; j += 1) {
                const a = projects[i] as GraphNode;
                const b = projects[j] as GraphNode;
                expect(distance(a, b)).toBeGreaterThan(a.r + b.r + graph.gaps.project * 0.6);
            }
        }
    });

    it('leaves almost no overlapping circles', () => {
        const graph = settled();
        let overlaps = 0;
        for (let i = 0; i < graph.nodes.length; i += 1) {
            for (let j = i + 1; j < graph.nodes.length; j += 1) {
                const a = graph.nodes[i] as GraphNode;
                const b = graph.nodes[j] as GraphNode;
                if (distance(a, b) < (a.r + b.r) * 0.9) overlaps += 1;
            }
        }
        expect(overlaps).toBeLessThanOrEqual(3);
    });

    it('is stable once settled', () => {
        const graph = settled();
        const before = graph.nodes.map((n) => [n.x, n.y] as const);
        for (let i = 0; i < 60; i += 1) step(graph, 0.02);
        const drift = graph.nodes.map((n, i) => Math.hypot(n.x - (before[i]?.[0] ?? 0), n.y - (before[i]?.[1] ?? 0)));
        expect(Math.max(...drift)).toBeLessThan(20);
        expect(drift.reduce((a, b) => a + b, 0) / drift.length).toBeLessThan(6);
    });

    it('is deterministic', () => {
        expect(settled(6, 40).nodes.map((n) => [n.x, n.y])).toEqual(settled(6, 40).nodes.map((n) => [n.x, n.y]));
    });

    it('works with a single project and no people', () => {
        const graph = settle(buildGraph({ projects: [{ id: 'a', name: 'A', progress: 1 }], people: [], links: [] }), 100);
        const [only] = graph.nodes;
        expect(only?.x).toBeCloseTo((graph.area.x0 + graph.area.x1) / 2);
    });
});

describe('cooling', () => {
    it('decays toward the target and stays there', () => {
        let alpha = 1;
        for (let i = 0; i < 1000; i += 1) alpha = cool(alpha);
        expect(alpha).toBe(0.02);
        expect(cool(0.5, { alphaDecay: 0.5, alphaTarget: 0 })).toBe(0.25);
    });

    it('settles fully on first build, briefly on additions and not at all otherwise', () => {
        const graph = buildGraph(demoData({ projects: 2, people: 4 }));
        expect(initialSteps(graph)).toBe(360);
        expect(initialSteps({ ...graph, added: 3 })).toBe(26);
        expect(initialSteps({ ...graph, added: 0 })).toBe(0);
    });
});
