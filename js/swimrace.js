/* ---------------- 🏊 Заплыв (идея папы 29.09.2026, Фаза 9) ----------------
   Третья гонка острова со своим ощущением: горка — «лечу вниз», забег — «прыг-нырь», заплыв — «я рыбка».
   Трасса по морю в два яруса, путь выбираешь сама: по ГЛАДИ — волны-горки, у гребня касание = «дельфинчик»
   (далеко и быстро, но волну надо поймать); ПОД ВОДОЙ — течения несут сами, арки кораллов, стайки рыб расступаются.
   Держи палец и веди: влево-вправо — куда плыть, вверх — к глади, вниз — в глубину. Гребём в такт: кружок вокруг
   малыша сжимается, касание, когда он сошёлся, — рывок ластами (серия в такт растёт), не попала — просто плывём дальше.
   Соперники с характером (зовём троих, держатся рядом — как на горке): 🐢 черепаха знает тайное течение и показывает
   короткий путь, 🐧 Пинг прыгает дельфинчиком, 🦈 акула быстрее всех, но останавливается покрутиться, 🦦 Пуговка плывёт
   на спинке с ракушкой, 🐙 Клякса плывёт рывками и иногда «пшик» — «ой, прости!».
   Финиш — всегда праздник. Звёзды за своё: все обручи / короткий путь черепахи / 5 рывков в такт подряд;
   место — только весёлая табличка. Режимы: 🏁 с друзьями и ⏱️ на время (заплыв дня: тема и трасса каждый день свои).
   Сохранение — save.sw (sanitizeSwim в data.js). Сеть с папой и эстафета — вторым заходом (план в ROADMAP).
   Подключается после slide.js и до story.js: берёт модели из dive.js, gloom.js, adventure.js, seal.js, coop.js. */
const SW_POS = new V3(2600, 0, -2000);    // старт: далеко от других сцен
const SW_DS = 0.5;                         // шаг, с которым считаем трассу (м)
const SW_UW = 3.0, SW_DEEP = -4.4, SW_SURF = -0.7;   // полуширина трассы; самая глубина; выше этого — «на глади»
const SW_V = 5.4, SW_VAIR = 9.6;           // обычная скорость и скорость в прыжке (м/с)
const SW_BEAT = 0.8, SW_WIN = 0.16;        // такт гребли и сколько можно опоздать/поспешить (с)
const SW_DASH_T = 0.55, SW_DASH_K = 1.5;   // рывок ластами в такт
const SW_CUR_K = 1.55, SW_SEC_K = 2.05;    // течение и тайное течение черепахи
const SW_WEED_K = 0.55;                    // водоросли на глади держат
const SW_G = 14, SW_LEAP = 5.8;            // «дельфинчик»: ≈0,8 с в воздухе, высота ≈1,2 м
const SW_SC = 0.5;                         // размер тюленей в заплыве
const SW_DAILY = 2, SW_MAX = 25, SW_END = 5, SW_CUP = 10, SW_STREAK = 5;   // ракушки: за первые 2 заплыва в день, не больше 25, за финиш; кубок за первые три звезды; серия для звезды
const swRoot = new THREE.Group(); swRoot.visible = false; scene.add(swRoot);
if(!save.sw) save.sw = sanitizeSwim();     // Pages мог отдать старый data.js

/* ---------- темы дня ---------- */
const SW_DAYS = [
  {ic:'☀️', name:L('Солнечный', 'Sunny'),     about:L('тёплое солнце и синяя вода', 'warm sun and blue water'), sky:0xBDE5F4, fog:0xEAF7FB, sea:0x4FA8D2, deep:0x2F8DBF, hemi:0.8, sun:0.62, gap:7},
  {ic:'🌅', name:L('Закатный', 'Sunset'),     about:L('розовое небо, вода блестит', 'a pink sky, the water sparkles'), sky:0xFFC7B5, fog:0xFFE1D2, sea:0x5E9FCB, deep:0x4A7FB8, hemi:0.76, sun:0.6, gap:7},
  {ic:'🌊', name:L('Большие волны', 'Big waves'), about:L('волн больше — лови их!', 'more waves — catch them!'), sky:0xCFE3EE, fog:0xE3EEF4, sea:0x3F98C8, deep:0x2A7FB0, hemi:0.78, sun:0.58, gap:5},
  {ic:'🌌', name:L('Ночной', 'Night'),        about:L('в воде светится планктон', 'plankton glows in the water'), sky:0x26315E, fog:0x33407A, sea:0x35659A, deep:0x14305A, hemi:0.6, sun:0.4, glow:true, gap:7}
];
function swDay(key = advDayKey()){
  const d = Math.round(Date.parse(key)/864e5), rnd = seeded(key + 'swim');
  const th = Number.isFinite(d) ? (d + 2) % SW_DAYS.length : Math.floor(rnd()*SW_DAYS.length);
  return {th, seed:Math.floor(rnd()*1e9)};
}
const swTheme = () => SW_DAYS[swDay().th];
const swToday = () => new Date().toDateString();

/* ---------- трасса дня: куски ----------
   seg(длина, {turn — на сколько повернуть (рад, + вправо)}); предметы: shell (u, y), crest (гребень волны), hoop (обруч: u, y, kind),
   cur (течение: s0, s1, u, y, sec — тайное течение черепахи), weed (водоросли на глади: s0, s1), jelly (u, y), school (стайка: u, y). */
function swLayout(seed, first, gap){
  const rnd = seeded('sw' + seed), segs = [], items = [];
  let S = 0;
  const seg = (len, o = {}) => { segs.push({s0:S, len, turn:o.turn || 0}); S += len; };
  const it = (k, s, o = {}) => items.push({k, s, ...o});
  const line = (s, n, u, y, step = 1.8) => { for(let i = 0; i < n; i++) it('shell', s + i*step, {u:typeof u === 'function' ? u(i) : u, y:typeof y === 'function' ? y(i) : y}); };
  const crest = s => { it('crest', s); for(const d of [2.2, 4.2, 6.2]){ const t = d/SW_VAIR; it('shell', s + d, {u:0, y:SW_LEAP*t - SW_G*t*t/2 + 0.2, air:true}); } };   // дуга ракушек — по прыжку с гребня
  const m = () => rnd() < 0.5 ? -1 : 1;
  const CH = {
    waves(){ const s = S; seg(44, {turn:m()*0.35}); for(let x = 6; x < 40; x += gap) crest(s + x); it('school', s + 20, {u:m()*0.8, y:-2.6}); line(s + 8, 5, 0, -2.6, 5); },
    current(){ const d = m(), s = S; seg(40, {turn:-d*0.3}); it('cur', s + 4, {s1:s + 36, u:d*0.9, y:-2.7}); line(s + 6, 9, d*0.9, -2.7, 3.2); it('weed', s + 6, {s1:s + 34}); },
    split(){ const s = S; seg(44); for(let x = 6; x < 40; x += gap + 1) crest(s + x); it('cur', s + 5, {s1:s + 40, u:0, y:-3.0});
      it('hoop', s + 22, {u:m()*1.2, y:-0.1, kind:'buoy'}); it('hoop', s + 32, {u:0, y:-3.0, kind:'bubble'}); },
    hoops(){ const d = m(), s = S; seg(36);
      [[8, -1.4*d, -0.1, 'buoy'], [18, 1.2*d, -2.8, 'bubble'], [28, 0, -1.6, 'bubble']].forEach(([x, u, y, kind]) => { it('hoop', s + x, {u, y, kind}); line(s + x - 5, 3, u, y, 1.4); }); },
    jellies(){ const s = S; seg(34); for(let i = 0; i < 6; i++) it('jelly', s + 5 + i*4.8, {u:(rnd()*2 - 1)*2.2, y:-1.4 - rnd()*1.2});
      line(s + 4, 8, 0, -0.1, 3.4); line(s + 6, 6, i => Math.sin(i)*1.2, SW_DEEP + 0.5, 4); },
    reef(){ const d = m(), s = S; seg(50, {turn:d*0.25});   // арки кораллов — до и после тайного течения: по ним и путь, и обручи
      it('hoop', s + 5, {u:-0.6*d, y:-2.6, kind:'coral'}); it('cur', s + 10, {s1:s + 38, u:-2.45*d, y:-3.7, sec:true}); line(s + 12, 8, -2.45*d, -3.7, 3.2);
      line(s + 12, 7, 0.9*d, -1.4, 3.6); it('school', s + 24, {u:0.8*d, y:-1.6}); it('hoop', s + 45, {u:-0.8*d, y:-2.6, kind:'coral'}); },
    bend(){ const d = m(), s = S; seg(34, {turn:d*1.0}); line(s + 5, 8, -d*1.3, -0.1, 3); line(s + 8, 6, d*0.9, -3.0, 3.5); }
  };
  // начало: ровно, ракушки на глади — плывём и привыкаем к такту
  seg(14); line(6, 4, 0, -0.1, 1.8);
  let order = ['waves', 'hoops', 'current', 'jellies', 'split', 'reef', 'bend', 'waves', 'current'];
  if(!first){ for(let i = order.length - 1; i > 0; i--){ const j = Math.floor(rnd()*(i + 1)); [order[i], order[j]] = [order[j], order[i]]; } }
  order.forEach(k => CH[k]());
  seg(12); line(S - 11, 4, 0, -0.1, 1.8);
  const fin = S - 2;
  seg(34);
  return {segs, items, len:S, fin};
}

