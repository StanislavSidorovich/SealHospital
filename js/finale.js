/* ---------------- 🎉 Праздник острова и грамота (Спринт 5, задача 8 — конец «Книги острова») ----------------
   Шторм позади — все друзья приходят на праздник. Сама решаешь, кого позвать, и рассаживаешь гостей за длинным столом
   (6 мест, во главе стола — твой малыш): нажми на друга внизу, потом на место за столом (или просто перетащи).
   Нажмёшь на гостя за столом — он встанет, и его можно пересадить.
   «🎉 Праздник!» — каждый гость говорит своё, потом задуваем свечки на торте, общее фото в альбом.
   Потом — грамота-картинка с большими числами (её можно отправить бабушке) и особое письмо папы (LETTERS, поле fin).
   После первого праздника глава 8 прочитана, история закрыта; праздник и грамоту можно открыть снова в «Книге острова».
   Сохранение — save.story.fin = {n — сколько раз праздновали, g:[кто на каком месте, 6 id или '']} (sanitizeStory в data.js).
   Подключается после storm.js, до story.js. */
const FN_POS = new V3(1000, 0, 1000);
const fnAt = (x, z, y = 0) => new V3(FN_POS.x + x, 0.25 + y, FN_POS.z + z);
const fnRoot = new THREE.Group(); fnRoot.visible = false; scene.add(fnRoot);
const FN_SEATS = [[-1.05, -1.75], [1.05, -1.75], [-1.05, -0.45], [1.05, -0.45], [-1.05, 0.85], [1.05, 0.85]];   // x, z: слева и справа от стола
const FN_HEAD = [0, -2.95];   // во главе стола — малыш
const FN_MIN = 2;
const FN_CAM = {z:8.5, y:5.8, lz:-0.9, lzP:0.7, ly:0};   // камера: откуда (z, y) и куда смотрит; lzP — сдвиг, пока внизу панель с гостями            // столько гостей — и можно начинать

/* ---------- гости ----------
   make() → {root, seal?, off — поворот модели (жители бухты смотрят вдоль x), y — выше сиденья (Туча парит)}.
   ok() — знакомы ли (нет функции — все, кто был в шторме). */
const fnSeal = (c, sc, s) => { const m = rsSealLook({c}, sc, s); return {root:m.root, seal:m}; };
const fnDv = (k, s, off = -Math.PI/2) => { const r = DV_MAKE[k](); r.scale.setScalar(s); return {root:r, off}; };
const FN_GUESTS = [
  {id:'ping', ic:'🐧', name:L('Пинг', 'Ping'), make:() => { const m = makePenguin(PENG); m.root.scale.setScalar(0.26); return {root:m.root, seal:m}; },
    say:() => L(`В шторм ты ${pg('подбодрил', 'подбодрила')} меня — и я стал храбрым! А к столу я принёс рыбку 🐟`, 'In the storm you cheered me up — and I became brave! And I brought a fish for the table 🐟')},
  {id:'pipa', ic:'🐧', name:L('Пипа', 'Pipa'), make:() => { const m = makePenguin({name:'', f:true, color:0x5C6FA6}); m.root.scale.setScalar(0.22); return {root:m.root, seal:m}; },
    say:() => L(`Спасибо, что ${pg('нашёл', 'нашла')} мою маму! 💗`, 'Thank you for finding my mum! 💗')},
  {id:'ray', ic:'✨', name:L('Лучик', 'Little Ray'), make:() => fnSeal(0xFFFFFF, '#FFD66B', 0.24),
    say:() => L('Смотрите, как я свечусь! ✨', 'Look how I glow! ✨')},
  {id:'button', ic:'🦦', name:L('Пуговка', 'Button'), make:() => fnDv('otter', 0.46),
    say:() => L('А я умею есть лёжа на спинке! 🦦', 'I can eat lying on my back! 🦦')},
  {id:'tiny', ic:'🦭', name:L('Кроха', 'Tiny'), make:() => fnSeal(0xC6D3E4, '#9FD8B8', 0.24),
    say:() => L('Я больше не боюсь грома! 💪', 'I am not scared of thunder any more! 💪')},
  {id:'snow', ic:'❄️', name:L('Снежинка', 'Snowflake'), make:() => fnSeal(0xE9DDCB, '#B9A0F2', 0.24),
    say:() => L('Можно мне самый большой кусочек? 🍰', 'Can I have the biggest slice? 🍰')},
  {id:'bear', ic:'🐻‍❄️', name:L('Медведь', 'Bear'), make:() => { const r = feBearMake(); r.userData.shard.visible = false; r.userData.brows.forEach(o => o.visible = false); r.scale.setScalar(0.3); return {root:r}; },   // уже друг: без занозы и сердитых бровей
    say:() => L('Лапа совсем не болит! Спасибо! 🐾', 'My paw doesn’t hurt at all! Thank you! 🐾')},
  {id:'shark', ic:'🦈', name:L('Акула', 'Shark'), make:() => fnDv('shark', 0.34),
    say:() => L('Зуб как новенький! 😁 Кого покатать?', 'My tooth is good as new! 😁 Who wants a ride?')},
  {id:'blot', ic:'🐙', name:L('Клякса', 'Blot'), ok:() => save.dive.gloom.st >= 3, make:() => { const r = glOctoModel(); r.scale.setScalar(0.3); return {root:r, off:-Math.PI/2}; },
    say:() => L('Я теперь не Мгла, а Клякса! 💜', 'I am not the Gloom any more — I am Blot! 💜')},
  {id:'cloud', ic:'☁️', name:L('Туча', 'Cloud'), ok:() => save.coop.cs.cure >= 2 || save.coop.wins > 0,
    make:() => { const c = makeCloud(); cloudKind(c, true); c.scale.setScalar(0.16); return {root:c, y:0.55}; },
    say:() => L('Я больше не ворчу! Хотите радугу? 🌈', 'I don’t grumble any more! Want a rainbow? 🌈')},
  {id:'turtle', ic:'🐢', name:L('Черепаха', 'Turtle'), make:() => fnDv('turtle', 0.36),
    say:() => L('Я медленная, но успела к торту! 🐢', 'I am slow, but I made it in time for cake! 🐢')},
  {id:'crab', ic:'🦀', name:L('Крабик', 'Crab'), make:() => fnDv('crab', 0.5, 0),
    say:() => L('Щёлк-щёлк! Ура-ура! 🦀', 'Snip-snap! Hooray! 🦀')},
  {id:'gull', ic:'🕊️', name:L('Чайка', 'Gull'), make:() => { const r = makeGull(); r.scale.setScalar(0.62); return {root:r}; },
    say:() => L('Я видела сверху: весь остров цел! 🕊️', 'I saw from above: the whole island is safe! 🕊️')}
];
const fnGuest = id => FN_GUESTS.find(g => g.id === id);
const fnAvail = () => FN_GUESTS.filter(g => { try{ return !g.ok || g.ok(); }catch(e){ return false; } });
const FN_HI = [() => L('Ура, меня позвали!', 'Yay, I’m invited!'), () => L('Спасибо! 💗', 'Thank you! 💗'), () => L('Моё место! 😊', 'My seat! 😊'), () => L('Привет всем!', 'Hi everyone!')];

