/* ---------------- смена: 3 пациента + событие, кроватка, итоги (Фаза 2) ----------------
   Смена = SHIFT_SIZE пациентов, между 2-м и 3-м — событие (волна с ракушками или малыш в гости).
   После объятий пациента укладываем спать и укрываем одеялом. В конце — «Итоги смены» со звёздами,
   проиграть нельзя: первая звезда даётся всегда. Подключается после shop.js и до game.js. */
const SHIFT_SIZE = 3;
let shift = null;
function newShift(){ shift = {n:0, shells:0, mistakes:0, secrets:0, photos:[], event:false}; }
const extraSeals = new Set();   // гости событий: loop() в game.js обновляет их, как пациента

/* ---------- кроватка восстановления ---------- */
const BLANKET_TEX = canvasTex(128, (g, s) => {
  g.fillStyle = '#FF8FB1'; g.fillRect(0, 0, s, s); g.fillStyle = '#FFF4D6';
  for(const [x, y] of [[22,26],[86,44],[50,96],[114,108],[0,70],[128,70]]){ starPath(g, x, y, 14); g.fill(); }
});
BLANKET_TEX.wrapS = BLANKET_TEX.wrapT = THREE.RepeatWrapping; BLANKET_TEX.repeat.set(3, 2);
function makeBed(){   // мягкий матрасик под тюленем
  const g = new THREE.Group();
  const mat = addOutline(new THREE.Mesh(SPH, toon(0xBFE6D6)), 1.03); mat.scale.set(1.85, 0.12, 2.05); mat.position.set(0, 0.03, -0.2); g.add(mat);
  return g;
}
function makeBlanket(){
  const m = toon(0xFFFFFF); m.map = BLANKET_TEX;
  const b = addOutline(new THREE.Mesh(new THREE.SphereGeometry(1, 36, 14, 0, Math.PI*2, 0, Math.PI/2), m), 1.03);
  return b;
}
// p = 0 — одеяло лежит на матрасике, p = 1 — тюлень укрыт по шейку (голова торчит спереди)
function setBlanket(b, p){
  b.scale.set(1.5, 0.06 + 1.55*Math.max(0, p), 1.7); b.position.set(0, 0.1, -0.35);
}
async function tuckIn(s){
  const bed = makeBed(); bed.position.copy(s.root.position); bed.scale.setScalar(0.01); scene.add(bed); s.bed = bed;
  s.headBase = s.head.position.clone();
  sfx.whoosh(); burst(TEX.puff, s.root.position.clone().add(new V3(0, 0.3, 1.2)), 8, 1.2, 0.4);
  hop(s, 0.35, 0.45);
  await tween(0.45, k => bed.scale.setScalar(Math.max(0.01, k)), ease.back);
  sfx.yawn(); floatText(L('Ааа-у-у…', 'Yaaawn…'), headTop(s), '#6B6A7E'); setMood(s, 'ok'); s.flap = 0;
  const h0 = s.head.position.clone(), h1 = new V3(0, 1.3, 0.78);
  await tween(0.6, k => s.head.position.lerpVectors(h0, h1, k));
  const bl = makeBlanket(); setBlanket(bl, 0); s.inner.add(bl); s.blanket = bl;
  focusCam(worldOf(s, new V3(0, -0.45, -0.5)), 3.5, 0.45);

  mgOpen(L('Укрой одеялом — тяни вверх', 'Tuck in with the blanket — pull up'));
  const handle = mgNode('div', 'blanket-pull', `<span class="arr">⬆</span><span class="lbl">${L('Тяни', 'Pull')}</span>`);
  let p = 0, y0 = null, p0 = 0, rustleT = 0, finish;
  const done = new Promise(r => finish = r);
  const set = v => {
    p = Math.max(0, Math.min(1, v)); setBlanket(bl, p);
    handle.style.translate = `-50% ${-p*innerHeight*0.28}px`; handle.style.opacity = 1 - p*0.7;
  };
  mgOn(mgRoot, 'pointerdown', e => { y0 = e.clientY; p0 = p; handle.classList.add('on'); });
  mgOn(mgRoot, 'pointermove', e => {
    if(y0 === null) return;
    set(p0 + (y0 - e.clientY)/(innerHeight*0.28));
    if(now - rustleT > 0.12){ rustleT = now; sfx.rub(); }
    if(p >= 0.85){ y0 = null; finish(); }
  });
  const up = () => {
    if(y0 === null) return; y0 = null; handle.classList.remove('on');
    mgHint(L('Ещё выше — до самой шейки!', 'Higher — all the way to the neck!'));
    const from = p; tween(0.3, k => { if(y0 === null) set(from*(1 - k)); });
  };
  for(const ev of ['pointerup', 'pointercancel']) mgOn(mgRoot, ev, up);
  await done;
  mgClose();
  const from = p; await tween(0.35, k => setBlanket(bl, from + (1 - from)*k), ease.back);
  setMood(s, 'sleep'); s.sleeping = true; s.zzzT = 0.2; sfx.lullaby();
  floatText(L('Сладких снов!', 'Sweet dreams!'), headTop(s).add(new V3(0, 0.3, 0)), '#6B6A7E');
  await wait(2.2);
}
async function wakeUp(s){
  if(!s.bed) return;
  s.sleeping = false; setMood(s, 'happy'); sfx.arf();
  floatText(L(s.p.f ? 'Я выспалась!' : 'Я выспался!', 'I slept well!'), headTop(s));
  const bl = s.blanket, bed = s.bed, h0 = s.head.position.clone();
  await tween(0.45, k => { setBlanket(bl, 1 - k); s.head.position.lerpVectors(h0, s.headBase, k); });
  s.inner.remove(bl);
  hop(s, 0.35, 0.45);
  await tween(0.35, k => bed.scale.setScalar(Math.max(0.01, 1 - k)));
  scene.remove(bed); s.bed = null;
}

