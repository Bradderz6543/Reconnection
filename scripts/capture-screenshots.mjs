import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const baseUrl = process.env.SITE_URL ?? 'http://localhost:4321/';

const viewports = [
  { name: 'desktop-1440', width: 1440, height: 1600 },
  { name: 'tablet-1024', width: 1024, height: 1400 },
  { name: 'mobile-390', width: 390, height: 1200 },
];

const sections = [
  ['hero', '.hero'],
  ['features', '.features-strip'],
  ['events', '.events-section'],
  ['about', '.about-band'],
  ['gallery', '.gallery-strip'],
  ['contact', '.contact-panel'],
  ['footer', '.site-footer'],
];

await mkdir('screenshots', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();

async function waitForImages() {
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => {
    await Promise.all(
      [...document.images].map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        });
      }),
    );
  });
}

async function preparePage() {
  await page.evaluate(async () => {
    document.querySelector('astro-dev-toolbar')?.remove();

    const step = Math.max(window.innerHeight * 0.75, 500);
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    for (let y = 0; y <= maxScroll; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    window.scrollTo(0, 0);
  });
  await waitForImages();
  await page.waitForTimeout(250);
}

for (const viewport of viewports) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await preparePage();
  await page.screenshot({
    path: `screenshots/home-${viewport.name}.png`,
    fullPage: true,
  });
}

await page.setViewportSize({ width: 390, height: 850 });
await page.goto(baseUrl, { waitUntil: 'networkidle' });
await preparePage();
await page.locator('.nav-toggle').click();
await page.screenshot({
  path: 'screenshots/mobile-nav-open.png',
  fullPage: false,
});

for (const viewport of [
  { name: 'desktop', width: 1440, height: 950 },
  { name: 'mobile', width: 390, height: 850 },
]) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await preparePage();
  await page.addStyleTag({ content: '.site-header { display: none !important; }' });

  for (const [name, selector] of sections) {
    const locator = page.locator(selector).first();
    await locator.evaluate((element) => element.scrollIntoView({ block: 'start' }));
    await page.evaluate(() => window.scrollBy(0, -110));
    await page.waitForTimeout(250);
    await locator.screenshot({
      path: `screenshots/section-${viewport.name}-${name}.png`,
    });
  }
}

await browser.close();
