import type { ReactElement } from 'react';
import type { InfoBlock, InfoItem, InfoPlan, Theme } from '../core/index.js';

export const Dot = ({ color, size }: { color: string; size: number }): ReactElement => (
    <span aria-hidden="true" style={{ flex: 'none', width: size, height: size, borderRadius: '50%', background: color }} />
);

const Row = ({ item, theme, u }: { item: InfoItem; theme: Theme; u: number }): ReactElement => {
    const label = item.href
        ? <a href={item.href} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>{item.label}</a>
        : item.label;
    return (
        <li style={{ display: 'flex', alignItems: 'center', gap: 10 * u, minHeight: 32 * u }}>
            {item.color && <Dot color={item.color} size={12 * u} />}
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
            <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: theme.text }}>{item.value}</span>
        </li>
    );
};

const Block = ({ block, theme, u }: { block: InfoBlock; theme: Theme; u: number }): ReactElement => {
    if (block.type === 'badges') {
        return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 * u }}>
                {block.items.map((b) => (
                    <span key={b.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 * u, padding: `${4 * u}px ${12 * u}px`, borderRadius: 999, border: `${u}px solid ${theme.track}`, fontSize: 15 * u }}>
                        <Dot color={b.color} size={10 * u} />
                        {b.label}
                    </span>
                ))}
            </div>
        );
    }
    if (block.type === 'cards') {
        return (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${block.items.length}, 1fr)`, gap: 8 * u }}>
                {block.items.map((c) => (
                    <div key={c.label} style={{ padding: `${10 * u}px ${12 * u}px`, borderRadius: 10 * u, background: theme.background }}>
                        <div style={{ fontSize: 28 * u, fontWeight: 700, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{c.value}</div>
                        <div style={{ fontSize: 14 * u, color: theme.muted }}>{c.label}</div>
                    </div>
                ))}
            </div>
        );
    }
    if (block.type === 'text') return <p style={{ margin: 0, color: theme.muted, lineHeight: 1.35 }}>{block.text}</p>;
    return (
        <div>
            {block.title && <div style={{ fontSize: 13 * u, letterSpacing: 0.6 * u, textTransform: 'uppercase', color: theme.muted, marginBottom: 4 * u }}>{block.title}</div>}
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, color: theme.muted }}>
                {block.items.map((item, i) => <Row key={`${item.label}:${i}`} item={item} theme={theme} u={u} />)}
            </ul>
        </div>
    );
};

export interface InfoCardProps {
    plan: InfoPlan;
    theme: Theme;
    scale: number;
    closeLabel: string;
    onClose?: (() => void) | undefined;
}

export const InfoCard = ({ plan, theme, scale: u, closeLabel, onClose }: InfoCardProps): ReactElement => (
    <>
        <header style={{ display: 'flex', alignItems: 'center', gap: 12 * u }}>
            {plan.image
                ? <img src={plan.image} alt="" width={44 * u} height={44 * u} style={{ borderRadius: plan.kind === 'person' ? '50%' : 8 * u, objectFit: 'cover', background: theme.background }} />
                : <Dot color={plan.color} size={20 * u} />}
            <h2 style={{ flex: 1, margin: 0, fontSize: 24 * u, fontWeight: 700, lineHeight: 1.15 }}>{plan.title}</h2>
            {onClose && (
                <button type="button" aria-label={closeLabel} onClick={onClose} style={{ border: 0, background: 'transparent', color: theme.muted, font: 'inherit', fontSize: 26 * u, lineHeight: 1, cursor: 'pointer', padding: 4 * u }}>
                    ×
                </button>
            )}
        </header>
        {plan.blocks.map((block, i) => <Block key={`${block.type}:${i}`} block={block} theme={theme} u={u} />)}
    </>
);
