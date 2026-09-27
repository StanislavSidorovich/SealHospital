/* ---------------- Гости-пациенты: 🐙 Клякса и 🐻‍❄️ медведь (ROADMAP, Спринт 5: «злодеи — тоже пациенты») ----------------
   Как Туча (js/cloudcure.js) и акула (js/sharktooth.js): бывшая «страшилка» приходит в больницу следующим пациентом смены.
   🐙 Клякса (после истории Мглы, js/gloom.js): закрывала старую бочку своими восемью лапками и поцарапалась о ржавый край.
      💧 промыть царапинку (поводи пальцем) → ⭐ пластырь-звёздочка (перетащи) → 🌬️ подуть (подержи палец) → погладить.
   🐻‍❄️ Медведь (после «Праздника мам», js/festival.js): заноза вынута, а лапа ещё болит.
      🐾 посмотреть лапу (нажми) → 🧴 мазь (поводи пальцем) → 🩹 повязка (покрути вокруг лапы) → погладить. Потом он сосед.
   Проиграть нельзя: промахнулась — тёплая подсказка. За каждого: фото в альбом, ракушки, пункт в «Книге острова».
   Сохранение: save.pt = {blot, bear} — вылечены ли. Подключается после cloudcure.js. */
const GS_SHELLS = 12;
if(!save.pt) save.pt = sanitizePt();   // Pages мог отдать старый data.js
const blotDue = () => save.dive.gloom.st >= 3 && !save.pt.blot && !!shift && shift.n < SHIFT_SIZE;
const bearDue = () => ((save.coop.resc && save.coop.resc.lv && save.coop.resc.lv.fest) || 0) > 0 && !save.pt.bear && !!shift && shift.n < SHIFT_SIZE;

