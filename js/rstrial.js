/* ---------------- «Спасаем потеряшку»: финальные испытания для Бухты, Грота и Метели (ROADMAP, Спринт 5) ----------------
   У новых уровней в конце есть «мини-босс» (сосулькопад, водоворот, медведь). Теперь и у первых трёх:
     🌊 Бухта — ⚪ «Лавина комов»: клетка открылась, а с горки за мамами катятся снежные комы.
     🕯️ Грот — 🧊 «Ледышки-прыгуны»: у полки Пипы с потолка сорвались ледышки и скачут по камням.
     ❄️ Метель — 🌪️ «Сугроб-ураган»: маяк загорелся, а метель напоследок крутит снежные вихри.
   Правило одно: 💪 Силач встаёт впереди — комы и вихри о него рассыпаются; 🦘 Прыгун прячется за ним и перепрыгивает
   то, что проскочит (ледышки-прыгуны скачут прямо через Силача). Попало в Прыгуна — пузырь (вихрь — сдувает назад).
   В конце — великан (ком, глыба, большой вихрь): он упирается в Силача, а Прыгун прыгает ему на макушку 3 раза —
   и великан рассыпается: снеговик, кристаллы, большой сугроб. Потом всё как раньше: мама по приметам / Пипа на полке.
   Проиграть нельзя: что проскочило — просто укатилось.
   Сеть: комы запускает хозяин (qtre), разбились о Силача — qtrb (шлёт тот, чей Силач), великан — qtrg, прыжки по нему — qtrs,
   в Гроте начало — qtr0. Подключается после всех уровней «Потеряшки» (festival.js): оборачивает их хуки. */
const TR_CFG = {
  bay:{ic:'⚪', gy:3, x0:49, x1:66, guard:55.2, cx:56.4, cy:2.1, delay:0.3,
    waves:[['ball', 1.2], ['ball', 2.2], ['ball', 2.2], ['ball', 3.4], ['ball', 1.8], ['ball', 1.8], ['ball', 1.8]],
    name:() => L('Лавина комов', 'Snowball avalanche'),
    intro:() => L('Ой! С горки покатились снежные комы! ⚪', 'Oh! Snowballs are rolling down the hill! ⚪'),
    what:() => L('комы', 'snowballs'), giant:() => L('Ком-великан', 'A giant snowball'), after:() => L('Получился снеговик! ☃️', 'It turned into a snowman! ☃️')},
  grot:{ic:'🧊', gy:0.8, x0:57.3, x1:68.8, guard:63.2, cx:63, cy:0.8, delay:0.3,
    waves:[['ball', 1.2], ['hop', 2.6], ['ball', 2.4], ['hop', 2.8], ['hop', 2.6], ['ball', 2.2], ['hop', 2.6]],
    name:() => L('Ледышки-прыгуны', 'Bouncing ice'),
    intro:() => L('Ой! С потолка сорвались ледышки — и скачут! 🧊', 'Oh! Ice chunks fell from the ceiling — and they bounce! 🧊'),
    what:() => L('ледышки', 'ice chunks'), giant:() => L('Глыба-великан', 'A giant ice boulder'), after:() => L('Глыба рассыпалась кристаллами! 💎', 'The boulder broke into crystals! 💎')},
  snow:{ic:'🌪️', gy:0, x0:50.2, x1:71.4, guard:60.2, cx:61, cy:0.4, delay:2.4,
    waves:[['whirl', 1.2], ['whirl', 2.6], ['whirl', 2.4], ['whirl', 2.8], ['whirl', 2.2], ['whirl', 2.4]],
    name:() => L('Сугроб-ураган', 'The snow hurricane'),
    intro:() => L('Метель напоследок крутит снежные вихри! 🌪️', 'The blizzard spins its last snow whirlwinds! 🌪️'),
    what:() => L('вихри', 'whirlwinds'), giant:() => L('Большой вихрь', 'A big whirlwind'), after:() => L('Вихрь рассыпался в сугроб! ❄️', 'The whirlwind fell into a snowdrift! ❄️')}
};
const TR_V = {ball:2.7, hop:2.3, whirl:2.2, giant:2.3};   // скорость (м/с)
const TR_R = {ball:0.38, hop:0.34, whirl:0.5};           // радиус
const TR_HOP = 1.45, TR_HOPT = 0.95;                     // ледышка-прыгун: высота и время одного скачка
const TR_STOMPS = 3;                                     // сколько раз прыгнуть на великана
let TR = null;

