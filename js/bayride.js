/* ---------------- 🛶 Финал Бухты «Льдина домой» (14.10, вместо «Лавины комов» — финалы «Потеряшки» не повторяют глагол, DESIGN.md §3) ----------------
   Мама нашлась — «Наш дом на дальней льдине. Отвезёте нас?» Вспышка — все на большой льдине у скалы, и плывём по бухте:
     💪 Силач сзади гребёт — кнопка 🚣 или касание по экрану. Кружок такта у Силача: сошёлся — сильный гребок и серия,
        мимо — слабый. Не гребут — льдина стоит (течения нет).
     🦘 Прыгун ⬆️ перепрыгивает на другой край льдины — она кренится и отворачивает туда: две полосы, ближняя и дальняя.
   Айсберги с мордочками стоят то в ближней, то в дальней полосе, дальше — чаще (слалом). Наш айсберг близко — над ним ❗.
   Не отвернули — «Бум!»: льдину отталкивает чуть назад (проиграть нельзя). Отвернуть, пока айсберг сбоку, нельзя — льдина
   ждёт посередине и проходит, как только он позади.
   Без напарника (🔄) — обе кнопки твои: 🚣 гребёт Силач, ⬆️ прыгает Прыгун.
   Пинг «в ногу»: Силач гребёт, только пока впереди чисто (у айсберга ждёт, когда ты отвернёшь), Прыгун рулит, когда гребёшь ты.
   Доплыли — у иглу ждёт папа малыша, все перепрыгивают на домашнюю льдину, обнимаются, фото.
   Сеть: льдину (x, z, скорость) считает хозяин и шлёт qbt {x, z, v, s} 10 раз/с; край льдины (s) решает тот, у кого Прыгун
   (qbhop {s}); гребок гостя — qbrow {g}; удар — qbb; доплыли — qbhome.
   Оборачивает хуки RS_LVS.bay (rescue.js), подключается после rstrial.js. */
const BR_X0 = 70.6, BR_END = 133, BR_W = 4.2, BR_D = 2.0, BR_TOP = RS_WS + 0.32;   // откуда плывём, где причаливаем; льдина: длина, ширина, верх
const BR_LANE = 1.8, BR_ZV = 3.0, BR_BX = 0.85, BR_CZ = 1.7;                      // полосы (z = ±1,8), как быстро отворачивает; айсберг: полдлины, касание по z
const BR_BEAT = 0.8, BR_WIN = 0.17, BR_CD = 0.3;                                   // такт гребли, окно «в такт», не чаще чем
const BR_GOOD = 1.0, BR_GOOD3 = 1.2, BR_WEAK = 0.32, BR_VMAX = 3.0, BR_DRAG = 0.5; // гребок в такт / в серии / мимо; скорость; трение воды
// айсберги: x и полоса (+1 — ближняя, −1 — дальняя). Показать → развить → слалом
const BR_BERGS = [[80, 1], [88, -1], [95, 1], [101, -1], [106, 1], [110.5, -1], [114.5, 1], [118.5, -1], [123, 1]];
const BR_HOME = {x0:BR_END + BR_W/2 + 0.15, x1:BR_END + BR_W/2 + 8, spots:{strong:136.1, jump:137.0, pup:137.85, mom:138.7, dad:139.6}, igloo:139.8};
let BR = null;

