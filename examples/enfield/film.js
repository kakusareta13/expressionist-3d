// «Энфилд: дом, в котором стучали стены» — expressionist 3D. Beats follow the narration (one per sentence or group),
// each beat is cut into 2–3.5 s shots with moving cameras; actors and props are driven by beat-local time.
import * as THREE from 'three';
import { makePost } from '../../src/post.js';
import { clamp, seg, lerp, eio, eo, back, hash } from '../../src/lib.js';
import { makeChar, CAST, walkP, idleP, blinkAt } from '../../src/chars.js';
import { street, living, bedroom, lab, press, commission, lecture, cinema, evidence } from './sets.js';
import { LEAD, V2, DUR, WORDS, SEGS } from './data.js';

const Q = new URLSearchParams(location.search), VERT = Q.has('vert'), CLIP = Q.get('clip') ? Q.get('clip').split(':').map(Number) : null;
const W = VERT ? 1080 : 1920, H = VERT ? 1920 : 1080;   // ?vert=1 → 9:16 Shorts
const SEGT = Object.fromEntries(SEGS.map(s => [s[2], s]));
const sT = k => SEGT[k][0], eT = k => SEGT[k][1];
const wordT = (k, frag, n = 0) => { const [s, e] = SEGT[k]; const ws = WORDS.filter(w => w[1] >= s - .05 && w[1] < e + .05 && w[0].toLowerCase().replace(/ё/g, 'е').includes(frag)); return ws[n] ? ws[n][1] : s; };

// ---------------- renderer + post
let OUTRO = null, FILL, renderer, scene, camera, post, VU, S = {}, A = {}, BIG, LINE, TAG, TITLE, FLASH, FADE, STAMP;
const EXTRA = {
  boy1: { top: 0xc8402a, legs: 0x2a3a5a, hair: 'side', hairColor: 0x3a2414, scale: .7, name: 'Сын' },
  boy2: { top: 0x3a6aa8, legs: 0x2a2a3a, hair: 'side', hairColor: 0x5a3a20, scale: .62, name: 'Младший сын' },
  photo2: { top: 0x5a3a5a, legs: 0x2a2a2a, hat: 'flatcap', hatColor: 0x2a2a3a, hair: 'side', camera: 1 },
  tvman: { top: 0x8a6a2a, legs: 0x2a2a2a, hair: 'side', hairColor: 0x1a1210, camera: 1, glasses: 1 },
  judge2: { top: 0x3a2a2a, tie: 0x2a3a6a, legs: 0x2a2a30, hair: 'side', hairColor: 0x9a9a9a, mustache: 0x9a9a9a },
  judge3: { top: 0x2a3a2a, tie: 0x6a5a1a, legs: 0x2a2a30, hair: 'bob', hairColor: 0x5a4a3a, glasses: 1 },
  medium: { top: 0x5a2a6a, legs: 0x2a1a2a, hair: 'curly', hairColor: 0x9a9aa0, long: 1 },
  neigh: { top: 0x4a4a3a, legs: 0x2a2a2a, hat: 'flatcap', hatColor: 0x3a3a2a, hair: 'side', mustache: 0x3a2a1a },
};
const CASTALL = { ...CAST, ...EXTRA };

// ---------------- actor helpers (called from beats)
const used = new Set();
function place(n, x, z, ry = 0, p = {}, t = 0) {
  const a = A[n]; a.root.visible = true; used.add(n); a.root.position.set(x, p.y ?? 0, z); a.root.rotation.y = ry;
  const id = idleP(t, hash(n.length * 7.1) * 10); a.setPose({ ...id, ...p, blink: Math.max(id.blink, p.blink ?? 0) }); return a;
}
function walk(n, x0, z0, x1, z1, lt, t0, t1, t, extra = {}) {
  const k = seg(lt, t0, t1), x = lerp(x0, x1, k), z = lerp(z0, z1, k), moving = k > 0 && k < 1;
  const ry = Math.atan2(x1 - x0, z1 - z0);
  return place(n, x, z, extra.ry ?? ry, { ...(moving ? walkP(t, 7.5) : {}), ...extra.p }, t);
}
const faceTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);

// ---------------- camera setups per set: [pos, look, fov]
const C = {
  street: { wide: [[0, 2.4, 13], [0, 3.2, -6], 46], crane: [[-6, 8, 12], [0, 2, -6], 40], door: [[2.6, 1.4, -1.5], [.8, 1.5, -6.3], 42], car: [[8, 1.0, 2.5], [2, 1.2, -2.6], 40], low: [[-2.5, .4, 2], [1, 3.5, -6.5], 50], window: [[.5, 3.5, -2.5], [.9, 4.2, -6.6], 34], crowd: [[-4, 1.7, 3.5], [1, 1.4, -4], 44] },
  living: { wide: [[3.4, 1.9, 5.4], [-.6, 1.8, -3.6], 46], wall: [[-.3, 2.6, -1.0], [-.6, 2.8, -4.2], 38], door: [[-1.0, .5, 3.2], [-4.4, 1.9, .0], 52], chair: [[3.4, 1.2, 3.0], [.4, .7, .4], 38], chairLow: [[1.4, .25, 2.0], [.4, .4, .3], 44], high: [[.6, 5.0, 4.6], [.2, .4, -.8], 46], sofa: [[1.5, 1.6, 2.6], [-1.6, 1.2, -3.0], 40], over: [[-4.3, 2.6, 3.9], [.3, 1.0, -.2], 42], stairs: [[1.5, 1.4, 4.2], [4.4, 2.6, -1], 44], tv: [[1, 1.5, 1.0], [3.1, 1.1, -3.3], 40] },
  bedroom: { wide: [[3.0, 2.4, 5.6], [-1, 1.2, -2.6], 46], bedA: [[-1.2, 1.6, 1.6], [-3.6, .9, -1.6], 40], bedB: [[3.6, 1.6, 1.4], [1.4, .9, -1.8], 40], chest: [[1.8, 1.2, .8], [4.2, .8, -3.2], 40], shelf: [[-.2, 2.4, -1.2], [-.6, 2.8, -4.0], 38], cup: [[-1.6, 1.6, 1.6], [-4.6, 1.4, -2.8], 42], high: [[0, 5.0, 3.6], [-1, .6, -1.6], 50], door: [[2.5, 1.6, 4.0], [-.5, 1.4, -1.5], 44] },
  lab: { wide: [[3.2, 2.2, 3.8], [0, 1.2, -1.8], 46], reels: [[.6, 1.9, -.4], [.2, 1.35, -1.8], 34], mic: [[-.4, 2.3, .2], [-1.0, 2.2, -1.35], 36], tapes: [[-.6, 1.8, .6], [-2.2, 1.6, -2.4], 40], writer: [[2.8, 1.8, .6], [1.4, 1.4, -1.6], 40], props: [[-.8, 1.7, .4], [-1.4, 1.05, -1.1], 34], tri: [[1.6, 1.8, 2.2], [3.3, 1.5, .4], 40] },
  press: { wide: [[3.4, 2.4, 4.4], [0, 2.0, -2.0], 46], roll: [[1.6, 1.6, 0], [0, 1.6, -2.2], 40], hero: [[0, 1.6, 2.4], [0, 1.6, 0], 40] },
  commission: { wide: [[0, 2.4, 5.2], [0, 1.4, -2.0], 46], scale: [[.8, 2.0, .2], [0, 2.0, -1.9], 36], left: [[-3.4, 1.9, 1.2], [-.6, 1.5, -2.4], 40], right: [[3.4, 1.9, 1.2], [.6, 1.5, -2.4], 40], low: [[0, .6, 1.6], [0, 2.4, -2.4], 50] },
  lecture: { wide: [[2.6, 2.0, 4.6], [0, 2.0, -3.0], 46], board: [[0, 2.6, .6], [0, 2.6, -4.1], 40], dummy: [[3.4, 1.6, 1.2], [1.6, 1.2, -1.4], 38], speaker: [[-.6, 1.8, 1.8], [-2.2, 1.6, -1.4], 38] },
  cinema: { wide: [[0, 3.4, 6.4], [0, 3.2, -4.0], 50], screen: [[1.2, 3.0, 1.6], [0, 3.4, -4.1], 44], aud: [[3.6, 1.6, -2.6], [0, 1.4, 2.4], 46], proj: [[0, 5.4, 5.0], [0, 3.4, -4.1], 44] },
  evidence: { wide: [[0, 2.6, 4.8], [0, 1.2, -1.6], 46], e1: [[-4, 1.8, .6], [-4, 1.3, -1.6], 36], e2: [[-2, 1.8, .6], [-2, 1.2, -1.6], 36], e3: [[0, 1.8, .6], [0, 1.2, -1.6], 36], e4: [[2, 1.8, .6], [2, 1.3, -1.6], 36], e5: [[4, 1.9, .6], [4, 1.6, -1.6], 36], low: [[-5.5, 1.2, .2], [4, 1.2, -1.6], 40] },
};

