import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { run } from '../src/cli/run.js';
import type { Io } from '../src/cli/run.js';

const CSV = 'project,person,state,hours\nWeb,ana,pass,2\nWeb,ben,pending,1\nApp,ana,pass,3\n';

const fake = (files: Record<string, string>, png?: Io['png']): Io & { written: Map<string, string | Uint8Array>; stdout: string; stderr: string } => {
    const io = {
        written: new Map<string, string | Uint8Array>(),
        stdout: '',
        stderr: '',
        read: async (path: string) => {
            const text = files[path];
            if (text === undefined) throw new Error(`ENOENT ${path}`);
            return text;
        },
        write: async (path: string, data: string | Uint8Array) => {
            io.written.set(path, data);
        },
        out: (text: string) => {
            io.stdout += text;
        },
        err: (text: string) => {
            io.stderr += text;
        },
        png,
    };
    return io;
};

describe('tequio cli', () => {
    it('renders JSON data to stdout and is deterministic', async () => {
        const json = JSON.stringify({ projects: [{ id: 'a', name: 'A', progress: 0.5 }], people: [{ id: 'x', name: 'X' }], links: [{ person: 'x', project: 'a', weight: 1 }] });
        const a = fake({ 'g.json': json });
        const b = fake({ 'g.json': json });
        expect(await run(['render', 'g.json'], a)).toBe(0);
        await run(['render', 'g.json'], b);
        expect(a.stdout).toMatch(/^<svg/u);
        expect(a.stdout).toBe(b.stdout);
        expect(a.stdout).toContain('fill="#ffffff"');
    });

    it('maps CSV columns and writes a file with size and theme', async () => {
        const io = fake({ 'w.csv': CSV });
        const code = await run(['render', 'w.csv', '--status', 'state', '--weight', 'hours', '--open', 'pending', '--theme', 'dark', '--width', '800', '--height', '500', '-o', 'out.svg'], io);
        expect(code).toBe(0);
        const svg = String(io.written.get('out.svg'));
        expect(svg).toContain('width="800" height="500"');
        expect(svg).toContain('Participation graph: 2 projects and 2 people');
        expect(svg).toContain('<title>Web: 50% done, 1 pass, 1 pending</title>');
        expect(io.stderr).toContain('wrote out.svg');
    });

    it('validates and explains what is wrong', async () => {
        const good = fake({ 'w.csv': CSV });
        expect(await run(['validate', 'w.csv'], good)).toBe(0);
        expect(good.stdout).toBe('ok: 2 projects, 2 people, 3 links\n');
        const bad = fake({ 'b.json': JSON.stringify({ projects: [{ id: 'a', name: 'A', progress: 3 }], people: [], links: [] }) });
        expect(await run(['validate', 'b.json'], bad)).toBe(1);
        expect(bad.stderr).toContain('error projects[0].progress must be a number from 0 to 1');
        const piped = fake({ '-': CSV });
        expect(await run(['validate', '-'], piped)).toBe(0);
        const broken = fake({ 'c.json': '{' });
        expect(await run(['render', 'c.json'], broken)).toBe(1);
    });

    it('needs resvg for PNG and uses it when present', async () => {
        const without = fake({ 'w.csv': CSV });
        expect(await run(['render', 'w.csv', '-o', 'g.png'], without)).toBe(1);
        expect(without.stderr).toContain('@resvg/resvg-js');
        const { Resvg } = await import('@resvg/resvg-js');
        const png = async (svg: string, width: number): Promise<Uint8Array> => new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();
        const io = fake({ 'w.csv': CSV }, png);
        expect(await run(['render', 'w.csv', '-o', 'g.png', '--width', '640', '--height', '360'], io)).toBe(0);
        const bytes = io.written.get('g.png') as Uint8Array;
        expect([...bytes.slice(1, 4)].map((c) => String.fromCharCode(c)).join('')).toBe('PNG');
    });

    it('prints usage on bad arguments', async () => {
        const io = fake({});
        expect(await run(['draw'], io)).toBe(2);
        expect(io.stderr).toContain('Usage:');
        expect(await run(['--help'], io)).toBe(0);
        expect(await run(['render', 'x', '--bogus'], io)).toBe(2);
    });

    it('is wired as the package bin', () => {
        const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
        expect(pkg.bin.tequio).toBe('dist/cli/index.js');
        expect(readFileSync('src/cli/index.ts', 'utf8').startsWith('#!/usr/bin/env node')).toBe(true);
    });
});
