import { hash } from './hash.js';
import type { Formatters } from './labels.js';
import { scaleOf } from './model.js';
import type { Theme } from './theme.js';
import type { Graph, PersonNode, ProjectNode, Status } from './types.js';

export interface CircleShape {
    type: 'circle';
    r: number;
    fill: string;
    stroke?: string | undefined;
    strokeWidth?: number | undefined;
    dash?: string | undefined;
    dashOffset?: number | undefined;
    rotate?: number | undefined;
}

export interface TextShape {
    type: 'text';
    y: number;
    text: string;
    size: number;
    weight: number;
    fill: string;
    halo?: string | undefined;
    haloWidth?: number | undefined;
}

export interface ImageShape {
    type: 'image';
    href: string;
    size: number;
    y: number;
    round: boolean;
}

export type Shape = CircleShape | TextShape | ImageShape;

export const statusColor = (status: Status, index: number, theme: Theme): string => status.color
    ?? (status.tone ? theme.tones[status.tone] : theme.palette[index % theme.palette.length] as string);

export const projectColor = (node: ProjectNode, theme: Theme): string => node.data.color
    ?? theme.palette[node.index % theme.palette.length] as string;

export const personColor = (node: PersonNode, theme: Theme): string => node.data.color
    ?? theme.palette[Math.floor(hash(node.id) * theme.palette.length)] as string;

const fixed = (n: number): number => Math.round(n * 100) / 100;

export const ringRadius = (node: ProjectNode, s: number): number => node.r + 9 * s;

const statusRing = (node: ProjectNode, statuses: Status[], theme: Theme, s: number): CircleShape[] => {
    const r = ringRadius(node, s);
    const width = 8 * s;
    const track: CircleShape = { type: 'circle', r, fill: 'none', stroke: theme.track, strokeWidth: width };
    const values = statuses.map((status) => Math.max(0, node.data.counts?.[status.key] ?? 0));
    const total = values.reduce((a, b) => a + b, 0);
    if (total === 0) return [track];
    const circumference = 2 * Math.PI * r;
    const gap = values.filter((v) => v > 0).length > 1 ? 3 * s : 0;
    let start = 0;
    const arcs: CircleShape[] = [];
    statuses.forEach((status, i) => {
        const value = values[i] ?? 0;
        if (value === 0) return;
        const length = (value / total) * circumference;
        arcs.push({
            type: 'circle', r, fill: 'none', stroke: statusColor(status, i, theme), strokeWidth: width, rotate: -90,
            dash: `${fixed(Math.max(length - gap, 0.5))} ${fixed(circumference)}`, dashOffset: fixed(-start),
        });
        start += length;
    });
    return [track, ...arcs];
};

export const projectShapes = (node: ProjectNode, graph: Graph, theme: Theme, format: Formatters): Shape[] => {
    const s = scaleOf(graph.layout);
    const { r } = node;
    const emblem: Shape = node.data.logo
        ? { type: 'image', href: node.data.logo, size: r * 0.8, y: -r * 0.2, round: false }
        : {
            type: 'text', y: -r * 0.2 + r * 0.22, text: node.data.name.trim().slice(0, 1).toUpperCase(),
            size: r * 0.62, weight: 700, fill: theme.text,
        };
    return [
        ...statusRing(node, graph.statuses, theme, s),
        { type: 'circle', r, fill: theme.surface, stroke: projectColor(node, theme), strokeWidth: 5 * s },
        emblem,
        { type: 'text', y: r * 0.62, text: format.percent(node.data.progress), size: r * 0.34, weight: 700, fill: theme.text },
    ];
};

export const personShapes = (node: PersonNode, graph: Graph, theme: Theme, format: Formatters): Shape[] => {
    const s = scaleOf(graph.layout);
    const { r } = node;
    const shapes: Shape[] = [];
    if (node.data.active !== false) {
        shapes.push({ type: 'circle', r: r + 4 * s, fill: 'none', stroke: theme.text, strokeWidth: 2.5 * s });
    }
    shapes.push({ type: 'circle', r, fill: personColor(node, theme) });
    if (node.data.avatar) shapes.push({ type: 'image', href: node.data.avatar, size: r * 2, y: 0, round: true });
    shapes.push({ type: 'circle', r, fill: 'none', stroke: theme.surface, strokeWidth: 2 * s });
    if (node.data.metric !== undefined) {
        const text = format.metric(node.data.metric);
        const size = r * (text.length > 3 ? 0.62 : 0.8);
        shapes.push({
            type: 'text', y: size * 0.35, text, size, weight: 700, fill: theme.text, halo: theme.surface, haloWidth: 3.5 * s,
        });
    }
    return shapes;
};

export const pulseColor = (node: ProjectNode | PersonNode, theme: Theme): string => (
    node.kind === 'person' ? personColor(node, theme) : theme.text
);

export const pulseRadius = (node: ProjectNode | PersonNode, graph: Graph): number => {
    const s = scaleOf(graph.layout);
    return node.kind === 'project' ? ringRadius(node, s) : node.r + 4 * s;
};
