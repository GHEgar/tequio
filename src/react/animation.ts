import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { DEFAULT_COOLING, DEFAULT_FORCES, cool, linkEnds, scaleOf, step } from '../core/index.js';
import type { Cooling, Forces, Graph, GraphLink } from '../core/index.js';

export const PULSE_MS = 1600;
export const PULSE_REPEAT = 3;

export type Tracked =
    | { kind: 'node'; id: string }
    | { kind: 'link'; id: string }
    | { kind: 'pulse'; key: string; r: number; spread: number };

export type Register = (tracked: Tracked) => (el: Element | null) => (() => void) | undefined;

const query = '(prefers-reduced-motion: reduce)';

const subscribeMotion = (listener: () => void): (() => void) => {
    if (typeof window === 'undefined' || !window.matchMedia) return () => undefined;
    const media = window.matchMedia(query);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
};

const reducedNow = (): boolean => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches;

export const useReducedMotion = (): boolean => useSyncExternalStore(subscribeMotion, reducedNow, () => false);

const fixed = (n: number): string => n.toFixed(1);

interface Frame {
    graph: Graph;
    scale: number;
    links: Map<string, GraphLink>;
    starts: Map<string, number>;
}

const draw = (tracked: Map<Element, Tracked>, frame: Frame, now: number): void => {
    for (const [el, t] of tracked) {
        if (t.kind === 'node') {
            const node = frame.graph.byId.get(t.id);
            if (node) el.setAttribute('transform', `translate(${fixed(node.x)} ${fixed(node.y)})`);
        } else if (t.kind === 'link') {
            const link = frame.links.get(t.id);
            if (!link) continue;
            const ends = linkEnds(link, frame.scale);
            el.setAttribute('x1', fixed(ends.x1));
            el.setAttribute('y1', fixed(ends.y1));
            el.setAttribute('x2', fixed(ends.x2));
            el.setAttribute('y2', fixed(ends.y2));
        } else {
            if (!frame.starts.has(t.key)) frame.starts.set(t.key, now);
            const elapsed = now - (frame.starts.get(t.key) ?? now);
            const phase = (elapsed % PULSE_MS) / PULSE_MS;
            el.setAttribute('r', fixed(t.r + t.spread * phase));
            el.setAttribute('opacity', elapsed >= PULSE_MS * PULSE_REPEAT ? '0' : (0.9 * (1 - phase)).toFixed(3));
        }
    }
};

export interface AnimationOptions {
    running: boolean;
    forces?: Forces | undefined;
    cooling?: Cooling | undefined;
}

const clock = (): number => (typeof performance === 'undefined' ? Date.now() : performance.now());

export const useAnimation = (graph: Graph | null, options: AnimationOptions): Register => {
    const tracked = useRef(new Map<Element, Tracked>());
    const starts = useRef(new Map<string, number>());
    const settings = useRef(options);
    useEffect(() => {
        settings.current = options;
    });

    const register = useCallback<Register>((t) => (el) => {
        if (!el) return undefined;
        tracked.current.set(el, t);
        return () => {
            tracked.current.delete(el);
        };
    }, []);

    const { running } = options;
    useEffect(() => {
        if (!graph) return undefined;
        const old = clock() - PULSE_MS * PULSE_REPEAT * 2;
        for (const [key, start] of starts.current) if (start < old) starts.current.delete(key);
        const frame: Frame = { graph, scale: scaleOf(graph.layout), links: new Map(graph.links.map((l) => [l.id, l])), starts: starts.current };
        draw(tracked.current, frame, clock());
        if (!running) return undefined;
        let alpha = 0.3;
        let request = 0;
        const tick = (time: number): void => {
            step(graph, alpha, settings.current.forces ?? DEFAULT_FORCES);
            alpha = cool(alpha, settings.current.cooling ?? DEFAULT_COOLING);
            draw(tracked.current, frame, time);
            request = requestAnimationFrame(tick);
        };
        const visibility = (): void => {
            cancelAnimationFrame(request);
            if (!document.hidden) request = requestAnimationFrame(tick);
        };
        request = requestAnimationFrame(tick);
        document.addEventListener('visibilitychange', visibility);
        return () => {
            cancelAnimationFrame(request);
            document.removeEventListener('visibilitychange', visibility);
        };
    }, [graph, running]);

    return register;
};
