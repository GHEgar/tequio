import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import type { KeyboardEvent, MouseEvent, ReactElement, ReactNode, SVGProps } from 'react';
import { infoLabels, infoPlacement, infoPlan, scaleOf } from '../core/index.js';
import type { GraphData, GraphNode, InfoLabels, InfoPlan } from '../core/index.js';
import { InfoBox } from './InfoBox.js';
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
    onNode?: ((node: GraphNode, event: NodeEvent) => void) | undefined;
}

const hidden = {
    position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
} as const;

export const Tequio = ({
    data, theme, layout, locale, labels, legend, animated, forces, cooling, background = true, table = false,
    info = true, infoLabels: infoText, renderInfo, tour = false, focus = true, onNode, ...rest
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
    const { select, toggle } = touring;
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

    const poke = (): void => touring.poke();
    const onKeyDown = (event: KeyboardEvent<SVGSVGElement>): void => {
        poke();
        if (event.key === 'Escape') select(null);
    };
    const onClick = (event: MouseEvent<SVGSVGElement>): void => {
        const target = event.target as Element;
        if (!target.closest('[data-kind],[data-infobox]')) select(null);
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
            onPointerDown={poke}
            onPointerMove={poke}
            onWheel={poke}
            onKeyDown={onKeyDown}
            onClick={onClick}
            {...rest}
        >
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
            {plan && node && (
                <InfoBox
                    key={plan.id}
                    plan={plan}
                    origin={node}
                    ring={node.r + (node.kind === 'project' ? 20 : 9) * scale}
                    placement={infoPlacement(graph, node, plan)}
                    theme={scene.theme}
                    scale={scale}
                    register={register}
                    closeLabel={infoLabels(infoText).close}
                    onClose={touring.manual ? () => select(null) : undefined}
                >
                    {renderInfo?.(plan)}
                </InfoBox>
            )}
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
