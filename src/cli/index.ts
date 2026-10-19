#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { run } from './run.js';
import type { Io } from './run.js';

interface Resvg {
    Resvg: new (svg: string, options: {
        fitTo: { mode: 'width'; value: number };
        font: { loadSystemFonts: boolean; defaultFontFamily: string; sansSerifFamily: string };
    }) => { render: () => { asPng: () => Uint8Array } };
}

const stdin = async (): Promise<string> => {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks).toString('utf8');
};

const png = async (svg: string, width: number, font: string | undefined): Promise<Uint8Array> => {
    const name = '@resvg/resvg-js';
    const { Resvg } = await import(name) as Resvg;
    const family = font ?? (process.platform === 'linux' ? 'DejaVu Sans' : 'Arial');
    const options = { fitTo: { mode: 'width', value: width }, font: { loadSystemFonts: true, defaultFontFamily: family, sansSerifFamily: family } } as const;
    return new Resvg(svg, options).render().asPng();
};

const hasResvg = async (): Promise<boolean> => {
    try {
        const name = '@resvg/resvg-js';
        await import(name);
        return true;
    } catch {
        return false;
    }
};

const io: Io = {
    read: (path) => (path === '-' ? stdin() : readFile(path, 'utf8')),
    write: (path, data) => writeFile(path, data),
    out: (text) => process.stdout.write(text),
    err: (text) => process.stderr.write(text),
    png: (await hasResvg()) ? png : undefined,
};

process.exitCode = await run(process.argv.slice(2), io);
