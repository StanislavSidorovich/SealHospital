/* ---------------- 🛋️ «Обустроить» вдвоём (очередь с 13.10, п. 5; по образцу js/buildduo.js) ----------------
   Папа (гость) в «Острове в гостях» стоит в прихожей Сабрины (js/homeduo.js). Сабрина нажала «🛋️ Обустроить» — у папы тоже
   включается редактор её прихожей: камера сверху, сетка, тот же палец (js/editor.js): тащи вещь, коснись — выбрана, ещё раз — повернётся,
   📦 — убрать в её коробку; внизу — «📦 Её коробка»: коснись — вещь встанет в прихожую. Покупать и красить — только хозяйке (её ракушки).
   Хозяйка владеет сохранением: правка папы уходит ей одной вещью ('vhe' {id, P:[комната, x, z, поворот] или null — в коробку, e — номер}),
   у неё проверяется теми же правилами (heOk) и встаёт с 💙 — или «отскакивает» (тесно: она только что поставила сюда своё, или как раз тащит
   эту вещь), ответ — 'vhack' {e, ok}; после ответа хозяйка сразу шлёт расстановку (vhome). Папину правку Сабрина отменяет своей ↩️ (edPush).
   Видно, что делает второй: 'vhg' {id ('' — ничего), d — тащит, x, z, r} — голубое кольцо с именем, тащит — вещь едет за его пальцем (только вид).
   Пока у папы правка в пути или он тащит, расстановку хозяйки (vhome) не применяем — отложим (V.hhNext), иначе вещь прыгнет из-под пальца.
   Крючки: homeduo.js — hdWire → hdeWire, hdTake → hdeHold, hdHostStep → hdeHostStep (и шлёт чаще), hdGuestStep → hdeGuestStep, hdCam → hdeCam, hdOut → hdeStop;
   visit.js — 'vh' несёт ed (хозяйка в «Обустроить» в прихожей), касание у гостя → hdeDown.
   Подключается после homeduo.js, до game.js. */
const HDE_PEND = 3, HDE_SEND = 0.1;   // сколько ждём ответа на правку; как часто шлём, что выбрали
const HDE_SPOT = new V3(2.9, 0.25, 3.9);   // куда отходит папин тюлень, пока обустраивают (зеркально малышу у порога, HE_PUP)
const HDE_RING = new THREE.Mesh(new THREE.RingGeometry(0.84, 1, 48), new THREE.MeshBasicMaterial({color:0x5FB3E0, transparent:true, opacity:0.9, depthTest:false, depthWrite:false, side:THREE.DoubleSide}));
HDE_RING.renderOrder = 9; HDE_RING.visible = false; scene.add(HDE_RING);
const hdeOn = () => !!(V && V.hde);

/* ---------- сеть ---------- */
function hdeWire(){
  netOn('vhg', m => { if(V) V.hg = {...m, at:now}; });
  if(V.role === 'host') netOn('vhe', hdeHostEdit);
  else netOn('vhack', hdeAck);
}