/* ---------- модельки ---------- */
function trFace(g, r, z){   // глазки и румянец — смотрят на тюленей (влево)
  for(const sd of [-1, 1]){
    const e = new THREE.Mesh(SMALL, inkMat); e.scale.setScalar(r*0.12); e.position.set(-r*0.72, r*0.25, sd*r*0.32 + z); g.add(e);
    const b = new THREE.Mesh(SMALL, new THREE.MeshBasicMaterial({color:0xFFB3C7})); b.scale.set(r*0.14, r*0.08, r*0.1); b.position.set(-r*0.78, r*0.02, sd*r*0.5 + z); g.add(b);
  }
}
function trModel(k, big){
  const g = new THREE.Group(), lv = TR.id;
  if(k === 'whirl'){
    const r = big ? 1.0 : TR_R.whirl, rings = [];
    for(let i = 0; i < 5; i++){
      const t = new THREE.Mesh(new THREE.TorusGeometry(r*(0.45 + i*0.16), r*0.11, 6, 18), new THREE.MeshToonMaterial({color:i % 2 ? 0xFFFFFF : 0xDCEEF8, transparent:true, opacity:0.85}));
      t.rotation.x = Math.PI/2; t.position.y = r*0.3 + i*r*0.42; g.add(t); rings.push(t);
    }
    if(big){ const f = new THREE.Group(); f.position.y = r*1.3; trFace(f, r*0.8, 0); g.add(f); }
    g.userData.rings = rings; g.userData.r = r;
    return g;
  }
  const r = big ? 0.85 : TR_R[k];
  const col = lv === 'grot' ? (k === 'hop' ? 0xA8DDF7 : 0xCFEFFB) : 0xFFFFFF;
  const b = addOutline(new THREE.Mesh(SPH, toon(col)), 1.05); b.scale.setScalar(r); g.add(b); g.userData.b = b;
  if(lv === 'grot' && (big || k === 'hop')) for(let i = 0; i < (big ? 7 : 4); i++){   // ледяные шипики
    const c = addOutline(new THREE.Mesh(new THREE.ConeGeometry(r*0.18, r*0.5, 5), toon(0xE3F6FF)), 1.1), a = i*2.4;
    c.position.set(Math.cos(a)*r*0.9, Math.sin(a)*r*0.9, Math.sin(a*1.7)*r*0.3); c.rotation.z = a - Math.PI/2; b.add(c); c.scale.divideScalar(r);
  }
  if(big || k === 'hop'){ const f = new THREE.Group(); trFace(f, r, 0); g.add(f); g.userData.face = f; }
  g.userData.r = r;
  return g;
}
function trRemains(x){   // что остаётся от великана: снеговик, кристаллы, большой сугроб
  const C = TR.C, g = new THREE.Group(); g.position.copy(rsAt(x, C.gy, -0.6));
  if(TR.id === 'bay'){
    for(const [y, r] of [[0.45, 0.5], [1.15, 0.36]]){ const b = addOutline(new THREE.Mesh(SPH, toon(0xFFFFFF)), 1.05); b.scale.setScalar(r); b.position.y = y; g.add(b); }
    const n = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 8), toon(0xFFA552)), 1.1); n.rotation.z = Math.PI/2; n.position.set(-0.4, 1.15, 0); g.add(n);
    const f = new THREE.Group(); f.position.y = 1.2; trFace(f, 0.36, 0); g.add(f);
    const hat = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.26, 12), toon(0x7FB8F0)), 1.08); hat.position.y = 1.52; g.add(hat);
  } else if(TR.id === 'grot'){
    const cols = [0xA8F0FF, 0xFFC6E0, 0xFFF3A8];
    for(let i = 0; i < 5; i++){ const c = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7 + (i % 3)*0.25, 6), new THREE.MeshBasicMaterial({color:cols[i % 3]})), 1.08); c.position.set((i - 2)*0.24, 0.35, (i % 2)*0.2); c.rotation.z = (i - 2)*0.3; g.add(c); }
    const gl = glow(0xFFF3A8, 1.8); gl.position.y = 0.5; g.add(gl);
  } else { const d = makeDrift(); d.scale.set(1.3, 1.1, 1); g.add(d); }
  C.root().add(g); TR.left.push(g);
}

