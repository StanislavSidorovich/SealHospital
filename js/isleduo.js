/* ---------------- 🗺️ Остров вдвоём — «Остров в гостях» 2.0 (Спринт 7, задача 4; просьба папы 30.09) ----------------
   Папа (гость) пришёл в гости («Остров в гостях», js/visit.js, или по «двери»), а Сабрина гуляет по острову — папин тюлень
   гуляет вместе с ней по всему острову, тем же управлением (js/roam.js). Хозяйка острова ведёт: она на острове — гость тоже там
   (vh.w = 'isle'), ушла домой — гость снова на льдине. Позвали по «двери», пока она гуляла, — папа сразу приплывает на остров.
   Вместе: видно друг друга с именами, касание по второму — сердечки и подойти к нему; 🏃 салки (водит тот, кто нажал;
   осалить — подбежать вплотную, решает хозяйка); 🐢 в воде — забраться второму на спинку и кататься (⤴ — спрыгнуть);
   у знака игры, в которую можно вдвоём, — «🎮 Вместе ▶» (приглашение, как 🎮), после игры оба снова на острове;
   гость видит звёздочки хозяйки: сам не берёт, а показывает — у неё над звёздочкой встаёт розовый луч. Фото «В гостях» — и на острове.
   Рыбалка и пещера — только у себя: ключей гость не видит, хозяйка в пещере — над входом 🗝️ и её имя, стрелка туда, гость ждёт;
   рыбачит — 🎣 над ней (islFish → iduFishBeat шлёт 'ip' и во время охоты, флаг fi).
   Сеть (поверх визита): 'ip' — где я на острове (оба, 10 раз/с), 'ig' — звёздочки хозяйки, 'ist' — гость нашёл звёздочку,
   'ihug' — обнял, 'itag' — салки {it:'h'|'g'|'', n} (гость просит {want:1}), 'iride' — {on} катаюсь у тебя на спинке.
   Каждый у себя сажает наездника на спину своему тюленю — без задержки сети.
   Крючки: island.js — isleGo({guest, at}), islStep → iduStep/iduRideStep/iduNear, islHit → iduHit, islGoShow → iduGoShow,
   звёздочки — islGot(); visit.js — vsWire → iduWire, visitTick → iduTick, vsWhere → 'isle', vsStart уходит с острова и возвращается.
   Подключается после island.js и visit.js, до game.js. */
const IDU_SEND = 0.1;                  // как часто шлём, где мы
const IDU_TAG_R = 1.35, IDU_TAG_CD = 2.2;   // салки: насколько близко — «осалил», и сколько секунд нельзя осалить обратно
const IDU_RIDE_R = 2.4;                // как близко подплыть, чтобы забраться на спинку
const IDU_LIFT = 0.34;                 // насколько всплывает тот, кто везёт (иначе спинка под водой и наездник «сидит на воде»)
const IDU_FAR = 14;                    // дальше — стрелка, где второй
const IDU_PHOTO_R = 3.2;               // фото, когда стоите рядом на суше
const IDU_GAME = {chase:'chase', dive:'dive', road:'road', rescue:'rescue', slide:'slide', storm:'storm'};   // знак на острове → игра вдвоём
const iduOn = () => !!(typeof V !== 'undefined' && V && typeof ISL !== 'undefined' && ISL && (ISL.guest || V.role === 'host'));
const iduPal = () => V.role === 'host' ? V.s : V.pup;   // тюлень второго
const iduMe = () => V.role === 'host' ? 'h' : 'g';
const iduR2 = x => Math.round(x*100)/100;

