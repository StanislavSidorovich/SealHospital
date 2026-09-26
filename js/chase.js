/* ---------------- 🦈 Салки с акулой (Спринт 4, задача 1) ----------------
   Акула из подводной бухты (js/dive.js) зовёт играть в салки: «Я вожу!» — и погоня вдоль дна.
   Вид сбоку (как Rayman Jungle Run): экран едет вправо сам, малыш держится на высоте пальца (держи и веди вверх-вниз).
   🌊 течение — ускоряет, 🌿 водоросли — держат (акула догоняет), 🪼 медуза — батут, 🐡 рыба-ёж надувается,
   🪨 скалы со щелью — проплыть в просвет, 🫧 столб пузырей — поднимает, 💗 кольца — вжух (вдвоём — «Дай ласту!»),
   🐚 ракушки дорожками показывают хороший путь, ✨ жемчужинка — секрет погони.
   Акула плывёт следом и время от времени делает рывок по линии (❗ и полоска — куда): уплыви вверх или вниз.
   Догнала — «Салки!»: щекотка, кувырок вперёд, акула хохочет и отстаёт. Проиграть нельзя.
   В конце — узкая щель в скале: тюлени проскакивают, акула застревает (смешно) и зовёт играть завтра.
   Погоня дня: каждый день своя тема и своя трасса (как «Дорога дня» в js/cloudroad.js), 3 звезды:
   доплыть, собрать ракушки, найти жемчужинку. Напарник: папа по сети, Пинг или одна.
   По сети: хозяин ведёт экран (S) и акулу, гость повторяет; каждый сам следит за своим тюленем (салки, ракушки, кольца).
   Подключается после gloom.js (берёт модели акулы, медузы и водорослей из dive.js) и до visit.js. */
const CH_POS = new V3(1200, 0, 0);
const CH_LEN = 250, CH_V = 3.8;              // длина погони (м) и скорость экрана (м/с): ≈65 с
const CH_SC = 0.62, CH_SHARK_SC = 0.9;       // размер тюленей и акулы
const CH_FAST = 1.75, CH_SLOW = 0.45;        // течение и кольца ускоряют, водоросли держат (множитель своей скорости)
const CH_VY = 6.5;                           // как быстро малыш догоняет палец по высоте
const CH_GAP = 2.4;                          // на каком расстоянии акула плывёт следом
const CH_DASH_T = [6.5, 10], CH_WARN = 1.0;  // рывок акулы: раз в 6,5–10 с, ❗ предупреждает за 1 с
const CH_DAILY = 2, CH_PEARL = 5, CH_END = 5, CH_MAX = 20;  // ракушки — за первые две погони в день: каждая 4-я собранная (не больше 20), +5 за жемчужинку, +5 за финиш
const CH_TOP = -0.8;                         // выше — поверхность
const chFloor = x => -9.2 + Math.sin(x*0.07)*0.6 + Math.sin(x*0.19 + 1)*0.35;
const chBot = x => chFloor(x) + 0.85;
const chAt = (x, y, z = 0) => new V3(CH_POS.x + x, y, z);
const chRoot = new THREE.Group(); chRoot.visible = false; scene.add(chRoot);
if(!save.dive.chase) save.dive.chase = sanitizeDive(save.dive).chase || {n:0, best:0, day:{d:'', n:0, st:0}};   // Pages мог отдать старый data.js

/* ---------- мир: вода, дно, камешки, водоросли вдали (строятся один раз) ---------- */
let chBuilt = false, chBack = null;
const chSway = [];
function chBuild(){
  if(chBuilt) return; chBuilt = true;
  chBack = new THREE.Mesh(new THREE.PlaneGeometry(260, 70), new THREE.MeshBasicMaterial({map:dvGradTex(), fog:false}));
  chBack.position.set(CH_POS.x, -20, -18); chRoot.add(chBack);
  const surfTex = canvasTex(256, (g, s) => {
    g.fillStyle = '#CFF1FA'; g.fillRect(0, 0, s, s); g.strokeStyle = '#FFFFFF'; g.lineWidth = 6; g.lineCap = 'round';
    for(let i = 0; i < 9; i++){ g.beginPath(); for(let x = 0; x <= s; x += 8) g.lineTo(x, i*30 + 12 + Math.sin(x/22 + i)*8); g.stroke(); }
  });
  surfTex.wrapS = surfTex.wrapT = THREE.RepeatWrapping; surfTex.repeat.set(70, 6);
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(CH_LEN + 120, 60), new THREE.MeshBasicMaterial({map:surfTex, transparent:true, opacity:0.75, side:THREE.DoubleSide, fog:false}));
  surf.rotation.x = Math.PI/2; surf.position.copy(chAt(CH_LEN/2, 0.02, -10)); chRoot.add(surf); chRoot.userData.surf = surfTex;
  const r = (i => () => (i = (i*9301 + 49297) % 233280)/233280)(11);
  for(let x = -20; x < CH_LEN + 50; x += 9 + r()*10){ dvBlob(chRoot, 0xD6EAF5, 2 + r()*2, 0.4, 2, CH_POS.x + x, 0.05, -1.5, 1.03); }   // льдины сверху
  const sh = new THREE.Shape(); sh.moveTo(-40, -24);
  for(let x = -40; x <= CH_LEN + 70; x += 1) sh.lineTo(x, chFloor(x));
  sh.lineTo(CH_LEN + 70, -24); sh.closePath();
  const fl = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, {depth:16, bevelEnabled:false, curveSegments:1}), toon(0xD6BC8C)); fl.material.side = THREE.DoubleSide;
  fl.position.set(CH_POS.x, 0, -13.5); chRoot.add(fl);   // передний край дна — у самых тюленей: видно разрез, как в аквариуме
  for(let i = 0; i < 160; i++){   // камешки
    const x = -20 + r()*(CH_LEN + 70), z = -10 + r()*12, s = 0.15 + r()*0.3;
    const p = new THREE.Mesh(SMALL, toon([0xD7BE92, 0xC9B089, 0xF2E2C2, 0xB9C7D6][i % 4])); p.scale.set(s*1.4, s*0.6, s); p.position.copy(chAt(x, chFloor(x), z)); chRoot.add(p);
  }
  for(let i = 0; i < 40; i++){ const x = -10 + r()*(CH_LEN + 50), s = 0.5 + r()*1.1; dvBlob(chRoot, [0x8FA3B8, 0x7F93AA, 0xA3B4C6][i % 3], s*1.3, s*0.8, s, CH_POS.x + x, chFloor(x) + s*0.2, -4 - r()*6, 1.04); }
  for(let i = 0; i < 26; i++){   // кораллы вдали
    const x = r()*(CH_LEN + 30), z = -6 - r()*4, c = [0xFF9BB8, 0xFFD66B, 0x86DDB5, 0xB69CF2][i % 4];
    for(let j = 0; j < 3; j++){ const h = 0.4 + r()*0.7; const m = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, h, 8), toon(c)), 1.1); m.position.copy(chAt(x + (j - 1)*0.25, chFloor(x) + h/2, z + j*0.1)); m.rotation.z = (j - 1)*0.25; chRoot.add(m); }
  }
  for(let i = 0; i < 30; i++){ const x = r()*(CH_LEN + 30), k = dvKelp(2.5 + r()*4, [0x4FA877, 0x5DB57E, 0x3E9468][i % 3]); k.position.copy(chAt(x, chFloor(x) - 0.1, -4 - r()*6)); chRoot.add(k); chSway.push(k); }
}

