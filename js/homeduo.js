/* ---------------- 🏠 Иглу в гостях (просьба папы 02.10: «всё вдвоём, бесшовно — и в гости в домик») ----------------
   Папа (гость) в «Острове в гостях» (js/visit.js). Сабрина зашла в свой иглу — его тюлень заходит следом:
   видит её прихожую с её мебелью и красками, ходит касанием по полу, её малыш гуляет там же, где у неё.
   Касание по вещи — «поиграй тут!»: её малыш идёт играть с этой вещью (решает хозяйка: свободна ли, не «Обустроить» ли).
   🐟 и ⚽ работают и в прихожей. Сабрина передвинула мебель или перекрасила — у гостя переставляется тоже.
   Сабрина ушла в другую комнату (океанариум, Игровая…) — гость ждёт в прихожей; вышла из иглу — и гость на льдине.
   Как строим чужой иглу: на миг подменяем в save то, что читает homeBuild (дом, покупки, коробки игр, находки, рыбки),
   строим и сразу возвращаем своё; сохранение гостя не меняется. Вышли — свои вещи строятся заново при следующем входе.
   Сеть (поверх визита): 'vhome' — хозяйка шлёт расстановку (когда поменялась, раз в 5 с и по 'vhq'); 'vhq' — гость просит;
   'vhplay' {id} — гость позвал малыша к вещи; vp.in = 1 — гость в прихожей (координаты от HOME_POS), vh.rm — комната хозяйки.
   Крючки: visit.js — vsHostTick → hdHostStep, vsGuestTick → hdGuestStep/hdCam, vsGuestTap → hdTap/hdClamp, vsWire → hdWire.
   Подключается после visit.js, home.js и homeedit.js (hePaint), до game.js. */
const HD_DOOR = new V3(0, 0.25, HOME_R - 0.25);   // откуда гость входит в прихожую
const HD_IN = new V3(-1.35, 0.25, 1.35);          // куда проходит

/* ---------- сеть ---------- */
function hdWire(){
  if(V.role === 'host'){
    netOn('vhq', () => { if(V){ V.hdKey = ''; V.hdT = 0; } });   // гость просит расстановку — пошлём на следующем кадре
    netOn('vhplay', m => hdHostPlay(String(m.id || '')));
  } else netOn('vhome', hdTake);
}
// что нужно homeBuild, чтобы построить прихожую хозяйки
function hdPack(){
  const own = save.owned.filter(id => furn(id) || /^p[wf]_/.test(id));
  return {f:save.home.f, paint:save.home.paint, owned:own, got:save.bg.got, finds:save.pet ? save.pet.finds : [], cups:save.adv.cups,
    fish:save.adv.fish, sea:save.sea ? save.sea.got : [], tank:save.dive.tank || []};
}
const hdArr = (a, n = 200) => Array.isArray(a) ? a.filter(x => typeof x === 'string' || Number.isFinite(x)).slice(0, n) : [];
function hdTake(m){
  if(!V || V.role !== 'guest') return;
  const f = {};
  if(m.f && typeof m.f === 'object') for(const [id, P] of Object.entries(m.f).slice(0, 200)){
    if(!furn(id) || !Array.isArray(P) || typeof P[0] !== 'string' || !HOME_ROOMS[P[0]]) continue;
    const q = [P[0], ...P.slice(1, 4).map(Number)]; if(q.slice(1).every(Number.isFinite)) f[id] = q;
  }
  const paint = {};
  if(m.paint && typeof m.paint === 'object') for(const [r, P] of Object.entries(m.paint)) if(P && typeof P === 'object') paint[r] = {w:String(P.w || ''), f:String(P.f || '')};
  V.hh = {f, paint, owned:hdArr(m.owned), got:hdArr(m.got), finds:hdArr(m.finds), cups:hdArr(m.cups), fish:hdArr(m.fish), sea:hdArr(m.sea), tank:hdArr(m.tank)};
  if(V.inH) hdBuild();
}

/* ---------- у хозяйки ---------- */
function hdHostStep(dt){
  if(!homeMode || V.game || (V.hdT = (V.hdT || 0) - dt) > 0) return;
  V.hdT = 1; V.hdN = (V.hdN || 0) + 1;
  const p = hdPack(), key = JSON.stringify(p);
  if(key !== V.hdKey || V.hdN % 5 === 0){ V.hdKey = key; netSend({t:'vhome', ...p}); }
}
// гость позвал малыша к вещи: свободна — малыш идёт играть; занята — гостю «чуть позже»
function hdHostPlay(id){
  const s = petSeal, free = homeMode && homeRoom === 'hall' && !homeEdit && !busy && mgRoot.hidden && s && !s.sleeping && !(typeof hwOn === 'function' && hwOn());
  if(!V || !free || !homeItems[id] || !homeIn().includes(id)) return netSend({t:'vfx', k:'no', why:s && s.sleeping ? 'sleep' : 'busy'});
  floatText(L(`${V.name}: «Поиграй тут!»`, `${V.name}: “Play here!”`), itemWorld(id).add(new V3(0, 0.5, 0)), '#3E8DB8');
  homeIdleT = 12; homePlay(id, true);
}