/* ---------- сеть ---------- */
function iduWire(){
  netOn('ip', iduTake);
  netOn('ig', m => {
    if(!V || !Array.isArray(m.got)) return;
    const got = m.got.filter(i => Number.isInteger(i)), key = got.join(',');
    if(key === (V.igot || []).join(',')) return;
    V.igot = got;
    if(iduOn() && ISL.guest){ islStarsShow(); islHud(); }
  });
  netOn('ist', m => iduStarBeam(m.i | 0));
  netOn('ihug', () => {
    if(!iduOn()) return;
    const s = ISL.s; burst(TEX.heart, headTop(s), 12, 2, 0.3); sfx.purr(); squash(s, 0.15, 0.35);
    if(!V.ihug){ V.ihug = true; toast(L(`${V.name} обнимает тебя! 💗`, `${V.name} gives you a hug! 💗`), 2600); }
  });
  netOn('itag', m => {
    if(!V) return;
    if(m.want){ if(V.role === 'host' && !V.tag && iduOn()){ iduTagSet({it:'g', n:0}); iduTagSend(); } return; }
    iduTagSet(m.it === 'h' || m.it === 'g' ? {it:m.it, n:m.n | 0} : null);
  });
  netOn('iride', m => {
    if(!V) return;
    if(m.on){
      if(V.ride === 'me' && V.role === 'host') return;   // забрались друг на друга одновременно — наездник тот, кто хозяйка
      V.ride = 'pal'; sfx.boing();
      toast(L(`${V.name} катается у тебя на спинке! 🐢 Плыви!`, `${V.name} is riding on your back! 🐢 Swim!`), 2800);
    } else if(V.ride === 'pal'){ V.ride = null; const q = V.ip; if(q) q.snap = true; }
  });
}
function iduTake(m){
  if(!V) return;
  const q = V.ip || (V.ip = {p:new V3(), v:new V3(), t:-9, r:0, ix:0, iy:0, iz:0, sw:false, f:0, cv:false});
  const np = new V3(+m.x || 0, +m.y || 0, +m.z || 0), gap = now - q.t;
  if(gap > 0.02 && gap < 1) q.v.copy(np).sub(q.p).divideScalar(gap).clampLength(0, 16); else q.v.set(0, 0, 0);
  if(gap >= 1) q.snap = true;
  q.p.copy(np); q.r = +m.r || 0; q.ix = +m.ix || 0; q.iy = +m.iy || 0; q.iz = +m.iz || 0; q.sw = !!m.sw; q.f = +m.f || 0; q.cv = !!m.cv; q.fi = !!m.fi; q.t = now;
}
function iduSend(){
  const R = ISL.R, s = ISL.s;
  netSend({t:'ip', x:iduR2(R.pos.x), y:iduR2(R.pos.y), z:iduR2(R.pos.z), r:iduR2(R.yaw), ix:iduR2(s.inner.rotation.x), iy:iduR2(s.inner.position.y),
    iz:iduR2(s.inner.rotation.z), sw:s.swimming ? 1 : 0, f:iduR2(s.flap || 0), cv:ISL.cave ? 1 : 0, fi:ISL.fishing ? 1 : 0});
}
// рыбачу: islStep стоит (mgStash), а второй должен видеть, где я, — шлём сами, пока не кончится (зовёт islFish)
function iduFishBeat(){
  if(!iduOn() || !ISL.duo) return;
  const t = setInterval(() => { if(!iduOn() || !ISL.duo || !ISL.fishing){ clearInterval(t); return; } iduSend(); }, 300);
}
const iduTagSend = () => netSend({t:'itag', it:V.tag ? V.tag.it : '', n:V.tag ? V.tag.n : 0});

