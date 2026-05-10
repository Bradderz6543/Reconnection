/**
 * Renders the favicon SVG to PNG variants and renders the social/OG
 * sharing image. Uses Playwright (already a devDependency) so no
 * additional binaries are required.
 *
 * Output files (in public/):
 *   - apple-touch-icon.png  (180x180)
 *   - icon-192.png          (192x192)
 *   - icon-512.png          (512x512)
 *   - favicon-32.png        (32x32, used by ICO fallback / older browsers)
 *   - images/og-image.png   (1200x630, social share)
 */

import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const publicDir = path.join(projectRoot, 'public');
const imagesDir = path.join(publicDir, 'images');

await mkdir(publicDir, { recursive: true });
await mkdir(imagesDir, { recursive: true });

const faviconSvg = await readFile(path.join(publicDir, 'favicon.svg'), 'utf8');

const wrapAsHtml = (svg, size, padding = 0) => `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;background:transparent;}
  body{display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;}
  svg{width:${size - padding * 2}px;height:${size - padding * 2}px;display:block;}
</style></head><body>${svg}</body></html>`;

const ogHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Oswald:wght@500;600;700&display=swap">
<style>
  *{box-sizing:border-box;}
  html,body{margin:0;padding:0;width:1200px;height:630px;}
  body{
    position:relative;
    font-family:'Fraunces',Georgia,serif;
    color:#f4ecdc;
    background:
      radial-gradient(circle at 78% 28%, rgba(216,167,58,0.16), transparent 36%),
      radial-gradient(circle at 18% 82%, rgba(216,167,58,0.10), transparent 38%),
      linear-gradient(180deg, #14301d 0%, #0d1a12 60%, #0a140e 100%);
    overflow:hidden;
  }
  .frame{
    position:absolute; inset:28px;
    border:1px solid rgba(216,167,58,0.32);
    border-radius:6px;
    pointer-events:none;
  }
  .grain{
    position:absolute; inset:0;
    background-image: radial-gradient(rgba(255,255,255,0.018) 1px, transparent 1px);
    background-size: 3px 3px;
    mix-blend-mode: overlay;
    opacity:0.5;
  }
  .content{
    position:relative;
    height:100%;
    padding: 80px 88px;
    display:flex;
    flex-direction:column;
    justify-content:center;
  }
  .brand{
    display:flex; align-items:center; gap:18px;
    margin-bottom: 36px;
  }
  .brand-mark{
    width:64px; height:64px;
    border-radius:12px;
    background: linear-gradient(180deg, #16321f, #0c100c);
    border:1px solid rgba(216,167,58,0.32);
    display:flex; align-items:center; justify-content:center;
    font-family:'Fraunces',Georgia,serif;
    font-weight:700;
    font-size:46px;
    color:#ecc25a;
    line-height:1;
    padding-bottom:6px;
    box-shadow: 0 6px 16px rgba(0,0,0,0.3);
  }
  .brand-text{
    display:flex; flex-direction:column; gap:4px; line-height:1;
  }
  .brand-name{
    font-family:'Fraunces',Georgia,serif;
    font-weight:700;
    font-size:30px;
    letter-spacing:-0.01em;
    text-transform:uppercase;
    color:#f4ecdc;
  }
  .brand-sub{
    font-family:'Oswald',sans-serif;
    font-weight:600;
    font-size:14px;
    letter-spacing:0.32em;
    text-transform:uppercase;
    color:rgba(244,236,220,0.72);
  }
  h1{
    margin:0 0 28px;
    font-family:'Fraunces',Georgia,serif;
    font-weight:600;
    font-size:84px;
    line-height:0.98;
    letter-spacing:-0.02em;
    max-width:980px;
    color:#f4ecdc;
  }
  h1 em{
    font-style:italic;
    color:#ecc25a;
    font-weight:500;
  }
  .meta{
    display:flex; align-items:center; gap:14px;
    margin-top:8px;
    font-family:'Oswald',sans-serif;
    font-size:18px;
    font-weight:500;
    letter-spacing:0.22em;
    text-transform:uppercase;
    color:rgba(244,236,220,0.78);
  }
  .meta .dot{
    width:6px; height:6px; border-radius:50%;
    background:#ecc25a;
  }
  .accent{
    position:absolute;
    right:88px; bottom:88px;
    width:120px; height:2px;
    background:linear-gradient(90deg, transparent, #ecc25a 40%, #ecc25a 60%, transparent);
  }
</style></head>
<body>
  <div class="frame"></div>
  <div class="grain"></div>
  <div class="content">
    <div class="brand">
      <div class="brand-mark">R</div>
      <div class="brand-text">
        <div class="brand-name">Reconnection</div>
        <div class="brand-sub">Shipley</div>
      </div>
    </div>
    <h1>Cosy bar, events space &amp; <em>community venue</em>.</h1>
    <div class="meta">
      <span>41 Westgate, Shipley</span>
      <span class="dot"></span>
      <span>Craft Drinks</span>
      <span class="dot"></span>
      <span>Live Music</span>
    </div>
  </div>
  <div class="accent"></div>
</body></html>`;

const browser = await chromium.launch();
const context = await browser.newContext({ deviceScaleFactor: 2 });

async function renderSvgPng(size, outPath, padding = 0) {
  const page = await context.newPage();
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(wrapAsHtml(faviconSvg, size, padding), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts?.ready);
  const buffer = await page.screenshot({ type: 'png', omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  await writeFile(outPath, buffer);
  await page.close();
  console.log('wrote', outPath);
}

async function renderOg() {
  const page = await context.newPage();
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(ogHtml, { waitUntil: 'networkidle' });
  await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
  await page.waitForTimeout(200);
  const buffer = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1200, height: 630 } });
  await writeFile(path.join(imagesDir, 'og-image.png'), buffer);
  console.log('wrote', path.join(imagesDir, 'og-image.png'));
  await page.close();
}

await renderSvgPng(180, path.join(publicDir, 'apple-touch-icon.png'), 8);
await renderSvgPng(192, path.join(publicDir, 'icon-192.png'), 0);
await renderSvgPng(512, path.join(publicDir, 'icon-512.png'), 0);
await renderSvgPng(32, path.join(publicDir, 'favicon-32.png'), 0);
await renderOg();

await browser.close();
