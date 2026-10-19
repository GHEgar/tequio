import { memo, useCallback, useEffect, useId, useRef } from 'react';
import type { KeyboardEvent, MouseEvent, ReactElement, SVGProps } from 'react';
import type { GraphData, GraphNode, SceneLink, SceneNode } from '../core/index.js';
import type { Register } from './animation.js';
import { Legend, ShapeElement } from './Shapes.js';
import { TequioTable } from './TequioTable.js';
import { useTequio } from './useTequio.js';
import type { UseTequioOptions } from './useTequio.js';

export type NodeEvent = MouseEvent<SVGGElement> | KeyboardEvent<SVGGElement>;

export interface TequioProps extends UseTequioOptions, Omit<SVGProps<SVGSVGElement>, 'onSelect'> {
    data: GraphData;
    background?: boolean | undefined;
    table?: boolean | undefined;
    onNode?: ((node: GraphNode, event: NodeEvent) => void) | undefined;
}

const hidden = {
    position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
} as const;

type Handler = (node: GraphNode, event: NodeEvent) => void;

interface NodeProps {
    item: SceneNode;
    clip: string;
    pulse: string | undefined;
    register: Register;
    onNode: Handler | undefined;
}

const sameNode = (a: NodeProps, b: NodeProps): boolean => a.item.fingerprint === b.item.fingerprint
    && a.pulse === b.pulse && a.clip === b.clip && a.register === b.register && a.onNode === b.onNode;

const Node = memo(({ item, clip, pulse, register, onNode }: NodeProps): ReactElement => {
    const { node } = item;
    const interactive = onNode ? {
        role: 'button',
        tabIndex: 0,
        'aria-label': item.label,
        style: { cursor: 'pointer' },
        onClick: (event: MouseEvent<SVGGElement>) => onNode(node, event),
        onKeyDown: (event: KeyboardEvent<SVGGElement>) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            onNode(node, event);
        },
    } : {};
    return (
        <g
            ref={register({ kind: 'node', id: node.id })}
            transform={`translate(${node.x.toFixed(1)} ${node.y.toFixed(1)})`}
            opacity={item.opacity === 1 ? undefined : item.opacity}
            data-kind={item.kind}
            data-id={node.data.id}
            {...interactive}
        >
            <title>{item.label}</title>
            {pulse && (
                <circle
                    key={pulse}
                    ref={register({ kind: 'pulse', key: pulse, r: item.pulse.r, spread: node.r })}
                    r={item.pulse.r}
                    fill="none"
                    stroke={item.pulse.color}
                    strokeWidth={4}
                    opacity={0}
                />
            )}
            {item.shapes.map((shape, i) => <ShapeElement key={i} shape={shape} clip={clip} />)}
        </g>
    );
}, sameNode);

const Link = memo(({ item, register }: { item: SceneLink; register: Register }): ReactElement => (
    <line
        ref={register({ kind: 'link', id: item.id })}
        x1={item.link.source.x.toFixed(1)}
        y1={item.link.source.y.toFixed(1)}
        x2={item.link.target.x.toFixed(1)}
        y2={item.link.target.y.toFixed(1)}
        stroke={item.color}
        strokeWidth={item.width}
        strokeOpacity={item.opacity}
    />
), (a, b) => a.item.fingerprint === b.item.fingerprint && a.register === b.register);

export const Tequio = ({
    data, theme, layout, locale, labels, legend, animated, forces, cooling, background = true, table = false, onNode, ...rest
}: TequioProps): ReactElement | null => {
    const id = useId().replace(/:/g, '');
    const { scene, pulses, register } = useTequio(data, { theme, layout, locale, labels, legend, animated, forces, cooling });
    const latest = useRef(onNode);
    useEffect(() => {
        latest.current = onNode;
    });
    const handle = useCallback<Handler>((node, event) => latest.current?.(node, event), []);
    const handler = onNode ? handle : undefined;
    if (!scene) return null;
    const clip = `${id}-round`;
    const svg = (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${scene.width} ${scene.height}`}
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMid meet"
            role={onNode ? 'group' : 'img'}
            aria-label={scene.title}
            fontFamily={scene.theme.font}
            textAnchor="middle"
            {...rest}
        >
            <defs>
                <clipPath id={clip} clipPathUnits="objectBoundingBox"><circle cx={0.5} cy={0.5} r={0.5} /></clipPath>
            </defs>
            {background && <rect width={scene.width} height={scene.height} fill={scene.theme.background} />}
            <g strokeLinecap="round">
                {scene.links.map((l) => <Link key={l.id} item={l} register={register} />)}
            </g>
            {scene.nodes.map((item) => (
                <Node key={item.id} item={item} clip={clip} pulse={pulses.get(item.id)?.key} register={register} onNode={handler} />
            ))}
            <Legend scene={scene} />
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
