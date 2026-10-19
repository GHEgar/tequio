import { useEffect, useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';

export interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
}

const ease = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

const clock = (): number => (typeof performance === 'undefined' ? Date.now() : performance.now());

export const HANDOFF_MS = 480;

export const useHandoff = (target: Box, from: Box | null | undefined, still: boolean): { box: Box; progress: number } => {
    const [progress, setProgress] = useState(from && !still ? 0 : 1);
    useEffect(() => {
        if (!from || still) return undefined;
        const start = clock();
        let frame = requestAnimationFrame(function step() {
            const t = Math.min(1, (clock() - start) / HANDOFF_MS);
            setProgress(t);
            if (t < 1) frame = requestAnimationFrame(step);
        });
        return () => cancelAnimationFrame(frame);
    }, [from, still]);
    if (!from || progress >= 1) return { box: target, progress: 1 };
    const k = ease(progress);
    const mix = (a: number, b: number): number => a + (b - a) * k;
    return {
        box: { x: mix(from.x, target.x), y: mix(from.y, target.y), width: mix(from.width, target.width), height: mix(from.height, target.height) },
        progress,
    };
};

export const useOverflow = (ref: RefObject<HTMLElement | null>, active: boolean, duration: number): number => {
    const [extra, setExtra] = useState(0);
    useLayoutEffect(() => {
        const el = ref.current;
        if (!active || !el) return;
        const ratio = el.scrollHeight / Math.max(1, el.clientHeight);
        setExtra(ratio > 1.02 ? Math.min(duration, duration * (ratio - 1)) : 0);
    }, [ref, active, duration]);
    return extra;
};

export const useAutoScroll = (ref: RefObject<HTMLElement | null>, active: boolean, total: number, still: boolean): void => {
    useEffect(() => {
        const el = ref.current;
        if (!active || !el) return undefined;
        const start = clock();
        let frame = requestAnimationFrame(function step() {
            const max = el.scrollHeight - el.clientHeight;
            if (max > 1) {
                const t = Math.min(1, Math.max(0, ((clock() - start) / total - 0.15) / 0.65));
                el.scrollTop = still ? Math.round(t * 3) / 3 * max : t * max;
            }
            if (clock() - start < total) frame = requestAnimationFrame(step);
        });
        return () => cancelAnimationFrame(frame);
    }, [ref, active, total, still]);
};
