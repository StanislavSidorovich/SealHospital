/* ---------------- 🗝️ Ущелье и пещера под островом (Спринт 7, задача 4) ----------------
   Как подземная лаборатория в Seally Seal, только своя: на острове (js/island.js) в скалах на востоке, у забега, —
   узкое ущелье, в конце — тёмный вход. Внутри пещера: зал и три двери с цветными замками 🔴 🔵 🟡.
   Ключи спрятаны по острову (CV_KEYS): 🔴 на вершине горы, 🔵 под водой у причала (проплыви над ним — малыш нырнёт сам),
   🟡 за маяком (с берега не видно — башня загораживает). Над каждым ключом — цветной луч, видно издалека.
   За дверями — комнаты (CV_ROOMS), в каждой сундук с сокровищем (CV_GIFT):
     🔴 💎 Кристальный грот — кристаллы звенят, когда проходишь рядом; сундук высоко на кристалле: только с 🎈 шариком (двойной прыжок);
     🔵 🌊 Подземное озеро — сундук на островке, доплыть; если акула — подружка, она плавает в озере и здоровается;
     🟡 👑 Сокровищница — горы монеток, гриб-батут на уступ под потолком.
   И 6 💎 кристалликов по всей пещере (+2 🐚, все — ещё CV_GEM_ALL). Все три сундука — медаль «Кладоискатель» в Комнате трофеев.
   Ходим тем же управлением (js/roam.js), тем же R, что и на острове: cvEnter/cvExit меняют ему мир (at, ground, bounce).
   Стены, что между камерой и малышом (к югу от пола), низкие — как «кукольный домик» (cvVis).
   Сохранение: save.isl.cave = {keys, open, chest — буквы r/b/y, gem — номера кристалликов, n — сколько раз заходили}.
   Новая комната: CV_ROOMS + коридор в CV_HALLS + дверь в CV_DOORS + ключ в CV_KEYS + подарок в CV_GIFT; новый кристаллик — в конец CV_GEMS.
   Подключается после island.js и trophyroom.js (TR_MEDALS, trPedestal), до game.js. */
const CV_POS = new V3(-1400, 0, 2400);
const CV_WALL = 6, CV_FOG = 0x39406A, CV_GEM = 2, CV_GEM_ALL = 10, CV_GOLD = 30;
if(save.isl && !save.isl.cave) save.isl.cave = {keys:[], open:[], chest:[], gem:[], n:0};   // Pages мог отдать старый data.js
const cvRoot = new THREE.Group(); cvRoot.position.copy(CV_POS); cvRoot.visible = false; scene.add(cvRoot);

/* ---------- ключи на острове ---------- */
const CV_KEYS = {
  r:{col:0xFF6F87, ic:'🔴', name:L('Красный ключ', 'Red key'), where:L('на вершине горы ⛰️', 'on top of the mountain ⛰️'), at:[12.4, -19.6]},
  b:{col:0x4FA3F0, ic:'🔵', name:L('Синий ключ', 'Blue key'), where:L('под водой у причала 🌊', 'under the water by the pier 🌊'), at:[-23, 38], water:true},
  y:{col:0xFFC93D, ic:'🟡', name:L('Золотой ключ', 'Golden key'), where:L('за маяком 🗼', 'behind the lighthouse 🗼'), at:[33, 26.7]}
};
const cvSv = () => save.isl.cave;
const cvHas = k => cvSv().keys.includes(k);
const cvOpen = k => cvSv().open.includes(k);

/* ---------- ущелье на острове: две скалы и стена с входом (по верху не пройти — даже с шариком) ---------- */
const CV_ROCK = [[25, 28.5, -19.5, -7.5], [31, 34.5, -19.5, -7.5], [28.5, 31, -19.5, -16.2]];   // x0, x1, z0, z1
const CV_ROCK_H = 4.45, CV_MOUTH = {x:29.75, z:-14.4};
for(const [x0, x1, z0, z1] of CV_ROCK) ISL_SOLID.push({x:(x0 + x1)/2, z:(z0 + z1)/2, w:x1 - x0, d:z1 - z0, h:CV_ROCK_H});

