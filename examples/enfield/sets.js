// Expressionist 3D sets for «Энфилд». Each builder returns { g: Group, p: props, light(t) }.
// All sets sit at the origin; only the active one is visible (its lights switch with it).
import * as THREE from 'three';
import { swirlTex, jag, zig, rays, mat, col, shapeMesh, outline, box, cyl, sph, cap, hash, clamp } from '../../src/lib.js';

// ---------------- shared materials
const SKY = () => new THREE.ShaderMaterial({ uniforms: { t: { value: 0 }, moon: { value: new THREE.Vector2(.68, .72) } }, side: THREE.BackSide, depthWrite: false,
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: `varying vec3 vP; uniform float t; uniform vec2 moon;
    void main(){ vec2 uv = vec2(atan(vP.x, -vP.z) / 3.1416 * .5 + .5, vP.y * .5 + .5);
      vec2 p = uv - moon; float r = length(p * vec2(2.4, 1.)), a = atan(p.y, p.x);
      float sw = sin(a * 3. - r * 22. + t * .8) * .5 + .5, sw2 = sin(uv.x * 40. + sin(uv.y * 18. + t * .5) * 2.) * .5 + .5;
      vec3 c = mix(vec3(.03,.06,.2), vec3(.08,.2,.45), sw * .7 + sw2 * .3);
      c = mix(c, vec3(.95,.82,.35), smoothstep(.18, .0, r) * .8 + .2 * sw * smoothstep(.45, .0, r));
      c += vec3(1.,.92,.6) * smoothstep(.07, .05, r);
      for (int i = 0; i < 14; i++) { vec2 s = vec2(fract(sin(float(i) * 12.9) * 437.5), .55 + fract(sin(float(i) * 78.2) * 912.4) * .45); c += vec3(1.,.9,.5) * smoothstep(.012, .0, length((uv - s) * vec2(2.2, 1.))) * (.6 + .4 * sin(t * 2. + float(i))); }
      c = mix(vec3(.02,.03,.08), c, smoothstep(.38, .55, uv.y)); gl_FragColor = vec4(c, 1.); }` });
const emis = (c, k = 1.5) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: k });
function textTex(lines, w = 1024, h = 512, bg = '#efe6cc', fg = '#1a1612', o = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h); if (o.extra) o.extra(x, w, h);
  for (const [s, y, font, color, align] of lines) { x.font = font; x.fillStyle = color || fg; x.textAlign = align || 'center'; x.fillText(s, align === 'left' ? 40 : w / 2, y); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function spot(color, I, pos, tgt, angle = .5, pen = .5, shadow = true, size = 1024) {
  const s = new THREE.SpotLight(color, I, 30, angle, pen, 1.3); s.position.set(...pos); s.target.position.set(...tgt);
  if (shadow) { s.castShadow = true; s.shadow.mapSize.set(size, size); s.shadow.bias = -.0005; } return s;
}
function room(g, T, o = {}) {   // crooked box room: floor, back wall (with optional window hole), left + right walls, ceiling
  const fl = shapeMesh([[-6, -4.6], [6.2, -4.2], [6, 4.5], [-6.2, 4.5]], mat(T.floor)); fl.rotation.x = -Math.PI / 2; g.add(fl);
  const back = shapeMesh([[-6.4, 0], [6.6, 0], [6.0, 6.6], [-5.8, 7.0]], mat(T.back), o.win ? [o.win] : []); back.position.z = -4.3; back.rotation.y = .05; g.add(back);
  const L = shapeMesh(o.leftPts || [[-5.4, 0], [5, 0], [5, 6.8], [-5.2, 5.6]], mat(T.left)); L.rotation.y = Math.PI / 2; L.position.x = -5.4; L.rotation.z = .06; g.add(L);
  const R = shapeMesh([[-5.4, 0], [5, 0], [5, 6.4], [-5.4, 7.0]], mat(T.right)); R.rotation.y = -Math.PI / 2; R.position.x = 5.8; R.rotation.z = -.05; g.add(R);
  const c = shapeMesh([[-6.5, -4.8], [6.6, -4.4], [6.4, 5], [-6.6, 5]], mat(T.ceil)); c.rotation.x = Math.PI / 2; c.position.y = o.ceilY ?? 6.2; c.rotation.y = o.ceilTilt ?? 0; g.add(c);
  return { back, L, R };
}
function windowSky(g, x, y, z, w = 4, h = 3.4) { const m = SKY(); const s = new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), m); s.position.set(x, y, z - 30); g.add(s); return m; }

