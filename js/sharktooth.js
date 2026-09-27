/* ---------------- 🦷 История акулы (Спринт 5, задача 3; глава 4 «Книги острова») ----------------
   1. «Салки» (js/chase.js): после трёх доплывов (save.dive.chase.n ≥ 3) в конце следующей погони акула застревает
      в щели по-настоящему и плачет — болит зуб. Нажимаем на неё, вытягиваем (Пинг и папа по сети тянут вместе),
      малыш зовёт её в больницу → save.dive.shark.tooth = 1.
   2. Больница: акула — следующий пациент смены (вместо тюленя). «Скажи а-а-а» → найди больной зуб →
      вытащи застрявшую ракушку (тяни и не отпускай) → почисти зубы щёткой → обними. Фото в альбом → tooth = 2,
      акула — подружка (как после мячика в бухте), коврик-акулёнок в иглу.
   3. Бухта (js/dive.js): нажми на акулу-подружку — она катает малыша на спине по всей бухте (ракушки раз в день).
   Проиграть нельзя: промахи — только подсказки, а если долго не получается, помогают друзья.
   Подключается после chase.js: берёт модель акулы из dive.js (DV_MAKE.shark), погоню — из chase.js. */
const ST_PULLS = 7;           // сколько раз нажать, чтобы вытянуть акулу из щели
const ST_BRUSH = 8;           // сколько раз провести щёткой туда-сюда
const ST_CURE_SHELLS = 12, ST_RIDE_SHELLS = 8;

/* ---------- 1. Салки: застряла по-настоящему ---------- */
// решает хозяин погони (или я одна): четвёртая погоня и дальше, пока зуб не вылечен
const chToothDue = () => save.dive.shark.tooth === 0 && save.dive.chase.n >= 3;
async function chToothScene(ex){
  const C = CH, S = C.sh, gy = CH_EXIT.gy, at = (dx = 0, dy = 0) => chAt(S.stx + dx, gy + dy, 0.4);
  S.st = 'stuck';
  floatText(L('Ай-ай! 😢', 'Ow-ow! 😢'), at(0.3, 1.2), '#3B3A4A'); sfx.bad();
  for(const p of chPals()) p.face = -1;
  await wait(1.2); if(CH !== C) return;
  floatText('💧', at(0.9, 0.5), '#6FC0DF');
  mgHint(L('Акула застряла по-настоящему… и плачет! Нажимай на неё — вытянем! 💪', 'The shark is really stuck… and crying! Tap her — let\'s pull her out! 💪'));
  // тянем: каждое нажатие — рывок; Пинг тянет сам; по сети нажатия напарника тоже считаются
  let pulls = 0, idle = 0, free = null;
  const freed = new Promise(r => free = r);
  const ring = mgNode('div', 'target'), unpin = pin(ring, () => at(0.2, 0));
  const pull = (who) => {
    if(pulls >= ST_PULLS || CH !== C) return;
    pulls++; idle = 0;
    S.stx = ex - pulls*0.07; sfx.boing();
    burst(TEX.puff, at(1, 0), 5, 1.2, 0.3);
    floatText(who === 'me' ? L(['Тянем!', 'Ещё!', 'Раз-два!'], ['Pull!', 'More!', 'Heave-ho!'])[pulls % 3] : who === 'ping' ? L('Кря! Тянем!', 'Quack! Pull!') : '💪',
      who === 'me' ? chAt(chX(C.me), C.me.y + 0.9) : C.pal ? chAt(chX(C.pal), C.pal.y + 0.9) : at(0, 1), '#D9527E');
    mgHint(`${L('Тянем!', 'Pull!')} 💪 ${'●'.repeat(pulls)}${'○'.repeat(ST_PULLS - pulls)}`);
    if(pulls >= ST_PULLS) free();
  };
  mgOn(mgRoot, 'pointerdown', e => {
    if(CH !== C || pulls >= ST_PULLS || e.target.closest('button, .mg-panel')) return;
    const q = toScreen(at(0.2, 0));
    if(Math.hypot(e.clientX - q.x, e.clientY - q.y) > 150) return;
    pull('me'); if(C.mode === 'net') netSend({t:'chpull'});
  });
  if(C.mode === 'net') netOn('chpull', () => pull('pal'));
  mgTick(dt => {
    if(CH !== C || pulls >= ST_PULLS) return;
    idle += dt;
    if(C.mode === 'ping' && idle > 0.9) pull('ping');
    else if(idle > 6){ pull('help'); idle = 4.6; if(pulls === 1 || pulls === 4) chSay(L('Крабики помогают тянуть! 🦀', 'The crabs help to pull! 🦀'), 1800); }
  });
  await freed; unpin();
  if(CH !== C) return;
  // выскочила!
  sfx.pop(); sfx.whoosh(); burst(TEX.puff, at(0.5, 0), 14, 2, 0.4);
  const x0 = S.stx;
  await tween(0.7, k => { S.stx = x0 - k*1.8; S.o.rotation.z = Math.sin(k*Math.PI)*0.6; }, ease.out);
  if(CH !== C) return;
  S.o.rotation.z = 0; S.off = S.stx - C.S; S.st = 'free';
  floatText(L('Спасибо! Ой… зуб болит 🦷😢', 'Thank you! Ouch… my tooth hurts 🦷😢'), at(0, 1.3), '#3B3A4A');
  mgHint(L('Вот почему акула гонялась с открытым ртом: у неё болит зуб! 🦷', 'That is why the shark chased with her mouth open: her tooth hurts! 🦷'));
  await wait(2.6); if(CH !== C) return;
  floatText(L('Приплывай в больницу! Доктор вылечит! 🏥', 'Come to the hospital! The doctor will help! 🏥'), chAt(chX(C.me), C.me.y + 1), '#D9527E'); sfx.arf();
  await wait(2.2); if(CH !== C) return;
  S.st = 'laugh'; sfx.hug(); burst(TEX.heart, at(0, 0.5), 16, 2.2, 0.32);
  floatText(L('Правда? Уже плыву! 💗', 'Really? I\'m on my way! 💗'), at(0, 1.3), '#D9527E');
  if(save.dive.shark.tooth < 1){ save.dive.shark.tooth = 1; persist(); }
  C.toothNow = true; mgHint('');
  await wait(1.8); if(CH !== C) return;
  C.end = 'win';
}

