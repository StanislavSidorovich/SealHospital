/* ---------------- seal ---------------- */
const HEAD_AX = [0.84, 0.76, 0.76];
function onHead(obj, dx, dy, dz, out = 0){
  const d = new V3(dx, dy, dz).normalize();
  const t = 1/Math.sqrt((d.x/HEAD_AX[0])**2 + (d.y/HEAD_AX[1])**2 + (d.z/HEAD_AX[2])**2);
  obj.position.copy(d).multiplyScalar(t + out); obj.quaternion.setFromUnitVectors(Z, d); return obj;
}
function makePlaster(){
  const g = new THREE.Group();
  const strip = addOutline(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.13, 0.025), toon(0xFFB8CB)), 1.08); g.add(strip);
  const pad = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.03), toon(0xFFF0F4)); g.add(pad);
  return g;
}
function makeSeal(p){
  const bodyMat = toon(p.color), hits = [];
  const root = new THREE.Group(), inner = new THREE.Group(); root.add(inner);
  const body = addOutline(new THREE.Mesh(SPH, bodyMat), 1.045);
  body.scale.set(1.15, 0.8, 1.3); body.position.set(0, 0.8, -0.2); inner.add(body); hits.push(body);
  if(p.spot){
    const sm = toon(p.spot);
    for(const [x,y,z] of [[0.5,0.6,-0.4],[-0.6,0.5,-0.2],[0.2,0.8,-0.7],[-0.3,0.7,-0.9],[0.75,0.3,-0.8],[-0.8,0.25,-0.6],[0.9,0.4,0.1]]){
      const d = new V3(x, y, z).normalize(), s = new THREE.Mesh(SMALL, sm);
      const t = 1/Math.sqrt((d.x/1.15)**2 + (d.y/0.8)**2 + (d.z/1.3)**2);
      s.position.copy(d).multiplyScalar(t - 0.012).add(new V3(0, 0.8, -0.2));
      s.quaternion.setFromUnitVectors(Z, d); s.scale.set(0.14, 0.11, 0.03); inner.add(s);
    }
  }
  for(const s of [-1, 1]){
    const f = addOutline(new THREE.Mesh(SMALL, bodyMat), 1.12);
    f.scale.set(0.3, 0.08, 0.45); f.position.set(0.22*s, 0.2, -1.52); f.rotation.y = 0.5*s; inner.add(f);
  }
  const flippers = [];
  for(const s of [-1, 1]){
    const piv = new THREE.Group(); piv.position.set(0.85*s, 0.45, 0.35);
    const f = addOutline(new THREE.Mesh(SMALL, bodyMat), 1.1); f.scale.set(0.42, 0.11, 0.26); f.position.set(0.3*s, 0, 0);
    piv.add(f); piv.userData.s = s; inner.add(piv); flippers.push(piv); hits.push(f);
  }
  const head = new THREE.Group(); head.position.set(0, 1.5, 0.55); inner.add(head);
  const hm = addOutline(new THREE.Mesh(SPH, bodyMat), 1.05); hm.scale.set(...HEAD_AX); head.add(hm); hits.push(hm);

  const eyes = [], happy = [], brows = [];
  const blushMat = new THREE.MeshBasicMaterial({color:0xFFA3B8, transparent:true, opacity:0.85});
  const arcEye = new THREE.TorusGeometry(0.075, 0.018, 8, 20, Math.PI);
  for(const s of [-1, 1]){
    const e = onHead(new THREE.Group(), 0.36*s, 0.16, 0.92, -0.015);
    const ball = new THREE.Mesh(SMALL, inkMat); ball.scale.set(0.085, 0.1, 0.05); e.add(ball);
    const hl = new THREE.Mesh(SMALL, whiteMat); hl.scale.setScalar(0.03); hl.position.set(0.028, 0.04, 0.04); e.add(hl);
    head.add(e); eyes.push(e);
    const h = onHead(new THREE.Mesh(arcEye, inkMat), 0.36*s, 0.14, 0.92, 0.005); h.visible = false; head.add(h); happy.push(h);
    const b = onHead(new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.026, 0.02), inkMat), 0.36*s, 0.42, 0.83, 0.005);
    b.rotateZ(-0.38*s); b.visible = false; head.add(b); brows.push(b);
    head.add(onHead(new THREE.Mesh(new THREE.CircleGeometry(0.12, 24), blushMat), 0.6*s, -0.06, 0.8, 0.008));
  }
  const nose = onHead(new THREE.Mesh(SMALL, inkMat), 0, 0, 1, 0); nose.scale.set(0.07, 0.05, 0.04); head.add(nose);
  const smile = new THREE.Group(), arcG = new THREE.TorusGeometry(0.05, 0.013, 8, 16, Math.PI);
  for(const s of [-1, 1]){ const a = new THREE.Mesh(arcG, inkMat); a.rotation.z = Math.PI; a.position.x = 0.05*s; smile.add(a); }
  onHead(smile, 0, -0.12, 1, 0); head.add(smile);
  const sad = onHead(new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.013, 8, 16, Math.PI), inkMat), 0, -0.22, 1, 0);
  sad.visible = false; head.add(sad);
  const mouthLocal = onHead(new THREE.Object3D(), 0, -0.15, 1, 0.05).position.clone();
  const noseLocal = nose.position.clone();

  const sweat = new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.drop, transparent:true, depthWrite:false}));
  sweat.scale.set(0.2, 0.26, 1); sweat.position.set(-0.78, 0.35, 0.3); sweat.visible = false; head.add(sweat);
  const bubble = new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.bubble, transparent:true, depthWrite:false}));
  bubble.scale.setScalar(0.85); bubble.position.set(1.2, 2.3, 0.45); bubble.visible = false; inner.add(bubble);   // ниже столбика кнопок справа: на телефоне они его закрывали
  const scratch = new THREE.Group();
  for(const r of [0.7, -0.7]){ const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.026, 0.02), new THREE.MeshBasicMaterial({color:0xE0475B})); m.rotation.z = r; scratch.add(m); }
  onHead(scratch, 0.5, 0.52, 0.69, 0.006); scratch.visible = false; head.add(scratch);
  const plaster = makePlaster(); onHead(plaster, 0.5, 0.52, 0.69, 0.012); plaster.rotateZ(0.5);
  plaster.visible = false; head.add(plaster);
  const scarf = new THREE.Group(), ringMat = toon(0xFF7A9C), tailMat = toon(0xFF7A9C);   // setScarf() меняет цвет и узор
  const ring = addOutline(new THREE.Mesh(new THREE.TorusGeometry(0.74, 0.19, 14, 44), ringMat), 1.03);
  ring.quaternion.setFromUnitVectors(Z, new V3(0, 1, 0.5).normalize()); scarf.add(ring);
  const tail = addOutline(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.46, 0.08), tailMat), 1.08);
  tail.position.set(0.34, -0.36, 0.62); tail.rotation.set(0.35, 0, 0.25); scarf.add(tail);
  for(const y of [-0.08, -0.22]){ const st = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.04, 0.085), whiteMat); st.position.y = y; tail.add(st); }
  scarf.position.set(0, 1.02, 0.35); scarf.scale.setScalar(0.001); scarf.visible = false; inner.add(scarf);
  // вязаная шапочка у чихающих: чих её сдувает (мини-игра «Платочек»)
  const hat = new THREE.Group(), hatCol = [0x9BD3F0, 0xFFD66B, 0xB69CF2, 0x86DDB5][Math.floor(Math.random()*4)];
  const dome = addOutline(new THREE.Mesh(new THREE.SphereGeometry(0.44, 24, 12, 0, Math.PI*2, 0, Math.PI/2), toon(hatCol)), 1.05);
  dome.scale.y = 0.85; hat.add(dome);
  const cuff = addOutline(new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.08, 10, 28), toon(0xFFFDF8)), 1.06);
  cuff.rotation.x = Math.PI/2; hat.add(cuff);
  const pom = addOutline(new THREE.Mesh(SMALL, toon(0xFFFDF8)), 1.08); pom.scale.setScalar(0.12); pom.position.y = 0.42; hat.add(pom);
  hat.position.set(0, 0.6, -0.02); hat.rotation.set(-0.15, 0, 0.18); hat.userData.base = hat.position.clone();
  hat.visible = false; head.add(hat);

  return {p, root, inner, head, body, flippers, eyes, happy, brows, blushMat, smile, sad, sweat, bubble, scratch, plaster, scarf, scarfMats:[ringMat, tailMat], hat, windup:null, wear:{}, sleeping:false,
    bodyMat, base:new THREE.Color(p.color), coldCol:new THREE.Color(p.color).lerp(new THREE.Color(0x9FC8EE), 0.45),
    mouthLocal, noseLocal, hits, nod:0, sneezeNod:0, shake:0, wobble:0, flap:0, blinkT:2, sneezeT:2.5, rumbleT:3.5,
    swimming:false, cold:false, bodyK:new V3(1, 1, 1)};
}
/* шарфик: цвет + узор, текстуры кешируются */
const SCARF_COLORS = ['#FF7A9C', '#FFB547', '#7FD1A8', '#7FB8F0', '#B69CF2', '#F5F1E8'];
const SCARF_PATTERNS = ['plain', 'stripes', 'dots', 'hearts'];   // + 'stars', 'snow' из лавки (Фаза 2)
const PAT_LABEL = {hearts:'♥♥', stars:'★★', snow:'❄❄'};
function starPath(g, x, y, r){
  g.beginPath();
  for(let i = 0; i < 10; i++){ const rr = i % 2 ? r*0.45 : r, a = -Math.PI/2 + i*Math.PI/5; g.lineTo(x + Math.cos(a)*rr, y + Math.sin(a)*rr); }
  g.closePath();
}
function snowPath(g, x, y, r){
  g.beginPath();
  for(let i = 0; i < 3; i++){ const a = i*Math.PI/3; g.moveTo(x - Math.cos(a)*r, y - Math.sin(a)*r); g.lineTo(x + Math.cos(a)*r, y + Math.sin(a)*r); }
}
const scarfTexCache = {};
// rx, ry подобраны так, чтобы узор не растягивался: кольцо длинное и тонкое, хвостик узкий и высокий
function scarfTex(color, pattern, rx, ry){
  const key = [color, pattern, rx, ry].join();
  if(scarfTexCache[key]) return scarfTexCache[key];
  const ink = color === '#F5F1E8' ? '#FF7A9C' : '#FFFFFF';   // на светлом шарфе узор розовый
  const tex = canvasTex(128, (g, w, h) => {
    g.fillStyle = color; g.fillRect(0, 0, w, h); g.fillStyle = ink;
    if(pattern === 'stripes') for(let x = 8; x < w; x += 32) g.fillRect(x, 0, 14, h);
    // ряд узора идёт по шву текстуры (y = 0 ≡ 64): там лицевая сторона трубки шарфа
    if(pattern === 'dots') for(let x = 0; x < w; x += 32) for(const [y, sh] of [[0,0],[32,16],[64,0]]){ g.beginPath(); g.arc(x + 8 + sh, y, 7, 0, 7); g.fill(); }
    if(pattern === 'hearts') for(let x = 0; x < w; x += 32) for(const [y, sh] of [[-11,0],[21,16],[53,0]]){ heartPath(g, 22, x + 5 + sh, y); g.fill(); }
    if(pattern === 'stars') for(let x = 0; x < w; x += 32) for(const [y, sh] of [[0,0],[32,16],[64,0]]){ starPath(g, x + 8 + sh, y, 10); g.fill(); }
    if(pattern === 'snow'){ g.strokeStyle = ink; g.lineWidth = 3; g.lineCap = 'round';
      for(let x = 0; x < w; x += 32) for(const [y, sh] of [[0,0],[32,16],[64,0]]){ snowPath(g, x + 8 + sh, y, 9); g.stroke(); } }
  }, 64);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(rx, ry);
  return scarfTexCache[key] = tex;
}
function setScarf(s, color, pattern){
  const [ringMat, tailMat] = s.scarfMats;
  ringMat.map = scarfTex(color, pattern, 2, 1); tailMat.map = scarfTex(color, pattern, 0.5, 2);
  for(const m of s.scarfMats){ m.color.set(0xffffff); m.needsUpdate = true; }
}
// 'sleep' — те же дуги, что у 'happy', только перевёрнутые: глазки «‿ ‿»
function setMood(s, m){
  const sad = m === 'sad', hap = m === 'happy', slp = m === 'sleep';
  s.brows.forEach(b => b.visible = sad); s.sad.visible = sad; s.smile.visible = !sad;
  s.eyes.forEach(e => e.visible = !hap && !slp);
  s.happy.forEach(h => {
    h.visible = hap || slp;
    if(!!h.userData.flip !== slp){ h.rotateZ(Math.PI); h.userData.flip = slp; }
  });
}
function applyAilments(s, a){
  s.sweat.visible = !!a.fever;
  s.blushMat.color.set(a.fever ? 0xFF5C77 : 0xFFA3B8);
  s.bubble.visible = !!a.hungry;
  s.scratch.visible = !!a.scratch;
  s.cold = !!a.cold;
}
function updateSeal(s, t, dt){
  s.body.scale.set(1.15*(1 + s.wobble)*s.bodyK.x, 0.8*(1 + Math.sin(t*2.2)*0.025)*s.bodyK.y, 1.3*s.bodyK.z);   // bodyK — пропорции (стадии роста своего малыша)
  s.head.rotation.set(s.nod + s.sneezeNod, s.shake + Math.sin(t*0.7)*0.08, Math.sin(t*1.1)*0.06);
  for(const f of s.flippers){ const sd = f.userData.s; f.rotation.z = -0.35*sd + sd*(Math.sin(t*3 + sd)*0.06 + s.flap*Math.sin(t*14)*0.5); }
  if(s.swimming) s.inner.position.y = Math.sin(t*4)*0.06;
  s.bodyMat.color.lerp(s.cold ? s.coldCol : s.base, 0.06);
  s.inner.position.x = s.cold && !s.swimming ? Math.sin(t*55)*0.018 : 0;
  s.blinkT -= dt;
  if(s.blinkT < 0){ const sc = s.blinkT > -0.12 ? 0.15 : 1; s.eyes.forEach(e => e.scale.y = sc); if(s.blinkT <= -0.12) s.blinkT = 2 + Math.random()*3; }
  s.sweat.position.y = 0.35 - ((t*0.6) % 1)*0.12;
  s.bubble.position.y = 2.3 + Math.sin(t*2)*0.06;
}
function worldOf(s, local){ s.root.updateMatrixWorld(true); return s.head.localToWorld(local.clone()); }