/* ---------- общие приёмы лечения (DOM-слой #mg) ---------- */
function gsKit(){
  let offs = [];
  const on = (type, fn, el = mgRoot) => { el.addEventListener(type, fn); offs.push(() => el.removeEventListener(type, fn)); };
  const off = () => { offs.forEach(f => f()); offs = []; };
  mgCleanup.push(off);
  const near = (e, v, r) => { const q = toScreen(v); return Math.hypot(e.clientX - q.x, e.clientY - q.y) < r; };
  return {on, off, near,
    // поводить пальцем по месту (промыть, намазать): need — сколько пикселей «натереть»
    rub(at, need, fx){ return new Promise(res => {
      const ring = mgNode('div', 'circle-hint'); ring.style.cssText += 'width:150px;height:150px;margin:-75px 0 0 -75px'; const un = pin(ring, at);
      let pid = null, last = null, p = 0;
      on('pointerdown', e => { if(!near(e, at(), 110)) return; pid = e.pointerId; last = {x:e.clientX, y:e.clientY}; });
      on('pointermove', e => {
        if(e.pointerId !== pid) return;
        const d = Math.min(50, Math.hypot(e.clientX - last.x, e.clientY - last.y)); last = {x:e.clientX, y:e.clientY};
        if(!near(e, at(), 130)) return;
        p = Math.min(1, p + d/need); ring.style.setProperty('--p', p);
        if(d > 2 && Math.random() < 0.25){ sfx.rub(); if(fx) fx(); }
        if(p >= 1){ pid = null; off(); un(); res(); }
      }, window);
      for(const ev of ['pointerup', 'pointercancel']) on(ev, e => { if(e.pointerId === pid) pid = null; }, window);
    }); },
    // перетащить вещь (пластырь) к месту
    drag(ic, at, hint){ return new Promise(res => {
      const it = mgNode('div', 'cf-mug', ic), home = () => ({x:innerWidth/2, y:innerHeight - 130});
      const place = (x, y) => { it.style.left = x + 'px'; it.style.top = y + 'px'; };
      const tgt = mgNode('div', 'target'), un = pin(tgt, at);
      place(home().x, home().y);
      let pid = null;
      on('pointerdown', e => { if(pid !== null || !near2(e, it, 80)) return; pid = e.pointerId; it.classList.add('on'); place(e.clientX, e.clientY - 30); });
      on('pointermove', e => {
        if(e.pointerId !== pid) return; place(e.clientX, e.clientY - 30);
        const q = toScreen(at()); if(Math.hypot(e.clientX - q.x, e.clientY - 30 - q.y) < 60){ pid = null; off(); un(); it.remove(); res(); }
      }, window);
      for(const ev of ['pointerup', 'pointercancel']) on(ev, e => { if(e.pointerId !== pid) return; pid = null; it.classList.remove('on'); const h = home(); place(h.x, h.y); if(hint) mgHint(hint); }, window);
    }); },
    // подержать палец на месте (подуть)
    hold(at, sec, fx){ return new Promise(res => {
      const ring = mgNode('div', 'circle-hint'); ring.style.cssText += 'width:150px;height:150px;margin:-75px 0 0 -75px'; const un = pin(ring, at);
      let pid = null, p = 0;
      const f = dt => {
        if(pid === null){ p = Math.max(0, p - dt*0.4); ring.style.setProperty('--p', p); return; }
        p = Math.min(1, p + dt/sec); ring.style.setProperty('--p', p); if(fx && Math.random() < dt*12) fx();
        if(p >= 1){ mgTicks.delete(f); off(); un(); res(); }
      };
      mgTick(f);
      on('pointerdown', e => { if(near(e, at(), 110)) pid = e.pointerId; });
      for(const ev of ['pointerup', 'pointercancel']) on(ev, e => { if(e.pointerId === pid) pid = null; }, window);
    }); },
    // покрутить пальцем вокруг (повязка)
    circle(at, onK){ return new Promise(res => {
      const ring = mgNode('div', 'circle-hint'), un = pin(ring, at);
      let a0 = null, sum = 0;
      const ang = e => { const q = toScreen(at()); return Math.atan2(e.clientY - q.y, e.clientX - q.x); };
      on('pointerdown', e => { a0 = ang(e); });
      on('pointermove', e => {
        if(a0 === null) return;
        const a = ang(e), da = Math.atan2(Math.sin(a - a0), Math.cos(a - a0)); a0 = a; sum += da;
        if(Math.abs(da) > 0.02 && Math.random() < 0.12) sfx.rub();
        const k = Math.min(1, Math.abs(sum)/(Math.PI*1.8)); ring.style.setProperty('--p', k); onK(k, sum);
        if(k >= 1){ a0 = null; off(); un(); res(); }
      }, window);
      for(const ev of ['pointerup', 'pointercancel']) on(ev, () => { a0 = null; }, window);
    }); },
    // нажать на место
    tap(at){ return new Promise(res => {
      const tgt = mgNode('div', 'target'), un = pin(tgt, at);
      on('pointerdown', e => { if(near(e, at(), 100)){ off(); un(); res(); } else sfx.tap(); });
    }); }
  };
}
// общий визит: прилетел/пришёл → шаги лечения → погладить → фото, ракушки → «следующий пациент»
async function gsVisit(G){
  S = null; setBusy(true);
  $('#card').hidden = true; $('#tools').hidden = true; $('#wardrobe').hidden = true;
  const o = G.o; scene.add(o);
  mgOpen('', {hintBottom:true});
  let bob = 1;
  const life = () => { if(G.life) G.life(bob); };
  mgTick(life);
  mgHint(G.who); sfx.whoosh();
  await G.arrive();
  toast(G.toast, 3400);
  floatText(G.hello, G.top(), '#3B3A4A');
  focusCam(G.focus(), G.size, 0, 0.2);
  await wait(1.8);
  const K = gsKit();
  for(const st of G.steps){ await st(K); await wait(0.7); }
  unfocusCam(); await wait(0.8);
  bob = 0.4;
  await strokeHug(G.hug, null, G.hugHint, G.hugOpt);
  mgOpen('', {hintBottom:true}); mgTick(life);   // strokeHug закрыл слой вместе с покачиванием
  sfx.hug(); sfx.giggle(); bob = 1;
  burst(TEX.heart, G.top(), 20, 2.4, 0.38);
  if(G.joy) await G.joy();
  await wait(0.4);
  const img = snapshot({root:{position:G.photoAt(), scale:{x:1}}}, G.photoPad);
  G.done();
  save.progress++;
  if(save.pet) save.pet.xp += PATIENT_XP;
  albumAdd({name:G.photoName, img, d:Date.now()}); renderAlbumCount();
  shift.photos.push(img); shift.n++;
  persist();
  addShells(GS_SHELLS, toScreen(G.top()));
  await wait(0.8);
  const last = shift.n >= SHIFT_SIZE;
  const card = mgNode('div', 'mg-panel adopt st-cured', `<p class="ttl display">${G.ttl}</p>
    <img class="co-photo" src="${img}" alt="">
    <p>${G.thanks}</p>
    <p class="got">+${GS_SHELLS} 🐚${save.pet ? `  +${PATIENT_XP} 💗` : ''}${G.extra ? ' · ' + G.extra : ''}</p>
    <div class="row"><button class="btn">${last ? L('Итоги смены ⭐', 'Shift results ⭐') : L('Следующий пациент', 'Next patient')}</button></div>`);
  await new Promise(r => mgOn(card.querySelector('button'), 'click', () => { sfx.tap(); r(); }));
  card.classList.add('away'); await wait(0.25);
  floatText(L('Пока-пока! 💗', 'Bye-bye! 💗'), G.top(), '#D9527E'); sfx.whoosh();
  await G.leave();
  scene.remove(o);
  mgClose(); setBusy(false);
  if(shift.n === SHIFT_SIZE - 1 && !shift.event){ shift.event = true; await runEvent(); }
  if(shift.n >= SHIFT_SIZE) return showResults();
  return spawnPatient();
}
const GS_SCRATCH = canvasTex(128, g => {   // царапинка: две розовые чёрточки
  g.lineCap = 'round'; g.strokeStyle = '#E0527E'; g.lineWidth = 11;
  for(const [a, b, c, d] of [[34, 40, 94, 70], [30, 64, 84, 92]]){ g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.stroke(); }
});
function gsSprite(tex, s){ const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:tex, transparent:true, depthWrite:false})); sp.scale.setScalar(s); sp.renderOrder = 3; return sp; }

