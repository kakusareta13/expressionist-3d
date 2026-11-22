// «Энфилд» — expressionist 3D test (16 s). A crooked Caligari room painted with swirling, vivid brushwork; real light and
// shadows; a cartoon policewoman; the camera keeps moving and cuts every 2–3 s. Deterministic: everything is a function of t.
import * as THREE from 'three';
import { makePost } from '../../src/post.js';

const W = 1920, H = 1080;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v)), seg = (t, a, b) => clamp((t - a) / (b - a)), lerp = (a, b, k) => a + (b - a) * k;
const eio = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const hash = n => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
let sd = 11; const rnd = () => (sd = sd * 16807 % 2147483647) / 2147483647;
const KNOCKS = [1.2, 2.7, 3.0, 3.3, 3.6], SLIDE = [9.0, 11.0], DOOR = 4.1;

// ---------------- painted textures: swirling flow-field strokes + Caligari painted shadows and light wedges
function swirlTex(w, h, base, cols, seed, extra) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, w, h);
  const ang = (px, py) => Math.sin(px * .006 + seed) * 1.7 + Math.cos(py * .007 - seed * .5) * 1.7 + Math.sin((px + py) * .0031 + seed * 2) * 1.3;
  const N = Math.floor(w * h / 1500); x.lineCap = 'round';
  for (let i = 0; i < N; i++) {
    let px = rnd() * w, py = rnd() * h; const L = 14 + rnd() * 22, col = cols[Math.floor(rnd() * cols.length)];
    x.strokeStyle = col; x.globalAlpha = .3 + rnd() * .4; x.lineWidth = 10 + rnd() * 18; x.beginPath(); x.moveTo(px, py);
    for (let k = 0; k < L; k++) { const a = ang(px, py); px += Math.cos(a) * 7; py += Math.sin(a) * 7; x.lineTo(px, py); }
    x.stroke();
  }
  x.globalAlpha = 1; if (extra) extra(x, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
const jag = (x, pts, col, a = 1) => { x.globalAlpha = a; x.fillStyle = col; x.beginPath(); pts.forEach(([p, q], i) => i ? x.lineTo(p, q) : x.moveTo(p, q)); x.closePath(); x.fill(); x.globalAlpha = 1; };
const zig = (x, x0, y0, x1, y1, n, amp, col, lw, a) => { x.globalAlpha = a; x.strokeStyle = col; x.lineWidth = lw; x.lineJoin = 'miter'; x.beginPath(); for (let i = 0; i <= n; i++) { const k = i / n, px = x0 + (x1 - x0) * k, py = y0 + (y1 - y0) * k + (i % 2 ? amp : -amp); i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); x.globalAlpha = 1; };
const backTex = swirlTex(2048, 1280, '#1a1f4a', ['#26307a', '#2e3f92', '#1a2560', '#3a2a6a', '#141838'], 1.3, (x, w, h) => {
  for (let k = 0; k < 9; k++) { x.globalAlpha = .22; x.strokeStyle = '#f2d060'; x.lineWidth = 6; x.beginPath(); x.moveTo(1500, 450); x.lineTo(k * 260 - 200, h); x.stroke(); }
  zig(x, 0, 120, w, 60, 22, 26, '#05060f', 14, .7); zig(x, 0, 1180, w, 1150, 18, 30, '#05060f', 18, .6);
  // painted light wedge from the window and a jagged painted shadow of a cross
  jag(x, [[1300, 330], [1700, 330], [1900, 1280], [900, 1280]], '#f2c94c', .28);
  jag(x, [[1450, 600], [1520, 600], [1560, 1280], [1390, 1280]], '#05060f', .7);
  jag(x, [[200, 0], [520, 0], [380, 420], [440, 430], [260, 900], [300, 500], [230, 490]], '#05060f', .85);
  jag(x, [[0, 1100], [700, 980], [1100, 1280], [0, 1280]], '#05060f', .6);
});
const leftTex = swirlTex(1536, 1280, '#3a1018', ['#6a1a24', '#7a2230', '#4a1222', '#8a3a2a', '#2a0a14'], 4.2, (x, w, h) => {
  zig(x, 0, 140, w, 90, 16, 24, '#05060f', 14, .7);
  jag(x, [[900, 0], [1200, 0], [1000, 700], [1100, 720], [800, 1280], [700, 1280], [880, 760], [780, 740]], '#05060f', .8);
});
const rightTex = swirlTex(1536, 1280, '#12302a', ['#1a5040', '#22604a', '#0e3a30', '#3a6a4a', '#08201a'], 7.7, (x, w, h) => {
  zig(x, 0, 160, w, 120, 16, 24, '#05060f', 14, .7);
  jag(x, [[0, 300], [600, 520], [600, 600], [0, 420]], '#05060f', .6);
});
const floorTex = swirlTex(2048, 2048, '#3a2014', ['#6a3418', '#7a4020', '#4a2410', '#8a5228', '#2a140a'], 9.1, (x, w, h) => {
  for (let i = -6; i < 14; i++) jag(x, [[i * 200, 0], [i * 200 + 90, 0], [i * 200 + 600, h], [i * 200 + 470, h]], i % 2 ? '#f0c040' : '#05060f', i % 2 ? .16 : .32);
});
const ceilTex = swirlTex(1024, 1024, '#0a0a18', ['#141a3a', '#1a1030', '#0a2a2a'], 3.3);

// ---------------- renderer, scene, post
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H); renderer.setPixelRatio(1); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
document.getElementById('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x0a0c1a, .045);
const camera = new THREE.PerspectiveCamera(40, W / H, .05, 60);
const post = makePost(renderer, scene, camera, W, H, { ssaa: 1, ao: true, aoAmt: .7 });
post.bloom.strength = .45; post.bloom.radius = .6; post.bloom.threshold = .82;
const VU = post.vig.material ? post.vig.material.uniforms : post.vig.uniforms; VU.amt.value = .55; VU.sat.value = 1.2; VU.contrast.value = .12;

const mat = (map, o = {}) => new THREE.MeshStandardMaterial({ map, roughness: .9, metalness: 0, side: THREE.DoubleSide, ...o });
function shapeMesh(pts, m, holes = []) {
  const s = new THREE.Shape(pts.map(p => new THREE.Vector2(...p)));
  for (const hpts of holes) s.holes.push(new THREE.Path(hpts.map(p => new THREE.Vector2(...p))));
  const g = new THREE.ShapeGeometry(s); const pos = g.attributes.position, uv = g.attributes.uv;
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - x0) / (x1 - x0), (pos.getY(i) - y0) / (y1 - y0));
  const me = new THREE.Mesh(g, m); me.receiveShadow = true; return me;
}
const outline = (mesh, k = 1.06) => { const o = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide })); o.scale.setScalar(k); mesh.add(o); return mesh; };
const box = (w, h, d, color, o = {}) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color, roughness: .85, ...o })); m.castShadow = m.receiveShadow = true; return m; };

