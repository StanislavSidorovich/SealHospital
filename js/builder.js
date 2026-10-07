/* ---------------- 🧱 Конструктор полосы (Спринт 8, задача 4, заход 2) ----------------
   Сабрина сама строит полосу препятствий на своей льдине-площадке и проходит её своим малышом (как в Adopt Me / Mario Maker).
   Вход: «Поиграть» → 🧱, знак «Стройка» на острове (ISL_PL.build), книга (ST_PLACES.build, ST_GATE.build).
   • Полка «Мои уровни» (bdShelf): до BD_LV уровней, ➕ новый (из заготовки BD_TEMPLATE), 🗑️ убрать.
   • Стройка (bdEdit): то же сердце, что «Обустроить» (js/editor.js): куски из панели внизу, тащи пальцем по сетке 0,5 м,
     коснись — выбран (↻ 🗑️ над ним), ещё раз — повернётся; провела по пустой воде вверх-вниз — камера едет вдоль площадки; ↩️.
   • ▶ Пройти (bdPlay): тот же roam.js, что на острове, мир — функция высоты bdGround из кусков. Упала в воду —
     выныривает на последней льдинке (проиграть нельзя). 🌟 — собрать, 🏁 — финиш, время.
   • Правило Mario Maker: уровень «✅ Проверен», только когда сама дошла до флажка; поменяла хоть кусок — проверить снова.
   Куски — BD_KIT: hx, hz — полуразмеры (повёрнут на 90° — меняются местами), h — верх, solid — по нему ходят,
   over — висит над (звёздочка, пингвин), turn — поворачивается, round — круглый, one — один на уровень.
   Новый кусок — строчка в BD_KIT + модель в BD_MAKE (+ что делает — в bdPlayStep).
   Сохранение — save.lv = {my:[{name, ic, p:[[кусок, x, z, поворот]], ok, bt, bs}], n, day:{d, n}} (sanitizeLv в data.js).
   Подключается после homeedit.js и island.js (берёт islPadMake, islCyl, islBlob). Дальше (заход 3): пройти уровень вместе с папой
   по «двери» и ссылка ?lv=. */
const BD_POS = new V3(1400, 0, -1400);
const BD_X = 6, BD_Z0 = 3, BD_Z1 = -33;          // площадка: x от −6 до 6, z от 3 (старт, к камере) до −33 (вдаль)
const BD_STEP = 0.5, BD_TURN = Math.PI/2;
const BD_MAX = 60, BD_LV = 6;                     // кусков в уровне, уровней на полке
const BD_DAY = 3, BD_SHELLS = 3;                  // ракушки за первый проход уровня (не больше BD_DAY раз в день)
const BD_START = {x:0, z:1.5, hx:2, hz:1.5};     // своя льдина старта (не двигается)
const BD_PAD_V = 13, BD_WIND = 3.2, BD_WATER = -1.5;
const BD_IC = ['🐧', '🌟', '🍄', '🧊', '🐳', '🌈'];
const BD_KIT = {
  f: {ic:'⬜', name:L('Льдинка', 'Ice floe'),      hx:1.5,  hz:1.5, h:0.3, solid:true},
  F: {ic:'🧊', name:L('Высокая', 'Tall floe'),     hx:1.5,  hz:1.5, h:1.1, solid:true},
  l: {ic:'🪵', name:L('Мостик', 'Bridge'),         hx:0.6,  hz:2,   h:0.3, solid:true, turn:true},
  s: {ic:'🛷', name:L('Горка', 'Slope'),           hx:1.5,  hz:2.5, h:1.1, solid:true, turn:true},
  p: {ic:'🗼', name:L('Столбик', 'Pillar'),        hx:0.75, hz:0.75, h:1.2, solid:true, round:true},
  b: {ic:'🍄', name:L('Батут', 'Bouncer'),         hx:1,    hz:1,   h:0.3, solid:true, round:true},
  w: {ic:'💨', name:L('Ветерок', 'Breeze'),        hx:1.5,  hz:1.5, h:0.3, solid:true, turn:true},
  pg:{ic:'🐧', name:L('Пингвин', 'Penguin'),       hx:0.5,  hz:0.5, over:true, turn:true},
  st:{ic:'🌟', name:L('Звёздочка', 'Star'),        hx:0.5,  hz:0.5, over:true},
  g: {ic:'🏁', name:L('Финиш', 'Finish'),          hx:1.5,  hz:1.5, h:0.3, solid:true, one:true}
};
const BD_ORDER = ['f', 'st', 'g', 'F', 'l', 's', 'b', 'p', 'w', 'pg'];
// заготовка нового уровня: льдинка, прыжок через воду за звёздочкой, финиш — уже можно пройти
const BD_TEMPLATE = () => [['f', 0, -1.5, 0], ['st', 0, -4, 0], ['g', 0, -6.5, 0]];
const bdRoot = new THREE.Group(); bdRoot.position.copy(BD_POS); bdRoot.visible = false; scene.add(bdRoot);
const bdPieces = new THREE.Group(); bdRoot.add(bdPieces);
let BD = null;   // {s, mode:'shelf'|'edit'|'play'|'done', i, cz, items, …}
const bdLv = () => BD && save.lv.my[BD.i];
const bdKey = i => 'p' + i, bdIdx = k => +k.slice(1);
const bdExt = q => { const K = BD_KIT[q[0]], side = Math.abs(Math.sin(q[3])) > 0.5; return side ? [K.hz, K.hx] : [K.hx, K.hz]; };

