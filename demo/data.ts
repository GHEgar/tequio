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
const ROLES = ['Designer', 'Engineer', 'Tester', 'Analyst', 'Writer', 'Coordinator'];
const TEAMS = ['North', 'South', 'Field', 'Core'];
const GOALS = ['New public website', 'Mobile app for field teams', 'Data platform migration', 'Accessibility audit', 'Billing redesign'];

export interface DemoOptions {
    projects?: number;
    people?: number;
    tick?: number;
}

const CYCLE = 40;

const roll = (seed: string, max: number): number => Math.floor(hash(seed) * max);

const bumps = (seed: string, tick: number): number => {
    let total = 0;
    for (let t = 1; t <= tick; t += 1) if (hash(`${seed}:${t}`) < 0.06) total += 1 + roll(`${seed}:${t}:size`, 3);
    return total;
};

export const demoData = ({ projects = 5, people = 40, tick = 0 }: DemoOptions = {}): GraphData => {
    const links: Link[] = [];
    const work = new Map<string, number>();
    const peopleList: Person[] = Array.from({ length: people }, (_, i) => {
        const id = `person-${i}`;
        const home = roll(`${id}:home`, projects);
        const extra = roll(`${id}:extra`, 3);
        let metric = 0;
        for (let k = 0; k <= extra; k += 1) {
            const project = k === 0 ? home : roll(`${id}:p${k}`, projects);
            const weight = 1 + roll(`${id}:w${k}`, 12) + bumps(`${id}:${k}`, tick % CYCLE);
            links.push({ person: id, project: `project-${project}`, weight });
            work.set(`project-${project}`, (work.get(`project-${project}`) ?? 0) + weight);
            metric += weight;
        }
        return {
            id,
            name: `${FIRST[i % FIRST.length]} ${LAST[roll(`${id}:last`, LAST.length)]}`,
            metric,
            details: [
                { label: 'Role', value: ROLES[roll(`${id}:role`, ROLES.length)] as string },
                { label: 'Team', value: TEAMS[roll(`${id}:team`, TEAMS.length)] as string },
            ],
            active: hash(`${id}:active:${Math.floor((tick + roll(`${id}:phase`, 4)) / 4)}`) > 0.3,
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
            description: GOALS[i % GOALS.length],
            details: [{ label: 'Lead', value: `${FIRST[roll(`${id}:lead`, FIRST.length)]} ${LAST[roll(`${id}:leadl`, LAST.length)]}` }],
            progress: done / total,
            counts: { pass: done - fail - blocked, fail, blocked, pending: total - done },
        };
    });
    return { statuses: STATUSES, projects: projectList, people: peopleList, links };
};