/* ---------- модельки погони ---------- */
function chPuffer(){   // рыба-ёж: жёлтый шарик с иголками, смотрит на нас
  const g = new THREE.Group(), b = new THREE.Group(); g.add(b);
  dvBlob(b, 0xFFD66B, 0.45, 0.42, 0.42);
  const bl = new THREE.Mesh(SMALL, toon(0xFFF3C4)); bl.scale.set(0.36, 0.2, 0.3); bl.position.set(0, -0.2, 0.14); b.add(bl);
  const sp = new THREE.ConeGeometry(0.035, 0.2, 5), sm = toon(0xE0A23A);
  for(let i = 0; i < 26; i++){
    const y = 1 - (i + 0.5)/26*2, a = i*2.4, rr = Math.sqrt(1 - y*y), d = new V3(Math.cos(a)*rr, y, Math.sin(a)*rr);
    if(d.z > 0.5 && Math.abs(d.y) < 0.5 && Math.abs(d.x) < 0.55) continue;   // на мордочке иголок нет
    const c = new THREE.Mesh(sp, sm); c.position.copy(d).multiplyScalar(0.44); c.quaternion.setFromUnitVectors(new V3(0, 1, 0), d); b.add(c);
  }
  for(const sd of [-1, 1]){
    const e = new THREE.Mesh(SMALL, inkMat); e.scale.setScalar(0.06); e.position.set(sd*0.14, 0.08, 0.4); b.add(e);
    const h = new THREE.Mesh(SMALL, whiteMat); h.scale.setScalar(0.022); h.position.set(sd*0.14 + 0.02, 0.1, 0.46); b.add(h);
    const k = new THREE.Mesh(SMALL, new THREE.MeshBasicMaterial({color:0xFFB3C7})); k.scale.set(0.06, 0.03, 0.01); k.position.set(sd*0.24, -0.02, 0.4); b.add(k);
    const f = dvBlob(b, 0xFFC24B, 0.12, 0.05, 0.08, sd*0.44, -0.05, 0.05); f.rotation.z = sd*0.5;
  }
  const m = new THREE.Mesh(SMALL, inkMat); m.scale.set(0.05, 0.035, 0.02); m.position.set(0, -0.06, 0.43); b.add(m);
  g.userData.b = b; return g;
}
const CH_FLOW_TEX = canvasTex(128, (g, w, h) => {   // течение: светлые стрелочки
  g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round';
  for(const x of [26, 90]){ g.beginPath(); g.moveTo(x - 12, h*0.28); g.lineTo(x + 10, h*0.5); g.lineTo(x - 12, h*0.72); g.stroke(); }
}, 64);
CH_FLOW_TEX.wrapS = THREE.RepeatWrapping;
const CH_LINE_TEX = canvasTex(256, (g, w, h) => {   // полоска рывка акулы: куда она бросится (розовая, со стрелочками)
  g.fillStyle = '#FF9BB8'; g.beginPath(); g.moveTo(h/2, 4); g.lineTo(w - h/2, 4); g.arc(w - h/2, h/2, h/2 - 4, -Math.PI/2, Math.PI/2); g.lineTo(h/2, h - 4); g.arc(h/2, h/2, h/2 - 4, Math.PI/2, Math.PI*1.5); g.fill();
  g.strokeStyle = '#FFFFFF'; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
  for(let x = 40; x < w; x += 48){ g.beginPath(); g.moveTo(x - 9, h*0.25); g.lineTo(x + 7, h*0.5); g.lineTo(x - 9, h*0.75); g.stroke(); }
}, 32);
function chRing(){
  const g = new THREE.Group();
  const t = addOutline(new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.08, 10, 28), toon(0xFF9BB8)), 1.1); g.add(t);
  const h = new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.heart, transparent:true, depthWrite:false})); h.scale.setScalar(0.34); h.position.y = 0.95; g.add(h);
  return g;
}

/* ---------- погоня дня: тема и трасса (по сети — одинаковая у обоих) ----------
   w — доли [течение, водоросли, медузы, рыба-ёж, скалы, пузыри, кольца]; dash — множитель паузы между рывками; water — цвет воды. */
const CH_KINDS = ['cur', 'weed', 'jelly', 'puff', 'gap', 'bub', 'ring'];
const CH_DAYS = [
  {id:'flow', ic:'🌊', name:L('Течения', 'Currents'), about:L('много быстрых течений — лови их!', 'lots of fast currents — ride them!'), w:[0.32, 0.12, 0.12, 0.1, 0.12, 0.08, 0.14]},
  {id:'kelp', ic:'🌿', name:L('Водоросли', 'Kelp'), about:L('лес водорослей — ищи просветы!', 'a kelp forest — find the gaps!'), w:[0.14, 0.34, 0.1, 0.1, 0.12, 0.08, 0.12], water:0x3B9AA6},
  {id:'jelly', ic:'🪼', name:L('Медузы', 'Jellies'), about:L('медузы-батуты — пружинят!', 'bouncy jellyfish — boing!'), w:[0.16, 0.1, 0.36, 0.08, 0.1, 0.08, 0.12], water:0x5A86CC},
  {id:'bubble', ic:'🫧', name:L('Пузыри', 'Bubbles'), about:L('пузыри поднимают, кольца — вжух!', 'bubbles lift you up, rings go whoosh!'), w:[0.14, 0.1, 0.1, 0.08, 0.1, 0.26, 0.22]},
  {id:'puff', ic:'🐡', name:L('Рыбы-ежи', 'Pufferfish'), about:L('рыбы-ежи надуваются — проплывай мимо!', 'pufferfish puff up — swim around them!'), w:[0.14, 0.1, 0.1, 0.32, 0.18, 0.06, 0.1]},
  {id:'shark', ic:'🦈', name:L('Резвая акула', 'Frisky shark'), about:L('акула сегодня очень резвая — уворачивайся!', 'the shark is extra frisky today — dodge!'), w:[0.2, 0.14, 0.14, 0.12, 0.14, 0.12, 0.14], dash:0.7}
];
function chDay(key = advDayKey()){
  const d = Math.round(Date.parse(key)/864e5), rnd = seeded(key + 'chase');
  const th = Number.isFinite(d) ? (d + 3) % CH_DAYS.length : Math.floor(rnd()*CH_DAYS.length);
  return {th, seed:Math.floor(rnd()*1e9)};
}
const chTheme = () => CH_DAYS[chDay().th];
function chLayout(seed, T = CH_DAYS[0]){
  const r = rsRand(seed), L0 = {obs:[], shells:[], pearl:null};
  const ry = (x, m = 0.9) => chBot(x) + m + r()*(CH_TOP - chBot(x) - 2*m);
  const line = (x, y, n = 5, dx = 1.4, dy = 0) => { for(let i = 0; i < n; i++) L0.shells.push({x:x + i*dx, y:y + i*dy}); };
  const arc = (x, y, up) => { for(let i = 0; i < 5; i++) L0.shells.push({x:x + i*1.1, y:y + (up ? 1 : -1)*Math.sin(i/4*Math.PI)*1.3}); };
  const add = {
    cur(x){ const len = 8 + r()*4, y = ry(x, 1); L0.obs.push({k:'cur', x0:x, x1:x + len, y, h:1.7}); line(x + 1, y, Math.floor(len/1.6), 1.6); return len; },
    weed(x){ const len = 3.2 + r()*2, top = r() < 0.4, band = CH_TOP - chBot(x), h = band*(0.5 + r()*0.12);
      L0.obs.push({k:'weed', x0:x, x1:x + len, top, h});
      const y = top ? chBot(x) + (band - h)/2 : CH_TOP - (band - h)/2; line(x - 0.6, y, Math.ceil(len/1.3) + 1, 1.3); return len; },
    jelly(x){ const n = 1 + Math.floor(r()*3); for(let i = 0; i < n; i++) L0.obs.push({k:'jelly', x:x + i*2.3, y:ry(x, 1.1), r:0.62, ph:r()*6}); return n*2.3; },
    puff(x){ const y = ry(x, 1.3); L0.obs.push({k:'puff', x:x + 1, y, r:0.45}); arc(x - 1.2, y + (y > -4 ? -1.6 : 1.6), y <= -4); return 3; },
    gap(x){ const gh = 2.5, gy = chBot(x) + gh/2 + 0.3 + r()*(CH_TOP - chBot(x) - gh - 0.6); L0.obs.push({k:'gap', x, gy, gh, w:0.8}); line(x - 1.4, gy, 3, 1.4); return 2; },
    bub(x){ L0.obs.push({k:'bub', x, w:1.4}); line(x - 0.9, chBot(x) + 1, 4, 0.6, (CH_TOP - chBot(x) - 1.5)/3); return 2; },
    ring(x){ const lo = chBot(x) + 1.2, hi = CH_TOP - 1, a = lo + r()*(hi - lo - 1.8); L0.obs.push({k:'ring', x, ys:[a + 1.8 + r()*(hi - a - 1.8), a]}); return 2; }
  };
  // начало — по одной штуке, чтобы понять, что к чему
  line(8, -4.2, 4); add.cur(15); add.weed(30); add.jelly(40);
  let x = 50, last = '';
  const w = T.w, sum = w.reduce((a, b) => a + b, 0);
  while(x < CH_LEN - 26){
    let k = r()*sum, i = 0; while(k > w[i]){ k -= w[i]; i++; }
    let kind = CH_KINDS[i];
    if(kind === last) kind = CH_KINDS[(i + 1 + Math.floor(r()*6)) % 7];
    x += add[kind](x) + 4 + r()*3.5; last = kind;
    if(!L0.pearl && x > CH_LEN*0.45 && r() < 0.35){   // жемчужинка: у самого дна или у самой поверхности, чуть в стороне от дорожки
      const top = r() < 0.5; L0.pearl = {x:x - 2, y:top ? CH_TOP - 0.15 : chBot(x - 2) + 0.15}; x += 2;
    }
  }
  if(!L0.pearl) L0.pearl = {x:CH_LEN - 30, y:chBot(CH_LEN - 30) + 0.15};
  line(CH_LEN - 18, CH_EXIT.gy, 6, 1.5);
  return L0;
}