/* ---------- мир: высота под лапкой ---------- */
// q = [кусок, x, z, поворот]; вернёт высоту куска в точке (x, z) или null — не на нём
function bdPieceH(q, x, z){
  const K = BD_KIT[q[0]]; if(!K || !K.solid) return null;
  const dx = x - q[1], dz = z - q[2];
  if(K.round) return Math.hypot(dx, dz) < K.hx ? K.h : null;
  const c = Math.cos(q[3]), s = Math.sin(q[3]), lx = dx*c - dz*s, lz = dx*s + dz*c;
  if(Math.abs(lx) > K.hx || Math.abs(lz) > K.hz) return null;
  return q[0] === 's' ? K.h - (K.h - 0.3)*(lz + K.hz)/(2*K.hz) : K.h;   // горка: дальний край высокий, ближний — как льдинка
}
const bdOnStart = (x, z) => Math.abs(x - BD_START.x) < BD_START.hx && Math.abs(z - BD_START.z) < BD_START.hz;
function bdGround(x, z){
  let h = bdOnStart(x, z) ? 0.3 : BD_WATER;
  const P = BD ? BD.p : null; if(!P) return h;
  for(const q of P){ const v = bdPieceH(q, x, z); if(v != null && v > h) h = v; }
  return h;
}
// на каком куске стоим (верхний): индекс, -1 — старт, null — вода
function bdUnder(x, z, y){
  let best = null, bh = -9;
  if(bdOnStart(x, z)){ best = -1; bh = 0.3; }
  BD.p.forEach((q, i) => { const v = bdPieceH(q, x, z); if(v != null && v > bh && (y == null || Math.abs(v - y) < 0.4)){ bh = v; best = i; } });
  return best;
}
function bdBounce(x, z){
  if(!BD || BD.mode !== 'play') return 0;
  for(let i = 0; i < BD.p.length; i++){ const q = BD.p[i]; if(q[0] === 'b' && Math.hypot(x - q[1], z - q[2]) < 0.8){ const it = BD.items[i]; if(it) it.userData.hit = now; return BD_PAD_V; } }
  return 0;
}
// звёздочка висит над тем, что под ней (над водой — надо прыгнуть)
const bdStarY = (x, z) => Math.max(0.3, bdGround(x, z)) + 1.0;

/* ---------- можно ли тут стоять ---------- */
function bdOk(i, p){
  const q0 = BD.p[i], K = BD_KIT[q0[0]], q = [q0[0], p.x, p.z, p.r], [ex, ez] = bdExt(q);
  if(p.x - ex < -BD_X - 0.01 || p.x + ex > BD_X + 0.01 || p.z - ez < BD_Z1 - 0.01 || p.z + ez > BD_Z0 + 0.01) return false;
  if(K.solid && Math.abs(p.x - BD_START.x) < ex + BD_START.hx - 0.05 && Math.abs(p.z - BD_START.z) < ez + BD_START.hz - 0.05) return false;
  if(!K.solid && bdOnStart(p.x, p.z)) return false;
  for(let j = 0; j < BD.p.length; j++){
    if(j === i) continue;
    const o = BD.p[j], K2 = BD_KIT[o[0]]; if(!K2 || !!K2.solid !== !!K.solid) continue;   // звёздочки и пингвины висят над льдинками
    const [ox, oz] = bdExt(o);
    if(Math.abs(p.x - o[1]) < ex + ox - 0.05 && Math.abs(p.z - o[2]) < ez + oz - 0.05) return false;
  }
  return true;
}
// свободное место для нового куска: ближе к тому, куда смотрит камера
function bdFree(t){
  const i = BD.p.length; BD.p.push([t, 0, 0, 0]);
  let best = null, bd = 1e9;
  for(let x = -BD_X; x <= BD_X; x += BD_STEP) for(let z = BD_Z1; z <= BD_Z0; z += BD_STEP){
    const d = Math.hypot(x*0.7, z - (BD.cz - 1)); if(d >= bd) continue;
    if(bdOk(i, {x, z, r:0})){ best = {x, z}; bd = d; }
  }
  BD.p.pop();
  return best;
}