// ---------------- textures (built once)
const T = {};
function textures() {
  if (T.done) return; T.done = 1;
  T.livBack = swirlTex(2048, 1280, '#1a1f4a', ['#26307a', '#2e3f92', '#1a2560', '#3a2a6a', '#141838'], 1.3, (x, w, h) => { rays(x, 1500, 380, 9, 1.5, 1300, '#f2d060', 6, .2); zig(x, 0, 120, w, 60, 22, 26, '#05060f', 14, .7); zig(x, 0, 1180, w, 1150, 18, 30, '#05060f', 18, .6); });
  T.livLeft = swirlTex(1536, 1280, '#3a1018', ['#6a1a24', '#7a2230', '#4a1222', '#8a3a2a', '#2a0a14'], 4.2, (x, w) => zig(x, 0, 140, w, 90, 16, 24, '#05060f', 14, .7));
  T.livRight = swirlTex(1536, 1280, '#12302a', ['#1a5040', '#22604a', '#0e3a30', '#3a6a4a', '#08201a'], 7.7, (x, w) => zig(x, 0, 160, w, 120, 16, 24, '#05060f', 14, .7));
  T.floor = swirlTex(2048, 2048, '#3a2014', ['#6a3418', '#7a4020', '#4a2410', '#8a5228', '#2a140a'], 9.1, (x, w, h) => { for (let i = -6; i < 14; i++) jag(x, [[i * 200, 0], [i * 200 + 90, 0], [i * 200 + 600, h], [i * 200 + 470, h]], i % 2 ? '#f0c040' : '#05060f', i % 2 ? .12 : .26); });
  T.ceil = swirlTex(1024, 1024, '#0a0a18', ['#141a3a', '#1a1030', '#0a2a2a'], 3.3);
  T.bedBack = swirlTex(2048, 1280, '#20402a', ['#2a5a38', '#3a6a40', '#1a3a24', '#6a7a2a', '#10261a'], 2.6, (x, w, h) => { rays(x, 600, 300, 11, 1.7, 1400, '#f2e070', 5, .16); zig(x, 0, 110, w, 70, 24, 22, '#05060f', 12, .65); });
  T.bedLeft = swirlTex(1536, 1280, '#4a3a10', ['#7a6018', '#8a7020', '#5a4612', '#a0822a', '#2a200a'], 5.5, (x, w) => zig(x, 0, 150, w, 100, 16, 22, '#05060f', 12, .65));
  T.bedRight = swirlTex(1536, 1280, '#2a1a40', ['#3a2a6a', '#4a2a7a', '#22164a', '#6a3a8a', '#140c28'], 6.6, (x, w) => zig(x, 0, 150, w, 100, 16, 22, '#05060f', 12, .65));
  T.labBack = swirlTex(2048, 1280, '#2a1a10', ['#4a2a14', '#5a361a', '#3a200e', '#7a5020', '#1a0e06'], 3.9, (x, w, h) => { for (let i = 0; i < 9; i++) jag(x, [[i * 240, 0], [i * 240 + 30, 0], [i * 240 + 110, h], [i * 240 + 70, h]], '#05060f', .35); });
  T.labSide = swirlTex(1536, 1280, '#1a2a2a', ['#24403a', '#2a4a44', '#16302a', '#3a5a4a'], 8.4);
  T.comBack = swirlTex(2048, 1280, '#3a0a10', ['#5a1418', '#6a1a1e', '#4a0e14', '#8a5a20', '#200508'], 4.8, (x, w, h) => { rays(x, w / 2, -100, 17, 1.2, 1600, '#e8b040', 7, .22); });
  T.comSide = swirlTex(1536, 1280, '#2a0a10', ['#4a1418', '#3a0e14', '#5a2a1a'], 2.2);
  T.evBack = swirlTex(2048, 1280, '#0a0c18', ['#141a34', '#1a1430', '#0e2026', '#202a4a'], 6.1);
  T.cinBack = swirlTex(2048, 1280, '#2a0a0a', ['#4a1010', '#5a1414', '#3a0c0c', '#7a2a14'], 1.9);
  T.road = swirlTex(2048, 2048, '#101420', ['#1a2234', '#222a3e', '#141a28', '#2a3248'], 5.2, (x, w, h) => { for (let i = 0; i < 12; i++) jag(x, [[0, i * 180], [w, i * 180 + 40], [w, i * 180 + 52], [0, i * 180 + 12]], '#f2d060', .08); });
  const brick = (seed, base, cols) => swirlTex(1024, 1280, base, cols, seed, (x, w, h) => { for (let y = 0; y < h; y += 46) { x.globalAlpha = .18; x.fillStyle = '#05060f'; x.fillRect(0, y, w, 5); } x.globalAlpha = 1; zig(x, 0, 60, w, 30, 10, 18, '#05060f', 10, .6); }, { density: 1800 });
  T.houses = [brick(1.1, '#5a2418', ['#7a3020', '#8a3a24', '#6a2a1c', '#4a1c12']), brick(2.2, '#4a3a2a', ['#6a5034', '#5a4430', '#7a6040']), brick(3.3, '#5a2a30', ['#7a3a40', '#6a3036', '#8a4a44']), brick(4.4, '#3a3a4a', ['#4a4a62', '#5a5a72', '#3a3a52'])];
  T.paper = textTex([['ПИСЬМЕННОЕ ПОКАЗАНИЕ', 70, 'bold 40px "Courier New"'], ['Энфилд, Грин-стрит.', 150, '30px "Courier New"', 0, 'left'], ['Ночь на 1 сентября 1977 г.', 196, '30px "Courier New"', 0, 'left'], ['…слышала четыре удара в стене…', 270, '30px "Courier New"', 0, 'left'], ['…стул скользнул по полу…', 316, '30px "Courier New"', 0, 'left'], ['(реконструкция текста)', 470, 'italic 26px Georgia', '#8a2a1a']], 768, 512);
  T.news = textTex([['ВЕЧЕРНИЕ НОВОСТИ · ЛОНДОН · 1977', 54, 'bold 34px Georgia'], ['ПОЛТЕРГЕЙСТ', 200, '900 140px Georgia'], ['В ЭНФИЛДЕ?', 330, '900 120px Georgia'], ['Полиция не нашла объяснения шуму', 410, 'italic 38px Georgia'], ['реконструкция', 490, 'italic 26px Georgia', '#8a2a1a']], 1024, 512, '#e8e0c8', '#141210', { extra: (x, w) => { x.fillStyle = '#141210'; x.fillRect(30, 70, w - 60, 5); x.fillRect(30, 430, w - 60, 3); } });
}

