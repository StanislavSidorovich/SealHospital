/* ---------------- мини-игры лечения (Фаза 1) ----------------
   Каждая мини-игра — async-функция: кладёт свой интерфейс в слой #mg, ждёт, пока игрок
   справится, и убирает за собой. Проиграть нельзя: ошибка = подсказка и новая попытка.
   Подключается после seal.js и до game.js: S, busy, toast, focusCam берутся из game.js уже во время игры. */
const mgRoot = $('#mg'), mgStage = $('#mgStage'), mgHintEl = $('#mgHint');
const mgTicks = new Set();   // покадровые обработчики, loop() в game.js вызывает их с dt
let mgCleanup = [];

// card:true — карта пациента остаётся на экране (подсказку тогда лучше опустить вниз: hintBottom)
function mgOpen(hint, {card = false, hintBottom = false} = {}){
  mgStage.innerHTML = ''; mgRoot.hidden = false;
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
function mgOn(el, type, fn){ el.addEventListener(type, fn); mgCleanup.push(() => el.removeEventListener(type, fn)); }
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

  mgOpen('Нажми и держи 👆');
  const gauge = mgNode('div', 'gauge-wrap', '<span class="ic">🌡️</span><div class="gauge"><div class="zone"></div><div class="fill"></div></div>').lastChild;
  const hold = mgNode('button', 'hold display', '<span class="big">👆</span>Держи');
  hold.setAttribute('aria-label', 'Держи, чтобы измерить температуру');
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
    if(level > 0.08){ sfx.bad(); wiggle(gauge); mgHint('Ещё чуть-чуть! Держи подольше'); }
  };
  mgOn(mgRoot, 'pointerdown', press);
  for(const ev of ['pointerup', 'pointercancel', 'pointerleave']) mgOn(mgRoot, ev, release);
  mgTick(dt => {
    if(holding){
      level += dt*SPEED;
      if(level >= 1){   // перебор: мягко сбрасываем, без наказания
        level = 0.2; holding = false; hold.classList.remove('on');
        sfx.bad(); wiggle(gauge); mgHint('Ой, перебор! Отпусти на зелёном');
      } else if(level - lastTick > 0.08){ lastTick = level; sfx.tick(); }
      if(level >= Z0 && level <= Z1) mgHint('Отпускай!');
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
  floatText('38,5°', headTop(s), '#D9364F');
  await wait(0.9);
  await tween(0.3, k => th.scale.setScalar(1 - k)); scene.remove(th);
  toast('Жар 38,5°! Теперь дай лекарство.');
}

/* ---------- Лекарство: налить сироп в ложку по рецепту ---------- */
const SYRUPS = [
  {id:'rasp', c:'#FF8FB1', hex:0xFF8FB1, ic:'🍓', name:'Малиновый'},
  {id:'bana', c:'#FFD66B', hex:0xFFD66B, ic:'🍌', name:'Банановый'},
  {id:'mint', c:'#86DDB5', hex:0x86DDB5, ic:'🌿', name:'Мятный'},
  {id:'blue', c:'#A5B3F7', hex:0xA5B3F7, ic:'🫐', name:'Черничный'}
];
async function mgMedicine(s){
  const recipe = SYRUPS.slice().sort(() => Math.random() - 0.5).slice(0, 3);
  focusCam(worldOf(s, new V3(0, 0, 0)), 2.6, 1.0);
  mgOpen('Налей сироп по рецепту');
  const panel = mgNode('div', 'mg-panel', `
    <div class="recipe"><span>Рецепт:</span>${recipe.map((r, i) => `${i ? '<span class="arr">→</span>' : ''}<i style="--c:${r.c}">${r.ic}</i>`).join('')}</div>
    <div class="spoon"><div class="bowl">${recipe.map(r => `<b style="--c:${r.c}"></b>`).join('')}</div><div class="handle"></div></div>
    <div class="bottles">${SYRUPS.map(r => `<button class="bottle" data-id="${r.id}" aria-label="${r.name} сироп"><span class="cap"></span><span class="neck"></span><span class="body" style="--c:${r.c}">${r.ic}</span></button>`).join('')}</div>`);
  const steps = [...panel.querySelectorAll('.recipe i')], layers = [...panel.querySelectorAll('.bowl b')];
  let step = 0, pouring = false, finish;
  const done = new Promise(r => finish = r);
  const mark = () => steps.forEach((el, i) => { el.classList.toggle('ok', i < step); el.classList.toggle('now', i === step); });
  mark();
  panel.querySelectorAll('.bottle').forEach(b => mgOn(b, 'click', async () => {
    if(pouring || step >= recipe.length) return;
    const want = recipe[step];
    if(b.dataset.id !== want.id){
      sfx.bad(); wiggle(b); mgHint(`Сейчас нужен ${want.ic} — посмотри рецепт!`); return;
    }
    pouring = true; sfx.pour();
    b.classList.remove('pour'); void b.offsetWidth; b.classList.add('pour');
    await wait(0.25);
    layers[step].classList.add('in'); step++; mark();
    await wait(0.3); pouring = false;
    if(step < recipe.length) mgHint(step === 1 ? 'Так! Теперь следующий' : 'Ещё один!');
    else finish();
  }));
  await done;
  panel.querySelector('.spoon').classList.add('full'); sfx.good(); mgHint('Готово! Даём лекарство');
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
