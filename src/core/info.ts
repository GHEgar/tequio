import { formatters, isSpanish } from './labels.js';
import { personColor, projectColor, statusColor } from './shapes.js';
import { resolveTheme } from './theme.js';
import type { ThemeInput } from './theme.js';
import type { Detail, Graph, GraphNode, PersonNode, ProjectNode } from './types.js';

export interface InfoItem {
    label: string;
    value: string;
    color?: string | undefined;
    href?: string | undefined;
}

export type InfoBlock =
    | { type: 'badges'; items: { label: string; color: string }[] }
    | { type: 'cards'; items: InfoItem[] }
    | { type: 'list'; title?: string | undefined; items: InfoItem[] }
    | { type: 'text'; text: string };

export interface InfoPlan {
    id: string;
    kind: GraphNode['kind'];
    title: string;
    image?: string | undefined;
    color: string;
    blocks: InfoBlock[];
}

export interface InfoLabels {
    progress: string;
    people: string;
    work: string;
    projects: string;
    metric: string;
    active: string;
    inactive: string;
    statuses: string;
    top: string;
    close: string;
    resume: string;
    next: string;
}

export interface InfoOptions {
    theme?: ThemeInput | undefined;
    locale?: string | undefined;
    labels?: Partial<InfoLabels> | undefined;
    top?: number | undefined;
}

export const DEFAULT_INFO_LABELS: InfoLabels = {
    progress: 'Progress',
    people: 'People',
    work: 'Work',
    projects: 'Projects',
    metric: 'Metric',
    active: 'Active',
    inactive: 'Inactive',
    statuses: 'Statuses',
    top: 'Top contributors',
    close: 'Close',
    resume: 'Resume tour',
    next: 'Time until the next card',
};

const SAFE = /^(https?:|mailto:|tel:|\/(?!\/))/i;

export const safeHref = (href: string | undefined): string | undefined => (href && SAFE.test(href.trim()) ? href.trim() : undefined);

const detailsOf = (details: Detail[] | undefined, metric: (n: number) => string): InfoBlock[] => {
    if (!details?.length) return [];
    return [{
        type: 'list',
        items: details.map((d) => ({
            label: d.label, value: typeof d.value === 'number' ? metric(d.value) : d.value, href: safeHref(d.href),
        })),
    }];
};

const textOf = (text: string | undefined): InfoBlock[] => (text?.trim() ? [{ type: 'text', text: text.trim() }] : []);

const projectPlan = (graph: Graph, node: ProjectNode, options: InfoOptions, labels: InfoLabels): InfoPlan => {
    const theme = resolveTheme(options.theme);
    const format = formatters(options.locale);
    const links = graph.links.filter((l) => l.target === node).sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));
    const statuses = graph.statuses
        .map((status, i) => ({ status, value: node.data.counts?.[status.key] ?? 0, color: statusColor(status, i, theme) }))
        .filter((s) => s.value > 0);
    const blocks: InfoBlock[] = [
        ...textOf(node.data.description),
        {
            type: 'cards',
            items: [
                { label: labels.progress, value: format.percent(node.data.progress) },
                { label: labels.people, value: format.metric(links.length) },
                { label: labels.work, value: format.metric(node.total) },
            ],
        },
    ];
    if (statuses.length) {
        blocks.push({
            type: 'list',
            title: labels.statuses,
            items: statuses.map((s) => ({ label: s.status.label, value: format.metric(s.value), color: s.color })),
        });
    }
    if (links.length) {
        blocks.push({
            type: 'list',
            title: labels.top,
            items: links.slice(0, options.top ?? 3).map((l) => ({
                label: l.source.data.name, value: format.metric(l.weight), color: personColor(l.source, theme),
            })),
        });
    }
    blocks.push(...detailsOf(node.data.details, format.metric));
    return { id: node.id, kind: 'project', title: node.data.name, image: node.data.logo, color: projectColor(node, theme), blocks };
};

const personPlan = (graph: Graph, node: PersonNode, options: InfoOptions, labels: InfoLabels): InfoPlan => {
    const theme = resolveTheme(options.theme);
    const format = formatters(options.locale);
    const links = graph.links.filter((l) => l.source === node).sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));
    const active = node.data.active !== false;
    const cards: InfoItem[] = [{ label: labels.projects, value: format.metric(links.length) }];
    if (node.data.metric !== undefined) cards.unshift({ label: labels.metric, value: format.metric(node.data.metric) });
    const blocks: InfoBlock[] = [
        { type: 'badges', items: [{ label: active ? labels.active : labels.inactive, color: active ? theme.tones.good : theme.track }] },
        ...textOf(node.data.description),
        { type: 'cards', items: cards },
    ];
    if (links.length) {
        blocks.push({
            type: 'list',
            title: labels.projects,
            items: links.map((l) => ({ label: l.target.data.name, value: format.metric(l.weight), color: projectColor(l.target, theme) })),
        });
    }
    blocks.push(...detailsOf(node.data.details, format.metric));
    return { id: node.id, kind: 'person', title: node.data.name, image: node.data.avatar, color: personColor(node, theme), blocks };
};

export const SPANISH_INFO_LABELS: InfoLabels = {
    progress: 'Avance',
    people: 'Personas',
    work: 'Trabajo',
    projects: 'Proyectos',
    metric: 'Métrica',
    active: 'Activa',
    inactive: 'Inactiva',
    statuses: 'Estados',
    top: 'Quienes más aportan',
    close: 'Cerrar',
    resume: 'Reanudar recorrido',
    next: 'Tiempo para la siguiente tarjeta',
};

export const infoLabels = (labels?: Partial<InfoLabels>, locale?: string): InfoLabels => ({
    ...(isSpanish(locale) ? SPANISH_INFO_LABELS : DEFAULT_INFO_LABELS),
    ...labels,
});

export const infoPlan = (graph: Graph, id: string, options: InfoOptions = {}): InfoPlan | null => {
    const node = graph.byId.get(id);
    if (!node) return null;
    const labels = infoLabels(options.labels, options.locale);
    return node.kind === 'project' ? projectPlan(graph, node, options, labels) : personPlan(graph, node, options, labels);
};

const BLOCK_HEIGHT = { header: 64, badges: 40, cards: 92, text: 56, title: 30, row: 32 };

export const estimateHeight = (plan: InfoPlan): number => plan.blocks.reduce((h, block) => {
    if (block.type === 'list') return h + (block.title ? BLOCK_HEIGHT.title : 0) + block.items.length * BLOCK_HEIGHT.row + 12;
    if (block.type === 'text') return h + BLOCK_HEIGHT.text * Math.ceil(block.text.length / 60);
    return h + BLOCK_HEIGHT[block.type];
}, BLOCK_HEIGHT.header + 24);
