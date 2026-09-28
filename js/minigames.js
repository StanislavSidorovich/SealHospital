/* ---------------- мини-игры лечения (Фаза 1) ----------------
   Каждая мини-игра — async-функция: кладёт свой интерфейс в слой #mg, ждёт, пока игрок
   справится, и убирает за собой. Проиграть нельзя: ошибка = подсказка и новая попытка.
   Подключается после seal.js и до game.js: S, busy, toast, focusCam берутся из game.js уже во время игры. */
const mgRoot = $('#mg'), mgStage = $('#mgStage'), mgHintEl = $('#mgHint');
const mgTicks = new Set();   // покадровые обработчики, loop() в game.js вызывает их с dt
let mgCleanup = [];

// card:true — карта пациента остаётся на экране (подсказку тогда лучше опустить вниз: hintBottom)
function mgOpen(hint, {card = false, hintBottom = false} = {}){
  mgStage.innerHTML = ''; mgEnding = false; mgRoot.hidden = false; $('#toast').hidden = true;   // тост не должен закрывать панель мини-игры
  document.body.classList.add('mg-on'); document.body.classList.toggle('mg-card', card);
  mgHintEl.classList.toggle('bottom', hintBottom);
  mgHint(hint);
}
function mgClose(){
  mgTicks.clear(); mgCleanup.forEach(f => f()); mgCleanup = [];
  mgStage.innerHTML = ''; mgHintEl.textContent = ''; mgRoot.hidden = true;
  document.body.classList.remove('mg-on', 'mg-card');
}
function mgHint(text){
  if(mgHintEl.textContent === text) return;
  mgHintEl.textContent = text; mgHintEl.classList.remove('pop'); void mgHintEl.offsetWidth; mgHintEl.classList.add('pop');
}
function mgOn(el, type, fn){ el.addEventListener(type, fn); const off = () => el.removeEventListener(type, fn); off.on = [el, type, fn]; mgCleanup.push(off); }

/* Смену можно оставить посреди лупы или лечения и сбегать к малышу (goPet в pet.js): мини-игра «засыпает» —
   её узлы, покадровые обработчики и касания откладываются в сторону и возвращаются, когда придёшь обратно.
   mgEnding — игра уже решена и вот-вот закроется сама: тогда не откладываем, иначе вернули бы закрытую игру. */
let mgParked = null, mgEnding = false;
function mgCanPark(){ return !mgParked && !mgEnding && !petMode && !!S && (S.stage === 'diagnose' || S.stage === 'treat') && !mgRoot.hidden; }
function mgPark(){
  const p = mgParked = {nodes:[...mgStage.childNodes], ticks:[...mgTicks], clean:mgCleanup, hint:mgHintEl.textContent, busy,
    bottom:mgHintEl.classList.contains('bottom'), card:document.body.classList.contains('mg-card'),
    focus:{want:camFocus.want, center:camFocus.center.clone(), size:camFocus.size, lift:camFocus.lift, up:camFocus.up}};
  p.clean.forEach(f => f.on && f());   // касания снимаем, остальную уборку просто откладываем
  p.nodes.forEach(n => n.remove()); mgTicks.clear(); mgCleanup = [];
  mgHintEl.textContent = ''; mgRoot.hidden = true; document.body.classList.remove('mg-on', 'mg-card');
  setBusy(false);
}
function mgUnpark(){
  const p = mgParked; if(!p) return false; mgParked = null;
  mgStage.innerHTML = ''; p.nodes.forEach(n => mgStage.appendChild(n));
  p.ticks.forEach(f => mgTicks.add(f));
  p.clean.forEach(f => f.on && f.on[0].addEventListener(f.on[1], f.on[2])); mgCleanup = p.clean;
  mgRoot.hidden = false; document.body.classList.add('mg-on'); document.body.classList.toggle('mg-card', p.card);
  mgHintEl.classList.toggle('bottom', p.bottom); mgHint(p.hint);
  focusCam(p.focus.center, p.focus.size, p.focus.lift, p.focus.up); camFocus.want = p.focus.want;
  setBusy(p.busy);
  return true;
}
// спрятать открытую мини-игру (узлы, покадровые обработчики, касания), чтобы внутри неё сыграть другую, и вернуть как было
// (рыбалка посреди прогулки по острову: fishCast сам открывает и закрывает свой слой)
function mgStash(){
  const p = {nodes:[...mgStage.childNodes], ticks:[...mgTicks], clean:mgCleanup, hint:mgHintEl.textContent, bottom:mgHintEl.classList.contains('bottom')};
  p.clean.forEach(f => f.on && f()); p.nodes.forEach(n => n.remove()); mgTicks.clear(); mgCleanup = [];
  return p;
}
function mgRestore(p){
  mgOpen('', {hintBottom:p.bottom});
  p.nodes.forEach(n => mgStage.appendChild(n)); p.ticks.forEach(f => mgTicks.add(f));
  p.clean.forEach(f => f.on && f.on[0].addEventListener(f.on[1], f.on[2])); mgCleanup = p.clean;
}
function mgTick(fn){ mgTicks.add(fn); }
function mgNode(tag, cls, html = ''){
  const el = document.createElement(tag); if(cls) el.className = cls; el.innerHTML = html; mgStage.appendChild(el); return el;
}
function wiggle(el){ el.classList.remove('wiggle'); void el.offsetWidth; el.classList.add('wiggle'); }
// точка сцены → пиксели экрана (холст во весь экран)
function toScreen(v){ const p = v.clone().project(camera); return {x:(p.x + 1)/2*innerWidth, y:(1 - p.y)/2*innerHeight}; }

