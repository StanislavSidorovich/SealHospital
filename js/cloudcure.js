/* ---------------- ☁️ История Тучи (Спринт 5, задача 5; глава 6 «Книги острова») ----------------
   Туча ворчит не просто так. Сквозной приём: «страшилка» → испытания по дням → ей плохо → лечим в больнице → друг.
   1. «Дорога к Туче» (cloudroad.js), три разных дня: в конце каждой дороги Туча чуть-чуть выдаёт себя
      (день 1 — чихнула снежинками, день 2 — «все от меня разбегаются…», день 3 — совсем простыла). save.coop.cs.n = 0…3,
      cs.d — день последнего этапа (за один день — один этап, за выходные не пролетается).
   2. После третьего этапа — бой (coop.js). Победили — Туча плачет дождиком и признаётся: простыла, поэтому чихает
      снегом, и ей одиноко — все от неё прячутся. Малыш зовёт её в больницу → cs.cure = 1.
   3. Больница: Туча — следующий пациент смены. Поймай чих платочком (3 раза) → тёплый чай (неси кружку к ротику) →
      шарфик (покрути пальцем вокруг) → обними (strokeHug). Фото в альбом → cs.cure = 2, Туча — подружка.
   4. Раз в день, когда ныряешь в бухту, Туча поливает подводный сад дождиком: ростки подрастают (cs.rain — день).
      Над уголком малыша добрая Тучка иногда роняет капельки.
   Проиграть нельзя: не успела с платочком — Туча чихнёт на экран снежинками, смешно, и ещё раз.
   Подключается после sharktooth.js (берёт makeCloud/cloudKind из adventure.js, strokeHug из minigames.js). */
const CF_SNEEZES = 3;             // сколько чихов поймать платочком
const CF_SIPS = 3;                // сколько глотков чая
const CF_CURE_SHELLS = 12;
const CF_RAIN_H = 8;              // на сколько часов подрастают ростки от дождика
const CF_SC = 1.15, CF_POS = new V3(0, 1.75, 0.2);
const cfSave = () => save.coop.cs;

/* ---------- 1. Дорога: этап истории (зовёт crFinish у каждого на своём телефоне) ---------- */
// новый этап, если сегодня его ещё не было; возвращает номер этапа 1…3 или 0
function cfRoadBeat(){
  const cs = cfSave(), d = advDayKey();
  if(cs.n >= 3 || cs.d === d) return 0;
  cs.n++; cs.d = d; persist();
  return cs.n;
}
const CF_BEAT_SAY = [null,
  () => L('«Ап… ап… АПЧХИ!» Туча чихнула снежинками 🤧', '“Ah… ah… ACHOO!” The Cloud sneezed snowflakes 🤧'),
  () => L('«Опять вы?! Все от меня разбегаются… а вы — догоняете. Странно…» ☁️', '“You again?! Everyone runs away from me… but you chase me. How odd…” ☁️'),
  () => L('«Апчхи! Апчхи-и!» Туча совсем простыла… 🤧', '“Achoo! Achoo-oo!” The Cloud has a bad cold… 🤧')];
async function cfBeatShow(n, c, at){
  if(!n) return;
  if(n !== 2){ sfx.sneeze(); for(let i = 0; i < 14; i++) emit(CF_FLAKE, at.clone().add(new V3((Math.random() - 0.5)*1.2, -0.4, 0.3)), {v:new V3((Math.random() - 0.5)*3, -1 - Math.random()*1.5, 1 + Math.random()), life:1.4, size:0.22, spin:2}); }
  else sfx.grr();
  await tween(0.6, k => { c.scale.setScalar(0.8*(1 + Math.sin(k*Math.PI)*0.15)); }, ease.lin);
  mgHint(CF_BEAT_SAY[n]());
  await wait(2.8);
  if(n < 3) mgHint(L(`📖 Этап ${n} из 3: почему Туча ворчит? Приходи завтра на новую дорогу!`, `📖 Stage ${n} of 3: why does the Cloud grumble? Come back tomorrow for a new road!`));
  else mgHint(L('📖 Этап 3 из 3! Победите Тучу — и узнаете её тайну', '📖 Stage 3 of 3! Beat the Cloud and learn her secret'));
  await wait(2.4);
}
const CF_FLAKE = emojiTex('❄️');