/* ---------- трасса по точкам: где и куда смотрит ---------- */
function swPath(L0){
  const n = Math.ceil(L0.len/SW_DS) + 3;
  const P = {n, X:new Float32Array(n), Z:new Float32Array(n), TH:new Float32Array(n)};
  let x = SW_POS.x, z = SW_POS.z, th = 0, j = 0;
  for(let i = 0; i < n; i++){
    const s = i*SW_DS;
    while(j < L0.segs.length - 1 && s >= L0.segs[j].s0 + L0.segs[j].len) j++;
    const sg = L0.segs[j], t = Math.min(1, Math.max(0, (s - sg.s0)/sg.len));
    const k = sg.turn ? sg.turn*Math.PI/(2*sg.len)*Math.sin(Math.PI*t) : 0;
    P.X[i] = x; P.Z[i] = z; P.TH[i] = th;
    th += k*SW_DS; x += Math.sin(th)*SW_DS; z -= Math.cos(th)*SW_DS;
  }
  return P;
}
function swGet(A, s){ const f = Math.max(0, Math.min(SW.P.n - 1.001, s/SW_DS)), i = Math.floor(f), k = f - i; return A[i] + (A[i + 1] - A[i])*k; }
// точка мира: s — вдоль трассы, u — поперёк (+ вправо), y — высота (0 — гладь, минус — глубина)
function swPt(s, u = 0, y = 0, out = new V3()){
  const P = SW.P, end = (P.n - 1)*SW_DS, e = s < 0 ? s : s > end ? s - end : 0;   // до старта и за концом — продолжаем прямо
  const th = swGet(P.TH, s);
  return out.set(swGet(P.X, s) + Math.cos(th)*u + Math.sin(th)*e, SW_POS.y + y, swGet(P.Z, s) + Math.sin(th)*u - Math.cos(th)*e);
}
// поставить предмет, у которого «вперёд» — это −z (обруч, ворота), вдоль трассы
function swPlace(o, s, u = 0, y = 0){ swPt(s, u, y, o.position); o.rotation.set(0, -swGet(SW.P.TH, s), 0); return o; }

/* ---------- картинки ---------- */
const SW_WATER_TEX = canvasTex(256, (g, s) => {   // гладь сверху: рябь и блики
  g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, s, s);
  g.strokeStyle = 'rgba(160,215,240,0.9)'; g.lineWidth = 5; g.lineCap = 'round';
  for(let i = 0; i < 16; i++){ const x = (i*71) % s, y = (i*43) % s; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 14, y - 8, x + 28, y); g.stroke(); }
});
SW_WATER_TEX.wrapS = SW_WATER_TEX.wrapT = THREE.RepeatWrapping; SW_WATER_TEX.repeat.set(160, 160);
const SW_UNDER_TEX = canvasTex(256, (g, s) => {   // гладь снизу: светлые «сеточки» солнца
  g.fillStyle = '#BFEFFF'; g.fillRect(0, 0, s, s);
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 4;
  for(let i = 0; i < 22; i++){ const x = (i*59) % s, y = (i*97) % s; g.beginPath(); g.ellipse(x, y, 18 + (i % 4)*6, 10 + (i % 3)*5, i, 0, 7); g.stroke(); }
});
SW_UNDER_TEX.wrapS = SW_UNDER_TEX.wrapT = THREE.RepeatWrapping; SW_UNDER_TEX.repeat.set(120, 120);
const SW_SAND_TEX = canvasTex(128, (g, s) => {
  g.fillStyle = '#F2E3C0'; g.fillRect(0, 0, s, s);
  g.fillStyle = '#E3CFA3'; for(let i = 0; i < 40; i++){ g.beginPath(); g.arc((i*37) % s, (i*53) % s, 2 + (i % 3), 0, 7); g.fill(); }
});
SW_SAND_TEX.wrapS = SW_SAND_TEX.wrapT = THREE.RepeatWrapping; SW_SAND_TEX.repeat.set(120, 120);
const SW_ARROW_TEX = canvasTex(64, (g, s) => {   // стрелка течения: белая «галочка» вперёд
  g.lineCap = 'round'; g.lineJoin = 'round';
  for(const [w, c] of [[14, 'rgba(59,58,74,0.35)'], [8, '#FFFFFF']]){ g.lineWidth = w; g.strokeStyle = c; g.beginPath(); g.moveTo(14, 40); g.lineTo(32, 22); g.lineTo(50, 40); g.stroke(); }
});
const SW_RAY_TEX = canvasTex(64, (g, w, h) => {   // луч солнца под водой
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(w*0.3, 0, w*0.4, h);
}, 256);

