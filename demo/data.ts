import { hash } from '@npmegar/tequio';
import type { GraphData, Link, Person, Project, Status } from '@npmegar/tequio';

export const STATUSES: Status[] = [
    { key: 'pass', label: 'Pass', tone: 'good' },
    { key: 'fail', label: 'Fail', tone: 'critical' },
    { key: 'blocked', label: 'Blocked', tone: 'warning' },
    { key: 'pending', label: 'Pending', tone: 'neutral' },
];

const PROJECTS = ['Atlas', 'Beacon', 'Cobalt', 'Delta', 'Ember', 'Fjord', 'Granite', 'Harbor', 'Iris', 'Juniper', 'Kestrel', 'Lumen'];
const FIRST = ['Ana', 'Ben', 'Cleo', 'Dev', 'Eli', 'Fay', 'Gus', 'Hana', 'Ivo', 'Jun', 'Kai', 'Lia', 'Max', 'Noa', 'Oto', 'Pia', 'Rui', 'Sol', 'Teo', 'Uma'];
const LAST = ['Reyes', 'Kim', 'Okafor', 'Silva', 'Novak', 'Haddad', 'Tanaka', 'Moreau'];

export interface DemoOptions {
    projects?: number;
    people?: number;
    tick?: number;
}

const roll = (seed: string, max: number): number => Math.floor(hash(seed) * max);

export const demoData = ({ projects = 10, people = 150, tick = 0 }: DemoOptions = {}): GraphData => {
    const links: Link[] = [];
    const work = new Map<string, number>();
    const peopleList: Person[] = Array.from({ length: people }, (_, i) => {
        const id = `person-${i}`;
        const home = roll(`${id}:home`, projects);
        const extra = roll(`${id}:extra`, 3);
        let metric = 0;
        for (let k = 0; k <= extra; k += 1) {
            const project = k === 0 ? home : roll(`${id}:p${k}`, projects);
            const weight = 1 + roll(`${id}:w${k}`, 12) + roll(`${id}:t${k}:${Math.floor(tick / (2 + k))}`, 3) * Math.min(tick, 6);
            links.push({ person: id, project: `project-${project}`, weight });
            work.set(`project-${project}`, (work.get(`project-${project}`) ?? 0) + weight);
            metric += weight;
        }
        return {
            id,
            name: `${FIRST[i % FIRST.length]} ${LAST[roll(`${id}:last`, LAST.length)]}`,
            metric,
            active: hash(`${id}:active:${Math.floor(tick / 3)}`) > 0.3,
        };
    });
    const projectList: Project[] = Array.from({ length: projects }, (_, i) => {
        const id = `project-${i}`;
        const total = 120 + roll(`${id}:total`, 160);
        const done = Math.min(total, Math.round((work.get(id) ?? 0) * (0.4 + hash(`${id}:pace`) * 0.5)));
        const fail = Math.round(done * hash(`${id}:fail`) * 0.18);
        const blocked = Math.round(done * hash(`${id}:blocked`) * 0.08);
        return {
            id,
            name: PROJECTS[i % PROJECTS.length] as string,
            progress: done / total,
            counts: { pass: done - fail - blocked, fail, blocked, pending: total - done },
        };
    });
    return { statuses: STATUSES, projects: projectList, people: peopleList, links };
};
