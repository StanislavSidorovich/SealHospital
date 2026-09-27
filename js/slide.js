/* ---------------- 🛷 Ледяная горка (идея папы 27.09.2026) ----------------
   Пинг построил на горе длинную ледяную горку-жёлоб до самого моря. Малыш катится на пузике вниз сам,
   палец влево-вправо (держи и веди) — куда ехать в жёлобе, касание — прыжок, касание в полёте — кувырок.
   Внутри: 🌀 виражи (на скорости выносит на стенку — там ракушки), ⛰️ сугробы (во всю ширину — прыгай,
   на половине — объезжай), ❄️ рыхлый снег (вязнем), 🚀 стрелки-ускорители, трамплины над 🕳️ пропастями
   (полёт сам, а кувырок в полёте — ⭐ и ускорение), трещины (не прыгнул — «Плюх!», сам выпрыгивает),
   🦈 акула из воды (тень на льду — куда плюхнется: уезжай или прыгай; догнала — «Салки!», смешной кувырок),
   ледяной тоннель, ✨ золотая ракушка высоко над трамплином (прыгни на самом краю — «Супер-прыжок!»).
   Проиграть нельзя: всё только замедляет. Горка дня — каждый день своя трасса и тема (как «Салки»).
   Режимы: 🏁 гонка с друзьями (Пинг, Пипа, Пуговка — боты держатся рядом) и ⏱️ на время (цель дня и рекорд);
   по сети — гонка с папой (каждый ведёт своего, трасса хозяина).
   Подключается после finale.js и до story.js: берёт модели и мелочи из adventure.js, dive.js, coop.js, chase.js. */
const SL_POS = new V3(-2600, 70, 600);   // начало горки: высоко, далеко от других сцен
const SL_DS = 0.5;                        // шаг, с которым считаем дорожку (м)
const SL_W = 2.35, SL_FLAT = 1.15, SL_WALL = 1.35;   // полуширина жёлоба до верха стенки, ровное дно, высота стенки
const SL_UMAX = SL_W - 0.25;              // дальше по стенке не заедешь
const SL_V = 9.2, SL_VMIN = 5.5, SL_VMAX = 13.5;   // скорость по дорожке (м/с): обычная, самая медленная и самая быстрая
const SL_G = 20, SL_JUMP = 6.4;           // прыжок: высота ≈1 м, в воздухе ≈0,65 с
const SL_BOOST_T = 1.4, SL_BOOST_K = 1.45, SL_SOFT_K = 0.55;   // ускоритель и рыхлый снег
const SL_FLIP_T = 0.5;                    // сколько длится один кувырок
const SL_CF = 0.055;                      // как сильно выносит на стенку в вираже
const SL_SC = 0.55;                       // размер тюленей на горке
const SL_DAILY = 2, SL_MAX = 25, SL_END = 5, SL_GOLD = 15, SL_CUP = 10;   // ракушки: за первые два спуска в день, не больше 25; финиш, золотая ракушка, кубок за первую победу
const SL_VNOM = 10;                       // средняя скорость в полёте — по ней вешаем дуги ракушек
const slRoot = new THREE.Group(); slRoot.visible = false; scene.add(slRoot);
if(!save.sl) save.sl = sanitizeSlide();   // Pages мог отдать старый data.js

/* ---------- темы дня ---------- */
const SL_DAYS = [
  {ic:'☀️', name:L('Солнечная', 'Sunny'),    about:L('солнце и синее небо', 'sunshine and blue sky'), sky:0xBDE5F4, fog:0xEAF7FB, near:40, far:120, hemi:0.78, sun:0.62},
  {ic:'🌅', name:L('Закатная', 'Sunset'),    about:L('розовое небо, всё блестит', 'a pink sky, everything sparkles'), sky:0xFFC7B5, fog:0xFFE1D2, near:36, far:110, hemi:0.74, sun:0.6, tint:0xFFD9C9},
  {ic:'🌌', name:L('Сияние', 'Aurora'),      about:L('ночь и северное сияние', 'night and the northern lights'), sky:0x26315E, fog:0x33407A, near:28, far:95, hemi:0.6, sun:0.45, aurora:true, tint:0xC9D4FF},
  {ic:'❄️', name:L('Снегопад', 'Snowfall'),  about:L('снег валит хлопьями', 'big fluffy snowflakes'), sky:0xDCE7EF, fog:0xE9EFF4, near:18, far:70, hemi:0.76, sun:0.55, snow:true}
];
function slDay(key = advDayKey()){
  const d = Math.round(Date.parse(key)/864e5), rnd = seeded(key + 'slide');
  const th = Number.isFinite(d) ? (d + 1) % SL_DAYS.length : Math.floor(rnd()*SL_DAYS.length);
  return {th, seed:Math.floor(rnd()*1e9)};
}
const slTheme = () => SL_DAYS[slDay().th];
const slToday = () => new Date().toDateString();

/* ---------- жёлоб: поперёк — ровное дно и стенки-параболы ---------- */
const slSurf = u => { const a = Math.abs(u); return a <= SL_FLAT ? 0 : SL_WALL*((a - SL_FLAT)/(SL_W - SL_FLAT))**2; };
const slSlope = u => { const a = Math.abs(u); return a <= SL_FLAT ? 0 : Math.sign(u)*2*SL_WALL*(a - SL_FLAT)/(SL_W - SL_FLAT)**2; };

/* ---------- трасса дня: куски (как в забеге) ----------
   seg(длина, {turn — на сколько повернуть (рад, + вправо), gr — уклон, hole — 1 трещина / 2 пропасть, water — с какой стороны море, tun — тоннель})
   предметы: shell (u, y — над льдом), arc (дуга ракушек по полёту), gold, drift (side: 0 — во всю ширину, ±1 — половина),
   soft (рыхлый снег, side, len), boost (u), ramp (трамплин: край, len, h, vy), shark (u — куда плюхнется, side — откуда). */
function slLayout(seed, first){
  const rnd = seeded('sl' + seed), segs = [], items = [];
  let S = 0;
  const seg = (len, o = {}) => { segs.push({s0:S, len, turn:o.turn || 0, gr:o.gr !== undefined ? o.gr : 0.14, hole:o.hole || 0, water:o.water || 0, tun:!!o.tun}); S += len; };
  const it = (k, s, o = {}) => items.push({k, s, ...o});
  const line = (s, n, u, gap = 1.6) => { for(let i = 0; i < n; i++) it('shell', s + i*gap, {u:typeof u === 'function' ? u(i) : u, y:0.4}); };
  const hop = (s, u = 0) => { for(const d of [-1.4, 0, 1.4]) it('shell', s + d, {u, y:0.45 + 1.0*(1 - (d/2)**2)}); };   // дуга над сугробом/трещиной — по прыжку
  const ramp = (len, h, vy, u = 0) => { it('ramp', S, {len, h, vy}); for(let i = 1; i <= 5; i++) it('arc', S + i*1.7, {u, e:S, h, vy}); };
  const m = () => rnd() < 0.5 ? -1 : 1;
  const CH = {
    bend(){ const d = m(), s = S; seg(34, {turn:d*1.05, gr:0.15}); for(let i = 0; i < 7; i++) it('shell', s + 7 + i*3, {u:-d*1.95, y:0.35}); seg(6); },
    sbend(){ const d = m(), s = S; seg(26, {turn:d*0.85}); seg(26, {turn:-d*0.85}); for(let i = 0; i < 5; i++){ it('shell', s + 6 + i*3, {u:-d*1.9, y:0.35}); it('shell', s + 32 + i*3, {u:d*1.9, y:0.35}); } seg(4); },
    slalom(){ const d = m(), s = S; seg(42, {gr:0.12}); [9, 18, 27, 36].forEach((x, i) => { const sd = i % 2 ? -d : d; it('drift', s + x, {side:sd}); line(s + x - 1.6, 3, -sd*0.8); }); },
    jumps(){ const s = S; seg(34); it('drift', s + 11, {side:0}); hop(s + 11); it('drift', s + 25, {side:0}); hop(s + 25); line(s + 2, 4, 0); },
    gap(){ const s = S; seg(12, {gr:0.1}); line(s + 2, 5, 0, 1.8); ramp(4, 0.9, 8.6); seg(7.5, {gr:0.3, hole:2}); seg(10, {gr:0.12}); },
    drop(){ const s = S; seg(8, {gr:0.1}); it('boost', S - 1.5, {u:0}); seg(28, {gr:0.3}); line(s + 10, 8, i => Math.sin(i*0.8)*0.9, 2.2); seg(6, {gr:0.12}); },
    kick(gold){ const s = S; seg(9, {gr:0.12}); line(s + 1, 3, 0); ramp(2.6, 0.6, 7.4);
      if(gold) it('gold', S + 5.4, {u:0, y:2.5});   // только «Супер-прыжком» с самого края
      seg(15, {gr:0.13}); ramp(2.6, 0.6, 7.4); seg(12, {gr:0.13}); },
    water(){ const d = m(), s = S; seg(46, {gr:0.07, water:d, turn:-d*0.3}); line(s + 3, 6, 0, 2);
      it('shark', s + 17, {u:rnd() < 0.5 ? -1 : 1, side:d}); it('shark', s + 36, {u:rnd() < 0.5 ? -1 : 1, side:d}); line(s + 24, 4, 0, 2); },
    tunnel(){ const s = S; seg(32, {gr:0.15, tun:true}); line(s + 3, 12, i => Math.sin(i*0.7)*1.0, 2.1); it('boost', s + 29, {u:0}); seg(4); },
    soft(){ const d = m(), s = S; seg(28, {gr:0.13}); it('soft', s + 5, {side:d, len:8}); line(s + 5, 4, -d*0.75, 2); it('soft', s + 17, {side:-d, len:8}); line(s + 17, 4, d*0.75, 2);
      seg(2.2, {hole:1}); hop(S - 1.1); seg(8); },
    cracks(){ const s = S; seg(10); line(s + 2, 3, 0); seg(2.2, {hole:1}); hop(S - 1.1); seg(12); it('boost', S - 5, {u:m()*0.8}); seg(2.2, {hole:1}); hop(S - 1.1); seg(8); }
  };
  // начало: ровно и полого — разгоняемся
  seg(10, {gr:0.04}); seg(10, {gr:0.1}); line(12, 5, 0, 1.8);
  let order = ['jumps', 'slalom', 'kick', 'gap', 'drop', 'water', 'cracks', 'tunnel', 'soft', 'sbend'];
  if(!first){ for(let i = order.length - 1; i > 0; i--){ const j = Math.floor(rnd()*(i + 1)); [order[i], order[j]] = [order[j], order[i]]; } }
  const goldAt = order.indexOf('kick');
  CH.bend();   // первым всегда вираж — спокойно привыкнуть
  order.forEach((k, i) => { CH[k](i === goldAt); if(i === 4) CH.bend(); });
  // финал: большой трамплин через пропасть к финишу, потом пологий выкат
  seg(10, {gr:0.1}); line(S - 9, 4, 0, 1.8); ramp(4.2, 1.1, 9.2); seg(9, {gr:0.4, hole:2}); seg(8, {gr:0.08});
  const fin = S - 4;
  seg(40, {gr:0.0});
  return {segs, items, len:S, fin};
}

