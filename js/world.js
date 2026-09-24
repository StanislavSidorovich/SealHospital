/* ---------------- three setup ---------------- */
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xE2F3F9, 20, 58);
const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 120);
scene.add(new THREE.HemisphereLight(0xffffff, 0xA9D4E6, 0.75));
const sun = new THREE.DirectionalLight(0xffffff, 0.7); sun.position.set(4, 8, 6); scene.add(sun);

const toon = c => new THREE.MeshToonMaterial({color:c});
const outlineMat = new THREE.MeshBasicMaterial({color:INK, side:THREE.BackSide});
function addOutline(mesh, s = 1.05){
  const o = new THREE.Mesh(mesh.geometry, outlineMat); o.scale.setScalar(s); mesh.add(o); return mesh;
}
const SPH = new THREE.SphereGeometry(1, 40, 28);
const SMALL = new THREE.SphereGeometry(1, 16, 12);
const inkMat = new THREE.MeshBasicMaterial({color:INK});
const whiteMat = new THREE.MeshBasicMaterial({color:0xffffff});
const Z = new V3(0, 0, 1);

/* canvas textures */
function canvasTex(size, draw, h = size){
  const c = document.createElement('canvas'); c.width = size; c.height = h;
  draw(c.getContext('2d'), size, h); return new THREE.CanvasTexture(c);
}
function heartPath(g, s, x = 0, y = 0){
  g.beginPath(); g.moveTo(x + s/2, y + s*0.84);
  g.bezierCurveTo(x + s*0.04, y + s*0.52, x + s*0.14, y + s*0.12, x + s/2, y + s*0.3);
  g.bezierCurveTo(x + s*0.86, y + s*0.12, x + s*0.96, y + s*0.52, x + s/2, y + s*0.84);
}
const TEX = {
  heart: canvasTex(128, (g, s) => { heartPath(g, s); g.fillStyle = '#FF7FA3'; g.fill(); g.lineWidth = 7; g.strokeStyle = '#3B3A4A'; g.stroke(); }),
  star: canvasTex(128, (g, s) => {
    g.beginPath();
    for(let i = 0; i < 10; i++){ const r = i % 2 ? s*0.2 : s*0.44, a = -Math.PI/2 + i*Math.PI/5; g.lineTo(s/2 + Math.cos(a)*r, s/2 + Math.sin(a)*r); }
    g.closePath(); g.fillStyle = '#FFD66B'; g.fill(); g.lineWidth = 6; g.lineJoin = 'round'; g.strokeStyle = '#3B3A4A'; g.stroke();
  }),
  puff: canvasTex(64, (g, s) => { const r = g.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2); r.addColorStop(0,'rgba(255,255,255,1)'); r.addColorStop(1,'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0,0,s,s); }),
  dot: canvasTex(32, (g, s) => { g.beginPath(); g.arc(s/2,s/2,s/2-2,0,7); g.fillStyle = '#fff'; g.fill(); }),
  drop: canvasTex(64, (g, s) => {
    g.beginPath(); g.moveTo(s/2, 4); g.bezierCurveTo(s*0.1, s*0.55, s*0.2, s-4, s/2, s-4); g.bezierCurveTo(s*0.8, s-4, s*0.9, s*0.55, s/2, 4);
    g.fillStyle = '#8FD3F5'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#3B3A4A'; g.stroke();
  }),
  bubble: bubbleTex('🐟')
};
// пузырь-мысль над тюленем: «хочу рыбку» (у пациента) и потребности своего малыша (js/pet.js)
function bubbleTex(emoji){
  return canvasTex(256, (g, s) => {
    g.lineWidth = 8; g.strokeStyle = '#3B3A4A'; g.fillStyle = '#fff';
    for(const [x,y,r] of [[48,214,14],[78,182,22],[150,104,82]]){ g.beginPath(); g.arc(x,y,r,0,7); g.fill(); g.stroke(); }
    g.font = '86px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(emoji, 152, 110);
  });
}
function textSprite(text, color = '#3B3A4A'){
  const tex = canvasTex(512, (g, w, h) => {
    const font = px => `${px}px Pangolin, "Comic Sans MS", Nunito, sans-serif`;
    g.font = font(112); const fit = g.measureText(text).width;
    if(fit > w - 40) g.font = font(Math.floor(112*(w - 40)/fit));   // длинная надпись — шрифт мельче, а не обрезка
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round'; g.lineWidth = 20; g.strokeStyle = '#fff'; g.strokeText(text, w/2, h/2 + 6);
    g.fillStyle = color; g.fillText(text, w/2, h/2 + 6);
  }, 192);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:tex, transparent:true, depthWrite:false, depthTest:false}));
  sp.scale.set(1.9, 0.71, 1); sp.renderOrder = 10; return sp;
}

