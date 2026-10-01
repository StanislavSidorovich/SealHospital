/* ---------------- 🚪 Комнаты иглу: общий каркас (Спринт 7, задача 5) ----------------
   Иглу растёт. Кроме 🐠 океанариума (js/ocean.js) есть ещё две комнаты, у них общий каркас — этот файл:
   🎲 Игровая (js/gameroom.js) и 🏆 Комната трофеев (js/trophyroom.js). В стене прихожей — арка на каждую комнату:
   сначала заложена кирпичиками, касание — «построить» (медведь или Пинг за цену 🐚, готово завтра, в ?test=1 сразу),
   потом открыта. Строитель один: пока строит одну комнату, другую заказать нельзя (save.home.build = {id, d} — одна стройка).
   Комната — RM[id]: ic, name, price, gate (замок главы, ST_GATE), hallA (угол арки в прихожей), doorA (угол двери внутри),
   pos (где стоит), shell{} (стены и пол), fill(root) — расставить вещи один раз, enter() — обновить при заходе,
   tap(cx, cy) — касания мимо мебели, tick(t, dt), ui() — подписи. Общие места и мебель — homeSlotAdd / FURN / FURN_MAKE, как в океанариуме.
   Кнопка «Комнаты» внизу (#homeRoomBtn): одна комната — идёт прямо, несколько — выбор. Сохранение: save.home.rooms[id] = 1 | 2 (data.js).
   Подключается после ocean.js и до gameroom.js / trophyroom.js. */
const RM = {
  games:{ic:'🎲', gate:'gameroom', price:60, hallA:1.05,  doorA:-1.25, pos:new V3(320, 0, 0), shell:{}},
  trophy:{ic:'🏆', gate:'trophy',   price:70, hallA:-0.98, doorA:1.25,  pos:new V3(380, 0, 0), shell:{}}
};
RM.games.name = L('Игровая', 'Game room'); RM.trophy.name = L('Комната трофеев', 'Trophy room');
RM.games.pitch = () => L('Уютная комната с большим столом: все твои настольные игры в одном месте, пуфики и игрушки.', 'A cosy room with a big table: all your board games in one place, plus poufs and toys.');
RM.trophy.pitch = () => L(`Комната-музей: кубки, медали, находки и фото твоих пациентов — всё, чего ты ${pg('добился', 'добилась')}.`, 'A little museum: cups, medals, treasures and photos of your patients — everything you have achieved.');
const RM_IDS = Object.keys(RM);
const rmBuilt = id => !!save.home.rooms[id];
const rmLocked = id => stGate(RM[id].gate) >= 0;
const rmBuilding = () => save.home.build ? save.home.build.id : null;
function rmState(id){ return rmLocked(id) && !rmBuilt(id) ? 'none' : rmBuilt(id) ? 'open' : rmBuilding() === id ? 'build' : 'plan'; }
const rmDoorTex = {
  games:canvasTex(128, (g, s) => { const gr = g.createRadialGradient(s/2, s*0.62, 4, s/2, s*0.62, s*0.62); gr.addColorStop(0, '#FFF0FA'); gr.addColorStop(0.5, '#FFB3D9'); gr.addColorStop(1, '#B06FD6'); g.fillStyle = gr; g.fillRect(0, 0, s, s);
    g.fillStyle = 'rgba(255,255,255,.75)'; for(const [x, y, r] of [[36, 86, 5], [92, 70, 4], [60, 40, 3], [98, 100, 4]]){ g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); } }),
  trophy:canvasTex(128, (g, s) => { const gr = g.createRadialGradient(s/2, s*0.62, 4, s/2, s*0.62, s*0.62); gr.addColorStop(0, '#FFFBE0'); gr.addColorStop(0.5, '#FFD66B'); gr.addColorStop(1, '#C98A2E'); g.fillStyle = gr; g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(30, 90); g.lineTo(98, 90); g.stroke(); }),
  hall:canvasTex(128, (g, s) => { const gr = g.createRadialGradient(s/2, s*0.62, 4, s/2, s*0.62, s*0.62); gr.addColorStop(0, '#FFF6E4'); gr.addColorStop(0.55, '#F2C9A0'); gr.addColorStop(1, '#C99770'); g.fillStyle = gr; g.fillRect(0, 0, s, s); })
};