/* ---------- дорожка по точкам: где, куда смотрит, какой уклон ---------- */
function slPath(L0){
  const n = Math.ceil(L0.len/SL_DS) + 3;
  const P = {n, X:new Float32Array(n), Y:new Float32Array(n), Z:new Float32Array(n), TH:new Float32Array(n), K:new Float32Array(n), GR:new Float32Array(n),
    HOLE:new Uint8Array(n), WAT:new Int8Array(n), TUN:new Uint8Array(n), RMP:new Float32Array(n)};
  let x = SL_POS.x, y = SL_POS.y, z = SL_POS.z, th = 0, g = 0.04, j = 0;
  for(let i = 0; i < n; i++){
    const s = i*SL_DS;
    while(j < L0.segs.length - 1 && s >= L0.segs[j].s0 + L0.segs[j].len) j++;
    const sg = L0.segs[j], t = Math.min(1, Math.max(0, (s - sg.s0)/sg.len));
    const k = sg.turn ? sg.turn*Math.PI/(2*sg.len)*Math.sin(Math.PI*t) : 0;
    g += (sg.gr - g)*(sg.hole ? 1 : Math.min(1, SL_DS/3));
    P.X[i] = x; P.Y[i] = y; P.Z[i] = z; P.TH[i] = th; P.K[i] = k; P.GR[i] = g;
    P.HOLE[i] = s < L0.len ? sg.hole : 0; P.WAT[i] = sg.water; P.TUN[i] = sg.tun ? 1 : 0;
    th += k*SL_DS; x += Math.sin(th)*SL_DS; z -= Math.cos(th)*SL_DS; y -= g*SL_DS;
  }
  for(const r of L0.items) if(r.k === 'ramp'){   // трамплины поднимают лёд к краю
    for(let i = Math.max(0, Math.floor((r.s - r.len)/SL_DS)); i <= Math.floor(r.s/SL_DS) && i < n; i++){ const s = i*SL_DS; P.RMP[i] = Math.max(P.RMP[i], r.h*Math.max(0, (s - (r.s - r.len))/r.len)); }
  }
  return P;
}
// значение по дорожке в точке s (плавно между соседними точками)
function slGet(A, s){ const f = Math.max(0, Math.min(SL.P.n - 1.001, s/SL_DS)), i = Math.floor(f), k = f - i; return A[i] + (A[i + 1] - A[i])*k; }
const slIdx = s => Math.max(0, Math.min(SL.P.n - 1, Math.round(s/SL_DS)));
const slHole = s => SL.P.HOLE[Math.max(0, Math.min(SL.P.n - 1, Math.floor(s/SL_DS)))];
const slTrackY = s => slGet(SL.P.Y, s);
const slRamp = s => { const i = Math.floor(s/SL_DS); return i >= 0 && i < SL.P.n - 1 ? SL.P.RMP[i] + (SL.P.RMP[i + 1] - SL.P.RMP[i])*(s/SL_DS - i) : 0; };
const slSurfY = (s, u) => slTrackY(s) + slSurf(u) + (Math.abs(u) < SL_FLAT + 0.6 ? slRamp(s) : 0);
// точка мира: s — вдоль, u — поперёк (+ вправо), h — над льдом (ice:false — от дна жёлоба, без стенок)
function slPt(s, u = 0, h = 0, out = new V3(), ice = true){
  const th = slGet(SL.P.TH, s);
  return out.set(slGet(SL.P.X, s) + Math.cos(th)*u, (ice ? slSurfY(s, u) : slTrackY(s)) + h, slGet(SL.P.Z, s) + Math.sin(th)*u);
}
// поставить предмет, у которого «вперёд» — это −z (трамплин, стрелки, ворота), вдоль дорожки
function slPlace(o, s, u = 0, h = 0, tilt = true){
  slPt(s, u, h, o.position); o.rotation.order = 'YXZ';
  o.rotation.set(tilt ? -Math.atan(slGet(SL.P.GR, s)) : 0, -slGet(SL.P.TH, s), 0); return o;
}

