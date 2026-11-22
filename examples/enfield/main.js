const q = new URLSearchParams(location.search);
const mod = await import(q.get('sheet') ? './sheet.js' : './film.js');
const draw = await mod.setup(q.get('sheet'));
const clip = q.get('clip') ? q.get('clip').split(':').map(Number) : null;
window.render = t => draw(clip ? t + clip[0] : t);
if (clip) window.DUR = clip[1] - clip[0];
window.DUR = window.DUR || 1; render(0); window.READY = true;
