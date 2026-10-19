import type { Graph, PersonNode, ProjectNode, Status } from './types.js';

export interface Formatters {
    percent: (value: number) => string;
    metric: (value: number) => string;
}

export interface Labels {
    title: (graph: Graph) => string;
    project: (node: ProjectNode, format: Formatters, statuses: Status[]) => string;
    person: (node: PersonNode, format: Formatters) => string;
}

export const formatters = (locale = 'en'): Formatters => {
    const percent = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 });
    const compact = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 });
    const whole = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
    return {
        percent: (value) => percent.format(Math.min(1, Math.max(0, value || 0))),
        metric: (value) => (Math.abs(value) >= 1000 ? compact.format(value) : whole.format(value)),
    };
};

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

export const DEFAULT_LABELS: Labels = {
    title: (graph) => {
        const projects = graph.nodes.filter((n) => n.kind === 'project').length;
        const people = graph.nodes.length - projects;
        return `Participation graph: ${plural(projects, 'project', 'projects')} and ${plural(people, 'person', 'people')}`;
    },
    project: (node, format, statuses) => {
        const counts = statuses
            .filter((s) => (node.data.counts?.[s.key] ?? 0) > 0)
            .map((s) => `${format.metric(node.data.counts?.[s.key] ?? 0)} ${s.label.toLowerCase()}`);
        return [`${node.data.name}: ${format.percent(node.data.progress)} done`, ...counts].join(', ');
    },
    person: (node, format) => {
        const metric = node.data.metric === undefined ? '' : `: ${format.metric(node.data.metric)}`;
        return `${node.data.name}${metric}${node.data.active === false ? ' (inactive)' : ''}`;
    },
};
