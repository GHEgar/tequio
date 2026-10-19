import { memo } from 'react';
import type { KeyboardEvent, MouseEvent, ReactElement } from 'react';
import type { GraphNode, SceneLink, SceneNode } from '../core/index.js';
import type { Register } from './animation.js';
import { ShapeElement } from './Shapes.js';

export type NodeEvent = MouseEvent<SVGGElement> | KeyboardEvent<SVGGElement>;

export type Handler = (node: GraphNode, event: NodeEvent) => void;

interface NodeProps {
    item: SceneNode;
    clip: string;
    pulse: string | undefined;
    register: Register;
    onNode: Handler | undefined;
}

const sameNode = (a: NodeProps, b: NodeProps): boolean => a.item.fingerprint === b.item.fingerprint
    && a.pulse === b.pulse && a.clip === b.clip && a.register === b.register && a.onNode === b.onNode;

export const Node = memo(({ item, clip, pulse, register, onNode }: NodeProps): ReactElement => {
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

export const Link = memo(({ item, register }: { item: SceneLink; register: Register }): ReactElement => (
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