/* ---------- Градусник: держи палец, отпусти на зелёном ---------- */
async function mgThermo(s){
  const th = makeThermo(); th.rotation.z = -1.0;
  const red = th.userData.red; red.scale.y = 0.4;
  focusCam(worldOf(s, new V3(0, -0.1, 0)), 2.7);
  await flyTo(th, camPt(0.3, -1.8, -4), worldOf(s, s.mouthLocal).add(new V3(0.26, 0.16, 0.05)), 0.7, 0.6);

  mgOpen(L('Нажми и держи 👆', 'Press and hold 👆'));
  const gauge = mgNode('div', 'gauge-wrap', '<span class="ic">🌡️</span><div class="gauge"><div class="zone"></div><div class="fill"></div></div>').lastChild;
  const hold = mgNode('button', 'hold display', `<span class="big">👆</span>${L('Держи', 'Hold')}`);
  hold.setAttribute('aria-label', L('Держи, чтобы измерить температуру', 'Hold to take the temperature'));
  const fill = gauge.querySelector('.fill'), zone = gauge.querySelector('.zone');
  const Z0 = 0.62, Z1 = 0.86, SPEED = 0.42;   // зелёная зона и скорость: ~1,5 с до зоны, ~0,6 с внутри неё
  const inner = () => gauge.clientHeight - 14;   // clientHeight без рамки; минус отступы столбика по 7px
  zone.style.bottom = 7 + Z0*inner() + 'px'; zone.style.height = (Z1 - Z0)*inner() + 'px';

  let level = 0, holding = false, lastTick = 0, finish;
  const done = new Promise(r => finish = r);
  const press = e => { e.preventDefault(); holding = true; hold.classList.add('on'); };
  const release = () => {
    if(!holding) return; holding = false; hold.classList.remove('on');
    if(level >= Z0 && level <= Z1) return finish();
    if(level > 0.08){ sfx.bad(); wiggle(gauge); mgHint(L('Ещё чуть-чуть! Держи подольше', 'Just a little more! Hold longer')); }
  };
  mgOn(mgRoot, 'pointerdown', press);
  for(const ev of ['pointerup', 'pointercancel', 'pointerleave']) mgOn(mgRoot, ev, release);
  mgTick(dt => {
    if(holding){
      level += dt*SPEED;
      if(level >= 1){   // перебор: мягко сбрасываем, без наказания
        level = 0.2; holding = false; hold.classList.remove('on');
        sfx.bad(); wiggle(gauge); mgHint(L('Ой, перебор! Отпусти на зелёном', 'Oops, too much! Let go on the green'));
      } else if(level - lastTick > 0.08){ lastTick = level; sfx.tick(); }
      if(level >= Z0 && level <= Z1) mgHint(L('Отпускай!', 'Let go!'));
    } else {
      level = Math.max(0, level - dt*0.3); lastTick = Math.min(lastTick, level);
    }
    gauge.classList.toggle('ok', level >= Z0 && level <= Z1);
    fill.style.height = level*inner() + 'px';
    red.scale.y = 0.4 + level*1.6;
  });
  await done;
  mgClose();
  sfx.beep(true);
  floatText(L('38,5°', '38.5°C'), headTop(s), '#D9364F');
  await wait(0.9);
  await tween(0.3, k => th.scale.setScalar(1 - k)); scene.remove(th);
  toast(L('Жар 38,5°! Теперь дай лекарство.', 'Fever, 38.5°C! Now give some medicine.'));
}

/* ---------- Лекарство: налить сироп в ложку по рецепту ---------- */
const SYRUPS = [
  {id:'rasp', c:'#FF8FB1', hex:0xFF8FB1, ic:'🍓', name:L('Малиновый', 'Raspberry')},
  {id:'bana', c:'#FFD66B', hex:0xFFD66B, ic:'🍌', name:L('Банановый', 'Banana')},
  {id:'mint', c:'#86DDB5', hex:0x86DDB5, ic:'🌿', name:L('Мятный', 'Mint')},
  {id:'blue', c:'#A5B3F7', hex:0xA5B3F7, ic:'🫐', name:L('Черничный', 'Blueberry')}
];
async function mgMedicine(s){
  const recipe = SYRUPS.slice().sort(() => Math.random() - 0.5).slice(0, 3);
  focusCam(worldOf(s, new V3(0, 0, 0)), 2.6, 1.0);
  mgOpen(L('Налей сироп по рецепту', 'Pour the syrup by the recipe'));
  const panel = mgNode('div', 'mg-panel', `
    <div class="recipe"><span>${L('Рецепт:', 'Recipe:')}</span>${recipe.map((r, i) => `${i ? '<span class="arr">→</span>' : ''}<i style="--c:${r.c}">${r.ic}</i>`).join('')}</div>
    <div class="spoon"><div class="bowl">${recipe.map(r => `<b style="--c:${r.c}"></b>`).join('')}</div><div class="handle"></div></div>
    <div class="bottles">${SYRUPS.map(r => `<button class="bottle" data-id="${r.id}" aria-label="${L(`${r.name} сироп`, `${r.name} syrup`)}"><span class="cap"></span><span class="neck"></span><span class="body" style="--c:${r.c}">${r.ic}</span></button>`).join('')}</div>`);
  const steps = [...panel.querySelectorAll('.recipe i')], layers = [...panel.querySelectorAll('.bowl b')];
  let step = 0, pouring = false, finish;
  const done = new Promise(r => finish = r);
  const mark = () => steps.forEach((el, i) => { el.classList.toggle('ok', i < step); el.classList.toggle('now', i === step); });
  mark();
  panel.querySelectorAll('.bottle').forEach(b => mgOn(b, 'click', async () => {
    if(pouring || step >= recipe.length) return;
    const want = recipe[step];
    if(b.dataset.id !== want.id){
      sfx.bad(); wiggle(b); mgHint(L(`Сейчас нужен ${want.ic} — посмотри рецепт!`, `Now you need ${want.ic} — check the recipe!`)); return;
    }
    pouring = true; sfx.pour();
    b.classList.remove('pour'); void b.offsetWidth; b.classList.add('pour');
    await wait(0.25);
    layers[step].classList.add('in'); step++; mark();
    await wait(0.3); pouring = false;
    if(step < recipe.length) mgHint(step === 1 ? L('Так! Теперь следующий', 'Yes! Now the next one') : L('Ещё один!', 'One more!'));
    else finish();
  }));
  await done; mgEnding = true;
  panel.querySelector('.spoon').classList.add('full'); sfx.good(); mgHint(L('Готово! Даём лекарство', 'Done! Giving the medicine'));
  await wait(0.8);
  panel.classList.add('away'); await wait(0.35);
  mgClose();
  focusCam(worldOf(s, new V3(0, -0.1, 0)), 2.8);
  const spoon = makeSpoon(recipe[recipe.length - 1].hex); spoon.rotation.y = -0.4;
  await flyTo(spoon, camPt(0.4, -1.6, -4), worldOf(s, s.mouthLocal).add(new V3(0.2, 0, 0.1)), 0.8, 0.6);
  await tween(0.35, k => { s.nod = Math.sin(k*Math.PI)*0.25; spoon.position.x += 0.004; });
  s.nod = 0;
  await tween(0.2, k => spoon.scale.setScalar(1 - k)); scene.remove(spoon);
}