/* ---------- модельки кусков ---------- */
const BD_SIDE = toon(0x8FB8D2), BD_TALL = toon(0x7FAFD6);
function bdSlab(g, w, d, h, side = BD_SIDE){   // льдинка от дна до верха h
  const m = addOutline(new THREE.Mesh(new THREE.BoxGeometry(w, h + 0.7, d), [side, side, floeTopMat, side, side, side]), 1.02);
  m.position.y = (h - 0.7)/2; g.add(m); return m;
}
const BD_ARROW = canvasTex(64, (g, w) => {   // стрелки ветерка (бегут по кругу)
  g.clearRect(0, 0, w, w); g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round';
  for(const y of [10, 42]){ g.beginPath(); g.moveTo(12, y + 16); g.lineTo(32, y); g.lineTo(52, y + 16); g.stroke(); }
});
BD_ARROW.wrapS = BD_ARROW.wrapT = THREE.RepeatWrapping;
const BD_MAKE = {
  f: g => bdSlab(g, 2.94, 2.94, 0.3),
  F(g){ bdSlab(g, 2.94, 2.94, 1.1, BD_TALL); for(const y of [0.35, 0.7]){ const r = new THREE.Mesh(new THREE.BoxGeometry(2.97, 0.06, 2.97), toon(0x5E9CCB)); r.position.y = y; g.add(r); } },
  l(g){
    islBox(g, 0xB98A5E, 1.14, 0.18, 3.96, 0, 0.21, 0);
    for(let i = -2; i <= 2; i++){ const s = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.04, 0.05), toon(0x7A5638)); s.position.set(0, 0.31, i*0.8); g.add(s); }
    for(const [x, z] of [[-0.45, -1.8], [0.45, -1.8], [-0.45, 1.8], [0.45, 1.8]]) islCyl(g, 0x8C6A52, 0.09, 0.09, 1.1, x, -0.3, z, 8, 1.06);
  },
  s(g){   // горка: клин, дальний край (−z) высокий
    const geo = new THREE.BoxGeometry(2.94, 1, 4.96), p = geo.attributes.position;
    for(let i = 0; i < p.count; i++){ const z = p.getZ(i); p.setY(i, p.getY(i) > 0 ? 1.1 - 0.8*(z + 2.48)/4.96 : -0.7); }
    geo.computeVertexNormals();
    g.add(addOutline(new THREE.Mesh(geo, [BD_SIDE, BD_SIDE, floeTopMat, BD_SIDE, BD_SIDE, BD_SIDE]), 1.02));
    for(const x of [-1.4, 1.4]){ const r = islBox(g, 0xFF9BB8, 0.14, 0.14, 5, x, 0.75, 0, 1.05); r.rotation.x = Math.atan2(0.8, 4.96); }
  },
  p(g){ islCyl(g, 0xBFE6F7, 0.7, 0.76, 1.9, 0, 0.25, 0, 18); islBlob(g, 0xFFFFFF, 0.74, 0.18, 0.74, 0, 1.2, 0, 1.04); for(const y of [0.2, 0.7]){ const r = new THREE.Mesh(new THREE.TorusGeometry(0.73, 0.045, 6, 20), toon(0x7FC4E8)); r.rotation.x = Math.PI/2; r.position.y = y; g.add(r); } },
  b(g){ islCyl(g, 0x8FB8D2, 0.98, 0.98, 1.0, 0, -0.2, 0, 20, 1.03); const m = islPadMake(); m.scale.setScalar(1.05); m.position.y = 0.3; g.add(m); g.userData.cap = m.userData.cap; },
  w(g){
    bdSlab(g, 2.94, 2.94, 0.3, toon(0x9DC9E4));
    const a = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), new THREE.MeshBasicMaterial({map:BD_ARROW, transparent:true, depthWrite:false}));
    a.rotation.x = -Math.PI/2; a.position.y = 0.32; g.add(a);
  },
  pg(g){ const p = makePenguin(PENG); p.root.scale.setScalar(0.62); g.add(p.root); g.userData.peng = p; },
  st(g){
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTex('🌟'), transparent:true, depthWrite:false})); sp.scale.setScalar(1.15); g.add(sp); g.userData.sp = sp;
    const sh = new THREE.Mesh(new THREE.CircleGeometry(0.35, 16), new THREE.MeshBasicMaterial({color:0xFFD66B, transparent:true, opacity:0.5, depthWrite:false}));
    sh.rotation.x = -Math.PI/2; g.add(sh); g.userData.sh = sh;
  },
  g(g){
    bdSlab(g, 2.94, 2.94, 0.3);
    for(const x of [-1.3, 1.3]) islCyl(g, 0xFFFFFF, 0.08, 0.08, 2.4, x, 1.5, -1, 8, 1.08);
    const ck = canvasTex(64, (c, w) => { for(let i = 0; i < 8; i++) for(let j = 0; j < 4; j++){ c.fillStyle = (i + j) % 2 ? '#3B3A4A' : '#FFFFFF'; c.fillRect(i*w/8, j*w/8 + w/4, w/8, w/8); } });
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), new THREE.MeshBasicMaterial({map:ck, side:THREE.DoubleSide, transparent:true})); fl.position.set(0, 2.25, -1); g.add(fl);
  }
};
function bdMake(q){
  const g = new THREE.Group(), K = BD_KIT[q[0]]; BD_MAKE[q[0]](g); g.userData.t = q[0]; g.userData.K = K; return g;
}

/* ---------- площадка: вода, своя льдина старта, сетка, айсберги ---------- */
let bdBuilt = false;
function bdBuild(){
  if(bdBuilt) return; bdBuilt = true;
  const G = bdRoot;
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), waterMat(18)); sea.rotation.x = -Math.PI/2; sea.position.set(0, -0.05, -10); G.add(sea); G.userData.sea = sea;
  for(const [x, z, s] of [[-28, -30, 6], [26, -42, 7], [32, -6, 4], [-30, 4, 5], [-6, -60, 8]]){ const b = makeBerg(s*0.8, x*3 + z); b.position.set(x, -0.05, z); b.rotation.y = x; G.add(b); }
  // старт: льдина с ковриком-сердечком и розовым флажком
  const st = new THREE.Group(); st.position.set(BD_START.x, 0, BD_START.z); G.add(st);
  bdSlab(st, BD_START.hx*2 - 0.06, BD_START.hz*2 - 0.06, 0.3);
  const rug = new THREE.Mesh(new THREE.CircleGeometry(0.75, 24), toon(0xF08DAE)); rug.rotation.x = -Math.PI/2; rug.position.set(0.6, 0.32, 0.6); st.add(rug);
  islCyl(st, 0xFFFFFF, 0.05, 0.05, 1.6, -1.15, 1.1, 1.1, 8, 1.08);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45), new THREE.MeshBasicMaterial({color:0xFF9BB8, side:THREE.DoubleSide})); fl.position.set(-0.8, 1.7, 1.1); st.add(fl); G.userData.flag = fl;
  // сетка (видна только на стройке) и рамка площадки
  const gt = canvasTex(64, (c, w) => { c.clearRect(0, 0, w, w); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 3; c.strokeRect(0, 0, w, w); c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(w/2, 0); c.lineTo(w/2, w); c.moveTo(0, w/2); c.lineTo(w, w/2); c.stroke(); });
  gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(BD_X, (BD_Z0 - BD_Z1)/2);
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(BD_X*2, BD_Z0 - BD_Z1), new THREE.MeshBasicMaterial({map:gt, transparent:true, opacity:0.55, depthWrite:false}));
  grid.rotation.x = -Math.PI/2; grid.position.set(0, 0.0, (BD_Z0 + BD_Z1)/2); grid.renderOrder = 2; G.add(grid); G.userData.grid = grid;
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(BD_X*2, BD_Z0 - BD_Z1)), new THREE.LineBasicMaterial({color:0xFF9BB8}));
  edge.rotation.x = -Math.PI/2; edge.position.copy(grid.position).setY(0.02); G.add(edge); G.userData.edge = edge;
}
// перестроить все куски уровня (после ↩️, удаления, смены уровня)
function bdRebuild(){
  while(bdPieces.children.length) bdPieces.remove(bdPieces.children[0]);
  BD.items = BD.p.map((q, i) => { const g = bdMake(q); g.userData.key = bdKey(i); bdPieces.add(g); return g; });
  bdPlaceAll();
}
function bdPlace(i, p, lift = 0){
  const g = BD.items[i], q = BD.p[i]; if(!g) return;
  const x = p ? p.x : q[1], z = p ? p.z : q[2], r = p ? p.r : q[3];
  g.position.set(x, lift, z); g.rotation.y = r;
  if(q[0] === 'st'){ const y = bdStarY(x, z); g.userData.y = y; g.userData.sp.position.y = y + lift; g.userData.sh.position.y = Math.max(0.3, bdGround(x, z)) + 0.03 - lift; }
  if(q[0] === 'pg') g.position.y = Math.max(-0.2, bdGround(x, z)) + lift;
}
// звёздочки и пингвины встают на то, что под ними
function bdPlaceAll(){ BD.p.forEach((q, i) => bdPlace(i)); }