/* ---------- у гостя: её прихожая на миг становится «своей», чтобы работали правила homeedit.js ---------- */
// homeIn/heOk/heFree/homeResolve читают save.home.f и save.owned — подставляем её расстановку (тем же объектом: правки пишутся прямо в V.hh.f).
// Внутри не зовём persist(): своё сохранение гостя не трогаем.
function hdWith(fn){
  const H = V.hh, home = save.home, owned = save.owned;
  save.home = {...home, f:H.f, paint:H.paint, rooms:H.rooms || {}}; save.owned = H.owned;
  try{ return fn(); }finally{ save.home = home; save.owned = owned; }
}
const hdeR = v => Math.round(v*1000)/1000;
function hdeSend(id, P){
  const e = Math.random().toString(36).slice(2, 9);
  V.hde.pend = {e, t:now};
  netSend({t:'vhe', id, P, e});
}
// хозяин для редактора у гостя (как HE_A в js/homeedit.js, только её прихожая и правки — сообщениями)
const HD_A = {
  hit:(cx, cy) => hdWith(() => homeItemAt(cx, cy)),
  at:(id, cx, cy) => hdWith(() => heAt(id, cx, cy)),
  get:id => hdWith(() => HE_A.get(id)),
  put:(id, p, lift) => hdWith(() => HE_A.put(id, p, lift)),
  set(id, p){
    const r = heIsWall(id) ? 0 : hdeR(((p.r % (Math.PI*2)) + Math.PI*2) % (Math.PI*2)), P = ['hall', hdeR(p.x), hdeR(p.z), r];
    V.hh.f[id] = P; hdWith(() => { if(homeItems[id]) homePlace(homeItems[id], id); });
    hdeSend(id, P);
  },
  ok:(id, p) => hdWith(() => heOk(id, 'hall', p)),
  snap:(id, p) => HE_A.snap(id, p),
  step:id => HE_A.step(id),
  ring:(id, p) => hdWith(() => HE_A.ring(id, p)),
  save:() => JSON.stringify(V.hh.f),
  load(){},   // у папы ↩️ нет: отменяет хозяйка
  box(id){ delete V.hh.f[id]; homeDrop(id); hdeSend(id, null); hdeBar(); sfx.plop(); },
  yaw(){},
  sel(){ hdeHint(); },
  bad(){ if(now - (V.hde.badT || -9) > 3){ V.hde.badT = now; toast(L('Тут тесно — поставь чуть дальше', 'It is too tight here — try a bit further away'), 2200); } },
  moved(){ sfx.pop(); }
};
// её коробка: купленные вещи для прихожей, которые сейчас нигде не стоят (из других её комнат не таскаем)
const hdeBox = () => hdWith(() => heOrder(FURN.filter(f => homeHas(f.id) && FURN_MAKE[f.id] && heKindOpen(f.slot) && heFits(f.id, 'hall') && !save.home.f[f.id])));
function hdeStart(){
  const v = V; if(v.hde) return;
  v.hde = {pend:null, badT:-9, gSig:'', gT:0, gSend:0, gDrag:null, gl:null};
  edStart(HD_A); document.body.classList.add('hd-edit'); heGrid(true);
  if(mgHintEl.textContent.startsWith('🏠')) mgHint('');
  const bar = mgNode('div', 'hd-bar', `<div class="hd-top">📦 <b>${L(`Коробка: ${stEsc(v.name)}`, `${stEsc(v.name)}'s box`)}</b></div><div class="ed-strip"></div>
    <p class="hd-note">${L('Тащи вещи пальцем — двигаете вместе 💙', 'Drag things with your finger — you decorate together 💙')}</p>`);
  bar.addEventListener('pointerdown', e => e.stopPropagation());
  v.hde.bar = bar; hdeBar();
  v.tgt = HDE_SPOT.clone();   // отойти к порогу: не загораживать мебель
  sfx.whoosh();
  toast(L(`🛋️ ${v.name} обустраивает домик — помогай! Тащи вещи пальцем`, `🛋️ ${v.name} is decorating — help out! Drag things with your finger`), 3600);
}
function hdeStop(v = V){
  const D = v && v.hde; if(!D) return;
  v.hde = null;
  edStop(); document.body.classList.remove('hd-edit'); heGrid(false);
  D.bar.remove(); HDE_RING.visible = false; if(D.gl) scene.remove(D.gl);
  if(D.gDrag && homeItems[D.gDrag] && v.hh && v.hh.f[D.gDrag]) hdWith(() => homePlace(homeItems[D.gDrag], D.gDrag));
  if(v.hhNext && v.inH){ v.hh = v.hhNext; v.hhNext = null; hdBuild(); }
}
function hdeBar(){
  const D = V.hde; if(!D) return;
  const st = D.bar.querySelector('.ed-strip'), list = hdeBox();
  if(!list.length){ st.innerHTML = `<p class="ed-empty">${L('Коробка пустая — всё уже стоит 🙂', 'The box is empty — everything is out 🙂')}</p>`; return; }
  st.innerHTML = list.map(f => `<button class="ed-card" data-id="${f.id}"><img src="${homeThumb(f.id)}" alt=""><span>${f.name}</span></button>`).join('');
  st.querySelectorAll('.ed-card').forEach(c => c.addEventListener('click', () => hdeAdd(c.dataset.id)));
}
function hdeHint(){
  const D = V.hde; if(!D) return;
  const id = ED && ED.sel, el = D.bar.querySelector('.hd-note');
  el.textContent = id ? (heIsWall(id) ? L(`${furn(id).name}: тащи по стене. 📦 — в коробку`, `${furn(id).name}: drag it along the wall. 📦 puts it away`)
      : L(`${furn(id).name}: тащи, ↻ — повернуть, 📦 — в коробку`, `${furn(id).name}: drag it, ↻ turns, 📦 puts away`))
    : L('Тащи вещи пальцем — двигаете вместе 💙', 'Drag things with your finger — you decorate together 💙');
}
// вещь из её коробки — в прихожую: на обычное место вида, если свободно, иначе ближе к середине
function hdeAdd(id){
  const D = V.hde; if(!D || D.pend || (ED && (ED.drag || ED.anim))){ sfx.bad(); return; }
  const k = homeKind(id), near = kindRoom(k) === 'hall' ? kindSpot(k) : null;
  const fr = hdWith(() => heFree(id, 'hall', near, near ? near[2] : 0));
  if(!fr){ sfx.bad(); toast(L('Тут больше нет места — убери что-нибудь в коробку 📦', 'No more room here — put something away 📦'), 3000); return; }
  const P = ['hall', ...fr]; V.hh.f[id] = P; hdBuild();
  const o = homeItems[id];
  if(o){ const sc = o.scale.clone(); tween(0.35, q => o.scale.copy(sc).multiplyScalar(Math.max(0.01, q)), ease.back); burst(TEX.star, itemWorld(id), 10, 1.6, 0.26); }
  sfx.pop(); edSelect(id); hdeBar(); hdeSend(id, P);
}
// не трогать расстановку хозяйки, пока своя правка в пути или палец на вещи (hdTake)
function hdeHold(){
  const D = V.hde; if(!D) return false;
  if(D.pend && now - D.pend.t > HDE_PEND) D.pend = null;
  return !!D.pend || !!(ED && (ED.drag || ED.anim || ED.dn));
}
function hdeAck(m){
  const D = V && V.hde; if(!D || !D.pend || m.e !== D.pend.e) return;
  D.pend = null;
  if(!m.ok){ sfx.bad(); toast(L(`${V.name}: тут как раз занято — поставь ещё раз 🙂`, `That spot just got taken — place it again 🙂`), 2600); }
}
function hdeDown(e){
  if(!hdeOn() || V.arr) return false;
  if(e.target.closest && e.target.closest('button, .hd-bar, .mg-panel')) return true;
  return edDown(e);
}
function hdeGuestStep(dt){
  const v = V, want = v.inH && v.hrm === 'hall' && v.h && v.h.w === 'home' && v.h.rm === 'hall' && !!v.h.ed;
  if(want && !v.hde) hdeStart(); else if(!want && v.hde) hdeStop();
  if(!v.hde) return;
  if(v.hhNext && !hdeHold()){
    v.hh = v.hhNext; v.hhNext = null; hdBuild();
    if(ED && ED.sel && !(v.hh.f[ED.sel] && v.hh.f[ED.sel][0] === 'hall')) edSelect(null);
    hdeBar();
  }
  edTick(now); hdeSync(dt);
  const g = HE.grids.hall; if(g) g.material.opacity = 0.42 + Math.sin(now*2)*0.06;
}
// камера папы, пока обустраивают: как у хозяйки в «Обустроить» (HE_CAM.dry) — сверху, видно весь пол
function hdeCam(dt){
  const C = HE_CAM.dry, portrait = innerWidth < innerHeight, size = (portrait ? C.p : C.l)*0.92, lift = portrait ? 0.05 : 0;   // сверху карточки нет — комнату ниже и крупнее, чем у неё
  const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov)/2), fd = Math.max(size/2/(tv*camera.aspect), size*1.5/2/tv);
  const look = HOME_POS.clone().add(new V3(C.c[0], C.c[2] - lift, C.c[1])), pos = look.clone().add(new V3(0, fd*C.up, fd));
  const k = Math.min(1, dt*3); runCam.pos.lerp(pos, k); runCam.look.lerp(look, k);
}

/* ---------- у хозяйки ---------- */
function hdeHostStep(dt){
  if(!homeEdit || homeRoom !== 'hall' || !V.gin){
    if(V.hdeQ) V.hdeQ = null;
    if(V.hdeD){ hdeEnd(V.hdeD); V.hdeD = null; }
    return;
  }
  if(!V.hdeD){
    V.hdeD = {gSig:'', gT:0, gSend:0, gDrag:null, gl:null};
    toast(L(`${V.name} помогает обустраивать! 💙 Что ${V.pal && V.pal.f ? 'она' : 'он'} передвинет — отменишь ↩️, если не нравится`, `${V.name} is helping you decorate! 💙 Don't like a change? Undo it ↩️`), 4200);
  }
  if(V.hdeQ && !(ED && (ED.drag || ED.anim || ED.dn))){ const q = V.hdeQ; V.hdeQ = null; hdeHostApply(q); }   // папина правка ждала, пока Сабрина дотащит своё
  hdeSync(dt);
}
function hdeEnd(D){ HDE_RING.visible = false; if(D.gl) scene.remove(D.gl); if(D.gDrag && homeItems[D.gDrag] && save.home.f[D.gDrag]) homePlace(homeItems[D.gDrag], D.gDrag); }
function hdeHostEdit(m){
  if(!V || V.role !== 'host') return;
  const id = String(m.id || ''), e = String(m.e || '').slice(0, 12);
  const no = () => { netSend({t:'vhack', e, ok:0}); V.hdKey = ''; V.hdT = 0; };   // «отскочила» — и сразу расстановку, чтобы у папы вернулось
  if(!homeEdit || homeRoom !== 'hall' || !furn(id) || !homeHas(id) || !FURN_MAKE[id] || !heFits(id, 'hall')) return no();
  let P = null;
  if(m.P !== null){
    if(!Array.isArray(m.P) || m.P[0] !== 'hall') return no();
    const q = m.P.slice(1, 4).map(Number);
    if(q.length !== 3 || !q.every(Number.isFinite)) return no();
    P = ['hall', ...q];
  } else if(!save.home.f[id] || save.home.f[id][0] !== 'hall') return no();   // убрать можно только то, что стоит в прихожей
  if(P && save.home.f[id] && save.home.f[id][0] !== 'hall') return no();   // из других её комнат папа не таскает
  const q = {id, P, e};
  if(ED && (ED.drag || ED.anim || ED.dn)){ if((ED.drag && ED.drag.key === id) || V.hdeQ) return no(); V.hdeQ = q; return; }
  hdeHostApply(q);
}
function hdeHostApply({id, P, e}){
  const no = () => { netSend({t:'vhack', e, ok:0}); V.hdKey = ''; V.hdT = 0; };
  if(!homeEdit || homeRoom !== 'hall') return no();
  if(P && !heOk(id, 'hall', {x:P[1], z:P[2], r:P[3]})) return no();   // она успела поставить сюда своё
  edPush(HE_A.save());   // Сабрина может отменить папину правку ↩️
  if(P){ save.home.f[id] = ['hall', heRound(P[1]), heRound(P[2]), heIsWall(id) ? 0 : heRound(((P[3] % (Math.PI*2)) + Math.PI*2) % (Math.PI*2))]; }
  else { delete save.home.f[id]; homeDrop(id); if(ED && ED.sel === id) edSelect(null); }
  persist(); homeBuild();
  if(!HE.ask) heBarRender();   // вопрос «купить?» в панели не сбиваем
  netSend({t:'vhack', e, ok:1}); V.hdKey = ''; V.hdT = 0;
  sfx.pop();
  const at = P && homeItems[id] ? itemWorld(id) : headTop(V.s);
  if(P) burst(TEX.heart, at, 6, 1.3, 0.26);
  floatText(P ? `💙 ${V.name}` : `📦 ${V.name}`, at.clone().add(new V3(0, 0.6, 0)), '#3E8DB8');
}