/* ---------- арка в стене: своя для каждой комнаты (в прихожей — заложена/стройка/открыта, в комнате — дверь обратно) ---------- */
function rmArch(parent, a, mark, holeMap){
  const g = new THREE.Group(), [x, z] = ocAt(a, HOME_R*0.975); g.position.set(x, HOME_Y, z); g.rotation.y = -a; parent.add(g);
  const sh = new THREE.Shape(); sh.moveTo(-0.58, 0); sh.lineTo(-0.58, 0.72); sh.absarc(0, 0.72, 0.58, Math.PI, 0, true); sh.lineTo(0.58, 0); sh.closePath();
  const geo = new THREE.ShapeGeometry(sh, 16), uv = geo.attributes.uv;
  for(let i = 0; i < uv.count; i++) uv.setXY(i, (geo.attributes.position.getX(i) + 0.58)/1.16, geo.attributes.position.getY(i)/1.3);
  const hole = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({map:holeMap})); hole.position.z = 0.02; g.add(hole);
  const fr = inkRing(new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.12, 10, 28, Math.PI), toon(0xF4F9FD))); fr.position.set(0, 0.72, 0.04); g.add(fr);
  for(const sd of [-1, 1]) islCyl(g, 0xF4F9FD, 0.12, 0.12, 0.72, sd*0.6, 0.36, 0.04, 10, 1.1);
  const mk = new THREE.Sprite(new THREE.SpriteMaterial({map:mark, transparent:true, depthWrite:false, depthTest:false})); mk.renderOrder = 8; mk.scale.setScalar(0.62); mk.position.set(0, 1.75, 0.2); g.add(mk);
  g.userData = {hole, mark:mk, a};
  return g;
}
// касание попало в арку или в значок над ней
function rmArchHit(g, cx, cy){
  if(!g.visible) return false;
  ocRay(cx, cy);
  const q = toScreen(g.userData.mark.getWorldPosition(new V3()));
  return ray.intersectObject(g, true).length > 0 || Math.hypot(q.x - cx, q.y - cy) <= 44;
}
const RM_MARK = {};
for(const id of RM_IDS){
  const R = RM[id];
  R.arch = rmArch(homeRoot, R.hallA, ocMarkTex(R.ic), OC_BRICK_TEX);
  const site = new THREE.Group(); R.arch.add(site); R.arch.userData.site = site; R.arch.userData.st = ''; R.arch.userData.bt = 0; R.arch.userData.builder = null;
  for(const [bx, by, bz] of [[-0.75, 0.2, 0.55], [-0.35, 0.2, 0.7], [-0.55, 0.6, 0.62]]) islBox(site, 0xDDEFFA, 0.38, 0.38, 0.38, bx, by, bz);
  const cone = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 12), toon(0xFFA552)), 1.08); cone.position.set(0.5, 0.2, 0.6); site.add(cone);
  RM_MARK[id] = {plan:ocMarkTex(R.ic), build:emojiTex('🚧'), open:emojiTex(R.ic)};
}
function rmArchUpd(id){
  const R = RM[id], U = R.arch.userData, st = rmState(id); if(U.st === st) return; U.st = st;
  R.arch.visible = st !== 'none';
  U.hole.material.map = st === 'open' ? rmDoorTex[id] : OC_BRICK_TEX; U.hole.material.needsUpdate = true;
  U.mark.material.map = RM_MARK[id][st] || RM_MARK[id].plan; U.mark.material.needsUpdate = true;
  U.site.visible = st === 'build';
  if(st === 'build' && !U.builder){
    let b;
    if(save.pt && save.pt.bear){ b = feBearMake(); b.scale.setScalar(0.34); const u = b.userData; if(u.shard) u.shard.visible = false; if(u.brows) u.brows.forEach(o => o.visible = false); }
    else { const p = makePenguin(PENG); b = p.root; b.scale.setScalar(0.5); }
    b.position.set(0.95, 0, 0.75); b.rotation.y = -0.5; U.site.add(b); U.builder = b;
  }
}
function rmHallTick(t, dt){
  for(const id of RM_IDS){
    rmArchUpd(id);
    const R = RM[id], U = R.arch.userData; if(!R.arch.visible) continue;
    const call = U.st === 'plan' || save.home.rooms[id] === 1;
    U.mark.position.y = 1.75 + (call ? Math.abs(Math.sin(t*3))*0.15 : Math.sin(t*2)*0.05);
    if(U.builder) U.builder.position.y = Math.abs(Math.sin(t*4))*0.06;
    if(U.st === 'open' && (U.bt -= dt) < 0){ U.bt = 1.6 + Math.random()*1.4; emit(TEX.star, R.arch.localToWorld(new V3((Math.random() - 0.5)*0.6, 0.3, 0.1)), {v:new V3(0, 0.5, 0.15), life:1.4, size:0.14}); }
  }
}
// касание по прихожей: арки комнат (океанариум обрабатывает ocHallTap раньше)
function rmHallTap(cx, cy){
  for(const id of RM_IDS) if(rmArchHit(RM[id].arch, cx, cy)){ rmHallAct(id); return true; }
  return false;
}
function rmHallAct(id){
  const st = rmState(id);
  if(st === 'open') return rmGo(id);
  if(st === 'build'){
    if(rmReady(id)){ rmArchUpd(id); return rmGo(id); }
    sfx.tap(); return toast(L(`${ocWho()} строит комнату «${RM[id].name}»! Приходи завтра — будет готово 🚧`, `${ocWho()} is building the ${RM[id].name}! Come back tomorrow — it will be ready 🚧`), 3400);
  }
  if(st === 'plan') rmOrder(id);
}