/* ---------- хозяин для редактора (js/editor.js) ---------- */
const bdRay = new THREE.Raycaster(), bdNdc = new THREE.Vector2(), bdPl = new THREE.Plane(new V3(0, 1, 0), 0);
function bdRayAt(cx, cy, y){
  const rect = canvas.getBoundingClientRect();
  bdNdc.set((cx - rect.left)/rect.width*2 - 1, -((cy - rect.top)/rect.height)*2 + 1); bdRay.setFromCamera(bdNdc, camera);
  bdPl.constant = -(BD_POS.y + y);
  const p = bdRay.ray.intersectPlane(bdPl, new V3()); return p ? p.sub(BD_POS) : null;
}
const BD_A = {
  boxIc:'🗑️',
  hit(cx, cy){
    const rect = canvas.getBoundingClientRect();
    bdNdc.set((cx - rect.left)/rect.width*2 - 1, -((cy - rect.top)/rect.height)*2 + 1); bdRay.setFromCamera(bdNdc, camera);
    const h = bdRay.intersectObjects(bdPieces.children, true)[0];
    let o = h && h.object; while(o && !o.userData.key) o = o.parent;
    if(o) return o.userData.key;
    // мимо модельки, но рядом с маленьким куском (звёздочка, пингвин) — тоже он
    let best = null, bd = 34;
    BD.p.forEach((q, i) => { if(!BD_KIT[q[0]].over) return; const s = toScreen(BD_POS.clone().add(new V3(q[1], q[0] === 'st' ? BD.items[i].userData.y : 0.6, q[2]))), d = Math.hypot(s.x - cx, s.y - cy); if(d < bd){ bd = d; best = bdKey(i); } });
    return best;
  },
  at(k, cx, cy){
    const p = bdRayAt(cx, cy, 0.3); if(!p) return null;
    if(p.x < -BD_X - 3 || p.x > BD_X + 3 || p.z > BD_Z0 + 4 || p.z < BD_Z1 - 4) return null;   // совсем мимо площадки
    return {x:Math.max(-BD_X, Math.min(BD_X, p.x)), z:Math.max(BD_Z1, Math.min(BD_Z0, p.z))};
  },
  get(k){ const q = BD.p[bdIdx(k)]; return {x:q[1], z:q[2], r:q[3]}; },
  put(k, p, lift){ bdPlace(bdIdx(k), p, lift); },
  set(k, p){
    const i = bdIdx(k), q = BD.p[i], r = BD_KIT[q[0]].turn ? Math.round((((p.r % (Math.PI*2)) + Math.PI*2) % (Math.PI*2))*100)/100 : 0;
    BD.p[i] = [q[0], p.x, p.z, r]; bdDirty(); bdPlaceAll();
  },
  ok:(k, p) => bdOk(bdIdx(k), p),
  snap(k, p){
    const q = BD.p[bdIdx(k)], [ex, ez] = bdExt([q[0], 0, 0, p.r]);
    const c = (v, e, a, b) => Math.max(a + e, Math.min(b - e, Math.round(v/BD_STEP)*BD_STEP));
    return {x:c(p.x, ex, -BD_X, BD_X), z:c(p.z, ez, BD_Z1, BD_Z0), r:p.r};
  },
  step:k => BD_KIT[BD.p[bdIdx(k)][0]].turn ? BD_TURN : 0,
  ring(k, p){
    const q = BD.p[bdIdx(k)], K = BD_KIT[q[0]], [ex, ez] = bdExt([q[0], 0, 0, p.r]);
    const y = q[0] === 'st' ? Math.max(0.3, bdGround(p.x, p.z)) : K.solid ? (q[0] === 's' ? 0.7 : K.h) : Math.max(0, bdGround(p.x, p.z));
    const at = BD_POS.clone().add(new V3(p.x, y + 0.06, p.z));
    return {at, r:Math.max(ex, ez) + 0.3, q:null, top:at.clone().add(new V3(0, q[0] === 'st' ? 1.8 : 1.6, 0))};
  },
  save:() => JSON.stringify(BD.p),
  load(s){ BD.p = JSON.parse(s); bdLv().p = BD.p; bdDirty(); bdRebuild(); bdBar(); },
  box(k){ BD.p.splice(bdIdx(k), 1); bdDirty(); bdRebuild(); bdBar(); bdHint(); },
  yaw(dx, start, dy){
    if(start){ BD.cz0 = BD.cz; return; }
    BD.cz = Math.max(BD_Z1 + 5, Math.min(0, BD.cz0 - dy*BD.mpp));
  },
  sel(){ bdHint(); },
  bad(){ if(now - BD.badT > 3){ BD.badT = now; toast(L('Тут занято — поставь чуть дальше', 'Something is already here — try a bit further'), 2200); } },
  moved(){ if(Math.random() < 0.3){ sfx.arf(); floatText(L(['Ух ты!', 'Вот это полоса!', 'Я пройду!'], ['Wow!', 'What a course!', 'I can do it!'])[Math.floor(Math.random()*3)], headTop(BD.s), '#D9527E'); } }
};
// поменяли уровень — пройти заново, чтобы снова «✅ Проверено»
function bdDirty(){ const lv = bdLv(); lv.p = BD.p; if(lv.ok){ lv.ok = false; lv.bt = 0; lv.bs = 0; } persist(); }

