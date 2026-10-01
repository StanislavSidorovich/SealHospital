/* ---------------- 🛋️ «Обустроить»: мебель где угодно и краски (Спринт 8, задача 4, заход 1) ----------------
   Кнопка «Обустроить» в иглу открывает редактор (общее сердце — js/editor.js): камера смотрит сверху, на полу сетка,
   внизу панель: 📦 «Мои вещи» (что в коробке и что стоит в других комнатах), 🛒 «Купить», 🎨 «Краски», ↩️ и ✓ «Готово».
   Коснись вещи в панели — она встанет в комнату (на своё обычное место, если оно свободно, иначе рядом) и будет выбрана.
   Дальше — как в редакторе: тащи пальцем, коснись ещё раз — повернётся (на 45°), 📦 — обратно в коробку.
   Где что стоит — save.home.f = {id: [комната, x, z, поворот]} (у настенной вещи x — угол по стене, z — высота-угол), см. data.js и home.js.
   Правила комнат — HE_ROOMS: можно ли вешать на стены, где арки (перед ними и над ними не ставим), что ещё висит на стене;
   столы и витрины на полу — HW_FIXED (js/homewalk.js), размеры вещей — HW_SOL / HE_FOOT / HE_WALL.
   Вещи сухих комнат (прихожая, Игровая, трофеи) ходят между ними; украшения дна — только в океанариуме, за стеклом.
   🎨 Краски: HE_WALLS / HE_FLOORS, по HE_PAINT 🐚 каждая (купленная — 'pw_id' / 'pf_id' в owned, работает во всех комнатах),
   save.home.paint = {комната: {w, f}}; пусто — «как было» (своя текстура комнаты). Океанариум не красим (стекло).
   Подключается после editor.js и до cave.js / game.js. */
const HE_STEP = 0.25, HE_TURN = Math.PI/4, HE_WSTEP = 0.04, HE_PAINT = 5;
const HE_FLAT = {rug:1.3};   // плоские вещи: на них и под ними можно ставить, от края комнаты — на этот радиус
const HE_FOOT = {oc1:1.2, oc2:0.8, oc3:1.0};   // радиус вещей, которых нет в HW_SOL
const HE_WALL = {window:[1.4, 1.4], shelf:[1.8, 0.85], pic:[1.15, 1.05], gm3:[1.15, 0.85]};   // настенные: ширина и высота, м
const HE_DRY = ['hall', 'games', 'trophy'];
// wall — можно ли вешать на стены; arches() — углы арок; walls — что ещё висит: [угол, высота-угол, ширина, высота]
const HE_ROOMS = {
  hall:  {wall:true,  arches:() => [OC_HALL_A, ...RM_IDS.map(id => RM[id].hallA)], walls:[]},
  games: {wall:true,  arches:() => [RM.games.doorA], walls:[[-0.05, 0.5, 1.6, 0.95]]},   // доска счёта
  trophy:{wall:false, arches:() => [RM.trophy.doorA], walls:[]},   // стены трофеев заняты кубками, рамками и грамотой
  ocean: {wall:false, arches:() => [], walls:[]}
};
// камера в «Обустроить»: сверху, весь пол виден, панель внизу его не закрывает. c — [x, z, y] куда смотрим, p — ширина кадра на телефоне, l — на планшете
const HE_CAM = {dry:{c:[0, 0.2, 0.4], p:6.5, l:8.6, lift:0.55, up:0.5}, ocean:{c:[0, -5.8, -0.4], p:9.5, l:12, lift:0.6, up:0.75}};
const HE_PUP = () => innerWidth < innerHeight ? [-2.75, 3.65] : [-4.8, 2.2];   // пока обустраиваем, малыш смотрит снаружи, сбоку от порога, и не загораживает мебель
const heFoot = id => { const k = homeKind(id); if(HE_FLAT[k]) return 0; const s = HW_SOL_ID[id] || HW_SOL[k]; return s ? s[0] : HE_FOOT[k] || 0.6; };
const heBound = id => HE_FLAT[homeKind(id)] || heFoot(id);
const heIsWall = id => !!HOME_SLOTS[homeKind(id)].wall;
const heRound = v => Math.round(v*1000)/1000;
// вещь подходит комнате: украшения дна — только в океанариум, остальное — в сухие комнаты (настенное — где есть стены)
const heFits = (id, room) => /^oc/.test(homeKind(id)) ? room === 'ocean' : HE_DRY.includes(room) && (!heIsWall(id) || HE_ROOMS[room].wall);
// вид уже можно ставить: его комната построена (вещи Игровой не появятся, пока её нет)
const heKindOpen = k => { const r = kindRoom(k); return r === 'hall' || (r === 'ocean' ? ocBuilt() : rmBuilt(r)); };

