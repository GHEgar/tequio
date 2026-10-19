import type { GraphData } from './types.js';

export interface ValidationIssue {
    path: string;
    message: string;
}

export type Validation =
    | { ok: true; data: GraphData; warnings: ValidationIssue[] }
    | { ok: false; errors: ValidationIssue[]; warnings: ValidationIssue[] };

type Bag = Record<string, unknown>;

const TONES = new Set(['good', 'warning', 'serious', 'critical', 'neutral']);

const isObject = (value: unknown): value is Bag => typeof value === 'object' && value !== null && !Array.isArray(value);

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

class Checker {
    errors: ValidationIssue[] = [];
    warnings: ValidationIssue[] = [];

    fail(path: string, message: string): void {
        this.errors.push({ path, message });
    }

    warn(path: string, message: string): void {
        this.warnings.push({ path, message });
    }

    string(item: Bag, key: string, path: string, required: boolean): void {
        const value = item[key];
        if (value === undefined) {
            if (required) this.fail(`${path}.${key}`, 'is required');
            return;
        }
        if (typeof value !== 'string') this.fail(`${path}.${key}`, 'must be a string');
        else if (required && key === 'id' && value.length === 0) this.fail(`${path}.${key}`, 'must not be empty');
    }

    list(data: Bag, key: string, required: boolean): Bag[] {
        const value = data[key];
        if (value === undefined && !required) return [];
        if (!Array.isArray(value)) {
            this.fail(key, 'must be an array');
            return [];
        }
        return value.filter((item, i) => {
            if (isObject(item)) return true;
            this.fail(`${key}[${i}]`, 'must be an object');
            return false;
        });
    }

    details(item: Bag, path: string): void {
        if (item.details === undefined) return;
        if (!Array.isArray(item.details)) {
            this.fail(`${path}.details`, 'must be an array');
            return;
        }
        item.details.forEach((d: unknown, i) => {
            const at = `${path}.details[${i}]`;
            if (!isObject(d)) return this.fail(at, 'must be an object');
            this.string(d, 'label', at, true);
            if (typeof d.value !== 'string' && !isNumber(d.value)) this.fail(`${at}.value`, 'must be a string or a number');
            this.string(d, 'href', at, false);
            return undefined;
        });
    }

    unique(items: Bag[], kind: string): Set<string> {
        const seen = new Set<string>();
        items.forEach((item, i) => {
            if (typeof item.id !== 'string') return;
            if (seen.has(item.id)) this.fail(`${kind}[${i}].id`, `duplicates "${item.id}"`);
            seen.add(item.id);
        });
        return seen;
    }
}

export const validate = (input: unknown): Validation => {
    const c = new Checker();
    if (!isObject(input)) return { ok: false, errors: [{ path: '', message: 'must be an object' }], warnings: [] };
    const statuses = c.list(input, 'statuses', false);
    const projects = c.list(input, 'projects', true);
    const people = c.list(input, 'people', true);
    const links = c.list(input, 'links', true);
    const keys = new Set<string>();
    statuses.forEach((s, i) => {
        const at = `statuses[${i}]`;
        c.string(s, 'key', at, true);
        c.string(s, 'label', at, true);
        c.string(s, 'color', at, false);
        if (s.tone !== undefined && !TONES.has(String(s.tone))) c.fail(`${at}.tone`, `must be one of ${[...TONES].join(', ')}`);
        if (typeof s.key === 'string') keys.add(s.key);
    });
    projects.forEach((p, i) => {
        const at = `projects[${i}]`;
        ['id', 'name'].forEach((k) => c.string(p, k, at, true));
        ['description', 'logo', 'color'].forEach((k) => c.string(p, k, at, false));
        if (!isNumber(p.progress) || p.progress < 0 || p.progress > 1) c.fail(`${at}.progress`, 'must be a number from 0 to 1');
        if (p.counts !== undefined && !isObject(p.counts)) c.fail(`${at}.counts`, 'must be an object');
        if (isObject(p.counts)) {
            Object.entries(p.counts).forEach(([k, v]) => {
                if (!isNumber(v) || v < 0) c.fail(`${at}.counts.${k}`, 'must be a number of at least 0');
                else if (keys.size > 0 && !keys.has(k)) c.warn(`${at}.counts.${k}`, 'is not a declared status and will not be drawn');
            });
        }
        c.details(p, at);
    });
    people.forEach((p, i) => {
        const at = `people[${i}]`;
        ['id', 'name'].forEach((k) => c.string(p, k, at, true));
        ['description', 'avatar', 'color'].forEach((k) => c.string(p, k, at, false));
        if (p.metric !== undefined && !isNumber(p.metric)) c.fail(`${at}.metric`, 'must be a number');
        if (p.active !== undefined && typeof p.active !== 'boolean') c.fail(`${at}.active`, 'must be a boolean');
        c.details(p, at);
    });
    const projectIds = c.unique(projects, 'projects');
    const personIds = c.unique(people, 'people');
    links.forEach((l, i) => {
        const at = `links[${i}]`;
        c.string(l, 'person', at, true);
        c.string(l, 'project', at, true);
        if (!isNumber(l.weight) || l.weight <= 0) c.fail(`${at}.weight`, 'must be a number greater than 0');
        if (typeof l.person === 'string' && !personIds.has(l.person)) c.warn(`${at}.person`, `"${l.person}" is not in people and will be skipped`);
        if (typeof l.project === 'string' && !projectIds.has(l.project)) c.warn(`${at}.project`, `"${l.project}" is not in projects and will be skipped`);
    });
    return c.errors.length
        ? { ok: false, errors: c.errors, warnings: c.warnings }
        : { ok: true, data: input as unknown as GraphData, warnings: c.warnings };
};
