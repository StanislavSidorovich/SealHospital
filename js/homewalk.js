/* ---------------- 🐾 Ходить самой по иглу (Спринт 7, задача 5) ----------------
   Кнопка «Ходить» внизу: малыша ведёт сама Сабрина, как на острове (js/roam.js, одно управление на весь остров и иглу).
   Держи палец — идёт туда, где палец; коснись пола — дойдёт; ⤴ (или касание по малышу) — прыжок: можно запрыгнуть на кровать и пуфик.
   Коснись вещи, значка ➕ или арки — подойдёт сам и сделает то же, что обычным касанием: поиграет с вещью, откроет выбор, уйдёт в другую комнату.
   Подойдёшь к открытой арке — пройдёшь в комнату (для этого надо идти, а не стоять). Кнопка «Стоп» или «Обустроить» — обычный режим, малыш снова бродит сам.
   Пол каждой комнаты — круг (HW_RAD); вещи на полу — препятствия (HW_SOL: радиус и высота; невысокое — кровать и пуфик — с пологим краем: можно зайти или запрыгнуть).
   Комната сама тесная, поэтому идёт медленнее, чем по острову (HW_VK). Камера — обычная камера иглу, её roam не трогает (nocam).
   Подключается после rooms.js (RM, rmHallAct, rmBack), gameroom.js, trophyroom.js и до game.js. */
const HW_VK = 0.55, HW_RAD = HOME_R - 0.55;   // во сколько раз медленнее, чем на острове; до какого радиуса можно ходить
// вещи на полу: [радиус, высота]; 0 — по ней ходят (коврик); невысокая (< 1) — можно запрыгнуть; выше — стена
const HW_SOL = {bed:[0.95, 0.4], rug:[0, 0], lamp:[0.4, 3], tank:[0.75, 3], games:[0.7, 3], gm1:[0.6, 0.6], gm2:[0.6, 3], tr1:[0.55, 3], tr2:[0.45, 3]};
// стол игровой, табуретки, кормушка, витрины — не мебель на местах, а часть комнаты
const HW_FIXED = {
  games:[[GM_TABLE[0], GM_TABLE[1], 1.1, 3], [-1.5, -0.35, 0.32, 3], [1.5, -0.35, 0.32, 3]],
  trophy:[[-2.35, -0.55, 0.7, 3], [2.25, -0.3, 0.7, 3]],
  ocean:[[OC_FEED[0], OC_FEED[1], 0.4, 3]]
};
let HW = null;   // {R, room, was, near, doors, dn}
const hwOn = () => !!HW;
const hwRadius = room => room === 'ocean' ? OC_R - 0.6 : HW_RAD;
const hwAt = room => HOME_ROOMS[room].pos.clone().add(new V3(0, HOME_Y, 0));
function hwGround(room){
  const list = (HW_FIXED[room] || []).map(([x, z, r, h]) => ({x, z, r, h}));
  for(const k of roomSlots()){
    const o = homeItems[k], sol = HW_SOL[k], sl = HOME_SLOTS[k]; if(!o || !sol || !sl.floor || !sol[0]) continue;
    list.push({x:sl.floor[0], z:sl.floor[1], r:sol[0], h:sol[1] < 1 ? (o.userData.top || sol[1])*0.9 : sol[1]});
  }
  const rad = hwRadius(room);
  return (x, z) => {
    if(Math.hypot(x, z) > rad) return 4;
    let h = 0;
    for(const s of list){ const d = Math.hypot(x - s.x, z - s.z); if(d < s.r) h = Math.max(h, s.h < 1 ? s.h*Math.min(1, (s.r - d)/0.4) : s.h); }   // невысокое (кровать, пуфик) — с пологим краем: можно зайти
    return h;
  };
}
// двери комнаты: hit — коснулись ли арки, pt — куда подойти, open — можно ли пройти, act — что сделать
function hwDoors(room){
  const at = (a, r) => { const p = ocAt(a, r); return new V3(p[0], 0, p[1]); };
  if(room === 'hall'){
    const list = [{pt:at(OC_HALL_A, HOME_R - 0.5), hit:(x, y) => ocHallHit(x, y), open:() => ocState() === 'open', act:() => ocHallAct()}];
    for(const id of RM_IDS) list.push({pt:at(RM[id].hallA, HOME_R - 0.5), hit:(x, y) => rmArchHit(RM[id].arch, x, y), open:() => rmBuilt(id), act:() => rmHallAct(id)});
    return list;
  }
  if(room === 'ocean') return [{pt:at(OC_DOOR_A, OC_R - 0.7), hit:(x, y) => { ocRay(x, y); return !!OC.door && ray.intersectObject(OC.door, true).length > 0; }, open:() => true, act:() => ocBack()}];
  const R = RM[room];
  return R ? [{pt:at(R.doorA, HOME_R - 0.5), hit:(x, y) => rmArchHit(R.door, x, y), open:() => true, act:() => rmBack()}] : [];
}
const hwFree = () => !!HW && !busy && mgRoot.hidden && !!petSeal && !petSeal.sleeping && !document.querySelector('.overlay:not([hidden])');