/* ---------- Пластырь: протереть ранку пальцем, потом перетащить пластырь ---------- */
const DIRT_TEX = canvasTex(64, (g, s) => {
  g.fillStyle = 'rgba(128,124,150,.8)';   // серо-сиреневая «ледяная каша», не коричневая
  for(const [x, y, r] of [[32,32,20],[20,26,12],[44,24,11],[40,42,12],[22,42,10]]){ g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
});
async function mgBandage(s){
  focusCam(worldOf(s, new V3(0.25, 0.2, 0)), 2.2, 0.15);
  // грязь вокруг ранки: спрайты на голове, стираются трением
  const dirt = [[0.42,0.6,0.68],[0.62,0.44,0.66],[0.56,0.64,0.52],[0.36,0.44,0.8],[0.68,0.58,0.46]].map(([x, y, z]) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:DIRT_TEX, transparent:true, depthWrite:false}));
    onHead(sp, x, y, z, 0.04); sp.scale.setScalar(0.24 + Math.random()*0.06); s.head.add(sp); return sp;
  });
  const worldPos = o => o.getWorldPosition(new V3());
  await wait(0.5);

  mgOpen(L('Протри ранку пальцем', 'Wipe the scratch with your finger'));
  const cotton = mgNode('div', 'cotton'), finger = mgNode('div', 'finger', '👆');
  let down = false, px = 0, py = 0, rubT = 0, giggled = false, left = dirt.length, finish;
  const cleaned = new Promise(r => finish = r);
  const place = (el, x, y) => { el.style.left = x + 'px'; el.style.top = y + 'px'; };
  const rub = (x, y, amount) => {
    for(const d of dirt){
      if(!d.visible) continue;
      const p = toScreen(worldPos(d));
      if(Math.hypot(p.x - x, p.y - y) > 48) continue;
      d.material.opacity -= amount;
      if(d.material.opacity <= 0.08){
        d.visible = false; left--; sfx.pop();
        emit(TEX.star, worldPos(d), {v:new V3(0, 0.8, 0.3), life:0.7, size:0.22, spin:3});
        if(!left) finish();
      }
    }
  };
  mgOn(mgRoot, 'pointerdown', e => { down = true; px = e.clientX; py = e.clientY; cotton.classList.add('on'); place(cotton, px, py); finger.hidden = true; });
  mgOn(mgRoot, 'pointermove', e => {
    if(!down) return;
    const d = Math.hypot(e.clientX - px, e.clientY - py); px = e.clientX; py = e.clientY; place(cotton, px, py);
    if(d > 0){ rub(px, py, d/260); if(now - rubT > 0.09){ rubT = now; sfx.rub(); } }
    if(!giggled && d > 0 && dirt.some(x => !x.visible)){ giggled = true; floatText(L('Хи-хи!', 'Hehe!'), headTop(s)); }
  });
  for(const ev of ['pointerup', 'pointercancel']) mgOn(mgRoot, ev, () => { down = false; cotton.classList.remove('on'); });
  mgTick(() => { const c = toScreen(worldPos(s.plaster)); place(finger, c.x, c.y); });
  await cleaned;
  dirt.forEach(d => { s.head.remove(d); d.material.dispose(); });
  mgClose(); sfx.good(); floatText(L('Чисто!', 'Clean!'), headTop(s));
  await wait(0.7);

  mgOpen(L('Перетащи пластырь на ранку', 'Drag the bandage onto the scratch'));
  const target = mgNode('div', 'target'), pl = mgNode('div', 'plaster-drag');
  pl.setAttribute('aria-label', L('Пластырь', 'Bandage'));
  let drag = null, stuck;
  const placed = new Promise(r => stuck = r);
  mgTick(() => { const c = toScreen(worldPos(s.plaster)); place(target, c.x, c.y); });
  mgOn(pl, 'pointerdown', e => {
    e.stopPropagation(); const r = pl.getBoundingClientRect();
    drag = {dx:e.clientX - r.left - r.width/2, dy:e.clientY - r.top - r.height/2};
    try{ pl.setPointerCapture(e.pointerId); }catch(err){}
    pl.classList.remove('back'); pl.classList.add('drag'); sfx.tap();
  });
  mgOn(pl, 'pointermove', e => {
    if(!drag) return;
    pl.style.bottom = 'auto'; pl.style.marginLeft = '0';
    place(pl, e.clientX - drag.dx - pl.offsetWidth/2, e.clientY - drag.dy - pl.offsetHeight/2);
  });
  const drop = () => {
    if(!drag) return; drag = null; pl.classList.remove('drag');
    const r = pl.getBoundingClientRect(), c = toScreen(worldPos(s.plaster));
    if(Math.hypot(r.left + r.width/2 - c.x, r.top + r.height/2 - c.y) < 75) return stuck();
    sfx.bad(); mgHint(L('Почти! Неси прямо на ранку', 'Almost! Bring it right to the scratch'));
    pl.classList.add('back'); pl.style.left = ''; pl.style.top = ''; pl.style.bottom = ''; pl.style.marginLeft = '';
  };
  mgOn(pl, 'pointerup', drop); mgOn(pl, 'pointercancel', drop);
  await placed;
  mgClose();
  s.plaster.visible = true; s.plaster.scale.setScalar(0.01); sfx.pop();
  await tween(0.4, k => s.plaster.scale.setScalar(Math.max(0.01, k)), ease.back);
}

/* ---------- Охота: тюлень ловит рыбку, как настоящий (вместо удочки; разговор с папой 28.09) ----------
   Своя механика, не как в Seally Seal. Под водой, в окошке снизу — 4 шага, каждый — одна кнопка:
   1) ⤵ Нырок — нажать; 2) 〰️ Усы — держать: тюлени находят рыбку усами даже в темноте (усы чувствуют, как рыбка
   шевелит воду), от рыбки расходятся круги, малыш подплывает ближе, пока держишь; 3) Погоня — рыбка виляет:
   над ней стрелка, жми ◀ или ▶ туда же (промах — рыбка просто вильнула ещё раз); 4) Хап! — держи, малыш
   подкрадывается и кружок сжимается, отпусти, когда он внутри точки (рано — рыбка отплыла, ещё раз).
   Проиграть нельзя. Сложность — от рыбки: fd.steps.length (2–4) и редкая ли (SEA_FISH в seal.js). */
