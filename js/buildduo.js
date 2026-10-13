/* ---------------- 🧱 Стройка вдвоём (Спринт 8, задача 4, заход 3; просьба папы: «пройти уровень Сабрины вместе, потом и строить вдвоём») ----------------
   Папа (гость) в «Острове в гостях» (js/visit.js) или пришёл по «двери». Сабрина пошла на свою площадку (🧱 в «Поиграть», знак у иглу
   на острове, 🎮 → 🧱) или папа позвал её от знака на острове («🧱 Уровни ▶») — папин тюлень приходит туда же сам (vsWhere = 'build'),
   как на остров. Ведёт хозяйка: её полка (папа видит список и может коснуться — «давай этот!»), её уровень, её ▶.
   Уровень — короткий список чисел (BD.p: [кусок, x, z, поворот]), приходит целиком.
   • ▶ у Сабрины — бегут оба, каждый своим тюленем; звёздочки у каждого свои; у финиша — кто сколько (👑 — больше 🌟, потом быстрее).
     ✅ «Проверен» ставит только её собственный финиш (правило Mario Maker); папе — ракушки за проход её уровня (из тех же BD_DAY в день).
   • Строим вдвоём: у папы та же панель кусков и тот же редактор. Его правка уходит хозяйке целиком ('bde' {p, base, id}); хозяйка
     принимает, только если base — её текущая версия (BD.sid), иначе шлёт свою с rej — папина правка «отскакивает». Папину правку
     Сабрина может отменить ↩️. Любая правка снимает ✅ — пробежать снова.
   • Папа нажал «▶ Побежали?» — у Сабрины подсказка и мигает её ▶.
   Сеть: 'bdh' — хозяйка: режим (shelf|edit|play|done), номер уровня, сам уровень и его версия id, номер забега run, полка (при смене и раз в 2 с);
   'bde' — правка гостя; 'bdp' — где мой тюлень в забеге (оба, 10 раз/с); 'bdf' — дошёл до 🏁; 'bdask' — «побежали?»; 'bdpick' — гость выбрал уровень на полке;
   'bdg' — что я выбрала или тащу в стройке (оба; у второго — голубое кольцо, имя, кусок едет за пальцем — bduEditSync).
   Крючки: builder.js — bdGo(s, {guest}), bdStep → bduStep, bdDirty → bduSendEdit, bdFinish → bduFin / bduGuestFinish, bdHud → bduHudPill;
   visit.js — vsWire → bduWire, vsWhere → 'build', vsHostTick (на площадке гостя ведём здесь), vsStart('build') / vsPick → bdVisitGo, vsEnd;
   isleduo.js — iduTick и iduGuestEnter → bdGuestEnter, iduGoShow (знак 🧱 у гостя).
   Подключается после builder.js, visit.js и isleduo.js, до game.js. */
const BDU_SEND = 0.1, BDU_BEAT = 2, BDU_PEND = 3;   // как часто шлём, где мы; раз во сколько секунд хозяйка повторяет состояние; сколько ждём ответа на правку
const bduOn = () => typeof V !== 'undefined' && !!V && !!BD && !V.game;
const bduPal = () => V.role === 'host' ? V.s : V.pup;   // тюлень второго
const bduMine = () => save.pet ? save.pet.name : pname();