/* ---------- модельки ---------- */
const SL_ICE_TEX = canvasTex(256, (g, w, h) => {   // поперёк жёлоба: голубое дно с двумя полосками, стенки светлее
  const gr = g.createLinearGradient(0, 0, w, 0);
  gr.addColorStop(0, '#EAF6FC'); gr.addColorStop(0.18, '#BFE3F5'); gr.addColorStop(0.3, '#9FD2EE'); gr.addColorStop(0.7, '#9FD2EE'); gr.addColorStop(0.82, '#BFE3F5'); gr.addColorStop(1, '#EAF6FC');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = '#83C2E6'; for(const x of [0.4, 0.6]) g.fillRect(x*w - 4, 0, 8, h);
  g.fillStyle = 'rgba(255,255,255,0.8)'; for(let i = 0; i < 4; i++) g.fillRect(0, i*h/4, w, 3);   // поперечные полоски — видно скорость
  g.fillStyle = '#FFFFFF'; for(let i = 0; i < 14; i++) g.fillRect((i*67) % w, (i*41) % h, 14, 4);
});
SL_ICE_TEX.wrapS = SL_ICE_TEX.wrapT = THREE.RepeatWrapping;
const SL_SOFT_TEX = canvasTex(128, (g, w, h) => {   // рыхлый снег: белый, пушистый, с голубыми точками
  g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#D4ECF8'; for(let i = 0; i < 40; i++){ g.beginPath(); g.arc((i*37) % w, (i*53) % h, 3 + (i % 3)*2, 0, 7); g.fill(); }
});
SL_SOFT_TEX.wrapS = SL_SOFT_TEX.wrapT = THREE.RepeatWrapping;
const SL_WARN_TEX = canvasTex(128, (g, s) => {   // тень акулы на льду: тёмный круг с «!»
  g.beginPath(); g.arc(s/2, s/2, s/2 - 4, 0, 7); g.fillStyle = 'rgba(59,58,74,0.45)'; g.fill();
  g.font = 'bold 76px Pangolin, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#FFD23F'; g.fillText('!', s/2, s/2 + 4);
});
const SL_AUR_TEX = canvasTex(256, (g, w, h) => {   // лента северного сияния
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(120,255,200,0)'); gr.addColorStop(0.5, 'rgba(120,255,200,0.55)'); gr.addColorStop(1, 'rgba(255,140,220,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}, 128);
function slRibbon(pts, rows, cols, mat){   // сетка rows×cols точек → поверхность
  const geo = new THREE.BufferGeometry(), idx = [];
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pts.pos), 3));
  if(pts.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(pts.uv), 2));
  if(pts.col) geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pts.col), 3));
  for(let r = 0; r < rows - 1; r++) for(let c = 0; c < cols - 1; c++){ const a = r*cols + c, b = a + cols; idx.push(a, b, a + 1, a + 1, b, b + 1); }
  geo.setIndex(idx); geo.computeVertexNormals();
  return new THREE.Mesh(geo, mat);
}
// снег вокруг жёлоба: у края — на уровне стенок, дальше горы; у моря — обрыв к воде, у пропасти — глубоко вниз
const SL_GU = [-60, -34, -18, -9, -4.5, -(SL_W + 1.3), -(SL_W + 0.15), SL_W + 0.15, SL_W + 1.3, 4.5, 9, 18, 34, 60];
function slGroundH(s, u, wat, hole){
  const a = Math.abs(u), side = Math.sign(u);
  if(hole === 2) return a < 9 ? -16 : SL_WALL + 3 + a*0.25;   // пропасть: далеко внизу вода
  if(wat && side === wat && a > SL_W + 0.5) return -3.2;       // море сбоку: обрыв к воде
  const nz = (Math.sin(s*0.071 + u*0.37) + Math.sin(s*0.023 - u*0.19))*Math.min(1, a/12);
  return SL_WALL + 0.05 + Math.max(0, a - SL_W - 0.3)*0.12 + (a > 12 ? (a - 12)*0.35 : 0) + nz*(0.6 + a*0.12);
}
const SL_SNOW = new THREE.Color(0xF4FAFD), SL_SNOW2 = new THREE.Color(0xDCEEF8), SL_SEA = new THREE.Color(0x6FC0DF), SL_DEEP = new THREE.Color(0x3E8FC0);
function slBuildWorld(){
  const P = SL.P, g = SL.grp, T = SL.T;
  // лёд жёлоба — кусками между дырками
  const iceMat = new THREE.MeshToonMaterial({color:T.tint || 0xFFFFFF, map:SL_ICE_TEX, side:THREE.DoubleSide});
  const lipMat = toon(0xFFFFFF), lipOl = new THREE.MeshBasicMaterial({color:INK, side:THREE.BackSide});
  const NU = 17, step = 2;
  let run = [];
  const flush = () => {
    if(run.length > 1){
      const pos = [], uv = [], v = new V3();
      for(const i of run){ const s = i*SL_DS; for(let c = 0; c < NU; c++){ const u = -SL_W + c*2*SL_W/(NU - 1); slPt(s, u, 0, v); pos.push(v.x, v.y - (Math.abs(u) < SL_FLAT + 0.6 ? P.RMP[i] : 0), v.z); uv.push(c/(NU - 1), s/4); } }
      g.add(slRibbon({pos, uv}, run.length, NU, iceMat));
      for(const sd of [-1, 1]){   // снежный бортик по верху стенки с тёмной обводкой
        const pts = run.map(i => slPt(i*SL_DS, sd*(SL_W + 0.05), 0.02));
        const cu = new THREE.CatmullRomCurve3(pts), segN = Math.max(2, run.length*2);
        g.add(new THREE.Mesh(new THREE.TubeGeometry(cu, segN, 0.17, 6), lipMat));
        g.add(new THREE.Mesh(new THREE.TubeGeometry(cu, segN, 0.225, 6), lipOl));
      }
    }
    run = [];
  };
  for(let i = 0; i < P.n; i += 1){
    const hole = P.HOLE[i];
    if(hole){ if(run.length){ run.push(i); flush(); } continue; }   // лёд доходит до самого края дырки
    if(i % step === 0 || !run.length || (i + 1 < P.n && P.HOLE[i + 1])) run.push(i);
  }
  flush();
  // снег и горы вокруг (цвет по вершинам: снег, море, глубина)
  { const pos = [], col = [], v = new V3(), c = new THREE.Color(), rows = [];
    for(let i = -40; i < P.n + 60; i += 4) rows.push(i);
    for(const i of rows){
      const ii = Math.max(0, Math.min(P.n - 1, i)), s = i*SL_DS, th = P.TH[ii];
      const dx = i < 0 ? -Math.sin(th)*(-i*SL_DS) : i >= P.n ? Math.sin(th)*(i - P.n + 1)*SL_DS : 0, dz = i < 0 ? Math.cos(th)*(-i*SL_DS) : i >= P.n ? -Math.cos(th)*(i - P.n + 1)*SL_DS : 0;
      const hole = i >= 0 && i < P.n ? P.HOLE[ii] : 0, wat = i >= 0 && i < P.n ? P.WAT[ii] : 0;
      for(const u of SL_GU){
        let h = slGroundH(s, u, wat, hole);
        if(hole === 1 && Math.abs(u) < SL_W + 1.5) h = SL_WALL;   // у трещины снег вокруг обычный
        v.set(P.X[ii] + dx + Math.cos(th)*u, P.Y[ii] + h, P.Z[ii] + dz + Math.sin(th)*u); pos.push(v.x, v.y, v.z);
        if(h < -10) c.copy(SL_DEEP); else if(h < -2) c.copy(SL_SEA); else c.copy(SL_SNOW).lerp(SL_SNOW2, Math.min(1, Math.max(0, (Math.abs(u) - 6)/30)));
        if(T.tint) c.multiply(new THREE.Color(T.tint));
        col.push(c.r, c.g, c.b);
      }
    }
    g.add(slRibbon({pos, col}, rows.length, SL_GU.length, new THREE.MeshToonMaterial({vertexColors:true})));
  }
  // ёлочки в снегу (одним махом — инстансами)
  { const r = seeded('fir' + SL.seed), spots = [];
    for(let i = 20; i < P.n; i += 7){
      for(const sd of [-1, 1]){
        if(r() < 0.35 || P.HOLE[i] === 2 || (P.WAT[i] === sd)) continue;
        const u = sd*(5 + r()*20), s = i*SL_DS; spots.push([s, u, 0.8 + r()*0.9, r()*6]);
      }
    }
    const n = spots.length, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new V3(), p = new V3();
    const parts = [[new THREE.ConeGeometry(1, 1.6, 7), 0x5DB57E, 1.1, 1], [new THREE.ConeGeometry(0.75, 1.3, 7), 0x6CC28C, 1.95, 1], [new THREE.ConeGeometry(0.42, 0.6, 7), 0xFFFFFF, 2.65, 1], [new THREE.CylinderGeometry(0.16, 0.2, 0.6, 6), 0xB9855B, 0.25, 1]];
    for(const [geo, c, y0] of parts){
      const im = new THREE.InstancedMesh(geo, toon(c), n), ol = new THREE.InstancedMesh(geo, outlineMat, n);
      spots.forEach(([s, u, k, a], i) => {
        const th = slGet(P.TH, s); p.set(slGet(P.X, s) + Math.cos(th)*u, slGet(P.Y, s) + slGroundH(s, u, 0, 0) + y0*k - 0.2, slGet(P.Z, s) + Math.sin(th)*u);
        q.setFromAxisAngle(new V3(0, 1, 0), a); sc.setScalar(k); m4.compose(p, q, sc); im.setMatrixAt(i, m4);
        sc.setScalar(k*1.08); m4.compose(p, q, sc); ol.setMatrixAt(i, m4);
      });
      g.add(ol, im);
    }
  }
  // вода в трещинах, лёд по краям; тоннель
  for(let i = 1; i < P.n; i++){
    if(P.HOLE[i] === 1 && !P.HOLE[i - 1]){
      let j = i; while(j < P.n && P.HOLE[j] === 1) j++;
      const s0 = i*SL_DS, s1 = j*SL_DS, w = new THREE.Mesh(new THREE.PlaneGeometry(SL_W*2 + 0.4, s1 - s0 + 1.2), toon(0x5AAED4));
      w.rotation.x = -Math.PI/2; const gw = new THREE.Group(); gw.add(w); slPlace(gw, (s0 + s1)/2, 0, -0.9); g.add(gw);
      for(const s of [s0, s1]) for(const u of [-1.6, -0.5, 0.6, 1.5]){ const ch = addOutline(new THREE.Mesh(new THREE.DodecahedronGeometry(0.22), toon(0xF3FAFD)), 1.08); ch.scale.set(1, 0.45, 1); slPt(s + (s === s0 ? -0.2 : 0.2), u, 0.02, ch.position); g.add(ch); }
    }
  }
  const arch = new THREE.TorusGeometry(SL_W + 0.25, 0.22, 8, 22, Math.PI), archM = toon(0xBFE6FF), iceC = new THREE.ConeGeometry(0.09, 0.5, 5);
  for(let i = 0; i < P.n; i += 7) if(P.TUN[i]){
    const o = addOutline(new THREE.Mesh(arch, archM), 1.05), a = new THREE.Group(); a.add(o); o.position.y = SL_WALL - 0.2; slPlace(a, i*SL_DS, 0, 0, false); g.add(a);
    for(let k = 0; k < 5; k++){ const ic = new THREE.Mesh(iceC, archM), an = 0.5 + k*0.53; ic.position.set(Math.cos(an)*(SL_W + 0.1), SL_WALL - 0.2 + Math.sin(an)*(SL_W + 0.05) - 0.3, 0); ic.rotation.z = Math.PI; a.add(ic); }
  }
  // вода моря далеко внизу (горизонт) и горы вдали
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), toon(T.aurora ? 0x3D6FA0 : 0x6FC0DF)); sea.rotation.x = -Math.PI/2;
  sea.position.set(slGet(P.X, SL.L.len/2), SL_POS.y - SL.L.len*0.155 - 3.5, slGet(P.Z, SL.L.len/2)); g.add(sea);
  // финиш
  const fin = makeFinish(); fin.scale.set(1.35, 1.15, 1); slPlace(fin, SL.L.fin, 0, 0, false); fin.position.y = slTrackY(SL.L.fin); g.add(fin);
  // старт: флажки у Пинга
  const st = makeFinish(); st.scale.set(1.35, 1.15, 1); st.children.filter(c => c.isSprite).forEach(c => st.remove(c));
  const stT = textSprite(L('Горка дня!', 'Slide of the day!'), '#3E8DB8'); stT.position.set(0, 3.8, 0); stT.scale.set(2.8, 1.05, 1); stT.material.depthTest = true; st.add(stT);
  slPlace(st, 9, 0, 0, false); st.position.y = slTrackY(9); g.add(st);
  // северное сияние (плывёт вместе с камерой)
  SL.aur = [];
  if(T.aurora) for(let k = 0; k < 3; k++){
    const a = new THREE.Mesh(new THREE.PlaneGeometry(90, 26), new THREE.MeshBasicMaterial({map:SL_AUR_TEX, transparent:true, depthWrite:false, fog:false, blending:THREE.AdditiveBlending, side:THREE.DoubleSide}));
    a.userData.k = k; g.add(a); SL.aur.push(a);
  }
  // снегопад вокруг камеры
  SL.flakes = null;
  if(T.snow){
    const N = 500, arr = new Float32Array(N*3); for(let i = 0; i < N; i++){ arr[i*3] = (Math.random() - 0.5)*30; arr[i*3 + 1] = Math.random()*16 - 4; arr[i*3 + 2] = (Math.random() - 0.5)*30; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    SL.flakes = new THREE.Points(geo, new THREE.PointsMaterial({size:0.16, map:TEX.dot, transparent:true, depthWrite:false, color:0xffffff})); g.add(SL.flakes);
  }
}
// предметы на дорожке
function slBuildItems(){
  const g = SL.grp, v = new V3();
  SL.shells = []; SL.obs = []; SL.total = 0;
  for(const it of SL.L.items){
    if(it.k === 'shell' || it.k === 'arc' || it.k === 'gold'){
      const gold = it.k === 'gold';
      const o = gold ? makeSecret() : makeShell(0xFFC2D1); if(!gold){ o.scale.multiplyScalar(0.8); o.rotation.x = 0.9; }
      let y;
      if(it.k === 'arc'){ const t = (it.s - it.e)/SL_VNOM; y = slTrackY(it.e) + it.h + it.vy*t - SL_G*t*t/2 + 0.35; }
      else y = slSurfY(it.s, it.u) + it.y + (gold ? 0.6 + slRamp(it.s) : 0);
      slPt(it.s, it.u, 0, o.position); o.position.y = y; g.add(o);
      SL.shells.push({o, s:it.s, u:it.u, y, got:false, gold}); if(!gold) SL.total++;
    } else if(it.k === 'drift'){
      const o = makeDrift(), half = it.side !== 0; o.scale.set(half ? 1.05 : 2.05, half ? 0.9 : 1.0, 0.85);
      const w = new THREE.Group(); w.add(o); slPlace(w, it.s, half ? it.side*1.15 : 0, 0.05, false); g.add(w);
      SL.obs.push({k:'drift', s:it.s, side:it.side, o:w, hit:new Set()});
    } else if(it.k === 'soft'){
      const w = new THREE.Group(), pl = new THREE.Mesh(new THREE.PlaneGeometry(1.5, it.len), new THREE.MeshToonMaterial({map:SL_SOFT_TEX.clone()}));
      pl.material.map.needsUpdate = true; pl.material.map.repeat.set(1, it.len/1.5); pl.rotation.x = -Math.PI/2; w.add(pl);
      for(let k = 0; k < 7; k++){ const b = addOutline(new THREE.Mesh(SMALL, toon(0xFFFFFF)), 1.06); const r = 0.22 + (k % 3)*0.08; b.scale.set(r*1.4, r*0.55, r*1.4); b.position.set(((k*37) % 10)/10*1.1 - 0.55, 0.02, -it.len/2 + (k + 0.5)*it.len/7); w.add(b); }
      slPlace(w, it.s + it.len/2, it.side*0.7, 0.03); g.add(w);
      SL.obs.push({k:'soft', s:it.s, s1:it.s + it.len, side:it.side, o:w});
    } else if(it.k === 'boost'){
      const b = makeBoost(); b.scale.set(1.1, 1, 1.1); slPlace(b, it.s, it.u, 0.04); g.add(b);
      SL.obs.push({k:'boost', s:it.s, u:it.u, o:b, used:new Set()});
    } else if(it.k === 'ramp'){
      const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(it.len, 0); sh.lineTo(0, it.h); sh.lineTo(0, 0);
      const W = (SL_FLAT + 0.6)*2, geo = new THREE.ExtrudeGeometry(sh, {depth:W, bevelEnabled:false}); geo.rotateY(-Math.PI/2); geo.translate(W/2, 0, 0);
      const w = new THREE.Group(); w.add(addOutline(new THREE.Mesh(geo, toon(0xE3F4FC)), 1.02));
      for(const sd of [-1, 1]){ const f = new THREE.Mesh(new THREE.CircleGeometry(0.22, 3), new THREE.MeshToonMaterial({color:sd < 0 ? 0xFF9BB8 : 0xFFD66B, side:THREE.DoubleSide})); f.position.set(sd*(W/2 + 0.05), it.h + 0.5, 0.05); f.rotation.z = -Math.PI/2; w.add(f);
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6), inkMat); pole.position.set(sd*(W/2 + 0.2), it.h + 0.4, 0.05); w.add(pole); }
      slPt(it.s, 0, 0, w.position, false); w.rotation.order = 'YXZ'; w.rotation.set(-Math.atan(slGet(SL.P.GR, it.s - it.len/2)), -slGet(SL.P.TH, it.s), 0); g.add(w);
      SL.obs.push({k:'ramp', s:it.s, len:it.len, h:it.h, vy:it.vy});
    } else if(it.k === 'shark'){
      const sh = DV_MAKE.shark(); sh.scale.setScalar(0.85); const hold = new THREE.Group(), piv = new THREE.Group(); piv.add(sh); hold.add(piv); hold.visible = false; g.add(hold);
      const warn = new THREE.Mesh(new THREE.CircleGeometry(0.8, 24), new THREE.MeshBasicMaterial({map:SL_WARN_TEX, transparent:true, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-4, polygonOffsetUnits:-4}));
      warn.rotation.x = -Math.PI/2; const wg = new THREE.Group(); wg.add(warn); wg.visible = false; slPlace(wg, it.s, it.u*0.9, 0.08); g.add(wg);
      SL.obs.push({k:'shark', s:it.s, u:it.u, side:it.side, o:hold, piv, sh, warn:wg, p:0, st:'wait', hit:new Set()});
    }
  }
  SL.obs.sort((a, b) => a.s - b.s);
}

