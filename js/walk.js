/* ---------------- прогулка и трюки (Фаза 3, часть 3) ----------------
   Кнопка ⚽ «Поиграть» в уголке малыша открывает выбор: мяч (petPlay в pet.js), прогулка или трюки.
   Прогулка: малыш прыгает по маленьким льдинкам за своим домиком; на каждой что-то есть — ракушка,
   рыбка из воды, горстка ракушек, а в конце снежная горка. Раз в день под ней новая находка в коллекцию.
   Трюки: «Дай ласту», «Прыжок», «Кувырок», «Мяч на носу» открываются по мере роста; каждое занятие +1 ⭐,
   три звезды — трюк выучен. Проиграть нельзя: малыш иногда путает трюк, это смешно, и пробуем ещё раз.
   Подключается после pet.js и до game.js. */
const TREASURES = [
  {id:'star',   ic:'⭐', name:'Морская звёздочка'},
  {id:'gem',    ic:'💎', name:'Ледяной кристалл'},
  {id:'marble', ic:'🔮', name:'Стеклянный шарик'},
  {id:'anchor', ic:'⚓', name:'Якорёк'},
  {id:'bow',    ic:'🎀', name:'Розовый бантик'},
  {id:'bell',   ic:'🔔', name:'Колокольчик'},
  {id:'key',    ic:'🗝️', name:'Старинный ключик'},
  {id:'bear',   ic:'🧸', name:'Мишка-потеряшка'}
];
// stage — с какой стадии роста малыш может выучить трюк
const TRICKS = [
  {id:'paw',  ic:'🤝', name:'Дай ласту',   stage:0, how:'Нажми на ласту малыша'},
  {id:'jump', ic:'⬆️', name:'Прыжок',      stage:1, how:'Проведи пальцем вверх'},
  {id:'roll', ic:'🔄', name:'Кувырок',     stage:2, how:'Нарисуй круг вокруг малыша'},
  {id:'ball', ic:'⚽', name:'Мяч на носу', stage:3, how:'Нажимай, когда мяч опускается'}
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

/* ---------- льдинки для прогулки: цепочкой за домиком малыша ---------- */
const WALK_FLOES = [[-0.7, -5.5], [0.9, -9.0], [-0.6, -12.4], [1.0, -15.8]].map(([x, z], i) => {
  const g = new THREE.Group(); g.position.set(PET_POS.x + x, 0, PET_POS.z + z);
  const f = addOutline(new THREE.Mesh(floeGeo, floe.material), 1.03); f.position.y = -0.05; f.scale.set(0.36, 1, 0.36); f.rotation.y = i*1.7; g.add(f);
  const fm = new THREE.Mesh(foam.geometry, foam.material); fm.rotation.x = -Math.PI/2; fm.position.y = 0.1; fm.scale.setScalar(0.36); g.add(fm);
  g.userData.ph = i*1.3; scene.add(g); return g;
});
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
  r.position.copy(to); s.flap = 0; sfx.plop();
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
let funKind = 'ball', trickMsg = '';
async function petFun(s){
  const p = save.pet, sc = petScale();
  focusCam(worldOf(s, new V3(0, -0.3, 0)), 2.6*petK(), 0.9);
  const newFind = walkGiftToday(), learned = TRICKS.filter(t => (p.tricks[t.id] || 0) >= 3).length;
  const open = TRICKS.filter(t => p.stage >= t.stage).length;
  mgOpen('Во что поиграем?');
  const panel = mgNode('div', 'mg-panel fun-pick', `
    <div class="picks">
      <button data-k="ball"><span class="ic">⚽</span><b>Мяч</b><small>отбивать носом</small></button>
      <button data-k="walk"><span class="ic">🐾</span><b>Гулять</b><small>${newFind ? '✨ Что-то блестит!' : `Находки ${p.finds.length} из ${TREASURES.length}`}</small></button>
      <button data-k="tricks"><span class="ic">🎓</span><b>Трюки</b><small>выучено ${learned} из ${open}</small></button>
    </div>
    <button class="btn ghost small" data-k="no">Потом</button>`);
  if(newFind) panel.querySelector('[data-k="walk"]').classList.add('new');
  let k = await new Promise(r => panel.querySelectorAll('button').forEach(b => mgOn(b, 'click', () => { sfx.tap(); r(b.dataset.k); })));
  panel.classList.add('away'); await wait(0.25); mgClose();
  if(k !== 'no'){ s.happyUntil = now + 99; setMood(s, 'happy'); }   // играть с тобой — радость, даже если голоден
  if(k === 'tricks'){ const t = await pickTrick(s); if(!t){ s.happyUntil = 0; return false; } funKind = 'tricks'; return TRICK_GAMES[t.id](s, t); }
  if(k === 'no') return false;
  funKind = k;
  return k === 'walk' ? petWalk(s) : petPlay(s);
}
// что меняется после игры: гуляли — проголодался и испачкался сильнее
const FUN_COST = {ball:{food:0.12, bath:0.25}, walk:{food:0.25, bath:0.35, sleep:0.15}, tricks:{food:0.08, sleep:0.1}};
const FUN_SAY = {
  ball: () => `${gg('Наигрался', 'Наигралась')}! И немножко ${gg('испачкался', 'испачкалась')} 🛁`,
  walk: () => `${gg('Нагулялся', 'Нагулялась')}! Лапки в снегу — пора купаться 🛁`,
  tricks: () => trickMsg || `Умница! ${save.pet.name} любит учиться с тобой ♡`
};

/* ---------- прогулка ---------- */
async function petWalk(s){
  const p = save.pet, today = new Date().toDateString(), gift = walkGiftToday();
  if(!p.walk || p.walk.d !== today) p.walk = {d:today, n:0};
  p.walk.n++; persist();
  const sc = petScale(), k = petK();
  const kinds = ['shell', 'fish', 'shells'].sort(() => Math.random() - 0.5).concat('dig');
  const res = {shells:0, fish:0, find:null};

  mgOpen('Идём гулять! 🐾');
  const ring = mgNode('div', 'target'); ring.hidden = true;
  let ringAt = null, onTap = null, onMove = null, onUp = null;
  mgOn(mgRoot, 'pointerdown', e => onTap && onTap(e));
  mgOn(mgRoot, 'pointermove', e => onMove && onMove(e));
  for(const ev of ['pointerup', 'pointercancel']) mgOn(mgRoot, ev, e => onUp && onUp(e));
  const ticks = new Set();
  mgTick(dt => {
    if(ringAt){ const q = toScreen(ringAt); ring.hidden = false; ring.style.left = q.x + 'px'; ring.style.top = q.y + 'px'; } else ring.hidden = true;
    ticks.forEach(f => f(dt));
  });
  // ждём касания рядом с точкой (радиус в пикселях); мимо — мягкая подсказка
  const tapAt = (pt, r, miss) => new Promise(res => { onTap = e => {
    const q = toScreen(typeof pt === 'function' ? pt() : pt);
    if(Math.hypot(q.x - e.clientX, q.y - e.clientY) < r){ onTap = null; res(e); } else if(miss) mgHint(miss);
  }; });
  const frame = (a, b) => camGlide(a.clone().lerp(b, 0.5).setY(0.55 + 0.5*sc), 3.2 + a.distanceTo(b)*0.8, 0.9);

  // к краю своей льдины — и первый прыжок
  const first = floeTop(WALK_FLOES[0]);
  frame(s.root.position, first);
  sfx.arf(); floatText('Гулять!', headTop(s));
  await waddleTo(s, WALK_EDGE);
  let at = WALK_EDGE;
  for(let i = 0; i < WALK_FLOES.length; i++){
    const to = floeTop(WALK_FLOES[i]);
    frame(at, to);
    ringAt = to.clone().add(new V3(0, 0.1, 0));
    mgHint(i ? 'Прыгаем дальше? Нажми на льдинку' : 'Нажми на льдинку — малыш прыгнет!');
    await faceTo(s, to);
    await tapAt(ringAt, 120, 'Нажми на льдинку с кружком');
    ringAt = null; sfx.tap();
    await hopTo(s, to, 1.1*Math.max(0.8, sc), 0.75);
    at = to;
    camGlide(to.clone().add(new V3(0, 0.45 + 0.4*sc, 0.4)), 3.3*(0.6 + 0.4*k), 0.7, 0, 0.45);   // находку смотрим почти спереди
    await turnTo(s, 0, 0.3);
    await WALK_EVENTS[kinds[i]]({s, at:to, res, gift, tapAt, setRing:v => ringAt = v, hint:mgHint, ticks,
      handlers:(t, m, u) => { onTap = t; onMove = m; onUp = u; }});
    ringAt = null; onTap = onMove = onUp = null; ticks.clear();
  }

  // итоги прогулки: что нашли и полка находок
  await wait(0.4);
  const cells = TREASURES.map(t => p.finds.includes(t.id) ? `<i class="${res.find === t ? 'new' : ''}" title="${t.name}">${t.ic}</i>` : '<i class="no">?</i>').join('');
  const got = [res.shells ? `+${res.shells} 🐚` : '', res.fish ? `${gg('съел', 'съела')} рыбку 🐟` : ''].filter(Boolean).join(' · ');
  mgHint('');
  const end = mgNode('div', 'mg-panel walk-end', `
    <p class="ttl display">Хорошо погуляли!</p>
    ${got ? `<p class="got">${got}</p>` : ''}
    ${res.find ? `<p class="got">Новая находка: ${res.find.ic} ${res.find.name}!</p>` : ''}
    <div class="finds">${cells}</div>
    <p class="tip">${foundAll() ? 'Все находки собраны! Ты настоящий следопыт ♡' : res.find ? 'Под снегом ещё много всего. Новая находка — завтра ✨' : 'Сегодняшнюю находку ты уже нашла. Новая спрячется под снегом завтра ✨'}</p>
    <button class="btn" id="walkHome">Домой ♡</button>`);
  await new Promise(r => mgOn(end.querySelector('#walkHome'), 'click', r));
  sfx.tap(); end.classList.add('away'); await wait(0.3);
  mgHint('Плывём домой…');
  await swimHome(s, at);
  mgClose();
  s.happyUntil = now + 2;
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
  await tween(2.2, k => { r.position.lerpVectors(water, shore, k); r.position.y = -0.55; follow(); }, ease.io);
  sfx.splash(); burst(TEX.puff, shore.clone().setY(0.1), 10, 1.6, 0.45);
  s.swimming = false; s.inner.position.y = 0;
  const up = WALK_EDGE.clone();
  await tween(0.7, k => { r.position.lerpVectors(shore, up, k); r.position.y += Math.sin(k*Math.PI)*1.1; follow(); }, ease.lin);
  r.position.copy(up); await squash(s);
  unfocusCam();
  // отряхнулся от воды и бегом на своё место
  sfx.splash();
  for(let i = 0; i < 10; i++){ const a = i/10*Math.PI*2; emit(TEX.drop, headTop(s), {v:new V3(Math.cos(a)*1.4, 1 + Math.random(), Math.sin(a)*0.7), g:4, life:0.8, size:0.16}); }
  await tween(0.6, k => { s.shake = Math.sin(k*Math.PI*8)*0.4*(1 - k); }, ease.lin); s.shake = 0;
  await waddleTo(s, PET_SPOT, 1.0);
  await turnTo(s, 0, 0.35);
}

/* находки на льдинках: каждая — маленькая сценка, малыш «находит», Сабрина забирает */
const WALK_EVENTS = {
  // ракушка торчит из снега: малыш её учуял
  async shell({s, at, res, tapAt, setRing, hint}){
    const sh = makeShell(0xFFC2D1, true), pos = at.clone().add(new V3(0.55, 0.06, 0.45));
    sh.position.copy(pos); sh.rotation.set(0.5, 0.8, 0.2); scene.add(sh);
    sniff(s, pos, 'Ой, что это?');
    setRing(pos.clone().add(new V3(0, 0.1, 0))); hint('Малыш что-то учуял! Нажми на ракушку');
    await tapAt(pos, 90, 'Ракушка — в кружке, нажми на неё');
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
    floatText('Ракушки!', headTop(s)); sfx.arf();
    hint('Тут ракушки! Собери все три');
    let left = 3;
    await new Promise(done => handlers(e => {
      let best = null, bd = 80;
      for(const sh of list){ if(!sh.parent) continue; const q = toScreen(sh.position), d = Math.hypot(q.x - e.clientX, q.y - e.clientY); if(d < bd){ bd = d; best = sh; } }
      if(!best) return;
      scene.remove(best); burst(TEX.star, best.position, 5, 1.2, 0.22); sfx.coin();
      addShells(1, toScreen(best.position)); res.shells++;
      if(!--left) done(); else hint(`Ещё ${left === 1 ? 'одна' : left}!`);
    }));
    s.happyUntil = now + 2; floatText('Все!', headTop(s)); await hop(s, 0.3, 0.4);
  },
  // рыбка выпрыгивает из воды рядом с льдинкой — поймай её, малыш съест
  async fish({s, at, res, hint, handlers, ticks}){
    const fish = makeFish(), sc = petScale(), side = Math.random() < 0.5 ? -1 : 1;
    const a = at.clone().add(new V3(1.25*side, -0.3, 0.9)), b = at.clone().add(new V3(0.3*side, -0.3, 1.55));   // дуга не выходит за край телефона
    fish.visible = false; scene.add(fish);
    let t = -0.6, caught = false, jumps = 0;
    const T = 1.3;   // сколько рыбка в воздухе
    hint('Смотри! Рыбка! Нажми на неё, когда выпрыгнет');
    sniff(s, a, 'Рыбка!');
    ticks.add(dt => {
      if(caught) return;
      t += dt;
      if(t < 0){ fish.visible = false; return; }
      if(t > T){ t = -1.0; fish.visible = false; sfx.plop(); burst(TEX.puff, b.clone().setY(0.1), 4, 0.6, 0.3); if(++jumps >= 2) hint('Жми прямо на рыбку, пока она в воздухе'); return; }
      if(!fish.visible){ fish.visible = true; sfx.splash(); burst(TEX.puff, a.clone().setY(0.1), 4, 0.6, 0.3); }
      const k = t/T; fish.position.lerpVectors(a, b, k); fish.position.y += Math.sin(k*Math.PI)*1.9;
      fish.rotation.set(0, side > 0 ? Math.PI : 0, (0.5 - k)*2.2*side);
    });
    await new Promise(done => handlers(e => {
      if(!fish.visible) return;
      const q = toScreen(fish.position);
      if(Math.hypot(q.x - e.clientX, q.y - e.clientY) < 90){ caught = true; done(); }
    }));
    sfx.ding(); floatText('Поймала!', fish.position.clone().add(new V3(0, 0.5, 0)), '#2F9E72');
    s.mouthO.visible = true; s.smile.visible = false;
    await flyTo(fish, fish.position.clone(), worldOf(s, s.mouthLocal), 0.6, 0.6);
    scene.remove(fish); s.mouthO.visible = false; s.smile.visible = true;
    for(let i = 0; i < 2; i++){ sfx.chomp(); await tween(0.16, q => s.head.scale.set(1, 1 - Math.sin(q*Math.PI)*0.1, 1), ease.lin); }
    s.head.scale.set(1, 1, 1);
    save.pet.needs.food = Math.min(1, save.pet.needs.food + 0.2); res.fish++;
    floatText('Ням!', headTop(s)); s.happyUntil = now + 2;
  },
  // снежная горка: потри пальцем, малыш помогает копать; раз в день — новая находка
  async dig({s, at, res, gift, hint, handlers, setRing}){
    const pos = at.clone().add(new V3(0.6, 0, 0.55));
    const mound = addOutline(new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 10, 0, Math.PI*2, 0, Math.PI/2), toon(0xFFFFFF)), 1.06);
    mound.position.copy(pos); mound.scale.set(1, 0.8, 1); scene.add(mound);
    const t = gift ? TREASURES.filter(x => !save.pet.finds.includes(x.id))[Math.floor(Math.random()*(TREASURES.length - save.pet.finds.length))] : null;
    sniff(s, pos, gift ? 'Тут что-то блестит!' : 'Копаем?');
    const center = pos.clone().add(new V3(0, 0.2, 0));
    setRing(center); hint('Потри снег пальцем — копаем!');
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
      const n = 3; floatText('Ракушки!', center.clone().add(new V3(0, 0.6, 0)), '#C9962E');
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
  mgOpen('Какой трюк учим?');
  const rows = TRICKS.map(t => {
    const lvl = p.tricks[t.id] || 0, open = p.stage >= t.stage;
    const stars = '★'.repeat(lvl) + '☆'.repeat(3 - lvl);
    return `<button class="trick${open ? '' : ' locked'}${lvl >= 3 ? ' done' : ''}" data-id="${t.id}">
      <span class="ic">${open ? t.ic : '🔒'}</span>
      <span class="t"><b>${t.name}</b><small>${open ? (lvl >= 3 ? 'Выучен! Можно показывать' : t.how) : `когда подрастёт: ${stageName(t.stage).toLowerCase()}`}</small></span>
      <span class="st">${open ? stars : ''}</span></button>`;
  }).join('');
  const panel = mgNode('div', 'mg-panel trick-pick', `<div class="tricks">${rows}</div><button class="btn ghost small" data-id="">Назад</button>`);
  const t = await new Promise(r => panel.querySelectorAll('button').forEach(b => mgOn(b, 'click', () => {
    const t = TRICKS.find(x => x.id === b.dataset.id);
    if(t && p.stage < t.stage){ sfx.bad(); wiggle(b); mgHint(`Этот трюк — когда ${p.name} подрастёт`); return; }
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
    if(oops && i === oopsAt){ oops = false; await trickOops(s); i--; mgHint(`${save.pet.name} ещё учится. Ещё разок!`); continue; }
    await act(i);
    sfx.good(); burst(TEX.star, headTop(s), 6, 1.4, 0.24);
    floatText(['Молодец!', 'Ура!', 'Здорово!'][i % 3], headTop(s), '#2F9E72');
    if(i < reps - 1) mgHint(`Отлично! Ещё ${reps - 1 - i === 1 ? 'разок' : reps - 1 - i + ' раза'}`);
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
  trickMsg = (nl >= 3 ? `${p.name} ${gg('выучил', 'выучила')} трюк «${t.name}»! 🎓` : `«${t.name}» ${'★'.repeat(nl)}${'☆'.repeat(3 - nl)} — ещё занятие, и получится лучше!`);   // покажет petDo после игры
  if(nl >= 3){ sfx.buy(); burst(TEX.star, headTop(s), 18, 2.4, 0.3); addShells(TRICK_GIFT, toScreen(headTop(s))); }
}
// «ой, не то!» — малыш путается: плюхается на бок, кружится или чихает
async function trickOops(s){
  sfx.arf();
  const what = Math.floor(Math.random()*3);
  if(what === 0){ floatText('Ой, не то!', headTop(s)); await tween(0.5, k => s.inner.rotation.z = Math.sin(k*Math.PI/2)*1.1, ease.out); await wait(0.3); await tween(0.4, k => s.inner.rotation.z = 1.1*(1 - k)); }
  else if(what === 1){ floatText('Голова кружится…', headTop(s)); await tween(0.9, k => s.inner.rotation.y = k*Math.PI*4, ease.io); }
  else { floatText('Апчхи!', headTop(s)); sfx.sneezeSoft(); await tween(0.5, k => s.nod = -Math.sin(k*Math.PI)*0.4, ease.lin); }
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
      sfx.tap(); burst(TEX.star, tip(i), 5, 1.2, 0.2); floatText('Дай пять!', tip(i).add(new V3(0, 0.4, 0)));
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
      if(ph >= 1){ ph -= 1; sfx.pop(); tween(0.2, q => s.nod = -Math.sin(q*Math.PI)*0.3, ease.lin); if(!tapped && good) mgHint('Жми, когда мяч внизу!'); tapped = false; }
      const n = nose(); ball.position.copy(n); ball.position.y += Math.sin(ph*Math.PI)*H; ball.rotation.x += dt*6;
      ring.hidden = !win() || tapped;
      if(!ring.hidden){ const q = toScreen(ball.position); ring.style.left = q.x + 'px'; ring.style.top = q.y + 'px'; }
    });
    mgOn(mgRoot, 'pointerdown', e => {
      e.preventDefault(); if(tapped) return;
      if(!win()){ mgHint(ph < 0.5 ? 'Рано! Мяч ещё летит вверх' : 'Чуть позже!'); return; }
      tapped = true; good++; sfx.tap(); burst(TEX.star, ball.position.clone(), 4, 1, 0.18);
      floatText(['Оп!', 'Ап!', 'Хоп!'][good % 3], headTop(s));
      if(good >= GOAL) finish(); else mgHint(`Ритм! ${good} из ${GOAL}`);
    });
    await done;
    mgClose();
    sfx.good(); floatText('Та-да!', headTop(s).add(new V3(0, 0.5, 0)), '#D9527E');
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