/* ---------- сеть ---------- */
function bduWire(){
  netOn('bdp', m => {
    if(!V) return;
    const q = V.bp || (V.bp = {p:new V3(), v:new V3(), t:-9});
    const np = new V3(+m.x || 0, +m.y || 0, +m.z || 0), gap = now - q.t;
    if(gap > 0.02 && gap < 1) q.v.copy(np).sub(q.p).divideScalar(gap).clampLength(0, 16); else { q.v.set(0, 0, 0); q.snap = true; }
    q.p.copy(np); q.r = +m.r || 0; q.ix = +m.ix || 0; q.iy = +m.iy || 0; q.iz = +m.iz || 0; q.sw = !!m.sw; q.f = +m.f || 0; q.g = m.g | 0; q.run = m.run | 0; q.t = now;
  });
  netOn('bdf', bduRes);
  netOn('bdg', m => { if(V) V.bg = {...m, at:now}; });   // что второй выбрал или тащит в стройке (bduEditSync)
  if(V.role === 'host'){
    netOn('bde', bduHostEdit);
    netOn('bdask', () => {
      if(!bduOn() || BD.guest || BD.mode !== 'edit') return;
      sfx.ding(); toast(L(`${V.name}: «Побежали? ▶»`, `${V.name}: “Shall we run? ▶”`), 2600);
      const b = BD.bar && BD.bar.querySelector('[data-a="play"]'); if(b){ wiggle(b); b.classList.add('bd-want'); }
    });
    netOn('bdpick', m => {
      if(!bduOn() || BD.guest || BD.mode !== 'shelf') return;
      const i = m.i | 0, lv = save.lv.my[i]; if(!lv) return;
      sfx.ding(); toast(L(`${V.name} хочет: ${lv.ic} ${lv.name}!`, `${V.name} would like: ${lv.ic} ${lv.name}!`), 2600);
      const b = mgStage.querySelector(`.bd-shelf [data-i="${i}"]`); if(b){ wiggle(b); b.classList.add('bd-want'); }
    });
  } else netOn('bdh', m => { if(V) V.bdh = m; });
}
// уровень из сети: только знакомые куски, числа, в пределах площадки, финиш один
function bdClean(a){
  if(!Array.isArray(a)) return null;
  const has = k => typeof k === 'string' && Object.prototype.hasOwnProperty.call(BD_KIT, k), one = new Set(), r = v => Math.round(v*100)/100;
  return a.filter(q => Array.isArray(q) && has(q[0]) && [1, 2, 3].every(k => Number.isFinite(q[k])))
    .filter(q => !BD_KIT[q[0]].one || (!one.has(q[0]) && one.add(q[0])))
    .slice(0, BD_MAX)
    .map(q => [q[0], Math.max(-BD_X, Math.min(BD_X, r(q[1]))), Math.max(BD_Z1, Math.min(BD_Z0, r(q[2]))), r(q[3])]);
}

/* ---------- кадр (зовёт bdStep) ---------- */
function bduStep(dt){
  if(!bduOn()){
    if(BD.du) bduEnd();
    if(BD.guest) BD.done();   // визит кончился — гость уходит с площадки
    return;
  }
  if(!BD.du) bduStart();
  const D = BD.du;
  if(V.role === 'host') bduHostStep(dt);
  else { bduGuestStep(dt); if(!BD || !BD.du) return; }
  if(D.run !== BD.run){ D.run = BD.run; if(D.pal && D.pal.run !== BD.run) D.pal = null; }
  bduPalStep(dt);
  bduEditSync(dt);
  if(BD.R &&(BD.mode === 'play' || BD.mode === 'done') && (D.sendT -= dt) <= 0){ D.sendT = BDU_SEND; bduSendPos(); }
}
function bduStart(){
  const pal = bduPal(), host = V.role === 'host';
  let lbl = host ? V.s.lbl : null; const own = !lbl;
  if(!lbl){ lbl = textSprite(V.name, '#3E8DB8'); scene.add(lbl); }
  lbl.scale.set(1.7, 0.64, 1); lbl.visible = false;
  const bar = mgNode('div', 'bd-duo', `
    <button class="round co-heart" aria-label="${L('Сердечко', 'A heart')}">💗</button>
    <button class="round co-mic" aria-label="${L('Микрофон', 'Microphone')}">🎤</button>`);
  bar.querySelectorAll('button').forEach(b => b.addEventListener('pointerdown', e => e.stopPropagation()));
  bar.querySelector('.co-heart').addEventListener('click', () => {
    const s = BD && BD.s; if(!s) return;
    burst(TEX.heart, headTop(s), 8, 1.6, 0.3); sfx.purr(); netSend({t:'emo'});
  });
  vsMic(bar.querySelector('.co-mic'));
  BD.du = {palS:pal, lbl, own, bar, sendT:0, beatT:0, key:'', rej:false, q:null, pend:null, awayT:0, me:null, pal:null, run:BD.run, paid:new Set(), hint:false, shelfK:''};
  pal.root.visible = true; pal.root.scale.setScalar(host ? vsSc(V.pal) : (V.h && +V.h.sc) || pal.root.scale.x);
  if(host) toast(L(`${V.name} ${V.pal && V.pal.f ? 'пришла' : 'пришёл'} на твою площадку! Стройте вместе, а ▶ — бежите оба 🧱`, `${V.name} came to your playground! Build together, and ▶ — you both run 🧱`), 4200);
}
function bduEnd(){
  const D = BD && BD.du; if(!D) return;
  BD.du = null;
  if(D.own) scene.remove(D.lbl); else { D.lbl.scale.set(0.85, 0.32, 1); D.lbl.visible = false; }
  D.bar.remove();
  BDU_RING.visible = false; if(D.gl) scene.remove(D.gl);
  const s = D.palS; s.root.visible = false; s.swimming = false; s.flap = 0; s.inner.rotation.set(0, 0, 0); s.inner.position.set(0, 0, 0);
}
/* ---------- ✏️ видно, что делает второй (13.10): что выбрал — голубое кольцо и имя, тащит — кусок едет за его пальцем ----------
   'bdg' {i — номер куска (-1 — ничего), k — вид (сверяем: номера могли сдвинуться), d — тащит, x, z, r — где сейчас}; по-настоящему
   кусок встаёт, когда придёт правка (bde/bdh), здесь — только вид. Шлём при перемене (не чаще BDU_SEND) и раз в секунду. */