// скала: коробка с «помятыми» гранями (одинаковые точки сдвигаются одинаково — без щелей), гранёный toon
const cvHash = (a, b, c = 0) => { const s = Math.sin(a*12.9898 + b*78.233 + c*37.719)*43758.5453; return s - Math.floor(s); };
function cvRockMesh(w, h, d, col, j = 0.2){
  const g = new THREE.BoxGeometry(w, h, d, Math.max(1, Math.round(w/0.9)), Math.max(1, Math.round(h/0.9)), Math.max(1, Math.round(d/0.9)));
  const p = g.attributes.position;
  for(let i = 0; i < p.count; i++){
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if(y < -h/2 + 0.01) continue;
    const k = [x, y, z].map(v => Math.round(v*100));
    p.setXYZ(i, x + (cvHash(...k) - 0.5)*j*2, y + (cvHash(k[1], k[2], k[0]) - 0.5)*j*(y > h/2 - 0.01 ? 2.5 : 1.5), z + (cvHash(k[2], k[0], k[1]) - 0.5)*j*2);
  }
  g.computeVertexNormals();
  return addOutline(new THREE.Mesh(g, new THREE.MeshToonMaterial({color:col, flatShading:true})), 1.02);
}
function cvKeyModel(col){   // ключ: кольцо с сердечком, стержень, две бородки
  const g = new THREE.Group(), m = toon(col);
  const bow = addOutline(new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.075, 10, 24), m), 1.1); bow.position.y = 0.42; g.add(bow);
  const sh = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.72, 10), m), 1.15); sh.position.y = -0.06; g.add(sh);
  for(const [y, w] of [[-0.32, 0.22], [-0.17, 0.15]]){ const t = addOutline(new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 0.07), m), 1.12); t.position.set(w/2, y, 0); g.add(t); }
  const hl = new THREE.Mesh(HEART_FLAT, whiteMat); hl.scale.setScalar(0.1); hl.position.set(0, 0.42, 0.02); g.add(hl);
  return g;
}
function cvIslBuild(G){
  const U = G.userData, rockC = 0x9EA3C6, base = islTerrain(29.75, -12);
  for(const [x0, x1, z0, z1] of CV_ROCK){
    const w = x1 - x0, d = z1 - z0, y0 = -1.6, h = CV_ROCK_H - y0;
    const r = cvRockMesh(w + 0.2, h, d + 0.2, rockC, 0.22); r.position.set((x0 + x1)/2, y0 + h/2, (z0 + z1)/2); G.add(r);
    const cap = cvRockMesh(w + 0.5, 0.4, d + 0.5, 0xFBFDFF, 0.12); cap.position.set((x0 + x1)/2, CV_ROCK_H + 0.1, (z0 + z1)/2); G.add(cap);
  }
  // вход: тёмная арка в стене, сосульки над ней, табличка с ключиком
  const mouth = new THREE.Group(); mouth.position.set(CV_MOUTH.x, base, -15.85); G.add(mouth);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(1.15, 24, 0, Math.PI), new THREE.MeshBasicMaterial({color:0x2B2F4D})); hole.scale.y = 1.5; mouth.add(hole);
  for(let i = 0; i < 5; i++){ const c = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4 + (i % 2)*0.2, 6), toon(0xDDF3FF)), 1.1); c.rotation.x = Math.PI; c.position.set(-0.9 + i*0.45, 1.85 - (i % 2)*0.1, 0.1); mouth.add(c); }
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.3), toon(0x8C6A52)); pole.position.set(1.7, 0.65, 0.6); mouth.add(pole);
  islBox(mouth, 0xF3E2BC, 0.9, 0.62, 0.1, 1.7, 1.35, 0.6);
  const ks = new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTex('🗝️'), transparent:true, depthWrite:false})); ks.scale.setScalar(0.55); ks.position.set(1.7, 1.37, 0.68); mouth.add(ks);
  const lbl = textSprite(`🗝️ ${L('Пещера', 'The cave')}`); lbl.scale.set(3.8, 1.42, 1); lbl.position.set(CV_MOUTH.x, CV_ROCK_H + 1.4, -15); G.add(lbl);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.3, 32), new THREE.MeshBasicMaterial({color:0xB9A0F2, transparent:true, opacity:0.8, depthWrite:false}));
  ring.rotation.x = -Math.PI/2; ring.position.set(CV_MOUTH.x, base + 0.06, CV_MOUTH.z); G.add(ring);
  U.cave = {cave:true, pos:new V3(CV_MOUTH.x, base, CV_MOUTH.z), lbl, ring};
  // ключи: крутятся над землёй (синий — под водой), над каждым — цветной луч
  U.keys = Object.entries(CV_KEYS).map(([k, K]) => {
    const g = new THREE.Group(), y = K.water ? -0.3 : islGround(...K.at) + 0.95; g.position.set(K.at[0], y, K.at[1]); G.add(g);
    const m = cvKeyModel(K.col); m.scale.setScalar(1.3); g.add(m);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX, transparent:true, depthWrite:false, color:K.col})); gl.scale.setScalar(2.4); g.add(gl);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 26, 12, 1, true), new THREE.MeshBasicMaterial({color:K.col, transparent:true, opacity:0.22, depthWrite:false, side:THREE.DoubleSide}));
    beam.position.set(K.at[0], y + 13, K.at[1]); G.add(beam);
    return {k, K, g, m, beam, y, bubT:0};
  });
}
function cvIslShow(){ for(const o of islRoot.userData.keys) o.g.visible = o.beam.visible = !cvHas(o.k); }
// кадр на острове: ключи крутятся, подобрала — в карман; подошла ко входу — вернуть место для «В пещеру ▶»
function cvIslStep(dt){
  const I = ISL, R = I.R, P = R.pos, U = islRoot.userData;
  for(const o of U.keys){
    if(!o.g.visible) continue;
    o.m.rotation.y += dt*2; o.g.position.y = o.y + Math.sin(now*2 + o.y)*0.15;
    o.beam.material.opacity = 0.16 + Math.sin(now*2.5 + o.y)*0.07;
    if(o.K.water){ o.bubT -= dt; if(o.bubT < 0){ o.bubT = 0.35; emit(TEX.dot, ISL_POS.clone().add(o.g.position).add(new V3((Math.random() - 0.5)*0.6, 0.7, 0)), {v:new V3(0, 0.9, 0), life:0.7, size:0.14, grow:0.4}); } }
    const d = Math.hypot(P.x - o.g.position.x, P.z - o.g.position.z);
    if(d < 1.4 && (o.K.water ? R.water : Math.abs(P.y + 0.5 - o.g.position.y) < 1.4)) cvKeyGot(o);
  }
  const c = U.cave; c.ring.scale.setScalar(1 + Math.sin(now*3)*0.08);
  c.lbl.material.opacity = Math.max(0, Math.min(1, (34 - c.lbl.position.distanceTo(R.cam.clone().sub(ISL_POS)))/10));
  return Math.hypot(P.x - c.pos.x, P.z - c.pos.z) < ISL_NEAR && Math.abs(P.y - c.pos.y) < 1.5 ? c : null;
}
async function cvKeyGot(o){
  const sv = cvSv(), I = ISL; if(sv.keys.includes(o.k)) return;
  sv.keys.push(o.k); persist();
  const R = I.R;
  if(o.K.water){ R.tumble = 1; sfx.splash(); burst(TEX.puff, ISL_POS.clone().add(R.pos), 10, 1.6, 0.45); }   // нырнул за ключом
  o.beam.visible = false; sfx.star(); burst(TEX.star, ISL_POS.clone().add(o.g.position), 14, 2.2, 0.3);
  const from = o.g.position.clone();
  await tween(0.5, k => { o.g.position.lerpVectors(from, R.pos.clone().add(new V3(0, 1.4, 0)), k); o.g.scale.setScalar(1 - k*0.7); }, ease.io);
  o.g.visible = false; o.g.scale.setScalar(1);
  if(!ISL) return;
  sfx.good(); islHud();
  const n = sv.keys.length;
  mgHint(n >= 3 ? L(`${o.K.ic} ${o.K.name}! Все три ключа — скорее в пещеру 🗝️`, `${o.K.ic} ${o.K.name}! All three keys — off to the cave 🗝️`)
    : sv.n ? L(`${o.K.ic} ${o.K.name}! Он открывает дверь в пещере 🗝️ (${n}/3)`, `${o.K.ic} ${o.K.name}! It opens a door in the cave 🗝️ (${n}/3)`)
    : L(`${o.K.ic} ${o.K.name}! Что он открывает? Ищи пещеру в скалах у забега 🗝️`, `${o.K.ic} ${o.K.name}! What does it open? Look for a cave in the rocks by the dash 🗝️`));
  I.sayT = 5;
}
function cvHudPill(){
  const sv = cvSv(); if(!sv.keys.length && !sv.n) return '';
  const I = ISL, gems = sv.gem.length;
  return `<span class="pill">🗝️ <b>${sv.keys.length}/3</b></span>` + (I && I.cave ? `<span class="pill">💎 <b>${gems}/${CV_GEMS.length}</b></span><span class="pill">🎁 <b>${sv.chest.length}/3</b></span>` : '');
}

