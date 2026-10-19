import type { ReactElement } from 'react';
import type { Scene, Shape } from '../core/index.js';

export const ShapeElement = ({ shape, clip }: { shape: Shape; clip: string }): ReactElement => {
    if (shape.type === 'circle') {
        return (
            <circle
                r={shape.r}
                fill={shape.fill}
                stroke={shape.stroke}
                strokeWidth={shape.strokeWidth}
                strokeDasharray={shape.dash}
                strokeDashoffset={shape.dashOffset}
                transform={shape.rotate === undefined ? undefined : `rotate(${shape.rotate})`}
            />
        );
    }
    if (shape.type === 'image') {
        const half = shape.size / 2;
        return (
            <image
                href={shape.href}
                x={-half}
                y={shape.y - half}
                width={shape.size}
                height={shape.size}
                preserveAspectRatio={shape.round ? 'xMidYMid slice' : 'xMidYMid meet'}
                clipPath={shape.round ? `url(#${clip})` : undefined}
            />
        );
    }
    return (
        <text
            y={shape.y}
            fontSize={shape.size}
            fontWeight={shape.weight}
            fill={shape.fill}
            stroke={shape.halo}
            strokeWidth={shape.haloWidth}
            paintOrder={shape.halo ? 'stroke' : undefined}
            strokeLinejoin={shape.halo ? 'round' : undefined}
        >
            {shape.text}
        </text>
    );
};

export const Legend = ({ scene }: { scene: Scene }): ReactElement | null => {
    const [first] = scene.legend;
    if (!first) return null;
    return (
        <g textAnchor="start" fontSize={first.size} fill={scene.theme.muted}>
            {scene.legend.map((item) => (
                <g key={item.key}>
                    <circle cx={item.x} cy={item.y} r={item.r} fill={item.color} />
                    <text x={item.x + item.r * 2} y={item.y + item.size * 0.35}>{item.label}</text>
                </g>
            ))}
        </g>
    );
};
