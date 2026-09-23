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

  mgOpen('Протри ранку пальцем');
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
    if(!giggled && d > 0 && dirt.some(x => !x.visible)){ giggled = true; floatText('Хи-хи!', headTop(s)); }
  });
  for(const ev of ['pointerup', 'pointercancel']) mgOn(mgRoot, ev, () => { down = false; cotton.classList.remove('on'); });
  mgTick(() => { const c = toScreen(worldPos(s.plaster)); place(finger, c.x, c.y); });
  await cleaned;
  dirt.forEach(d => { s.head.remove(d); d.material.dispose(); });
  mgClose(); sfx.good(); floatText('Чисто!', headTop(s));
  await wait(0.7);

  mgOpen('Перетащи пластырь на ранку');
  const target = mgNode('div', 'target'), pl = mgNode('div', 'plaster-drag');
  pl.setAttribute('aria-label', 'Пластырь');
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
    sfx.bad(); mgHint('Почти! Неси прямо на ранку');
    pl.classList.add('back'); pl.style.left = ''; pl.style.top = ''; pl.style.bottom = ''; pl.style.marginLeft = '';
  };
  mgOn(pl, 'pointerup', drop); mgOn(pl, 'pointercancel', drop);
  await placed;
  mgClose();
  s.plaster.visible = true; s.plaster.scale.setScalar(0.01); sfx.pop();
  await tween(0.4, k => s.plaster.scale.setScalar(Math.max(0.01, k)), ease.back);
}

/* ---------- Рыбалка: жди, пока поплавок нырнёт, и жми ---------- */
async function mgFishing(s){
  focusCam(new V3(-0.75, 0.85, 0.95), 2.9, -0.25);
  s.shake = -0.35;   // тюлень смотрит на лунку
  const rod = new THREE.Group();
  const stick = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 1.5, 8), toon(0xE0A36B)), 1.15);
  stick.position.y = 0.75; rod.add(stick);
  rod.position.set(-2.35, 0.25, 2.0); rod.rotation.set(-0.35, 0, -0.55); scene.add(rod);
  const tip = () => stick.localToWorld(new V3(0, 0.75, 0));
  const bob = makeBobber(); bob.position.copy(HOLE); bob.position.y = 1.4; scene.add(bob);
  const lineGeo = new THREE.BufferGeometry().setFromPoints([new V3(), new V3()]);
  const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({color:INK})); scene.add(line);
  const drawLine = () => { rod.updateMatrixWorld(true); lineGeo.setFromPoints([tip(), bob.position.clone().add(new V3(0, 0.2, 0))]); };
  const baseY = HOLE.y + 0.02;
  await tween(0.5, k => { bob.position.y = 1.4 + (baseY - 1.4)*k; drawLine(); }, ease.out);
  sfx.plop(); emit(TEX.puff, HOLE.clone().add(new V3(0, 0.1, 0)), {v:new V3(0, 0.6, 0), life:0.6, size:0.5, grow:1});

  mgOpen('Жди… Когда поплавок нырнёт — жми!');
  const pull = mgNode('button', 'btn pull', 'Тяни! 🎣'); pull.hidden = true;
  // state: wait → bite → (поймал | уплыла → wait)
  let state = 'wait', until = now + 1.6 + Math.random()*1.8, nibbleAt = now + 0.8 + Math.random(), misses = 0, finish;
  const caught = new Promise(r => finish = r);
  const toWait = () => { state = 'wait'; until = now + 1.2 + Math.random()*1.6; nibbleAt = now + 0.6 + Math.random()*0.6; pull.hidden = true; };
  const tap = e => {
    e.preventDefault();
    if(state === 'bite'){ state = 'done'; pull.hidden = true; finish(); }
    else if(state === 'wait') mgHint('Ещё рано! Жди, когда нырнёт');
  };
  mgOn(mgRoot, 'pointerdown', tap);
  mgTick(() => {
    let y = baseY + Math.sin(now*3)*0.015;
    if(state === 'wait'){
      if(now > nibbleAt && now < nibbleAt + 0.18) y -= 0.035;              // клюёт понарошку
      else if(now >= nibbleAt + 0.18) nibbleAt = now + 0.7 + Math.random()*0.8;
      if(now > until){
        state = 'bite'; until = now + 1.8; sfx.plop(); pull.hidden = false;
        floatText('!', HOLE.clone().add(new V3(0, 0.9, 0)), '#D9364F');
        burst(TEX.puff, HOLE.clone().add(new V3(0, 0.1, 0)), 5, 0.8, 0.35);
      }
    } else if(state === 'bite'){
      y -= 0.13;
      if(now > until){
        misses++; toWait();
        mgHint(misses > 1 ? 'Жми сразу, как только нырнёт!' : 'Уплыла! Сейчас клюнет ещё');
      }
    }
    bob.position.y = y; drawLine();
  });
  await caught;
  mgClose();
  sfx.splash(); burst(TEX.puff, HOLE.clone().add(new V3(0, 0.1, 0)), 10, 1.6, 0.45);
  const fish = makeFish(); fish.rotation.y = 0.6;
  scene.remove(bob, line); lineGeo.dispose();
  const bonus = Math.random() < 0.4;
  if(bonus){   // вторая рыбка прыгает в ведро и копится там
    const extra = makeFish(); extra.scale.setScalar(0.7);
    flyTo(extra, HOLE.clone(), bucket.position.clone().add(new V3(0, 0.25, 0)), 1.0, 1.8, 12).then(() => {
      scene.remove(extra); save.fish++; persist(); renderBucket(); sfx.pop();
      toast(`И ещё одна — в ведро! Там ${save.fish} ${plural(save.fish, 'рыбка', 'рыбки', 'рыбок')}`);
    });
  }
  await flyTo(fish, HOLE.clone(), worldOf(s, s.mouthLocal), 0.9, 1.4, 10);
  await tween(0.12, k => fish.scale.setScalar(1 - k)); scene.remove(fish);
  scene.remove(rod); s.shake = 0;
  if(bonus) await wait(0.3);
}

