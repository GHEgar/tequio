import { parseArgs } from 'node:util';
import { fromRows, parseCsv, toSvg, validate } from '../core/index.js';
import type { GraphData, Row, RowMapping, ThemeInput } from '../core/index.js';

export interface Io {
    read: (path: string) => Promise<string>;
    write: (path: string, data: string | Uint8Array) => Promise<void>;
    out: (text: string) => void;
    err: (text: string) => void;
    png?: ((svg: string, width: number, font: string | undefined) => Promise<Uint8Array>) | undefined;
}

export const USAGE = `Usage:
  tequio render <input> [-o out.svg|out.png] [options]
  tequio validate <input>

Input is a .json file with tequio data or an array of rows, or a .csv file; "-" reads stdin.

Options:
  -o, --out <file>        write here instead of stdout (.png needs @resvg/resvg-js)
  --theme <dark|light>    default light
  --width <px>            default 1920
  --height <px>           default 1080
  --locale <tag>          number format, default en
  --no-legend             drop the status legend
  --font <family>         PNG text font (default DejaVu Sans on Linux, Arial elsewhere)
  --person <column>       rows: who did the work (default person)
  --project <column>      rows: where (default project)
  --status <column>       rows: status of each unit
  --weight <column>       rows: amount of work (default 1 per row)
  --active <column>       rows: yes/no for active people
  --open <a,b>            rows: statuses that are not done yet
`;

const OPTIONS = {
    out: { type: 'string', short: 'o' },
    theme: { type: 'string' },
    width: { type: 'string' },
    height: { type: 'string' },
    locale: { type: 'string' },
    'no-legend': { type: 'boolean' },
    font: { type: 'string' },
    person: { type: 'string' },
    project: { type: 'string' },
    status: { type: 'string' },
    weight: { type: 'string' },
    active: { type: 'string' },
    open: { type: 'string' },
    help: { type: 'boolean', short: 'h' },
} as const;

type Values = ReturnType<typeof parseArgs<{ options: typeof OPTIONS; allowPositionals: true }>>['values'];

const mappingOf = (v: Values): RowMapping => ({
    person: v.person ?? 'person',
    project: v.project ?? 'project',
    status: v.status,
    weight: v.weight,
    active: v.active,
    open: v.open?.split(',').map((s) => s.trim()).filter(Boolean),
});

const load = async (path: string, v: Values, io: Io): Promise<unknown> => {
    const text = await io.read(path);
    const csv = path.toLowerCase().endsWith('.csv') || (!path.toLowerCase().endsWith('.json') && !/^\s*[[{]/u.test(text));
    if (csv) return fromRows(parseCsv(text), mappingOf(v));
    const json: unknown = JSON.parse(text);
    return Array.isArray(json) ? fromRows(json as Row[], mappingOf(v)) : json;
};

const report = (input: unknown, io: Io): GraphData | null => {
    const result = validate(input);
    for (const w of result.warnings) io.err(`warning ${w.path || '(root)'} ${w.message}\n`);
    if (result.ok) return result.data;
    for (const e of result.errors) io.err(`error ${e.path || '(root)'} ${e.message}\n`);
    return null;
};

const size = (value: string | undefined, fallback: number): number => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const run = async (argv: string[], io: Io): Promise<number> => {
    let parsed;
    try {
        parsed = parseArgs({ args: argv, options: OPTIONS, allowPositionals: true });
    } catch (error) {
        io.err(`${(error as Error).message}\n\n${USAGE}`);
        return 2;
    }
    const { values: v, positionals: [command, input] } = parsed;
    if (v.help || !command || !input || (command !== 'render' && command !== 'validate')) {
        (v.help ? io.out : io.err)(USAGE);
        return v.help ? 0 : 2;
    }
    let data: GraphData | null;
    try {
        data = report(await load(input, v, io), io);
    } catch (error) {
        io.err(`error ${(error as Error).message}\n`);
        return 1;
    }
    if (!data) return 1;
    if (command === 'validate') {
        io.out(`ok: ${data.projects.length} projects, ${data.people.length} people, ${data.links.length} links\n`);
        return 0;
    }
    const width = size(v.width, 1920);
    const svg = toSvg(data, {
        theme: (v.theme === 'dark' ? 'dark' : 'light') as ThemeInput,
        layout: { width, height: size(v.height, 1080) },
        locale: v.locale,
        legend: !v['no-legend'],
    });
    if (!v.out) {
        io.out(svg);
        return 0;
    }
    if (v.out.toLowerCase().endsWith('.png')) {
        if (!io.png) {
            io.err('error PNG output needs @resvg/resvg-js: npm install @resvg/resvg-js\n');
            return 1;
        }
        await io.write(v.out, await io.png(svg, width, v.font));
    } else {
        await io.write(v.out, svg);
    }
    io.err(`wrote ${v.out}\n`);
    return 0;
};