/* ---------- можно ли тут стоять ---------- */
function heOk(id, room, p){
  if(heIsWall(id)) return heWallOk(id, room, p);
  if(!HE_ROOMS[room]) return false;
  const rr = heFoot(id), d = Math.hypot(p.x, p.z);
  if(room === 'ocean'){ if(p.z > -4.6 || p.z < -8 || Math.abs(p.x) > 6 || d < OC_R + 1 + rr*0.5) return false; }
  else {
    if(d + heBound(id)*(p.z > 0 ? 0.7 : 1) > HOME_R - (p.z > 0 ? 0 : 0.15)) return false;   // спереди купола нет — можно ближе к краю
    if(rr){
      for(const [x, z, r] of HW_FIXED[room] || []) if(Math.hypot(p.x - x, p.z - z) < r + rr - 0.1) return false;   // столы и витрины
      for(const a of HE_ROOMS[room].arches()){ const [x, z] = ocAt(a, HOME_R - 0.5); if(Math.hypot(p.x - x, p.z - z) < 0.55 + rr*0.7) return false; }   // проход к арке
    }
  }
  return heClear(id, room, p);
}
// не налезает на другие вещи (обычные места видов этим и проверяем: они старые и проверенные, хоть и стоят у арок)
function heClear(id, room, p){
  if(heIsWall(id)) return heWallOk(id, room, p, true);
  const rr = heFoot(id); if(!rr) return true;
  for(const o of homeIn(room)){
    if(o === id || heIsWall(o)) continue;
    const r2 = heFoot(o), P = save.home.f[o]; if(!r2 || P.length < 4) continue;
    if(Math.hypot(p.x - P[1], p.z - P[2]) < rr + r2 - 0.05) return false;
  }
  return true;
}
// на стене: прямоугольники по дуге стены (s — сколько метров от середины, y — высота)
function heWallBox(a, e, w, h){ const r = HOME_R*0.955; return {s:a*r*Math.cos(e), y:Math.sin(e)*r, w, h}; }
function heWallOk(id, room, p, items){   // items — проверить только другие вещи
  const RW = HE_ROOMS[room]; if(!RW || !RW.wall) return false;
  const [w, h] = HE_WALL[homeKind(id)] || [1.2, 1], A = heWallBox(p.x, p.z, w, h);
  const hit = B => Math.abs(A.s - B.s) < (A.w + B.w)/2 - 0.05 && Math.abs(A.y - B.y) < (A.h + B.h)/2 - 0.12;   // чуть налезть можно: купол круглый
  if(!items){
    if(Math.abs(p.x) > 1.3 || p.z < 0.2 || p.z > 0.8) return false;
    for(const a of RW.arches()) if(hit({s:a*HOME_R*0.955, y:0.72, w:1.4, h:1.45})) return false;   // арка с рамкой
    for(const [a, e, ww, hh] of RW.walls) if(hit(heWallBox(a, e, ww, hh))) return false;
  }
  for(const o of homeIn(room)){
    if(o === id || !heIsWall(o)) continue;
    const P = save.home.f[o]; if(P.length < 4) continue;
    const [w2, h2] = HE_WALL[homeKind(o)] || [1.2, 1];
    if(hit(heWallBox(P[1], P[2], w2, h2))) return false;
  }
  return true;
}
// свободное место для вещи: сначала near (обычное место вида — ему хватает, что не налезает на вещи), потом ближайшее к нему
// (или к середине комнаты). → [x, z, поворот] или null
function heFree(id, room, near, r = 0){
  if(near && heClear(id, room, {x:near[0], z:near[1], r})) return [near[0], near[1], r];
  if(heIsWall(id)){
    if(!HE_ROOMS[room] || !HE_ROOMS[room].wall) return null;
    const sl = HOME_SLOTS[homeKind(id)], a0 = near ? near[0] : 0, e0 = near ? near[1] : sl.wall[1];
    for(let i = 0; i < 70; i++){
      const a = a0 + (i % 2 ? 1 : -1)*Math.ceil(i/2)*HE_WSTEP;
      for(const e of [e0, 0.5, 0.36, 0.64]) if(heWallOk(id, room, {x:a, z:e})) return [heRound(a), heRound(e), 0];
    }
    return null;
  }
  const c = near || (room === 'ocean' ? [0, -6.2] : [0, 0.75]);
  let best = null, bd = 1e9;
  for(let x = -6; x <= 6; x += HE_STEP) for(let z = -8; z <= 4; z += HE_STEP){
    const d = Math.hypot(x - c[0], z - c[1]); if(d >= bd) continue;
    if(heOk(id, room, {x, z, r})){ best = [x, z, r]; bd = d; }
  }
  return best;
}
// ➕ на обычном месте вида — только если место свободно
function heSpotFree(k){
  const f = FURN.find(x => x.slot === k); if(!f) return false;
  const [x, z, r] = kindSpot(k); return heClear(f.id, kindRoom(k), {x, z, r});
}

