import { toSvg } from './svg.js';
import type { SvgOptions } from './svg.js';
import type { GraphData } from './types.js';

export interface PngOptions extends SvgOptions {
    scale?: number | undefined;
}

const asDataUri = async (url: string): Promise<string> => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`tequio: could not load ${url} (${response.status})`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error ?? new Error(`tequio: could not read ${url}`));
        reader.readAsDataURL(blob);
    });
};

const decode = (text: string): string => text.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

export const inlineImages = async (svg: string): Promise<string> => {
    const urls = [...new Set([...svg.matchAll(/href="([^"]+)"/g)].map((m) => m[1] as string))]
        .filter((url) => !url.startsWith('data:') && !url.startsWith('#'));
    const inlined = await Promise.all(urls.map(async (url) => [url, await asDataUri(decode(url))] as const));
    return inlined.reduce((text, [url, data]) => text.split(`href="${url}"`).join(`href="${data}"`), svg);
};

const sizeOf = (svg: string): { width: number; height: number } => {
    const width = Number(/width="([\d.]+)"/.exec(svg)?.[1] ?? 1920);
    const height = Number(/height="([\d.]+)"/.exec(svg)?.[1] ?? 1080);
    return { width, height };
};

export const svgToPng = async (svg: string, scale = 1): Promise<Blob> => {
    const text = await inlineImages(svg);
    const { width, height } = sizeOf(text);
    const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
    try {
        const image = new Image();
        image.src = url;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(width * scale);
        canvas.height = Math.round(height * scale);
        const context = canvas.getContext('2d');
        if (!context) throw new Error('tequio: 2D canvas is not available');
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        return await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('tequio: PNG encoding failed'))), 'image/png');
        });
    } finally {
        URL.revokeObjectURL(url);
    }
};

export const toPng = (input: GraphData | string, options: PngOptions = {}): Promise<Blob> => svgToPng(
    typeof input === 'string' ? input : toSvg(input, options),
    options.scale ?? 1,
);
