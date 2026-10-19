import { focusOf } from './focus.js';
import { DEFAULT_LABELS, formatters } from './labels.js';
import type { Formatters, Labels } from './labels.js';
import { scaleOf } from './model.js';
import { personShapes, projectColor, projectShapes, pulseColor, pulseRadius, statusColor } from './shapes.js';
import type { Shape } from './shapes.js';
import { resolveTheme } from './theme.js';
import type { Theme, ThemeInput } from './theme.js';
import type { Graph, GraphLink, GraphNode } from './types.js';

export interface SceneOptions {
    theme?: ThemeInput | undefined;
    locale?: string | undefined;
    labels?: Partial<Labels> | undefined;
    legend?: boolean | undefined;
    focus?: string | null | undefined;
}

export interface SceneNode {
    id: string;
    kind: GraphNode['kind'];
    node: GraphNode;
    label: string;
    opacity: number;
    dimmed: boolean;
    shapes: Shape[];
    pulse: { r: number; color: string };
    fingerprint: string;
}

export interface SceneLink {
    id: string;
    link: GraphLink;
    color: string;
    width: number;
    opacity: number;
    fade: number;
    fingerprint: string;
}

export interface LegendItem {
    key: string;
    label: string;
    color: string;
    x: number;
    y: number;
    r: number;
    size: number;
}

export interface Scene {
    width: number;
    height: number;
    title: string;
    theme: Theme;
    links: SceneLink[];
    nodes: SceneNode[];
    legend: LegendItem[];
}

const legendOf = (graph: Graph, theme: Theme): LegendItem[] => {
    if (graph.layout.legend <= 0 || graph.statuses.length === 0) return [];
    const s = scaleOf(graph.layout);
    const size = 22 * s;
    const r = 8 * s;
    const y = graph.area.y1 + ((graph.layout.legend + graph.layout.padding) * s) / 2;
    let x = graph.area.x0 + r;
    return graph.statuses.map((status, i) => {
        const item = { key: status.key, label: status.label, color: statusColor(status, i, theme), x, y, r, size };
        x += r * 2 + 10 * s + status.label.length * size * 0.56 + 32 * s;
        return item;
    });
};

const withFingerprint = (item: Omit<SceneNode, 'fingerprint'>): SceneNode => ({
    ...item,
    fingerprint: JSON.stringify([item.label, item.opacity, item.pulse, item.shapes]),
});

export const sceneNode = (
    node: GraphNode, graph: Graph, theme: Theme, format: Formatters, labels: Labels, dimmed = false,
): SceneNode => {
    const fade = dimmed ? theme.dimOpacity : 1;
    if (node.kind === 'project') {
        return withFingerprint({
            id: node.id, kind: node.kind, node, opacity: fade, dimmed,
            label: labels.project(node, format, graph.statuses),
            shapes: projectShapes(node, graph, theme),
            pulse: { r: pulseRadius(node, graph), color: pulseColor(node, theme) },
        });
    }
    return withFingerprint({
        id: node.id, kind: node.kind, node, dimmed,
        opacity: (node.data.active === false ? theme.inactiveOpacity : 1) * fade,
        label: labels.person(node, format),
        shapes: personShapes(node, graph, theme, format),
        pulse: { r: pulseRadius(node, graph), color: pulseColor(node, theme) },
    });
};

export const buildScene = (graph: Graph, options: SceneOptions = {}): Scene => {
    const theme = resolveTheme(options.theme);
    const format = formatters(options.locale);
    const labels: Labels = { ...DEFAULT_LABELS, ...options.labels };
    const order = (n: GraphNode): number => (n.kind === 'project' ? 0 : 1);
    const nodes = [...graph.nodes].sort((a, b) => order(a) - order(b));
    const focus = focusOf(graph, options.focus);
    return {
        width: graph.layout.width,
        height: graph.layout.height,
        title: labels.title(graph),
        theme,
        links: graph.links.map((link) => {
            const color = projectColor(link.target, theme);
            const opacity = theme.linkOpacity * (link.source.data.active === false ? 0.6 : 1);
            const fade = focus && !focus.links.has(link.id) ? theme.dimOpacity : 1;
            return { id: link.id, link, width: link.width, opacity, fade, color, fingerprint: `${color}|${link.width}|${opacity}|${fade}` };
        }),
        nodes: nodes.map((node) => sceneNode(node, graph, theme, format, labels, !!focus && !focus.nodes.has(node.id))),
        legend: options.legend === false ? [] : legendOf(graph, theme),
    };
};