/* ---------- мир ---------- */
function swBuoy(col){   // буёк: полосатый шар и флажок
  const g = new THREE.Group();
  const b = addOutline(new THREE.Mesh(SMALL, toon(col)), 1.06); b.scale.set(0.45, 0.5, 0.45); g.add(b);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.16, 16), toon(0xFFFFFF)); band.position.y = 0.05; g.add(band);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.3, 6), inkMat); pole.position.y = 0.95; g.add(pole);
  const f = new THREE.Mesh(new THREE.CircleGeometry(0.28, 3), new THREE.MeshToonMaterial({color:0xFFD66B, side:THREE.DoubleSide})); f.position.set(0.2, 1.45, 0); g.add(f);
  const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 6, 5), toon(0x7F93AA)); ch.position.y = -3.3; g.add(ch);   // цепь до дна
  return g;
}
function swGate(text, col){   // ворота из двух буйков, верёвка с флажками и надпись
  const g = new THREE.Group(), w = SW_UW + 0.7, cols = [0xFF9BB8, 0xFFD66B, 0x86DDB5, 0x9BD3F0, 0xB69CF2];
  for(const sd of [-1, 1]){ const b = swBuoy(col); b.position.x = sd*w; b.scale.setScalar(1.35); g.add(b); }
  const a = new V3(-w, 2.3, 0), b = new V3(w, 2.3, 0), pts = [];
  for(let i = 0; i <= 16; i++){ const k = i/16, p = a.clone().lerp(b, k); p.y -= Math.sin(k*Math.PI)*0.3; pts.push(p); }
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.03, 5), inkMat));
  const tri = new THREE.CircleGeometry(0.22, 3);
  for(let i = 1; i < 10; i++){ const k = i/10, p = a.clone().lerp(b, k); p.y -= Math.sin(k*Math.PI)*0.3 + 0.17;
    const f = new THREE.Mesh(tri, new THREE.MeshToonMaterial({color:cols[i % cols.length], side:THREE.DoubleSide})); f.position.copy(p); f.rotation.z = -Math.PI/2; g.add(f); }
  const t = textSprite(text, '#D9527E'); t.position.set(0, 3.1, 0); t.scale.set(2.8, 1.05, 1); t.material.depthTest = true; g.add(t);
  return g;
}
function swBuildWorld(){
  const g = SW.grp, T = SW.T, P = SW.P, mid = SW.L0.len/2;
  const cx = swGet(P.X, mid), cz = swGet(P.Z, mid);
  // гладь: сверху — вода с рябью, снизу — светлая «крыша» с солнечной сеточкой
  const top = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshToonMaterial({color:T.sea, map:SW_WATER_TEX, transparent:true, opacity:0.8, depthWrite:false}));
  top.rotation.x = -Math.PI/2; top.position.set(cx, SW_POS.y, cz); top.renderOrder = 2; g.add(top);
  const bot = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshBasicMaterial({color:T.glow ? 0x6F8FC8 : 0xFFFFFF, map:SW_UNDER_TEX, transparent:true, opacity:0.85, side:THREE.BackSide, depthWrite:false, fog:false}));
  bot.rotation.x = -Math.PI/2; bot.position.copy(top.position); bot.renderOrder = 2; g.add(bot);
  SW.water = [top, bot];
  // дно: песок, камни, водоросли, кораллы по бокам трассы (одним махом — инстансами)
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), new THREE.MeshToonMaterial({color:T.glow ? 0x8A8FB0 : 0xFFFFFF, map:SW_SAND_TEX}));
  sand.rotation.x = -Math.PI/2; sand.position.set(cx, SW_POS.y - 6.6, cz); g.add(sand);
  const r = seeded('swd' + SW.seed), spots = {rock:[], weed:[], coral:[], berg:[]};
  for(let s = -10; s < SW.L0.len + 20; s += 3){
    for(const sd of [-1, 1]){
      if(r() < 0.55) spots.rock.push([s + r()*2, sd*(4.2 + r()*9), 0.5 + r()*1.1]);
      if(r() < 0.7) spots.weed.push([s + r()*2, sd*(3.8 + r()*6), 0.8 + r()*1.4]);
      if(r() < 0.3) spots.coral.push([s + r()*2, sd*(4 + r()*5), 0.4 + r()*0.4]);
      if(s % 12 === 0 && r() < 0.8) spots.berg.push([s + r()*6, sd*(16 + r()*26), 1.6 + r()*2.2]);
    }
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new V3(), p = new V3(), up = new V3(0, 1, 0);
  const inst = (geo, col, list, place) => {
    const im = new THREE.InstancedMesh(geo, toon(col), list.length), ol = new THREE.InstancedMesh(geo, outlineMat, list.length);
    list.forEach((a, i) => { place(a, p, q, sc); m4.compose(p, q, sc); im.setMatrixAt(i, m4); sc.multiplyScalar(1.07); m4.compose(p, q, sc); ol.setMatrixAt(i, m4); });
    g.add(ol, im);
  };
  inst(new THREE.DodecahedronGeometry(1), T.glow ? 0x5E6A94 : 0x9AA7C2, spots.rock, ([s, u, k], p, q, sc) => { swPt(s, u, -6.5 + k*0.3, p); q.setFromAxisAngle(up, s*1.7); sc.set(k*1.3, k*0.8, k); });
  inst(SMALL, T.glow ? 0x3E8F7A : 0x4FA877, spots.weed, ([s, u, k], p, q, sc) => { swPt(s, u, -6.6 + k*1.6, p); q.setFromAxisAngle(new V3(Math.sin(s), 0, Math.cos(s)), 0.15); sc.set(0.14, k*1.7, 0.3); });
  inst(SMALL, 0xFF9E8A, spots.coral, ([s, u, k], p, q, sc) => { swPt(s, u, -6.5 + k*0.4, p); q.identity(); sc.set(k*1.3, k, k*1.3); });
  inst(new THREE.ConeGeometry(1, 1.5, 6), 0xF3FAFD, spots.berg, ([s, u, k], p, q, sc) => { swPt(s, u, k*0.45, p); q.setFromAxisAngle(up, s); sc.setScalar(k); });
  // лучи солнца под водой (днём) и светящийся планктон (ночью) — плывут вместе с камерой
  SW.rays = [];
  if(!T.glow) for(let k = 0; k < 6; k++){
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6 + k*0.3, 9), new THREE.MeshBasicMaterial({map:SW_RAY_TEX, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:0.35, fog:false, side:THREE.DoubleSide}));
    m.userData.k = k; g.add(m); SW.rays.push(m);
  }
  const N = 320, arr = new Float32Array(N*3);
  for(let i = 0; i < N; i++){ arr[i*3] = (Math.random() - 0.5)*24; arr[i*3 + 1] = (Math.random() - 0.5)*10; arr[i*3 + 2] = (Math.random() - 0.5)*24; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  SW.dust = new THREE.Points(pg, new THREE.PointsMaterial({size:T.glow ? 0.14 : 0.09, map:TEX.dot, transparent:true, depthWrite:false, color:T.glow ? 0x9FFFE0 : 0xE6FAFF, opacity:T.glow ? 0.95 : 0.6}));
  g.add(SW.dust);
  // старт и финиш
  const st = swGate(L('Заплыв дня!', 'Swim of the day!'), 0x7FB8F0); swPlace(st, 3.5); g.add(st);
  const fin = swGate(L('Финиш!', 'Finish!'), 0xFF7F9E); swPlace(fin, SW.L0.fin); g.add(fin);
  SW.gates = [st, fin];
}
// предметы на трассе
function swBuildItems(){
  const g = SW.grp, T = SW.T;
  SW.shells = []; SW.hoops = []; SW.crests = []; SW.curs = []; SW.weeds = []; SW.jellies = []; SW.schools = []; SW.total = 0;
  const hoopGeo = new THREE.TorusGeometry(0.95, 0.13, 10, 30), weeds = [];
  for(const it of SW.L0.items){
    if(it.k === 'shell'){
      const o = makeShell(0xFFC2D1); o.scale.multiplyScalar(0.75); o.rotation.x = 0.9; swPt(it.s, it.u, it.y + (it.air ? 0 : 0.1), o.position); g.add(o);
      SW.shells.push({o, s:it.s, u:it.u, y:it.y, got:false}); SW.total++;
    } else if(it.k === 'hoop'){
      const w = new THREE.Group(), col = it.kind === 'buoy' ? 0xFF7F9E : it.kind === 'coral' ? 0xFF9E6B : 0x9FE3FF;
      const tor = addOutline(new THREE.Mesh(hoopGeo, toon(col)), 1.05); w.add(tor);
      if(it.kind === 'buoy') for(let k = 0; k < 4; k++){ const b = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.14, 8, 6, 0.35), toon(0xFFFFFF)); b.rotation.z = k*Math.PI/2 + 0.6; w.add(b); }
      if(it.kind === 'coral') for(let k = 0; k < 7; k++){ const a = k/7*Math.PI*2, c = addOutline(new THREE.Mesh(SMALL, toon(k % 2 ? 0xFFB3C9 : 0xFFD66B)), 1.1); c.scale.setScalar(0.16 + (k % 3)*0.04); c.position.set(Math.cos(a)*0.95, Math.sin(a)*0.95, 0.1); w.add(c); }
      if(it.kind === 'bubble') for(let k = 0; k < 8; k++){ const a = k/8*Math.PI*2, b = new THREE.Mesh(SMALL, new THREE.MeshBasicMaterial({color:0xFFFFFF, transparent:true, opacity:0.75})); b.scale.setScalar(0.1); b.position.set(Math.cos(a)*0.95, Math.sin(a)*0.95, 0.14); w.add(b); }
      swPlace(w, it.s, it.u, it.y); g.add(w);
      SW.hoops.push({o:w, tor, s:it.s, u:it.u, y:it.y, kind:it.kind, st:0});   // st: 0 — впереди, 1 — проплыла, −1 — мимо
    } else if(it.k === 'crest'){
      const w = new THREE.Group(), len = SW_UW*2 + 3;
      const c = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, len, 18), toon(0x9FDCF2)), 1.04); c.rotation.z = Math.PI/2; c.scale.z = 2.2; w.add(c);   // пологий вал воды
      const foam = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, len + 0.1, 8), toon(0xFFFFFF)); foam.rotation.z = Math.PI/2; foam.position.set(0, 0.4, 0.15); w.add(foam);
      swPlace(w, it.s, 0, -0.12); g.add(w);
      SW.crests.push({s:it.s, o:w, mat:c.material, ph:it.s*0.7});
    } else if(it.k === 'cur'){
      const pts = []; for(let s = it.s; s <= it.s1; s += 2) pts.push(swPt(s, it.u, it.y));
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(8, pts.length*3), 0.95, 12, false),
        new THREE.MeshBasicMaterial({color:it.sec ? 0xFFE9A8 : 0xBFF3FF, transparent:true, opacity:it.sec ? 0.1 : 0.2, depthWrite:false, side:THREE.DoubleSide}));
      g.add(tube);
      const arrows = []; for(let k = 0; k < Math.round((it.s1 - it.s)/2.2); k++){
        const a = new THREE.Sprite(new THREE.SpriteMaterial({map:SW_ARROW_TEX, transparent:true, depthWrite:false, opacity:it.sec ? 0.55 : 0.9})); a.scale.setScalar(0.5);
        g.add(a); arrows.push({a, s:it.s + k*2.2 + Math.random(), du:(Math.random() - 0.5)*1.1, dy:(Math.random() - 0.5)*1.1});
      }
      SW.curs.push({s0:it.s, s1:it.s1, u:it.u, y:it.y, sec:!!it.sec, tube, arrows});
      if(it.sec) for(let k = 0; k < 7; k++){   // вход в тайное течение прячется за водорослями
        const kp = dvKelp(3.2 + (k % 3)*0.8, k % 2 ? 0x4FA877 : 0x6CC28C); swPt(it.s + 1 + (k % 4)*0.8, it.u + (k < 4 ? -0.6 : 0.6) + (k % 2)*0.3, -6.5, kp.position); kp.scale.setScalar(0.9); g.add(kp); SW.sway.push(kp);
      }
    } else if(it.k === 'weed'){   // водоросли плавают на глади во всю ширину (рисуем ниже одним махом)
      for(let s = it.s; s < it.s1; s += 1.5) for(let k = 0; k < 5; k++) weeds.push([s + (k % 2)*0.7, -SW_UW - 0.3 + k*1.6 + Math.sin(s*3 + k)*0.35, s*2 + k]);
      SW.weeds.push({s0:it.s, s1:it.s1});
    } else if(it.k === 'jelly'){
      const o = DV_MAKE.jelly(); o.scale.setScalar(0.7); swPt(it.s, it.u, it.y, o.position); o.rotation.y = -swGet(SW.P.TH, it.s); g.add(o);
      SW.jellies.push({o, s:it.s, u:it.u, y:it.y, ph:Math.random()*6, sq:0});
    } else if(it.k === 'school'){
      const fish = [], col = [0xFFD66B, 0x9BD3F0, 0xFF9BB8][SW.schools.length % 3], m = toon(col);
      for(let k = 0; k < 12; k++){ const f = new THREE.Mesh(SMALL, m); f.scale.set(0.08, 0.1, 0.22); g.add(f); fish.push({f, a:k/12*Math.PI*2, r:0.6 + (k % 3)*0.3, h:(k % 4 - 1.5)*0.25}); }
      SW.schools.push({s:it.s, u:it.u, y:it.y, fish, run:0});
    }
  }
  if(weeds.length){
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new V3(), p = new V3(), up = new V3(0, 1, 0);
    for(const [mat, k0] of [[toon(0x5DB57E), 1], [outlineMat, 1.08]]){
      const im = new THREE.InstancedMesh(SMALL, mat, weeds.length);
      weeds.forEach(([s, u, a], i) => { swPt(s, u, 0.02, p); q.setFromAxisAngle(up, a); sc.set(0.42*k0, 0.06*k0, 0.75*k0); m4.compose(p, q, sc); im.setMatrixAt(i, m4); });
      g.add(im);
    }
  }
  SW.hoopsN = SW.hoops.length;
}

