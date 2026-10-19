import { validate } from '../core/index.js';
import type { GraphData } from '../core/index.js';

export interface SourceOptions {
    src: string;
    token?: string | undefined;
    refresh: number;
    onData: (data: GraphData) => void;
    onError: (error: Error) => void;
    fetcher?: typeof fetch | undefined;
}

export interface Source {
    stop: () => void;
    now: () => Promise<void>;
}

const MAX_BACKOFF = 5 * 60 * 1000;

export const load = async (src: string, token: string | undefined, fetcher: typeof fetch): Promise<GraphData> => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetcher(src, { headers, credentials: token ? 'omit' : 'same-origin' });
    if (!response.ok) throw new Error(`tequio: ${src} answered ${response.status}`);
    const result = validate(await response.json());
    if (!result.ok) {
        const first = result.errors[0];
        throw new Error(`tequio: invalid data at ${first?.path || '(root)'}: ${first?.message ?? ''}`);
    }
    return result.data;
};

export const startSource = (options: SourceOptions): Source => {
    const fetcher = options.fetcher ?? fetch.bind(globalThis);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    let stopped = false;
    let last = '';

    const schedule = (): void => {
        if (stopped || options.refresh <= 0) return;
        const base = options.refresh * 1000;
        const wait = failures ? Math.min(MAX_BACKOFF, base * 2 ** failures) : base;
        timer = setTimeout(() => void tick(), wait);
    };

    const tick = async (): Promise<void> => {
        clearTimeout(timer);
        if (typeof document !== 'undefined' && document.hidden) {
            schedule();
            return;
        }
        try {
            const data = await load(options.src, options.token, fetcher);
            failures = 0;
            const text = JSON.stringify(data);
            if (!stopped && text !== last) {
                last = text;
                options.onData(data);
            }
        } catch (error) {
            failures += 1;
            if (!stopped) options.onError(error as Error);
        }
        schedule();
    };

    const visible = (): void => {
        if (!document.hidden) void tick();
    };
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', visible);
    void tick();
    return {
        now: tick,
        stop: () => {
            stopped = true;
            clearTimeout(timer);
            if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', visible);
        },
    };
};