/* ---------- включить и выключить ---------- */
async function hwToggle(){
  if(HW) return hwStop(true);
  if(!homeMode || busy || !mgRoot.hidden || !petSeal) return;
  setBusy(true);
  if(petSeal.sleeping) await petWake();
  homeEdit = false; homeIdleT = 99;
  const s = petSeal, room = homeRoom;
  const at = hwAt(room), R = roamStart({s, at, pos:s.root.position.clone().sub(at).setY(0), ground:hwGround(room), vk:HW_VK, nocam:true, noslide:true, onGoal:g => { R.vel.set(0, 0, 0); if(g.act) g.act(); }});
  HW = {R, room, was:false, near:0, doors:[], dn:null};
  hwSync();
  setBusy(false); homeUi(); hwJumpBtn(true);
  if(!tipSeen('hwalk')){ tipDone('hwalk'); toast(L('Держи палец — малыш идёт за ним. ⤴ — прыжок. Нажми на вещь — подойдёт сам 🐾', 'Hold your finger — your pup follows it. ⤴ jumps. Tap a thing — your pup walks over 🐾'), 5200); }
}
function hwStop(say){
  if(!HW) return;
  const R = HW.R, s = R.s;
  if(R.air){ R.air = false; R.vy = 0; R.pos.y = R.ground(R.pos.x, R.pos.z); }
  s.root.position.copy(R.at).add(R.pos); roamStop(R); s.flap = 0;
  HW = null; hwJumpBtn(false); homeIdleT = 6; hwBtn($('#homeWalkBtn'));
  if(say && homeMode) homeUi();
}
// малыш встал там, где его оставили другие действия: ходьба продолжается оттуда
function hwSync(){
  const R = HW.R, s = petSeal, room = HW.room = homeRoom;
  R.at.copy(hwAt(room)); R.ground = hwGround(room);
  R.pos.copy(s.root.position).sub(R.at); R.pos.y = 0;
  const l = Math.hypot(R.pos.x, R.pos.z), rad = hwRadius(room) - 0.05; if(l > rad){ R.pos.x *= rad/l; R.pos.z *= rad/l; }
  R.pos.y = R.ground(R.pos.x, R.pos.z); R.vel.set(0, 0, 0); R.vy = 0; R.air = false; R.slide = 0; R.hold = false; R.tgt = null; R.goal = null; R.yaw = s.root.rotation.y;
  HW.near = 0; HW.doors = hwDoors(room);
  roamPose(R, 0);
}
function hwBtn(b){
  if(!b) return;
  b.hidden = !homeMode;
  b.classList.toggle('on', !!HW);
  b.querySelector('.face').textContent = HW ? '✋' : '🐾';
  b.querySelector('.name').textContent = HW ? L('Стоп', 'Stop') : L('Ходить', 'Walk');
}
function hwJumpBtn(on){
  let b = $('#hwJump');
  if(on && !b){
    b = document.createElement('button'); b.id = 'hwJump'; b.className = 'isl-jump'; b.innerHTML = '<span aria-hidden="true">⤴</span>'; b.setAttribute('aria-label', L('Прыжок', 'Jump'));
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if(HW && hwFree()) roamJump(HW.R); });
    $('#app').appendChild(b);
  }
  if(b) b.hidden = !on;
}

