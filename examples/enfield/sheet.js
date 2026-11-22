// Character line-up for approval: the cast on a crooked painted stage, each in a small characteristic pose.
import * as THREE from 'three';
import { makePost } from '../../src/post.js';
import { swirlTex, zig, rays, mat, shapeMesh } from '../../src/lib.js';
import { makeChar, CAST } from '../../src/chars.js';

export function setup(which) {
  const W = 1920, H = 1080;
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .9;
  document.getElementById('stage').appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x07070f);
  const camera = new THREE.PerspectiveCamera(which === 'b' ? 38 : 30, W / H, .1, 80);
  const post = makePost(renderer, scene, camera, W, H, { ssaa: 1, ao: true, aoAmt: .6 });
  post.bloom.strength = .2; post.bloom.threshold = 1.0; const VU = post.vig.material ? post.vig.material.uniforms : post.vig.uniforms; VU.amt.value = .5; VU.sat.value = 1.15;
  // backdrop + floor
  const bg = swirlTex(2048, 1024, '#1a1f4a', ['#26307a', '#2e3f92', '#1a2560', '#5a2a6a', '#141838', '#0f5a5a'], 2.1, (x, w, h) => { rays(x, w / 2, -200, 15, 1.4, 1600, '#f2d060', 8, .18); zig(x, 0, 90, w, 60, 26, 24, '#05060f', 14, .6); });
  const back = shapeMesh([[-9, 0], [9, 0], [8.4, 7], [-8.6, 7.6]], mat(bg)); back.position.z = -2.4; scene.add(back);
  const fl = swirlTex(2048, 1024, '#3a2014', ['#6a3418', '#7a4020', '#4a2410', '#8a5228', '#2a140a'], 5.3, (x, w, h) => { for (let i = -6; i < 16; i++) { x.globalAlpha = .22; x.fillStyle = i % 2 ? '#f0c040' : '#05060f'; x.beginPath(); x.moveTo(i * 180, 0); x.lineTo(i * 180 + 80, 0); x.lineTo(i * 180 + 420, h); x.lineTo(i * 180 + 300, h); x.fill(); } x.globalAlpha = 1; });
  const floor = shapeMesh([[-9, -2.4], [9, -2.4], [9, 4], [-9, 4]], mat(fl)); floor.rotation.x = -Math.PI / 2; scene.add(floor);
  scene.add(new THREE.HemisphereLight(0x6a7ac0, 0x3a1a10, .8));
  const key = new THREE.SpotLight(0xffe2b0, 260, 30, .85, .5, 1.3); key.position.set(-4, 7, 6); key.target.position.set(0, 1, 0); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); scene.add(key, key.target);
  const rim = new THREE.SpotLight(0x8ab0ff, 200, 25, .6, .5, 1.3); rim.position.set(5, 5, -2); rim.target.position.set(0, 1, 0); scene.add(rim, rim.target);
  // the cast
  const names = which === 'b' ? ['grosse', 'playfair', 'photo', 'reporter', 'french', 'ventro', 'judge'] : ['police', 'mother', 'girl13', 'girl11'];
  const poses = {
    police: { shRx: -2.6, shRz: .35, elR: -1.2, look: .1, brow: .2 },       // salute
    mother: { shLx: -.6, shRx: -.6, elL: -1.5, elR: -1.5, brow: .6, browTilt: .25, mouth: .4, eyes: 1.2 },  // hands to the face, worried
    girl13: { tilt: .08, look: -.3, smile: .5, shLz: -.3, shRz: .3 },
    girl11: { shRx: -2.8, shRz: .2, elR: -.2, smile: 1, mouth: .5, cock: .15 },  // raising her hand
    grosse: { shRx: -1.2, elR: -.6, look: .2, brow: .3 },                       // pointing
    playfair: { shLx: -.5, elL: -1.6, lean: .05, look: -.15, smile: .3 },      // hand to beard
    photo: { shRx: -1.0, elR: -1.7, shLx: -1.0, elL: -1.7, look: 0 },          // camera to the eye
    reporter: { shLx: -.9, elL: -1.2, shRx: -.9, elR: -1.5, nod: .2 },         // writing in a pad
    french: { shLx: -.4, shRx: -.4, elL: -1.3, elR: -1.3, brow: -.3, browTilt: -.2, cock: -.12 },  // arms crossed, sceptical
    ventro: { shRx: -1.4, elR: -.3, shRz: .5, smile: .8, brow: .4 },
    judge: { nod: .1, brow: -.2, mouth: 0 },
  };
  const N = names.length, sp = which === 'b' ? 1.85 : 2.3, chars = [];
  names.forEach((n, i) => { const c = makeChar(CAST[n]); c.root.position.set((i - (N - 1) / 2) * sp, 0, 0); c.root.rotation.y = (i - (N - 1) / 2) * -.08; c.setPose(poses[n] || {}); c.root.traverse(o => { if (o.isMesh) o.castShadow = true; }); scene.add(c.root); chars.push([c, CAST[n].name]); });
  camera.position.set(0, 2.0, which === 'b' ? 12.2 : 9.5); camera.lookAt(0, 1.05, 0); camera.rotateZ(.02);
  post.dof.focus = camera.position.length(); post.dof.aper = 1;
  // labels under each figure
  const lab = document.getElementById('line'); lab.style.display = 'none';
  for (const [c, name] of chars) { const p = c.root.position.clone(); p.y = -.05; p.project(camera); const d = document.createElement('div'); d.textContent = name; d.style.cssText = `position:fixed;left:${(p.x + 1) / 2 * W - 160}px;width:320px;top:${(1 - p.y) / 2 * H + 14 + (which === 'b' && chars.indexOf(chars.find(q => q[0] === c)) % 2 ? 34 : 0)}px;text-align:center;font:600 ${which === 'b' ? 22 : 30}px Georgia,serif;color:#f4ecd8;text-shadow:0 2px 6px #000`; document.body.appendChild(d); }
  const title = document.createElement('div'); title.textContent = which === 'b' ? 'Энфилд · исследователи, пресса, скептики' : 'Энфилд · семья и полиция'; title.style.cssText = 'position:fixed;top:34px;left:0;right:0;text-align:center;font:700 46px Georgia,serif;color:#f4ecd8;text-shadow:0 2px 8px #000'; document.body.appendChild(title);
  document.getElementById('fade').style.display = 'none';
  return t => post.composer.render();
}