/* ---------- начало и конец ---------- */
function iduStart(){
  const I = ISL, pal = iduPal();
  pal.root.visible = false;
  let lbl = V.role === 'host' ? V.s.lbl : null;
  if(!lbl){ lbl = textSprite(V.name, '#3E8DB8'); scene.add(lbl); }
  lbl.scale.set(2.3, 0.86, 1); lbl.visible = false;
  const tagSp = new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTex('✋'), transparent:true, depthWrite:false})); tagSp.scale.setScalar(0.95); tagSp.visible = false; scene.add(tagSp);
  const waitTex = {cave:emojiTex('🗝️'), fish:emojiTex('🎣')};
  const waitSp = new THREE.Sprite(new THREE.SpriteMaterial({map:waitTex.cave, transparent:true, depthWrite:false})); waitSp.scale.setScalar(1.3); waitSp.visible = false; scene.add(waitSp);
  const bar = mgNode('div', 'idu-bar', `
    <button class="round vs-play" aria-label="${L('Играем вместе', 'Play together')}">🎮</button>
    <button class="round idu-tag" aria-label="${L('Салки', 'Tag')}">🏃</button>
    <button class="round co-heart" aria-label="${L('Сердечко', 'A heart')}">💗</button>
    <button class="round co-mic" aria-label="${L('Микрофон', 'Microphone')}">🎤</button>`);
  bar.querySelectorAll('button').forEach(b => mgOn(b, 'pointerdown', e => e.stopPropagation()));
  mgOn(bar.querySelector('.vs-play'), 'click', () => { if(!V) return; if(V.inv && !V.panel){ sfx.tap(); return vsInvite(); } vsPick(); });
  mgOn(bar.querySelector('.idu-tag'), 'click', iduTagBtn);
  mgOn(bar.querySelector('.co-heart'), 'click', vsHeart);
  vsMic(bar.querySelector('.co-mic'));
  const arrow = mgNode('div', 'isl-arrow idu-arrow', '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 L20 20 L12 15.5 L4 20Z" fill="#FF9BB8" stroke="#3B3A4A" stroke-width="2.2" stroke-linejoin="round"/></svg>');
  arrow.hidden = true;
  I.duo = {v:V, lbl, ownLbl:V.role !== 'host', tagSp, waitSp, waitTex, waitK:'', inCave:false, bar, arrow, sendT:0, igT:0, awayT:0, photoT:0, rideO:{duo:'ride'}, offO:{duo:'off'}, beams:[], stSeen:new Set(), landT:0};
  V.tag = null; V.ride = null;
  if(V.role === 'host') toast(L(`${V.name} гуляет с тобой по острову! 🏃 — салки, в воде — покатай на спинке 🐢`, `${V.name} is walking the island with you! 🏃 — tag, in the water — give a ride on your back 🐢`), 4200);
  else {
    mgHint(L('🗺️ Гуляем вместе! 🏃 — салки, а в воде — на спинку 🐢', `🗺️ Walking with ${V.name}! 🏃 — tag, and in the water — ride on each other's back 🐢`));
    setTimeout(() => { if(iduOn() && mgHintEl.textContent.startsWith('🗺️')) mgHint(''); }, 6000);
  }
}
function iduEnd(){
  const I = typeof ISL !== 'undefined' && ISL, D = I && I.duo; if(!D) return;
  I.duo = null;
  scene.remove(D.tagSp); scene.remove(D.waitSp);
  if(D.ownLbl) scene.remove(D.lbl); else { D.lbl.scale.set(0.85, 0.32, 1); D.lbl.visible = false; }
  D.bar.remove(); D.arrow.remove();
  for(const b of D.beams) islRoot.remove(b.m);
  if(mgHintEl && /✋|🏃/.test(mgHintEl.textContent)) mgHint('');
  const v = D.v; v.tag = null; v.ride = null;
  const pal = v.role === 'host' ? v.s : v.pup; if(pal){ pal.root.visible = false; pal.swimming = false; pal.inner.rotation.set(0, 0, 0); pal.inner.position.set(0, 0, 0); }
}

/* ---------- гость: хозяйка ушла гулять — идём за ней; вернулась домой — и мы на льдину ---------- */
function iduTick(){
  const v = V;
  if(!v || v.role !== 'guest' || v.game || v.panel || v.isleBusy || !v.view || v.arr) return;
  if(v.h && v.h.w === 'isle' && !(typeof ISL !== 'undefined' && ISL)) iduGuestEnter();
}
async function iduGuestEnter(){
  const v = V; v.isleBusy = true;
  const q = v.ip, near = q && now - q.t < 3 && !q.cv;
  const at = near ? {x:q.p.x + 1.8, z:q.p.z + 1.6} : null;
  vsGuestView(false);
  v.me.root.visible = true;
  try{ await isleGo(v.me, {guest:true, at}); }catch(e){ console.error(e); }
  v.isleBusy = false;
  if(V === v && !v.game) vsGuestView(true);
}

