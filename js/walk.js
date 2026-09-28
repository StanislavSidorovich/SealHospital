/* ---------------- прогулка и трюки (Фаза 3, часть 3) ----------------
   Кнопка ⚽ «Поиграть» в уголке малыша открывает выбор: мяч (petPlay в pet.js), прогулка или трюки.
   Прогулка: малыш прыгает рогаткой (потяни назад и отпусти) по 7 льдинкам за своим домиком, раскладка своя на каждый день;
   на четырёх что-то есть — ракушка, рыбка из воды, горстка ракушек, а в конце снежная горка. Раз в день под ней новая
   находка в коллекцию. Куда приземлишься, видно только на первых двух льдинках, дальше пунктир наполовину; 5-я и 6-я
   качаются. Промах — «плюх!», плывём на остров и прыгаем сначала (собранные находки не пропадают).
   «В яблочко» и прогулка без «плюх» — ракушки.
   Трюки: «Дай ласту», «Прыжок», «Кувырок», «Мяч на носу» открываются по мере роста; каждое занятие +1 ⭐,
   три звезды — трюк выучен. Проиграть нельзя: малыш иногда путает трюк, это смешно, и пробуем ещё раз.
   Подключается после pet.js и до game.js. */
const TREASURES = [
  {id:'star',   ic:'⭐', name:L('Морская звёздочка', 'Starfish')},
  {id:'gem',    ic:'💎', name:L('Ледяной кристалл', 'Ice crystal')},
  {id:'marble', ic:'🔮', name:L('Стеклянный шарик', 'Glass marble')},
  {id:'anchor', ic:'⚓', name:L('Якорёк', 'Little anchor')},
  {id:'bow',    ic:'🎀', name:L('Розовый бантик', 'Pink bow')},
  {id:'bell',   ic:'🔔', name:L('Колокольчик', 'Little bell')},
  {id:'key',    ic:'🗝️', name:L('Старинный ключик', 'Old key')},
  {id:'bear',   ic:'🧸', name:L('Мишка-потеряшка', 'Lost teddy')}
];
// stage — с какой стадии роста малыш может выучить трюк
const TRICKS = [
  {id:'paw',  ic:'🤝', name:L('Дай ласту', 'Shake flipper'),  stage:0, how:L('Нажми на ласту малыша', 'Tap the pup\'s flipper')},
  {id:'jump', ic:'⬆️', name:L('Прыжок', 'Jump'),              stage:1, how:L('Проведи пальцем вверх', 'Swipe up')},
  {id:'roll', ic:'🔄', name:L('Кувырок', 'Roll'),             stage:2, how:L('Нарисуй круг вокруг малыша', 'Draw a circle around the pup')},
  {id:'ball', ic:'⚽', name:L('Мяч на носу', 'Ball on the nose'), stage:3, how:L('Нажимай, когда мяч опускается', 'Tap when the ball comes down')}
];
const TRICK_GIFT = 5;   // ракушек, когда трюк выучен (три звезды)
const foundAll = () => save.pet.finds.length >= TREASURES.length;
const walkGiftToday = () => { const w = save.pet.walk; return !foundAll() && (!w || w.d !== new Date().toDateString() || !w.n); };
function emojiTex(e){
  return canvasTex(128, g => {
    g.font = '96px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, 64, 70);
  });
}

/* ---------- льдинки для прогулки: цепочкой за домиком малыша, раскладка своя на каждый день ----------
   Прыгаем рогаткой: тянешь малыша назад, отпускаешь — летит по дуге. Льдинки 1, 3, 5 и 6 — с находками (крупнее),
   0, 2, 4 — «кочки» поменьше. Промахнулся — «плюх!», малыш сам выбирается обратно, пробуем ещё. */
const WALK_N = 7, WALK_EV = [1, 3, 5, 6];      // сколько льдинок и на каких сценки-находки
const WALK_PULL = 1.7, WALK_MAX = 5.6;          // рогатка: метров полёта на метр натяжки, дальше не летит
const WALK_SHOW = 2;                            // на скольких первых льдинках видно, куда приземлишься
const WALK_EYE = 0.38;                          // «в яблочко»: так близко к середине льдинки
const WALK_DRIFT = 0.8;                         // на сколько качается туда-сюда дальняя льдинка
const WALK_CLEAN = 3;                           // ракушек за прогулку без «плюх» (и +1 за каждое «в яблочко»; в первых двух за день)
const WALK_FLOES = Array.from({length:WALK_N}, (_, i) => {
  const g = new THREE.Group();
  const f = addOutline(new THREE.Mesh(floeGeo, floe.material), 1.03); f.position.y = -0.05; f.rotation.y = i*1.7; g.add(f);
  const fm = new THREE.Mesh(foam.geometry, foam.material); fm.rotation.x = -Math.PI/2; fm.position.y = 0.1; g.add(fm);
  g.userData = {ph:i*1.3, f, fm}; scene.add(g); return g;
});
const floeR = f => 3.3*f.userData.r;   // радиус льдинки в метрах
function walkLayout(){
  let h = 7; for(const c of new Date().toDateString()) h = (h*31 + c.charCodeAt(0)) | 0;
  const rnd = () => (h = (h*1103515245 + 12345) & 0x7fffffff)/0x7fffffff;
  let z = -2.3, side = rnd() < 0.5 ? -1 : 1;
  WALK_FLOES.forEach((g, i) => {
    const ev = WALK_EV.includes(i), r = ev ? 0.34 + rnd()*0.03 : 0.25 + rnd()*0.04;
    z -= (i ? 3.0 : 3.1) + rnd()*0.8 + (i >= 4 ? 0.3 : 0);
    const x = side*(0.3 + rnd()*1.0); side = -side;
    g.position.set(PET_POS.x + x, 0, PET_POS.z + z); g.userData.x0 = g.position.x; g.userData.r = r;
    g.userData.f.scale.set(r, 1, r); g.userData.fm.scale.setScalar(r);
  });
}
walkLayout();
const WALK_EDGE = PET_POS.clone().add(new V3(-0.1, 0.25, -2.4));   // край своей льдины, откуда прыгаем на первую
const floeTop = f => f.position.clone().setY(0.25);

// камера плавно переезжает на новую точку (focusCam сам по себе прыгает)
const WALK_UP = 0.95;   // на прогулке камера смотрит сверху: малыш не заслоняет следующую льдинку
function camGlide(center, size, dur = 0.8, lift = 0, up = WALK_UP){
  const on = camFocus.want > 0.5, c0 = on ? camFocus.center.clone() : center.clone(), s0 = on ? camFocus.size : size, u0 = on ? camFocus.up : up;
  focusCam(c0, s0, lift, u0);
  return tween(dur, k => focusCam(c0.clone().lerp(center, k), s0 + (size - s0)*k, lift, u0 + (up - u0)*k));
}
function turnTo(s, yaw, dur = 0.25){
  const r = s.root, y0 = r.rotation.y, d = Math.atan2(Math.sin(yaw - y0), Math.cos(yaw - y0));
  return tween(dur, k => r.rotation.y = y0 + d*k);
}
const faceTo = (s, p) => turnTo(s, Math.atan2(p.x - s.root.position.x, p.z - s.root.position.z));
async function hopTo(s, to, h = 1.0, dur = 0.7){
  const r = s.root, from = r.position.clone();
  await faceTo(s, to);
  s.flap = 0.8; sfx.whoosh(); await squash(s, 0.18, 0.2);
  await tween(dur, k => { r.position.lerpVectors(from, to, k); r.position.y += Math.sin(k*Math.PI)*h; }, ease.lin);
  r.position.copy(to); s.flap = 0; sfx.thud();
  burst(TEX.puff, to.clone().add(new V3(0, 0.1, 0)), 6, 1, 0.4);
  await squash(s, 0.22, 0.3);
}
async function waddleTo(s, to, dur = 1.1){
  const r = s.root, from = r.position.clone();
  await faceTo(s, to);
  await tween(dur, k => { r.position.lerpVectors(from, to, k); r.position.y = from.y + Math.abs(Math.sin(k*Math.PI*4))*0.12; s.wobble = Math.sin(k*Math.PI*8)*0.04; }, ease.lin);
  r.position.copy(to); s.wobble = 0;
}