/* ---------- событие смены ---------- */
async function runEvent(){
  $('#card').hidden = true;
  // по кругу: малыш в гости (он же — в самой первой смене: после неё остаётся жить, Фаза 3), ракушки, «Скорая»
  const k = save.shifts % 3;
  if(k === 0) await evPup(); else if(k === 1) await evShells(); else await evNet();
}
// ракушка-гребешок: приплюснутый шарик с рёбрышками и «ушками» у основания
const SHELL_TEX = canvasTex(64, (g, s) => {
  g.fillStyle = '#fff'; g.fillRect(0, 0, s, s); g.fillStyle = 'rgba(160,120,140,.35)';
  for(let x = 0; x < s; x += s/12) g.fillRect(x, 0, 2.2, s);
});
function makeShell(col, big){
  const g = new THREE.Group(), m = toon(col); m.map = SHELL_TEX;
  const b = addOutline(new THREE.Mesh(SMALL, m), 1.1); b.scale.set(0.24, 0.09, 0.22); g.add(b);
  const ear = addOutline(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.07), toon(col)), 1.15); ear.position.set(0, 0.02, -0.21); g.add(ear);
  g.scale.setScalar(big ? 1.8 : 1.35);
  return g;
}
const SHELL_SPOTS = [[0.1,0.6],[1.1,0.3],[-1.0,0.0],[0.7,-0.8],[-0.5,-0.9],[1.6,-0.2],[-1.8,-0.2],[0.2,1.7],[-0.9,1.0],[0.8,1.6],[0.3,-1.6]];
async function evShells(){
  focusCam(new V3(0, 0.3, 0.3), 4.4, 0);
  mgOpen(L('Волна принесла ракушки! Собери их', 'A wave brought shells! Collect them'));
  sfx.splash();
  const spots = SHELL_SPOTS.slice().sort(() => Math.random() - 0.5).slice(0, 7);
  const cols = [0xFFC2D1, 0xFFD2A8, 0xD9C8FF, 0xFFF4E8, 0xBDE8D6];
  const shells = [];
  let left = spots.length, finish;
  const done = new Promise(r => finish = r);
  spots.forEach(([x, z], i) => {
    const gold = i === 0, sh = makeShell(gold ? 0xFFD66B : cols[i % cols.length], gold);
    const to = new V3(x, 0.32, z), from = to.clone().setY(0).setLength(4.4);
    sh.rotation.y = Math.random()*6; sh.userData = {val:gold ? 3 : 1, gold, y:to.y, ready:false};
    shells.push(sh);
    wait(0.01 + i*0.12).then(() => { burst(TEX.puff, from, 3, 0.8, 0.35); return flyTo(sh, from, to, 0.7, 1.2); })
      .then(() => { sh.userData.ready = true; sfx.pop(); });
  });
  mgOn(mgRoot, 'pointerdown', e => {
    let best = null, bd = 64;
    for(const sh of shells){
      if(!sh.parent || !sh.userData.ready) continue;
      const p = toScreen(sh.position), d = Math.hypot(p.x - e.clientX, p.y - e.clientY);
      if(d < bd){ bd = d; best = sh; }
    }
    if(!best) return;
    const pos = best.position.clone(); scene.remove(best);
    burst(TEX.star, pos, best.userData.gold ? 12 : 5, 1.4, 0.24); sfx.coin();
    addShells(best.userData.val, toScreen(pos));
    if(best.userData.gold) floatText(L('Золотая!', 'Golden!'), pos.clone().add(new V3(0, 0.6, 0)), '#C9962E');
    if(!--left) finish();
    else mgHint(L(`Осталось ${left}`, `${left} left`));
  });
  let sparkT = 0;
  mgTick(dt => {
    for(const sh of shells) if(sh.parent && sh.userData.ready){ sh.position.y = sh.userData.y + Math.sin(now*3 + sh.rotation.y)*0.03; }
    sparkT -= dt;
    const g = shells[0];
    if(sparkT < 0 && g.parent && g.userData.ready){ sparkT = 0.7; emit(TEX.star, g.position.clone().add(new V3(0, 0.2, 0)), {v:new V3(0, 0.5, 0), life:0.6, size:0.16, spin:3}); }
  });
  await done;
  mgHint(L('Все собраны! 🐚', 'All collected! 🐚')); sfx.good();
  await wait(1.1);
  mgClose(); unfocusCam();
}
const PUP_COLORS = [0xF8DDE4, 0xE6ECF5, 0xEFE4CF, 0xFFFFFF, 0xDCEBDF];
async function evPup(){
  const my = save.pet;   // свой малыш приплывает проведать доктора на работе
  const pup = my ? makePetSeal() : makeSeal({name:L('Малыш', 'Baby'), f:false, color:PUP_COLORS[Math.floor(Math.random()*PUP_COLORS.length)]});
  if(!my) pup.root.scale.setScalar(0.62);   // свой малыш уже нужного роста (makePetSeal)
  setMood(pup, 'ok'); extraSeals.add(pup);
  await arrive(pup);
  sfx.arf(); floatText(my ? L('Привет, доктор!', 'Hello, doctor!') : L('Привет!', 'Hello!'), headTop(pup));
  focusCam(worldOf(pup, new V3(0, -0.5, 0)), 2.4*(my ? petK() : 1), 0.1);
  await wait(0.4);
  mgOpen(my ? L(`${my.name} ${gg('приплыл', 'приплыла')} тебя проведать. Обними!`, `${my.name} swam over to visit you. Give ${gg('him', 'her')} a hug!`) : L('Малыш приплыл в гости. Обними его!', 'A pup swam over to visit. Give it a hug!'));
  await new Promise(r => mgOn(mgRoot, 'pointerdown', e => {
    const c = toScreen(worldOf(pup, new V3(0, -0.4, 0)));
    if(Math.hypot(c.x - e.clientX, c.y - e.clientY) < 130) r();
    else mgHint(L('Нажми на малыша ♡', 'Tap the pup ♡'));
  }));
  mgClose();
  setMood(pup, 'happy'); sfx.hug(); pup.flap = 1;
  burst(TEX.heart, headTop(pup), 14, 2, 0.3);
  await tween(0.8, k => { pup.inner.position.y = Math.sin(k*Math.PI)*0.9; pup.inner.rotation.y = k*Math.PI*2; }, ease.io);
  pup.inner.position.y = 0; pup.inner.rotation.y = 0; pup.flap = 0.3;
  sfx.thud(); await squash(pup, 0.25);
  floatText(L('Это тебе!', 'This is for you!'), headTop(pup), '#D9527E');
  addShells(5, toScreen(headTop(pup)));
  await wait(1.2);
  if(my){ my.xp += 3; persist(); }
  toast(my ? L(`${my.name}: «Я подожду тебя в уголке!» 🦭`, `${my.name}: “I will wait for you in my corner!” 🦭`) : L('Малыш: «Можно я ещё приплыву?» 🦭', 'Pup: “Can I come again?” 🦭'), 3200);
  unfocusCam();
  await wait(0.6);
  await leave(pup); extraSeals.delete(pup);
}

