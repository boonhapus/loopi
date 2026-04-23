/**
 * @fileoverview Ghost cursor injection script.
 * @description Returns the init script as a string. Injected via page.addInitScript.
 *   Creates a fixed-position cursor div and listens for a custom 'loopi-cursor-move'
 *   event dispatched from Node-land to move it smoothly to (x, y) in viewport coords.
 */

/**
 * Init script injected into Playwright pages to render a ghost cursor.
 * @type {string}
 */
export const cursorInitScript = `
(() => {
  if (window.__loopiCursorInstalled) return;
  window.__loopiCursorInstalled = true;

  const install = () => {
    if (!document.body) {
      requestAnimationFrame(install);
      return;
    }

    const cursor = document.createElement('div');
    cursor.setAttribute('data-loopi-cursor', '');
    cursor.style.cssText = [
      'position: fixed',
      'top: 0',
      'left: 0',
      'width: 24px',
      'height: 24px',
      'pointer-events: none',
      'z-index: 2147483647',
      'transform: translate(-4px, -4px)',
      'transition: transform 280ms cubic-bezier(0.22, 0.61, 0.36, 1)',
      'will-change: transform',
    ].join(';');

    cursor.innerHTML = \`
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M5 3L19 12L12 13.5L9 20L5 3Z" fill="white" stroke="black" stroke-width="1.2" stroke-linejoin="round"/>
      </svg>
    \`;

    document.body.appendChild(cursor);

    let x = 0, y = 0;
    window.addEventListener('loopi-cursor-move', (e) => {
      x = e.detail.x;
      y = e.detail.y;
      cursor.style.transform = \`translate(\${x - 4}px, \${y - 4}px)\`;
    });

    window.addEventListener('loopi-cursor-click', () => {
      cursor.animate(
        [
          { transform: cursor.style.transform + ' scale(1)' },
          { transform: cursor.style.transform + ' scale(0.75)' },
          { transform: cursor.style.transform + ' scale(1)' },
        ],
        { duration: 220, easing: 'ease-out' }
      );
    });
  };

  install();
})();
`;