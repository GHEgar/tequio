export const hash = (seed: string): number => {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i += 1) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 100000) / 100000;
};

export const jitter = (seed: string, spread: number): number => (hash(seed) - 0.5) * spread;
