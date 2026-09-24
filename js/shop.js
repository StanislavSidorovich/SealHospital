/* ---------------- ракушки, лавка, наряды и украшения (Фаза 2) ----------------
   Товары трёх видов: wear — надеваются на пациента после лечения (слоты head/face),
   scarf — новый узор в выборе шарфика, decor — украшения больницы (сразу встают на льдину).
   Подключается после minigames.js и до shift.js/game.js. */
const SHOP = [
  {id:'bow',     kind:'wear', slot:'head', name:L('Бантик', 'Bow'),   price:12},
  {id:'glasses', kind:'wear', slot:'face', name:L('Очки', 'Glasses'),     price:15},
  {id:'flower',  kind:'wear', slot:'head', name:L('Цветочек', 'Flower'), price:15},
  {id:'beanie',  kind:'wear', slot:'head', name:L('Шапка с ушками', 'Eared beanie'), price:25},
  {id:'tophat',  kind:'wear', slot:'head', name:L('Цилиндр', 'Top hat'),  price:30},
  {id:'crown',   kind:'wear', slot:'head', name:L('Корона', 'Crown'),   price:45},
  {id:'stars',   kind:'scarf', name:L('Шарф со звёздами', 'Star scarf'), price:20, c:'#7FB8F0'},
  {id:'snow',    kind:'scarf', name:L('Шарф-снежинки', 'Snowflake scarf'),   price:20, c:'#B69CF2'},
  {id:'flags',   kind:'decor', name:L('Флажки', 'Bunting'),   price:20},
  {id:'rug',     kind:'decor', name:L('Коврик', 'Rug'),   price:25},
  {id:'garland', kind:'decor', name:L('Гирлянда', 'Garland'), price:35},
  {id:'snowman', kind:'decor', name:L('Снеговик', 'Snowman'), price:45},
  // подарки из папиных писем (js/letters.js, js/mail.js): в лавке не продаются, видны, когда уже есть
  {id:'dadhat',  kind:'wear', slot:'head', name:L('Папина шапочка', 'Dad\'s beanie'), gift:true},
  {id:'hearts',  kind:'wear', slot:'face', name:L('Очки-сердечки', 'Heart glasses'),  gift:true}
];
const shopItem = id => SHOP.find(x => x.id === id);
const owns = id => save.owned.includes(id);

/* ---------- ракушки: счётчик в углу и «полёт» ракушек к нему ---------- */
let shellsShown = save.shells;
function renderShells(){ $('#shellCount').textContent = shellsShown; }
// from — точка экрана, откуда летят ракушки (например, над головой тюленя)
function addShells(n, from){
  save.shells += n; persist();
  if(typeof shift !== 'undefined' && shift) shift.shells += n;
  const b = $('#btnShop').getBoundingClientRect(), tx = b.left + b.width/2, ty = b.top + b.height/2;
  const fx = from ? from.x : innerWidth/2, fy = from ? from.y : innerHeight/2;
  const lbl = document.createElement('div'); lbl.className = 'plus display'; lbl.textContent = `+${n} 🐚`;
  lbl.style.left = fx + 'px'; lbl.style.top = fy + 'px'; $('#app').appendChild(lbl);
  setTimeout(() => lbl.remove(), 1300);
  const k = Math.min(n, 5);
  for(let i = 0; i < k; i++){
    const el = document.createElement('div'); el.className = 'fly-shell'; el.textContent = '🐚';
    el.style.left = fx + (Math.random() - 0.5)*30 + 'px'; el.style.top = fy + 'px'; $('#app').appendChild(el);
    setTimeout(() => { el.style.left = tx + 'px'; el.style.top = ty + 'px'; el.classList.add('go'); }, 120 + i*110);
    setTimeout(() => {
      el.remove();
      shellsShown = i === k - 1 ? save.shells : Math.min(save.shells, shellsShown + Math.ceil(n/k));
      renderShells(); sfx.coin();
      const btn = $('#btnShop'); btn.classList.remove('bump'); void btn.offsetWidth; btn.classList.add('bump');
    }, 820 + i*110);
  }
}