/* ---------- пещера: зал, коридоры, комнаты (координаты от центра зала; север — −z, камера с юга) ---------- */
const CV_ROOMS = {
  hall:{x:0, z:0, r:7.5},
  crys:{x:-19, z:0, r:6.5, ic:'💎', name:L('Кристальный грот', 'Crystal grotto')},
  lake:{x:0, z:-20.5, r:7.5, ic:'🌊', name:L('Подземное озеро', 'Underground lake')},
  gold:{x:19, z:0, r:6, ic:'👑', name:L('Сокровищница', 'Treasure room')}
};
const CV_HALLS = [[-1.7, 1.7, 5, 14.6], [-13.5, -6, -1.7, 1.7], [-1.7, 1.7, -14, -6], [6, 13.5, -1.7, 1.7]];   // x0, x1, z0, z1: вход с юга и коридоры к дверям
const CV_DOORS = [{k:'r', x:-9.5, z:0, ax:'x', room:'crys', at:[-7.6, 0]}, {k:'b', x:0, z:-9.5, ax:'z', room:'lake', at:[0, -7.6]}, {k:'y', x:9.5, z:0, ax:'x', room:'gold', at:[7.6, 0]}];
const CV_LAKE = {x:0, z:-21.5, r:5.2}, CV_ISLET = {x:0, z:-23.2, r:1.7};
const CV_EXIT = [0, 12.8];
const CV_CHESTS = {r:{x:-19.5, z:-1, y:2.1}, b:{x:0, z:-23.2, y:0}, y:{x:20, z:-0.6, y:0}};   // сундуки: где и на какой высоте
const CV_CRYS = [[-24.2, -2.5], [-23.4, 3], [-19.2, 5.3], [-14.9, 3.9], [-15, -3.6], [-19.6, -5.5]];   // звенящие кристаллы
const CV_PAD = {x:17.3, z:-3.1, v:12.5}, CV_LEDGE = {x:20, z:-4.6, r:1.3, h:3.2};
const CV_GEMS = [   // [x, z, над полом (и над уступом) или 'w' — на воде]
  [-3.6, -3.4, 0.9], [-16.8, 1.9, 0.9], [-22.3, 0.6, 0.9], [3.6, -20.2, 'w'], [-5.6, -16.4, 0.9], [CV_LEDGE.x, CV_LEDGE.z, 0.9]];   // номера не менять — они в сохранении
// твёрдое на полу: кристаллы, столп с сундуком, уступ, камень с ключиками
const CV_SOLID = [
  ...CV_CRYS.map(([x, z]) => ({x, z, r:0.6, h:3})),
  {x:CV_CHESTS.r.x, z:CV_CHESTS.r.z, r:1.4, h:CV_CHESTS.r.y},
  {x:CV_LEDGE.x, z:CV_LEDGE.z, r:CV_LEDGE.r, h:CV_LEDGE.h},
  {x:3.8, z:3.2, r:0.8, h:1.0}
];
function cvIn(x, z){   // пол (комната или коридор)?
  for(const R of Object.values(CV_ROOMS)){
    const dx = x - R.x, dz = z - R.z, a = Math.atan2(dz, dx);
    if(Math.hypot(dx, dz) < R.r*(1 + 0.05*Math.sin(3*a + R.x) + 0.035*Math.sin(5*a + 1))) return true;
  }
  for(const [x0, x1, z0, z1] of CV_HALLS) if(x > x0 && x < x1 && z > z0 && z < z1) return true;
  return false;
}
function cvFloor(x, z){   // пол без вещей: 0, в озере — глубже (плывём)
  const d = Math.hypot(x - CV_LAKE.x, z - CV_LAKE.z);
  if(d >= CV_LAKE.r || Math.hypot(x - CV_ISLET.x, z - CV_ISLET.z) < CV_ISLET.r) return 0;
  return -1.6*islSm(Math.min(1, (CV_LAKE.r - d)/0.9));
}
function cvGround(x, z){
  if(!cvIn(x, z)) return CV_WALL;
  for(const D of CV_DOORS){
    if(cvOpen(D.k)) continue;
    const a = D.ax === 'x' ? x - D.x : z - D.z, b = D.ax === 'x' ? z : x;
    if(Math.abs(a) < 0.4 && Math.abs(b) < 2) return CV_WALL;
  }
  let h = cvFloor(x, z);
  for(const s of CV_SOLID) if(Math.hypot(x - s.x, z - s.z) < s.r) h = Math.max(h, s.h);
  return h;
}
function cvBounce(x, z){ if(Math.hypot(x - CV_PAD.x, z - CV_PAD.z) < 0.9){ CV_PAD.hit = now; return CV_PAD.v; } return 0; }
// как стены выглядят: к югу от пола (между камерой и малышом) — низкие, остальные — высокие
function cvVis(x, z){
  if(cvIn(x, z)) return cvFloor(x, z);
  const n = cvHash(Math.round(x*2), Math.round(z*2));
  for(let d = 0.8; d <= 4.4; d += 0.9) if(cvIn(x, z - d)) return 0.45 + n*0.35;
  return 2.7 + n*0.9;
}

/* ---------- мебель и шапочка-подарки (js/home.js, js/shop.js) ---------- */
FURN.push({id:'lamp_crys', slot:'lamp', name:L('Кристальный ночник', 'Crystal night-light'), price:0, gift:true},
  {id:'tr_key', slot:'tr1', name:L('Золотой ключ', 'Golden key'), price:0, gift:true});
