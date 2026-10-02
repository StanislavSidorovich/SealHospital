/* ---------------- 🗺️ Остров целиком: гуляем где хотим (Спринт 7, задача 2) ----------------
   Идея папы (28.09): Сабрина в Seally Seal почти всё время просто бродит и плавает, где хочет. Здесь весь остров —
   одна сцена, и малыша ведёт она сама (js/roam.js): держи палец — идёт туда, ⤴ — прыжок, в воде — «дельфинчик».
   На острове стоят все места из книги (ST_PLACES в story.js, раскладка как на карте «Сегодня»): больница, почта, лавка,
   иглу, прогулка, забег, горка на вершине горы, причал для ныряния, акулий плавник в море, маяк на островке…
   Подошла к знаку — внизу «Идём ▶», и открывается та же игра, что и из «Поиграть» (stGo). Замки глав — как везде.
   Чем заняться просто так: 🌟 24 звёздочки (на горе, на крышах, на льдинках, в море, на маяке), грибы-батуты,
   с горы — на пузике, из воды — кувырком. Пинг, если живёт по соседству, бродит у своего домика и увязывается следом.
   🎈 Места для вещей-умений (js/gear.js): ледяные столбы (двойной прыжок шариком), трамплин с горы (ледянка), течение
   у дальней льдинки (ласты-турбо) — у каждого по звёздочкам; без вещи подойдёшь — подсказка, что купить в лавке.
   🗝️ В скалах на востоке — ущелье и вход в пещеру, по острову спрятаны 3 ключа (js/cave.js: cvIslBuild, cvIslStep, cvEnter, cvStep).
   Вход: ⚽ «Поиграть» → 🗺️ «Гулять по острову». Сохранение: save.isl = {got:[номера звёздочек], n — сколько раз гуляли, cave — пещера}.
   Подключается после story.js (ST_PLACES, stGate, stGo) и roam.js, до game.js. */
const ISL_POS = new V3(-1400, 0, 1400);
const ISL_STAR = 2, ISL_ALL = 25;           // ракушки за новую звёздочку и за все
const ISL_NEAR = 3.0;                       // как близко подойти к знаку, чтобы позвать внутрь
if(!save.isl) save.isl = {got:[], n:0};     // Pages мог отдать старый data.js
const islRoot = new THREE.Group(); islRoot.position.copy(ISL_POS); islRoot.visible = false; scene.add(islRoot);

/* ---------- рельеф: остров-эллипс с неровным берегом, гора, холмы, островок маяка, льдинки ---------- */
const islSm = k => k*k*(3 - 2*k);
const islHill = (x, z, cx, cz, h, sg) => h*Math.exp(-((x - cx)**2 + (z - cz)**2)/(2*sg*sg));
const ISL_FLOES = [[-34, 25, 2.4], [22, 40, 2.2], [-8, 41, 2.3], [42, 6, 2.4], [-43, -12, 2.5], [8, -41, 2.2], [-55, 48, 3.2]];   // последняя — дальняя, за течением
function islCoast(x, z){   // 0 — середина острова, 1 — дальше берега (за ним дно уходит вниз)
  const nx = x/40, nz = (z + 2)/34, a = Math.atan2(nz, nx);
  return Math.hypot(nx, nz)/(1 + 0.06*Math.sin(3*a) + 0.04*Math.sin(5*a + 1) + 0.03*Math.sin(9*a + 2));
}
function islTerrain(x, z){
  let h = -1.6;
  const rr = islCoast(x, z);
  if(rr < 1){
    const top = 0.25 + islHill(x, z, 10, -17, 6.5, 5) + islHill(x, z, -10, -8, 2.2, 3.5) + islHill(x, z, -24, 12, 2, 3.5) + islHill(x, z, 24, 3, 1.2, 3)
      + 0.12*Math.sin(x*0.35)*Math.sin(z*0.3);
    h = -1.6 + (top + 1.6)*islSm(Math.min(1, (1 - rr)/0.09));
  }
  const d = Math.hypot(x - 33, z - 30);   // островок маяка
  if(d < 5) h = Math.max(h, -1.6 + 1.95*islSm(Math.min(1, (5 - d)/1.8)));
  for(const [fx, fz, fr] of ISL_FLOES) if(Math.hypot(x - fx, z - fz) < fr*0.95) h = Math.max(h, 0.25);
  return h;
}
// крыши, причал, прилавок и маяк — по ним тоже можно ходить (а на крутой край — только запрыгнуть)
const ISL_SOLID = [];
function islGround(x, z){
  let h = islTerrain(x, z);
  for(const o of ISL_SOLID){
    if(o.on && !o.on()) continue;
    if(o.dome){ const d = Math.hypot(x - o.x, z - o.z); if(d < o.r) h = Math.max(h, o.y + Math.sqrt(o.r*o.r - d*d)); }
    else if(o.cyl){ if(Math.hypot(x - o.x, z - o.z) < o.r) h = Math.max(h, o.h); }
    else if(Math.abs(x - o.x) < o.w/2 && Math.abs(z - o.z) < o.d/2) h = Math.max(h, o.h);
  }
  return h;
}
// грибы-батуты: встала — подбрасывает высоко (так достаём звёздочки в небе и на маяке)
const ISL_PADS = [{x:4, z:5, v:13}, {x:-16, z:-14, v:13}, {x:31.3, z:32.2, v:16.5}, {x:-28, z:-3, v:12}];
function islBounce(x, z){ for(const p of ISL_PADS) if(Math.hypot(x - p.x, z - p.z) < 0.9){ p.hit = now; return p.v; } return 0; }

/* ---------- 🎈 места для вещей-умений (js/gear.js) ----------
   Столбы: каждый на ISL_PILLAR_H выше прежнего — одним прыжком (≈1,4 м) не забраться, с шариком (≈2,6 м) — да.
   Трамплин: съехала с горы на ледянке быстрее need — летишь по дуге (скорость v, вверх vy) через две звёздочки в море;
   без ледянки на этом склоне на пузике ≈8,5 м/с, на ледянке ≈11,5 (замерено 29.09) — вот и разница.
   Течение: от дальней льдинки наружу со скоростью v (плывёшь 6,2 м/с — сносит; в ластах-турбо ≈10 — проплываешь). */
const ISL_PILLARS = [[15.5, 20], [17.9, 21.3], [20.4, 20]], ISL_PILLAR_H = 1.8, ISL_PILLAR_R = 1.3;
const ISL_RAMPS = [{x:10, z:-26, dx:0, dz:-1, need:10, v:15, vy:11}];
const ISL_CUR = {x:-55, z:48, r0:4.2, r1:11.5, v:6.6};
function islRampAt(rp, t){   // где летим с трамплина через t секунд (как считает roamStep: g = ROAM_G)
  const y0 = islTerrain(rp.x, rp.z) + 0.45;
  return new V3(rp.x + rp.dx*rp.v*t, y0 + rp.vy*t - ROAM_G/2*t*t, rp.z + rp.dz*rp.v*t);
}
function islPush(x, z){
  const C = ISL_CUR, dx = x - C.x, dz = z - C.z, d = Math.hypot(dx, dz);
  if(d < C.r0 - 0.8 || d > C.r1 + 1.5) return null;
  const k = Math.min(1, (d - C.r0 + 0.8)/1.6, (C.r1 + 1.5 - d)/2.5);
  return new V3(dx/d*C.v*k, 0, dz/d*C.v*k);
}

/* ---------- звёздочки: [x, z, над землёй] (в воде и в небе — как сказано; четвёртое 'abs' — высота как есть) ---------- */
const ISL_STARS = [
  [0, -9, 0.9], [-6, -2, 0.9], [10, -17, 1.0], [5, -12, 0.9], [-10, -8, 0.9],       // у старта, гора, холм
  [-22, -19, 0.9], [20, -6, 0.9], [-33, 5, 0.9], [-24, 12, 0.9], [-14, 21, 0.9],   // крыша больницы, крыша иглу, за лавкой, холм, берег
  [-17, 34.2, 1.4], [-27, 31, 'w'], [4, 39, 'w'], [17, 37, 'w'], [0, -41, 'w'],    // конец причала, море
  [-34, 25, 0.9], [-8, 41, 0.9], [42, 6, 0.9], [-43, -12, 0.9],                    // льдинки
  [33, 30, 0.9], [4, 5, 3.7], [-16, -14, 3.7], [22, -24, 1.0], [31, 14, 0.9],      // верх маяка, над батутами, у забега, у дороги
  // 🎈 с вещами-умениями (номера выше не менять — они в сохранении)
  [20.4, 20, 0.9], [-28, -3, 6.0],                                                  // 🎈 на третьем столбе, высоко над батутом у лавки
  ...[0.52, 0.72].map(t => { const p = islRampAt(ISL_RAMPS[0], t); return [p.x, p.z, p.y + 0.4, 'abs']; }),   // 🛷 на лету с трамплина
  [-55, 48, 0.9], [-5, -44, 4.1, 'abs']                                             // 🩵 на дальней льдинке, высоко над морем (только «дельфинчиком» в ластах)
];
const islStarY = ([x, z, h, abs]) => abs ? h : h === 'w' ? -0.05 : Math.max(-0.05, islGround(x, z)) + h;

/* ---------- места: ключ из ST_PLACES, где стоит, на чём, где подойти ---------- */
const ISL_PL = {
  pet:   {x:0,   z:-4,  make:islFlag},
  hosp:  {x:-22, z:-15.8, at:[-22, -19], make:g => islDome(g, 2.6, 0xFFFFFF, true)},
  mail:  {x:-2,  z:-26, make:islMailbox},
  shop:  {x:-30, z:4.2, at:[-30, 2], make:islStall},
  home:  {x:20,  z:-3.2, at:[20, -6], make:g => islDome(g, 2.3, 0xEAF4FB, false)},
  walk:  {x:-14, z:9,   make:g => islSign(g, '🐾')},
  run:   {x:22,  z:-22, at:[22, -24], make:islArch},
  road:  {x:28,  z:10,  make:islCloudArch},
  rescue:{x:9,   z:12,  make:g => islSign(g, '🔎')},
  slide: {x:10,  z:-17, make:islSlideTop},
  dive:  {x:-17, z:32.6, at:[-17, 29], make:islPier, flat:true},
  chase: {x:12,  z:36,  make:islFin, water:true},
  swim:  {x:-3,  z:38,  make:islSwimStart, water:true},
  storm: {x:33,  z:32.4, at:[33, 30], make:islLighthouse}
};