/* ---------- пловцы: свой малыш, друзья-боты ---------- */
// у всех «вперёд» — +z внутри root; piv — для наклона и «покрутиться». Модели из бухты смотрят на +x — поворачиваем.
function swRider(kind, name, look){
  let root = new THREE.Group(), piv = new THREE.Group(), seal = null, lie = 0, dy = -0.28, anim = null;
  root.add(piv); root.rotation.order = 'YXZ';
  if(look === 'me' || look.col){ seal = look === 'me' ? coSealOf(coPetDesc()) : makeSeal({name:'', f:false, color:look.col}); seal.root.scale.setScalar(SW_SC); piv.add(seal.root); seal.swimming = true; if(seal.bubble) seal.bubble.visible = false; }
  else if(look.pen){ seal = makePenguin(look.pen); seal.root.scale.setScalar(SW_SC*0.95); piv.add(seal.root); lie = 1.25; dy = -0.1; }
  else if(look.dv){ const o = DV_MAKE[look.dv](); o.rotation.y = -Math.PI/2; o.scale.setScalar(look.sc); piv.add(o); anim = o.userData.fl || null; dy = look.dy || 0; }
  else if(look.blot){ const o = glOctoModel(); o.scale.setScalar(0.5); o.position.y = -0.3; piv.add(o); dy = -0.1; }
  SW.grp.add(root);
  let lbl = null;
  if(kind !== 'me'){ lbl = textSprite(name, '#3B8F5E'); lbl.scale.set(0.35 + name.length*0.16, 0.36, 1); SW.grp.add(lbl); }
  return {kind, name, look, root, piv, seal, lie, dy, anim, lbl, s:0, u:0, ut:0, y:0, yt:0, v:0, vy:0, air:false, dash:0, dashK:1, bump:0, spin:0, cur:null, weed:false,
    fin:0, ai:null, bubT:0, secT:0, shells:0};
}
// кто плывёт сегодня: черепаха всегда (она знает короткий путь), ещё двое — из подружившихся, по очереди по дням
function swFriends(){
  const lv = k => (save.coop.resc && save.coop.resc.lv && save.coop.resc.lv[k]) || 0, dv = save.dive, out = [], pool = [];
  out.push({id:'turtle', name:L('Черепаха', 'Turtle'), look:{dv:'turtle', sc:0.6}, pace:0.95, skill:0.9, tier:'deep',
    hi:L('Я не спешу… Но знаю тайное течение. Плыви за мной! 🐢', 'I never hurry… But I know a secret current. Follow me! 🐢'), bye:L('Медленно, но верно 🐢', 'Slow and steady 🐢')});
  if(typeof pengMet === 'function' && pengMet()) pool.push({id:'ping', name:L('Пинг', 'Ping'), look:{pen:PENG}, pace:1.0, skill:0.92, tier:'surf',
    hi:L('Кря! Смотри, как я прыгаю дельфинчиком!', 'Quack! Watch me leap like a dolphin!'), bye:L('Кря-кря! Вот это заплыв!', 'Quack-quack! What a swim!')});
  if(dv.shark.friend || dv.shark.tooth > 1) pool.push({id:'shark', name:L('Акула', 'Shark'), look:{dv:'shark', sc:0.5}, pace:1.04, skill:0.95, tier:'mid',
    hi:L('Наперегонки! Только чур без салок 🦈', 'Let\'s race! No tag this time 🦈'), bye:L('Ух! Я опять засмотрелась на рыбок 🦈', 'Whoa! I got distracted by the fish again 🦈')});
  if(dv.gloom.st >= 3) pool.push({id:'blot', name:L('Клякса', 'Blot'), look:{blot:true}, pace:0.99, skill:0.8, tier:'deep',
    hi:L('Я буду стараться… и не брызгаться чернилами!', 'I\'ll do my best… and no squirting ink!'), bye:L('Доплыла! Почти без клякс 🐙', 'Made it! Almost no ink blots 🐙')});
  if(lv('kelp') > 0) pool.push({id:'otter', name:L('Пуговка', 'Button'), look:{dv:'otter', sc:0.62, dy:0.1}, pace:0.98, skill:0.85, tier:'surf',
    hi:L('А я поплыву на спинке. С ракушкой!', 'I\'ll swim on my back. With my shell!'), bye:L('Ракушка доплыла — и я тоже 🦦', 'My shell made it — and so did I 🦦')});
  const day = Math.floor(Date.now()/864e5);
  for(let i = 0; i < pool.length && out.length < 3; i++) out.push(pool[(day + i) % pool.length]);
  const fill = [{id:'s1', name:L('Пломбир', 'Sundae'), look:{col:0xFFF4E0}, pace:0.98, skill:0.8, tier:'surf', hi:L('Поплыли!', 'Let\'s swim!'), bye:L('Ура, доплыли!', 'Hooray, we made it!')},
    {id:'s2', name:L('Ириска', 'Toffee'), look:{col:0xE8C9A0}, pace:0.99, skill:0.75, tier:'deep', hi:L('Я — как рыбка!', 'I\'m like a fish!'), bye:L('Ура, доплыли!', 'Hooray, we made it!')}];
  for(const f of fill) if(out.length < 3) out.push(f);
  return out;
}

/* ---------- состояние ---------- */
let SW = null;
const swAll = () => [SW.me, ...SW.bots];
// надпись над пловцом — чуть впереди по скорости, чтобы камера не наехала на неё
const swFloat = (t, r, dy = 1.2, col) => floatText(t, swPt(r.s + 2.5 + r.v*1.1, r.u, Math.max(r.y, -0.2) + dy), col);
function swSay(t, ms){ mgHint(t); setTimeout(() => { if(SW && mgHintEl.textContent === t) mgHint(''); }, ms); }
function swTip(k, t, ms = 2600){ if(SW.tips.has(k)) return false; SW.tips.add(k); if(!tipSeen('sw_' + k) || SW.first){ tipDone('sw_' + k); swSay(t, ms); return true; } return false; }
const swCrestAt = s => SW.crests.find(c => c.s - s > -0.7 && c.s - s < 1.7);   // гребень рядом — можно прыгнуть
const swCanLeap = r => !r.air && r.y > SW_SURF && !!swCrestAt(r.s);
function swCurAt(r){ for(const c of SW.curs) if(r.s > c.s0 && r.s < c.s1 && Math.abs(r.u - c.u) < 1.1 && Math.abs(r.y - c.y) < 1.05) return c; return null; }

/* ---------- гребок и «дельфинчик» ---------- */
function swLeap(r, force){
  if(r.air || r.fin || (!force && !swCanLeap(r))) return false;
  r.air = true; r.vy = SW_LEAP*(force ? 0.8 : 1); r.y = Math.max(r.y, 0); r.v = Math.max(r.v, SW_VAIR);
  if(r === SW.me){ sfx.whoosh(); SW.leaps++; swFloat(L('Дельфинчик! 🐬', 'Dolphin leap! 🐬'), r, 1.4, '#D9527E'); tipDone('sw_leap'); }
  burst(TEX.drop, swPt(r.s + 1, r.u, 0.1), 4, 1.3, 0.15);
  return true;
}
// касание: у гребня на глади — прыжок; иначе — гребок (в такт — рывок и серия, мимо — маленький толчок, серия сначала)
function swTap(){
  const C = SW, me = C.me;
  if(!C || C.st !== 'go' || me.fin) return;
  if(swLeap(me)) return;
  if(me.air) return;
  const ph = (C.t - C.t0)/SW_BEAT, n = Math.round(ph), off = Math.abs(ph - n)*SW_BEAT;
  if(off < SW_WIN && n !== C.lastBeat){
    C.lastBeat = n; C.streak++; C.best = Math.max(C.best, C.streak); C.good++;
    me.dash = SW_DASH_T; me.dashK = SW_DASH_K;
    sfx.pop(); for(let i = 0; i < 3; i++) emit(TEX.dot, swPt(me.s - 0.5, me.u + (Math.random() - 0.5)*0.5, me.y), {v:new V3(0, 0.8 + Math.random(), 0), life:0.8, size:0.1});
    C.beatEl.classList.remove('hit'); void C.beatEl.offsetWidth; C.beatEl.classList.add('hit');
    if(C.streak === SW_STREAK){ sfx.star(); swFloat(L(`${SW_STREAK} в такт! ⭐`, `${SW_STREAK} in rhythm! ⭐`), me, 1.3, '#D9527E'); }
  } else {
    if(C.streak >= 2) swFloat(L('Мимо такта', 'Off the beat'), me, 1.1, '#7B7A8C');
    C.streak = 0; if(me.dash <= 0.2){ me.dash = 0.2; me.dashK = 1.12; }
    sfx.plop(); C.beatEl.classList.remove('miss'); void C.beatEl.offsetWidth; C.beatEl.classList.add('miss');
  }
}

