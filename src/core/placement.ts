import { estimateHeight } from './info.js';
import type { InfoPlan } from './info.js';
import { scaleOf } from './model.js';
import type { Graph, GraphNode } from './types.js';

export type Side = 'above' | 'below' | 'right' | 'left';

export interface Placement {
    x: number;
    y: number;
    width: number;
    height: number;
    side: Side;
    arrow: number;
}

interface Box {
    left: number;
    top: number;
    width: number;
    height: number;
    side: Side;
}

const ORDER: Side[] = ['above', 'below', 'right', 'left'];

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(min, max), Math.max(min, value));

const covered = (box: Box, nodes: GraphNode[]): number => nodes.reduce((sum, n) => {
    const w = Math.min(box.left + box.width, n.x + n.r) - Math.max(box.left, n.x - n.r);
    const h = Math.min(box.top + box.height, n.y + n.r) - Math.max(box.top, n.y - n.r);
    return w > 0 && h > 0 ? sum + w * h : sum;
}, 0);

const candidates = (node: GraphNode, graph: Graph, w: number, h: number, gap: number, m: number, s: number): Box[] => {
    const { width: W, height: H } = graph.layout;
    const inside = (left: number, top: number): { left: number; top: number } => ({
        left: clamp(left, m, W - w - m),
        top: clamp(top, m, H - h - m),
    });
    const edge = 24 * s;
    const boxes: Box[] = [];
    for (const side of ORDER) {
        const vertical = side === 'above' || side === 'below';
        const room = { above: node.y - gap - m, below: H - node.y - gap - m, right: W - node.x - gap - m, left: node.x - gap - m }[side];
        if (room < (vertical ? h : w)) continue;
        const slides = vertical
            ? [node.x - w / 2, node.x - edge, node.x - w + edge]
            : [node.y - h / 2, node.y - edge, node.y - h + edge];
        for (const slide of slides) {
            const at = vertical
                ? inside(slide, side === 'above' ? node.y - gap - h : node.y + gap)
                : inside(side === 'right' ? node.x + gap : node.x - gap - w, slide);
            boxes.push({ ...at, width: w, height: h, side });
        }
    }
    return boxes;
};

const fallback = (node: GraphNode, graph: Graph, w: number, h: number, gap: number, m: number): Box => {
    const { width: W, height: H } = graph.layout;
    const room: Record<Side, number> = {
        above: node.y - gap - m - h,
        below: H - node.y - gap - m - h,
        right: W - node.x - gap - m - w,
        left: node.x - gap - m - w,
    };
    const side = ORDER.reduce((a, b) => (room[b] > room[a] ? b : a));
    if (side === 'above' || side === 'below') {
        const top = side === 'above' ? Math.max(m, node.y - gap - h) : Math.min(node.y + gap, H - h - m);
        const height = side === 'above' ? node.y - gap - top : h;
        return { left: clamp(node.x - w / 2, m, W - w - m), top, width: w, height, side };
    }
    return { left: side === 'right' ? node.x + gap : node.x - gap - w, top: clamp(node.y - h / 2, m, H - h - m), width: w, height: h, side };
};

export const infoPlacement = (graph: Graph, node: GraphNode, plan: InfoPlan, width = 380, avoid: GraphNode[] = []): Placement => {
    const s = scaleOf(graph.layout);
    const w = width * s;
    const h = Math.min(estimateHeight(plan) * s, graph.layout.height - 24 * s);
    const gap = node.r + (node.kind === 'project' ? 26 : 14) * s;
    const m = 12 * s;
    const others = avoid.filter((n) => n !== node);
    const options = candidates(node, graph, w, h, gap, m, s);
    const box = options.length
        ? options.reduce((best, b) => (covered(b, others) < covered(best, others) ? b : best))
        : fallback(node, graph, w, h, gap, m);
    const vertical = box.side === 'above' || box.side === 'below';
    const arrow = vertical ? clamp(node.x - box.left, 24 * s, box.width - 24 * s) : clamp(node.y - box.top, 24 * s, box.height - 24 * s);
    return { x: box.left - node.x, y: box.top - node.y, width: box.width, height: box.height, side: box.side, arrow };
};