/* ---------- стройка ---------- */
async function rmOrder(id){
  if(busy || !mgRoot.hidden) return;
  const R = RM[id], who = ocWho(), other = save.home.build && save.home.build.id !== id;
  if(other){ sfx.tap(); return toast(L(`${who} ещё строит другую комнату. Подожди до завтра 🚧`, `${who} is still building another room. Wait until tomorrow 🚧`), 3400); }
  setBusy(true);
  camGlide(R.arch.getWorldPosition(new V3()).add(new V3(0, 0.9, 0)), 3.6, 0.6, 0.6, 0.45);
  mgOpen(`${R.ic} ${R.name}`);
  const need = R.price - save.shells;
  const panel = mgNode('div', 'mg-panel home-pick oc-order', `
    <p class="ttl display">${R.ic} ${R.name}</p>
    <p>${L(`${who} построит новую комнату. `, `${who} will build a new room. `)}${R.pitch()}</p>
    <p class="wallet">${L('У тебя', 'You have')} <b>${save.shells}</b> 🐚</p>
    <div class="row"><button class="btn${need > 0 ? ' off' : ''}" id="rmBuy">${need > 0 ? L(`Не хватает ${need} 🐚`, `Need ${need} more 🐚`) : L(`Построить за ${R.price} 🐚`, `Build for ${R.price} 🐚`)}</button><button class="btn ghost" id="rmNo">${L('Потом', 'Later')}</button></div>`);
  const buy = panel.querySelector('#rmBuy');
  const res = await new Promise(r => {
    mgOn(buy, 'click', () => { if(save.shells < R.price){ sfx.bad(); wiggle(buy); return toast(L('Лечи пациентов в больнице — за них дают ракушки 🐚', 'Heal patients at the hospital — you get shells for them 🐚')); } r('ok'); });
    mgOn(panel.querySelector('#rmNo'), 'click', () => r('no'));
  });
  sfx.tap(); panel.classList.add('away'); await wait(0.25); mgClose();
  homeView(); setBusy(false);
  if(res !== 'ok') return;
  save.shells -= R.price; shellsShown = save.shells; renderShells();
  save.home.build = {id, d:TEST ? '' : ocDay()}; persist();
  sfx.buy(); burst(TEX.star, R.arch.getWorldPosition(new V3()).add(new V3(0, 1, 0)), 14, 2, 0.3);
  rmArchUpd(id);
  if(TEST){ rmReady(id); rmArchUpd(id); toast(L('Готово! (в проверке строится сразу)', 'Done! (built at once in test mode)'), 2400); return; }
  toast(L(`${who} уже несёт льдинки! Приходи завтра — комната будет готова ${R.ic}`, `${who} is already carrying ice blocks! Come back tomorrow — the room will be ready ${R.ic}`), 4600);
}
// стройка закончилась (на следующий день)
function rmReady(id){
  const b = save.home.build;
  if(!b || b.id !== id || b.d === ocDay()) return false;
  save.home.rooms[id] = 1; save.home.build = null;
  for(const [k, f] of Object.entries(RM[id].gift || {})) if(!homeKindAny(k)) homeGive(f);   // подарок: по вещи каждого вида
  persist(); if(homeMode){ homeBuild(); homeUi(); renderHomeBtn(); } return true;
}
const rmAlert = () => RM_IDS.some(id => rmBuilt(id) ? save.home.rooms[id] === 1 : !!(save.home.build && save.home.build.id === id && save.home.build.d !== ocDay()));
async function rmHallNews(){
  const done = RM_IDS.filter(rmReady);
  const fresh = RM_IDS.filter(id => save.home.rooms[id] === 1);
  if(!fresh.length) return;
  if(done.length) homeBuild();
  await wait(typeof ocAlert === 'function' && ocAlert() ? 7.4 : 2.6); if(!homeMode || homeRoom !== 'hall') return;
  const R = RM[fresh[0]];
  sfx.star(); burst(TEX.star, R.arch.getWorldPosition(new V3()).add(new V3(0, 1.2, 0)), 14, 2, 0.3);
  toast(L(`${ocWho()} достроил комнату «${R.name}»! Нажми на арку ${R.ic} или кнопку внизу`, `${ocWho()} finished the ${R.name}! Tap the arch ${R.ic} or the button below`), 4600);
  homeUi();
}
/* ---------- комната: оболочка (пол, купол, дверь, снег вокруг) ---------- */
// def: shell{wall, floor, side, rim} — текстуры и цвета, fill(root), enter(), tap(cx, cy), tick(t, dt), ui(), first() — текст при первом заходе, spot — где ждёт малыш
function rmDefine(id, def){
  const R = Object.assign(RM[id], def);
  rmShell(id);
  R.spot = R.spot || [0.2, 1.2];
  HOME_ROOMS[id] = {root:R.root, pos:R.pos, spot:R.spot, mat:R.mat,
    view(instant){   // камера ближе, чем в прихожей: R.cam = {c:[x, z, y] куда смотрим, p — ширина кадра на телефоне, l — на планшете, lift, up}
      const C = R.cam, portrait = innerWidth < innerHeight, c = hp(C.c[0], C.c[1], C.c[2]), size = portrait ? C.p : C.l, lift = portrait ? C.lift : C.lift*0.15;
      if(!instant) return camGlide(c, size, 0.6, lift, C.up);
      focusCam(c, size, lift, C.up); camFocus.k = 1;
    },
    ui(){ $('#homeName').textContent = `${R.ic} ${R.name}`; R.ui(); homeEditUi(); },
    tap(cx, cy){ if(rmArchHit(R.door, cx, cy)) return rmBack(); if(R.tap) R.tap(cx, cy); },
    tick(t, dt){ if(R.tick) R.tick(t, dt); },
    leave(){ rmLeave(id); }};
  return R;
}
function rmShell(id){
  const R = RM[id], S = R.shell, root = new THREE.Group(); root.position.copy(R.pos); root.visible = false; scene.add(root); R.root = root;
  const side = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(HOME_R + 0.15, HOME_R + 0.3, 0.5, 64), toon(S.side || 0xD6EAF5)), 1.02); side.position.y = HOME_Y - 0.25; root.add(side);
  const fm = toon(0xFFFFFF); fm.map = S.floor; const top = new THREE.Mesh(new THREE.CircleGeometry(HOME_R + 0.02, 64), fm); top.rotation.x = -Math.PI/2; top.position.y = HOME_Y + 0.002; root.add(top);
  const wm = toon(0xFFFFFF); wm.map = S.wall; wm.side = THREE.DoubleSide;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(HOME_R, 56, 24, Math.PI, Math.PI, 0, Math.PI/2), wm); dome.position.y = HOME_Y; root.add(dome);
  R.mat = {wall:wm, floor:fm, own:{wall:S.wall, floor:S.floor}};   // 🎨 краски стен и пола (js/homeedit.js)
  const arc = inkRing(new THREE.Mesh(new THREE.TorusGeometry(HOME_R, 0.14, 10, 72, Math.PI), toon(S.rim || 0xF4F9FD))); arc.position.y = HOME_Y; root.add(arc);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(160, 48), toon(0xEAF4FA)); ground.rotation.x = -Math.PI/2; ground.position.y = -0.3; root.add(ground);
  for(const [x, z, s] of [[-7, -6, 2.4], [6.5, -7.5, 3], [-12, -14, 4], [12, -13, 3.6], [0, -16, 5]]){ const m = addOutline(new THREE.Mesh(SMALL, toon(0xF6FBFE)), 1.04); m.scale.set(s, s*0.45, s); m.position.set(x, -0.3, z); root.add(m); }
  R.door = rmArch(root, R.doorA, emojiTex('🏠'), rmDoorTex.hall); R.door.userData.mark.scale.setScalar(0.5);
  return root;
}
let rmCur = null;   // id комнаты, где сейчас малыш (не прихожая)