/* ---------- палец → точка на полу или на стене ---------- */
function heRay(cx, cy){
  const rect = canvas.getBoundingClientRect();
  ndc.set((cx - rect.left)/rect.width*2 - 1, -((cy - rect.top)/rect.height)*2 + 1); ray.setFromCamera(ndc, camera);
  return ray.ray;
}
function heAt(id, cx, cy){
  const room = save.home.f[id][0], R = HOME_ROOMS[room], rr = heRay(cx, cy);
  if(heIsWall(id)){   // дальняя точка на куполе: передней половины нет
    const c = R.pos.clone().add(new V3(0, HOME_Y, 0)), r = HOME_R*0.955, oc = rr.origin.clone().sub(c);
    const b = oc.dot(rr.direction), q = b*b - (oc.lengthSq() - r*r); if(q < 0) return null;
    const p = rr.origin.clone().addScaledVector(rr.direction, -b + Math.sqrt(q)).sub(c);
    return {x:Math.max(-1.3, Math.min(1.3, Math.atan2(p.x, -p.z))), z:Math.max(0.22, Math.min(0.78, Math.asin(Math.max(-1, Math.min(1, p.y/r)))))};
  }
  const y = R.pos.y + (room === 'ocean' ? -0.6 : HOME_Y), dy = rr.direction.y; if(dy > -0.02) return null;
  const t = (y - rr.origin.y)/dy, x = rr.origin.x + rr.direction.x*t - R.pos.x, z = rr.origin.z + rr.direction.z*t - R.pos.z;
  if(room === 'ocean') return {x:Math.max(-6, Math.min(6, x)), z:Math.max(-8, Math.min(-4.6, z))};
  const lim = HOME_R - heBound(id) - 0.15, d = Math.hypot(x, z);
  if(d > HOME_R + 1.2) return null;   // совсем мимо пола
  return d > lim ? {x:x*lim/d, z:z*lim/d} : {x, z};
}