/* ---------- ездоки: свой малыш, друзья-боты, папа по сети ---------- */
// у всех «вперёд» — +z внутри root; piv — для кувырков. Пингвины и калан едут лёжа.
function slRider(kind, name, look){
  let root, piv, seal = null, lie = 0, lift = 0;
  if(look === 'otter'){ root = new THREE.Group(); piv = new THREE.Group(); const o = DV_MAKE.otter(); o.rotation.y = -Math.PI/2; o.scale.setScalar(0.62/SL_SC); piv.add(o); root.add(piv); lift = 0.35; }
  else {
    seal = look === 'me' ? coSealOf(coPetDesc()) : look && look.pen ? makePenguin(look.pen) : look && look.pal ? coSealOf(look.pal) : makeSeal({name:'', f:false, color:(look && look.col) || 0xFFFFFF});
    if(look && look.scarf){ setScarf(seal, look.scarf, 'dots'); seal.scarf.visible = true; seal.scarf.scale.setScalar(1); }
    if(seal.bubble) seal.bubble.visible = false;
    root = seal.root; piv = seal.inner; if(look && look.pen){ lie = 1.25; lift = 0.28; }
  }
  root.scale.setScalar(SL_SC*(look && look.small ? 0.82 : 1)); root.rotation.order = 'YXZ'; SL.grp.add(root);
  let lbl = null;
  if(kind !== 'me'){ lbl = textSprite(name, kind === 'net' ? '#3E8DB8' : '#3B8F5E'); lbl.scale.set(0.35 + name.length*0.16, 0.36, 1); SL.grp.add(lbl); }
  return {kind, name, root, piv, seal, lie, lift, lbl, s:0, u:0, ut:0, v:0, y:0, vy:0, air:false, sup:0, flip:0, flips:0, flipT:-1, tumble:0, splash:0, boost:0, soft:false, shells:0,
    fin:0, ramp:null, jbuf:0, ai:null, puffT:0, trail:0, tags:0, bonks:0, spl:0, ny:0, ns:0, nu:0, nf:0, lost:false, gone:false};
}
// кто катается сегодня: Пинг (если знакомы), Пипа (нашлась в гроте), Пуговка (спасли в подводном лесу), иначе малыши-соседи
function slFriends(){
  const lv = k => (save.coop.resc && save.coop.resc.lv && save.coop.resc.lv[k]) || 0, out = [];
  if(typeof pengMet === 'function' && pengMet()) out.push({name:L('Пинг', 'Ping'), look:{pen:PENG}, pace:1.0, skill:0.92, show:0.8});
  if(lv('grot') > 0) out.push({name:L('Пипа', 'Pipa'), look:{pen:{name:'', f:true, color:0x5C6FA6}, scarf:'#FF7A9C', small:true}, pace:0.975, skill:0.72, show:0.3});
  if(lv('kelp') > 0) out.push({name:L('Пуговка', 'Button'), look:'otter', pace:0.985, skill:0.85, show:0.5});
  const fill = [{name:L('Пломбир', 'Sundae'), look:{col:0xFFF4E0}, pace:0.98, skill:0.8, show:0.4}, {name:L('Ириска', 'Toffee'), look:{col:0xE8C9A0}, pace:0.99, skill:0.75, show:0.5}, {name:L('Снежок', 'Snowball'), look:{col:0xFFFFFF}, pace:0.97, skill:0.85, show:0.3}];
  for(const f of fill) if(out.length < 3) out.push(f);
  return out.slice(0, 3);
}

/* ---------- состояние ---------- */
let SL = null;
const slAll = () => [SL.me, ...SL.bots, SL.pal].filter(r => r && !r.gone);
const slOwn = () => [SL.me, ...SL.bots];   // за кем считаем физику сами
function slSay(t, ms){ mgHint(t); setTimeout(() => { if(SL && mgHintEl.textContent === t) mgHint(''); }, ms); }
function slTip(k, t, ms = 2600){ if(SL.tips.has(k)) return false; SL.tips.add(k); if(!tipSeen('sl_' + k) || SL.first){ tipDone('sl_' + k); slSay(t, ms); return true; } return false; }