/* ---------- начало и конец ---------- */
// уровень дошёл до испытания: after — что было бы дальше (мама по приметам и т.п.)
function trGo(id, after, remote){
  const C = TR_CFG[id];
  if(!C || !Q || Q.L.id !== id){ if(after) after(); return; }
  if(TR && TR.q === Q){ if(after && !TR.after) TR.after = after; return; }
  TR = {q:Q, id, C:{...C, root:() => Q.L.root}, on:true, ph:'wait', t:0, ents:[], seq:0, wi:0, spawnT:C.delay + 1.6, n:0, total:C.waves.length, giant:null, after, left:[], stack0:Q.L.stack};
  if(!remote && Q.mode === 'net' && id === 'grot') netSend({t:'qtr0', lv:id});
  Q.L.stack = true;   // на великана Прыгун может запрыгнуть и с головы Силача
  if(Q.moms) for(const m of Q.moms) m.z = -1.5;   // мамы отходят подальше
  wait(C.delay).then(() => {
    if(!TR || TR.q !== Q) return;
    TR.ph = 'go'; sfx.thud(); sfx.grr();
    mgHint(C.intro()); Q.hintT = now + 3;
    for(let i = 0; i < 6; i++) emit(TEX.puff, rsAt(C.x1 - 1 + Math.random()*2, C.gy + 1 + Math.random()*2, 0), {v:new V3(-1, 0.3, 0), life:0.8, size:0.5, grow:0.6});
    wait(2.4).then(() => { if(TR && TR.q === Q && TR.on){ Q.said.delete('s30' + Q.me.role); rsHintNow(true); } });
  });
}
function trEnd(){
  if(!TR) return;
  const T = TR; T.on = false; T.ph = 'done';
  for(const e of T.ents) if(e.o.parent) e.o.parent.remove(e.o);
  T.ents.length = 0;
  if(T.giant && T.giant.o.parent) T.giant.o.parent.remove(T.giant.o);
  T.giant = null;
  if(Q && T.q === Q){ Q.L.stack = T.stack0; if(Q.moms) for(const m of Q.moms) m.z = 0; }
}
function trClear(){   // уровень закрылся: убираем всё, и снеговика тоже
  if(!TR) return;
  trEnd();
  for(const g of TR.left) if(g.parent) g.parent.remove(g);
  if(TR.id === 'grot' || TR.id === 'bay' || TR.id === 'snow') if(Q && TR.q === Q) Q.L.stack = TR.stack0;
  TR = null;
}