// ---------------- the crooked room (floor y=0, back wall at z≈-4, door in the left wall)
const room = new THREE.Group(); scene.add(room);
const floor = shapeMesh([[-5, -4.4], [5.4, -4.0], [5.0, 4], [-5.4, 4]], mat(floorTex)); floor.rotation.x = -Math.PI / 2; room.add(floor);
const winHole = [[1.0, 1.9], [2.9, 2.2], [2.6, 4.0], [1.4, 4.3], [1.15, 3.2]];
const back = shapeMesh([[-5.6, 0], [5.8, 0], [5.4, 6.2], [-5.2, 6.4]], mat(backTex), [winHole]); back.position.z = -4.1; back.rotation.y = .05; room.add(back);
const left = shapeMesh([[-5.0, 0], [-.75, 0], [-.6, 3.75], [.7, 3.95], [.85, 0], [4.6, 0], [4.6, 6.4], [-4.8, 5.2]], mat(leftTex));
left.rotation.y = Math.PI / 2; left.position.x = -4.6; left.rotation.z = .06; room.add(left);
const right = shapeMesh([[-5.0, 0], [4.6, 0], [4.6, 5.8], [-5.0, 6.6]], mat(rightTex)); right.rotation.y = -Math.PI / 2; right.position.x = 4.9; right.rotation.z = -.05; room.add(right);
const ceil = shapeMesh([[-5, -4.4], [5.4, -4.0], [5.0, 4], [-5.4, 4]], mat(ceilTex)); ceil.rotation.x = Math.PI / 2; ceil.position.y = 5.9; room.add(ceil);
// swirling night sky behind the jagged window (animated)
const skyMat = new THREE.ShaderMaterial({ uniforms: { t: { value: 0 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: `varying vec2 vUv; uniform float t;
    void main(){ vec2 p = vUv - vec2(.62,.7); float r = length(p), a = atan(p.y,p.x);
      float sw = sin(a*3. - r*18. + t*1.2) * .5 + .5, sw2 = sin(a*5. + r*30. - t*.8) * .5 + .5;
      vec3 c = mix(vec3(.05,.12,.35), vec3(.1,.35,.6), sw); c = mix(c, vec3(.9,.8,.3), smoothstep(.12,.0,r) + .25*sw2*smoothstep(.5,.0,r));
      c += vec3(.9,.85,.5) * smoothstep(.09,.06,r); gl_FragColor = vec4(c*1.4, 1.); }` });
const sky = new THREE.Mesh(new THREE.PlaneGeometry(5, 4), skyMat); sky.position.set(2.1, 3.0, -4.9); room.add(sky);
// moonlight through the window, warm floor lamp, door light, weak cold fill
const moon = new THREE.SpotLight(0x9ab8ff, 140, 22, .5, .6, 1.4); moon.position.set(2.2, 3.4, -5.5); moon.target.position.set(.6, 0, 1.4); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); moon.shadow.bias = -.0004; room.add(moon, moon.target);
const lamp = new THREE.PointLight(0xffa040, 30, 14, 1.6); lamp.position.set(-3.1, 2.75, -2.7); lamp.castShadow = true; lamp.shadow.mapSize.set(1024, 1024); lamp.shadow.bias = -.002; room.add(lamp);
const doorL = new THREE.SpotLight(0xffc070, 0, 16, .55, .5, 1.3); doorL.position.set(-6.3, 2.4, -.1); doorL.target.position.set(-1.5, 0, .5); doorL.castShadow = true; doorL.shadow.mapSize.set(1024, 1024); room.add(doorL, doorL.target);
scene.add(new THREE.HemisphereLight(0x4a5aaa, 0x3a1810, .9));
// a hard theatrical beam raking the back wall: the stark diagonal light of Caligari
const beam = new THREE.SpotLight(0xffe0a0, 220, 20, .32, .15, 1.2); beam.position.set(-3.5, 5.6, 2.5); beam.target.position.set(.6, 2.2, -4.1); beam.castShadow = true; beam.shadow.mapSize.set(2048, 2048); room.add(beam, beam.target);
// door leaf (hinged at its back edge), the hall behind it glowing
const doorPivot = new THREE.Group(); doorPivot.position.set(-4.55, 0, .75); room.add(doorPivot);
const doorLeaf = box(.08, 3.75, 1.35, 0x3a1a10); doorLeaf.position.set(0, 1.87, -.68); doorLeaf.rotation.x = -.03; doorPivot.add(outline(doorLeaf, 1.03));
const hall = new THREE.Mesh(new THREE.PlaneGeometry(2, 4.2), new THREE.MeshBasicMaterial({ color: 0xffb860 })); hall.position.set(-6.6, 2, .1); hall.scale.set(1.6, 1.2, 1); hall.rotation.y = Math.PI / 2; room.add(hall);
// crooked floor lamp
const lampG = new THREE.Group(); lampG.position.set(-3.1, 0, -2.7); room.add(lampG);
const pole = box(.07, 2.6, .07, 0x0a0a0a); pole.position.y = 1.3; pole.rotation.z = .12; lampG.add(pole);
const shade = new THREE.Mesh(new THREE.ConeGeometry(.55, .6, 6, 1, true), new THREE.MeshStandardMaterial({ color: 0xffd080, emissive: 0xffa040, emissiveIntensity: 1.6, side: THREE.DoubleSide })); shade.position.set(.15, 2.75, 0); shade.rotation.z = -.2; lampG.add(shade);
// sofa (crooked), a staircase climbing crookedly at the right, a picture frame hanging askew
const sofa = new THREE.Group(); sofa.position.set(-1.6, 0, -3.2); sofa.rotation.y = .1; room.add(sofa);
const sb = box(2.8, .55, 1.0, 0x1c5a3a); sb.position.y = .45; sofa.add(outline(sb, 1.02)); const sk = box(2.9, 1.05, .25, 0x226a44); sk.position.set(0, .9, -.45); sk.rotation.z = .05; sofa.add(outline(sk, 1.02));
for (let i = 0; i < 9; i++) { const st = box(1.4, .22, .55, i % 2 ? 0x3a1a2a : 0x5a2234); st.position.set(4.0 - i * .05, .11 + i * .42, 1.6 - i * .52); st.rotation.y = i * .035; st.rotation.z = i * .02; room.add(st); }
const frame = box(.9, 1.2, .06, 0x2a1408); frame.position.set(-1.4, 3.2, -4.0); frame.rotation.z = .22; room.add(outline(frame, 1.04));
const pic = new THREE.Mesh(new THREE.PlaneGeometry(.7, 1.0), new THREE.MeshStandardMaterial({ map: swirlTex(256, 360, '#2a3a1a', ['#c8a030', '#6a8a2a', '#1a2a10', '#e8d070'], 2.2) })); pic.position.set(-1.4, 3.2, -3.96); pic.rotation.z = .22; room.add(pic);

// ---------------- the chair: tall, thin, legs splayed — an expressionist prop
const chair = new THREE.Group(); room.add(chair);
const cc = 0xd8501c, cd = 0x7a2a10;
const seat = box(.62, .08, .6, cc); seat.position.y = .62; chair.add(outline(seat, 1.05));
const backrest = box(.56, 1.05, .06, cc); backrest.position.set(0, 1.2, -.27); backrest.rotation.x = -.12; backrest.rotation.z = .04; chair.add(outline(backrest, 1.04));
const slat = box(.44, .14, .07, 0xf2c94c); slat.position.set(0, 1.5, -.31); slat.rotation.x = -.12; chair.add(slat);
for (const [lx, lz, a, b] of [[-.27, .26, .12, -.12], [.27, .26, -.12, -.12], [-.27, -.26, .12, .12], [.27, -.26, -.12, .12]]) { const l = box(.05, .66, .05, cd); l.position.set(lx, .31, lz); l.rotation.z = a; l.rotation.x = b; chair.add(outline(l, 1.15)); }

// ---------------- the policewoman: cartoon figure (round head, dot eyes, cap), walk cycle
const pw = new THREE.Group(); room.add(pw);
const coat = new THREE.Mesh(new THREE.CylinderGeometry(.2, .36, 1.25, 10), new THREE.MeshStandardMaterial({ color: 0x1a2244, roughness: .95 })); coat.position.y = 1.18; coat.castShadow = true; pw.add(outline(coat, 1.05));
const head = new THREE.Group(); head.position.y = 2.02; pw.add(head);
const skull = new THREE.Mesh(new THREE.SphereGeometry(.24, 24, 18), new THREE.MeshStandardMaterial({ color: 0xc8b09a, roughness: .95 })); skull.castShadow = true; head.add(outline(skull, 1.06));
for (const sx of [-.08, .08]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.032, 10, 8), new THREE.MeshBasicMaterial({ color: 0x000000 })); e.position.set(sx, .03, .22); head.add(e); }
const capB = new THREE.Mesh(new THREE.CylinderGeometry(.25, .25, .16, 20), new THREE.MeshStandardMaterial({ color: 0x0c0e1c })); capB.position.y = .2; head.add(capB);
const band = new THREE.Mesh(new THREE.CylinderGeometry(.252, .252, .05, 20), new THREE.MeshStandardMaterial({ color: 0xe8e8f0 })); band.position.y = .16; head.add(band);
const visor = new THREE.Mesh(new THREE.CylinderGeometry(.28, .28, .03, 20, 1, false, -.9, 1.8), new THREE.MeshStandardMaterial({ color: 0x050508 })); visor.position.set(0, .12, .05); head.add(visor);
const limb = (len, r, color) => { const g = new THREE.Group(); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * .8, len, 8), new THREE.MeshStandardMaterial({ color })); m.position.y = -len / 2; m.castShadow = true; g.add(outline(m, 1.2)); return g; };
const legL = limb(.62, .045, 0x0a0a12), legR = limb(.62, .045, 0x0a0a12); legL.position.set(-.1, .6, 0); legR.position.set(.1, .6, 0); pw.add(legL, legR);
const armL = limb(.75, .04, 0x141a34), armR = limb(.75, .04, 0x141a34); armL.position.set(-.24, 1.72, 0); armR.position.set(.24, 1.72, 0); armL.rotation.z = -.15; armR.rotation.z = .15; pw.add(armL, armR);