/* ---------- физика одного ездока ---------- */
function slJump(r){
  if(r.splash > 0 || r.tumble > 0.25 || r.fin) return;
  if(r.air){ if(r.flipT < 0 && r.y - slSurfY(r.s, r.u) > 0.35){ r.flipT = 0; if(r === SL.me){ sfx.whoosh(); } } return; }
  if(r.ramp){ r.jbuf = 0.4; return; }   // на трамплине — прыгнем с самого края (супер-прыжок)
  r.air = true; r.vy = SL_JUMP; if(r === SL.me){ sfx.whoosh(); SL.jumps++; }
}
function slBody(r, dt){
  const s0 = r.s, P = SL.P;
  const gr = slGet(P.GR, r.s), k = slGet(P.K, r.s);
  // скорость: под горку быстрее, ускоритель, рыхлый снег, кувырок-падение
  let vt = Math.max(SL_VMIN, Math.min(SL_VMAX, SL_V + (gr - 0.14)*26));
  if(r.fin){ vt = Math.min(r.v, Math.max(0, (r.stopS - r.s)*1.1)); r.ut = r.stopU; }   // за финишем — каждый на своё место, без кучи
  if(r.boost > 0){ r.boost -= dt; vt = Math.min(SL_VMAX + 2, vt*SL_BOOST_K); }
  if(r.soft) vt *= SL_SOFT_K;
  if(r.tumble > 0){ r.tumble = Math.max(0, r.tumble - dt); vt *= 0.55; }
  if(r.splash > 0) vt = 4;
  if(r.ai) vt *= r.ai.mult;
  r.v += (vt - r.v)*Math.min(1, dt*(r.fin ? 2.5 : r.boost > 0 ? 3 : vt < r.v ? 2.2 : 1.1));
  r.s += r.v*dt;
  // трамплин: у края — в полёт
  if(!r.air && r.splash <= 0){
    if(!r.ramp){ const rm = SL.ramps.find(m => r.s > m.s - m.len && s0 < m.s); if(rm) r.ramp = rm; }
    if(r.ramp && r.s >= r.ramp.s){
      const m = r.ramp; r.ramp = null; r.air = true; r.v = Math.max(r.v, 9.4);
      r.vy = m.vy + (r.jbuf > 0 ? 3.4 : 0); r.sup = r.jbuf > 0 ? 1 : 0; r.jbuf = 0;
      if(r === SL.me){ sfx.boost(); floatText(r.sup ? L('Супер-прыжок! 🚀', 'Super jump! 🚀') : L('Уиии!', 'Wheee!'), slPt(r.s + 2, r.u, 1.6), '#D9527E'); SL.flights++; }
    }
  }
  if(r.jbuf > 0) r.jbuf -= dt;
  // вбок: палец (или мысли бота) + вынос на вираже; у стенки — мягко
  const cf = -k*r.v*r.v*SL_CF*(r.air ? 0.3 : 1);
  const steer = (r.ut - r.u)*(r.air ? 2.5 : 7);
  let push = 0;   // соседи не залезают друг на друга: мягко расталкиваемся
  for(const o of slAll()) if(o !== r && Math.abs(o.s - r.s) < 1.3 && Math.abs(o.u - r.u) < 0.85 && Math.abs(o.y - r.y) < 0.8) push += (r.u >= o.u ? 1 : -1)*(0.85 - Math.abs(o.u - r.u))*(r === SL.me ? 3 : 7);
  r.u = Math.max(-SL_UMAX, Math.min(SL_UMAX, r.u + (steer + cf*6 + push)*dt));
  // вверх-вниз
  const surf = slSurfY(r.s, r.u), hole = slHole(r.s);
  if(r.splash > 0){
    r.splash -= dt; r.y = slTrackY(r.s) - 0.55;
    if(r.splash <= 0){ r.air = true; r.vy = SL_JUMP*0.95; r.y = slTrackY(r.s) - 0.3; if(r === SL.me){ sfx.whoosh(); floatText(L('Брр!', 'Brrr!'), slPt(r.s + 1, r.u, 1.2)); } }
  } else if(r.air){
    r.y += r.vy*dt - SL_G*dt*dt/2; r.vy -= SL_G*dt;
    if(r.flipT >= 0){ r.flipT += dt; if(r.flipT >= SL_FLIP_T){ r.flips++; r.flipT = -1; if(r === SL.me){ sfx.star(); } } }
    if(r.y <= surf && r.vy < 0){
      if(hole === 1){ slSplash(r); }
      else if(hole === 2){ if(r.y < slTrackY(r.s) - 6) slRescue(r); }
      else slLand(r, surf);
    }
  } else {
    if(hole === 1) slSplash(r);
    else if(hole === 2){ r.air = true; r.vy = 0; }
    else r.y = surf;
  }
  // сугробы, рыхлый снег, стрелки, ракушки
  r.soft = false;
  const lo = r.s - r.v*dt - 0.5, hi = r.s + 0.6, hAbove = r.y - surf;
  for(const o of SL.obs){
    if(o.s > hi + 10) break;
    if(o.k === 'drift'){
      if(o.hit.has(r) || o.s < lo || o.s > hi || hAbove > 0.55 || r.splash > 0) continue;
      if(o.side === 0 ? true : (o.side > 0 ? r.u > -0.05 : r.u < 0.05) && Math.abs(r.u) < SL_W - 0.4) slBonk(r, o);
    } else if(o.k === 'soft'){
      if(r.s > o.s && r.s < o.s1 && hAbove < 0.2 && Math.abs(r.u - o.side*0.7) < 0.85){ r.soft = true; if(r === SL.me){ slTip('soft', L('Рыхлый снег — вязнем! Объезжай или прыгай ❄️', 'Soft snow — we sink! Go around or jump ❄️')); if(Math.random() < dt*20) emit(TEX.puff, slPt(r.s, r.u, 0.2), {v:new V3((Math.random() - 0.5)*2, 1.5, 0), life:0.5, size:0.4, grow:0.8}); } }
    } else if(o.k === 'boost'){
      if(!o.used.has(r) && o.s > lo - 0.6 && o.s < hi + 0.6 && hAbove < 0.35 && Math.abs(r.u - o.u) < 0.75){ o.used.add(r); r.boost = SL_BOOST_T; if(r === SL.me){ sfx.boost(); floatText(L('Вжух!', 'Whoosh!'), slPt(r.s + 2, r.u, 1.3), '#D9527E'); SL.boosts++; } }
    } else if(o.k === 'shark'){
      if(!o.hit.has(r) && o.p >= 0.98 && o.p < 1.25 && Math.abs(r.s - o.s) < 1.2 && Math.abs(r.u - o.u) < 1.05 && hAbove < 0.8 && r.tumble <= 0){ o.hit.add(r); slTag(r, o); }
      else if(o.p >= 1.25 && !o.hit.has(r) && !o.dodge && r === SL.me && Math.abs(r.s - o.s) < 3){ o.dodge = true; floatText(L('Увернулись! 👍', 'Dodged it! 👍'), slPt(r.s + 1.5, r.u, 1.3), '#3B8F5E'); }
    }
  }
  // финиш
  if(!r.fin && r.s >= SL.L.fin){
    const k = SL.nFin = (SL.nFin || 0) + 1;
    r.fin = SL.t; r.stopS = SL.L.fin + 12 - (k - 1)*1.6; r.stopU = [0, -1.35, 1.35, -0.6][k - 1] || 0.6; slFinish(r);
  }
}
function slLand(r, surf){
  r.y = surf; r.air = false; r.vy = 0;
  const flipping = r.flipT >= 0, n = r.flips;
  r.flipT = -1; r.flips = 0;
  if(r === SL.me){ sfx.plop(); burst(TEX.puff, slPt(r.s, r.u, 0.2), 5, 0.9, 0.35); if(r.seal) squash(r.seal, 0.16, 0.22); }
  if(flipping){   // не докрутился — смешно шлёпнулся на спинку, чуть медленнее
    r.tumble = Math.max(r.tumble, 0.35);
    if(r === SL.me) floatText(L('Ой! Шлёп!', 'Oops! Splat!'), slPt(r.s + 1.5, r.u, 1.2));
  }
  if(n > 0){
    r.boost = Math.max(r.boost, 0.6 + n*0.4);
    if(r === SL.me){ SL.flips += n; sfx.star(); floatText(n > 1 ? L(`Двойной кувырок! ⭐⭐`, `Double flip! ⭐⭐`) : L('Кувырок! ⭐', 'Flip! ⭐'), slPt(r.s + 2, r.u, 1.4), '#D9527E');
      burst(TEX.star, slPt(r.s, r.u, 0.8), 6*n, 2, 0.25); }
  }
}
function slBonk(r, o){   // сугроб: «Бух!» — кувырок через голову, сугроб приплюснулся
  o.hit.add(r); r.tumble = 0.75; r.v *= 0.6; r.bonks++;
  const w = o.o; if(!o.flat){ o.flat = true; tween(0.25, k => { w.children[0].scale.y = (o.side === 0 ? 1 : 0.9)*(1 - 0.55*k); }, ease.out); }
  burst(TEX.puff, slPt(o.s, r.u, 0.4), 10, 1.5, 0.45);
  if(r === SL.me){ sfx.thud(); floatText(L('Бух!', 'Bump!'), slPt(r.s + 1.5, r.u, 1.3)); }
}
function slSplash(r){   // трещина: плюх в воду, сам выпрыгивает
  if(r.splash > 0) return;
  r.air = false; r.splash = 0.4; r.flipT = -1; r.flips = 0; r.spl++;
  burst(TEX.drop, slPt(r.s, r.u, 0, undefined, false).setY(slTrackY(r.s) - 0.4), 10, 2, 0.26);
  if(r === SL.me){ sfx.splash(); floatText(L('Плюх!', 'Splash!'), slPt(r.s + 1.5, r.u, 1)); slTip('crack', L('Перед трещиной нажми — прыжок!', 'Tap before a crack to jump!'), 2400); }
}
function slRescue(r){   // вдруг упал в пропасть: пузырь поднимает на лёд за ней
  let s = r.s; while(slHole(s)) s += 0.5;
  r.s = s + 1; r.y = slSurfY(r.s, r.u) + 1.2; r.vy = 2; r.v = 6; r.flipT = -1; r.flips = 0;
  if(r === SL.me){ sfx.splash(); mgHint(L('Плюх! Пузырь вынес наверх 🫧', 'Splash! A bubble carried you up 🫧')); setTimeout(() => SL && mgHint(''), 1600); }
}
function slTag(r, o){   // акула догнала: «Салки!» — щекочет, малыш кувыркается
  r.tumble = 0.8; r.v *= 0.65; r.tags++;
  burst(TEX.heart, slPt(r.s, r.u, 0.8), 8, 1.8, 0.28);
  if(r === SL.me){ sfx.giggle(); floatText(L('Салки! Хи-хи!', 'Tag! Hee-hee!'), slPt(r.s + 1.5, r.u, 1.4), '#3E8DB8'); }
}
// акула: тень на льду заранее, прыгает из моря и плюхается туда, где будет малыш, потом в море с другой стороны
function slSharkStep(o, dt){
  const me = SL.me, eta = (o.s - me.s)/Math.max(me.v, 3);
  if(o.st === 'wait'){
    if(eta < 1.9 && eta > 0){ o.st = 'warn'; o.warn.visible = true; if(SL.st === 'go'){ sfx.shark(); slTip('shark', L('Тень акулы! Уезжай в сторону или прыгай 🦈', 'The shark\'s shadow! Move aside or jump 🦈'), 2600); } }
    return;
  }
  if(o.st === 'warn'){
    o.warn.children[0].material.opacity = 0.55 + Math.sin(now*16)*0.35;
    const want = 1 - Math.max(0, eta)/1.0;
    if(want > 0){ o.st = 'fly'; o.o.visible = true; }
  }
  if(o.st === 'fly'){
    // p: 0 — из моря, 1 — плюх на лёд (как раз когда малыш тут), 1…1.7 — проехала на пузе и нырнула обратно
    const want = o.p < 1 ? 1 - Math.max(0, eta)/1.0 : o.p + dt*1.4;
    o.p = Math.max(o.p, Math.min(1.7, want));
    if(o.p >= 1 && !o.landed){ o.landed = true; o.warn.visible = false; sfx.thud(); burst(TEX.puff, slPt(o.s, o.u, 0.3), 12, 1.8, 0.45); }
    const sea = (s, sd) => { const v = slPt(s, sd*(SL_W + 4), 0, new V3(), false); v.y = slTrackY(s) - 2.6; return v; };
    const B = slPt(o.s, o.u, 0.05), prev = o.o.position.clone(), pos = o.o.position;
    if(o.p <= 1){ pos.copy(sea(o.s + 3, o.side || 1)).lerp(B, o.p); pos.y += Math.sin(o.p*Math.PI)*2.6; }
    else { const k = (o.p - 1)/0.7; pos.copy(B).lerp(sea(o.s - 2.5, o.side || 1), k); pos.y += Math.sin(k*Math.PI)*1.1; }
    const d = pos.clone().sub(prev);
    if(d.lengthSq() > 1e-6){ o.o.rotation.set(0, Math.atan2(-d.z, d.x), 0); o.piv.rotation.z = Math.max(-0.8, Math.min(0.8, Math.atan2(d.y, Math.hypot(d.x, d.z)))); }   // морда (её +x) — туда, куда летит
    o.sh.userData.fl.forEach(f => f.rotation.y = Math.sin(now*14)*0.5);
    if(o.p >= 1.7){ o.st = 'done'; o.o.visible = false; burst(TEX.drop, pos, 8, 1.8, 0.24); }
  }
}

/* ---------- мысли ботов: куда ехать и когда прыгать ---------- */
function slAI(b, dt){
  const A = b.ai, me = SL.me;
  if(b.fin){ A.mult = 1; return; }
  // держимся рядом: отстал — быстрее, убежал вперёд — придерживает (финиш всё равно праздник)
  const d = me.s - b.s, left = SL.L.fin - me.s;
  const off = Math.sin(SL.t*0.12 + A.ph*1.7)*5 + A.lead;   // каждый то впереди, то сзади — обгоны
  let mult = A.pace*(1 + Math.max(-0.15, Math.min(0.12, (d + off)*0.02)));
  if(SL.mode === 'race' && left < 70 && d > -4 && d < 12 && me.bonks + me.tags + me.spl < 6) mult = Math.min(mult, 0.975);   // в конце — не обгоняет того, кто старается
  if(SL.st === 'ready') mult = 0;
  A.mult += (mult - A.mult)*Math.min(1, dt*2);
  // куда ехать
  let want = A.line + Math.sin(now*0.6 + A.ph)*0.35;
  const k = slGet(SL.P.K, b.s + 6); if(Math.abs(k) > 0.01) want = -Math.sign(k)*1.5;   // на вираже — по стенке
  for(const o of SL.obs){
    const ds = o.s - b.s; if(ds < -1) continue; if(ds > 14) break;
    if(o.k === 'drift' && o.side !== 0) want = -o.side*1.05;
    else if(o.k === 'soft') want = -o.side*0.9;
    else if(o.k === 'boost' && ds < 10) want = o.u;
    else if(o.k === 'shark' && o.st !== 'wait' && o.p < 1) want = -o.u*1.1;
    if((o.k === 'drift' && o.side === 0) && ds > 0 && ds < 0.7 + b.v*0.14 && !b.air && !A.did.has(o)){ A.did.add(o); if(Math.random() < A.skill) slJump(b); }
  }
  // трещины: прыгнуть вовремя
  const ds = SL.cracks.find(c => c - b.s > 0 && c - b.s < 0.6 + b.v*0.12);
  if(ds !== undefined && !b.air && !A.did.has(ds)){ A.did.add(ds); if(Math.random() < A.skill) slJump(b); }
  // трамплин: иногда — с самого края (супер-прыжок) и кувырок в полёте
  if(b.ramp && !A.did.has(b.ramp)){ A.did.add(b.ramp); if(Math.random() < A.show*0.5) b.jbuf = 0.4; }
  if(b.air && b.flipT < 0 && b.vy > 2 && b.y - slSurfY(b.s, b.u) > 0.4 && Math.random() < A.show*dt*3 && b.vy/SL_G > SL_FLIP_T*0.55) slJump(b);
  if(Math.abs(me.s - b.s) < 3.5 && Math.abs(me.u - want) < 1.1) want = me.u + (want >= me.u ? 1.2 : -1.2);   // малыша объезжает стороной
  b.ut = Math.max(-SL_UMAX, Math.min(SL_UMAX, want));
}

