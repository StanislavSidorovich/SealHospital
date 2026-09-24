/* ---------------- Приключения (Фаза 9, часть 1): забег по льдинам ----------------
   ⚽ «Поиграть» → 🏔️ «Приключение» → карта островков (пока открыт один — Снежная бухта) → уровень.
   Малыш сам скользит на пузике по ледяной дорожке; касание — прыжок через сугроб или трещину.
   Ракушки висят дугой над препятствиями и цепочкой на ровных местах (как монетки у Марио).
   Врезался — смешной кувырок, пара ракушек рассыпается вперёд по дорожке, их можно подобрать снова.
   Упал в трещину — «плюх!», малыш сам выпрыгивает. Проиграть нельзя.
   Рыбки заперты в ледяных пузырях: коснись пузыря — «пуф!», рыбка спасена (как светлячки у Rayman).
   В конце флажок и три звезды: добежал, собрал ракушки, спас всех рыбок. Все рыбки — кубок на полку в домике.
   Дорожка стоит далеко в стороне (RUN_POS), камера летит за малышом (runCam, её подхватывает frame() в game.js).
   Подключается после home.js и до mail.js/game.js. */
const RUN_POS = new V3(-200, 0, 0);          // старт дорожки; бежим в сторону −z
const RUN_SPEED = 5.2, RUN_G = 22, RUN_VY = 8.4;   // прыжок: высота ≈1,6, в воздухе ≈0,76 с — пролетаем ≈4 м
const RUN_W = 3.2;                           // ширина ледяной дорожки
const runCam = {on:false, pos:new V3(), look:new V3()};
const BUB_Y = 1.9;   // пузыри с рыбками висят над водой сбоку от дорожки и чуть выше малыша: он их не заслоняет
const runRoot = new THREE.Group(); runRoot.visible = false; scene.add(runRoot);
if(!save.adv) save.adv = sanitizeAdv(null);   // Pages мог отдать старый data.js

// Уровни. z — метры от старта. line — ракушки цепочкой (n), drift — сугроб, crack — трещина (w — ширина),
// arc — над препятствием дуга из трёх ракушек, fish — ледяной пузырь с рыбкой (x — слева/справа от дорожки)
const ISLES = [
  {id:'bay', ic:'🏝️', name:L('Снежная бухта', 'Snowy Bay'), levels:['bay1']},
  {id:'cave', ic:'🌌', name:L('Пещера северного сияния', 'Northern Lights Cave'), soon:true},
  {id:'village', ic:'🏘️', name:L('Деревня айсбергов', 'Iceberg Village'), soon:true}
];
const LEVELS = {
  bay1: {name:L('Забег по льдинам', 'Ice floe dash'), len:318, items:[
    ['line', 12, 3], ['drift', 30, 1], ['line', 40, 2], ['fish', 50, -1.25], ['crack', 62, 1.6, 1], ['drift', 80],
    ['line', 88, 3], ['crack', 102, 2.0], ['fish', 112, 1.25], ['drift', 126, 1], ['drift', 138], ['line', 146, 2],
    ['fish', 160, -1.25], ['crack', 174, 2.2, 1], ['line', 184, 3], ['drift', 200], ['fish', 210, 1.25], ['crack', 222, 1.8],
    ['drift', 236], ['line', 244, 2], ['crack', 258, 2.4], ['fish', 270, -1.25], ['drift', 284, 1], ['line', 292, 4]]}
};
const levelName = id => LEVELS[id].name;
const SHELL_GOAL = 0.8;   // звезда за ракушки — если собрано 80% и больше
// Ракушки с дорожки идут в копилку только в первых RUN_DAILY забегах за день, дальше на дорожке звёздочки
// (звезду за них дают так же): иначе забег за минуту приносил бы больше, чем смена в больнице
const RUN_DAILY = 2;
const runsToday = () => save.adv.day && save.adv.day.d === new Date().toDateString() ? save.adv.day.n : 0;
const BUBBLE_TEX = canvasTex(128, (g, s) => {   // пузырь: прозрачный, с голубым отливом, обводкой и бликом
  g.beginPath(); g.arc(s/2, s/2, s/2 - 6, 0, 7); g.fillStyle = 'rgba(190,232,250,.38)'; g.fill();
  g.lineWidth = 6; g.strokeStyle = '#3B3A4A'; g.stroke();
  g.beginPath(); g.arc(s/2, s/2, s/2 - 18, Math.PI*1.1, Math.PI*1.45); g.lineWidth = 7; g.lineCap = 'round'; g.strokeStyle = '#fff'; g.stroke();
});

