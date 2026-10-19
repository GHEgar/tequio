import { describe, expect, it } from 'vitest';
import { createStore, dark, light, resolveTheme, toSvg } from '@npmegar/tequio';
import type { GraphData } from '@npmegar/tequio';
import { STATUSES, demoData } from '../demo/data.js';

const count = (text: string, pattern: RegExp): number => text.match(pattern)?.length ?? 0;

describe('toSvg', () => {
    it('is deterministic', () => {
        expect(toSvg(demoData())).toBe(toSvg(demoData()));
    });

    it('is accessible: role, title and one title per node', () => {
        const data = demoData({ projects: 3, people: 12 });
        const svg = toSvg(data);
        expect(svg).toContain('role="img"');
        expect(svg).toContain('<title id="tequio-title">Participation graph: 3 projects and 12 people</title>');
        expect(count(svg, /<title>/g)).toBe(15);
        expect(svg).toContain(`<title>${data.projects[0]?.name}: `);
    });

    it('shows no names on the canvas, only in titles', () => {
        const data = demoData({ projects: 3, people: 12 });
        const texts = [...toSvg(data).matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
        for (const p of [...data.projects, ...data.people]) expect(texts).not.toContain(p.name);
    });

    it('draws a one-line legend with the statuses', () => {
        const svg = toSvg(demoData({ projects: 2, people: 4 }));
        for (const s of STATUSES) expect(svg).toContain(`>${s.label}</text>`);
        expect(toSvg(demoData({ projects: 2, people: 4 }), { legend: false })).not.toContain('>Pass</text>');
    });

    it('uses theme tokens, never fixed colors', () => {
        const data = demoData({ projects: 2, people: 4 });
        expect(toSvg(data, { theme: 'dark' })).toContain(`fill="${dark.background}"`);
        expect(toSvg(data, { theme: 'light' })).toContain(`fill="${light.background}"`);
        expect(toSvg(data, { theme: { base: 'light', background: '#fafafa' } })).toContain('fill="#fafafa"');
        expect(resolveTheme({ tones: { good: '#00ff00' } }).tones.critical).toBe(dark.tones.critical);
    });

    it('escapes text and clips avatars to a circle', () => {
        const data: GraphData = {
            projects: [{ id: 'a', name: '<A&B>', progress: 0.5, logo: 'logo.svg?a=1&b=2' }],
            people: [{ id: 'x', name: 'X "Q"', avatar: 'x.png', metric: 2 }],
            links: [{ person: 'x', project: 'a', weight: 1 }],
        };
        const svg = toSvg(data);
        expect(svg).toContain('&lt;A&amp;B&gt;');
        expect(svg).toContain('X &quot;Q&quot;');
        expect(svg).toContain('href="logo.svg?a=1&amp;b=2"');
        expect(svg).toContain('clip-path="url(#tequio-round)"');
        expect(svg).not.toContain('>&lt;</text>');
    });

    it('fits the requested size', () => {
        expect(toSvg(demoData({ projects: 2, people: 4 }), { layout: { width: 816, height: 520 } })).toMatch(/^<svg[^>]*width="816" height="520" viewBox="0 0 816 520"/);
    });
});

describe('createStore', () => {
    it('settles on the first update and pulses changed nodes after', () => {
        const store = createStore();
        let calls = 0;
        const stop = store.subscribe(() => {
            calls += 1;
        });
        store.update(demoData({ projects: 10, people: 150, tick: 0 }));
        const first = store.getSnapshot();
        expect(first.graph?.nodes.length).toBe(160);
        expect(first.pulses.size).toBe(0);
        store.update(demoData({ projects: 10, people: 150, tick: 1 }));
        const second = store.getSnapshot();
        expect(second.version).toBe(2);
        expect(second.pulses.size).toBeGreaterThan(0);
        const kept = second.graph?.byId.get('p:project-0');
        expect(kept).toBeDefined();
        store.clearPulses();
        expect(store.getSnapshot().pulses.size).toBe(0);
        stop();
        store.update(demoData({ projects: 10, people: 150, tick: 2 }));
        expect(calls).toBe(3);
    });

    it('ignores the same data object twice', () => {
        const store = createStore();
        const data = demoData({ projects: 2, people: 3 });
        store.update(data);
        const snapshot = store.getSnapshot();
        store.update(data);
        expect(store.getSnapshot()).toBe(snapshot);
    });
});