/* ---------- состояние ---------- */
let CH = null;
const CH_EXIT = {gy:-4.9, gh:1.7};   // щель в конце погони: тюлени проскакивают, акула застревает
function chSeal(m, name, kind, y){
  chRoot.add(m.root); m.root.scale.setScalar(kind === 'ping' ? CH_SC*0.9 : CH_SC);
  m.swimming = true; if(m.bubble) m.bubble.visible = false;
  let lbl = null;
  if(kind !== 'me'){ lbl = textSprite(name, kind === 'ping' ? '#3B8F5E' : '#3E8DB8'); lbl.scale.set(0.3 + name.length*0.17, 0.36, 1); CH.grp.add(lbl); }
  return {m, name, kind, lbl, off:kind === 'me' ? 0 : -0.6, y, ty:y, vy:0, push:0, tumble:0, safe:0, boost:0, slow:0, bump:0, caught:0, ny:y, no:0, nt:false, aiT:0, lost:false, gone:false, bubT:0, ring:-9};
}
const chPals = () => [CH.me, CH.pal].filter(p => p && !p.gone);
const chOwn = () => [CH.me, CH.pal].filter(p => p && !p.gone && p.kind !== 'net');   // за кем следим сами (свой тюлень и Пинг)
const chX = p => CH.S + p.off;
function chSay(t, ms){ mgHint(t); setTimeout(() => { if(CH && mgHintEl.textContent === t) mgHint(''); }, ms); }
function chTip(k, t, ms = 2600){ if(CH.tips.has(k)) return; CH.tips.add(k); if(!tipSeen('ch_' + k) || CH.first){ tipDone('ch_' + k); chSay(t, ms); } }

// где что: в течении, в водорослях, в пузырях
function chZone(x, y){
  let z = null;
  for(const o of CH.L.obs){
    if(o.k === 'cur' && x > o.x0 && x < o.x1 && Math.abs(y - o.y) < o.h/2) return 'cur';
    if(o.k === 'weed' && x > o.x0 && x < o.x1 && (o.top ? y > CH_TOP + 0.8 - o.h : y < chBot(x) - 0.85 + o.h)) z = 'weed';
    if(o.k === 'bub' && Math.abs(x - o.x) < o.w/2) z = z || 'bub';
  }
  return z;
}

/* ---------- свой тюлень (и Пинг): высота за пальцем, скорость от течений и водорослей ---------- */
function chBody(p, dt){
  const x0 = chX(p);
  // в конце — сами к щели
  if(CH.S > CH_LEN - 10) p.ty += (CH_EXIT.gy - p.ty)*Math.min(1, dt*(CH.st === 'end' ? 4 : 1.2));
  const z = chZone(x0, p.y);
  let mult = 1;
  if(z === 'cur'){ mult = CH_FAST; if(p === CH.me) chTip('cur', L('Течение несёт — вжух! 🌊', 'The current carries you — whoosh! 🌊'), 1800); if(Math.random() < dt*14) emit(TEX.dot, chAt(x0 - 0.5, p.y + (Math.random() - 0.5)*0.4, 0.2), {v:new V3(-2, 0, 0), life:0.4, size:0.1}); }
  if(z === 'weed'){ mult = CH_SLOW; p.slow = 0.5; if(p === CH.me){ chTip('weed', L('Водоросли держат! Плыви выше или ниже 🌿', 'The kelp holds you back! Swim above or below it 🌿')); if(!p.inW){ sfx.rub(); } } }
  p.inW = z === 'weed';
  if(z === 'bub'){ p.push = Math.max(p.push, 4.2); if(p === CH.me) chTip('bub', L('Пузыри поднимают наверх 🫧', 'Bubbles lift you up 🫧'), 1800); }
  if(p.boost > 0){ p.boost -= dt; mult = Math.max(mult, CH_FAST); }
  if(p.tumble > 0){ p.tumble = Math.max(0, p.tumble - dt); mult = Math.min(mult, 0.5); }
  if(p.slow > 0) p.slow -= dt;
  if(p.safe > 0) p.safe -= dt;
  if(p.bump > 0) p.bump -= dt;
  if(CH.st === 'end'){ p.off += Math.min(3.2, 5.8 - p.off)*dt; }
  else {
    let rel = (mult - 1)*CH_V;
    if(mult === 1) rel += p.off < 0 ? 0.55 : -Math.min(0.35, p.off*0.15);   // сам потихоньку возвращается на своё место
    p.off = Math.max(-3.4, Math.min(3.2, p.off + rel*dt));
  }
  // высота: за пальцем, плюс толчки (медуза, пузыри)
  const bot = chBot(chX(p)), want = Math.max(bot, Math.min(CH_TOP, p.ty));
  let vy = Math.max(-CH_VY, Math.min(CH_VY, (want - p.y)*6));
  if(p.push){ vy += p.push; p.push *= Math.max(0, 1 - dt*3.2); if(Math.abs(p.push) < 0.1) p.push = 0; }
  p.vy += (vy - p.vy)*Math.min(1, dt*10);
  p.y = Math.max(bot, Math.min(CH_TOP + 0.2, p.y + p.vy*dt));
  if(z === 'bub') p.ty = Math.max(p.ty, p.y);   // в пузырях палец не тянет вниз
  // препятствия
  const x = chX(p);
  for(const o of CH.L.obs){
    if(o.k === 'jelly'){
      const oy = o.y + Math.sin(now*1.3 + o.ph)*0.5, d = Math.hypot(x - o.x, p.y - oy);
      if(d < o.r + 0.4 && p.bump <= 0){
        p.bump = 0.5; p.push = (p.y >= oy ? 1 : -1)*6; p.ty = p.y + Math.sign(p.push)*1.6;
        o.sq = 0.35; sfx.boing(); if(p === CH.me) chTip('jelly', L('Медуза — батут! Боинг! 🪼', 'A jellyfish trampoline! Boing! 🪼'), 1800);
      }
    } else if(o.k === 'puff'){
      if(!o.big && o.x - x < 4 && o.x - x > -1){ o.big = true; sfx.pop(); tween(0.35, k => { o.r = 0.45 + k*0.6; }, ease.out); }
      const d = Math.hypot(x - o.x, p.y - o.y);
      if(d < o.r + 0.38 && p.tumble <= 0) chBonk(p, o, p.y >= o.y ? 1 : -1);
    } else if(o.k === 'gap'){
      if(Math.abs(x - o.x) < o.w/2 + 0.3 && Math.abs(p.y - o.gy) > o.gh/2 - 0.3 && p.tumble <= 0) chBonk(p, o, Math.sign(o.gy - p.y));
    } else if(o.k === 'ring'){
      if(p.ring !== CH.L.obs.indexOf(o) && x >= o.x && x - o.x < 1.2){
        const i = o.ys.findIndex(y => Math.abs(p.y - y) < 0.7);
        if(i >= 0){ p.ring = CH.L.obs.indexOf(o); chRingPass(o, p === CH.me ? 'me' : 'pal'); if(p === CH.me && CH.mode === 'net') netSend({t:'chr', i:p.ring}); }
      }
    }
  }
}
function chBonk(p, o, dir){
  p.tumble = 0.6; p.push = dir*4.5; p.ty = p.y + dir*1.2; p.off -= 0.6;
  sfx.plop(); if(p === CH.me) sfx.arf();
  burst(TEX.puff, chAt(chX(p), p.y, 0.3), 6, 1.2, 0.35);
  floatText(p.kind === 'ping' ? L('Кря!', 'Quack!') : L(['Ой!', 'Буль!', 'Упс!'], ['Oops!', 'Blub!', 'Whoops!'])[Math.floor(Math.random()*3)], chAt(chX(p), p.y + 0.8));
  if(o.k === 'puff' && p === CH.me) chTip('puff', L('Рыба-ёж надулась! Проплывай мимо 🐡', 'The pufferfish puffed up! Swim around 🐡'), 2000);
}
// кольцо: одному — вжух; вдвоём прошли одно и то же кольцо почти вместе — «Дай ласту!»
function chRingPass(o, who){
  o.who = o.who || {};
  o.who[who] = now;
  const p = who === 'me' ? CH.me : CH.pal;
  if(p && p.kind !== 'net'){ p.boost = Math.max(p.boost, 1.1); }
  if(who === 'me'){ sfx.boost(); floatText(L('Вжух!', 'Whoosh!'), chAt(chX(CH.me), CH.me.y + 0.9), '#D9527E'); }
  const two = chPals().length > 1;
  if(two && !o.paw && o.who.me && o.who.pal && Math.abs(o.who.me - o.who.pal) < 1.6){
    o.paw = true; CH.paws++; sfx.hug();
    for(const q of chPals()){ if(q.kind !== 'net') q.boost = 2; floatText(L('Дай ласту! 💗', 'Flippers together! 💗'), chAt(chX(q), q.y + 1.2), '#D9527E'); }
    burst(TEX.heart, chAt(chX(CH.me), CH.me.y, 0.3), 12, 2, 0.3);
    chHud();
  }
  if(who === 'me') chTip('ring', two ? L('Проплывите кольца вместе — «Дай ласту!» 💗', 'Swim through the rings together — flippers together! 💗') : L('Кольца дают вжух! 💗', 'Rings give you a whoosh! 💗'), 2200);
}
function chShell(i){
  const sh = CH.L.shells[i]; if(!sh || sh.got) return;
  sh.got = true; CH.shells++; CH.grp.remove(sh.o); sfx.coin();
  emit(TEX.star, sh.o.position, {v:new V3(0, 1, 0), life:0.45, size:0.22, spin:4});
  chHud();
}
function chPearl(){
  const P = CH.L.pearl; if(P.got) return;
  P.got = true; CH.grp.remove(P.o); sfx.sparkle(); sfx.good();
  burst(TEX.star, chAt(P.x, P.y, 0.3), 14, 2, 0.3);
  floatText(L('Жемчужинка! ✨', 'A pearl! ✨'), chAt(P.x, P.y + 1), '#D9527E');
  chHud();
}

