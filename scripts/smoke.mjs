// Plays every step of every lesson in the built site, at desktop and phone size, and fails on
// console errors or a step whose active nodes or state inset fall outside the scene.
// Run after `npm run build`. Uses the installed Google Chrome (no browser download).
import { chromium } from 'playwright-core';
import { preview } from 'vite';

const VIEWPORTS = [
  { name: 'desktop', viewport: { width: 1280, height: 800 } },
  { name: 'phone', viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true },
];
/** Pixels an element may poke past the scene edge before it counts as cut off. */
const SLACK = 4;

const server = await preview({ preview: { port: 0, strictPort: false }, logLevel: 'error' });
const base = server.resolvedUrls?.local[0];
if (!base) throw new Error('vite preview did not report a URL');
const browser = await chromium.launch({ channel: 'chrome' });
const problems = [];
let steps = 0;
let checked = 0;

try {
  for (const device of VIEWPORTS) {
    const { name, ...options } = device;
    const context = await browser.newContext({ ...options, reducedMotion: 'reduce' });
    const page = await context.newPage();
    let where = `${name} home`;
    page.on('pageerror', (e) => problems.push(`${where}: page error: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() === 'error') problems.push(`${where}: console error: ${m.text()}`);
    });

    await page.goto(base);
    await page.waitForSelector('a[href^="#/"]', { state: 'attached' });
    const lessons = await page.$$eval('a[href^="#/"]', (links) => [
      ...new Set(links.map((a) => a.getAttribute('href')).filter((h) => /^#\/[^/]+\/[^/]+$/.test(h ?? ''))),
    ]);
    if (lessons.length === 0) problems.push(`${name}: found no lesson links`);

    for (const href of lessons) {
      where = `${name} ${href}/1`;
      await page.goto(`${base}${href}/1`);
      await page.waitForSelector('.scene-network .node');
      const total = Number((await page.textContent('.player-count'))?.match(/\/\s*(\d+)/)?.[1] ?? 0);
      if (!total) problems.push(`${where}: could not read the step count`);
      for (let step = 1; step <= total; step++) {
        where = `${name} ${href}/${step}`;
        await page.evaluate((hash) => { location.hash = hash; }, `${href.slice(1)}/${step}`);
        await page.waitForTimeout(120);
        const { cut, count } = await page.evaluate((slack) => {
          const scene = document.querySelector('.scene-network')?.getBoundingClientRect();
          if (!scene) return { cut: ['no scene'], count: 0 };
          const outside = (r) => r.left < scene.left - slack || r.right > scene.right + slack || r.top < scene.top - slack || r.bottom > scene.bottom + slack;
          const elements = [...document.querySelectorAll('.scene-network .node.is-active, .scene-network .state-inset')];
          const cut = elements
            .filter((el) => outside(el.getBoundingClientRect()))
            .map((el) => (el.classList.contains('state-inset') ? 'state inset' : `node ${el.getAttribute('data-node')}`));
          return { cut, count: elements.length };
        }, SLACK);
        steps += 1;
        checked += count;
        if (count === 0) problems.push(`${where}: no active node to check`);
        for (const c of cut) problems.push(`${where}: ${c} is outside the scene`);
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}

if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`smoke: ${problems.length} problem(s)`);
  process.exit(1);
}
console.log(`smoke: ${steps} steps, ${checked} elements in frame, no console errors (desktop and phone)`);