/* ---------- наряды: 3D-вещицы на голову пациента ---------- */
// сердечко размером ≈ 1 с центром посередине: объёмное (HEART_GEO), рамка с дыркой (HEART_RING) и плоское (HEART_FLAT)
function heartShape(k = 1, S = THREE.Shape){
  const s = new S(); s.moveTo(0, -0.45*k);
  s.bezierCurveTo(-0.3*k, -0.2*k, -0.52*k, 0.02*k, -0.5*k, 0.22*k);
  s.bezierCurveTo(-0.48*k, 0.45*k, -0.14*k, 0.52*k, 0, 0.28*k);
  s.bezierCurveTo(0.14*k, 0.52*k, 0.48*k, 0.45*k, 0.5*k, 0.22*k);
  s.bezierCurveTo(0.52*k, 0.02*k, 0.3*k, -0.2*k, 0, -0.45*k);
  return s;
}
const HEART_EXTRUDE = {depth:0.16, bevelEnabled:true, bevelThickness:0.05, bevelSize:0.05, bevelSegments:3, curveSegments:18};
const HEART_GEO = new THREE.ExtrudeGeometry(heartShape(), HEART_EXTRUDE).center();
const HEART_RING = (() => { const s = heartShape(); s.holes.push(heartShape(0.7, THREE.Path)); return new THREE.ExtrudeGeometry(s, {...HEART_EXTRUDE, depth:0.1}).center(); })();
const HEART_FLAT = new THREE.ShapeGeometry(heartShape(), 18);
// at = [x, y, z, rx, ry, rz] в координатах головы (голова — эллипсоид 0.84 × 0.76 × 0.76)
const WEAR = {
  bow(){
    const g = new THREE.Group(), m = toon(0xFF7FA3);
    for(const s of [-1, 1]){ const l = addOutline(new THREE.Mesh(SMALL, m), 1.1); l.scale.set(0.19, 0.13, 0.08); l.position.x = 0.16*s; l.rotation.z = 0.35*s; g.add(l); }
    const k = addOutline(new THREE.Mesh(SMALL, m), 1.15); k.scale.setScalar(0.075); k.position.z = 0.04; g.add(k);
    g.userData.at = [0.44, 0.6, 0.3, -0.2, 0.3, -0.45]; return g;
  },
  flower(){
    const g = new THREE.Group(), pm = toon(0xFFFFFF);
    for(let i = 0; i < 5; i++){ const a = i/5*Math.PI*2, p = addOutline(new THREE.Mesh(SMALL, pm), 1.12);
      p.scale.set(0.1, 0.1, 0.045); p.position.set(Math.cos(a)*0.11, Math.sin(a)*0.11, 0); g.add(p); }
    const c = addOutline(new THREE.Mesh(SMALL, toon(0xFFD66B)), 1.12); c.scale.set(0.07, 0.07, 0.05); c.position.z = 0.03; g.add(c);
    g.userData.at = [-0.5, 0.5, 0.42, -0.1, -0.5, 0.3]; return g;
  },
  glasses(){
    const g = new THREE.Group(), ring = new THREE.TorusGeometry(0.14, 0.026, 8, 28);
    const lens = new THREE.MeshBasicMaterial({color:0xCFEFFF, transparent:true, opacity:0.35, depthWrite:false});
    for(const s of [-1, 1]){
      const r = new THREE.Mesh(ring, toon(0xFF6F95)); r.position.set(0.28*s, 0, 0); r.rotation.y = 0.3*s; g.add(r);
      const l = new THREE.Mesh(new THREE.CircleGeometry(0.125, 24), lens); l.position.copy(r.position); l.rotation.y = r.rotation.y; g.add(l);
    }
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.03), toon(0xFF6F95)); br.position.set(0, 0.03, 0.03); g.add(br);
    g.userData.at = [0, 0.14, 0.76, 0, 0, 0]; return g;
  },
  beanie(){
    const g = new THREE.Group(), m = toon(0xFFB8CB);
    const dome = addOutline(new THREE.Mesh(new THREE.SphereGeometry(0.46, 24, 12, 0, Math.PI*2, 0, Math.PI/2), m), 1.05); dome.scale.y = 0.85; g.add(dome);
    const cuff = addOutline(new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.08, 10, 28), toon(0xFFFDF8)), 1.06); cuff.rotation.x = Math.PI/2; g.add(cuff);
    for(const s of [-1, 1]){
      const e = addOutline(new THREE.Mesh(SMALL, m), 1.1); e.scale.set(0.14, 0.14, 0.09); e.position.set(0.3*s, 0.33, 0); g.add(e);
      const inner = new THREE.Mesh(SMALL, toon(0xFF8FB1)); inner.scale.set(0.08, 0.08, 0.05); inner.position.set(0.3*s, 0.33, 0.05); g.add(inner);
    }
    g.userData.at = [0, 0.6, -0.02, -0.15, 0, 0.12]; return g;
  },
  tophat(){
    const g = new THREE.Group(), m = toon(0x7C6BC4);
    const brim = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.035, 28), m), 1.08); g.add(brim);
    const top = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.21, 0.34, 24), m), 1.06); top.position.y = 0.18; g.add(top);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.215, 0.07, 24), toon(0xFF9BB8)); band.position.y = 0.06; g.add(band);
    g.userData.at = [0.1, 0.72, 0, -0.15, 0, -0.22]; return g;
  },
  crown(){
    const g = new THREE.Group(), gold = toon(0xFFD66B);
    gold.side = THREE.DoubleSide;
    const band = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.27, 0.15, 24, 1, true), gold), 1.06); g.add(band);
    for(let i = 0; i < 6; i++){
      const a = i/6*Math.PI*2, sp = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.15, 8), gold), 1.12);
      sp.position.set(Math.sin(a)*0.29, 0.14, Math.cos(a)*0.29); g.add(sp);
      const b = new THREE.Mesh(SMALL, toon(0xFF8FB1)); b.scale.setScalar(0.035); b.position.set(Math.sin(a)*0.3, 0.2, Math.cos(a)*0.3); g.add(b);
    }
    g.scale.setScalar(1.3); g.userData.at = [0.04, 0.8, 0, -0.12, 0, 0.14]; return g;
  },
  dadhat(){   // вязаная шапочка в полоску с помпоном и сердечком — подарок из письма
    const g = new THREE.Group(), m = toon(0x8CC4F0);
    const dome = addOutline(new THREE.Mesh(new THREE.SphereGeometry(0.46, 24, 12, 0, Math.PI*2, 0, Math.PI/2), m), 1.05); dome.scale.y = 0.95; g.add(dome);
    for(const y of [0.2, 0.33]){ const r = new THREE.Mesh(new THREE.TorusGeometry(0.46*Math.cos(Math.asin(y/0.44)), 0.035, 8, 28), toon(0xFFFDF8)); r.rotation.x = Math.PI/2; r.position.y = y*0.95; g.add(r); }
    const cuff = addOutline(new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.09, 10, 28), toon(0xFF9BB8)), 1.06); cuff.rotation.x = Math.PI/2; g.add(cuff);
    const pom = addOutline(new THREE.Mesh(SMALL, toon(0xFFFDF8)), 1.08); pom.scale.setScalar(0.13); pom.position.y = 0.5; g.add(pom);
    const heart = addOutline(new THREE.Mesh(HEART_GEO, toon(0xFF6F95)), 1.1); heart.scale.setScalar(0.2); heart.position.set(0, 0.2, 0.41); heart.rotation.x = -0.35; g.add(heart);
    g.userData.at = [0, 0.6, -0.02, -0.15, 0, 0.1]; return g;
  },
  hearts(){   // очки с оправой-сердечками
    const g = new THREE.Group(), frame = toon(0xFF6F95);
    const lens = new THREE.MeshBasicMaterial({color:0xFFC2D4, transparent:true, opacity:0.55, depthWrite:false});
    for(const s of [-1, 1]){
      const f = addOutline(new THREE.Mesh(HEART_RING, frame), 1.08); f.scale.setScalar(0.34); f.position.set(0.28*s, 0, 0); f.rotation.y = 0.3*s; g.add(f);
      const l = new THREE.Mesh(HEART_FLAT, lens); l.scale.setScalar(0.25); l.position.set(0.28*s, 0, 0); l.rotation.y = 0.3*s; g.add(l);
    }
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.03), frame); br.position.set(0, 0.06, 0.03); g.add(br);
    g.userData.at = [0, 0.14, 0.76, 0, 0, 0]; return g;
  }
};
// надеть / снять вещь (повторное нажатие снимает); на голове — одна вещь, очки — отдельно
function wearOn(s, id){
  const slot = shopItem(id).slot, cur = s.wear[slot];
  if(cur) s.head.remove(cur.obj);
  if(cur && cur.id === id) s.wear[slot] = null;
  else {
    const o = WEAR[id](), a = o.userData.at;
    o.position.set(a[0], a[1], a[2]); o.rotation.set(a[3], a[4], a[5]); s.head.add(o);
    s.wear[slot] = {id, obj:o};
    const sc = o.scale.x; tween(0.35, k => o.scale.setScalar(Math.max(0.01, k)*sc), ease.back);
  }
  if(slot === 'head') s.hat.visible = !s.wear.head && s.hat.userData.on;   // чихательная шапочка уступает место
}
const wearIds = s => Object.fromEntries(Object.entries(s.wear).filter(([, v]) => v).map(([k, v]) => [k, v.id]));

