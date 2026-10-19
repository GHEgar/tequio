import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromRows, parseCsv, parseCsvRows, toSvg, validate } from '@npmegar/tequio';
import { demoData } from '../demo/data.js';

describe('validate', () => {
    it('accepts the demo data', () => {
        const result = validate(demoData());
        expect(result.ok).toBe(true);
        expect(result.warnings).toEqual([]);
    });

    it('reports every error with its path', () => {
        const result = validate({
            statuses: [{ key: 'ok', label: 'Ok', tone: 'happy' }],
            projects: [{ id: 'a', name: 'A', progress: 2, counts: { ok: -1 } }, { id: 'a', name: 'A2', progress: 0 }],
            people: [{ id: 'x', name: 'X', active: 'yes', details: [{ label: 'L', value: true }] }],
            links: [{ person: 'x', project: 'a', weight: 0 }],
        });
        expect(result.ok).toBe(false);
        if (result.ok) return;
        expect(result.errors.map((e) => e.path)).toEqual([
            'statuses[0].tone', 'projects[0].progress', 'projects[0].counts.ok', 'people[0].active',
            'people[0].details[0].value', 'projects[1].id', 'links[0].weight',
        ]);
    });

    it('warns about what will be skipped', () => {
        const result = validate({
            statuses: [{ key: 'ok', label: 'Ok' }],
            projects: [{ id: 'a', name: 'A', progress: 0, counts: { other: 1 } }],
            people: [],
            links: [{ person: 'ghost', project: 'a', weight: 1 }],
        });
        expect(result.ok).toBe(true);
        expect(result.warnings.map((w) => w.path)).toEqual(['projects[0].counts.other', 'links[0].person']);
    });

    it('rejects what is not a graph', () => {
        expect(validate(null).ok).toBe(false);
        expect(validate({ projects: {} }).ok).toBe(false);
    });

    it('ships a JSON Schema with the same required fields', () => {
        const schema = JSON.parse(readFileSync('schema.json', 'utf8'));
        expect(schema.required).toEqual(['projects', 'people', 'links']);
        expect(schema.properties.projects.items.required).toEqual(['id', 'name', 'progress']);
        expect(schema.properties.links.items.required).toEqual(['person', 'project', 'weight']);
    });
});

describe('parseCsv', () => {
    it('handles quotes, escaped quotes, CRLF, BOM and blank lines', () => {
        const text = '﻿name,note\r\n"Doe, Ana","said ""hi"""\r\n\r\nBen,\n';
        expect(parseCsv(text)).toEqual([{ name: 'Doe, Ana', note: 'said "hi"' }, { name: 'Ben', note: '' }]);
    });

    it('detects semicolons and tabs', () => {
        expect(parseCsvRows('a;b\n1;2')).toEqual([['a', 'b'], ['1', '2']]);
        expect(parseCsvRows('a\tb\n1\t2')).toEqual([['a', 'b'], ['1', '2']]);
    });
});

describe('fromRows', () => {
    const csv = [
        'case,project,owner,state,hours,online',
        '1,Web,ana,pass,2,yes',
        '2,Web,ana,fail,1,yes',
        '3,Web,ben,pending,,no',
        '4,App,ben,pass,3,',
        '5,App,,pending,,',
    ].join('\n');

    it('turns one row per unit of work into a graph', () => {
        const data = fromRows(parseCsv(csv), {
            person: 'owner', project: 'project', status: 'state', weight: 'hours', active: 'online',
            statuses: [{ key: 'pass', label: 'Pass', tone: 'good' }, { key: 'fail', label: 'Fail', tone: 'critical' }, { key: 'pending', label: 'Pending', tone: 'neutral' }],
        });
        expect(validate(data).ok).toBe(true);
        expect(data.projects).toEqual([
            { id: 'Web', name: 'Web', progress: 2 / 3, counts: { pass: 1, fail: 1, pending: 1 } },
            { id: 'App', name: 'App', progress: 0.5, counts: { pass: 1, pending: 1 } },
        ]);
        expect(data.people).toEqual([
            { id: 'ana', name: 'ana', metric: 3, active: true },
            { id: 'ben', name: 'ben', metric: 4, active: false },
        ]);
        expect(data.links).toEqual([
            { person: 'ana', project: 'Web', weight: 3 },
            { person: 'ben', project: 'Web', weight: 1 },
            { person: 'ben', project: 'App', weight: 3 },
        ]);
    });

    it('derives statuses, accepts functions and a custom progress', () => {
        const data = fromRows(parseCsv(csv), {
            person: (r) => String(r.owner).toUpperCase(), project: 'project', status: 'state',
            projectName: (r) => `Project ${String(r.project)}`, progress: (rows) => rows.length / 10,
        });
        expect(data.statuses?.map((s) => s.key)).toEqual(['pass', 'fail', 'pending']);
        expect(data.projects[0]).toMatchObject({ name: 'Project Web', progress: 0.3 });
        expect(data.people.map((p) => p.id)).toEqual(['ANA', 'BEN']);
        expect(toSvg(data)).toContain('<svg');
    });
});
