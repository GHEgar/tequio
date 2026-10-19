import { hash } from '@npmegar/tequio';
import type { GraphData } from '@npmegar/tequio';

const uri = (svg: string): string => `data:image/svg+xml,${encodeURIComponent(svg)}`;

const TONES = ['#f6c9a8', '#d9a07a', '#a8714f', '#7a4e33', '#f1d3b8', '#c58b65'];
const HAIR = ['#2b2118', '#5a3b22', '#a0522d', '#d8b06a', '#1d1d1d', '#7d7d7d'];
const SHIRT = ['#3987e5', '#d95926', '#199e70', '#9085e9', '#d55181', '#c98500'];

const pick = <T>(list: T[], seed: string): T => list[Math.floor(hash(seed) * list.length)] as T;

export const avatar = (id: string): string => uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" fill="${pick(SHIRT, `${id}:bg`)}"/>
<circle cx="32" cy="70" r="26" fill="${pick(SHIRT, `${id}:shirt`)}" stroke="#0003" stroke-width="2"/>
<circle cx="32" cy="30" r="15" fill="${pick(TONES, `${id}:skin`)}"/>
<path d="M17 28a15 15 0 0 1 30 0c-4-6-10-8-15-8s-11 2-15 8z" fill="${pick(HAIR, `${id}:hair`)}"/>
</svg>`);

const GLYPHS = [
    '<path d="M32 12 52 48H12z"/>',
    '<rect x="16" y="16" width="32" height="32" rx="6"/>',
    '<path d="M32 10 54 32 32 54 10 32z"/>',
    '<circle cx="32" cy="32" r="20"/>',
    '<path d="M14 44c8-24 28-24 36 0" fill="none" stroke-width="8" stroke-linecap="round"/>',
];

export const logo = (index: number): string => uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="#9a9890" stroke="#9a9890">${GLYPHS[index % GLYPHS.length]}</svg>`);

export const decorate = (data: GraphData): GraphData => ({
    ...data,
    projects: data.projects.map((p, i) => (i % 3 === 1 ? { ...p, logo: logo(i) } : p)),
    people: data.people.map((p) => (hash(`${p.id}:photo`) < 0.25 ? { ...p, avatar: avatar(p.id) } : p)),
});
