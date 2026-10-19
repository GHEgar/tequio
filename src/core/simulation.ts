import { scaleOf } from './model.js';
import type { Graph, GraphNode } from './types.js';

export interface Forces {
    charge: number;
    reach: number;
    linkStrength: number;
    gravity: number;
    overlap: number;
    velocityDecay: number;
}

export interface Cooling {
    alphaDecay: number;
    alphaTarget: number;
}

export const DEFAULT_FORCES: Forces = {
    charge: 40,
    reach: 300,
    linkStrength: 0.06,
    gravity: 0.0006,
    overlap: 0.12,
    velocityDecay: 0.3,
};

export const DEFAULT_COOLING: Cooling = { alphaDecay: 0.015, alphaTarget: 0.02 };

const gapOf = (graph: Graph, a: GraphNode, b: GraphNode): number => {
    if (a.kind === 'project' && b.kind === 'project') return graph.gaps.project;
    if (a.kind === 'project' || b.kind === 'project') return graph.gaps.mixed;
    return graph.gaps.person;
};

const repel = (graph: Graph, alpha: number, forces: Forces, s: number): void => {
    const { nodes } = graph;
    const reach = (forces.reach * s) ** 2;
    const charge = forces.charge * s;
    for (let i = 0; i < nodes.length; i += 1) {
        const a = nodes[i] as GraphNode;
        for (let j = i + 1; j < nodes.length; j += 1) {
            const b = nodes[j] as GraphNode;
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            let d2 = dx * dx + dy * dy;
            const minimum = a.r + b.r + gapOf(graph, a, b);
            if (d2 > reach && d2 > minimum * minimum) continue;
            if (d2 < 1) {
                dx = 0.5;
                dy = 0.5;
                d2 = 0.5;
            }
            const d = Math.sqrt(d2);
            const f = (((a.r + b.r + 16 * s) * charge) / d2) * alpha;
            const push = d < minimum ? ((minimum - d) / d) * forces.overlap : 0;
            const fx = (dx / d) * f + dx * push;
            const fy = (dy / d) * f + dy * push;
            a.vx -= fx;
            a.vy -= fy;
            b.vx += fx;
            b.vy += fy;
        }
    }
};

const attract = (graph: Graph, alpha: number, forces: Forces): void => {
    for (const l of graph.links) {
        const { source: a, target: b } = l;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const k = ((d - l.length) / d) * forces.linkStrength * alpha;
        a.vx += dx * k;
        a.vy += dy * k;
        b.vx -= dx * k * 0.25;
        b.vy -= dy * k * 0.25;
    }
};

const move = (graph: Graph, alpha: number, forces: Forces, s: number): void => {
    const { area } = graph;
    const cx = (area.x0 + area.x1) / 2;
    const cy = (area.y0 + area.y1) / 2;
    const inset = 2 * graph.layout.personRadius * s + graph.gaps.mixed;
    const keep = 1 - forces.velocityDecay;
    for (const n of graph.nodes) {
        const pull = n.kind === 'project' ? forces.gravity : forces.gravity / 3;
        n.vx = (n.vx + (cx - n.x) * pull * alpha) * keep;
        n.vy = (n.vy + (cy - n.y) * pull * alpha) * keep;
        const margin = n.r + (n.kind === 'project' ? inset : 0);
        n.x = Math.min(area.x1 - margin, Math.max(area.x0 + margin, n.x + n.vx));
        n.y = Math.min(area.y1 - margin, Math.max(area.y0 + margin, n.y + n.vy));
    }
};

export const step = (graph: Graph, alpha: number, forces: Forces = DEFAULT_FORCES): Graph => {
    const s = scaleOf(graph.layout);
    repel(graph, alpha, forces, s);
    attract(graph, alpha, forces);
    move(graph, alpha, forces, s);
    return graph;
};

export const settle = (graph: Graph, steps: number, forces: Forces = DEFAULT_FORCES, floor = DEFAULT_COOLING.alphaTarget): Graph => {
    const tail = Math.round(steps / 3);
    for (let i = 0; i < steps + tail; i += 1) step(graph, Math.max(floor, 1 - i / steps), forces);
    return graph;
};

export const cool = (alpha: number, cooling: Cooling = DEFAULT_COOLING): number => Math.max(
    cooling.alphaTarget,
    alpha * (1 - cooling.alphaDecay),
);

export const initialSteps = (graph: Graph): number => {
    if (graph.added === 0) return 0;
    if (graph.added === graph.nodes.length) return 360;
    return Math.min(120, 20 + graph.added * 2);
};
