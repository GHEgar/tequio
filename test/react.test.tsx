import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clampOffset, Tequio, TequioTable } from '@npmegar/tequio/react';
import { demoData } from '../demo/data.js';

afterEach(cleanup);

describe('<Tequio>', () => {
    it('renders an accessible image with one group per node and a link per pair', () => {
        const data = demoData({ projects: 3, people: 12 });
        const { container } = render(<Tequio data={data} animated={false} info={false} />);
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

describe('info box', () => {
    it('opens on click, toggles on a second click and closes with Escape or the close button', () => {
        const data = demoData({ projects: 2, people: 4 });
        const { container, queryByRole, getByRole } = render(<Tequio data={data} animated={false} />);
        const project = container.querySelector('g[data-kind="project"]') as SVGGElement;
        fireEvent.click(project);
        expect(getByRole('dialog').getAttribute('aria-label')).toBe(data.projects[0]?.name);
        expect(getByRole('dialog').textContent).toContain('Progress');
        fireEvent.click(project);
        expect(queryByRole('dialog')).toBeNull();
        fireEvent.keyDown(project, { key: 'Enter' });
        fireEvent.keyDown(container.querySelector('svg') as SVGSVGElement, { key: 'Escape' });
        expect(queryByRole('dialog')).toBeNull();
        fireEvent.click(project);
        fireEvent.click(getByRole('button', { name: 'Close' }));
        expect(queryByRole('dialog')).toBeNull();
    });

    it('lets the consumer paint the card', () => {
        const { container, getByText } = render(
            <Tequio data={demoData({ projects: 2, people: 4 })} animated={false} renderInfo={(plan) => <p>{`custom ${plan.kind}`}</p>} />,
        );
        fireEvent.click(container.querySelector('g[data-kind="person"]') as SVGGElement);
        expect(getByText('custom person')).toBeTruthy();
    });

    it('tours the nodes when nobody interacts and stops on input', () => {
        vi.useFakeTimers();
        try {
            const { container, queryByRole, getByRole } = render(
                <Tequio data={demoData({ projects: 2, people: 4 })} animated={false} tour={{ idle: 1000, interval: 500 }} />,
            );
            expect(queryByRole('dialog')).toBeNull();
            act(() => {
                vi.advanceTimersByTime(1300);
            });
            const first = queryByRole('dialog')?.getAttribute('aria-label');
            expect(first).toBeTruthy();
            act(() => {
                vi.advanceTimersByTime(600);
            });
            expect(queryByRole('dialog')?.getAttribute('aria-label')).not.toBe(first);
            const svg = container.querySelector('svg') as SVGSVGElement;
            act(() => {
                vi.advanceTimersByTime(500);
            });
            fireEvent.pointerMove(svg);
            expect(queryByRole('dialog')).not.toBeNull();
            expect(container.querySelector('[data-countdown]')).not.toBeNull();
            fireEvent.pointerDown(svg);
            expect(queryByRole('dialog')).toBeNull();
            expect(queryByRole('button', { name: 'Close' })).toBeNull();
            fireEvent.click(getByRole('button', { name: 'Resume tour' }));
            expect(queryByRole('dialog')).not.toBeNull();
            expect(queryByRole('button', { name: 'Resume tour' })).toBeNull();
        } finally {
            vi.useRealTimers();
        }
    });
});

describe('card motion', () => {
    it('hands the card over from the previous one and traces the outline countdown', () => {
        vi.useFakeTimers();
        try {
            const { container } = render(
                <Tequio data={demoData({ projects: 2, people: 4 })} animated="always" tour={{ idle: 1000, interval: 2000 }} />,
            );
            act(() => {
                vi.advanceTimersByTime(1300);
            });
            expect(container.querySelector('svg[data-countdown] rect')).not.toBeNull();
            act(() => {
                vi.advanceTimersByTime(2000);
            });
            const travelling = container.querySelector('[data-infobox] foreignObject');
            const start = travelling?.getAttribute('x');
            expect(container.querySelector('[data-countdown]')).toBeNull();
            act(() => {
                vi.advanceTimersByTime(600);
            });
            expect(container.querySelector('[data-infobox] foreignObject')?.getAttribute('x')).not.toBe(start);
            expect(container.querySelector('svg[data-countdown]')).not.toBeNull();
        } finally {
            vi.useRealTimers();
        }
    });

    it('uses a bar when asked', () => {
        vi.useFakeTimers();
        try {
            const { container } = render(
                <Tequio data={demoData({ projects: 2, people: 4 })} animated={false} tour={{ idle: 1000, interval: 2000, countdown: 'bar' }} />,
            );
            act(() => {
                vi.advanceTimersByTime(1300);
            });
            expect(container.querySelector('div[data-countdown]')).not.toBeNull();
            expect(container.querySelector('svg[data-countdown]')).toBeNull();
        } finally {
            vi.useRealTimers();
        }
    });
});

describe('drag', () => {
    it('keeps the card inside the canvas', () => {
        const box = { x: 20, y: -100, width: 380, height: 200 };
        const origin = { x: 100, y: 500 };
        expect(clampOffset({ x: -500, y: 9999 }, box, origin, { width: 1920, height: 1080 })).toEqual({ x: -120, y: 480 });
        expect(clampOffset({ x: 40, y: -30 }, box, origin, { width: 1920, height: 1080 })).toEqual({ x: 40, y: -30 });
    });

    it('moves the card, hides the arrow and resets on double click', () => {
        const { container } = render(<Tequio data={demoData({ projects: 2, people: 4 })} animated={false} />);
        fireEvent.click(container.querySelector('g[data-kind="project"]') as SVGGElement);
        const card = container.querySelector('[data-infobox] section') as HTMLElement;
        const fo = container.querySelector('[data-infobox] foreignObject') as SVGForeignObjectElement;
        const x = Number(fo.getAttribute('x'));
        fireEvent.pointerDown(card, { button: 0, clientX: 100, clientY: 100, pointerId: 1 });
        fireEvent.pointerMove(card, { clientX: 140, clientY: 120, pointerId: 1 });
        fireEvent.pointerUp(card, { pointerId: 1 });
        expect(Number(fo.getAttribute('x'))).not.toBe(x);
        expect(container.querySelector('[data-infobox] > path')).toBeNull();
        fireEvent.doubleClick(card);
        expect(Number(fo.getAttribute('x'))).toBe(x);
        expect(container.querySelector('[data-infobox] > path')).not.toBeNull();
    });
});

describe('focus', () => {
    it('dims what is not connected to the selected node and restores it on close', () => {
        const data = demoData({ projects: 3, people: 12 });
        const { container } = render(<Tequio data={data} animated={false} />);
        expect(container.querySelectorAll('[data-dimmed]')).toHaveLength(0);
        const project = container.querySelector('g[data-kind="project"]') as SVGGElement;
        fireEvent.click(project);
        const dimmed = container.querySelectorAll('[data-dimmed]').length;
        expect(dimmed).toBeGreaterThan(0);
        expect(project.hasAttribute('data-dimmed')).toBe(false);
        fireEvent.keyDown(container.querySelector('svg') as SVGSVGElement, { key: 'Escape' });
        expect(container.querySelectorAll('[data-dimmed]')).toHaveLength(0);
    });

    it('can be turned off', () => {
        const { container } = render(<Tequio data={demoData({ projects: 3, people: 12 })} animated={false} focus={false} />);
        fireEvent.click(container.querySelector('g[data-kind="project"]') as SVGGElement);
        expect(container.querySelectorAll('[data-dimmed]')).toHaveLength(0);
    });
});

describe('reduced motion', () => {
    const reduce = (matches: boolean): void => {
        window.matchMedia = ((query: string) => ({
            matches, media: query, onchange: null,
            addEventListener: () => undefined, removeEventListener: () => undefined,
            addListener: () => undefined, removeListener: () => undefined, dispatchEvent: () => false,
        })) as unknown as typeof window.matchMedia;
    };

    it('stops pulses when the system asks for less motion, unless animated is "always"', () => {
        reduce(true);
        try {
            const first = demoData({ projects: 3, people: 10, tick: 0 });
            const next = demoData({ projects: 3, people: 10, tick: 4 });
            const pulsing = (container: HTMLElement): number => container.querySelectorAll('g[data-kind] > circle[stroke-width="4"][fill="none"]').length;
            const quiet = render(<Tequio data={first} />);
            act(() => {
                quiet.rerender(<Tequio data={next} />);
            });
            expect(pulsing(quiet.container)).toBe(0);
            quiet.unmount();
            const forced = render(<Tequio data={first} animated="always" />);
            act(() => {
                forced.rerender(<Tequio data={next} animated="always" />);
            });
            expect(pulsing(forced.container)).toBeGreaterThan(0);
        } finally {
            reduce(false);
        }
    });
});