Object.assign(FURN_MAKE, {
  lamp_crys(){   // пучок светящихся сиреневых кристаллов
    const g = lampBase(0.7), m = new THREE.MeshBasicMaterial({color:0xD8C8FF});
    for(const [x, z, h, r, t] of [[0, 0, 0.8, 0.2, 0], [0.18, 0.08, 0.55, 0.14, -0.4], [-0.17, 0.06, 0.6, 0.15, 0.4], [0.02, -0.16, 0.5, 0.13, 0.25]]){
      const c = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0, r, h, 6), m), 1.08); c.position.set(x, 0.75 + h/2, z); c.rotation.z = t; g.add(c);
    }
    const gl = glow(0xE6DCFF, 2.4); gl.position.set(0, 1.2, 0.3); g.add(gl);
    g.userData = {bulb:m, on:0xD8C8FF, off:0xC4BFD6, glow:gl};
    return g;
  },
  tr_key(){   // золотой ключ из сокровищницы на постаменте
    const g = new THREE.Group(); trPedestal(g, 0.45);
    const k = cvKeyModel(TR_GOLD); k.scale.setScalar(0.95); k.position.y = 1.1; g.add(k);
    let spin = 0;
    g.userData.anim = (t, dt) => { spin = Math.max(0, spin - dt); k.rotation.y += dt*(0.8 + spin*6); k.position.y = 1.1 + Math.sin(t*2)*0.05; };
    g.userData.play = () => { spin = 1.2; sfx.sparkle(); };
    return g;
  }
});
SHOP.push({id:'minerhat', kind:'wear', slot:'head', name:L('Каска с фонариком', 'Explorer helmet'), gift:true});
WEAR.minerhat = () => {   // жёлтая каска исследователя со светящимся фонариком
  const g = new THREE.Group(), m = toon(0xFFD34D);
  const dome = addOutline(new THREE.Mesh(new THREE.SphereGeometry(0.44, 24, 12, 0, Math.PI*2, 0, Math.PI/2), m), 1.05); dome.scale.y = 0.85; g.add(dome);
  const brim = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.05, 28), m), 1.06); brim.position.y = 0.02; g.add(brim);
  const lamp = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.12, 16), toon(0x6B6A7E)), 1.1); lamp.rotation.x = Math.PI/2; lamp.position.set(0, 0.22, 0.38); g.add(lamp);
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.085, 16), new THREE.MeshBasicMaterial({color:0xFFF6C8})); lens.position.set(0, 0.22, 0.445); g.add(lens);
  const gl = glow(0xFFF3B0, 0.9); gl.position.set(0, 0.22, 0.5); g.add(gl);
  g.userData.at = [0, 0.6, -0.02, -0.15, 0, 0.1]; return g;
};
// что в сундуках
const CV_GIFT = {
  r:{give(){ if(!owns('lamp_crys')) save.owned.push('lamp_crys'); }, img:() => homeThumb('lamp_crys'),
    txt:L('Кристальный ночник для иглу! Поставь его: «Обустроить» → Лампа 💡', 'A crystal night-light for the igloo! Put it in: “Decorate” → Lamp 💡')},
  b:{give(){ if(!owns('minerhat')) save.owned.push('minerhat'); }, img:() => objThumb(WEAR.minerhat(), new V3(0.3, 0.45, 1)),
    txt:L('Каска с фонариком — для настоящих исследователей! Надень малышу: 🎀 «Нарядить»', 'An explorer helmet with a lamp — for real explorers! Put it on your pup: 🎀 “Dress up”')},
  y:{give(){ if(!owns('tr_key')) save.owned.push('tr_key'); }, shells:CV_GOLD, img:() => homeThumb('tr_key'),
    txt:L(`Золотой ключ на постаменте — для 🏆 Комнаты трофеев! И ещё ${CV_GOLD} 🐚`, `A golden key on a pedestal — for the 🏆 Trophy room! And ${CV_GOLD} 🐚 more`)}
};
if(typeof TR_MEDALS !== 'undefined') TR_MEDALS.push({ic:'🗝️', name:L('Кладоискатель', 'Treasure hunter'), how:L('Открой все сундуки пещеры', 'Open every chest in the cave'), n:() => [cvSv().chest.length, 3]});

