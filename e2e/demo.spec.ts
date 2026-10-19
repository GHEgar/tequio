import { expect, test } from './fixtures';

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Pause updates' }).click();
    await expect(page.locator('g[data-kind="person"]')).toHaveCount(40);
});

test('draws 5 projects and 40 people, and 150 through the URL', async ({ page }) => {
    await expect(page.locator('g[data-kind="project"]')).toHaveCount(5);
    await expect(page.locator('svg[role="group"]')).toHaveAttribute('aria-label', 'Participation graph: 5 projects and 40 people');
    await expect(page.getByRole('table')).toHaveCount(2);
    await page.goto('/?projects=10&people=150');
    await expect(page.locator('g[data-kind="person"]')).toHaveCount(150);
});

test('opens the info box on click and closes it with Escape', async ({ page }) => {
    await page.locator('g[data-kind="project"]').first().click({ force: true });
    const box = page.getByRole('dialog');
    await expect(box).toBeVisible();
    await expect(box).toContainText('Progress');
    await expect(box).toContainText('Top contributors');
    await page.keyboard.press('Escape');
    await expect(box).toHaveCount(0);
});

test('tours the nodes when left alone', async ({ page }) => {
    await page.mouse.move(2, 2);
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 8000 });
    const first = await page.getByRole('dialog').getAttribute('aria-label');
    await expect(page.locator('svg[data-countdown]')).toBeVisible();
    await expect.poll(() => page.getByRole('dialog').getAttribute('aria-label'), { timeout: 20000 }).not.toBe(first);
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

test('the web component page draws the same graph without React in the page', async ({ page }) => {
    await page.goto('/tv.html');
    await expect(page.locator('tequio-graph g[data-kind="person"]')).toHaveCount(40);
    await expect(page.locator('tequio-graph svg[role="group"]')).toHaveAttribute('aria-label', 'Participation graph: 5 projects and 40 people');
    await page.locator('tequio-graph g[data-kind="project"]').first().click({ force: true });
    await expect(page.locator('tequio-graph [role="dialog"]')).toContainText('Progress');
});