/* ---------- мир забега: вода, дорожка, айсберги ---------- */
const TRACK_TEX = canvasTex(128, (g, w, h) => {   // лёд с полосками вдоль — видно, как быстро едем
  g.fillStyle = '#C4E4F4'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#A9D4EC'; for(const x of [18, 58, 96]) g.fillRect(x, 0, 6, h);
  g.fillStyle = '#FFFFFF'; for(let i = 0; i < 6; i++) g.fillRect((i*41) % w, (i*53) % h, 10, 3);
});
TRACK_TEX.wrapS = TRACK_TEX.wrapT = THREE.RepeatWrapping;
const runWater = new THREE.Mesh(new THREE.PlaneGeometry(70, 120), toon(0x6FC0DF)); runWater.rotation.x = -Math.PI/2; runWater.position.y = -0.05; runRoot.add(runWater);
// лёд с обводкой-коробкой: addOutline раздувает длинную плиту в торцах, поэтому обводка — своя коробка чуть больше
function iceSlab(z0, z1){
  const len = z1 - z0, g = new THREE.Group(); g.position.set(RUN_POS.x, -0.05, RUN_POS.z - (z0 + z1)/2);
  const m = toon(0xFFFFFF); m.map = TRACK_TEX.clone(); m.map.needsUpdate = true; m.map.repeat.set(1, len/3);
  g.add(new THREE.Mesh(new THREE.BoxGeometry(RUN_W, 0.6, len), m));
  g.add(new THREE.Mesh(new THREE.BoxGeometry(RUN_W + 0.1, 0.64, len + 0.1), outlineMat));
  return g;
}
function makeDrift(){   // сугроб: пухлая снежная горка с искоркой
  const g = new THREE.Group();
  const b = addOutline(new THREE.Mesh(SPH, toon(0xFFFFFF)), 1.05); b.scale.set(1.0, 0.55, 0.62); g.add(b);
  for(const [x, s] of [[-0.75, 0.45], [0.8, 0.38]]){ const k = addOutline(new THREE.Mesh(SMALL, toon(0xFFFFFF)), 1.08); k.scale.set(s, s*0.8, s); k.position.set(x, 0.05, 0.1); g.add(k); }
  return g;
}
function makeBubble(){   // ледяной пузырь, внутри рыбка
  const g = new THREE.Group();
  const f = makeFish(); f.scale.setScalar(0.62); f.rotation.y = -0.6; g.add(f);
  const glass = new THREE.Sprite(new THREE.SpriteMaterial({map:BUBBLE_TEX, transparent:true, depthWrite:false}));
  glass.scale.setScalar(1.15); glass.renderOrder = 2; g.add(glass);
  return g;
}
function makeFinish(){   // ворота-финиш: два столбика, верёвка с флажками, надпись
  const g = new THREE.Group(), cols = [0xFF9BB8, 0xFFD66B, 0x86DDB5, 0x9BD3F0, 0xB69CF2];
  for(const s of [-1, 1]){ const p = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.2, 10), toon(0xE0A36B)), 1.12); p.position.set(s*(RUN_W/2 + 0.2), 1.6, 0); g.add(p); }
  const a = new V3(-RUN_W/2 - 0.2, 3.1, 0), b = new V3(RUN_W/2 + 0.2, 3.1, 0), pts = [];
  for(let i = 0; i <= 16; i++){ const k = i/16, p = a.clone().lerp(b, k); p.y -= Math.sin(k*Math.PI)*0.35; pts.push(p); }
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.025, 5), inkMat));
  const tri = new THREE.CircleGeometry(0.2, 3);
  for(let i = 1; i < 9; i++){
    const k = i/9, p = a.clone().lerp(b, k); p.y -= Math.sin(k*Math.PI)*0.35 + 0.16;
    const f = new THREE.Mesh(tri, new THREE.MeshToonMaterial({color:cols[i % cols.length], side:THREE.DoubleSide})); f.position.copy(p); f.rotation.z = -Math.PI/2; g.add(f);
  }
  const t = textSprite(L('Финиш!', 'Finish!'), '#D9527E'); t.position.set(0, 3.8, 0); t.scale.set(2.6, 0.97, 1); t.material.depthTest = true; g.add(t);
  return g;
}
// айсберги по сторонам — одни на все забеги
for(let z = 10; z < 360; z += 22){
  for(const sd of [-1, 1]){
    const s = 1.6 + ((z*7 + sd*3) % 5)*0.4, x = sd*(9 + ((z*13) % 7));
    const b = addOutline(new THREE.Mesh(new THREE.ConeGeometry(s, s*1.4, 6), toon(0xF3FAFD)), 1.04); b.position.set(RUN_POS.x + x, s*0.45, RUN_POS.z - z - sd*6); runRoot.add(b);
  }
}