/* ---------- собираем пещеру один раз ---------- */
const CV_CRYS_C = [0xFF9BB8, 0x9CD8F5, 0xB9A0F2, 0x8FE3C0, 0xFFE38A, 0xFFB38A];
function cvCrystal(g, col, s = 1){   // пучок светящихся кристаллов
  const m = new THREE.MeshBasicMaterial({color:col});
  for(const [x, z, h, r, t] of [[0, 0, 2.2, 0.4, 0], [0.4, 0.15, 1.4, 0.28, -0.4], [-0.38, 0.1, 1.6, 0.3, 0.35], [0.05, -0.35, 1.1, 0.25, 0.2]]){
    const c = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0, r*s, h*s, 6), m), 1.06); c.position.set(x*s, h*s/2, z*s); c.rotation.set(t*0.5, 0, t); g.add(c);
  }
  const gl = new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX, transparent:true, depthWrite:false, color:col})); gl.scale.setScalar(3.2*s); gl.position.y = 1.1*s; g.add(gl);
  return gl;
}
function cvChestMake(){
  const ch = new THREE.Group();
  const box = addOutline(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.6, 0.72), toon(0x9A6A42)), 1.04); box.position.y = 0.3; ch.add(box);
  const lidP = new THREE.Group(); lidP.position.set(0, 0.6, -0.36); ch.add(lidP);
  const lid = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 1.1, 16, 1, false, 0, Math.PI), toon(0xB07A4E)), 1.04); lid.rotation.set(0, 0, Math.PI/2); lid.rotation.order = 'ZXY'; lid.position.z = 0.36; lidP.add(lid);
  for(const x of [-0.35, 0.35]){ const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.62, 0.75), toon(0xFFD66B)); b.position.set(x, 0.3, 0); ch.add(b); }
  const lock = addOutline(new THREE.Mesh(SMALL, toon(0xFFD66B)), 1.1); lock.scale.set(0.1, 0.12, 0.05); lock.position.set(0, 0.55, 0.38); ch.add(lock);
  const gl = new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX, transparent:true, depthWrite:false})); gl.scale.setScalar(2.4); gl.position.set(0, 0.6, 0.3); ch.add(gl);
  ch.userData = {lid:lidP, gl};
  return ch;
}
let cvBuilt = false;
function cvBuild(){
  if(cvBuilt) return; cvBuilt = true;
  const G = cvRoot, U = G.userData;
  // пол и стены — одна «карта высот»: пол сиреневый, стены темнее, верх стен в инее
  const geo = new THREE.PlaneGeometry(58, 50, 116, 100); geo.rotateX(-Math.PI/2); geo.translate(0, 0, -7);
  const p = geo.attributes.position, col = new Float32Array(p.count*3), c = new THREE.Color();
  const floorC = new THREE.Color(0xA9B0D8), deepC = new THREE.Color(0x4C6C9E), rockC = new THREE.Color(0x6A7099), topC = new THREE.Color(0xC7CEEC);
  for(let i = 0; i < p.count; i++){
    const x = p.getX(i), z = p.getZ(i), h = cvVis(x, z);
    p.setY(i, h);
    if(h < -0.05) c.copy(floorC).lerp(deepC, Math.min(1, -h/1.2));
    else if(h < 0.3) c.copy(floorC).offsetHSL(0, 0, (cvHash(Math.round(x), Math.round(z)) - 0.5)*0.04);
    else c.copy(rockC).lerp(topC, Math.min(1, Math.max(0, (h - 1.8)/1.6)));
    col.set([c.r, c.g, c.b], i*3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  G.add(new THREE.Mesh(geo, new THREE.MeshToonMaterial({color:0xffffff, vertexColors:true, flatShading:true})));
  // озеро и островок
  const lake = new THREE.Mesh(new THREE.CircleGeometry(CV_LAKE.r + 0.3, 40), new THREE.MeshToonMaterial({color:0x5FB4E0, transparent:true, opacity:0.82}));
  lake.rotation.x = -Math.PI/2; lake.position.set(CV_LAKE.x, -0.12, CV_LAKE.z); G.add(lake); U.lake = lake;
  const isl = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(CV_ISLET.r, CV_ISLET.r + 0.3, 1.7, 20), toon(0xA9B0D8)), 1.03); isl.position.set(CV_ISLET.x, -0.85, CV_ISLET.z); G.add(isl);
  // выход на юге: там светло
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX, transparent:true, depthWrite:false, color:0xFFF3C4})); sun.scale.set(9, 6, 1); sun.position.set(0, 1.5, 15.6); G.add(sun);
  const exRing = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.3, 32), new THREE.MeshBasicMaterial({color:0xFFE38A, transparent:true, opacity:0.8, depthWrite:false}));
  exRing.rotation.x = -Math.PI/2; exRing.position.set(CV_EXIT[0], 0.06, CV_EXIT[1]); G.add(exRing);
  const exLbl = textSprite(`☀️ ${L('Наружу', 'Outside')}`); exLbl.scale.set(3.4, 1.28, 1); exLbl.position.set(CV_EXIT[0], 1.6, CV_EXIT[1] + 1.2); G.add(exLbl);
  U.exit = {ring:exRing, lbl:exLbl, pos:new V3(CV_EXIT[0], 0, CV_EXIT[1])};
  // двери с цветными замками
  U.doors = CV_DOORS.map(D => {
    const K = CV_KEYS[D.k], g = new THREE.Group(); g.position.set(D.x, 0, D.z); if(D.ax === 'x') g.rotation.y = Math.PI/2; G.add(g);
    const slab = cvRockMesh(3.9, 2.9, 0.5, 0xCFE8F7, 0.05); slab.position.y = 1.45; g.add(slab);
    const ringM = addOutline(new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.12, 10, 28), toon(K.col)), 1.08); ringM.position.set(0, 1.5, D.x > 0 ? -0.32 : 0.32); g.add(ringM);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), inkMat); hole.position.set(0, 1.55, D.x > 0 ? -0.33 : 0.33); if(D.x > 0) hole.rotation.y = Math.PI; g.add(hole);
    const slot = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.3), inkMat); slot.position.set(0, 1.35, D.x > 0 ? -0.33 : 0.33); if(D.x > 0) slot.rotation.y = Math.PI; g.add(slot);
    const lbl = new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTex(K.ic), transparent:true, depthWrite:false})); lbl.scale.setScalar(0.9); lbl.position.set(D.at[0], 3.6, D.at[1]); G.add(lbl);
    const lock = new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTex('🔒'), transparent:true, depthWrite:false})); lock.scale.setScalar(0.6); lock.position.set(D.at[0] + 0.55, 3.3, D.at[1]); G.add(lock);
    const room = CV_ROOMS[D.room], name = textSprite(`${room.ic} ${room.name}`); name.scale.set(3.6, 1.35, 1); name.position.set(room.x, 4.6, room.z - room.r*0.75); G.add(name);
    return {D, g, lbl, lock, name, pos:new V3(D.at[0], 0, D.at[1])};
  });
  // камень с тремя огоньками: какие ключи уже есть
  { const st = new THREE.Group(); st.position.set(3.8, 0, 3.2); G.add(st);
    const r = cvRockMesh(1.5, 1.0, 1.3, 0x8A90B8, 0.12); r.position.y = 0.5; st.add(r);
    U.orbs = Object.entries(CV_KEYS).map(([k, K], i) => { const o = addOutline(new THREE.Mesh(SMALL, new THREE.MeshBasicMaterial({color:K.col})), 1.1); o.scale.setScalar(0.17); o.position.set(-0.45 + i*0.45, 1.15, 0.15); st.add(o); return {k, K, o}; }); }
  // сталагмиты по краям зала (для красоты, за стенкой)
  for(const a of [0.45, 1.1, 2.05, 2.7, 3.55, 4.3, 5.1, 5.85]){
    const r = 8.1 + (a*7 % 1)*0.6, x = Math.cos(a)*r, z = Math.sin(a)*r;
    if(z > 4) continue;   // на юге — не загораживать
    const s = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.8 + (a*3 % 1)*1.4, 7), toon(0x9097C2)), 1.05); s.position.set(x, 0.9, z); G.add(s);
  }
  // 💎 Кристальный грот: звенящие кристаллы и высокий столп с сундуком
  U.crys = CV_CRYS.map(([x, z], i) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = i*1.3; G.add(g); return {g, gl:cvCrystal(g, CV_CRYS_C[i % CV_CRYS_C.length]), i, t:-9, x, z}; });
  { const C = CV_CHESTS.r, pl = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.55, C.y, 6), new THREE.MeshToonMaterial({color:0xC9B8F2, flatShading:true})), 1.03);
    pl.position.set(C.x, C.y/2, C.z); G.add(pl);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.42, 0.06, 6), new THREE.MeshBasicMaterial({color:0xE9E0FF})); cap.position.set(C.x, C.y + 0.02, C.z); G.add(cap); }
  // 🌊 озеро: светящиеся грибы по берегу
  for(const a of [0.3, 1.0, 2.2, 2.9, 3.5, 4.2, 5.4, 6.0]){
    const R = CV_ROOMS.lake, x = R.x + Math.cos(a)*(R.r + 0.2), z = R.z + Math.sin(a)*(R.r + 0.2);
    if(z > R.z + 3) continue;
    const g = new THREE.Group(); g.position.set(x, 0.5, z); G.add(g);
    const colM = [0x8FE3C0, 0x9CD8F5, 0xFF9BB8][Math.floor(a*3) % 3];
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.6, 8), toon(0xFFF6E8)); stem.position.y = 0.3; g.add(stem);
    const cap = addOutline(new THREE.Mesh(SMALL, new THREE.MeshBasicMaterial({color:colM})), 1.08); cap.scale.set(0.45, 0.24, 0.45); cap.position.y = 0.62; g.add(cap);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX, transparent:true, depthWrite:false, color:colM})); gl.scale.setScalar(1.8); gl.position.y = 0.7; g.add(gl);
  }
  // 👑 сокровищница: горки монеток, уступ под потолком, гриб-батут
  const coin = toon(0xFFD66B);
  for(const [x, z, s] of [[23.4, 2.4, 1], [15.2, 2.8, 0.8], [23.8, -2.2, 0.7], [16.5, 1, 0.55]]){
    const hp = addOutline(new THREE.Mesh(SMALL, coin), 1.04); hp.scale.set(0.9*s, 0.45*s, 0.8*s); hp.position.set(x, 0.1, z); G.add(hp);
    for(let i = 0; i < 5; i++){ const cn = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 12), coin); cn.position.set(x + (cvHash(i, x) - 0.5)*1.4*s, 0.3*s + cvHash(z, i)*0.2, z + (cvHash(x, i, z) - 0.5)*1.2*s); cn.rotation.set(cvHash(i, z), 0, cvHash(z, x, i)); G.add(cn); }
  }
  { const L0 = CV_LEDGE, ld = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(L0.r, L0.r + 0.25, L0.h, 8), new THREE.MeshToonMaterial({color:0x7A80AB, flatShading:true})), 1.03);
    ld.position.set(L0.x, L0.h/2, L0.z); G.add(ld);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(L0.r + 0.02, L0.r + 0.02, 0.06, 8), coin); top.position.set(L0.x, L0.h + 0.02, L0.z); G.add(top);
    const pad = islPadMake(); pad.position.set(CV_PAD.x, 0, CV_PAD.z); G.add(pad); U.pad = pad; }
  // сундуки
  U.chests = Object.entries(CV_CHESTS).map(([k, C]) => {
    const ch = cvChestMake(); ch.position.set(C.x, C.y, C.z); G.add(ch);
    return {k, C, ch, pos:new V3(C.x, C.y, C.z)};
  });
  // 💎 кристаллики
  U.gems = CV_GEMS.map(([x, z, h], i) => {
    const colG = CV_CRYS_C[(i*2 + 1) % CV_CRYS_C.length];
    const sp = addOutline(new THREE.Mesh(new THREE.OctahedronGeometry(0.3), new THREE.MeshBasicMaterial({color:colG})), 1.1); sp.scale.y = 1.4;
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX, transparent:true, depthWrite:false, color:colG})); gl.scale.setScalar(1.8);
    const y = h === 'w' ? 0.1 : cvGround(x, z) + h; sp.position.set(x, y, z); gl.position.copy(sp.position); G.add(sp, gl);
    return {i, sp, gl, y};
  });
  // акула-подружка плавает в озере
  if(save.dive.shark.friend && typeof DV_MAKE !== 'undefined'){ const sh = DV_MAKE.shark(); sh.scale.setScalar(0.85); G.add(sh); U.shark = sh; }
}
function cvShow(){
  const U = cvRoot.userData, sv = cvSv();
  for(const d of U.doors){ const o = cvOpen(d.D.k); d.g.visible = !o; d.g.position.y = 0; d.lock.visible = d.lbl.visible = !o; }
  for(const c of U.chests){ const o = sv.chest.includes(c.k); c.ch.userData.lid.rotation.x = o ? -1.2 : 0; c.ch.userData.gl.visible = !o; }
  for(const g of U.gems){ const got = sv.gem.includes(g.i); g.sp.visible = g.gl.visible = !got; }
  for(const o of U.orbs) o.o.material.color.setHex(cvHas(o.k) ? o.K.col : 0x6B6E8A);
  if(U.shark) U.shark.visible = !!save.dive.shark.friend;
}