/* ---------- 🐙 Клякса с царапинкой ---------- */
const BLOT_POS = new V3(0, 0.55, 0.3), BLOT_SC = 1.25;
async function spawnBlot(){
  const o = glOctoModel(); o.scale.setScalar(BLOT_SC);
  const sore = gsSprite(GS_SCRATCH, 0.3); sore.position.set(0.32, 0.55, 0.5); o.add(sore);
  const at = () => o.localToWorld(new V3(0.32, 0.55, 0.55)), top = () => o.localToWorld(new V3(0, 1.5, 0));
  let pout = 1;
  return gsVisit({o,
    who:L('Кто это приполз? 🐙', 'Who is this crawling in? 🐙'),
    toast:L('Клякса пришла в больницу — у неё царапинка 🐙', 'Blot came to the hospital — she has a scratch 🐙'),
    hello:L('Доктор, я закрывала бочку и поцарапалась… 🥺', 'Doctor, I was closing the barrel and got scratched… 🥺'),
    life(bob){ o.position.set(BLOT_POS.x, BLOT_POS.y + Math.sin(now*1.8)*0.06*bob, BLOT_POS.z); o.rotation.z = Math.sin(now*1.3)*0.08*bob; o.rotation.y = -0.25 + Math.sin(now*0.6)*0.1*pout; },
    async arrive(){ sfx.boing(); await tween(1.6, k => { o.position.x = -4 + 4*k; o.position.y = BLOT_POS.y + Math.abs(Math.sin(k*Math.PI*4))*0.3*(1 - k); o.scale.setScalar(BLOT_SC*(0.6 + 0.4*k)); }, ease.out); },
    top, focus:() => BLOT_POS.clone().add(new V3(0, 0.3, 0)), size:3.6,
    steps:[
      async K => {   // 💧 промыть
        mgHint(L('Сначала промоем царапинку водичкой: поводи пальцем по ней 💧', 'First let\'s wash the scratch with water: rub it with your finger 💧'));
        await K.rub(at, 650, () => emit(TEX.drop, at().add(new V3((Math.random() - 0.5)*0.3, 0.2, 0.3)), {v:new V3((Math.random() - 0.5)*1.2, 0.5, 0.6), g:4, life:0.7, size:0.13}));
        sore.material.opacity = 0.55; sfx.good(); floatText(L('Щиплет… но уже лучше!', 'It stings… but it\'s better!'), top(), '#8E6FD8');
      },
      async K => {   // ⭐ пластырь-звёздочка
        mgHint(L('Теперь пластырь-звёздочка! Перетащи ⭐ на царапинку', 'Now a star plaster! Drag the ⭐ onto the scratch'));
        await K.drag('⭐', at, L('Неси звёздочку прямо на царапинку ⭐', 'Carry the star right onto the scratch ⭐'));
        sore.material.map = TEX.star; sore.material.opacity = 1; sore.material.needsUpdate = true; sore.scale.setScalar(0.36);
        sfx.pop(); sfx.star(); burst(TEX.star, at(), 8, 1.2, 0.18);
        floatText(L('Какая красивая! ⭐', 'How pretty! ⭐'), top(), '#D9527E');
      },
      async K => {   // 🌬️ подуть
        mgHint(L('Подуй на пластырь, чтобы не болело: подержи палец на звёздочке 🌬️', 'Blow on the plaster so it doesn\'t hurt: hold your finger on the star 🌬️'));
        await K.hold(at, 1.6, () => emit(TEX.puff, at().add(new V3(0.3, 0.3, 0.6)), {v:new V3(-0.8, 0.3, -0.4), life:0.6, size:0.3, grow:0.8}));
        pout = 0; sfx.giggle(); floatText(L('Фу-у-у… Совсем не болит! Хи-хи 🐙', 'Phoo-oo… It doesn\'t hurt at all! Hee-hee 🐙'), top(), '#8E6FD8');
      }
    ],
    hug:{eyes:[], inner:o}, hugHint:L('Клякса здорова! Погладь её пальчиком и не отпускай ♡', 'Blot is well! Stroke her and hold on ♡'),
    hugOpt:{at:() => o.localToWorld(new V3(0, 0.6, 0)), r:1.1, top, say:L('Обнимашки восемью лапками! 🐙', 'An eight-arm hug! 🐙')},
    async joy(){ await tween(0.9, k => { o.rotation.y = k*Math.PI*2; o.position.y = BLOT_POS.y + Math.sin(k*Math.PI)*0.7; }, ease.io); o.rotation.y = 0; },
    photoAt:() => BLOT_POS.clone().add(new V3(0, -0.4, 0)), photoPad:1.6, photoName:L('Клякса', 'Blot'),
    done(){ save.pt.blot = true; },
    ttl:L('Клякса здорова! 🐙✨', 'Blot is well! 🐙✨'),
    thanks:L(`Клякса: «Спасибо, доктор ${pname()}! Теперь у меня пластырь-звёздочка — я самая красивая в бухте! Приплывай в гости к бочке 💜»`, `Blot: “Thank you, Doctor ${pname()}! Now I have a star plaster — I'm the prettiest in the bay! Come visit me by the barrel 💜”`),
    extra:L('⭐ пластырь у Кляксы', '⭐ Blot\'s plaster'),
    async leave(){ await tween(1.4, k => { o.position.x = BLOT_POS.x + k*5; o.position.y = BLOT_POS.y + Math.abs(Math.sin(k*Math.PI*4))*0.3; }, ease.io); }
  });
}