/* ---------- сборка уровня ---------- */
function runPickup(i, stars){   // ракушка или (если сегодня уже бегали) звёздочка
  if(stars){ const o = addOutline(new THREE.Mesh(STAR_GEO, toon(0xFFD66B)), 1.1); o.scale.setScalar(0.5); return o; }
  const o = makeShell([0xFFC4D6, 0xFFD9A8, 0xD9C8FF][i % 3], false); o.scale.setScalar(1.15); o.rotation.set(0.9, 0, 0); return o;
}
let R = null;   // текущий забег
function runBuild(id){
  if(R && R.grp) runRoot.remove(R.grp);
  const lv = LEVELS[id], grp = new THREE.Group(); runRoot.add(grp);
  const r = {id, lv, grp, z:-4, y:0, vy:0, air:false, sp:RUN_SPEED, splash:0, tumble:0, shells:0, fish:0, total:0, fishTotal:0,
    pick:[], drifts:[], cracks:[], bubbles:[], puffT:0, slow:null, taught:{jump:save.adv.runs > 0, fish:save.adv.runs > 0}, state:'ready',   // подсказки с замедлением — только в самом первом забеге
    stars:runsToday() >= RUN_DAILY};   // сегодня уже бегали — на дорожке звёздочки вместо ракушек
  const at = (z, x = 0, y = 0) => new V3(RUN_POS.x + x, 0.25 + y, RUN_POS.z - z);
  const shell = (z, x, y, extra) => {
    const o = runPickup(r.pick.length, r.stars);
    o.position.copy(at(z, x, 0.35 + y)); grp.add(o);
    r.pick.push({o, z, x, y:0.35 + y, extra:!!extra}); if(!extra) r.total++;
    return o;
  };
  // трещины — дырки в дорожке: плиты льда идут между ними
  let z0 = -6;
  for(const [k, z, w = 2] of lv.items.filter(i => i[0] === 'crack')){
    grp.add(iceSlab(z0, z - w/2)); r.cracks.push({z0:z - w/2, z1:z + w/2}); z0 = z + w/2;
    for(const sd of [-1, 1]){ const ch = addOutline(new THREE.Mesh(new THREE.DodecahedronGeometry(0.28), toon(0xF3FAFD)), 1.08); ch.scale.set(1, 0.4, 1); ch.position.copy(at(z, sd*0.9, -0.3)); grp.add(ch); }
  }
  grp.add(iceSlab(z0, lv.len + 14));
  for(const it of lv.items){
    const [k, z] = it;
    if(k === 'line') for(let i = 0; i < it[2]; i++) shell(z + i*1.5, 0, 0);
    if(k === 'drift'){ const d = makeDrift(); d.position.copy(at(z)); grp.add(d); r.drifts.push({o:d, z, hit:false}); }
    if((k === 'drift' && it[2]) || (k === 'crack' && it[3])) for(const dz of [-1.3, 0, 1.3]) shell(z + dz, 0, 1.45*(1 - (dz/2.1)**2));   // дуга по прыжку
    if(k === 'fish'){ const b = makeBubble(); b.position.copy(at(z, it[2]*1.45, BUB_Y)); grp.add(b); r.bubbles.push({o:b, z, x:it[2], ph:Math.random()*6, free:false}); r.fishTotal++; }
  }
  const fin = makeFinish(); fin.position.copy(at(lv.len)); grp.add(fin); r.finish = fin;
  R = r;
}
const runPupAt = () => new V3(RUN_POS.x, 0.25 + R.y, RUN_POS.z - R.z);
const inCrack = z => R.cracks.some(c => z > c.z0 + 0.15 && z < c.z1 - 0.15);