/* ---------- Пинг: смотрит вперёд, выбирает высоту получше, держится рядом с тобой ---------- */
function chAI(p, dt){
  if((p.aiT -= dt) > 0) return;
  p.aiT = 0.25 + Math.random()*0.1;
  const x = chX(p), bot = chBot(x + 3), S = CH.sh;
  let best = p.ty, bs = -1e9;
  for(let i = 0; i <= 10; i++){
    const y = bot + (CH_TOP - bot)*i/10;
    let s = -Math.abs(y - p.y)*0.35 - Math.abs(y - CH.me.y)*0.12 - (Math.abs(y - CH.me.y) < 1.1 ? 3 : 0);   // рядом, но не на голове
    for(const o of CH.L.obs){
      const ox = o.x !== undefined ? o.x : o.x0, ahead = ox - x;
      if(o.x1 !== undefined ? (o.x1 < x || o.x0 - x > 7) : (ahead < -0.5 || ahead > 6.5)) continue;
      if(o.k === 'cur' && Math.abs(y - o.y) < o.h/2 - 0.2) s += 4;
      if(o.k === 'weed' && (o.top ? y > CH_TOP + 1 - o.h : y < chBot(ox) - 0.6 + o.h)) s -= 9;
      if(o.k === 'jelly' && Math.abs(y - o.y) < 1.4) s -= 5;
      if(o.k === 'puff' && Math.abs(y - o.y) < 1.7) s -= 7;
      if(o.k === 'gap' && Math.abs(y - o.gy) > o.gh/2 - 0.5) s -= 10;
      if(o.k === 'ring' && o.ys.some(ry => Math.abs(y - ry) < 0.4)) s += 3;
    }
    for(const sh of CH.L.shells) if(!sh.got && sh.x - x > 0 && sh.x - x < 5 && Math.abs(sh.y - y) < 0.6) s += 0.8;
    if(S && (S.st === 'warn' || S.st === 'dash') && S.tgt === (p === CH.me ? 'me' : 'pal') && Math.abs(y - S.ly) < 1.3) s -= 14;
    if(s > bs){ bs = s; best = y; }
  }
  p.ty = best;
}

/* ---------- акула: плывёт следом, иногда бросается вперёд по линии ---------- */
function chSharkTarget(){
  const ps = chPals(); let t = ps[0];
  for(const p of ps) if(p.off - (p.slow > 0 ? 2 : 0) < t.off - (t.slow > 0 ? 2 : 0)) t = p;   // кто позади или застрял в водорослях
  return t;
}
function chSharkStep(dt){
  const S = CH.sh, go = CH.st === 'go';
  S.t -= dt;
  const tp = chSharkTarget(), tk = tp === CH.me ? 'me' : 'pal';
  const moveOff = (want, v) => { const d = want - S.off; S.off += Math.sign(d)*Math.min(Math.abs(d), v*dt); };
  if(S.st === 'come'){ moveOff(tp.off - CH_GAP - 0.6, 3); S.y += (tp.y - S.y)*Math.min(1, dt*0.8); if(S.t <= 0){ S.st = 'follow'; S.t = CH_DASH_T[0]*0.7; } }
  else if(S.st === 'follow'){
    moveOff(tp.off - (tp.slow > 0 || tp.tumble > 0 ? 0.2 : CH_GAP), tp.slow > 0 ? 2.4 : 1.6);
    S.y += (tp.y - S.y)*Math.min(1, dt*0.9);
    if(go && S.t <= 0 && CH.S > 12 && CH.S < CH_LEN - 16){ S.st = 'warn'; S.t = CH_WARN; S.tgt = tk; S.ly = tp.y; chWarn(true); }
  } else if(S.st === 'warn'){
    moveOff(tp.off - CH_GAP - 0.3, 1.5); S.y += (S.ly - S.y)*Math.min(1, dt*5);
    if(S.t <= 0){ S.st = 'dash'; S.t = 1.05; sfx.whoosh(); }
  } else if(S.st === 'dash'){
    S.off += 6.2*dt; S.y += (S.ly - S.y)*Math.min(1, dt*6);
    if(S.t <= 0){ S.st = 'follow'; S.t = (CH_DASH_T[0] + Math.random()*(CH_DASH_T[1] - CH_DASH_T[0]))*(CH.T.dash || 1); chWarn(false); if(!S.hit){ chSharkMiss(); } S.hit = false; }
  } else if(S.st === 'laugh'){
    moveOff(tp.off - 6.5, 3.2); S.y += (tp.y - S.y)*Math.min(1, dt*0.6);
    if(S.t <= 0){ S.st = 'follow'; S.t = Math.max(3, CH_DASH_T[0]*0.6); }
  }
  S.off = Math.max(-8, Math.min(S.st === 'dash' ? 6 : 1.5, S.off));
  // догнала? (своих — сама; напарник по сети проверяет себя сам и присылает chtag)
  for(const p of chOwn()) if(chTouch(p, S)) chTag(p);
}
function chTouch(p, S){
  if(p.safe > 0 || CH.st !== 'go' || !(S.st === 'dash' || S.st === 'follow' || S.st === 'warn')) return false;
  const dx = p.off - S.off;
  return dx > -0.3 && dx < 1.25 && Math.abs(p.y - S.y) < 0.75;
}
function chTag(p, remote){   // салки! щекотка, кувырок вперёд, акула хохочет
  if(p && p.kind !== 'net'){
    p.tumble = 0.8; p.off = Math.min(3.2, p.off + 2.2); p.safe = 2.4; p.caught++;
    if(p === CH.me){ CH.caught++; if(CH.mode === 'net') netSend({t:'chtag'}); }
  }
  const S = CH.sh; if(S.st === 'laugh') return;
  if(S.st === 'warn' || S.st === 'dash') chWarn(false);
  S.hit = true;
  if(CH.host){ S.st = 'laugh'; S.t = 2.2; }
  sfx.giggle(); sfx.boing();
  const who = p || CH.pal, at = who ? chAt(chX(who), who.y + 0.9, 0.3) : chAt(CH.S, -3);
  burst(TEX.heart, at, 8, 1.4, 0.28);
  floatText(p === CH.me ? L('Салки! Щекотно! 😄', 'Tag! That tickles! 😄') : L('Салки! 😄', 'Tag! 😄'), at, '#D9527E');
  if(p === CH.me && !CH.saidTag){ CH.saidTag = true; chSay(L('Это просто салки! Плывём дальше 🫧', 'It\'s just tag! Keep swimming 🫧'), 2200); }
}
function chSharkMiss(){
  const S = CH.sh;
  floatText(L(['Мимо!', 'Эх!', 'Ускользнула!'], ['Missed!', 'Aww!', 'Slipped away!'])[Math.floor(Math.random()*3)], chAt(CH.S + S.off + 0.8, S.y + 1), '#3B3A4A');
  CH.dodges++;
  if(CH.dodges === 1) chSay(L('Увернулась! Так держать 👍', 'Dodged it! Keep it up 👍'), 1600);
}
function chWarn(on){
  const S = CH.sh;
  S.line.visible = on;
  if(on){
    sfx.shark(); floatText('❗', chAt(CH.S + S.off + 0.4, S.y + 1.1), '#D9527E');
    chTip('dash', L('❗ Акула сейчас бросится по полоске — уплывай вверх или вниз!', '❗ The shark is about to dash along the stripe — swim up or down!'), 2600);
  }
}
function chSharkPose(dt){
  const S = CH.sh, o = S.o, stuck = S.st === 'stuck';
  const x = stuck ? S.stx : CH.S + S.off;
  o.position.copy(chAt(x, S.y + Math.sin(now*2)*0.1 + (stuck ? Math.sin(now*28)*0.04 : 0), 0.25));
  o.rotation.z = S.st === 'laugh' ? Math.sin(now*9)*0.25 : S.st === 'warn' ? Math.sin(now*30)*0.06 : 0;
  o.userData.fl.forEach(f => f.rotation.y = Math.sin(now*(S.st === 'dash' || stuck ? 16 : S.st === 'warn' ? 12 : 6))*0.45);
  if(S.line.visible){ S.line.position.copy(chAt(CH.S + S.off + 4.2, S.ly, 0.1)); S.line.material.opacity = 0.6 + Math.sin(now*14)*0.25; }
}

