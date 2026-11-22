// Cartoon characters for «Энфилд»: big round head, dot eyes, brows, a mouth that talks, capsule body, mitten hands.
// makeChar(spec) → { root, j: joints, face, setPose(p) }. Poses are plain objects of joint angles; animate by blending poses.
import * as THREE from 'three';
import { outline, sph, cap, cyl, box, col, lerp } from './lib.js';

const SKIN = 0xd2b096;
export function makeChar(s) {
  const k = s.scale ?? 1, root = new THREE.Group(), j = {};
  const hips = new THREE.Group(); hips.position.y = .78; root.add(hips); j.hips = hips;
  // legs: thigh + shin, shoes
  for (const sd of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(sd * .1, 0, 0); hips.add(hip);
    const th = cap(.065, .26, s.legs ?? 0x1a1a24); th.position.y = -.2; hip.add(outline(th, 1.12));
    const knee = new THREE.Group(); knee.position.y = -.38; hip.add(knee);
    const sh = cap(.058, .24, s.legs ?? 0x1a1a24); sh.position.y = -.18; knee.add(outline(sh, 1.12));
    const shoe = box(.12, .07, .22, s.shoes ?? 0x0a0a0a); shoe.position.set(0, -.37, .05); knee.add(outline(shoe, 1.1));
    j[sd < 0 ? 'hipL' : 'hipR'] = hip; j[sd < 0 ? 'kneeL' : 'kneeR'] = knee;
  }
  // torso (coat/dress flares when s.long)
  const chest = new THREE.Group(); hips.add(chest); j.chest = chest;
  // a rounded body (lathe): waist → chest → sloping shoulders; a coat or dress flares down to the knees
  const prof = s.long ? [[.001, -.42], [.31, -.42], [.27, -.1], [.22, .15], [.23, .42], [.19, .56], [.09, .64], [.001, .66]]
                      : [[.001, -.04], [.2, -.04], [.205, .12], [.22, .4], [.19, .55], [.09, .64], [.001, .66]];
  const tor = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 20), col(s.top ?? 0x2a3a6a)); tor.castShadow = true; tor.scale.z = .82; chest.add(outline(tor, 1.05));
  if (s.collar) { const c2 = cyl(.17, .2, .1, s.collar); c2.position.y = .6; chest.add(c2); }
  if (s.tie) { const tie = box(.05, .3, .02, s.tie); tie.position.set(0, .44, .2); chest.add(tie); }
  if (s.bowtie) { for (const sd of [-1, 1]) { const b = new THREE.Mesh(new THREE.ConeGeometry(.05, .09, 4), col(s.bowtie)); b.rotation.z = sd * Math.PI / 2; b.position.set(sd * .05, .58, .19); chest.add(b); } }
  if (s.badge) { const b = box(.06, .07, .02, 0xd8b040, { metalness: .6, roughness: .3 }); b.position.set(-.09, .45, .19); chest.add(b); }
  // arms: upper + forearm + mitten hand
  for (const sd of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(sd * .24, .55, 0); chest.add(sh);
    const up = cap(.052, .2, s.top ?? 0x2a3a6a); up.position.y = -.15; sh.add(outline(up, 1.14));
    const el = new THREE.Group(); el.position.y = -.3; sh.add(el);
    const fo = cap(.046, .18, s.sleeve ?? s.top ?? 0x2a3a6a); fo.position.y = -.13; el.add(outline(fo, 1.14));
    const hand = sph(.06, s.skin ?? SKIN); hand.position.y = -.3; el.add(outline(hand, 1.12));
    j[sd < 0 ? 'shL' : 'shR'] = sh; j[sd < 0 ? 'elL' : 'elR'] = el; j[sd < 0 ? 'handL' : 'handR'] = hand;
  }
  // head: big sphere, ears, eyes, brows, mouth, hair/hat options
  const neck = new THREE.Group(); neck.position.y = .66; chest.add(neck); j.neck = neck;
  const head = new THREE.Group(); head.position.y = .3; neck.add(head); j.head = head;
  const skull = sph(.3, s.skin ?? SKIN, { roughness: 1 }); skull.scale.set(1.04, .97, 1); head.add(outline(skull, 1.04));
  for (const sd of [-1, 1]) { const ear = sph(.06, s.skin ?? SKIN); ear.position.set(sd * .29, 0, 0); ear.scale.set(.6, 1, .8); head.add(ear); }
  const face = { eyes: [], brows: [], lids: [] };
  for (const sd of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(.05, 14, 10), new THREE.MeshBasicMaterial({ color: 0x000000 })); e.position.set(sd * .1, .04, .275); head.add(e); face.eyes.push(e);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(.012, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); glint.position.set(sd * .1 - .012, .055, .31); head.add(glint);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(.05, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), col(s.skin ?? SKIN)); lid.position.copy(e.position); lid.position.z -= .004; lid.rotation.x = -Math.PI / 2 + .1; lid.scale.y = .01; head.add(lid); face.lids.push(lid);
    const br = box(.11, .032, .025, s.browColor ?? s.hairColor ?? 0x2a1a10); br.position.set(sd * .1, .14, .27); head.add(br); face.brows.push(br);
  }
  // mouth: a dark ellipse that opens; a lip line on top
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(.05, 16, 10), new THREE.MeshBasicMaterial({ color: 0x3a0e0e })); mouth.position.set(0, -.11, .27); mouth.scale.set(1, .15, .4); head.add(mouth); face.mouth = mouth;
  const nose = sph(.035, s.skin ?? SKIN); nose.position.set(0, -.02, .3); head.add(nose);
  const hc = s.hairColor ?? 0x2a1a10;
  const add = (m, x, y, z, sx = 1, sy = 1, sz = 1) => { m.position.set(x, y, z); m.scale.set(sx, sy, sz); head.add(m); return m; };
  if (s.hair === 'curly') { for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, b = sph(.1, hc); add(b, Math.cos(a) * .25, .16 + Math.sin(i * 1.7) * .06, Math.sin(a) * .22 - .04); } add(sph(.27, hc), 0, .12, -.05, 1.05, .9, 1); }
  if (s.hair === 'pigtails') { add(sph(.3, hc), 0, .06, -.04, 1.03, 1.02, 1); for (const sd of [-1, 1]) { const p = cap(.07, .2, hc); p.rotation.z = sd * .5; add(p, sd * .33, -.12, -.05); const bow = sph(.05, 0xd8302a); add(bow, sd * .29, .02, -.02); } }
  if (s.hair === 'long') { add(sph(.3, hc), 0, .06, -.05, 1.04, 1.02, 1.02); const back = box(.56, .55, .12, hc); add(back, 0, -.2, -.2); }
  if (s.hair === 'side') { add(sph(.3, hc), 0, .1, -.06, 1.02, .95, 1); }
  if (s.hair === 'bald') { for (const sd of [-1, 1]) add(sph(.08, hc), sd * .26, .02, -.06, .6, 1, 1.2); }
  if (s.hair === 'bob') { add(sph(.3, hc), 0, .08, -.04, 1.05, 1, 1.03); add(box(.6, .26, .5, hc), 0, -.06, -.08); }
  // hats
  if (s.hat === 'police') { const c1 = cyl(.3, .29, .16, 0x0c0e1c); add(c1, 0, .28, 0); const band = cyl(.302, .302, .05, 0xe8e8f0); add(band, 0, .23, 0); const peak = cyl(.31, .31, .025, 0x050508, 20); peak.geometry = new THREE.CylinderGeometry(.33, .33, .025, 20, 1, false, -.9, 1.8); add(peak, 0, .2, .05); const bd = box(.06, .06, .02, 0xd8b040); add(bd, 0, .3, .29); }
  if (s.hat === 'flatcap') { const c1 = sph(.31, s.hatColor ?? 0x4a3a2a); add(c1, 0, .18, -.02, 1, .45, 1.05); const peak = box(.3, .03, .2, s.hatColor ?? 0x4a3a2a); add(peak, 0, .15, .26); }
  if (s.hat === 'trilby') { const brim = cyl(.42, .42, .03, s.hatColor ?? 0x2a2a2a); add(brim, 0, .2, 0); const crown = cyl(.24, .28, .22, s.hatColor ?? 0x2a2a2a); add(crown, 0, .32, 0); }
  if (s.mustache) { const m = new THREE.Mesh(new THREE.TorusGeometry(.07, .022, 8, 16, Math.PI), col(s.mustache)); m.position.set(0, -.065, .29); m.rotation.z = Math.PI; head.add(m); }
  if (s.beard) { add(sph(.22, s.beard), 0, -.18, .08, 1.05, .8, .7); face.mouth.position.z = .33; }
  if (s.glasses) { for (const sd of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(.065, .012, 8, 20), col(0x111111)); r.position.set(sd * .1, .04, .3); head.add(r); } const br = box(.06, .012, .012, 0x111111); add(br, 0, .05, .3); }
  if (s.camera) { const cam = box(.2, .14, .12, 0x1a1a1a); cam.position.set(0, -.32, .08); j.elR.add(cam); const lens = cyl(.05, .05, .08, 0x333333); lens.rotation.x = Math.PI / 2; lens.position.set(0, -.32, .17); j.elR.add(lens); const fl = box(.08, .1, .06, 0xdddddd); fl.position.set(0, -.2, .08); j.elR.add(fl); j.flash = fl; }
  if (s.notepad) { const pad = box(.14, .18, .02, 0xf0ead8); pad.position.set(0, -.34, .08); j.elL.add(pad); }
  root.scale.setScalar(k * (s.tall ?? 1));
  const ch = { root, j, face, spec: s };
  ch.setPose = p => pose(ch, p); ch.setPose({});
  return ch;
}

