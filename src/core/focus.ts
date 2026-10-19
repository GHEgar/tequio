import { ringRadius } from './shapes.js';
import type { Graph, GraphLink, GraphNode } from './types.js';

export interface Focus {
    nodes: Set<string>;
    links: Set<string>;
}

export const focusOf = (graph: Graph, id: string | null | undefined): Focus | null => {
    if (!id || !graph.byId.has(id)) return null;
    const nodes = new Set([id]);
    const links = new Set<string>();
    for (const l of graph.links) {
        if (l.source.id !== id && l.target.id !== id) continue;
        links.add(l.id);
        nodes.add(l.source.id);
        nodes.add(l.target.id);
    }
    return { nodes, links };
};

const edgeOf = (node: GraphNode, s: number): number => (
    node.kind === 'project' ? ringRadius(node, s) + 4 * s : node.r + 5.5 * s
);

export interface Segment {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
}

export const linkEnds = (link: GraphLink, s: number): Segment => {
    const { source: a, target: b } = link;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    const from = edgeOf(a, s);
    const to = edgeOf(b, s);
    if (d <= from + to) {
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        return { x1: mid.x, y1: mid.y, x2: mid.x, y2: mid.y };
    }
    const ux = dx / d;
    const uy = dy / d;
    return { x1: a.x + ux * from, y1: a.y + uy * from, x2: b.x - ux * to, y2: b.y - uy * to };
};
