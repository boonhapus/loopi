/**
 * @fileoverview Action dispatcher for scenario steps.
 * @description Dispatches scenario steps against a Playwright page.
 *   Before each action interaction with an element, move the ghost cursor to its center
 *   and pause briefly so the transition is visible on the recording.
 */

/** @typedef {import('playwright').Page} Page */

/** Time to wait for cursor CSS transition to complete. */
const CURSOR_SETTLE_MS = 320;

/** Tracks whether a zoom is currently active. */
let _isZoomed = false;

/**
 * Moves the ghost cursor to the center of an element.
 * @param {Page} page - Playwright page instance
 * @param {string} selector - CSS selector targeting the element
 * @returns {Promise<{x: number, y: number}>} Center coordinates
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
 * Parses a magnify value (number or "150%" string).
 * @param {number|string} value
 * @returns {number}
 */
function parseMagnify(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace('%', ''));
    if (!isNaN(parsed)) return parsed / 100;
  }
  throw new Error(`Invalid magnify value: ${value}`);
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
  async hover(page, step) {
    await moveCursorTo(page, step.selector);
    await page.locator(step.selector).first().hover();
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
  async wait(page, step, _ctx, stepIndex = 0) {
    const { for: waitFor, timeout = 30000 } = step;
    if (waitFor === undefined) {
      throw new Error("wait: 'for' is required");
    }

    if (typeof waitFor === 'number') {
      await page.waitForTimeout(waitFor);
    } else if (waitFor === 'NETWORK_IDLE' || waitFor === 'LOAD' || waitFor === 'DOMCONTENTLOADED') {
      const state = waitFor === 'DOMCONTENTLOADED' ? 'domcontentloaded' : waitFor.toLowerCase();
      await page.waitForLoadState(state, { timeout });
    } else {
      // Treat as selector
      try {
        await page.waitForSelector(waitFor, { state: 'visible', timeout });
      } catch {
        throw new Error(`wait: selector '${waitFor}' not visible within ${timeout}ms (step ${stepIndex + 1})`);
      }
    }
  },

  /** @type {StepHandler} */
  async press(page, step) {
    await page.keyboard.press(step.key);
  },

  /** @type {StepHandler} */
  async scroll(page, step) {
    const { to, smooth = true } = step;
    if (to === undefined) {
      throw new Error("scroll: 'to' is required");
    }
    const behavior = smooth ? 'smooth' : 'instant';

    if (to === 'top') {
      await page.evaluate((b) => window.scrollTo({ top: 0, behavior: b }), behavior);
    } else if (to === 'bottom') {
      await page.evaluate((b) => window.scrollTo({ top: document.body.scrollHeight, behavior: b }), behavior);
    } else if (typeof to === 'number') {
      await page.evaluate(([n, b]) => window.scrollBy({ top: n, behavior: b }), [to, behavior]);
    } else if (typeof to === 'string') {
      // Check for numeric string "+400" or "-400"
      const numVal = parseInt(to, 10);
      if (to.startsWith('+') || to.startsWith('-') || !isNaN(numVal)) {
        await page.evaluate(([n, b]) => window.scrollBy({ top: n, behavior: b }), [numVal, behavior]);
      } else {
        // Treat as selector
        await page.locator(to).scrollIntoViewIfNeeded();
      }
    } else {
      throw new Error(`scroll: 'to' must be a string or number, got ${typeof to}`);
    }
  },

  /** @type {StepHandler} */
  async zoom(page, step) {
    const { on, magnify, duration = 400 } = step;
    if (!on) throw new Error("zoom: 'on' is required");
    if (!magnify) throw new Error("zoom: 'magnify' is required");

    const scale = parseMagnify(magnify);
    const rect = await page.locator(on).first().boundingBox();
    if (!rect) throw new Error(`zoom: no bounding box for selector '${on}'`);

    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;

    await page.evaluate(
      ([dur, sc, x, y]) => {
        const el = document.documentElement;
        el.style.transformOrigin = `${x}px ${y}px`;
        el.style.transform = `scale(${sc})`;
        el.style.transition = `transform ${dur}ms ease-in-out`;
      },
      [duration, scale, cx, cy]
    );

    _isZoomed = true;
    await page.waitForTimeout(duration);
  },

  /** @type {StepHandler} */
  async unzoom(page, step) {
    const { duration = 400 } = step;

    if (!_isZoomed) {
      console.warn('unzoom: no active zoom to exit');
      return;
    }

    await page.evaluate((dur) => {
      const el = document.documentElement;
      el.style.transition = `transform ${dur}ms ease-in-out`;
      el.style.transform = 'scale(1)';
      el.style.transformOrigin = 'center center';
    }, duration);

    await page.waitForTimeout(duration);
    _isZoomed = false;
  },

  /** @type {StepHandler} */
  async highlight(page, step) {
    const { selector, duration = 1000, color = '#FFD60A', style = 'outline' } = step;
    if (!selector) throw new Error("highlight: 'selector' is required");

    const rect = await page.locator(selector).first().boundingBox();
    if (!rect) throw new Error(`highlight: no bounding box for selector '${selector}'`);

    await page.evaluate(
      ([r, c, s]) => {
        const div = document.createElement('div');
        div.setAttribute('data-loopi-highlight', '');
        div.style.cssText = [
          'position: absolute',
          `left: ${r.x}px`,
          `top: ${r.y}px`,
          `width: ${r.width}px`,
          `height: ${r.height}px`,
          'z-index: 2147483646',
          'pointer-events: none',
          'border-radius: 4px',
        ].join(';');

        if (s === 'pulse') {
          div.style.animation = 'loopi-pulse 600ms ease-in-out infinite alternate';
          // Inject keyframes once per page
          if (!document.getElementById('__loopi-highlight-styles')) {
            const styleEl = document.createElement('style');
            styleEl.id = '__loopi-highlight-styles';
            styleEl.textContent = `@keyframes loopi-pulse { from { opacity: 0.4; box-shadow: 0 0 0 4px ${c}, 0 0 12px ${c}; } to { opacity: 1; box-shadow: 0 0 0 4px ${c}, 0 0 20px ${c}; } }`;
            document.head.appendChild(styleEl);
          }
        } else {
          div.style.boxShadow = `0 0 0 4px ${c}, 0 0 16px ${c}`;
          div.style.opacity = '1';
        }

        document.body.appendChild(div);
      },
      [rect, color, style]
    );

    await page.waitForTimeout(duration);

    await page.evaluate(() => {
      const el = document.querySelector('[data-loopi-highlight]');
      if (el) el.remove();
    });
  },
};

/**
 * Runs a single scenario step.
 * @param {Page} page - Playwright page instance
 * @param {Object} step - Step definition with 'action' and related fields
 * @param {StepContext} ctx - Scenario context
 * @param {number} [stepIndex=0] - Zero-based step index for error messages
 * @returns {Promise<void>}
 */
export async function runStep(page, step, ctx, stepIndex = 0) {
  const handler = handlers[step.action];
  if (!handler) throw new Error(`Unknown action: ${step.action}`);
  await handler(page, step, ctx, stepIndex);
}

export { _isZoomed };