import { useCallback, useEffect, useRef, useState } from 'react';
import type { Pulse } from '../core/index.js';

export interface TourOptions {
    idle?: number | undefined;
    interval?: number | undefined;
}

export interface Tour {
    id: string | null;
    manual: boolean;
    select: (id: string | null) => void;
    toggle: (id: string) => void;
    poke: () => void;
}

interface Open {
    id: string | null;
    manual: boolean;
}

const now = (): number => Date.now();

export const nextOf = (order: string[], pulses: ReadonlyMap<string, Pulse>, current: string | null): string | null => {
    const at = current === null ? -1 : order.indexOf(current);
    const changed = order.filter((id) => pulses.has(id) && id !== current);
    if (changed.length > 0) return changed.find((id) => order.indexOf(id) > at) ?? changed[0] ?? null;
    return order.length ? order[(at + 1) % order.length] ?? null : null;
};

export const useTour = (
    enabled: boolean,
    options: TourOptions,
    version: number,
    order: string[],
    pulses: ReadonlyMap<string, Pulse>,
): Tour => {
    const idle = options.idle ?? 8000;
    const interval = options.interval ?? 6000;
    const [open, setOpen] = useState<Open>({ id: null, manual: false });
    const lastInput = useRef(now());
    const lastAdvance = useRef(0);
    const latest = useRef({ order, pulses, open });
    useEffect(() => {
        latest.current = { order, pulses, open };
    });

    const advance = useCallback(() => {
        const { order: list, pulses: changed, open: current } = latest.current;
        lastAdvance.current = now();
        setOpen({ id: nextOf(list, changed, current.id), manual: false });
    }, []);

    const poke = useCallback(() => {
        lastInput.current = now();
        const current = latest.current.open;
        if (current.id !== null && !current.manual) setOpen({ id: null, manual: false });
    }, []);

    const select = useCallback((id: string | null) => {
        lastInput.current = now();
        setOpen({ id, manual: id !== null });
    }, []);

    const toggle = useCallback((id: string) => {
        select(latest.current.open.id === id ? null : id);
    }, [select]);

    useEffect(() => {
        if (enabled && now() - lastInput.current >= idle) advance();
    }, [enabled, idle, version, advance]);

    useEffect(() => {
        if (!enabled) return undefined;
        const timer = setInterval(() => {
            const quiet = now() - lastInput.current >= idle;
            const due = latest.current.open.id === null || now() - lastAdvance.current >= interval;
            if (quiet && due) advance();
        }, 250);
        return () => clearInterval(timer);
    }, [enabled, idle, interval, advance]);

    const visible = open.manual || enabled ? open.id : null;
    return { id: visible, manual: open.manual, select, toggle, poke };
};
