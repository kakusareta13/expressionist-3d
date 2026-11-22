// Render a scene page to video (or stills) with headless Chrome + ffmpeg.
//   node tools/render.mjs <scene-folder> [--fps 24] [--size 1920x1080] [--q "vert=1&clip=0:40"]
//        [--from 0] [--to <DUR>] [--out out/film.mp4] [--audio voice.wav] [--still 1,5.5,12] [--restart 1200]
// The page must set window.READY = true, expose window.render(t) and window.DUR (seconds).
// Chrome: set CHROME_PATH (otherwise common install paths are tried). ffmpeg: set FFMPEG or have it on PATH.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2), opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args.splice(i, 2)[1] : null; };
const fps = +(opt('fps') ?? 24), [W, H] = (opt('size') ?? '1920x1080').split('x').map(Number), q = opt('q') ?? '';
const out = opt('out') ?? 'out/film.mp4', audio = opt('audio'), stills = opt('still'), restart = +(opt('restart') ?? 1200);
const from = +(opt('from') ?? 0), toS = opt('to'), toOpt = toS !== null ? +toS : null;
const dir = args[0]; if (!dir) { console.error('usage: node tools/render.mjs <scene-folder> [options]'); process.exit(2); }
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const FF = process.env.FFMPEG || 'ffmpeg';

// static server over the repository root (so /node_modules/three resolves)
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/${dir.replace(/\\/g, '/').replace(/\/$/, '')}/index.html?${q}`;

const guess = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find(p => fs.existsSync(p));
const browser = await chromium.launch({ executablePath: guess, args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
async function openPage() {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.on('pageerror', e => console.error('[page]', e.message));
  await page.goto(url); await page.waitForFunction(() => window.READY === true, null, { timeout: 180000 }); return page;
}
let page = await openPage();
const DUR = await page.evaluate(() => window.DUR);
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });

if (stills) {
  for (const s of stills.split(',').map(Number)) { await page.evaluate(t => window.render(t), s); const f = out.replace(/\.mp4$/, '') + `_${s}.jpg`; await page.screenshot({ path: f, type: 'jpeg', quality: 92 }); console.log(f); }
} else {
  const end = toOpt ?? DUR, N = Math.round((end - from) * fps), tmp = audio ? out.replace(/\.mp4$/, '.video.mp4') : out;
  const ff = spawn(FF, ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    if (i && i % restart === 0) { await page.close(); page = await openPage(); }   // fresh page now and then: WebGL memory stays flat
    await page.evaluate(t => window.render(t), from + i / fps);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 120 === 0) console.log(`${i}/${N}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  if (audio) {
    await new Promise(r => spawn(FF, ['-v', 'error', '-y', '-i', tmp, '-ss', String(from), '-t', String(end - from), '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', out], { stdio: 'inherit' }).on('close', r));
    fs.rmSync(tmp, { force: true });
  }
  console.log('done', out);
}
await browser.close(); server.close();