/* ---------- вход и выход ---------- */
async function bdGo(s){
  bdBuild();
  const cam0 = camOffWant.clone();
  sfx.whoosh(); flash();
  bdRoot.visible = true; runCam.on = true; roamView(true);
  document.body.classList.add('run-on', 'bd-on');
  if(s.bubble) s.bubble.visible = false;
  setMood(s, 'happy');
  BD = {s, mode:null, i:-1, p:[], items:[], cz:-5, cz0:-5, mpp:0.04, badT:-9, played:false, cam:new V3(), look:new V3(), camOn:false, off:[]};
  mgOpen('');
  const homeB = document.createElement('button'); homeB.id = 'btnRunHome'; homeB.className = 'round home'; $('#corner').prepend(homeB); BD.homeB = homeB;
  let done; const fin = new Promise(r => done = r); BD.done = done;
  homeB.addEventListener('click', () => { if(!BD) return; sfx.tap(); if(BD.mode === 'play' || BD.mode === 'done') bdEdit(BD.i); else done(); });
  mgOn(mgRoot, 'pointerdown', e => {
    if(!BD || BD.mode !== 'edit' || (e.target.closest && e.target.closest('button, .bd-bar, .mg-panel'))) return;
    edDown(e);
  });
  mgTick(dt => { if(BD) bdStep(dt); });
  if(!save.lv.my.length) bdNew(); else bdShelf();
  await fin;
  const played = BD.played;
  bdPlayStop(); edStop(); mgClose(); homeB.remove(); flash();
  document.body.classList.remove('run-on', 'bd-on', 'bd-edit');
  while(bdPieces.children.length) bdPieces.remove(bdPieces.children[0]);
  BD = null; bdRoot.visible = false; runCam.on = false; roamView(false);
  camOff.copy(cam0); camOffWant.copy(cam0);
  s.root.position.copy(PET_SPOT); s.root.rotation.set(0, 0, 0); s.happyUntil = now + 3;
  persist();
  return played ? undefined : false;
}
function bdHomeIc(){
  const b = BD.homeB, back = BD.mode === 'play' || BD.mode === 'done';
  b.innerHTML = `<span aria-hidden="true">${back ? '✏️' : '🏠'}</span>`; b.setAttribute('aria-label', back ? L('Строить дальше', 'Back to building') : L('Домой', 'Home'));
}
// малыш ждёт на льдине старта и смотрит на полосу
function bdPupHome(){
  const s = BD.s; s.root.position.copy(BD_POS).add(new V3(BD_START.x - 1.1, 0.3, BD_START.z + 0.6)); s.root.rotation.set(0, Math.PI, 0);
  s.swimming = false; s.flap = 0;
}
function bdClear(){ mgStage.querySelectorAll('.bd-shelf, .bd-bar, .bd-done, .bd-hud, .isl-jump').forEach(n => n.remove()); }

/* ---------- 📚 полка «Мои уровни» ---------- */
function bdLvSmall(lv){
  const n = lv.p.filter(q => q[0] === 'st').length;
  return lv.ok ? `✅ ⏱ ${bdSec(lv.bt)}${n ? ` · 🌟 ${lv.bs}/${n}` : ''}` : L('✏️ ещё не пройден', '✏️ not beaten yet');
}
const bdSec = t => L(`${Math.round(t)} с`, `${Math.round(t)} s`);
function bdShelf(){
  bdPlayStop(); edStop(); bdClear();
  BD.mode = 'shelf'; BD.i = -1; BD.p = []; bdRebuild(); bdPupHome(); bdHomeIc();
  document.body.classList.remove('bd-edit'); bdRoot.userData.grid.visible = bdRoot.userData.edge.visible = true;
  mgHint('');
  const my = save.lv.my;
  const el = mgNode('div', 'mg-panel bd-shelf', `
    <h3>🧱 ${L('Мои уровни', 'My levels')}</h3>
    <div class="picks">
      ${my.map((lv, i) => `<button data-i="${i}"><span class="ic">${lv.ic}</span><b>${stEsc(lv.name)}</b><small>${bdLvSmall(lv)}</small><i class="bd-del" data-del="${i}" role="button" aria-label="${L('Убрать уровень', 'Remove level')}">🗑️</i></button>`).join('')}
      ${my.length < BD_LV ? `<button data-k="new"><span class="ic">➕</span><b>${L('Новый', 'New')}</b><small>${L('построить полосу', 'build a course')}</small></button>` : ''}
    </div>
    <div class="row"><button class="btn ghost small" data-k="out">🏠 ${L('Домой', 'Home')}</button></div>`);
  el.querySelectorAll('button').forEach(b => b.addEventListener('click', e => {
    const del = e.target.closest('[data-del]');
    sfx.tap();
    if(del) return bdAskDel(+del.dataset.del);
    if(b.dataset.k === 'out') return BD.done();
    if(b.dataset.k === 'new') return bdNew();
    bdEdit(+b.dataset.i);
  }));
}
function bdAskDel(i){
  const lv = save.lv.my[i]; bdClear();
  const el = mgNode('div', 'mg-panel bd-shelf', `<h3>🗑️ ${L('Убрать уровень?', 'Remove this level?')}</h3>
    <p class="bd-big">${lv.ic} <b>${stEsc(lv.name)}</b></p>
    <div class="row"><button class="btn ghost" data-k="no">${L('Оставить', 'Keep it')}</button><button class="btn" data-k="yes">${L('Убрать', 'Remove')}</button></div>`);
  el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    if(b.dataset.k === 'yes'){ save.lv.my.splice(i, 1); persist(); sfx.plop(); } else sfx.tap();
    bdShelf();
  }));
}
function bdNew(){
  const my = save.lv.my; if(my.length >= BD_LV) return bdShelf();
  let n = my.length + 1; while(my.some(l => l.name === L(`Уровень ${n}`, `Level ${n}`))) n++;
  my.push({name:L(`Уровень ${n}`, `Level ${n}`), ic:BD_IC[(n - 1) % BD_IC.length], p:BD_TEMPLATE(), ok:false, bt:0, bs:0});
  persist();
  bdEdit(my.length - 1, true);
}