/* ---------- хозяин для редактора (js/editor.js) ---------- */
const HE_A = {
  hit:(cx, cy) => homeItemAt(cx, cy),
  at:heAt,
  get(id){ const P = homeResolve(id); return {x:P[1], z:P[2], r:P[3]}; },
  put(id, p, lift){
    const o = homeItems[id]; if(!o) return;
    homePlace(o, id, [save.home.f[id][0], p.x, p.z, p.r]);
    if(lift){ if(heIsWall(id)) o.translateZ(lift*0.5); else o.position.y += lift; }
  },
  set(id, p){
    const r = heIsWall(id) ? 0 : heRound(((p.r % (Math.PI*2)) + Math.PI*2) % (Math.PI*2));
    save.home.f[id] = [save.home.f[id][0], heRound(p.x), heRound(p.z), r];
    if(homeItems[id]) homePlace(homeItems[id], id);
    persist();
  },
  ok:(id, p) => heOk(id, save.home.f[id][0], p),
  snap(id, p){
    if(heIsWall(id)) return {x:Math.max(-1.3, Math.min(1.3, Math.round(p.x/HE_WSTEP)*HE_WSTEP)), z:Math.max(0.2, Math.min(0.8, Math.round(p.z/HE_WSTEP)*HE_WSTEP)), r:0};
    return {x:Math.round(p.x/HE_STEP)*HE_STEP, z:Math.round(p.z/HE_STEP)*HE_STEP, r:p.r};
  },
  step:id => heIsWall(id) ? 0 : HE_TURN,
  ring(id, p){
    const room = save.home.f[id][0], R = HOME_ROOMS[room], sl = HOME_SLOTS[homeKind(id)];
    if(heIsWall(id)){
      const t = new THREE.Object3D(); homePlace(t, id, [room, p.x, p.z, 0]); t.translateZ(0.12);
      const [w, h] = HE_WALL[homeKind(id)] || [1.2, 1], at = t.position.clone().add(R.pos);
      return {at, r:Math.max(w, h)*0.55, q:t.quaternion.clone(), top:at.clone().add(new V3(0, h*0.5 + 0.35, 0))};
    }
    const at = R.pos.clone().add(new V3(p.x, homeFloorY(room, p.x, p.z) + 0.04, p.z));
    return {at, r:Math.max(0.5, (heFoot(id) || HE_FLAT[homeKind(id)] || 0.6) + 0.12), q:null, top:at.clone().add(new V3(0, Math.min(2.2, sl.mk || 1) + 0.3, 0))};
  },
  save:() => JSON.stringify({f:save.home.f, paint:save.home.paint}),
  load(s){ const o = JSON.parse(s); save.home.f = o.f; save.home.paint = o.paint; persist(); homeBuild(); heBarRender(); },
  box(id){
    delete save.home.f[id]; homeDrop(id); persist(); heBarRender(); heHint();
    if(!tipSeen('hebox')){ tipDone('hebox'); toast(L('Убрали в коробку 📦 — она внизу, в «Мои вещи»', 'Put away 📦 — it is in “My things” below'), 3000); }
  },
  yaw(dx, start){ if(start) HE.yaw0 = camFocus.yaw; else camFocus.yaw = Math.max(-0.6, Math.min(0.6, HE.yaw0 - dx*0.005)); },
  sel(id){ heHint(); },
  bad(){ if(now - HE.badT > 3){ HE.badT = now; toast(L('Тут тесно — поставь чуть дальше', 'It is too tight here — try a bit further away'), 2200); } },
  moved(id){
    const s = petSeal; if(!s || Math.random() > 0.35) return;
    const [ru, en] = [['Красиво!', 'So pretty!'], ['Вот тут лучше!', 'Better here!'], ['Ух ты!', 'Wow!']][Math.floor(Math.random()*3)];
    homeSay(s, ru, en, '#D9527E'); sfx.arf();
  }
};

/* ---------- войти и выйти ---------- */
const HE = {tab:'mine', yaw0:0, badT:-9, grids:{}, ask:null};
function heToggle(){
  if(homeEdit) return heStop(true);
  if(!homeMode || busy || !mgRoot.hidden || !petSeal) return;
  if(typeof hwStop === 'function') hwStop();
  homeEdit = true; homeIdleT = 12; HE.tab = 'mine'; HE.ask = null;
  edStart(HE_A); document.body.classList.add('ed-on'); heGrid(true); heBarRender();
  homeUi(); homeView();
  if(homeRoom !== 'ocean') homeGo(HE_PUP()).then(() => { if(homeEdit && petSeal) turnTo(petSeal, 0.4, 0.3); });
}
function heStop(back){
  if(!homeEdit && !edOn()) return;
  edStop(); homeEdit = false; HE.ask = null; document.body.classList.remove('ed-on'); heGrid(false); persist();
  if(back && homeMode){ sfx.star(); homeUi(); homeView(); homeIdleT = 3; }
}
function heTap(e){ return homeEdit && edOn() ? edDown(e) : false; }
function heView(instant){
  const C = homeRoom === 'ocean' ? HE_CAM.ocean : HE_CAM.dry, portrait = innerWidth < innerHeight;
  const c = hp(C.c[0], C.c[1], C.c[2]), size = portrait ? C.p : C.l, lift = portrait ? C.lift : C.lift*0.4;
  if(!instant) return camGlide(c, size, 0.6, lift, C.up);
  focusCam(c, size, lift, C.up); camFocus.k = 1;
}
function heHint(){
  if(!homeEdit) return;
  const id = edOn() && ED.sel;
  $('#homeHint').textContent = id ? (heIsWall(id) ? L(`${furn(id).name}: тащи по стене. 📦 — убрать`, `${furn(id).name}: drag it along the wall. 📦 puts it away`)
      : L(`${furn(id).name}: тащи, ↻ — повернуть, 📦 — убрать. Коснись пола — прыгнет туда`, `${furn(id).name}: drag it, ↻ turns, 📦 puts away. Tap the floor — it hops there`))
    : L('Тащи вещь пальцем. Коснись — выберешь, ещё раз — повернётся', 'Drag things with your finger. Tap to pick, tap again to turn');
}
function heTick(t, dt){
  if(edOn() && !homeEdit) heStop();
  if(!homeEdit) return;
  edTick(t);
  const g = HE.grids[homeRoom]; if(g) g.material.opacity = 0.42 + Math.sin(t*2)*0.06;
}
// сетка на полу (в океанариуме нет — там дно)
const HE_GRID_TEX = canvasTex(512, (g, s) => {
  const m = s/(2*(HOME_R - 0.05)), c = s/2;
  for(let i = -14; i <= 14; i++){
    const v = c + i*0.5*m; g.strokeStyle = i % 2 ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.9)'; g.lineWidth = i % 2 ? 2 : 3;
    g.beginPath(); g.moveTo(v, 0); g.lineTo(v, s); g.moveTo(0, v); g.lineTo(s, v); g.stroke();
  }
});
function heGrid(on){
  for(const r of HE_DRY){
    let g = HE.grids[r];
    if(on && r === homeRoom && !g && HOME_ROOMS[r] && HOME_ROOMS[r].root){
      g = new THREE.Mesh(new THREE.CircleGeometry(HOME_R - 0.05, 64), new THREE.MeshBasicMaterial({map:HE_GRID_TEX, transparent:true, opacity:0.45, depthWrite:false}));
      g.rotation.x = -Math.PI/2; g.position.y = HOME_Y + 0.022; g.renderOrder = 2; HOME_ROOMS[r].root.add(g); HE.grids[r] = g;
    }
    if(g) g.visible = on && r === homeRoom;
  }
}

