import { jitter } from './hash.js';
import type {
    Area, Gaps, Graph, GraphData, GraphLink, GraphNode, Layout, Link, Memory, PersonNode, ProjectNode, Pulse, Remembered,
} from './types.js';

export const DEFAULT_LAYOUT: Layout = { width: 1920, height: 1080, padding: 64, legend: 64, personRadius: 22 };

export interface BuildOptions {
    layout?: Partial<Layout> | undefined;
    memory?: Memory | undefined;
}

export const projectKey = (id: string): string => `p:${id}`;
export const personKey = (id: string): string => `u:${id}`;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

export const scaleOf = (layout: Layout): number => Math.min(layout.width / 1920, layout.height / 1080);

export const areaOf = (layout: Layout): Area => {
    const s = scaleOf(layout);
    return {
        x0: layout.padding * s,
        x1: layout.width - layout.padding * s,
        y0: layout.padding * s,
        y1: layout.height - (layout.padding + layout.legend) * s,
    };
};

const centerOf = (area: Area): { x: number; y: number } => ({ x: (area.x0 + area.x1) / 2, y: (area.y0 + area.y1) / 2 });

const mergeLinks = (data: GraphData): Link[] => {
    const projects = new Set(data.projects.map((p) => p.id));
    const people = new Set(data.people.map((p) => p.id));
    const merged = new Map<string, Link>();
    for (const link of data.links) {
        if (!(link.weight > 0) || !projects.has(link.project) || !people.has(link.person)) continue;
        const key = `${link.person}\u0000${link.project}`;
        const previous = merged.get(key);
        merged.set(key, { ...link, weight: (previous?.weight ?? 0) + link.weight });
    }
    return [...merged.values()];
};

const ellipse = (area: Area, index: number, total: number): { x: number; y: number } => {
    const center = centerOf(area);
    if (total === 1) return center;
    const angle = (index / total) * Math.PI * 2 + Math.PI;
    return {
        x: center.x + Math.cos(angle) * (area.x1 - area.x0) * 0.31,
        y: center.y + Math.sin(angle) * (area.y1 - area.y0) * 0.27,
    };
};

const gapsOf = (area: Area, projects: number, people: number, maxRadius: number, layout: Layout, s: number): Gaps => {
    const rx = (area.x1 - area.x0) * 0.31;
    const ry = (area.y1 - area.y0) * 0.27;
    const perimeter = 2 * Math.PI * Math.sqrt((rx * rx + ry * ry) / 2);
    const spacing = Math.sqrt(((area.x1 - area.x0) * (area.y1 - area.y0) * 0.55) / Math.max(people, 1));
    return {
        project: clamp(perimeter / Math.max(projects, 1) - 2 * maxRadius, 40 * s, 420 * s),
        mixed: 36 * s,
        person: clamp(spacing - 2 * layout.personRadius, 6 * s, 90 * s),
    };
};

const signatureOfCounts = (counts: Record<string, number> | undefined): string => Object.keys(counts ?? {})
    .sort()
    .map((k) => `${k}=${counts?.[k] ?? 0}`)
    .join(',');

const place = <T extends GraphNode>(node: T, previous: Remembered | undefined): T => {
    if (!previous) return node;
    return { ...node, x: previous.x, y: previous.y, vx: previous.vx, vy: previous.vy };
};

export const buildGraph = (data: GraphData, options: BuildOptions = {}): Graph => {
    const layout: Layout = { ...DEFAULT_LAYOUT, ...options.layout };
    const memory = options.memory ?? new Map<string, Remembered>();
    const s = scaleOf(layout);
    const area = areaOf(layout);
    const links = mergeLinks(data);
    const totals = new Map<string, number>();
    for (const link of links) totals.set(link.project, (totals.get(link.project) ?? 0) + link.weight);
    const maxTotal = Math.max(1, ...totals.values());
    const maxWeight = Math.max(1, ...links.map((l) => l.weight));
    const byId = new Map<string, GraphNode>();
    const nodes: GraphNode[] = [];
    let added = 0;
    const keep = <T extends GraphNode>(node: T): T => {
        const previous = memory.get(node.id);
        if (!previous) added += 1;
        const placed = place(node, previous);
        nodes.push(placed);
        byId.set(placed.id, placed);
        return placed;
    };

    data.projects.forEach((project, index) => {
        const id = projectKey(project.id);
        const total = totals.get(project.id) ?? 0;
        const start = ellipse(area, index, data.projects.length);
        keep<ProjectNode>({
            kind: 'project', id, data: project, index, total,
            ...start, vx: 0, vy: 0,
            r: (46 + 30 * Math.sqrt(total / maxTotal)) * s,
            signature: `${project.progress}|${signatureOfCounts(project.counts)}`,
        });
    });

    const peopleLinks = new Map<string, Link[]>();
    for (const link of links) peopleLinks.set(link.person, [...(peopleLinks.get(link.person) ?? []), link]);
    const center = centerOf(area);

    data.people.forEach((person, index) => {
        const id = personKey(person.id);
        const own = peopleLinks.get(person.id) ?? [];
        const weight = own.reduce((a, l) => a + l.weight, 0);
        const base = own.reduce((a, l) => {
            const target = byId.get(projectKey(l.project));
            return target ? { x: a.x + (target.x * l.weight) / weight, y: a.y + (target.y * l.weight) / weight } : a;
        }, own.length ? { x: 0, y: 0 } : center);
        const spread = (own.length ? 240 : 600) * s;
        keep<PersonNode>({
            kind: 'person', id, data: person, index,
            x: base.x + jitter(`${id}x`, spread), y: base.y + jitter(`${id}y`, spread), vx: 0, vy: 0,
            r: layout.personRadius * s,
            signature: `${person.metric ?? ''}|${person.active === false ? 0 : 1}`,
        });
    });

    const graphLinks: GraphLink[] = [];
    for (const link of links) {
        const source = byId.get(personKey(link.person));
        const target = byId.get(projectKey(link.project));
        if (source?.kind !== 'person' || target?.kind !== 'project') continue;
        const share = link.weight / maxWeight;
        graphLinks.push({
            id: `${source.id}>${target.id}`, source, target, weight: link.weight,
            width: (1.5 + 9 * share) * s,
            length: (150 + 120 * (1 - share)) * s + target.r,
        });
    }

    const maxRadius = Math.max(0, ...nodes.filter((n) => n.kind === 'project').map((n) => n.r));
    const gaps = gapsOf(area, data.projects.length, data.people.length, maxRadius, layout, s);
    return { nodes, links: graphLinks, byId, statuses: data.statuses ?? [], layout, area, gaps, added };
};

export const remember = (graph: Graph, memory: Memory): Memory => {
    memory.clear();
    for (const n of graph.nodes) memory.set(n.id, { x: n.x, y: n.y, vx: n.vx, vy: n.vy, signature: n.signature });
    return memory;
};

export const changes = (graph: Graph, memory: Memory, version = 0): Pulse[] => graph.nodes
    .filter((n) => {
        const previous = memory.get(n.id);
        return previous !== undefined && previous.signature !== n.signature;
    })
    .map((n) => ({ id: n.id, key: `${n.id}:${version}` }));