// ================= STREET (Green Street at night) =================
export function street() {
  textures(); const g = new THREE.Group(), p = {};
  const road = shapeMesh([[-30, -14], [30, -14], [30, 14], [-30, 14]], mat(T.road)); road.rotation.x = -Math.PI / 2; g.add(road);
  const pave = box(60, .15, 3, 0x2a2a34); pave.position.set(0, .07, -5.2); g.add(pave);
  // a row of crooked terraced houses; the middle one is «the house»
  for (let i = -4; i <= 4; i++) {
    const x0 = i * 3.6, h = 6.2 + hash(i * 3) * 1.4, lean = (hash(i * 7) - .5) * .5, tex = T.houses[(i + 8) % 4];
    const f = shapeMesh([[-1.8, 0], [1.8, 0], [1.75 + lean, h], [lean * .5, h + 1.6 + hash(i) * .6], [-1.8 + lean, h + .2]], mat(tex)); f.position.set(x0, 0, -6.6); f.rotation.z = lean * .04; g.add(f);
    const body = box(3.6, h, 6, 0x0c0c14); body.position.set(x0, h / 2, -9.7); g.add(body);
    const lit = (dx, dy, w, hh, on) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hh), on ? emis(0xffb850, 1.6) : col(0x1a2030)); m.position.set(x0 + dx, dy, -6.55); m.rotation.z = (hash(i * 11 + dx) - .5) * .25; g.add(m); const fr = box(w + .14, hh + .14, .05, 0x05060a); fr.position.set(x0 + dx, dy, -6.6); fr.rotation.z = m.rotation.z; g.add(fr); return m; };
    lit(-.8, 1.6, .9, 1.1, hash(i * 5) > .5); lit(.9, 4.2, .8, 1.2, i === 0 || hash(i * 9) > .6); lit(-.8, 4.3, .7, 1.0, hash(i * 13) > .7);
    const door = box(.85, 1.9, .1, i === 0 ? 0x6a1a1a : 0x1a1a24); door.position.set(x0 + .9, .95, -6.5); door.rotation.z = (hash(i) - .5) * .1; g.add(outline(door, 1.03));
    if (i === 0) p.door = door;
  }
  p.upWindow = g.children.find(o => o.material && o.material.emissive && Math.abs(o.position.x - .9) < .01 && o.position.y > 4);
  // crooked lamp posts
  for (const lx of [-6.5, 7.5]) { const pole = box(.14, 5.2, .14, 0x0a0a0a); pole.position.set(lx, 2.6, -4.6); pole.rotation.z = (lx > 0 ? -1 : 1) * .12; g.add(pole); const lamp = new THREE.Mesh(new THREE.ConeGeometry(.45, .55, 5), emis(0xffd080, 2.2)); lamp.position.set(lx + (lx > 0 ? -.6 : .6), 5.2, -4.6); g.add(lamp);
    const pl = new THREE.PointLight(0xffb060, 26, 14, 1.6); pl.position.copy(lamp.position); pl.position.y -= .4; g.add(pl); }
  // police car (boxy 70s panda) with a blue lamp
  const car = new THREE.Group(); g.add(car); p.car = car;
  const cb = box(4.2, .9, 1.9, 0xe8e6e0); cb.position.y = .75; car.add(outline(cb, 1.02)); const stripe = box(4.25, .22, 1.95, 0x1a3a8a); stripe.position.y = .8; car.add(stripe);
  const cab = box(2.3, .75, 1.75, 0xe8e6e0); cab.position.set(-.2, 1.55, 0); car.add(outline(cab, 1.03));
  const glass = box(2.0, .5, 1.78, 0x1a2a4a, { roughness: .2, metalness: .4 }); glass.position.set(-.2, 1.58, 0); car.add(glass);
  for (const [wx, wz] of [[-1.3, .95], [1.3, .95], [-1.3, -.95], [1.3, -.95]]) { const w = cyl(.38, .38, .3, 0x0a0a0a, 16); w.rotation.x = Math.PI / 2; w.position.set(wx, .38, wz); car.add(w); }
  const blue = box(.3, .22, .3, 0x3060ff); blue.material = emis(0x3a6aff, 3); blue.position.set(-.2, 2.05, 0); car.add(blue); p.blue = blue;
  const bl = new THREE.PointLight(0x3a6aff, 0, 18, 1.4); bl.position.set(-.2, 2.4, 0); car.add(bl); p.blueL = bl;
  for (const hz of [.6, -.6]) { const hl = sph(.13, 0xffffff); hl.material = emis(0xfff4d0, 3); hl.position.set(2.12, .85, hz); car.add(hl); }
  car.position.set(30, 0, -2.6);
  // sky + moon light
  p.sky = SKY(); const dome = new THREE.Mesh(new THREE.SphereGeometry(60, 48, 24), p.sky); g.add(dome);
  const moon = spot(0x9ab0ff, 380, [-10, 22, 14], [0, 0, -6], .55, .6, true, 2048); g.add(moon, moon.target);
  g.add(new THREE.HemisphereLight(0x3a4a9a, 0x1a1010, .55));
  const fill = spot(0xffd8a0, 90, [6, 6, 8], [0, 1.5, -6], .5, .6, false); g.add(fill, fill.target);
  p.light = t => { p.sky.uniforms.t.value = t; const on = (Math.floor(t * 2.2) % 2) === 0; p.blue.material.emissiveIntensity = on ? 4 : .4; p.blueL.intensity = p.car.userData.siren ? (on ? 60 : 4) : 0; };
  return { g, p };
}