/* ---------- «Скорая»: малыш запутался в сети ----------
   Сирена, приплывает тюленёнок, обмотанный рыболовной сетью. На сети 5 узелков: вокруг светится круг —
   покрути пальцем вокруг узелка, и он развязывается. Верёвка падает, когда развязаны все её узелки.
   Одна вещь за раз: подсвечен только один узелок. Таймера нет, ошибиться нельзя. */
// сеть облегает тело тюленя (эллипсоид тела из makeSeal): узелки спереди, верёвки уходят за спину
const NET_C = new V3(0, 0.8, -0.2), NET_R = new V3(1.15, 0.8, 1.3).multiplyScalar(1.07);
const NET_KNOTS = [[-0.75, 0.3, 0.6], [0.75, 0.3, 0.6], [-0.5, -0.3, 0.8], [0.5, -0.3, 0.8], [0, 0.05, 1]];
const NET_ROPES = [[0, 4], [1, 4], [2, 4], [3, 4], [0, 2], [1, 3], [2, 3], [0, 1],
  [0, [-0.6, 0.3, -0.75]], [1, [0.6, 0.3, -0.75]], [2, [-0.7, -0.35, -0.6]], [3, [0.7, -0.35, -0.6]], [[-0.6, 0.3, -0.75], [0.6, 0.3, -0.75]]];