/* ---------------- props ---------------- */
function makeThermo(){
  const g = new THREE.Group();
  g.add(addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.62, 12), toon(0xFFFFFF)), 1.12));
  // столбик растёт от колбы вверх: мини-игра меняет red.scale.y
  const redGeo = new THREE.CylinderGeometry(0.043, 0.043, 0.24, 12); redGeo.translate(0, 0.12, 0);
  const red = new THREE.Mesh(redGeo, toon(0xFF5C77)); red.position.y = -0.26; g.add(red); g.userData.red = red;
  const bulb = addOutline(new THREE.Mesh(SMALL, toon(0xFF5C77)), 1.15); bulb.scale.setScalar(0.065); bulb.position.y = -0.31; g.add(bulb);
  return g;
}
function makeFish(){
  const g = new THREE.Group(), m = toon(0xFFA552);
  const b = addOutline(new THREE.Mesh(SMALL, m), 1.08); b.scale.set(0.32, 0.18, 0.12); g.add(b);
  const tl = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.22, 4), m), 1.1); tl.rotation.z = Math.PI/2; tl.position.x = -0.38; tl.scale.z = 0.4; g.add(tl);
  const e = new THREE.Mesh(SMALL, inkMat); e.scale.setScalar(0.035); e.position.set(0.18, 0.04, 0.1); g.add(e);
  return g;
}
function makeBobber(){
  const g = new THREE.Group();
  const top = addOutline(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI*2, 0, Math.PI/2), toon(0xFF5C77)), 1.12);
  const bot = addOutline(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8, 0, Math.PI*2, Math.PI/2, Math.PI/2), toon(0xFFFFFF)), 1.12);
  top.scale.setScalar(0.1); bot.scale.setScalar(0.1); g.add(top, bot);
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12), inkMat); stick.position.y = 0.14; g.add(stick);
  return g;
}
function makeSpoon(color){
  const g = new THREE.Group();
  const handle = addOutline(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.06), toon(0xE8EEF4)), 1.1);
  handle.position.x = -0.32; g.add(handle);
  const bowl = addOutline(new THREE.Mesh(SMALL, toon(0xE8EEF4)), 1.08); bowl.scale.set(0.16, 0.06, 0.12); g.add(bowl);
  const syrup = new THREE.Mesh(SMALL, toon(color)); syrup.scale.set(0.13, 0.03, 0.095); syrup.position.y = 0.035; g.add(syrup);
  return g;
}
const camPt = (x, y, z) => { camera.updateMatrixWorld(); return new V3(x, y, z).applyMatrix4(camera.matrixWorld); };
async function flyTo(obj, from, to, dur, arc = 0.8, spin = 0){
  obj.position.copy(from); scene.add(obj);
  await tween(dur, k => { obj.position.lerpVectors(from, to, k); obj.position.y += Math.sin(k*Math.PI)*arc; obj.rotation.y += spin*0.016; });
}