/* ---------- кадр ---------- */
function chStep(dt){
  if(!CH) return;
  const C = CH, go = C.st === 'go';
  if(go){
    C.S += CH_V*dt;
    for(const p of chOwn()){ if(p.kind === 'ping') chAI(p, dt); chBody(p, dt); }
    // ракушки и жемчужинка: берёт любой свой тюлень
    for(let i = 0; i < C.L.shells.length; i++){
      const sh = C.L.shells[i]; if(sh.got || sh.x < C.S - 5 || sh.x > C.S + 5) continue;
      for(const p of chOwn()) if(Math.abs(chX(p) - sh.x) < 0.55 && Math.abs(p.y - sh.y) < 0.6){ chShell(i); if(C.mode === 'net') netSend({t:'chk', i}); break; }
    }
    const P = C.L.pearl;
    if(!P.got) for(const p of chOwn()) if(Math.hypot(chX(p) - P.x, p.y - P.y) < 0.75){ chPearl(); if(C.mode === 'net') netSend({t:'chpl'}); break; }
    if(C.host){ chSharkStep(dt); if(C.S >= CH_LEN) chFinish(); }
    else if(C.net){   // гость: акула — где у хозяина
      const m = C.net, S = C.sh;
      S.off += (m.o - S.off)*Math.min(1, dt*10); S.y += (m.y - S.y)*Math.min(1, dt*10);
      if(m.st !== S.st){ if(m.st === 'warn'){ S.ly = m.ly; S.tgt = m.tg === 'me' ? 'pal' : 'me'; chWarn(true); } if(S.st === 'warn' || S.st === 'dash') { if(m.st !== 'dash') chWarn(false); } S.st = m.st; }
      S.ly = m.ly;
      if(chTouch(C.me, S)) chTag(C.me);
    }
  } else if(C.st === 'end'){
    for(const p of chOwn()) chBody(p, dt);
  }
  // напарник по сети — плавно к тому, что прислал
  const pal = C.pal;
  if(pal && pal.kind === 'net' && !pal.gone){ pal.off += (pal.no - pal.off)*Math.min(1, dt*10); pal.y += (pal.ny - pal.y)*Math.min(1, dt*12); pal.tumble = pal.nt ? Math.max(pal.tumble, 0.05) : Math.max(0, pal.tumble - dt); }
  if(C.mode === 'net' && (go || C.st === 'end')){
    if((C.sendT -= dt) <= 0){ C.sendT = 0.08; netSend({t:'chp', o:+C.me.off.toFixed(2), y:+C.me.y.toFixed(2), tb:C.me.tumble > 0}); }
    if(C.host && (C.zT -= dt) <= 0){ C.zT = 0.1; const S = C.sh; netSend({t:'chs', S:+C.S.toFixed(2), o:+S.off.toFixed(2), y:+S.y.toFixed(2), st:S.st, ly:+(S.ly || 0).toFixed(2), tg:S.tgt}); }
  }
  // водоросли качаются, медузы пружинят, течения бегут
  for(const k of chSway){ if(Math.abs(k.position.x - CH_POS.x - C.S) < 16) k.userData.pivs.forEach((p, i) => p.rotation.z = Math.sin(now*1.1 + k.userData.ph + i*0.55)*0.075); }
  for(const k of C.sway){ if(Math.abs(k.position.x - CH_POS.x - C.S) < 16) k.userData.pivs.forEach((p, i) => p.rotation.z = Math.sin(now*1.6 + k.userData.ph + i*0.55)*0.12); }
  for(const o of C.L.obs){
    if(!o.o || Math.abs((o.x !== undefined ? o.x : o.x0) - C.S) > 18) continue;
    if(o.k === 'jelly'){ const y = o.y + Math.sin(now*1.3 + o.ph)*0.5; o.sq = Math.max(0, (o.sq || 0) - dt); const q = 1 + Math.sin(now*2.2 + o.ph)*0.07 - o.sq*0.6; o.o.position.copy(chAt(o.x, y + 0.2)); o.o.scale.set(0.9*(2 - q), 0.9*q, 0.9*(2 - q)); }
    if(o.k === 'puff'){ o.o.userData.b.scale.setScalar(o.r/0.45); o.o.rotation.y = Math.sin(now*1.5 + o.x)*0.3; }
    if(o.k === 'cur') o.o.material.map.offset.x = -now*1.6;
    if(o.k === 'ring') o.o.forEach((g, i) => { g.rotation.y = Math.sin(now*1.2 + i)*0.3; });
    if(o.k === 'bub' && Math.random() < dt*10) emit(TEX.dot, chAt(o.x + (Math.random() - 0.5)*o.w, chBot(o.x) + Math.random()*1.5, 0.3), {v:new V3(0, 3 + Math.random()*1.5, 0), life:1.8, size:0.1 + Math.random()*0.1, grow:0.4});
  }
  for(const sh of C.L.shells) if(sh.o && !sh.got && Math.abs(sh.x - C.S) < 12) sh.o.rotation.y += dt*3;
  if(C.L.pearl.o && !C.L.pearl.got) C.L.pearl.o.children[0].material.opacity = 0.6 + Math.sin(now*4)*0.3;
  // тюлени и акула на экране
  for(const p of [C.me, C.pal]) if(p) chDraw(p, dt);
  chSharkPose(dt);
  // вода позади и камера: сбоку, экран едет сам
  const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov)/2), W = camera.aspect < 1 ? 8.8 : 15;
  const d = Math.max(W/2/(tv*camera.aspect), (camera.aspect < 1 ? 5.2 : 6.2)/tv), hw = d*tv*camera.aspect;   // в альбомном экране — чтобы влезла вся глубина
  const wantX = C.st === 'end' ? CH_LEN + 2.4 : C.S + hw*0.24;   // тюлени — чуть левее середины: акула сзади видна, впереди — 5+ м
  C.cx += (wantX - C.cx)*Math.min(1, dt*(C.st === 'end' ? 1.5 : 6));
  const cy = camera.aspect < 1 ? -5.5 : -4.8;   // полоса воды посередине экрана: сверху — небо под счётом, снизу — песок под подсказкой
  chBack.position.x = CH_POS.x + C.cx;
  runCam.pos.copy(chAt(C.cx, cy + d*0.1, d)); runCam.look.copy(chAt(C.cx, cy, 0));
  if(chRoot.userData.surf) chRoot.userData.surf.offset.x = now*0.02;
  chHud();
}
function chDraw(p, dt){
  const s = p.m, sc = s.root.scale.x;
  s.root.visible = !p.gone && !(p.lost && Math.floor(now*2) % 2) && !(p.safe > 0 && Math.floor(now*10) % 2);
  s.root.position.copy(chAt(chX(p), p.y - (p.kind === 'ping' ? 0.9 : 0.72)*sc, 0.15 + (p.kind === 'me' ? 0.2 : 0)));
  const face = p.face || 1, pitch = Math.max(-0.7, Math.min(0.7, Math.atan2(p.vy, CH_V + 0.5)*0.9));
  s.root.rotation.set(0, face*Math.PI/2, 0);
  if(p.tumble > 0) s.inner.rotation.x = -(1 - p.tumble/0.8)*Math.PI*2;
  else s.inner.rotation.x += ((p.kind === 'ping' ? 1 : 0) - pitch - s.inner.rotation.x)*Math.min(1, dt*8);   // Пинг плывёт лёжа, как в бухте
  s.flap = p.boost > 0 ? 1 : 0.55;
  updateSeal(s, now, dt);
  if(p.lbl){ p.lbl.position.copy(chAt(chX(p) - 0.2, p.y - 0.7, 0.4)); p.lbl.visible = !p.gone; }   // имя — под напарником, чтобы не налезало на тебя
  if(!p.gone && (p.bubT -= dt) < 0){ p.bubT = p.boost > 0 ? 0.08 : 0.25; emit(TEX.dot, chAt(chX(p) - 0.4, p.y + 0.1, 0.3), {v:new V3(-1, 1.1, 0), life:1, size:0.1 + Math.random()*0.06, grow:0.3}); }
}
function chHud(){
  const h = CH && CH.hud; if(!h) return;
  h.querySelector('.sh').textContent = CH.shells;
  const pw = h.querySelector('.pw'); if(pw) pw.textContent = CH.paws;
  h.querySelector('.pr').textContent = CH.L.pearl.got ? '✨' : '·';
  h.querySelector('.bar i').style.width = Math.max(0, Math.min(1, CH.S/CH_LEN))*100 + '%';
}