/* ---------- 🐻‍❄️ Медведь: лапа после занозы ---------- */
const BEAR_POS = new V3(0, 0, -0.2), BEAR_SC = 0.8;
async function spawnBear(){
  const o = feBearMake(), U = o.userData; o.scale.setScalar(BEAR_SC);
  U.shard.visible = false;
  U.brows.forEach((b, i) => { b.rotation.z = (i ? -1 : 1)*0.45; });   // грустные бровки
  const sore = gsSprite(GS_SCRATCH, 0.34); sore.position.set(0, 0.05, 0.32); U.paw.add(sore);
  const paw = () => U.paw.localToWorld(new V3(0, 0.05, 0.3)), top = () => o.localToWorld(new V3(0, 2.7, 0));
  let lift = 0;
  const band = addOutline(new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.08, 8, 24), toon(0xFFFDF8)), 1.1);
  band.rotation.x = Math.PI/2; band.scale.setScalar(0.01); band.visible = false; U.paw.add(band);
  return gsVisit({o,
    who:L('Кто это топает? 🐾', 'Who is stomping over here? 🐾'),
    toast:L('Белый медведь пришёл в больницу — болит лапа 🐻‍❄️', 'The polar bear came to the hospital — his paw hurts 🐻‍❄️'),
    hello:L('Здравствуйте… Занозу вынули, а лапка всё болит… 🥺', 'Hello… The splinter is out, but my paw still hurts… 🥺'),
    life(bob){ o.position.set(BEAR_POS.x, BEAR_POS.y, BEAR_POS.z); U.inner.rotation.z = Math.sin(now*1.2)*0.03*bob; U.head.rotation.z = Math.sin(now*0.9)*0.06*bob;
      U.paw.rotation.x = -lift*1.1; U.paw.position.y = 1.05 + lift*0.35; },
    async arrive(){ sfx.thud(); await tween(2.0, k => { o.position.x = -5 + 5*k; U.inner.position.y = Math.abs(Math.sin(k*Math.PI*5))*0.12; }, ease.out); U.inner.position.y = 0; },
    top, focus:() => BEAR_POS.clone().add(new V3(0, 1.1, 0)), size:4.4,
    steps:[
      async K => {   // 🐾 посмотреть лапу
        mgHint(L('Покажи лапку, мишка! Нажми на больную лапу 🐾', 'Show me your paw, bear! Tap the sore paw 🐾'));
        await K.tap(paw);
        await tween(0.5, k => lift = k, ease.out);
        sfx.boing(); floatText(L('Вот тут болит… ой-ой', 'It hurts right here… ouch'), top(), '#3B3A4A');
      },
      async K => {   // 🧴 мазь
        mgHint(L('Намажем лапку мазью: поводи пальцем по больному месту 🧴', 'Let\'s put ointment on the paw: rub the sore spot 🧴'));
        await K.rub(paw, 700, () => emit(TEX.puff, paw().add(new V3((Math.random() - 0.5)*0.3, 0.1, 0.3)), {v:new V3(0, 0.3, 0.3), life:0.6, size:0.22, grow:0.5}));
        sore.material.opacity = 0.35; sfx.good(); floatText(L('Прохладненько… приятно!', 'Nice and cool… that feels good!'), top(), '#3E8DB8');
      },
      async K => {   // 🩹 повязка
        mgHint(L('Теперь повязка: покрути пальцем вокруг лапы 🩹', 'Now a bandage: circle your finger around the paw 🩹'));
        band.visible = true;
        await K.circle(paw, (k, sum) => { band.scale.setScalar(Math.max(0.01, k)); band.rotation.z = sum*0.5; });
        sore.visible = false; sfx.pop(); sfx.star(); burst(TEX.star, paw(), 10, 1.4, 0.2);
        U.brows.forEach(b => b.visible = false);   // больше не грустит
        floatText(L('Совсем не болит! Спасибо! 🐾', 'It doesn\'t hurt at all! Thank you! 🐾'), top(), '#D9527E');
        await tween(0.5, k => lift = 1 - k, ease.io);
      }
    ],
    hug:{eyes:[], inner:U.inner}, hugHint:L('Мишка здоров! Погладь его пальчиком и не отпускай ♡', 'The bear is well! Stroke him and hold on ♡'),
    hugOpt:{at:() => o.localToWorld(new V3(0, 1.1, 0)), r:1.2, top, say:L('Мур… то есть р-р-р! Мягко ♡', 'Purr… I mean grr! So soft ♡')},
    async joy(){ sfx.grr(); await tween(0.8, k => { U.inner.position.y = Math.sin(k*Math.PI)*0.5; }, ease.io); U.inner.position.y = 0; },
    photoAt:() => BEAR_POS.clone().add(new V3(0, 0.6, 0)), photoPad:2.2, photoName:L('Белый медведь', 'Polar bear'),
    done(){ save.pt.bear = true; },
    ttl:L('Мишка здоров! 🐻‍❄️✨', 'The bear is well! 🐻‍❄️✨'),
    thanks:L(`Медведь: «Спасибо, доктор ${pname()}! Простите, что утащил торт… Можно я буду жить по соседству? Я умею катать снежки для снеговиков! 💙»`, `Bear: “Thank you, Doctor ${pname()}! Sorry I grabbed the cake… May I live next door? I'm great at rolling snowballs for snowmen! 💙”`),
    extra:L('🐻‍❄️ новый сосед', '🐻‍❄️ a new neighbour'),
    async leave(){ await tween(1.8, k => { o.position.x = BEAR_POS.x + k*6; U.inner.position.y = Math.abs(Math.sin(k*Math.PI*5))*0.12; }, ease.io); }
  });
}

/* ---------- медведь-сосед: после больницы живёт на льдине у уголка малыша, машет лапой ---------- */
const gsBear = (() => {
  const g = new THREE.Group(), b = feBearMake(), U = b.userData; b.scale.setScalar(0.42); U.shard.visible = false; U.brows.forEach(o => o.visible = false); g.add(b);
  const fl = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.82, 0.24, 24), toon(0xD6EAF5)), 1.04); fl.position.y = -0.1; g.add(fl);
  g.position.copy(PET_POS).add(new V3(0.9, -0.1, -7.6)); g.rotation.y = -0.2; g.visible = false; scene.add(g);
  g.userData.U = U; return g;
})();
function gsTick(t, dt){
  gsBear.visible = !!save.pt.bear && petMode && !homeMode && !runCam.on;
  if(!gsBear.visible) return;
  const U = gsBear.userData.U, wave = (t % 6) < 1.4;
  U.paw.rotation.z = wave ? -0.6 + Math.sin(t*9)*0.4 : 0; U.paw.position.y = 1.05 + (wave ? 0.35 : 0);
  U.head.rotation.z = Math.sin(t*0.8)*0.08; gsBear.position.y = PET_POS.y - 0.1 + Math.sin(t*0.7)*0.04;
}