/* ---------- из прихожей в комнату и обратно ---------- */
async function rmGo(id){
  const R = RM[id];
  if(busy || !mgRoot.hidden || !rmBuilt(id) || homeRoom !== 'hall') return;
  setBusy(true); homeEdit = false; homeIdleT = 12;
  const s = petSeal;
  if(s.sleeping) await petWake();
  await homeGo(ocAt(R.hallA, HOME_R - 1.3)); await waddleTo(s, hp(...ocAt(R.hallA, HOME_R - 0.4)), 0.45);
  sfx.whoosh(); flash();
  if(!R.filled){ R.filled = true; R.fill(R.root); }
  homeRoom = id; rmCur = id; R.root.visible = true; homeRoot.visible = false; $('#homeDim').classList.remove('on');
  if(R.enter) R.enter();
  s.root.position.copy(hp(...ocAt(R.doorA, HOME_R - 0.5))); s.root.rotation.set(0, 0, 0);
  camFocus.yaw = 0; homeView(true); homeUi(); homeBuild();
  await wait(0.35);
  await waddleTo(s, hp(...R.spot), 1.1); await turnTo(s, 0, 0.3);
  const first = save.home.rooms[id] !== 2;
  sfx.arf(); s.happyUntil = now + 3; setMood(s, 'happy'); hop(s, 0.3, 0.4);
  floatText(L('Ух ты!', 'Wow!'), headTop(s), '#D9527E');
  if(first){ save.home.rooms[id] = 2; persist(); renderHomeBtn(); toast(R.first(), 6000); }
  setBusy(false);
}
async function rmBack(){
  const id = rmCur, R = id && RM[id];
  if(!R || busy || homeRoom !== id) return;
  setBusy(true); homeEdit = false; homeIdleT = 12;
  const s = petSeal;
  await homeGo(ocAt(R.doorA, HOME_R - 1.3)); await waddleTo(s, hp(...ocAt(R.doorA, HOME_R - 0.4)), 0.45);
  sfx.whoosh(); flash();
  rmLeave(id); homeRoom = 'hall'; homeRoot.visible = true;
  if(!homeLight) $('#homeDim').classList.add('on');
  s.root.position.copy(hp(...ocAt(R.hallA, HOME_R - 0.5))); camFocus.yaw = 0; homeView(true); homeUi();
  await wait(0.3);
  await waddleTo(s, hp(HOME_SPOT[0], HOME_SPOT[1]), 1.0); await turnTo(s, 0, 0.3);
  setBusy(false);
}
function rmLeave(id){ const R = RM[id]; if(R && R.root) R.root.visible = false; if(rmCur === id) rmCur = null; if(R && R.leave) R.leave(); }