if(!save.sea) save.sea = {got:[], n:0, r:0};   // страница могла взять старый data.js из кеша
// кто клюнул: сначала северные рыбки на обед; южная гостья — редкость, пока не все в коллекции (но не реже раза в 6 уловов)
function pickCatch(){
  const sea = save.sea, rare = SEA_FISH.filter(f => !f.food && !f.isle && !sea.got.includes(f.id));   // рыбки острова клюют только на острове
  if(rare.length && sea.n >= 2 && (Math.random() < 0.25 || sea.n - sea.r >= 6)) return rare[Math.floor(Math.random()*rare.length)];
  const food = SEA_FISH.filter(f => f.food), pool = sea.n < 3 ? food.slice(0, 2) : food;   // первые уловы — полегче
  return pool[Math.floor(Math.random()*pool.length)];
}
const HUNT_SEAL = `<svg viewBox="0 0 120 80" aria-hidden="true">
  <path d="M20 44 L3 30 Q1 44 4 58 Z" fill="#fff" stroke="#3B3A4A" stroke-width="4" stroke-linejoin="round"/>
  <ellipse cx="58" cy="44" rx="42" ry="25" fill="#fff" stroke="#3B3A4A" stroke-width="4"/>
  <path d="M52 62 Q46 74 58 72" fill="#fff" stroke="#3B3A4A" stroke-width="4" stroke-linecap="round"/>
  <circle cx="80" cy="37" r="4.5" fill="#3B3A4A"/><circle cx="81.5" cy="35.5" r="1.4" fill="#fff"/>
  <ellipse cx="78" cy="48" rx="6" ry="3.5" fill="#FF9BB8" opacity=".7"/>
  <path d="M90 46 q2 3 4 0 q2 3 4 0" fill="none" stroke="#3B3A4A" stroke-width="2.5" stroke-linecap="round"/>
  <g class="whisk" stroke="#3B3A4A" stroke-width="2" stroke-linecap="round"><path d="M98 42 L116 36"/><path d="M99 45 L118 45"/><path d="M98 48 L116 54"/></g>
</svg>`;
async function sealHunt(fd, first){
  const lvl = fd.steps.length + (fd.food ? 0 : 1), slow = first ? 1.3 : 1;
  mgOpen(L('Ныряем за рыбкой!', 'Let’s dive for a fish!'));
  const ui = mgNode('div', 'hunt', `
    <div class="hunt-top"><span class="hunt-say display"></span><span class="hunt-steps"><i></i><i></i><i></i><i></i></span></div>
    <div class="hunt-sea"><i class="hunt-hole"></i><div class="hunt-rings"></div>
      <img class="hunt-fish" src="${seaThumb(fd)}" alt=""><div class="hunt-ring"><i></i></div><b class="hunt-arrow"></b>
      <div class="hunt-seal">${HUNT_SEAL}</div><div class="hunt-dark"></div></div>
    <div class="hunt-btns"></div>`);
  const $u = q => ui.querySelector(q);
  const say = $u('.hunt-say'), sea = $u('.hunt-sea'), seal = $u('.hunt-seal'), fish = $u('.hunt-fish'), dark = $u('.hunt-dark'),
    rings = $u('.hunt-rings'), arrow = $u('.hunt-arrow'), ring = $u('.hunt-ring'), btns = $u('.hunt-btns'), dots = [...ui.querySelectorAll('.hunt-steps i')];
  const S = {x:50, y:10, f:1}, F = {x:50, y:70};   // где малыш и рыбка (в % окошка); f — куда смотрит малыш
  const place = () => {
    seal.style.left = S.x + '%'; seal.style.top = S.y + '%'; seal.style.setProperty('--f', S.f);
    fish.style.left = ring.style.left = arrow.style.left = F.x + '%'; fish.style.top = ring.style.top = F.y + '%'; arrow.style.top = (F.y - 26) + '%';
  };
  const near = (k = 18) => { S.f = F.x >= S.x ? 1 : -1; S.x = F.x - S.f*k; S.y = F.y; place(); };
  const dot = i => { dots[i].classList.add('on'); sfx.ding(); };
  const hold = (b, down, up) => { mgOn(b, 'pointerdown', e => { e.preventDefault(); down(); }); for(const ev of ['pointerup', 'pointercancel', 'pointerleave']) mgOn(b, ev, up); };
  place();
  // 1) нырок
  say.textContent = L('Нажми — и ныряй! ⤵', 'Tap to dive! ⤵');
  btns.innerHTML = `<button class="btn">⤵ ${L('Нырок!', 'Dive!')}</button>`;
  await new Promise(r => mgOn(btns.firstChild, 'click', r));
  sfx.splash(); ui.classList.add('under'); S.y = 40; place(); dot(0);
  await wait(0.5);
  // 2) усы в темноте
  F.x = 18 + Math.random()*64; F.y = 62 + Math.random()*20; place();
  ui.classList.add('dark');
  say.textContent = L('Темно! Держи 〰️ — усы слушают воду', 'It’s dark! Hold 〰️ — whiskers feel the water');
  btns.innerHTML = `<button class="btn hunt-hold">〰️ ${L('Усы', 'Whiskers')}</button>`;
  const need = (1.1 + lvl*0.25)*slow, s0 = {x:S.x, y:S.y};
  let on = false, got = 0, ringT = 0;
  hold(btns.firstChild, () => { on = true; ui.classList.add('feel'); }, () => { on = false; ui.classList.remove('feel'); });
  await new Promise(res => mgTick(function tick(dt){
    if(!on) return;
    got += dt; const k = Math.min(1, got/need);
    S.f = F.x >= s0.x ? 1 : -1; S.x = s0.x + (F.x - S.f*20 - s0.x)*k*0.85; S.y = s0.y + (F.y - s0.y)*k*0.85; place();
    ringT -= dt;
    if(ringT <= 0){   // круги от рыбки: чем ближе, тем чаще
      ringT = 0.55 - k*0.3;
      const c = document.createElement('i'); c.style.left = F.x + '%'; c.style.top = F.y + '%'; rings.appendChild(c);
      setTimeout(() => c.remove(), 1200); sfx.tick();
    }
    if(k >= 1){ mgTicks.delete(tick); res(); }
  }));
  ui.classList.remove('dark', 'feel'); ui.classList.add('seen'); dot(1);
  say.textContent = L('Вот она! 🐟', 'There it is! 🐟');
  await wait(0.6);
  // 3) погоня: стрелка показывает, куда рыбка метнётся
  const N = Math.min(5, lvl + 1);   // 3–5 рывков
  btns.innerHTML = `<button class="btn hunt-lr" data-d="-1" aria-label="${L('Влево', 'Left')}">◀</button><button class="btn hunt-lr" data-d="1" aria-label="${L('Вправо', 'Right')}">▶</button>`;
  let dir = 0, left = N;
  const next = () => {
    dir = F.x < 28 ? 1 : F.x > 72 ? -1 : Math.random() < 0.5 ? -1 : 1;
    arrow.textContent = dir < 0 ? '◀' : '▶'; arrow.classList.remove('pop'); void arrow.offsetWidth; arrow.classList.add('pop');
    say.textContent = L(`Куда вильнёт? Жми туда же! Ещё ${left}`, `Which way? Tap the same way! ${left} more`);
  };
  near(); next();
  await new Promise(res => btns.querySelectorAll('button').forEach(b => mgOn(b, 'click', () => {
    if(!left) return;
    if(+b.dataset.d !== dir){ sfx.bad(); wiggle(fish); mgHint(L('Рыбка вильнула в другую сторону! Смотри на стрелку', 'The fish went the other way! Watch the arrow')); return; }
    sfx.whoosh(); F.x += dir*(16 + Math.random()*8); F.y = Math.max(55, Math.min(85, F.y + (Math.random() - 0.5)*14)); near(); left--; mgHint('');
    if(left) next(); else { arrow.textContent = ''; res(); }
  })));
  dot(2);
  // 4) подкрасться и хапнуть: держи — кружок сжимается, отпусти внутри точки
  const zone = (fd.food ? 0.32 : 0.25)*(first ? 1.2 : 1), T = 1.5*slow;
  ui.classList.add('snap'); ring.firstChild.style.setProperty('--z', zone);
  say.textContent = L('Держи — подкрадываемся… Отпусти в точке — хап!', 'Hold to sneak up… Let go in the dot — snap!');
  btns.innerHTML = `<button class="btn hunt-hold">🦭 ${L('Хап!', 'Snap!')}</button>`;
  let r = 1, press = false;
  const setR = () => { ring.style.setProperty('--r', r); ring.classList.toggle('ok', r <= zone); };
  setR();
  await new Promise(res => {
    const miss = t => { r = 1; setR(); sfx.bad(); wiggle(fish); mgHint(t); near(); };
    hold(btns.firstChild, () => { press = true; mgHint(''); }, () => {
      if(!press) return; press = false;
      if(r <= zone){ res(); return; }
      miss(L('Рано! Рыбка отплыла — подкрадись ещё', 'Too soon! The fish swam off — sneak up again'));
    });
    mgTick(function tick(dt){
      if(!press) return;
      r -= dt/T; S.x += ((F.x - S.f*9) - S.x)*Math.min(1, dt*2); place();
      if(r <= 0) miss(L('Ой, рыбка заметила! Отпускай, когда кружок в точке', 'Oops, the fish noticed! Let go when the ring is in the dot'));
      setR();
    });
  });
  ui.classList.remove('snap'); ui.classList.add('caught'); S.x = F.x - S.f*6; place();
  sfx.chomp(); dot(3); say.textContent = L('Хап! Поймали! 🐟', 'Snap! Got it! 🐟');
  mgEnding = true;
  await wait(0.5);
  S.x = 50; S.y = 4; F.x = 50; F.y = 4; place();   // наверх, к лунке
  await wait(0.55);
  mgClose();
}
// тюлень прыгает в лунку и потом выныривает обратно (малыш на своей лунке и на острове)
async function huntDiveIn(s, hole){
  const p0 = s.root.position.clone(), r0 = s.root.rotation.y, sc = s.root.scale.x;
  const d = new V3(hole.x - p0.x, 0, hole.z - p0.z); s.root.rotation.y = Math.atan2(d.x, d.z);
  sfx.whoosh();
  await tween(0.55, k => { s.root.position.lerpVectors(p0, hole, k); s.root.position.y += Math.sin(k*Math.PI)*0.9 - k*0.4; s.inner.rotation.x = k*1.2; s.root.scale.setScalar(sc*(1 - k*k*0.6)); }, ease.lin);
  sfx.splash(); burst(TEX.puff, hole.clone().add(new V3(0, 0.1, 0)), 10, 1.5, 0.45);
  s.root.visible = false; s.root.scale.setScalar(sc); s.inner.rotation.x = 0;
  return {p0, r0, sc};
}
async function huntDiveOut(s, b, hole){
  s.root.visible = true; s.root.rotation.y = b.r0; s.flap = 1;
  burst(TEX.puff, hole.clone().add(new V3(0, 0.1, 0)), 10, 1.6, 0.45);
  await tween(0.6, k => { s.root.position.lerpVectors(hole, b.p0, k); s.root.position.y += Math.sin(k*Math.PI)*1.1; s.inner.rotation.x = -(1 - k)*Math.PI*2; }, ease.out);
  s.root.position.copy(b.p0); s.inner.rotation.x = 0; s.flap = 0;
  sfx.thud(); squash(s, 0.2, 0.25);
}
// hole — лунка, cam — [центр, размер, lift] для focusCam, pick — кто клюнет (рыбалка на острове выбирает сама),
// diver — кто ныряет (малыш: прыгает в лунку и выныривает; без него — ныряем «за кадром», например в больнице)
async function fishCast({hole, cam, pick = pickCatch, diver = null}){
  focusCam(...cam);
  const fd = pick(), first = !save.sea.n;
  const splash = (n = 6, sp = 1) => burst(TEX.puff, hole.clone().add(new V3(0, 0.1, 0)), n, sp, 0.4);
  const back = diver ? await huntDiveIn(diver, hole) : null;
  if(!diver){ sfx.splash(); splash(8, 1.2); }
  // пока малыш под водой — из лунки поднимаются пузырьки
  mgTick(dt => { if(Math.random() < dt*6) emit(TEX.dot, hole.clone().add(new V3((Math.random() - 0.5)*0.5, 0.05, (Math.random() - 0.5)*0.5)), {v:new V3(0, 0.9, 0), life:0.6, size:0.12, grow:0.3}); });
  await sealHunt(fd, first);
  sfx.splash(); splash(12, 1.8);
  const fish = makeSeaFish(fd); fish.position.copy(hole); fish.scale.setScalar(1.4); scene.add(fish);
  // улов записываем сразу: вдруг вкладку закроют посреди полёта рыбки
  const sea = save.sea, fresh = !sea.got.includes(fd.id);
  sea.n++; if(!fd.food) sea.r = sea.n;
  if(fresh) sea.got.push(fd.id);
  persist();
  await Promise.all([
    tween(0.5, k => { fish.position.y = hole.y + Math.sin(k*Math.PI/2)*1.1; fish.rotation.z = Math.sin(k*Math.PI*4)*0.4; }, ease.out),
    diver ? huntDiveOut(diver, back, hole) : null]);
  return {fd, fish, fresh};
}
// карточка «новая рыбка»: картинка, имя, короткий факт (первый улов каждого вида)
const seaThumbs = {};
function seaThumb(fd){ return seaThumbs[fd.id] || (seaThumbs[fd.id] = objThumb(makeSeaFish(fd), new V3(0, 0.15, 1))); }
async function seaCard(fd){
  mgOpen(fd.food ? L('Новая рыбка!', 'A new fish!') : fd.isle ? L('Редкая рыбка! ✨', 'A rare fish! ✨') : L('Привет из тёплых морей!', 'Hello from the warm seas!'));
  const panel = mgNode('div', 'mg-panel walk-end sea-card', `
    <img src="${seaThumb(fd)}" alt="${fd.name}">
    <p class="ttl display">${fd.name}</p>
    <p class="fact">${fd.fact}</p>
    <p class="tip">${fd.isle ? (save.home.rooms && save.home.rooms.ocean ? L('Редкая рыбка острова! Теперь она плавает за стеклом в 🐠 океанариуме', 'A rare island fish! Now it swims behind the glass in the 🐠 oceanarium')
        : L('Редкая рыбка острова! Когда в иглу появится 🐠 океанариум, она поселится там', 'A rare island fish! When the igloo gets a 🐠 oceanarium, it will move in there'))
      : fd.food ? L('Тюлени едят её на обед 🐟', 'Seals eat it for lunch 🐟')
      : L('Эту рыбку принесло тёплое течение. Теперь она будет жить в аквариуме в домике малыша 🏠', 'A warm current brought this fish here. Now it will live in the tank in the pup’s igloo 🏠')}</p>
    <p class="got">${L(`Рыбки моря: ${save.sea.got.length} из ${SEA_FISH.length}`, `Sea fish: ${save.sea.got.length} of ${SEA_FISH.length}`)}</p>
    <button class="btn" id="seaOk">${L('Ура!', 'Yay!')}</button>`);
  sfx.good();
  await new Promise(r => mgOn(panel.querySelector('#seaOk'), 'click', r));
  sfx.tap(); panel.classList.add('away'); await wait(0.25); mgClose();
}
// после улова: новая рыбка — карточка; южная гостья улетает в ведёрко (оттуда — в аквариум), северная — на обед
// eatAt() — куда лететь рыбке на обед (рот); возвращает true, если рыбку съели
async function fishLand(c, eatAt){
  if(c.fresh) await seaCard(c.fd);
  else floatText(c.fd.name + '!', c.fish.position.clone().add(new V3(0, 0.5, 0)), '#2F7FB8');
  if(c.fd.food){
    await flyTo(c.fish, c.fish.position.clone(), eatAt(), 0.8, 1.2, 10);
    await tween(0.12, k => c.fish.scale.setScalar(1.4*(1 - k))); scene.remove(c.fish);
    return true;
  }
  if(!c.fresh) toast(L(`${c.fd.name} — опять в гостях! Отпускаем в аквариум`, `${c.fd.name} is visiting again! Off to the tank`));
  await tween(0.6, k => { c.fish.position.y += 0.02; c.fish.scale.setScalar(1.4*(1 - k)); c.fish.rotation.y = k*Math.PI*4; });
  sfx.whoosh(); scene.remove(c.fish);
  return false;
}
async function mgFishing(s){
  s.shake = -0.35;   // тюлень смотрит на лунку
  const c = await fishCast({hole:HOLE, cam:[new V3(-0.75, 0.85, 0.95), 2.9, -0.25]});
  if(!await fishLand(c, () => worldOf(s, s.mouthLocal))){   // гостью не едят: обед — из ведёрка
    const f = makeFish();
    await flyTo(f, bucket.position.clone().add(new V3(0, 0.3, 0)), worldOf(s, s.mouthLocal), 0.9, 1.2, 10);
    await tween(0.12, k => f.scale.setScalar(1 - k)); scene.remove(f);
  }
  sfx.chomp();
  if(c.fd.food && Math.random() < 0.35){   // вторая рыбка прыгает в ведро и копится там
    const extra = makeFish(); extra.scale.setScalar(0.7);
    await flyTo(extra, HOLE.clone(), bucket.position.clone().add(new V3(0, 0.25, 0)), 1.0, 1.8, 12);
    scene.remove(extra); save.fish++; persist(); renderBucket(); sfx.pop();
    toast(L(`И ещё одна — в ведро! Там ${save.fish} ${plural(save.fish, 'рыбка', 'рыбки', 'рыбок')}`, `And one more goes in the bucket! It holds ${save.fish} ${plural(save.fish, '', '', '', 'fish', 'fish')} now`));
  }
  s.shake = 0;
}