/* ---------- ✏️ стройка ---------- */
function bdEdit(i, fresh){
  bdPlayStop(); bdClear();
  BD.mode = 'edit'; BD.i = i; BD.p = save.lv.my[i].p; bdRebuild(); bdPupHome(); bdHomeIc();
  document.body.classList.add('bd-edit'); bdRoot.userData.grid.visible = bdRoot.userData.edge.visible = true;
  if(fresh) BD.cz = -4;
  edStart(BD_A);
  BD.bar = mgNode('div', 'bd-bar', ''); bdBar();
  bdHint();
  if(fresh && !tipSeen('bd')){
    tipDone('bd');
    (async () => {
      mgHint(L('Это твоя площадка! Внизу — куски: коснись, и он появится 🧱', 'This is your playground! The pieces are below: tap one and it appears 🧱'));
      await wait(5); if(!BD || BD.mode !== 'edit') return;
      mgHint(L('Тащи кусок пальцем. Проведи по воде — увидишь всю полосу', 'Drag a piece with your finger. Swipe the water to see the whole course'));
      await wait(5); if(!BD || BD.mode !== 'edit') return;
      mgHint(L('Готово? Жми ▶ Пройти — доберись до флажка 🏁', 'Ready? Press ▶ Play — reach the flag 🏁'));
      await wait(5); if(BD && BD.mode === 'edit') bdHint();
    })();
  }
}
function bdHint(){
  if(!BD || BD.mode !== 'edit') return;
  const k = edOn() && ED.sel, q = k && BD.p[bdIdx(k)];
  mgHint(q ? L(`${BD_KIT[q[0]].ic} ${BD_KIT[q[0]].name}: тащи${BD_KIT[q[0]].turn ? ', ↻ — повернуть' : ''}, 🗑️ — убрать`, `${BD_KIT[q[0]].ic} ${BD_KIT[q[0]].name}: drag it${BD_KIT[q[0]].turn ? ', ↻ turns' : ''}, 🗑️ removes`)
    : L('Коснись куска внизу — он появится. Тащи пальцем!', 'Tap a piece below to add it. Drag with your finger!'));
}
const BD_SAY = {
  f:L('по ней ходят', 'walk on it'), F:L('запрыгни!', 'jump up!'), l:L('узкий', 'narrow'), s:L('вверх-вниз', 'up and down'),
  p:L('прыг-скок', 'hop on it'), b:L('подбросит', 'bounces you'), w:L('несёт', 'pushes you'), pg:L('толкается', 'pushes'), st:L('собери', 'collect it'), g:L('сюда дойти', 'reach it')
};
function bdBar(){
  const el = BD.bar; if(!el) return;
  const lv = bdLv(), hasG = BD.p.some(q => q[0] === 'g');
  el.innerHTML = `<div class="ed-strip">${BD_ORDER.map(t => `<button class="ed-card${t === 'g' && !hasG ? ' want' : ''}" data-t="${t}"><b aria-hidden="true">${BD_KIT[t].ic}</b><span>${BD_KIT[t].name}</span><small>${BD_SAY[t]}</small></button>`).join('')}</div>
    <div class="ed-row"><button class="btn ghost" data-a="undo" aria-label="${L('Отменить', 'Undo')}">↩️</button><button class="btn ghost" data-a="shelf">📚 ${L('Уровни', 'Levels')}</button><button class="btn" data-a="play">▶ ${L('Пройти', 'Play')}</button></div>
    <p class="bd-name">${lv.ic} ${stEsc(lv.name)} · ${lv.ok ? L('✅ проверен', '✅ beaten') : L('✏️ пройди сам' + pg('', 'а') + ' до 🏁', '✏️ beat it yourself to 🏁')} · ${BD.p.length}/${BD_MAX}</p>`;
  el.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => bdAdd(b.dataset.t)));
  el.querySelector('[data-a="undo"]').addEventListener('click', () => { if(edUndo()) bdHint(); });
  el.querySelector('[data-a="shelf"]').addEventListener('click', () => { sfx.tap(); bdShelf(); });
  el.querySelector('[data-a="play"]').addEventListener('click', () => { sfx.tap(); bdPlay(); });
}
function bdAdd(t){
  if(!BD || BD.mode !== 'edit' || ED.drag || ED.anim) return;
  const K = BD_KIT[t];
  if(K.one){ const i = BD.p.findIndex(q => q[0] === t); if(i >= 0){ edSelect(bdKey(i)); BD.cz = Math.max(BD_Z1 + 5, Math.min(0, BD.p[i][2] + 1)); sfx.tap(); return toast(L(`${K.ic} ${K.name} уже есть — тащи его куда хочешь`, `${K.ic} There is already a ${K.name.toLowerCase()} — drag it anywhere`), 2600); } }
  if(BD.p.length >= BD_MAX){ sfx.bad(); return toast(L(`Больше ${BD_MAX} кусков не влезет — убери лишнее 🗑️`, `No more than ${BD_MAX} pieces — remove some 🗑️`), 2600); }
  const at = bdFree(t);
  if(!at){ sfx.bad(); return toast(L('Свободного места нет — подвинь что-нибудь', 'No free space — move something'), 2400); }
  edPush(BD_A.save());
  BD.p.push([t, at.x, at.z, 0]); bdDirty(); bdRebuild();
  const k = bdKey(BD.p.length - 1); edSelect(k); sfx.pop();
  burst(TEX.star, BD_POS.clone().add(new V3(at.x, 0.8, at.z)), 6, 1.4, 0.24);
  bdBar();
}

