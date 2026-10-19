import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { DEFAULT_COOLING, DEFAULT_FORCES, cool, step } from '../core/index.js';
import type { Cooling, Forces, Graph, GraphLink, GraphNode } from '../core/index.js';

export const PULSE_MS = 1600;
export const PULSE_REPEAT = 3;

export type Tracked =
    | { kind: 'node'; node: GraphNode }
    | { kind: 'link'; link: GraphLink }
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

const draw = (tracked: Map<Element, Tracked>, starts: Map<string, number>, now: number): void => {
    for (const [el, t] of tracked) {
        if (t.kind === 'node') {
            el.setAttribute('transform', `translate(${fixed(t.node.x)} ${fixed(t.node.y)})`);
        } else if (t.kind === 'link') {
            el.setAttribute('x1', fixed(t.link.source.x));
            el.setAttribute('y1', fixed(t.link.source.y));
            el.setAttribute('x2', fixed(t.link.target.x));
            el.setAttribute('y2', fixed(t.link.target.y));
        } else {
            if (!starts.has(t.key)) starts.set(t.key, now);
            const elapsed = now - (starts.get(t.key) ?? now);
            const done = elapsed >= PULSE_MS * PULSE_REPEAT;
            const phase = (elapsed % PULSE_MS) / PULSE_MS;
            el.setAttribute('r', fixed(t.r + t.spread * phase));
            el.setAttribute('opacity', done ? '0' : (0.9 * (1 - phase)).toFixed(3));
        }
    }
};

export interface AnimationOptions {
    running: boolean;
    forces?: Forces | undefined;
    cooling?: Cooling | undefined;
}

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
        const now = (): number => (typeof performance === 'undefined' ? Date.now() : performance.now());
        const old = now() - PULSE_MS * PULSE_REPEAT * 2;
        for (const [key, start] of starts.current) if (start < old) starts.current.delete(key);
        draw(tracked.current, starts.current, now());
        if (!running) return undefined;
        let alpha = 0.3;
        let frame = 0;
        const tick = (time: number): void => {
            step(graph, alpha, settings.current.forces ?? DEFAULT_FORCES);
            alpha = cool(alpha, settings.current.cooling ?? DEFAULT_COOLING);
            draw(tracked.current, starts.current, time);
            frame = requestAnimationFrame(tick);
        };
        const visibility = (): void => {
            cancelAnimationFrame(frame);
            if (!document.hidden) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        document.addEventListener('visibilitychange', visibility);
        return () => {
            cancelAnimationFrame(frame);
            document.removeEventListener('visibilitychange', visibility);
        };
    }, [graph, running]);

    return register;
};