/* ---------- 🎣 охота на острове (Спринт 7, задача 2) ----------
   Три места: лунка у берега, мостки на севере, лунка на дальней льдинке. Подошла — внизу «🎣 Порыбачить ▶»: малыш встаёт
   у лунки и ныряет за рыбкой сам (охота, как у своей лунки, — fishCast/sealHunt в minigames.js). Северная рыбка — малышу на обед
   (сыт — в ведёрко домой), южная гостья и редкие рыбки острова — в «Рыбки моря» и сразу плывут в 🐠 океанариуме (ocean.js).
   У каждого места своя редкая рыбка (SEA_FISH с isle: ключ места), ночью (20–6 ч) везде клюёт рыбка-фонарик.
   Место: hole — лунка [x, z], stand — где стоит малыш (сбоку, чтобы камера видела обоих). Новое место — строчка здесь
   (и, если хочешь, своя рыбка в SEA_FISH с isle:'ключ'). */
const ISL_FISH = [
  {k:'shore', hole:[-24.7, 20.8], stand:[-22.6, 21.5], name:L('Лунка у берега', 'Shore ice hole')},
  {k:'dock',  hole:[-16.6, -36.8], stand:[-14.5, -36.1], name:L('Мостки', 'The jetty'), water:true},
  {k:'floe',  hole:[41.4, 5.8], stand:[43.5, 6.5], name:L('Лунка на льдинке', 'Ice hole on the floe')}
];
const ISL_FISH_NEW = 5, ISL_FISH_DAY = 3;   // ракушки за новую рыбку; сколько уловов в день дают по 🐚
const islNight = () => { const h = new Date().getHours(); return h >= 20 || h < 6; };

/* ---------- модельки ---------- */
function islBlob(g, col, sx, sy, sz, x = 0, y = 0, z = 0, ol = 1.06){
  const m = addOutline(new THREE.Mesh(SMALL, typeof col === 'number' ? toon(col) : col), ol); m.scale.set(sx, sy, sz); m.position.set(x, y, z); g.add(m); return m;
}
function islBox(g, col, w, h, d, x, y, z, ol = 1.03){
  const m = addOutline(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(col)), ol); m.position.set(x, y, z); g.add(m); return m;
}
function islCyl(g, col, rt, rb, h, x, y, z, seg = 20, ol = 1.04){
  const m = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), toon(col)), ol); m.position.set(x, y, z); g.add(m); return m;
}
function islDome(g, r, col, cross){
  g.add(addOutline(new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16, 0, Math.PI*2, 0, Math.PI/2), toon(col)), 1.02));
  const tun = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(r*0.42, r*0.42, r*0.6, 20, 1, false, -Math.PI/2, Math.PI), toon(col)), 1.04);
  tun.rotation.x = Math.PI/2; tun.position.set(0, 0, r*0.95); g.add(tun);
  const door = new THREE.Mesh(new THREE.CircleGeometry(r*0.3, 20, 0, Math.PI), new THREE.MeshBasicMaterial({color:cross ? 0x5C6E91 : 0x8C6A52}));
  door.position.set(0, 0, r*1.26); g.add(door);
  if(cross){
    const disc = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 28), toon(0xFFFFFF)), 1.06); disc.rotation.x = Math.PI/2; disc.position.set(0, r + 0.9, 0); g.add(disc);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9), inkMat); pole.position.y = r + 0.4; g.add(pole);
    const pk = new THREE.MeshBasicMaterial({color:0xFF6F95});
    for(const [w, h] of [[0.62, 0.2], [0.2, 0.62]]){ const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.05), pk); b.position.set(0, r + 0.9, 0.06); g.add(b); }
  } else {
    const hs = new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.heart, transparent:true, depthWrite:false})); hs.scale.setScalar(0.7); hs.position.set(0, r*0.85, r*1.3); g.add(hs);
  }
}
function islFlag(g){   // флажок с именем малыша: отсюда начинаем, сюда — «домой»
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4), inkMat); pole.position.y = 1.2; g.add(pole);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55), new THREE.MeshBasicMaterial({color:0xFF9BB8, side:THREE.DoubleSide})); fl.position.set(0.47, 2.1, 0); g.add(fl); g.userData.flag = fl;
  const bowl = islCyl(g, 0x9CC8F0, 0.38, 0.28, 0.22, 0.9, 0.11, 0.6, 20, 1.08);
  const fish = makeFish(); fish.scale.setScalar(0.4); fish.position.set(0.9, 0.3, 0.6); fish.rotation.z = 0.4; g.add(fish);
}
function islMailbox(g){
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.2), toon(0x8C6A52)); pole.position.y = 0.6; g.add(pole);
  islBox(g, 0xFF9BB8, 0.9, 0.62, 0.62, 0, 1.45, 0);
  const env = new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTex('✉️'), transparent:true, depthWrite:false})); env.scale.setScalar(0.8); env.position.set(0, 2.2, 0.2); g.add(env);
}
function islStall(g){   // лавка: прилавок (на него можно запрыгнуть) и полосатый навес
  islBox(g, 0xB88A5E, 3, 1, 1.4, 0, 0.5, -2.2);
  for(const x of [-1.4, 1.4]){ const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4), toon(0x8C6A52)); p.position.set(x, 1.2, -2.6); g.add(p); }
  for(let i = 0; i < 5; i++) islBox(g, i % 2 ? 0xFFFFFF : 0xFF9BB8, 0.64, 0.14, 1.9, -1.28 + i*0.64, 2.45, -2.3, 1.02);
  for(const [x, c] of [[-0.9, 0xFFD66B], [0, 0x7FB8F0], [0.9, 0xFF7FA3]]) islBlob(g, c, 0.2, 0.2, 0.2, x, 1.2, -2.1);
}
function islSign(g, ic){   // табличка на столбике
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.5), toon(0x8C6A52)); pole.position.y = 0.75; g.add(pole);
  islBox(g, 0xF3E2BC, 1.2, 0.8, 0.12, 0, 1.55, 0);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTex(ic), transparent:true, depthWrite:false})); s.scale.setScalar(0.75); s.position.set(0, 1.58, 0.1); g.add(s);
}
function islArch(g){   // ворота забега с флажками
  for(const x of [-1.6, 1.6]) islCyl(g, 0xFFFFFF, 0.1, 0.1, 2.6, x, 1.3, 0, 12, 1.1);
  islBox(g, 0xFF9BB8, 3.4, 0.5, 0.12, 0, 2.5, 0);
  for(let i = 0; i < 6; i++){ const f = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 3), toon([0xFFD66B, 0x7FB8F0, 0xFF7FA3][i % 3])); f.rotation.x = Math.PI; f.position.set(-1.25 + i*0.5, 2.1, 0); g.add(f); }
}
function islCloudArch(g){
  for(let i = 0; i <= 8; i++){ const a = i/8*Math.PI; islBlob(g, 0xFFFFFF, 0.55, 0.45, 0.45, Math.cos(a)*1.9, 0.3 + Math.sin(a)*2.2, 0, 1.08); }
}
function islSlideTop(g){   // на вершине: синие воротца горки и начало жёлоба вниз
  for(const x of [-0.9, 0.9]) islCyl(g, 0x7FB8F0, 0.08, 0.08, 1.6, x, 0.8, 0, 12, 1.1);
  islBox(g, 0x7FB8F0, 2, 0.35, 0.1, 0, 1.55, 0);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTex('🛷'), transparent:true, depthWrite:false})); s.scale.setScalar(0.7); s.position.set(0, 2.1, 0); g.add(s);
}
function islPier(g){   // деревянный причал в море: по нему можно пройти до конца и нырнуть
  for(let i = 0; i < 9; i++) islBox(g, i % 2 ? 0xB88A5E : 0xA87B52, 1.8, 0.16, 0.95, 0, 0.27, -4 + i, 1.02);
  for(const [x, z] of [[-0.8, -1], [0.8, -1], [-0.8, 3.5], [0.8, 3.5]]) islCyl(g, 0x8C6A52, 0.1, 0.1, 1.4, x, -0.3, z, 10, 1.1);
}
function islFin(g){   // акулий плавник кружит в море
  const f = new THREE.Group(); g.add(f); g.userData.fin = f;
  const c = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.2, 4), toon(0x8FA3B8)), 1.06); c.scale.z = 0.35; c.position.set(2.6, 0.35, 0); f.add(c);
}
function islSwimStart(g){   // 🏊 старт заплыва: два буйка с флажками качаются на волнах
  for(const x of [-1.5, 1.5]){
    const b = new THREE.Group(); b.position.x = x; g.add(b);
    const ball = addOutline(new THREE.Mesh(SMALL, toon(0xFF7F9E)), 1.06); ball.scale.set(0.5, 0.55, 0.5); b.add(ball);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.51, 0.51, 0.18, 16), toon(0xFFFFFF)); band.position.y = 0.05; b.add(band);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 6), inkMat); pole.position.y = 1.0; b.add(pole);
    const f = new THREE.Mesh(new THREE.CircleGeometry(0.3, 3), new THREE.MeshToonMaterial({color:0xFFD66B, side:THREE.DoubleSide})); f.position.set(0.22, 1.55, 0); b.add(f);
  }
  g.userData.bob = true;
}
function islLighthouse(g){   // маяк на островке: полосатая башня, наверху лампа (сверху можно постоять)
  for(let i = 0; i < 5; i++) islCyl(g, i % 2 ? 0xFFFFFF : 0xFF7F9E, 1.6 - i*0.06, 1.6 - (i - 1)*0.06, 1.1, 0, 0.55 + i*1.1, 0, 24, 1.03);
  islCyl(g, 0x3B3A4A, 1.75, 1.75, 0.12, 0, 5.56, 0, 24, 1.0);
  const lamp = new THREE.Mesh(SMALL, new THREE.MeshBasicMaterial({color:0xFFE9A8})); lamp.scale.setScalar(0.45); lamp.position.set(0, 6.3, -0.9); g.add(lamp);
  const gl = new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX, transparent:true, depthWrite:false, color:0xFFE9A8})); gl.scale.setScalar(2.6); gl.position.copy(lamp.position); g.add(gl); g.userData.glow = gl;
  const door = new THREE.Mesh(new THREE.CircleGeometry(0.5, 16, 0, Math.PI), new THREE.MeshBasicMaterial({color:0x5C6E91})); door.position.set(0, 0.01, 1.62); g.add(door);
}
function islDock(g){   // мостки рыбака на севере: доски в море, сваи, ведёрко
  for(let i = 0; i < 9; i++) islBox(g, i % 2 ? 0xB88A5E : 0xA87B52, 1.8, 0.16, 0.95, 0, 0.27, -4 + i, 1.02);
  for(const [x, z] of [[-0.8, -1], [0.8, -1], [-0.8, -3.8], [0.8, -3.8]]) islCyl(g, 0x8C6A52, 0.1, 0.1, 1.4, x, -0.3, z, 10, 1.1);
  islCyl(g, 0x7FB8F0, 0.24, 0.19, 0.34, 0.55, 0.52, -2.2, 16, 1.08);
}
function islHoleMake(water){   // лунка: тёмная вода в ледяном ободке (на мостках — просто круги на воде)
  const g = new THREE.Group();
  if(!water){
    const w = new THREE.Mesh(new THREE.CircleGeometry(0.55, 24), new THREE.MeshBasicMaterial({color:0x2F6F99})); w.rotation.x = -Math.PI/2; w.position.y = 0.03; g.add(w);
    const rim = addOutline(new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.1, 8, 24), toon(0xD6EAF5)), 1.08); rim.rotation.x = -Math.PI/2; rim.position.y = 0.05; g.add(rim);
  }
  const rp = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.34, 24), new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:0.6, depthWrite:false}));
  rp.rotation.x = -Math.PI/2; rp.position.y = 0.06; g.add(rp); g.userData.rp = rp;
  return g;
}
function islPadMake(){   // гриб-батут: ножка и розовая шляпка в горошек
  const g = new THREE.Group();
  islCyl(g, 0xFFF6E8, 0.22, 0.28, 0.5, 0, 0.25, 0, 14, 1.08);
  const cap = islBlob(g, 0xFF9BB8, 0.85, 0.36, 0.85, 0, 0.55, 0, 1.05); g.userData.cap = cap;
  for(let i = 0; i < 6; i++){ const a = i/6*Math.PI*2; const d = new THREE.Mesh(SMALL, whiteMat); d.scale.set(0.11, 0.05, 0.11); d.position.set(Math.cos(a)*0.5, 0.78, Math.sin(a)*0.5); g.add(d); }
  return g;
}
function islSnowman(g, x, z, s = 1){
  const m = new THREE.Group(); m.position.set(x, islGround(x, z), z); m.scale.setScalar(s); g.add(m);
  islBlob(m, 0xFFFFFF, 0.6, 0.55, 0.6, 0, 0.5, 0); islBlob(m, 0xFFFFFF, 0.42, 0.4, 0.42, 0, 1.3, 0);
  const n = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 8), toon(0xFFA552)); n.rotation.x = Math.PI/2; n.position.set(0, 1.3, 0.5); m.add(n);
  for(const sd of [-1, 1]){ const e = new THREE.Mesh(SMALL, inkMat); e.scale.setScalar(0.045); e.position.set(sd*0.13, 1.42, 0.37); m.add(e); }
  islCyl(m, 0xD9527E, 0.42, 0.42, 0.12, 0, 1.0, 0, 16, 1.05);
}