// ================= LIVING ROOM (with the chair) =================
export function living() {
  textures(); const g = new THREE.Group(), p = {};
  const winHole = [[1.0, 1.9], [2.9, 2.2], [2.6, 4.0], [1.4, 4.3], [1.15, 3.2]];
  room(g, { floor: T.floor, back: T.livBack, left: T.livLeft, right: T.livRight, ceil: T.ceil }, { win: winHole, leftPts: [[-5.4, 0], [-.75, 0], [-.6, 3.75], [.7, 3.95], [.85, 0], [5, 0], [5, 6.8], [-5.2, 5.6]] });
  p.sky = SKY(); const dome = new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), p.sky); dome.position.set(2, 3, -40); g.add(dome);
  const moon = spot(0x9ab8ff, 140, [2.2, 3.4, -5.6], [.6, 0, 1.4], .5, .6, true, 2048); g.add(moon, moon.target);
  const lamp = new THREE.PointLight(0xffa040, 30, 14, 1.6); lamp.position.set(-3.1, 2.75, -2.7); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -.002; g.add(lamp); p.lamp = lamp;
  const beam = spot(0xffe0a0, 220, [-3.5, 5.6, 2.5], [.6, 2.2, -4.2], .32, .15, true, 2048); g.add(beam, beam.target); p.beam = beam;
  const hallL = spot(0xffc070, 0, [-7.2, 2.4, -.1], [-1.5, 0, .5], .55, .5); g.add(hallL, hallL.target); p.hallL = hallL;
  g.add(new THREE.HemisphereLight(0x4a5aaa, 0x3a1810, .9));
  const doorPivot = new THREE.Group(); doorPivot.position.set(-5.35, 0, .75); g.add(doorPivot); p.doorPivot = doorPivot;
  const leaf = box(.08, 3.75, 1.35, 0x3a1a10); leaf.position.set(0, 1.87, -.68); doorPivot.add(outline(leaf, 1.03));
  const hall = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 5), new THREE.MeshBasicMaterial({ color: 0xffb860 })); hall.position.set(-7.4, 2, .1); hall.rotation.y = Math.PI / 2; g.add(hall);
  const lampG = new THREE.Group(); lampG.position.set(-3.1, 0, -2.7); g.add(lampG);
  const pole = box(.07, 2.6, .07, 0x0a0a0a); pole.position.y = 1.3; pole.rotation.z = .12; lampG.add(pole);
  p.shade = new THREE.Mesh(new THREE.ConeGeometry(.55, .6, 6, 1, true), new THREE.MeshStandardMaterial({ color: 0xffd080, emissive: 0xffa040, emissiveIntensity: 1.6, side: THREE.DoubleSide })); p.shade.position.set(.15, 2.75, 0); p.shade.rotation.z = -.2; lampG.add(p.shade);
  const sofa = new THREE.Group(); sofa.position.set(-1.6, 0, -3.3); sofa.rotation.y = .1; g.add(sofa); p.sofa = sofa;
  const sb = box(2.8, .55, 1.0, 0x1c5a3a); sb.position.y = .45; sofa.add(outline(sb, 1.02)); const sk = box(2.9, 1.05, .25, 0x226a44); sk.position.set(0, .9, -.45); sk.rotation.z = .05; sofa.add(outline(sk, 1.02));
  for (const sd of [-1, 1]) { const a = box(.3, .75, 1.0, 0x1a4a30); a.position.set(sd * 1.45, .55, 0); sofa.add(outline(a, 1.03)); }
  for (let i = 0; i < 9; i++) { const st = box(1.4, .22, .55, i % 2 ? 0x3a1a2a : 0x5a2234); st.position.set(4.6 - i * .05, .11 + i * .42, 1.8 - i * .52); st.rotation.y = i * .035; st.rotation.z = i * .02; g.add(st); }
  const frame = box(.9, 1.2, .06, 0x2a1408); frame.position.set(-1.4, 3.3, -4.15); frame.rotation.z = .22; g.add(outline(frame, 1.04));
  // TV on a crooked stand, blue glow
  const tv = box(1.0, .8, .7, 0x3a2a1a); tv.position.set(3.2, 1.1, -3.4); tv.rotation.y = -.4; g.add(outline(tv, 1.03)); const scr = new THREE.Mesh(new THREE.PlaneGeometry(.75, .55), emis(0x8ab0d0, 1.4)); scr.position.set(3.08, 1.12, -3.05); scr.rotation.y = -.4; g.add(scr); p.tvScr = scr;
  const stand = box(.9, .7, .6, 0x2a1a10); stand.position.set(3.2, .35, -3.4); stand.rotation.y = -.4; g.add(stand);
  const tvL = new THREE.PointLight(0x7aa0ff, 0, 6, 1.6); tvL.position.set(2.8, 1.2, -2.6); g.add(tvL); p.tvL = tvL;
  // carpet
  const carpet = new THREE.Mesh(new THREE.CircleGeometry(2.2, 7), mat(swirlTex(512, 512, '#5a1a2a', ['#8a2a3a', '#a03a2a', '#3a0e1a', '#c8902a'], 8.8))); carpet.rotation.x = -Math.PI / 2; carpet.position.set(.4, .015, -.4); carpet.receiveShadow = true; g.add(carpet);
  // the chair
  const chair = new THREE.Group(); g.add(chair); p.chair = chair; const cc = 0xd8501c, cd = 0x7a2a10;
  const seat = box(.62, .08, .6, cc); seat.position.y = .62; chair.add(outline(seat, 1.05));
  const bk = box(.56, 1.05, .06, cc); bk.position.set(0, 1.2, -.27); bk.rotation.x = -.12; bk.rotation.z = .04; chair.add(outline(bk, 1.04));
  const sl = box(.44, .14, .07, 0xf2c94c); sl.position.set(0, 1.5, -.31); sl.rotation.x = -.12; chair.add(sl);
  for (const [lx, lz, a, b] of [[-.27, .26, .12, -.12], [.27, .26, -.12, -.12], [-.27, -.26, .12, .12], [.27, -.26, -.12, .12]]) { const l = box(.05, .66, .05, cd); l.position.set(lx, .31, lz); l.rotation.z = a; l.rotation.x = b; chair.add(outline(l, 1.15)); }
  // dust for knocks
  const DN = 300, dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DN * 3), 3));
  p.dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xffe0b0, size: .05, transparent: true, opacity: .9 })); g.add(p.dust); p.dustN = DN;
  p.light = t => { p.sky.uniforms.t.value = t; };
  return { g, p };
}