/* ---------- касания и события забега ---------- */
function runJump(){
  if(R.air || R.splash > 0 || R.tumble > 0.25) return;
  R.air = true; R.vy = RUN_VY; sfx.whoosh();
  if(R.slow === 'jump'){ R.slow = null; R.taught.jump = true; mgHint(L('Ура! Так и прыгай 👍', 'Yay! Jump just like that 👍')); setTimeout(() => { if(R && R.state === 'go') mgHint(''); }, 1600); }
}
function runBubbleAt(e){
  let best = null, bd = 80;
  for(const b of R.bubbles){
    if(b.free || b.z < R.z - 1 || b.z > R.z + 22) continue;
    const q = toScreen(b.o.position), d = Math.hypot(q.x - e.clientX, q.y - e.clientY);
    if(d < bd){ bd = d; best = b; }
  }
  return best;
}
function runFree(b){
  b.free = true; R.fish++; sfx.pop(); sfx.star();
  const p = b.o.position.clone(); R.grp.remove(b.o);
  burst(TEX.star, p, 10, 1.8, 0.26); emit(TEX.puff, p, {v:new V3(0, 0.3, 0), life:0.4, size:0.9, grow:1});
  // рыбка ныряет в воду и благодарит
  const f = makeFish(); f.scale.setScalar(0.62); f.position.copy(p); scene.add(f);
  const to = p.clone().add(new V3(b.x > 0 ? 2.2 : -2.2, -1.8, 0.5));
  tween(0.7, k => { f.position.lerpVectors(p, to, k); f.position.y += Math.sin(k*Math.PI)*1.2; f.rotation.z = -k*2; }, ease.lin).then(() => { scene.remove(f); sfx.plop(); burst(TEX.puff, to.clone().setY(0.1), 5, 0.8, 0.35); });
  floatText(L('Спасибо!', 'Thank you!'), p.clone().add(new V3(0, 0.6, 0)), '#2F9E72');
  if(R.slow === 'fish'){ R.slow = null; R.taught.fish = true; mgHint(L('Рыбка спасена! Ищи ещё пузыри 🫧', 'The fish is free! Look for more bubbles 🫧')); setTimeout(() => { if(R && R.state === 'go') mgHint(''); }, 1800); }
  runHud();
}
// врезался или упал: пара ракушек рассыпается вперёд по дорожке — их можно подобрать снова
function runScatter(){
  const n = Math.min(R.shells, 2 + (Math.random() < 0.5 ? 1 : 0)); if(!n) return;
  R.shells -= n;
  for(let i = 0; i < n; i++){
    const z = R.z + 4.5 + i*1.6, x = (i - (n - 1)/2)*0.7;
    const o = runPickup(i, R.stars);
    const from = runPupAt().add(new V3(0, 0.6, 0)), to = new V3(RUN_POS.x + x, 0.6, RUN_POS.z - z);
    o.position.copy(from); R.grp.add(o);
    const p = {o, z, x, y:0.35, extra:true, flying:true}; R.pick.push(p);
    tween(0.5, k => { o.position.lerpVectors(from, to, k); o.position.y += Math.sin(k*Math.PI)*1.2; }, ease.lin).then(() => p.flying = false);
  }
  runHud();
}
function runCrash(d){   // сугроб: кувырок через голову, сугроб — «пуф» и приплюснулся
  const s = petSeal; d.hit = true; R.tumble = 0.7; R.sp = RUN_SPEED*0.45;
  sfx.plop(); sfx.arf(); floatText(L(['Ой!', 'Бух!', 'Упс!'], ['Oops!', 'Bonk!', 'Whoops!'])[Math.floor(Math.random()*3)], headTop(s));
  burst(TEX.puff, d.o.position.clone().add(new V3(0, 0.4, 0)), 10, 1.6, 0.5);
  tween(0.3, k => d.o.scale.set(1 + k*0.3, 1 - k*0.75, 1 + k*0.2));
  runScatter();
  if(!R.saidOops){ R.saidOops = true; mgHint(L('Ничего! Ракушки впереди — подбери их снова', 'No problem! The shells are ahead — pick them up again')); setTimeout(() => { if(R && R.state === 'go') mgHint(''); }, 2200); }
}
function runSplash(){   // трещина: плюх в воду и сам выпрыгивает
  R.splash = 0.35; R.air = false; R.vy = 0; R.sp = RUN_SPEED*0.55;
  sfx.splash(); burst(TEX.puff, runPupAt().setY(0.1), 10, 1.6, 0.45);
  floatText(L('Плюх!', 'Splash!'), headTop(petSeal), '#3E8DB8');
  runScatter();
}
let runHudEl = null;
function runHud(){
  if(!runHudEl || !R) return;
  runHudEl.querySelector('.sh').textContent = R.shells;
  runHudEl.querySelector('.pic').textContent = R.stars ? '⭐' : '🐚';
  runHudEl.querySelector('.fi').textContent = `${R.fish}/${R.fishTotal}`;
  runHudEl.querySelector('.bar i').style.width = Math.max(0, Math.min(1, R.z/R.lv.len))*100 + '%';
}