let FN = null;

/* ---------- сцена: льдина, длинный стол с тортом, флажки, шарики, маяк с радугой ---------- */
function fnBuild(){
  const G = new THREE.Group(); fnRoot.add(G);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), toon(0x6FC0DF)); water.rotation.x = -Math.PI/2; water.position.copy(fnAt(0, 0, -0.32)); G.add(water);
  const floe = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.4, 0.6, 28), toon(0xD6EAF5)), 1.01); floe.scale.z = 1.35; floe.position.copy(fnAt(0, -0.8, -0.3)); G.add(floe);
  // стол со скатертью
  const top = addOutline(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 4.3), toon(0xFFFDF8)), 1.02); top.position.copy(fnAt(0, -0.45, 0.42)); G.add(top);
  const cloth = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.3, 4.36), toon(0xFFC9D8)); cloth.position.copy(fnAt(0, -0.45, 0.3)); G.add(cloth);
  for(const [x, z] of [[-0.45, -2.3], [0.45, -2.3], [-0.45, 1.4], [0.45, 1.4]]){ const l = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 8), toon(0xC9A479)); l.position.copy(fnAt(x, z, 0.2)); G.add(l); }
  // тарелки с рыбкой напротив мест
  for(const [x, z] of FN_SEATS){
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.04, 18), toon(0xFFFFFF)); p.position.copy(fnAt(x*0.3, z, 0.5)); G.add(p);
    const f = makeFish(); f.scale.setScalar(0.28); f.rotation.y = Math.PI/2; f.position.copy(fnAt(x*0.3, z, 0.56)); G.add(f);
    const seat = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.14, 18), toon(0xFFE6A8)), 1.06); seat.position.copy(fnAt(x, z, 0.02)); G.add(seat);
  }
  const head = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.46, 0.18, 20), toon(0xFF9BB8)), 1.06); head.position.copy(fnAt(FN_HEAD[0], FN_HEAD[1], 0.03)); G.add(head);
  // торт: два яруса и три свечки
  const cake = new THREE.Group(); cake.position.copy(fnAt(0, -0.45, 0.5)); G.add(cake);
  const t1 = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 24), toon(0xFFFFFF)), 1.05); t1.position.y = 0.12; cake.add(t1);
  const cr = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.045, 6, 24), toon(0xFF9BB8)); cr.rotation.x = Math.PI/2; cr.position.y = 0.23; cake.add(cr);
  const t2 = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.2, 22), toon(0xFFC9D8)), 1.06); t2.position.y = 0.34; cake.add(t2);
  const cherry = addOutline(new THREE.Mesh(SMALL, toon(0xD9527E)), 1.1); cherry.scale.setScalar(0.06); cherry.position.y = 0.5; cake.add(cherry);
  const flames = [];
  for(const a of [0, 2.1, 4.2]){
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 6), toon(0x8FCBFF)); c.position.set(Math.cos(a)*0.13, 0.51, Math.sin(a)*0.13); cake.add(c);
    const fl = new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.puff, color:0xFFC247, transparent:true, depthWrite:false})); fl.scale.setScalar(0.13); fl.position.set(c.position.x, 0.62, c.position.z); cake.add(fl); flames.push(fl);
  }
  // флажки-гирлянда за столом
  const flagCols = [0xFF9BB8, 0xFFE38A, 0x9FE3A8, 0x8FCBFF, 0xB9A0F2];
  for(const x of [-2.3, 2.3]){ const pole = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.1, 8), toon(0xFFFDF8)), 1.2); pole.position.copy(fnAt(x, -3.7, 1.05)); G.add(pole); }
  for(let i = 0; i < 11; i++){
    const k = i/10, x = -2.3 + k*4.6, y = 2.0 - Math.sin(k*Math.PI)*0.45;
    const fl = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.3, 3), toon(flagCols[i % 5])); fl.rotation.x = Math.PI; fl.position.copy(fnAt(x, -3.7, y - 0.15)); G.add(fl);
  }
  // шарики на ниточках
  const balloons = [];
  for(const [x, z, c] of [[-1.9, -2.7, 0xFF9BB8], [1.9, -2.7, 0x8FCBFF], [-1.9, 1.8, 0xFFE38A], [1.9, 1.8, 0x9FE3A8]]){
    const b = new THREE.Group(); b.position.copy(fnAt(x, z)); G.add(b);
    const s = addOutline(new THREE.Mesh(SMALL, toon(c)), 1.08); s.scale.set(0.26, 0.31, 0.26); s.position.y = 1.55; b.add(s);
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.3, 4), toon(0x3B3A4A)); str.position.y = 0.65; b.add(str);
    balloons.push(b);
  }
  // маяк и радуга вдали
  const lh = smLighthouse(); lh.scale.setScalar(0.5); lh.position.copy(fnAt(-3.4, -12, -0.3)); G.add(lh);
  const rb = new THREE.Group(); rb.position.copy(fnAt(0.5, -15, -0.3)); G.add(rb);
  ['#FF8FA3', '#FFB86B', '#FFE38A', '#9FE3A8', '#8FCBFF', '#B9A0F2'].forEach((c, i) => {
    rb.add(new THREE.Mesh(new THREE.TorusGeometry(8 - i*0.3, 0.16, 8, 64, Math.PI), new THREE.MeshBasicMaterial({color:c, transparent:true, opacity:0.8, depthWrite:false})));
  });
  // малыш во главе стола
  const me = coSealOf(coPetDesc()); me.root.scale.setScalar(0.36); me.root.position.copy(fnAt(FN_HEAD[0], FN_HEAD[1], 0.1)); G.add(me.root);
  return {G, cake, flames, balloons, me};
}
// гость садится на место i
function fnSit(i, id, hop = true){
  fnStand(i);
  const d = fnGuest(id); if(!d) return;
  const m = d.make(), [x, z] = FN_SEATS[i], side = x < 0 ? 1 : -1;
  m.root.position.copy(fnAt(x, z, 0.1 + (m.y || 0)));
  m.root.rotation.y = side*(Math.PI/2 - 0.55) + (m.off || 0);
  FN.S.G.add(m.root);
  FN.seats[i] = {id, m, hop:hop ? 0.5 : 0, base:m.root.position.y};
  if(hop){ sfx.pop(); floatText(pick(FN_HI)(), m.root.position.clone().add(new V3(0, 0.9, 0)), '#D9527E'); }
}
function fnStand(i){ const s = FN.seats[i]; if(!s) return; FN.S.G.remove(s.m.root); FN.seats[i] = null; }
const fnCount = () => FN.seats.filter(Boolean).length;

