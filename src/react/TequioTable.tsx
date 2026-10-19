import { useMemo } from 'react';
import type { ReactElement } from 'react';
import { formatters } from '../core/index.js';
import type { GraphData } from '../core/index.js';

export interface TequioTableProps {
    data: GraphData;
    locale?: string | undefined;
    captions?: { projects: string; people: string } | undefined;
    headers?: { name: string; progress: string; people: string; metric: string; active: string; projects: string } | undefined;
    yes?: string | undefined;
    no?: string | undefined;
}

const HEADERS = { name: 'Name', progress: 'Progress', people: 'People', metric: 'Metric', active: 'Active', projects: 'Projects' };
const CAPTIONS = { projects: 'Projects', people: 'People' };

export const TequioTable = ({
    data, locale, captions = CAPTIONS, headers = HEADERS, yes = 'Yes', no = 'No',
}: TequioTableProps): ReactElement => {
    const format = useMemo(() => formatters(locale), [locale]);
    const statuses = data.statuses ?? [];
    const names = new Map(data.projects.map((p) => [p.id, p.name]));
    const members = (id: string): number => new Set(data.links.filter((l) => l.project === id && l.weight > 0).map((l) => l.person)).size;
    const workOf = (id: string): string => data.links
        .filter((l) => l.person === id && l.weight > 0 && names.has(l.project))
        .map((l) => `${names.get(l.project)} (${format.metric(l.weight)})`)
        .join(', ');
    return (
        <>
            <table>
                <caption>{captions.projects}</caption>
                <thead>
                    <tr>
                        <th scope="col">{headers.name}</th>
                        <th scope="col">{headers.progress}</th>
                        {statuses.map((s) => <th key={s.key} scope="col">{s.label}</th>)}
                        <th scope="col">{headers.people}</th>
                    </tr>
                </thead>
                <tbody>
                    {data.projects.map((p) => (
                        <tr key={p.id}>
                            <th scope="row">{p.name}</th>
                            <td>{format.percent(p.progress)}</td>
                            {statuses.map((s) => <td key={s.key}>{format.metric(p.counts?.[s.key] ?? 0)}</td>)}
                            <td>{members(p.id)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <table>
                <caption>{captions.people}</caption>
                <thead>
                    <tr>
                        <th scope="col">{headers.name}</th>
                        <th scope="col">{headers.metric}</th>
                        <th scope="col">{headers.active}</th>
                        <th scope="col">{headers.projects}</th>
                    </tr>
                </thead>
                <tbody>
                    {data.people.map((p) => (
                        <tr key={p.id}>
                            <th scope="row">{p.name}</th>
                            <td>{p.metric === undefined ? '' : format.metric(p.metric)}</td>
                            <td>{p.active === false ? no : yes}</td>
                            <td>{workOf(p.id)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </>
    );
};