// ================= BEDROOM (the girls' room, chest of drawers, shelf, cupboard) =================
export function bedroom() {
  textures(); const g = new THREE.Group(), p = {};
  room(g, { floor: T.floor, back: T.bedBack, left: T.bedLeft, right: T.bedRight, ceil: T.ceil }, { win: [[-3.6, 2.2], [-1.8, 2.0], [-2.0, 4.1], [-3.4, 4.4]], ceilY: 5.4, ceilTilt: .12 });
  p.sky = SKY(); const dome = new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16), p.sky); dome.position.set(-2.7, 3, -40); g.add(dome);
  const moon = spot(0xa0b8ff, 160, [-2.8, 3.6, -5.8], [-.5, 0, 1.6], .5, .6, true, 2048); g.add(moon, moon.target);
  const nl = new THREE.PointLight(0xffa860, 18, 10, 1.6); nl.position.set(.2, 1.4, -3.4); nl.castShadow = true; nl.shadow.mapSize.set(1024, 1024); g.add(nl); p.nightL = nl;
  const nightLamp = sph(.18, 0xffd080); nightLamp.material = emis(0xffc070, 2); nightLamp.position.set(.2, 1.05, -3.5); g.add(nightLamp); p.nightLamp = nightLamp;
  const beam = spot(0xffe8b0, 160, [3.5, 5.2, 3], [-1, 1.8, -4.2], .34, .2, true, 2048); g.add(beam, beam.target); p.beam = beam;
  g.add(new THREE.HemisphereLight(0x6a7ac0, 0x3a2a18, 1.3));
  const bedM = (x, z, color) => { const b = new THREE.Group(); b.position.set(x, 0, z); g.add(b); const fr = box(1.3, .4, 2.4, 0x3a1a10); fr.position.y = .3; b.add(outline(fr, 1.02)); const mt = box(1.2, .2, 2.3, 0xe8e0d0); mt.position.y = .6; b.add(mt);
    const bl = box(1.25, .14, 1.6, color); bl.position.set(0, .74, .35); b.add(outline(bl, 1.02)); const pil = box(.8, .16, .4, 0xf0ece0); pil.position.set(0, .78, -.85); b.add(pil); const hb = box(1.4, 1.3, .12, 0x4a2010); hb.position.set(0, .8, -1.2); hb.rotation.z = .08; b.add(outline(hb, 1.03)); return b; };
  p.bedA = bedM(-3.6, -1.6, 0xc8402a); p.bedB = bedM(1.4, -1.8, 0x2a6a9a); p.bedB.rotation.y = -.1;
  // chest of drawers (комод) that can slide
  const chest = new THREE.Group(); chest.position.set(4.2, 0, -3.2); chest.rotation.y = -.3; g.add(chest); p.chest = chest;
  const cbx = box(1.6, 1.3, .7, 0x6a3a1a); cbx.position.y = .65; chest.add(outline(cbx, 1.03));
  for (let i = 0; i < 3; i++) { const d = box(1.4, .3, .05, 0x8a5024); d.position.set(0, .3 + i * .4, .36); chest.add(d); for (const sd of [-1, 1]) { const k = sph(.04, 0xd8b040); k.position.set(sd * .4, .3 + i * .4, .4); chest.add(k); } }
  // shelf with things that fall and fly: box, lid, marbles, a toy
  const shelf = box(2.4, .08, .4, 0x4a2a14); shelf.position.set(-.6, 2.7, -4.0); shelf.rotation.z = -.06; g.add(outline(shelf, 1.04));
  p.items = [];
  const item = (m, x, y, z) => { m.position.set(x, y, z); g.add(m); p.items.push({ m, base: m.position.clone(), rot: m.rotation.clone() }); return m; };
  item(outline(box(.4, .3, .3, 0x2a6a9a), 1.05), -1.4, 2.9, -4.0); item(outline(cyl(.2, .2, .06, 0xd8302a), 1.06), -.8, 2.78, -4.0); item(outline(box(.25, .35, .2, 0xd8c040), 1.05), -.2, 2.93, -4.0);
  for (let i = 0; i < 6; i++) item(sph(.07, [0x3a8aff, 0xff4a3a, 0x40d070, 0xffd040][i % 4], { roughness: .2, metalness: .3 }), .1 + i * .14, 2.82, -3.95);
  // cupboard with a door that swings
  const cup = box(1.4, 2.8, .8, 0x3a2010); cup.position.set(-4.8, 1.4, -3.2); cup.rotation.y = .5; g.add(outline(cup, 1.02));
  const cdp = new THREE.Group(); cdp.position.set(-4.5, 0, -2.55); cdp.rotation.y = .5; g.add(cdp); p.cupDoor = cdp; const cdl = box(1.3, 2.6, .05, 0x5a2e14); cdl.position.set(.65, 1.4, 0); cdp.add(outline(cdl, 1.03));
  // rug + toys
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.6, 9), mat(swirlTex(512, 512, '#2a4a6a', ['#3a6a8a', '#d8c040', '#1a3a5a'], 3.1))); rug.rotation.x = -Math.PI / 2; rug.position.set(-1, .015, .6); rug.receiveShadow = true; g.add(rug);
  p.light = t => { p.sky.uniforms.t.value = t; };
  return { g, p };
}

// ================= LAB (the researchers' corner: tape recorder, typewriter, microphone, tapes) =================
export function lab() {
  textures(); const g = new THREE.Group(), p = {};
  room(g, { floor: T.floor, back: T.labBack, left: T.labSide, right: T.labSide, ceil: T.ceil }, { ceilY: 5.6 });
  g.add(new THREE.HemisphereLight(0x5a6a8a, 0x2a1a10, .8));
  const desk = spot(0xfff0c8, 130, [0, 5.2, 1.5], [0, .9, -1.6], .55, .5, true, 2048); g.add(desk, desk.target);
  const green = new THREE.PointLight(0x80ffb0, 10, 6, 1.6); green.position.set(-1.6, 1.8, -2.2); g.add(green);
  const rim = spot(0x8ab0ff, 120, [4, 4, -4], [0, 1, -1], .6, .6, false); g.add(rim, rim.target);
  const table = box(4.4, .12, 1.8, 0x4a2a14); table.position.set(0, .95, -1.9); table.rotation.z = .03; g.add(outline(table, 1.02));
  for (const [lx, lz] of [[-2, -1.2], [2, -1.2], [-2, -2.6], [2, -2.6]]) { const l = box(.1, .95, .1, 0x2a1408); l.position.set(lx, .47, lz); l.rotation.z = lx * .04; g.add(l); }
  // reel-to-reel recorder
  const rec = box(1.2, .35, .9, 0x4a4a52, { metalness: .4, roughness: .4 }); rec.position.set(.2, 1.2, -1.8); g.add(outline(rec, 1.03));
  p.reels = [];
  for (const sd of [-1, 1]) { const r = new THREE.Group(); r.position.set(.2 + sd * .3, 1.4, -1.8); g.add(r); const disc = cyl(.24, .24, .03, 0x1a1a1a, 24); r.add(disc); const hub = cyl(.06, .06, .05, 0xd8d8d8, 12); r.add(hub); for (let k = 0; k < 3; k++) { const sp = box(.36, .02, .04, 0xbbbbbb); sp.rotation.y = k * Math.PI / 3; sp.position.y = .02; r.add(sp); } p.reels.push(r); }
  const vu = new THREE.Mesh(new THREE.PlaneGeometry(.3, .12), emis(0xffb030, 1.4)); vu.position.set(.2, 1.38, -1.34); vu.rotation.x = -.5; g.add(vu);
  // microphone on a stand with a red tally light
  const ms = box(.04, 1.2, .04, 0x1a1a1a); ms.position.set(-1.0, 1.6, -1.4); g.add(ms); const mic = cap(.07, .14, 0x2a2a2a); mic.position.set(-1.0, 2.25, -1.35); mic.rotation.x = .4; g.add(outline(mic, 1.1));
  p.tally = sph(.035, 0xff2020); p.tally.material = emis(0xff2a2a, 0); p.tally.position.set(-1.0, 2.38, -1.27); g.add(p.tally);
  // typewriter + paper
  const tw = box(.8, .25, .6, 0x1a2a1a); tw.position.set(1.5, 1.14, -1.6); tw.rotation.y = -.3; g.add(outline(tw, 1.04)); const pap = new THREE.Mesh(new THREE.PlaneGeometry(.5, .6), col(0xf0ead8)); pap.position.set(1.44, 1.5, -1.8); pap.rotation.y = -.3; pap.rotation.x = -.2; g.add(pap);
  // notebook, glass of water, roll of tape (the voice tests)
  const nb = box(.5, .04, .36, 0xe8dcc0); nb.position.set(-.9, 1.03, -1.1); nb.rotation.y = .3; g.add(nb); p.notebook = nb;
  p.glass = new THREE.Mesh(new THREE.CylinderGeometry(.08, .07, .22, 16), new THREE.MeshStandardMaterial({ color: 0xa8d8ff, transparent: true, opacity: .45, roughness: .05 })); p.glass.position.set(-1.6, 1.12, -1.3); g.add(p.glass);
  p.tapeRoll = new THREE.Mesh(new THREE.TorusGeometry(.08, .035, 10, 20), col(0xd8d0b0)); p.tapeRoll.rotation.x = Math.PI / 2; p.tapeRoll.position.set(-1.35, 1.05, -1.0); g.add(p.tapeRoll);
  // tape boxes: a stack that grows (180 hours)
  p.tapes = []; for (let i = 0; i < 48; i++) { const b = box(.42, .08, .42, [0xc8402a, 0x2a6a9a, 0xd8c040, 0x3a8a5a][i % 4]); const c = i % 4, r = Math.floor(i / 4); b.position.set(-2.4 + (c % 2) * .5, 1.05 + r * .085, -2.4 + Math.floor(c / 2) * .5); b.rotation.y = hash(i) * .3; g.add(b); p.tapes.push(b); }
  // camera on a tripod
  const tri = new THREE.Group(); tri.position.set(3.4, 0, .4); tri.rotation.y = -.8; g.add(tri); for (let k = 0; k < 3; k++) { const l = box(.04, 1.5, .04, 0x1a1a1a); l.position.set(Math.cos(k * 2.1) * .2, .72, Math.sin(k * 2.1) * .2); l.rotation.z = Math.cos(k * 2.1) * .15; l.rotation.x = -Math.sin(k * 2.1) * .15; tri.add(l); }
  const cbody = box(.4, .3, .5, 0x2a2a2a); cbody.position.y = 1.6; tri.add(outline(cbody, 1.05)); const lens = cyl(.1, .12, .3, 0x111111); lens.rotation.x = Math.PI / 2; lens.position.set(0, 1.6, .38); tri.add(lens);
  p.light = t => { p.reels.forEach((r, i) => r.rotation.y = -t * (i ? 3.2 : 2.6)); };
  return { g, p };
}

