// docs/*.md 의 mermaid 블록을 PNG/SVG 로 렌더 (Playwright + mermaid CDN). 실행: node apps/e2e/render-diagrams.mjs
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const root = path.resolve(import.meta.dirname, '../..');
const out = path.join(root, 'docs/diagrams');
fs.mkdirSync(out, { recursive: true });

const jobs = [
  { file: 'docs/schema.md', index: 0, name: 'erd' },
  { file: 'docs/architecture.md', index: 0, name: 'architecture' },
  { file: 'docs/architecture.md', index: 1, name: 'operator-flow' },
  { file: 'docs/architecture.md', index: 2, name: 'visitor-flow' },
];

const blocks = (md) => [...md.matchAll(/```mermaid\n([\s\S]*?)```/g)].map((m) => m[1]);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 2 });
await page.setContent(`<!doctype html><html><body style="margin:0;background:#fff">
<div id="c"></div>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script>mermaid.initialize({ startOnLoad: false, theme: 'default', fontFamily: 'Apple SD Gothic Neo, Pretendard, system-ui, sans-serif', flowchart: { htmlLabels: true, curve: 'basis' } });</script>
</body></html>`, { waitUntil: 'networkidle' });

for (const j of jobs) {
  const src = blocks(fs.readFileSync(path.join(root, j.file), 'utf8'))[j.index];
  const svg = await page.evaluate(async (code) => {
    const { svg } = await mermaid.render('d' + Math.random().toString(36).slice(2), code);
    const c = document.getElementById('c'); c.innerHTML = svg;
    c.firstElementChild.style.maxWidth = 'none';
    return svg;
  }, src);
  fs.writeFileSync(path.join(out, `${j.name}.svg`), svg);
  const el = page.locator('#c svg');
  await el.screenshot({ path: path.join(out, `${j.name}.png`), omitBackground: false });
  console.log('rendered', j.name);
}
await browser.close();