/* ---------- ⚽ Поиграть: мяч, прогулка или трюки ---------- */
let funKind = 'ball', trickMsg = '', funPre = null;   // funPre — малыш сам попросил (облачко-желание в pet.js): без выбора
async function petFun(s){
  const p = save.pet, sc = petScale();
  focusCam(worldOf(s, new V3(0, -0.3, 0)), 2.6*petK(), 0.9);
  let k = funPre; funPre = null;
  if(!k) k = await funMenu(s);
  if(k !== 'no'){ s.happyUntil = now + 99; setMood(s, 'happy'); }   // играть с тобой — радость, даже если голоден
  if(k === 'tricks'){ const t = await pickTrick(s); if(!t){ s.happyUntil = 0; return false; } funKind = 'tricks'; return TRICK_GAMES[t.id](s, t); }
  if(k === 'run'){ const lv = await advMap(); if(!lv){ s.happyUntil = 0; return false; } funKind = 'run'; return petRun(s, lv); }   // js/adventure.js
  if(k === 'isle'){ funKind = 'isle'; return isleGo(s); }   // 🗺️ гуляем по острову сами (js/island.js)
  if(k === 'dive'){ funKind = 'dive'; return petDive(s); }   // подводная бухта (js/dive.js)
  if(k === 'chase'){ funKind = 'chase'; const r = await chaseGame(typeof pengMet === 'function' && pengMet() ? 'ping' : 'solo'); s.root.position.copy(PET_SPOT); s.happyUntil = r ? now + 3 : 0; return r ? undefined : false; }   // салки с акулой (js/chase.js), с Пингом, если знакомы
  if(k === 'slide'){ funKind = 'slide'; const r = await slideGame(); s.root.position.copy(PET_SPOT); s.happyUntil = r ? now + 3 : 0; return r ? undefined : false; }   // 🛷 ледяная горка (js/slide.js)
  if(k === 'no') return false;
  funKind = k;
  if(k === 'ping') return nbBall(s);   // мяч втроём с соседом Пингом (js/neighbors.js)
  if(k === 'coop') return coopFromPet(s);   // бой с Большой Тучей вдвоём (js/coop.js)
  return k === 'walk' ? petWalk(s) : petPlay(s);
}
async function funMenu(s){
  const p = save.pet;
  const newFind = walkGiftToday(), learned = TRICKS.filter(t => (p.tricks[t.id] || 0) >= 3).length;
  const open = TRICKS.filter(t => p.stage >= t.stage).length;
  mgOpen(L('Во что поиграем?', 'What shall we play?'));
  const panel = mgNode('div', 'mg-panel fun-pick', `
    <div class="picks">
      ${typeof isleGo === 'function' ? `<button data-k="isle" class="wide"><span class="ic">🗺️</span><b>${L('Гулять по острову', 'Explore the island')}</b><small>${L(`веди ${p.name} сам${pg('', 'а')} · 🌟 ${save.isl.got.length}/${ISL_STARS.length}`, `lead ${p.name} yourself · 🌟 ${save.isl.got.length}/${ISL_STARS.length}`)}</small></button>` : ''}
      <button data-k="ball"><span class="ic">⚽</span><b>${L('Мяч', 'Ball')}</b><small>${L('отбивать носом', 'bounce it on the nose')}</small></button>
      <button data-k="walk"><span class="ic">🐾</span><b>${L('Гулять', 'Walk')}</b><small>${newFind ? L('✨ Что-то блестит!', '✨ Something shines!') : L(`Находки ${p.finds.length} из ${TREASURES.length}`, `Finds ${p.finds.length} of ${TREASURES.length}`)}</small></button>
      <button data-k="tricks"><span class="ic">🎓</span><b>${L('Трюки', 'Tricks')}</b><small>${L(`выучено ${learned} из ${open}`, `learned ${learned} of ${open}`)}</small></button>
      <button data-k="run"><span class="ic">🏔️</span><b>${L('Приключение', 'Adventure')}</b><small>${L('забег по льдинам', 'ice floe dash')}</small></button>
      ${typeof slideGame === 'function' ? `<button data-k="slide" class="wide"><span class="ic">🛷</span><b>${L('Ледяная горка', 'Ice slide')}</b><small>${L(`гонка или на время · ${slTheme().ic} ${slTheme().name}`, `race or time trial · ${slTheme().ic} ${slTheme().name}`)}</small></button>` : ''}
      ${typeof petDive === 'function' ? `<button data-k="dive"${typeof chaseGame === 'function' ? '' : ' class="wide"'}><span class="ic">🤿</span><b>${L('Нырнуть', 'Dive')}</b><small>${L(`в гостях: ${dvDef(dvGuest()).name}`, `guest: ${dvDef(dvGuest()).name}`)}</small></button>` : ''}
      ${typeof chaseGame === 'function' ? `<button data-k="chase"><span class="ic">🦈</span><b>${L('Салки', 'Tag')}</b><small>${L(`с акулой · ${chTheme().ic} ${chTheme().name}`, `with the shark · ${chTheme().ic} ${chTheme().name}`)}</small></button>` : ''}
      ${typeof nbHere === 'function' && nbHere() ? `<button data-k="ping" class="wide"><span class="ic">🐧</span><b>${L('Мяч с Пингом', 'Ball with Ping')}</b><small>${L('втроём', 'all three')}</small></button>` : ''}
      ${typeof coopFromPet === 'function' ? `<button data-k="coop" class="wide"><span class="ic">☁️</span><b>${L('Вместе', 'Together')}</b><small>${L('с папой, другом или Пингом', 'with Dad, a friend or Ping')}</small></button>` : ''}
    </div>
    <div class="row"><button class="btn ghost small" data-k="dice">🎲 ${L('Любая', 'Surprise me')}</button><button class="btn ghost small" data-k="no">${L('Потом', 'Later')}</button></div>`);
  if(newFind) panel.querySelector('[data-k="walk"]').classList.add('new');
  if(typeof stMarkPicks === 'function') stMarkPicks(panel);   // 📖 — куда ведёт история (js/story.js)
  if(typeof stLockPicks === 'function') stLockPicks(panel);   // 🔒 — до этих игр история ещё не дошла
  const pb = panel.querySelector('[data-k="ping"]'); if(pb && nbQuest().id === 'ball' && !nbQuest().ok) pb.classList.add('new');   // Пинг сегодня просил
  let k = await new Promise(r => panel.querySelectorAll('button').forEach(b => mgOn(b, 'click', () => { sfx.tap(); r(b.dataset.k); })));
  if(k === 'dice') k = await funDice(panel);
  panel.classList.add('away'); await wait(0.25); mgClose();
  return k;
}
// 🎲 «Любая»: огонёк бежит по открытым плиткам и останавливается на случайной игре
async function funDice(panel){
  const bs = [...panel.querySelectorAll('.picks [data-k]:not(.st-lock)')].filter(b => b.dataset.k !== 'coop');
  panel.querySelectorAll('button').forEach(b => b.disabled = true);
  const pick = Math.floor(Math.random()*bs.length), steps = bs.length*2 + pick;
  for(let i = 0; i <= steps; i++){
    const b = bs[i % bs.length]; b.classList.add('dice'); sfx.tick();
    await wait(0.06 + 0.16*(i/steps)**2);
    if(i < steps) b.classList.remove('dice');
  }
  sfx.star(); await wait(0.6);
  return bs[pick].dataset.k;
}
// что меняется после игры: гуляли — проголодался и испачкался сильнее
const FUN_COST = {ball:{food:0.12, bath:0.25}, ping:{food:0.15, bath:0.25}, walk:{food:0.25, bath:0.35, sleep:0.15}, tricks:{food:0.08, sleep:0.1}, run:{food:0.2, bath:0.3, sleep:0.2}, dive:{food:0.25, bath:0.15, sleep:0.2}, isle:{food:0.2, bath:0.3, sleep:0.15}, chase:{food:0.25, bath:0.15, sleep:0.2}, slide:{food:0.2, bath:0.3, sleep:0.2}};
const FUN_SAY = {
  ball: () => L(`${gg('Наигрался', 'Наигралась')}! И немножко ${gg('испачкался', 'испачкалась')} 🛁`, 'All played out! And a little bit dirty 🛁'),
  ping: () => L(`Вот это игра! ${save.pet.name} и Пинг — лучшие друзья 🐧`, `What a game! ${save.pet.name} and Ping are best friends 🐧`),
  walk: () => L(`${gg('Нагулялся', 'Нагулялась')}! Лапки в снегу — пора купаться 🛁`, 'What a walk! Paws full of snow — bath time 🛁'),
  dive: () => diveSay,
  isle: () => isleSay,   // 🗺️ прогулка по острову (js/island.js)
  chase: () => L('Вот это салки! Акула застряла, а мы уплыли 🦈💨', 'What a game of tag! The shark got stuck and we got away 🦈💨'),
  slide: () => L('Вжух! Вот это горка! Лапки в снегу — пора купаться 🛁', 'Whoosh! What a slide! Snowy flippers — bath time 🛁'),
  run: () => runSay || L(`${gg('Набегался', 'Набегалась')}! Лапки в снегу — пора купаться 🛁`, 'What a run! Snowy flippers — bath time 🛁'),
  tricks: () => trickMsg || L(`Умница! ${save.pet.name} любит учиться с тобой ♡`, `Well done! ${save.pet.name} loves learning with you ♡`)
};