/* ---------- комы, ледышки, вихри ---------- */
function trSpawn(k, id, remote){
  const T = TR; if(!T || !T.on || T.ents.some(e => e.id === id)) return;
  const C = T.C, o = trModel(k, false); C.root().add(o);
  const e = {id, k, x:C.x1, y:C.gy + (k === 'whirl' ? 0 : TR_R[k]), t:0, r:k === 'whirl' ? TR_R.whirl : TR_R[k], o, hit:new Set(), dead:false};
  T.ents.push(e);
  if(k === 'hop') sfx.boing(); else sfx.whoosh();
  if(!remote && Q.mode === 'net') netSend({t:'qtre', k, id});
}
function trKill(e, how){
  if(e.dead) return;
  e.dead = true; const T = TR;
  if(e.o.parent) e.o.parent.remove(e.o);
  const at = rsAt(e.x, e.y + (e.k === 'whirl' ? 0.7 : 0), 0.4);
  if(how === 'break'){ burst(TEX.puff, at, 10, 1.8, 0.4); burst(TEX.star, at, 5, 1.4, 0.2); sfx.thud(); }
  else emit(TEX.puff, at, {v:new V3(-1, 0.5, 0), life:0.7, size:0.5, grow:0.6});
  T.n++;
  if(how === 'break' || T.n === T.total) floatText(`${T.C.ic} ${T.n}/${T.total}`, rsAt(e.x, e.y + 1.4), '#3E8DB8');
}
function trBreak(id, remote){
  const e = TR && TR.ents.find(o => o.id === id); if(!e || e.dead) return;
  const S = rsBoth().find(p => p.role === 'strong');
  if(S && (!remote || S.kind === 'net')) floatText(e.k === 'whirl' ? L('Пуф! 💪', 'Poof! 💪') : L('Бум! 💪', 'Boom! 💪'), rsAt(S.x, S.y + RS_H + 0.9), '#2F9E72');
  trKill(e, 'break');
  if(!remote && Q.mode === 'net') netSend({t:'qtrb', id});
}
function trToss(p){   // вихрь сдул Прыгуна назад: кувырок, не пузырь
  if(p.bub || p.inv > 0) return;
  p.vx = -5.5; p.vy = 7; p.air = true; p.inv = 1.2; p.jumps = 2; p.x -= 0.2;
  sfx.whoosh(); floatText(L('Уууух!', 'Wheee!'), rsAt(p.x, p.y + 1.4));
  burst(TEX.puff, rsAt(p.x, p.y + 0.6, 0.4), 8, 1.6, 0.35);
  if(p === Q.me && Q.mode === 'net') rsSendMe();
}
function trEntStep(e, dt){
  const C = TR.C;
  e.t += dt; e.x -= TR_V[e.k]*dt;
  if(e.k === 'ball'){ e.y = C.gy + e.r; e.o.rotation.z += TR_V.ball/e.r*dt; }
  else if(e.k === 'hop'){ const ph = (e.t % TR_HOPT)/TR_HOPT; e.y = C.gy + e.r + Math.sin(ph*Math.PI)*TR_HOP; e.o.rotation.z += 3*dt; if(ph < 0.06 && e.t > 0.2 && !e.land){ e.land = true; if(Math.abs(e.x - Q.me.x) < 9) sfx.plop(); } if(ph > 0.5) e.land = false; }
  else { e.y = C.gy; e.o.userData.rings.forEach((r, i) => { r.rotation.z += dt*(6 + i); r.position.x = Math.sin(now*5 + i)*0.08; }); if(Math.random() < dt*8) emit(TEX.puff, rsAt(e.x, C.gy + Math.random()*1.4, 0.3), {v:new V3(-1.5, 0.8, 0), life:0.5, size:0.3, grow:0.5}); }
  e.o.position.copy(rsAt(e.x, e.y, e.k === 'whirl' ? 0.1 : 0.25));
  if(e.x < C.x0) return trKill(e, 'pass');
  // о Силача — рассыпается; в Прыгуна — пузырь (вихрь — сдувает)
  const top = e.k === 'whirl' ? e.y + 1.5 : e.y + e.r, bot = e.k === 'whirl' ? e.y : e.y - e.r;
  for(const p of rsBoth()){
    if(p.bub || p.gone || e.hit.has(p) || Math.abs(p.x - e.x) > e.r + RS_HW - 0.05 || bot > p.y + RS_H - 0.05 || top < p.y + 0.05) continue;
    if(p.role === 'strong'){ if(rsLocal(p)){ trBreak(e.id); return; } continue; }   // Силач по сети — ждём его «qtrb»
    if(!rsLocal(p) || p.inv > 0) continue;
    e.hit.add(p);
    if(e.k === 'whirl') trToss(p); else rsBubble(p);
  }
}

