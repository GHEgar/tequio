import type { Tone } from './types.js';

export interface Theme {
    name: string;
    background: string;
    surface: string;
    text: string;
    muted: string;
    track: string;
    font: string;
    linkOpacity: number;
    inactiveOpacity: number;
    dimOpacity: number;
    palette: string[];
    tones: Record<Tone, string>;
}

const TONES_DARK: Record<Tone, string> = {
    good: '#0ca30c',
    warning: '#fab219',
    serious: '#ec835a',
    critical: '#d03b3b',
    neutral: '#383835',
};

export const dark: Theme = {
    name: 'dark',
    background: '#0d0d0d',
    surface: '#1a1a19',
    text: '#f0efec',
    muted: '#c3c2b7',
    track: '#383835',
    font: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    linkOpacity: 0.4,
    inactiveOpacity: 0.45,
    dimOpacity: 0.14,
    palette: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
    tones: TONES_DARK,
};

export const light: Theme = {
    name: 'light',
    background: '#ffffff',
    surface: '#fcfcfb',
    text: '#0b0b0b',
    muted: '#52514e',
    track: '#e1e0d9',
    font: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    linkOpacity: 0.45,
    inactiveOpacity: 0.4,
    dimOpacity: 0.18,
    palette: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
    tones: { ...TONES_DARK, neutral: '#c3c2b7' },
};

export const themes = { dark, light };

export type ThemeOverrides = Partial<Omit<Theme, 'tones'>> & {
    base?: 'dark' | 'light' | undefined;
    tones?: Partial<Record<Tone, string>> | undefined;
};

export type ThemeInput = 'dark' | 'light' | ThemeOverrides;

export const resolveTheme = (input: ThemeInput = 'dark'): Theme => {
    if (typeof input === 'string') return themes[input];
    const { base, ...rest } = input;
    const from = themes[base ?? 'dark'];
    return { ...from, ...rest, tones: { ...from.tones, ...rest.tones } };
};