/* ---------- кадр ---------- */
function slStep(dt0){
  if(!SL) return;
  const C = SL;
  // обучение: перед первым сугробом во всю ширину и первой трещиной время почти замирает, пока не прыгнешь
  let ts = 1;
  if(C.st === 'go' && C.teach){
    const me = C.me;
    const d0 = C.obs.find(o => o.k === 'drift' && o.side === 0 && o.s > me.s), c0 = C.cracks.find(c => c > me.s);
    const near = [d0 && d0.s - me.s, c0 !== undefined && c0 - me.s].filter(x => x !== false && x !== undefined && x > 0).sort((a, b) => a - b)[0];
    if(near !== undefined && near < 3.4 && near > 0.8 && !me.air && !C.taught){ ts = 0.08; mgHint(d0 && d0.s - me.s === near ? L('Сугроб! Нажми — прыжок ⬆️', 'Snow ahead! Tap to jump ⬆️') : L('Трещина! Нажми — прыжок ⬆️', 'A crack! Tap to jump ⬆️')); C.slowNow = true; }
    else if(C.slowNow){ C.slowNow = false; if(me.air){ C.taught = true; tipDone('sl_jump'); mgHint(''); } }
  }
  const dt = dt0*ts;
  if(C.st === 'go' || C.st === 'end'){
    C.t += dt;
    for(const b of C.bots) slAI(b, dt);
    for(const r of slOwn()) if(r.v > 0 || C.st === 'go') slBody(r, dt);
    for(const o of C.obs) if(o.k === 'shark' && o.st !== 'done') slSharkStep(o, dt);
    // ракушки: только свои
    const me = C.me, meY = me.y + 0.35;
    for(const sh of C.shells){
      if(sh.got || sh.s < me.s - 2 || sh.s > me.s + 2) continue;
      if(Math.abs(sh.s - me.s) < 0.9 && Math.abs(sh.u - me.u) < 0.75 && Math.abs(sh.y - meY) < (sh.gold ? 0.8 : 0.9)){
        sh.got = true; C.grp.remove(sh.o);
        if(sh.gold){ C.gold = true; sfx.sparkle(); floatText(L('Золотая ракушка! ✨', 'The golden shell! ✨'), slPt(me.s + 2, me.u, 1.8), '#E0A030'); burst(TEX.star, sh.o.position, 14, 2.4, 0.3); }
        else { C.shells_++; sfx.coin(); emit(TEX.star, sh.o.position, {v:new V3(0, 1, 0), life:0.45, size:0.22, spin:4}); }
      }
    }
  }
  // по сети — шлём себя
  if(C.mode === 'net' && C.pal && (C.st === 'go' || C.st === 'end') && (C.sendT -= dt0) <= 0){
    C.sendT = 0.08; const m = C.me; netSend({t:'slp', s:+m.s.toFixed(2), u:+m.u.toFixed(2), h:+(m.y - slSurfY(m.s, m.u)).toFixed(2), f:m.flipT >= 0 ? +(m.flipT/SL_FLIP_T).toFixed(2) : -1, tb:m.tumble > 0});
  }
  const pal = C.pal;
  if(pal && !pal.gone){ pal.s += (pal.ns - pal.s)*Math.min(1, dt0*10); pal.u += (pal.nu - pal.u)*Math.min(1, dt0*10); pal.y = slSurfY(pal.s, pal.u) + pal.nh; pal.flipT = pal.nf >= 0 ? pal.nf*SL_FLIP_T : -1; }
  // рисуем
  for(const sh of C.shells) if(!sh.got && Math.abs(sh.s - C.me.s) < 40) sh.o.rotation.y += dt0*(sh.gold ? 1.5 : 3);
  BOOST_TEX.offset.y = (BOOST_TEX.offset.y - dt0*1.6) % 1;
  for(const r of slAll()) slDraw(r, dt0);
  slCam(dt0);
  slHud();
}
function slDraw(r, dt){
  const P = SL.P, gr = slGet(P.GR, r.s), th = slGet(P.TH, r.s), onIce = !r.air && r.splash <= 0;
  const surfH = slSurfY(r.s, r.u);
  slPt(r.s, r.u, 0, r.root.position); r.root.position.y = r.y + r.lift*SL_SC;
  if(r.splash > 0) r.root.position.y = slTrackY(r.s) - 0.45;
  const roll = onIce || r.y - surfH < 0.3 ? -Math.atan(slSlope(r.u))*0.9 : 0;
  r.rl = (r.rl || 0) + (roll - (r.rl || 0))*Math.min(1, dt*10);
  r.root.rotation.set(r.air ? Math.max(-0.4, Math.min(0.5, -r.vy*0.05)) + Math.atan(gr) : Math.atan(gr) - (r.ramp ? 0.25 : 0), Math.PI - th + (r.ut - r.u)*0.12, r.rl);
  let fx = r.lie;
  if(r.tumble > 0) fx += -(1 - r.tumble/0.8)*Math.PI*2;
  else if(r.flipT >= 0) fx += -Math.min(1, r.flipT/SL_FLIP_T)*Math.PI*2;
  r.piv.rotation.x = fx;
  if(r.seal){
    const s = r.seal; s.flap = r.air ? 0.9 : r.boost > 0 ? 0.6 : 0.15; s.wobble = r.air ? 0 : Math.sin(now*9)*0.03;
    if(r.tumble <= 0 && r.flipT < 0) s.inner.position.y = 0;
    updateSeal(s, now, dt);
  }
  const close = r !== SL.me && r.s < SL.me.s - 1.2 && r.s > SL.me.s - 9;   // сзади у самой камеры — не загораживать дорогу
  r.root.visible = !r.gone && !close && !(r.lost && Math.floor(now*2) % 2);
  if(r.lbl){ slPt(r.s, r.u, 0, r.lbl.position); r.lbl.position.y = r.y + 1.15; r.lbl.visible = r.root.visible && r.s > SL.me.s + 1.5 && r.s < SL.me.s + 30; }
  // снежная пыль из-под пузика и искры на ускорителе
  if((r.puffT -= dt) < 0 && onIce && r.v > 2 && Math.abs(r.s - SL.me.s) < 25){
    r.puffT = r.boost > 0 ? 0.04 : r.soft ? 0.05 : 0.09;
    const b = slPt(r.s - 0.6, r.u + (Math.random() - 0.5)*0.4, 0.15), bk = slPt(r.s - 2, r.u, 0.4);
    emit(TEX.puff, b, {v:bk.sub(b).multiplyScalar(0.9), life:0.5, size:0.35, grow:1});
  }
  if(r.boost > 0 && r === SL.me && Math.random() < dt*14){ const sd = Math.random() < 0.5 ? -1 : 1; emit(TEX.star, slPt(r.s + 0.5, r.u + sd*(0.6 + Math.random()*0.4), 0.4 + Math.random()*0.7), {v:new V3(0, 0.5, 0), life:0.35, size:0.14}); }
}
// камера: сзади и сверху, смотрит вперёд по дорожке; на узком экране — дальше и выше
const _slA = new V3(), _slB = new V3();
function slCam(dt){
  const C = SL, me = C.me, far = Math.max(1, Math.min(1.45, 0.62/camera.aspect));
  const back = 5.6*far + Math.max(0, me.v - SL_V)*0.25, up = 2.5*far;
  const sc = Math.max(-8, me.s - back);
  slPt(sc, me.u*0.7, 0, _slA, false); _slA.y = Math.max(_slA.y, slTrackY(me.s)) + up + Math.max(0, me.y - slSurfY(me.s, me.u))*0.4;
  if(sc < 0){ const th = C.P.TH[0]; _slA.x -= Math.sin(th)*sc; _slA.z += Math.cos(th)*sc; }
  slPt(me.s + 7*far, me.u*0.45, 0, _slB, false); _slB.y += 0.9;
  const mp = slPt(me.s, me.u, 0.5); mp.y = me.y + 0.5; _slB.lerp(mp, 0.35);   // смотрим и вперёд, и на малыша — на вираже он не уезжает за край
  if(C.st === 'end' && C.me.fin){   // финиш: камера облетает малыша спереди
    C.endK = Math.min(1, (C.endK || 0) + dt*0.6); const k = ease.io(C.endK);
    const f = slPt(me.s + 6.2, me.u*0.5 + 0.8, 2.2 + 1.1*far, new V3(), false), l = slPt(me.s, me.u, -1.3, new V3(), false);   // малыш — в верхней половине: внизу окошко итогов
    _slA.lerp(f, k); _slB.lerp(l, k);
  }
  const kk = C.camInit ? Math.min(1, dt*9) : 1; C.camInit = true;
  runCam.pos.lerp(_slA, kk); runCam.look.lerp(_slB, kk);
  // сияние и снегопад — вокруг камеры
  for(const a of C.aur){ const k = a.userData.k; slPt(me.s + 70 + k*18, (k - 1)*30, 0, a.position, false); a.position.y = slTrackY(me.s) + 26 + k*6 + Math.sin(now*0.3 + k)*2; a.lookAt(runCam.pos); a.rotation.z = Math.sin(now*0.2 + k)*0.15; a.material.opacity = 0.7 + Math.sin(now*0.8 + k*2)*0.3; }
  if(C.flakes){
    C.flakes.position.copy(runCam.pos);
    const a = C.flakes.geometry.attributes.position, arr = a.array;
    for(let i = 0; i < arr.length; i += 3){ arr[i + 1] -= dt*(1.2 + (i % 7)*0.15); arr[i] += Math.sin(now + i)*dt*0.3; if(arr[i + 1] < -6) arr[i + 1] = 10; }
    a.needsUpdate = true;
  }
}
function slHud(){
  const h = SL && SL.hud; if(!h) return;
  h.querySelector('.sh').textContent = SL.shells_;
  h.querySelector('.fl').textContent = SL.flips;
  const t = SL.me.fin || SL.t; h.querySelector('.tm').textContent = t.toFixed(1);
  const pl = h.querySelector('.pl'); if(pl) pl.textContent = slPlaceIc(slPlaceOf(SL.me));
  const len = SL.L.fin;
  h.querySelector('.bar i').style.width = Math.max(0, Math.min(1, SL.me.s/len))*100 + '%';
  SL.dots.forEach(([r, el]) => { el.style.left = Math.max(0, Math.min(1, r.s/len))*100 + '%'; el.hidden = r.gone; });
}
const slPlaceIc = n => ['🥇', '🥈', '🥉'][n - 1] || `${n}`;
function slPlaceOf(r){   // место: кто приехал раньше, потом — кто дальше
  const all = slAll(), ri = all.indexOf(r);
  return 1 + all.filter((o, i) => o !== r && (o.fin && (!r.fin || o.fin < r.fin || o.fin === r.fin && i < ri) || !o.fin && !r.fin && o.s > r.s)).length;
}

/* ---------- финиш ---------- */
function slFinish(r){
  burst(TEX.star, slPt(SL.L.fin, 0, 3), 8, 2, 0.28);
  if(r !== SL.me){ if(r.kind === 'bot' && Math.abs(r.s - SL.me.s) < 30) floatText(L('Ура!', 'Yay!'), slPt(r.s + 1, r.u, 1.4), '#3B8F5E'); return; }
  SL.st = 'end'; sfx.good(); sfx.hug();
  const p = slPt(SL.L.fin, 0, 3.4);
  for(let i = 0; i < 3; i++) setTimeout(() => { if(SL){ burst(TEX.star, p, 14, 2.6, 0.32); burst(TEX.heart, p, 6, 2, 0.28); } }, i*250);
  floatText(L('Финиш!', 'Finish!'), slPt(r.s + 2, r.u, 1.6), '#D9527E');
  if(r.seal){ r.seal.happyUntil = now + 5; setMood(r.seal, 'happy'); }
  if(SL.mode === 'net') netSend({t:'slf', tm:+r.fin.toFixed(2)});
}

