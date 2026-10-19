import { buildGraph, changes, remember } from './model.js';
import { DEFAULT_FORCES, initialSteps, settle } from './simulation.js';
import type { Forces } from './simulation.js';
import type { Graph, GraphData, Layout, Memory, Pulse } from './types.js';

export interface StoreOptions {
    layout?: Partial<Layout> | undefined;
    forces?: Forces | undefined;
}

export interface Snapshot {
    graph: Graph | null;
    pulses: ReadonlyMap<string, Pulse>;
    version: number;
}

export interface GraphStore {
    subscribe: (listener: () => void) => () => void;
    getSnapshot: () => Snapshot;
    update: (data: GraphData) => void;
    clearPulses: () => void;
}

export const createStore = (options: StoreOptions = {}): GraphStore => {
    const memory: Memory = new Map();
    const listeners = new Set<() => void>();
    let current: GraphData | null = null;
    let snapshot: Snapshot = { graph: null, pulses: new Map(), version: 0 };
    const notify = (): void => listeners.forEach((listener) => listener());

    return {
        subscribe: (listener) => {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        getSnapshot: () => snapshot,
        update: (data) => {
            if (data === current) return;
            current = data;
            if (snapshot.graph) remember(snapshot.graph, memory);
            const graph = buildGraph(data, { layout: options.layout, memory });
            const version = snapshot.version + 1;
            const pulses = changes(graph, memory, version);
            settle(graph, initialSteps(graph), options.forces ?? DEFAULT_FORCES);
            snapshot = { graph, pulses: new Map(pulses.map((p) => [p.id, p])), version };
            notify();
        },
        clearPulses: () => {
            if (snapshot.pulses.size === 0) return;
            snapshot = { ...snapshot, pulses: new Map() };
            notify();
        },
    };
};
