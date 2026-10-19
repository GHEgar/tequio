import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent, PointerEvent, ReactElement, ReactNode, SVGProps } from 'react';
import { focusOf, infoLabels, infoPlacement, infoPlan, scaleOf } from '../core/index.js';
import type { GraphData, GraphNode, InfoLabels, InfoPlan } from '../core/index.js';
import { InfoBox } from './InfoBox.js';
import { ResumeTour } from './ResumeTour.js';
import type { Box } from './useCardMotion.js';
import { Link, Node } from './Nodes.js';
import type { Handler, NodeEvent } from './Nodes.js';
import { Legend } from './Shapes.js';
import { TequioTable } from './TequioTable.js';
import { useGraph, useScene } from './useTequio.js';
import type { UseTequioOptions } from './useTequio.js';
import { useTour } from './useTour.js';
import type { TourOptions } from './useTour.js';

export type { NodeEvent };

export interface TequioProps extends Omit<UseTequioOptions, 'focus'>, Omit<SVGProps<SVGSVGElement>, 'onSelect'> {
    data: GraphData;
    background?: boolean | undefined;
    table?: boolean | undefined;
    info?: boolean | undefined;
    infoLabels?: Partial<InfoLabels> | undefined;
    renderInfo?: ((plan: InfoPlan) => ReactNode) | undefined;
    tour?: boolean | TourOptions | undefined;
    focus?: boolean | undefined;
    infoScale?: number | undefined;
    draggable?: boolean | undefined;
    onNode?: ((node: GraphNode, event: NodeEvent) => void) | undefined;
}

const hidden = {
    position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
} as const;

export const Tequio = ({
    data, theme, layout, locale, labels, legend, animated, forces, cooling, background = true, table = false,
    info = true, infoLabels: infoText, renderInfo, tour = false, focus = true, infoScale = 1, draggable = true, onNode, ...rest
}: TequioProps): ReactElement | null => {
    const id = useId().replace(/:/g, '');
    const { snapshot, pulses, register, reducedMotion } = useGraph(data, { layout, animated, forces, cooling });
    const latest = useRef(onNode);
    useEffect(() => {
        latest.current = onNode;
    });
    const { graph } = snapshot;
    const order = useMemo(() => graph?.nodes.map((n) => n.id) ?? [], [graph]);
    const touring = useTour(info && tour !== false, tour === true || tour === false ? {} : tour, snapshot.version, order, pulses);
    const { select, toggle, extend } = touring;
    const [hand, setHand] = useState<{ id: string | null; box: Box | null; from: Box | null }>({ id: null, box: null, from: null });
    const onBox = useCallback((at: string, box: Box) => {
        setHand((h) => (h.id === at ? { ...h, box } : h));
    }, []);
    const handle = useCallback<Handler>((node, event) => {
        if (info) toggle(node.id);
        latest.current?.(node, event);
    }, [info, toggle]);
    const interactive = info || !!onNode;
    const open = info ? touring.id : null;
    const scene = useScene(graph, { theme, locale, labels, legend, focus: focus ? open : null });
    const plan = useMemo(
        () => (graph && open ? infoPlan(graph, open, { theme, locale, labels: infoText }) : null),
        [graph, open, theme, locale, infoText],
    );
    if (!scene || !graph) return null;
    const clip = `${id}-round`;
    const scale = scaleOf(graph.layout);
    const transition = reducedMotion ? undefined : 'opacity 400ms ease';
    const node = plan ? graph.byId.get(plan.id) : undefined;
    const text = infoLabels(infoText, locale);
    const neighbors = node ? [...(focusOf(graph, node.id)?.nodes ?? [])].map((n) => graph.byId.get(n)).filter((n) => n !== undefined) : [];
    const placement = plan && node ? infoPlacement(graph, node, plan, 380, neighbors, infoScale) : null;
    const current = plan?.id ?? null;
    if (hand.id !== current) setHand({ id: current, box: null, from: hand.box });
    const from = hand.id === current ? hand.from : hand.box;
    const style = tour === true || tour === false ? undefined : tour.countdown;

    const poke = (): void => touring.poke();
    const onPointerDown = (event: PointerEvent<SVGSVGElement>): void => {
        if ((event.target as Element).closest('[data-infobox]') && touring.id) select(touring.id);
        else poke();
    };
    const onKeyDown = (event: KeyboardEvent<SVGSVGElement>): void => {
        poke();
        if (event.key === 'Escape') select(null);
    };
    const onClick = (event: MouseEvent<SVGSVGElement>): void => {
        const target = event.target as Element;
        if (!target.closest('[data-kind],[data-infobox],[data-resume]')) select(null);
    };

    const svg = (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${scene.width} ${scene.height}`}
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMid meet"
            role={interactive ? 'group' : 'img'}
            aria-label={scene.title}
            fontFamily={scene.theme.font}
            textAnchor="middle"
            onPointerDown={onPointerDown}
            onWheel={poke}
            onKeyDown={onKeyDown}
            onClick={onClick}
            data-tequio={id}
            {...rest}
        >
            {interactive && <style>{`[data-tequio="${id}"] g[role=button]:focus:not(:focus-visible){outline:none}`}</style>}
            <defs>
                <clipPath id={clip} clipPathUnits="objectBoundingBox"><circle cx={0.5} cy={0.5} r={0.5} /></clipPath>
            </defs>
            {background && <rect width={scene.width} height={scene.height} fill={scene.theme.background} />}
            <g strokeLinecap="round">
                {scene.links.map((l) => <Link key={l.id} item={l} register={register} scale={scale} transition={transition} />)}
            </g>
            {scene.nodes.map((item) => (
                <Node
                    key={item.id}
                    item={item}
                    clip={clip}
                    pulse={pulses.get(item.id)?.key}
                    register={register}
                    onNode={interactive ? handle : undefined}
                    transition={transition}
                />
            ))}
            <Legend scene={scene} />
            {plan && node && placement && (
                <InfoBox
                    key={plan.id}
                    plan={plan}
                    origin={node}
                    ring={node.r + (node.kind === 'project' ? 20 : 9) * scale}
                    placement={placement}
                    theme={scene.theme}
                    scale={scale * infoScale}
                    register={register}
                    closeLabel={text.close}
                    onClose={touring.manual ? () => select(null) : undefined}
                    countdown={touring.manual || !touring.since ? undefined : { since: touring.since, duration: touring.interval, label: text.next, style }}
                    from={from}
                    still={reducedMotion || animated === false}
                    onExtend={extend}
                    onBox={onBox}
                    bounds={draggable ? { width: scene.width, height: scene.height } : undefined}
                    onDragStart={() => select(plan.id)}
                >
                    {renderInfo?.(plan)}
                </InfoBox>
            )}
            {touring.paused && <ResumeTour width={scene.width} theme={scene.theme} u={scale} label={text.resume} onResume={touring.resume} />}
        </svg>
    );
    if (!table) return svg;
    return (
        <>
            {svg}
            <div style={hidden}><TequioTable data={data} locale={locale} /></div>
        </>
    );
};