/* ---------- Шарфик: выбрать цвет и узор (видно в альбоме) ---------- */
async function mgScarf(s){
  let color = SCARF_COLORS[Math.floor(Math.random()*SCARF_COLORS.length)], pattern = 'stripes';
  const pats = SCARF_PATTERNS.concat(SHOP.filter(x => x.kind === 'scarf' && owns(x.id)).map(x => x.id));   // + узоры из лавки
  setScarf(s, color, pattern);
  focusCam(worldOf(s, new V3(0, -0.75, 0.3)), 2.3, 0.85);
  s.scarf.visible = true; sfx.whoosh();
  await tween(0.6, k => s.scarf.scale.setScalar(Math.max(0.001, k)), ease.back);

  mgOpen(L('Выбери шарфик', 'Pick a scarf'));
  const panel = mgNode('div', 'mg-panel picker', `
    <p class="row-lbl">${L('Цвет', 'Color')}</p>
    <div class="swatches">${SCARF_COLORS.map(c => `<button class="swatch" data-c="${c}" style="--c:${c}" aria-label="${L('Цвет', 'Color')}"></button>`).join('')}</div>
    <p class="row-lbl">${L('Узор', 'Pattern')}</p>
    <div class="patterns${pats.length > 4 ? ' many' : ''}">${pats.map(p => `<button class="pat ${p}" data-p="${p}" aria-label="${L('Узор', 'Pattern')}">${PAT_LABEL[p] || ''}</button>`).join('')}</div>
    <button class="btn" id="scarfDone">${L('Готово ✓', 'Done ✓')}</button>`);
  const render = () => {
    const ink = color === '#F5F1E8' ? '#FF7A9C' : '#FFFFFF';
    panel.querySelectorAll('.swatch').forEach(b => b.classList.toggle('sel', b.dataset.c === color));
    panel.querySelectorAll('.pat').forEach(b => { b.classList.toggle('sel', b.dataset.p === pattern); b.style.setProperty('--c', color); b.style.setProperty('--p', ink); });
    setScarf(s, color, pattern);
  };
  render();
  const wiggleScarf = () => { sfx.pop(); tween(0.3, k => s.scarf.scale.setScalar(1 + Math.sin(k*Math.PI)*0.12), ease.lin); };
  panel.querySelectorAll('.swatch').forEach(b => mgOn(b, 'click', () => { color = b.dataset.c; render(); wiggleScarf(); }));
  panel.querySelectorAll('.pat').forEach(b => mgOn(b, 'click', () => { pattern = b.dataset.p; render(); wiggleScarf(); }));
  await new Promise(r => mgOn(panel.querySelector('#scarfDone'), 'click', r)); mgEnding = true;
  panel.classList.add('away'); await wait(0.3);
  mgClose();
  S.scarf = {color, pattern};
}