/* ---------- кадр (зовёт islStep) ---------- */
function iduStep(dt){
  const I = ISL;
  if(!iduOn() || (I.duo && I.duo.v !== V)){ if(I.duo) iduEnd(); return; }
  if(!I.duo) iduStart();
  const D = I.duo, pal = iduPal(), q = V.ip;
  // гость: хозяйка ушла с острова — и мы домой, на льдину
  if(I.guest){
    if(!V.h || V.h.w !== 'isle'){ if((D.awayT += dt) > 0.8 && !V.game){ D.awayT = -99; I.done(null); return; } } else D.awayT = 0;
    if(V.h && +V.h.sc) pal.root.scale.setScalar(+V.h.sc);
  }
  if((D.sendT -= dt) <= 0){ D.sendT = IDU_SEND; iduSend(); }
  if(V.role === 'host' && (D.igT -= dt) <= 0){ D.igT = 1; netSend({t:'ig', got:save.isl.got}); }
  // где второй: в своём мире (в пещере — не видно)
  const same = !!q && now - q.t < 2.5 && q.cv === !!I.cave;
  if(V.ride === 'pal' && same && !I.cave) iduCarry(pal, dt);
  else if(V.ride !== 'me') iduFollow(pal, q, dt, same);
  // везу второго — всплываю спинкой над водой (roamPose в воде высоту не трогает, вернём сами)
  const lift = V.ride === 'pal' && I.R.water && !I.R.air ? IDU_LIFT : 0, me = I.s;
  if(lift || (I.R.water && me.inner.position.y > 0.01)) me.inner.position.y += (lift - me.inner.position.y)*Math.min(1, dt*6);
  D.lbl.visible = pal.root.visible;
  if(pal.root.visible) D.lbl.position.copy(headTop(pal)).add(new V3(0, 0.55, 0));
  const wait = iduWaitStep(q);
  // наездник спрыгнул сам (второй вышел на сушу или пропал)
  if(V.ride === 'me' && (!same || !q.sw)){ if((D.landT += dt) > 0.7) iduRideOff(true); } else D.landT = 0;
  if(V.ride && (I.cave || I.fishing)) iduRideOff(true);
  iduTagStep(dt, pal, same);
  iduArrow(same && pal.root.visible ? pal.root.position : wait === 'cave' ? iduMouth() : null);
  iduPhotoStep(dt, pal, same);
  for(const b of D.beams){ b.t -= dt; b.m.material.opacity = Math.max(0, Math.min(1, b.t/2))*(0.24 + Math.sin(now*3)*0.08); if(b.t <= 0 || save.isl.got.includes(b.i)){ islRoot.remove(b.m); b.dead = true; } }
  if(D.beams.some(b => b.dead)) D.beams = D.beams.filter(b => !b.dead);
}
// второй тюлень: плавно догоняет присланную точку (чуть вперёд по скорости — сеть запаздывает)
function iduFollow(s, q, dt, vis){
  s.root.visible = vis; if(!vis) return;
  const age = now - q.t, tgt = ISL_POS.clone().add(q.p).addScaledVector(q.v, Math.min(0.12, age));
  if(q.snap || s.root.position.distanceTo(tgt) > 8){ s.root.position.copy(tgt); q.snap = false; }
  else s.root.position.lerp(tgt, Math.min(1, dt*12));
  const k = Math.min(1, dt*14);
  s.root.rotation.set(0, s.root.rotation.y + vsAng(s.root.rotation.y, q.r)*Math.min(1, dt*10), 0);
  s.inner.rotation.x += vsAng(s.inner.rotation.x, q.ix)*k; s.inner.rotation.z += (q.iz - s.inner.rotation.z)*k;
  s.inner.position.y += (q.iy - s.inner.position.y)*k;
  s.swimming = q.sw; s.flap = q.f;
  updateSeal(s, now, dt);
}
// второй катается у меня на спинке: сажаю его сама, прямо на своего тюленя
const iduBack = (base, yaw) => new V3(-Math.sin(yaw)*0.12, 0.5*base.root.scale.x/0.66 + base.inner.position.y, -Math.cos(yaw)*0.12);
function iduCarry(pal, dt){
  const me = ISL.s, yaw = me.root.rotation.y;
  pal.root.visible = true;
  pal.root.position.copy(me.root.position).add(iduBack(me, yaw));
  pal.root.rotation.set(0, yaw, 0); pal.inner.rotation.set(-0.12, 0, 0); pal.inner.position.y = 0;
  pal.swimming = false; pal.flap = 0.55;
  updateSeal(pal, now, dt);
}
// я катаюсь у второго на спинке (зовёт islStep вместо roamStep): true — шаг сделан здесь
function iduRideStep(dt){
  if(!iduOn() || V.ride !== 'me') return false;
  const I = ISL, R = I.R, s = I.s, pal = iduPal(), q = V.ip;
  if(!q || now - q.t > 2.5 || q.cv){ iduRideOff(true); return false; }
  if(R.jumpQ){   // ⤴ — спрыгнуть: лёгкий прыжок вбок, дальше как обычно
    iduRideOff(true);
    const sd = new V3(Math.cos(R.yaw), 0, -Math.sin(R.yaw)); R.pos.addScaledVector(sd, 0.6);
    return false;
  }
  iduFollow(pal, q, dt, true);
  const yaw = pal.root.rotation.y;
  R.pos.copy(pal.root.position).sub(ISL_POS).add(iduBack(pal, yaw)); R.vel.set(0, 0, 0); R.air = false; R.vy = 0; R.slide = 0; R.yaw = yaw;
  R.hold = false; R.tgt = null; R.goal = null;
  s.root.position.copy(ISL_POS).add(R.pos); s.root.rotation.set(0, yaw, 0);
  s.swimming = false; s.flap = 0.55; s.inner.rotation.set(-0.12, 0, 0); s.inner.position.y = 0;
  roamCam(R, dt);
  return true;
}
function iduRideOn(){
  if(!iduOn() || V.ride) return;
  V.ride = 'me'; netSend({t:'iride', on:1});
  sfx.boing(); squash(ISL.s, 0.2, 0.3);
  floatText(L('Поехали!', 'Off we go!'), headTop(ISL.s), '#D9527E');
  mgHint(L('🐢 Катаешься на спинке! ⤴ — спрыгнуть', `🐢 Riding on ${V.name}'s back! ⤴ — hop off`));
  setTimeout(() => { if(iduOn() && mgHintEl.textContent.startsWith('🐢')) mgHint(''); }, 4000);
  ISL.near = null;
}
function iduRideOff(send){
  if(!V || V.ride !== 'me') return;
  V.ride = null; if(send) netSend({t:'iride', on:0});
  const I = ISL; if(!I) return;
  const R = I.R; R.air = true; R.vy = ROAM_JV*0.7; I.s.flap = 1; sfx.splash();
  burst(TEX.puff, ISL_POS.clone().add(R.pos), 8, 1.4, 0.4);
  if(mgHintEl.textContent.startsWith('🐢')) mgHint('');
  I.near = null;
}
// рядом в воде — «🐢 На спинку ▶»; катаюсь — «🌊 Спрыгнуть ▶» (зовёт islStep)
function iduNear(nd){
  if(!iduOn() || !ISL.duo || ISL.cave || ISL.fishing) return null;
  const D = ISL.duo;
  if(V.ride === 'me') return D.offO;
  if(V.ride || V.tag) return null;
  const R = ISL.R, q = V.ip, pal = iduPal();
  if(!pal.root.visible || !q || !q.sw || !R.water || R.air) return null;
  const d = pal.root.position.distanceTo(ISL_POS.clone().add(R.pos));
  return d < Math.min(nd + 0.5, IDU_RIDE_R) ? D.rideO : null;
}

