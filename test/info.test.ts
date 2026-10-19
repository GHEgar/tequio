import { describe, expect, it } from 'vitest';
import { buildGraph, focusOf, infoPlacement, infoPlan, safeHref, settle, toSvg } from '@npmegar/tequio';
import type { GraphData, InfoBlock } from '@npmegar/tequio';
import { nextOf } from '@npmegar/tequio/react';
import { demoData } from '../demo/data.js';

const data: GraphData = {
    statuses: [{ key: 'ok', label: 'Ok', tone: 'good' }, { key: 'ko', label: 'Ko', tone: 'critical' }],
    projects: [{ id: 'a', name: 'Alpha', progress: 0.5, counts: { ok: 3, ko: 1 }, description: 'Goal', details: [{ label: 'Repo', value: 'alpha', href: 'javascript:alert(1)' }] }],
    people: [
        { id: 'x', name: 'Xia', metric: 7, details: [{ label: 'Site', value: 'xia', href: 'https://example.com' }] },
        { id: 'y', name: 'Yan', metric: 2, active: false },
    ],
    links: [{ person: 'x', project: 'a', weight: 7 }, { person: 'y', project: 'a', weight: 2 }],
};

const ofType = <T extends InfoBlock['type']>(blocks: InfoBlock[], type: T): Extract<InfoBlock, { type: T }>[] =>
    blocks.filter((b): b is Extract<InfoBlock, { type: T }> => b.type === type);

describe('infoPlan', () => {
    it('summarizes a project: progress, people, work, statuses and top contributors', () => {
        const plan = infoPlan(buildGraph(data), 'p:a');
        expect(plan?.title).toBe('Alpha');
        expect(ofType(plan?.blocks ?? [], 'text')[0]?.text).toBe('Goal');
        expect(ofType(plan?.blocks ?? [], 'cards')[0]?.items.map((i) => i.value)).toEqual(['50%', '2', '9']);
        const [statuses, top] = ofType(plan?.blocks ?? [], 'list');
        expect(statuses?.items.map((i) => `${i.label}=${i.value}`)).toEqual(['Ok=3', 'Ko=1']);
        expect(top?.items.map((i) => i.label)).toEqual(['Xia', 'Yan']);
    });

    it('summarizes a person and drops unsafe links', () => {
        const graph = buildGraph(data);
        const person = infoPlan(graph, 'u:y');
        expect(ofType(person?.blocks ?? [], 'badges')[0]?.items[0]?.label).toBe('Inactive');
        expect(ofType(infoPlan(graph, 'u:x')?.blocks ?? [], 'list').at(-1)?.items[0]?.href).toBe('https://example.com');
        expect(ofType(infoPlan(graph, 'p:a')?.blocks ?? [], 'list').at(-1)?.items[0]?.href).toBeUndefined();
        expect(infoPlan(graph, 'nope')).toBeNull();
    });

    it('takes custom labels and locale', () => {
        const plan = infoPlan(buildGraph(data), 'p:a', { locale: 'es', labels: { progress: 'Avance' } });
        const [first] = ofType(plan?.blocks ?? [], 'cards')[0]?.items ?? [];
        expect(first?.label).toBe('Avance');
        expect(first?.value).toMatch(/^50\s%$/u);
    });

    it('accepts only safe hrefs', () => {
        expect(safeHref('mailto:a@b.c')).toBe('mailto:a@b.c');
        expect(safeHref('/team/1')).toBe('/team/1');
        expect(safeHref('//evil.com')).toBeUndefined();
        expect(safeHref('data:text/html,x')).toBeUndefined();
    });
});

describe('infoPlacement', () => {
    it('keeps the box inside the canvas and points the arrow at the node', () => {
        const graph = settle(buildGraph(demoData({ projects: 10, people: 150 })), 200);
        const sides = new Set<string>();
        for (const node of graph.nodes) {
            const plan = infoPlan(graph, node.id);
            if (!plan) continue;
            const p = infoPlacement(graph, node, plan);
            expect(node.x + p.x).toBeGreaterThanOrEqual(0);
            expect(node.x + p.x + p.width).toBeLessThanOrEqual(graph.layout.width);
            expect(node.y + p.y).toBeGreaterThanOrEqual(0);
            expect(node.y + p.y + p.height).toBeLessThanOrEqual(graph.layout.height);
            expect(p.arrow).toBeGreaterThan(0);
            expect(p.arrow).toBeLessThan(p.side === 'above' || p.side === 'below' ? p.width : p.height);
            sides.add(p.side);
        }
        expect(sides.has('above') && sides.has('below')).toBe(true);
    });
});

describe('nextOf', () => {
    const order = ['a', 'b', 'c', 'd'];
    it('prefers nodes that just changed, after the current one', () => {
        const pulses = new Map([['b', { id: 'b', key: 'b:1' }], ['d', { id: 'd', key: 'd:1' }]]);
        expect(nextOf(order, pulses, null)).toBe('b');
        expect(nextOf(order, pulses, 'b')).toBe('d');
        expect(nextOf(order, pulses, 'd')).toBe('b');
    });

    it('goes round robin when nothing changed', () => {
        expect(nextOf(order, new Map(), 'c')).toBe('d');
        expect(nextOf(order, new Map(), 'd')).toBe('a');
        expect(nextOf([], new Map(), null)).toBeNull();
    });
});

describe('locale', () => {
    it('speaks Spanish when the locale is Spanish', () => {
        const graph = buildGraph(data);
        const plan = infoPlan(graph, 'p:a', { locale: 'es-MX' });
        expect(ofType(plan?.blocks ?? [], 'cards')[0]?.items.map((i) => i.label)).toEqual(['Avance', 'Personas', 'Trabajo']);
        expect(ofType(plan?.blocks ?? [], 'list').map((b) => b.title)).toContain('Quienes más aportan');
        expect(toSvg(data, { locale: 'es' })).toContain('Grafo de participación: 1 proyecto y 2 personas');
        expect(toSvg(data, { locale: 'es', labels: { title: () => 'Propio' } })).toContain('>Propio</title>');
        expect(toSvg(data, { locale: 'en-GB' })).toContain('Participation graph');
    });
});

describe('infoPlacement avoiding nodes', () => {
    const overlap = (p: { x: number; y: number; width: number; height: number }, at: { x: number; y: number }, nodes: { x: number; y: number; r: number }[]): number => nodes.reduce((sum, n) => {
        const left = at.x + p.x;
        const top = at.y + p.y;
        const w = Math.min(left + p.width, n.x + n.r) - Math.max(left, n.x - n.r);
        const h = Math.min(top + p.height, n.y + n.r) - Math.max(top, n.y - n.r);
        return w > 0 && h > 0 ? sum + w * h : sum;
    }, 0);

    it('covers fewer focused neighbors than ignoring them', () => {
        const graph = settle(buildGraph(demoData()), 300);
        let before = 0;
        let after = 0;
        for (const node of graph.nodes) {
            const plan = infoPlan(graph, node.id);
            const focus = focusOf(graph, node.id);
            if (!plan || !focus) continue;
            const neighbors = graph.nodes.filter((n) => focus.nodes.has(n.id) && n !== node);
            const plain = overlap(infoPlacement(graph, node, plan), node, neighbors);
            const avoided = overlap(infoPlacement(graph, node, plan, 380, neighbors), node, neighbors);
            expect(avoided).toBeLessThanOrEqual(plain + 0.001);
            before += plain;
            after += avoided;
        }
        expect(after).toBeLessThan(before);
    });
});
