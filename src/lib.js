// Shared helpers for «Энфилд» (expressionist 3D): painted swirl textures, crooked wall shapes, outlines, boxes, easing.
import * as THREE from 'three';

export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const lerp = (a, b, k) => a + (b - a) * k;
export const eio = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const eo = t => 1 - Math.pow(1 - clamp(t), 3);
export const back = (t, s = 1.7) => { t = clamp(t) - 1; return 1 + t * t * ((s + 1) * t + s); };
export const hash = n => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
let sd = 11; export const rnd = () => (sd = sd * 16807 % 2147483647) / 2147483647;
export const reseed = s => { sd = s; };

// painted texture: base colour, flow-field brush strokes (Van Gogh swirl), then extra painted geometry (Caligari)
export function swirlTex(w, h, base, cols, seed, extra, o = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, w, h); reseed(Math.floor(seed * 1000) + 7);
  const f = o.freq ?? 1, ang = (px, py) => Math.sin(px * .006 * f + seed) * 1.7 + Math.cos(py * .007 * f - seed * .5) * 1.7 + Math.sin((px + py) * .0031 * f + seed * 2) * 1.3;
  const N = Math.floor(w * h / (o.density ?? 1500)); x.lineCap = 'round';
  for (let i = 0; i < N; i++) {
    let px = rnd() * w, py = rnd() * h; const L = 14 + rnd() * 22, col = cols[Math.floor(rnd() * cols.length)];
    x.strokeStyle = col; x.globalAlpha = .3 + rnd() * .4; x.lineWidth = (o.lw ?? 10) + rnd() * (o.lw2 ?? 18); x.beginPath(); x.moveTo(px, py);
    for (let k = 0; k < L; k++) { const a = ang(px, py); px += Math.cos(a) * 7; py += Math.sin(a) * 7; x.lineTo(px, py); }
    x.stroke();
  }
  x.globalAlpha = 1; if (extra) extra(x, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
export const jag = (x, pts, col, a = 1) => { x.globalAlpha = a; x.fillStyle = col; x.beginPath(); pts.forEach(([p, q], i) => i ? x.lineTo(p, q) : x.moveTo(p, q)); x.closePath(); x.fill(); x.globalAlpha = 1; };
export const zig = (x, x0, y0, x1, y1, n, amp, col, lw, a) => { x.globalAlpha = a; x.strokeStyle = col; x.lineWidth = lw; x.lineJoin = 'miter'; x.beginPath(); for (let i = 0; i <= n; i++) { const k = i / n, px = x0 + (x1 - x0) * k, py = y0 + (y1 - y0) * k + (i % 2 ? amp : -amp); i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); x.globalAlpha = 1; };
export const rays = (x, cx, cy, n, spread, len, col, lw, a) => { x.globalAlpha = a; x.strokeStyle = col; x.lineWidth = lw; for (let k = 0; k < n; k++) { const an = Math.PI / 2 - spread / 2 + spread * k / (n - 1); x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(an) * len * (k % 2 ? 1 : .8), cy + Math.sin(an) * len); x.stroke(); } x.globalAlpha = 1; };

export const mat = (map, o = {}) => new THREE.MeshStandardMaterial({ map, roughness: .9, metalness: 0, side: THREE.DoubleSide, ...o });
export const col = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .85, ...o });
// a flat polygon (crooked wall/floor) with UVs spanning its bounding box; holes optional
export function shapeMesh(pts, m, holes = []) {
  const s = new THREE.Shape(pts.map(p => new THREE.Vector2(...p)));
  for (const hp of holes) s.holes.push(new THREE.Path(hp.map(p => new THREE.Vector2(...p))));
  const g = new THREE.ShapeGeometry(s), pos = g.attributes.position, uv = g.attributes.uv;
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - x0) / (x1 - x0), (pos.getY(i) - y0) / (y1 - y0));
  const me = new THREE.Mesh(g, m); me.receiveShadow = true; return me;
}
const INK = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
export const outline = (mesh, k = 1.06) => { const o = new THREE.Mesh(mesh.geometry, INK); o.scale.setScalar(k); o.raycast = () => {}; mesh.add(o); return mesh; };
export function box(w, h, d, color, o = {}) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'object' && color.isMaterial ? color : col(color, o)); m.castShadow = m.receiveShadow = true; return m; }
export function cyl(rt, rb, h, color, seg = 16, o = {}) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), col(color, o)); m.castShadow = m.receiveShadow = true; return m; }
export function sph(r, color, o = {}) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 18), col(color, o)); m.castShadow = true; return m; }
export function cap(r, len, color, o = {}) { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, 12), col(color, o)); m.castShadow = true; return m; }
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
