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
  if(save.shifts % 2 === 0) await evPup(); else await evShells();   // малыш — уже в первой смене: после неё он останется жить (Фаза 3)
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
  await squash(pup, 0.25);
  floatText(L('Это тебе!', 'This is for you!'), headTop(pup), '#D9527E');
  addShells(5, toScreen(headTop(pup)));
  await wait(1.2);
  if(my){ my.xp += 3; persist(); }
  toast(my ? L(`${my.name}: «Я подожду тебя в уголке!» 🦭`, `${my.name}: “I will wait for you in my corner!” 🦭`) : L('Малыш: «Можно я ещё приплыву?» 🦭', 'Pup: “Can I come again?” 🦭'), 3200);
  unfocusCam();
  await wait(0.6);
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