/* ---------- покадрово: движение, прыжки, сбор ---------- */
function runStep(dt){
  const r = R, s = petSeal;
  if(r.paused) return;   // пауза (🏠): всё замирает
  // обучение: перед первым сугробом и первым пузырём время почти замирает, пока не нажмёшь
  if(r.state === 'go' && !r.slow){
    const d0 = r.drifts[0], b0 = r.bubbles[0];
    if(!r.taught.jump && d0 && d0.z - r.z < 3.4 && d0.z > r.z && !r.air){ r.slow = 'jump'; mgHint(L('Сугроб! Нажми — прыжок 👆', 'A snowdrift! Tap to jump 👆')); }
    else if(!r.taught.fish && b0 && !b0.free && b0.z - r.z < 8 && b0.z > r.z){ r.slow = 'fish'; mgHint(L('Рыбка в пузыре! Нажми на пузырь 🫧', 'A fish in a bubble! Tap the bubble 🫧')); }
  }
  if(r.slow === 'fish' && (r.bubbles[0].free || r.bubbles[0].z < r.z - 0.5)){ r.slow = null; r.taught.fish = true; mgHint(''); }
  const ts = r.slow ? (r.slow === 'jump' && r.drifts[0].z - r.z < 1.6 ? 0.04 : 0.12) : 1, d = dt*ts;
  const z0 = r.z;   // где был малыш кадр назад: ракушки и сугробы проверяем на всём пройденном отрезке
  if(r.state === 'go' || r.state === 'end'){
    const want = r.state === 'end' ? 0 : RUN_SPEED;
    r.sp += (want - r.sp)*Math.min(1, d*(r.state === 'end' ? 1.6 : 1.4));
    r.z += r.sp*d;
  }
  // вверх-вниз: прыжок, плюх в трещину, приземление
  if(r.splash > 0){
    r.splash -= d; r.y = -0.55*Math.sin(Math.min(1, 1 - r.splash/0.35)*Math.PI/2);
    if(r.splash <= 0){ r.air = true; r.vy = RUN_VY*0.9; sfx.whoosh(); floatText(L('Брр!', 'Brrr!'), headTop(s)); }
  } else if(r.air){
    r.vy -= RUN_G*d; r.y += r.vy*d;
    if(r.y <= 0 && r.vy < 0){
      if(inCrack(r.z)) runSplash();
      else { r.y = 0; r.air = false; sfx.plop(); burst(TEX.puff, runPupAt().setY(0.35), 5, 0.9, 0.35); squash(s, 0.18, 0.25); }
    }
  } else if(r.state === 'go' && inCrack(r.z)) runSplash();
  if(r.tumble > 0) r.tumble = Math.max(0, r.tumble - d);
  // сугробы
  const near = z => z > z0 - 0.6 && z < r.z + 0.6;
  if(r.state === 'go') for(const dr of r.drifts) if(!dr.hit && near(dr.z) && r.y < 0.5 && r.splash <= 0) runCrash(dr);
  // ракушки
  const py = r.y + 0.45*petScale();
  for(const p of r.pick){
    if(p.got || p.flying) continue;
    p.o.rotation.y += dt*3;
    if(p.z > z0 - 0.9 && p.z < r.z + 0.9 && Math.abs(p.y - py) < 1.0 && Math.abs(p.x) < 1.1){
      p.got = true; r.shells++; r.grp.remove(p.o); sfx.coin();
      emit(TEX.star, p.o.position, {v:new V3(0, 1, 0), life:0.45, size:0.22, spin:4}); runHud();
    }
  }
  for(const b of r.bubbles) if(!b.free) b.o.position.y = 0.25 + BUB_Y +Math.sin(now*2 + b.ph)*0.12;
  // малыш: едет на пузике, в прыжке задирает нос, в кувырке крутится
  const pos = runPupAt(); s.root.position.copy(pos); s.root.rotation.set(0, Math.PI, 0);
  if(r.slow) mgHint(r.slow === 'jump' ? L('Сугроб! Нажми — прыжок 👆', 'A snowdrift! Tap to jump 👆') : L('Рыбка в пузыре! Нажми на пузырь 🫧', 'A fish in a bubble! Tap the bubble 🫧'));
  s.inner.rotation.x = r.tumble > 0 ? -(1 - r.tumble/0.7)*Math.PI*2 : r.air ? Math.max(-0.35, Math.min(0.3, -r.vy*0.04)) : 0;
  s.inner.position.y = r.tumble > 0 ? Math.sin((1 - r.tumble/0.7)*Math.PI)*0.5 : 0;
  s.wobble = r.air ? 0 : Math.sin(now*9)*0.03;
  s.flap = r.air ? 0.8 : 0.15;
  r.puffT -= dt;
  if(r.puffT < 0 && !r.air && r.splash <= 0 && r.sp > 1){ r.puffT = 0.09; emit(TEX.puff, pos.clone().add(new V3((Math.random() - 0.5)*0.6, 0.15, 1.2*petScale())), {v:new V3(0, 0.4, 1.5), life:0.5, size:0.35, grow:1}); }
  // вода и камера едут следом
  runWater.position.set(RUN_POS.x, -0.05, pos.z - 30);
  const ck = petK() - 1;   // подрос — камера выше и дальше, чтобы малыш не закрывал дорожку
  runCam.pos.set(pos.x + 0.4, 4.6 + ck*4.5 + Math.max(0, r.y)*0.35, pos.z + 10.5 + ck*6);
  runCam.look.set(pos.x, 0.9 + ck*0.6 + Math.max(0, r.y)*0.3, pos.z - 7 - ck*2);
  if(r.state === 'end'){   // на финише камера облетает малыша спереди — видно, как он радуется
    r.endK = Math.min(1, (r.endK || 0) + dt*0.8); const k = ease.io(r.endK), sc = petScale();
    runCam.pos.lerp(pos.clone().add(new V3(1.5, 2.3 + 1.2*sc, -7 - 2.2*sc)), k);
    runCam.look.lerp(pos.clone().add(new V3(0, -0.9 + 0.5*sc, 0)), k);   // малыш повыше: внизу окошко с итогами
  }
  runHud();
  // финиш
  if(r.state === 'go' && r.z >= r.lv.len){ r.state = 'end'; runFinishFx(); }
}
function runFinishFx(){
  const s = petSeal, p = R.finish.position.clone().add(new V3(0, 2.6, 0));
  sfx.good(); sfx.hug();
  for(let i = 0; i < 3; i++) setTimeout(() => { burst(TEX.star, p, 14, 2.6, 0.32); burst(TEX.heart, p, 6, 2, 0.28); }, i*250);
  floatText(L('Финиш!', 'Finish!'), headTop(s), '#D9527E');
  s.happyUntil = now + 4; setMood(s, 'happy');
}

