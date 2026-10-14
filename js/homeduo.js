/* ---------------- 🏠 Иглу в гостях (просьба папы 02.10: «всё вдвоём, бесшовно — и в гости в домик») ----------------
   Папа (гость) в «Острове в гостях» (js/visit.js). Сабрина зашла в свой иглу — его тюлень заходит следом:
   видит её прихожую с её мебелью и красками, ходит касанием по полу, её малыш гуляет там же, где у неё.
   Касание по вещи — «поиграй тут!»: её малыш идёт играть с этой вещью (решает хозяйка: свободна ли, не «Обустроить» ли).
   🐟 и ⚽ работают и в прихожей. Сабрина передвинула мебель или перекрасила — у гостя переставляется тоже.
   🚪 Комнаты (14.10): Сабрина ушла в другую комнату — гость идёт следом (v.hrm — где он сам, vh.rm — где она):
   🐠 океанариум — её рыбки и гости из бухты; стук по стеклу и кормление видно у обоих ('vhfx'), касание кормушки — её малыш кормит,
   люк — позвать нырять вместе; 🎲 Игровая — её коробки на столе, касание коробки — позвать в Игротеку;
   🏆 трофеи — её кубки, медали (готовые галочки `med`, считать чужие медали из своего сохранения нельзя) и находки, фото не шлём.
   У хозяйки: гость в той же комнате + касание коробки или люка — «Вдвоём или сама?» (hdDuoTap).
   Как строим чужой иглу: на миг подменяем в save то, что читает homeBuild и комнаты (дом, покупки, коробки игр, находки, рыбки…),
   строим и сразу возвращаем своё; сохранение гостя не меняется. Вышли — свои вещи строятся заново при следующем входе.
   Сеть (поверх визита): 'vhome' — хозяйка шлёт расстановку (когда поменялась, раз в 5 с и по 'vhq'); 'vhq' — гость просит;
   'vhplay' {id} — гость позвал малыша к вещи ('@feed' — к кормушке); 'vhfx' {k:'knock', x, y, z | 'feed'} — оба;
   vp.in = 1 и vp.rm — гость в иглу (координаты от HOME_ROOMS[rm].pos), vh.rm — комната хозяйки.
   Крючки: visit.js — vsHostTick → hdHostStep, vsGuestTick → hdGuestStep/hdCam, vsGuestTap → hdTap/hdClamp, vsWire → hdWire;
   ocean.js — ocKnock/ocFeed → hdFx, ocDive → hdDuoTap; gameroom.js — gmTap → hdDuoTap; trophyroom.js — TROOM.med.
   Подключается после visit.js, home.js, homeedit.js (hePaint) и комнат (ocean/rooms/gameroom/trophyroom), до game.js. */
const HD_DOOR = new V3(0, 0.25, HOME_R - 0.25);   // откуда гость входит в прихожую
const HD_IN = new V3(-1.35, 0.25, 1.35);          // куда проходит