// ================= PRESS (printing rollers; the paper flies out) =================
export function press() {
  textures(); const g = new THREE.Group(), p = {};
  room(g, { floor: T.floor, back: T.comBack, left: T.comSide, right: T.comSide, ceil: T.ceil }, { ceilY: 6.5 });
  g.add(new THREE.HemisphereLight(0x6a5a8a, 0x2a1010, .8));
  const k = spot(0xffe8c0, 170, [-3, 6, 4], [0, 1.4, -1.5], .6, .5, true, 2048); g.add(k, k.target);
  p.rollers = []; for (let i = 0; i < 5; i++) { const r = cyl(.45, .45, 4, i % 2 ? 0x2a2a30 : 0x6a1a1a, 24, { metalness: .5, roughness: .4 }); r.rotation.z = Math.PI / 2; r.position.set(0, .9 + i * .55, -2.4 + (i % 2) * .5); g.add(outline(r, 1.02)); p.rollers.push(r); }
  const frameL = box(.3, 3.8, 1.6, 0x1a1a20); frameL.position.set(-2.2, 1.9, -2.1); g.add(frameL); const frameR = frameL.clone(); frameR.position.x = 2.2; g.add(frameR);
  p.sheets = []; for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(1.6, .8), new THREE.MeshStandardMaterial({ map: T.news, side: THREE.DoubleSide })); s.castShadow = true; g.add(s); p.sheets.push(s); }
  p.hero = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), new THREE.MeshStandardMaterial({ map: T.news, color: 0x9a9488, side: THREE.DoubleSide, roughness: .9 })); p.hero.castShadow = true; g.add(p.hero);
  p.light = t => { p.rollers.forEach((r, i) => r.rotation.x = t * (i % 2 ? -4 : 4)); p.sheets.forEach((s, i) => { const ph = (t * .35 + i / 6) % 1; s.position.set(0, .9 + ph * 3.2, -1.2 + ph * 2.8); s.rotation.set(-1.2 + ph * 1.0, ph * .6, 0); }); };
  return { g, p };
}

// ================= COMMISSION (a long crooked table, a balance scale) =================
export function commission() {
  textures(); const g = new THREE.Group(), p = {};
  room(g, { floor: T.floor, back: T.comBack, left: T.comSide, right: T.comSide, ceil: T.ceil }, { ceilY: 6.8 });
  g.add(new THREE.HemisphereLight(0x5a4a7a, 0x2a1010, .75));
  const hang = spot(0xffe0a0, 200, [0, 6, .5], [0, .9, -1.8], .55, .45, true, 2048); g.add(hang, hang.target);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(.6, .5, 8, 1, true), new THREE.MeshStandardMaterial({ color: 0x2a5a2a, emissive: 0x1a3a1a, side: THREE.DoubleSide })); shade.position.set(0, 4.2, -1.6); g.add(shade); const cord = box(.02, 2.4, .02, 0x0a0a0a); cord.position.set(0, 5.5, -1.6); g.add(cord);
  const table = box(5.6, .14, 1.4, 0x3a1a0e); table.position.set(0, 1.0, -2.2); table.rotation.z = -.04; g.add(outline(table, 1.02));
  const front = box(5.6, .9, .08, 0x2a120a); front.position.set(0, .5, -1.5); front.rotation.z = -.04; g.add(outline(front, 1.02));
  for (let i = 0; i < 7; i++) { const d = box(.42, .02, .56, 0xf0ead8); d.position.set(-2.2 + i * .72, 1.09, -2.0 + hash(i) * .2); d.rotation.y = hash(i * 3) - .5; g.add(d); }
  // balance scale: «свидетельства» vs «сомнения»
  const sc = new THREE.Group(); sc.position.set(0, 1.08, -1.9); g.add(sc); p.scale = sc;
  const post = box(.06, 1.2, .06, 0xc8a040, { metalness: .7, roughness: .3 }); post.position.y = .6; sc.add(post);
  const beamG = new THREE.Group(); beamG.position.y = 1.2; sc.add(beamG); p.beam = beamG;
  const bar = box(1.6, .05, .05, 0xc8a040, { metalness: .7, roughness: .3 }); beamG.add(bar);
  p.pans = []; for (const sd of [-1, 1]) { const pg = new THREE.Group(); pg.position.x = sd * .78; beamG.add(pg); const str = box(.01, .45, .01, 0x8a7a40); str.position.y = -.22; pg.add(str); const pan = cyl(.24, .18, .04, 0xc8a040, 20, { metalness: .7, roughness: .3 }); pan.position.y = -.46; pg.add(pan); p.pans.push(pg); }
  const papers = box(.3, .12, .22, 0xf0ead8); papers.position.y = -.39; p.pans[0].add(papers); const q = box(.12, .16, .12, 0xc8302a); q.position.y = -.36; p.pans[1].add(q);
  p.light = t => { p.pans.forEach(pg => pg.rotation.z = -p.beam.rotation.z); };
  return { g, p };
}