/* ---------- собираем остров один раз ---------- */
let islBuilt = false;
function islBuild(){
  if(islBuilt) return; islBuilt = true;
  const G = islRoot;
  // вода и дальние айсберги
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), waterMat(26)); sea.rotation.x = -Math.PI/2; sea.position.y = -0.05; G.add(sea); G.userData.sea = sea;
  for(const [x, z, s] of [[-70, -60, 6], [60, -70, 8], [85, 10, 5], [-90, 20, 7], [20, 80, 6], [-50, 75, 5]]){
    const b = makeBerg(s*0.8, x + z); b.position.set(x, -0.05, z); b.rotation.y = x; G.add(b);
  }
  // рельеф: снег сверху, у воды — голубой лёд
  const geo = new THREE.PlaneGeometry(112, 100, 112, 100); geo.rotateX(-Math.PI/2);
  const p = geo.attributes.position, col = new Float32Array(p.count*3), snowC = new THREE.Color(0xA9B6BF), iceC = new THREE.Color(0xBFE0F0), slopeC = new THREE.Color(0x8E9CC0), c = new THREE.Color();
  const driftC = new THREE.Color(0x8A9FB6), cliffC = new THREE.Color(0x76A2C4), capC = new THREE.Color(0xB4BEC4);   // снег темнее, чем видно (свет ×1,45): так видны наметы и склоны
  for(let i = 0; i < p.count; i++){
    const x = p.getX(i), z = p.getZ(i) - 2, h = islTerrain(x, z);
    p.setZ(i, z); p.setY(i, h);
    const sl = Math.hypot(islTerrain(x + 0.5, z) - islTerrain(x - 0.5, z), islTerrain(x, z + 0.5) - islTerrain(x, z - 0.5));   // склоны чуть сиреневее: видно горы
    c.copy(snowC);
    const dn = Math.sin(x*0.9 + z*0.35)*Math.sin(z*0.7 - x*0.2);   // волнистые снежные наметы
    if(dn > 0.2) c.lerp(driftC, Math.min(1, (dn - 0.2)*1.8)*0.85);
    c.lerp(slopeC, Math.min(1, sl*1.1));
    if(sl > 1.2 && Math.sin(x*1.9 + z*1.3) > -0.2) c.lerp(cliffC, Math.min(1, (sl - 1.2)*1.5)*0.75);   // на крутых склонах — голубые полосы льда
    if(h > 3.5) c.lerp(capC, Math.min(1, (h - 3.5)*0.5)*(1 - Math.min(1, sl*0.5)));   // снежные шапки на вершинах
    c.lerp(iceC, 1 - islSm(Math.max(0, Math.min(1, (h + 0.05)/0.35))));
    if(typeof ideTint === 'function') ideTint(x, z, h, c);   // 🏝️ тропинки, лёд, проталины (js/isledeco.js)
    col.set([c.r, c.g, c.b], i*3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  G.add(new THREE.Mesh(geo, new THREE.MeshToonMaterial({color:0xffffff, vertexColors:true})));
  // пена вдоль берега
  { const N = 160, pos = [], idx = [];
    for(let i = 0; i <= N; i++){
      const a = i/N*Math.PI*2, f = 1 + 0.06*Math.sin(3*a) + 0.04*Math.sin(5*a + 1) + 0.03*Math.sin(9*a + 2);
      for(const k of [0.925, 0.985]) pos.push(40*f*k*Math.cos(a), 0.0, 34*f*k*Math.sin(a) - 2);
      if(i < N){ const j = i*2; idx.push(j, j + 1, j + 2, j + 1, j + 3, j + 2); }
    }
    const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); fg.setIndex(idx);
    const foamM = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:0.55, side:THREE.DoubleSide, depthWrite:false}));
    foamM.position.y = 0.04; G.add(foamM); }
  // льдинки
  for(const [x, z, r] of ISL_FLOES){
    const f = addOutline(new THREE.Mesh(floeGeo, floe.material), 1.03); f.scale.set(r/3.3, 1, r/3.3); f.position.set(x, -0.05, z); f.rotation.y = x; G.add(f);
  }
  // места
  G.userData.pl = {};
  for(const [k, P] of Object.entries(ISL_PL)){
    const at = P.at || [P.x, P.z], g = new THREE.Group();
    g.position.set(at[0], P.water ? -0.05 : P.flat ? 0 : islTerrain(at[0], at[1]), at[1]); P.make(g); G.add(g);
    const S = ST_PLACES[k], name = k === 'pet' ? save.pet ? save.pet.name : S.name : S.name;
    const lbl = textSprite(`${k === 'pet' ? '🏠' : S.ic} ${name}`); lbl.scale.set(3.8, 1.42, 1); G.add(lbl);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.3, 32), new THREE.MeshBasicMaterial({color:0xFF9BB8, transparent:true, opacity:0.75, depthWrite:false}));
    ring.rotation.x = -Math.PI/2; G.add(ring);
    const mark = new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTex('❗'), transparent:true, depthWrite:false, depthTest:false})); mark.scale.setScalar(1.1); mark.visible = false; mark.renderOrder = 11; G.add(mark);
    G.userData.pl[k] = {k, P, g, lbl, ring, mark};
  }
  const pl = G.userData.pl;
  // по чему можно ходить (крыши, причал, прилавок, маяк)
  const at = k => ISL_PL[k].at || [ISL_PL[k].x, ISL_PL[k].z];
  ISL_SOLID.push({dome:true, x:at('hosp')[0], z:at('hosp')[1], r:2.6, y:islTerrain(...at('hosp'))});
  ISL_SOLID.push({dome:true, x:at('home')[0], z:at('home')[1], r:2.3, y:islTerrain(...at('home'))});
  ISL_SOLID.push({x:-17, z:29, w:1.8, d:9, h:0.35});   // причал
  ISL_SOLID.push({x:-30, z:-0.2, w:3, d:1.4, h:1.0 + islTerrain(-30, -0.2)});   // прилавок лавки
  ISL_SOLID.push({cyl:true, x:33, z:30, r:1.7, h:5.62 + islTerrain(33, 30)});   // маяк
  // домик Пинга — если он живёт по соседству
  const ph = nbHouse(); ph.scale.setScalar(2.4); ph.position.set(-5, islTerrain(-5, 17), 17); ph.rotation.y = 0.3; G.add(ph); G.userData.pingHouse = ph;
  ISL_SOLID.push({dome:true, x:-5, z:17, r:1.2, y:islTerrain(-5, 17), on:() => ph.visible});
  // 🎣 места рыбалки: мостки, лунки, табличка, подпись и голубое кольцо там, где встать
  { const dk = new THREE.Group(); dk.position.set(-15, 0, -33); islDock(dk); G.add(dk);
    ISL_SOLID.push({x:-15, z:-33, w:1.8, d:9, h:0.35}); }
  G.userData.fish = ISL_FISH.map(F => {
    const hy = F.water ? -0.05 : islTerrain(...F.hole), hole = islHoleMake(F.water); hole.position.set(F.hole[0], hy, F.hole[1]); G.add(hole);
    const pos = new V3(F.stand[0], islGround(...F.stand), F.stand[1]);
    const lbl = textSprite(`🎣 ${F.name}`); lbl.scale.set(3.8, 1.42, 1); lbl.position.set(F.hole[0], Math.max(hy, pos.y) + 2.6, F.hole[1]); G.add(lbl);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.05, 32), new THREE.MeshBasicMaterial({color:0x7FB8F0, transparent:true, opacity:0.75, depthWrite:false}));
    ring.rotation.x = -Math.PI/2; ring.position.set(pos.x, pos.y + 0.06, pos.z); G.add(ring);
    return {k:'fish:' + F.k, F, fish:true, pos, lbl, ring, hole, hy};
  });
  // батуты, снеговики, камушки
  G.userData.pads = ISL_PADS.map(pd => { const m = islPadMake(); m.position.set(pd.x, islGround(pd.x, pd.z), pd.z); G.add(m); pd.m = m; return m; });
  for(const [x, z, s] of [[-6, -14, 1], [15, 5, 0.9], [-26, -8, 1.1], [3, 20, 0.8]]) islSnowman(G, x, z, s);
  for(const [x, z, s] of [[-12, 0, 0.8], [6, -2, 0.6], [16, 16, 0.9], [-30, 18, 0.7], [23, -12, 0.8], [-18, -26, 0.9]]){
    const r = addOutline(new THREE.Mesh(new THREE.DodecahedronGeometry(s), toon(0xB9C2D0)), 1.05); r.scale.y = 0.6; r.position.set(x, islGround(x, z) + s*0.2, z); r.rotation.y = x; G.add(r);
  }
  islGearBuild(G);
  // 🧭 луч-маячок над местом, куда зовёт подсказка «куда дальше» (islQuest): видно издалека
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 30, 14, 1, true), new THREE.MeshBasicMaterial({color:0xFFD66B, transparent:true, opacity:0.2, depthWrite:false, side:THREE.DoubleSide}));
  beam.visible = false; G.add(beam); G.userData.beam = beam;
  if(typeof cvIslBuild === 'function') cvIslBuild(G);   // 🗝️ ущелье, вход в пещеру и ключи (js/cave.js)
  if(typeof ideBuild === 'function') ideBuild(G);       // 🏝️ мелочи, сценки у мест, чайки, тюленята (js/isledeco.js)
  // подписи и кольца — на земле у места
  for(const o of Object.values(pl)){
    const x = o.P.x, z = o.P.z, y = o.P.water ? 0 : islGround(x, z);
    o.pos = new V3(x, y, z); o.ring.position.set(x, y + 0.06, z);
    const top = o.k === 'storm' ? 7.4 : o.k === 'hosp' ? 5.4 : o.k === 'home' ? 3.6 : 3.1;
    o.lbl.position.set(o.g.position.x, o.g.position.y + top, o.g.position.z); o.mark.position.copy(o.lbl.position).add(new V3(0, 1.1, 0));
  }
  // звёздочки
  G.userData.stars = ISL_STARS.map((st, i) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.star, transparent:true, depthWrite:false})); sp.scale.setScalar(1.0);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX, transparent:true, depthWrite:false, color:0xFFE38A})); gl.scale.setScalar(2.0);
    const y = islStarY(st); sp.position.set(st[0], y, st[1]); gl.position.copy(sp.position); G.add(gl, sp);
    return {i, sp, gl, y};
  });
}

