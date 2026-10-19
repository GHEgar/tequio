import type { ReactElement } from 'react';
import type { Theme } from '../core/index.js';

export const ResumeTour = ({ width, theme, u, label, onResume }: { width: number; theme: Theme; u: number; label: string; onResume: () => void }): ReactElement => {
    const w = 300 * u;
    const h = 52 * u;
    return (
        <foreignObject x={width - w - 24 * u} y={24 * u} width={w} height={h} style={{ overflow: 'visible' }} data-resume="">
            <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%', height: '100%' }}>
                <button
                    type="button"
                    onClick={onResume}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 10 * u, height: h, padding: `0 ${20 * u}px`, borderRadius: h / 2,
                        border: `${u}px solid ${theme.track}`, background: theme.surface, color: theme.text, fontFamily: theme.font,
                        fontSize: 18 * u, fontWeight: 700, cursor: 'pointer', boxShadow: `0 ${4 * u}px ${16 * u}px rgba(0, 0, 0, 0.25)`,
                    }}
                >
                    <svg aria-hidden="true" width={16 * u} height={16 * u} viewBox="0 0 16 16"><path d="M4 2.5v11l9-5.5z" fill="currentColor" /></svg>
                    {label}
                </button>
            </div>
        </foreignObject>
    );
};