/* ---------- сеть ---------- */
function hdWire(){
  if(V.role === 'host'){
    netOn('vhq', () => { if(V){ V.hdKey = ''; V.hdT = 0; } });   // гость просит расстановку — пошлём на следующем кадре
    netOn('vhplay', m => hdHostPlay(String(m.id || '')));
  } else netOn('vhome', hdTake);
  netOn('vhfx', hdFxIn);
  if(typeof hdeWire === 'function') hdeWire();   // 🛋️ «Обустроить» вдвоём (js/decorduo.js)
}
// что нужно homeBuild и комнатам, чтобы построить иглу хозяйки
function hdPack(){
  const own = save.owned.filter(id => furn(id) || /^p[wf]_/.test(id)), sum = o => Object.values(o || {}).reduce((a, b) => a + (+b || 0), 0), dv = save.dive;
  return {f:save.home.f, paint:save.home.paint, rooms:save.home.rooms, owned:own, got:save.bg.got, finds:save.pet ? save.pet.finds : [], cups:save.adv.cups,
    fish:save.adv.fish, sea:save.sea ? save.sea.got : [], tank:dv.tank || [],
    fed:save.home.fed === homeDay() ? 1 : 0, shark:dv.shark.friend ? 1 : 0, turt:dv.turt ? 1 : 0, gl:dv.gloom.st || 0, seen:dv.seen || [],   // 🐠
    bn:sum(save.bg.n), bw:sum(save.bg.w), peng:pengMet() ? 1 : 0,   // 🎲
    med:typeof TR_MEDALS !== 'undefined' ? TR_MEDALS.map(m => trMedalOk(m) ? 1 : 0) : [], fin:save.story.fin.n > 0 ? 1 : 0};   // 🏆
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
  const rooms = {};
  if(m.rooms && typeof m.rooms === 'object') for(const [r, n] of Object.entries(m.rooms)) if(HOME_ROOMS[r] && Number.isFinite(+n)) rooms[r] = +n;
  const num = (x, hi = 1e6) => Math.max(0, Math.min(hi, Math.round(+x) || 0));
  const hh = {f, paint, rooms, owned:hdArr(m.owned), got:hdArr(m.got), finds:hdArr(m.finds), cups:hdArr(m.cups), fish:hdArr(m.fish), sea:hdArr(m.sea), tank:hdArr(m.tank),
    fed:num(m.fed, 1), shark:num(m.shark, 1), turt:num(m.turt, 1), gl:num(m.gl, 9), seen:hdArr(m.seen), bn:num(m.bn), bw:num(m.bw), peng:num(m.peng, 1), med:hdArr(m.med, 40).map(x => x ? 1 : 0), fin:num(m.fin, 1)};
  if(V.hh && typeof hdeHold === 'function' && hdeHold()){ V.hhNext = hh; return; }   // папа тащит вещь или ждёт ответа на свою правку — потом (js/decorduo.js)
  const was = V.hh; V.hh = hh; V.hhNext = null;
  if(V.inH){
    hdBuild(); if(typeof hdeBar === 'function') hdeBar();
    if(was && hdRoomKey(was) !== hdRoomKey(hh)) hdRefill();   // новая рыбка, коробка, кубок — комнату заново
  }
}
// что в комнате зависит от сохранения хозяйки (поменялось — пересобрать комнату у гостя)
function hdRoomKey(H){
  const r = V && V.hrm;
  return r === 'ocean' ? [H.sea, H.fish, H.tank, H.shark, H.turt, H.gl].join('|') : r === 'games' ? [H.got, H.bn, H.bw, H.peng].join('|') : r === 'trophy' ? [H.cups, H.med, H.finds, H.fin].join('|') : '';
}

/* ---------- у хозяйки ---------- */
function hdHostStep(dt){
  if(typeof hdeHostStep === 'function' && homeMode && !V.game) hdeHostStep(dt);   // 🛋️ папа помогает обустраивать (js/decorduo.js)
  if(!homeMode || V.game || (V.hdT = (V.hdT || 0) - dt) > 0) return;
  V.hdT = homeEdit && V.gin ? 0.15 : 1;   // обустраивают вдвоём — расстановку чаще
  V.hdN = (V.hdN || 0) + 1;
  const p = hdPack(), key = JSON.stringify(p);
  if(key !== V.hdKey || V.hdN % 5 === 0){ V.hdKey = key; netSend({t:'vhome', ...p}); }
}
const hdHostFree = () => { const s = petSeal; return homeMode && !homeEdit && !busy && mgRoot.hidden && s && !s.sleeping && !(typeof hwOn === 'function' && hwOn()); };
// гость позвал малыша к вещи (или к кормушке): свободна — малыш идёт; занята — гостю «чуть позже»
function hdHostPlay(id){
  const s = petSeal;
  if(id === '@feed'){
    if(!V || !hdHostFree() || homeRoom !== 'ocean') return netSend({t:'vfx', k:'no', why:s && s.sleeping ? 'sleep' : 'busy'});
    floatText(L(`${V.name}: «Покормим рыбок!»`, `${V.name}: “Let's feed the fish!”`), headTop(s), '#3E8DB8');
    homeIdleT = 12; return ocFeed();
  }
  if(!V || !hdHostFree() || !homeItems[id] || !homeIn().includes(id)) return netSend({t:'vfx', k:'no', why:s && s.sleeping ? 'sleep' : 'busy'});
  floatText(L(`${V.name}: «Поиграй тут!»`, `${V.name}: “Play here!”`), itemWorld(id).add(new V3(0, 0.5, 0)), '#3E8DB8');
  homeIdleT = 12; homePlay(id, true);
}
// гость стоит рядом в этой же комнате — «Вдвоём или сама?» (true — позвали гостя, своё не запускать)
async function hdDuoTap(g){
  if(typeof V === 'undefined' || !V || V.role !== 'host' || V.game || V.panel || !V.gin || V.grm !== homeRoom || !vsGames().includes(g) || busy) return false;
  if(V.ask) return true;
  const C = CO_GAMES[g];
  const k = await vsPanel(`<p class="ttl display">${C.ic} ${C.name()}</p>
    <p class="got">${L(`${V.name} рядом. Вдвоём?`, `${V.name} is right here. Together?`)}</p>
    <div class="row col"><button class="btn" data-k="duo">👫 ${L('Вдвоём!', 'Together!')}</button><button class="btn ghost" data-k="solo">🦭 ${L(pg('Сам', 'Сама'), 'Just me')}</button></div>`);
  if(k !== 'duo' || !V) return k === '';   // закрыли панель (визит кончился) — тоже ничего не запускаем
  vsAskGame(g); return true;
}