/* ---------- 🎈 места для вещей-умений: столбы, трамплин, течение ---------- */
function islGearBuild(G){
  const ice = toon(0xBFE6F7), U = G.userData;
  ISL_PILLARS.forEach(([x, z], i) => {   // ледяные столбы лесенкой: снежная шапка, голубые полоски
    const base = islTerrain(x, z), top = base + ISL_PILLAR_H*(i + 1), h = top - base + 0.4;
    const c = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(ISL_PILLAR_R, ISL_PILLAR_R*1.12, h, 18), ice), 1.04); c.position.set(x, top - h/2, z); G.add(c);
    for(let k = 1; k <= i + 1; k++){ const r = new THREE.Mesh(new THREE.TorusGeometry(ISL_PILLAR_R*1.03, 0.05, 6, 20), toon(0x7FC4E8)); r.rotation.x = Math.PI/2; r.position.set(x, base + ISL_PILLAR_H*k - 0.5, z); G.add(r); }
    islBlob(G, 0xFFFFFF, ISL_PILLAR_R*1.05, 0.2, ISL_PILLAR_R*1.05, x, top, z, 1.04);
    ISL_SOLID.push({cyl:true, x, z, r:ISL_PILLAR_R, h:top});
  });
  for(const rp of ISL_RAMPS){   // трамплин: ледяной «язык» поперёк склона, вверх на краю
    const g = new THREE.Group(), y0 = islTerrain(rp.x, rp.z); g.position.set(rp.x, y0, rp.z); g.rotation.y = Math.atan2(rp.dx, rp.dz); G.add(g);
    const w = addOutline(new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.25, 2.6), toon(0xCFEAF7)), 1.03); w.position.set(0, 0.12, -0.9); w.rotation.x = -0.32; g.add(w);
    for(const sx of [-1.1, 1.1]) islBox(g, 0x7FB8F0, 0.14, 0.4, 2.6, sx, 0.25, -0.9, 1.05).rotation.x = -0.32;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8), toon(0x8C6A52)); pole.position.set(1.9, 0.9, -0.4); g.add(pole);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45), new THREE.MeshBasicMaterial({color:0x7FB8F0, side:THREE.DoubleSide})); fl.position.set(2.27, 1.55, -0.4); g.add(fl);
  }
  // течение вокруг дальней льдинки: белые «чёрточки» бегут от неё наружу
  U.cur = [];
  const dashG = new THREE.PlaneGeometry(0.2, 1.1), dashM = new THREE.MeshBasicMaterial({color:0xFFFFFF, transparent:true, opacity:0.7, depthWrite:false});
  for(let i = 0; i < 36; i++){
    const m = new THREE.Mesh(dashG, dashM.clone()), a = i/36*Math.PI*2 + (i % 3)*0.07;
    m.rotation.x = -Math.PI/2; m.rotation.z = -a - Math.PI/2; G.add(m); U.cur.push({m, a, k:(i*0.37) % 1});
  }
  islSnowman(G, -54, 49.2, 0.7);
  // значки над местами: что тут поможет
  U.gmark = [[17.9, 20.6, 'gball', 7.6], [-28, -3, 'gball', 2.4], [ISL_RAMPS[0].x + 2, ISL_RAMPS[0].z + 0.5, 'gsled', 3], [ISL_CUR.x, ISL_CUR.z, 'gfins', 3.2]].map(([x, z, id, h]) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTex(shopItem(id).ic), transparent:true, depthWrite:false})); sp.scale.setScalar(0.9);
    const y = Math.max(0, islTerrain(x, z)) + h; sp.position.set(x, y, z); G.add(sp); return {sp, y, id};
  });
}
const ISL_GEAR_SAY = {   // подсказки: без вещи — что купить; с вещью впервые — как пользоваться
  gball:{no:L('Высоко! С 🎈 шариком-попрыгунчиком из лавки прыгнешь дважды', 'Too high! With the 🎈 bouncy balloon from the shop you can jump twice'),
    tip:L('🎈 Прыгни ⤴ — и в воздухе ⤴ ещё раз!', '🎈 Jump ⤴ — then tap ⤴ again in the air!')},
  gsled:{no:L('Разгон маловат… На 🛷 ледянке из лавки — полетишь с трамплина!', 'Not fast enough… On the 🛷 sled from the shop you would fly off the ramp!'),
    tip:L('🛷 Катись с самой вершины прямо на трамплин!', '🛷 Slide from the very top straight onto the ramp!')},
  gfins:{no:L('Ух, течение уносит! В 🩵 ластах-турбо из лавки проплывёшь', 'Whoa, the current pushes you back! With 🩵 turbo flippers from the shop you can make it'),
    tip:L('🩵 Ласты-турбо! Плыви к дальней льдинке, а «дельфинчиком» — до звёздочки над морем', '🩵 Turbo flippers! Swim to the far floe, and leap for the star above the sea')}
};
function islGearSay(id){
  const I = ISL, key = 'g:' + id;
  if(I.said.has(key)) return;
  const has = owns(id);
  if(has && tipSeen('gear:' + id)) return;
  I.said.add(key); if(has) tipDone('gear:' + id);
  sfx.arf(); mgHint(has ? ISL_GEAR_SAY[id].tip : ISL_GEAR_SAY[id].no); I.sayT = 4.5;
}
function islGearStep(dt){
  const I = ISL, R = I.R, P = R.pos, U = islRoot.userData;
  for(const g of U.gmark) g.sp.position.y = g.y + Math.sin(now*2 + g.y)*0.2;   // значки качаются
  for(const c of U.cur){   // течение: чёрточки бегут наружу
    c.k = (c.k + dt*0.35) % 1;
    const r = ISL_CUR.r0 + (ISL_CUR.r1 - ISL_CUR.r0)*c.k;
    c.m.position.set(ISL_CUR.x + Math.cos(c.a)*r, 0.0, ISL_CUR.z + Math.sin(c.a)*r);
    c.m.material.opacity = 0.7*Math.sin(c.k*Math.PI);
  }
  // трамплин: влетела быстро — полёт по дуге (звёздочки как раз на ней)
  for(const rp of ISL_RAMPS){
    if(R.fly || Math.hypot(P.x - rp.x, P.z - rp.z) > 1.5) continue;
    if(R.air && P.y - islGround(P.x, P.z) > 0.6) continue;   // на скорости со склона малыш чуть подлетает — это не прыжок
    const sp = R.vel.x*rp.dx + R.vel.z*rp.dz;
    if(sp > rp.need){
      P.set(rp.x, islTerrain(rp.x, rp.z) + 0.45, rp.z); R.air = true; R.fly = true; R.vy = rp.vy; R.vel.set(rp.dx*rp.v, 0, rp.dz*rp.v); R.slide = 1;
      sfx.whoosh(); burst(TEX.puff, ISL_POS.clone().add(P), 12, 2, 0.45); floatText(L('Уииии!', 'Wheee!'), headTop(I.s), '#2F7FB8');
    } else if(sp > 4 && !owns('gsled')) islGearSay('gsled');
  }
  // подсказки у мест: без вещи — что купить (раз за прогулку), с вещью — как пользоваться (раз навсегда)
  if(!R.air && Math.hypot(P.x - 17.9, P.z - 20.6) < 5.5) islGearSay('gball');
  if(owns('gsled') && Math.hypot(P.x - ISL_RAMPS[0].x, P.z - (ISL_RAMPS[0].z + 5)) < 5) islGearSay('gsled');
  if(islPush(P.x, P.z) && islGround(P.x, P.z) < ROAM_DEEP) islGearSay('gfins');
  if(I.sayT > 0){ I.sayT -= dt; if(I.sayT <= 0) mgHint(''); }
  I.gear.tick(R, dt);
}