/* ---------- постройка (один раз) ---------- */
const brRoot = new THREE.Group(); rsRoot.add(brRoot);
const BRW = {};
function brBuild(){
  if(BRW.floe) return;
  // вода справа от скалы: прозрачная толща
  const x0 = 67.4, x1 = 146, wm = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, RS_WS + 3.2, 9), RS_WATER);
  wm.position.copy(rsAt((x0 + x1)/2, (RS_WS - 3.2)/2)); wm.renderOrder = 2; brRoot.add(wm);
  // дальние горы по пути
  [[84, -16, 1.6], [100, -22, 2.4], [117, -15, 1.4], [134, -24, 2.6], [146, -18, 1.8]].forEach(([x, z, s], i) => { const b = makeBerg(s, 7 + i); b.position.copy(rsAt(x, RS_WS, z)); brRoot.add(b); });
  // наша льдина
  const fl = new THREE.Group(); brRoot.add(fl); BRW.floe = fl;
  const body = addOutline(new THREE.Mesh(new THREE.BoxGeometry(BR_W, 0.42, BR_D), RS_MAT.ice), 1.03); body.position.y = -0.21; fl.add(body);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(BR_W - 0.06, 0.08, BR_D - 0.06), RS_MAT.snow); cap.position.y = 0.0; fl.add(cap);
  // весло у Силача
  const oar = new THREE.Group(); fl.add(oar); BRW.oar = oar;
  const st = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 8), RS_MAT.wood), 1.15); st.position.y = -0.45; oar.add(st);
  const bl = addOutline(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.26), RS_MAT.wood), 1.1); bl.position.y = -1.15; oar.add(bl);
  // айсберги с мордочками и ❗ над тем, что в нашей полосе
  BRW.bergs = BR_BERGS.map(([x, l], i) => {
    const g = new THREE.Group(); g.position.copy(rsAt(x, RS_WS, l*BR_LANE)); brRoot.add(g);
    const b = makeBerg(0.82, 31 + i); b.scale.set(0.8, 1, 0.8); g.add(b);
    const f = new THREE.Group(); f.position.set(-0.62, 0.45, 0.25); g.add(f);
    for(const sd of [-1, 1]){
      const e = new THREE.Mesh(SMALL, inkMat); e.scale.setScalar(0.07); e.position.set(0, 0.08, sd*0.16); f.add(e);
      const c = new THREE.Mesh(SMALL, new THREE.MeshBasicMaterial({color:0xFFB3C7})); c.scale.set(0.05, 0.035, 0.07); c.position.set(-0.02, -0.04, sd*0.25); f.add(c);
    }
    const ex = new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTex('❗'), transparent:true, depthWrite:false})); ex.scale.setScalar(0.7); ex.position.y = 1.9; ex.visible = false; g.add(ex);
    return {x, l, g, ex, i, sq:0};
  });
  // домашняя льдина: иглу и флажок
  const H = BR_HOME, home = rsBox(H.x0, H.x1, BR_TOP - 0.45, BR_TOP, RS_MAT.ice, 2.4, brRoot);
  rsBox(H.x0 + 0.03, H.x1 - 0.03, BR_TOP - 0.04, BR_TOP + 0.06, RS_MAT.snow, 2.44, brRoot);
  BRW.home = home;
  if(typeof smIgloo === 'function'){ const ig = smIgloo(0.9); ig.position.copy(rsAt(H.igloo + 1.6, BR_TOP, -1.3)); ig.rotation.y = -0.5; brRoot.add(ig); }
  const pole = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 8), RS_MAT.wood), 1.15); pole.position.copy(rsAt(H.x0 + 0.5, BR_TOP + 0.8, -0.9)); brRoot.add(pole);
  const fg = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.36), new THREE.MeshBasicMaterial({color:0xFF9BB8, side:THREE.DoubleSide})); fg.position.copy(rsAt(H.x0 + 0.82, BR_TOP + 1.42, -0.9)); brRoot.add(fg); BRW.flag = fg;
}
function brReset(){
  if(!BRW.floe) return;
  if(BR && BR.dad) BR.dad.s.root.parent && BR.dad.s.root.parent.remove(BR.dad.s.root);
  BR = null;
  BRW.floe.position.copy(rsAt(BR_X0, BR_TOP, BR_LANE)); BRW.floe.rotation.set(0, 0, 0);
  BRW.oar.position.set(-1.75, 0.5, 0.95); BRW.oar.rotation.set(0, 0, 0.35);
  for(const b of BRW.bergs){ b.ex.visible = false; b.sq = 0; b.g.scale.setScalar(1); }
}