/* ---------- Шарфик: выбрать цвет и узор (видно в альбоме) ---------- */
async function mgScarf(s){
  let color = SCARF_COLORS[Math.floor(Math.random()*SCARF_COLORS.length)], pattern = 'stripes';
  setScarf(s, color, pattern);
  focusCam(worldOf(s, new V3(0, -0.75, 0.3)), 2.3, 0.85);
  s.scarf.visible = true; sfx.whoosh();
  await tween(0.6, k => s.scarf.scale.setScalar(Math.max(0.001, k)), ease.back);

  mgOpen('Выбери шарфик');
  const panel = mgNode('div', 'mg-panel picker', `
    <p class="row-lbl">Цвет</p>
    <div class="swatches">${SCARF_COLORS.map(c => `<button class="swatch" data-c="${c}" style="--c:${c}" aria-label="Цвет"></button>`).join('')}</div>
    <p class="row-lbl">Узор</p>
    <div class="patterns">${SCARF_PATTERNS.map(p => `<button class="pat ${p}" data-p="${p}" aria-label="Узор">${p === 'hearts' ? '♥♥' : ''}</button>`).join('')}</div>
    <button class="btn" id="scarfDone">Готово ✓</button>`);
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
  await new Promise(r => mgOn(panel.querySelector('#scarfDone'), 'click', r));
  panel.classList.add('away'); await wait(0.3);
  mgClose();
  S.scarf = {color, pattern};
}