const netAt = v => new V3(...v).normalize().multiply(NET_R).add(NET_C);
function makeNet(){
  const g = new THREE.Group(), rope = toon(0x5E9C7C), knots = [], ropes = [];
  const dir = x => new V3(...(Array.isArray(x) ? x : NET_KNOTS[x])).normalize();
  for(const [a, b] of NET_ROPES){
    const va = dir(a), vb = dir(b), pts = [];
    for(let i = 0; i <= 14; i++) pts.push(netAt(va.clone().lerp(vb, i/14).toArray()));
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.04, 6), rope);
    g.add(m); ropes.push({m, ks:[a, b].filter(x => !Array.isArray(x))});
  }
  for(const v of NET_KNOTS){
    const k = new THREE.Group(); k.position.copy(netAt(v));
    const b = addOutline(new THREE.Mesh(SMALL, toon(0xE9B872)), 1.12); b.scale.setScalar(0.13); k.add(b);
    for(const sd of [-1, 1]){ const l = addOutline(new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 6, 14), toon(0xE9B872)), 1.12); l.position.x = sd*0.14; l.rotation.y = sd*0.5; k.add(l); }
    g.add(k); knots.push({o:k, free:false});
  }
  g.userData = {knots, ropes};
  return g;
}
async function evNet(){
  // сирена «скорой» — мягкая, на колокольчиках
  sfx.siren();
  mgOpen(L('🚑 Скорая! Кто-то зовёт на помощь…', '🚑 Emergency! Someone is calling for help…'));
  const pup = makeSeal({name:L('Малыш', 'Baby'), f:false, color:PUP_COLORS[Math.floor(Math.random()*PUP_COLORS.length)]});
  const net = makeNet(); pup.root.add(net); pup.root.scale.setScalar(0.62);
  setMood(pup, 'sad'); extraSeals.add(pup);
  await wait(0.6); mgClose();
  await arrive(pup);
  sfx.arf(); floatText(L('Помогите!', 'Help!'), headTop(pup));
  focusCam(worldOf(pup, new V3(0, -0.3, 0)), 2.5, 0.1);
  await wait(0.6);
  const {knots, ropes} = net.userData;
  let left = knots.length;
  mgOpen(L('Малыш запутался в сети! Покрути пальцем вокруг узелка 🔄', 'The pup is tangled in a net! Circle your finger around the knot 🔄'));
  for(const kn of knots){
    const at = () => kn.o.getWorldPosition(new V3()), c = () => toScreen(at());
    const ring = mgNode('div', 'circle-hint net-hint'), un = pin(ring, at);
    const pulse = t => kn.o.scale.setScalar(1 + Math.sin(now*6)*0.12);
    mgTick(pulse);
    let a0 = null, sum = 0, moved = false;
    const ang = e => { const q = c(); return Math.atan2(e.clientY - q.y, e.clientX - q.x); };
    await gesture({
      pointerdown:e => { const q = c(); if(Math.hypot(e.clientX - q.x, e.clientY - q.y) > 150){ mgHint(L('Узелок — там, где светится круг 🔄', 'The knot is inside the glowing circle 🔄')); return false; } a0 = ang(e); sum = 0; moved = false; return false; },
      pointerup:() => { if(a0 !== null && !moved) mgHint(L('Не нажимай — покрути пальцем по кругу 🔄', 'Don\'t tap — draw a circle with your finger 🔄')); a0 = null; return false; },
      pointermove:e => {
        if(a0 === null) return false;
        const q = c(); if(Math.hypot(e.clientX - q.x, e.clientY - q.y) < 18) return false;
        const a = ang(e), da = Math.atan2(Math.sin(a - a0), Math.cos(a - a0)); a0 = a; sum += da;
        if(Math.abs(da) > 0.02){ moved = true; kn.o.rotation.z += da; if(Math.random() < 0.15) sfx.rub(); }
        ring.style.setProperty('--p', Math.min(1, Math.abs(sum)/(Math.PI*1.6)));
        return Math.abs(sum) >= Math.PI*1.6;
      }});
    un(); mgTicks.delete(pulse);
    // развязали: узелок крутится и исчезает, свободные верёвки падают
    kn.free = true; left--;
    sfx.pop(); sfx.star(); burst(TEX.star, at(), 8, 1.4, 0.24);
    const o = kn.o; tween(0.35, k => { o.scale.setScalar(Math.max(0.01, 1 - k)); o.rotation.z += 0.3; }).then(() => net.remove(o));
    for(const r of ropes) if(!r.gone && r.ks.length && r.ks.every(i => knots[i].free)) dropRope(r);
    pup.nod = 0; tween(0.3, k => pup.nod = Math.sin(k*Math.PI)*0.2, ease.lin);
    if(left) mgHint(L(`Ещё ${left} ${plural(left, 'узелок', 'узелка', 'узелков', 'knot', 'knots')}!`, `${left} more ${plural(left, 'узелок', 'узелка', 'узелков', 'knot', 'knots')}!`));
  }
  mgClose();
  // сеть спадает целиком
  for(const r of ropes) if(!r.gone) dropRope(r);
  function dropRope(r){
    r.gone = true; const m = r.m, y0 = m.position.y;
    tween(0.6, k => { m.position.y = y0 - k*1.6; m.scale.setScalar(1 - k*0.3); }, ease.io).then(() => net.remove(m));
  }
  await wait(0.5);
  setMood(pup, 'happy'); sfx.hug(); pup.flap = 1;
  floatText(L('Свобода!', 'Free!'), headTop(pup), '#D9527E');
  burst(TEX.heart, headTop(pup), 14, 2, 0.3);
  await tween(0.8, k => { pup.inner.position.y = Math.sin(k*Math.PI)*0.9; pup.inner.rotation.y = k*Math.PI*2; }, ease.io);
  pup.inner.position.y = 0; pup.inner.rotation.y = 0; pup.flap = 0.3;
  sfx.thud(); await squash(pup, 0.25);
  floatText(L('Спасибо, доктор!', 'Thank you, doctor!'), headTop(pup), '#D9527E');
  addShells(6, toScreen(headTop(pup)));
  await wait(1.2);
  toast(L('Сети в море опасны для тюленей. Хорошо, что есть ты! ♡', 'Fishing nets are dangerous for seals. Good thing you are here! ♡'), 3400);
  unfocusCam();
  await wait(0.8);
  await leave(pup); extraSeals.delete(pup);
}