/* ---------- прогулка ---------- */
async function petWalk(s){
  const p = save.pet, today = new Date().toDateString(), gift = walkGiftToday();
  if(!p.walk || p.walk.d !== today) p.walk = {d:today, n:0};
  p.walk.n++; persist();
  const sc = petScale(), k = petK();
  const kinds = ['shell', 'fish', 'shells'].sort(() => Math.random() - 0.5).concat('dig');
  const res = {shells:0, fish:0, find:null, jumps:0, eye:0, plop:0};
  const bonus = p.walk.n <= 2;   // ракушки за меткость — в первых двух прогулках за день
  let tut = !(typeof tipSeen === 'function' && tipSeen('sling'));
  walkLayout();

  mgOpen(L('Идём гулять! 🐾', 'Let us go for a walk! 🐾'));
  const ring = mgNode('div', 'target'); ring.hidden = true;
  let ringAt = null, onTap = null, onMove = null, onUp = null;
  mgOn(mgRoot, 'pointerdown', e => onTap && onTap(e));
  mgOn(mgRoot, 'pointermove', e => onMove && onMove(e));
  for(const ev of ['pointerup', 'pointercancel']) mgOn(mgRoot, ev, e => onUp && onUp(e));
  const ticks = new Set();
  mgTick(dt => {
    if(ringAt){ const q = toScreen(typeof ringAt === 'function' ? ringAt() : ringAt); ring.hidden = false; ring.style.left = q.x + 'px'; ring.style.top = q.y + 'px'; } else ring.hidden = true;
    ticks.forEach(f => f(dt));
  });
  // ждём касания рядом с точкой (радиус в пикселях); мимо — мягкая подсказка
  const tapAt = (pt, r, miss) => new Promise(res => { onTap = e => {
    const q = toScreen(typeof pt === 'function' ? pt() : pt);
    if(Math.hypot(q.x - e.clientX, q.y - e.clientY) < r){ onTap = null; res(e); } else if(miss) mgHint(miss);
  }; });
  const frame = (a, b) => camGlide(a.clone().lerp(b, 0.5).setY(0.55 + 0.5*sc), 3.2 + a.distanceTo(b)*0.8, 0.9);

  // 🎯 рогатка: пунктир полёта и кружок, куда приземлимся (зелёные — попадём на льдинку)
  const arc = new THREE.Group(), dotM = new THREE.MeshBasicMaterial({color:0x3B3A4A}), dots = [];
  for(let j = 0; j < 12; j++){ const d = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), dotM); arc.add(d); dots.push(d); }
  const mark = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.4, 28), new THREE.MeshBasicMaterial({color:0xD9527E, side:THREE.DoubleSide, transparent:true, opacity:0.9}));
  mark.rotation.x = -Math.PI/2; arc.add(mark); arc.visible = false; scene.add(arc);
  mgCleanup.push(() => scene.remove(arc));
  const hand = mgNode('div', 'sling-hand', '👆'); hand.hidden = true;
  const gRay = new THREE.Raycaster(), gNdc = new THREE.Vector2(), gPl = new THREE.Plane(new V3(0, 1, 0), -0.25);
  const ground = e => { gNdc.set(e.clientX/innerWidth*2 - 1, -(e.clientY/innerHeight)*2 + 1); gRay.setFromCamera(gNdc, camera); return gRay.ray.intersectPlane(gPl, new V3()); };
  // ждём натяжки и отпускания; full — пунктир до конца и кружок, drift — льдинка качается туда-сюда
  const aim = (f, full, drift, showHand, from) => new Promise(done => {
    let g0 = null, L0 = null, dist = 0, t = 0;
    const draw = () => {
      const h = 0.5 + dist*0.22, ok = Math.hypot(L0.x - f.position.x, L0.z - f.position.z) < floeR(f)*0.92;
      dotM.color.set(full && ok ? 0x2F9E72 : 0x3B3A4A); mark.material.color.set(ok ? 0x2F9E72 : 0xD9527E);
      dots.forEach((d, j) => { const q = (j + 1)/13; d.visible = full || q < 0.5; d.position.lerpVectors(from, L0, q); d.position.y += Math.sin(q*Math.PI)*h; });
      mark.visible = full; mark.position.set(L0.x, ok ? 0.3 : 0.12, L0.z);
    };
    const tick = dt => {
      t += dt;
      if(drift) f.position.x = f.userData.x0 + Math.sin(t*1.1)*WALK_DRIFT;
      hand.hidden = !showHand || !!g0;
      if(!hand.hidden){ const q = toScreen(from); hand.style.left = q.x + 'px'; hand.style.top = q.y + 'px'; }
      if(L0) draw();
    };
    ticks.add(tick);
    onTap = e => { g0 = ground(e); L0 = null; };
    onMove = e => {
      if(!g0) return; const g = ground(e); if(!g) return;
      const pull = g0.clone().sub(g).setY(0);
      dist = Math.min(WALK_MAX, pull.length()*WALK_PULL);
      if(dist < 0.5){ L0 = null; arc.visible = false; s.inner.scale.set(1, 1, 1); return; }
      L0 = from.clone().add(pull.normalize().multiplyScalar(dist));
      s.root.rotation.y = Math.atan2(L0.x - from.x, L0.z - from.z);
      const q = dist/WALK_MAX; s.inner.scale.set(1 + q*0.22, 1 - q*0.2, 1 + q*0.22);   // малыш сжимается, как пружинка
      arc.visible = true; draw();
    };
    onUp = () => {
      if(!g0) return; g0 = null; arc.visible = false; s.inner.scale.set(1, 1, 1);
      if(!L0 || dist < 1.2){ L0 = null; mgHint(L('Потяни подальше назад — и отпусти', 'Pull further back — and let go')); return; }
      ticks.delete(tick); hand.hidden = true; onTap = onMove = onUp = null;
      done({L:L0, dist});
    };
  });

  // к краю своей льдины — и первый прыжок
  const first = floeTop(WALK_FLOES[0]);
  frame(s.root.position, first);
  sfx.arf(); floatText(L('Гулять!', 'Walk!'), headTop(s));
  await waddleTo(s, WALK_EDGE);
  let at = WALK_EDGE.clone(), atFloe = null;   // atFloe — на какой льдинке стоим (null — своя, у домика)
  const evDone = new Set();                     // находки, которые уже собрали (после «плюх» не повторяются)
  for(let i = 0; i < WALK_N; i++){
    const f = WALK_FLOES[i];
    let fell = false;
    for(;;){
      const to = floeTop(f);
      frame(at, to);
      await faceTo(s, to);
      ringAt = () => floeTop(f).add(new V3(0, 0.1, 0));
      mgHint(i === 0 && tut ? L('Потяни малыша назад, как рогатку, и отпусти! 🎯', 'Pull the pup back like a slingshot and let go! 🎯')
        : i >= WALK_SHOW ? L('Прикинь на глаз, куда долетишь 🎯', 'Guess by eye how far you will fly 🎯')
        : L('Тяни назад и отпускай — на льдинку с кружком', 'Pull back and let go — to the floe with the ring'));
      const shot = await aim(f, i < WALK_SHOW, i >= 4, i === 0 && tut, at);
      ringAt = null; sfx.tap();
      const L0 = shot.L;
      const onFloe = g => Math.hypot(L0.x - g.position.x, L0.z - g.position.z) < floeR(g)*0.92;
      if(onFloe(f)){   // долетели!
        await slingHop(s, at, L0, shot.dist);
        res.jumps++;
        const off = Math.hypot(L0.x - f.position.x, L0.z - f.position.z);
        if(off < WALK_EYE){
          res.eye++; sfx.ding(); burst(TEX.star, L0.clone().add(new V3(0, 0.3, 0)), 8, 1.4, 0.22);
          floatText(L('В яблочко! 🎯', 'Bullseye! 🎯'), headTop(s), '#2F9E72');
          if(bonus){ addShells(1, toScreen(L0)); res.shells++; }
        } else floatText(L(['Оп!', 'Хоп!', 'Есть!'], ['Hop!', 'Boing!', 'Got it!'])[i % 3], headTop(s));
        if(tut){ tut = false; if(typeof tipDone === 'function') tipDone('sling'); }
        if(off > 0.25) await waddleTo(s, floeTop(f), 0.45);
        break;
      }
      if(atFloe ? onFloe(atFloe) : Math.hypot(L0.x - PET_POS.x, L0.z - PET_POS.z) < 2.8){   // слабовато: прыгнул по своей льдине
        await slingHop(s, at, L0, shot.dist); at = L0;
        floatText(L('Слабовато! Тяни сильнее', 'Too weak! Pull harder'), headTop(s));
        continue;
      }
      if(WALK_FLOES.some(g => g !== f && onFloe(g))){   // не на ту льдинку — прыгнули и вернулись
        await slingHop(s, at, L0, shot.dist);
        floatText(L('Ой, не туда! 🙃', 'Oops, wrong way! 🙃'), headTop(s));
        await wait(0.3); await slingHop(s, L0, at, L0.distanceTo(at));
        continue;
      }
      // плюх! — плывём на остров и начинаем сначала (собранное не пропадает)
      res.plop++; fell = true;
      await plop(s, at, L0, shot.dist);
      mgHint(L('Плывём на остров — и снова вперёд! 💪', 'Swimming back to the island — and off we go again! 💪'));
      at = WALK_EDGE.clone(); atFloe = null;
      break;
    }
    if(fell){ i = -1; continue; }
    at = floeTop(f); atFloe = f;
    if(evDone.has(i)) continue;
    evDone.add(i);
    const ev = WALK_EV.indexOf(i);
    if(ev < 0) continue;
    camGlide(at.clone().add(new V3(0, 0.45 + 0.4*sc, 0.4)), 3.3*(0.6 + 0.4*k), 0.7, 0, 0.45);   // находку смотрим почти спереди
    await turnTo(s, 0, 0.3);
    await WALK_EVENTS[kinds[ev]]({s, at, res, gift, tapAt, setRing:v => ringAt = v, hint:mgHint, ticks,
      handlers:(t, m, u) => { onTap = t; onMove = m; onUp = u; }});
    ringAt = null; onTap = onMove = onUp = null; ticks.clear();
  }

  // итоги прогулки: что нашли и полка находок
  await wait(0.4);
  if(typeof bgWalkBoxDue === 'function' && bgWalkBoxDue()){   // 🎲 волна выносит коробку с игрой (js/boardgames.js)
    const box = new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTex('🎁'), transparent:true, depthWrite:false}));
    const from = at.clone().add(new V3(2.2, -0.4, 0.6)), to = at.clone().add(new V3(0.7, 0.35, 0.35));
    box.position.copy(from); box.scale.setScalar(0.7); scene.add(box);
    mgHint(L('Смотри, волна что-то несёт! 🌊', 'Look, a wave is bringing something! 🌊')); sfx.whoosh();
    await tween(1.1, q => { box.position.lerpVectors(from, to, q); box.position.y += Math.sin(q*Math.PI)*0.5; box.material.rotation = Math.sin(q*9)*0.2; }, ease.out);
    sfx.plop(); burst(TEX.star, to, 10, 1.6, 0.26);
    await faceTo(s, to); await hop(s, 0.3, 0.4);
    res.box = bgWalkBox();
    if(res.box){ floatText(res.box.name() + '!', to.clone().add(new V3(0, 0.6, 0)), '#D9527E'); sfx.star(); }
    await wait(1.0);
    scene.remove(box); box.material.map.dispose(); box.material.dispose();
  }
  if(!res.plop && bonus){ addShells(WALK_CLEAN, toScreen(at)); res.shells += WALK_CLEAN; }   // вся прогулка без «плюх»
  const cells = TREASURES.map(t => p.finds.includes(t.id) ? `<i class="${res.find === t ? 'new' : ''}" title="${t.name}">${t.ic}</i>` : '<i class="no">?</i>').join('');
  const got = [res.shells ? `+${res.shells} 🐚` : '', res.fish ? L(`${gg('съел', 'съела')} рыбку 🐟`, 'ate a fish 🐟') : ''].filter(Boolean).join(' · ');
  mgHint('');
  const end = mgNode('div', 'mg-panel walk-end', `
    <p class="ttl display">${L('Хорошо погуляли!', 'Great walk!')}</p>
    ${got ? `<p class="got">${got}</p>` : ''}
    <p class="got">${res.plop ? `🎯 ${res.jumps} ${plural(res.jumps, 'прыжок', 'прыжка', 'прыжков', 'jump', 'jumps')} · 💦 ${L('плюх', 'splashes')}: ${res.plop}` : L(`🎯 Ни разу не ${gg('плюхнулся', 'плюхнулась')}!`, '🎯 Not a single splash!')}${res.eye ? L(`<br>в яблочко: ${res.eye}`, `<br>bullseyes: ${res.eye}`) : ''}</p>
    ${res.find ? `<p class="got">${L('Новая находка:', 'New find:')} ${res.find.ic} ${res.find.name}!</p>` : ''}
    ${res.box ? `<p class="got">🎁 ${L('Коробка с игрой:', 'A game box:')} ${res.box.ic} ${res.box.name()}! ${L('Она в иглу 🎲', 'It is in the igloo 🎲')}</p>` : ''}
    <div class="finds">${cells}</div>
    <p class="tip">${foundAll() ? L('Все находки собраны! Ты настоящий следопыт ♡', 'All finds collected! You are a real explorer ♡') : res.find ? L('Под снегом ещё много всего. Новая находка — завтра ✨', 'There is still lots under the snow. A new find tomorrow ✨') : L(`Сегодняшнюю находку ты уже ${pg('нашёл', 'нашла')}. Новая спрячется под снегом завтра ✨`, 'You already found today\'s treasure. A new one will hide under the snow tomorrow ✨')}</p>
    <button class="btn" id="walkHome">${L('Домой ♡', 'Home ♡')}</button>`);
  await new Promise(r => mgOn(end.querySelector('#walkHome'), 'click', r));
  sfx.tap(); end.classList.add('away'); await wait(0.3);
  mgHint(L('Плывём домой…', 'Swimming home…'));
  await swimHome(s, at);
  mgClose(); walkLayout();
  s.happyUntil = now + 2;
}
// прыжок-рогатка по дуге: чем дальше, тем выше и дольше
async function slingHop(s, from, to, dist){
  const r = s.root, h = 0.5 + dist*0.22;
  s.root.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
  s.flap = 0.8; sfx.whoosh();
  await tween(0.45 + dist*0.07, k => { r.position.lerpVectors(from, to, k); r.position.y += Math.sin(k*Math.PI)*h; }, ease.lin);
  r.position.copy(to); s.flap = 0; sfx.thud();
  burst(TEX.puff, to.clone().add(new V3(0, 0.1, 0)), 6, 1, 0.4);
  await squash(s, 0.22, 0.3);
}
// недолёт или перелёт: «плюх!» в воду — и вплавь обратно на свою льдину у домика
async function plop(s, from, to, dist){
  const r = s.root, sc = petScale(), h = 0.5 + dist*0.22, water = to.clone().setY(-0.55);
  s.root.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
  s.flap = 0.8; sfx.whoosh();
  await tween(0.45 + dist*0.07, k => { r.position.lerpVectors(from, water, k); r.position.y = from.y + (water.y - from.y)*k + Math.sin(k*Math.PI)*h; }, ease.lin);
  s.flap = 0; sfx.splash(); burst(TEX.puff, water.clone().setY(0.1), 12, 1.8, 0.45);
  s.swimming = true;
  floatText(L(['Плюх!', 'Буль!', 'Брр!'], ['Splash!', 'Blub!', 'Brr!'])[Math.floor(Math.random()*3)], water.clone().setY(1.2), '#3B8FC4');
  await wait(0.5);
  const shore = WALK_EDGE.clone().add(new V3(0.9, 0, -0.9)).setY(-0.55);
  const follow = () => focusCam(r.position.clone().setY(0.6 + 0.5*sc), 4.2, 0.2, WALK_UP);
  await faceTo(s, shore);
  await tween(Math.max(1.2, water.distanceTo(shore)*0.12), k => { r.position.lerpVectors(water, shore, k); r.position.y = -0.55; follow(); }, ease.io);
  sfx.splash(); s.swimming = false; s.inner.position.y = 0;
  await tween(0.55, k => { r.position.lerpVectors(shore, WALK_EDGE, k); r.position.y += Math.sin(k*Math.PI)*0.9; follow(); }, ease.lin);
  r.position.copy(WALK_EDGE); sfx.thud(); await squash(s);
  await shakeOff(s);
}
function shakeOff(s){   // отряхнулся от воды
  sfx.drip();
  for(let i = 0; i < 10; i++){ const a = i/10*Math.PI*2; emit(TEX.drop, headTop(s), {v:new V3(Math.cos(a)*1.4, 1 + Math.random(), Math.sin(a)*0.7), g:4, life:0.8, size:0.16}); }
  return tween(0.6, k => { s.shake = Math.sin(k*Math.PI*8)*0.4*(1 - k); }, ease.lin).then(() => s.shake = 0);
}
// с последней льдинки — в воду, вплавь вдоль льдинок и наверх, на свой домик-льдину
async function swimHome(s, from){
  const r = s.root, sc = petScale();
  const water = from.clone().add(new V3(1.6, -0.55, 0)), shore = PET_POS.clone().add(new V3(1.2, -0.55, -3.6));
  await faceTo(s, water);
  s.flap = 0.6; sfx.whoosh();
  await tween(0.6, k => { r.position.lerpVectors(from, water, k); r.position.y += Math.sin(k*Math.PI)*0.9; }, ease.lin);
  sfx.splash(); burst(TEX.puff, water.clone().setY(0.1), 10, 1.6, 0.45);
  s.swimming = true; s.flap = 0;
  await faceTo(s, shore);
  const follow = () => focusCam(r.position.clone().setY(0.6 + 0.5*sc), 4.2, 0.2, WALK_UP);
  await tween(Math.max(2.2, water.distanceTo(shore)*0.13), k => { r.position.lerpVectors(water, shore, k); r.position.y = -0.55; follow(); }, ease.io);
  sfx.splash(); burst(TEX.puff, shore.clone().setY(0.1), 10, 1.6, 0.45);
  s.swimming = false; s.inner.position.y = 0;
  const up = WALK_EDGE.clone();
  await tween(0.7, k => { r.position.lerpVectors(shore, up, k); r.position.y += Math.sin(k*Math.PI)*1.1; follow(); }, ease.lin);
  r.position.copy(up); sfx.thud(); await squash(s);
  unfocusCam();
  await shakeOff(s);   // и бегом на своё место
  await waddleTo(s, PET_SPOT, 1.0);
  await turnTo(s, 0, 0.35);
}