// ---------------- knock dust (living room)
const KP = [[-.6, 3.1, -4.1], [-1.3, 2.6, -4.1], [0, 3.6, -4.1], [-.8, 2.2, -4.1], [.5, 2.9, -4.1], [-5.3, 2.6, -1.4], [-5.3, 3.2, .4]];
function dust(knocks, t) {
  const p = S.living.p, dp = p.dust.geometry.attributes.position.array;
  for (let j = 0; j < p.dustN; j++) { const k = knocks[j % knocks.length]; const d = k ? t - k[0] : -1, live = d > 0 && d < 1.6, P = k ? KP[k[1]] : KP[0]; const a = hash(j * 1.7) * 6.28, r = (.1 + hash(j * 3.3) * .7) * Math.sqrt(Math.max(0, d)) * 1.4, side = P[0] < -5;
    dp[j * 3] = live ? P[0] + (side ? hash(j) * .5 * r : Math.cos(a) * r) : 0; dp[j * 3 + 1] = live ? P[1] + Math.sin(a) * r * .6 - d * d * .8 : -9; dp[j * 3 + 2] = live ? P[2] + (side ? Math.cos(a) * r : hash(j) * .5 * r) : 0; }
  p.dust.geometry.attributes.position.needsUpdate = true;
}
let SHAKE = [], FLASHES = [];

// ================= BEATS =================
// B(key, set, cams, act, opts): act(lt, d, t) places actors/props. opts: tag, title, exp (exposure), stamp
const BEATS = [];
const B = (key, set, cams, act, o = {}) => BEATS.push({ key, t0: key === 'lead' ? 0 : sT(key), set, cams, act, ...o });
const LIV = (lt, t, o = {}) => { const p = S.living.p; p.doorPivot.rotation.y = o.door ?? 0; p.hallL.intensity = 70 * (o.door ?? 0) / 1.2; p.lamp.intensity = 30 * (o.lampK ?? 1); p.shade.material.emissiveIntensity = 1.6 * (o.lampK ?? 1); p.tvL.intensity = o.tv ? 8 + Math.sin(t * 9) * 2 : 0; p.tvScr.material.emissiveIntensity = o.tv ? 1.4 + .3 * Math.sin(t * 11) : .1; };
const chairSlide = (lt, a, b) => { const sp = eio(seg(lt, a, b)), wob = lt > a - .9 && lt < a ? Math.sin(lt * 34) * .05 : 0, p = S.living.p.chair; p.position.set(lerp(.2, 1.9, sp), 0, lerp(1.0, -1.2, sp)); p.rotation.set(wob * .6, -.5 + .25 * sp, wob); return sp; };
const BED = (o = {}) => { const p = S.bedroom.p; p.chest.position.set(o.chestX ?? 4.2, 0, o.chestZ ?? -3.2); p.cupDoor.rotation.y = .5 + (o.cup ?? 0); p.items.forEach(it => { it.m.position.copy(it.base); it.m.rotation.copy(it.rot); }); p.nightL.intensity = 18 * (o.night ?? 1); p.nightLamp.material.emissiveIntensity = 2 * (o.night ?? 1); };
const flyItems = (lt, a, amp = 1) => { const p = S.bedroom.p; p.items.forEach((it, i) => { const k = seg(lt, a + i * .18, a + i * .18 + 1.4); if (k <= 0) return; const e = eo(k); it.m.position.set(it.base.x + (hash(i) - .5) * 1.6 * e * amp, it.base.y + Math.sin(k * Math.PI) * .9 * amp - (k > .7 ? (k - .7) * 6 : 0) * amp, it.base.z + e * 1.8 * amp); it.m.position.y = Math.max(.08, it.m.position.y); it.m.rotation.set(k * 6 * amp, k * 4 * amp, 0); }); };
const street0 = (t, o = {}) => { const p = S.street.p; p.car.position.set(o.carX ?? 3, 0, -2.6); p.car.rotation.y = 0; p.car.userData.siren = o.siren ?? 1; };