/* ---------- украшения больницы ---------- */
const IGLOO_POS = new V3(-1.7, 0.25, -2.0), IGLOO_ROT = 0.35;   // как в world.js
const DECOR = {
  // mini — компактная версия для картинки в лавке
  rug(){
    const g = new THREE.Group();
    const tex = canvasTex(256, (c, s) => {
      c.fillStyle = '#FFC2D3'; c.fillRect(0, 0, s, s);
      c.fillStyle = '#FFFDF8'; c.beginPath(); c.arc(s/2, s/2, s*0.47, 0, 7); c.fill();
      c.fillStyle = '#FF9BB8'; c.beginPath(); c.arc(s/2, s/2, s*0.4, 0, 7); c.fill();
      c.fillStyle = '#FFFDF8';
      for(let i = 0; i < 18; i++){ const a = i/18*Math.PI*2; c.beginPath(); c.arc(s/2 + Math.cos(a)*s*0.435, s/2 + Math.sin(a)*s*0.435, 6, 0, 7); c.fill(); }
      heartPath(c, 70, s/2 - 35, s/2 - 32); c.fill();
    });
    const edge = new THREE.Mesh(new THREE.CircleGeometry(1.5, 48), inkMat); edge.rotation.x = -Math.PI/2; g.add(edge);
    const top = new THREE.Mesh(new THREE.CircleGeometry(1.45, 48), toon(0xFFFFFF)); top.material.map = tex;
    top.rotation.x = -Math.PI/2; top.position.y = 0.004; g.add(top);
    g.position.set(0, 0.258, -0.15); g.userData.center = new V3(0, 0.4, 0.9);
    return g;
  },
  flags(mini){
    const g = new THREE.Group(), cols = [0xFF9BB8, 0xFFD66B, 0x86DDB5, 0x9BD3F0, 0xB69CF2];
    let a, b;
    if(mini){ a = new V3(-1, 0.3, 0); b = new V3(1, 0.3, 0); }
    else {
      const pole = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.9, 8), toon(0xE0A36B)), 1.15);
      pole.position.set(2.25, 0.25 + 0.95, -1.85); g.add(pole);
      a = new V3(-1.55, 1.85, -1.55); b = new V3(2.25, 2.1, -1.85);   // от флагштока иглу к новому столбику
    }
    const sag = mini ? 0.25 : 0.55, N = mini ? 6 : 13, pts = [];
    for(let i = 0; i <= 20; i++){ const k = i/20; const p = a.clone().lerp(b, k); p.y -= Math.sin(k*Math.PI)*sag; pts.push(p); }
    const rope = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.014, 5), inkMat); g.add(rope);
    const tri = new THREE.CircleGeometry(0.15, 3), triO = new THREE.CircleGeometry(0.185, 3);
    g.userData.flags = [];
    for(let i = 1; i < N; i++){
      const k = i/N, p = a.clone().lerp(b, k); p.y -= Math.sin(k*Math.PI)*sag;
      const f = new THREE.Group(); f.position.copy(p);
      const fm = new THREE.Mesh(tri, new THREE.MeshToonMaterial({color:cols[i % cols.length], side:THREE.DoubleSide}));
      const fo = new THREE.Mesh(triO, new THREE.MeshBasicMaterial({color:INK, side:THREE.DoubleSide}));
      fm.position.y = fo.position.y = -0.12; fm.rotation.z = fo.rotation.z = -Math.PI/2; fo.position.z = -0.01; fo.position.y = -0.135;
      f.add(fo, fm); g.add(f); g.userData.flags.push(f);
    }
    g.userData.center = a.clone().lerp(b, 0.5);
    return g;
  },
  garland(mini){
    const g = new THREE.Group(), cols = [0xFF6F95, 0xFFD66B, 0x5FD39B, 0x6FB6F5, 0xB69CF2], pts = [], N = mini ? 7 : 22;
    g.userData.bulbs = [];
    for(let i = 0; i <= (mini ? 30 : 80); i++){   // провод гирлянды «волнами» вокруг купола
      const k = i/(mini ? 30 : 80), ang = mini ? -0.9 + k*1.8 : k*Math.PI*2;
      const y = 0.52 + Math.abs(Math.sin(k*(mini ? 3 : 11)*Math.PI))*0.12 - 0.12, r = Math.sqrt(1.1*1.1 - y*y) + 0.04;
      pts.push(new V3(Math.sin(ang)*r, y, Math.cos(ang)*r));
    }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, !mini), mini ? 60 : 160, 0.012, 5, !mini), inkMat));
    for(let i = 0; i < N; i++){
      const p = pts[Math.round((i + 0.5)/N*(pts.length - 1))];
      const bm = new THREE.MeshBasicMaterial({color:cols[i % cols.length]});
      const bulb = addOutline(new THREE.Mesh(SMALL, bm), 1.25); bulb.scale.set(0.055, 0.075, 0.055);
      bulb.position.copy(p).add(p.clone().setY(0).setLength(0.03)); bulb.position.y -= 0.06; g.add(bulb);
      bulb.userData.base = new THREE.Color(cols[i % cols.length]); g.userData.bulbs.push(bulb);
    }
    if(!mini){ g.position.copy(IGLOO_POS); g.rotation.y = IGLOO_ROT; }
    g.userData.center = IGLOO_POS.clone().add(new V3(0, 0.9, 0.6));
    return g;
  },
  snowman(){
    const g = new THREE.Group(), snow = toon(0xFFFFFF);
    const b1 = addOutline(new THREE.Mesh(SMALL, snow), 1.05); b1.scale.setScalar(0.45); b1.position.y = 0.4; g.add(b1);
    const b2 = addOutline(new THREE.Mesh(SMALL, snow), 1.06); b2.scale.setScalar(0.32); b2.position.y = 1.0; g.add(b2);
    for(const s of [-1, 1]){
      const e = new THREE.Mesh(SMALL, inkMat); e.scale.set(0.035, 0.045, 0.03); e.position.set(0.11*s, 1.05, 0.29); g.add(e);
      const bl = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), new THREE.MeshBasicMaterial({color:0xFFA3B8})); bl.position.set(0.2*s, 0.97, 0.25); bl.rotation.y = 0.6*s; g.add(bl);
    }
    const nose = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.2, 10), toon(0xFFA552)), 1.12);
    nose.rotation.x = Math.PI/2; nose.position.set(0, 0.99, 0.38); g.add(nose);
    const sc = addOutline(new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.07, 10, 24), toon(0x7FD1A8)), 1.08);
    sc.rotation.x = Math.PI/2; sc.position.y = 0.76; g.add(sc);
    for(const y of [0.5, 0.3]){ const bt = new THREE.Mesh(SMALL, inkMat); bt.scale.setScalar(0.04); bt.position.set(0, y, 0.44); g.add(bt); }
    const bucketHat = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.2, 16), toon(0x9CC8F0)), 1.1);
    bucketHat.position.set(0.04, 1.34, 0); bucketHat.rotation.z = -0.25; g.add(bucketHat);
    g.position.set(1.05, 0.25, -2.45); g.rotation.y = -0.3;
    g.userData.center = new V3(1.05, 1.2, -2.45);
    return g;
  }
};
const decorObjs = {};
function applyDecor(){
  for(const it of SHOP){
    if(it.kind !== 'decor') continue;
    const on = owns(it.id) && save.decor.includes(it.id);
    if(on && !decorObjs[it.id]){ decorObjs[it.id] = DECOR[it.id](); scene.add(decorObjs[it.id]); }
    if(decorObjs[it.id]) decorObjs[it.id].visible = on;
  }
}
function decorTick(t){
  const gl = decorObjs.garland;
  if(gl && gl.visible) gl.userData.bulbs.forEach((b, i) => {   // огоньки мигают по очереди
    const on = Math.sin(t*3 - i*0.9) > -0.2;
    b.material.color.copy(b.userData.base).multiplyScalar(on ? 1 : 0.55);
  });
  const fl = decorObjs.flags;
  if(fl && fl.visible) fl.userData.flags.forEach((f, i) => { f.rotation.x = Math.sin(t*2.2 + i*0.7)*0.25; });
}