/* ---------------- world ---------------- */
const waterGeo = new THREE.PlaneGeometry(90, 90, 60, 60); waterGeo.rotateX(-Math.PI/2);
const wPos = waterGeo.attributes.position, wBase = Float32Array.from(wPos.array);
const water = new THREE.Mesh(waterGeo, toon(0x6FC0DF)); water.position.y = -0.05; scene.add(water);
function updateWater(t){
  for(let i = 0; i < wPos.count; i++){
    const x = wBase[i*3], z = wBase[i*3+2];
    wPos.array[i*3+1] = Math.sin(x*0.45 + t*1.1)*0.07 + Math.cos(z*0.5 + t*0.9)*0.07;
  }
  wPos.needsUpdate = true; waterGeo.computeVertexNormals();
}

const floeGeo = new THREE.CylinderGeometry(3.2, 3.4, 0.6, 44, 1);
{ const p = floeGeo.attributes.position;
  for(let i = 0; i < p.count; i++){
    const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z); if(r < 0.01) continue;
    const a = Math.atan2(z, x), k = 1 + 0.07*Math.sin(a*3) + 0.05*Math.sin(a*7 + 1);
    p.setX(i, x*k); p.setZ(i, z*k);
  }
  floeGeo.computeVertexNormals(); }
const floe = addOutline(new THREE.Mesh(floeGeo, toon(0xD6EAF5)), 1.02); floe.position.y = -0.05; scene.add(floe);
const foam = new THREE.Mesh(new THREE.RingGeometry(3.35, 3.9, 56), new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:0.5}));
foam.rotation.x = -Math.PI/2; foam.position.y = 0.1; scene.add(foam);

// igloo clinic
{ const g = new THREE.Group(); g.position.set(-1.7, 0.25, -2.0); g.rotation.y = 0.35;
  const dome = addOutline(new THREE.Mesh(new THREE.SphereGeometry(1.1, 32, 16, 0, Math.PI*2, 0, Math.PI/2), toon(0xFFFFFF)), 1.03);
  g.add(dome);
  const tunnel = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.7, 20, 1, false, -Math.PI/2, Math.PI), toon(0xFFFFFF)), 1.05);
  tunnel.rotation.x = Math.PI/2; tunnel.position.set(0, 0, 1.05); g.add(tunnel);
  const door = new THREE.Mesh(new THREE.CircleGeometry(0.32, 20, 0, Math.PI), new THREE.MeshBasicMaterial({color:0x5C6E91}));
  door.position.set(0, 0, 1.41); g.add(door);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.7), inkMat); pole.position.y = 1.4; g.add(pole);
  const disc = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.07, 28), toon(0xFFFFFF)), 1.06);
  disc.rotation.x = Math.PI/2; disc.position.set(0, 1.95, 0); g.add(disc);
  const pinkMat = new THREE.MeshBasicMaterial({color:0xFF6F95});
  for(const [w,h] of [[0.46,0.15],[0.15,0.46]]){ const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), pinkMat); b.position.set(0, 1.95, 0.05); g.add(b); }
  scene.add(g); }
// first-aid kit
{ const kit = addOutline(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.45, 0.45), toon(0xFFFFFF)), 1.05);
  kit.position.set(2.1, 0.47, -0.7); kit.rotation.y = -0.5;
  const pinkMat = new THREE.MeshBasicMaterial({color:0xFF6F95});
  for(const [w,h] of [[0.26,0.08],[0.08,0.26]]){ const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), pinkMat); b.position.z = 0.23; kit.add(b); }
  scene.add(kit); }
// fish bucket: renderBucket() в game.js кладёт туда пойманных рыбок
const bucket = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.42, 20), toon(0x9CC8F0)), 1.06);
bucket.position.set(1.55, 0.46, 1.2); scene.add(bucket);
// ice hole for fishing
const HOLE = new V3(-1.55, 0.255, 1.35);
{ const g = new THREE.Group(); g.position.copy(HOLE);
  const pool = new THREE.Mesh(new THREE.CircleGeometry(0.4, 32), toon(0x3E8DB8)); pool.rotation.x = -Math.PI/2; g.add(pool);
  const rim = addOutline(new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.07, 10, 36), toon(0xF3FAFD)), 1.08);
  rim.rotation.x = -Math.PI/2; rim.scale.z = 0.6; g.add(rim);
  scene.add(g); }