/* ---------- великан: упирается в Силача, Прыгун прыгает на макушку ---------- */
function trGiant(remote){
  const T = TR; if(!T || T.giant) return;
  const C = T.C, k = T.id === 'snow' ? 'whirl' : 'ball', o = trModel(k, true); C.root().add(o);
  const R = o.userData.r, H = k === 'whirl' ? 2.1 : R*2;
  T.giant = {k, x:C.x1 + 0.5, R, H, o, n:0, st:'roll', s:{x0:0, x1:0, y0:C.gy, y1:C.gy + H, k:'giant'}, sq:0, holdSay:false};
  T.ph = 'giant'; sfx.grr(); sfx.thud();
  mgHint(`${C.giant()}! ` + L('Прыгни на макушку три раза ⬆️⬆️', 'Jump on its top three times ⬆️⬆️')); Q.hintT = now + 4;
  Q.said.delete('s30' + Q.me.role);
  if(!remote && Q.mode === 'net') netSend({t:'qtrg'});
}
function trGiantStep(dt){
  const G = TR.giant, C = TR.C;
  const S = rsBoth().find(p => p.role === 'strong' && !p.bub && Math.abs(p.y - C.gy) < 0.3);
  const stop = Math.max(C.x0 + 3, S && S.x < G.x ? S.x + RS_HW + G.R*0.85 : -99);
  if(G.st === 'roll'){
    G.x = Math.max(stop, G.x - TR_V.giant*dt);
    if(G.x <= stop + 1e-3){ G.st = 'stop'; sfx.thud(); if(S && S.x + RS_HW + G.R > G.x - 0.1) floatText(L('Держу! 💪', 'Got it! 💪'), rsAt(S.x, S.y + RS_H + 0.9), '#2F9E72'); }
  } else if(S && G.x < S.x + RS_HW + G.R*0.8) G.x = S.x + RS_HW + G.R*0.85;   // Силач упирается
  const w = G.R*0.8; G.s.x0 = G.x - w; G.s.x1 = G.x + w; G.s.y1 = C.gy + G.H*(1 - G.n*0.12);
  G.sq = Math.max(0, G.sq - dt*3);
  G.o.position.copy(rsAt(G.x, C.gy + (G.k === 'whirl' ? 0 : G.R*(1 - G.n*0.12)), 0.1));
  G.o.scale.set(1 + G.sq*0.25, (1 - G.n*0.12)*(1 - G.sq*0.3), 1 + G.sq*0.25);
  if(G.k === 'whirl') G.o.userData.rings.forEach((r, i) => { r.rotation.z += dt*(4 + i); });
  else if(G.st === 'roll') G.o.userData.b.rotation.z += TR_V.giant/G.R*dt;
  // катится — задевает Прыгуна (если он не сверху)
  if(G.st === 'roll') for(const p of rsBoth()) if(rsLocal(p) && p.role === 'jump' && !p.bub && p.inv <= 0 && Math.abs(p.x - G.x) < G.R + RS_HW - 0.1 && p.y < C.gy + G.H*0.7){ if(G.k === 'whirl') trToss(p); else rsBubble(p); }
  // приземлился на макушку — «Бум!»
  for(const p of rsBoth()){
    if(!rsLocal(p) || p.role !== 'jump') continue;
    const on = !!(p.ground && p.ground.k === 'giant');
    if(on && !p.trOn) trStomp(G.n + 1);
    p.trOn = on;
  }
}
function trStomp(n, remote){
  const G = TR && TR.giant; if(!G || n <= G.n) return;
  G.n = Math.min(TR_STOMPS, n); G.sq = 1;
  sfx.boing(); burst(TEX.star, rsAt(G.x, TR.C.gy + G.H, 0.4), 8, 1.8, 0.24);
  floatText(G.n < TR_STOMPS ? L(`Бум! Ещё ${TR_STOMPS - G.n}!`, `Boom! ${TR_STOMPS - G.n} more!`) : L('Бах!', 'Bang!'), rsAt(G.x, TR.C.gy + G.H + 1), '#D9527E');
  if(!remote && Q.mode === 'net') netSend({t:'qtrs', n:G.n});
  if(G.n >= TR_STOMPS) trWin();
}
async function trWin(){
  const T = TR, G = T.giant, C = T.C, q = Q;
  T.ph = 'win';
  if(G.o.parent) G.o.parent.remove(G.o);
  const x = G.x; T.giant = null;
  sfx.good(); sfx.sparkle(); burst(TEX.puff, rsAt(x, C.gy + 1, 0.4), 16, 2.4, 0.5); burst(TEX.star, rsAt(x, C.gy + 1.2, 0.4), 14, 2.4, 0.3);
  trRemains(x);
  for(const p of rsBoth()){ p.trOn = false; if(p.ground && p.ground.k === 'giant'){ p.ground = null; p.air = true; } }
  floatText(C.after(), rsAt(x, C.gy + 2.4), '#D9527E');
  mgHint(`${C.after()} ` + L('Вы справились вместе! 💗', 'You did it together! 💗')); Q.hintT = now + 3;
  await wait(1.4); if(!Q || Q !== q || TR !== T) return;
  trEnd();
  const a = T.after; T.after = null; if(a) a();
}