// ================= LECTURE (blackboard: expectations, the throat, the ventriloquist) =================
export function lecture() {
  textures(); const g = new THREE.Group(), p = {};
  room(g, { floor: T.floor, back: T.labBack, left: T.labSide, right: T.labSide, ceil: T.ceil }, { ceilY: 6.2 });
  g.add(new THREE.HemisphereLight(0x5a6a8a, 0x2a1a10, .85));
  const k = spot(0xfff0d0, 300, [3, 6, 4], [0, 1.6, -2.5], .55, .45, true, 2048); g.add(k, k.target);
  p.boardTex = textTex([['ОЖИДАНИЕ', 120, 'bold 70px Georgia', '#f0f0e8'], ['↓', 210, 'bold 80px Georgia', '#f2c94c'], ['ВОСПРИЯТИЕ', 310, 'bold 70px Georgia', '#f0f0e8'], ['↓', 390, 'bold 80px Georgia', '#f2c94c'], ['«Я ВИДЕЛ»', 480, 'italic bold 66px Georgia', '#ff8a7a']], 1024, 560, '#1a3a2a', '#f0f0e8');
  p.throatTex = textTex([['ГОЛОС  =  ?', 110, 'bold 70px Georgia', '#f0f0e8'], ['горло · диафрагма · подражание', 210, 'italic 48px Georgia', '#f2c94c']], 1024, 560, '#1a3a2a', '#f0f0e8', { extra: (x) => { x.strokeStyle = '#f0f0e8'; x.lineWidth = 6; x.beginPath(); x.ellipse(512, 400, 70, 110, 0, 0, 7); x.stroke(); x.beginPath(); x.moveTo(512, 290); x.lineTo(512, 200 + 40); x.stroke(); for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(640 + i * 30, 400, 20 + i * 18, -.8, .8); x.stroke(); } } });
  p.board = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.3), new THREE.MeshStandardMaterial({ map: p.boardTex, roughness: .9 })); p.board.position.set(0, 2.6, -4.1); p.board.rotation.z = .04; g.add(p.board);
  const bf = box(4.4, 2.5, .06, 0x3a200e); bf.position.set(0, 2.6, -4.15); bf.rotation.z = .04; g.add(bf);
  const podium = box(1.0, 1.1, .6, 0x4a2a14); podium.position.set(-2.4, .55, -1.6); podium.rotation.y = .3; g.add(outline(podium, 1.03));
  // a small wooden dummy for the ventriloquist
  const dummy = new THREE.Group(); dummy.position.set(1.8, 0, -1.4); g.add(dummy); p.dummy = dummy; const st = box(.4, .6, .4, 0x3a2a1a); st.position.y = .3; dummy.add(st); const db = cyl(.14, .18, .4, 0x2a2a6a); db.position.y = .8; dummy.add(outline(db, 1.06)); const dh = sph(.17, 0xe8c8a8); dh.position.y = 1.15; dummy.add(outline(dh, 1.05)); p.dummyJaw = box(.16, .05, .12, 0xe8c8a8); p.dummyJaw.position.set(0, 1.05, .06); dummy.add(p.dummyJaw); for (const sd of [-1, 1]) { const e = sph(.025, 0x000000); e.position.set(sd * .06, 1.18, .15); dummy.add(e); }
  p.light = t => {};
  return { g, p };
}