// pose: angles in radians. Missing keys = rest. Helpers below build common poses.
export function pose(ch, p) {
  const j = ch.j;
  j.hips.position.y = .78 + (p.bob ?? 0) - (p.sit ? .3 : 0); j.hips.rotation.y = p.turn ?? 0;
  j.chest.rotation.x = p.lean ?? 0; j.chest.rotation.z = p.tilt ?? 0;
  j.hipL.rotation.x = p.hipL ?? (p.sit ? -1.45 : 0); j.hipR.rotation.x = p.hipR ?? (p.sit ? -1.45 : 0);
  j.kneeL.rotation.x = p.kneeL ?? (p.sit ? 1.45 : 0); j.kneeR.rotation.x = p.kneeR ?? (p.sit ? 1.45 : 0);
  j.shL.rotation.set(p.shLx ?? 0, 0, p.shLz ?? -.12); j.shR.rotation.set(p.shRx ?? 0, 0, p.shRz ?? .12);
  j.elL.rotation.x = p.elL ?? -.15; j.elR.rotation.x = p.elR ?? -.15;
  j.head.rotation.set(p.nod ?? 0, p.look ?? 0, p.cock ?? 0);
  const f = ch.face, br = p.brow ?? 0, op = p.mouth ?? 0, bl = p.blink ?? 0, sm = p.smile ?? 0;
  f.brows.forEach((b, i) => { const sd = i ? 1 : -1; b.position.y = .14 + br * .03; b.rotation.z = -sd * (p.browTilt ?? 0); });
  f.mouth.scale.set(1 + sm * .3, .15 + op * .9, .4); f.mouth.position.y = -.11 + sm * .01;
  f.lids.forEach(l => { l.scale.y = .01 + bl * 1.1; });
  const eyeS = p.eyes ?? 1; f.eyes.forEach(e => e.scale.setScalar(eyeS));
}
// procedural motion layers
export const walkP = (t, sp = 7, amp = 1) => { const ph = t * sp; return { hipL: Math.sin(ph) * .55 * amp, hipR: -Math.sin(ph) * .55 * amp, kneeL: Math.max(0, -Math.sin(ph + .9)) * .8 * amp, kneeR: Math.max(0, Math.sin(ph + .9)) * .8 * amp, shLx: -Math.sin(ph) * .45 * amp, shRx: Math.sin(ph) * .45 * amp, elL: -.35, elR: -.35, bob: Math.abs(Math.sin(ph)) * .035 * amp }; };
export const idleP = (t, seed = 0) => ({ bob: Math.sin(t * 1.6 + seed) * .006, lean: Math.sin(t * .9 + seed) * .02, look: Math.sin(t * .37 + seed) * .12, blink: blinkAt(t, seed) });
export function blinkAt(t, seed) { const per = 3.2 + (seed % 7) * .3, ph = (t + seed * 1.3) % per; return ph < .14 ? Math.sin(ph / .14 * Math.PI) : 0; }
export const mix = (a, b, k) => { const o = { ...a }; for (const key in b) o[key] = lerp(a[key] ?? 0, b[key], k); return o; };
export const add = (...ps) => { const o = {}; for (const p of ps) for (const key in p) o[key] = (o[key] ?? 0) + p[key]; return o; };