/* ---------- 🏃 салки ---------- */
function iduTagBtn(){
  if(!iduOn()) return;
  sfx.tap();
  if(V.tag){ iduTagSet(null); iduTagSend(); return; }
  if(V.ride) iduRideOff(true);
  if(V.role === 'host'){ iduTagSet({it:'h', n:0}); iduTagSend(); }
  else netSend({t:'itag', want:1});
}
function iduTagSet(t){
  const prev = V.tag; V.tag = t;
  if(t) t.cd = prev && prev.it === t.it ? prev.cd : IDU_TAG_CD;
  if(!iduOn() || !ISL.duo) return;
  const bt = ISL.duo.bar.querySelector('.idu-tag'); bt.classList.toggle('on', !!t);
  if(!t){ if(prev){ mgHint(L('Салки — всё! Здорово побегали 🏃', 'Tag is over! What a run 🏃')); setTimeout(() => { if(iduOn() && !V.tag) mgHint(''); }, 2500); } return; }
  const meIt = t.it === iduMe();
  if(prev && prev.it !== t.it){   // осалили!
    const tagged = meIt ? ISL.s : iduPal();
    sfx.boing(); burst(TEX.star, headTop(tagged), 12, 2, 0.28); squash(tagged, 0.2, 0.3);
    floatText(L('Салочка!', 'Tag!'), headTop(tagged), '#D9527E');
  } else if(!prev) sfx.arf();
  mgHint(meIt ? L('✋ Ты водишь — догоняй!', `✋ You're it — catch ${V.name}!`) : L(`🏃 Водит ${V.name} — убегай!`, `🏃 ${V.name} is it — run!`));
}
function iduTagStep(dt, pal, same){
  const D = ISL.duo, T = V.tag;
  D.tagSp.visible = !!T && same;
  if(!T) return;
  T.cd -= dt;
  const it = T.it === iduMe() ? ISL.s : pal;
  if(D.tagSp.visible){ D.tagSp.position.copy(headTop(it)).add(new V3(0, 1.05 + Math.abs(Math.sin(now*5))*0.2, 0)); D.tagSp.material.opacity = T.cd > 0 ? 0.45 + 0.4*Math.abs(Math.sin(now*8)) : 1; }
  // осалить решает хозяйка: у неё свой тюлень без задержки, второй — чуть позади, так честнее для неё
  if(V.role !== 'host' || T.cd > 0 || !same || V.ride) return;
  if(pal.root.position.distanceTo(ISL.s.root.position) < IDU_TAG_R*(0.8 + 0.4*ISL.s.root.scale.x/0.66)){
    iduTagSet({it:T.it === 'h' ? 'g' : 'h', n:T.n + 1}); iduTagSend();
  }
}