/* находки на льдинках: каждая — маленькая сценка, малыш «находит», Сабрина забирает */
const WALK_EVENTS = {
  // ракушка торчит из снега: малыш её учуял
  async shell({s, at, res, tapAt, setRing, hint}){
    const sh = makeShell(0xFFC2D1, true), pos = at.clone().add(new V3(0.55, 0.06, 0.45));
    sh.position.copy(pos); sh.rotation.set(0.5, 0.8, 0.2); scene.add(sh);
    sniff(s, pos, L('Ой, что это?', 'Oh, what is that?'));
    setRing(pos.clone().add(new V3(0, 0.1, 0))); hint(L('Малыш что-то учуял! Нажми на ракушку', 'The pup smells something! Tap the shell'));
    await tapAt(pos, 90, L('Ракушка — в кружке, нажми на неё', 'The shell is in the ring, tap it'));
    setRing(null); scene.remove(sh);
    burst(TEX.star, pos, 8, 1.4, 0.24); sfx.coin(); addShells(2, toScreen(pos)); res.shells += 2;
    s.happyUntil = now + 2; await hop(s, 0.3, 0.4);
  },
  // горстка ракушек: собрать три
  async shells({s, at, res, hint, handlers}){
    const cols = [0xFFD2A8, 0xD9C8FF, 0xBDE8D6], list = [];
    [[-0.85, 0.3], [0.85, 0.4], [0.1, 0.95]].forEach(([x, z], i) => {
      const sh = makeShell(cols[i], false); sh.position.copy(at).add(new V3(x, 0.07, z)); sh.rotation.y = Math.random()*6;
      sh.scale.setScalar(0.01); scene.add(sh); list.push(sh);
      wait(i*0.15).then(() => { sfx.pop(); return tween(0.3, q => sh.scale.setScalar(Math.max(0.01, 1.35*q)), ease.back); });
    });
    floatText(L('Ракушки!', 'Shells!'), headTop(s)); sfx.arf();
    hint(L('Тут ракушки! Собери все три', 'Shells here! Collect all three'));
    let left = 3;
    await new Promise(done => handlers(e => {
      let best = null, bd = 80;
      for(const sh of list){ if(!sh.parent) continue; const q = toScreen(sh.position), d = Math.hypot(q.x - e.clientX, q.y - e.clientY); if(d < bd){ bd = d; best = sh; } }
      if(!best) return;
      scene.remove(best); burst(TEX.star, best.position, 5, 1.2, 0.22); sfx.coin();
      addShells(1, toScreen(best.position)); res.shells++;
      if(!--left) done(); else hint(L(`Ещё ${left === 1 ? 'одна' : left}!`, `${left === 1 ? 'One' : left} more!`));
    }));
    s.happyUntil = now + 2; floatText(L('Все!', 'All!'), headTop(s)); await hop(s, 0.3, 0.4);
  },
  // рыбка выпрыгивает из воды рядом с льдинкой — поймай её, малыш съест
  async fish({s, at, res, hint, handlers, ticks}){
    const fish = makeFish(), sc = petScale(), side = Math.random() < 0.5 ? -1 : 1;
    const a = at.clone().add(new V3(1.25*side, -0.3, 0.9)), b = at.clone().add(new V3(0.3*side, -0.3, 1.55));   // дуга не выходит за край телефона
    fish.visible = false; scene.add(fish);
    let t = -0.6, caught = false, jumps = 0;
    const T = 1.3;   // сколько рыбка в воздухе
    hint(L('Смотри! Рыбка! Нажми на неё, когда выпрыгнет', 'Look! A fish! Tap it when it jumps out'));
    sniff(s, a, L('Рыбка!', 'A fish!'));
    ticks.add(dt => {
      if(caught) return;
      t += dt;
      if(t < 0){ fish.visible = false; return; }
      if(t > T){ t = -1.0; fish.visible = false; sfx.plop(); burst(TEX.puff, b.clone().setY(0.1), 4, 0.6, 0.3); if(++jumps >= 2) hint(L('Жми прямо на рыбку, пока она в воздухе', 'Tap right on the fish while it is in the air')); return; }
      if(!fish.visible){ fish.visible = true; sfx.splash(); burst(TEX.puff, a.clone().setY(0.1), 4, 0.6, 0.3); }
      const k = t/T; fish.position.lerpVectors(a, b, k); fish.position.y += Math.sin(k*Math.PI)*1.9;
      fish.rotation.set(0, side > 0 ? Math.PI : 0, (0.5 - k)*2.2*side);
    });
    await new Promise(done => handlers(e => {
      if(!fish.visible) return;
      const q = toScreen(fish.position);
      if(Math.hypot(q.x - e.clientX, q.y - e.clientY) < 90){ caught = true; done(); }
    }));
    sfx.ding(); floatText(L('Поймала!', 'Caught it!'), fish.position.clone().add(new V3(0, 0.5, 0)), '#2F9E72');
    s.mouthO.visible = true; s.smile.visible = false;
    await flyTo(fish, fish.position.clone(), worldOf(s, s.mouthLocal), 0.6, 0.6);
    scene.remove(fish); s.mouthO.visible = false; s.smile.visible = true;
    for(let i = 0; i < 2; i++){ sfx.chomp(); await tween(0.16, q => s.head.scale.set(1, 1 - Math.sin(q*Math.PI)*0.1, 1), ease.lin); }
    s.head.scale.set(1, 1, 1);
    save.pet.needs.food = Math.min(1, save.pet.needs.food + 0.2); res.fish++;
    floatText(L('Ням!', 'Nom!'), headTop(s)); s.happyUntil = now + 2;
  },
  // снежная горка: потри пальцем, малыш помогает копать; раз в день — новая находка
  async dig({s, at, res, gift, hint, handlers, setRing}){
    const pos = at.clone().add(new V3(0.6, 0, 0.55));
    const mound = addOutline(new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 10, 0, Math.PI*2, 0, Math.PI/2), toon(0xFFFFFF)), 1.06);
    mound.position.copy(pos); mound.scale.set(1, 0.8, 1); scene.add(mound);
    const t = gift ? TREASURES.filter(x => !save.pet.finds.includes(x.id))[Math.floor(Math.random()*(TREASURES.length - save.pet.finds.length))] : null;
    sniff(s, pos, gift ? L('Тут что-то блестит!', 'Something shines here!') : L('Копаем?', 'Shall we dig?'));
    const center = pos.clone().add(new V3(0, 0.2, 0));
    setRing(center); hint(L('Потри снег пальцем — копаем!', 'Rub the snow with your finger — dig!'));
    let dug = 0, down = false, lx = 0, ly = 0, rubT = 0;
    const spark = setInterval(() => { if(gift && dug < 1) emit(TEX.star, center.clone().add(new V3((Math.random() - 0.5)*0.5, 0.25, 0.2)), {v:new V3(0, 0.4, 0), life:0.5, size:0.14, spin:4}); }, 700);
    await new Promise(done => handlers(
      e => { down = true; lx = e.clientX; ly = e.clientY; },
      e => {
        if(!down) return;
        const d = Math.hypot(e.clientX - lx, e.clientY - ly); lx = e.clientX; ly = e.clientY;
        const q = toScreen(center);
        if(!d || Math.hypot(e.clientX - q.x, e.clientY - q.y) > 110) return;
        dug = Math.min(1, dug + d/900);
        mound.scale.set(1 - dug*0.6, Math.max(0.05, 0.8*(1 - dug)), 1 - dug*0.6);
        if(now - rubT > 0.12){ rubT = now; sfx.rub(); emit(TEX.puff, center.clone(), {v:new V3((Math.random() - 0.5)*1.5, 1.2, 0.5), g:3, life:0.6, size:0.25}); s.nod = -0.2; setTimeout(() => s.nod = 0, 120); }
        if(dug >= 1) done();
      },
      () => { down = false; }));
    clearInterval(spark); setRing(null);
    scene.remove(mound); sfx.pop(); burst(TEX.puff, center, 8, 1.2, 0.4);
    if(t){   // находка поднимается из снега и крутится
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTex(t.ic), transparent:true, depthWrite:false}));
      sp.position.copy(center); sp.scale.setScalar(0.1); scene.add(sp);
      sfx.star(); burst(TEX.star, center, 12, 1.8, 0.26);
      await tween(0.8, q => { sp.position.y = center.y + q*1.0; sp.scale.setScalar(0.1 + q*0.8); sp.material.rotation = Math.sin(q*Math.PI*2)*0.3; }, ease.out);
      floatText(t.name + '!', sp.position.clone().add(new V3(0, 0.7, 0)), '#D9527E');
      save.pet.finds.push(t.id); res.find = t; persist();
      s.happyUntil = now + 3; sfx.hug(); s.flap = 1; await hop(s, 0.45, 0.5); s.flap = 0;
      await wait(0.6);
      await tween(0.4, q => { sp.scale.setScalar(0.9*(1 - q) + 0.01); sp.position.y += 0.02; });
      scene.remove(sp); sp.material.map.dispose(); sp.material.dispose();
    } else {   // находку сегодня уже нашли — под снегом ракушки
      const n = 3; floatText(L('Ракушки!', 'Shells!'), center.clone().add(new V3(0, 0.6, 0)), '#C9962E');
      sfx.coin(); addShells(n, toScreen(center)); res.shells += n;
      s.happyUntil = now + 2; await hop(s, 0.3, 0.4);
    }
  }
};
// малыш тянется носом к находке и говорит
function sniff(s, pos, say){
  sfx.arf(); floatText(say, headTop(s));
  const d = pos.clone().sub(s.root.position);
  tween(0.5, k => { s.shake = Math.atan2(d.x, d.z)*0.35*Math.sin(k*Math.PI); s.nod = 0.2*Math.sin(k*Math.PI); }).then(() => { s.shake = 0; s.nod = 0; });
}