/* ---------- 2. После боя: тайна Тучи (зовёт coWin) ---------- */
const cfSecretDue = () => cfSave().n >= 3 && cfSave().cure === 0;
async function cfSecret(c, at){
  const cs = cfSave(); if(!cfSecretDue()) return;
  cs.cure = 1; persist();
  let t = 0; const drops = dt => { if((t -= dt) < 0){ t = 0.06; emit(TEX.drop, at().add(new V3((Math.random() - 0.5)*1.6, -0.5, 0.3)), {v:new V3(0, -2.4, 0), life:1, size:0.16}); } };
  mgTick(drops);
  sfx.drip(); mgHint(L('Ой… Туча плачет дождиком 💧', 'Oh… the Cloud is crying rain 💧'));
  await wait(2.2); if(!CO) return;
  mgHint(L('«Я не злая… Я простыла — вот и чихаю снегом. И мне одиноко: все от меня прячутся…» ☁️', '“I\'m not mean… I have a cold — that\'s why I sneeze snow. And I\'m lonely: everyone hides from me…” ☁️'));
  await wait(3.8); if(!CO) return;
  const who = save.pet ? save.pet.name : L('Малыш', 'The pup');
  mgHint(L(`${who}: «Прилетай к нам в больницу! Доктор Сабрина тебя вылечит 🩺»`, `${who}: “Come to our hospital! Doctor Sabrina will make you better 🩺”`));
  sfx.arf();
  await wait(3); mgTicks.delete(drops);
}

