/**
 * Quick verification pass: loads the built site at multiple viewports,
 * captures fresh screenshots into screenshots/audit-*, asserts the
 * presence of key SEO + a11y nodes, and reports any console errors.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = process.env.SITE_URL ?? 'http://127.0.0.1:4322/Reconnection/';

await mkdir('screenshots', { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({ deviceScaleFactor: 1 });
const page = await context.newPage();

const consoleMessages = [];
page.on('console', (msg) => {
  if (['error', 'warning'].includes(msg.type())) {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  }
});
page.on('pageerror', (err) => consoleMessages.push(`[pageerror] ${err.message}`));

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 1024, height: 1300 },
  { name: 'mobile', width: 390, height: 844 },
];

const checks = {};

for (const vp of viewports) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('load').catch(() => {});
  // Scroll the page to force lazy-loaded images to load.
  await page.evaluate(async () => {
    const step = Math.max(window.innerHeight * 0.75, 500);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    for (let y = 0; y <= max; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.evaluate(async () => {
    await Promise.all(
      [...document.images].map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((r) => {
              img.addEventListener('load', r, { once: true });
              img.addEventListener('error', r, { once: true });
            }),
      ),
    );
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `screenshots/audit-${vp.name}.png`, fullPage: true });
}

// SEO + a11y assertions on desktop view
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
await page.waitForLoadState('load').catch(() => {});

checks.title = await page.title();
checks.canonical = await page.locator('link[rel=canonical]').getAttribute('href');
checks.ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
checks.themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content');
checks.faviconSvg = await page.locator('link[rel=icon][type="image/svg+xml"]').getAttribute('href');
checks.manifest = await page.locator('link[rel=manifest]').getAttribute('href');
checks.skipLink = await page.locator('.skip-link').count();
checks.h1Count = await page.locator('h1').count();
checks.h1Text = (await page.locator('h1').allTextContents()).join(' | ');
checks.jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
checks.openStatus = await page.locator('[data-open-status]').textContent();
checks.openStatusAriaLive = await page.locator('[data-open-status]').getAttribute('aria-live');

// Test: /robots.txt and /sitemap-index.xml are reachable
const robots = await page.request.get(new URL('robots.txt', baseUrl).toString());
checks.robotsStatus = robots.status();
checks.robotsBody = (await robots.text()).slice(0, 200);

const sitemap = await page.request.get(new URL('sitemap-index.xml', baseUrl).toString());
checks.sitemapStatus = sitemap.status();

// Test: favicon assets
for (const file of ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'site.webmanifest', 'images/og-image.png']) {
  const r = await page.request.get(new URL(file, baseUrl).toString());
  checks[`asset_${file}`] = r.status();
}

// Test: skip link + nav focus visibility
await page.keyboard.press('Tab');
const focusedTag = await page.evaluate(() => document.activeElement?.className || document.activeElement?.tagName);
checks.firstTabFocus = focusedTag;

// Test: gallery lightbox opens
await page.locator('.gallery-tile').first().click();
await page.waitForTimeout(300);
checks.galleryDialogOpen = await page.locator('.gallery-dialog[open]').count();
await page.keyboard.press('Escape');

// Test: mobile nav toggle
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
await page.waitForLoadState('load').catch(() => {});
await page.locator('.nav-toggle').click();
await page.waitForTimeout(150);
checks.mobileNavOpen = await page.locator('.main-nav.is-open').count();
await page.screenshot({ path: 'screenshots/audit-mobile-nav-open.png', fullPage: false });

// Open status text after page loaded — verifies JS ran
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
await page.waitForLoadState('load').catch(() => {});
await page.waitForTimeout(500);
checks.openStatusAfterJs = await page.locator('[data-open-status]').textContent();
checks.openStatusClass = await page.locator('[data-open-status]').getAttribute('class');

await writeFile('/tmp/verify-results.json', JSON.stringify({ checks, consoleMessages }, null, 2));

console.log('CHECKS', JSON.stringify(checks, null, 2));
console.log('CONSOLE', consoleMessages);

await browser.close();
