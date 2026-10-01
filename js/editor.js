/* ---------------- ✏️ Редактор: общее сердце «Обустроить» и будущего конструктора уровней (Спринт 8, задача 4) ----------------
   Здесь только то, что одинаково у любого редактора на телефоне:
   • тащи вещь пальцем — едет по сетке; отпустила, а там тесно (красное кольцо) — вещь возвращается назад;
   • коснись вещи — выбрана (розовое кольцо и кнопки ↻ 📦 над ней), коснись её ещё раз — повернётся;
   • вещь выбрана, коснись пустого места — она прыгнет туда; коснись мимо пола — выбор снят;
   • провела пальцем по пустому месту — хозяин сам решает что (в иглу — поворачиваем комнату);
   • ↩️ — отменить последнее (edUndo, до ED_UNDO шагов).
   Что за мир и что за вещи — решает «хозяин» A (для иглу — js/homeedit.js; потом — конструктор полосы):
     A.hit(cx, cy) → ключ вещи под пальцем или null;   A.at(key, cx, cy) → {x, z} — точка под пальцем для этой вещи (или null — мимо)
     A.get(key) → {x, z, r};   A.put(key, p, lift) — показать вещь в точке p (lift — приподнята, пока тащим; в сохранение не пишет)
     A.set(key, p) — поставить по-настоящему и записать;   A.ok(key, p) → можно ли тут стоять;   A.snap(key, p) → p на сетке
     A.step(key) → шаг поворота в радианах (0 — не поворачивается);   A.ring(key, p) → {at:V3, r, q:кватернион или null, top:V3 — где кнопки}
     A.save() → снимок для ↩️;   A.load(s) — вернуть снимок;   A.box(key) — убрать (в коробку);   A.yaw(dx, start) — провели по пустому
     необязательные: A.sel(key) — выбрали (null — сняли), A.bad() — не получилось (тесно), A.moved(key) — вещь встала на новое место
   Подключается после homewalk.js и до homeedit.js. */
const ED_TAP = 12, ED_UNDO = 30, ED_OK = 0xFF6F9F, ED_NO = 0xE2493B;
let ED = null;   // {A, sel, dn, drag, undo, anim}
const edOn = () => !!ED;
const ED_RING = new THREE.Mesh(new THREE.RingGeometry(0.84, 1, 48), new THREE.MeshBasicMaterial({color:ED_OK, transparent:true, opacity:0.9, depthTest:false, depthWrite:false, side:THREE.DoubleSide}));
ED_RING.renderOrder = 9; ED_RING.visible = false; scene.add(ED_RING);
const ED_FLAT = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2, 0, 0));

function edStart(A){
  edStop();
  ED = {A, sel:null, dn:null, drag:null, undo:[], anim:false};
  let tb = $('#edTb');
  if(!tb){
    tb = document.createElement('div'); tb.id = 'edTb'; tb.className = 'ed-tb'; tb.hidden = true;
    tb.innerHTML = `<button data-a="turn" aria-label="${L('Повернуть', 'Turn')}"><span aria-hidden="true">↻</span></button><button data-a="box" aria-label="${L('Убрать в коробку', 'Put away')}"><span aria-hidden="true">📦</span></button>`;
    tb.addEventListener('pointerdown', e => e.stopPropagation());
    tb.querySelector('[data-a="turn"]').addEventListener('click', () => edTurn());
    tb.querySelector('[data-a="box"]').addEventListener('click', () => edBox());
    $('#app').appendChild(tb);
  }
  tb.hidden = true;
}
function edStop(){
  if(!ED) return;
  if(ED.drag){ const g = ED.drag; ED.A.put(g.key, g.from, false); }
  ED = null; ED_RING.visible = false;
  const tb = $('#edTb'); if(tb) tb.hidden = true;
}
function edSelect(key){
  if(!ED || ED.sel === key) return;
  ED.sel = key;
  if(ED.A.sel) ED.A.sel(key);
}
function edPush(s){ if(!ED) return; ED.undo.push(s); if(ED.undo.length > ED_UNDO) ED.undo.shift(); }
function edUndo(){
  if(!ED || ED.drag || ED.anim) return false;
  if(!ED.undo.length){ sfx.bad(); return false; }
  ED.A.load(ED.undo.pop()); edSelect(null); sfx.whoosh(); return true;
}
// вещь плавно перелетает (дугой) из точки a в точку b, потом встаёт по-настоящему
async function edHop(key, a, b, h = 0.6){
  ED.anim = true; const A = ED.A;
  const dr = Math.atan2(Math.sin(b.r - a.r), Math.cos(b.r - a.r));
  await tween(0.3, k => A.put(key, {x:a.x + (b.x - a.x)*k, z:a.z + (b.z - a.z)*k, r:a.r + dr*k}, Math.sin(k*Math.PI)*h), ease.io);
  if(!ED) return;
  ED.anim = false; A.set(key, b); if(A.moved) A.moved(key);
}
async function edTurn(){
  if(!ED || !ED.sel || ED.drag || ED.anim) return;
  const A = ED.A, key = ED.sel, st = A.step(key); if(!st){ sfx.bad(); return; }
  const g = A.get(key);
  // повернулась — тесно? пробуем ещё на шаг, пока не встанет (так длинная кровать не упрётся в стену)
  for(let i = 1; i < Math.round(Math.PI*2/st); i++){
    const p = {x:g.x, z:g.z, r:g.r + st*i};
    if(A.ok(key, p)){ edPush(A.save()); sfx.pop(); return edHop(key, g, p, 0.15); }
  }
  sfx.bad(); if(A.bad) A.bad();
}
function edBox(){
  if(!ED || !ED.sel || ED.drag || ED.anim) return;
  const A = ED.A, key = ED.sel;
  edPush(A.save()); edSelect(null); A.box(key); sfx.plop();
}