/* ---------- Лупа: водить по тюленю и найти, что болит ---------- */
// где искать каждый симптом: несколько точек, и каждая — там, где что-то нарисовано
// (капля пота и красные щёки при жаре, пузырь-мысль с рыбкой и урчащее пузико у голодного, обе ласты у замёрзшего)
const wpos = o => o.getWorldPosition(new V3());
const HOTSPOT = {
  fever:  s => [worldOf(s, new V3(0, 0.62, 0.45)), wpos(s.sweat), worldOf(s, new V3(0.5, -0.05, 0.7)), worldOf(s, new V3(-0.5, -0.05, 0.7))],
  sneeze: s => s.hat.visible ? [worldOf(s, s.noseLocal), wpos(s.hat)] : [worldOf(s, s.noseLocal)],
  scratch:s => [wpos(s.scratch)],
  hungry: s => [wpos(s.rumble), s.inner.localToWorld(new V3(0.4, 0.35, 1.05)), wpos(s.bubble)],
  cold:   s => [...s.flippers.map(f => wpos(f.children[0])), ...s.frost.map(wpos)]
};
// Найти должно быть легко: навела на примету — через ~0,3 с готово, даже если ведёшь лупу не останавливаясь
// (прогресс тает медленно, так что два-три прохода по месту тоже считаются)
const HOT_R = 74, HOT_T = 0.3;   // радиус «попал лупой», px, и сколько секунд держать
// ближайшая к лупе точка симптома (для подсказки — ближайшая к центру тюленя)
function hotNear(s, a, x, y){
  let best = null, bd = 1e9, bw = null;
  for(const v of HOTSPOT[a](s)){ const p = toScreen(v), d = Math.hypot(p.x - x, p.y - y); if(d < bd){ bd = d; best = p; bw = v; } }
  return {p:best, d:bd, w:bw};
}
// секретик: в одном из этих мест (координаты тела) под лупой прячется ракушка, место иногда блестит.
// Места выбраны так, чтобы их было видно при осмотре и они не совпадали с симптомами.
const SECRET_SPOTS = [new V3(1.45, 0.5, 0.4), new V3(0, 0.25, 1.2), new V3(-1.3, 0.2, 1.2)];
async function mgLupa(s, ailments, onFound, onSecret){
  focusCam(worldOf(s, new V3(0, -0.55, 0)), 3.1, -0.55);
  mgOpen(L('Води лупой по тюленю — найди, что болит', 'Move the magnifier over the seal — find what hurts'), {card:true, hintBottom:true});
  const lens = mgNode('div', 'lens idle', '<div class="ring"></div>');
  const target = mgNode('div', 'target'); target.hidden = true;
  const place = (el, x, y) => { el.style.left = x + 'px'; el.style.top = y + 'px'; };
  let lx = innerWidth/2, ly = innerHeight*0.62, touched = false, down = false, finish;
  place(lens, lx, ly);
  const left = new Set(ailments), prog = {}, done = new Promise(r => finish = r);
  let lastFind = now, lastGiggle = now, lensMouse = false, lastHot = null, ouchT = 0;
  const secretAt = SECRET_SPOTS[Math.floor(Math.random()*SECRET_SPOTS.length)];
  let secret = onSecret ? 0 : -1, sparkT = 1;   // -1 — уже найден (или не нужен)
  const secretPos = () => s.inner.localToWorld(secretAt.clone());
  const move = e => {
    touched = true; lensMouse = e.pointerType === 'mouse'; lens.classList.remove('idle');
    lx = e.clientX; ly = e.clientY - 70;   // лупа над пальцем, чтобы палец её не закрывал
    place(lens, lx, ly);
  };
  // пальцем ищем, только пока он на экране: отпустила — лупа лежит и сама ничего не находит
  mgOn(mgRoot, 'pointerdown', e => { down = true; move(e); });
  mgOn(mgRoot, 'pointermove', e => { if(e.buttons || e.pointerType === 'touch' || touched) move(e); });
  for(const ev of ['pointerup', 'pointercancel']) mgOn(mgRoot, ev, e => { if(e.pointerType !== 'mouse') down = false; });
  mgTick(dt => {
    const looking = touched && (down || lensMouse);
    let hot = null, hd = HOT_R;
    for(const a of left){ const d = hotNear(s, a, lx, ly).d; if(d < hd){ hd = d; hot = a; } }
    for(const a of left) if(a !== hot) prog[a] = Math.max(0, (prog[a] || 0) - dt*0.35);
    if(hot && looking && hot !== lastHot && now > ouchT){ ouchT = now + 0.8; sfx.tick(); squash(s, 0.05, 0.18); }   // сразу откликается: «тут что-то есть»
    lastHot = looking ? hot : null;
    if(hot && looking){
      prog[hot] = (prog[hot] || 0) + dt/HOT_T;
      if(prog[hot] >= 1){
        left.delete(hot); lastFind = now; target.hidden = true;
        sfx.ding(); squash(s, 0.12, 0.3);
        floatText(SYMPTOMS[hot].name(s.p.f) + '!', hotNear(s, hot, lx, ly).w.add(new V3(0, 0.5, 0)), '#D9527E');
        onFound(hot);
        if(!left.size) return finish();
      }
    } else if(looking && now - lastGiggle > 3){
      const h = toScreen(worldOf(s, new V3()));
      if(Math.hypot(h.x - lx, h.y - ly) < 90){ lastGiggle = now; floatText(L('Хи-хи', 'Hehe'), headTop(s)); }
    }
    if(secret >= 0){
      sparkT -= dt;
      if(sparkT < 0){ sparkT = 1.6 + Math.random(); emit(TEX.star, secretPos(), {v:new V3(0, 0.35, 0.2), life:0.55, size:0.15, spin:4}); }
      const p = toScreen(secretPos());
      if(!hot && looking && Math.hypot(p.x - lx, p.y - ly) < 50){
        secret += dt/0.4;
        if(secret >= 1){
          secret = -1; sfx.ding(); burst(TEX.star, secretPos(), 10, 1.6, 0.24);
          floatText(L('Секретик!', 'A secret!'), secretPos().add(new V3(0, 0.5, 0)), '#C9962E');
          onSecret(p);
        }
      } else secret = Math.max(0, secret - dt);
    }
    lens.querySelector('.ring').style.setProperty('--p', hot ? Math.min(1, prog[hot]) : secret > 0 ? Math.min(1, secret) : 0);
    // долго ничего не находится — подсвечиваем, где искать
    if(left.size && now - lastFind > 7){ const c = toScreen(worldOf(s, new V3())), p = hotNear(s, [...left][0], c.x, c.y).p; target.hidden = false; place(target, p.x, p.y); }
  });
  await done; mgEnding = true;
  await wait(0.6);
  mgClose();
}