/* ---------- управление: касание в комнате ---------- */
function hwTap(e){
  if(!HW) return false;
  if(!hwFree()) return true;
  const R = HW.R;
  if(petPart(e)){ roamJump(R); return true; }   // коснулась самого малыша — подпрыгнул
  const h = homeHitSlot(e);
  if(h){
    const sl = HOME_SLOTS[h.k], k = h.k, mark = h.mark;
    R.goal = {p:() => new V3(sl.stand[0], 0, sl.stand[1]), r:0.4, act:() => { if(mark || !homeItems[k]) homePick(k); else homePlay(k); }};
    R.hold = false; R.tgt = null; sfx.tap(); return true;
  }
  for(const d of HW.doors) if(d.hit(e.clientX, e.clientY)){
    R.goal = {p:() => d.pt, r:0.85, act:d.act}; R.hold = false; R.tgt = null; sfx.tap(); return true;
  }
  R.goal = null; R.hold = true; R.pid = e.pointerId; R.fx = e.clientX; R.fy = e.clientY; R.tgt = roamPoint(R, R.fx, R.fy); R.t0 = now;
  HW.dn = {x:e.clientX, y:e.clientY, id:e.pointerId, t:now, moved:false};
  return true;
}
addEventListener('pointermove', e => {
  if(!HW || !HW.dn || e.pointerId !== HW.dn.id) return;
  const R = HW.R; if(R.hold){ R.fx = e.clientX; R.fy = e.clientY; }
  if(Math.hypot(e.clientX - HW.dn.x, e.clientY - HW.dn.y) > 14) HW.dn.moved = true;
});
for(const ev of ['pointerup', 'pointercancel']) addEventListener(ev, e => {
  if(!HW || !HW.dn || e.pointerId !== HW.dn.id) return;
  const d = HW.dn, R = HW.R; HW.dn = null;
  R.hold = false; if(now - d.t > 0.35) R.tgt = null;   // держала — остановится, где отпустила; коротко — дойдёт до точки
  if(ev === 'pointercancel' || d.moved || now - d.t > 0.35 || !hwFree()) return;
  const Rm = HOME_ROOMS[homeRoom];   // коротко коснулась: вдруг там что-то есть (стекло, кормушка, коробка игры, витрина)
  if(Rm.tap) Rm.tap(d.x, d.y);
  if(busy){ R.tgt = null; R.hold = false; }
});
{ const K = {ArrowLeft:[-1, 0], ArrowRight:[1, 0], ArrowUp:[0, -1], ArrowDown:[0, 1], a:[-1, 0], d:[1, 0], w:[0, -1], s:[0, 1]}, held = new Set();
  const upd = () => { if(!HW) return; const R = HW.R; R.key.set(0, 0, 0); held.forEach(k => { R.key.x += K[k][0]; R.key.z += K[k][1]; }); if(R.key.lengthSq()) R.key.normalize(); };
  addEventListener('keydown', e => {
    if(!HW || !hwFree()) return;
    if(e.key === ' '){ roamJump(HW.R); e.preventDefault(); return; }
    const k = K[e.key] ? e.key : K[e.key.toLowerCase()] ? e.key.toLowerCase() : null;
    if(k){ held.add(k); HW.R.goal = null; upd(); e.preventDefault(); }
  });
  addEventListener('keyup', e => { const k = K[e.key] ? e.key : e.key.toLowerCase(); if(held.delete(k)) upd(); }); }

// один раз: «есть новая кнопка»
async function hwNews(){
  if(tipSeen('hwbtn')) return;
  await wait(9);
  if(!homeMode || HW || busy || !mgRoot.hidden) return;
  if(nudge(L('Новое! Кнопка 🐾 «Ходить» — води малыша по комнатам сама', 'New! The 🐾 “Walk” button — lead your pup around the rooms yourself'), 4200)) tipDone('hwbtn');
}

/* ---------- покадрово (вызывает homeTick) ---------- */
function hwTick(dt){
  if(!HW) return;
  const R = HW.R;
  if(!hwFree()){ HW.was = false; R.hold = false; return; }
  if(!HW.was || HW.room !== homeRoom){ HW.was = true; hwSync(); }   // до этого малыша водили другие действия — продолжаем оттуда
  roamStep(R, dt);
  // дошла до открытой арки, идя к ней (не просто стоя рядом) — проходим
  const sp = Math.hypot(R.vel.x, R.vel.z), moving = sp > 0.8 && (R.hold || R.tgt || R.key.lengthSq());
  const d = HW.doors.find(x => x.open() && Math.hypot(x.pt.x - R.pos.x, x.pt.z - R.pos.z) < 0.85);
  if(d && moving){ HW.near += dt; if(HW.near > 0.45){ HW.near = 0; R.vel.set(0, 0, 0); R.hold = false; R.tgt = null; d.act(); } } else HW.near = 0;
}