/* ---------- начало: мама просит отвезти домой ---------- */
const brOn = () => !!(BR && BR.q === Q);
async function brBoard(){
  const q = Q, m = Q.moms.find(o => o.ok);
  if(!m){ Q.end = 'win'; return; }
  floatText(L('Наш дом — на дальней льдине!', 'Our home is on a far-off floe!'), rsAt(m.x, 5.4), '#D9527E');
  mgHint(L('Мама: «Наш дом — на дальней льдине. Отвезёте нас? 🛶»', 'Mum: “Our home is on a far-off floe. Will you take us? 🛶”'));
  await wait(2.4); if(Q !== q) return;
  flash(); sfx.splash();
  brStart(m);
}
function brStart(m){
  BR = {q:Q, x:BR_X0, z:BR_LANE, v:0, side:1, jz:0.62, hop:null, nx:BR_X0, nz:BR_LANE, t:0, t0:BR_BEAT, lastBeat:-9, aiBeat:-9, streak:0, rowCd:0,
    bumpT:0, oarT:0, sendT:0, home:false, hk:0, mom:m, beat:null, sayT:0, myHop:-9, dad:null};
  const D = rsSealLook(Q.fam.coat, '#7FB8F0', 0.5); rsRoot.add(D.root); D.root.rotation.y = -0.6; BR.dad = {s:D};
  Q.st = 'go'; Q.photoX = null; Q.photoY = null;
  for(const p of rsBoth()){ p.auto = null; if(p.bub) rsRevive(p); if(rsLocal(p)){ p.climb = true; p.jq = 0; } }
  const P = brSpot('strong'); Q.cx = BR.x + 2.6; Q.cy = -0.4;
  const pad = document.querySelector('.rs-pad'); if(pad) pad.hidden = true;   // на льдине ◀ ▶ не нужны: только 🚣 и ⬆️
  BR.beat = mgNode('div', 'sw-beat br-beat', '<i class="o"></i><i class="c"></i><b></b>'); BR.beat.hidden = true;
  for(const k of ['50', '51', '52']) for(const r of ['jump', 'strong']) Q.said.delete('s' + k + r);
  Q.hintT = 0; rsHintNow(true);
  burst(TEX.puff, rsAt(P.x, BR_TOP + 0.3, BR.z), 10, 1.6, 0.4);
}

/* ---------- кто где стоит на льдине ---------- */
function brSpot(role){
  const T = BR, bob = Math.sin(now*2.2)*0.04 + (T.bumpT > 0 ? Math.sin(T.bumpT*30)*0.04 : 0);
  let x, y = BR_TOP + bob, z;
  if(role === 'strong'){ x = T.x - 1.45; z = T.z; }
  else if(role === 'jump'){
    x = T.x + 1.25; z = T.z + T.jz;
    if(T.hop) y += Math.sin(T.hop.k*Math.PI)*0.85;
  } else if(role === 'mom'){ x = T.x - 0.15; z = T.z - T.side*0.35; }
  else { x = T.x + 0.45; z = T.z - T.side*0.5; }   // малыш
  if(T.home){   // перепрыгивают на домашнюю льдину
    const k = Math.min(1, Math.max(0, T.hk*1.4 - (role === 'strong' ? 0.4 : role === 'jump' ? 0.25 : role === 'mom' ? 0.1 : 0)));
    const hx = BR_HOME.spots[role] ?? x;
    x += (hx - x)*k; z += (0.15 - z)*k; y += Math.sin(k*Math.PI)*1.0;
  }
  return {x, y, z};
}
// мой тюлень (и Пинг) на льдине: вместо физики — место на льдине; ⬆️ — Прыгун перепрыгивает на другой край
function brSeal(p, dt){
  if(p.jq > 0){ p.jq = 0; brKey(p); }
  const P = brSpot(p.role);
  p.x = P.x; p.y = P.y; p.vx = p.vy = 0; p.air = false; p.inW = false; p.ground = null; p.face = 1; p.dive = false;
  return true;
}
function brKey(p){
  if(!BR || BR.home || Q.st !== 'go') return;
  const J = p.role === 'jump' ? p : Q.mode === 'solo' ? rsBoth().find(o => o.role === 'jump') : null;
  if(!J){ if(p === Q.me && now - (Q.heavyT || 0) > 3){ Q.heavyT = now; floatText(L('Рулит Прыгун ⬆️ — а ты греби 🚣', 'The jumper steers ⬆️ — you row 🚣'), rsAt(p.x, p.y + 1.5, BR.z)); } return; }
  brHop(-BR.side);
}
function brHop(s, remote){
  const T = BR; if(!T || T.home || (T.hop && T.hop.k < 0.55)) return;
  if(T.side === s && !T.hop) return;
  T.side = s; T.hop = {k:0, from:T.jz, to:s*0.62}; T.myHop = remote ? T.myHop : now;
  sfx.boing();
  const J = rsBoth().find(o => o.role === 'jump');
  if(J) burst(TEX.puff, rsAt(J.x, BR_TOP + 0.1, T.z + T.jz), 6, 1.2, 0.3);
  if(!remote && Q.mode === 'net') netSend({t:'qbhop', s});
}
const brJumpMine = () => { const J = rsBoth().find(o => o.role === 'jump'); return !J || rsLocal(J); };
const brHost = () => Q.mode !== 'net' || net.host;