const BDU_RING = new THREE.Mesh(new THREE.RingGeometry(0.84, 1, 48), new THREE.MeshBasicMaterial({color:0x5FB3E0, transparent:true, opacity:0.9, depthTest:false, depthWrite:false, side:THREE.DoubleSide}));
BDU_RING.renderOrder = 9; BDU_RING.visible = false; scene.add(BDU_RING);
function bduEditSync(dt){
  const D = BD.du, edit = BD.mode === 'edit' && edOn();
  // своё
  const k = edit ? (ED.drag ? ED.drag.key : ED.sel) : null, i = k ? bdIdx(k) : -1, q = i >= 0 ? BD.p[i] : null;
  const p = !q ? null : ED.drag && ED.drag.p ? ED.drag.p : BD_A.get(k), drag = !!(ED && ED.drag && ED.drag.p);
  const sig = q ? [i, q[0], +drag, p.x, p.z, p.r].join() : '-';
  D.gT = (D.gT || 0) + dt; D.gSend = (D.gSend || 0) - dt;
  if((sig !== D.gSig || D.gT > 1) && D.gSend <= 0){
    D.gSig = sig; D.gT = 0; D.gSend = BDU_SEND;
    netSend(q ? {t:'bdg', i, k:q[0], d:+drag, x:p.x, z:p.z, r:+p.r.toFixed(2)} : {t:'bdg', i:-1});
  }
  // второго
  const g = V.bg, mine = ED && ED.drag ? bdIdx(ED.drag.key) : -1;
  const ok = edit && g && now - g.at < 2.5 && g.i >= 0 && BD.p[g.i] && BD.p[g.i][0] === g.k;
  if(D.gDrag != null && (!ok || !g.d || g.i !== D.gDrag)){ if(BD.items[D.gDrag] && mine !== D.gDrag && BD.p[D.gDrag]) bdPlace(D.gDrag); D.gDrag = null; }
  if(!ok){ BDU_RING.visible = false; if(D.gl) D.gl.visible = false; return; }
  const at = g.d ? {x:g.x, z:g.z, r:g.r} : BD_A.get(bdKey(g.i));
  if(g.d && mine !== g.i){ bdPlace(g.i, at, 0.25); D.gDrag = g.i; }
  const R = BD_A.ring(bdKey(g.i), at);
  BDU_RING.position.copy(R.at).add(new V3(0, 0.02, 0)); BDU_RING.quaternion.copy(ED_FLAT); BDU_RING.scale.setScalar(R.r*(1 + Math.sin(now*5)*0.04)); BDU_RING.visible = true;
  if(!D.gl){ D.gl = textSprite(`💙 ${V.name}`, '#3E8DB8'); D.gl.scale.set(2.4, 0.9, 1); scene.add(D.gl); }
  D.gl.position.copy(R.top).add(new V3(0, 0.25, 0)); D.gl.visible = true;
}
// второй тюлень: в забеге — где он (плавно догоняет присланную точку), иначе ждёт на льдине старта рядом с нами
function bduPalStep(dt){
  const D = BD.du, s = D.palS, q = V.bp, run = BD.mode === 'play' || BD.mode === 'done';
  s.root.visible = true;
  if(run && q && now - q.t < 2.5 && q.run === BD.run){
    const tgt = BD_POS.clone().add(q.p).addScaledVector(q.v, Math.min(0.12, now - q.t));
    if(q.snap || s.root.position.distanceTo(tgt) > 6){ s.root.position.copy(tgt); q.snap = false; }
    else s.root.position.lerp(tgt, Math.min(1, dt*12));
    const k = Math.min(1, dt*14);
    s.root.rotation.set(0, s.root.rotation.y + vsAng(s.root.rotation.y, q.r)*Math.min(1, dt*10), 0);
    s.inner.rotation.x += vsAng(s.inner.rotation.x, q.ix)*k; s.inner.rotation.z += (q.iz - s.inner.rotation.z)*k;
    s.inner.position.y += (q.iy - s.inner.position.y)*k;
    s.swimming = q.sw; s.flap = q.f;
  } else {
    s.root.position.copy(BD_POS).add(new V3(BD_START.x + (BD.guest ? -1.1 : 1.1), 0.3, BD_START.z + 0.6)); s.root.rotation.set(0, Math.PI, 0);
    s.swimming = false; s.flap = 0; s.inner.rotation.set(0, 0, 0); s.inner.position.y = 0;
  }
  updateSeal(s, now, dt);
  D.lbl.visible = true; D.lbl.position.copy(headTop(s)).add(new V3(0, 0.45, 0));
}
function bduSendPos(){
  const R = BD.R, s = BD.s, r = x => Math.round(x*100)/100;
  netSend({t:'bdp', x:r(R.pos.x), y:r(R.pos.y), z:r(R.pos.z), r:r(R.yaw), ix:r(s.inner.rotation.x), iy:r(s.inner.position.y), iz:r(s.inner.rotation.z),
    sw:s.swimming ? 1 : 0, f:r(s.flap || 0), g:BD.got | 0, run:BD.run});
}