function buildBeats() {
  // ---- cold open (black room, one knock, four knocks)
  B('lead', 'living', [['wall'], ['wide']], (lt, d, t) => { LIV(lt, t, { lampK: .25 }); }, { exp: .55 });
  // ---- 1 · cold open narration
  B('v1000', 'street', ['crane', 'wide'], (lt, d, t) => { street0(t, { carX: lerp(26, 3, eo(seg(lt, 0, d))), siren: 1 }); }, { title: 'ЛОНДОН · 1977' });
  B('v1001', 'street', ['car', 'low'], (lt, d, t) => { street0(t, { carX: lerp(10, 3, eo(seg(lt, 0, 2.5))) }); walk('police', 2.5, -1.4, 1.2, -5.0, lt, 1.6, d, t); });
  B('v1002', 'street', ['door', 'wide'], (lt, d, t) => { street0(t); const m = place('mother', .9, -5.7, 0, { shLx: -.5, shRx: -.6, elL: -1.3, elR: -1.4, brow: .6, browTilt: .25, mouth: .25 + .2 * Math.abs(Math.sin(t * 9)), look: .3 }, t); place('police', 1.3, -4.4, Math.PI + .2, { nod: .1, look: -.1 }, t); });
  B('v1003', 'bedroom', ['bedA', 'bedB'], (lt, d, t) => { BED({ night: .6 }); place('girl11', -3.75, -1.4, .1, { y: .55, sit: 1, shLx: -1.0, shRx: -1.0, elL: -1.2, elR: -1.2, eyes: 1.3, brow: .7, browTilt: .3, mouth: .3 }, t); place('girl13', -3.35, -1.7, -.1, { y: .55, sit: 1, shRx: -1.4, shRz: .6, elR: -.4, eyes: 1.2, brow: .6, browTilt: .25, look: .4 }, t); });
  B('v1004', 'living', ['wall', 'wide'], (lt, d, t) => { LIV(lt, t); const k = [[.6, 0], [1.5, 1], [2.4, 2], [3.2, 4]].map(([o, i]) => [sT('v1004') + o, i]); dust(k, t); SHAKE.push(...k.map(q => q[0])); place('mother', -1.5, .8, 2.4, { look: -.6 + Math.sin(t * 2) * .4, brow: .6, browTilt: .3, shLx: -.4, elL: -1.4 }, t); place('police', -.2, 1.8, 3.2, { look: .5, nod: -.2 }, t); }, { tag: ['со слов семьи', 0] });
  B('v1005', 'living', ['wall', 'over', 'wide'], (lt, d, t) => { LIV(lt, t); const x = lerp(-3.4, -.6, seg(lt, 0, 2.2)); place('police', x, -3.2, Math.PI, { ...(lt < 2.2 ? walkP(t) : {}), shRx: lt > 2.2 ? -1.9 + Math.sin(t * 8) * .25 : 0, elR: -.4, look: Math.sin(t * 1.5) * .4, nod: -.25 }, t); place('neigh', 2.8, -2.6, Math.PI + .5, { nod: -.3, look: -.2, shLx: -1.2, elL: -.3 }, t); });
  B('v1006', 'living', ['wide', 'chair'], (lt, d, t) => { LIV(lt, t); place('police', -.8, -2.4, .3, { shLz: -.7, shRz: .7, elL: -.4, elR: -.4, brow: .4, cock: .15, smile: -.2 }, t); place('neigh', 2.4, -2.0, -.8, { shLz: -.6, shRz: .6, cock: -.12 }, t); });
  B('v1007', 'living', ['chair', 'chairLow'], (lt, d, t) => { LIV(lt, t); chairSlide(lt, d + .5, d + 3); place('police', -2.3, 1.2, 1.2, { look: .3, eyes: 1.3, brow: .5 }, t); });
  B('v1008', 'living', ['chair', 'high', 'chairLow'], (lt, d, t) => { LIV(lt, t); chairSlide(lt, .2, 2.6); SHAKE.push(sT('v1008') + 2.6); place('police', -2.3, 1.2, 1.0 + seg(lt, .2, 2.6) * .5, { look: .2 + seg(lt, .2, 2.6) * .4, eyes: 1.4, brow: .8, mouth: .4, shRx: lt > 2.6 ? -1.0 : 0, elR: -.2 }, t); }, { tag: ['по показанию полицейской', 1] });
  B('v1009', 'living', ['chairLow', 'wide'], (lt, d, t) => { LIV(lt, t); chairSlide(99, 0, 1); place('police', lerp(-2.3, 1.2, eio(seg(lt, 0, 1.6))), lerp(1.2, -.4, eio(seg(lt, 0, 1.6))), 2.6, { ...(lt < 1.6 ? walkP(t) : { lean: .5, shRx: -1.2, elR: -.4, nod: .4 }) }, t); }, { tag: ['по показанию полицейской', 1] });
  B('v1010', 'street', ['crane', 'window'], (lt, d, t) => { street0(t); }, { exp: .9 });
  B('v1011', 'street', ['crowd', 'wide'], (lt, d, t) => { street0(t); const ppl = ['reporter', 'photo', 'photo2', 'neigh', 'tvman']; ppl.forEach((n, i) => walk(n, -10 + i * 1.2, 2 + (i % 2), -2.6 + i * 1.3, -3.4 + (i % 2) * .6, lt, i * .5, 2.6 + i * .5, t, { p: {} })); });
  B('v1012', 'living', ['chair', 'wide'], (lt, d, t) => { LIV(lt, t, { lampK: .7 + .3 * Math.sin(t * 13) }); chairSlide(99, 0, 1); });
  B('v1013', 'bedroom', ['bedB', 'wide'], (lt, d, t) => { BED(); const j = Math.abs(Math.sin(t * 5)); place('girl11', 1.4, -1.8, 0, { y: .7 + j * .5, shLx: -2.6 + j, shRx: -2.6 + j, kneeL: .4 * j, kneeR: .4 * j, smile: 1, mouth: .5 }, t); place('girl13', 2.9, -.6, -.7, { smile: .8, shLx: -.6, elL: -1.8, mouth: .2 }, t); });
  B('v1014', 'living', ['over', 'wide'], (lt, d, t) => { LIV(lt, t); place('police', -2.6, 1.6, 2.4, { look: .7, nod: -.2, brow: .3 }, t); place('reporter', 2.2, 2.0, -2.2, { look: -.6, shRx: -.8, elR: -1.0 }, t); place('grosse', -.4, -2.6, .3, { look: Math.sin(t * 2) * .7, shRx: -1.2, elR: -.6 }, t); }, { tag: ['трактовка', 2] });
  B('v1015', 'living', ['wall', 'chair'], (lt, d, t) => { LIV(lt, t, { lampK: .4 + .3 * Math.sin(t * 23) * Math.sin(t * 7) }); chairSlide(99, 0, 1); }, { exp: .75 });
  B('v1016', 'street', ['crane', 'window'], (lt, d, t) => { street0(t, { siren: 0 }); }, { title: 'ЭНФИЛДСКИЙ ПОЛТЕРГЕЙСТ', exp: .85 });
  B('v1017', 'evidence', ['wide', 'low'], (lt, d, t) => { S.evidence.p.light(t, [seg(lt, 0, .5), seg(lt, 1.5, 2), seg(lt, 3, 3.5), 0, 0]); }, { title2: ['ФАКТЫ', 'СОМНЕНИЯ', 'ВЫВОД'] });
  // ---- 2 · an ordinary house
  B('v1019', 'street', ['wide', 'door', 'window'], (lt, d, t) => { street0(t, { carX: 40 }); }, { title: 'ГРИН-СТРИТ, ЭНФИЛД · АВГУСТ 1977' });
  B('v1020', 'living', ['wide', 'sofa'], (lt, d, t) => { LIV(lt, t, { tv: 1 }); place('mother', -1.6, -2.4, .1, { smile: .4, shLz: -.5, shRz: .5 }, t); place('girl13', -2.7, -2.0, .3, { smile: .3 }, t); place('girl11', -.5, -2.0, -.2, { smile: .6 }, t); place('boy1', .5, -1.6, -.4, { smile: .5, shRx: -1.0 }, t); place('boy2', 1.3, -1.2, -.6, { smile: .7, shLx: -2.3 }, t); });
  B('v1021', 'bedroom', ['wide', 'bedA', 'bedB'], (lt, d, t) => { BED(); place('girl11', -1.6, .2, .4, { smile: .7, shRx: -2.6, elR: -.2, look: Math.sin(t) * .2 }, t); place('girl13', -.4, .0, -.2, { smile: .4, tilt: .06 }, t); });
  B('v1022', 'living', ['tv', 'sofa', 'wide'], (lt, d, t) => { LIV(lt, t, { tv: 1 }); place('mother', -1.6, -2.7, .1, { sit: 1, y: .1, smile: .3 }, t); place('girl11', -.8, -2.7, .1, { sit: 1, y: .1, smile: .5 }, t); place('girl13', -2.4, -2.7, .2, { sit: 1, y: .1 }, t); place('boy1', .4, -1.4, -.5, { sit: 1, y: -.2 }, t); }, { tag: ['со слов семьи', 0] });
  B('v1023', 'bedroom', ['bedA', 'bedB', 'shelf'], (lt, d, t) => { BED({ night: .5 }); place('girl11', -3.75, -1.4, .1, { y: .55, sit: 1, eyes: 1.3, brow: .7, browTilt: .3, look: Math.sin(t * 2) * .6 }, t); place('girl13', 1.4, -1.6, -.1, { y: .55, sit: 1, eyes: 1.2, brow: .5, look: .9 }, t); }, { tag: ['со слов семьи', 0] });
  B('v1024', 'bedroom', ['chest', 'wide'], (lt, d, t) => { const k = eio(seg(lt, .6, 2.4)); BED({ chestX: 4.2 - 1.2 * k, chestZ: -3.2 + 1.0 * k, night: .5 }); if (lt > .6 && lt < 2.4) SHAKE.push(t); place('girl11', -3.75, -1.4, .9, { y: .55, sit: 1, eyes: 1.4, brow: .9, browTilt: .3, mouth: .6 }, t); }, { tag: ['со слов семьи', 0] });
  B('v1025', 'living', ['stairs'], (lt, d, t) => { LIV(lt, t); const k = seg(lt, 0, d); place('mother', 4.6 - k * .4, 1.6 - k * 3.6, Math.PI, { y: k * 3.4, ...walkP(t, 6.5, .8), brow: .4 }, t); });
  B('v1026', 'bedroom', ['wide', 'cup'], (lt, d, t) => { BED({ night: .5, cup: Math.abs(Math.sin(t * 3)) * .9 }); place('mother', 2.5, 2.2, Math.PI + .3, { eyes: 1.3, brow: .7, browTilt: .3, shLx: -.6, elL: -1.4, mouth: .4 }, t); }, { tag: ['со слов семьи', 0] });
  B('v1027', 'bedroom', ['shelf', 'high', 'cup'], (lt, d, t) => { BED({ night: .5, cup: Math.abs(Math.sin(t * 4)) * 1.1 }); flyItems(lt, .4); place('girl11', -3.75, -1.4, .4, { y: .55, sit: 1, eyes: 1.4, brow: .9, browTilt: .3, mouth: .5, shLx: -1.4, shRx: -1.4, elL: -1, elR: -1 }, t); }, { tag: ['со слов семьи', 0] });
  B('v1028', 'evidence', ['wide'], (lt, d, t) => { S.evidence.p.light(t, [.4, .4, .4, .4, .4]); }, { exp: .8, freeze: 1 });
  B('v1029', 'evidence', ['e1', 'e3'], (lt, d, t) => { S.evidence.p.light(t, [1, 0, 1, 0, 0]); }, { tag: ['со слов семьи', 0] });
  B('v1030', 'evidence', ['e2', 'wide'], (lt, d, t) => { S.evidence.p.light(t, [0, .5, 0, 0, 0]); }, { stamp: 'НЕ ЗАФИКСИРОВАНО' });
  B('v1031', 'street', ['car', 'low'], (lt, d, t) => { street0(t, { carX: lerp(24, 3, eo(seg(lt, 0, d))) }); }, { title: '1 СЕНТЯБРЯ 1977' });
  B('v1032', 'living', ['door', 'wall', 'over'], (lt, d, t) => { LIV(lt, t, { door: 1.2 * eio(seg(lt, 0, 1.2)) }); const k = ['четыре', 'отчет', 'удар', 'стен'].map((f, i) => [wordT('v1032', f) + .1, i]); dust(k, t); SHAKE.push(...k.map(q => q[0])); walk('police', -6.4, .2, -2.4, .8, lt, .4, 3.0, t, { p: lt > 3 ? { look: .8, nod: -.1, brow: .5 } : {} }); }, { tag: ['по показанию полицейской', 1] });
  B('v1033', 'living', ['wide', 'wall'], (lt, d, t) => { LIV(lt, t, { door: 1.2 }); const k = [[.5, 5], [1.2, 6], [1.9, 5]].map(([o, i]) => [sT('v1033') + o, i]); dust(k, t); SHAKE.push(...k.map(q => q[0])); place('police', -2.4, .8, -1.6 + seg(lt, 0, 1.5) * -.6, { look: -.6, eyes: 1.3, brow: .6 }, t); }, { tag: ['по показанию полицейской', 1] });
  B('v1034', 'living', ['over', 'wide', 'stairs'], (lt, d, t) => { LIV(lt, t, { door: 1.2 }); place('police', -.6, -3.3, Math.PI, { shRx: -1.9 + Math.sin(t * 8) * .25, elR: -.3, look: Math.sin(t * 1.5) * .5, nod: -.3 }, t); place('neigh', 3.0, -2.8, Math.PI + .4, { shLx: -2.2 + Math.sin(t * 6) * .3, nod: -.5 }, t); place('mother', -3.6, 1.4, 1.6, { brow: .6, browTilt: .3, shLx: -.6, shRx: -.6, elL: -1.4, elR: -1.4 }, t); });
  B('v1035', 'living', ['wide'], (lt, d, t) => { LIV(lt, t, { door: 1.2 }); place('police', -.6, -2.6, .2, { shLz: -.7, shRz: .7, brow: .4, cock: .15 }, t); place('neigh', 2.6, -2.0, -.6, { shLz: -.6, shRz: .6, cock: -.12 }, t); });
  B('v1036', 'living', ['chair', 'over'], (lt, d, t) => { LIV(lt, t, { door: 1.2 }); const wob = Math.sin(t * 30) * .06 * seg(lt, 1.5, 3); const c = S.living.p.chair; c.position.set(.2, 0, 1.0); c.rotation.set(wob * .6, -.5, wob); place('police', -2.3, 1.2, 1.1, { look: .3, eyes: 1.2 + seg(lt, 2, 4) * .3, brow: .4 + seg(lt, 2, 4) * .4 }, t); }, { tag: ['по показанию полицейской', 1] });
  B('v1037', 'living', ['chair', 'high', 'wide'], (lt, d, t) => { LIV(lt, t, { door: 1.2 }); chairSlide(lt, .6, 3.2); SHAKE.push(sT('v1037') + 3.2); place('police', -2.3, 1.2, 1.0 + seg(lt, .6, 3.2) * .6, { look: .3 + seg(lt, .6, 3.2) * .4, eyes: 1.4, brow: .9, mouth: .45 }, t); }, { tag: ['по показанию полицейской', 1] });
  B('v1038', 'living', ['chairLow'], (lt, d, t) => { LIV(lt, t, { door: 1.2 }); chairSlide(99, 0, 1); }, { tag: ['по показанию полицейской', 1] });
  B('v1039', 'living', ['chairLow', 'wide'], (lt, d, t) => { LIV(lt, t, { door: 1.2 }); chairSlide(99, 0, 1); place('police', 1.6, .6, 2.9, { lean: .55, nod: .4, shRx: -1.3, elR: -.3, brow: .3 }, t); }, { tag: ['по показанию полицейской', 1] });
  B('v1040', 'evidence', ['e2', 'wide'], (lt, d, t) => { S.evidence.p.light(t, [0, 1, 0, 0, 0]); }, { tag: ['показание ≠ запись', 2] });
  B('v1041', 'evidence', ['e2', 'low'], (lt, d, t) => { S.evidence.p.light(t, [0, 1, 0, 0, 0]); }, { stamp: 'НЕ ВИДЕОЗАПИСЬ' });
  B('v1042', 'press', ['roll', 'hero', 'wide'], (lt, d, t) => { const p = S.press.p, k = eo(seg(lt, .5, 3)); p.hero.position.set(0, lerp(1.2, 1.7, k), lerp(-2, -.9, k)); p.hero.rotation.set(lerp(-1.3, -.05, k), lerp(.6, 0, k), lerp(.4, .02, k)); }, { tag: ['реконструкция', 2] });
  // ---- 3 · the researchers
  B('v1043', 'street', ['door', 'wide'], (lt, d, t) => { street0(t, { carX: 40 }); walk('grosse', -4, -1, .3, -5.2, lt, 0, 3.4, t, { p: { shLx: .1, elL: -.1 } }); walk('playfair', -5, -.2, 1.6, -5.0, lt, .4, 4.0, t); });
  B('v1044', 'lab', ['tri', 'wide'], (lt, d, t) => { place('grosse', 2.6, .6, -2.2, { shRx: -1.4, elR: -.8, look: -.3, brow: .2 }, t); }, { tag: ['со слов исследователей', 3] });
  B('v1045', 'lab', ['writer', 'wide'], (lt, d, t) => { const ty = Math.abs(Math.sin(t * 14)); place('playfair', 1.7, -.6, Math.PI - .3, { sit: 1, y: -.05, shLx: -1.3, shRx: -1.3, elL: -.4 - ty * .2, elR: -.4 - (1 - ty) * .2, nod: .25 }, t); });
  B('v1046', 'lab', ['wide', 'reels'], (lt, d, t) => { const a = Math.sin(t * 2.4); place('grosse', -.6, .1, .5, { shRx: -1.2 + a * .3, elR: -.6, mouth: .3 * Math.abs(a), brow: .4 }, t); place('playfair', 1.2, .3, -.6, { shLx: -.9, elL: -1.3, brow: -.2, browTilt: -.2, cock: .1 }, t); });
  B('v1047', 'bedroom', ['shelf', 'wide'], (lt, d, t) => { BED(); flyItems(lt, .8, .8); place('grosse', 2.4, 1.6, Math.PI + .5, { eyes: 1.3, brow: .6, look: -.3 }, t); }, { tag: ['со слов исследователей', 3] });
  B('v1048', 'bedroom', ['cup', 'high', 'shelf'], (lt, d, t) => { BED({ cup: Math.abs(Math.sin(t * 3.4)) * 1.1 }); flyItems(lt, .2, 1.1); }, { tag: ['со слов исследователей', 3] });
  B('v1049', 'bedroom', ['door', 'wide'], (lt, d, t) => { BED(); place('reporter', 1.6, 1.0, Math.PI + .3, { shLx: -.9, elL: -1.2, shRx: -.9, elR: -1.5, eyes: 1.2 }, t); place('photo', 2.6, .6, Math.PI + .5, { shRx: -1.0, elR: -1.7, shLx: -1.0, elL: -1.7 }, t); FLASHES.push(sT('v1049') + 1.4, sT('v1049') + 3.5); });
  B('v1050', 'evidence', ['wide'], (lt, d, t) => { S.evidence.p.light(t, [1, 1, 1, 0, 0]); });
  B('v1052', 'living', ['wide', 'over', 'door'], (lt, d, t) => { LIV(lt, t, { door: 1.2 }); const ppl = ['reporter', 'photo', 'neigh', 'grosse', 'playfair', 'mother', 'police']; ppl.forEach((n, i) => { const a = t * .6 + i * .9; place(n, Math.cos(a) * (1.6 + i * .2) - .4, Math.sin(a) * 1.4 - .6, a + Math.PI / 2, { ...walkP(t + i, 7), look: Math.sin(t + i) * .5 }, t); }); FLASHES.push(sT('v1052') + 2.0, sT('v1052') + 5.5); }, { tag: ['трактовка', 2] });
  B('v1055', 'lab', ['wide', 'props'], (lt, d, t) => { place('reporter', -.2, .3, .6, { shRx: -1.6 + Math.sin(t * 3) * .2, elR: -.3, smile: .5, look: -.3 }, t); place('grosse', -1.9, .5, .9, { shLx: -.4, shRx: -.4, elL: -1.3, elR: -1.3, brow: -.2, cock: .12 }, t); }, { tag: ['со слов журналиста', 3] });
  B('v1057', 'commission', ['scale', 'wide'], (lt, d, t) => { S.commission.p.beam.rotation.z = Math.sin(t * 1.3) * .22; });
  // ---- 4 · what was reported
  B('v1059', 'bedroom', ['cup', 'shelf', 'high'], (lt, d, t) => { BED({ cup: Math.abs(Math.sin(t * 4.5)) * 1.1 }); flyItems(lt, 2.6, 1); }, { tag: ['со слов семьи и исследователей', 0] });
  B('v1062', 'lab', ['props', 'writer'], (lt, d, t) => { place('grosse', -.3, -.55, Math.PI, { sit: 1, y: -.05, lean: .3, shRx: -1.0, elR: -.6 + Math.sin(t * 9) * .1, nod: .35 }, t); });
  B('v1063', 'lab', ['tapes', 'reels'], (lt, d, t) => { const n = Math.floor(lerp(4, 48, seg(lt, 0, 9))); S.lab.p.tapes.forEach((b, i) => b.visible = i < n); }, { big: ['180', 'ЧАСОВ ЗАПИСЕЙ', 'v1064'] });
  B('v1065', 'lab', ['reels', 'mic', 'wide'], (lt, d, t) => { S.lab.p.tally.material.emissiveIntensity = (Math.floor(t * 2) % 2) * 3; }, { tag: ['трактовка', 2] });
  B('v1069', 'bedroom', ['bedB', 'door'], (lt, d, t) => { BED(); const j = clamp(Math.sin(seg(lt, .8, 1.9) * Math.PI)); place('girl11', 1.4, -1.8, 0, { y: .7 + j * 1.0, shLx: -2.4, shRx: -2.4, elL: -.3, elR: -.3, kneeL: .9 * j, kneeR: .9 * j, eyes: 1.2 }, t); place('photo', 3.4, 1.6, -2.4, { shRx: -1.0, elR: -1.7, shLx: -1.0, elL: -1.7 }, t); FLASHES.push(sT('v1069') + 1.35); }, { tag: ['спорная интерпретация снимка', 2] });
  B('v1070', 'bedroom', ['bedB', 'high'], (lt, d, t) => { BED(); const ph = (lt % 2.4) / 2.4, j = Math.sin(clamp(ph * 1.6) * Math.PI); place('girl11', 1.4, -1.8, 0, { y: .7 + j * 1.0, shLx: -2.4, shRx: -2.4, kneeL: .9 * j, kneeR: .9 * j, smile: .6 }, t); }, { tag: ['версия скептиков: прыжок', 2] });
  B('v1071', 'bedroom', ['chest', 'wide'], (lt, d, t) => { BED(); const push = Math.sin(t * 6) * .1; place('grosse', 3.3, -2.4, -2.2, { lean: .5, shLx: -1.5, shRx: -1.5, elL: -.2, elR: -.2, kneeL: .4, kneeR: .2, brow: .7, mouth: .3 + push }, t); place('playfair', 4.0, -2.0, -2.6, { lean: .5, shLx: -1.4, shRx: -1.4, elL: -.3, elR: -.3, brow: .6 }, t); }, { tag: ['со слов участников', 3] });
  B('v1073', 'living', ['over', 'wide'], (lt, d, t) => { LIV(lt, t); chairSlide(99, 0, 1); place('police', -2.3, 1.2, 1.6, { look: .4, brow: .3 }, t); place('neigh', -.6, 2.4, 2.6, { look: -.4, cock: .2 }, t); }, { tag: ['трактовка', 2] });
  B('v1074', 'street', ['crowd', 'crane'], (lt, d, t) => { street0(t, { carX: 6 }); ['reporter', 'photo', 'photo2', 'tvman', 'neigh'].forEach((n, i) => place(n, -2.6 + i * 1.3, -3.0 + (i % 2) * .7, Math.PI + (i - 2) * .15, { shRx: -1.0, elR: -1.7, shLx: -1.0, elL: -1.7, look: Math.sin(t + i) * .2 }, t)); FLASHES.push(sT('v1074') + 1, sT('v1074') + 2.7, sT('v1074') + 4.6, sT('v1074') + 6.2); });
  // ---- 5 · the voice
  B('v1075', 'bedroom', ['bedA', 'wide'], (lt, d, t) => { BED({ night: .15 }); place('girl11', -3.6, -1.3, .1, { y: .55, sit: 1, eyes: .9, look: -.3 }, t); }, { title: 'ДЕКАБРЬ 1977', exp: .6 });
  B('v1076', 'lab', ['mic', 'reels'], (lt, d, t) => { S.lab.p.tally.material.emissiveIntensity = 3; place('grosse', .9, .2, Math.PI - .5, { sit: 1, y: -.05, shLx: -2.6, shRx: -2.6, elL: -2.4, elR: -2.4, eyes: 1.3, brow: .6 }, t); }, { tag: ['со слов исследователей', 3], exp: .7 });
  B('v1077', 'living', ['sofa', 'wide'], (lt, d, t) => { LIV(lt, t, { lampK: .2 }); chairSlide(99, 0, 1); const c = S.living.p.chair; c.position.set(-1.6, 0, -1.8); c.rotation.set(0, .3, 0); }, { tag: ['со слов «голоса» · не проверено', 2], exp: .55 });
  B('v1078', 'evidence', ['e3', 'e4'], (lt, d, t) => { S.evidence.p.light(t, [0, 0, 1, 1, 0]); }, { title2: ['СКАЗАНО НА СЕАНСЕ', 'ПОДТВЕРЖДЕНО'] });
  B('v1079', 'evidence', ['e3', 'wide'], (lt, d, t) => { S.evidence.p.light(t, [0, 0, 1, 0, 0]); }, { tag: ['со слов участников', 3] });
  B('v1082', 'lab', ['props', 'mic', 'wide'], (lt, d, t) => { S.lab.p.tally.material.emissiveIntensity = 3; place('grosse', -2.2, .6, .9, { shRx: -1.2, elR: -.6, look: .3 }, t); place('playfair', 1.4, .5, -.7, { shLx: -.6, elL: -1.6, smile: .2 }, t); }, { tag: ['со слов исследователей', 3] });
  B('v1085', 'lecture', ['board', 'speaker'], (lt, d, t) => { S.lecture.p.board.material.map = S.lecture.p.throatTex; place('french', -2.2, -1.0, .6, { shRx: -1.4 + Math.sin(t * 2) * .2, elR: -.3, mouth: .2 }, t); });
  B('v1087', 'lecture', ['dummy', 'wide'], (lt, d, t) => { S.lecture.p.board.material.map = S.lecture.p.throatTex; S.lecture.p.dummyJaw.position.y = 1.05 - Math.abs(Math.sin(t * 9)) * .05; place('ventro', 1.0, -1.2, .4, { shRx: -1.3, elR: -.8, smile: .7, brow: .4 }, t); });
  B('v1088', 'commission', ['left', 'right', 'wide'], (lt, d, t) => { S.commission.p.beam.rotation.z = Math.sin(t * 2) * .18; ['judge', 'judge2', 'judge3'].forEach((n, i) => place(n, -1.8 + i * 1.8, -2.9, 0, { sit: 1, y: .3, shRx: -1.2 + Math.sin(t * 3 + i * 2) * .5, elR: -.6, mouth: .3 * Math.abs(Math.sin(t * 7 + i)), brow: .3 * Math.sin(t * 2 + i), look: (i - 1) * -.5 }, t)); });
  B('v1091', 'lab', ['reels', 'mic'], (lt, d, t) => { S.lab.p.tally.material.emissiveIntensity = 3; }, { exp: .7 });
  // ---- 6 · two camps
  B('v1094', 'commission', ['wide', 'low', 'scale'], (lt, d, t) => { S.commission.p.beam.rotation.z = Math.sin(t * .8) * .1; ['judge', 'judge2', 'judge3'].forEach((n, i) => place(n, -1.8 + i * 1.8, -2.9, 0, { sit: 1, y: .3, nod: .25, shLx: -1.1, shRx: -1.1, elL: -.5, elR: -.5, look: Math.sin(t * .7 + i) * .3 }, t)); }, { title: 'КОМИССИЯ ОБЩЕСТВА ПСИХИЧЕСКИХ ИССЛЕДОВАНИЙ' });
  B('v1097', 'commission', ['scale', 'wide'], (lt, d, t) => { S.commission.p.beam.rotation.z = 0; }, { stamp: 'НЕ ДОКАЗАНО' });
  B('v1098', 'commission', ['left', 'right'], (lt, d, t) => { ['judge', 'judge2', 'judge3'].forEach((n, i) => place(n, -1.8 + i * 1.8, -2.9, 0, { sit: 1, y: .3, nod: .1, look: (i - 1) * -.4 }, t)); }, { tag: ['вывод комиссии', 2] });
  B('v1100', 'bedroom', ['wide', 'shelf'], (lt, d, t) => { BED(); place('girl11', -.4, -3.0, .4, { shRx: -2.4, elR: -.6, smile: 1, mouth: .4, look: .3 }, t); place('girl13', -1.4, -2.6, .6, { smile: .9, shLx: -.6, elL: -1.8 }, t); const it = S.bedroom.p.items[0]; it.m.position.y = it.base.y + Math.abs(Math.sin(t * 4)) * .25; }, { tag: ['признание детей', 1] });
  B('v1103', 'lecture', ['board', 'speaker'], (lt, d, t) => { S.lecture.p.board.material.map = S.lecture.p.boardTex; place('french', -2.2, -1.0, .6, { shRx: -1.4 + Math.sin(t * 2) * .2, elR: -.3, mouth: .2 * Math.abs(Math.sin(t * 6)), brow: -.1 }, t); }, { tag: ['трактовка скептиков', 2] });
  B('v1106', 'commission', ['scale', 'low'], (lt, d, t) => { S.commission.p.beam.rotation.z = Math.sin(t * 1.7) * .25; });
  B('v1110', 'evidence', ['e5', 'wide'], (lt, d, t) => { S.evidence.p.light(t, [0, 0, 0, 0, 1]); });
  // ---- 7 · the press and the films
  B('v1113', 'street', ['crowd', 'wide', 'door'], (lt, d, t) => { street0(t, { carX: 8 }); ['reporter', 'photo', 'photo2', 'tvman', 'neigh', 'medium', 'ventro'].forEach((n, i) => walk(n, -12 + i * .9, 2 + (i % 3), -3.4 + i * 1.1, -3.4 + (i % 2) * .8, lt, i * .4, 3 + i * .4, t, { p: lt > 3 + i * .4 ? { shRx: -1.0, elR: -1.7, shLx: -1.0, elL: -1.7 } : {} })); FLASHES.push(...[2.5, 4, 5.2, 7.1, 9.4, 11, 13.5, 16].map(o => sT('v1113') + o)); });
  B('v1118', 'living', ['sofa', 'wide'], (lt, d, t) => { LIV(lt, t, { lampK: .6 }); ['mother', 'girl13', 'girl11', 'boy1'].forEach((n, i) => place(n, -2.4 + i * .8, -2.7, .1, { sit: 1, y: .1, eyes: 1.2, brow: .6, browTilt: .3, look: Math.sin(t * 1.3 + i) * .4 }, t)); FLASHES.push(...[1.5, 3.2, 6, 8.4, 12, 15.5, 19].map(o => sT('v1118') + o)); });
  B('v2000', 'cinema', ['screen', 'aud', 'proj'], (lt, d, t) => {}, { tag: ['кино ≠ доказательство', 2] });
  // ---- 8 · what can be said
  B('v2005', 'evidence', ['wide', 'low'], (lt, d, t) => { S.evidence.p.light(t, [.5, .5, .5, .5, .5]); });
  B('v2006', 'evidence', ['e1'], (lt, d, t) => { S.evidence.p.light(t, [1, 0, 0, 0, 0]); }, { big: ['1', 'СЕМЬЯ СООБЩАЛА', 'v2006'] });
  B('v2009', 'evidence', ['e2'], (lt, d, t) => { S.evidence.p.light(t, [0, 1, 0, 0, 0]); }, { big: ['2', 'ПОКАЗАНИЕ, НЕ ЗАПИСЬ', 'v2009'] });
  B('v2012', 'evidence', ['e3'], (lt, d, t) => { S.evidence.p.light(t, [0, 0, 1, 0, 0]); }, { big: ['3', 'ИССЛЕДОВАТЕЛИ РАЗОШЛИСЬ', 'v2012'] });
  B('v2015', 'evidence', ['e4'], (lt, d, t) => { S.evidence.p.light(t, [0, 0, 0, 1, 0]); }, { big: ['4', 'ЧАСТЬ — РОЗЫГРЫШ', 'v2015'] });
  B('v2018', 'evidence', ['e5'], (lt, d, t) => { S.evidence.p.light(t, [0, 0, 0, 0, 1]); }, { big: ['5', 'ДУХ НЕ ДОКАЗАН', 'v2018'] });
  B('v2020', 'evidence', ['wide', 'low'], (lt, d, t) => { S.evidence.p.light(t, [1, 1, 1, 1, 1]); });
  // ---- 9 · finale
  B('v2023', 'street', ['crane', 'window'], (lt, d, t) => { street0(t, { carX: 40 }); }, { exp: .85 });
  B('v2024', 'lab', ['tapes', 'reels'], (lt, d, t) => { S.lab.p.tapes.forEach(b => b.visible = true); });
  B('v2026', 'living', ['wide', 'chair'], (lt, d, t) => { LIV(lt, t, { lampK: .7 }); chairSlide(99, 0, 1); });
  B('v2028', 'bedroom', ['wide', 'high'], (lt, d, t) => { BED({ night: .4 }); });
  B('v2031', 'living', ['wall', 'chair'], (lt, d, t) => { LIV(lt, t, { lampK: .5 + .3 * Math.sin(t * 19) * Math.sin(t * 5) }); chairSlide(99, 0, 1); }, { exp: .7 });
  B('v2032', 'living', ['door'], (lt, d, t) => { LIV(lt, t, { door: 1.2 * (1 - eio(seg(lt, 2, d))), lampK: .5 }); chairSlide(99, 0, 1); }, { exp: .65 });
  B('v2033', 'living', ['chair', 'wall'], (lt, d, t) => { LIV(lt, t, { lampK: .35 }); chairSlide(99, 0, 1); }, { exp: .6 });
  B('v2035', 'street', ['wide', 'window'], (lt, d, t) => { street0(t, { carX: 40 }); }, { cta: 1 });
  BEATS.sort((a, b) => a.t0 - b.t0);
  for (let i = 0; i < BEATS.length; i++) BEATS[i].t1 = i + 1 < BEATS.length ? BEATS[i + 1].t0 : DUR;
  // cut each beat into shots
  const MOVES = ['push', 'truck', 'orbit', 'rise', 'pull', 'orbit2'];
  let n = 0;
  for (const b of BEATS) {
    const d = b.t1 - b.t0, k = Math.max(1, Math.round(d / 2.8)); b.shots = [];
    for (let i = 0; i < k; i++) { const camName = b.cams[i % b.cams.length], cam = Array.isArray(camName) ? C[b.set][camName[0]] : C[b.set][camName];
      b.shots.push({ t0: b.t0 + d * i / k, t1: b.t0 + d * (i + 1) / k, cam, move: MOVES[(n++) % MOVES.length], roll: (n % 2 ? 1 : -1) * (.05 + hash(n) * .1) }); }
  }
}