/* ---------- итоги смены ---------- */
function showResults(){
  save.shifts++;
  const stars = [
    {ok:true, t:L('Все пациенты здоровы', 'All patients are well')},
    {ok:shift.mistakes <= 2, t:L('Точное лечение', 'Precise treatment'), tip:L('Читай карту пациента', 'Read the patient card')},
    {ok:shift.secrets > 0, t:L('Секретик под лупой', 'Secret under the magnifier'), tip:L('Ищи блёстки лупой ✨', 'Look for sparkles with the magnifier ✨')}
  ];
  const got = stars.filter(x => x.ok).length, bonus = 2 + got*2;
  save.shells += bonus; shift.shells += bonus; persist(); shellsShown = save.shells; renderShells();
  $('#resTitle').textContent = L(`Смена ${save.shifts} окончена!`, `Shift ${save.shifts} complete!`);
  $('#resPhotos').innerHTML = shift.photos.map(src => `<img src="${src}" alt="">`).join('');
  const ul = $('#resStars'); ul.innerHTML = '';
  stars.forEach((st, i) => {
    const li = document.createElement('li'); li.className = st.ok ? 'ok' : 'no';
    li.innerHTML = `<span class="st" aria-hidden="true">★</span><span class="t">${st.t}${st.ok ? '' : `<small>${st.tip}</small>`}</span>`;
    ul.appendChild(li);
    setTimeout(() => { li.classList.add('in'); if(st.ok) sfx.star(); }, 450 + i*450);
  });
  const total = $('#resShells'); let shown = 0;
  total.textContent = '+0 🐚';
  const step = () => { shown = Math.min(shift.shells, shown + Math.max(1, Math.ceil(shift.shells/20))); total.textContent = `+${shown} 🐚`; if(shown < shift.shells) setTimeout(step, 45); };
  setTimeout(step, 1900);
  $('#card').hidden = true; $('#tools').hidden = true; $('#wardrobe').hidden = true;
  $('#btnShift').textContent = adoptPending() ? L('Кто там плывёт? 🦭', 'Who is swimming there? 🦭') : L('Новая смена', 'New shift');
  $('#btnResPet').hidden = !save.pet;
  $('#results').hidden = false;
}
function startShift(){
  $('#results').hidden = true;
  newShift(); $('#tools').hidden = false;
  spawnPatient();
}
$('#btnShift').addEventListener('click', () => {
  sfx.tap();
  if(adoptPending()){ $('#results').hidden = true; return adopt(); }
  startShift();
});
$('#btnResPet').addEventListener('click', () => { $('#results').hidden = true; goPet(true); });
$('#btnResShop').addEventListener('click', openShop);