/* ---------- ▶ пройти ---------- */
function bdPlay(){
  if(!BD.p.some(q => q[0] === 'g')){
    sfx.bad(); toast(L('Поставь 🏁 финиш — куда добежать', 'Add a 🏁 finish to run to'), 2600);
    const c = BD.bar && BD.bar.querySelector('[data-t="g"]'); if(c) wiggle(c); return;
  }
  edStop(); bdClear(); BD.bar = null;
  document.body.classList.remove('bd-edit'); bdRoot.userData.grid.visible = false; bdRoot.userData.edge.visible = false;
  BD.mode = 'play'; bdHomeIc(); bdPlaceAll();
  const s = BD.s;
  BD.R = roamStart({s, at:BD_POS, pos:new V3(BD_START.x, 0, BD_START.z), ground:bdGround, bounce:bdBounce, gear:gearRoam(() => BD && BD.gear && BD.gear.dj())});
  BD.R.yaw = Math.PI; BD.gear = gearDress(s);
  BD.t = 0; BD.got = 0; BD.falls = 0; BD.sink = 0; BD.safe = -1; BD.bumpT = 0;
  BD.stars = BD.items.filter(g => g.userData.t === 'st'); BD.stars.forEach(g => g.visible = true);
  BD.hud = mgNode('div', 'run-hud bd-hud', ''); bdHud();
  const jump = mgNode('button', 'isl-jump', '<span aria-hidden="true">⤴</span>'); jump.setAttribute('aria-label', L('Прыжок', 'Jump'));
  jump.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if(BD && BD.R) roamJump(BD.R); });
  const n0 = mgCleanup.length; roamControls(BD.R, mgRoot, null); BD.off = mgCleanup.splice(n0);   // касания прогулки снимем, когда вернёмся строить
  mgHint(L('Беги до флажка 🏁 ⤴ — прыжок', 'Run to the flag 🏁 ⤴ jumps'));
  setTimeout(() => { if(BD && BD.mode === 'play' && BD.t > 2) mgHint(''); }, 3500);
  sfx.whoosh();
}
function bdPlayStop(){
  if(!BD || !BD.R) return;
  BD.off.forEach(f => f()); BD.off = [];
  roamStop(BD.R); if(BD.gear) BD.gear.off();
  BD.R = null; BD.gear = null; BD.hud = null;
  BD.items.forEach(g => g.visible = true);
}
function bdHud(){
  if(!BD.hud) return;
  const n = BD.stars.length;
  BD.hud.innerHTML = `<span class="pill">⏱ <b>${Math.floor(BD.t)}</b></span>` + (n ? `<span class="pill">🌟 <b>${BD.got}/${n}</b></span>` : '');
}
// упала в воду — выныриваем на последнем куске, где стояли
function bdRespawn(){
  const R = BD.R, P = R.pos, s = BD.s;
  const c = BD.safe >= 0 && BD.p[BD.safe] ? {x:BD.p[BD.safe][1], z:BD.p[BD.safe][2]} : {x:BD_START.x, z:BD_START.z};
  P.set(c.x, 0, c.z); P.y = roamFloor(R, P.x, P.z);
  R.vel.set(0, 0, 0); R.vy = 0; R.air = false; R.slide = 0; R.tgt = null; R.goal = null; R.fly = false;
  s.swimming = false;
  burst(TEX.puff, BD_POS.clone().add(P).add(new V3(0, 0.3, 0)), 10, 1.6, 0.45); sfx.pop();
  floatText(L(['Ещё разок!', 'Плюх! Снова тут', 'Я смогу!'], ['One more try!', 'Splash! Back here', 'I can do it!'])[BD.falls % 3], headTop(s));
  BD.falls++;
}
function bdPlayStep(dt){
  const R = BD.R, P = R.pos, s = BD.s;
  BD.t += dt;
  roamStep(R, dt);
  if(BD.gear) BD.gear.tick(dt);
  const sec = Math.floor(BD.t); if(sec !== BD.sec){ BD.sec = sec; bdHud(); }
  // стоим на куске: запоминаем, где выныривать; ветерок несёт; дошли до флажка
  const u = !R.air && !R.water ? bdUnder(P.x, P.z, P.y) : null;
  if(u != null){
    const t = u >= 0 ? BD.p[u][0] : 'S';
    if(t !== 'b' && t !== 'w' && t !== 'pg') BD.safe = u;
    if(t === 'w'){ const r = BD.p[u][3]; P.x -= Math.sin(r)*BD_WIND*dt; P.z -= Math.cos(r)*BD_WIND*dt; }
    if(t === 'g') return bdFinish();
  }
  if(R.water && !R.air && !BD.sink){ BD.sink = 0.45; sfx.splash(); }   // над водой в прыжке — ещё не упала
  if(BD.sink){ BD.sink -= dt; if(BD.sink <= 0){ BD.sink = 0; bdRespawn(); } }
  // звёздочки
  const c = P.clone().add(new V3(0, 0.55*petScale(), 0));
  for(const g of BD.stars){
    if(!g.visible) continue;
    if(c.distanceTo(new V3(g.position.x, g.userData.y, g.position.z)) < 1.1 + 0.25*petScale()){
      g.visible = false; BD.got++; bdHud(); sfx.star();
      burst(TEX.star, BD_POS.clone().add(new V3(g.position.x, g.userData.y, g.position.z)), 10, 1.8, 0.28);
      floatText(`🌟 ${BD.got}/${BD.stars.length}`, headTop(s), '#D9527E');
    }
  }
  // пингвины катаются туда-сюда и толкают (не валят — просто отпихивают)
  BD.bumpT -= dt;
  BD.p.forEach((q, i) => {
    if(q[0] !== 'pg') return;
    const g = BD.items[i], k = Math.sin(now*1.3 + i*1.7)*1.5, x = q[1] + Math.cos(q[3])*k, z = q[2] - Math.sin(q[3])*k;
    g.position.set(x, Math.max(-0.2, bdGround(x, z)), z);
    const pe = g.userData.peng; if(pe){ pe.root.rotation.y = Math.cos(now*1.3 + i*1.7) > 0 ? Math.PI/2 : -Math.PI/2; pe.root.rotation.z = Math.sin(now*6 + i)*0.08; }
    const dx = P.x - x, dz = P.z - z, d = Math.hypot(dx, dz);
    if(d < 1 && Math.abs(P.y - g.position.y) < 1 && BD.bumpT <= 0){
      BD.bumpT = 0.8; R.vel.x += dx/(d || 1)*7; R.vel.z += dz/(d || 1)*7; R.air = true; R.vy = 4.5; R.tgt = null;
      sfx.quack(); floatText(L('Ой!', 'Oops!'), headTop(s));
    }
  });
}
async function bdFinish(){
  const R = BD.R, s = BD.s, lv = bdLv(), first = !lv.ok, t = Math.round(BD.t*10)/10, got = BD.got, all = BD.stars.length;
  BD.mode = 'done'; R.vel.set(0, 0, 0); R.hold = false; R.tgt = null; R.goal = null;
  BD.off.forEach(f => f()); BD.off = [];
  BD.played = true; save.lv.n++;
  const better = !lv.ok || got > lv.bs || (got === lv.bs && t < lv.bt);
  lv.ok = true; if(better){ lv.bs = got; lv.bt = t; }
  let shells = 0;
  if(first){
    const sv = save.lv, d = ymd(); if(sv.day.d !== d) sv.day = {d, n:0};
    if(sv.day.n < BD_DAY){ sv.day.n++; shells = BD_SHELLS; }
  }
  persist();
  sfx.hug(); s.flap = 1; setMood(s, 'happy');
  burst(TEX.heart, headTop(s), 18, 2.4, 0.34); burst(TEX.star, headTop(s), 12, 2, 0.3);
  if(shells) addShells(shells, toScreen(headTop(s)));
  mgHint('');
  const el = mgNode('div', 'mg-panel bd-done', `
    <h3>${first ? L('✅ Уровень проверен!', '✅ Level beaten!') : L(`🏁 ${pg('Дошёл', 'Дошла')}!`, '🏁 You made it!')}</h3>
    <p class="bd-big">⏱ <b>${bdSec(t)}</b>${all ? ` · 🌟 <b>${got}/${all}</b>` : ''}${BD.falls ? ` · 💦 ${BD.falls}` : ''}</p>
    <p>${first ? L(`Ты ${pg('сам', 'сама')} ${pg('прошёл', 'прошла')} свою полосу — значит, она настоящая! ${shells ? `+${shells} 🐚` : ''}`, `You beat your own course — so it is a real level! ${shells ? `+${shells} 🐚` : ''}`)
      : better ? L('Новый рекорд! ✨', 'New record! ✨') : L(`Рекорд: ⏱ ${bdSec(lv.bt)}${all ? ` · 🌟 ${lv.bs}/${all}` : ''}`, `Best: ⏱ ${bdSec(lv.bt)}${all ? ` · 🌟 ${lv.bs}/${all}` : ''}`)}</p>
    <div class="row"><button class="btn ghost" data-k="edit">✏️ ${L('Строить', 'Build')}</button><button class="btn" data-k="again">🔁 ${L('Ещё раз', 'Again')}</button></div>`);
  await wait(0.6); if(!BD) return; s.flap = 0;
  el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { sfx.tap(); if(!BD) return; if(b.dataset.k === 'again') bdPlay(); else bdEdit(BD.i); }));
}