// ---------------- dust burst on knocks
const KP = [[-.6, 3.1], [-1.3, 2.6], [.0, 3.6], [-.8, 2.2], [.5, 2.9]];
const dustGeo = new THREE.BufferGeometry(), DN = 400; dustGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DN * 3), 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffe0b0, size: .05, transparent: true, opacity: .9 })); room.add(dust);
const motes = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(300 * 3), 3)), new THREE.PointsMaterial({ color: 0xb8c8ff, size: .012, transparent: true, opacity: .7 })); room.add(motes);

// ---------------- shots: camera position, look-at, fov, dutch roll — keys at shot start and end
const SHOTS = [
  [0.0, [3.4, 1.4, 5.2], [-.6, 2.4, -3.8], [1.8, 1.9, 2.6], [-.6, 2.6, -3.8], 42, -.06],        // slow push into the dark room
  [2.55, [-.2, 2.6, -1.2], [-.6, 2.8, -4.1], [-.4, 2.8, -2.0], [-.6, 2.8, -4.1], 38, .1],          // close on the wall: four knocks
  [4.0, [-1.0, .5, 3.2], [-4.4, 1.9, .0], [-1.3, .55, 2.8], [-3.6, 1.9, .3], 52, -.12],            // low angle: the door opens, she comes in
  [6.4, [-4.3, 2.6, 3.9], [.3, 1.0, -.2], [-3.7, 2.5, 3.3], [.6, .8, -.4], 42, .08],               // over her shoulder toward the chair
  [8.6, [3.4, 1.2, 3.0], [.4, .7, .6], [4.3, 1.3, 1.2], [1.8, .7, -1.0], 38, -.12],                   // tracking beside the chair as it slides
  [11.3, [.6, 5.0, 4.6], [.2, .4, -.8], [.9, 4.4, 4.0], [.4, .5, -.9], 46, .2],                    // high, tilted wide: it stopped
  [13.2, [3.2, 1.0, 2.4], [1.6, .9, -1.0], [2.5, 1.0, 1.0], [1.6, 1.0, -1.0], 36, -.18],           // slow push on the chair, dutch
];
const CAPS = [[.6, 3.9, 'Лондон, тысяча девятьсот семьдесят седьмой год.'], [4.1, 8.3, 'Полицейская слышит четыре отчётливых удара в стене.'], [8.5, 13.0, 'Затем стул скользнул по полу в сторону стены.'], [13.2, 15.4, 'Что именно там происходило?']];
const LINE = document.getElementById('line'), BIG = document.getElementById('big'), FADE = document.getElementById('fade');