/* ---------- конец: щель в скале — мы проскочили, акула застряла ---------- */
async function chFinish(){
  if(CH.st !== 'go') return;
  CH.st = 'end';
  const S = CH.sh; chWarn(false);
  if(CH.mode === 'net' && CH.host) netSend({t:'chf'});
  sfx.good(); mgHint(L('Скорее в щель! 🪨', 'Quick, into the gap! 🪨'));
  S.st = 'end'; const s0 = CH.S, x0 = s0 + S.off, y0 = S.y, ex = CH_LEN + 2.1;
  await tween(1.5, k => { S.off = x0 + (ex - x0)*k - s0; S.y = y0 + (CH_EXIT.gy - y0)*k; }, ease.io);
  if(!CH) return;
  S.st = 'stuck'; S.stx = ex;
  sfx.boing(); sfx.thud();
  floatText(L('Ой! Застряла! 😳', 'Oops! Stuck! 😳'), chAt(ex, CH_EXIT.gy + 1.2), '#3B3A4A');
  burst(TEX.puff, chAt(ex + 0.6, CH_EXIT.gy, 0.4), 10, 1.6, 0.4);
  mgHint(L('Акула застряла в щели! Попалась! 😄', 'The shark is stuck in the gap! Gotcha! 😄'));
  await wait(1.2); if(!CH) return;
  for(const p of chPals()){ p.face = -1; floatText(L('Хи-хи!', 'Hee-hee!'), chAt(chX(p), p.y + 0.9), '#D9527E'); }
  sfx.giggle();
  await wait(1.4); if(!CH) return;
  S.st = 'end'; S.off = ex - s0;
  await tween(0.6, k => { S.off = ex - s0 - k*1.4; }, ease.out);
  if(!CH) return;
  S.st = 'laugh'; sfx.hug(); burst(TEX.heart, chAt(ex - 1.4, CH_EXIT.gy + 0.5, 0.4), 16, 2.2, 0.32);
  floatText(L('Ух, какие вы быстрые! Завтра ещё поиграем? 💗', 'Wow, you\'re fast! Play again tomorrow? 💗'), chAt(ex - 1.4, CH_EXIT.gy + 1.3), '#D9527E');
  mgHint('');
  await wait(1.8); if(!CH) return;
  CH.end = 'win';
}

/* ---------- сеть ---------- */
function chNetWire(){
  netOn('chp', m => { const p = CH && CH.pal; if(!p || p.kind !== 'net') return; p.no = m.o; p.ny = m.y; p.nt = !!m.tb; });
  netOn('chs', m => { if(!CH || CH.host) return; CH.net = m; const d = m.S - CH.S; if(Math.abs(d) > 3) CH.S = m.S; else CH.S += d*0.3; });
  netOn('chtag', () => { if(CH && CH.pal) chTag(null, true); });
  netOn('chk', m => { if(CH) chShell(m.i); });
  netOn('chpl', () => { if(CH) chPearl(); });
  netOn('chr', m => { const o = CH && CH.L.obs[m.i]; if(o && o.k === 'ring') chRingPass(o, 'pal'); });
  netOn('chf', () => { if(CH) chFinish(); });
  netOn('emo', () => { if(CH && CH.pal){ burst(TEX.heart, chAt(chX(CH.pal), CH.pal.y + 0.8, 0.3), 8, 1.6, 0.3); sfx.purr(); } });
  netOn('bye', () => { if(!CH || !CH.pal) return; CH.pal.gone = true; toast(L('Напарник уплыл домой 👋', 'Your partner went home 👋')); if(!CH.host){ CH.host = true; CH.sh.st = 'follow'; } });
  net.onLost = () => { if(CH && CH.pal){ CH.pal.lost = true; mgHint(L('Связь пропала… плывём дальше 🌊', 'Lost the connection… keep swimming 🌊')); } };
  net.onBack = () => { if(CH && CH.pal){ CH.pal.lost = false; mgHint(''); toast(L('Снова вместе! 💗', 'Together again! 💗')); } };
}

/* ---------- управление: держи палец — малыш плывёт на эту высоту ---------- */
const chRay = new THREE.Raycaster(), chNdc = new THREE.Vector2();
function chPointY(cx, cy){
  const rect = canvas.getBoundingClientRect();
  chNdc.set((cx - rect.left)/rect.width*2 - 1, -((cy - rect.top)/rect.height)*2 + 1);
  chRay.setFromCamera(chNdc, camera);
  const o = chRay.ray.origin, d = chRay.ray.direction, k = (0 - o.z)/d.z;
  return o.y + d.y*k;
}
function chControls(){
  let pid = null;
  const ok = () => CH && CH.st === 'go';
  mgOn(mgRoot, 'pointerdown', e => { if(e.target.closest('button, .mg-panel')) return; e.preventDefault(); if(!ok()) return; pid = e.pointerId; CH.me.ty = chPointY(e.clientX, e.clientY); });
  mgOn(mgRoot, 'pointermove', e => { if(pid === null || e.pointerId !== pid || !ok()) return; CH.me.ty = chPointY(e.clientX, e.clientY); });
  for(const ev of ['pointerup', 'pointercancel']) mgOn(mgRoot, ev, e => { if(e.pointerId === pid) pid = null; });
  const keys = {};
  mgOn(window, 'keydown', e => { if(e.key === 'ArrowUp' || e.key === 'ArrowDown'){ keys[e.key] = true; e.preventDefault(); } });
  mgOn(window, 'keyup', e => { keys[e.key] = false; });
  mgTick(dt => { if(!ok()) return; const k = (keys.ArrowUp ? 1 : 0) - (keys.ArrowDown ? 1 : 0); if(k) CH.me.ty = CH.me.y + k*1.5; });
}