/* ---------- гребля ---------- */
function brRow(p, remoteGood){
  const T = BR; if(!T || T.home || Q.st !== 'go') return;
  if(remoteGood !== undefined){ brPush(remoteGood); return; }   // гребок гостя — у хозяина
  if(T.rowCd > 0) return;
  T.rowCd = BR_CD;
  const ph = (T.t - T.t0)/BR_BEAT, n = Math.round(ph), off = Math.abs(ph - n)*BR_BEAT;
  const good = off < BR_WIN && n !== T.lastBeat;
  const S = rsBoth().find(o => o.role === 'strong'), mine = p === Q.me || Q.mode === 'solo';
  if(good){ T.lastBeat = n; T.streak++; } else T.streak = 0;
  T.oarT = 0.35;
  sfx[good ? 'pop' : 'plop']();
  if(S) burst(TEX.puff, rsAt(S.x - 0.6, RS_WS + 0.1, T.z + 0.9), good ? 7 : 3, 1.3, 0.25);
  if(mine && T.beat){ const c = good ? 'hit' : 'miss'; T.beat.classList.remove('hit', 'miss'); void T.beat.offsetWidth; T.beat.classList.add(c); }
  if(good && T.streak === 4 && S && mine) floatText(L('В такт! ⭐', 'In rhythm! ⭐'), rsAt(S.x, BR_TOP + 1.6, T.z), '#D9527E');
  if(brHost()) brPush(good, T.streak >= 3);
  else netSend({t:'qbrow', g:good ? (T.streak >= 3 ? 2 : 1) : 0});
}
function brPush(good, combo){
  const T = BR; if(!T || T.home) return;
  if(good === 2){ good = true; combo = true; }
  T.v = Math.min(BR_VMAX, Math.max(T.v, 0) + (good ? (combo ? BR_GOOD3 : BR_GOOD) : BR_WEAK));
}