/* ---------- физика одного пловца ---------- */
function swBody(r, dt){
  const C = SW, s0 = r.s;
  let vt = SW_V;
  if(r.fin){ vt = Math.min(r.v, Math.max(0, (r.stopS - r.s)*1.1)); r.ut = r.stopU; r.yt = 0; }
  if(r.dash > 0){ r.dash -= dt; vt *= r.dashK; }
  const cur = r.air ? null : swCurAt(r);
  if(cur){ vt *= cur.sec ? SW_SEC_K : SW_CUR_K; r.u += (cur.u - r.u)*Math.min(1, dt*0.8); if(r === C.me) r.ut += (cur.u - r.ut)*Math.min(1, dt*0.8); }
  if(cur && !r.cur && r === C.me){
    sfx.boost();
    if(cur.sec){ swFloat(L('Тайное течение! 🐢', 'The secret current! 🐢'), r, 1.2, '#E0A030'); }
    else if(!swTip('cur', L('Течение несёт — вжух! 🌊', 'The current carries you — whoosh! 🌊'), 1800)) swFloat(L('Вжух!', 'Whoosh!'), r, 1.1, '#3E8DB8');
  }
  r.cur = cur;
  if(cur && cur.sec && r === C.me){ r.secT += dt; if(!C.sec && r.secT > 1.2){ C.sec = true; sfx.star(); swFloat(L('Короткий путь черепахи! ⭐', 'The turtle\'s shortcut! ⭐'), r, 1.3, '#D9527E'); } }
  r.weed = !r.air && r.y > SW_SURF && C.weeds.some(w => r.s > w.s0 && r.s < w.s1);
  if(r.weed){ vt *= SW_WEED_K; if(r === C.me) swTip('weed', L('Водоросли на глади держат! Ныряй под них ⬇️', 'Seaweed on top slows you down! Dive under it ⬇️')); }
  if(r.bump > 0){ r.bump -= dt; vt *= 0.7; }
  if(r.spin > 0){ r.spin -= dt; vt *= 0.25; }
  if(r.air) vt = Math.max(vt, SW_VAIR);
  if(r.ai) vt *= r.ai.mult;
  r.v += (vt - r.v)*Math.min(1, dt*(r.fin ? 2.5 : vt > r.v ? 2.6 : 1.6));
  r.s += r.v*dt;
  // вбок и вверх-вниз: за пальцем (или мыслями бота), соседи мягко расталкиваются
  let push = 0;
  for(const o of swAll()) if(o !== r && Math.abs(o.s - r.s) < 1.2 && Math.abs(o.u - r.u) < 0.8 && Math.abs(o.y - r.y) < 0.8) push += (r.u >= o.u ? 1 : -1)*(0.8 - Math.abs(o.u - r.u))*(r === C.me ? 3 : 7);
  r.u = Math.max(-SW_UW, Math.min(SW_UW, r.u + ((r.ut - r.u)*(r.air ? 1.5 : 5) + push)*dt));
  if(r.air){
    r.y += r.vy*dt - SW_G*dt*dt/2; r.vy -= SW_G*dt;
    if(r.y <= 0 && r.vy < 0){ r.air = false; r.y = -0.35; r.vy = 0; r.yt = Math.min(r.yt, 0); burst(TEX.drop, swPt(r.s + 1, r.u, 0.1), 5, 1.4, 0.15); if(r === C.me) sfx.splash(); }
  } else {
    const vy = Math.max(-3.8, Math.min(3.8, (r.yt - r.y)*4));
    r.vy += (vy - r.vy)*Math.min(1, dt*8);
    r.y = Math.max(SW_DEEP, Math.min(0, r.y + r.vy*dt));
  }
  // обручи, медузы, ракушки
  for(const h of C.hoops){
    if(h.s < s0 - 0.1 || h.s > r.s || (r === C.me ? h.st : h['b' + C.bots.indexOf(r)])) continue;
    const ok = Math.abs(r.u - h.u) < 0.85 && Math.abs(r.y - h.y) < 0.85;
    if(r !== C.me){ h['b' + C.bots.indexOf(r)] = 1; continue; }
    h.st = ok ? 1 : -1;
    if(ok){ C.hoopsGot++; sfx.star(); swFloat(L('Обруч! ⭕', 'Hoop! ⭕'), r, 1.2, '#3B8F5E'); burst(TEX.star, swPt(h.s, h.u, h.y), 10, 2, 0.26); h.tor.material.color.setHex(0xFFD66B); }
    else { h.tor.material.color.setHex(0xB9B8C6); if(!C.missTold){ C.missTold = true; swSay(L('Обруч мимо… Веди палец: вверх — к глади, вниз — в глубину ↕️', 'Missed a hoop… Steer: up — to the top, down — to the deep ↕️'), 2600); } }
  }
  for(const j of C.jellies){
    if(r.bump > 0 || Math.abs(j.s - r.s) > 1.2) continue;
    const jy = j.y + Math.sin(now*1.3 + j.ph)*0.35, du = r.u - j.u, dyv = r.y - jy;
    if(du*du + dyv*dyv < 0.7*0.7){
      r.bump = 0.5; r.ut = r.u + (du >= 0 ? 1.1 : -1.1); r.yt = r.y + (dyv >= 0 ? 0.9 : -0.9); j.sq = 0.35;
      if(r === C.me){ sfx.boing(); if(!swTip('jelly', L('Медуза — боинг! Проплывай между ними 🪼', 'A jellyfish — boing! Swim between them 🪼'), 2000)) swFloat(L('Боинг!', 'Boing!'), r, 1, '#3E8DB8'); }
    }
  }
  // финиш
  if(!r.fin && r.s >= C.L0.fin){
    const k = C.nFin = (C.nFin || 0) + 1;
    r.fin = C.t; r.stopS = C.L0.fin + 12 - (k - 1)*1.6; r.stopU = [0, -1.3, 1.3, -0.6][k - 1] || 0.6; swFinish(r);
  }
}

/* ---------- мысли ботов: держимся рядом, у каждого свой характер ---------- */
function swAI(b, dt){
  const A = b.ai, me = SW.me, C = SW;
  if(b.fin){ A.mult = 1; return; }
  const d = me.s - b.s, left = C.L0.fin - me.s;
  const off = Math.sin(C.t*0.13 + A.ph*1.7)*4.5 + A.lead;   // то впереди, то сзади — обгоны
  let mult = A.pace*(1 + Math.max(-0.5, Math.min(0.22, (d + off)*0.03)));
  if(C.mode === 'race' && left < 60 && d > -4 && d < 12) mult = Math.min(mult, 0.975);   // в конце не обгоняет того, кто старается
  if(C.st === 'ready') mult = 0;
  // характер
  if(A.id === 'blot') mult *= 0.72 + 0.6*Math.max(0, Math.sin(C.t*3.1 + A.ph));   // рывками
  if(A.id === 'blot' && !A.inked && b.s > C.L0.fin*0.45 && Math.abs(b.s - me.s) < 14 && C.st === 'go'){
    A.inked = true; for(let i = 0; i < 10; i++) emit(TEX.puff, swPt(b.s - 0.5, b.u + (Math.random() - 0.5), b.y + (Math.random() - 0.5)*0.6), {v:new V3((Math.random() - 0.5)*0.8, 0.2, (Math.random() - 0.5)*0.8), life:1.6, size:0.8, grow:1.2});
    parts.slice(-10).forEach(p => p.sp.material.color.setHex(0x3B3A4A));
    sfx.pop(); swFloat(L('Пшик! Ой, прости!', 'Pfft! Oops, sorry!'), b, 1.2, '#8C6FD1');
  }
  if(A.id === 'shark' && C.st === 'go' && left > 40){   // останавливается помахать и покрутиться
    A.showT -= dt;
    if(A.showT < 0 && b.spin <= 0){ A.showT = 8 + Math.random()*5; b.spin = 1.3; if(Math.abs(b.s - me.s) < 16) swFloat(L('Смотри, как я умею! 🦈', 'Look what I can do! 🦈'), b, 1.3, '#3E8DB8'); }
  }
  A.mult += (mult - A.mult)*Math.min(1, dt*2);
  // гребут и боты: в такт с шансом skill (так они плывут наравне с тем, кто старается, а резинка выше держит их рядом)
  if(C.st === 'go' && A.beat !== C.tickN){ A.beat = C.tickN; if(d > -6 && Math.random() < A.skill*0.8){ b.dash = SW_DASH_T; b.dashK = SW_DASH_K; } }   // убежал вперёд — не гребёт, ждёт
  // куда плыть (по важности): тайное течение (черепаха) → обруч своего яруса → течение → свой ярус
  let wu = A.line + Math.sin(now*0.5 + A.ph)*0.4, wy = A.tier === 'surf' ? 0 : A.tier === 'deep' ? -2.7 : -1.4 + Math.sin(C.t*0.4 + A.ph)*1.2;
  const cu = C.curs.find(c => !c.sec && c.s1 > b.s && c.s0 - b.s < 14), hp = C.hoops.find(h => h.s - b.s > 0 && h.s - b.s < 10 && (h.y > -1 ? A.tier !== 'deep' : A.tier !== 'surf'));
  const sc = A.id === 'turtle' && C.curs.find(c => c.sec && c.s1 - 4 > b.s && c.s0 - b.s < 14);
  if(cu && A.tier !== 'surf'){ wu = cu.u; wy = cu.y; }
  if(hp && !(sc && hp.s > sc.s0)){ wu = hp.u; wy = hp.y; }   // обруч перед тайным течением — сначала обруч
  else if(sc){ wu = sc.u; wy = sc.y; }
  if(A.tier === 'surf' && C.weeds.some(w => b.s > w.s0 - 5 && b.s < w.s1)) wy = -1.7;
  for(const j of C.jellies){ const ds = j.s - b.s; if(ds > 0 && ds < 7 && Math.abs(j.u - wu) < 0.9 && Math.abs(j.y - wy) < 0.9) wy = j.y > -1.9 ? 0 : SW_DEEP + 0.4; }
  if(A.id === 'turtle'){   // зовёт за собой к тайному течению
    const c = C.curs.find(c => c.sec && c.s0 - b.s > 0 && c.s0 - b.s < 12);
    if(c && !A.told && Math.abs(me.s - b.s) < 12 && C.st === 'go'){ A.told = true; swFloat(L('За мной! Тут короче 🐢', 'Follow me! It\'s shorter here 🐢'), b, 1.3, '#E0A030'); if(!tipSeen('sw_sec')){ tipDone('sw_sec'); swSay(L('🐢 Черепаха знает тайное течение — плыви за ней вниз!', '🐢 The turtle knows a secret current — follow her down!'), 3000); } }
  }
  // прыжки: у гребня — дельфинчик; Пинг прыгает и просто так (пингвины так дышат на ходу)
  const cr = swCrestAt(b.s);
  const hoopUp = C.hoops.some(h => h.y > -1 && h.s - b.s > 0 && h.s - b.s < 10);   // впереди обруч на глади — не перепрыгиваем его
  if(cr && !b.air && b.y > SW_SURF && !A.did.has(cr)){ A.did.add(cr); if(Math.random() < A.skill && !hoopUp) swLeap(b); }
  if(A.id === 'ping' && !b.air && b.y > SW_SURF && (A.hopT -= dt) < 0){ A.hopT = 2.2 + Math.random()*1.5; swLeap(b, true); }
  if(Math.abs(me.s - b.s) < 3 && Math.abs(me.u - wu) < 1 && Math.abs(me.y - wy) < 1) wu = me.u + (wu >= me.u ? 1.2 : -1.2);   // малыша обплывает стороной
  b.ut = Math.max(-SW_UW, Math.min(SW_UW, wu)); b.yt = Math.max(SW_DEEP, Math.min(0, wy));
}

