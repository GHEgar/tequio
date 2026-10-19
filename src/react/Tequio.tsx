import { useId } from 'react';
import type { KeyboardEvent, MouseEvent, ReactElement, SVGProps } from 'react';
import type { GraphData, GraphNode, SceneNode } from '../core/index.js';
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

interface NodeProps {
    item: SceneNode;
    clip: string;
    pulse: string | undefined;
    register: Register;
    onNode: TequioProps['onNode'];
}

const Node = ({ item, clip, pulse, register, onNode }: NodeProps): ReactElement => {
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
            ref={register({ kind: 'node', node })}
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
};

export const Tequio = ({
    data, theme, layout, locale, labels, legend, animated, forces, cooling, background = true, table = false, onNode, ...rest
}: TequioProps): ReactElement | null => {
    const id = useId().replace(/:/g, '');
    const { scene, pulses, register } = useTequio(data, { theme, layout, locale, labels, legend, animated, forces, cooling });
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
                {scene.links.map((l) => (
                    <line
                        key={l.id}
                        ref={register({ kind: 'link', link: l.link })}
                        x1={l.link.source.x.toFixed(1)}
                        y1={l.link.source.y.toFixed(1)}
                        x2={l.link.target.x.toFixed(1)}
                        y2={l.link.target.y.toFixed(1)}
                        stroke={l.color}
                        strokeWidth={l.width}
                        strokeOpacity={l.opacity}
                    />
                ))}
            </g>
            {scene.nodes.map((item) => (
                <Node key={item.id} item={item} clip={clip} pulse={pulses.get(item.id)?.key} register={register} onNode={onNode} />
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