/* ---------- льдина плывёт (у хозяина), айсберги ---------- */
function brHit(x, z){ return BRW.bergs.find(b => Math.abs(x - b.x) < BR_W/2 + BR_BX && Math.abs(z - b.l*BR_LANE) < BR_CZ); }
function brSim(dt){
  const T = BR;
  T.v *= Math.exp(-BR_DRAG*dt);
  const tz = T.side*BR_LANE;
  let nz = T.z + Math.sign(tz - T.z)*Math.min(Math.abs(tz - T.z), BR_ZV*dt);
  if(brHit(T.x, nz) && !brHit(T.x, T.z)) nz = T.z;   // айсберг сбоку — ждём посередине
  T.z = nz;
  let nx = T.x + T.v*dt;
  const b = brHit(nx, T.z);
  if(b && !brHit(T.x, T.z) && nx > T.x){
    nx = b.x - BR_BX - BR_W/2 - 0.02;
    if(T.v > 0.35){ nx -= 0.35; T.v = -0.7; brBump(b.i); } else T.v = 0;
  }
  T.x = Math.max(BR_X0 - 1, nx);
  if(T.x >= BR_END){ T.x = BR_END; brHome(); }
}
function brBump(i, remote){
  const T = BR, b = BRW.bergs[i]; if(!T || !b) return;
  T.bumpT = 0.6; b.sq = 1; sfx.thud(); T.streak = 0;
  burst(TEX.puff, rsAt(b.x - BR_BX, BR_TOP + 0.3, b.l*BR_LANE), 10, 1.8, 0.4);
  floatText(L('Бум!', 'Bump!'), rsAt(b.x - 0.6, BR_TOP + 2.0, b.l*BR_LANE), '#D9527E');
  if(!remote && Q.mode === 'net') netSend({t:'qbb', i});
  const me = Q.me, canSteer = me.role === 'jump' || Q.mode === 'solo';
  if(now - T.sayT > 4){
    T.sayT = now;
    const n = Q.pal && !Q.pal.gone ? Q.pal.name : '';
    mgHint(canSteer ? L('Бум! Айсберг в нашей полосе — ⬆️ Прыгун на другой край, и льдина отвернёт!', 'Bump! An iceberg in our lane — ⬆️ the jumper hops to the other side, and the floe turns!')
      : L(`Бум! ${n || 'Прыгун'} перепрыгнет на другой край — льдина отвернёт. Тогда греби 🚣`, `Bump! ${n || 'The jumper'} hops to the other side — the floe turns. Then row 🚣`));
    Q.hintT = now + 4;
  }
}
// доплыли: все перепрыгивают на домашнюю льдину, папа малыша встречает, фото
async function brHome(remote){
  const T = BR; if(!T || T.home) return;
  T.home = true; T.v = 0; Q.st = 'end';
  if(!remote && Q.mode === 'net') netSend({t:'qbhome', x:+T.x.toFixed(2)});
  const q = Q, H = BR_HOME;
  if(T.beat) T.beat.hidden = true;
  sfx.good(); sfx.sparkle(); mgHint(L('Приплыли! Вот их дом 🏠', 'We\'re here! That\'s their home 🏠'));
  floatText(L('Папа!', 'Dad!'), rsAt(H.spots.pup, BR_TOP + 1.6, 0.2), '#D9527E');
  sfx.mama();
  Q.photoX = (H.spots.strong + H.spots.dad)/2; Q.photoY = BR_TOP + 1.0;
  await tween(1.6, k => { if(BR === T) T.hk = k; }, t => t);
  if(Q !== q) return;
  sfx.thud(); setMood(T.dad.s, 'happy'); setMood(T.mom.s, 'happy'); if(Q.pup) setMood(Q.pup.s, 'happy');
  burst(TEX.heart, rsAt(H.spots.mom, BR_TOP + 1.2, 0.2), 18, 2.4, 0.34); sfx.hug();
  floatText(L('Вы дома! 💗', 'You\'re home! 💗'), rsAt(H.spots.dad, BR_TOP + 2.0, 0.2), '#D9527E');
  await wait(1.2); if(Q !== q) return;
  const a = Q.me, b = Q.pal && !Q.pal.gone ? Q.pal : null;
  floatText(L('Спасибо, спасатели! ✋', 'Thank you, rescuers! ✋'), rsAt(H.spots.jump, BR_TOP + 2.4, 0.2), '#D9527E');
  burst(TEX.star, rsAt(H.spots.jump, BR_TOP + 1.2, 0.3), 16, 2.4, 0.3);
  for(const p of [a, b]) if(p){ p.m.flap = 1; setMood(p.m, 'happy'); }
  await wait(2.0); if(Q !== q) return;
  Q.end = 'win';
}