/* ---------- 🗝️ 🎣 пещера и рыбалка — только у себя на острове; второй ждёт ---------- */
const iduMouth = () => ISL_POS.clone().add(islRoot.userData.cave.pos);
// у меня: хозяйка в пещере — над входом 🗝️ и её имя; рыбачит — 🎣 над ней. Возвращает, чего ждём: 'cave' | 'fish' | ''
function iduWaitStep(q){
  const I = ISL, D = I.duo, fresh = q && now - q.t < 2.5;
  const k = fresh && !I.cave && islRoot.userData.cave ? (q.cv ? 'cave' : q.fi ? 'fish' : '') : '';
  // хозяйка ушла в пещеру — скажем ей, что второй ждёт снаружи
  if(!I.guest && !!I.cave !== D.inCave){
    D.inCave = !!I.cave;
    if(D.inCave) setTimeout(() => { if(iduOn() && ISL.cave) toast(L(`${V.name} ждёт тебя у входа в пещеру 🗝️`, `${V.name} is waiting for you at the cave entrance 🗝️`), 3200); }, 4200);
  }
  if(k !== D.waitK){
    D.waitK = k; I.near = null;   // стою у входа — подпись внизу обновится
    if(k){ D.waitSp.material.map = D.waitTex[k]; D.waitSp.material.needsUpdate = true; }
    if(k && I.guest){
      mgHint(k === 'cave' ? L(`${V.name} в пещере 🗝️ Подожди у входа — скоро ${V.name} выйдет!`, `${V.name} is in the cave 🗝️ Wait by the entrance — out soon!`)
        : L(`${V.name} ловит рыбку 🎣 Подожди рядом!`, `${V.name} is fishing 🎣 Wait nearby!`));
      setTimeout(() => { if(iduOn() && /🗝️|🎣/.test(mgHintEl.textContent)) mgHint(''); }, 5000);
    }
  }
  D.waitSp.visible = !!k;
  if(!k) return '';
  const bob = new V3(0, Math.abs(Math.sin(now*3))*0.25, 0);
  if(k === 'cave'){
    const at = iduMouth().add(new V3(0, 3.4, 0));
    D.waitSp.position.copy(at).add(bob);
    D.lbl.visible = true; D.lbl.position.copy(at).add(new V3(0, 1.05, 0));
  } else D.waitSp.position.copy(headTop(iduPal())).add(new V3(0, 1.5, 0)).add(bob);
  return k;
}

