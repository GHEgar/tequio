import { defineTequio } from '@npmegar/tequio/element';
import type { GraphData } from '@npmegar/tequio';
import { decorate } from './assets';
import { demoData } from './data';

defineTequio();

const graph = document.querySelector('tequio-graph') as (HTMLElement & { data: GraphData | null }) | null;
let tick = 0;

const update = (): void => {
    if (graph) graph.data = decorate(demoData({ tick }));
    tick += 1;
};

update();
setInterval(update, 15000);