/* ---------- кадр ---------- */
function swStep(dt0){
  if(!SW) return;
  const C = SW;
  // обучение: перед первым гребнем время почти замирает, пока не прыгнешь
  let ts = 1;
  if(C.st === 'go' && C.teach && !C.taught){
    const me = C.me, c0 = C.crests.find(c => c.s > me.s - 0.5);
    if(c0 && me.y > SW_SURF && swCanLeap(me)){ ts = 0.12; mgHint(L('Волна! Нажми — дельфинчик 🐬', 'A wave! Tap — dolphin leap 🐬')); C.slowNow = true; }
    else if(C.slowNow){ C.slowNow = false; mgHint(''); if(me.air || ++C.teachN >= 2) C.taught = true; }   // учим на двух волнах, дальше — сама
  }
  const dt = dt0*ts;
  if(C.st === 'go' || C.st === 'end'){
    C.t += dt;
    for(const b of C.bots) swAI(b, dt);
    for(const r of swAll()) swBody(r, dt);
    // ракушки — только свои
    const me = C.me;
    for(const sh of C.shells){
      if(sh.got || Math.abs(sh.s - me.s) > 1 || Math.abs(sh.u - me.u) > 0.8 || Math.abs(sh.y - me.y) > 0.9) continue;
      sh.got = true; C.grp.remove(sh.o); C.shells_++; sfx.coin(); emit(TEX.star, sh.o.position, {v:new V3(0, 1, 0), life:0.45, size:0.22, spin:4});
    }
    // такт: тик раз в такт; пропустила два такта — серия сначала
    const bn = Math.floor((C.t - C.t0)/SW_BEAT);
    if(C.st === 'go' && bn !== C.tickN){ C.tickN = bn; sfx.tick(); if(C.streak && bn - C.lastBeat > 2) C.streak = 0; }
  }
  // рисуем
  for(const sh of C.shells) if(!sh.got && Math.abs(sh.s - C.me.s) < 40) sh.o.rotation.y += dt0*3;
  for(const c of C.crests){ c.o.position.y = SW_POS.y - 0.12 + Math.sin(now*2 + c.ph)*0.06; }
  const lc = !C.me.air && C.me.y > SW_SURF && swCrestAt(C.me.s);
  for(const c of C.crests) c.mat.color.setHex(c === lc ? 0xFFC2D6 : 0x9FDCF2);
  for(const cu of C.curs) for(const a of cu.arrows){
    a.s += dt0*6; if(a.s > cu.s1) a.s = cu.s0 + (a.s - cu.s1);
    swPt(a.s, cu.u + a.du, cu.y + a.dy, a.a.position); a.a.visible = Math.abs(a.s - C.me.s) < 30;
  }
  for(const j of C.jellies){
    const y = j.y + Math.sin(now*1.3 + j.ph)*0.35; swPt(j.s, j.u, y, j.o.position);
    if(j.sq > 0){ j.sq -= dt0; const k = Math.sin((0.35 - j.sq)/0.35*Math.PI)*0.25; j.o.scale.set(0.7*(1 + k), 0.7*(1 - k), 0.7*(1 + k)); }
  }
  for(const sc of C.schools){
    if(Math.abs(sc.s - C.me.s) < 5 && Math.abs(sc.u - C.me.u) < 2.5 && Math.abs(sc.y - C.me.y) < 2) sc.run = Math.min(1, sc.run + dt0*3);
    else sc.run = Math.max(0, sc.run - dt0*0.5);
    for(const f of sc.fish){ f.a += dt0*1.6; const r = f.r*(1 + sc.run*2.2); swPt(sc.s + Math.sin(f.a)*r, sc.u + Math.cos(f.a)*r, sc.y + f.h*(1 + sc.run), f.f.position); f.f.rotation.y = -f.a - swGet(C.P.TH, sc.s); }
  }
  for(const k of C.sway){ const ph = k.userData.ph; k.userData.pivs.forEach((p, i) => p.rotation.z = Math.sin(now*1.1 + ph + i*0.55)*0.08); }
  for(const r of swAll()) swDraw(r, dt0);
  swCam(dt0);
  swBeatUi();
  swHud();
}
function swDraw(r, dt){
  const th = swGet(SW.P.TH, r.s), bob = !r.air && r.y > SW_SURF ? Math.sin(now*4 + r.s)*0.05 : 0;
  swPt(r.s, r.u, r.y + r.dy + bob, r.root.position);
  const pitch = r.air ? Math.max(-0.7, Math.min(0.7, -r.vy*0.09)) : Math.max(-0.6, Math.min(0.6, -r.vy*0.18));
  r.root.rotation.set(pitch, Math.PI - th + (r.ut - r.u)*0.15, -(r.ut - r.u)*0.12);
  r.piv.rotation.x = r.lie;
  r.piv.rotation.z = r.spin > 0 ? (1 - r.spin/1.3)*Math.PI*4 : 0;   // акула крутится
  if(r.seal){ const s = r.seal; s.flap = r.dash > 0 ? 1 : r.air ? 0.9 : 0.45; updateSeal(s, now, dt); }
  if(r.anim) r.anim.forEach((f, i) => f.rotation.y = Math.sin(now*(r.dash > 0 ? 14 : 8) + i)*0.5);
  const close = r !== SW.me && r.s < SW.me.s - 1 && r.s > SW.me.s - 11;   // сзади у самой камеры — не загораживать
  r.root.visible = !close;
  if(r.lbl){ swPt(r.s, r.u, r.y + 1.1, r.lbl.position); r.lbl.visible = !close && r.s > SW.me.s + 1.5 && r.s < SW.me.s + 28; }
  // пузырьки за ластами, брызги на глади
  if((r.bubT -= dt) < 0 && Math.abs(r.s - SW.me.s) < 22){
    r.bubT = r.dash > 0 ? 0.09 : 0.22;
    const b = swPt(r.s - 0.6, r.u + (Math.random() - 0.5)*0.4, r.y + 0.05);
    if(r.y > SW_SURF && !r.air) emit(TEX.puff, b.setY(SW_POS.y + 0.08), {v:new V3(0, 0.4, 0), life:0.45, size:0.25, grow:0.8});
    else if(!r.air) emit(TEX.dot, b, {v:new V3(0, 1.1, 0), life:0.9, size:0.06 + Math.random()*0.06, grow:0.2});
  }
}
// камера: сзади и чуть сверху; на глади — над водой, в глубине — под водой вместе с малышом
const _swA = new V3(), _swB = new V3();
function swCam(dt){
  const C = SW, me = C.me, far = Math.max(1, Math.min(1.4, 0.62/camera.aspect));
  const surf = me.y > -1.3 || me.air;
  const wantY = surf ? Math.max(1.2, me.y + 2.4*far) : Math.min(-0.45, me.y + 1.8);
  C.camY = C.camInit ? C.camY + (wantY - C.camY)*Math.min(1, dt*4) : wantY;
  if(Math.abs(C.camY) < 0.25) C.camY = C.camY < wantY ? 0.25 : -0.25;   // камера не застревает в самой глади
  const back = 6.4*far + Math.max(0, me.v - SW_V)*0.25;
  swPt(me.s - back, me.u*0.6, C.camY, _swA);
  swPt(me.s + 8*far, me.u*0.4, surf ? Math.max(-0.6, me.y*0.6) : me.y - 0.2, _swB);
  const mp = swPt(me.s, me.u, me.y + 0.3); _swB.lerp(mp, 0.35);
  if(C.st === 'end' && me.fin){   // финиш: камера облетает малыша спереди, малыш в верхней половине
    C.endK = Math.min(1, (C.endK || 0) + dt*0.6); const k = ease.io(C.endK);
    _swA.lerp(swPt(me.s + 5.5, me.u*0.5 + 0.8, 1.8 + 0.9*far), k); _swB.lerp(swPt(me.s, me.u, -1.1), k);
  }
  const kk = C.camInit ? Math.min(1, dt*8) : 1; C.camInit = true;
  runCam.pos.lerp(_swA, kk); runCam.look.lerp(_swB, kk);
  // под водой — свой туман и небо
  const under = runCam.pos.y < SW_POS.y;
  if(under !== C.under){
    C.under = under; const T = C.T;
    scene.fog.color.setHex(under ? T.deep : T.fog); scene.fog.near = under ? 3 : 40; scene.fog.far = under ? 34 : 150;
    scene.background.setHex(under ? T.deep : T.sky);
    C.dust.visible = under; C.rays.forEach(m => m.visible = under);
  }
  C.dust.position.copy(runCam.pos);
  for(const m of C.rays){ const k = m.userData.k; swPt(me.s + 3 + k*3.5, (k % 3 - 1)*3.5, -4, m.position); m.lookAt(runCam.pos.x, m.position.y, runCam.pos.z); m.rotation.z = 0.3; m.material.opacity = 0.25 + Math.sin(now*0.8 + k*2)*0.12; }
  SW_WATER_TEX.offset.set(now*0.01, now*0.006); SW_UNDER_TEX.offset.set(-now*0.008, now*0.01);
}
// кружок такта вокруг малыша: сжимается к кольцу — жми; у гребня — «⤴»
function swBeatUi(){
  const C = SW, el = C.beatEl; if(!el) return;
  const me = C.me, on = C.st === 'go' && !me.fin && !me.air;
  el.hidden = !on; if(!on) return;
  const p = toScreen(me.root.position.clone().add(new V3(0, 0.25, 0)));
  el.style.transform = `translate(${p.x}px, ${p.y}px)`;
  const ph = ((C.t - C.t0)/SW_BEAT) % 1, k = ph < 0 ? 1 + ph : ph;
  el.style.setProperty('--r', (1 + 1.3*(1 - k)).toFixed(3));
  const leap = me.y > SW_SURF && swCrestAt(me.s);
  el.classList.toggle('leap', !!leap);
  el.querySelector('b').textContent = leap ? '⤴' : C.streak > 1 ? `×${C.streak}` : '';
}
function swHud(){
  const h = SW && SW.hud; if(!h) return;
  h.querySelector('.sh').textContent = SW.shells_;
  h.querySelector('.hp').textContent = `${SW.hoopsGot}/${SW.hoopsN}`;
  const tm = h.querySelector('.tm'); if(tm) tm.textContent = (SW.me.fin || SW.t).toFixed(1);
  const pl = h.querySelector('.pl'); if(pl) pl.textContent = slPlaceIc(swPlaceOf(SW.me));
  const len = SW.L0.fin;
  h.querySelector('.bar i').style.width = Math.max(0, Math.min(1, SW.me.s/len))*100 + '%';
  SW.dots.forEach(([r, el]) => el.style.left = Math.max(0, Math.min(1, r.s/len))*100 + '%');
}
function swPlaceOf(r){   // место: кто приплыл раньше, потом — кто дальше
  const all = swAll(), ri = all.indexOf(r);
  return 1 + all.filter((o, i) => o !== r && (o.fin && (!r.fin || o.fin < r.fin || o.fin === r.fin && i < ri) || !o.fin && !r.fin && o.s > r.s)).length;
}

