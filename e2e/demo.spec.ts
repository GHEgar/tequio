import { expect, test } from './fixtures';

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Pause updates' }).click();
    await expect(page.locator('g[data-kind="person"]')).toHaveCount(150);
});

test('draws 10 projects and 150 people as an accessible image', async ({ page }) => {
    await expect(page.locator('g[data-kind="project"]')).toHaveCount(10);
    await expect(page.locator('svg[role="group"]')).toHaveAttribute('aria-label', 'Participation graph: 10 projects and 150 people');
    await expect(page.getByRole('table')).toHaveCount(2);
});

test('keeps moving between updates without jumping', async ({ page }) => {
    const node = page.locator('g[data-id="person-0"]');
    const first = await node.getAttribute('transform');
    await page.waitForTimeout(500);
    const second = await node.getAttribute('transform');
    expect(second).not.toBe(first);
    await page.getByRole('button', { name: 'Next update' }).click();
    const [x0, y0] = (second ?? '').match(/[\d.]+/g)?.map(Number) ?? [];
    const [x1, y1] = ((await node.getAttribute('transform')) ?? '').match(/[\d.]+/g)?.map(Number) ?? [];
    expect(Math.hypot((x1 ?? 0) - (x0 ?? 0), (y1 ?? 0) - (y0 ?? 0))).toBeLessThan(60);
});

test('pulses the nodes that changed', async ({ page }) => {
    await page.getByRole('button', { name: 'Next update' }).click();
    await expect.poll(() => page.locator('g[data-kind] > circle[stroke-width="4"]').count()).toBeGreaterThan(0);
});

test('switches theme and selects a node with the keyboard', async ({ page }) => {
    await page.getByRole('button', { name: 'Light theme' }).click();
    await expect(page.locator('svg > rect').first()).toHaveAttribute('fill', '#ffffff');
    await page.locator('g[data-kind="project"]').first().focus();
    await page.keyboard.press('Enter');
    await expect(page.getByText(/^Selected: /)).toBeVisible();
});

test('exports SVG and PNG', async ({ page }) => {
    const [svg] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export SVG' }).click()]);
    expect(svg.suggestedFilename()).toBe('tequio.svg');
    const [png] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export PNG' }).click()]);
    expect(png.suggestedFilename()).toBe('tequio.png');
});