// покадрово: гости событий и «Z-z-z» над спящим пациентом
function shiftTick(t, dt){
  extraSeals.forEach(s => updateSeal(s, t, dt));
  if(S && S.seal.sleeping){
    S.seal.zzzT -= dt;
    if(S.seal.zzzT < 0){ S.seal.zzzT = 1.1; floatText('z', worldOf(S.seal, new V3(0.85 + Math.random()*0.2, 0.35, 0.3)), '#8E99C9'); }
  }
  decorTick(t);
}

/* ---------- пингвин-самозванец (Фаза 6) ----------
   Иногда второй пациент смены — пингвин в костюме тюленя. Под лупой вместо болячек три «странности»:
   клюв из-под мордочки, оранжевые лапки и «кря» в животике. Доктор решает: «Это не тюлень!» — костюм
   слетает в воду, пингвин Пинг смущается и признаётся, что замёрз: шарфик, объятие, фото в альбом.
   Ошибиться нельзя: «Тюлень как тюлень» — пингвин крякает, и кнопка пропадает. */
Object.assign(SYMPTOMS, {
  beak: {ic:'🔸', name:() => L('Клюв?', 'A beak?')},
  paws: {ic:'🐾', name:() => L('Оранжевые лапки?', 'Orange feet?')},
  quack:{ic:'🦆', name:() => L('Сказал «кря»?', 'Said “quack”?')}
});
Object.assign(HOTSPOT, {
  beak: s => [wpos(s.clue.beak)],
  paws: s => s.clue.feet.map(wpos),
  quack:s => [s.inner.localToWorld(new V3(0, 0.55, 1.0))]   // животик: там «кря» и прячется
});
Object.assign(THANKS, {
  beak: [f => L('Можно я ещё приду? Только уже без костюма!', 'Can I come again? Without the costume this time!')],
  paws: [f => L('Теперь я самый тёплый пингвин на льдине!', 'Now I am the warmest penguin on the ice!')],
  quack:[f => L('Кря! То есть… спасибо, доктор Сабрина!', 'Quack! I mean… thank you, Doctor Sabrina!')]
});
const DISGUISE = {name:L('Тюлень Тюленевич', 'Sealy McSeal'), f:false, color:0xDCE3EC, spot:0xB9C4D3, ail:['beak', 'paws', 'quack'],
  text:L('Здравствуйте, доктор! Я самый обыкновенный тюлень. Честно-честно! Просто что-то нездоровится…', 'Hello, doctor! I am a totally ordinary seal. Honest! I just feel a bit funny…')};