/* ---------- общие «чудеса» в океанариуме: стук по стеклу и корм видно у обоих ---------- */
function hdFx(k, p){
  if(typeof V === 'undefined' || !V || V.game) return;
  const here = V.role === 'host' ? V.gin && V.grm === 'ocean' && homeRoom === 'ocean' : V.inH && V.hrm === 'ocean';
  if(!here) return;
  const r = x => Math.round(x*100)/100;
  netSend(p ? {t:'vhfx', k, x:r(p.x), y:r(p.y), z:r(p.z)} : {t:'vhfx', k});
}
function hdFxIn(m){
  if(!V) return;
  const inOc = V.role === 'host' ? homeMode && homeRoom === 'ocean' : V.inH && V.hrm === 'ocean';
  if(!inOc || !OC.made) return;
  if(m.k === 'knock'){
    const p = new V3(+m.x || 0, +m.y || 0, +m.z || 0); if(p.length() > 30) return;
    const w = p.add(OC_POS); ocKnock(w, true);
    if(V.role === 'host') floatText(L(`${V.name}: «Тук-тук!»`, `${V.name}: “Knock-knock!”`), w.clone().add(new V3(0, 0.5, 0)), '#3E8DB8');
  } else if(m.k === 'feed'){ if(V.hh) V.hh.fed = 1; ocFeedFx(); }
}