/* ---------- 💬 друзья на острове (30.09): стоят у своих мест; подошла — «💬 Имя ▶», и идёт сцена-разговор (talk в js/beats.js).
   id — гость из FN_GUESTS (модель, js/finale.js) и он же герой в BT_WHO; at — где стоит; up — парит над землёй; k — ещё крупнее; h — высота значка 💬;
   ok() — уже друг; say — реплики [ru, en] (две на день, по очереди дней). Чайка — вестница: рассказывает, куда зовёт история,
   и провожает («Идём ▶» — малыш идёт к лучу сам). Новый друг — строчка здесь (и в FN_GUESTS / BT_WHO, если его там нет). ---------- */
const ISL_NPC_K = 2.4;   // за праздничным столом гости маленькие — на острове во столько раз крупнее
const ISL_NPC = [
  {id:'gull', at:[3.4, 1.0], h:1.5, ok:() => true},
  {id:'bear', at:[12.6, 13.4], k:1.9, h:3.2, ok:() => save.pt.bear, say:[
    ['Привет! Лапа совсем не болит. Ношу льдинки — строю!', 'Hi! My paw doesn’t hurt at all. I’m carrying ice blocks — building!'],
    ['Хочешь новую комнату в иглу? Я мигом! Загляни домой 🏠', 'Want a new room in the igloo? I’ll build it in a flash! Pop home 🏠'],
    ['Р-р-р… Ой, прости. Это я так здороваюсь.', 'Grrr… Oh, sorry. That’s just how I say hello.']]},
  {id:'turtle', at:[-9.2, 40.3], k:1.5, h:1.7, ok:() => typeof stGate !== 'function' || stGate('swim') < 0, say:[
    ['Не спеши… В заплыве есть короткий путь. Ищи водоросли у самого дна 🌿', 'No rush… The swim race has a short cut. Look for seaweed near the bottom 🌿'],
    ['Я плаваю тут сто лет. Ну… почти сто.', 'I’ve been swimming here a hundred years. Well… nearly.'],
    ['Кто тихо плывёт — тот всё замечает.', 'Swim slowly and you notice everything.']]},
  {id:'cloud', at:[30.6, 7.4], up:2.3, k:1.5, h:3.9, ok:() => save.coop.cs.cure >= 2 || save.coop.wins > 0, say:[
    ['Я больше не ворчу! Хочешь дождик? Кап-кап 🌧️', 'I don’t grumble any more! Want a little rain? Drip-drop 🌧️'],
    ['Сверху весь остров как на ладошке. Красиво!', 'From up here the whole island fits in your flipper. So pretty!'],
    ['Апчхи! Ой. Это не простуда, это снежинка в нос попала.', 'Achoo! Oh. Not a cold — a snowflake got up my nose.']]},
  {id:'blot', at:[-20.2, 23.2], k:1.6, h:1.9, ok:() => save.dive.gloom.st >= 3, say:[
    ['Буль! Ночью я свечусь. Приходи посмотреть ✨', 'Blub! I glow at night. Come and see ✨'],
    ['В пещере под островом темно… Я бы там посветила!', 'It’s dark in the cave under the island… I’d light it up!'],
    ['Раньше меня все боялись. А теперь зовут в гости 💜', 'Everyone used to be scared of me. Now they invite me over 💜']]},
  {id:'tiny', at:[5.6, 15.2], h:1.35, ok:() => save.coop.resc.lv.bay > 0, say:[
    ['Я больше не теряюсь! Ну… почти 😊', 'I don’t get lost any more! Well… almost 😊'],
    ['Давай в догонялки? Чур, я убегаю!', 'Shall we play tag? I’ll run first!'],
    ['Мама сказала далеко не уплывать. А вон до той льдинки — это далеко?', 'Mum said not to swim far. Is that ice floe over there far?']]},
  {id:'ray', at:[17.2, 9.4], h:1.35, ok:() => save.coop.resc.lv.glow > 0, say:[
    ['Смотри, как я свечусь! ✨', 'Look how I glow! ✨'],
    ['В пещере было темно, а ты — со светом! Спасибо!', 'The cave was dark, and you came with the light! Thank you!'],
    ['Найди все звёздочки — и остров засияет, как я!', 'Find all the stars and the island will shine like me!']]}
];
function islNpcShow(){
  const U = islRoot.userData; U.npc = U.npc || [];
  if(typeof fnGuest !== 'function' || typeof talk !== 'function') return;
  for(const N of ISL_NPC){
    let o = U.npc.find(x => x.N === N), ok = false;
    try{ ok = !!N.ok(); }catch(e){}
    if(ok && !o){
      const m = fnGuest(N.id).make(), g = islGround(N.at[0], N.at[1]), gy = g < ROAM_DEEP ? -0.22 : g;
      m.root.scale.multiplyScalar(ISL_NPC_K*(N.k || 1));
      const pos = new V3(N.at[0], gy + (N.up || 0), N.at[1]); m.root.position.copy(pos); islRoot.add(m.root);
      const tip = new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTex('💬'), transparent:true, depthWrite:false})); tip.scale.setScalar(0.85); islRoot.add(tip);
      o = {N, npc:true, m, pos, gy, tip, yaw:0, hopT:0}; U.npc.push(o);
    }
    if(o) o.m.root.visible = o.tip.visible = ok;
  }
}
function islNpcStep(dt){
  const P = ISL.R.pos;
  for(const o of islRoot.userData.npc){
    if(!o.m.root.visible) continue;
    const dx = P.x - o.pos.x, dz = P.z - o.pos.z, d = Math.hypot(dx, dz);
    if(d < 9){ const y = Math.atan2(dx, dz); o.yaw += Math.atan2(Math.sin(y - o.yaw), Math.cos(y - o.yaw))*Math.min(1, dt*4); }   // поворачивается к малышу
    o.hopT -= dt;
    const hop = o.hopT > 0 ? Math.sin((1 - o.hopT/0.5)*Math.PI)*0.45 : 0;
    o.m.root.rotation.y = o.yaw + (o.m.off || 0);
    o.m.root.position.y = o.pos.y + Math.sin(now*1.6 + o.pos.x)*(o.N.up ? 0.14 : 0.03) + hop;
    o.tip.position.set(o.pos.x, o.gy + o.N.h + Math.sin(now*3 + o.pos.x)*0.08, o.pos.z);
    o.tip.material.opacity = Math.max(0, Math.min(1, (24 - d)/6));
    if(o.m.seal) updateSeal(o.m.seal, now + o.pos.x, dt);
  }
}
const islSayL = a => L(a[0], a[1]);
async function islChat(o){
  const I = ISL; if(!I || I.fishing) return;
  I.go.hidden = true;
  const N = o.N, q = N.id === 'gull' ? I.q : null, d = new Date().getDate();
  const T = t => ({who:N.id, t});
  const lines = N.id !== 'gull' ? [T(islSayL(N.say[d % N.say.length])), T(islSayL(N.say[(d + 1) % N.say.length]))]
    : q ? [T(q.ic === '📖' ? L(`Новости острова! Дальше по истории: ${q.t}`, `Island news! Next in the story: ${q.t}`) : L(`Новости острова! Сегодня ждёт дело: ${q.t}`, `Island news! A thing of the day is waiting: ${q.t}`)),
           T(L('Видишь золотой луч? Он над этим местом. Проводить?', 'See the golden beam? It’s right above that place. Shall I show you the way?'))]
    : [T(L('Сегодня на острове тихо. Ищи звёздочки — одну я видела на крыше! 🌟', 'The island is quiet today. Look for stars — I saw one on a roof! 🌟'))];
  const k = await talk(lines, q ? {btns:[{k:'go', t:L('Идём', 'Off we go') + ' ▶'}, {k:'no', t:L('Потом', 'Later'), ghost:true}]} : {});
  if(!ISL) return;
  o.hopT = 0.5; burst(TEX.heart, ISL_POS.clone().add(o.pos).add(new V3(0, 1, 0)), 6, 1.4, 0.24);
  I.near = null; I.idleT = 0;
  if(k === 'go' && q) islWalkTo(q.k);
}

