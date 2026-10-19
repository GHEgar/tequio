import { linkEnds } from './focus.js';
import { buildGraph, scaleOf } from './model.js';
import { buildScene } from './scene.js';
import type { Scene, SceneOptions } from './scene.js';
import type { Shape } from './shapes.js';
import { DEFAULT_FORCES, settle } from './simulation.js';
import type { Forces } from './simulation.js';
import type { GraphData, Layout } from './types.js';

export interface SvgOptions extends SceneOptions {
    layout?: Partial<Layout> | undefined;
    forces?: Forces | undefined;
    steps?: number | undefined;
    background?: boolean | undefined;
    id?: string | undefined;
}

const escape = (text: string): string => text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const n = (value: number): string => String(Math.round(value * 100) / 100);

const attrs = (pairs: Record<string, string | number | undefined>): string => Object.entries(pairs)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => ` ${k}="${typeof v === 'number' ? n(v) : escape(v as string)}"`)
    .join('');

const shapeToSvg = (shape: Shape, clip: string): string => {
    if (shape.type === 'circle') {
        return `<circle${attrs({
            r: shape.r, fill: shape.fill, stroke: shape.stroke, 'stroke-width': shape.strokeWidth,
            'stroke-dasharray': shape.dash, 'stroke-dashoffset': shape.dashOffset,
            transform: shape.rotate === undefined ? undefined : `rotate(${shape.rotate})`,
        })}/>`;
    }
    if (shape.type === 'image') {
        const half = shape.size / 2;
        return `<image${attrs({
            href: shape.href, 'xlink:href': shape.href, x: -half, y: shape.y - half, width: shape.size, height: shape.size,
            preserveAspectRatio: shape.round ? 'xMidYMid slice' : 'xMidYMid meet',
            'clip-path': shape.round ? `url(#${clip})` : undefined,
        })}/>`;
    }
    const halo = shape.halo ? attrs({ stroke: shape.halo, 'stroke-width': shape.haloWidth, 'paint-order': 'stroke', 'stroke-linejoin': 'round' }) : '';
    return `<text${attrs({ y: shape.y, 'font-size': shape.size, 'font-weight': shape.weight, fill: shape.fill })}${halo}>${escape(shape.text)}</text>`;
};

export const sceneToSvg = (scene: Scene, options: { background?: boolean | undefined; id?: string | undefined } = {}): string => {
    const id = options.id ?? 'tequio';
    const clip = `${id}-round`;
    const { theme } = scene;
    const parts: string[] = [
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"${attrs({
            width: scene.width, height: scene.height, viewBox: `0 0 ${scene.width} ${scene.height}`,
            role: 'img', 'aria-labelledby': `${id}-title`,
            'font-family': theme.font, 'text-anchor': 'middle',
        })}>`,
        `<title id="${id}-title">${escape(scene.title)}</title>`,
        `<defs><clipPath id="${clip}" clipPathUnits="objectBoundingBox"><circle cx="0.5" cy="0.5" r="0.5"/></clipPath></defs>`,
    ];
    if (options.background !== false) parts.push(`<rect${attrs({ width: scene.width, height: scene.height, fill: theme.background })}/>`);
    parts.push('<g stroke-linecap="round">');
    const s = scaleOf(scene);
    for (const l of scene.links) {
        parts.push(`<line${attrs({
            ...linkEnds(l.link, s), stroke: l.color, 'stroke-width': l.width, 'stroke-opacity': l.opacity,
            opacity: l.fade === 1 ? undefined : l.fade,
        })}/>`);
    }
    parts.push('</g>');
    for (const node of scene.nodes) {
        parts.push(`<g${attrs({
            transform: `translate(${n(node.node.x)} ${n(node.node.y)})`, opacity: node.opacity === 1 ? undefined : node.opacity,
        })}><title>${escape(node.label)}</title>`);
        parts.push(...node.shapes.map((shape) => shapeToSvg(shape, clip)), '</g>');
    }
    if (scene.legend.length) {
        parts.push(`<g aria-hidden="true" text-anchor="start"${attrs({ 'font-size': scene.legend[0]?.size, fill: theme.muted })}>`);
        for (const item of scene.legend) {
            parts.push(
                `<circle${attrs({ cx: item.x, cy: item.y, r: item.r, fill: item.color })}/>`,
                `<text${attrs({ x: item.x + item.r * 2, y: item.y + item.size * 0.35 })}>${escape(item.label)}</text>`,
            );
        }
        parts.push('</g>');
    }
    parts.push('</svg>');
    return parts.join('');
};

export const toSvg = (data: GraphData, options: SvgOptions = {}): string => {
    const graph = buildGraph(data, { layout: options.layout });
    settle(graph, options.steps ?? 360, options.forces ?? DEFAULT_FORCES);
    return sceneToSvg(buildScene(graph, options), { background: options.background, id: options.id });
};