/* ---------- мелочи: стрелка к второму, касание, фото, звёздочки ---------- */
function iduArrow(tgt){   // tgt — куда показывать (в мире): второй или вход в пещеру, где он
  const D = ISL.duo, P = ISL.R.pos;
  const w = tgt ? tgt.clone().sub(ISL_POS) : P, dx = w.x - P.x, dz = w.z - P.z;
  const show = !!tgt && Math.hypot(dx, dz) > IDU_FAR && !ISL.cave;
  D.arrow.hidden = !show; if(!show) return;
  const c = toScreen(ISL_POS.clone().add(P).add(new V3(0, 0.6, 0))), a = Math.atan2(dx, -dz), r = 118 + Math.sin(now*5)*4;
  D.arrow.style.transform = `translate(${(c.x + Math.sin(a)*r).toFixed(1)}px, ${(c.y - Math.cos(a)*r).toFixed(1)}px) translate(-50%, -50%) rotate(${a.toFixed(3)}rad)`;
}
// касание по второму: сердечки и подойти к нему (во время салок — просто бежим туда, куда палец)
function iduHit(cx, cy){
  if(!iduOn() || !ISL.duo || V.tag || V.ride === 'me') return null;
  const pal = iduPal(); if(!pal.root.visible) return null;
  const q = toScreen(worldOf(pal, new V3(0, 0.1, 0.3)));
  if(Math.hypot(q.x - cx, q.y - cy) > 64) return null;
  burst(TEX.heart, headTop(pal), 10, 1.8, 0.3); sfx.purr(); squash(pal, 0.15, 0.35);
  netSend({t:'ihug'});
  return {p:() => pal.root.position.clone().sub(ISL_POS), r:1.4};
}
function iduPhotoStep(dt, pal, same){
  const D = ISL.duo, R = ISL.R;
  if(V.role !== 'host' || V.photo || !same || ISL.cave || ISL.fishing || R.water || R.air || V.panel || document.body.classList.contains('talk-on')){ D.photoT = 0; return; }
  if(pal.root.position.distanceTo(ISL.s.root.position) > IDU_PHOTO_R || pal.swimming){ D.photoT = 0; return; }
  if((D.photoT += dt) > 3){ V.photo = true; vsPhoto(); }
}
// гость коснулся звёздочки хозяйки: сам не берёт — показывает ей
function iduStarSeen(st){
  const D = ISL.duo; if(!D || D.stSeen.has(st.i)) return;
  D.stSeen.add(st.i);
  netSend({t:'ist', i:st.i});
  sfx.ding(); burst(TEX.star, ISL_POS.clone().add(st.sp.position), 10, 1.8, 0.26);
  floatText(L('Покажи хозяйке острова!', `Show ${V.name}!`), headTop(ISL.s), '#D9527E');
}
function iduStarBeam(i){
  if(!iduOn() || ISL.guest || !ISL.duo || save.isl.got.includes(i)) return;
  const U = islRoot.userData, st = U.stars && U.stars[i]; if(!st) return;
  const D = ISL.duo; if(D.beams.some(b => b.i === i)) return;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 24, 12, 1, true), new THREE.MeshBasicMaterial({color:0xFF9BB8, transparent:true, opacity:0.25, depthWrite:false, side:THREE.DoubleSide}));
  m.position.set(st.sp.position.x, st.y + 12, st.sp.position.z); islRoot.add(m);
  D.beams.push({i, m, t:30});
  sfx.ding(); toast(L(`${V.name}: «Тут звёздочка! 🌟» — беги к розовому лучу`, `${V.name}: “A star over here! 🌟” — run to the pink beam`), 3200);
}