// the cast
export const CAST = {
  police: { top: 0x1a2244, sleeve: 0x1a2244, legs: 0x101420, hat: 'police', hair: 'bob', hairColor: 0x3a2414, badge: 1, long: 1, name: 'Полицейская' },
  mother: { top: 0x8a4a5a, legs: 0x3a2a30, hair: 'curly', hairColor: 0x5a3a24, long: 1, name: 'Мать' },
  girl11: { top: 0xd8c040, legs: 0x2a3a6a, hair: 'pigtails', hairColor: 0x3a2414, scale: .78, name: 'Младшая дочь' },
  girl13: { top: 0x3a8a6a, legs: 0x2a2a3a, hair: 'long', hairColor: 0x6a4024, scale: .84, name: 'Старшая дочь' },
  grosse: { top: 0x5a5a62, tie: 0x8a2020, legs: 0x3a3a40, hair: 'bald', hairColor: 0x8a8a8a, mustache: 0x6a6a6a, glasses: 1, name: 'Исследователь (Гросс)' },
  playfair: { top: 0x6a4a2a, legs: 0x3a3028, hair: 'side', hairColor: 0x2a2018, beard: 0x2a2018, name: 'Писатель (Плейфэр)' },
  photo: { top: 0x3a5a3a, legs: 0x2a2a2a, hat: 'flatcap', hatColor: 0x4a3a2a, hair: 'side', camera: 1, name: 'Фотограф' },
  reporter: { top: 0x8a7a5a, tie: 0x2a3a6a, legs: 0x3a3428, hat: 'trilby', hatColor: 0x3a2e22, notepad: 1, name: 'Журналист' },
  french: { top: 0x2a4a6a, legs: 0x2a2a2a, hair: 'side', hairColor: 0x6a6a6a, glasses: 1, name: 'Психолог-скептик' },
  ventro: { top: 0x1a1a1a, legs: 0x1a1a1a, hair: 'side', hairColor: 0x1a1210, bowtie: 0xc82020, name: 'Чревовещатель' },
  judge: { top: 0x2a2a34, tie: 0x5a1a1a, legs: 0x2a2a30, hair: 'bald', hairColor: 0xb0b0b0, glasses: 1, name: 'Член комиссии' },
};