/* ---------- прогулка ---------- */
let ISL = null, isleSay = '', isleAt = null;   // isleAt — вернулись из игры: встаём там, откуда ушли
const ISL_BACK = new Set(['walk', 'run', 'road', 'rescue', 'slide', 'dive', 'chase', 'swim', 'storm']);   // после этих игр возвращаемся на остров, к тому же знаку
// o.guest — в гостях у хозяйки острова (js/isleduo.js): свой тюлень, её звёздочки, в игры — только вместе; o.at — где появиться
async function isleGo(s, o = {}){
  const G = !!o.guest, sv = save.isl, back = G ? null : isleAt; if(!G) isleAt = null;
  if(!back && !G){ sv.n++; persist(); }
  const cam0 = camOffWant.clone();
  sfx.whoosh(); flash();
  islBuild(); islRoot.visible = true; runCam.on = true; roamView(true);
  document.body.classList.add('run-on', 'isle-on');
  if(s.bubble) s.bubble.visible = false;
  setMood(s, 'happy');
  const pl = islRoot.userData.pl;
  const start = o.at ? new V3(o.at.x, 0, o.at.z) : back ? new V3(back.x, 0, back.z) : pl.pet.pos.clone().add(new V3(0, 0, 4.2));
  ISL = {s, guest:G, R:roamStart({s, at:ISL_POS, pos:start, ground:islGround, bounce:islBounce, push:islPush, gear:gearRoam(() => ISL && ISL.gear.dj())}), near:null, t:0, ping:null, said:new Set(), idleT:0, sayT:0};
  ISL.gear = gearDress(s);   // 🎈 вещи-умения видно на малыше
  ISL.R.yaw = Math.PI;   // смотрит «вперёд», на остров (от камеры)
  for(const o of Object.values(pl)){ const lock = islLock(o.k); o.lock = lock; o.ring.material.color.set(lock ? 0xB9C2D0 : 0xFF9BB8); o.hide = lock === 'hide'; o.g.visible = o.lbl.visible = o.ring.visible = !o.hide || o.k === 'storm'; }
  islRoot.userData.pingHouse.visible = typeof nbIn === 'function' && nbIn();
  islStarsShow(); islNpcShow(); if(typeof cvIslShow === 'function') cvIslShow();
  if(islRoot.userData.pingHouse.visible){
    const p = makePenguin(PENG); p.root.scale.setScalar(0.62); islRoot.add(p.root);
    ISL.ping = {s:p, pos:new V3(-3, 0, 20), vel:new V3(), yaw:0, home:new V3(-3, 0, 20), follow:false, hopT:0};
  }
  mgOpen('', {hintBottom:true});
  ISL.hud = mgNode('div', 'run-hud isl-hud', ''); islHud();
  ISL.go = mgNode('div', 'isl-go', ''); ISL.go.hidden = true;
  ISL.qEl = mgNode('button', 'isl-quest', ''); ISL.qEl.hidden = true; ISL.qT = 0;
  ISL.arrow = mgNode('div', 'isl-arrow', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 L20 20 L12 15.5 L4 20Z" fill="#FFD66B" stroke="#3B3A4A" stroke-width="2.2" stroke-linejoin="round"/></svg>'); ISL.arrow.hidden = true;
  mgOn(ISL.qEl, 'click', e => { e.stopPropagation(); if(ISL && ISL.q && islWalkTo(ISL.q.k)) sfx.tap(); });
  islQuestShow();
  const jump = mgNode('button', 'isl-jump', '<span aria-hidden="true">⤴</span>'); jump.setAttribute('aria-label', L('Прыжок', 'Jump'));
  mgOn(jump, 'pointerdown', e => { e.preventDefault(); e.stopPropagation(); roamJump(ISL.R); });
  roamControls(ISL.R, mgRoot, islHit);
  const homeB = document.createElement('button'); homeB.id = 'btnRunHome'; homeB.className = 'round home';
  homeB.innerHTML = `<span aria-hidden="true">${G ? '👋' : '🏠'}</span>`; homeB.setAttribute('aria-label', G ? L('Попрощаться', 'Say goodbye') : L('Домой', 'Home')); $('#corner').prepend(homeB);
  let done; const fin = new Promise(r => done = r); ISL.done = done;
  homeB.addEventListener('click', () => { if(ISL && ISL.fishing) return; if(G) return vsByeTap(); sfx.tap(); done(null); }); ISL.homeB = homeB;
  mgTick(dt => { if(ISL) islStep(dt); });
  if(!G) islIntro(!!back);
  const k = await fin;
  const at = {x:ISL.R.pos.x, z:ISL.R.pos.z};
  if(typeof iduEnd === 'function') iduEnd();
  // обратно в уголок малыша
  mgClose(); homeB.remove(); flash();
  document.body.classList.remove('run-on', 'isle-on');
  if(typeof cvOff === 'function') cvOff();   // ушли домой прямо из пещеры — вернуть небо и свет
  roamStop(ISL.R); ISL.gear.off();
  if(ISL.ping) islRoot.remove(ISL.ping.s.root);
  ISL = null; islRoot.visible = false; runCam.on = false; roamView(false);
  camOff.copy(cam0); camOffWant.copy(cam0);
  s.root.position.copy(PET_SPOT); s.root.rotation.set(0, 0, 0); s.happyUntil = now + 3;
  if(G) return;
  if(k === 'duo') return false;   // уходим в игру вдвоём прямо с острова (vsStart в visit.js) — прогулка не кончилась, вернёмся сюда же
  if(k && k !== 'pet'){
    const S = ST_PLACES[k]; isleSay = L(`Идём: ${S.ic} ${S.name}!`, `Off we go: ${S.ic} ${S.name}!`);
    (async () => {   // когда уголок доиграет «наигрался», идём туда, куда выбрали на острове (как «Идём ▶» в книге)
      for(let i = 0; i < 80 && (busy || !mgRoot.hidden); i++) await wait(0.1);
      if(busy || !mgRoot.hidden || !petMode) return;
      await stGo(k);
      if(!ISL_BACK.has(k)) return;
      // игра кончилась (или её отложили) — снова на остров, к тому же знаку: остров — место, откуда ходят в игры
      const open = () => busy || !mgRoot.hidden || !!document.querySelector('.overlay:not([hidden])');
      await wait(0.3);
      while(open() && petMode && !homeMode) await wait(0.2);
      await wait(0.5);
      if(open() || !petMode || homeMode || ISL) return;
      isleAt = at; funPre = 'isle'; petDo('fun');
    })();
    if(ISL_BACK.has(k)){ toast(isleSay, 2200); return false; }   // ушли в игру и вернёмся: прогулка ещё не кончилась — малыш не «нагулялся» (petDo не считает её сыгранной)
  } else isleSay = L(`${gg('Нагулялся', 'Нагулялась')} по острову! Лапки в снегу — пора купаться 🛁`, 'What a walk around the island! Snowy flippers — bath time 🛁');
}
// можно ли сейчас туда: false — да; 'hide' — места нет; иначе текст про замок
function islLock(k){
  if(k === 'pet') return false;
  const S = ST_PLACES[k];
  if(k === 'storm') return S.show && !S.show() ? stGateSay(7) : false;
  if(S.show && !S.show()) return 'hide';
  const i = typeof stGate === 'function' ? stGate(k) : -1;
  return i >= 0 ? stGateSay(i) : false;
}
function islIntro(back){
  const n = save.pet.name;
  (async () => {
    if(back){
      mgHint(L('Снова на острове! Куда дальше? 🐾', 'Back on the island! Where next? 🐾'));
      await wait(3); if(ISL) mgHint('');
    } else if(!tipSeen('isle')){
      tipDone('isle');
      mgHint(L(`Держи палец на экране — ${n} идёт туда 🐾 А ⤴ — прыжок!`, `Hold your finger on the screen — ${n} walks there 🐾 And ⤴ jumps!`));
      await wait(5); if(!ISL) return;
      mgHint(L('Ищи 🌟 звёздочки: на горе, на крышах, на льдинках, в море!', 'Look for 🌟 stars: on the hill, on roofs, on ice floes, in the sea!'));
      await wait(5); if(!ISL) return;
      mgHint(L('Подойди к знаку — и можно зайти ▶ С горы — катись на пузике!', 'Walk up to a sign to go in ▶ Slide down the hill on your tummy!'));
      await wait(5); if(ISL) mgHint('');
    } else {
      const left = ISL_STARS.length - save.isl.got.length;
      mgHint(left ? L(`Гуляем! Звёздочек осталось найти: ${left} 🌟`, `Let's explore! Stars left to find: ${left} 🌟`) : L('Гуляем! Все звёздочки найдены ✨', 'Let\'s explore! All stars found ✨'));
      await wait(3.5); if(ISL) mgHint('');
    }
  })();
}
function islHud(){
  if(!ISL) return;
  if(ISL.cave){ ISL.hud.innerHTML = cvHudPill(); return; }   // в пещере — только ключи, кристаллики и сундуки
  const sea = save.sea.got.length;
  ISL.hud.innerHTML = `<span class="pill">🌟 <b>${islGot().length}/${ISL_STARS.length}</b></span>`
    + (sea ? `<span class="pill">🐟 <b>${sea}/${SEA_FISH.length}</b></span>` : '')
    + (gearN() ? `<span class="pill">${GEAR.filter(owns).map(id => shopItem(id).ic).join('')}</span>` : '')
    + (typeof cvHudPill === 'function' ? cvHudPill() : '');
}
// чьи звёздочки видно: свои, а в гостях (js/isleduo.js) — хозяйки острова
const islGot = () => ISL && ISL.guest ? (typeof V !== 'undefined' && V && V.igot) || [] : save.isl.got;
function islStarsShow(){ const got = islGot(); for(const st of islRoot.userData.stars) st.sp.visible = st.gl.visible = !got.includes(st.i); }
/* ---------- 🧭 «куда дальше» (30.09): наклейка под звёздочками — шаг истории или дело дня, которое ждёт на острове.
   Над местом золотой луч, вокруг малыша стрелка в ту сторону; касание по наклейке — малыш идёт туда сам. ---------- */
function islQuest(){
  const pl = islRoot.userData.pl, ok = k => pl[k] && !pl[k].lock && !pl[k].hide;
  if(typeof stNextSteps === 'function') for(const {it} of stNextSteps()) if(ok(it.go)) return {k:it.go, ic:'📖', t:`${it.ic} ${it.t}`};
  if(typeof stTodayList === 'function') for(const x of stTodayList()) if(!x.done && ok(x.it.go)) return {k:x.it.go, ic:'☀️', t:`${x.it.ic} ${x.it.t()}`};
  return null;
}
function islQuestShow(){
  const I = ISL, U = islRoot.userData, q = I.cave || I.guest ? null : islQuest();   // в гостях своя история не ведёт
  const story = typeof stNextSteps === 'function' && !I.guest ? stNextSteps().map(x => x.it.go) : [];
  for(const o of Object.values(U.pl)) o.mark.visible = story.includes(o.k) && !o.lock;   // «❗» над местами истории
  I.q = q; I.qEl.hidden = !q; U.beam.visible = !!q;
  if(!q){ I.arrow.hidden = true; return; }
  const o = U.pl[q.k]; U.beam.position.set(o.pos.x, o.pos.y + 15, o.pos.z);
  const h = `<span aria-hidden="true">${q.ic}</span><b>${stEsc(q.t)}</b><i aria-hidden="true">▸</i>`;
  if(I.qH !== h){ I.qH = h; I.qEl.innerHTML = h; }
}
function islWalkTo(k){
  const I = ISL, o = I && !I.cave && !I.fishing && islRoot.userData.pl[k];
  if(!o || o.lock || o.hide) return false;
  const R = I.R; R.hold = false; R.tgt = null; R.goal = {p:() => o.pos, r:1.6};
  return true;
}
function islQuestStep(dt){
  const I = ISL, U = islRoot.userData, P = I.R.pos;
  I.qT -= dt; if(I.qT <= 0){ I.qT = 2; islQuestShow(); }
  if(!I.q) return;
  const o = U.pl[I.q.k], dx = o.pos.x - P.x, dz = o.pos.z - P.z, far = Math.hypot(dx, dz) > 9;
  U.beam.material.opacity = 0.17 + Math.sin(now*2.5)*0.06;
  I.arrow.hidden = !far;
  if(!far) return;
  // камера всегда смотрит на север: «вверх по экрану» = −z, «вправо» = +x
  const c = toScreen(ISL_POS.clone().add(P).add(new V3(0, 0.6, 0))), a = Math.atan2(dx, -dz), r = 88 + Math.sin(now*5)*5;
  I.arrow.style.transform = `translate(${(c.x + Math.sin(a)*r).toFixed(1)}px, ${(c.y - Math.cos(a)*r).toFixed(1)}px) translate(-50%, -50%) rotate(${a.toFixed(3)}rad)`;
}
// коснулась подписи места — малыш идёт туда сам
function islHit(cx, cy){
  if(ISL && ISL.cave) return (typeof iduHit === 'function' && iduHit(cx, cy)) || cvHit(cx, cy);   // в пещере вдвоём — тоже можно обнять второго
  const pal = typeof iduHit === 'function' && iduHit(cx, cy); if(pal) return pal;   // 🗺️ коснулась второго (вдвоём) — сердечки и подойти
  let best = null, bd = 60;
  const U = islRoot.userData;
  for(const o of [...Object.values(U.pl), ...U.fish, ...(U.cave ? [U.cave] : [])]){
    if(!o.lbl.visible) continue;
    const w = o.lbl.getWorldPosition(new V3()); if(w.distanceTo(camera.position) > 40) continue;
    const q = toScreen(w), d = Math.hypot(q.x - cx, q.y - cy);
    if(d < bd){ bd = d; best = o; }
  }
  return best ? {p:() => best.pos, r:best.fish ? 0.6 : 1.6} : null;
}

/* ---------- кадр ---------- */
function islStep(dt){
  const I = ISL, R = I.R, P = R.pos, U = islRoot.userData;
  I.t += dt;
  if(typeof iduStep === 'function'){ iduStep(dt); if(!ISL) return; }   // 🗺️ вдвоём (js/isleduo.js): второй тюлень, салки, спинка
  if(I.cave){ if(!I.qEl.hidden || !I.arrow.hidden) I.qEl.hidden = I.arrow.hidden = true; I.qT = 0; cvStep(dt); return; }   // 🗝️ в пещере — свой мир (js/cave.js)
  if(!(typeof iduRideStep === 'function' && iduRideStep(dt))) roamStep(R, dt);   // на спинке у второго — везут
  islQuestStep(dt);
  islGearStep(dt);
  U.sea.position.y = -0.05 + Math.sin(now*0.8)*0.03;
  // звёздочки кружатся; поймала — ракушки
  for(const st of U.stars){
    if(!st.sp.visible) continue;
    st.sp.material.rotation = Math.sin(now*2 + st.i)*0.4; st.sp.position.y = st.y + Math.sin(now*2.2 + st.i)*0.15; st.gl.position.y = st.sp.position.y;
    st.gl.material.opacity = 0.55 + Math.sin(now*3 + st.i)*0.25;
    const c = P.clone().add(new V3(0, 0.55*petScale(), 0));
    if(c.distanceTo(st.sp.position) < 1.25 + 0.3*petScale()) islStarGot(st);
  }
  // батуты пружинят
  for(const pd of ISL_PADS){ const k = Math.max(0, 1 - (now - (pd.hit || -9))/0.4); pd.m.userData.cap.scale.set(0.85*(1 + k*0.25), 0.36*(1 - k*0.45), 0.85*(1 + k*0.25)); }
  // места: подписи видно вблизи, кольцо дышит, «❗» прыгает; подошла — внизу «Идём ▶»
  let near = null, nd = ISL_NEAR;
  const camL = R.cam.clone().sub(ISL_POS);
  for(const o of Object.values(U.pl)){
    const d = Math.hypot(P.x - o.pos.x, P.z - o.pos.z), far = o.lbl.position.distanceTo(camL);
    o.lbl.material.opacity = Math.max(0, Math.min(1, (34 - far)/10));
    o.ring.scale.setScalar(1 + Math.sin(now*3)*0.08);
    if(o.mark.visible) o.mark.position.y = o.lbl.position.y + 1.1 + Math.abs(Math.sin(now*3))*0.4;
    if(o.hide || !o.ring.visible) continue;
    if(d < nd && Math.abs(P.y - o.pos.y) < 2.2){ nd = d; near = o; }
  }
  for(const o of U.fish){
    const d = Math.hypot(P.x - o.pos.x, P.z - o.pos.z);
    o.lbl.material.opacity = Math.max(0, Math.min(1, (34 - o.lbl.position.distanceTo(camL))/10));
    o.ring.scale.setScalar(1 + Math.sin(now*3 + 1)*0.08);
    const rp = o.hole.userData.rp, k = (now*0.6 + o.pos.x) % 1; rp.scale.setScalar(0.6 + k*1.4); rp.material.opacity = 0.6*(1 - k);
    if(d < Math.min(nd, 2.2) && Math.abs(P.y - o.pos.y) < 1.2){ nd = d; near = o; }
  }
  islNpcStep(dt);
  for(const o of U.npc){
    if(o.m.root.visible && Math.hypot(P.x - o.pos.x, P.z - o.pos.z) < Math.min(nd, 2.4) && Math.abs(P.y - o.gy) < 1.6){ nd = Math.hypot(P.x - o.pos.x, P.z - o.pos.z); near = o; }
  }
  const cm = typeof cvIslStep === 'function' ? cvIslStep(dt) : null;
  if(cm && Math.hypot(P.x - cm.pos.x, P.z - cm.pos.z) < nd) near = cm;
  const dn = typeof iduNear === 'function' && iduNear(nd); if(dn) near = dn;   // 🐢 рядом в воде со вторым — на спинку
  if(near !== I.near){ I.near = near; islGoShow(); }
  // плавник кружит, флажок треплется, лампа маяка мерцает
  const fin = U.pl.chase.g.userData.fin; if(fin) fin.rotation.y = now*0.7;
  const sw = U.pl.swim && U.pl.swim.g; if(sw){ sw.position.y = -0.05 + Math.sin(now*1.6)*0.08; sw.rotation.z = Math.sin(now*1.2)*0.05; }
  const fl = U.pl.pet.g.userData.flag; if(fl) fl.rotation.y = Math.sin(now*3)*0.25;
  const lg = U.pl.storm.g.userData.glow; if(lg) lg.material.opacity = 0.6 + Math.sin(now*2)*0.3;
  if(I.ping) islPingStep(dt);
  if(typeof ideStep === 'function') ideStep(dt);   // 🏝️ тень, следы, чайки, рыбки, тюленята (js/isledeco.js)
  // сидит без дела — малыш сам что-нибудь скажет
  const moving = Math.hypot(R.vel.x, R.vel.z) > 0.3 || R.air;
  I.idleT = moving ? 0 : I.idleT + dt;
  if(I.idleT > 9){ I.idleT = -6; sfx.arf(); floatText(L(['Куда пойдём?', 'Гулять!', 'Смотри, звёздочка!'], ['Where to?', 'Let\'s go!', 'Look, a star!'])[Math.floor(Math.random()*3)], headTop(I.s)); }
}
function islGoShow(){
  const I = ISL, o = I.near, el = I.go;
  if(!o){ el.hidden = true; return; }
  if(typeof iduGoShow === 'function' && iduGoShow(el, o)) return;   // 🗺️ вдвоём: игры вместе, спинка; в гостях — без рыбалки и пещеры
  if(o.cave){
    el.innerHTML = `<button class="btn">🗝️ ${L('В пещеру', 'Into the cave')} ▶</button>`;
    el.hidden = false; sfx.tick();
    el.querySelector('button').addEventListener('click', e => { e.stopPropagation(); sfx.tap(); cvEnter(); });
    return;
  }
  if(o.npc){
    el.innerHTML = `<button class="btn">💬 ${stEsc(BT_WHO[o.N.id].name())} ▶</button>`;
    el.hidden = false; sfx.tick();
    el.querySelector('button').addEventListener('click', e => { e.stopPropagation(); sfx.tap(); islChat(o); });
    return;
  }
  if(o.fish){
    el.innerHTML = `<button class="btn">🎣 ${L('Порыбачить', 'Go fishing')} ▶</button>`;
    el.hidden = false; sfx.tick();
    el.querySelector('button').addEventListener('click', e => { e.stopPropagation(); sfx.tap(); islFish(o); });
    return;
  }
  const S = ST_PLACES[o.k], name = o.k === 'pet' ? L('Домой, в уголок', 'Home to my corner') : `${S.ic} ${S.name}`;
  el.innerHTML = o.lock ? `<p>${S.ic} ${S.name}</p><p class="lock">${o.lock}</p>`
    : `<button class="btn">${name} ▶</button>`;
  el.hidden = false; sfx.tick();
  const b = el.querySelector('button');
  if(b) b.addEventListener('click', e => { e.stopPropagation(); sfx.tap(); if(ISL) ISL.done(o.k); });
}
function islStarGot(st){
  if(ISL.guest){ if(typeof iduStarSeen === 'function') iduStarSeen(st); return; }   // в гостях звёздочки хозяйки: не берём, а показываем ей
  const sv = save.isl; st.sp.visible = st.gl.visible = false;
  if(sv.got.includes(st.i)) return;
  sv.got.push(st.i); persist();
  sfx.star(); burst(TEX.star, ISL_POS.clone().add(st.sp.position), 12, 2, 0.3);
  addShells(ISL_STAR, toScreen(ISL_POS.clone().add(st.sp.position)));
  islHud();
  if(sv.got.length >= ISL_STARS.length){
    sfx.hug(); addShells(ISL_ALL); burst(TEX.heart, headTop(ISL.s), 20, 2.4, 0.34);
    mgHint(L(`Все звёздочки острова! Ты ${pg('настоящий следопыт', 'настоящая следопытка')} ✨ +${ISL_ALL} 🐚`, `Every star on the island! You are a true explorer ✨ +${ISL_ALL} 🐚`));
  } else floatText(`🌟 ${sv.got.length}/${ISL_STARS.length}`, headTop(ISL.s), '#D9527E');
}
// кто клюнет: ночью — фонарик (пока не пойман), у своего места — его редкая рыбка (не позже 3-го заброса), иначе как у лунки малыша
function islPick(F){
  const got = id => save.sea.got.includes(id), own = SEA_FISH.find(f => f.isle === F.k), lan = seaDef('lantern');
  const t = ISL.fishT[F.k] = (ISL.fishT[F.k] || 0) + 1;
  if(islNight() && !got(lan.id) && (Math.random() < 0.5 || t >= 2)) return lan;
  if(own && !got(own.id) && (Math.random() < 0.4 || t >= 3)) return own;
  if(own && Math.random() < 0.12) return own;          // уже знакомая — изредка снова в гости
  if(islNight() && Math.random() < 0.15) return lan;
  return pickCatch();
}
async function islFish(o){
  const I = ISL; if(!I || I.fishing) return;
  I.fishing = true; I.fishT = I.fishT || {};
  if(typeof iduFishBeat === 'function') iduFishBeat();   // 🗺️ вдвоём: второй видит, что рыбачу, и ждёт рядом
  const R = I.R, s = I.s, F = o.F, sv = save.sea;
  if(!sv.d) sv.d = {d:'', n:0};
  I.go.hidden = true; I.homeB.hidden = true;
  const st = mgStash();
  R.hold = false; R.tgt = null; R.goal = null; R.vel.set(0, 0, 0); R.key.set(0, 0, 0); R.slide = 0;
  // малыш подходит к лунке и поворачивается к ней, камера — сбоку-сверху, чтобы видно было и малыша, и поплавок
  const hole = new V3(F.hole[0], o.hy, F.hole[1]), from = R.pos.clone(), to = o.pos.clone();
  const yaw0 = R.yaw, dy = Math.atan2(hole.x - to.x, hole.z - to.z) - yaw0, dyaw = Math.atan2(Math.sin(dy), Math.cos(dy));
  const mid = ISL_POS.clone().add(hole).lerp(ISL_POS.clone().add(to), 0.5);
  const D = Math.max(8, 6.5/2/(Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*Math.min(1.4, camera.aspect)));   // в кадре ≈6,5 м по ширине
  const cP = mid.clone().add(new V3(0.08, 0.5, 1).multiplyScalar(D)), cL = mid.clone().add(new V3(0, -0.9, 0));
  const camT = dt => { runCam.pos.lerp(cP, Math.min(1, dt*2.5)); runCam.look.lerp(cL, Math.min(1, dt*2.5)); };
  mgTick(camT);
  await tween(0.5, k => { R.pos.lerpVectors(from, to, k); R.yaw = yaw0 + dyaw*k; roamPose(R, 0.016); }, ease.out);
  if(!tipSeen('islfish')){ tipDone('islfish'); toast(L('У каждой рыбалки — своя редкая рыбка. А ночью 🌙 клюёт светящаяся!', 'Every fishing spot has its own rare fish. And at night 🌙 a glowing one bites!'), 3200); }
  const c = await fishCast({hole:ISL_POS.clone().add(hole), cam:[mid, 3], pick:() => islPick(F), diver:s});
  unfocusCam();
  // северная — малышу на обед (сыт — в ведёрко домой), гостьи и редкие — в «Рыбки моря» и в океанариум
  const p = save.pet, hungry = !!p && !I.guest && p.needs.food < 0.95;   // в гостях (js/isleduo.js) улов — в свою коллекцию и в ведёрко
  const ate = await fishLand(c, () => hungry ? worldOf(s, s.mouthLocal) : headTop(s).add(new V3(0, 1.2, 0)));
  if(ate && hungry){
    p.needs.food = Math.min(1, p.needs.food + 0.34);
    s.mouthO.visible = true; s.smile.visible = false; sfx.chomp(); floatText(L('Ням!', 'Nom!'), headTop(s));
    await wait(0.35); s.mouthO.visible = false; s.smile.visible = true;
  } else if(ate){
    save.fish++; sfx.pop();
    if(I.guest) toast(L(`Улов — в твоё ведёрко дома! Там ${save.fish} 🐟`, `Your catch goes in your bucket at home! It holds ${save.fish} 🐟`), 2600);
    else if(p) toast(L(`${p.name} ${gg('сыт', 'сыта')} — рыбка в ведёрко домой! Там ${save.fish} 🐟`, `${p.name} is full — the fish goes in the bucket at home! It holds ${save.fish} 🐟`), 2600);
  }
  // ракушки: за новую рыбку и за первые уловы дня
  const today = ymd(); if(sv.d.d !== today) sv.d = {d:today, n:0};
  sv.d.n++;
  const sh = c.fresh ? ISL_FISH_NEW : sv.d.n <= ISL_FISH_DAY ? 1 : 0;
  persist();
  if(sh) addShells(sh, toScreen(headTop(s)));
  if(c.fresh && save.home.rooms && save.home.rooms.ocean) floatText(L('🐠 Поплыла в океанариум!', '🐠 Off to the oceanarium!'), headTop(s), '#2F7FB8');
  hop(s, 0.3, 0.4); s.happyUntil = now + 2;
  // обратно гулять: камера плавно возвращается за спину
  if(!ISL) return;
  mgRestore(st); islHud();
  R.cam.copy(runCam.pos); R.camLook.copy(runCam.look);
  I.fishing = false; I.homeB.hidden = false; I.near = null; I.idleT = 0;
}
// Пинг бродит у домика; малыш рядом — увязывается следом, далеко ушла — возвращается домой
function islPingStep(dt){
  const I = ISL, p = I.ping, P = I.R.pos, s = p.s;
  const dMe = Math.hypot(P.x - p.pos.x, P.z - p.pos.z);
  if(!p.follow && dMe < 6){ p.follow = true; if(!I.said.has('ping')){ I.said.add('ping'); sfx.quack(); floatText(L('Кря! Я с тобой!', 'Quack! I am coming too!'), s.root.position.clone().add(new V3(0, 1.6, 0)), '#3E8DB8'); } }
  if(p.follow && dMe > 22) p.follow = false;
  const tgt = p.follow ? P.clone().add(new V3(Math.sin(I.R.yaw + 2.4)*2.2, 0, Math.cos(I.R.yaw + 2.4)*2.2)) : p.home.clone().add(new V3(Math.sin(now*0.3)*2.5, 0, Math.cos(now*0.23)*2));
  const d = new V3(tgt.x - p.pos.x, 0, tgt.z - p.pos.z), l = d.length(), v = p.follow ? Math.min(ROAM_WALK*1.15, l*1.6) : Math.min(1.2, l);
  p.vel.lerp(l > 0.5 ? d.multiplyScalar(v/l) : new V3(), Math.min(1, dt*4));
  p.pos.x += p.vel.x*dt; p.pos.z += p.vel.z*dt;
  const g = islGround(p.pos.x, p.pos.z), wet = g < ROAM_DEEP;
  p.pos.y += ((wet ? -0.35 : g) - p.pos.y)*Math.min(1, dt*10);
  const sp = Math.hypot(p.vel.x, p.vel.z);
  if(sp > 0.3){ const y = Math.atan2(p.vel.x, p.vel.z); p.yaw += Math.atan2(Math.sin(y - p.yaw), Math.cos(y - p.yaw))*Math.min(1, dt*6); }
  s.root.position.copy(ISL_POS).add(p.pos); s.root.rotation.set(0, p.yaw, 0);
  s.swimming = wet; s.inner.position.y = wet ? 0 : Math.abs(Math.sin(now*9))*0.08*Math.min(1, sp);
  s.inner.rotation.z = wet ? 0 : Math.sin(now*9)*0.1*Math.min(1, sp);
  // малыш прыгнул — Пинг тоже подпрыгивает
  if(p.follow && I.R.air && p.hopT <= 0){ p.hopT = 0.9; hop(s, 0.5, 0.45); }
  p.hopT -= dt;
  updateSeal(s, now, dt);
}