/* ---------- вход и выход (тот же R, что на острове: меняем ему мир) ---------- */
async function cvEnter(){
  const I = ISL; if(!I || I.cave || I.fishing) return;
  const R = I.R, sv = cvSv();
  sv.n++; persist();
  I.go.hidden = true; I.near = null; mgHint('');
  sfx.whoosh(); flash();
  cvBuild(); cvShow();
  islRoot.visible = false; cvRoot.visible = true; snow.visible = false;
  I.cvScene = {fog:scene.fog, bg:scene.background};
  scene.fog = new THREE.Fog(CV_FOG, 18, 52); scene.background = new THREE.Color(CV_FOG);
  HEMI.intensity = 0.62; sun.intensity = 0.5;
  if(I.ping) I.ping.s.root.visible = false;
  I.cave = {said:new Set(), near:null, sayT:0, sharkA:0, doorT:0};
  Object.assign(R, {at:CV_POS, ground:cvGround, bounce:cvBounce, push:null, goal:null, tgt:null, hold:false, air:false, vy:0, fly:false, slide:0, yaw:Math.PI, camOn:false});
  R.pos.set(CV_EXIT[0], 0, CV_EXIT[1] - 3.4); R.vel.set(0, 0, 0);
  roamPose(R, 0); roamCam(R, 0);
  islHud(); cvIntro();
}
// обратно на остров, к входу в ущелье
function cvExit(){
  const I = ISL; if(!I || !I.cave) return;
  const R = I.R;
  sfx.whoosh(); flash(); cvOff();
  islRoot.visible = true; if(I.ping) I.ping.s.root.visible = true;
  I.cave = null; I.near = null; I.go.hidden = true; mgHint('');
  Object.assign(R, {at:ISL_POS, ground:islGround, bounce:islBounce, push:islPush, goal:null, tgt:null, hold:false, air:false, vy:0, fly:false, slide:0, yaw:0, camOn:false});
  R.pos.set(CV_MOUTH.x, islGround(CV_MOUTH.x, -11.5), -11.5); R.vel.set(0, 0, 0);
  roamPose(R, 0); roamCam(R, 0);
  cvIslShow(); islHud();
}
// вернуть небо, туман и свет острова (и когда уходим домой прямо из пещеры)
function cvOff(){
  const I = ISL; if(!I || !I.cvScene) return;
  scene.fog = I.cvScene.fog; scene.background = I.cvScene.bg; I.cvScene = null;
  homeLights(false); snow.visible = true; cvRoot.visible = false;
}
function cvIntro(){
  const sv = cvSv(), n = sv.keys.length;
  (async () => {
    if(sv.n === 1){
      sfx.arf();
      mgHint(L('Пещера под островом! Тут три двери с замками: 🔴 🔵 🟡', 'A cave under the island! Three doors with locks: 🔴 🔵 🟡'));
      await wait(4.5); if(!ISL || !ISL.cave) return;
      mgHint(n >= 3 ? L('У тебя все ключи — подходи к дверям! 🗝️', 'You have all the keys — walk up to the doors! 🗝️')
        : L('Ключи спрятаны на острове: на горе, под водой у причала, за маяком. Ищи цветные лучи!', 'The keys are hidden on the island: on the mountain, under the water by the pier, behind the lighthouse. Look for the coloured beams!'));
      await wait(5); if(ISL && ISL.cave) mgHint(L('И собирай 💎 кристаллики!', 'And collect the 💎 crystals!'));
      await wait(3.5); if(ISL && ISL.cave) mgHint('');
    } else {
      mgHint(L(`Пещера! Сокровищ: ${sv.chest.length}/3 · 💎 ${sv.gem.length}/${CV_GEMS.length}`, `The cave! Treasures: ${sv.chest.length}/3 · 💎 ${sv.gem.length}/${CV_GEMS.length}`));
      await wait(3.5); if(ISL && ISL.cave) mgHint('');
    }
  })();
}
function cvSay(key, text, once){   // подсказка внизу: раз за заход (once — раз навсегда, через tipSeen)
  const C = ISL.cave;
  if(C.said.has(key) || (once && tipSeen(once))) return;
  C.said.add(key); if(once) tipDone(once);
  sfx.arf(); mgHint(text); C.sayT = 5;
}
// коснулась подписи: выход или дверь — малыш идёт туда сам
function cvHit(cx, cy){
  const U = cvRoot.userData, list = [{lbl:U.exit.lbl, pos:U.exit.pos}, ...U.doors.filter(d => d.g.visible).map(d => ({lbl:d.lbl, pos:d.pos}))];
  let best = null, bd = 60;
  for(const o of list){ const q = toScreen(o.lbl.getWorldPosition(new V3())), d = Math.hypot(q.x - cx, q.y - cy); if(d < bd){ bd = d; best = o; } }
  return best ? {p:() => best.pos, r:1.2} : null;
}

