import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { buildScene, createStore } from '../core/index.js';
import type {
    Cooling, Forces, Graph, GraphData, GraphStore, Labels, Layout, Pulse, Scene, Snapshot, ThemeInput,
} from '../core/index.js';
import { PULSE_MS, PULSE_REPEAT, useAnimation, useReducedMotion } from './animation.js';
import type { Register } from './animation.js';

export interface UseGraphOptions {
    layout?: Partial<Layout> | undefined;
    animated?: boolean | 'always' | undefined;
    forces?: Forces | undefined;
    cooling?: Cooling | undefined;
}

export interface UseSceneOptions {
    theme?: ThemeInput | undefined;
    locale?: string | undefined;
    labels?: Partial<Labels> | undefined;
    legend?: boolean | undefined;
    focus?: string | null | undefined;
}

export interface UseTequioOptions extends UseGraphOptions, UseSceneOptions {}

export interface UseGraph {
    store: GraphStore;
    snapshot: Snapshot;
    pulses: ReadonlyMap<string, Pulse>;
    register: Register;
    reducedMotion: boolean;
}

export interface UseTequio extends UseGraph {
    scene: Scene | null;
}

const NO_PULSES: ReadonlyMap<string, Pulse> = new Map();

export const useGraph = (data: GraphData, options: UseGraphOptions = {}): UseGraph => {
    const { layout, animated = true, forces, cooling } = options;
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

    const still = reducedMotion && animated !== 'always';
    const register = useAnimation(snapshot.graph, { running: !!animated && !still, forces, cooling });
    return { store, snapshot, pulses: still ? NO_PULSES : snapshot.pulses, register, reducedMotion: still };
};

export const useScene = (graph: Graph | null, options: UseSceneOptions = {}): Scene | null => {
    const { theme, locale, labels, legend, focus } = options;
    return useMemo(
        () => (graph ? buildScene(graph, { theme, locale, labels, legend, focus }) : null),
        [graph, theme, locale, labels, legend, focus],
    );
};

export const useTequio = (data: GraphData, options: UseTequioOptions = {}): UseTequio => {
    const state = useGraph(data, options);
    const scene = useScene(state.snapshot.graph, options);
    return { ...state, scene };
};