/* ---------- кадр ---------- */
function bdStep(dt){
  const U = bdRoot.userData;
  U.sea.position.y = -0.05 + Math.sin(now*0.8)*0.03;
  U.flag.rotation.y = Math.sin(now*3)*0.3;
  BD_ARROW.offset.y = -(now*0.8 % 1);
  // звёздочки кружатся, батуты пружинят
  for(const g of BD.items){
    const d = g.userData;
    if(d.t === 'st' && d.sp){ d.sp.material.rotation = Math.sin(now*2 + g.position.x)*0.35; if(!(ED && ED.drag && ED.drag.key === d.key)) d.sp.position.y = d.y + Math.sin(now*2.2 + g.position.z)*0.12; }
    if(d.t === 'b' && d.cap){ const k = Math.max(0, 1 - (now - (d.hit || -9))/0.4); d.cap.scale.set(0.85*(1 + k*0.25), 0.36*(1 - k*0.45), 0.85*(1 + k*0.25)); }
  }
  if(BD.mode === 'play'){ bdPlayStep(dt); return; }
  if(BD.mode === 'done'){ roamPose(BD.R, dt); roamCam(BD.R, dt); return; }
  // стройка и полка: камера сверху-сзади, весь край площадки в кадре; ведём её пальцем по воде
  edTick(now);
  const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov)/2), w = BD_X*2 + 2, D = Math.max(11, w/2/(tv*Math.min(1.3, camera.aspect)));
  BD.mpp = w/innerWidth*1.6;
  const look = BD_POS.clone().add(new V3(0, 0, BD.cz + (BD.mode === 'shelf' ? -2 : 0)));
  const pos = look.clone().add(new V3(0, D*0.86, D*0.5));
  if(!BD.camOn){ BD.cam.copy(pos); BD.look.copy(look); BD.camOn = true; }
  BD.cam.lerp(pos, Math.min(1, dt*5)); BD.look.lerp(look, Math.min(1, dt*6));
  runCam.pos.copy(BD.cam); runCam.look.copy(BD.look);
  if(BD.mode === 'edit' && BD.s){ const s = BD.s; s.flap = Math.max(0, s.flap - dt); }
}
