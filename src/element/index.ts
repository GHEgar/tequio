import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import type { GraphData, GraphNode, Layout } from '../core/index.js';
import { Tequio } from '../react/index.js';
import type { TequioProps, TourOptions } from '../react/index.js';
import { startSource } from './source.js';
import type { Source } from './source.js';

export { load, startSource } from './source.js';
export type { Source, SourceOptions } from './source.js';

export const ATTRIBUTES = ['src', 'refresh', 'token', 'theme', 'tour', 'locale', 'info', 'focus', 'legend', 'width', 'height', 'table'] as const;

const STYLE = `:host{display:block;position:relative;width:100%;height:100%}
.tequio{width:100%;height:100%}
.tequio>svg{display:block}
g[role=button]:focus:not(:focus-visible){outline:none}
.tequio-message{margin:0;padding:1rem;font:inherit}`;

export interface NodeDetail {
    id: string;
    kind: GraphNode['kind'];
    name: string;
}

const flag = (value: string | null, fallback: boolean): boolean => (value === null ? fallback : value !== 'false');

export const tourOf = (value: string | null): boolean | TourOptions => {
    if (value === null || value === 'false') return false;
    const [idle, interval] = value.split(',').map((v) => Number(v.trim()));
    if (!idle) return true;
    return interval ? { idle, interval } : { idle };
};

const number = (value: string | null): number | undefined => {
    const n = Number(value);
    return value !== null && Number.isFinite(n) && n > 0 ? n : undefined;
};

export const propsOf = (el: HTMLElement): Omit<TequioProps, 'data'> => {
    const layout: Partial<Layout> = {};
    const width = number(el.getAttribute('width'));
    const height = number(el.getAttribute('height'));
    if (width) layout.width = width;
    if (height) layout.height = height;
    return {
        theme: el.getAttribute('theme') === 'light' ? 'light' : 'dark',
        tour: tourOf(el.getAttribute('tour')),
        locale: el.getAttribute('locale') ?? undefined,
        info: flag(el.getAttribute('info'), true),
        focus: flag(el.getAttribute('focus'), true),
        legend: flag(el.getAttribute('legend'), true),
        table: flag(el.getAttribute('table'), true),
        layout: width || height ? layout : undefined,
    };
};

export const defineTequio = (tag = 'tequio-graph'): CustomElementConstructor => {
    const existing = customElements.get(tag);
    if (existing) return existing;

    class TequioGraphElement extends HTMLElement {
        static observedAttributes = ATTRIBUTES;

        #root: Root | null = null;
        #data: GraphData | null = null;
        #error: string | null = null;
        #source: Source | null = null;

        get data(): GraphData | null {
            return this.#data;
        }

        set data(value: GraphData | null) {
            this.#data = value;
            this.#error = null;
            this.#render();
        }

        connectedCallback(): void {
            const shadow = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
            if (!this.#root) {
                const style = document.createElement('style');
                style.textContent = STYLE;
                const holder = document.createElement('div');
                holder.className = 'tequio';
                shadow.replaceChildren(style, holder);
                this.#root = createRoot(holder);
            }
            this.#restart();
            this.#render();
        }

        disconnectedCallback(): void {
            this.#source?.stop();
            this.#source = null;
            const root = this.#root;
            this.#root = null;
            queueMicrotask(() => root?.unmount());
        }

        attributeChangedCallback(name: string): void {
            if (!this.isConnected) return;
            if (name === 'src' || name === 'token' || name === 'refresh') this.#restart();
            this.#render();
        }

        refresh(): Promise<void> {
            return this.#source?.now() ?? Promise.resolve();
        }

        #restart(): void {
            this.#source?.stop();
            this.#source = null;
            const src = this.getAttribute('src');
            if (!src) return;
            this.setAttribute('aria-busy', 'true');
            this.#source = startSource({
                src,
                token: this.getAttribute('token') ?? undefined,
                refresh: Number(this.getAttribute('refresh') ?? 30),
                onData: (data) => {
                    this.#data = data;
                    this.#error = null;
                    this.removeAttribute('aria-busy');
                    this.removeAttribute('data-stale');
                    this.dispatchEvent(new CustomEvent('tequio-load', { detail: data }));
                    this.#render();
                },
                onError: (error) => {
                    this.#error = error.message;
                    this.removeAttribute('aria-busy');
                    if (this.#data) this.setAttribute('data-stale', '');
                    this.dispatchEvent(new CustomEvent('tequio-error', { detail: error }));
                    this.#render();
                },
            });
        }

        #onNode = (node: GraphNode): void => {
            const detail: NodeDetail = { id: node.data.id, kind: node.kind, name: node.data.name };
            this.dispatchEvent(new CustomEvent('tequio-node', { detail, bubbles: true, composed: true }));
        };

        #render(): void {
            if (!this.#root) return;
            if (!this.#data) {
                const message = this.#error ?? null;
                this.#root.render(message ? createElement('p', { className: 'tequio-message', role: 'alert' }, message) : null);
                return;
            }
            this.#root.render(createElement(Tequio, { ...propsOf(this), data: this.#data, onNode: this.#onNode }));
        }
    }

    customElements.define(tag, TequioGraphElement);
    return TequioGraphElement;
};