/* ---------- финиш ---------- */
function swFinish(r){
  burst(TEX.star, swPt(SW.L0.fin, 0, 2.5), 8, 2, 0.28);
  if(r !== SW.me){ if(Math.abs(r.s - SW.me.s) < 30 && r.ai) swFloat(r.ai.bye, r, 1.4, '#3B8F5E'); return; }
  SW.st = 'end'; sfx.good(); sfx.hug();
  const p = swPt(SW.L0.fin, 0, 2.8);
  for(let i = 0; i < 3; i++) setTimeout(() => { if(SW){ burst(TEX.star, p, 14, 2.6, 0.32); burst(TEX.heart, p, 6, 2, 0.28); } }, i*250);
  swFloat(L('Финиш!', 'Finish!'), r, 1.6, '#D9527E');
  if(r.seal){ r.seal.happyUntil = now + 5; setMood(r.seal, 'happy'); }
}

/* ---------- управление: держи палец и веди (влево-вправо, вверх — к глади, вниз — в глубину); касание — гребок ----------
   Пальцев может быть два: одним ведёшь, другим гребёшь. */
function swControls(){
  const ps = new Map(); let steer = null;
  const ok = () => SW && SW.st === 'go';
  const W = () => Math.min(innerWidth, 560), H = () => Math.min(innerHeight, 900);
  mgOn(mgRoot, 'pointerdown', e => {
    if(e.target.closest('button, .mg-panel')) return; e.preventDefault();
    if(!ok()) return;
    ps.set(e.pointerId, {x:e.clientX, y:e.clientY, t:performance.now(), moved:false, u0:SW.me.ut, y0:SW.me.yt});
  });
  mgOn(mgRoot, 'pointermove', e => {
    const g = ps.get(e.pointerId); if(!g || !ok()) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if(!g.moved && Math.hypot(dx, dy) > 12 && (steer === null || !ps.has(steer))){ g.moved = true; steer = e.pointerId; g.u0 = SW.me.ut; g.y0 = SW.me.yt; g.x = e.clientX; g.y = e.clientY; return; }
    if(steer !== e.pointerId) return;
    SW.me.ut = Math.max(-SW_UW, Math.min(SW_UW, g.u0 + dx/W()*SW_UW*2.6));
    SW.me.yt = Math.max(SW_DEEP, Math.min(0, g.y0 - dy/H()*SW_DEEP*-2.4));
  });
  const up = e => {
    const g = ps.get(e.pointerId); if(!g) return; ps.delete(e.pointerId);
    if(steer === e.pointerId) steer = null;
    if(!g.moved && ok() && performance.now() - g.t < 400) swTap();
  };
  mgOn(mgRoot, 'pointerup', up);
  mgOn(mgRoot, 'pointercancel', e => { ps.delete(e.pointerId); if(steer === e.pointerId) steer = null; });
  const keys = {};
  mgOn(window, 'keydown', e => {
    if(/^Arrow/.test(e.key)){ keys[e.key] = true; e.preventDefault(); }
    if(e.key === ' ' && !e.repeat && ok()){ e.preventDefault(); swTap(); }
  });
  mgOn(window, 'keyup', e => { keys[e.key] = false; });
  mgTick(dt => {
    if(!ok()) return;
    const ku = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0), ky = (keys.ArrowUp ? 1 : 0) - (keys.ArrowDown ? 1 : 0);
    if(ku) SW.me.ut = Math.max(-SW_UW, Math.min(SW_UW, SW.me.ut + ku*dt*5));
    if(ky) SW.me.yt = Math.max(SW_DEEP, Math.min(0, SW.me.yt + ky*dt*5));
  });
}

/* ---------- сам заплыв: mode — 'race' (с друзьями) или 'time' (на время). Возвращает {res, again} или null ---------- */
async function swimRun(mode){
  sfx.whoosh(); flash();
  const fog = scene.fog, bg = scene.background, fov = camera.fov;
  swRoot.visible = true; runCam.on = true; snow.visible = false;
  document.body.classList.add('run-on', 'swim-on');
  const homeB = document.createElement('button'); homeB.id = 'btnRunHome'; homeB.className = 'round home';
  homeB.innerHTML = '<span aria-hidden="true">🏠</span>'; homeB.setAttribute('aria-label', L('Домой', 'Home')); $('#corner').prepend(homeB);
  let done; const fin = new Promise(r => done = r);
  homeB.addEventListener('click', () => { sfx.tap(); done('quit'); });
  const sv = save.sw, {seed, th} = swDay(), T = SW_DAYS[th];
  SW = {mode, st:'ready', t:0, t0:0, T, seed, grp:new THREE.Group(), me:null, bots:[], hud:null, dots:[], sway:[], shells_:0, hoopsGot:0, leaps:0,
    streak:0, best:0, good:0, lastBeat:-9, tickN:-1, sec:false, first:!sv.n, teach:!tipSeen('sw_leap'), taught:false, tips:new Set(), camY:1, under:null, teachN:0};
  swRoot.add(SW.grp);
  SW.L0 = swLayout(seed, SW.first, T.gap); SW.P = swPath(SW.L0);
  swBuildWorld(); swBuildItems();
  scene.fog = new THREE.Fog(T.fog, 40, 150); scene.background = new THREE.Color(T.sky);
  HEMI.intensity = T.hemi; sun.intensity = T.sun;
  camera.fov = camera.aspect < 1 ? 56 : 50; camera.updateProjectionMatrix();
  // пловцы на старте
  const me = SW.me = swRider('me', '', 'me'); me.s = 1.5;
  if(mode === 'race') swFriends().forEach((f, i) => {
    const b = swRider('bot', f.name, f.look); b.s = 3.2 + (i === 2 ? 1 : 0); b.u = b.ut = [-1.4, 1.4, 0][i]; b.y = b.yt = 0;
    b.ai = {id:f.id, pace:f.pace, skill:f.skill, tier:f.tier, bye:f.bye, mult:0, line:[-0.6, 0.6, 0][i], ph:i*2, lead:[3, 0, -2][i], did:new Set(), showT:5 + i*2, hopT:1 + i}; SW.bots.push(b); b.hi = f.hi;
  });
  mgOpen('', {hintBottom:true});
  SW.hud = mgNode('div', 'run-hud sl-hud sw-hud', `<span class="pill">🐚 <b class="sh">0</b></span><span class="pill">⭕ <b class="hp">0</b></span>${mode === 'time' ? '<span class="pill">⏱️ <b class="tm">0.0</b></span>' : '<span class="pill pl-pill"><b class="pl">1</b></span>'}<span class="bar"><i></i><span class="flag" aria-hidden="true">🏁</span></span>`);
  const bar = SW.hud.querySelector('.bar');
  SW.dots = SW.bots.map(r => { const el = document.createElement('b'); el.className = 'sl-dot'; bar.appendChild(el); return [r, el]; });
  SW.beatEl = mgNode('div', 'sw-beat', '<i class="o"></i><i class="c"></i><b></b>'); SW.beatEl.hidden = true;
  swControls(); swStep(0); swHud();
  mgTick(dt => {
    swStep(dt);
    if(SW && SW.st === 'end' && !SW.over){
      const wait4 = SW.mode === 'race' ? SW.bots.every(b => b.fin || b.s < SW.me.s - 45) : true;
      SW.endT = (SW.endT || 0) + dt;
      if(SW.endK >= 1 && (wait4 || SW.endT > 6) && SW.endT > 2.6){ SW.over = true; done('win'); }
    }
  });
  const tick = t => Promise.race([wait(t), fin]);
  if(SW.first){ mgHint(L('🐢 Черепаха: «Сегодня в море заплыв! Кто со мной?»', '🐢 Turtle: “There\'s a swim race at sea today! Who\'s with me?”')); await tick(2.6); }
  mgHint(`${T.ic} ${L(`Заплыв дня «${T.name}»: ${T.about}`, `Swim of the day “${T.name}”: ${T.about}`)}`);
  SW.bots.forEach((b, i) => setTimeout(() => { if(SW && SW.st === 'ready'){ floatText(b.hi, swPt(b.s + 0.5, b.u, 1.3 + i*0.35), '#3B8F5E'); sfx.tap(); } }, 300 + i*900));   // друзья здороваются
  await tick(SW.bots.length ? 3 : 2.4);
  if(mode === 'time'){ mgHint(L(`⏱️ На время! Цель дня — ${swGoal()} с${sv.bt ? `, рекорд — ${sv.bt} с` : ''}`, `⏱️ Against the clock! Today's goal is ${swGoal()} s${sv.bt ? `, your record is ${sv.bt} s` : ''}`)); await tick(2.4); }
  if(SW.first || !tipSeen('sw_steer')){ tipDone('sw_steer'); mgHint(L('Держи палец и веди: вверх — к глади, вниз — в глубину ↕️', 'Hold and steer: up — to the top, down — to the deep ↕️')); await tick(3); }
  if(SW.first || !tipSeen('sw_beat')){ tipDone('sw_beat'); mgHint(L('Жми, когда кружок сойдётся с малышом, — рывок ластами! В такт — ещё быстрее 〰️', 'Tap when the ring closes on your pup — a flipper dash! In rhythm — even faster 〰️')); await tick(3.4); }
  for(const n of ['3', '2', '1']){ mgHint(n); sfx.tick(); await tick(0.5); }
  if(SW && SW.st === 'ready'){ SW.st = 'go'; SW.t0 = SW.t + SW_BEAT; mgHint(L('Поплыли! 🏊', 'Swim! 🏊')); sfx.arf(); for(const r of swAll()) r.v = 3; setTimeout(() => { if(SW && mgHintEl.textContent.includes('🏊')) mgHint(''); }, 1100); }
  const how = await fin;
  let res = null, again = false;
  if(how === 'win'){
    res = swResults();
    if(res.first || res.cup){   // фото на финише — в альбом (в первый раз и за кубок)
      try{ res.photo = snapshot({root:{position:SW.me.root.position.clone().add(new V3(0, -0.4, 0)), scale:{x:1}}}, 2.6);
        albumAdd({name:L('Заплыв', 'Swim race'), img:res.photo, d:Date.now()}); renderAlbumCount(); }catch(e){}
    }
    mgHint(''); SW.hud.remove(); SW.beatEl.remove(); again = await swResultPanel(res);
  }
  mgHint(''); mgClose();
  swRoot.remove(SW.grp);
  SW.grp.traverse(o => { if(o.geometry && !o.isSprite && o.geometry !== SMALL && o.geometry !== SPH) o.geometry.dispose(); });
  SW = null;
  homeB.remove(); document.body.classList.remove('run-on', 'swim-on');
  swRoot.visible = false; runCam.on = false; homeLights(false); snow.visible = true;
  scene.fog = fog; scene.background = bg; camera.fov = fov; camera.updateProjectionMatrix();
  return res && {res, again};
}