// ---------------- camera move for a shot
const tmp = new THREE.Vector3();
function camFor(sh, t) {
  const u = eio((t - sh.t0) / (sh.t1 - sh.t0)), [P, L, fov] = sh.cam, p = new THREE.Vector3(...P), l = new THREE.Vector3(...L);
  const dir = l.clone().sub(p), right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0)).normalize();
  const m = sh.move;
  if (m === 'push') p.addScaledVector(dir, lerp(0, .18, u));
  if (m === 'pull') p.addScaledVector(dir, lerp(.16, 0, u));
  if (m === 'truck') p.addScaledVector(right, lerp(-.5, .5, u));
  if (m === 'rise') p.y += lerp(-.35, .35, u);
  if (m === 'orbit' || m === 'orbit2') { const a = (m === 'orbit' ? 1 : -1) * lerp(-.12, .12, u); const v = p.clone().sub(l); v.applyAxisAngle(new THREE.Vector3(0, 1, 0), a); p.copy(l).add(v); }
  return { p, l, fov, roll: sh.roll };
}

// ---------------- captions, tags, titles
const SENT = (() => { const out = []; let cur = []; WORDS.forEach((w, i) => { cur.push(i); if (/[.!?…]$/.test(w[0]) || cur.length > 22) { out.push(cur); cur = []; } }); if (cur.length) out.push(cur); return out; })();
const sentOf = new Map(); SENT.forEach((s, k) => s.forEach(i => sentOf.set(i, k)));
let lastW = -1;
function captions(t, beat) {
  let wi = -1; for (let i = Math.max(0, lastW - 3); i < WORDS.length; i++) { if (WORDS[i][1] > t) break; if (t < WORDS[i][2] + .25) wi = i; } if (wi < 0) { for (let i = 0; i < WORDS.length; i++) if (WORDS[i][1] <= t && t < WORDS[i][2] + .25) wi = i; }
  if (wi >= 0) { lastW = wi; const w = WORDS[wi][0].replace(/[«»"“”.,!?:;…()]/g, '').toUpperCase(); if (BIG.dataset.w !== String(wi)) { BIG.dataset.w = String(wi); BIG.textContent = w; if (VERT) BIG.style.fontSize = Math.round(Math.min(118, 980 / Math.max(4, w.length * .8))) + 'px'; } const age = t - WORDS[wi][1]; BIG.style.transform = `scale(${1 + .16 * Math.max(0, 1 - age * 7)})`; BIG.style.opacity = 1;
    const s = SENT[sentOf.get(wi)]; let a = s[0], b = s[s.length - 1]; if (b - a > 13) { a = Math.max(s[0], wi - 6); b = Math.min(s[s.length - 1], a + 12); }
    LINE.textContent = WORDS.slice(a, b + 1).map(x => x[0]).join(' '); }
  else { BIG.style.opacity = 0; LINE.textContent = ''; }
  if (beat.big && t >= sT(beat.big[2]) - .1) { BIG.style.opacity = 0; }
}
const TAGCOL = ['#e8a040', '#d83a2a', '#8ab0ff', '#7ad08a'];

export async function setup() {
  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H); renderer.setPixelRatio(1); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
  document.getElementById('stage').appendChild(renderer.domElement);
  scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x0a0c1a, .035); scene.background = new THREE.Color(0x05060c);
  camera = new THREE.PerspectiveCamera(40, W / H, .05, 120);
  FILL = new THREE.PointLight(0xffe6cc, 9, 14, 1.4); scene.add(FILL);   // soft key from the camera so faces read
  post = makePost(renderer, scene, camera, W, H, { ssaa: 1, ao: true, aoAmt: .6 });
  post.bloom.strength = .2; post.bloom.radius = .5; post.bloom.threshold = 1.1;
  VU = post.vig.material ? post.vig.material.uniforms : post.vig.uniforms; VU.amt.value = .55; VU.sat.value = 1.18; VU.contrast.value = .1;
  for (const [k, f] of Object.entries({ street, living, bedroom, lab, press, commission, lecture, cinema, evidence })) { S[k] = f(); S[k].g.visible = false; scene.add(S[k].g); }
  for (const [n, spec] of Object.entries(CASTALL)) { const c = makeChar(spec); c.root.visible = false; c.root.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(c.root); A[n] = c; }
  BIG = document.getElementById('big'); LINE = document.getElementById('line'); FADE = document.getElementById('fade');
  const mk = css => { const d = document.createElement('div'); d.style.cssText = css; document.body.appendChild(d); return d; };
  TAG = mk('position:fixed;left:54px;top:128px;font:italic 600 30px Georgia,serif;color:#f4ecd8;background:rgba(8,8,14,.62);padding:8px 18px;border-left:6px solid #e8a040;opacity:0');
  TITLE = mk('position:fixed;left:0;right:0;top:300px;text-align:center;font:900 92px Georgia,serif;color:#f6e6c0;text-shadow:0 6px 0 #000,0 0 18px #000;letter-spacing:4px;opacity:0;transform:skewX(-8deg)');
  STAMP = mk('position:fixed;left:50%;top:330px;transform:translate(-50%,0) rotate(-8deg);font:900 84px "Arial Black",Arial;color:#d8362b;border:10px solid #d8362b;padding:6px 30px;border-radius:16px;opacity:0;text-shadow:none');
  FLASH = mk('position:fixed;inset:0;background:#fff;opacity:0;pointer-events:none');
  buildBeats();
  if (VERT) {
    BIG.style.top = '1260px'; TAG.style.top = '330px'; TAG.style.left = '40px'; TITLE.style.top = '560px'; TITLE.style.padding = '0 40px'; STAMP.style.top = '760px';
    const hd = mk('position:fixed;top:200px;left:0;right:0;text-align:center;font:italic 700 54px Georgia,serif;color:#f6e6c0;text-shadow:0 3px 10px #000,0 0 3px #000'); hd.textContent = 'Энфилдский полтергейст';
    OUTRO = mk('position:fixed;top:760px;left:0;right:0;text-align:center;font:900 86px "Arial Black",Arial;color:#fff;-webkit-text-stroke:8px #000;paint-order:stroke fill;opacity:0'); OUTRO.innerHTML = 'Вся история —<br>на канале';
  }
  window.DUR = DUR; window.BEATS = BEATS.map(b => [b.key, +b.t0.toFixed(2), b.set, b.shots.length]);
  return frame;
}