/* ---------- касания ---------- */
function edDown(e){
  if(!ED) return false;
  if(ED.dn || ED.anim) return true;   // второй палец или вещь ещё летит — не мешаем
  const A = ED.A, key = A.hit(e.clientX, e.clientY);
  ED.dn = {id:e.pointerId, x:e.clientX, y:e.clientY, key, moved:false, off:{x:0, z:0}};
  if(key){ const q = A.at(key, e.clientX, e.clientY), g = A.get(key); if(q) ED.dn.off = {x:g.x - q.x, z:g.z - q.z}; }
  else A.yaw(0, true);
  return true;
}
addEventListener('pointermove', e => {
  const d = ED && ED.dn; if(!d || e.pointerId !== d.id) return;
  const A = ED.A;
  if(!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) > ED_TAP){
    d.moved = true;
    if(d.key){ ED.drag = {key:d.key, from:A.get(d.key), snap:A.save(), p:null, ok:true}; edSelect(d.key); sfx.pop(); }
  }
  if(!d.moved) return;
  const g = ED.drag;
  if(!g){ A.yaw(e.clientX - d.x, false); return; }
  const q = A.at(g.key, e.clientX, e.clientY); if(!q) return;
  const p = A.snap(g.key, {x:q.x + d.off.x, z:q.z + d.off.z, r:g.from.r});
  if(g.p && p.x === g.p.x && p.z === g.p.z) return;
  if(g.p) sfx.tick();
  g.p = p; g.ok = A.ok(g.key, p); A.put(g.key, p, 0.25);
});
for(const ev of ['pointerup', 'pointercancel']) addEventListener(ev, e => {
  const d = ED && ED.dn; if(!d || e.pointerId !== d.id) return;
  ED.dn = null;
  const A = ED.A, g = ED.drag;
  if(g){
    ED.drag = null;
    if(g.p && g.ok && ev !== 'pointercancel'){ edPush(g.snap); A.put(g.key, g.p, 0); A.set(g.key, g.p); sfx.plop(); if(A.moved) A.moved(g.key); }
    else { if(g.p){ sfx.bad(); if(A.bad) A.bad(); } edHopBack(g); }
    return;
  }
  if(d.moved || ev === 'pointercancel') return;
  if(d.key){ if(d.key === ED.sel) edTurn(); else { edSelect(d.key); sfx.tap(); } return; }   // коснулась вещи: выбрать, ещё раз — повернуть
  if(!ED.sel) return;
  const q = A.at(ED.sel, d.x, d.y);
  if(!q){ edSelect(null); return; }   // мимо пола — снять выбор
  const from = A.get(ED.sel), p = A.snap(ED.sel, {x:q.x, z:q.z, r:from.r});
  if(Math.hypot(p.x - from.x, p.z - from.z) < 0.01) return;
  if(!A.ok(ED.sel, p)){ sfx.bad(); if(A.bad) A.bad(); return; }
  edPush(A.save()); sfx.whoosh(); edHop(ED.sel, from, p);   // вещь выбрана, коснулась пустого места — прыгает туда
});
async function edHopBack(g){
  const A = ED.A, at = g.p || g.from;
  ED.anim = true;
  await tween(0.25, k => A.put(g.key, {x:at.x + (g.from.x - at.x)*k, z:at.z + (g.from.z - at.z)*k, r:g.from.r}, (1 - k)*0.25), ease.io);
  if(!ED) return;
  ED.anim = false; A.put(g.key, g.from, 0);
}

/* ---------- покадрово (зовёт хозяин): кольцо под выбранной вещью и кнопки над ней ---------- */
function edTick(t){
  if(!ED) return;
  const A = ED.A, key = ED.drag ? ED.drag.key : ED.sel, tb = $('#edTb');
  if(!key){ ED_RING.visible = false; tb.hidden = true; return; }
  const g = ED.drag, R = A.ring(key, g && g.p ? g.p : A.get(key));
  ED_RING.visible = true; ED_RING.position.copy(R.at); ED_RING.quaternion.copy(R.q || ED_FLAT);
  ED_RING.scale.setScalar(R.r*(1 + Math.sin(t*5)*0.04));
  ED_RING.material.color.setHex(g && g.p && !g.ok ? ED_NO : ED_OK);
  tb.hidden = !!g || ED.anim;
  if(!tb.hidden){
    tb.querySelector('[data-a="turn"]').hidden = !A.step(key);
    const q = toScreen(R.top), w = tb.offsetWidth || 120;
    tb.style.left = Math.max(8, Math.min(innerWidth - w - 8, q.x - w/2)) + 'px';
    tb.style.top = Math.max(70, Math.min(innerHeight - 300, q.y - 70)) + 'px';
  }
}