/* ---------- 3. Больница: Туча — пациентка ---------- */
const cloudDue = () => cfSave().cure === 1 && !!shift && shift.n < SHIFT_SIZE;
async function spawnCloud(){
  S = null; setBusy(true);
  $('#card').hidden = true; $('#tools').hidden = true; $('#wardrobe').hidden = true;
  const c = makeCloud(), u = c.userData; cloudKind(c, false); c.scale.setScalar(CF_SC); scene.add(c);
  u.mouth.rotation.z = 0; u.brows.forEach(b => b.rotation.z *= -0.6);   // не сердитая — несчастная
  const eye0 = u.eyes[0].scale.y;
  let bob = 1, puff = 0, scarfK = 0;
  const scarf = addOutline(new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.2, 10, 32), toon(0xFF9BB8)), 1.06);
  scarf.rotation.x = Math.PI/2 - 0.15; scarf.position.set(0, -0.45, 0.05); scarf.scale.setScalar(0.01); scarf.visible = false; c.add(scarf);
  const tail = addOutline(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.5, 0.08), toon(0xFF9BB8)), 1.08); tail.position.set(0.55, -0.72, 1.05); tail.rotation.z = 0.2; tail.visible = false; c.add(tail);
  mgOpen('', {hintBottom:true});
  const life = () => {
    c.position.y = CF_POS.y + Math.sin(now*1.6)*0.08*bob;
    const k = 1 + puff*0.18; c.scale.set(CF_SC*k, CF_SC*(1 + puff*0.1), CF_SC*k);
    if(puff > 0.4) u.eyes.forEach(e => e.scale.y = eye0*0.3);   // зажмурилась перед чихом
    else u.eyes.forEach(e => e.scale.y = (now % 3.6) < 0.12 ? eye0*0.15 : eye0);
  };
  mgTick(life);
  const mouth = () => c.localToWorld(new V3(0, -0.2, 1.0));
  // прилетает с неба и опускается над льдиной
  c.position.set(-5, 6, CF_POS.z);
  mgHint(L('Кто это летит? ☁️', 'Who is flying here? ☁️')); sfx.whoosh();
  await tween(2.0, k => { c.position.x = -5*(1 - k); c.position.y = 6 - (6 - CF_POS.y)*k; }, ease.out);
  sfx.sneezeSoft(); floatText(L('Здравствуйте, доктор… Апчхи! 🤧', 'Hello, doctor… Achoo! 🤧'), c.position.clone().add(new V3(0, 1.5, 0)), '#3B3A4A');
  toast(L('Большая Туча прилетела в больницу! Она простыла 🤧', 'The Big Cloud flew to the hospital! She has a cold 🤧'), 3400);
  focusCam(CF_POS.clone().add(new V3(0, -0.3, 0)), 5.4, 0, 0.2);
  await wait(1.8);

  let offs = [];
  const on = (type, fn, el = mgRoot) => { el.addEventListener(type, fn); offs.push(() => el.removeEventListener(type, fn)); };
  const after = () => { offs.forEach(f => f()); offs = []; };
  mgCleanup.push(() => after());
  const near = (e, v, r) => { const q = toScreen(v); return Math.hypot(e.clientX - q.x, e.clientY - q.y) < r; };

  // 1) поймай чих платочком: Туча надувается «ап… ап…» — коснись её ротика, пока не чихнула
  mgHint(L('Туча вот-вот чихнёт! Когда надуется — подставь платочек: нажми у ротика 🤧', 'The Cloud is about to sneeze! When she puffs up — hold out a tissue: tap near her mouth 🤧'));
  await wait(2.2);
  const tissue = mgNode('div', 'cf-tissue'); tissue.hidden = true;
  let caught = 0, miss = 0;
  while(caught < CF_SNEEZES){
    // «ап… ап…» — надувается 1,6 с; в это время касание у ротика ловит чих
    let got = false, early = false;
    const pinT = pin(mgNode('div', 'target'), mouth);
    on('pointerdown', e => {
      if(got || e.target.closest('button')) return;
      if(!near(e, mouth(), 150)){ mgHint(L('Платочек — к ротику Тучи 🤧', 'The tissue goes to the Cloud\'s mouth 🤧')); return; }
      if(puff < 0.15){ early = true; return; }
      got = true;
    });
    // надувается сама (после промаха — чуть медленнее); касание у ротика сразу ловит чих
    floatText(L('Ап…', 'Ah…'), c.position.clone().add(new V3(-0.6, 1.4, 0)), '#3B3A4A');
    const dur = 1.6 + Math.min(3, miss)*0.4;
    await new Promise(r => { let tt = 0, half = false; const f = dt => {
      tt += dt; puff = Math.min(1, tt/dur);
      if(!half && tt > dur/2){ half = true; floatText(L('…ап…', '…ah…'), c.position.clone().add(new V3(0.6, 1.6, 0)), '#3B3A4A'); }
      if(got || tt >= dur){ mgTicks.delete(f); r(); } }; mgTick(f); });
    after(); pinT();
    if(got){
      caught++; tissue.hidden = false; const q = toScreen(mouth()); tissue.style.left = q.x + 'px'; tissue.style.top = q.y + 'px';
      tissue.classList.remove('cf-catch'); void tissue.offsetWidth; tissue.classList.add('cf-catch');
      sfx.sneezeSoft(); burst(TEX.star, mouth(), 8, 1.2, 0.18);
      floatText(caught < CF_SNEEZES ? L('Будь здорова! ✨', 'Bless you! ✨') : L('Уф… Спасибо! ✨', 'Phew… Thank you! ✨'), c.position.clone().add(new V3(0, 1.6, 0)), '#D9527E');
      mgHint(`🤧 ${'●'.repeat(caught)}${'○'.repeat(CF_SNEEZES - caught)}`);
    } else {
      miss++; sfx.sneeze(); cfFlakesOnScreen();
      for(let i = 0; i < 16; i++) emit(CF_FLAKE, mouth(), {v:new V3((Math.random() - 0.5)*3, (Math.random() - 0.3)*2, 2 + Math.random()*2), life:1.2, size:0.22, spin:2});
      mgHint(early ? L('Хи-хи! Рано — жди, пока Туча надуется, и сразу платочек 🤧', 'Hee-hee! Too early — wait until the Cloud puffs up, then the tissue 🤧')
        : L('Апчхи! Снежинки на докторе 😄 Лови, пока Туча надувается!', 'Achoo! Snowflakes all over the doctor 😄 Catch it while she puffs up!'));
    }
    await tween(0.35, k => { puff = (1 - k)*(got ? 0.6 : 1); }, ease.out); puff = 0;
    await wait(got ? 1.1 : 1.6);
    tissue.hidden = true;
  }
  tissue.remove();
  await wait(0.4);

  // 2) тёплый чай: неси кружку к ротику, три глотка — Туча светлеет
  mgHint(L('Теперь тёплый чай с мёдом! Неси кружку к ротику Тучи 🍵', 'Now warm tea with honey! Carry the mug to the Cloud\'s mouth 🍵'));
  const mug = mgNode('div', 'cf-mug', '🍵'), home = () => ({x:innerWidth/2, y:innerHeight - 130});
  const place = (x, y) => { mug.style.left = x + 'px'; mug.style.top = y + 'px'; };
  place(home().x, home().y);
  const grey = CLOUD_GREY.clone();
  await new Promise(res => {
    let pid = null, sips = 0, sipT = 0;
    on('pointerdown', e => { if(pid !== null || !near2(e, mug, 80)) return; pid = e.pointerId; mug.classList.add('on'); place(e.clientX, e.clientY); });
    on('pointermove', e => {
      if(e.pointerId !== pid) return;
      place(e.clientX, e.clientY - 30);
      if(sips >= CF_SIPS || now < sipT || !near(e, mouth(), 110)) return;
      sipT = now + 0.55; sips++;
      sfx.chomp(); emit(TEX.puff, mouth().add(new V3(0, 0.3, 0.3)), {v:new V3(0, 0.8, 0), life:1, size:0.4, grow:0.8});
      u.mat.color.copy(grey).lerp(CLOUD_WHITE, sips/CF_SIPS);
      floatText(['Ням', 'Ммм', 'Тёпленько!'].map((r, i) => L(r, ['Sip', 'Mmm', 'So warm!'][i]))[sips - 1], c.position.clone().add(new V3(0.8, 1.2, 0)), '#D9527E');
      if(sips >= CF_SIPS){ pid = null; res(); }
    }, window);
    for(const ev of ['pointerup', 'pointercancel']) on(ev, e => {
      if(e.pointerId !== pid) return; pid = null; mug.classList.remove('on');
      mgHint(L('Держи кружку и неси прямо к ротику 🍵', 'Hold the mug and bring it right to the mouth 🍵')); const h = home(); place(h.x, h.y);
    }, window);
  });
  after(); mug.remove();
  u.brows.forEach(b => b.visible = false); u.mouth.rotation.z = Math.PI; u.mouth.position.y = -0.14;   // улыбается
  sfx.good(); burst(TEX.heart, c.position.clone().add(new V3(0, 1, 0)), 10, 1.8, 0.28);
  await wait(1.0);

  // 3) шарфик: покрути пальцем вокруг Тучи — шарф наматывается
  mgHint(L('Замотаем горлышко шарфиком: покрути пальцем вокруг Тучи 🔄', 'Let\'s wrap a scarf around her throat: circle your finger around the Cloud 🔄'));
  const ring = mgNode('div', 'circle-hint'), unR = pin(ring, () => c.position.clone());
  scarf.visible = true;
  await new Promise(res => {
    let a0 = null, sum = 0;
    const ang = e => { const q = toScreen(c.position); return Math.atan2(e.clientY - q.y, e.clientX - q.x); };
    on('pointerdown', e => { a0 = ang(e); });
    on('pointermove', e => {
      if(a0 === null) return;
      const a = ang(e), da = Math.atan2(Math.sin(a - a0), Math.cos(a - a0)); a0 = a; sum += da;
      if(Math.abs(da) > 0.02 && Math.random() < 0.12) sfx.rub();
      scarfK = Math.min(1, Math.abs(sum)/(Math.PI*1.8));
      ring.style.setProperty('--p', scarfK); scarf.scale.setScalar(Math.max(0.01, scarfK)); scarf.rotation.z = sum*0.5;
      if(scarfK >= 1){ a0 = null; res(); }
    }, window);
    for(const ev of ['pointerup', 'pointercancel']) on(ev, () => { a0 = null; }, window);
  });
  after(); unR(); tail.visible = true;
  sfx.pop(); sfx.star(); burst(TEX.star, c.position.clone().add(new V3(0, -0.4, 0.8)), 12, 1.6, 0.22);
  floatText(L('Тепло-о-о! 🧣', 'So co-o-sy! 🧣'), c.position.clone().add(new V3(0, 1.6, 0)), '#D9527E');
  unfocusCam(); await wait(1.2);

  // 4) обнять: подержи пальчик и погладь (как тюленей)
  bob = 0.4;
  await strokeHug({eyes:u.eyes, inner:c}, null, L('Туча здорова! Погладь её пальчиком и не отпускай ♡', 'The Cloud is well! Stroke her and hold on ♡'),
    {at:() => c.position.clone(), r:1.25*CF_SC, top:() => c.position.clone().add(new V3(0, 1.4, 0)), say:L('Мягко-мягко ♡', 'So soft ♡')});
  mgOpen('', {hintBottom:true}); mgTick(life);   // strokeHug закрыл слой вместе с покачиванием
  sfx.hug(); sfx.giggle(); bob = 1;
  burst(TEX.heart, c.position.clone().add(new V3(0, 0.8, 0)), 20, 2.4, 0.38);
  await tween(1.0, k => { c.rotation.y = k*Math.PI*2; c.position.y = CF_POS.y + Math.sin(k*Math.PI)*0.8; }, ease.io);
  c.rotation.y = 0;
  const rb = cfRainbow(); rb.position.copy(CF_POS).add(new V3(0, -0.2, -1.4)); scene.add(rb);
  await tween(0.8, k => rb.scale.setScalar(Math.max(0.01, k)), ease.out);
  await wait(0.4);
  const img = snapshot({root:{position:CF_POS.clone().add(new V3(0, -1.0, 0)), scale:{x:1}}}, 1.7);
  const cs = cfSave(); cs.cure = 2;
  save.progress++;
  if(save.pet) save.pet.xp += PATIENT_XP;
  albumAdd({name:L('Туча', 'Cloud'), img, d:Date.now()}); renderAlbumCount();
  shift.photos.push(img); shift.n++;
  persist();
  addShells(CF_CURE_SHELLS, toScreen(c.position.clone().add(new V3(0, 1, 0))));
  await wait(0.8);

  const last = shift.n >= SHIFT_SIZE;
  const card = mgNode('div', 'mg-panel adopt st-cured', `<p class="ttl display">${L('Туча здорова! ☁️✨', 'The Cloud is well! ☁️✨')}</p>
    <img class="co-photo" src="${img}" alt="">
    <p>${L('Туча: «Спасибо, доктор Сабрина! Больше не буду ворчать. Можно я буду поливать твой подводный сад тёплым дождиком? 🌧️💗»', 'Cloud: “Thank you, Doctor Sabrina! I won\'t grumble anymore. May I water your underwater garden with warm rain? 🌧️💗”')}</p>
    <p class="got">+${CF_CURE_SHELLS} 🐚${save.pet ? `  +${PATIENT_XP} 💗` : ''} · ${L('🌧️ дождик для сада в бухте', '🌧️ rain for the garden in the bay')}</p>
    <div class="row"><button class="btn">${last ? L('Итоги смены ⭐', 'Shift results ⭐') : L('Следующий пациент', 'Next patient')}</button></div>`);
  await new Promise(r => mgOn(card.querySelector('button'), 'click', () => { sfx.tap(); r(); }));
  card.classList.add('away'); await wait(0.25);
  // улетает, махнув радугой
  sfx.whoosh(); floatText(L('Пока-пока! 💗', 'Bye-bye! 💗'), c.position.clone().add(new V3(0, 1.4, 0)), '#D9527E');
  await tween(1.6, k => { c.position.x = k*6; c.position.y = CF_POS.y + k*4; rb.scale.setScalar(Math.max(0.01, 1 - k)); }, ease.io);
  scene.remove(c); scene.remove(rb);
  mgClose(); setBusy(false);
  if(shift.n === SHIFT_SIZE - 1 && !shift.event){ shift.event = true; await runEvent(); }
  if(shift.n >= SHIFT_SIZE) return showResults();
  return spawnPatient();
}
function near2(e, el, r){ const b = el.getBoundingClientRect(); return Math.hypot(e.clientX - (b.left + b.width/2), e.clientY - (b.top + b.height/2)) < r; }
function cfRainbow(){
  const g = new THREE.Group();
  [0xFF9BB8, 0xFFC56B, 0xFFF08A, 0x9BE3B5, 0x8CC8F2, 0xB9A2F0].forEach((col, i) => g.add(new THREE.Mesh(new THREE.TorusGeometry(2.4 - i*0.14, 0.07, 6, 40, Math.PI), new THREE.MeshBasicMaterial({color:col}))));
  g.scale.setScalar(0.01); return g;
}
// не успели с платочком: снежинки падают по экрану, смешно
function cfFlakesOnScreen(){
  for(let i = 0; i < 12; i++){
    const f = mgNode('div', 'cf-flake', '❄️');
    f.style.left = (10 + Math.random()*80) + '%'; f.style.top = (8 + Math.random()*40) + '%';
    f.style.animationDelay = (Math.random()*0.3) + 's'; setTimeout(() => f.remove(), 2200);
  }
}

