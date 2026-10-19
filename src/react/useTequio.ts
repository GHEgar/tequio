import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { buildScene, createStore } from '../core/index.js';
import type {
    Cooling, Forces, GraphData, GraphStore, Labels, Layout, Pulse, Scene, Snapshot, ThemeInput,
} from '../core/index.js';
import { PULSE_MS, PULSE_REPEAT, useAnimation, useReducedMotion } from './animation.js';
import type { Register } from './animation.js';

export interface UseTequioOptions {
    theme?: ThemeInput | undefined;
    layout?: Partial<Layout> | undefined;
    locale?: string | undefined;
    labels?: Partial<Labels> | undefined;
    legend?: boolean | undefined;
    animated?: boolean | undefined;
    forces?: Forces | undefined;
    cooling?: Cooling | undefined;
}

export interface UseTequio {
    store: GraphStore;
    snapshot: Snapshot;
    scene: Scene | null;
    pulses: ReadonlyMap<string, Pulse>;
    register: Register;
    reducedMotion: boolean;
}

export const useTequio = (data: GraphData, options: UseTequioOptions = {}): UseTequio => {
    const { theme, layout, locale, labels, legend, animated = true, forces, cooling } = options;
    const layoutKey = JSON.stringify(layout ?? {});
    const forcesKey = JSON.stringify(forces ?? null);
    const store = useMemo(() => createStore({
        layout: JSON.parse(layoutKey) as Partial<Layout>,
        forces: JSON.parse(forcesKey) as Forces | null ?? undefined,
    }), [layoutKey, forcesKey]);
    const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
    const reducedMotion = useReducedMotion();

    useEffect(() => {
        store.update(data);
    }, [store, data]);

    useEffect(() => {
        if (snapshot.pulses.size === 0) return undefined;
        const timer = setTimeout(store.clearPulses, PULSE_MS * PULSE_REPEAT + 200);
        return () => clearTimeout(timer);
    }, [store, snapshot.pulses]);

    const { graph } = snapshot;
    const scene = useMemo(
        () => (graph ? buildScene(graph, { theme, locale, labels, legend }) : null),
        [graph, theme, locale, labels, legend],
    );
    const register = useAnimation(graph, { running: animated && !reducedMotion, forces, cooling });
    const pulses = reducedMotion ? new Map<string, Pulse>() : snapshot.pulses;
    return { store, snapshot, scene, pulses, register, reducedMotion };
};