/* ---------- у знака на острове: игра, в которую можно вдвоём, — «🎮 Вместе ▶» (зовёт islGoShow) ---------- */
function iduGoShow(el, o){
  if(!iduOn()) return false;
  if(o.duo){
    el.innerHTML = `<button class="btn">${o.duo === 'off' ? `🌊 ${L('Спрыгнуть', 'Hop off')}` : `🐢 ${L('Прокатиться на спинке', `Ride on ${V.name}'s back`)}`} ▶</button>`;
    el.hidden = false; sfx.tick();
    el.querySelector('button').addEventListener('click', e => { e.stopPropagation(); sfx.tap(); if(o.duo === 'off') iduRideOff(true); else iduRideOn(); });
    return true;
  }
  const G = ISL.guest;
  if(o.fish || o.cave){
    if(!G) return false;
    const inCave = o.cave && ISL.duo && ISL.duo.waitK === 'cave';
    el.innerHTML = `<p>${o.fish ? `🎣 ${o.F.name}` : `🗝️ ${L('Пещера', 'The cave')}`}</p><p class="lock">${inCave ? L(`${V.name} там! Подожди здесь — скоро ${V.name} выйдет 🙂`, `${V.name} is inside! Wait here — out soon 🙂`) : L('Это — когда гуляешь у себя 🙂', 'That’s for your own island 🙂')}</p>`;
    el.hidden = false; return true;
  }
  if(o.npc || !o.k) return false;
  const g = IDU_GAME[o.k], ok = g && CO_GAMES[g] && (G || (!o.lock && vsGames().includes(g)));
  if(!ok){
    if(!G) return false;
    const list = Object.values(islRoot.userData.pl).filter(p => IDU_GAME[p.k] && !p.hide).map(p => ST_PLACES[p.k].ic).join(' ');
    el.innerHTML = `<p>${ST_PLACES[o.k].ic} ${ST_PLACES[o.k].name}</p><p class="lock">${L(`Вместе можно здесь: ${list}`, `You can play together here: ${list}`)}</p>`;
    el.hidden = false; return true;
  }
  const C = CO_GAMES[g];
  el.innerHTML = `<button class="btn">🎮 ${L('Вместе', 'Together')}: ${C.ic} ${C.name()} ▶</button>`;
  el.hidden = false; sfx.tick();
  el.querySelector('button').addEventListener('click', e => { e.stopPropagation(); sfx.tap(); iduAsk(g); });
  return true;
}
function iduAsk(g){
  if(!V || V.game || V.panel) return;
  if(V.inv === g){ netSend({t:'vyes', g}); return vsStart(g); }   // второй уже зовёт сюда же — идём
  if(V.ask) return toast(L('Уже позвали — ждём ответ ✨', 'Already asked — waiting for an answer ✨'));
  V.ask = g; V.askT = now; netSend({t:'vask', g});
  toast(L(`Позвали: ${CO_GAMES[g].ic} ${CO_GAMES[g].name()}! Ждём ответ…`, `Invited: ${CO_GAMES[g].ic} ${CO_GAMES[g].name()}! Waiting for an answer…`), 3000);
}