/* ---------- сама погоня: возвращает {shells, pearl, caught, paws} или null (ушли домой) ---------- */
async function chaseRun(mode, pal0){
  chBuild();
  sfx.splash(); flash();
  const fog = scene.fog, bg = scene.background;
  chRoot.visible = true; runCam.on = true; snow.visible = false; HEMI.intensity = 0.74; sun.intensity = 0.6;
  document.body.classList.add('run-on', 'chase-on');
  const homeB = document.createElement('button'); homeB.id = 'btnRunHome'; homeB.className = 'round home';
  homeB.innerHTML = '<span aria-hidden="true">🏠</span>'; homeB.setAttribute('aria-label', L('Домой', 'Home')); $('#btnSound').after(homeB);
  let done; const fin = new Promise(r => done = r);
  homeB.addEventListener('click', () => { sfx.tap(); done('quit'); });
  const host = mode !== 'net' || net.host, cv = save.dive.chase;
  CH = {mode, host, st:'ready', S:-2, cx:0, shells:0, paws:0, caught:0, dodges:0, sendT:0, zT:0, first:!cv.n, tips:new Set(), sway:[],
    grp:new THREE.Group(), L:null, T:null, me:null, pal:null, sh:null, hud:null, end:null, net:null};
  chRoot.add(CH.grp);
  // погоня дня; по сети хозяин шлёт свою (seed и тему)
  let {seed, th} = chDay();
  if(mode === 'net'){
    chNetWire();
    if(net.host){ await Promise.race([new Promise(r => netOn('chready', r)), wait(8), fin]); netSend({t:'chgo', seed, th}); }
    else {
      const g = new Promise(r => netOn('chgo', m => r(m))), iv = setInterval(() => netSend({t:'chready'}), 400);
      netSend({t:'chready'}); const m = await Promise.race([g, fin]); clearInterval(iv);
      if(m && m.seed != null) seed = m.seed;
      if(m && CH_DAYS[m.th]) th = m.th;
    }
  }
  const T = CH.T = CH_DAYS[th];
  CH.L = chLayout(seed, T);
  const water = T.water || 0x3E8FC0;
  scene.fog = new THREE.Fog(water, 14, 64); scene.background = new THREE.Color(water);
  // препятствия
  for(const o of CH.L.obs){
    if(o.k === 'cur'){
      const tex = CH_FLOW_TEX.clone(); tex.needsUpdate = true; tex.repeat.set((o.x1 - o.x0)/1.4, 1);
      o.o = new THREE.Mesh(new THREE.PlaneGeometry(o.x1 - o.x0, o.h), new THREE.MeshBasicMaterial({map:tex, transparent:true, opacity:0.55, depthWrite:false, color:0xCFF6FF}));
      o.o.position.copy(chAt((o.x0 + o.x1)/2, o.y, -0.3)); CH.grp.add(o.o);
      const band = new THREE.Mesh(new THREE.PlaneGeometry(o.x1 - o.x0, o.h), new THREE.MeshBasicMaterial({color:0xE8FBFF, transparent:true, opacity:0.18, depthWrite:false}));
      band.position.copy(chAt((o.x0 + o.x1)/2, o.y, -0.35)); CH.grp.add(band);
    } else if(o.k === 'weed'){
      const n = Math.round((o.x1 - o.x0)/0.55);
      for(let i = 0; i <= n; i++){
        const x = o.x0 + i*(o.x1 - o.x0)/n, k = dvKelp(o.h + 0.4 + Math.random()*0.5, i % 2 ? 0x4FA877 : 0x6CC28C, 5);
        if(o.top){ k.rotation.z = Math.PI; k.position.copy(chAt(x, CH_TOP + 0.9, -0.2 + (i % 3)*0.25)); }
        else k.position.copy(chAt(x, chFloor(x) - 0.1, -0.2 + (i % 3)*0.25));
        CH.grp.add(k); CH.sway.push(k);
      }
      if(o.top){ const f = dvBlob(CH.grp, 0xD6EAF5, (o.x1 - o.x0)/2 + 0.8, 0.45, 1.6, CH_POS.x + (o.x0 + o.x1)/2, 0.05, -0.2, 1.03); }   // льдина, с которой свисают водоросли
    } else if(o.k === 'jelly'){ o.o = DV_MAKE.jelly(); o.o.scale.setScalar(0.9); o.o.position.copy(chAt(o.x, o.y)); CH.grp.add(o.o); }
    else if(o.k === 'puff'){ o.o = chPuffer(); o.o.position.copy(chAt(o.x, o.y, 0.1)); CH.grp.add(o.o); }
    else if(o.k === 'gap'){
      const lo = o.gy - o.gh/2, hi = o.gy + o.gh/2, fb = chFloor(o.x);
      const r = dvBlob(CH.grp, 0x8FA3B8, o.w*0.75, (lo - fb)/2 + 0.2, 0.9, CH_POS.x + o.x, (lo + fb)/2, 0, 1.04);
      dvBlob(CH.grp, 0x7F93AA, o.w*0.5, 0.35, 0.7, CH_POS.x + o.x + 0.4, fb + 0.2, 0.3, 1.04);
      const ice = addOutline(new THREE.Mesh(new THREE.ConeGeometry(o.w*0.62, 0.3 - hi, 7), toon(0xD6EAF5)), 1.04);
      ice.rotation.z = Math.PI; ice.position.copy(chAt(o.x, (hi + 0.3)/2 - 0.05, 0)); CH.grp.add(ice);
      o.o = r;
    } else if(o.k === 'bub'){
      o.o = new THREE.Mesh(new THREE.PlaneGeometry(o.w, 9), new THREE.MeshBasicMaterial({color:0xE8FBFF, transparent:true, opacity:0.16, depthWrite:false}));
      o.o.position.copy(chAt(o.x, -4.5, -0.3)); CH.grp.add(o.o);
      dvBlob(CH.grp, 0x6F839C, 0.7, 0.3, 0.6, CH_POS.x + o.x, chFloor(o.x) + 0.1, 0, 1.04);
    } else if(o.k === 'ring'){
      o.o = o.ys.map(y => { const g = chRing(); g.position.copy(chAt(o.x, y, 0.1)); CH.grp.add(g); return g; });
    }
  }
  for(const sh of CH.L.shells){ sh.o = makeShell(0xFFC2D1); sh.o.scale.multiplyScalar(0.75); sh.o.rotation.x = 0.9; sh.o.position.copy(chAt(sh.x, sh.y, 0.2)); CH.grp.add(sh.o); }
  { const P = CH.L.pearl, o = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), toon(0xFFFDF8));
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX, transparent:true, depthWrite:false})); gl.scale.setScalar(1.3); o.add(gl);
    const cl = dvBlob(CH.grp, 0xFFC2D6, 0.36, 0.1, 0.3, CH_POS.x + P.x, P.y - 0.2, 0.1, 1.08);
    o.position.copy(chAt(P.x, P.y, 0.2)); CH.grp.add(o); P.o = o; P.cl = cl; }
  // щель в конце: две скалы и просвет между ними
  { const e = CH_EXIT, x = CH_LEN + 3, lo = e.gy - e.gh/2, hi = e.gy + e.gh/2, fb = chFloor(x);
    dvBlob(CH.grp, 0x8FA3B8, 1.3, (lo - fb)/2 + 0.3, 1.2, CH_POS.x + x, (lo + fb)/2, 0, 1.04);
    dvBlob(CH.grp, 0x7F93AA, 1.3, (0.2 - hi)/2 + 0.3, 1.2, CH_POS.x + x, (hi + 0.2)/2, 0, 1.04);
    for(let i = 0; i < 4; i++){ const k = dvKelp(1 + i*0.3, 0x6CC28C, 4); k.position.copy(chAt(x - 1 + i*0.6, fb, 0.8)); CH.grp.add(k); CH.sway.push(k); } }
  // тюлени: хозяин повыше, гость пониже
  const meY = host ? -4 : -6, palY = host ? -6 : -4;
  CH.me = chSeal(coSealOf(coPetDesc()), save.pet ? save.pet.name : L('Ты', 'You'), 'me', meY);
  if(mode === 'ping') CH.pal = chSeal(makePenguin(PENG), L('Пинг', 'Ping'), 'ping', palY);
  if(mode === 'net'){ CH.pal = chSeal(coSealOf(pal0), (pal0 && pal0.name) || L('Папа', 'Dad'), 'net', palY); CH.pal.no = CH.pal.off; CH.pal.ny = palY; }
  // акула
  { const o = DV_MAKE.shark(); o.scale.setScalar(CH_SHARK_SC); CH.grp.add(o);
    const line = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 0.5), new THREE.MeshBasicMaterial({map:CH_LINE_TEX, transparent:true, depthWrite:false}));
    line.visible = false; CH.grp.add(line);
    CH.sh = {o, line, st:'come', off:-10, y:-5, ly:-5, t:3, tgt:'me', hit:false}; }
  mgOpen('', {hintBottom:true});
  CH.hud = mgNode('div', 'run-hud', `<span class="pill">🐚 <b class="sh">0</b></span>${mode !== 'solo' ? '<span class="pill">💗 <b class="pw">0</b></span>' : ''}<span class="pill" aria-label="${L('Жемчужинка', 'Pearl')}">🫧 <b class="pr">·</b></span><span class="bar"><i></i><span class="flag" aria-hidden="true">🪨</span></span>`);
  const btns = mgNode('div', 'co-btns', mode !== 'solo' ? `<button class="round co-heart" aria-label="${L('Сердечко напарнику', 'A heart for your partner')}">💗</button>` : '');
  const hb = btns.querySelector('.co-heart');
  if(hb) mgOn(hb, 'pointerdown', e => {
    e.stopPropagation(); burst(TEX.heart, chAt(chX(CH.me), CH.me.y + 0.8, 0.3), 8, 1.6, 0.3); sfx.purr();
    if(mode === 'net') netSend({t:'emo'});
    else if(CH.pal) setTimeout(() => { if(CH && CH.pal){ burst(TEX.heart, chAt(chX(CH.pal), CH.pal.y + 0.8, 0.3), 8, 1.6, 0.3); floatText(L('Кря! 💙', 'Quack! 💙'), chAt(chX(CH.pal), CH.pal.y + 1.2)); } }, 700);
  });
  chControls(); chHud();
  CH.cx = CH.S + 0.9;
  mgTick(dt => { chStep(dt); if(CH && CH.end) done(CH.end); });
  const tick = t => Promise.race([wait(t), fin]);
  mgHint(L('🦈 Акула: «Давай в салки! Я вожу!» Уплывай! 🫧', '🦈 The shark: “Let\'s play tag! I\'m it!” Swim away! 🫧')); sfx.shark();
  await tick(2.6);
  mgHint(`${T.ic} ${L(`Сегодня погоня «${T.name}»: ${T.about}`, `Today's chase is “${T.name}”: ${T.about}`)}`); await tick(2.6);
  if(CH.first){ mgHint(L('Держи палец на экране и веди вверх-вниз — малыш плывёт на эту высоту ↕️', 'Hold your finger on the screen and slide up or down — your pup swims to that height ↕️')); await tick(3); }
  for(const n of ['3', '2', '1']){ mgHint(n); sfx.tick(); await tick(0.5); }
  if(!CH.end && CH.st === 'ready'){ CH.st = 'go'; mgHint(L('Плывём! 🫧', 'Swim! 🫧')); sfx.arf(); setTimeout(() => { if(CH && mgHintEl.textContent.includes('🫧')) mgHint(''); }, 1100); }
  const how = await fin;
  const res = how === 'win' ? {shells:CH.shells, total:CH.L.shells.length, pearl:!!CH.L.pearl.got, caught:CH.caught, paws:CH.paws, T,
    pal:CH.pal && !CH.pal.gone ? CH.pal.name : null, photo:null} : null;
  if(how === 'quit' && mode === 'net') netSend({t:'bye'});
  let again = false;
  if(res && (!cv.n || mode === 'net')){   // фото «мы и акула» — в альбом (в первый раз и с папой)
    try{ res.photo = snapshot({root:{position:chAt(CH_LEN + 2.4, CH_EXIT.gy - 1.2), scale:{x:1}}}, 2.4);
      albumAdd({name:L('Салки с акулой', 'Tag with the shark'), img:res.photo, d:Date.now()}); renderAlbumCount(); }catch(e){}
  }
  if(res){ mgHint(''); CH.hud.remove(); chResults(res); again = await chResultPanel(res, mode); }   // итоги — поверх погони
  mgHint(''); mgClose();
  chRoot.remove(CH.grp);
  for(const p of [CH.me, CH.pal]) if(p) chRoot.remove(p.m.root);
  CH = null;
  homeB.remove(); document.body.classList.remove('run-on', 'chase-on');
  chRoot.visible = false; runCam.on = false; homeLights(false); snow.visible = true;
  scene.fog = fog; scene.background = bg;
  return res && {res, again};
}