/* ---------- кадр ---------- */
function trStep(dt, go, id){
  if(TR && TR.q !== Q) TR = null;
  // Грот: испытание начинается, когда вышли на берег после реки
  if(id === 'grot' && go && !Q.cage && (!TR || TR.q !== Q) && rsBoth().some(p => rsLocal(p) && p.x > 58.6 && p.y > 0.5 && p.y < 2.5 && !p.bub)) trGo('grot', null);
  const T = TR; if(!T || !T.on) return;
  if(!go){ trEnd(); return; }   // Пипу сняли с полки прямо во время испытания — всё, праздник
  const host = Q.mode !== 'net' || net.host;
  if(T.ph === 'go'){
    if(host && T.wi < T.C.waves.length && (T.spawnT -= dt) <= 0){ const w = T.C.waves[T.wi++]; trSpawn(w[0], ++T.seq); T.spawnT = (T.C.waves[T.wi] || [0, 0])[1]; }
    if(host && T.wi >= T.C.waves.length && T.ents.every(e => e.dead) && (T.gT = (T.gT || 0) + dt) > 1.2) trGiant();
  }
  for(const e of T.ents) if(!e.dead) trEntStep(e, dt);
  T.ents = T.ents.filter(e => !e.dead);
  if(T.giant) trGiantStep(dt);
}
// Пинг: Силач стоит впереди, Прыгун — за ним и прыгает от того, что проскочит; великана — топчет
function trAI(p, dt){
  const T = TR, C = T.C, S = rsBoth().find(o => o.role === 'strong');
  if(T.giant){
    const G = T.giant;
    if(p.role === 'strong') return {tx:Math.min(C.guard, G.x - G.R - 0.3)};
    if(p.ground && p.ground.k === 'giant'){ const j = !p.air && now - (p.trJ || 0) > 0.45; if(j) p.trJ = now; return {tx:G.x, jump:j}; }
    if(G.st !== 'stop') return {tx:Math.min(p.x, G.x - G.R - 1.4)};
    return {tx:G.x, jump:!p.air && Math.abs(p.x - G.x) < G.R + 1.3, up:true};
  }
  if(p.role === 'strong') return {tx:C.guard};
  const bx = (S && !S.bub ? S.x : C.guard) - 1.15;
  const e = T.ents.find(o => !o.dead && o.x > p.x - 0.2 && o.x - p.x < 1.5 && (o.k === 'hop' ? o.y - C.gy < 0.95 : !S || S.bub || S.x < p.x || o.x < S.x));
  return {tx:bx, jump:!!e && !p.air};
}
function trHint(role){
  const T = TR, C = T.C, solo = Q.mode === 'solo', J = role === 'jump';
  const n = Q.pal && !Q.pal.gone && !solo ? Q.pal.name : '';
  if(T.giant) return J ? L(`${C.giant()}! Запрыгни сверху — и ещё раз в воздухе ⬆️⬆️ Три раза на макушку — и рассыплется!`, `${C.giant()}! Jump on it — and once more in the air ⬆️⬆️ Land on top three times and it breaks!`)
    : solo ? L(`${C.giant()}! Силач держит его, а Прыгун (🔄) прыгает сверху три раза`, `${C.giant()}! The strong one holds it, and the jumper (🔄) lands on top three times`)
    : L(`${C.giant()}! Держи 💪 — ${n} прыгнет на макушку. Можно и с твоей головы!`, `${C.giant()}! Hold it 💪 — ${n} will jump on its top. Even from your head!`);
  const hop = T.id === 'grot' ? L(' Ледышки-прыгуны скачут даже через Силача — прыгай, когда она внизу!', ' The bouncy ones jump right over the strong one — jump when it\'s low!') : '';
  if(solo) return L(`${C.name()}! 💪 Поставь Силача впереди — ${C.what()} о него рассыпятся. Прыгун (🔄) прячется за ним.`, `${C.name()}! 💪 Put the strong one in front — the ${C.what()} break on him. The jumper (🔄) hides behind.`) + hop;
  return J ? L(`${C.name()}! Прячься за Силачом 💪 и перепрыгивай то, что проскочит ⬆️`, `${C.name()}! Hide behind ${n || 'the strong one'} 💪 and jump over whatever gets past ⬆️`) + hop
    : L(`${C.name()}! Встань впереди 💪 — ${C.what()} о тебя рассыпятся, а ${n || 'Прыгун'} спрячется за тобой`, `${C.name()}! Stand in front 💪 — the ${C.what()} will break on you, and ${n || 'the jumper'} hides behind you`) + hop;
}
function trWire(){
  netOn('qtre', m => { if(TR && TR.q === Q) trSpawn(m.k, m.id, true); });
  netOn('qtrb', m => { if(TR && TR.q === Q) trBreak(m.id, true); });
  netOn('qtrg', () => { if(TR && TR.q === Q) trGiant(true); });
  netOn('qtrs', m => { if(TR && TR.q === Q) trStomp(m.n, true); });
  netOn('qtr0', m => { if(Q && Q.L.id === m.lv) trGo(m.lv, null, true); });
}

