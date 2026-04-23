/**
 * @fileoverview Action dispatcher for scenario steps.
 * @description Dispatches scenario steps against a Playwright page.
 *   Before each action interaction with an element, move the ghost cursor to its center
 *   and pause briefly so the transition is visible on the recording.
 */

/** @typedef {import('playwright').Page} Page */

/** Time to wait for cursor CSS transition to complete. */
const CURSOR_SETTLE_MS = 320;

/**
 * Moves the ghost cursor to the center of an element.
 * @param {Page} page - Playwright page instance
 * @param {string} selector - CSS selector targeting the element
 * @returns {Promise<{x: number, y: number}> Center coordinates
 */
async function moveCursorTo(page, selector) {
  const box = await page.locator(selector).first().boundingBox();
  if (!box) throw new Error(`No bounding box for selector: ${selector}`);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.evaluate(
    ({ x, y }) => window.dispatchEvent(new CustomEvent('loopi-cursor-move', { detail: { x, y } })),
    { x, y }
  );
  await page.waitForTimeout(CURSOR_SETTLE_MS);
  return { x, y };
}

/**
 * Triggers a click animation on the ghost cursor.
 * @param {Page} page - Playwright page instance
 * @returns {Promise<void>}
 */
async function flashCursorClick(page) {
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('loopi-cursor-click')));
}

/**
 * Scenario step context.
 * @typedef {Object} StepContext
 * @property {string} baseUrl - Base URL for relative navigation
 */

/**
 * Step handler.
 * @typedef {function(Page, Object, StepContext): Promise<void>} StepHandler
 */

/** @type {Object.<string, StepHandler>} */
const handlers = {
  /** @type {StepHandler} */
  async navigate(page, step, { baseUrl }) {
    const target = /^https?:\/\//.test(step.url) ? step.url : new URL(step.url, baseUrl).toString();
    await page.goto(target, { waitUntil: 'domcontentloaded' });
  },

  /** @type {StepHandler} */
  async click(page, step) {
    await moveCursorTo(page, step.selector);
    await flashCursorClick(page);
    await page.locator(step.selector).first().click();
  },

  /** @type {StepHandler} */
  async type(page, step) {
    await moveCursorTo(page, step.selector);
    await flashCursorClick(page);
    const locator = page.locator(step.selector).first();
    await locator.click();
    await locator.fill('');
    await locator.type(step.text, { delay: step.delay ?? 60 });
  },

  /** @type {StepHandler} */
  async wait(page, step) {
    await page.waitForTimeout(step.ms ?? 1000);
  },

  /** @type {StepHandler} */
  async press(page, step) {
    await page.keyboard.press(step.key);
  },
};

/**
 * Runs a single scenario step.
 * @param {Page} page - Playwright page instance
 * @param {Object} step - Step definition with 'action' and related fields
 * @param {StepContext} ctx - Scenario context
 * @returns {Promise<void>}
 */
export async function runStep(page, step, ctx) {
  const handler = handlers[step.action];
  if (!handler) throw new Error(`Unknown action: ${step.action}`);
  await handler(page, step, ctx);
}