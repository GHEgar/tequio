import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Tequio, TequioTable } from '@npmegar/tequio/react';
import { demoData } from '../demo/data.js';

afterEach(cleanup);

describe('<Tequio>', () => {
    it('renders an accessible image with one group per node and a link per pair', () => {
        const data = demoData({ projects: 3, people: 12 });
        const { container } = render(<Tequio data={data} animated={false} />);
        const svg = container.querySelector('svg');
        expect(svg?.getAttribute('role')).toBe('img');
        expect(svg?.getAttribute('aria-label')).toBe('Participation graph: 3 projects and 12 people');
        expect(container.querySelectorAll('g[data-kind="project"]')).toHaveLength(3);
        expect(container.querySelectorAll('g[data-kind="person"]')).toHaveLength(12);
        expect(container.querySelectorAll('line').length).toBeGreaterThanOrEqual(12);
    });

    it('turns nodes into buttons when onNode is given', () => {
        const onNode = vi.fn();
        const data = demoData({ projects: 2, people: 3 });
        const { container } = render(<Tequio data={data} animated={false} onNode={onNode} />);
        expect(container.querySelector('svg')?.getAttribute('role')).toBe('group');
        const first = container.querySelector('g[data-kind="project"]') as SVGGElement;
        expect(first.getAttribute('role')).toBe('button');
        fireEvent.click(first);
        fireEvent.keyDown(first, { key: 'Enter' });
        expect(onNode).toHaveBeenCalledTimes(2);
        expect(onNode.mock.calls[0]?.[0].kind).toBe('project');
    });

    it('keeps node elements and pulses the ones that changed', () => {
        const { container, rerender } = render(<Tequio data={demoData({ projects: 3, people: 10, tick: 0 })} animated={false} />);
        const before = container.querySelector('g[data-id="project-0"]');
        act(() => {
            rerender(<Tequio data={demoData({ projects: 3, people: 10, tick: 4 })} animated={false} />);
        });
        expect(container.querySelector('g[data-id="project-0"]')).toBe(before);
        expect(container.querySelectorAll('circle[stroke-width="4"][fill="none"]').length).toBeGreaterThan(0);
    });

    it('renders the alternative table when asked', () => {
        const { getAllByRole } = render(<Tequio data={demoData({ projects: 2, people: 3 })} animated={false} table />);
        expect(getAllByRole('table')).toHaveLength(2);
    });
});

describe('<TequioTable>', () => {
    it('lists projects with statuses and people with their work', () => {
        const data = demoData({ projects: 2, people: 3 });
        const { getAllByRole, getByText } = render(<TequioTable data={data} />);
        const [projects, people] = getAllByRole('table');
        expect(projects?.querySelectorAll('tbody tr')).toHaveLength(2);
        expect(people?.querySelectorAll('tbody tr')).toHaveLength(3);
        expect(getByText('Blocked')).toBeTruthy();
        expect(people?.textContent).toContain(data.projects[0]?.name ?? '');
    });
});