/* ---------- 🎨 краски ---------- */
function heBricks(base, line, deco){
  const t = canvasTex(512, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    g.strokeStyle = line; g.lineWidth = 5; g.lineCap = 'round';
    const rows = 6, n = 8;
    for(let r = 0; r < rows; r++){
      const y = r*h/rows; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
      for(let i = 0; i < n; i++){ const x = (r % 2 ? w/n/2 : 0) + i*w/n; g.beginPath(); g.moveTo(x, y + 7); g.lineTo(x, y + h/rows - 7); g.stroke(); }
    }
    if(deco) for(let r = 0; r < 6; r++) for(let i = 0; i < 8; i++) deco(g, (r % 2 ? w/16 : 0) + i*w/8 + w/16, r*h/6 + h/12, r*8 + i);
  }, 256);
  t.wrapS = THREE.RepeatWrapping; t.repeat.set(2, 1); return t;
}
const heDot = col => (g, x, y, i) => { if(i % 2) return; g.fillStyle = col; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); };
const heHeart = col => (g, x, y, i) => { if(i % 3) return; g.fillStyle = col; heartPath(g, 22, x - 11, y - 12); g.fill(); };
function heStarAt(g, x, y, r){ g.beginPath(); for(let k = 0; k < 10; k++){ const rr = k % 2 ? r*0.45 : r, a = -Math.PI/2 + k*Math.PI/5; k ? g.lineTo(x + Math.cos(a)*rr, y + Math.sin(a)*rr) : g.moveTo(x + Math.cos(a)*rr, y + Math.sin(a)*rr); } g.closePath(); g.fill(); }
const heStar = col => (g, x, y, i) => { if(i % 3 === 1) return; g.fillStyle = col; heStarAt(g, x, y, i % 2 ? 6 : 10); };
function hePlanks(a, b, line){
  return canvasTex(512, (g, w) => {
    const pl = w/8;
    for(let i = 0; i < 8; i++){ g.fillStyle = i % 2 ? a : b; g.fillRect(i*pl, 0, pl, w); g.fillStyle = line; g.fillRect(i*pl, 0, 3, w); g.fillRect(i*pl, ((i*173) % 5 + 1)*w/6, pl, 3); }
  });
}
function heTiles(a, b, rep = 1.6){
  const t = canvasTex(256, (g, s) => {
    const n = 8, c = s/n;
    for(let i = 0; i < n; i++) for(let j = 0; j < n; j++){ g.fillStyle = (i + j) % 2 ? a : b; g.fillRect(i*c, j*c, c, c); }
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 2; for(let i = 0; i <= n; i++){ g.beginPath(); g.moveTo(i*c, 0); g.lineTo(i*c, s); g.moveTo(0, i*c); g.lineTo(s, i*c); g.stroke(); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); return t;
}
function heCarpet(base, spot, star){
  const t = canvasTex(256, (g, s) => {
    g.fillStyle = base; g.fillRect(0, 0, s, s); g.fillStyle = spot;
    for(let r = 0; r < 6; r++) for(let i = 0; i < 6; i++){ const x = (i + (r % 2)*0.5)*s/6 + 10, y = r*s/6 + 20; if(star) heStarAt(g, x, y, (r + i) % 3 ? 7 : 11); else { g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); } }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); return t;
}
const HE_WALLS = [
  {id:'pink',  name:L('Розовые', 'Pink'),        make:() => heBricks('#FFCFE0', '#E592B4', heHeart('#FFF2F7'))},
  {id:'mint',  name:L('Мятные', 'Mint'),         make:() => heBricks('#C8EDDB', '#7FC4A2', heDot('#F2FFF8'))},
  {id:'lilac', name:L('Сиреневые', 'Lilac'),     make:() => heBricks('#DDD2F8', '#A28ADB', heStar('#FFFFFF'))},
  {id:'lemon', name:L('Лимонные', 'Lemon'),      make:() => heBricks('#FBEAAE', '#D7B552')},
  {id:'peach', name:L('Персиковые', 'Peach'),    make:() => heBricks('#FCD3BB', '#DF946A', heDot('#FFF1E8'))},
  {id:'night', name:L('Ночное небо', 'Night sky'), make:() => heBricks('#7080C8', '#55629E', heStar('#FFE07A'))}
];
const HE_FLOORS = [
  {id:'honey', name:L('Светлое дерево', 'Light wood'), make:() => hePlanks('#EAC48C', '#E2BA80', '#B88A52')},
  {id:'rose',  name:L('Розовые доски', 'Pink boards'),  make:() => hePlanks('#EFB2C5', '#E8A6BB', '#C27C94')},
  {id:'mint',  name:L('Мятная плитка', 'Mint tiles'),   make:() => heTiles('#ACDEC5', '#D3EFE0')},
  {id:'ice',   name:L('Ледяная плитка', 'Ice tiles'),   make:() => heTiles('#B9D9EE', '#DCEDF8')},
  {id:'dots',  name:L('Ковёр в горошек', 'Dotty carpet'), make:() => heCarpet('#C3ACF0', '#FFFFFF')},
  {id:'stars', name:L('Звёздный ковёр', 'Star carpet'),  make:() => heCarpet('#6271BA', '#FFE07A', true)}
];
const HE_TEX = {};
const heTex = (kind, id) => { const k = kind + id; if(!HE_TEX[k]){ const d = (kind === 'w' ? HE_WALLS : HE_FLOORS).find(x => x.id === id); HE_TEX[k] = d ? d.make() : null; } return HE_TEX[k]; };
const hePaintOwn = (kind, id) => !id || owns((kind === 'w' ? 'pw_' : 'pf_') + id);
// покрасить все комнаты по сохранению (зовёт homeBuild)
function hePaint(){
  for(const r of HE_DRY){
    const M = HOME_ROOMS[r] && HOME_ROOMS[r].mat; if(!M) continue;
    const P = save.home.paint[r] || {};
    const w = (P.w && heTex('w', P.w)) || M.own.wall, f = (P.f && heTex('f', P.f)) || M.own.floor;
    if(M.wall.map !== w){ M.wall.map = w; M.wall.needsUpdate = true; }
    if(M.floor.map !== f){ M.floor.map = f; M.floor.needsUpdate = true; }
  }
}
const heSwatch = (kind, id) => { if(!id){ const M = HOME_ROOMS[homeRoom].mat; return (kind === 'w' ? M.own.wall : M.own.floor).image.toDataURL(); } return heTex(kind, id).image.toDataURL(); };
async function hePaintPick(kind, id){
  const r = homeRoom, P = save.home.paint[r] || {w:'', f:''}, was = P[kind] || '';
  if(was === (id || '')) return;
  const set = v => { save.home.paint[r] = {...(save.home.paint[r] || {w:'', f:''}), [kind]:v}; hePaint(); };
  if(hePaintOwn(kind, id)){ edPush(HE_A.save()); set(id || ''); persist(); sfx.pop(); return heBarRender(); }
  set(id); sfx.pop();   // примерить
  const d = (kind === 'w' ? HE_WALLS : HE_FLOORS).find(x => x.id === id);
  if(save.shells < HE_PAINT){ set(was); sfx.bad(); return toast(L(`Не хватает ${HE_PAINT - save.shells} 🐚 — лечи пациентов в больнице`, `You need ${HE_PAINT - save.shells} more 🐚 — heal patients at the hospital`), 3000); }
  const yes = await heAsk(`<span class="sw" style="background-image:url(${heSwatch(kind, id)})"></span><p><b>${d.name}</b><br>${L(`Краска за ${HE_PAINT} 🐚 — для всех комнат`, `Paint for ${HE_PAINT} 🐚 — for every room`)}</p>`, L(`Купить ✓`, 'Buy ✓'));
  if(!homeEdit) return;
  if(!yes){ set(was); return heBarRender(); }
  edPush(JSON.stringify({f:save.home.f, paint:{...save.home.paint, [r]:{...P, [kind]:was}}}));
  save.shells -= HE_PAINT; save.owned.push((kind === 'w' ? 'pw_' : 'pf_') + id); shellsShown = save.shells; renderShells(); persist();
  sfx.buy(); burst(TEX.star, hp(0, -0.5, 1.5), 12, 2, 0.3); heBarRender();
}

/* ---------- панель внизу: 📦 мои вещи, 🛒 купить, 🎨 краски ---------- */
const HE_ROOM_IC = r => r === 'hall' ? '🏠' : r === 'ocean' ? '🐠' : RM[r].ic;
const HE_ROOM_NAME = r => r === 'hall' ? L('Прихожая', 'Hallway') : r === 'ocean' ? L('Океанариум', 'Oceanarium') : RM[r].name;
// сначала то, что в коробке, потом то, что стоит в других комнатах; внутри — по порядку видов, как в HOME_SLOTS
const heOrder = list => list.sort((a, b) => (!!save.home.f[a.id] - !!save.home.f[b.id]) || SLOT_KEYS.indexOf(a.slot) - SLOT_KEYS.indexOf(b.slot));
const heMine = () => heOrder(FURN.filter(f => homeHas(f.id) && FURN_MAKE[f.id] && heKindOpen(f.slot) && heFits(f.id, homeRoom) && !(save.home.f[f.id] && save.home.f[f.id][0] === homeRoom)));
const heShop = () => heOrder(FURN.filter(f => !homeHas(f.id) && !f.gift && f.price > 0 && FURN_MAKE[f.id] && heKindOpen(f.slot) && heFits(f.id, homeRoom)));
function heBarMake(){
  const b = document.createElement('div'); b.id = 'edBar'; b.className = 'ed-bar';
  b.innerHTML = `<div class="ed-tabs" role="tablist">
      <button data-t="mine">📦 <span>${L('Мои вещи', 'My things')}</span></button>
      <button data-t="shop">🛒 <span>${L('Купить', 'Buy')}</span></button>
      <button data-t="paint">🎨 <span>${L('Краски', 'Paint')}</span></button></div>
    <div class="ed-strip"></div>
    <div class="ed-row"><button class="btn ghost" id="edUndo">↩️ ${L('Отменить', 'Undo')}</button><button class="btn" id="edDone">✓ ${L('Готово', 'Done')}</button></div>`;
  b.addEventListener('pointerdown', e => e.stopPropagation());
  b.querySelectorAll('[data-t]').forEach(t => t.addEventListener('click', () => { if(HE.ask) return; sfx.tap(); HE.tab = t.dataset.t; heBarRender(); }));
  b.querySelector('#edUndo').addEventListener('click', () => { if(HE.ask) return; if(edUndo()) heHint(); });
  b.querySelector('#edDone').addEventListener('click', () => { if(HE.ask) return; sfx.tap(); heStop(true); });
  $('#app').appendChild(b); return b;
}
function heBarRender(){
  const b = $('#edBar') || heBarMake(); if(!homeEdit) return;
  homeUi();   // счёт вещей в комнате
  const mine = heMine(), shop = heShop(), paintable = !!HOME_ROOMS[homeRoom].mat;
  b.querySelectorAll('[data-t]').forEach(t => {
    t.classList.toggle('on', t.dataset.t === HE.tab);
    t.hidden = t.dataset.t === 'paint' && !paintable;
    const n = t.dataset.t === 'mine' ? mine.length : t.dataset.t === 'shop' ? shop.length : 0;
    t.dataset.n = n || '';
  });
  if(HE.tab === 'paint' && !paintable) HE.tab = 'mine';
  const st = b.querySelector('.ed-strip'); st.className = 'ed-strip' + (HE.tab === 'paint' ? ' paint' : '');
  if(HE.tab === 'paint'){
    const P = save.home.paint[homeRoom] || {};
    const row = (kind, list, title) => `<div class="ed-prow"><b>${title}</b><div>${[{id:''}, ...list].map(d => {
      const on = (P[kind] || '') === d.id, own = hePaintOwn(kind, d.id);
      return `<button class="ed-sw${on ? ' on' : ''}" data-k="${kind}" data-id="${d.id}" aria-label="${d.id ? d.name : L('Как было', 'Original')}" style="background-image:url(${heSwatch(kind, d.id)})">${own ? '' : `<i>${HE_PAINT}🐚</i>`}</button>`; }).join('')}</div></div>`;
    st.innerHTML = row('w', HE_WALLS, L('Стены', 'Walls')) + row('f', HE_FLOORS, L('Пол', 'Floor'));
    st.querySelectorAll('.ed-sw').forEach(s => s.addEventListener('click', () => { if(!HE.ask) hePaintPick(s.dataset.k, s.dataset.id); }));
    return;
  }
  const list = HE.tab === 'mine' ? mine : shop;
  if(!list.length){
    st.innerHTML = `<p class="ed-empty">${HE.tab === 'mine' ? L('Всё твоё уже стоит здесь. Новое — в 🛒 «Купить»', 'Everything you have is already here. New things are in 🛒 “Buy”')
      : L('Здесь всё уже куплено! ♡', 'You have bought everything for here! ♡')}</p>`;
    return;
  }
  st.innerHTML = list.map(f => {
    const P = save.home.f[f.id], badge = HE.tab === 'shop' ? `<i class="pr">${f.price} 🐚</i>` : P ? `<i class="at" title="${HE_ROOM_NAME(P[0])}">${HE_ROOM_IC(P[0])}</i>` : '';
    return `<button class="ed-card" data-id="${f.id}"><img src="${homeThumb(f.id)}" alt=""><span>${f.name}</span>${badge}</button>`;
  }).join('');
  st.querySelectorAll('.ed-card').forEach(c => c.addEventListener('click', () => { if(!HE.ask) (HE.tab === 'shop' ? heBuy : heAdd)(c.dataset.id); }));
}
// вопрос «купить?» прямо в панели: → true / false
function heAsk(html, yes){
  const st = $('#edBar .ed-strip');
  st.className = 'ed-strip ask';
  st.innerHTML = `<div class="ed-ask">${html}<div><button class="btn small" data-y>${yes}</button><button class="btn ghost small" data-n>${L('Нет', 'No')}</button></div></div>`;
  return new Promise(r => {
    HE.ask = r;
    const done = v => { sfx.tap(); HE.ask = null; r(v); };
    st.querySelector('[data-y]').addEventListener('click', () => done(true));
    st.querySelector('[data-n]').addEventListener('click', () => done(false));
  });
}
// поставить вещь из коробки (или из другой комнаты) сюда: на своё обычное место, если свободно, иначе рядом / ближе к середине
function heAdd(id){
  if(!homeEdit || (edOn() && (ED.drag || ED.anim))) return false;
  const room = homeRoom, k = homeKind(id), near = kindRoom(k) === room ? kindSpot(k) : null;
  const fr = heFree(id, room, near, near ? near[2] : 0);
  if(!fr){ sfx.bad(); toast(L('Тут больше нет места — убери что-нибудь в коробку 📦', 'No more room here — put something away 📦'), 3000); return false; }
  edPush(HE_A.save());
  save.home.f[id] = [room, ...fr]; persist(); homeBuild();
  const o = homeItems[id];
  if(o){ const sc = o.scale.clone(); tween(0.35, q => o.scale.copy(sc).multiplyScalar(Math.max(0.01, q)), ease.back); burst(TEX.star, itemWorld(id), 10, 1.6, 0.26); }
  sfx.pop(); edSelect(id); heBarRender(); heHint();
  return true;
}
async function heBuy(id){
  const f = furn(id);
  if(save.shells < f.price){ sfx.bad(); return toast(L(`Не хватает ${f.price - save.shells} 🐚 — лечи пациентов в больнице`, `You need ${f.price - save.shells} more 🐚 — heal patients at the hospital`), 3000); }
  const yes = await heAsk(`<img src="${homeThumb(id)}" alt=""><p><b>${f.name}</b><br>${L(`Купить за ${f.price} 🐚?`, `Buy for ${f.price} 🐚?`)}</p>`, L('Купить ✓', 'Buy ✓'));
  if(!homeEdit) return;
  if(!yes) return heBarRender();
  save.shells -= f.price; save.owned.push(id); shellsShown = save.shells; renderShells(); persist(); sfx.buy();
  HE.tab = 'mine';
  if(!heAdd(id)) return heBarRender();
  const s = petSeal;
  if(s){ s.happyUntil = now + 3; setMood(s, 'happy'); burst(TEX.heart, headTop(s), 10, 1.8, 0.3); homeSay(s, `Ура! ${f.name}!`, `Yay! ${f.name}!`, '#D9527E'); petGive(3); }
}