/* ---------- кадр ---------- */
function brStep(dt){
  const T = BR;
  T.t += dt; T.rowCd -= dt; T.bumpT = Math.max(0, T.bumpT - dt); T.oarT = Math.max(0, T.oarT - dt);
  if(T.hop){ T.hop.k = Math.min(1, T.hop.k + dt/0.42); T.jz = T.hop.from + (T.hop.to - T.hop.from)*T.hop.k; if(T.hop.k >= 1){ T.hop = null; sfx.thud(); } }
  if(T.home) return;
  if(brHost()){
    brSim(dt);
    if(Q.mode === 'net' && (T.sendT -= dt) <= 0){ T.sendT = 0.1; netSend({t:'qbt', x:+T.x.toFixed(3), z:+T.z.toFixed(3), v:+T.v.toFixed(3), s:T.side}); }
  } else {
    T.nx += T.v*dt; T.x += (T.nx - T.x)*Math.min(1, dt*8); T.z += (T.nz - T.z)*Math.min(1, dt*8);
  }
}
function brDraw(dt){
  const T = BR, F = BRW.floe;
  F.position.copy(rsAt(T.x, BR_TOP, T.z));
  const tilt = (T.side*BR_LANE - T.z)*0.06 + (T.hop ? 0 : T.side*0.03);
  F.rotation.x += (tilt - F.rotation.x)*Math.min(1, dt*6);
  F.rotation.z = T.bumpT > 0 ? Math.sin(T.bumpT*28)*0.05*T.bumpT : Math.sin(now*1.7)*0.012;
  const ok = T.oarT > 0 ? Math.sin((1 - T.oarT/0.35)*Math.PI) : 0;
  BRW.oar.position.set(-1.75 - ok*0.3, 0.5, 0.95); BRW.oar.rotation.z = 0.35 - ok*0.9;
  BRW.flag.rotation.y = Math.sin(now*4)*0.3;
  // тюлени, мама и малыш — на своих местах (поверх rsDraw / rsMomDraw / rsPupStep)
  for(const p of [Q.me, Q.pal]) if(p && !p.gone){
    const P = brSpot(p.role); p.m.root.position.copy(rsAt(P.x, P.y, P.z));
    p.m.root.rotation.z = 0; p.m.swimming = false; p.m.flap = (p.role === 'strong' && T.oarT > 0) || (p.role === 'jump' && T.hop) || T.home ? 1 : 0;
    p.ic.position.copy(rsAt(P.x, P.y + 1.35, P.z)); p.bubO.visible = false;
  }
  const M = brSpot('mom'), Pp = brSpot('pup');
  T.mom.s.root.position.copy(rsAt(M.x, M.y, M.z)); T.mom.s.root.rotation.y = T.home ? -0.9 : 0.6;
  if(Q.pup){ Q.pup.s.root.position.copy(rsAt(Pp.x, Pp.y, Pp.z)); Q.pup.s.root.rotation.y = T.home ? -0.4 : 0.9; Q.pup.s.flap = 1; }
  const D = T.dad.s; D.root.position.copy(rsAt(BR_HOME.spots.dad, BR_TOP + (T.home ? 0 : Math.abs(Math.sin(now*3))*0.08), 0.15)); updateSeal(D, now, dt);
  if(!T.home && Math.random() < dt*3) floatText('👋', rsAt(BR_HOME.spots.dad, BR_TOP + 1.5, 0.15));
  // айсберги: дышат, наш близкий — с ❗
  const next = BRW.bergs.find(b => b.x + BR_BX > T.x - BR_W/2);
  for(const b of BRW.bergs){
    b.sq = Math.max(0, b.sq - dt*2.5);
    b.g.scale.set(1 + b.sq*0.15, 1 - b.sq*0.12 + Math.sin(now*1.6 + b.i)*0.02, 1 + b.sq*0.15);
    const gap = b.x - BR_BX - (T.x + BR_W/2);
    b.ex.visible = !T.home && b === next && gap < 6 && gap > -0.5 && Math.abs(T.side*BR_LANE - b.l*BR_LANE) < BR_CZ;
    if(b.ex.visible) b.ex.position.y = 1.9 + Math.abs(Math.sin(now*6))*0.15;
  }
  if(T.v > 0.6 && Math.random() < dt*T.v*4) emit(TEX.puff, rsAt(T.x + BR_W/2, RS_WS + 0.08, T.z + (Math.random() - 0.5)*BR_D), {v:new V3(-0.5, 0.4, 0), life:0.5, size:0.2});
  brBeatUi();
}
function brBeatUi(){
  const T = BR, el = T.beat; if(!el) return;
  const S = rsBoth().find(o => o.role === 'strong'), on = Q.st === 'go' && !T.home && S && (Q.me.role === 'strong' || Q.mode === 'solo');
  el.hidden = !on; if(!on) return;
  const P = brSpot('strong'), q = toScreen(rsAt(P.x, P.y + 0.45, P.z));
  el.style.transform = `translate(${q.x}px, ${q.y}px)`;
  const ph = ((T.t - T.t0)/BR_BEAT) % 1, k = ph < 0 ? 1 + ph : ph;
  el.style.setProperty('--r', (1 + 1.3*(1 - k)).toFixed(3));
  el.querySelector('b').textContent = T.streak > 1 ? `×${T.streak}` : '';
}