/* ---------- итоги: звёзды, ракушки, «ещё раз» ---------- */
function chResults(r){
  const c = save.dive.chase, today = dvToday();
  if(c.day.d !== today) c.day = {d:today, n:0, st:0};
  const need = Math.ceil(r.total*0.7);
  r.need = need;
  r.stars = 1 + (r.shells >= need ? 1 : 0) + (r.pearl ? 1 : 0);
  r.paid = c.day.n < CH_DAILY;
  r.gift = r.paid ? Math.min(CH_MAX, Math.round(r.shells/4)) + CH_END + (r.pearl ? CH_PEARL : 0) : 0;
  r.best = r.stars > c.best;
  c.n++; c.day.n++; c.day.st = Math.max(c.day.st, r.stars); c.best = Math.max(c.best, r.stars);
  persist();
  return r;
}
async function chResultPanel(r, mode){
  const net1 = mode === 'net';
  const st = '⭐'.repeat(r.stars) + '☆'.repeat(3 - r.stars);
  const panel = mgNode('div', 'mg-panel run-end co-end ch-end', `
    <p class="ttl display">${L('Уплыли! 🦈💨', 'Got away! 🦈💨')}</p>
    <p class="res-stars display">${st}</p>
    <p class="got">🐚 ${L(`Ракушки: ${r.shells} из ${r.total}`, `Shells: ${r.shells} of ${r.total}`)}${r.shells >= r.need ? ' ✅' : ` <small>(${L(`для звезды — ${r.need}`, `${r.need} for a star`)})</small>`}</p>
    <p class="got">🫧 ${r.pearl ? L('Жемчужинка найдена! ✅', 'Pearl found! ✅') : L('Жемчужинка спряталась у самого дна или у поверхности…', 'The pearl hid by the seabed or near the surface…')}</p>
    <p class="got">${r.caught ? `🦈 ${L(`Салки: ${r.caught}`, `Tagged: ${r.caught}`)}` : `🏅 ${L('Акула ни разу не догнала!', 'The shark never caught you!')}`}</p>
    ${r.paws ? `<p class="got">💗 ${L(`«Дай ласту»: ${r.paws}`, `Flippers together: ${r.paws}`)}</p>` : ''}
    ${r.pal ? `<p class="got">💗 ${L(`Ты и ${r.pal} — команда!`, `You and ${r.pal} — a team!`)}</p>` : ''}
    ${r.photo ? `<img class="co-photo" src="${r.photo}" alt=""><p class="got">📷 ${L('Фото — в альбоме', 'The photo is in the album')}</p>` : ''}
    ${!r.paid ? `<p class="got">${L('Ракушки за погоню на сегодня собраны — завтра будет новая погоня 🌊', 'Today\'s shells for the chase are collected — a new chase tomorrow 🌊')}</p>` : ''}
    <p class="earned display">${r.gift ? `+${r.gift} 🐚` : ''}</p>
    <p class="got co-wait" hidden></p>
    <div class="row"><button class="btn" data-k="home">${L('Домой 🏠', 'Home 🏠')}</button>${!net1 || net.host ? `<button class="btn ghost" data-k="again">${L('Ещё раз ↻', 'Again ↻')}</button>` : ''}</div>`);
  if(r.gift) setTimeout(() => addShells(r.gift, {x:innerWidth/2, y:innerHeight*0.4}), 900);
  if(save.pet && typeof petGive === 'function' && petSeal) setTimeout(() => { try{ petGive(5); }catch(e){} }, 1500);
  sfx.hug(); if(r.stars === 3) setTimeout(() => sfx.star(), 500);
  const k = await new Promise(res => {
    panel.querySelectorAll('[data-k]').forEach(b => mgOn(b, 'click', () => { sfx.tap(); res(b.dataset.k); }));
    if(net1 && !net.host){ const w = panel.querySelector('.co-wait'); w.hidden = false; w.textContent = L('Напарник решает: ещё раз или домой…', 'Your partner is deciding: again or home…'); netOn('chagain', () => res('again')); }
    if(net1) netOn('bye', () => { const w = panel.querySelector('.co-wait'); w.hidden = false; w.textContent = L('Напарник уплыл домой 👋', 'Your partner went home 👋'); const ag = panel.querySelector('[data-k="again"]'); if(ag) ag.remove(); if(!net.host) res('home'); });
  });
  if(net1){ if(k === 'again' && net.host) netSend({t:'chagain'}); if(k === 'home') netSend({t:'bye'}); }
  panel.classList.add('away'); await wait(0.25);
  return k === 'again';
}
// вход: из «Вместе» (по сети, с Пингом, одна) и из «Поиграть» у малыша
async function chaseGame(mode, pal0 = null){
  let res = null;
  for(;;){
    const r = await chaseRun(mode, pal0);
    if(!r) break;
    res = r.res;
    if(!r.again) break;
  }
  if(mode === 'net') netClose();
  return res;
}
if(typeof CO_GAMES !== 'undefined') CO_GAMES.chase = {ic:'🦈', name:() => L('Салки', 'Tag'),
  say:() => { const T = chTheme(); return L('Акула зовёт играть в салки! Уплывайте вдоль дна: течения ускоряют, водоросли держат. Проплывите кольца вместе — «Дай ласту!»', 'The shark wants to play tag! Swim away along the seabed: currents speed you up, kelp holds you back. Swim through rings together — flippers together!')
    + ' ' + L(`Сегодня: ${T.ic} ${T.name}`, `Today: ${T.ic} ${T.name}`); },
  wins:() => { const c = save.dive.chase; return c.day.d === dvToday() && c.day.st ? `${'⭐'.repeat(c.day.st)} ${L('сегодня', 'today')}` : c.n ? `🦈 ${L(`Погонь: ${c.n}`, `Chases: ${c.n}`)}` : ''; }};