/* ---------- картинки товаров: рендерим 3D-модель в маленькую текстуру ---------- */
const thumbCache = {};
function thumb(id){
  if(thumbCache[id]) return thumbCache[id];
  const it = shopItem(id);
  if(it.kind === 'scarf') return thumbCache[id] = scarfTex(it.c, id, 1, 1).image.toDataURL();
  const obj = it.kind === 'wear' ? WEAR[id]() : DECOR[id](true);
  obj.position.set(0, 0, 0); obj.rotation.set(it.kind === 'wear' ? 0.25 : 0, it.id === 'snowman' ? 0 : 0.35, 0);
  if(id === 'glasses') obj.rotation.set(0.1, 0, 0);
  const sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xffffff, 0xA9D4E6, 0.75));
  const l = new THREE.DirectionalLight(0xffffff, 0.7); l.position.set(4, 8, 6); sc.add(l);
  sc.add(obj);
  const sphere = new THREE.Box3().setFromObject(obj).getBoundingSphere(new THREE.Sphere());
  const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
  const dist = sphere.radius/Math.sin(THREE.MathUtils.degToRad(15))*0.85;   // сфера с запасом — чуть ближе, чтобы вещь была крупнее
  cam.position.copy(sphere.center).add(new V3(0, id === 'rug' ? 0.9 : 0.35, 1).normalize().multiplyScalar(dist)); cam.lookAt(sphere.center);
  const SZ = 192, rt = new THREE.WebGLRenderTarget(SZ, SZ), px = new Uint8Array(SZ*SZ*4);
  const prevColor = renderer.getClearColor(new THREE.Color()), prevAlpha = renderer.getClearAlpha();
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear();
  renderer.render(sc, cam); renderer.readRenderTargetPixels(rt, 0, 0, SZ, SZ, px);
  renderer.setRenderTarget(null); renderer.setClearColor(prevColor, prevAlpha); rt.dispose();
  const c = document.createElement('canvas'); c.width = c.height = SZ;
  const g = c.getContext('2d'), img = g.createImageData(SZ, SZ);
  for(let y = 0; y < SZ; y++) img.data.set(px.subarray((SZ - 1 - y)*SZ*4, (SZ - y)*SZ*4), y*SZ*4);   // WebGL читает снизу вверх
  g.putImageData(img, 0, 0);
  return thumbCache[id] = c.toDataURL();
}