/* ---------- управление: держи палец и веди влево-вправо; касание — прыжок, в полёте — кувырок ---------- */
function slControls(){
  let g = null;
  const ok = () => SL && SL.st === 'go';
  const W = () => Math.min(innerWidth, 560);
  mgOn(mgRoot, 'pointerdown', e => {
    if(e.target.closest('button, .mg-panel')) return; e.preventDefault();
    if(!ok()) return;
    g = {id:e.pointerId, x:e.clientX, y:e.clientY, u0:SL.me.ut, t:performance.now(), moved:false, used:false};
  });
  mgOn(mgRoot, 'pointermove', e => {
    if(!g || e.pointerId !== g.id || !ok()) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if(Math.abs(dx) > 10) g.moved = true;
    if(g.moved) SL.me.ut = Math.max(-SL_UMAX, Math.min(SL_UMAX, g.u0 + dx/W()*SL_W*2.6));
    if(!g.used && dy < -38 && -dy > Math.abs(dx)*1.2){ g.used = true; slJump(SL.me); }   // смахнуть вверх — тоже прыжок
  });
  const up = e => {
    if(!g || e.pointerId !== g.id) return;
    const t = g; g = null;
    if(!t.moved && !t.used && ok() && performance.now() - t.t < 450) slJump(SL.me);
  };
  mgOn(mgRoot, 'pointerup', up);
  mgOn(mgRoot, 'pointercancel', () => g = null);
  const keys = {};
  mgOn(window, 'keydown', e => {
    if(e.key === 'ArrowLeft' || e.key === 'ArrowRight'){ keys[e.key] = true; e.preventDefault(); }
    if((e.key === ' ' || e.key === 'ArrowUp') && !e.repeat && ok()){ e.preventDefault(); slJump(SL.me); }
  });
  mgOn(window, 'keyup', e => { keys[e.key] = false; });
  mgTick(dt => { if(!ok()) return; const k = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0); if(k) SL.me.ut = Math.max(-SL_UMAX, Math.min(SL_UMAX, SL.me.ut + k*dt*5)); });
}

/* ---------- сеть ---------- */
function slNetWire(){
  netOn('slp', m => { const p = SL && SL.pal; if(!p) return; p.ns = m.s; p.nu = m.u; p.nh = m.h; p.nf = m.f; p.tumble = m.tb ? 0.3 : 0; });
  netOn('slf', m => { const p = SL && SL.pal; if(p && !p.fin){ p.fin = m.tm; if(Math.abs(p.s - SL.me.s) < 30) floatText(L('Ура!', 'Yay!'), slPt(p.s + 1, p.u, 1.4), '#3E8DB8'); } });
  netOn('emo', () => { if(SL && SL.pal){ burst(TEX.heart, SL.pal.root.position.clone().add(new V3(0, 0.9, 0)), 8, 1.6, 0.3); sfx.purr(); } });
  netOn('bye', () => { if(!SL || !SL.pal) return; SL.pal.gone = true; toast(L('Напарник ушёл домой 👋', 'Your partner went home 👋')); });
  net.onLost = () => { if(SL && SL.pal){ SL.pal.lost = true; } };
  net.onBack = () => { if(SL && SL.pal){ SL.pal.lost = false; toast(L('Снова вместе! 💗', 'Together again! 💗')); } };
}

/* ---------- сам спуск: mode — 'race' (с друзьями), 'time' (на время), 'net' (с папой). Возвращает {res, again} или null ---------- */
async function slideRun(mode, pal0){
  sfx.whoosh(); flash();
  const fog = scene.fog, bg = scene.background, fov = camera.fov;
  slRoot.visible = true; runCam.on = true; snow.visible = false;
  document.body.classList.add('run-on', 'slide-on');
  const homeB = document.createElement('button'); homeB.id = 'btnRunHome'; homeB.className = 'round home';
  homeB.innerHTML = '<span aria-hidden="true">🏠</span>'; homeB.setAttribute('aria-label', L('Домой', 'Home')); $('#corner').prepend(homeB);
  let done; const fin = new Promise(r => done = r);
  homeB.addEventListener('click', () => { sfx.tap(); done('quit'); });
  const sv = save.sl;
  let {seed, th} = slDay();
  SL = {mode, st:'ready', t:0, grp:new THREE.Group(), me:null, bots:[], pal:null, hud:null, dots:[], shells_:0, flips:0, jumps:0, flights:0, boosts:0, gold:false,
    first:!sv.n, teach:!tipSeen('sl_jump'), taught:false, tips:new Set(), sendT:0, end:null, aur:[], flakes:null};
  slRoot.add(SL.grp);
  if(mode === 'net'){
    slNetWire();
    if(net.host){ await Promise.race([new Promise(r => netOn('slready', r)), wait(8), fin]); netSend({t:'slgo', seed, th}); }
    else {
      const gm = new Promise(r => netOn('slgo', m => r(m))), iv = setInterval(() => netSend({t:'slready'}), 400);
      netSend({t:'slready'}); const m = await Promise.race([gm, fin]); clearInterval(iv);
      if(m && m.seed != null) seed = m.seed;
      if(m && SL_DAYS[m.th]) th = m.th;
    }
  }
  const T = SL.T = SL_DAYS[th];
  SL.seed = seed; SL.L = slLayout(seed, SL.first); SL.P = slPath(SL.L);
  SL.ramps = SL.L.items.filter(i => i.k === 'ramp');
  SL.cracks = []; for(let i = 1; i < SL.P.n; i++) if(SL.P.HOLE[i] === 1 && !SL.P.HOLE[i - 1]) SL.cracks.push(i*SL_DS);
  slBuildWorld(); slBuildItems();
  scene.fog = new THREE.Fog(T.fog, T.near, T.far); scene.background = new THREE.Color(T.sky);
  HEMI.intensity = T.hemi; sun.intensity = T.sun;
  camera.fov = camera.aspect < 1 ? 58 : 50; camera.updateProjectionMatrix();
  // ездоки на старте
  const me = SL.me = slRider('me', '', 'me'); me.s = 2.5; me.u = 0; me.ut = 0;   // друзья стоят чуть впереди — их видно, и есть кого догонять
  if(mode === 'race'){
    slFriends().forEach((f, i) => { const b = slRider('bot', f.name, f.look); b.s = 4.6 + (i === 2 ? 1.2 : 0); b.u = b.ut = [-1.3, 1.3, 0][i]; b.ai = {pace:f.pace, skill:f.skill, show:f.show, mult:0, line:[-0.5, 0.5, 0][i], ph:i*2, lead:[3, 0, -2][i], did:new Set()}; SL.bots.push(b); });
  }
  if(mode === 'net'){ const p = SL.pal = slRider('net', (pal0 && pal0.name) || L('Папа', 'Dad'), {pal:pal0}); p.s = p.ns = 2.5; p.u = p.nu = net.host ? 1.2 : -1.2; me.u = me.ut = net.host ? -1.2 : 1.2; p.nh = 0; p.nf = -1; }
  for(const r of slAll()) r.y = slSurfY(r.s, r.u);
  mgOpen('', {hintBottom:true});
  SL.hud = mgNode('div', 'run-hud sl-hud', `<span class="pill">🐚 <b class="sh">0</b></span><span class="pill">⭐ <b class="fl">0</b></span><span class="pill">⏱️ <b class="tm">0.0</b></span>${mode !== 'time' ? '<span class="pill pl-pill"><b class="pl">1</b></span>' : ''}<span class="bar"><i></i><span class="flag" aria-hidden="true">🏁</span></span>`);
  const bar = SL.hud.querySelector('.bar');
  SL.dots = [...SL.bots, SL.pal].filter(Boolean).map(r => { const el = document.createElement('b'); el.className = 'sl-dot' + (r.kind === 'net' ? ' net' : ''); bar.appendChild(el); return [r, el]; });
  const btns = mgNode('div', 'co-btns', mode === 'net' ? `<button class="round co-heart" aria-label="${L('Сердечко напарнику', 'A heart for your partner')}">💗</button>` : '');
  const hb = btns.querySelector('.co-heart');
  if(hb) mgOn(hb, 'pointerdown', e => { e.stopPropagation(); burst(TEX.heart, SL.me.root.position.clone().add(new V3(0, 0.9, 0)), 8, 1.6, 0.3); sfx.purr(); netSend({t:'emo'}); });
  slControls(); slStep(0); slHud();
  mgTick(dt => {
    slStep(dt);
    if(SL && SL.st === 'end' && !SL.over){
      const wait4 = SL.mode === 'race' ? SL.bots.every(b => b.fin || b.s < SL.me.s - 45) : SL.mode === 'net' ? !SL.pal || SL.pal.gone || SL.pal.fin : true;
      SL.endT = (SL.endT || 0) + dt;
      if(SL.endK >= 1 && (wait4 || SL.endT > 6) && SL.endT > 2.6){ SL.over = true; done('win'); }
    }
  });
  const tick = t => Promise.race([wait(t), fin]);
  if(SL.first){ mgHint(L('🐧 Пинг: «Я построил горку до самого моря! Кто быстрее?»', '🐧 Ping: “I built a slide all the way to the sea! Who is faster?”')); sfx.quack(); await tick(2.8); }
  mgHint(`${T.ic} ${L(`Горка дня «${T.name}»: ${T.about}`, `Slide of the day “${T.name}”: ${T.about}`)}`); await tick(2.4);
  if(mode === 'time') { mgHint(L(`⏱️ На время! Цель дня — ${slGoal()} с${sv.bt ? `, рекорд — ${sv.bt} с` : ''}`, `⏱️ Against the clock! Today's goal is ${slGoal()} s${sv.bt ? `, your record is ${sv.bt} s` : ''}`)); await tick(2.4); }
  if(SL.first || !tipSeen('sl_steer')){ tipDone('sl_steer'); mgHint(L('Держи палец и веди влево-вправо ↔️ Касание — прыжок, в полёте — кувырок!', 'Hold your finger and slide left-right ↔️ Tap to jump, tap in the air to flip!')); await tick(3.2); }
  for(const n of ['3', '2', '1']){ mgHint(n); sfx.tick(); await tick(0.5); }
  if(!SL.end && SL.st === 'ready'){ SL.st = 'go'; mgHint(L('Поехали! 🛷', 'Go! 🛷')); sfx.arf(); for(const r of slOwn()) r.v = 3; setTimeout(() => { if(SL && mgHintEl.textContent.includes('🛷')) mgHint(''); }, 1100); }
  const how = await fin;
  if(how === 'quit' && mode === 'net') netSend({t:'bye'});
  let res = null, again = false;
  if(how === 'win'){
    res = slResults();
    if(!sv.n || mode === 'net' || res.cup){   // фото на финише — в альбом (в первый раз, с папой и за первую победу)
      try{ res.photo = snapshot({root:{position:SL.me.root.position.clone().add(new V3(0, -0.4, 0)), scale:{x:1}}}, 2.6);
        albumAdd({name:L('Ледяная горка', 'The ice slide'), img:res.photo, d:Date.now()}); renderAlbumCount(); }catch(e){}
    }
    mgHint(''); SL.hud.remove(); again = await slResultPanel(res);
  }
  mgHint(''); mgClose();
  slRoot.remove(SL.grp);
  SL.grp.traverse(o => { if(o.geometry && !o.isSprite && o.geometry !== SMALL && o.geometry !== SPH) o.geometry.dispose(); });
  SL = null;
  homeB.remove(); document.body.classList.remove('run-on', 'slide-on');
  slRoot.visible = false; runCam.on = false; homeLights(false); snow.visible = true;
  scene.fog = fog; scene.background = bg; camera.fov = fov; camera.updateProjectionMatrix();
  return res && {res, again};
}