/* ---------- у хозяйки ---------- */
function bduHostStep(dt){
  const D = BD.du;
  if(D.q && !(ED && (ED.drag || ED.anim || ED.dn))){ const q = D.q; D.q = null; bduHostApply(q); }   // папина правка ждала, пока Сабрина дотащит своё
  const lv = BD.mode === 'shelf' || BD.i < 0 ? null : bdLv();
  const key = [BD.mode, BD.i, BD.sid, BD.run, lv ? +lv.ok : '', lv ? lv.name : '', save.lv.my.length].join('|');
  if(key !== D.key || D.rej || (D.beatT -= dt) <= 0){
    D.key = key; D.beatT = BDU_BEAT;
    netSend({t:'bdh', m:BD.mode || 'shelf', i:BD.i, id:BD.sid, run:BD.run, who:pname(), wg:save.who.g === 'm' ? 'm' : 'f', rej:D.rej ? 1 : 0,
      lv:lv ? {name:lv.name, ic:lv.ic, ok:lv.ok ? 1 : 0, p:BD.p} : null,
      shelf:!lv ? save.lv.my.map(l => ({name:l.name, ic:l.ic, ok:l.ok ? 1 : 0})) : null});
    D.rej = false;
  }
}
function bduHostEdit(m){
  if(!bduOn() || BD.guest || !BD.du) return;
  const D = BD.du, p = bdClean(m.p);
  if(BD.mode !== 'edit' || m.base !== BD.sid || !p){ D.rej = true; return; }   // Сабрина успела поменять своё — папина правка «отскакивает»
  const q = {p, id:String(m.id || '').slice(0, 12) || bdId(), base:m.base};
  if(ED && (ED.drag || ED.anim || ED.dn)) D.q = q; else bduHostApply(q);
}
function bduHostApply(q){
  const D = BD.du;
  if(BD.mode !== 'edit' || q.base !== BD.sid){ D.rej = true; return; }
  const lv = bdLv(), old = BD.p, was = lv.ok;
  edPush(BD_A.save());   // Сабрина может отменить папину правку ↩️
  BD.p = q.p; lv.p = q.p; if(lv.ok){ lv.ok = false; lv.bt = 0; lv.bs = 0; }
  BD.sid = q.id; persist();
  bdRebuild(); if(old.length !== q.p.length) edSelect(null); bdBar();
  bduDiff(old, q.p);
  if(was) toast(L(`${V.name} ${V.pal && V.pal.f ? 'поменяла' : 'поменял'} полосу — пробеги её снова до 🏁, и снова будет ✅`, `${V.name} changed the course — run it to 🏁 again to get the ✅ back`), 3600);
}
// что поменял второй — сердечки над новыми кусками
function bduDiff(old, p){
  const was = new Set(old.map(q => q.join(','))), add = p.filter(q => !was.has(q.join(','))).slice(0, 3);
  if(!add.length && p.length >= old.length) return;
  sfx.pop();
  for(const q of add) burst(TEX.heart, BD_POS.clone().add(new V3(q[1], 1, q[2])), 6, 1.3, 0.26);
  const at = add[0] ? BD_POS.clone().add(new V3(add[0][1], 1.6, add[0][2])) : headTop(bduPal());
  floatText(`💙 ${V.name}`, at, '#3E8DB8');
}