/* ---------- 2. Больница: акула-пациент ---------- */
// акула ждёт — она следующий пациент смены
const sharkDue = () => save.dive.shark.tooth === 1 && !!shift && shift.n < SHIFT_SIZE;
const ST_SC = 1.35, ST_Y = 0.25 + 0.42*ST_SC - 0.05;
function stMouth(o){   // открытый рот: вид спереди (x — ширина, y — вверх, z — наружу), прячем, пока рот закрыт
  const M = new THREE.Group(); M.position.set(1.0, -0.15, 0); M.rotation.y = Math.PI/2; M.scale.y = 0.01; M.visible = false; o.add(M);
  const cav = addOutline(new THREE.Mesh(SMALL, toon(0xB8436A)), 1.06); cav.scale.set(0.3, 0.2, 0.05); M.add(cav);
  const tg = new THREE.Mesh(SMALL, toon(0xFF8FB1)); tg.scale.set(0.17, 0.07, 0.04); tg.position.set(0, -0.1, 0.03); M.add(tg);
  const teeth = [], TG = new THREE.ConeGeometry(0.034, 0.1, 6);
  for(let i = 0; i < 5; i++){ const x = -0.2 + i*0.1, t = new THREE.Mesh(TG, whiteMat); t.rotation.z = Math.PI; t.position.set(x, 0.14 - x*x*0.9, 0.05); M.add(t); teeth.push(t); }
  for(let i = 0; i < 4; i++){ const x = -0.15 + i*0.1, t = new THREE.Mesh(TG, whiteMat); t.position.set(x, -0.15 + x*x*0.9, 0.05); M.add(t); teeth.push(t); }
  const sore = teeth[3]; sore.material = toon(0xFFB0B8); sore.scale.setScalar(1.25);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX, color:0xFF6B8B, transparent:true, depthWrite:false, opacity:0.7}));
  glow.scale.setScalar(0.22); glow.position.copy(sore.position).add(new V3(0, 0, 0.02)); M.add(glow);
  const shell = makeShell(0xFFE3A8); shell.scale.setScalar(0.3); shell.rotation.set(1.3, 0, 0.5); shell.position.set(0.155, 0.1, 0.07); M.add(shell);
  return {M, teeth, sore, glow, shell, shell0:shell.position.clone()};
}
async function spawnShark(){
  S = null; setBusy(true);
  $('#card').hidden = true; $('#tools').hidden = true; $('#wardrobe').hidden = true;
  const o = DV_MAKE.shark(); o.scale.setScalar(ST_SC); scene.add(o);
  const T = stMouth(o), fl = o.userData.fl, W = p => T.M.localToWorld(p.clone());
  let tail = 4, lean = 0;
  mgOpen('', {hintBottom:true});
  mgTick(dt => { fl.forEach(f => f.rotation.y = Math.sin(now*tail)*0.4); T.glow.material.opacity = T.glow.visible ? 0.45 + Math.sin(now*6)*0.3 : 0; o.rotation.x = lean; });
  // приплывает, как все пациенты, и плюхается на льдину
  o.position.set(-7.5, -0.45, 0.6); o.rotation.y = 0;
  tail = 9; sfx.shark();
  mgHint(L('Ой, кто это плывёт? 🦈', 'Oh, who is swimming here? 🦈'));
  await tween(1.8, k => { o.position.x = -7.5 + k*4.1; }, ease.out);
  sfx.splash(); burst(TEX.puff, new V3(-3.4, 0.1, 0.6), 12, 1.8, 0.5);
  await tween(0.8, k => { o.position.x = -3.4 + 3.4*k; o.position.y = -0.45 + (ST_Y + 0.45)*k + Math.sin(k*Math.PI)*1.4; o.position.z = 0.6*(1 - k); o.rotation.z = Math.sin(k*Math.PI)*0.4; }, ease.lin);
  o.rotation.z = 0; sfx.thud(); tail = 3;
  await tween(0.5, k => { o.rotation.y = -k*(Math.PI/2 - 0.45); });   // мордочкой к доктору, чуть боком
  floatText(L('Здравствуйте, доктор! Зуб болит… 😢', 'Hello, doctor! My tooth hurts… 😢'), new V3(0.4, 1.9, 0.4), '#3B3A4A');
  toast(L('Акула из «Салок» приплыла в больницу! Ей нужен зубной доктор 🦷', 'The shark from «Tag» swam to the hospital! She needs a tooth doctor 🦷'), 3400);
  await wait(1.6);
  const mouth = () => W(new V3(0, 0, 0));
  focusCam(mouth().add(new V3(0, 0.1, 0)), 3.2, 0, 0.2);
  // шаги лечения: касания на слое мини-игр; after() снимает касания прошлого шага
  let offs = [];
  const on = (type, fn) => { mgRoot.addEventListener(type, fn); offs.push(() => mgRoot.removeEventListener(type, fn)); };
  const after = () => { offs.forEach(f => f()); offs = []; };
  mgCleanup.push(() => after());
  const step = (fn) => new Promise(res => on('pointerdown', e => { if(e.target.closest('button, .mg-panel')) return; fn(e, () => { after(); res(); }); }));
  const near = (e, v, r) => { const q = toScreen(v); return Math.hypot(e.clientX - q.x, e.clientY - q.y) < r; };

  // 1) «Скажи а-а-а!»
  mgHint(L('Нажми на акулу: «Скажи а-а-а!» 👄', 'Tap the shark: “Say aah!” 👄'));
  let ring = mgNode('div', 'target'), unpin = pin(ring, mouth);
  await step((e, ok) => { if(near(e, mouth(), 170)) ok(); });
  unpin(); sfx.pop();
  T.M.visible = true; o.userData.mo.forEach(m => m.visible = false);
  floatText(L('А-а-а-а!', 'Aaaah!'), mouth().add(new V3(0, 0.6, 0)), '#3B3A4A');
  await tween(0.4, k => { T.M.scale.y = 0.01 + k*0.99; }, ease.out);
  focusCam(mouth(), 1.7, 0, 0.12);
  await wait(0.6);

  // 2) найди больной зуб
  mgHint(L('Какой зубик болит? Нажми на него 🔎', 'Which tooth hurts? Tap it 🔎'));
  let miss = 0, helpPin = null;
  await step((e, ok) => {
    let best = null, bd = 1e9;
    for(const t of T.teeth){ const q = toScreen(W(t.position)), d = Math.hypot(e.clientX - q.x, e.clientY - q.y); if(d < bd){ bd = d; best = t; } }
    if(bd > 60) return;
    if(best === T.sore){ if(helpPin) helpPin(); sfx.good(); burst(TEX.star, W(T.sore.position), 8, 1.2, 0.18); ok(); return; }
    sfx.tap(); burst(TEX.star, W(best.position), 4, 0.8, 0.12);
    floatText(L('Этот здоровый ✨', 'This one is fine ✨'), W(best.position).add(new V3(0, 0.25, 0)), '#3B3A4A');
    if(++miss === 3){ mgHint(L('Больной зубик — розовый и светится 💗', 'The sore tooth is pink and glowing 💗')); helpPin = pin(mgNode('div', 'target'), () => W(T.sore.position)); }
  });
  floatText(L('Вот он! Там ракушка застряла!', 'There it is! A shell is stuck!'), W(T.sore.position).add(new V3(0, 0.3, 0)), '#D9527E');
  await wait(1.2);

  // 3) вытащи ракушку: держи и тяни от зуба, не отпуская
  mgHint(L('Возьмись за ракушку и тяни вниз, не отпускай! 👇', 'Grab the shell and pull down, don\'t let go! 👇'));
  ring = mgNode('div', 'target'); unpin = pin(ring, () => W(T.shell.position));
  const PULL = Math.max(120, innerHeight*0.2);
  await new Promise(res => {
    let pid = null, y0 = 0, k = 0, ret = null;
    const setK = v => { k = v; T.shell.position.copy(T.shell0).add(new V3(0.02*k, -0.1*k, 0.12*k)); lean = -0.12*k; o.position.x = Math.sin(now*40)*0.02*k; };
    on('pointerdown', e => {
      if(pid !== null || k >= 1 || !near(e, W(T.shell.position), 80)) return;
      pid = e.pointerId; y0 = e.clientY; if(ret){ ret.stop = true; ret = null; } sfx.tap();
    });
    on('pointermove', e => {
      if(e.pointerId !== pid || k >= 1) return;
      setK(Math.max(0, Math.min(1, (e.clientY - y0)/PULL)));
      if(Math.random() < 0.15) sfx.rub();
      if(k >= 1){ pid = null; res(); }
    });
    for(const ev of ['pointerup', 'pointercancel']) on(ev, e => {
      if(e.pointerId !== pid || k >= 1) return;
      pid = null;
      if(k > 0.05){ mgHint(L('Почти! Тяни дальше и не отпускай 💪', 'Almost! Pull further and don\'t let go 💪')); sfx.boing(); }
      const r = ret = {stop:false}, k0 = k;
      tween(0.3, t => { if(!r.stop) setK(k0*(1 - t)); }, ease.out);
    });
  });
  after(); unpin(); lean = 0; o.position.x = 0;
  sfx.pop(); const sp = W(T.shell.position);
  T.M.remove(T.shell); scene.add(T.shell); T.shell.position.copy(sp); T.shell.scale.setScalar(0.3*ST_SC);
  tween(0.9, k => { T.shell.position.set(sp.x + k*1.4, sp.y + Math.sin(k*Math.PI)*1 - k*0.9, sp.z + k*0.6); T.shell.rotation.z = k*8; }, ease.lin).then(() => { sfx.plop(); scene.remove(T.shell); });
  burst(TEX.star, sp, 10, 1.6, 0.2);
  floatText(L('Уф! Ракушка вылетела!', 'Phew! The shell popped out!'), sp.clone().add(new V3(0, 0.4, 0)), '#D9527E');
  await wait(1.3);

  // 4) почисти зубы: щётка ездит за пальцем, води туда-сюда по рту
  mgHint(L('Теперь почисти зубки: води щёткой туда-сюда 🪥', 'Now brush the teeth: move the brush back and forth 🪥'));
  const brush = mgNode('div', 'st-brush', '🪥');
  const pinB = pin(brush, () => mouth().add(new V3(0.25, -0.15, 0.2)));
  let strokes = 0;
  await new Promise(res => {
    let pid = null, lastX = 0, dir = 0, run = 0;
    const move = e => { brush.style.left = e.clientX + 'px'; brush.style.top = e.clientY + 'px'; };
    on('pointerdown', e => { if(pid !== null) return; pid = e.pointerId; lastX = e.clientX; dir = 0; run = 0; pinB(); mgStage.appendChild(brush); move(e); });
    on('pointermove', e => {
      if(e.pointerId !== pid || strokes >= ST_BRUSH) return;
      move(e);
      if(!near(e, mouth(), 150)) return;
      const dx = e.clientX - lastX; lastX = e.clientX;
      if(!dx) return;
      const d = Math.sign(dx);
      if(d === dir) run += Math.abs(dx);
      else { if(run > 22){ strokes++; sfx.rub(); emit(TEX.dot, mouth().add(new V3((Math.random() - 0.5)*0.5, (Math.random() - 0.5)*0.2, 0.3)), {v:new V3((Math.random() - 0.5)*0.6, 0.9, 0.2), life:1.2, size:0.14, grow:0.5});
          if(strokes % 2 === 0) burst(TEX.star, mouth().add(new V3(0, 0, 0.3)), 3, 0.8, 0.1);
          mgHint(`🪥 ${'●'.repeat(strokes)}${'○'.repeat(ST_BRUSH - strokes)}`);
          if(strokes >= ST_BRUSH) res(); }
        dir = d; run = Math.abs(dx); }
    });
    for(const ev of ['pointerup', 'pointercancel']) on(ev, e => { if(e.pointerId === pid) pid = null; });
  });
  after(); pinB(); brush.remove();
  T.sore.material = whiteMat; T.sore.scale.setScalar(1); T.glow.visible = false;
  sfx.star(); burst(TEX.star, W(T.sore.position), 14, 1.6, 0.22);
  floatText(L('Блестят! ✨', 'Sparkly! ✨'), mouth().add(new V3(0, 0.45, 0)), '#D9527E');
  await wait(1.0);
  await tween(0.35, k => { T.M.scale.y = 1 - k*0.99; });
  T.M.visible = false; o.userData.mo.forEach(m => m.visible = true);
  unfocusCam(); await wait(0.6);
  floatText(L('Не болит! Совсем-совсем! 💗', 'It doesn\'t hurt! Not at all! 💗'), new V3(0.4, 1.9, 0.4), '#D9527E'); sfx.good();

  // 5) обнять
  mgHint(L('Акула здорова! Обними её — нажми на акулу ♡', 'The shark is well! Give her a hug — tap the shark ♡'));
  ring = mgNode('div', 'target'); unpin = pin(ring, () => o.position.clone().add(new V3(0, 0.2, 0)));
  await step((e, ok) => { if(near(e, o.position, 220)) ok(); });
  unpin(); mgHint('');
  sfx.hug(); tail = 12;
  burst(TEX.heart, o.position.clone().add(new V3(0, 0.8, 0)), 20, 2.4, 0.38);
  const ry = o.rotation.y;
  await tween(1.0, k => { o.position.y = ST_Y + Math.sin(k*Math.PI)*1.0; o.rotation.y = ry + k*Math.PI*2; }, ease.io);
  o.rotation.y = ry; o.position.y = ST_Y; tail = 4;
  sfx.arf(); await wait(0.5);
  const img = snapshot({root:{position:new V3(0, ST_Y - 1.0, 0), scale:{x:1}}}, 1.3);
  const sv = save.dive.shark; sv.tooth = 2; sv.friend = true;
  const rug = !owns('rug_shark'); if(rug) save.owned.push('rug_shark');
  save.progress++;
  if(save.pet) save.pet.xp += PATIENT_XP;
  albumAdd({name:L('Акула', 'Shark'), img, d:Date.now()}); renderAlbumCount();
  shift.photos.push(img); shift.n++;
  addShells(ST_CURE_SHELLS, toScreen(o.position.clone().add(new V3(0, 1, 0))));
  await wait(0.8);

  // карточка «здорова!» и «следующий пациент»
  const last = shift.n >= SHIFT_SIZE;
  const card = mgNode('div', 'mg-panel adopt st-cured', `<p class="ttl display">${L('Акула здорова! 🦷✨', 'The shark is well! 🦷✨')}</p>
    <img class="co-photo" src="${img}" alt="">
    <p>${L(`Акула: «Спасибо, доктор ${pname()}! Приплывай в подводную бухту — покатаю тебя на спине! 🦈💗»`, `Shark: “Thank you, Doctor ${pname()}! Come to the underwater bay — I'll give you a ride on my back! 🦈💗”`)}</p>
    <p class="got">+${ST_CURE_SHELLS} 🐚${save.pet ? `  +${PATIENT_XP} 💗` : ''}${rug ? L(' · 🎁 коврик-акулёнок для иглу', ' · 🎁 a shark rug for the igloo') : ''}</p>
    <div class="row"><button class="btn">${last ? L('Итоги смены ⭐', 'Shift results ⭐') : L('Следующий пациент', 'Next patient')}</button></div>`);
  await new Promise(r => mgOn(card.querySelector('button'), 'click', () => { sfx.tap(); r(); }));
  card.classList.add('away'); await wait(0.25);
  // уплывает домой в бухту
  await tween(0.45, k => { o.rotation.y = ry*(1 - k); });
  tail = 9; sfx.whoosh();
  await tween(0.8, k => { o.position.x = 3.6*k; o.position.y = ST_Y + Math.sin(k*Math.PI)*1.3 - (ST_Y + 0.45)*k; o.rotation.z = -Math.sin(k*Math.PI)*0.4; }, ease.lin);
  sfx.splash(); burst(TEX.puff, new V3(3.6, 0.1, 0), 12, 1.8, 0.5); o.rotation.z = 0;
  floatText(L('Пока-пока! 💗', 'Bye-bye! 💗'), new V3(4, 1.2, 0), '#D9527E');
  await tween(1.3, k => { o.position.x = 3.6 + k*7; }, ease.io);
  scene.remove(o);
  mgClose(); setBusy(false);
  if(shift.n === SHIFT_SIZE - 1 && !shift.event){ shift.event = true; await runEvent(); }
  if(shift.n >= SHIFT_SIZE) return showResults();
  return spawnPatient();
}

/* ---------- 3. Бухта: акула-подружка катает на спине ---------- */
const ST_RIDE = [[0, 0], [9, 3.2], [18, -1.5], [26, 2.5], [34, -2.8], [22, -3.2], [10, -1], [2, 0.5]];   // петля от места посадки (dx, dy)
function dvRideOk(){ return save.dive.shark.tooth === 2 && (!DV.pal || DV.auth); }
function dvRide(){
  const D = DV, S = D.sh;
  if(D.mode !== 'swim' || D.pause || dvGloomOn()) return;
  D.mode = 'ride'; D.goal = null; D.tgt = null; D.hold = false; if(D.grab) dvLetGo();
  // маршрут — внутри бухты: сдвигаем петлю, чтобы влезла
  const x0 = Math.max(6, Math.min(DV_LEN - 40, S.x - 4)), y0 = -5.5;
  S.path = ST_RIDE.map(([dx, dy]) => [x0 + dx, Math.max(-8.6, Math.min(-2, y0 + dy))]);
  S.path.unshift([D.pos.x - S.dir*0.2, D.pos.y - 0.7]);   // сначала подплывает под малыша
  S.pi = 0; S.rideT = 0; S.st = 'ride'; S.on = false; S.o.scale.setScalar(1.35);   // покатать — подрастает, чтобы малыш уместился на спине
  sfx.boing(); floatText(L('Садись! Покатаю! 🦈', 'Hop on! Let\'s ride! 🦈'), dvW(S.o.position).add(new V3(0, 1, 0)), '#D9527E');
  mgHint(L('Держись крепче! 🦈💨', 'Hold on tight! 🦈💨'));
}
// каждый кадр, пока катаемся (dvSharkStep в dive.js)
function dvRideStep(dt){
  const D = DV, S = D.sh;
  const [tx, ty] = S.path[S.pi], dx = tx - S.x, dy = ty - S.y, l = Math.hypot(dx, dy), v = S.on ? 6.5 : 5;
  if(l > 0.05){ const k = Math.min(l, v*dt)/l; S.x += dx*k; S.y += dy*k; }
  if(Math.abs(dx) > 0.3) S.dir = Math.sign(dx);
  if(l < 0.4){
    if(!S.on){ S.on = true; sfx.arf(); sfx.whoosh(); }
    if(++S.pi >= S.path.length) return dvRideEnd();
  }
  if(S.on){   // малыш сидит на спине
    const p = new V3(S.x - S.dir*0.15, S.y + 0.95, 0);
    D.vel.copy(p).sub(D.pos).divideScalar(Math.max(dt, 0.001)).clampLength(0, 12);
    D.pos.copy(p); D.face = S.dir;
    if(Math.random() < dt*3) emit(TEX.heart, dvW(S.o.position).add(new V3(-S.dir*0.9, 0.4, 0.3)), {v:new V3(-S.dir*0.8, 0.8, 0), life:1, size:0.2});
    if(Math.random() < dt*10) emit(TEX.dot, dvW(S.o.position).add(new V3(-S.dir*1.1, 0, 0.3)), {v:new V3(-S.dir*0.6, 1, 0), life:1.2, size:0.12, grow:0.3});
    if((S.rideT += dt) > 1.5 && S.pi === 3 && !S.said){ S.said = true; floatText(L('Йи-ха-а! 💨', 'Wheee! 💨'), dvW(D.pos).add(new V3(0, 1, 0)), '#D9527E'); sfx.giggle(); }
  }
  if(dvGloomOn()) dvRideEnd();
  dvSharkPose(dt);
}
function dvRideEnd(){
  const D = DV, S = D.sh, sv = save.dive.shark, today = dvToday();
  S.st = 'friend'; S.path = null; S.said = false; D.mode = 'swim'; S.o.scale.setScalar(1); D.vel.set(0, 1.5, 0);
  const at = dvW(S.o.position).add(new V3(0, 1, 0));
  burst(TEX.heart, at, 12, 1.8, 0.3); sfx.hug();
  if(sv.ride !== today){
    sv.ride = today; persist();
    addShells(ST_RIDE_SHELLS, toScreen(at));
    mgHint(L('Акула: «Ещё покатаемся? Нажми на меня!» 💗', 'Shark: “Another ride? Just tap me!” 💗'));
  } else mgHint('');
  setTimeout(() => { if(DV && mgHintEl.textContent.includes('💗')) mgHint(''); }, 2600);
}