/* ---------- оборачиваем уровни ---------- */
for(const id of Object.keys(TR_CFG)){
  const Lv = RS_LVS[id]; if(!Lv) continue;
  const o = {step:Lv.step, ai:Lv.ai, sec:Lv.sec, hint:Lv.hint, cam:Lv.cam, solids:Lv.solids, wire:Lv.wire, clean:Lv.clean, act:Lv.act, reset:Lv.reset};
  const on = () => TR && TR.q === Q && TR.on;
  Lv.step = function(dt, go){ o.step.call(this, dt, go); trStep(dt, go, id); };
  Lv.ai = (p, dt) => on() && !p.bub ? trAI(p, dt) : o.ai(p, dt);
  Lv.sec = p => on() ? 30 : o.sec(p);
  Lv.hint = (sec, role) => sec === 30 && TR ? trHint(role) : o.hint(sec, role);
  Lv.cam = () => on() ? [(Q.me.x + TR.C.guard + 3.2)/2, TR.C.cy, 1] : o.cam ? o.cam() : null;   // видно и себя, и откуда катится
  Lv.solids = out => { o.solids(out); if(on() && TR.giant) out.push(TR.giant.s); };
  Lv.wire = () => { if(o.wire) o.wire(); trWire(); };
  Lv.clean = () => { trClear(); if(o.clean) o.clean(); };
  if(o.act) Lv.act = me => on() ? null : o.act(me);
  if(o.reset) Lv.reset = function(...a){ trClear(); return o.reset.apply(this, a); };
  const say0 = Lv.say; Lv.say = () => say0() + ' ' + L(`В конце — испытание: ${TR_CFG[id].ic} ${TR_CFG[id].name()}!`, `At the end — a trial: ${TR_CFG[id].ic} ${TR_CFG[id].name()}!`);
}