/* ---------- Пинг «в ногу» ---------- */
function brAhead(z){   // сколько метров до ближайшего айсберга в полосе z (Infinity — чисто)
  let best = Infinity;
  for(const b of BRW.bergs){ const gap = b.x - BR_BX - (BR.x + BR_W/2); if(gap > -0.3 && Math.abs(z - b.l*BR_LANE) < BR_CZ) best = Math.min(best, gap); }
  return best;
}
function brAI(p){
  const T = BR;
  if(T.home) return {tx:p.x, far:true};
  if(p.role === 'strong'){
    // гребёт в такт, только пока впереди чисто: у айсберга ждёт, когда Прыгун отвернёт
    const clear = brAhead(T.z) > 2.0 && brAhead(T.side*BR_LANE) > 1.0;
    const ph = (T.t - T.t0)/BR_BEAT, n = Math.round(ph), off = Math.abs(ph - n)*BR_BEAT;
    if(clear && off < 0.04 && n !== T.aiBeat && T.rowCd <= 0){ T.aiBeat = n; return {tx:p.x, act:'row', far:true}; }
    if(!clear && Q.mode !== 'solo' && now - (T.waitSay || 0) > 5 && Q.me.role === 'jump'){ T.waitSay = now; floatText(L('Рули! ⬆️', 'Steer! ⬆️'), rsAt(p.x, p.y + 1.6, T.z), '#3E8DB8'); }
    return {tx:p.x, far:true};
  }
  // Прыгун: наш айсберг ближе 5 м, а в другой полосе дальше — на другой край
  const here = brAhead(T.side*BR_LANE), jump = !T.hop && here < 5 && brAhead(-T.side*BR_LANE) > here;
  return {tx:p.x, jump, far:true};
}

/* ---------- подсказки ---------- */
function brSec(){ return BR.x > BR_END - 9 ? 52 : 50; }
function brHint(sec, role){
  const solo = Q.mode === 'solo', J = role === 'jump', n = Q.pal && !Q.pal.gone && !solo ? Q.pal.name : '';
  if(sec === 52) return L('Вон их дом! Ещё чуть-чуть 🚣', 'There\'s their home! Almost there 🚣');
  if(solo) return L('Плывём домой! 🚣 — гребёт Силач (жми, когда кружок сойдётся), ⬆️ — Прыгун перепрыгивает на другой край, и льдина отворачивает от айсбергов', 'Sailing home! 🚣 — the strong one rows (tap when the ring closes), ⬆️ — the jumper hops to the other side and the floe turns away from icebergs');
  return J ? L(`Плывём домой! ${n} гребёт, а ты рулишь: айсберг впереди ❗ — жми ⬆️, перепрыгнешь на другой край, и льдина отвернёт`, `Sailing home! ${n} rows, and you steer: an iceberg ahead ❗ — press ⬆️, hop to the other side and the floe turns`)
    : L(`Плывём домой! Греби 🚣 — жми, когда кружок сойдётся: в такт сильнее. ${n} рулит от айсбергов`, `Sailing home! Row 🚣 — tap when the ring closes: in rhythm is stronger. ${n} steers away from icebergs`);
}