/* ---------- кнопка «Комнаты» внизу ---------- */
const HOME_ROOM_LIST = () => [
  {id:'ocean', ic:'🐠', name:L('Океанариум', 'Oceanarium'), built:ocBuilt(), go:() => ocGo()},
  ...RM_IDS.map(id => ({id, ic:RM[id].ic, name:RM[id].name, built:rmBuilt(id), go:() => rmGo(id)}))
];
function rmRoomBtn(b){
  if(!b) return;
  const list = HOME_ROOM_LIST().filter(r => r.built);
  b.hidden = !list.length;
  const hall = homeRoom === 'hall';
  b.querySelector('.face').textContent = !hall ? '🏠' : list.length === 1 ? list[0].ic : '🏘️';
  b.querySelector('.name').textContent = !hall ? L('Прихожая', 'Hallway') : list.length === 1 ? list[0].name : L('Комнаты', 'Rooms');
}
function rmRoomGo(){
  if(homeRoom === 'ocean') return ocBack();
  if(homeRoom !== 'hall') return rmBack();
  const list = HOME_ROOM_LIST().filter(r => r.built);
  if(list.length === 1) return list[0].go();
  if(list.length) rmPick(list);
}
async function rmPick(list){
  if(busy || !mgRoot.hidden) return;
  mgOpen('');
  const panel = mgNode('div', 'mg-panel fun-pick rm-pick', `
    <p class="ttl display">🚪 ${L('Куда пойдём?', 'Where to?')}</p>
    <div class="picks">${list.map(r => `<button data-k="${r.id}"><span class="ic">${r.ic}</span><b>${r.name}</b></button>`).join('')}</div>
    <button class="btn ghost small" data-k="no">${L('Потом', 'Later')}</button>`);
  const k = await new Promise(r => panel.querySelectorAll('[data-k]').forEach(b => mgOn(b, 'click', () => { sfx.tap(); r(b.dataset.k); })));
  panel.classList.add('away'); await wait(0.2); mgClose();
  const hit = list.find(r => r.id === k); if(hit) hit.go();
}

/* ---------- прихожая знает про новые арки ---------- */
{ const tapOc = HOME_ROOMS.hall.tap, tickOc = HOME_ROOMS.hall.tick;   // прихожая: сначала арка океанариума, потом остальные
  HOME_ROOMS.hall.tap = (x, y) => { if(tapOc(x, y)) return; rmHallTap(x, y); };
  HOME_ROOMS.hall.tick = (t, dt) => { tickOc(t, dt); rmHallTick(t, dt); }; }