/* ---------- у гостя ---------- */
// подменить на миг то, что читает homeBuild и комнаты, построить иглу хозяйки и вернуть своё
function hdSwap(fn){
  const H = V.hh, keep = {home:save.home, owned:save.owned, bg:save.bg, pet:save.pet, adv:save.adv, sea:save.sea, dive:save.dive, album:save.album, story:save.story};
  save.home = {...save.home, f:JSON.parse(JSON.stringify(H.f)), paint:H.paint, fed:H.fed ? homeDay() : '', oc:[]};
  save.owned = H.owned; save.bg = {...save.bg, got:H.got, n:{all:H.bn || 0}, w:{all:H.bw || 0}}; save.pet = {...(save.pet || {name:V.name}), finds:H.finds};
  save.adv = {...save.adv, cups:H.cups, fish:H.fish}; save.sea = {...(save.sea || {}), got:H.sea};
  save.dive = {...save.dive, tank:H.tank, seen:H.seen || [], turt:H.turt ? (save.dive.turt || 1) : 0, shark:{...save.dive.shark, friend:!!H.shark}, gloom:{...save.dive.gloom, st:H.gl || 0}};
  save.album = H.peng ? [{name:'Ping'}] : []; save.story = {...save.story, fin:{...save.story.fin, n:H.fin ? 1 : 0}};
  const tr = typeof TROOM !== 'undefined' ? TROOM : null; if(tr) tr.med = H.med && H.med.length ? H.med : null;
  try{ fn(); }finally{ Object.assign(save, keep); if(tr) tr.med = null; }
}
function hdBuild(){ hdSwap(() => homeBuild()); }
const hdRoomR = rm => rm === 'ocean' ? OC_R : HOME_R;
const hdDoorA = rm => rm === 'ocean' ? OC_DOOR_A : RM[rm].doorA;    // дверь внутри комнаты
const hdArchA = rm => rm === 'ocean' ? OC_HALL_A : RM[rm].hallA;    // арка этой комнаты в прихожей
const hdBase = () => HOME_ROOMS[V.hrm || 'hall'].pos;
// показать комнату хозяйки у себя: спрятать прежнюю, построить новую из её данных
function hdShow(rm){
  const v = V, was = v.hrm;
  if(was === 'ocean') ocOff(); else if(was && RM[was] && RM[was].root) RM[was].root.visible = false;
  homeRoot.visible = rm === 'hall'; scene.fog = null;
  homeRoom = rm; v.hrm = rm;
  if(rm === 'ocean') hdSwap(() => ocOn());
  else if(RM[rm]){ const R = RM[rm]; if(!R.filled){ R.filled = true; R.fill(R.root); } R.root.visible = true; hdSwap(() => { if(R.enter) R.enter(); }); }
  hdBuild();
}
function hdRefill(){ if(V.hrm && V.hrm !== 'hall') hdShow(V.hrm); }
// гость — внутрь (хозяйка в иглу), в другую комнату за ней и обратно на льдину (хозяйка вышла)
function hdGuestStep(dt){
  const v = V, h = v.h; if(!h || v.arr || v.isleBusy) return;
  const rm = h.w === 'home' && HOME_ROOMS[h.rm] ? h.rm : '';
  if(rm && !v.inH){ if(!v.hh){ if((v.hqT = (v.hqT || 0) - dt) <= 0){ v.hqT = 2; netSend({t:'vhq'}); } return; } hdIn(rm); }
  else if(v.inH && !rm) hdOut(v);
  else if(v.inH && rm !== v.hrm) hdRoom(rm);
  if(v.inH){
    const root = HOME_ROOMS[v.hrm].root;
    homeAnim(Object.keys(homeItems).filter(id => homeItems[id].parent === root), now, dt);
    hdRoomTick(dt);
  }
  if(typeof hdeGuestStep === 'function') hdeGuestStep(dt);   // 🛋️ она в «Обустроить» — и у нас редактор (js/decorduo.js)
}
// комната живёт и у гостя: рыбки плавают, флажки качаются, кубки поворачиваются
function hdRoomTick(dt){
  const r = V.hrm;
  if(r === 'ocean'){ const k = save.home; save.home = {...k, fed:V.hh && V.hh.fed ? homeDay() : ''}; try{ ocTick(now, dt); }finally{ save.home = k; } }
  else if(RM[r] && RM[r].tick) RM[r].tick(now, dt);
}
const HD_SAY = {
  hall:() => L(`🏠 Ты в гостях в домике! Нажми на вещь — ${V.name} поиграет с ней`, `🏠 You're inside the home! Tap a thing — ${V.name} will play with it`),
  ocean:() => L('🐠 Океанариум! Стучи по стеклу — рыбки брызнут у обоих. 🍤 — покормить, люк — нырять вместе', '🐠 The oceanarium! Knock on the glass — the fish scatter for both of you. 🍤 feeds them, the hatch — dive together'),
  games:() => L('🎲 Игровая! Нажми на коробку — позовёшь играть', '🎲 The game room! Tap a box to ask for a game'),
  trophy:() => L(`🏆 Комната трофеев! Нажимай на кубки и витрины — что ${hdF() ? 'собрала' : 'собрал'} ${V.name}`, `🏆 The trophy room! Tap the cups and cases to see what ${V.name} collected`)
};
function hdHint(rm){
  const t = (HD_SAY[rm] || HD_SAY.hall)(); mgHint(t);
  setTimeout(() => { if(V && V.inH && mgHintEl.textContent === t) mgHint(''); }, 6000);
}
function hdIn(rm = 'hall'){
  const v = V; v.inH = true;
  sfx.whoosh(); flash();
  homeLights(true); snow.visible = false;
  hdShow(rm);
  if(rm === 'hall'){ v.pos.copy(HD_DOOR); v.tgt = HD_IN.clone(); v.yaw = Math.PI; }
  else hdPlace(hdDoorA(rm), hdRoomR(rm));
  v.sw = false; v.me.swimming = false;
  v.pup.root.position.copy(hdBase()).add(v.hp);
  hdCam(0, true);
  hdHint(rm);
}
// поставить гостя у арки (угол a) и шагнуть внутрь
function hdPlace(a, R){
  const v = V, [x, z] = ocAt(a, R - 0.5), [tx, tz] = ocAt(a, R - 1.6);
  v.pos.set(x, 0.25, z); v.tgt = hdClamp(new V3(tx, 0.25, tz)); v.yaw = Math.atan2(tx - x, tz - z);
}
// хозяйка перешла в другую комнату — и мы за ней
function hdRoom(rm){
  const v = V, from = v.hrm;
  if(typeof hdeStop === 'function') hdeStop(v);
  sfx.whoosh(); flash();
  hdShow(rm);
  if(rm === 'hall') hdPlace(from && from !== 'hall' ? hdArchA(from) : 0, HOME_R);
  else hdPlace(hdDoorA(rm), hdRoomR(rm));
  v.pup.root.position.copy(hdBase()).add(v.hp);
  hdCam(0, true);
  hdHint(rm);
}
// quiet — визит кончился или ушли в игру: без анимации
function hdOut(v = V, quiet){
  if(!v || !v.inH) return;
  if(typeof hdeStop === 'function') hdeStop(v);
  v.inH = false;
  if(v.hrm === 'ocean') ocOff(); else if(v.hrm && RM[v.hrm] && RM[v.hrm].root) RM[v.hrm].root.visible = false;
  v.hrm = ''; homeRoom = 'hall';
  for(const id of Object.keys(homeItems)) homeDrop(id);   // свои вещи построятся заново, когда зайдём к себе
  if(typeof hePaint === 'function') hePaint();
  homeRoot.visible = false; scene.fog = FOG; snow.visible = true; homeLights(false);
  if(quiet) return;
  flash(); sfx.whoosh();
  v.pos.set(-1.3, 0.25, -0.45); v.tgt = VS_SPOT.clone(); v.yaw = 0;
  if(/^[🏠🐠🎲🏆]/u.test(mgHintEl.textContent)) mgHint('');
}
// камера — как у хозяйки в этой комнате (homeView / RM.cam / ocView)
function hdView(rm){
  const portrait = innerWidth < innerHeight, C = RM[rm] && RM[rm].cam;
  if(rm === 'ocean') return {c:[0, -1.4, 1.4], size:portrait ? 8.6 : 10.5, lift:portrait ? -2.2 : -0.8, up:0.38};
  if(C) return {c:C.c, size:portrait ? C.p : C.l, lift:portrait ? C.lift : C.lift*0.15, up:C.up};
  return {c:[0.2, -0.3, 0.6], size:portrait ? 6.2 : 7.4, lift:portrait ? -1.2 : -0.2, up:0.5};
}
function hdCam(dt, snap){
  if(V.hde && !snap) return hdeCam(dt);   // обустраивают вдвоём — сверху, как у неё (js/decorduo.js)
  const W = hdView(V.hrm || 'hall');
  const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov)/2), fd = Math.max(W.size/2/(tv*camera.aspect), W.size*1.5/2/tv);
  const look = hdBase().clone().add(new V3(W.c[0], W.c[2] - W.lift, W.c[1])), pos = look.clone().add(new V3(0, fd*W.up, fd));
  const k = snap ? 1 : Math.min(1, dt*3);
  runCam.pos.lerp(pos, k); runCam.look.lerp(look, k);
}
function hdClamp(p){
  const rm = V.hrm || 'hall', l = Math.hypot(p.x, p.z), lim = (rm === 'ocean' ? OC_R - 0.6 : HOME_R - 0.7); if(l > lim){ p.x *= lim/l; p.z *= lim/l; }
  const out = (x, z, r) => { const d = new V3(p.x - x, 0, p.z - z), dl = d.length(); if(dl < r){ if(dl < 0.01) d.set(-1, 0, 0); d.setLength(r); p.x = x + d.x; p.z = z + d.z; } };
  if(typeof HW_FIXED !== 'undefined') for(const [x, z, r] of HW_FIXED[rm] || []) out(x, z, r + 0.3);   // стол, табуретки, витрины, кормушка
  if(V.hv) out(V.hp.x, V.hp.z, 0.8);   // не на её малыша
  p.y = 0.25; return p;
}
// касание: вещь хозяйки — позвать её малыша поиграть; мимо мебели — то, что умеет комната
function hdTap(cx, cy){
  const rect = canvas.getBoundingClientRect();
  ndc.set((cx - rect.left)/rect.width*2 - 1, -((cy - rect.top)/rect.height)*2 + 1);
  ray.setFromCamera(ndc, camera);
  const root = HOME_ROOMS[V.hrm || 'hall'].root, list = Object.values(homeItems).filter(o => o.parent === root);
  const hit = ray.intersectObjects(list, true)[0];
  let o = hit && hit.object; while(o && !o.userData.id) o = o.parent;
  if(!o) return hdRoomTap(cx, cy);
  sfx.tap();
  const w = o.getWorldPosition(new V3());
  burst(TEX.heart, w.clone().add(new V3(0, 0.8, 0)), 6, 1.4, 0.26);
  if(V.cd <= 0){ V.cd = 1.5; netSend({t:'vhplay', id:o.userData.id}); }
  hdNear(w);
  return true;
}
function hdNear(w){   // подойти поближе к тому, что тронули
  const q = w.clone().sub(hdBase()); const d = new V3(-q.x, 0, -q.z); if(d.length() > 0.01) d.setLength(1.1);
  V.tgt = hdClamp(new V3(q.x + d.x, 0.25, q.z + d.z));
}
const hdAsk = g => { if(vsGames().includes(g)) iduAsk(g); else { sfx.tap(); toast(L('Эта игра пока закрыта 🔒', 'This game is still locked 🔒'), 2400); } };
const hdF = () => !!(V.pal && V.pal.f);   // её малыш — девочка?
const hdLead = () => { sfx.tap(); toast(L(`Ведёт ${V.name} — куда ${hdF() ? 'она' : 'он'}, туда и ты 🙂`, `${V.name} leads — you follow 🙂`), 2600); };
function hdRoomTap(cx, cy){
  const rm = V.hrm, H = V.hh || {};
  if(rm === 'ocean'){
    ocRay(cx, cy);
    const hit = ray.intersectObjects([OC.door, OC.feeder, OC.hatch], true)[0];
    if(hit){ let o = hit.object; while(o && !o.userData.oc) o = o.parent; const k = o && o.userData.oc;
      if(k === 'door'){ hdLead(); return true; }
      if(k === 'feed'){ sfx.tap(); hdNear(OC.feeder.getWorldPosition(new V3())); if(V.cd <= 0){ V.cd = 2; netSend({t:'vhplay', id:'@feed'}); } return true; }
      if(k === 'hatch'){ hdAsk('dive'); return true; } }
    const who = ocPick(cx, cy);
    if(who){ ocShow(who); return true; }
    const g = ray.intersectObject(OC.glass)[0];
    if(g){ ocKnock(g.point, true); hdFx('knock', g.point.clone().sub(OC_POS)); return true; }
    return false;
  }
  if(rm === 'games'){
    if(rmArchHit(GM.door, cx, cy)){ hdLead(); return true; }
    ocRay(cx, cy);
    if(ray.intersectObjects(GM.boxes, true).length || ray.intersectObject(GM.table, true).length){ hdAsk('bg'); return true; }
    if(ray.intersectObject(GM.boardG, true).length){ sfx.pop(); toast(L(`🎲 У ${V.name}: коробок ${H.got.length}, партий ${H.bn}, побед ${H.bw}`, `🎲 ${V.name} has ${H.got.length} boxes, ${H.bn} games, ${H.bw} wins`), 3200); return true; }
    return false;
  }
  if(rm === 'trophy'){
    if(rmArchHit(TROOM.door, cx, cy)){ hdLead(); return true; }
    ocRay(cx, cy);
    const hit = ray.intersectObjects(TROOM.hits, true)[0]; if(!hit) return false;
    let o = hit.object; while(o && !o.userData.tr) o = o.parent; const k = o && o.userData.tr; if(!k) return false;
    sfx.pop();
    const med = TR_MEDALS.filter((m, i) => H.med && H.med[i]);
    const say = k === 'cups' ? L(`🏆 Кубков у ${V.name}: ${H.cups.length} из ${TR_CUPS().length}`, `🏆 ${V.name}'s cups: ${H.cups.length} of ${TR_CUPS().length}`)
      : k === 'medals' ? (med.length ? L(`🎖️ Медали: ${med.map(m => m.ic + ' ' + m.name).join(', ')}`, `🎖️ Medals: ${med.map(m => m.ic + ' ' + m.name).join(', ')}`) : L('🎖️ Медалей пока нет — всё впереди!', '🎖️ No medals yet — all still to come!'))
      : k === 'finds' ? L(`🔍 Находок: ${H.finds.length} из ${TREASURES.length}`, `🔍 Treasures: ${H.finds.length} of ${TREASURES.length}`)
      : k === 'diploma' ? (H.fin ? L('📜 Грамота за праздник острова!', '📜 The island party certificate!') : L('📜 Грамота будет после праздника острова', '📜 The certificate comes after the island party'))
      : L(`📷 Фото — в альбоме у ${V.name}`, `📷 The photos are in ${V.name}'s album`);
    toast(say, 3600); hdNear(o.getWorldPosition(new V3()));
    return true;
  }
  return false;
}