/* ---------- Платочек: поймать «апчхи», пока шапку не сдуло ----------
   Не отдельный экран, а событие во время лечения: у чихающего пациента раз в 5–7 с
   начинается «А… а…» и рядом с носом появляется платок. Успела нажать — «Будь здоров!»,
   не успела — чих сдувает шапочку, и она смешно падает обратно. */
const tissueBtn = document.createElement('button');
tissueBtn.className = 'tissue'; tissueBtn.hidden = true; tissueBtn.setAttribute('aria-label', L('Платочек', 'Tissue'));
tissueBtn.innerHTML = `🤧<small>${L('Платок!', 'Tissue!')}</small>`;
$('#app').appendChild(tissueBtn);
let tissueHintShown = false;
tissueBtn.addEventListener('click', () => { if(S && S.seal.windup) achoo(S.seal, true); });
function sneezeTick(s, dt, active){
  if(!active){ if(s.windup){ s.windup = null; tissueBtn.hidden = true; s.sneezeNod = 0; } return; }
  if(!s.windup){
    s.sneezeT -= dt;
    if(s.sneezeT < 0){ s.windup = {t:0}; floatText(L('А… а…', 'Ah… ah…'), headTop(s)); tissueBtn.hidden = false; }
    return;
  }
  const w = s.windup; w.t += dt;
  s.sneezeNod = -0.25*Math.min(1, w.t/1.2);
  const p = toScreen(worldOf(s, s.noseLocal));
  tissueBtn.style.left = Math.min(innerWidth - 46, p.x + 105) + 'px'; tissueBtn.style.top = p.y - 30 + 'px';   // сбоку от мордочки
  if(w.t > 2.2) achoo(s, false);   // ~2 с на то, чтобы нажать
}
async function achoo(s, caught){
  s.windup = null; tissueBtn.hidden = true; s.sneezeT = 5 + Math.random()*2;
  const nz = worldOf(s, s.noseLocal);
  if(caught){
    sfx.sneezeSoft(); burst(TEX.star, nz, 6, 1.4, 0.24);
    floatText(L('Будь здоров!', 'Bless you!'), headTop(s), '#2F9E72');
    addShells(1, toScreen(nz));
    await tween(0.15, k => s.sneezeNod = -0.25 + 0.35*k);
    await tween(0.35, k => s.sneezeNod = 0.1*(1 - k));
    return;
  }
  sfx.sneeze();
  for(let i = 0; i < 6; i++) emit(TEX.puff, nz, {v:new V3((Math.random()-0.5)*1.2, Math.random()*0.6, 1 + Math.random()), life:0.8, size:0.35, grow:1.5});
  floatText(L('Апчхи!', 'Achoo!'), headTop(s));
  if(!tissueHintShown){ tissueHintShown = true; toast(L('Лови чих платочком — жми на платок 🤧', 'Catch the sneeze with the tissue — tap it 🤧')); }
  const hat = s.hat, base = hat.userData.base;
  const nod = tween(0.15, k => s.sneezeNod = -0.25 + 0.6*k).then(() => tween(0.4, k => s.sneezeNod = 0.35*(1 - k)));
  if(hat.visible){   // шапка взлетает, крутится и шлёпается обратно
    await tween(0.55, k => { hat.position.set(base.x, base.y + Math.sin(k*Math.PI/2)*1.3, base.z - k*0.2); hat.rotation.z = 0.18 + k*Math.PI*2; }, ease.out);
    await tween(0.45, k => { hat.position.set(base.x, base.y + 1.3*(1 - k*k), base.z - 0.2*(1 - k)); }, ease.lin);
    hat.position.copy(base); hat.rotation.z = 0.18; sfx.pop(); squash(s, 0.12, 0.25);
  }
  await nod;
}