// ================= CINEMA (a crooked hall, the screen plays a dramatised demon fight) =================
export function cinema() {
  textures(); const g = new THREE.Group(), p = {};
  room(g, { floor: T.floor, back: T.cinBack, left: T.cinBack, right: T.cinBack, ceil: T.ceil }, { ceilY: 7 });
  g.add(new THREE.HemisphereLight(0x3a2a5a, 0x1a0a0a, .5));
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; p.scrCtx = c.getContext('2d'); p.scrTex = new THREE.CanvasTexture(c); p.scrTex.colorSpace = THREE.SRGBColorSpace;
  p.screen = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.5), new THREE.MeshBasicMaterial({ map: p.scrTex })); p.screen.position.set(0, 3.4, -4.1); p.screen.rotation.z = -.03; g.add(p.screen);
  const curtain = (sd) => { const m = box(1.4, 5.4, .2, 0x8a1010); m.position.set(sd * 4.3, 2.8, -4.0); m.rotation.z = sd * .05; g.add(outline(m, 1.02)); }; curtain(-1); curtain(1);
  const scrL = new THREE.SpotLight(0xd8e0ff, 120, 20, .7, .6, 1.2); scrL.position.set(0, 3.4, -3.5); scrL.target.position.set(0, 0, 5); g.add(scrL, scrL.target); p.scrL = scrL;
  const beam = new THREE.Mesh(new THREE.ConeGeometry(2.2, 9, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xd8e0ff, transparent: true, opacity: .07, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  beam.position.set(0, 4.6, .4); beam.rotation.x = -Math.PI / 2 - .12; g.add(beam);
  // rows of seats with audience heads
  for (let r = 0; r < 4; r++) for (let s = -4; s <= 4; s++) { const x = s * .82 + (r % 2) * .4, z = .6 + r * 1.2; const seat = box(.7, .9, .2, 0x6a1010); seat.position.set(x, .45 + r * .18, z); g.add(seat); if (hash(r * 9 + s) > .3) { const h = sph(.22, 0x0a0a10); h.position.set(x, 1.15 + r * .18, z - .2); g.add(h); } }
  p.light = t => {
    const x = p.scrCtx, w = 1024, h = 512, fl = .85 + .15 * Math.sin(t * 37) * Math.sin(t * 13);
    x.fillStyle = `rgb(${200 * fl},${200 * fl},${190 * fl})`; x.fillRect(0, 0, w, h);
    // a horned demon silhouette and two figures with raised crosses — stylised, theatrical
    const sway = Math.sin(t * 1.5) * 20; x.fillStyle = '#0a0a0a';
    x.beginPath(); x.moveTo(600 + sway, 470); x.lineTo(560 + sway, 200); x.lineTo(520 + sway, 120); x.lineTo(590 + sway, 170); x.lineTo(640 + sway, 90); x.lineTo(690 + sway, 170); x.lineTo(760 + sway, 120); x.lineTo(720 + sway, 200); x.lineTo(680 + sway, 470); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(615 + sway, 210, 9, 0, 7); x.arc(665 + sway, 210, 9, 0, 7); x.fill(); x.fillStyle = '#0a0a0a';
    for (const [bx, s] of [[230, 1], [360, -1]]) { x.beginPath(); x.ellipse(bx, 300, 34, 34, 0, 0, 7); x.fill(); x.fillRect(bx - 40, 330, 80, 140); x.fillRect(bx + 20, 220 + Math.sin(t * 3 + bx) * 10, 12, 120); x.fillRect(bx - 10, 250 + Math.sin(t * 3 + bx) * 10, 72, 12); }
    x.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 3; i++) x.fillRect((t * 400 * (i + 1)) % w, 0, 2, h);
    p.scrTex.needsUpdate = true; p.scrL.intensity = 120 * fl;
  };
  return { g, p };
}

// ================= EVIDENCE (five numbered exhibits on a long table) =================
export function evidence() {
  textures(); const g = new THREE.Group(), p = {};
  room(g, { floor: T.floor, back: T.evBack, left: T.evBack, right: T.evBack, ceil: T.ceil }, { ceilY: 6.4 });
  g.add(new THREE.HemisphereLight(0x3a4a7a, 0x1a1010, .45));
  const table = box(10, .14, 1.6, 0x2a160c); table.position.set(0, 1.0, -1.6); g.add(outline(table, 1.01));
  const front = box(10, .9, .06, 0x1a0e08); front.position.set(0, .5, -.82); g.add(front);
  p.ex = []; p.spots = [];
  const X = [-4, -2, 0, 2, 4];
  X.forEach((x, i) => { const s = spot(0xffe8c0, 0, [x, 5.6, 1], [x, 1.1, -1.6], .28, .4, true, 1024); g.add(s, s.target); p.spots.push(s);
    const card = new THREE.Mesh(new THREE.PlaneGeometry(.5, .5), new THREE.MeshStandardMaterial({ map: textTex([[String(i + 1), 300, 'bold 300px Georgia', '#f0e8d0']], 512, 400, '#8a1a1a') })); card.position.set(x - .55, 1.33, -1.0); card.rotation.x = -.6; g.add(card); });
  // 1: tiny house · 2: statement + mini chair · 3: notebook + tape reel · 4: card «розыгрыш?» · 5: a big question mark
  const e1 = new THREE.Group(); e1.position.set(X[0], 1.07, -1.6); g.add(e1); const hb = box(.7, .55, .5, 0x8a3a24); hb.position.y = .28; e1.add(outline(hb, 1.04)); const roof = new THREE.Mesh(new THREE.ConeGeometry(.55, .4, 4), col(0x2a1a1a)); roof.position.y = .75; roof.rotation.y = Math.PI / 4; e1.add(outline(roof, 1.04)); const w1 = new THREE.Mesh(new THREE.PlaneGeometry(.15, .15), emis(0xffb850, 2)); w1.position.set(.15, .35, .26); e1.add(w1);
  const e2 = new THREE.Group(); e2.position.set(X[1], 1.08, -1.6); g.add(e2); const pp = new THREE.Mesh(new THREE.PlaneGeometry(.75, .5), new THREE.MeshStandardMaterial({ map: T.paper })); pp.rotation.x = -Math.PI / 2; pp.position.set(-.1, .01, .1); e2.add(pp); const mc = box(.12, .3, .12, 0xd8501c); mc.position.set(.35, .15, -.2); e2.add(outline(mc, 1.1));
  const e3 = new THREE.Group(); e3.position.set(X[2], 1.08, -1.6); g.add(e3); const nb = box(.5, .05, .36, 0xe8dcc0); nb.position.set(-.15, .03, .05); e3.add(nb); const rl = cyl(.2, .2, .04, 0x1a1a1a, 24); rl.position.set(.3, .03, -.1); e3.add(rl);
  const e4 = new THREE.Group(); e4.position.set(X[3], 1.08, -1.6); g.add(e4); const cd = new THREE.Mesh(new THREE.PlaneGeometry(.6, .4), new THREE.MeshStandardMaterial({ map: textTex([['розыгрыш?', 150, 'italic bold 90px Georgia', '#1a1612']], 512, 300, '#f0e8d0') })); cd.rotation.x = -1.1; cd.position.y = .2; e4.add(cd);
  const e5 = new THREE.Group(); e5.position.set(X[4], 1.08, -1.6); g.add(e5); const qm = new THREE.Mesh(new THREE.TorusGeometry(.22, .06, 12, 30, Math.PI * 1.4), emis(0xf2c94c, .8)); qm.position.y = .75; qm.rotation.z = -.6; e5.add(qm); const qs = box(.1, .25, .1, 0xf2c94c); qs.material = emis(0xf2c94c, .8); qs.position.y = .38; e5.add(qs); const qd = sph(.07, 0xf2c94c); qd.material = emis(0xf2c94c, .8); qd.position.y = .12; e5.add(qd); p.qm = e5;
  p.X = X;
  p.light = (t, act = [1, 1, 1, 1, 1]) => { p.spots.forEach((s, i) => s.intensity = 130 * act[i]); p.qm.rotation.y = t * .6; };
  return { g, p };
}
