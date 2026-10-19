import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import type { InfoPlan, Placement, Theme } from '../core/index.js';
import type { Register } from './animation.js';
import { InfoCard } from './InfoCard.js';
import { HANDOFF_MS, useAutoScroll, useHandoff, useOverflow } from './useCardMotion.js';
import type { Box } from './useCardMotion.js';

export type CountdownStyle = 'outline' | 'bar' | 'none';

export interface InfoBoxProps {
    plan: InfoPlan;
    origin: { x: number; y: number };
    ring: number;
    placement: Placement;
    theme: Theme;
    scale: number;
    register: Register;
    closeLabel: string;
    onClose?: (() => void) | undefined;
    countdown?: { since: number; duration: number; label: string; style?: CountdownStyle | undefined } | undefined;
    from?: Box | null | undefined;
    still?: boolean | undefined;
    onExtend?: ((ms: number) => void) | undefined;
    onBox?: ((id: string, box: Box) => void) | undefined;
    children?: ReactNode;
}

const useStarted = (): boolean => {
    const [started, setStarted] = useState(false);
    useEffect(() => {
        const frame = requestAnimationFrame(() => setStarted(true));
        return () => cancelAnimationFrame(frame);
    }, []);
    return started;
};

interface MeterProps {
    end: number;
    label: string;
    theme: Theme;
    u: number;
}

const useLeft = (end: number): number => {
    const [left] = useState(() => Math.max(0, end - Date.now()));
    return left;
};

const Bar = ({ end, label, theme, u }: MeterProps): ReactElement => {
    const started = useStarted();
    const duration = useLeft(end);
    return (
        <div aria-hidden="true" title={label} data-countdown={duration} style={{ height: 4 * u, borderRadius: 2 * u, background: theme.track, overflow: 'hidden', flex: 'none' }}>
            <div style={{ height: '100%', width: started ? '100%' : '0%', background: theme.muted, transition: started ? `width ${duration}ms linear` : 'none' }} />
        </div>
    );
};

const Outline = ({ end, label, theme, u }: MeterProps): ReactElement => {
    const started = useStarted();
    const duration = useLeft(end);
    const inset = { position: 'absolute', top: u / 2, left: u / 2, width: `calc(100% - ${u}px)`, height: `calc(100% - ${u}px)` } as const;
    return (
        <svg aria-hidden="true" data-countdown={duration} style={{ ...inset, overflow: 'visible', pointerEvents: 'none' }}>
            <title>{label}</title>
            <rect
                width="100%"
                height="100%"
                rx={13.5 * u}
                fill="none"
                stroke={theme.muted}
                strokeWidth={2.5 * u}
                pathLength={100}
                strokeDasharray="100 100"
                style={{ strokeDashoffset: started ? 0 : 100, transition: started ? `stroke-dashoffset ${duration}ms linear` : 'none' }}
            />
        </svg>
    );
};

const ARROW = {
    above: (p: Placement, t: number) => `M${p.x + p.arrow - t} ${p.y + p.height}L${p.x + p.arrow} ${p.y + p.height + t}L${p.x + p.arrow + t} ${p.y + p.height}Z`,
    below: (p: Placement, t: number) => `M${p.x + p.arrow - t} ${p.y}L${p.x + p.arrow} ${p.y - t}L${p.x + p.arrow + t} ${p.y}Z`,
    right: (p: Placement, t: number) => `M${p.x} ${p.y + p.arrow - t}L${p.x - t} ${p.y + p.arrow}L${p.x} ${p.y + p.arrow + t}Z`,
    left: (p: Placement, t: number) => `M${p.x + p.width} ${p.y + p.arrow - t}L${p.x + p.width + t} ${p.y + p.arrow}L${p.x + p.width} ${p.y + p.arrow + t}Z`,
};

const JUSTIFY = { above: 'flex-end', below: 'flex-start', right: 'center', left: 'center' } as const;