/* ---------- Объятие-поглаживание (просьба папы 27.09) ----------
   Не просто нажать, а подержать пальчик на тюлене и погладить: вокруг заполняется кольцо-сердечко,
   тюлень жмурится, тянется к пальцу и мурлычет, из-под пальца вылетают ♡, телефон чуть вибрирует.
   Просто держать — тоже можно (≈3 с), гладить — быстрее (≈1,5–2 с). Отпустила — кольцо медленно тает, не сбрасывается.
   e0 — касание, с которого начали (нажали прямо на тюленя): тогда гладим сразу, без второго нажатия.
   o — для не-тюленей (Туча в cloudcure.js): at() — центр, r — радиус в мире, top() — над головой, say — что скажет. */
const HUG_HOLD = 0.3, HUG_RUB = 0.0008, HUG_FADE = 0.12;   // за секунду держания, за пиксель поглаживания, таяние без пальца
async function strokeHug(s, e0, hint, o = {}){
  mgOpen(hint || L('Погладь пальчиком и не отпускай ♡', 'Stroke with your finger and hold on ♡'));
  const at = o.at || (() => worldOf(s, new V3(0, -0.4, 0))), top = o.top || (() => headTop(s));
  const edge = o.r ? () => at().add(new V3(o.r, 0, 0)) : () => worldOf(s, new V3(1.3, -0.4, 0));
  const rad = () => { const a = toScreen(at()), b = toScreen(edge()); return Math.max(85, Math.min(170, Math.hypot(b.x - a.x, b.y - a.y))); };
  const eyes = s.eyes || [], eye0 = eyes.map(e => e.scale.y), lean0 = s.inner.rotation.z;
  const ring = mgNode('div', 'circle-hint hug-ring'), R = rad();
  ring.style.cssText = `width:${2*R}px;height:${2*R}px;margin:${-R}px 0 0 ${-R}px`;
  const un = pin(ring, at);
  let p = 0, down = null, last = null, t0 = 0, heartT = 0, purrT = 0, said = false, lean = 0, finish;
  const on = e => { const q = toScreen(at()); return Math.hypot(e.clientX - q.x, e.clientY - q.y) < rad() + 30; };
  const buzz = ms => { try{ navigator.vibrate && navigator.vibrate(ms); }catch(err){} };
  const start = e => {
    if(!on(e)){ mgHint(L('Тюлень — в кружочке ♡', 'The seal is inside the circle ♡')); return; }
    down = e.pointerId; last = {x:e.clientX, y:e.clientY}; t0 = now; buzz(12);
  };
  const heart = (x, y) => {
    const h = mgNode('div', 'hug-heart', '♡'); h.style.left = x + 'px'; h.style.top = y + 'px';
    h.style.setProperty('--dx', (Math.random()*60 - 30) + 'px'); setTimeout(() => h.remove(), 900);
  };
  mgOn(mgRoot, 'pointerdown', start);
  mgOn(window, 'pointermove', e => {
    if(down === null || e.pointerId !== down) return;
    if(!on(e)){ last = {x:e.clientX, y:e.clientY}; return; }
    const d = Math.min(60, Math.hypot(e.clientX - last.x, e.clientY - last.y)); last = {x:e.clientX, y:e.clientY};
    p += d*HUG_RUB;
  });
  const up = e => {
    if(down === null || e.pointerId !== down) return;
    if(now - t0 < 0.3 && p < 0.3) mgHint(L('Не отпускай — погладь пальчиком ♡', 'Don\'t let go — stroke with your finger ♡'));
    down = null;
  };
  mgOn(window, 'pointerup', up); mgOn(window, 'pointercancel', up);
  if(e0 && on(e0)) start(e0);
  mgTick(dt => {
    const q = toScreen(at());
    if(down !== null){
      p += dt*HUG_HOLD;
      heartT -= dt; purrT -= dt;
      if(heartT <= 0){ heartT = 0.22; heart(last.x, last.y - 20); }
      if(purrT <= 0){ purrT = 0.55; sfx.purr(); buzz(8); }
      if(!said && p > 0.5){ said = true; floatText(o.say || (s.p && s.p.peng ? L('Кря-а ♡', 'Qua-ack ♡') : L('Мур-р ♡', 'Purr ♡')), top(), '#D9527E'); }
      eyes.forEach((e, i) => e.scale.y = eye0[i]*0.3); s.blinkT = 2;   // зажмурился от удовольствия
      lean += (Math.max(-1, Math.min(1, (last.x - q.x)/R))*-0.18 - lean)*Math.min(1, dt*8);
      s.wobble = Math.sin(now*9)*0.03; s.flap = 0.25;
    } else {
      p = Math.max(0, p - dt*HUG_FADE);
      eyes.forEach((e, i) => e.scale.y = eye0[i]);
      lean += (0 - lean)*Math.min(1, dt*6); s.wobble = 0;
    }
    s.inner.rotation.z = lean0 + lean;
    ring.style.setProperty('--p', Math.min(1, p));
    if(p >= 1 && finish) finish();
  });
  await new Promise(r => finish = r);
  finish = null; un(); mgClose(); buzz([20, 40, 30]);
  eyes.forEach((e, i) => e.scale.y = eye0[i]); s.inner.rotation.z = lean0; s.wobble = 0;
}