let curBeat = 0;
function frame(t) {
  let bi = BEATS.length - 1; while (bi > 0 && BEATS[bi].t0 > t) bi--; const b = BEATS[bi], lt = t - b.t0, d = b.t1 - b.t0;
  for (const k in S) S[k].g.visible = k === b.set;
  for (const n in A) A[n].root.visible = false; used.clear();
  SHAKE = []; FLASHES = [];
  // defaults for props that beats may move
  if (b.set === 'living') { const c = S.living.p.chair; c.position.set(.2, 0, 1.0); c.rotation.set(0, -.5, 0); }
  if (b.set === 'commission') S.commission.p.beam.rotation.z = 0;
  if (b.set === 'lecture') S.lecture.p.board.material.map = S.lecture.p.boardTex;
  if (b.set === 'press') { S.press.p.hero.position.set(0, 1.2, -2); S.press.p.hero.rotation.set(-1.3, .6, .4); }
  if (b.set === 'lab') { S.lab.p.tapes.forEach(x => x.visible = true); S.lab.p.tally.material.emissiveIntensity = 0; }
  if (b.set === 'evidence') S.evidence.p.light(t);
  if (b.set === 'living') dust([], t);
  b.act(lt, d, t);
  S[b.set].p.light && b.set !== 'evidence' && S[b.set].p.light(t);
  // cold-open knocks in the dark room (one, pause, four)
  if (b.key === 'lead') { const k = [[1.0, 2], [2.6, 0], [2.95, 1], [3.3, 4], [3.65, 3]]; dust(k, t); SHAKE.push(...k.map(q => q[0])); }
  // camera
  const sh = b.shots.find(s => t >= s.t0 && t < s.t1) || b.shots[b.shots.length - 1], cm = camFor(sh, t);
  let shake = 0; for (const k of SHAKE) { const q = t - k; if (q > 0 && q < .25) shake += (1 - q / .25) * .04; }
  camera.position.copy(cm.p); camera.position.x += Math.sin(t * 83) * shake; camera.position.y += Math.cos(t * 71) * shake;
  FILL.position.copy(camera.position).add(new THREE.Vector3(.4, .5, 0)); FILL.intensity = b.set === 'street' ? 12 : 6;
  camera.fov = VERT ? Math.min(88, cm.fov * 1.75) : cm.fov; camera.updateProjectionMatrix(); camera.up.set(0, 1, 0); camera.lookAt(cm.l); camera.rotateZ(cm.roll + Math.sin(t * .7) * .008);
  post.dof.focus = Math.max(.6, cm.p.distanceTo(cm.l) * .9); post.dof.aper = 2.5; post.dof.maxCoc = 8;
  // exposure per beat, lamp flicker on knocks
  let fl = 0; for (const k of SHAKE) { const q = t - k; if (q > 0 && q < .4) fl = Math.max(fl, 1 - q / .4); }
  if (b.set === 'living') { S.living.p.lamp.intensity *= (1 - .8 * fl); }
  renderer.toneMappingExposure = (b.exp ?? .88) * (b.freeze ? .9 : 1) * (b.set === 'press' ? .8 : 1);
  VU.sat.value = b.freeze ? .35 : 1.18;
  scene.fog.density = b.set === 'street' ? .018 : .035;
  post.composer.render();
  // overlays
  captions(t, b);
  const tagOn = b.tag ? seg(lt, .2, .6) * (1 - seg(lt, d - .3, d)) : 0; TAG.style.opacity = tagOn; if (b.tag) { TAG.textContent = b.tag[0]; TAG.style.borderLeftColor = TAGCOL[b.tag[1]]; }
  let title = '', to = 0;
  if (b.title) { title = b.title; to = seg(lt, .2, .8) * (1 - seg(lt, Math.min(d, 3.6) - .4, Math.min(d, 3.6))); }
  if (b.title2) { const k = Math.min(b.title2.length - 1, Math.floor(lt / (d / b.title2.length))); title = b.title2.slice(0, k + 1).join('  ·  '); to = seg(lt, .1, .4) * (1 - seg(lt, d - .3, d)); }
  if (b.big && t >= sT(b.big[2]) - .1) { title = b.big[0] + '\n' + b.big[1]; to = seg(t, sT(b.big[2]) - .1, sT(b.big[2]) + .3) * (1 - seg(lt, d - .3, d)); }
  if (b.cta) { title = 'А ВЫ КАК ДУМАЕТЕ?'; to = seg(lt, .5, 1) * (1 - seg(t, DUR - 1.2, DUR)); }
  TITLE.style.whiteSpace = 'pre-line'; TITLE.textContent = title; TITLE.style.opacity = to; TITLE.style.fontSize = VERT ? (b.big ? '96px' : '64px') : (b.big ? '120px' : '84px');
  if (b.stamp) { const k = seg(lt, .5, .62); STAMP.textContent = b.stamp; STAMP.style.opacity = k > 0 ? .95 * (1 - seg(lt, d - .3, d)) : 0; STAMP.style.transform = `translate(-50%,0) rotate(-8deg) scale(${k < 1 ? lerp(2.6, 1, k) : 1})`; if (lt > .62 && lt < .9) SHAKE.push(b.t0 + .62); }
  else STAMP.style.opacity = 0;
  let f = 0; for (const k of FLASHES) { const q = t - k; if (q > 0 && q < .35) f = Math.max(f, .75 * (1 - q / .35)); } FLASH.style.opacity = f;
  FADE.style.opacity = CLIP ? Math.max(1 - seg(t, CLIP[0], CLIP[0] + .35), seg(t, CLIP[1] - .5, CLIP[1]), b.key === 'lead' ? .35 : 0)
                             : Math.max(1 - seg(t, 0, .6) * (t > 0 ? 1 : 0), seg(t, DUR - 1.0, DUR), b.key === 'lead' ? .35 : 0);
  if (OUTRO) OUTRO.style.opacity = CLIP ? seg(t, CLIP[1] - 2.6, CLIP[1] - 2.1) * (1 - seg(t, CLIP[1] - .5, CLIP[1])) : 0;
}