/* ---------- карта островков ---------- */
function advStars(id){ return save.adv.best[id] || 0; }
async function advMap(){
  mgOpen(L('Куда отправимся?', 'Where shall we go?'));
  const starsOf = n => '★'.repeat(n) + '☆'.repeat(3 - n);
  const panel = mgNode('div', 'mg-panel adv-map', `
    <p class="ttl display">${L('Карта приключений', 'Adventure map')}</p>
    <div class="isles">${ISLES.map(is => is.soon
      ? `<div class="isle lock"><span class="ic" aria-hidden="true">${is.ic}</span><span class="t"><b>${is.name}</b><small>${L('Скоро! 🔒', 'Coming soon! 🔒')}</small></span></div>`
      : is.levels.map(id => `<button class="isle on" data-lv="${id}"><span class="ic" aria-hidden="true">${is.ic}</span><span class="t"><b>${is.name}</b><small>${levelName(id)}</small></span><span class="st" aria-label="${L('звёзды', 'stars')}">${starsOf(advStars(id))}</span></button>`).join('')).join('')}</div>
    <button class="btn ghost small" data-lv="">${L('Потом', 'Later')}</button>`);
  const lv = await new Promise(r => panel.querySelectorAll('[data-lv]').forEach(b => mgOn(b, 'click', () => { sfx.tap(); r(b.dataset.lv || null); })));
  panel.classList.add('away'); await wait(0.25); mgClose();
  return lv;
}