window.render = t => {
  // shot + camera
  let i = SHOTS.length - 1; while (i > 0 && SHOTS[i][0] > t) i--; const s = SHOTS[i], t1 = i + 1 < SHOTS.length ? SHOTS[i + 1][0] : 16, u = eio((t - s[0]) / (t1 - s[0]));
  const P = new THREE.Vector3().lerpVectors(new THREE.Vector3(...s[1]), new THREE.Vector3(...s[3]), u), L = new THREE.Vector3().lerpVectors(new THREE.Vector3(...s[2]), new THREE.Vector3(...s[4]), u);
  let sh = 0; for (const k of [...KNOCKS, 11.7]) { const d = t - k; if (d > 0 && d < .25) sh += (1 - d / .25) * (k === 11.7 ? .06 : .035); }
  P.x += Math.sin(t * 83) * sh; P.y += Math.cos(t * 71) * sh;
  camera.position.copy(P); camera.fov = s[5]; camera.updateProjectionMatrix(); camera.up.set(0, 1, 0); camera.lookAt(L); camera.rotateZ(s[6] + Math.sin(t * .7) * .01);
  post.dof.focus = Math.max(.5, P.distanceTo(L) * .9); post.dof.aper = 3; post.dof.maxCoc = 10;
  // lamp flicker on each knock; the sky swirls
  let fl = 0; for (const k of KNOCKS) { const d = t - k; if (d > 0 && d < .4) fl = Math.max(fl, 1 - d / .4); }
  lamp.intensity = 30 * (1 - .8 * fl) * (.92 + .08 * Math.sin(t * 17) * Math.sin(t * 5.3)); shade.material.emissiveIntensity = 1.6 * (1 - .7 * fl);
  skyMat.uniforms.t.value = t;
  // door opens at DOOR, hall light floods in
  const dk = eio(seg(t, DOOR, DOOR + 1.0)); doorPivot.rotation.y = 1.2 * dk; doorL.intensity = 70 * dk;
  // the policewoman walks in from the hall, stops, turns toward the wall, then to the chair
  const wk = seg(t, DOOR + .25, 7.2), walking = t > DOOR + .25 && t < 7.2;
  pw.position.set(lerp(-5.0, -2.3, wk), 0, lerp(.1, 1.2, wk)); pw.visible = t > DOOR + .2;
  const ph = t * 7.5; legL.rotation.x = walking ? Math.sin(ph) * .5 : 0; legR.rotation.x = walking ? -Math.sin(ph) * .5 : 0; armL.rotation.x = walking ? -Math.sin(ph) * .4 : 0; armR.rotation.x = walking ? Math.sin(ph) * .4 : .0;
  pw.position.y = walking ? Math.abs(Math.sin(ph)) * .04 : 0;
  pw.rotation.y = walking ? 1.35 : lerp(1.35, .55, eio(seg(t, 7.2, 8.0)));
  head.rotation.y = t > 8.8 ? lerp(0, .35, eio(seg(t, 8.8, 9.6))) : 0; head.rotation.z = t > 11.7 ? .12 * eio(seg(t, 11.7, 12.3)) : 0;
  if (t > 11.7) armR.rotation.x = -.9 * eio(seg(t, 11.7, 12.2));   // she lifts her hand: what was that?
  // the chair: wobble, then slides toward the back wall
  const sp = eio(seg(t, SLIDE[0], SLIDE[1])), wob = t > SLIDE[0] - .9 && t < SLIDE[0] ? Math.sin(t * 34) * .05 : 0;
  chair.position.set(lerp(.2, 1.9, sp), 0, lerp(1.0, -1.2, sp)); chair.rotation.set(wob * .6, -.5 + .25 * sp, wob);
  // dust bursts from the wall at each knock; motes drift in the moonlight
  const dp = dustGeo.attributes.position.array;
  for (let j = 0; j < DN; j++) { const ki = j % 5, d = t - KNOCKS[ki]; const live = d > 0 && d < 1.6; const a = hash(j * 1.7) * 6.28, r = (.1 + hash(j * 3.3) * .7) * Math.sqrt(Math.max(0, d)) * 1.4;
    dp[j * 3] = live ? KP[ki][0] + Math.cos(a) * r : 0; dp[j * 3 + 1] = live ? KP[ki][1] + Math.sin(a) * r * .6 - d * d * .8 : -9; dp[j * 3 + 2] = live ? -4.0 + hash(j) * .5 * r : 0; }
  dustGeo.attributes.position.needsUpdate = true;
  const mp = motes.geometry.attributes.position.array;
  for (let j = 0; j < 300; j++) { mp[j * 3] = .2 + hash(j) * 2.8 + Math.sin(t * .3 + j) * .15; mp[j * 3 + 1] = ((hash(j * 2) * 4 + t * (.05 + hash(j * 5) * .08)) % 4); mp[j * 3 + 2] = -3.6 + hash(j * 3) * 4.5; }
  motes.geometry.attributes.position.needsUpdate = true;
  post.composer.render();
  // captions: a sentence on top, the current word huge below (word timing spread across the caption)
  const c = CAPS.find(c => t >= c[0] && t < c[1]);
  if (c) { const ws = c[2].replace(/[.,]/g, '').split(' '), k = Math.min(ws.length - 1, Math.floor((t - c[0]) / ((c[1] - c[0] - .4) / ws.length))); LINE.textContent = c[2]; BIG.textContent = ws[k].toUpperCase(); const wt = (t - c[0]) % ((c[1] - c[0] - .4) / ws.length); BIG.style.transform = `scale(${1 + .18 * Math.max(0, 1 - wt * 8)})`; }
  else { LINE.textContent = ''; BIG.textContent = ''; }
  FADE.style.opacity = Math.max(1 - seg(t, 0, .7), seg(t, 15.3, 16));
};
window.DUR = 16; window.render(0); window.READY = true;
