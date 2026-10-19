export interface CsvOptions {
    delimiter?: string | undefined;
}

const detect = (text: string): string => {
    const line = text.slice(0, text.search(/\r?\n|$/u));
    const counts = [',', ';', '\t'].map((d) => [d, line.split(d).length] as const);
    return counts.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
};

export const parseCsvRows = (text: string, options: CsvOptions = {}): string[][] => {
    const source = text.replace(/^\uFEFF/u, '');
    const d = options.delimiter ?? detect(source);
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let quoted = false;
    for (let i = 0; i < source.length; i += 1) {
        const ch = source[i];
        if (quoted) {
            if (ch === '"' && source[i + 1] === '"') {
                cell += '"';
                i += 1;
            } else if (ch === '"') {
                quoted = false;
            } else {
                cell += ch;
            }
        } else if (ch === '"' && cell === '') {
            quoted = true;
        } else if (ch === d) {
            row.push(cell);
            cell = '';
        } else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && source[i + 1] === '\n') i += 1;
            row.push(cell);
            rows.push(row);
            row = [];
            cell = '';
        } else {
            cell += ch;
        }
    }
    if (cell !== '' || row.length > 0) {
        row.push(cell);
        rows.push(row);
    }
    return rows.filter((r) => r.some((c) => c.trim() !== ''));
};

export const parseCsv = (text: string, options: CsvOptions = {}): Record<string, string>[] => {
    const [header, ...body] = parseCsvRows(text, options);
    if (!header) return [];
    const keys = header.map((h) => h.trim());
    return body.map((cells) => Object.fromEntries(keys.map((k, i) => [k, (cells[i] ?? '').trim()])));
};
