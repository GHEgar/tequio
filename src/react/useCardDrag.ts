import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Box } from './useCardMotion.js';

export interface Offset {
    x: number;
    y: number;
}

export interface CardDrag {
    offset: Offset;
    dragging: boolean;
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
    onDoubleClick: () => void;
}

const ZERO: Offset = { x: 0, y: 0 };
const THRESHOLD = 4;

const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

export const clampOffset = (offset: Offset, box: Box, origin: Offset, bounds: { width: number; height: number }): Offset => ({
    x: clamp(offset.x, -(origin.x + box.x), bounds.width - (origin.x + box.x + box.width)),
    y: clamp(offset.y, -(origin.y + box.y), bounds.height - (origin.y + box.y + box.height)),
});

const unitsPerPixel = (el: Element): number => {
    const svg = el.closest('svg');
    const ctm = svg?.getScreenCTM();
    return ctm && ctm.a ? 1 / ctm.a : 1;
};

export const useCardDrag = (enabled: boolean, limit: (offset: Offset) => Offset, onStart?: () => void): CardDrag => {
    const [offset, setOffset] = useState<Offset>(ZERO);
    const [dragging, setDragging] = useState(false);
    const latest = useRef({ limit, onStart, offset });
    useEffect(() => {
        latest.current = { limit, onStart, offset };
    });

    const onPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
        const target = event.target as Element;
        if (!enabled || event.button !== 0 || target.closest('button,a,input,select,textarea')) return;
        if (event.pointerType === 'touch' && !target.closest('header')) return;
        const el = event.currentTarget;
        const k = unitsPerPixel(el);
        const start = { x: event.clientX, y: event.clientY };
        const from = latest.current.offset;
        let moved = false;
        const move = (e: PointerEvent): void => {
            const dx = e.clientX - start.x;
            const dy = e.clientY - start.y;
            if (!moved && Math.hypot(dx, dy) < THRESHOLD) return;
            if (!moved) {
                moved = true;
                el.setPointerCapture(e.pointerId);
                setDragging(true);
                latest.current.onStart?.();
            }
            e.preventDefault();
            setOffset(latest.current.limit({ x: from.x + dx * k, y: from.y + dy * k }));
        };
        const end = (): void => {
            el.removeEventListener('pointermove', move);
            el.removeEventListener('pointerup', end);
            el.removeEventListener('pointercancel', end);
            setDragging(false);
        };
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', end);
        el.addEventListener('pointercancel', end);
    }, [enabled]);

    const onDoubleClick = useCallback(() => setOffset(ZERO), []);

    return { offset, dragging, onPointerDown, onDoubleClick };
};