/* ---------- 🎓 трюки ---------- */
async function pickTrick(s){
  const p = save.pet;
  mgOpen(L('Какой трюк учим?', 'Which trick shall we learn?'));
  const rows = TRICKS.map(t => {
    const lvl = p.tricks[t.id] || 0, open = p.stage >= t.stage;
    const stars = '★'.repeat(lvl) + '☆'.repeat(3 - lvl);
    return `<button class="trick${open ? '' : ' locked'}${lvl >= 3 ? ' done' : ''}" data-id="${t.id}">
      <span class="ic">${open ? t.ic : '🔒'}</span>
      <span class="t"><b>${t.name}</b><small>${open ? (lvl >= 3 ? L('Выучен! Можно показывать', 'Learned! Time to show off') : t.how) : L(`когда подрастёт: ${stageName(t.stage).toLowerCase()}`, `unlocks at: ${stageName(t.stage).toLowerCase()}`)}</small></span>
      <span class="st">${open ? stars : ''}</span></button>`;
  }).join('');
  const panel = mgNode('div', 'mg-panel trick-pick', `<div class="tricks">${rows}</div><button class="btn ghost small" data-id="">${L('Назад', 'Back')}</button>`);
  const t = await new Promise(r => panel.querySelectorAll('button').forEach(b => mgOn(b, 'click', () => {
    const t = TRICKS.find(x => x.id === b.dataset.id);
    if(t && p.stage < t.stage){ sfx.bad(); wiggle(b); mgHint(L(`Этот трюк — когда ${p.name} подрастёт`, `This trick unlocks when ${p.name} grows up`)); return; }
    sfx.tap(); r(t || null);
  })));
  panel.classList.add('away'); await wait(0.25); mgClose();
  return t;
}
// занятие = 3 повтора: aim(i) ждёт жест Сабрины, act(i) — малыш показывает трюк. На первых звёздах он иногда путает трюк.
async function trickSession(s, t, reps, aim, act){
  const p = save.pet, lvl = p.tricks[t.id] || 0, oopsAt = lvl === 0 ? 0 : 1;
  let oops = lvl === 0 || (lvl === 1 && Math.random() < 0.5);
  mgOpen(`${t.ic} ${t.how}`);
  for(let i = 0; i < reps; i++){
    await aim(i);
    if(oops && i === oopsAt){ oops = false; await trickOops(s); i--; mgHint(L(`${save.pet.name} ещё учится. Ещё разок!`, `${save.pet.name} is still learning. One more time!`)); continue; }
    await act(i);
    sfx.good(); burst(TEX.star, headTop(s), 6, 1.4, 0.24);
    floatText(L(['Молодец!', 'Ура!', 'Здорово!'], ['Good job!', 'Hooray!', 'Great!'])[i % 3], headTop(s), '#2F9E72');
    if(i < reps - 1) mgHint(L(`Отлично! Ещё ${reps - 1 - i === 1 ? 'разок' : reps - 1 - i + ' раза'}`, `Great! ${reps - 1 - i === 1 ? 'One more time' : (reps - 1 - i) + ' more times'}`));
    await wait(0.5);
  }
  mgClose();
  trickStar(s, t);
}
// после занятия +1 звезда; три звезды — трюк выучен, подарок
function trickStar(s, t){
  const p = save.pet, lvl = p.tricks[t.id] || 0, nl = Math.min(3, lvl + 1);
  trickMsg = '';
  if(nl === lvl) return;
  p.tricks[t.id] = nl; persist();
  trickMsg = (nl >= 3 ? L(`${p.name} ${gg('выучил', 'выучила')} трюк «${t.name}»! 🎓`, `${p.name} learned the trick “${t.name}”! 🎓`) : L(`«${t.name}» ${'★'.repeat(nl)}${'☆'.repeat(3 - nl)} — ещё занятие, и получится лучше!`, `“${t.name}” ${'★'.repeat(nl)}${'☆'.repeat(3 - nl)} — one more lesson and it gets even better!`));   // покажет petDo после игры
  if(nl >= 3){ sfx.buy(); burst(TEX.star, headTop(s), 18, 2.4, 0.3); addShells(TRICK_GIFT, toScreen(headTop(s))); }
}
// «ой, не то!» — малыш путается: плюхается на бок, кружится или чихает
async function trickOops(s){
  sfx.arf();
  const what = Math.floor(Math.random()*3);
  if(what === 0){ floatText(L('Ой, не то!', 'Oops, wrong one!'), headTop(s)); await tween(0.5, k => s.inner.rotation.z = Math.sin(k*Math.PI/2)*1.1, ease.out); await wait(0.3); await tween(0.4, k => s.inner.rotation.z = 1.1*(1 - k)); }
  else if(what === 1){ floatText(L('Голова кружится…', 'So dizzy…'), headTop(s)); await tween(0.9, k => s.inner.rotation.y = k*Math.PI*4, ease.io); }
  else { floatText(L('Апчхи!', 'Achoo!'), headTop(s)); sfx.sneezeSoft(); await tween(0.5, k => s.nod = -Math.sin(k*Math.PI)*0.4, ease.lin); }
  s.inner.rotation.set(0, 0, 0); s.nod = 0;
}
// жест: ждём, пока обработчик вернёт true; обработчики снимаются сами
function gesture(types){
  return new Promise(r => {
    const on = {}, off = () => { for(const k in on) mgRoot.removeEventListener(k, on[k]); };
    for(const k in types) on[k] = e => { if(types[k](e)){ off(); r(); } };
    for(const k in on) mgRoot.addEventListener(k, on[k]);
    mgCleanup.push(off);
  });
}
// DOM-подсказка, приклеенная к точке сцены на время одного повтора; возвращает «убрать»
function pin(el, at){
  const f = () => { const q = toScreen(at()); el.style.left = q.x + 'px'; el.style.top = q.y + 'px'; };
  f(); mgTick(f); return () => { mgTicks.delete(f); el.remove(); };
}
const TRICK_GAMES = {
  // Дай ласту: нажми на ласту — малыш протягивает её и «даёт пять»
  paw(s, t){
    focusCam(worldOf(s, new V3(0, -0.6, 0)), 2.6*petK(), 0.3);
    const fl = i => s.flippers[i % 2 ? 0 : 1], tip = i => fl(i).children[0].getWorldPosition(new V3());
    return trickSession(s, t, 3, async i => {
      const un = pin(mgNode('div', 'target'), () => tip(i));
      await gesture({pointerdown:e => { const q = toScreen(tip(i)); return Math.hypot(q.x - e.clientX, q.y - e.clientY) < 90; }});
      un();
    }, async i => {
      const f = fl(i);
      sfx.pop();
      await tween(0.3, k => f.userData.up = k*1.3);
      sfx.tap(); burst(TEX.star, tip(i), 5, 1.2, 0.2); floatText(L('Дай пять!', 'High five!'), tip(i).add(new V3(0, 0.4, 0)));
      await wait(0.35);
      await tween(0.3, k => f.userData.up = (1 - k)*1.3); f.userData.up = 0;
    });
  },
  // Прыжок: проведи пальцем вверх — малыш прыгает и крутится в воздухе
  jump(s, t){
    focusCam(worldOf(s, new V3(0, 0.2, 0)), 3.4*petK(), 0.2);
    return trickSession(s, t, 3, async () => {
      const un = pin(mgNode('div', 'swipe-up', '👆'), () => worldOf(s, new V3(0, -0.8, 0.8)));
      let y0 = null;
      await gesture({pointerdown:e => { y0 = e.clientY; return false; }, pointermove:e => y0 !== null && y0 - e.clientY > 70});
      un();
    }, async () => {
      s.flap = 1; sfx.whoosh(); await squash(s, 0.25, 0.2);
      const h = 1.2*petK();
      await tween(0.8, k => { s.inner.position.y = Math.sin(k*Math.PI)*h; s.inner.rotation.y = k*Math.PI*2; }, ease.lin);
      s.inner.position.y = 0; s.inner.rotation.y = 0; s.flap = 0; sfx.plop(); await squash(s, 0.25, 0.3);
    });
  },
  // Кувырок: круг пальцем вокруг малыша — он делает кувырок через бок
  roll(s, t){
    focusCam(worldOf(s, new V3(0, -0.4, 0)), 3.4*petK(), 0.2);
    const mid = () => worldOf(s, new V3(0, -0.6, 0)), c = () => toScreen(mid());
    return trickSession(s, t, 3, async () => {
      const ring = mgNode('div', 'circle-hint'), un = pin(ring, mid);
      let a0 = null, sum = 0;
      const ang = e => { const q = c(); return Math.atan2(e.clientY - q.y, e.clientX - q.x); };
      await gesture({
        pointerdown:e => { a0 = ang(e); sum = 0; return false; },
        pointerup:() => { a0 = null; return false; },
        pointermove:e => {
          if(a0 === null) return false;
          const q = c(); if(Math.hypot(e.clientX - q.x, e.clientY - q.y) < 30) return false;
          const a = ang(e); sum += Math.atan2(Math.sin(a - a0), Math.cos(a - a0)); a0 = a;
          ring.style.setProperty('--p', Math.min(1, Math.abs(sum)/(Math.PI*1.6)));
          return Math.abs(sum) >= Math.PI*1.6;
        }});
      un();
    }, async () => {
      s.flap = 0.8; sfx.whoosh();
      await tween(0.9, k => { s.inner.rotation.z = -k*Math.PI*2; s.inner.position.y = Math.sin(k*Math.PI)*0.6*petK(); }, ease.io);
      s.inner.rotation.z = 0; s.inner.position.y = 0; s.flap = 0; sfx.plop(); await squash(s, 0.2, 0.3);
    });
  },
  // Мяч на носу: мяч подпрыгивает на носу, нажимай, когда он опускается (ритм)
  async ball(s, t){
    const ball = petBall, rest = ball.userData.rest.clone();
    const nose = () => worldOf(s, s.noseLocal).add(new V3(0, 0.2, 0.05));
    focusCam(nose().add(new V3(0, 0.4, 0)), 3.0*petK(), 0);
    await flyTo(ball, rest.clone(), nose(), 0.6, 1.2);
    const GOAL = 6, H = 1.1*petK(), T = 1.0;
    let ph = 0, good = 0, tapped = false, finish;
    const done = new Promise(r => finish = r);
    mgOpen(`${t.ic} ${t.how}`);
    const ring = mgNode('div', 'target'); ring.hidden = true;
    const win = () => ph > 0.72;   // последняя четверть полёта — пора жать
    mgTick(dt => {
      ph += dt/T;
      if(ph >= 1){ ph -= 1; sfx.pop(); tween(0.2, q => s.nod = -Math.sin(q*Math.PI)*0.3, ease.lin); if(!tapped && good) mgHint(L('Жми, когда мяч внизу!', 'Tap when the ball is low!')); tapped = false; }
      const n = nose(); ball.position.copy(n); ball.position.y += Math.sin(ph*Math.PI)*H; ball.rotation.x += dt*6;
      ring.hidden = !win() || tapped;
      if(!ring.hidden){ const q = toScreen(ball.position); ring.style.left = q.x + 'px'; ring.style.top = q.y + 'px'; }
    });
    mgOn(mgRoot, 'pointerdown', e => {
      e.preventDefault(); if(tapped) return;
      if(!win()){ mgHint(ph < 0.5 ? L('Рано! Мяч ещё летит вверх', 'Too early! The ball is still going up') : L('Чуть позже!', 'A bit later!')); return; }
      tapped = true; good++; sfx.tap(); burst(TEX.star, ball.position.clone(), 4, 1, 0.18);
      floatText(L(['Оп!', 'Ап!', 'Хоп!'], ['Hop!', 'Up!', 'Boing!'])[good % 3], headTop(s));
      if(good >= GOAL) finish(); else mgHint(L(`Ритм! ${good} из ${GOAL}`, `Rhythm! ${good} of ${GOAL}`));
    });
    await done;
    mgClose();
    sfx.good(); floatText(L('Та-да!', 'Ta-da!'), headTop(s).add(new V3(0, 0.5, 0)), '#D9527E');
    await tween(1.0, q => { const n = nose(); ball.position.set(n.x + Math.sin(q*Math.PI*4)*0.04, n.y, n.z); }, ease.lin);
    await flyTo(ball, ball.position.clone(), rest, 0.7, 0.8); ball.rotation.set(0, 0, 0.4);
    trickStar(s, t);
  }
};

/* покадрово: льдинки для прогулки чуть покачиваются, если малыш не на них */
function walkTick(t){
  for(const f of WALK_FLOES){
    const onIt = petSeal && Math.hypot(petSeal.root.position.x - f.position.x, petSeal.root.position.z - f.position.z) < 1.4;
    f.position.y = onIt ? 0 : Math.sin(t*1.3 + f.userData.ph)*0.03;
  }
}