/* ---------- кадр в пещере ---------- */
function cvStep(dt){
  const I = ISL, C = I.cave, R = I.R, P = R.pos, U = cvRoot.userData, sv = cvSv();
  roamStep(R, dt);
  I.gear.tick(R, dt);
  const room = cvRoomAt(P.x, P.z);
  // кристаллы звенят, когда проходишь рядом (каждый своей нотой)
  for(const c of U.crys){
    const d = Math.hypot(P.x - c.x, P.z - c.z);
    if(d < 1.6 && now - c.t > 0.9){ c.t = now; bell(pn(3 + c.i*2), {vol:0.07, d:1.1}); burst(TEX.star, CV_POS.clone().add(new V3(c.x, 1.8, c.z)), 5, 1.2, 0.2); }
    const k = Math.max(0, 1 - (now - c.t)/0.8);
    c.gl.material.opacity = 0.55 + Math.sin(now*2 + c.i)*0.15 + k*0.3; c.gl.scale.setScalar(3.2*(1 + k*0.35));
  }
  // 💎 кристаллики
  for(const g of U.gems){
    if(!g.sp.visible) continue;
    g.sp.rotation.y += dt*1.8; g.sp.position.y = g.y + Math.sin(now*2.2 + g.i)*0.15; g.gl.position.y = g.sp.position.y;
    const c = P.clone().add(new V3(0, 0.55*petScale(), 0));
    if(c.distanceTo(g.sp.position) < 1.25 + 0.3*petScale()) cvGemGot(g);
  }
  // гриб-батут пружинит
  { const k = Math.max(0, 1 - (now - (CV_PAD.hit || -9))/0.4); U.pad.userData.cap.scale.set(0.85*(1 + k*0.25), 0.36*(1 - k*0.45), 0.85*(1 + k*0.25)); }
  // сундуки: встала рядом (на той же высоте) — открывается
  for(const c of U.chests){
    if(sv.chest.includes(c.k)){ continue; }
    c.ch.userData.gl.material.opacity = 0.5 + Math.sin(now*3)*0.3;
    if(!R.air && Math.hypot(P.x - c.pos.x, P.z - c.pos.z) < 1.5 && Math.abs(P.y - c.pos.y) < 0.6) cvChest(c);
  }
  // акула кружит вокруг островка
  if(U.shark && U.shark.visible){
    C.sharkA += dt*0.45;
    const a = C.sharkA, x = CV_LAKE.x + Math.cos(a)*3.8, z = CV_LAKE.z + Math.sin(a)*3.8;
    U.shark.position.set(x, -0.3 + Math.sin(now*1.5)*0.06, z); U.shark.rotation.set(0, -a - Math.PI/2, Math.sin(now*3)*0.05);
    if(Math.hypot(P.x - x, P.z - z) < 3 && !C.said.has('shark')){ C.said.add('shark'); sfx.shark(); floatText(L('Привет, доктор! Тут мой тайный бассейн ♡', 'Hi, doctor! This is my secret pool ♡'), CV_POS.clone().add(new V3(x, 1.4, z)), '#3E8DB8'); }
  }
  // подсказки в комнатах
  if(room === 'crys' && !sv.chest.includes('r') && Math.hypot(P.x - CV_CHESTS.r.x, P.z - CV_CHESTS.r.z) < 3.2){
    if(owns('gball')) cvSay('gball', L('🎈 Прыгни ⤴ — и в воздухе ⤴ ещё раз! Сундук — на кристалле', '🎈 Jump ⤴ — then ⤴ again in the air! The chest is on the crystal'), 'cave:gball');
    else cvSay('nogball', L('Сундук высоко на кристалле! С 🎈 шариком-попрыгунчиком из лавки допрыгнешь', 'The chest is high up on the crystal! With the 🎈 bouncy balloon from the shop you can reach it'));
  }
  if(room === 'gold' && !sv.gem.includes(5) && Math.hypot(P.x - CV_PAD.x, P.z - CV_PAD.z) < 3) cvSay('pad', L('Гриб-батут! Подпрыгни — и на уступ, там 💎', 'A bouncy mushroom! Bounce up to the ledge — there is a 💎'));
  if(room === 'lake' && !sv.chest.includes('b')) cvSay('lake', L('Сундук на островке — плыви! 🌊', 'The chest is on the little island — swim! 🌊'));
  // двери: подошла с ключом — открывается; без ключа — где его искать
  let near = null;
  for(const d of U.doors){
    d.lbl.position.y = 3.6 + Math.sin(now*2.4 + d.D.x)*0.12;
    if(!d.g.visible || d.opening) continue;
    if(Math.hypot(P.x - d.pos.x, P.z - d.pos.z) < 2.3){ if(cvHas(d.D.k)) cvDoorOpen(d); else near = d; }
  }
  if(!near && Math.hypot(P.x - U.exit.pos.x, P.z - U.exit.pos.z) < 1.8) near = U.exit;
  U.exit.ring.scale.setScalar(1 + Math.sin(now*3)*0.08);
  if(near !== C.near){ C.near = near; cvGoShow(); }
  if(C.sayT > 0){ C.sayT -= dt; if(C.sayT <= 0) mgHint(''); }
}
function cvRoomAt(x, z){
  for(const [k, R] of Object.entries(CV_ROOMS)) if(Math.hypot(x - R.x, z - R.z) < R.r + 0.5) return k;
  return null;
}
function cvGoShow(){
  const I = ISL, o = I.cave.near, el = I.go, U = cvRoot.userData;
  if(!o){ el.hidden = true; return; }
  if(o === U.exit){
    el.innerHTML = `<button class="btn">☀️ ${L('Наружу', 'Outside')} ▶</button>`;
    el.querySelector('button').addEventListener('click', e => { e.stopPropagation(); sfx.tap(); cvExit(); });
  } else {
    const K = CV_KEYS[o.D.k];
    el.innerHTML = `<p>🔒 ${L('Дверь заперта', 'The door is locked')}</p><p class="lock">${L(`Нужен ${K.ic} ${K.name.toLowerCase()} — он ${K.where}`, `You need the ${K.ic} ${K.name.toLowerCase()} — it is ${K.where}`)}</p>`;
    sfx.bad();
  }
  el.hidden = false; sfx.tick();
}
async function cvDoorOpen(d){
  const sv = cvSv(); if(sv.open.includes(d.D.k)) return;
  d.opening = true; sv.open.push(d.D.k); persist();
  const K = CV_KEYS[d.D.k], room = CV_ROOMS[d.D.room];
  sfx.lever(); d.lock.visible = false;
  floatText(`${K.ic} ${L('Щёлк!', 'Click!')}`, CV_POS.clone().add(d.pos).add(new V3(0, 2.4, 0)), '#6B4FC0');
  await tween(1.1, k => { d.g.position.y = -3*k; d.g.position.x = d.D.x + Math.sin(k*40)*0.03*(1 - k); }, ease.io);
  d.g.visible = d.lbl.visible = false; d.opening = false;
  sfx.sparkle(); burst(TEX.star, CV_POS.clone().add(new V3(d.D.x, 1.5, d.D.z)), 16, 2.4, 0.3);
  if(ISL && ISL.cave){ mgHint(L(`Открыто! Там ${room.ic} ${room.name}`, `Open! Beyond it: ${room.ic} ${room.name}`)); ISL.cave.sayT = 4; }
}
function cvGemGot(g){
  const sv = cvSv(); g.sp.visible = g.gl.visible = false;
  if(sv.gem.includes(g.i)) return;
  sv.gem.push(g.i); persist();
  const w = CV_POS.clone().add(g.sp.position);
  sfx.star(); bell(pn(10), {vol:0.05, delay:0.1}); burst(TEX.star, w, 12, 2, 0.3);
  addShells(CV_GEM, toScreen(w)); islHud();
  if(sv.gem.length >= CV_GEMS.length){
    addShells(CV_GEM_ALL); sfx.hug();
    mgHint(L(`Все кристаллики пещеры! +${CV_GEM_ALL} 🐚 💎`, `Every crystal in the cave! +${CV_GEM_ALL} 🐚 💎`)); ISL.cave.sayT = 4;
  } else floatText(`💎 ${sv.gem.length}/${CV_GEMS.length}`, headTop(ISL.s), '#6B4FC0');
}
async function cvChest(c){
  const sv = cvSv(), I = ISL; if(sv.chest.includes(c.k) || c.busy) return;
  c.busy = true; sv.chest.push(c.k);
  const gift = CV_GIFT[c.k]; gift.give(); persist();
  const R = I.R; R.hold = false; R.tgt = null; R.goal = null;
  const at = CV_POS.clone().add(c.pos).add(new V3(0, 1, 0));
  c.ch.userData.gl.visible = false;
  sfx.lever(); await tween(0.6, k => c.ch.userData.lid.rotation.x = -1.2*ease.out(k));
  sfx.buy(); for(let i = 0; i < 3; i++) setTimeout(() => burst(TEX.star, at, 12, 2.2, 0.3), i*200);
  if(gift.shells) addShells(gift.shells, toScreen(at));
  await wait(0.7);
  if(!ISL || !ISL.cave) return;
  await dvCard({img:gift.img(), ttl:L('Сокровище! ✨', 'Treasure! ✨'), txt:gift.txt, btn:L('Ура! ✨', 'Yay! ✨')});
  if(!ISL || !ISL.cave) return;
  islHud();
  if(sv.chest.length >= 3){
    sfx.hug(); burst(TEX.heart, headTop(I.s), 20, 2.4, 0.34);
    mgHint(L(`Все сокровища пещеры! Ты ${pg('настоящий кладоискатель', 'настоящая кладоискательница')} 🗝️ Медаль — в Комнате трофеев`, 'Every treasure in the cave! You are a true treasure hunter 🗝️ Your medal is in the Trophy room'));
    I.cave.sayT = 6;
  }
}