/* ---------- Лупа: водить по тюленю и найти, что болит ---------- */
// где искать каждый симптом (точки на тюлене в координатах мира)
const HOTSPOT = {
  fever:  s => worldOf(s, new V3(0, 0.62, 0.45)),
  sneeze: s => worldOf(s, s.noseLocal),
  scratch:s => s.scratch.getWorldPosition(new V3()),
  hungry: s => s.inner.localToWorld(new V3(0.72, 0.5, 0.85)),
  cold:   s => s.flippers[0].children[0].getWorldPosition(new V3())
};
async function mgLupa(s, ailments, onFound){
  focusCam(worldOf(s, new V3(0, -0.55, 0)), 3.1, -0.55);
  mgOpen('Води лупой по тюленю — найди, что болит', {card:true, hintBottom:true});
  const lens = mgNode('div', 'lens idle', '<div class="ring"></div>');
  const target = mgNode('div', 'target'); target.hidden = true;
  const place = (el, x, y) => { el.style.left = x + 'px'; el.style.top = y + 'px'; };
  let lx = innerWidth/2, ly = innerHeight*0.62, touched = false, finish;
  place(lens, lx, ly);
  const left = new Set(ailments), prog = {}, done = new Promise(r => finish = r);
  let lastFind = now, lastGiggle = now;
  const move = e => {
    touched = true; lens.classList.remove('idle');
    lx = e.clientX; ly = e.clientY - 70;   // лупа над пальцем, чтобы палец её не закрывал
    place(lens, lx, ly);
  };
  mgOn(mgRoot, 'pointerdown', move);
  mgOn(mgRoot, 'pointermove', e => { if(e.buttons || e.pointerType === 'touch' || touched) move(e); });
  mgTick(dt => {
    let hot = null;
    for(const a of left){
      const p = toScreen(HOTSPOT[a](s));
      if(Math.hypot(p.x - lx, p.y - ly) < 52){ hot = a; break; }
    }
    for(const a of left) if(a !== hot) prog[a] = Math.max(0, (prog[a] || 0) - dt);
    if(hot && touched){
      prog[hot] = (prog[hot] || 0) + dt/0.55;
      if(prog[hot] >= 1){
        left.delete(hot); lastFind = now; target.hidden = true;
        sfx.ding(); squash(s, 0.12, 0.3);
        floatText(SYMPTOMS[hot].name(s.p.f) + '!', HOTSPOT[hot](s).add(new V3(0, 0.5, 0)), '#D9527E');
        onFound(hot);
        if(!left.size) return finish();
      }
    } else if(touched && now - lastGiggle > 3){
      const h = toScreen(worldOf(s, new V3()));
      if(Math.hypot(h.x - lx, h.y - ly) < 90){ lastGiggle = now; floatText('Хи-хи', headTop(s)); }
    }
    lens.querySelector('.ring').style.setProperty('--p', hot ? Math.min(1, prog[hot]) : 0);
    // долго ничего не находится — подсвечиваем, где искать
    if(left.size && now - lastFind > 6){ const p = toScreen(HOTSPOT[[...left][0]](s)); target.hidden = false; place(target, p.x, p.y); }
  });
  await done;
  await wait(0.6);
  mgClose();
}

/* ---------- Платочек: поймать «апчхи», пока шапку не сдуло ----------
   Не отдельный экран, а событие во время лечения: у чихающего пациента раз в 5–7 с
   начинается «А… а…» и рядом с носом появляется платок. Успела нажать — «Будь здоров!»,
   не успела — чих сдувает шапочку, и она смешно падает обратно. */
const tissueBtn = document.createElement('button');
tissueBtn.className = 'tissue'; tissueBtn.hidden = true; tissueBtn.setAttribute('aria-label', 'Платочек');
tissueBtn.innerHTML = '🤧<small>Платок!</small>';
$('#app').appendChild(tissueBtn);
let tissueHintShown = false;
tissueBtn.addEventListener('click', () => { if(S && S.seal.windup) achoo(S.seal, true); });
function sneezeTick(s, dt, active){
  if(!active){ if(s.windup){ s.windup = null; tissueBtn.hidden = true; s.sneezeNod = 0; } return; }
  if(!s.windup){
    s.sneezeT -= dt;
    if(s.sneezeT < 0){ s.windup = {t:0}; floatText('А… а…', headTop(s)); tissueBtn.hidden = false; }
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
    floatText('Будь здоров!', headTop(s), '#2F9E72');
    await tween(0.15, k => s.sneezeNod = -0.25 + 0.35*k);
    await tween(0.35, k => s.sneezeNod = 0.1*(1 - k));
    return;
  }
  sfx.sneeze();
  for(let i = 0; i < 6; i++) emit(TEX.puff, nz, {v:new V3((Math.random()-0.5)*1.2, Math.random()*0.6, 1 + Math.random()), life:0.8, size:0.35, grow:1.5});
  floatText('Апчхи!', headTop(s));
  if(!tissueHintShown){ tissueHintShown = true; toast('Лови чих платочком — жми на платок 🤧'); }
  const hat = s.hat, base = hat.userData.base;
  const nod = tween(0.15, k => s.sneezeNod = -0.25 + 0.6*k).then(() => tween(0.4, k => s.sneezeNod = 0.35*(1 - k)));
  if(hat.visible){   // шапка взлетает, крутится и шлёпается обратно
    await tween(0.55, k => { hat.position.set(base.x, base.y + Math.sin(k*Math.PI/2)*1.3, base.z - k*0.2); hat.rotation.z = 0.18 + k*Math.PI*2; }, ease.out);
    await tween(0.45, k => { hat.position.set(base.x, base.y + 1.3*(1 - k*k), base.z - 0.2*(1 - k)); }, ease.lin);
    hat.position.copy(base); hat.rotation.z = 0.18; sfx.pop(); squash(s, 0.12, 0.25);
  }
  await nod;
}