// distant icebergs + drifting chunks
const chunks = [];
for(const [x,z,s] of [[-15,-24,2.6],[11,-28,3.2],[22,-18,2.2],[-26,-14,2]]){
  const b = new THREE.Mesh(new THREE.ConeGeometry(s, s*1.3, 6), toon(0xF3FAFD)); b.position.set(x, s*0.4, z); scene.add(b);
}
for(const [x,z] of [[-5.5,-2],[5.8,-3.5],[4.6,2.6],[-6.5,3.4]]){
  const c = addOutline(new THREE.Mesh(new THREE.DodecahedronGeometry(0.45), toon(0xF3FAFD)), 1.06);
  c.scale.set(1, 0.45, 1); c.position.set(x, 0.05, z); scene.add(c); chunks.push(c);
}
// snow
const SN = reduced ? 120 : 360;
const snowPos = new Float32Array(SN*3);
for(let i = 0; i < SN; i++){ snowPos[i*3] = (Math.random()-0.5)*26; snowPos[i*3+1] = Math.random()*12; snowPos[i*3+2] = (Math.random()-0.5)*18; }
const snowGeo = new THREE.BufferGeometry(); snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({size:0.13, map:TEX.dot, transparent:true, depthWrite:false, color:0xffffff}));
scene.add(snow);   // снег едет вместе с камерой (уголок малыша — на соседней льдине)

/* ---------------- particles & tweens ---------------- */
const parts = [];
function emit(tex, pos, {v = new V3(), g = 0, life = 1.2, size = 0.3, spin = 0, grow = 0} = {}){
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:tex, transparent:true, depthWrite:false}));
  sp.position.copy(pos); sp.scale.setScalar(size); scene.add(sp);
  parts.push({sp, v, g, life, max:life, size, spin, grow, own:false});
}
function floatText(txt, pos, color){
  const sp = textSprite(txt, color); sp.position.copy(pos); scene.add(sp);
  parts.push({sp, v:new V3(0, 0.7, 0), g:0, life:1.5, max:1.5, size:0, spin:0, grow:0, own:true});
}
function burst(tex, pos, n, speed = 2.2, size = 0.32){
  for(let i = 0; i < n; i++){
    const a = Math.random()*Math.PI*2;
    emit(tex, pos, {v:new V3(Math.cos(a)*speed*0.6*Math.random() + (Math.random()-0.5), 1.6 + Math.random()*speed, Math.sin(a)*0.6),
      g:3, life:1.1 + Math.random()*0.5, size:size*(0.7 + Math.random()*0.6), spin:(Math.random()-0.5)*4});
  }
}
function updateParts(dt){
  for(let i = parts.length - 1; i >= 0; i--){
    const p = parts[i]; p.life -= dt;
    if(p.life <= 0){ scene.remove(p.sp); if(p.own) p.sp.material.map.dispose(); p.sp.material.dispose(); parts.splice(i, 1); continue; }
    p.v.y -= p.g*dt; p.sp.position.addScaledVector(p.v, dt);
    p.sp.material.opacity = Math.min(1, p.life/p.max*2.2);
    p.sp.material.rotation += p.spin*dt;
    if(p.size) p.sp.scale.setScalar(p.size*(1 + p.grow*(1 - p.life/p.max)));
  }
}
let now = 0; const tweens = [];
const ease = { io:k => k<0.5 ? 2*k*k : 1 - Math.pow(-2*k + 2, 2)/2, out:k => 1 - Math.pow(1 - k, 3), lin:k => k,
  back:k => 1 + 2.7*Math.pow(k - 1, 3) + 1.7*Math.pow(k - 1, 2) };
function tween(dur, fn, e = ease.io){ return new Promise(res => tweens.push({t0:now, dur, fn, e, res})); }
const wait = s => tween(s, () => {});
function updateTweens(){
  for(let i = tweens.length - 1; i >= 0; i--){
    const tw = tweens[i], k = Math.min(1, (now - tw.t0)/tw.dur);
    tw.fn(tw.e(k));
    if(k >= 1){ tweens.splice(i, 1); tw.res(); }
  }
}