/* ---------- видно, что делает второй (оба): что выбрал — голубое кольцо и имя, тащит — вещь едет за пальцем ---------- */
function hdeSync(dt){
  const host = V.role === 'host', D = host ? V.hdeD : V.hde, inR = id => host ? homeIn('hall').includes(id) : hdWith(() => homeIn('hall').includes(id));
  const A = host ? HE_A : HD_A, place = (id, P) => host ? homePlace(homeItems[id], id, P) : hdWith(() => homePlace(homeItems[id], id, P));
  // своё
  const k = edOn() ? (ED.drag ? ED.drag.key : ED.sel) : null, drag = !!(ED && ED.drag && ED.drag.p);
  const p = k && homeItems[k] ? (drag ? ED.drag.p : A.get(k)) : null;
  const sig = p ? [k, +drag, p.x, p.z, p.r].join() : '-';
  D.gT += dt; D.gSend -= dt;
  if((sig !== D.gSig || D.gT > 1) && D.gSend <= 0){
    D.gSig = sig; D.gT = 0; D.gSend = HDE_SEND;
    netSend(p ? {t:'vhg', id:k, d:+drag, x:p.x, z:p.z, r:+(+p.r || 0).toFixed(2)} : {t:'vhg', id:''});
  }
  // второго
  const g = V.hg, mine = ED && ED.drag ? ED.drag.key : null;
  const ok = g && now - g.at < 2.5 && g.id && homeItems[g.id] && inR(g.id) && [g.x, g.z, g.r].every(Number.isFinite);
  if(D.gDrag && (!ok || !g.d || g.id !== D.gDrag)){ if(homeItems[D.gDrag] && mine !== D.gDrag && inR(D.gDrag)) place(D.gDrag); D.gDrag = null; }
  if(!ok){ HDE_RING.visible = false; if(D.gl) D.gl.visible = false; return; }
  const at = g.d ? {x:g.x, z:g.z, r:g.r} : A.get(g.id);
  if(g.d && mine !== g.id){ place(g.id, ['hall', at.x, at.z, at.r]); if(heIsWall(g.id)) homeItems[g.id].translateZ(0.12); else homeItems[g.id].position.y += 0.25; D.gDrag = g.id; }
  const R = A.ring(g.id, at);
  HDE_RING.position.copy(R.at).add(new V3(0, 0.02, 0)); HDE_RING.quaternion.copy(R.q || ED_FLAT); HDE_RING.scale.setScalar(R.r*(1 + Math.sin(now*5)*0.04)); HDE_RING.visible = true;
  if(!D.gl){ D.gl = textSprite(`💙 ${V.name}`, '#3E8DB8'); D.gl.scale.set(2.4, 0.9, 1); scene.add(D.gl); }
  D.gl.position.copy(R.top).add(new V3(0, 0.25, 0)); D.gl.visible = true;
}