/* ---------- лавка ---------- */
let shopTab = 'wear', shopSel = null, shopOpen = false;
function openShop(){
  if(!mgRoot.hidden || busy) return toast(L('Сначала закончи лечение, потом загляни в лавку 🐚', 'Finish the treatment first, then visit the shop 🐚'));
  sfx.tap(); shopOpen = true; shopSel = null; renderShop(); $('#shop').hidden = false;
}
function closeShop(){ shopOpen = false; $('#shop').hidden = true; }
function renderShop(){
  $('#shopShells').textContent = save.shells;
  document.querySelectorAll('#shopTabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === shopTab));
  const grid = $('#shopGrid'); grid.innerHTML = '';
  for(const it of SHOP){
    if((shopTab === 'decor') !== (it.kind === 'decor')) continue;
    if(it.gift && !owns(it.id)) continue;   // подарок из письма — в лавке не продаётся
    const b = document.createElement('button'), have = owns(it.id);
    b.className = 'item' + (have ? ' have' : '') + (shopSel === it.id ? ' sel' : '') + (it.kind === 'scarf' ? ' scarf' : '');
    const status = !have ? `<span class="price">🐚 ${it.price}</span>`
      : it.kind === 'decor' ? `<span class="price own">${save.decor.includes(it.id) ? L('Стоит ✓', 'On display ✓') : L('Убрано', 'Put away')}</span>`
      : `<span class="price own">${it.gift ? L('От папы ♡', 'From Dad ♡') : L('Есть ✓', 'Owned ✓')}</span>`;
    b.innerHTML = `<img src="${thumb(it.id)}" alt=""><span class="nm">${it.name}</span>${status}`;
    b.addEventListener('click', () => { sfx.tap(); shopSel = it.id; renderShop(); });
    grid.appendChild(b);
  }
  const btn = $('#btnBuy'), it = shopSel && shopItem(shopSel);
  btn.classList.remove('off');
  if(!it){ btn.textContent = L('Выбери, что нравится', 'Pick what you like'); btn.classList.add('off'); }
  else if(!owns(it.id)){
    const need = it.price - save.shells;
    btn.textContent = need > 0 ? L(`Не хватает ${need} 🐚`, `Need ${need} more 🐚`) : L(`Купить за ${it.price} 🐚`, `Buy for ${it.price} 🐚`);
    if(need > 0) btn.classList.add('off');
  }
  else if(it.kind === 'decor') btn.textContent = save.decor.includes(it.id) ? L('Убрать', 'Put away') : L('Поставить', 'Put out');
  else { btn.textContent = it.kind === 'scarf' ? L('Есть! Выбирай в шарфиках', 'Yours! Pick it with the scarves') : L('Есть! Надень после лечения', 'Yours! Put it on after treatment'); btn.classList.add('off'); }
}
function shopAction(){
  const it = shopSel && shopItem(shopSel);
  if(!it) return;
  if(owns(it.id)){
    if(it.kind !== 'decor') return;
    sfx.tap();
    save.decor = save.decor.includes(it.id) ? save.decor.filter(x => x !== it.id) : save.decor.concat(it.id);
    persist(); applyDecor(); renderShop(); return;
  }
  if(save.shells < it.price){ sfx.bad(); return toast(L('Лечи пациентов — за каждого дают ракушки 🐚', 'Heal patients — you get shells for each one 🐚')); }
  save.shells -= it.price; save.owned.push(it.id);
  if(it.kind === 'decor') save.decor.push(it.id);
  persist(); shellsShown = save.shells; renderShells(); sfx.buy();
  if(it.kind === 'decor'){   // закрываем лавку и показываем обновку на льдине
    applyDecor(); closeShop();
    burst(TEX.star, decorObjs[it.id].userData.center, 14, 2, 0.3);
    return toast(L(`${it.name} — теперь в больнице! ✨`, `${it.name} — now in the hospital! ✨`));
  }
  renderShop();
  if(it.kind === 'wear' && S && S.stage === 'hug' && showWardrobe(S.seal)) $('#tools').hidden = true;   // обновка сразу в гардеробе
  toast(it.kind === 'scarf' ? L(`${it.name} — выбирай, когда лечишь от холода`, `${it.name} — pick it when you treat the cold`) : L(`${it.name}! Надевай пациентам после лечения`, `${it.name}! Put it on patients after treatment`));
}
$('#btnShop').addEventListener('click', openShop);
$('#btnShopClose').addEventListener('click', () => { sfx.tap(); closeShop(); });
$('#btnBuy').addEventListener('click', shopAction);
document.querySelectorAll('#shopTabs button').forEach(b => b.addEventListener('click', () => { sfx.tap(); shopTab = b.dataset.tab; shopSel = null; renderShop(); }));

/* ---------- гардероб: после лечения можно нарядить пациента ---------- */
function showWardrobe(s){
  const items = SHOP.filter(x => x.kind === 'wear' && owns(x.id)), nav = $('#wardrobe');
  nav.innerHTML = '';
  if(!items.length){ nav.hidden = true; return false; }
  for(const it of items){
    const b = document.createElement('button'); b.className = 'tool';
    b.innerHTML = `<span class="face"><img src="${thumb(it.id)}" alt=""></span><span class="name">${it.name}</span>`;
    b.addEventListener('click', () => {
      if(!S || S.stage !== 'hug' || busy) return;
      wearOn(s, it.id); sfx.pop();
      nav.querySelectorAll('.tool').forEach((x, i) => x.classList.toggle('on', Object.values(wearIds(s)).includes(items[i].id)));
    });
    nav.appendChild(b);
  }
  nav.hidden = false; return true;
}

renderShells(); applyDecor();