/* ---------- у гостя ---------- */
function bduWait(){
  BD.mode = 'wait'; bdPupHome(); bdHomeIc();
  mgHint(L('Идём на площадку… 🧱', 'Heading to the playground… 🧱'));
}
function bduGuestStep(dt){
  const D = BD.du, h = V.h;
  if(!h || h.w !== 'build'){ if((D.awayT += dt) > 0.8) BD.done(); return; } else D.awayT = 0;   // хозяйка ушла с площадки — и мы
  const m = V.bdh; if(!m) return;
  if(typeof m.who === 'string') BD.who = m.who.replace(/[<>&"]/g, '').slice(0, 16);
  if(m.m === 'shelf' || !m.lv){
    const list = Array.isArray(m.shelf) ? m.shelf.slice(0, BD_LV) : [], k = JSON.stringify(list);
    if(BD.mode !== 'shelf' || D.shelfK !== k){ D.shelfK = k; bduShelf(list); }
    return;
  }
  const P = D.pend;
  if(P && m.rej && m.id !== P.id) toast(L(`${BD.who || V.name} как раз тоже ${m.wg === 'm' ? 'строил' : 'строила'} — поставь ещё раз 🙂`, `${BD.who || V.name} was building at the same moment — place it again 🙂`), 2600);
  if(P && (m.id === P.id || m.rej || now - P.t > BDU_PEND)) D.pend = null;   // хозяйка ответила на мою правку (или не ответила вовсе)
  const idle = !ED || !(ED.drag || ED.anim || ED.dn);
  if(!D.pend && idle && (!BD.hl || m.i !== BD.i || m.id !== BD.sid)) bduApply(m);
  if(!BD.hl) return;
  if(!!m.lv.ok !== BD.hl.ok){ BD.hl.ok = !!m.lv.ok; if(BD.mode === 'edit') bdBar(); }
  if(m.m === 'edit' && BD.mode !== 'edit') return bdEdit(BD.i);
  if((m.m === 'play' || m.m === 'done') && (m.run | 0) !== BD.run){   // Сабрина нажала ▶ (или 🔁) — бежим и мы
    BD.run = m.run | 0;
    bdPlayStop(); BD.p = BD.hl.p; bdRebuild(); bdPlay();
  }
}
function bduApply(m){
  const old = BD.hl && BD.i === m.i ? BD.p : null, p = bdClean(m.lv.p) || [];
  BD.i = m.i | 0; BD.sid = String(m.id || '');
  BD.hl = {name:String(m.lv.name || '🧱').slice(0, 16), ic:String(m.lv.ic || '🧱').slice(0, 4), ok:!!m.lv.ok, p, bt:0, bs:0};
  if(BD.mode === 'play' || BD.mode === 'done') return;   // забег по старой полосе доиграем — новая встанет, когда вернёмся строить
  BD.p = p;
  if(BD.mode !== 'edit') return;
  bdRebuild(); bdBar();
  if(ED){ ED.undo = []; if(!old || old.length !== p.length) edSelect(null); }   // своё ↩️ после чужой правки сломало бы её — начинаем отмену заново
  if(old) bduDiff(old, p);
}
// полка хозяйки: смотрим и подсказываем, какой уровень хотим
function bduShelf(list){
  bdPlayStop(); edStop(); bdClear();
  BD.mode = 'shelf'; BD.i = -1; BD.p = []; BD.hl = null; bdRebuild(); bdPupHome(); bdHomeIc();
  document.body.classList.remove('bd-edit'); bdRoot.userData.grid.visible = bdRoot.userData.edge.visible = true;
  mgHint('');
  const who = BD.who || V.name;
  const el = mgNode('div', 'mg-panel bd-shelf', `<h3>🧱 ${L(`Уровни: ${stEsc(who)}`, `${stEsc(who)}'s levels`)}</h3>
    ${list.length ? `<div class="picks">${list.map((l, i) => `<button data-i="${i}"><span class="ic">${stEsc(String(l.ic || '🧱').slice(0, 4))}</span><b>${stEsc(String(l.name || '').slice(0, 16))}</b><small>${l.ok ? L('✅ проверен', '✅ beaten') : L('✏️ строится', '✏️ in progress')}</small></button>`).join('')}</div>` : ''}
    <p class="got">${list.length ? L(`${stEsc(who)} выбирает уровень… Коснись — подскажешь, какой хочешь 💙`, `${stEsc(who)} is picking a level… Tap one to say which you'd like 💙`) : L(`${stEsc(who)} начинает новый уровень… 🧱`, `${stEsc(who)} is starting a new level… 🧱`)}</p>`);
  el.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => {
    sfx.tap(); netSend({t:'bdpick', i:+b.dataset.i});
    el.querySelectorAll('.bd-want').forEach(x => x.classList.remove('bd-want')); b.classList.add('bd-want');
  }));
}
function bduGuestHint(){
  const D = BD.du; if(!D || D.hint) return;
  D.hint = true;
  const who = BD.who || V.name;
  mgHint(L('🧱 Строим вместе! Куски — внизу, ▶ — позвать бежать', `🧱 Building with ${who}! Pieces are below, ▶ asks to run`));
  setTimeout(() => { if(BD && BD.mode === 'edit' && mgHintEl.textContent.startsWith('🧱')) bdHint(); }, 6000);
}
function bduAskRun(){
  const D = BD.du; if(!D) return;
  if(now - (D.askT || -9) < 4) return;
  D.askT = now; netSend({t:'bdask'});
  toast(L(`Позвали бежать! ▶ нажмёт ${BD.who || V.name}`, `Asked to run! ${BD.who || V.name} will press ▶`), 2600);
}
// правка гостя уходит хозяйке целиком (зовёт bdDirty)
function bduSendEdit(){
  const id = bdId();
  netSend({t:'bde', p:BD.p, base:BD.sid, id});
  BD.sid = id;
  if(BD.du) BD.du.pend = {id, t:now};
}

/* ---------- 🏁 финиш: кто сколько ---------- */
function bduFin(t, got, all){
  const D = BD.du; if(!D) return;
  D.me = {t, got, all, run:BD.run};
  netSend({t:'bdf', run:BD.run, tm:t, got, all});
}
function bduRes(m){
  if(!bduOn() || !BD.du || (m.run | 0) !== BD.run) return;
  const D = BD.du; if(D.pal) return;
  D.pal = {t:+m.tm || 0, got:m.got | 0, all:m.all | 0, run:BD.run};
  if(BD.mode === 'play'){
    sfx.ding(); floatText('🏁!', headTop(D.palS), '#3E8DB8');
    toast(L(`${V.name} уже у флажка! 🏁 Беги, ты сможешь!`, `${V.name} is at the flag! 🏁 Keep going, you can do it!`), 2600);
  }
  bduResShow(); bdHud();
}
function bduResShow(){
  const el = mgStage.querySelector('.bd-duo-res'), D = BD && BD.du; if(!el || !D) return;
  const me = D.me && D.me.run === BD.run ? D.me : null, pl = D.pal;
  const d = me && pl ? (me.got - pl.got) || (pl.t - me.t) : 0;
  const line = (n, r, crown) => `${crown ? '👑' : r ? '🏁' : '🏃'} ${stEsc(n)}: ` + (r ? `⏱ <b>${bdSec(r.t)}</b>${r.all ? ` · 🌟 <b>${r.got}/${r.all}</b>` : ''}` : L('ещё бежит…', 'still running…'));
  el.innerHTML = `${line(bduMine(), me, d > 0)}<br>${line(V.name, pl, d < 0)}${me && pl && !d ? `<br>🤝 ${L('Вровень!', 'A tie!')}` : ''}`;
}
function bduHudPill(){
  const D = BD.du, q = V.bp; if(!D) return '';
  const n = D.pal ? D.pal.got : q && q.run === BD.run ? q.g | 0 : 0;
  return `<span class="pill">${D.pal ? '🏁' : '💙'} 🌟 <b>${n}</b></span>`;
}
// гость дошёл до 🏁 на уровне хозяйки: её ✅ не трогаем, себе — ракушки за проход (тот же дневной счёт, что за свои уровни)
function bduGuestFinish(t, got, all){
  const s = BD.s, D = BD.du, who = BD.who || V.name;
  bduFin(t, got, all);
  let shells = 0;
  if(D && !D.paid.has(BD.i)){
    D.paid.add(BD.i);
    const sv = save.lv, d = ymd(); if(sv.day.d !== d) sv.day = {d, n:0};
    if(sv.day.n < BD_DAY){ sv.day.n++; shells = BD_SHELLS; persist(); }
  }
  sfx.hug(); s.flap = 1;
  burst(TEX.heart, headTop(s), 18, 2.4, 0.34); burst(TEX.star, headTop(s), 12, 2, 0.3);
  if(shells) addShells(shells, toScreen(headTop(s)));
  mgHint('');
  mgNode('div', 'mg-panel bd-done', `
    <h3>🏁 ${L(`${pg('Дошёл', 'Дошла')}!`, 'You made it!')}</h3>
    <p class="bd-big">⏱ <b>${bdSec(t)}</b>${all ? ` · 🌟 <b>${got}/${all}</b>` : ''}${BD.falls ? ` · 💦 ${BD.falls}` : ''}</p>
    <p>${L(`${stEsc(BD.hl.ic)} ${stEsc(BD.hl.name)} — пройден!`, `${stEsc(BD.hl.ic)} ${stEsc(BD.hl.name)} — beaten!`)}${shells ? ` +${shells} 🐚` : ''}</p>
    <p class="bd-duo-res"></p>
    <p class="got small-note">${L(`Ещё раз или строить дальше — решает ${stEsc(who)} 🙂`, `${stEsc(who)} decides: run again or keep building 🙂`)}</p>`);
  bduResShow();
  setTimeout(() => { if(BD && BD.s === s) s.flap = 0; }, 600);
}

/* ---------- вход ---------- */
// гость: хозяйка на площадке — идём туда сами (зовут iduTick и iduGuestEnter)
async function bdGuestEnter(){
  const v = V; v.isleBusy = true;
  if(v.view) vsGuestView(false);
  v.me.root.visible = true;
  try{ await bdGo(v.me, {guest:true}); }catch(e){ console.error(e); }
  v.isleBusy = false;
  if(V !== v || v.game) return;
  if(v.h && v.h.w === 'isle' && typeof iduGuestEnter === 'function') return iduGuestEnter();   // она вернулась на остров — и мы прямо туда
  vsGuestView(true);
}
// хозяйка: «🧱 Стройка» из 🎮 или «да» на папино приглашение — идём на площадку; с острова — через знак, чтобы вернуться к нему же
function bdVisitGo(){
  if(typeof BD !== 'undefined' && BD) return;
  if(typeof ISL !== 'undefined' && ISL && !ISL.guest){
    if(ISL.cave || ISL.fishing) return toast(L('Сначала выйди из пещеры 🗝️ — и пойдём на площадку', 'Leave the cave first 🗝️ — then off to the playground'), 3000);
    return ISL.done('build');
  }
  stGo('build');
}
if(typeof CO_GAMES !== 'undefined') CO_GAMES.build = {ic:'🧱', name:() => L('Стройка', 'Builder'), only:'visit',   // только в гостях: в «Вместе» вкладки нет
  say:() => L('Полоса препятствий, которую построила хозяйка острова: бежите вместе, звёздочки у каждого свои. А строить можно вдвоём!', 'The obstacle course your host built: run it together, each collects their own stars. And you can build it together too!')};