/* ---------- 4. Бухта: Туча поливает сад (зовёт dvStart после glPopulate) ---------- */
function cfRain(){
  const cs = cfSave(), D = DV; if(cs.cure !== 2 || cs.rain === dvToday() || !D || !D.garden) return;
  cs.rain = dvToday();
  let grew = 0;
  for(const cc of D.garden){ const t0 = save.dive.garden[cc.i]; if(t0 && dvStage(cc.i) < 2){ save.dive.garden[cc.i] = t0 - CF_RAIN_H*3.6e6; grew++; } }
  persist();
  setTimeout(() => {
    if(DV !== D) return;
    const at = dvW(D.garden[1].g.position);
    let t = 3.2; sfx.drip();
    const f = dt => { if((t -= dt) < 0){ mgTicks.delete(f); return; } for(let i = 0; i < 2; i++) emit(TEX.drop, at.clone().add(new V3((Math.random() - 0.5)*5, 4 + Math.random(), 0.3)), {v:new V3(0, -3.2, 0), life:1.3, size:0.14}); };
    mgTick(f);
    for(const cc of D.garden) if(typeof dvGardenShow === 'function') dvGardenShow(cc);
    floatText(grew ? L('Туча полила сад дождиком! Ростки подросли 🌧️🌱', 'The Cloud watered the garden! The sprouts grew 🌧️🌱')
      : L('Туча полила сад дождиком 🌧️ Посади ростки — завтра подрастут быстрее!', 'The Cloud watered the garden 🌧️ Plant sprouts — tomorrow they grow faster!'), at.clone().add(new V3(0, 1.4, 0)), '#3B8F5E');
  }, 1800);
}