/* ---------- рассаживаем гостей ---------- */
function fnSeating(){
  return new Promise(res => {
    const marks = FN_SEATS.map((s, i) => {
      const b = mgNode('button', 'fn-seat'); b.dataset.i = i; b.setAttribute('aria-label', L(`Место ${i + 1}`, `Seat ${i + 1}`));
      mgOn(b, 'click', () => fnSeatTap(i)); return b;
    });
    const panel = mgNode('div', 'mg-panel fn-pick', `
      <p class="got fn-tip">${L('Кого позовём? Нажми на друга, потом — на место за столом', 'Who shall we invite? Tap a friend, then a seat at the table')}</p>
      <div class="fn-cards">${fnAvail().map(g => `<button class="fn-card" data-id="${g.id}"><span class="ic" aria-hidden="true">${g.ic}</span><b>${g.name}</b></button>`).join('')}</div>
      <button class="btn fn-go" disabled>🎉 ${L('Праздник!', 'Party time!')}</button>`);
    FN.marks = marks; FN.panel = panel;
    panel.querySelectorAll('.fn-card').forEach(b => fnCardWire(b));
    mgOn(panel.querySelector('.fn-go'), 'click', () => { if(fnCount() < FN_MIN) return; sfx.tap(); res(); });
    fnRefresh();
  });
}
function fnRefresh(){
  const on = new Set(FN.seats.filter(Boolean).map(s => s.id));
  FN.panel.querySelectorAll('.fn-card').forEach(b => { b.classList.toggle('in', on.has(b.dataset.id)); b.classList.toggle('sel', FN.sel === b.dataset.id); });
  FN.marks.forEach((b, i) => { b.classList.toggle('full', !!FN.seats[i]); b.classList.toggle('want', !!FN.sel && !FN.seats[i]); });
  const n = fnCount(), go = FN.panel.querySelector('.fn-go');
  go.disabled = n < FN_MIN;
  go.textContent = n < FN_MIN ? L(`Позови ещё ${FN_MIN - n} ${plural(FN_MIN - n, 'гостя', 'гостей', 'гостей', 'guest', 'guests')}`, `Invite ${FN_MIN - n} more ${plural(FN_MIN - n, '', '', '', 'guest', 'guests')}`)
    : `🎉 ${L('Праздник!', 'Party time!')}`;
}
function fnPlace(id, i){
  const was = FN.seats.findIndex(s => s && s.id === id);
  if(was >= 0) fnStand(was);
  fnSit(i, id); FN.sel = null; fnRefresh();
  if(fnCount() === FN_SEATS.length) mgHint(L('Все места заняты! Жми «Праздник» 🎉', 'All seats are taken! Tap «Party time» 🎉'));
}
function fnSeatTap(i){
  if(FN.sel){ sfx.tap(); return fnPlace(FN.sel, i); }
  if(FN.seats[i]){   // встал из-за стола — можно пересадить
    const id = FN.seats[i].id; sfx.tick(); fnStand(i); FN.sel = id; fnRefresh();
    mgHint(L(`${fnGuest(id).name}: куда пересесть?`, `${fnGuest(id).name}: where to sit now?`));
    return;
  }
  sfx.tick(); mgHint(L('Сначала выбери друга внизу 👇', 'Pick a friend below first 👇'));
}
// карточка: нажать — выбрать (ещё раз — на первое свободное место); потащить — посадить куда отпустишь
function fnCardWire(b){
  const id = b.dataset.id; let st = null, ghost = null;
  mgOn(b, 'pointerdown', e => { st = {x:e.clientX, y:e.clientY, id:e.pointerId}; try{ b.setPointerCapture(e.pointerId); }catch(er){} });
  mgOn(b, 'pointermove', e => {
    if(!st || st.id !== e.pointerId) return;
    if(!ghost && Math.hypot(e.clientX - st.x, e.clientY - st.y) > 14){
      ghost = document.createElement('div'); ghost.className = 'fn-ghost'; ghost.textContent = fnGuest(id).ic; $('#app').appendChild(ghost);
      FN.sel = id; fnRefresh();
    }
    if(ghost){ ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px'; }
  });
  const up = e => {
    if(!st || st.id !== e.pointerId) return;
    st = null;
    if(ghost){
      ghost.remove(); ghost = null;
      const i = FN.marks.findIndex(m => { const r = m.getBoundingClientRect(); return Math.hypot(e.clientX - (r.left + r.width/2), e.clientY - (r.top + r.height/2)) < Math.max(40, r.width*0.8); });
      if(i >= 0) fnPlace(id, i); else { FN.sel = id; fnRefresh(); }
      return;
    }
    sfx.tap();
    const at = FN.seats.findIndex(s => s && s.id === id);
    if(at >= 0 && FN.sel !== id){ fnStand(at); FN.sel = null; fnRefresh(); mgHint(L(`${fnGuest(id).name} встаёт из-за стола`, `${fnGuest(id).name} leaves the table`)); return; }
    if(FN.sel === id){   // второе касание — на первое свободное место
      const free = FN.seats.findIndex(s => !s);
      if(free >= 0) return fnPlace(id, free);
      mgHint(L('Все места заняты — нажми на гостя за столом, чтобы он встал', 'All seats are taken — tap a guest at the table to free a seat'));
      return;
    }
    FN.sel = id; fnRefresh();
    mgHint(FN.seats.some(s => !s) ? L(`${fnGuest(id).name}: куда сесть? Нажми на место ✨`, `${fnGuest(id).name}: where to sit? Tap a seat ✨`)
      : L('Все места заняты — нажми на гостя за столом, чтобы он встал', 'All seats are taken — tap a guest at the table to free a seat'));
  };
  mgOn(b, 'pointerup', up);
  mgOn(b, 'pointercancel', e => { if(ghost){ ghost.remove(); ghost = null; } st = null; });
}

/* ---------- покадрово: шарики, свечки, подпрыгивания, значки мест на экране, камера ---------- */
function fnStep(dt){
  const S = FN.S;
  S.balloons.forEach((b, i) => { b.position.y = fnAt(0, 0).y + Math.sin(now*1.6 + i)*0.06; b.rotation.z = Math.sin(now*1.1 + i*2)*0.06; });
  S.flames.forEach((f, i) => { if(f.visible) f.scale.setScalar(0.12 + Math.sin(now*18 + i*2)*0.02); });
  FN.seats.forEach((s, i) => {
    if(!s) return;
    if(s.hop > 0){ s.hop = Math.max(0, s.hop - dt); s.m.root.position.y = s.base + Math.sin((1 - s.hop/0.5)*Math.PI)*0.35; }
    if(s.m.seal) updateSeal(s.m.seal, now + i, dt);
    if(s.id === 'cloud') s.m.root.position.y = s.base + Math.sin(now*1.8)*0.08;
  });
  updateSeal(S.me.seal || S.me, now, dt);
  if(FN.marks) FN.marks.forEach((m, i) => { const p = toScreen(fnAt(FN_SEATS[i][0], FN_SEATS[i][1], 0.45)); m.style.left = p.x + 'px'; m.style.top = p.y + 'px'; });
  if(FN.cakeBtn){ const p = toScreen(fnAt(0, -0.45, 1.7)); FN.cakeBtn.style.left = p.x + 'px'; FN.cakeBtn.style.top = p.y + 'px'; }
  // камера: сверху-спереди вдоль стола; на узком экране — дальше. Внизу панель — сцена чуть выше
  const far = Math.max(1, Math.min(1.7, 0.62/camera.aspect)), zoom = FN.zoom;
  runCam.pos.lerp(fnAt(0, FN_CAM.z*far*zoom, FN_CAM.y*far*zoom), Math.min(1, dt*3));
  runCam.look.lerp(fnAt(0, FN_CAM.lz + (FN.panel && !FN.party ? FN_CAM.lzP*far : 0), FN_CAM.ly), Math.min(1, dt*3));
}

/* ---------- праздник: тосты, торт, фото ---------- */
async function fnParty(){
  FN.party = true; FN.sel = null;
  FN.marks.forEach(m => m.remove()); FN.marks = null;
  FN.panel.classList.add('away'); setTimeout(() => { if(FN && FN.panel){ FN.panel.remove(); FN.panel = null; } }, 400);
  FN.zoom = 0.82;
  save.story.fin.g = FN.seats.map(s => s ? s.id : ''); persist();
  mgHint(L('Все за стол! 🎉', 'Everyone to the table! 🎉')); sfx.hug();
  await wait(1.3); if(!FN) return false;
  for(const [i, s] of FN.seats.entries()){
    if(!s || !FN) continue;
    s.hop = 0.5; (i % 2 ? sfx.arf : sfx.coin)();
    const d = fnGuest(s.id), line = d.say();
    mgHint(`${d.ic} ${d.name}: ${line}`);
    floatText('💬', s.m.root.position.clone().add(new V3(0, 0.95, 0)), '#3B3A4A');
    await wait(reduced ? 1.4 : 2.1); if(!FN || FN.quit) return false;
  }
  // свечки
  mgHint(L(`А теперь торт! ${save.pet ? save.pet.name : ''} ждёт — задуй свечки! 🎂`, `And now the cake! ${save.pet ? save.pet.name : ''} is waiting — blow out the candles! 🎂`));
  const cb = FN.cakeBtn = mgNode('button', 'fn-cake', '💨'); cb.setAttribute('aria-label', L('Задуть свечки', 'Blow out the candles'));
  await new Promise(r => { mgOn(cb, 'click', r); FN.cakeGo = r; });
  if(!FN || FN.quit) return false;
  cb.remove(); FN.cakeBtn = null;
  sfx.whoosh(); FN.S.flames.forEach(f => f.visible = false);
  const c = FN.S.cake.getWorldPosition(new V3()).add(new V3(0, 0.6, 0));
  burst(TEX.puff, c, 6, 0.8, 0.2);
  await wait(0.4); if(!FN) return false;
  sfx.grow(); mgHint(L('Ура-а-а! 🎉🎉🎉', 'Hoora-a-ay! 🎉🎉🎉'));
  burst(TEX.star, c, 24, 3, 0.3); burst(TEX.heart, c.clone().add(new V3(0, 0.3, 0)), 18, 2.6, 0.3);
  FN.seats.forEach(s => { if(s) s.hop = 0.5; });
  for(let k = 0; k < 3; k++) setTimeout(() => { if(FN){ burst(TEX.star, fnAt((Math.random() - 0.5)*3, -0.5 + (Math.random() - 0.5)*3, 1.5), 12, 2.4, 0.26); sfx.sparkle(); } }, 500 + k*450);
  await wait(1.8); if(!FN) return false;
  FN.photo = fnSnap(fnAt(0, -1.0, 0.5), 2.2);
  await wait(0.5);
  return !!FN;
}
// фото стола: крупнее обычного snapshot (идёт в грамоту)
function fnSnap(c, rad){
  renderer.render(scene, camera);
  const src = renderer.domElement, W = src.width, H = src.height;
  const p1 = c.clone().project(camera), p2 = c.clone().add(new V3(rad, 0, 0)).project(camera);
  const cx = (p1.x + 1)/2*W, cy = (1 - p1.y)/2*H, r = Math.min(Math.abs(p2.x - p1.x)/2*W, W/2, H/2);
  const out = document.createElement('canvas'); out.width = out.height = 400;
  const g = out.getContext('2d'); g.fillStyle = '#C6E8F5'; g.fillRect(0, 0, 400, 400);
  try{ g.drawImage(src, cx - r, cy - r, 2*r, 2*r, 0, 0, 400, 400); }catch(e){}
  return out.toDataURL('image/jpeg', 0.85);
}

/* ---------- грамота: картинка с большими числами ---------- */
function fnStats(){
  const sum = o => Object.values(o || {}).reduce((a, v) => a + (Number.isFinite(v) ? v : 0), 0);
  const sab = isSabrinaPlayer(), st = save.st;
  const stars = sum(save.adv.best) + (save.pet ? sum(save.pet.tricks) : 0) + (save.dive.chase.best || 0);
  const pups = Object.values(save.coop.resc.lv).filter(v => v > 0).length;
  const P = plural;
  const days = Math.max(1, st.days), storms = Math.max(1, save.storm.n), letters = save.mail.got.length;
  return [
    {ic:'📅', n:days, t:P(days, 'день на острове', 'дня на острове', 'дней на острове', 'day on the island', 'days on the island')},
    {ic:'🩺', n:save.progress, t:P(save.progress, 'пациент вылечен', 'пациента вылечено', 'пациентов вылечено', 'patient healed', 'patients healed')},
    {ic:'🐟', n:save.sea.n, t:P(save.sea.n, 'рыбка поймана', 'рыбки поймано', 'рыбок поймано', 'fish caught', 'fish caught')},
    {ic:'🔎', n:pups, t:P(pups, 'мама нашла малыша', 'мамы нашли малышей', 'мам нашли малышей', 'mum found her pup', 'mums found their pups')},
    {ic:'🤿', n:save.dive.seen.length, t:P(save.dive.seen.length, 'житель моря', 'жителя моря', 'жителей моря', 'sea creature met', 'sea creatures met')},
    {ic:'⭐', n:stars, t:P(stars, 'звезда собрана', 'звезды собрано', 'звёзд собрано', 'star earned', 'stars earned')},
    {ic:'💗', n:st.tog, t:sab ? P(st.tog, 'игра с папой', 'игры с папой', 'игр с папой', 'game with Dad', 'games with Dad') : P(st.tog, 'игра вместе', 'игры вместе', 'игр вместе', 'game together', 'games together')},
    sab ? {ic:'💌', n:letters, t:P(letters, 'письмо от папы', 'письма от папы', 'писем от папы', 'letter from Dad', 'letters from Dad')}
      : {ic:'🌈', n:storms, t:P(storms, 'шторм позади', 'шторма позади', 'штормов позади', 'storm weathered', 'storms weathered')}
  ];
}
function fnTime(){
  const m = Math.round(save.st.t/60), h = Math.floor(m/60);
  return h ? L(`${h} ч ${m % 60} мин`, `${h} h ${m % 60} min`) : L(`${m} мин`, `${m} min`);
}
async function fnDiploma(photo){
  try{ await Promise.race([Promise.all([document.fonts.load('80px Pangolin'), document.fonts.load('bold 30px Nunito')]), wait(1.5)]); }catch(e){}
  const W = 1080, H = 1500, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), INK = '#3B3A4A', PINK = '#D9527E';
  const disp = s => `${s}px Pangolin, "Comic Sans MS", cursive`, txt = (w, s) => `${w} ${s}px Nunito, system-ui, sans-serif`;
  const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  g.fillStyle = '#EAF7FB'; g.fillRect(0, 0, W, H);
  // бумага-наклейка: тень, рамка, пунктир
  rr(34, 44, W - 68, H - 78, 56); g.fillStyle = INK; g.fill();
  rr(34, 30, W - 68, H - 78, 56); g.fillStyle = '#FFFDF8'; g.fill(); g.lineWidth = 9; g.strokeStyle = INK; g.stroke();
  rr(66, 62, W - 132, H - 142, 40); g.setLineDash([22, 16]); g.lineWidth = 5; g.strokeStyle = '#FF9BB8'; g.stroke(); g.setLineDash([]);
  g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.font = '64px serif'; ['🌈', '✨', '🐚', '💗'].forEach((e, i) => g.fillText(e, i % 2 ? W - 130 : 130, i < 2 ? 170 : H - 130));
  g.fillStyle = PINK; g.font = disp(124); g.fillText(L('Грамота', 'Certificate'), W/2, 205);
  g.fillStyle = INK; g.font = disp(76); g.fillText(L(`Доктор ${pname()}`, `Doctor ${pname()}`), W/2, 305);
  g.fillStyle = '#6B6A7A'; g.font = txt('bold', 36);
  g.fillText(L(`${pg('спас', 'спасла')} Тюлений остров от Великого шторма!`, 'saved Seal Island from the Great Storm!'), W/2, 365);
  // фото праздника в круге
  if(photo){
    const img = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = photo; });
    if(img){
      g.save(); g.beginPath(); g.arc(W/2, 540, 140, 0, Math.PI*2); g.clip(); g.drawImage(img, W/2 - 140, 400, 280, 280); g.restore();
      g.beginPath(); g.arc(W/2, 540, 140, 0, Math.PI*2); g.lineWidth = 9; g.strokeStyle = INK; g.stroke();
      g.beginPath(); g.arc(W/2, 540, 152, 0, Math.PI*2); g.lineWidth = 6; g.strokeStyle = '#FF9BB8'; g.stroke();
    }
  }
  // числа: 2 колонки × 4 ряда
  fnStats().forEach((s, k) => {
    const col = k % 2, row = k >> 1, x = col ? W/2 + 16 : 110, y = 730 + row*150, w = W/2 - 126;
    rr(x, y, w, 128, 28); g.fillStyle = col ^ (row & 1) ? '#FFF0F4' : '#EEF8FC'; g.fill(); g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
    g.textAlign = 'left'; g.font = '56px serif'; g.fillText(s.ic, x + 22, y + 84);
    g.fillStyle = PINK; g.font = disp(s.n > 9999 ? 62 : 78); g.fillText(String(s.n), x + 104, y + 78);
    g.fillStyle = INK; g.font = txt('bold', 27); g.fillText(s.t, x + 106, y + 112);
  });
  g.textAlign = 'center';
  g.fillStyle = '#6B6A7A'; g.font = txt('600', 30);
  const d = new Date(), date = `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  g.fillText(L(`На острове: ${fnTime()} · ${date}`, `On the island: ${fnTime()} · ${date}`), W/2, 1350);
  g.fillStyle = PINK; g.font = disp(44); g.fillText(L('— Все жители Тюленьего острова ♡', '— Everyone on Seal Island ♡'), W/2, 1405);
  return cv;
}
// отправить (бабушке) или сохранить картинку
async function fnShare(cv){
  const name = L('gramota.png', 'certificate.png');
  try{
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    const file = new File([blob], name, {type:'image/png'});
    if(navigator.canShare && navigator.canShare({files:[file]})){ await navigator.share({files:[file], title:L('Моя грамота', 'My certificate')}); return; }
  }catch(e){ if(e && e.name === 'AbortError') return; }
  try{
    const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    toast(L('Грамота сохранена 📜', 'Certificate saved 📜'));
  }catch(e){ toast(L('Нажми на картинку и подержи — так её можно сохранить', 'Press and hold the picture to save it'), 3200); }
}
// окошко с грамотой (в празднике и из «Книги острова»); resolve — когда закрыли
async function fnDiplomaPanel(photo, parent, okText = L('Дальше ▶', 'Next ▶')){
  const cv = await fnDiploma(photo);
  const wrap = document.createElement('div'); wrap.className = 'fn-dip';
  wrap.innerHTML = `<img alt="${L('Грамота', 'Certificate')}" src="${cv.toDataURL('image/png')}">
    <div class="row"><button class="btn" data-k="share">📤 ${L('Отправить', 'Share')}</button><button class="btn ghost" data-k="ok">${okText}</button></div>
    <p class="fn-small">${L('Или нажми на грамоту и подержи — сохранится картинкой', 'Or press and hold the certificate to save it as a picture')}</p>`;
  parent.appendChild(wrap); if(parent === mgStage) document.body.classList.add('fn-dip-on');   // кнопки угла не лезут на грамоту
  sfx.paper();
  return new Promise(res => {
    wrap.querySelector('[data-k="share"]').addEventListener('click', () => { sfx.tap(); fnShare(cv); });
    wrap.querySelector('[data-k="ok"]').addEventListener('click', () => { sfx.tap(); wrap.remove(); document.body.classList.remove('fn-dip-on'); res(); });
  });
}
const FN_PHOTO = [L('Праздник острова', 'Island party'), 'Праздник острова', 'Island party'];
const fnLastPhoto = () => { const a = [...save.album].reverse().find(a => FN_PHOTO.includes(a.name)); return a ? a.img : null; };
// особое письмо папы (LETTERS, fin:true) — у Сабрины, один раз
const fnLetter = () => MAIL.find(l => l.fin) || null;

/* ---------- весь праздник ---------- */
async function fnRun(){
  if(FN) return;
  sfx.whoosh(); flash();
  const fog = scene.fog, bg = scene.background, sunC = sun.color.getHex();
  smBuildOnce();
  scene.background = smSkyBright; scene.fog = new THREE.Fog(0xEAF7FB, 30, 90); sun.color.setHex(0xFFF1D6);
  fnRoot.visible = true; runCam.on = true;
  document.body.classList.add('run-on', 'fin-on');
  const homeB = document.createElement('button'); homeB.id = 'btnRunHome'; homeB.className = 'round home';
  homeB.innerHTML = '<span aria-hidden="true">🏠</span>'; homeB.setAttribute('aria-label', L('Домой', 'Home')); $('#corner').prepend(homeB);
  FN = {S:null, seats:Array(FN_SEATS.length).fill(null), sel:null, marks:null, panel:null, party:false, zoom:1, photo:null, quit:false, cakeBtn:null};
  let quitR; const quitP = new Promise(r => quitR = r);
  homeB.addEventListener('click', () => { sfx.tap(); if(FN){ FN.quit = true; if(FN.cakeGo) FN.cakeGo(); } quitR('quit'); });
  FN.S = fnBuild();
  const f0 = FN.S.me.root.position.clone(); runCam.pos.copy(f0).add(new V3(0, 9, 9)); runCam.look.copy(f0);
  mgOpen(L('Шторм позади! Все друзья идут на праздник 🎉', 'The storm is over! All your friends are coming to the party 🎉'), {hintBottom:false});
  mgTick(dt => { if(FN) fnStep(dt); });
  // гости с прошлого праздника садятся на свои места
  const was = save.story.fin.g, av = new Set(fnAvail().map(g => g.id));
  was.forEach((id, i) => { if(id && av.has(id)) fnSit(i, id, false); });
  const first = !save.story.fest.includes(8);
  let ok = await Promise.race([fnSeating().then(() => 'go'), quitP]);
  if(ok === 'go') ok = await Promise.race([fnParty().then(r => r ? 'done' : 'quit'), quitP]);
  let photo = null;
  if(ok === 'done' && FN && !FN.quit){
    photo = FN.photo;
    save.story.fin.n++;
    const old = save.album.find(a => FN_PHOTO.includes(a.name));
    if(old){ old.img = photo; old.d = Date.now(); } else albumAdd({name:FN_PHOTO[0], img:photo, d:Date.now()});
    renderAlbumCount();
    let gift = 0;
    if(first){ save.story.fest.push(8); gift = ST_GIFT[7] || 50; }
    persist();
    const panel = mgNode('div', 'mg-panel co-end fn-end', `
      <p class="ttl display">🎉 ${first ? L('Конец истории!', 'The end of the story!') : L('Праздник удался!', 'What a party!')}</p>
      <img class="co-photo" src="${photo}" alt=""><p class="got">📷 ${L('Фото — в альбоме', 'The photo is in the album')}</p>
      <p class="got">${first ? L('Ты ' + pg('прошёл', 'прошла') + ' всю Книгу острова! Но остров живёт дальше — заходи каждый день ♡', 'You finished the whole Island book! But the island lives on — come back every day ♡') : L('Все друзья сыты и счастливы ♡', 'All your friends are full and happy ♡')}</p>
      <p class="earned display">${gift ? `+${gift} 🐚` : ''}</p>
      <div class="row"><button class="btn" data-k="dip">📜 ${L('Моя грамота', 'My certificate')}</button></div>`);
    if(gift) setTimeout(() => addShells(gift, {x:innerWidth/2, y:innerHeight*0.4}), 700);
    if(save.pet && typeof petGive === 'function' && petSeal) setTimeout(() => { try{ petGive(6); }catch(e){} }, 1200);
    mgHint('');
    await Promise.race([new Promise(r => mgOn(panel.querySelector('[data-k="dip"]'), 'click', () => { sfx.tap(); r(); })), quitP]);
    if(FN && !FN.quit){ panel.remove(); await Promise.race([fnDiplomaPanel(photo, mgStage), quitP]); }
  }
  mgHint(''); mgClose(); document.body.classList.remove('fn-dip-on');
  fnRoot.remove(FN.S.G); FN = null;
  homeB.remove(); document.body.classList.remove('run-on', 'fin-on');
  fnRoot.visible = false; runCam.on = false; homeLights(false);
  scene.fog = fog; scene.background = bg; sun.color.setHex(sunC);
  // особое письмо папы — сразу после первого праздника
  const lt = fnLetter();
  if(ok === 'done' && lt && isSabrinaPlayer() && !mailHas(letterId(lt))) setTimeout(() => mailEnvelope(lt), 600);
  if(typeof stCheck === 'function') stCheck();
}
// вход: из «Книги острова» (праздник главы 8, «Сегодня», повтор) — сначала в уголок малыша, как «Идём ▶»
async function fnGo(){
  if(!save.pet) return toast(L('Сначала познакомься со своим малышом 🦭', 'Meet your pup first 🦭'));
  if(FN) return;
  const park = mgCanPark();
  if(!park && (busy || !mgRoot.hidden)) return toast(L('Сначала закончи то, что начала 🙂', 'Finish what you started first 🙂'));
  $('#story').hidden = true; document.body.classList.remove('story-on');
  if(homeMode) homeExit();
  if(!petMode){ goPet(true); await wait(0.9); }
  for(let i = 0; i < 40 && busy; i++) await wait(0.1);
  if(!petMode || busy || !mgRoot.hidden) return;
  fnRun();
}
