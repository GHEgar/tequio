import 'rotulo';
import { StrictMode, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { toPng, toSvg } from '@npmegar/tequio';
import type { GraphData, ThemeOverrides } from '@npmegar/tequio';
import { Tequio } from '@npmegar/tequio/react';
import { decorate } from './assets';
import { demoData } from './data';
import { useFps } from './useFps';

const params = new URLSearchParams(window.location.search);
const SIZE = {
    projects: Number(params.get('projects')) || 5,
    people: Number(params.get('people')) || 40,
};
type Mode = 'dark' | 'light';

const FONT = '"Rotulo", system-ui, sans-serif';

const download = (blob: Blob, name: string): void => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const exportAs = async (format: 'svg' | 'png', data: GraphData, theme: ThemeOverrides): Promise<void> => {
    if (format === 'svg') {
        download(new Blob([toSvg(data, { theme })], { type: 'image/svg+xml' }), 'tequio.svg');
        return;
    }
    download(await toPng(data, { theme, scale: 1 }), 'tequio.png');
};

function App() {
    const [mode, setMode] = useState<Mode>('dark');
    const [tick, setTick] = useState(0);
    const [playing, setPlaying] = useState(true);
    const [tv, setTv] = useState(false);
    const [selected, setSelected] = useState('');
    const stage = useRef<HTMLDivElement>(null);
    const fps = useFps();

    useEffect(() => {
        if (!playing) return undefined;
        const timer = setInterval(() => setTick((t) => t + 1), 15000);
        return () => clearInterval(timer);
    }, [playing]);

    useEffect(() => {
        const sync = (): void => setTv(document.fullscreenElement === stage.current);
        document.addEventListener('fullscreenchange', sync);
        return () => document.removeEventListener('fullscreenchange', sync);
    }, []);

    const data = useMemo(() => decorate(demoData({ ...SIZE, tick })), [tick]);
    const theme = useMemo<ThemeOverrides>(() => ({ base: mode, font: FONT }), [mode]);

    const toggleTv = (): void => {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void stage.current?.requestFullscreen();
    };

    return (
        <main className={`page ${mode}`}>
            <header className="bar">
                <h1>
                    <code>tequio</code>
                    {' — who works on what, live'}
                </h1>
                <div className="controls">
                    <button type="button" onClick={() => setPlaying((p) => !p)} aria-pressed={playing}>
                        {playing ? 'Pause updates' : 'Resume updates'}
                    </button>
                    <button type="button" onClick={() => setTick((t) => t + 1)}>Next update</button>
                    <button type="button" onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}>
                        {mode === 'dark' ? 'Light theme' : 'Dark theme'}
                    </button>
                    <button type="button" onClick={toggleTv}>TV mode</button>
                    <a className="button" href="./tv.html">Web component page</a>
                    <button type="button" onClick={() => void exportAs('svg', data, theme)}>Export SVG</button>
                    <button type="button" onClick={() => void exportAs('png', data, theme)}>Export PNG</button>
                </div>
            </header>
            <div ref={stage} className={`stage ${tv ? 'tv' : ''}`} data-testid="stage">
                <Tequio data={data} theme={theme} table tour={{ idle: 5000, interval: 15000 }} onNode={(node) => setSelected(node.data.name)} />
            </div>
            <footer className="status">
                <span>{`Update #${tick}`}</span>
                <span data-testid="fps">{`${fps} fps`}</span>
                <span aria-live="polite">{selected ? `Selected: ${selected}` : 'Click a node for details. Left alone, the graph tours its nodes.'}</span>
            </footer>
        </main>
    );
}

const root = document.getElementById('root');
if (root) {
    createRoot(root).render(
        <StrictMode>
            <App />
        </StrictMode>,
    );
}