/* ---------- итоги ---------- */
const swGoal = () => { const d = swDay(), L0 = swLayout(d.seed, false, SW_DAYS[d.th].gap); return Math.round(L0.fin/(SW_V*1.12)); };   // время дня: с рывками и течениями легко побить
function swResults(){
  const C = SW, sv = save.sw, today = swToday(), me = C.me;
  if(sv.day.d !== today) sv.day = {d:today, n:0, st:0};
  const time = Math.round(me.fin*10)/10, goal = Math.round(C.L0.fin/(SW_V*1.12));
  const place = C.mode === 'time' ? 0 : swPlaceOf(me);
  const r = {mode:C.mode, time, goal, shells:C.shells_, total:C.total, hoops:C.hoopsGot, hoopsN:C.hoopsN, best:C.best, sec:C.sec, leaps:C.leaps, place, T:C.T, first:!sv.n,
    others:C.mode === 'time' ? [] : C.bots.map(o => ({name:o.name, fin:o.fin, place:swPlaceOf(o)}))};
  r.st = [r.hoops >= r.hoopsN, r.sec, r.best >= SW_STREAK];
  r.stars = r.st.filter(Boolean).length;
  r.rec = !sv.bt || time < sv.bt; r.prev = sv.bt;
  r.cup = r.stars === 3 && !save.adv.cups.includes('swim');
  r.paid = sv.day.n < SW_DAILY;
  r.gift = r.paid ? Math.min(SW_MAX, Math.round(r.shells/3) + SW_END + r.stars*2) : 0;
  r.gift += r.cup ? SW_CUP : 0;
  sv.n++; sv.day.n++; sv.day.st = Math.max(sv.day.st, r.stars); sv.best = Math.max(sv.best, r.stars);
  if(r.rec) sv.bt = time;
  if(C.sec) sv.sec = true;
  if(C.mode === 'race' && place === 1) sv.win++;
  if(r.cup) save.adv.cups.push('swim');   // кубок — в комнату трофеев (js/trophyroom.js)
  persist();
  return r;
}
async function swResultPanel(r){
  const st = '⭐'.repeat(r.stars) + '☆'.repeat(3 - r.stars);
  const who = r.others.length ? `<div class="sl-podium">${[{name:save.pet ? save.pet.name : L('Ты', 'You'), place:r.place, fin:r.time, me:true}, ...r.others].sort((a, b) => a.place - b.place)
    .map(o => `<span class="${o.me ? 'me' : ''}">${slPlaceIc(o.place)} ${o.name}${o.fin ? ` <small>${o.fin.toFixed(1)} ${L('с', 's')}</small>` : ''}</span>`).join('')}</div>` : '';
  const title = r.mode === 'time' ? (r.rec && r.prev ? L('Новый рекорд! 🏆', 'New record! 🏆') : L('Доплыли! 🏊', 'Made it! 🏊'))
    : r.place === 1 ? L(`Ты ${pg('первый', 'первая')}! 🥇`, 'You won! 🥇') : L('Все доплыли — ура! 🏊', 'Everyone made it — hooray! 🏊');
  const ok = b => b ? ' ✅' : '';
  const panel = mgNode('div', 'mg-panel run-end co-end sl-end', `
    <p class="ttl display">${title}</p>
    <p class="res-stars display">${st}</p>
    ${who}
    <p class="got">⭕ ${L(`Обручи: ${r.hoops} из ${r.hoopsN}`, `Hoops: ${r.hoops} of ${r.hoopsN}`)}${r.st[0] ? ok(1) : ` <small>(${L('за звезду — все', 'all of them for a star')})</small>`}</p>
    <p class="got">🐢 ${r.sec ? L('Короткий путь черепахи найден!', 'You found the turtle\'s shortcut!') + ok(1) : L('Черепаха знает тайное течение у самого дна — плыви за ней…', 'The turtle knows a secret current near the bottom — follow her…')}</p>
    <p class="got">〰️ ${L(`Лучшая серия в такт: ${r.best}`, `Best rhythm streak: ${r.best}`)}${r.st[2] ? ok(1) : ` <small>(${L(`за звезду — ${SW_STREAK}`, `${SW_STREAK} for a star`)})</small>`}</p>
    <p class="got">⏱️ ${L(`Время: ${r.time} с`, `Time: ${r.time} s`)}${r.time <= r.goal ? ' ✅' : ''}${r.rec && r.prev ? ` · 🏆 ${L('рекорд!', 'record!')}` : ''} · 🐚 ${r.shells}/${r.total}</p>
    ${r.cup ? `<p class="got">🏆 ${L('Кубок заплыва — в комнату трофеев!', 'The swim cup — for the trophy room!')}</p>` : ''}
    ${r.photo ? `<img class="co-photo" src="${r.photo}" alt=""><p class="got">📷 ${L('Фото — в альбоме', 'The photo is in the album')}</p>` : ''}
    ${!r.paid ? `<p class="got">${L('Ракушки за заплыв на сегодня собраны — завтра будет новый 🌊', 'Today\'s swim shells are collected — a new swim tomorrow 🌊')}</p>` : ''}
    <p class="earned display">${r.gift ? `+${r.gift} 🐚` : ''}</p>
    <div class="row"><button class="btn" data-k="home">${L('Домой 🏠', 'Home 🏠')}</button><button class="btn ghost" data-k="again">${L('Ещё раз ↻', 'Again ↻')}</button></div>`);
  if(r.gift) setTimeout(() => addShells(r.gift, {x:innerWidth/2, y:innerHeight*0.4}), 900);
  if(save.pet && typeof petGive === 'function' && petSeal) setTimeout(() => { try{ petGive(5); }catch(e){} }, 1500);
  sfx.hug(); if(r.stars === 3) setTimeout(() => sfx.star(), 500);
  const k = await new Promise(res => panel.querySelectorAll('[data-k]').forEach(b => mgOn(b, 'click', () => { sfx.tap(); res(b.dataset.k); })));
  panel.classList.add('away'); await wait(0.25);
  return k === 'again';
}

/* ---------- выбор: с друзьями или на время ---------- */
const swPickHtml = () => {
  const sv = save.sw, fr = swFriends();
  return `<button data-k="race" class="wide"><span class="ic">🏁</span><b>${L('С друзьями', 'With friends')}</b><small>${fr.map(f => f.name).join(', ')}</small></button>
    <button data-k="time" class="wide"><span class="ic">⏱️</span><b>${L('На время', 'Against the clock')}</b><small>${L(`цель дня — ${swGoal()} с`, `today's goal: ${swGoal()} s`)}${sv.bt ? L(` · рекорд ${sv.bt} с`, ` · record ${sv.bt} s`) : ''}</small></button>`;
};
async function swimPick(){
  const sv = save.sw, T = swTheme();
  mgOpen(L('Заплыв 🏊', 'Swim race 🏊'));
  const panel = mgNode('div', 'mg-panel fun-pick', `
    <p class="got">${T.ic} ${L(`Заплыв дня «${T.name}»: ${T.about}`, `Swim of the day “${T.name}”: ${T.about}`)}</p>
    <div class="picks">${swPickHtml()}</div>
    ${sv.n ? `<p class="got small-note">${'⭐'.repeat(sv.best)}${sv.best ? ' · ' : ''}🏊 ${L(`Заплывов: ${sv.n}`, `Swims: ${sv.n}`)}${sv.win ? ` · 🥇 ${sv.win}` : ''}${sv.sec ? ' · 🐢' : ''}</p>` : ''}
    <button class="btn ghost small" data-k="no">${L('Потом', 'Later')}</button>`);
  const k = await new Promise(r => panel.querySelectorAll('button').forEach(b => mgOn(b, 'click', () => { sfx.tap(); r(b.dataset.k); })));
  panel.classList.add('away'); await wait(0.25); mgClose();
  return k === 'no' ? null : k;
}
// вход: из «Поиграть» у малыша (mode не задан — спросим), из «Вместе» (свои кнопки: race / time), из книги и с острова
async function swimGame(mode = null){
  if(!mode) mode = await swimPick();
  if(!mode) return null;
  let res = null;
  for(;;){
    const r = await swimRun(mode);
    if(!r) break;
    res = r.res;
    if(!r.again) break;
  }
  return res;
}
if(typeof CO_GAMES !== 'undefined') CO_GAMES.swim = {ic:'🏊', name:() => L('Заплыв', 'Swim'),
  say:() => { const T = swTheme(); return L(`Заплыв по морю: по глади с волнами или в глубине с течениями — путь выбираешь ${pg('сам', 'сама')}. Жми в такт — рывок ластами!`, 'A swim race at sea: on top with the waves or deep with the currents — you choose the way. Tap in rhythm for a flipper dash!')
    + ' ' + L(`Сегодня: ${T.ic} ${T.name}`, `Today: ${T.ic} ${T.name}`); },
  picks:() => swPickHtml(),
  wins:() => { const c = save.sw; return c.day.d === swToday() && c.day.st ? `${'⭐'.repeat(c.day.st)} ${L('сегодня', 'today')}` : c.bt ? `⏱️ ${L(`Рекорд: ${c.bt} с`, `Record: ${c.bt} s`)}` : ''; }};
