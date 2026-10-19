import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineTequio, propsOf, startSource, tourOf } from '@npmegar/tequio/element';
import { demoData } from '../demo/data.js';

const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const flush = async (): Promise<void> => {
    for (let i = 0; i < 6; i += 1) await new Promise((r) => setTimeout(r, 0));
};

afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
    vi.useRealTimers();
});

describe('attributes', () => {
    it('reads tour, flags and layout', () => {
        expect(tourOf(null)).toBe(false);
        expect(tourOf('')).toBe(true);
        expect(tourOf('5000,15000')).toEqual({ idle: 5000, interval: 15000 });
        expect(tourOf('5000,15000', 'bar')).toEqual({ idle: 5000, interval: 15000, countdown: 'bar' });
        expect(tourOf('', 'nope')).toBe(true);
        const el = document.createElement('div');
        el.setAttribute('theme', 'light');
        el.setAttribute('info', 'false');
        el.setAttribute('width', '1280');
        el.setAttribute('info-scale', '1.25');
        expect(propsOf(el)).toMatchObject({ theme: 'light', info: false, focus: true, legend: true, infoScale: 1.25, layout: { width: 1280 } });
    });
});

describe('<tequio-graph>', () => {
    it('is defined once and renders data given as a property', async () => {
        const Ctor = defineTequio();
        expect(defineTequio()).toBe(Ctor);
        const el = document.createElement('tequio-graph') as HTMLElement & { data: unknown };
        el.setAttribute('theme', 'light');
        document.body.append(el);
        el.data = demoData({ projects: 2, people: 4 });
        await flush();
        const svg = el.shadowRoot?.querySelector('svg');
        expect(svg?.getAttribute('aria-label')).toBe('Participation graph: 2 projects and 4 people');
        expect(el.shadowRoot?.querySelector('rect')?.getAttribute('fill')).toBe('#ffffff');
        expect(el.shadowRoot?.querySelectorAll('table')).toHaveLength(2);
    });

    it('fetches src with the token, reports errors and emits node clicks', async () => {
        defineTequio();
        const fetcher = vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(demoData({ projects: 2, people: 3 })));
        const el = document.createElement('tequio-graph');
        el.setAttribute('src', '/api/graph');
        el.setAttribute('token', 'secret');
        el.setAttribute('refresh', '0');
        const loaded = vi.fn();
        el.addEventListener('tequio-load', loaded);
        document.body.append(el);
        await flush();
        expect(fetcher).toHaveBeenCalledWith('/api/graph', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer secret' }) }));
        expect(loaded).toHaveBeenCalledTimes(1);
        expect(el.hasAttribute('aria-busy')).toBe(false);
        const clicked = vi.fn();
        document.body.addEventListener('tequio-node', (e) => clicked((e as CustomEvent).detail));
        (el.shadowRoot?.querySelector('g[data-kind="project"]') as SVGGElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
        expect(clicked).toHaveBeenCalledWith({ id: 'project-0', kind: 'project', name: 'Atlas' });
    });

    it('shows why the data could not be drawn', async () => {
        defineTequio();
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(json({ projects: [{ id: 'a', name: 'A', progress: 9 }], people: [], links: [] }));
        const el = document.createElement('tequio-graph');
        el.setAttribute('src', '/bad');
        el.setAttribute('refresh', '0');
        const failed = vi.fn();
        el.addEventListener('tequio-error', failed);
        document.body.append(el);
        await flush();
        expect(failed).toHaveBeenCalled();
        expect(el.shadowRoot?.querySelector('[role="alert"]')?.textContent).toContain('projects[0].progress');
    });
});

describe('startSource', () => {
    it('polls, skips unchanged data and backs off on errors', async () => {
        vi.useFakeTimers();
        const responses = [json({ projects: [], people: [], links: [] }), json({ projects: [], people: [], links: [] }), json({}, 500), json({ projects: [{ id: 'a', name: 'A', progress: 0 }], people: [], links: [] })];
        const fetcher = vi.fn(async () => responses.shift() ?? json({}, 500));
        const onData = vi.fn();
        const onError = vi.fn();
        const source = startSource({ src: '/g', refresh: 10, onData, onError, fetcher });
        await vi.advanceTimersByTimeAsync(0);
        expect(onData).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(10000);
        expect(onData).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(10000);
        expect(onError).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(10000);
        expect(fetcher).toHaveBeenCalledTimes(3);
        await vi.advanceTimersByTimeAsync(10000);
        expect(onData).toHaveBeenCalledTimes(2);
        source.stop();
        await vi.advanceTimersByTimeAsync(60000);
        expect(fetcher).toHaveBeenCalledTimes(4);
    });
});