/* ---------- сам забег (зовёт petFun в walk.js) ---------- */
async function petRun(s, id){
  const cam0 = camOffWant.clone();
  let again = true, result = null;
  // на старт: вспышка, камера за спиной малыша, свет чуть тише (сверху пастель выгорает)
  sfx.whoosh(); flash();
  runRoot.visible = true; runCam.on = true; HEMI.intensity = 0.62; sun.intensity = 0.58;
  s.bubble.visible = false; runBtn(true);
  while(again){
    runBuild(id); runStep(0);
    mgOpen('', {hintBottom:true});
    runHudEl = mgNode('div', 'run-hud', `<span class="pill"><i class="pic">🐚</i> <b class="sh">0</b></span><span class="pill">🐟 <b class="fi">0/0</b></span><span class="bar"><i></i><span class="flag" aria-hidden="true">🏁</span></span>`);
    runHud();
    let done;
    const fin = new Promise(r => done = r);
    mgOn(mgRoot, 'pointerdown', e => {
      e.preventDefault();
      if(!R || R.state !== 'go' || R.paused) return;
      const b = runBubbleAt(e); if(b) return runFree(b);
      runJump();
    });
    mgTick(dt => { if(R) runStep(dt); if(R.state === 'end' && R.sp < 0.15 && R.endK >= 1 && !R.over){ R.over = true; done(); } });
    runQuit = () => { R.quit = true; done(); };
    // 3, 2, 1 — поехали! (на паузе отсчёт ждёт)
    const tick = async t => { while(R.paused) await wait(0.1); await wait(t); };
    if(R.stars){ mgHint(L('Сегодня вместо ракушек — звёздочки ⭐ Ракушки прилив принесёт завтра', 'Today there are stars instead of shells ⭐ The tide brings new shells tomorrow')); await tick(2.6); }
    for(const n of ['3', '2', '1']){ if(R.quit) break; mgHint(n); sfx.tick(); await tick(0.55); }
    if(!R.quit){
      mgHint(L('Поехали! 🐾', 'Let\'s go! 🐾')); sfx.arf(); R.state = 'go';
      setTimeout(() => { if(R && R.state === 'go' && !R.slow) mgHint(''); }, 1200);
    }
    await fin;
    if(R.quit){ mgClose(); break; }   // ушли домой с паузы: без итогов, забег можно пройти потом
    await wait(0.6);
    result = runResults();
    mgHint('');
    again = await runResultPanel(result);
    mgClose();
  }
  // домой: малыш снова в уголке
  runQuit = null; runBtn(false);
  flash();
  runRoot.visible = false; runCam.on = false; homeLights(false);
  if(R){ runRoot.remove(R.grp); R = null; } runHudEl = null;
  s.root.position.copy(PET_SPOT); s.root.rotation.set(0, 0, 0); s.inner.rotation.set(0, 0, 0); s.inner.position.set(0, 0, 0); s.wobble = 0; s.flap = 0;
  camOff.copy(cam0); camOffWant.copy(cam0);
  s.happyUntil = now + 3; setMood(s, 'happy');
  runSay = result ? L(`Какое приключение! Звёзд: ${result.stars} ⭐`, `What an adventure! Stars: ${result.stars} ⭐`) : '';
  if(!result){ s.happyUntil = 0; return false; }   // ушли с паузы, не добежав ни разу — как «Потом»: малыш просто дома
}
let runSay = '';

/* ---------- пауза и «домой» посреди забега ----------
   Пока бежим, в углу остаются только звук и 🏠. Касание 🏠 — пауза: «Бежим дальше!» или «Домой».
   Домой — без итогов и без наказания, забег можно пройти потом. На итогах 🏠 — то же, что кнопка «Домой». */