/* ---------- итоги ---------- */
const slGoal = () => { const L0 = slLayout(slDay().seed, false); return Math.round(L0.fin/(SL_V*0.93)); };   // время дня: без падений его легко побить
function slResults(){
  const C = SL, sv = save.sl, today = slToday(), me = C.me;
  if(sv.day.d !== today) sv.day = {d:today, n:0, st:0};
  const time = Math.round(me.fin*10)/10, goal = Math.round(C.L.fin/(SL_V*0.93));
  const need = Math.ceil(C.total*0.7);
  const place = C.mode === 'time' ? 0 : slPlaceOf(me);
  const r = {mode:C.mode, time, goal, need, shells:C.shells_, total:C.total, flips:C.flips, gold:C.gold, place, T:C.T,
    others:C.mode === 'time' ? [] : slAll().filter(o => o !== me).map(o => ({name:o.name, fin:o.fin, place:slPlaceOf(o)})).sort((a, b) => a.place - b.place)};
  r.stars = 1 + (r.shells >= need ? 1 : 0) + (time <= goal ? 1 : 0);
  r.rec = !sv.bt || time < sv.bt; r.prev = sv.bt;
  r.goldNew = C.gold && !sv.gold;
  r.cup = C.mode === 'race' && place === 1 && !sv.win;
  r.paid = sv.day.n < SL_DAILY;
  r.gift = r.paid ? Math.min(SL_MAX, Math.round(r.shells/3) + SL_END + Math.min(5, r.flips)) : 0;
  r.gift += (r.goldNew ? SL_GOLD : 0) + (r.cup ? SL_CUP : 0);
  sv.n++; sv.day.n++; sv.day.st = Math.max(sv.day.st, r.stars); sv.st = Math.max(sv.st, r.stars);
  if(r.rec) sv.bt = time;
  if(C.gold) sv.gold = true;
  if(C.mode === 'race' && place === 1) sv.win++;
  if(r.cup && !save.adv.cups.includes('slide')) save.adv.cups.push('slide');   // кубок — на полку находок в иглу (js/home.js)
  if(C.mode === 'net') sv.net++;
  sv.flips += r.flips;
  persist();
  return r;
}
async function slResultPanel(r){
  const net1 = r.mode === 'net';
  const st = '⭐'.repeat(r.stars) + '☆'.repeat(3 - r.stars);
  const who = r.others.length ? `<div class="sl-podium">${[{name:save.pet ? save.pet.name : L('Ты', 'You'), place:r.place, fin:r.time, me:true}, ...r.others].sort((a, b) => a.place - b.place)
    .map(o => `<span class="${o.me ? 'me' : ''}">${slPlaceIc(o.place)} ${o.name}${o.fin ? ` <small>${o.fin.toFixed ? o.fin.toFixed(1) : o.fin} ${L('с', 's')}</small>` : ''}</span>`).join('')}</div>` : '';
  const title = r.mode === 'time' ? (r.rec ? L('Новый рекорд! 🏆', 'New record! 🏆') : L('Доехали! 🛷', 'Made it! 🛷'))
    : r.place === 1 ? L(`Ты ${pg('первый', 'первая')}! 🥇`, 'You won! 🥇') : L('Все доехали — ура! 🛷', 'Everyone made it — hooray! 🛷');
  const panel = mgNode('div', 'mg-panel run-end co-end sl-end', `
    <p class="ttl display">${title}</p>
    <p class="res-stars display">${st}</p>
    ${who}
    <p class="got">⏱️ ${L(`Время: ${r.time} с`, `Time: ${r.time} s`)}${r.time <= r.goal ? ' ✅' : ` <small>(${L(`цель дня — ${r.goal} с`, `today's goal is ${r.goal} s`)})</small>`}${r.rec && r.prev ? ` · 🏆 ${L('рекорд!', 'record!')}` : ''}</p>
    <p class="got">🐚 ${L(`Ракушки: ${r.shells} из ${r.total}`, `Shells: ${r.shells} of ${r.total}`)}${r.shells >= r.need ? ' ✅' : ` <small>(${L(`для звезды — ${r.need}`, `${r.need} for a star`)})</small>`}</p>
    ${r.flips ? `<p class="got">🤸 ${L(`Кувырков: ${r.flips}`, `Flips: ${r.flips}`)}</p>` : `<p class="got">🤸 ${L('В полёте нажми — будет кувырок!', 'Tap in the air to do a flip!')}</p>`}
    <p class="got">✨ ${r.gold ? L('Золотая ракушка найдена!', 'You found the golden shell!') : L('Золотая ракушка висит высоко над трамплином — прыгни на самом краю…', 'The golden shell hangs high above a ramp — jump at the very edge…')}</p>
    ${r.cup ? `<p class="got">🏆 ${L('Кубок горки — на полку в иглу!', 'The slide cup — for the igloo shelf!')}</p>` : ''}
    ${r.photo ? `<img class="co-photo" src="${r.photo}" alt=""><p class="got">📷 ${L('Фото — в альбоме', 'The photo is in the album')}</p>` : ''}
    ${!r.paid ? `<p class="got">${L('Ракушки за горку на сегодня собраны — завтра будет новая горка 🛷', 'Today\'s slide shells are collected — a new slide tomorrow 🛷')}</p>` : ''}
    <p class="earned display">${r.gift ? `+${r.gift} 🐚` : ''}</p>
    <p class="got co-wait" hidden></p>
    <div class="row"><button class="btn" data-k="home">${L('Домой 🏠', 'Home 🏠')}</button>${!net1 || net.host ? `<button class="btn ghost" data-k="again">${L('Ещё раз ↻', 'Again ↻')}</button>` : ''}</div>`);
  if(r.gift) setTimeout(() => addShells(r.gift, {x:innerWidth/2, y:innerHeight*0.4}), 900);
  if(save.pet && typeof petGive === 'function' && petSeal) setTimeout(() => { try{ petGive(5); }catch(e){} }, 1500);
  sfx.hug(); if(r.stars === 3) setTimeout(() => sfx.star(), 500);
  const k = await new Promise(res => {
    panel.querySelectorAll('[data-k]').forEach(b => mgOn(b, 'click', () => { sfx.tap(); res(b.dataset.k); }));
    if(net1 && !net.host){ const w = panel.querySelector('.co-wait'); w.hidden = false; w.textContent = L('Напарник решает: ещё раз или домой…', 'Your partner is deciding: again or home…'); netOn('slagain', () => res('again')); }
    if(net1) netOn('bye', () => { const w = panel.querySelector('.co-wait'); w.hidden = false; w.textContent = L('Напарник ушёл домой 👋', 'Your partner went home 👋'); const ag = panel.querySelector('[data-k="again"]'); if(ag) ag.remove(); if(!net.host) res('home'); });
  });
  if(net1){ if(k === 'again' && net.host) netSend({t:'slagain'}); if(k === 'home') netSend({t:'bye'}); }
  panel.classList.add('away'); await wait(0.25);
  return k === 'again';
}

/* ---------- выбор: гонка с друзьями или на время ---------- */
async function slidePick(){
  const sv = save.sl, T = slTheme(), fr = slFriends();
  mgOpen(L('Ледяная горка 🛷', 'The ice slide 🛷'));
  const panel = mgNode('div', 'mg-panel fun-pick', `
    <p class="got">${T.ic} ${L(`Горка дня «${T.name}»: ${T.about}`, `Slide of the day “${T.name}”: ${T.about}`)}</p>
    <div class="picks">
      <button data-k="race" class="wide"><span class="ic">🏁</span><b>${L('Гонка с друзьями', 'Race with friends')}</b><small>${fr.map(f => f.name).join(', ')}</small></button>
      <button data-k="time" class="wide"><span class="ic">⏱️</span><b>${L('На время', 'Against the clock')}</b><small>${L(`цель дня — ${slGoal()} с`, `today's goal: ${slGoal()} s`)}${sv.bt ? L(` · рекорд ${sv.bt} с`, ` · record ${sv.bt} s`) : ''}</small></button>
    </div>
    ${sv.n ? `<p class="got small-note">${sv.win ? `🏆 ${L(`Побед в гонке: ${sv.win}`, `Race wins: ${sv.win}`)} · ` : ''}🛷 ${L(`Спусков: ${sv.n}`, `Rides: ${sv.n}`)}${sv.gold ? ' · ✨' : ''}</p>` : ''}
    <button class="btn ghost small" data-k="no">${L('Потом', 'Later')}</button>`);
  const k = await new Promise(r => panel.querySelectorAll('button').forEach(b => mgOn(b, 'click', () => { sfx.tap(); r(b.dataset.k); })));
  panel.classList.add('away'); await wait(0.25); mgClose();
  return k === 'no' ? null : k;
}
// вход: из «Поиграть» у малыша (mode не задан — спросим), из «Вместе» (ping → гонка, solo → на время, net — с папой)
async function slideGame(mode = null, pal0 = null){
  if(!mode) mode = await slidePick();
  if(!mode) return null;
  let res = null;
  for(;;){
    const r = await slideRun(mode, pal0);
    if(!r) break;
    res = r.res;
    if(!r.again) break;
  }
  if(mode === 'net') netClose();
  return res;
}
if(typeof CO_GAMES !== 'undefined') CO_GAMES.slide = {ic:'🛷', name:() => L('Горка', 'Slide'),
  say:() => { const T = slTheme(); return L('Кто быстрее с Ледяной горки до моря? Держи палец и веди влево-вправо, касание — прыжок, в полёте — кувырок!', 'Who is fastest down the Ice Slide to the sea? Hold and slide your finger left-right, tap to jump, tap in the air to flip!')
    + ' ' + L(`Сегодня: ${T.ic} ${T.name}`, `Today: ${T.ic} ${T.name}`); },
  wins:() => { const c = save.sl; return c.day.d === slToday() && c.day.st ? `${'⭐'.repeat(c.day.st)} ${L('сегодня', 'today')}` : c.bt ? `⏱️ ${L(`Рекорд: ${c.bt} с`, `Record: ${c.bt} s`)}` : ''; }};