/* ---------- сеть ---------- */
function brWire(){
  netOn('qbt', m => { const T = BR; if(!T || T.q !== Q || T.home || brHost()) return;
    if(Number.isFinite(+m.x)){ T.nx = +m.x; T.nz = +m.z; T.v = +m.v || 0; }
    if(!brJumpMine() && (m.s === 1 || m.s === -1) && m.s !== T.side) brHop(m.s, true);
  });
  netOn('qbhop', m => { if(brOn() && (m.s === 1 || m.s === -1)) brHop(m.s, true); });
  netOn('qbrow', m => { if(brOn() && brHost()) brRow(null, +m.g || 0); });
  netOn('qbb', m => { if(brOn()) brBump(+m.i, true); });
  netOn('qbhome', m => { if(brOn()){ if(Number.isFinite(+m.x)) BR.x = +m.x; brHome(true); } });
}

/* ---------- оборачиваем Бухту ---------- */
{
  const Lv = RS_LVS.bay;
  const o = {build:Lv.build, reset:Lv.reset, step:Lv.step, ai:Lv.ai, sec:Lv.sec, hint:Lv.hint, cam:Lv.cam, draw:Lv.draw, wire:Lv.wire, clean:Lv.clean, tap:Lv.tap, say:Lv.say};
  Lv.build = function(){ o.build.call(this); brBuild(); };
  Lv.reset = function(...a){ const r = o.reset.apply(this, a); brReset(); return r; };
  Lv.won = brBoard;   // rsWin: мама нашлась — дальше не фото, а льдина домой
  Lv.climb = (p, dt) => brOn() ? brSeal(p, dt) : false;
  Lv.act = me => brOn() && !BR.home && (me.role === 'strong' || Q.mode === 'solo') ? {k:'row', ic:'🚣', aria:L('Грести', 'Row')} : null;
  Lv.doAct = (p, k) => { if(k === 'row' && brOn()) brRow(p); };
  Lv.step = function(dt, go){ o.step.call(this, dt, go); if(brOn()) brStep(dt); };
  Lv.ai = (p, dt) => brOn() ? brAI(p) : o.ai(p, dt);
  Lv.sec = p => brOn() ? brSec() : o.sec(p);
  Lv.hint = (sec, role) => sec >= 50 && brOn() ? brHint(sec, role) : o.hint(sec, role);
  Lv.cam = () => brOn() ? (BR.home ? [Q.photoX, Q.photoY, 1, 2] : [BR.x + 1.6 + Math.max(0, BR.v)/3, -0.6, 1.0, 5.5]) : o.cam ? o.cam() : null;   // сверху — видно обе полосы
  Lv.draw = function(dt){ o.draw.call(this, dt); if(brOn()) brDraw(dt); };
  Lv.wire = () => { if(o.wire) o.wire(); brWire(); };
  Lv.clean = () => { if(BR && BR.dad && BR.dad.s.root.parent) BR.dad.s.root.parent.remove(BR.dad.s.root); BR = null; if(o.clean) o.clean(); };
  Lv.tap = near => {   // касание по экрану: Силачу — гребок, Прыгуну — на другой край
    if(brOn() && !BR.home && Q.st === 'go'){ if(Q.me.role === 'strong' || Q.mode === 'solo') brRow(Q.me); else brKey(Q.me); return true; }
    return o.tap ? o.tap(near) : false;
  };
  Lv.say = () => L('Тюленёнок застрял во льду: плиты, качели, ледяная стена, мама по приметам — а в конце отвезти их домой на льдине 🛶!', 'A seal pup is stuck in the ice: plates, a seesaw, an ice wall, mum by the clues — and at the end, take them home on an ice floe 🛶!');
}