const PENG = {name:L('Пинг', 'Ping'), f:false, color:0x46557A, ail:['beak', 'paws', 'quack'], peng:true,
  text:L('Пингвин Пинг надел тюленью шубку: очень хотел попасть в самую весёлую больницу на льдине. А ещё он правда замёрз.', 'Ping the penguin put on a seal costume: he really wanted to visit the most fun hospital on the ice. And he really is cold.')};
const PENG_SHELLS = 5;   // за разоблачение
const pengMet = () => save.album.some(a => a.name === 'Пинг' || a.name === 'Ping');
// второй пациент смены, не в самой первой смене; первый раз — обязательно, потом — иногда
function pengDue(){
  return !!shift && shift.n === 1 && save.shifts >= 1 && (!pengMet() || Math.random() < 0.25);
}
async function spawnImpostor(){
  const seal = makeSeal(DISGUISE); addCostumeClues(seal);
  S = {p:DISGUISE, seal, needs:[], done:new Set(), found:new Set(), ail:{}, stage:'arriving'};
  setMood(seal, 'ok');
  $('#card').hidden = false; $('#wardrobe').hidden = true; $('#tools').hidden = true; renderCard();
  setBusy(true); await arrive(seal);
  floatText(L('Кхе-кхе… Я тюлень!', 'Ahem… I am a seal!'), headTop(seal));
  S.stage = 'diagnose'; renderCard();
  await mgLupa(seal, DISGUISE.ail, a => {
    S.found.add(a); renderCard();
    if(a === 'quack'){ sfx.quack(); floatText(L('Кря!', 'Quack!'), headTop(seal).add(new V3(0, 0.3, 0))); }
    if(a === 'beak') setTimeout(() => floatText(L('Это… родинка!', 'That is… a freckle!'), headTop(seal)), 700);
  });
  unfocusCam();
  S.stage = 'reveal';

  // решение доктора; «не то» не бывает — пингвин просто выдаёт себя ещё раз
  mgOpen(L('Хм… Какой-то странный тюлень', 'Hmm… a strange kind of seal'));
  const ask = mgNode('div', 'mg-panel adopt', `<p>${L('Клюв, оранжевые лапки и «кря»… Доктор, что скажешь?', 'A beak, orange feet and a “quack”… Doctor, what do you think?')}</p>
    <div class="row"><button class="btn" id="pengYes">${L('Это не тюлень! 🐧', 'Not a seal! 🐧')}</button>
    <button class="btn ghost" id="pengNo">${L('Тюлень как тюлень', 'Just a seal')}</button></div>`);
  await new Promise(r => {
    mgOn(ask.querySelector('#pengYes'), 'click', r);
    const no = ask.querySelector('#pengNo');
    mgOn(no, 'click', () => {
      sfx.quack(); squash(seal, 0.15, 0.3); no.remove();
      floatText(L('Кря! Ой… то есть ар!', 'Quack! Oops… I mean arf!'), headTop(seal));
      mgHint(L('Разве тюлени говорят «кря»? 🙂', 'Do seals say “quack”? 🙂'));
    });
  });
  sfx.tap(); ask.classList.add('away'); await wait(0.3); mgClose();

  // разоблачение: костюм дрожит, пух — и пустой костюм кувырком улетает в воду
  const peng = makePenguin(PENG), c = seal.root, p0 = c.position.clone();
  peng.root.position.copy(p0);
  focusCam(p0.clone().add(new V3(0, 1, 0)), 4.6, 0);
  sfx.whoosh(); seal.flap = 1;
  await tween(0.6, k => { seal.shake = Math.sin(k*Math.PI*8)*0.35; seal.wobble = Math.sin(k*Math.PI*10)*0.08; }, ease.lin);
  seal.shake = seal.wobble = 0; seal.flap = 0;
  seal.clue.beak.visible = false; seal.clue.feet.forEach(f => f.visible = false); setMood(seal, 'sleep');   // внутри пусто
  sfx.pop(); burst(TEX.puff, p0.clone().add(new V3(0, 1, 0.3)), 16, 2.2, 0.55);
  scene.add(peng.root); setMood(peng, 'sad');
  const land = new V3(p0.x + 3.6, 0.1, p0.z - 0.4);
  tween(1.0, k => { c.position.set(p0.x + 3.6*k, p0.y + Math.sin(k*Math.PI)*2.4 - 0.8*k, p0.z - 0.4*k); c.rotation.z = -k*4.2; c.scale.setScalar(1 - 0.3*k); }, ease.lin)
    .then(() => { sfx.splash(); burst(TEX.puff, land, 10, 1.6, 0.45); scene.remove(c); });
  await hop(peng, 0.35, 0.4); sfx.thud();
  S.p = PENG; S.seal = peng; renderCard();
  await wait(0.5);
  floatText(L('Ой! Раскусили…', 'Oops! You got me…'), headTop(peng)); sfx.quack();
  await wait(1.4);
  setMood(peng, 'ok'); squash(peng, 0.15, 0.3);
  floatText(L('Я Пинг!', 'I am Ping!'), headTop(peng), '#D9527E');
  toast(L('Пинг: «Я пингвин! У вас тут так весело — очень хотелось в гости…»', 'Ping: “I am a penguin! It is so fun here — I really wanted to visit…”'), 3400);
  addShells(PENG_SHELLS, toScreen(headTop(peng)));
  await wait(1.8);
  unfocusCam();

  // …а замёрз он по-настоящему: дальше обычное лечение, только шарфик
  S = {p:PENG, seal:peng, needs:['scarf'], done:new Set(), found:new Set(PENG.ail), ail:{cold:true}, stage:'treat'};
  applyAilments(peng, S.ail);
  $('#tools').hidden = false; renderCard(); setBusy(false);
  toast(L('Пинг: «А ещё мне правда холодно… Можно шарфик?» 🧣', 'Ping: “And I really am cold… May I have a scarf?” 🧣'), 4200);
}
// вместо кроватки: пингвин танцует «спасибо» (спать в чужой кроватке ему неловко)
async function pengBye(s){
  sfx.quack(); floatText(L('Кря-кря! Танец спасибо!', 'Quack quack! A thank-you dance!'), headTop(s), '#D9527E');
  s.flap = 1;
  await tween(1.4, k => { s.inner.rotation.z = Math.sin(k*Math.PI*6)*0.18; s.inner.rotation.y = Math.sin(k*Math.PI*3)*0.5; }, ease.lin);
  s.inner.rotation.z = s.inner.rotation.y = 0; s.flap = 0.35;
  await wait(0.4);
}
