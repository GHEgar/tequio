import type { GraphData, Link, Person, Project, Status, Tone } from './types.js';

export type Row = Record<string, unknown>;

export type Field<T> = string | ((row: Row) => T);

export interface RowMapping {
    person: Field<string | null | undefined>;
    project: Field<string | null | undefined>;
    personName?: Field<string | null | undefined> | undefined;
    projectName?: Field<string | null | undefined> | undefined;
    status?: Field<string | null | undefined> | undefined;
    weight?: Field<number | string | null | undefined> | undefined;
    active?: Field<boolean | string | null | undefined> | undefined;
    statuses?: Status[] | undefined;
    open?: string[] | undefined;
    progress?: ((rows: Row[]) => number) | undefined;
}

const read = <T>(row: Row, field: Field<T> | undefined): unknown => {
    if (field === undefined) return undefined;
    return typeof field === 'function' ? field(row) : row[field];
};

const text = (value: unknown): string => (value === null || value === undefined ? '' : String(value).trim());

const amount = (value: unknown): number => {
    if (value === undefined || value === null || value === '') return 1;
    const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : 0;
};

const TONE_WORDS: [Tone, RegExp][] = [
    ['good', /^(pass(ed)?|ok|done|closed|complete(d)?|resolved|approved|pasa|aprobad[oa]|hech[oa]|cerrad[oa]|resuelt[oa]|list[oa])$/u],
    ['critical', /^(fail(ed|ure)?|error|bug|rejected|falla|fall[oó]|rechazad[oa])$/u],
    ['warning', /^(blocked|on.?hold|warning|no.?pude|bloquead[oa]|en.?espera)$/u],
    ['serious', /^(late|overdue|at.?risk|atrasad[oa]|vencid[oa])$/u],
    ['neutral', /^(pending|to.?do|open|new|backlog|waiting|pendiente|abiert[oa]|nuev[oa]|por.?hacer|sin.?empezar)$/u],
];

export const guessTone = (key: string): Tone | undefined => {
    const word = key.trim().toLowerCase().replace(/[\s_-]+/gu, ' ');
    return TONE_WORDS.find(([, re]) => re.test(word))?.[0];
};

const YES = new Set(['true', '1', 'yes', 'y', 'si', 'sí', 'x']);

const truthy = (value: unknown): boolean | undefined => {
    if (value === undefined || value === null || value === '') return undefined;
    return typeof value === 'boolean' ? value : YES.has(String(value).trim().toLowerCase());
};

interface ProjectAcc {
    name: string;
    rows: Row[];
    counts: Record<string, number>;
}

interface PersonAcc {
    name: string;
    metric: number;
    active: boolean | undefined;
}

export const fromRows = (rows: Row[], mapping: RowMapping): GraphData => {
    const projects = new Map<string, ProjectAcc>();
    const people = new Map<string, PersonAcc>();
    const weights = new Map<string, number>();
    const seen: string[] = [];
    for (const row of rows) {
        const project = text(read(row, mapping.project));
        if (!project) continue;
        const p = projects.get(project) ?? { name: text(read(row, mapping.projectName)) || project, rows: [], counts: {} };
        projects.set(project, p);
        p.rows.push(row);
        const status = text(read(row, mapping.status));
        if (status) {
            p.counts[status] = (p.counts[status] ?? 0) + 1;
            if (!seen.includes(status)) seen.push(status);
        }
        const person = text(read(row, mapping.person));
        if (!person) continue;
        const weight = amount(read(row, mapping.weight));
        const who = people.get(person) ?? { name: text(read(row, mapping.personName)) || person, metric: 0, active: undefined };
        people.set(person, who);
        who.metric += weight;
        const active = truthy(read(row, mapping.active));
        if (active !== undefined) who.active = (who.active ?? false) || active;
        if (weight > 0) weights.set(`${person}\u0000${project}`, (weights.get(`${person}\u0000${project}`) ?? 0) + weight);
    }
    const statuses: Status[] = mapping.statuses ?? seen.map((key) => {
        const tone = guessTone(key);
        return tone ? { key, label: key, tone } : { key, label: key };
    });
    const open = new Set(mapping.open ?? statuses.filter((s) => s.tone === 'neutral').map((s) => s.key));
    const projectList: Project[] = [...projects].map(([id, p]) => {
        const total = p.rows.length;
        const pending = Object.entries(p.counts).reduce((a, [k, v]) => a + (open.has(k) ? v : 0), 0);
        const progress = mapping.progress ? mapping.progress(p.rows) : total && mapping.status !== undefined ? (total - pending) / total : 0;
        return { id, name: p.name, progress: Math.min(1, Math.max(0, progress)), counts: p.counts };
    });
    const peopleList: Person[] = [...people].map(([id, p]) => ({
        id, name: p.name, metric: Math.round(p.metric * 100) / 100, ...(p.active === undefined ? {} : { active: p.active }),
    }));
    const links: Link[] = [...weights].map(([key, weight]) => {
        const [person = '', project = ''] = key.split('\u0000');
        return { person, project, weight };
    });
    return { statuses, projects: projectList, people: peopleList, links };
};