let runQuit = null;
function runBtn(on){
  document.body.classList.toggle('run-on', on);
  let b = $('#btnRunHome');
  if(!on){ if(b) b.remove(); return; }
  if(b) return;
  b = document.createElement('button'); b.id = 'btnRunHome'; b.className = 'round home';
  b.innerHTML = '<span aria-hidden="true">🏠</span>'; b.setAttribute('aria-label', L('Пауза и домой', 'Pause and go home'));
  $('#btnSound').after(b);
  b.addEventListener('click', () => { sfx.tap(); runPause(); });
}
async function runPause(){
  if(!R || !runQuit || R.paused) return;
  const endBtn = document.querySelector('.run-end [data-k="home"]');
  if(endBtn) return endBtn.click();
  if(R.state === 'end') return;   // финишная камера ещё летит — итоги вот-вот появятся
  R.paused = true; mgHintEl.style.visibility = 'hidden';
  const panel = mgNode('div', 'mg-panel run-pause', `
    <p class="ttl display">${L('Пауза ⏸', 'Paused ⏸')}</p>
    <p class="got">${L(`${save.pet.name} подождёт. Забег можно пройти в другой раз`, `${save.pet.name} will wait. You can do the dash another time`)}</p>
    <div class="row"><button class="btn" data-k="go">${L('Бежим дальше! ▶', 'Keep going! ▶')}</button><button class="btn ghost" data-k="home">${L('Домой 🏠', 'Home 🏠')}</button></div>`);
  const k = await new Promise(r => panel.querySelectorAll('[data-k]').forEach(b => mgOn(b, 'click', e => { e.stopPropagation(); sfx.tap(); r(b.dataset.k); })));
  panel.classList.add('away'); await wait(0.25); panel.remove();
  mgHintEl.style.visibility = '';
  if(!R) return;
  if(k === 'home' && runQuit) runQuit();
  R.paused = false;
}
// подсчёт звёзд, награда, рекорд, кубок
function runResults(){
  const r = R, shellsOk = r.shells >= Math.ceil(r.total*SHELL_GOAL), fishOk = r.fish >= r.fishTotal;
  const stars = 1 + (shellsOk ? 1 : 0) + (fishOk ? 1 : 0);
  const best = save.adv.best[r.id] || 0, cup = fishOk && !save.adv.cups.includes(r.id);
  save.adv.best[r.id] = Math.max(best, stars);
  if(cup) save.adv.cups.push(r.id);
  save.adv.runs++;
  const today = new Date().toDateString(); save.adv.day = {d:today, n:runsToday() + 1};
  persist();
  return {stars, shellsOk, fishOk, shells:r.shells, total:r.total, fish:r.fish, fishTotal:r.fishTotal, starRun:r.stars, cup, gift:(r.stars ? 0 : r.shells) + (cup ? CUP_GIFT : 0)};
}
const CUP_GIFT = 10;
async function runResultPanel(res){
  const row = (ok, t, sm) => `<li class="${ok ? 'ok' : ''}"><span class="st">★</span><span>${t}<small>${sm}</small></span></li>`;
  const panel = mgNode('div', 'mg-panel run-end', `
    <p class="ttl display">${L('Финиш! 🏁', 'Finish! 🏁')}</p>
    <ul class="res-stars">
      ${row(true, L('Добежали до флажка', 'Reached the flag'), L(`${save.pet.name} — молодец!`, `Well done, ${save.pet.name}!`))}
      ${row(res.shellsOk, res.starRun ? L('Звёздочки', 'Stars') : L('Ракушки', 'Shells'), L(`${res.shells} из ${res.total}`, `${res.shells} of ${res.total}`))}
      ${row(res.fishOk, L('Спасли всех рыбок', 'Saved all the fish'), L(`${res.fish} из ${res.fishTotal}`, `${res.fish} of ${res.fishTotal}`))}
    </ul>
    ${res.starRun ? `<p class="got">${L('Ракушки на сегодня собраны — прилив принесёт новые завтра 🌊', 'The shells for today are collected — the tide brings new ones tomorrow 🌊')}</p>` : ''}
    ${res.cup ? `<p class="got cup">🏆 ${L(`Кубок «${ISLES[0].name}» — теперь на полке в домике!`, `The ${ISLES[0].name} cup is now on the shelf at home!`)}</p>` : ''}
    <p class="earned display">${res.gift ? `+${res.gift} 🐚` : ''}</p>
    <div class="row"><button class="btn" data-k="home">${L('Домой 🏠', 'Home 🏠')}</button><button class="btn ghost" data-k="again">${L('Ещё раз ↻', 'Again ↻')}</button></div>`);
  panel.querySelectorAll('.res-stars li').forEach((li, i) => setTimeout(() => { li.classList.add('in'); if(li.classList.contains('ok')) sfx.star(); }, 250 + i*380));
  if(res.gift) setTimeout(() => addShells(res.gift, toScreen(headTop(petSeal))), 1400);
  if(res.stars === 3) setTimeout(() => { sfx.hug(); burst(TEX.heart, headTop(petSeal), 16, 2.2, 0.3); }, 1500);
  const k = await new Promise(r => panel.querySelectorAll('[data-k]').forEach(b => mgOn(b, 'click', () => { sfx.tap(); r(b.dataset.k); })));
  panel.classList.add('away'); await wait(0.25);
  return k === 'again';
}