/* ---------- у гостя ---------- */
// подменить на миг то, что читает homeBuild, построить прихожую хозяйки и вернуть своё
function hdSwap(fn){
  const H = V.hh, keep = {home:save.home, owned:save.owned, bg:save.bg, pet:save.pet, adv:save.adv, sea:save.sea, dive:save.dive, album:save.album};
  save.home = {...save.home, f:JSON.parse(JSON.stringify(H.f)), paint:H.paint};
  save.owned = H.owned; save.bg = {...save.bg, got:H.got}; save.pet = {...(save.pet || {name:V.name}), finds:H.finds};
  save.adv = {...save.adv, cups:H.cups, fish:H.fish}; save.sea = {...(save.sea || {}), got:H.sea}; save.dive = {...save.dive, tank:H.tank}; save.album = [];
  try{ fn(); }finally{ Object.assign(save, keep); }
}
function hdBuild(){ hdSwap(() => homeBuild()); }
// гость — внутрь (хозяйка в прихожей) и обратно на льдину (хозяйка вышла)
function hdGuestStep(dt){
  const v = V, h = v.h; if(!h || v.arr || v.isleBusy) return;
  const hall = h.w === 'home' && h.rm === 'hall';
  if(!v.inH && hall){ if(!v.hh){ if((v.hqT = (v.hqT || 0) - dt) <= 0){ v.hqT = 2; netSend({t:'vhq'}); } return; } hdIn(); }
  else if(v.inH && h.w !== 'home') hdOut(v);
  if(v.inH) homeAnim(Object.keys(homeItems).filter(id => homeItems[id].parent === homeRoot), now, dt);
}
function hdIn(){
  const v = V; v.inH = true;
  sfx.whoosh(); flash();
  homeRoot.visible = true; scene.fog = null; snow.visible = false; homeLights(true);
  hdBuild();
  v.pos.copy(HD_DOOR); v.tgt = HD_IN.clone(); v.sw = false; v.me.swimming = false; v.yaw = Math.PI;
  v.pup.root.position.copy(HOME_POS).add(v.hp);
  hdCam(0, true);
  mgHint(L(`🏠 Ты в гостях в домике! Нажми на вещь — ${v.name} поиграет с ней`, `🏠 You're inside the home! Tap a thing — ${v.name} will play with it`));
  setTimeout(() => { if(V && V.inH && mgHintEl.textContent.startsWith('🏠')) mgHint(''); }, 6000);
}
// quiet — визит кончился или ушли в игру: без анимации
function hdOut(v = V, quiet){
  if(!v || !v.inH) return;
  v.inH = false;
  for(const id of Object.keys(homeItems)) homeDrop(id);   // свои вещи построятся заново, когда зайдём к себе
  if(typeof hePaint === 'function') hePaint();
  homeRoot.visible = false; scene.fog = FOG; snow.visible = true; homeLights(false);
  if(quiet) return;
  flash(); sfx.whoosh();
  v.pos.set(-1.3, 0.25, -0.45); v.tgt = VS_SPOT.clone(); v.yaw = 0;
  if(mgHintEl.textContent.startsWith('🏠')) mgHint('');
}
// камера — как у хозяйки в прихожей (homeView): спереди-сверху, видна вся комната
function hdCam(dt, snap){
  const portrait = innerWidth < innerHeight, size = portrait ? 6.2 : 7.4, lift = portrait ? -1.2 : -0.2;
  const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov)/2), fd = Math.max(size/2/(tv*camera.aspect), size*1.5/2/tv);
  const look = HOME_POS.clone().add(new V3(0.2, 0.6 - lift, -0.3)), pos = look.clone().add(new V3(0, fd*0.5, fd));
  const k = snap ? 1 : Math.min(1, dt*3);
  runCam.pos.lerp(pos, k); runCam.look.lerp(look, k);
}
function hdClamp(p){
  const l = Math.hypot(p.x, p.z), lim = HOME_R - 0.7; if(l > lim){ p.x *= lim/l; p.z *= lim/l; }
  if(V.hv){ const d = new V3(p.x - V.hp.x, 0, p.z - V.hp.z), dl = d.length(); if(dl < 0.8){ if(dl < 0.01) d.set(-1, 0, 0); d.setLength(0.8); p.x = V.hp.x + d.x; p.z = V.hp.z + d.z; } }
  p.y = 0.25; return p;
}
// касание по вещи хозяйки: позвать её малыша поиграть с ней, а самому подойти поближе
function hdTap(cx, cy){
  const rect = canvas.getBoundingClientRect();
  ndc.set((cx - rect.left)/rect.width*2 - 1, -((cy - rect.top)/rect.height)*2 + 1);
  ray.setFromCamera(ndc, camera);
  const list = Object.values(homeItems).filter(o => o.parent === homeRoot);
  const hit = ray.intersectObjects(list, true)[0];
  let o = hit && hit.object; while(o && !o.userData.id) o = o.parent;
  if(!o) return false;
  sfx.tap();
  const w = o.getWorldPosition(new V3());
  burst(TEX.heart, w.clone().add(new V3(0, 0.8, 0)), 6, 1.4, 0.26);
  if(V.cd <= 0){ V.cd = 1.5; netSend({t:'vhplay', id:o.userData.id}); }
  const q = w.sub(HOME_POS); const d = new V3(-q.x, 0, -q.z); if(d.length() > 0.01) d.setLength(1.1);
  V.tgt = hdClamp(new V3(q.x + d.x, 0.25, q.z + d.z));
  return true;
}