export const InfoBox = ({
    plan, origin, ring, placement: p, theme, scale: u, register, closeLabel, onClose, countdown, from, still = false, onExtend, onBox, children,
}: InfoBoxProps): ReactElement => {
    const section = useRef<HTMLElement>(null);
    const [desde] = useState(() => (from ? { x: from.x - origin.x, y: from.y - origin.y, width: from.width, height: from.height } : null));
    const content = useRef<HTMLDivElement>(null);
    const [actual, setActual] = useState<Box | null>(null);
    useLayoutEffect(() => {
        const el = content.current;
        if (!el) return;
        const h = Math.min(p.height, el.offsetHeight + (countdown?.style === 'bar' ? 56 : 38) * u);
        const y = p.side === 'above' ? p.y + p.height - h : p.side === 'below' ? p.y : p.y + (p.height - h) / 2;
        setActual({ x: p.x, y, width: p.width, height: h });
    }, [p.x, p.y, p.width, p.height, p.side, u, countdown?.style]);
    useEffect(() => {
        if (actual && onBox) onBox(plan.id, { ...actual, x: actual.x + origin.x, y: actual.y + origin.y });
    }, [actual, onBox, plan.id, origin.x, origin.y]);
    const { box, progress } = useHandoff(actual ?? { x: p.x, y: p.y, width: p.width, height: p.height }, desde, still);
    const auto = !!countdown;
    const extra = useOverflow(section, auto && progress >= 1, countdown?.duration ?? 0);
    const total = (countdown?.duration ?? 0) + extra + (desde && !still ? HANDOFF_MS : 0);
    useAutoScroll(section, auto && progress >= 1, total, still);
    useEffect(() => {
        if (auto && onExtend) onExtend(total - (countdown?.duration ?? 0));
    }, [auto, total, countdown?.duration, onExtend]);

    const estilo = countdown?.style ?? 'outline';
    const llegada = Math.min(1, Math.max(0, (progress - 0.55) / 0.45));
    const card: CSSProperties = {
        boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 14 * u, width: '100%', maxHeight: '100%', minHeight: 0,
        overflow: 'auto', scrollbarWidth: auto ? 'none' : 'thin', padding: 18 * u, borderRadius: 14 * u, border: `${u}px solid ${theme.track}`,
        background: theme.surface, color: theme.text, fontFamily: theme.font, fontSize: 17 * u, textAlign: 'start',
        boxShadow: `0 ${8 * u}px ${28 * u}px rgba(0, 0, 0, 0.35)`, pointerEvents: 'auto',
    };
    return (
        <g ref={register({ kind: 'node', id: plan.id })} transform={`translate(${origin.x.toFixed(1)} ${origin.y.toFixed(1)})`} data-infobox={plan.id}>
            <circle r={ring} fill="none" stroke={theme.text} strokeWidth={3 * u} strokeDasharray={`${6 * u} ${6 * u}`} opacity={llegada} />
            <foreignObject x={box.x} y={box.y} width={box.width} height={box.height} style={{ overflow: 'visible', pointerEvents: 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: progress < 1 ? 'stretch' : JUSTIFY[p.side], width: '100%', height: '100%' }}>
                    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', maxHeight: '100%', minHeight: 0, flex: progress < 1 ? 1 : undefined }}>
                        <section ref={section} role="dialog" aria-label={plan.title} style={card}>
                            <div ref={content} style={{ display: 'flex', flexDirection: 'column', gap: 14 * u, opacity: llegada, flex: 'none' }}>
                                {children ?? <InfoCard plan={plan} theme={theme} scale={u} closeLabel={closeLabel} onClose={onClose} />}
                            </div>
                            {countdown && estilo === 'bar' && progress >= 1 && <Bar key={`${countdown.since}-${total}`} end={countdown.since + total} label={countdown.label} theme={theme} u={u} />}
                        </section>
                        {countdown && estilo === 'outline' && progress >= 1 && <Outline key={`${countdown.since}-${total}`} end={countdown.since + total} label={countdown.label} theme={theme} u={u} />}
                    </div>
                </div>
            </foreignObject>
            <path d={ARROW[p.side](p, 12 * u)} fill={theme.surface} stroke={theme.track} strokeWidth={u} opacity={llegada} />
        </g>
    );
};
