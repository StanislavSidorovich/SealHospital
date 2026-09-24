/* ---------------- мой тюленёнок (Фаза 3, часть 1): знакомство, уголок, потребности, уход ----------------
   Малыш из события «в гости» остаётся жить у Сабрины. Его уголок — вторая льдина справа от больницы
   (PET_POS); кнопка 🦭/🏥 в углу плавно везёт туда камеру (camOff в game.js).
   Четыре потребности тают в реальном времени, у каждой своя мини-игра на слое #mg.
   Проиграть нельзя: малыш не болеет и не обижается, просто грустит и показывает пузырь-мысль.
   Подключается после shift.js и до game.js. */
const PET_POS = new V3(10, 0, 0);           // центр льдины-уголка
const PET_SPOT = new V3(10, 0.25, 0.2);     // где стоит малыш
const PET_SCALE = 0.62;
const PET_VIEW = new V3(0, -0.75, -2.2);   // в уголке камера чуть ближе: малыш меньше взрослого пациента
const PET_COATS = [
  {id:'snow', c:0xFFFFFF, name:'Белоснежный'},
  {id:'pink', c:0xF6C4D3, name:'Розовый'},   // чуть насыщеннее, чем у пациентов: в мультяшном свете бледные почти не отличить
  {id:'sky',  c:0xC6DCF4, name:'Голубой'},
  {id:'mint', c:0xC4E6D0, name:'Мятный'},
  {id:'sand', c:0xE9D3AE, spot:0xC9A479, name:'Песочный в пятнышках'},
  {id:'grey', c:0xB9C2D0, spot:0x8591A8, name:'Серый в пятнышках'}
];
const PET_NAMES = {
  m:['Пломбир', 'Пончик', 'Кекс', 'Буся', 'Тофу', 'Мармелад', 'Сугроб', 'Орешек', 'Хрустик', 'Пушок'],
  f:['Булочка', 'Плюшка', 'Льдинка', 'Снежинка', 'Карамелька', 'Пуговка', 'Ватрушка', 'Мася', 'Жемчужинка', 'Пушинка']
};
// rate — сколько потребность теряет за час (1 → 0 примерно за 7–14 часов)
const NEEDS = {
  food: {ic:'🐟', act:'Покормить', want:'Хочет кушать', say:'Хочу кушать!', rate:0.12},
  bath: {ic:'🛁', act:'Искупать', want:'Хочет купаться', say:'Хочу купаться!', rate:0.07},
  sleep:{ic:'🌙', act:'Уложить', want:'Хочет спать', say:'Хочу баиньки…', rate:0.09},
  fun:  {ic:'⚽', act:'Поиграть', want:'Хочет играть', say:'Давай играть!', rate:0.15}
};
const NEED_KEYS = Object.keys(NEEDS);
const NEED_TEX = {food:bubbleTex('🐟'), bath:bubbleTex('🛁'), sleep:bubbleTex('💤'), fun:bubbleTex('⚽')};
const HEART_XP = 30;   // столько опыта — одно сердечко дружбы
let petMode = false, petSeal = null, petHelloShown = false;
const gg = (m, f) => save.pet && save.pet.f ? f : m;   // род: «сыт / сыта»
const coatOf = id => PET_COATS.find(c => c.id === id) || PET_COATS[0];
const hexCss = c => '#' + c.toString(16).padStart(6, '0');
const adoptPending = () => !save.pet && save.shifts >= 1;

/* ---------- уголок: льдина, домик, табличка с именем, миска, мяч ---------- */
const petCorner = new THREE.Group(); petCorner.position.copy(PET_POS); scene.add(petCorner);
{ const fl = addOutline(new THREE.Mesh(floeGeo, floe.material), 1.02); fl.position.y = -0.05; fl.rotation.y = 2.1; fl.scale.setScalar(0.92); petCorner.add(fl);
  const fm = new THREE.Mesh(foam.geometry, foam.material); fm.rotation.x = -Math.PI/2; fm.position.y = 0.1; fm.scale.setScalar(0.92); petCorner.add(fm);
  // домик-иглу с сердечком вместо креста (в Фазе 4 он станет настоящим домом)
  const h = new THREE.Group(); h.position.set(-1.5, 0.25, -2.0); h.rotation.y = 0.3;
  h.add(addOutline(new THREE.Mesh(new THREE.SphereGeometry(0.8, 28, 14, 0, Math.PI*2, 0, Math.PI/2), toon(0xFFF4F7)), 1.03));
  const tunnel = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.5, 18, 1, false, -Math.PI/2, Math.PI), toon(0xFFF4F7)), 1.05);
  tunnel.rotation.x = Math.PI/2; tunnel.position.set(0, 0, 0.75); h.add(tunnel);
  const door = new THREE.Mesh(new THREE.CircleGeometry(0.24, 20, 0, Math.PI), new THREE.MeshBasicMaterial({color:0x5C6E91}));
  door.position.set(0, 0, 1.01); h.add(door);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55), inkMat); pole.position.y = 1.0; h.add(pole);
  const heart = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.55), new THREE.MeshBasicMaterial({map:TEX.heart, transparent:true, side:THREE.DoubleSide}));
  heart.position.y = 1.4; h.add(heart);
  petCorner.add(h);
  // миска с рыбками
  const bowl = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.18, 24), toon(0xFF9BB8)), 1.08);
  bowl.position.set(1.2, 0.34, 1.15); petCorner.add(bowl);
  for(const [x, r] of [[-0.08, 0.3], [0.1, -0.4]]){ const f = makeFish(); f.scale.setScalar(0.45); f.position.set(x, 0.1, 0); f.rotation.set(0, r, 0.2); bowl.add(f); }
}
// табличка с именем малыша (перерисовывается, когда имя известно и шрифт загрузился)
const signMat = new THREE.MeshBasicMaterial({transparent:true});
{ const post = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.9, 8), toon(0xE0A36B)), 1.15);
  post.position.set(1.5, 0.7, -1.6); petCorner.add(post);
  const board = addOutline(new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.42, 0.06), toon(0xF2C48D)), 1.06);
  board.position.set(1.5, 1.1, -1.56); board.rotation.y = -0.3; petCorner.add(board);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.38), signMat); face.position.z = 0.035; board.add(face);
  petCorner.userData.board = board; board.visible = false; post.visible = false; petCorner.userData.post = post;
}
function drawSign(){
  const p = save.pet, board = petCorner.userData.board;
  board.visible = petCorner.userData.post.visible = !!p;
  if(!p) return;
  if(signMat.map) signMat.map.dispose();
  signMat.map = canvasTex(256, (g, w, h) => {
    const txt = p.name + ' ♡', font = px => `${px}px Pangolin, "Comic Sans MS", Nunito, sans-serif`;
    g.font = font(58); const fit = g.measureText(txt).width;
    if(fit > w - 20) g.font = font(Math.floor(58*(w - 20)/fit));
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#3B3A4A'; g.fillText(txt, w/2, h/2 + 4);
  }, 96);
  signMat.needsUpdate = true;
}
// пляжный мяч: разноцветные дольки, белые «шапочки»
const BALL_TEX = canvasTex(128, (g, w, h) => {
  ['#FF7FA3', '#FFFFFF', '#FFD66B', '#FFFFFF', '#6FB6F5', '#FFFFFF'].forEach((c, i) => { g.fillStyle = c; g.fillRect(i*w/6, 0, w/6 + 1, h); });
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h*0.1); g.fillRect(0, h*0.9, w, h*0.1);
}, 64);
const petBall = (() => {
  const m = toon(0xFFFFFF); m.map = BALL_TEX;
  const b = addOutline(new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16), m), 1.07);
  b.userData.rest = PET_POS.clone().add(new V3(-1.25, 0.47, 1.1)); b.position.copy(b.userData.rest); b.rotation.z = 0.4;
  scene.add(b); return b;
})();

/* ---------- модель малыша ---------- */
function makePetSeal(p = save.pet){
  const c = coatOf(p.coat);
  const s = makeSeal({name:p.name, f:p.f, color:c.c, spot:c.spot});
  s.root.scale.setScalar(PET_SCALE);
  // ротик «о»: малыш открывает его, когда к нему несут рыбку
  const o = onHead(new THREE.Mesh(new THREE.CircleGeometry(0.075, 20), inkMat), 0, -0.16, 1, 0.012);
  o.scale.y = 1.2; o.visible = false; s.head.add(o); s.mouthO = o;
  for(const slot of ['head', 'face']){ const id = p.wear && p.wear[slot]; if(id && WEAR[id] && owns(id)) wearOn(s, id); }
  s.happyUntil = 0;
  return s;
}
function placePet(){
  if(petSeal) scene.remove(petSeal.root);
  petSeal = makePetSeal(); petSeal.root.position.copy(PET_SPOT); scene.add(petSeal.root);
}

/* ---------- потребности ---------- */
function petDecay(){
  const p = save.pet; if(!p) return;
  const ms = Date.now(), h = Math.min(48, Math.max(0, (ms - p.t)/3.6e6));   // часы с прошлого пересчёта (перевод часов назад не вредит)
  for(const k of NEED_KEYS) p.needs[k] = Math.max(0, p.needs[k] - NEEDS[k].rate*h);
  p.t = ms;
}
function petLow(){   // чего малыш хочет сильнее всего (или null, если всё хорошо)
  let best = null;
  for(const k of NEED_KEYS){ const v = save.pet.needs[k]; if(v < 0.5 && (!best || v < save.pet.needs[best])) best = k; }
  return best;
}
const allGood = () => NEED_KEYS.every(k => save.pet.needs[k] >= 0.8);
function petRefresh(){
  if(!save.pet) return renderPetBtn();
  if(petSeal && !busy && !petSeal.sleeping){
    const low = petLow();
    setMood(petSeal, now < petSeal.happyUntil ? 'happy' : low && save.pet.needs[low] < 0.25 ? 'sad' : 'ok');
    petSeal.bubble.visible = !!low;
    if(low && petSeal.bubble.material.map !== NEED_TEX[low]){ petSeal.bubble.material.map = NEED_TEX[low]; petSeal.bubble.material.needsUpdate = true; }
  }
  renderPetCard(); renderPetBar(); renderPetBtn();
}
function renderPetCard(){
  const p = save.pet; $('#petCard').hidden = !p; if(!p) return;
  $('#petName').textContent = p.name;
  const low = petLow();
  $('#petStatus').textContent = petSeal && petSeal.sleeping ? 'Сладко спит… z-z-z. Нажми, чтобы разбудить'
    : low ? `${NEEDS[low].ic} ${NEEDS[low].want}` : gg('Счастлив! ♡', 'Счастлива! ♡');
  $('#petLove').style.width = (p.xp % HEART_XP)/HEART_XP*100 + '%';
  $('#petHearts').textContent = Math.floor(p.xp/HEART_XP);
}
function buildPetBar(){
  const nav = $('#petBar'); nav.innerHTML = '';
  for(const k of NEED_KEYS.concat('dress')){
    const b = document.createElement('button'); b.className = 'tool'; b.id = 'pet-' + k;
    b.innerHTML = k === 'dress' ? '<span class="face" aria-hidden="true">🎀</span><span class="name">Нарядить</span>'
      : `<span class="face" aria-hidden="true">${NEEDS[k].ic}</span><span class="name">${NEEDS[k].act}</span><span class="meter"><i></i></span>`;
    b.addEventListener('click', () => { sfx.tap(); petDo(k); });
    nav.appendChild(b);
  }
}
function renderPetBar(){
  if(!save.pet) return;
  for(const k of NEED_KEYS){
    const b = $('#pet-' + k), v = save.pet.needs[k];
    b.querySelector('.meter i').style.width = Math.max(6, v*100) + '%';
    b.classList.toggle('want', v < 0.35);
  }
}
function renderPetBtn(){
  const b = $('#btnPet'); b.hidden = !save.pet; if(!save.pet) return;
  $('#petIc').textContent = petMode ? '🏥' : '🦭';
  b.setAttribute('aria-label', petMode ? 'В больницу' : 'Мой малыш');
  $('#petAlert').hidden = petMode || !NEED_KEYS.some(k => save.pet.needs[k] < 0.35);
}
// опыт дружбы: «+5 💗» над малышом, каждые HEART_XP — новое сердечко
function petGive(n){
  const p = save.pet, lv0 = Math.floor(p.xp/HEART_XP);
  p.xp += n; persist();
  const at = toScreen(headTop(petSeal)), lbl = document.createElement('div');
  lbl.className = 'plus display'; lbl.textContent = `+${n} 💗`;
  lbl.style.left = at.x + 'px'; lbl.style.top = at.y + 'px'; $('#app').appendChild(lbl);
  setTimeout(() => lbl.remove(), 1300);
  const lv = Math.floor(p.xp/HEART_XP);
  if(lv > lv0){ sfx.star(); burst(TEX.heart, headTop(petSeal), 16, 2.2, 0.34); toast(`Вы дружите ещё крепче! Сердечек дружбы: ${lv} 💗`, 3200); }
  renderPetCard();
}

/* ---------- переключатель «Больница / Мой малыш» ---------- */
function setPetMode(on){
  petMode = on; document.body.classList.toggle('pet-mode', on);
  camOffWant.copy(on ? PET_POS.clone().add(PET_VIEW) : new V3()); unfocusCam();
  $('#night').classList.toggle('on', on && !!petSeal && petSeal.sleeping);
  renderPetBtn();
}
function goPet(on){
  if(on === petMode || !save.pet) return;
  if(busy || !mgRoot.hidden) return toast('Сначала закончи то, что начала 🙂');
  sfx.whoosh(); setPetMode(on);
  if(on){
    petDecay(); petRefresh();
    if(!petHelloShown){ petHelloShown = true; const low = petLow();
      toast(low ? `${save.pet.name}: «${NEEDS[low].say}» Выбирай внизу ${NEEDS[low].ic}` : `${save.pet.name} ${gg('рад', 'рада')} тебя видеть! ♡`, 3400); }
  } else if(!shift || shift.n >= SHIFT_SIZE) startShift();   // смена кончилась — в больнице ждёт новая
}
$('#btnPet').addEventListener('click', () => { sfx.tap(); goPet(!petMode); });

/* ---------- знакомство ---------- */
function cleanName(v){
  v = v.replace(/\s+/g, ' ').trim().slice(0, 14);
  return v.charAt(0).toUpperCase() + v.slice(1);
}
async function adopt(){
  setBusy(true);
  $('#card').hidden = true; $('#tools').hidden = true; $('#wardrobe').hidden = true; unfocusCam();
  const draft = {name:'Малыш', f:false, coat:PET_COATS[Math.floor(Math.random()*4)].id, wear:{}};
  petSeal = makePetSeal(draft); setMood(petSeal, 'ok');
  await arrive(petSeal);
  sfx.arf(); floatText('Привет, доктор!', headTop(petSeal));
  focusCam(worldOf(petSeal, new V3(0, -0.7, 0)), 3.2, 0.95);
  await wait(0.6);

  mgOpen('Малыш приплыл снова!');
  const ask = mgNode('div', 'mg-panel adopt', '<p>Он так тебя полюбил, что хочет остаться жить у тебя. Возьмёшь его?</p><button class="btn" id="adoptYes">Конечно! ♡</button>');
  await new Promise(r => mgOn(ask.querySelector('#adoptYes'), 'click', r));
  sfx.tap(); ask.classList.add('away'); await wait(0.3); mgClose();
  setMood(petSeal, 'happy'); sfx.hug(); petSeal.flap = 1;
  burst(TEX.heart, headTop(petSeal), 18, 2.2, 0.32);
  await tween(0.8, k => { petSeal.inner.position.y = Math.sin(k*Math.PI)*0.9; petSeal.inner.rotation.y = k*Math.PI*2; }, ease.io);
  petSeal.inner.position.y = 0; petSeal.inner.rotation.y = 0; petSeal.flap = 0.3;
  await squash(petSeal, 0.25);
  floatText('Ура-а!', headTop(petSeal), '#D9527E');
  await wait(0.6);

  // окрас и мальчик/девочка: малыш на экране сразу меняется
  mgOpen('Какой у тебя малыш?');
  const look = mgNode('div', 'mg-panel picker', `
    <p class="row-lbl">Окрас</p>
    <div class="swatches">${PET_COATS.map(c => `<button class="swatch${c.spot ? ' spotty' : ''}" data-c="${c.id}" style="--c:${hexCss(c.c)};--s:${hexCss(c.spot || c.c)}" aria-label="${c.name}"></button>`).join('')}</div>
    <p class="row-lbl">Кто это?</p>
    <div class="sex"><button data-f="0">👦 Мальчик</button><button data-f="1">👧 Девочка</button></div>
    <button class="btn" id="lookDone">Дальше →</button>`);
  const rebuild = () => {
    const pos = petSeal.root.position.clone(); scene.remove(petSeal.root);
    petSeal = makePetSeal(draft); petSeal.root.position.copy(pos); scene.add(petSeal.root);
    setMood(petSeal, 'happy'); squash(petSeal, 0.15, 0.3); sfx.pop();
  };
  const mark = () => {
    look.querySelectorAll('.swatch').forEach(b => b.classList.toggle('sel', b.dataset.c === draft.coat));
    look.querySelectorAll('.sex button').forEach(b => b.classList.toggle('sel', (b.dataset.f === '1') === draft.f));
  };
  mark();
  look.querySelectorAll('.swatch').forEach(b => mgOn(b, 'click', () => { draft.coat = b.dataset.c; mark(); rebuild(); }));
  look.querySelectorAll('.sex button').forEach(b => mgOn(b, 'click', () => {
    draft.f = b.dataset.f === '1'; mark(); sfx.pop(); floatText(draft.f ? 'Я девочка!' : 'Я мальчик!', headTop(petSeal));
  }));
  await new Promise(r => mgOn(look.querySelector('#lookDone'), 'click', r));
  sfx.tap(); look.classList.add('away'); await wait(0.3); mgClose();

  // имя: можно написать (вместе с папой) или выбрать подсказку
  focusCam(worldOf(petSeal, new V3(0, -0.5, 0)), 3.0, -1.1);   // малыш внизу, панель с именем сверху
  mgOpen('');
  const nm = mgNode('div', 'mg-panel name-panel', `
    <p class="ttl display">Как зовут ${draft.f ? 'малышку' : 'малыша'}?</p>
    <input id="petNameIn" maxlength="14" autocomplete="off" autocapitalize="words" enterkeyhint="done" placeholder="Имя" aria-label="Имя малыша">
    <div class="chips" id="nameChips"></div>
    <p class="tip">Придумай вместе с папой ♡</p>
    <button class="btn" id="nameDone">Готово ✓</button>`);
  const input = nm.querySelector('#petNameIn'), chips = nm.querySelector('#nameChips');
  const deal = () => {
    const pool = PET_NAMES[draft.f ? 'f' : 'm'].slice().sort(() => Math.random() - 0.5).slice(0, 5);
    chips.innerHTML = pool.map(n => `<button class="chip">${n}</button>`).join('') + '<button class="chip dice" aria-label="Другие имена">🎲</button>';
    chips.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => {
      sfx.tap();
      if(b.classList.contains('dice')) return deal();
      input.value = b.textContent; floatText(b.textContent + '?', headTop(petSeal)); squash(petSeal, 0.12, 0.3);
    }));
  };
  deal();
  const name = await new Promise(r => {
    const ok = () => {
      const v = cleanName(input.value);
      if(!v){ sfx.bad(); wiggle(input); input.placeholder = 'Напиши имя или выбери ↓'; return; }
      r(v);
    };
    mgOn(nm.querySelector('#nameDone'), 'click', ok);
    mgOn(input, 'keydown', e => { if(e.key === 'Enter') ok(); });
  });
  input.blur();
  save.pet = sanitizePet({...draft, name, born:Date.now(), xp:0, t:Date.now(), needs:{food:0.35, bath:0.55, sleep:0.7, fun:0.25}});
  persist();
  nm.classList.add('away'); await wait(0.3); mgClose();
  petSeal.p.name = name; drawSign();
  setMood(petSeal, 'happy'); sfx.hug(); burst(TEX.heart, headTop(petSeal), 20, 2.4, 0.34);
  floatText(name + '!', headTop(petSeal), '#D9527E');
  await hop(petSeal, 0.4, 0.45);
  await wait(0.9);
  toast(`${name} переезжает в свой уголок! 🦭`, 2600);
  await petMoveIn();
  petSeal.happyUntil = now + 2; setBusy(false);
  petHelloShown = true; petRefresh();
  floatText('Мой домик!', headTop(petSeal));
  toast(`Добро пожаловать домой, ${name}! Выбирай внизу, что ${gg('ему', 'ей')} нужно`, 4200);
}
// малыш прыгает в воду, плывёт к своей льдине, камера едет следом
async function petMoveIn(){
  const s = petSeal, r = s.root, x0 = r.position.x;
  setPetMode(true);
  s.flap = 0.6;
  await tween(0.4, k => { r.rotation.y = k*Math.PI/2; });
  await tween(0.75, k => { r.position.x = x0 + 3.5*k; r.position.y = 0.25 - 0.8*k + Math.sin(k*Math.PI)*1.3; }, ease.lin);
  sfx.splash(); burst(TEX.puff, new V3(x0 + 3.5, 0.1, r.position.z), 10, 1.6, 0.45);
  s.swimming = true; s.flap = 0;
  const x1 = PET_SPOT.x - 3.4, z0 = r.position.z;
  await tween(1.7, k => { r.position.x = x0 + 3.5 + (x1 - x0 - 3.5)*k; r.position.z = z0 + (PET_SPOT.z - z0)*k; }, ease.io);
  sfx.splash(); burst(TEX.puff, new V3(x1, 0.1, PET_SPOT.z), 10, 1.6, 0.45);
  s.swimming = false; s.inner.position.y = 0;
  await tween(0.75, k => { r.position.x = x1 + 3.4*k; r.position.y = -0.55 + 0.8*k + Math.sin(k*Math.PI)*1.3; }, ease.lin);
  r.position.copy(PET_SPOT); await squash(s);
  await tween(0.45, k => { r.rotation.y = Math.PI/2*(1 - k); });
}

/* ---------- уход: общий вход для кнопок внизу ---------- */
async function petDo(k){
  if(busy || !mgRoot.hidden || !petSeal || !save.pet) return;
  if(k === 'dress') return petDress();
  petDecay();
  const s = petSeal, p = save.pet, before = p.needs[k];
  if(k === 'sleep' && s.sleeping) return toast(`${p.name} сладко спит 💤 Нажми на ${gg('него', 'неё')}, чтобы разбудить`);
  if(k === 'food' && before >= 0.9) return petNope(`${gg('Я сыт', 'Я сыта')}! Давай поиграем?`);
  if(k === 'sleep' && before >= 0.9) return petNope(`Не хочу спать! Я ${gg('бодрый', 'бодрая')}!`);
  const wasGood = allGood();
  setBusy(true); s.bubble.visible = false;
  if(s.sleeping) await petWake();
  await PET_GAMES[k](s);
  unfocusCam();
  p.needs[k] = 1;
  if(k === 'fun'){ p.needs.food = Math.max(0, p.needs.food - 0.12); p.needs.bath = Math.max(0, p.needs.bath - 0.25); }
  if(!s.sleeping){ s.happyUntil = now + 3; setMood(s, 'happy'); }   // уснувшему не открываем глазки
  petGive(4 + Math.round(6*(1 - before)));
  persist(); renderPetCard(); renderPetBar();
  if(k === 'fun') toast(`${gg('Наигрался', 'Наигралась')}! И немножко ${gg('испачкался', 'испачкалась')} 🛁`);
  if(!wasGood && allGood()){   // все потребности закрыты — маленький праздник
    await wait(0.8);
    burst(TEX.heart, headTop(s), 20, 2.4, 0.34);
    if(s.sleeping){ sfx.lullaby(); floatText(gg('Счастлив во сне ♡', 'Счастлива во сне ♡'), headTop(s).add(new V3(0, 0.4, 0)), '#D9527E'); }
    else {
      sfx.hug(); s.flap = 1; floatText(gg('Я счастлив!', 'Я счастлива!'), headTop(s), '#D9527E');
      await tween(0.8, q => { s.inner.position.y = Math.sin(q*Math.PI)*0.7; s.inner.rotation.y = q*Math.PI*2; }, ease.io);
      s.inner.position.y = 0; s.inner.rotation.y = 0; s.flap = 0;
    }
    petGive(5);
  }
  setBusy(false); petRefresh();
}
async function petNope(msg){
  const s = petSeal; setBusy(true); sfx.arf(); floatText(msg, headTop(s)); toast(msg);
  await tween(0.6, k => { s.shake = Math.sin(k*Math.PI*4)*0.3*(1 - k); }, ease.lin); s.shake = 0;
  setBusy(false);
}
function petTap(e){
  if(!petSeal || busy || !mgRoot.hidden) return;
  const rect = canvas.getBoundingClientRect();
  ndc.set((e.clientX - rect.left)/rect.width*2 - 1, -((e.clientY - rect.top)/rect.height)*2 + 1);
  ray.setFromCamera(ndc, camera);
  if(!ray.intersectObjects(petSeal.hits, false).length) return;
  if(petSeal.sleeping){ setBusy(true); petWake().then(() => { setBusy(false); petRefresh(); }); return; }
  sfx.arf(); squash(petSeal, 0.15, 0.3);
  floatText(['Ар!', 'Хи-хи', '♡', 'Ар-ар!'][Math.floor(Math.random()*4)], headTop(petSeal));
  emit(TEX.heart, headTop(petSeal), {v:new V3(0, 1, 0.3), life:0.9, size:0.3});
  const low = petLow();
  if(low) toast(`${save.pet.name}: «${NEEDS[low].say}» Нажми ${NEEDS[low].ic} внизу`);
}

/* ---------- Покормить: неси рыбку ко рту ---------- */
async function petFeed(s){
  const p = save.pet, n = Math.max(1, Math.min(3, Math.ceil((1 - p.needs.food)/0.34)));
  focusCam(worldOf(s, new V3(0, -0.35, 0)), 2.2, 0.4);
  await wait(0.4);
  mgOpen(n > 1 ? 'Неси рыбку прямо ко рту' : 'Одну рыбку — неси ко рту');
  const plate = mgNode('div', 'plate'), target = mgNode('div', 'target');
  const fishes = [];
  for(let i = 0; i < n; i++){ const f = document.createElement('div'); f.className = 'fish-drag'; f.textContent = '🐟'; plate.appendChild(f); fishes.push(f); }
  let left = n, drag = null, finish;
  const done = new Promise(r => finish = r);
  const mouth = () => toScreen(worldOf(s, s.mouthLocal));
  const open = v => { s.mouthO.visible = v; s.smile.visible = !v; };
  mgTick(() => { const m = mouth(); target.style.left = m.x + 'px'; target.style.top = m.y + 'px'; });
  const eat = async el => {
    el.remove(); drag = null; open(false); left--;
    floatText(['Ам!', 'Ням!', 'Вкусно!'][left % 3], headTop(s));
    burst(TEX.star, worldOf(s, s.mouthLocal), 5, 1.2, 0.2);
    for(let i = 0; i < 2; i++){ sfx.chomp(); await tween(0.16, k => s.head.scale.set(1, 1 - Math.sin(k*Math.PI)*0.1, 1), ease.lin); }
    s.head.scale.set(1, 1, 1);
    if(!left) finish(); else mgHint(`Ещё ${left === 1 ? 'одну' : left}!`);
  };
  const move = (el, e) => {
    el.style.left = e.clientX + 'px'; el.style.top = e.clientY + 'px';
    const m = mouth(), d = Math.hypot(e.clientX - m.x, e.clientY - m.y);
    open(d < 130);
    if(d < 55) eat(el);
  };
  for(const el of fishes){
    mgOn(el, 'pointerdown', e => {
      e.stopPropagation(); if(drag) return;
      drag = el; mgStage.appendChild(el); el.classList.add('drag');
      try{ el.setPointerCapture(e.pointerId); }catch(err){}
      sfx.tap(); move(el, e);
    });
    mgOn(el, 'pointermove', e => { if(drag === el) move(el, e); });
    const drop = e => {
      if(drag !== el) return;
      const m = mouth();
      if(Math.hypot(e.clientX - m.x, e.clientY - m.y) < 95) return eat(el);
      drag = null; open(false); el.classList.remove('drag'); el.style.left = el.style.top = ''; plate.appendChild(el);
      sfx.bad(); mgHint('Почти! Неси прямо ко рту');
    };
    mgOn(el, 'pointerup', drop); mgOn(el, 'pointercancel', drop);
  }
  await done;
  mgHint('Спасибо! Вкусно! ♡'); sfx.good();
  await wait(0.8);
  mgClose(); open(false);
  hop(s, 0.3, 0.4);
}

/* ---------- Искупать: намылить губкой и полопать пузыри ---------- */
const SOAP_TEX = canvasTex(64, (g) => {
  g.beginPath(); g.arc(32, 32, 27, 0, 7); g.fillStyle = 'rgba(190,230,250,.35)'; g.fill();
  g.lineWidth = 3; g.strokeStyle = 'rgba(59,58,74,.75)'; g.stroke();
  g.beginPath(); g.arc(22, 21, 7, 0, 7); g.fillStyle = 'rgba(255,255,255,.95)'; g.fill();
});
function makeTub(){
  const g = new THREE.Group();
  const wm = toon(0x9ED6F0); wm.side = THREE.DoubleSide;   // без контура-оболочки: у открытого цилиндра она видна изнутри
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.9, 0.55, 32, 1, true), wm));
  const rim = addOutline(new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.07, 8, 40), toon(0xFF9BB8)), 1.03);
  rim.rotation.x = Math.PI/2; rim.position.y = 0.275; g.add(rim);
  const water = new THREE.Mesh(new THREE.CircleGeometry(1.0, 32), toon(0x9FDDF2)); water.rotation.x = -Math.PI/2; water.position.y = 0.2; g.add(water);
  const fm = toon(0xFFFFFF);
  for(let i = 0; i < 14; i++){ const a = i/14*Math.PI*2, f = new THREE.Mesh(SMALL, fm); f.scale.setScalar(0.12 + (i % 3)*0.04); f.position.set(Math.cos(a)*0.86, 0.24, Math.sin(a)*0.86); g.add(f); }
  return g;
}
async function petBath(s){
  const tub = makeTub(); tub.position.set(s.root.position.x, 0.525, s.root.position.z); tub.scale.setScalar(0.01); scene.add(tub);
  sfx.splash(); hop(s, 0.45, 0.5);
  await tween(0.5, k => tub.scale.setScalar(Math.max(0.01, k)), ease.back);
  focusCam(worldOf(s, new V3(0, -0.5, 0)), 2.5, 0.55);
  // грязные пятнышки: три на голове, по одному на боках
  const spots = [];
  for(const [x, y, z] of [[0.45, 0.5, 0.7], [-0.5, 0.4, 0.75], [0.05, 0.8, 0.55]]){
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:DIRT_TEX, transparent:true, depthWrite:false}));
    onHead(sp, x, y, z, 0.04); sp.scale.setScalar(0.28); s.head.add(sp); spots.push(sp);
  }
  for(const x of [1.02, -1.02]){
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:DIRT_TEX, transparent:true, depthWrite:false}));
    sp.position.set(x, 1.15, 0.05); sp.scale.setScalar(0.34); s.inner.add(sp); spots.push(sp);
  }
  const foams = [];
  const wp = o => o.getWorldPosition(new V3());
  await wait(0.4);

  mgOpen('Потри губкой — намыль малыша');
  const sponge = mgNode('div', 'cotton sponge'), finger = mgNode('div', 'finger', '👆');
  let down = false, px = 0, py = 0, rubT = 0, left = spots.length, giggled = false, finish;
  const soaped = new Promise(r => finish = r);
  const place = (el, x, y) => { el.style.left = x + 'px'; el.style.top = y + 'px'; };
  mgOn(mgRoot, 'pointerdown', e => { down = true; px = e.clientX; py = e.clientY; sponge.classList.add('on'); place(sponge, px, py); finger.hidden = true; });
  mgOn(mgRoot, 'pointermove', e => {
    if(!down) return;
    const d = Math.hypot(e.clientX - px, e.clientY - py); px = e.clientX; py = e.clientY; place(sponge, px, py);
    if(!d) return;
    if(now - rubT > 0.09){ rubT = now; sfx.rub(); }
    for(const sp of spots){
      if(!sp.visible) continue;
      const p = toScreen(wp(sp));
      if(Math.hypot(p.x - px, p.y - py) > 55) continue;
      sp.material.opacity -= d/240;
      if(sp.material.opacity <= 0.08){   // пятнышко превращается в пенку
        sp.visible = false; left--; sfx.pop();
        const f = new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.puff, transparent:true, depthWrite:false}));
        f.position.copy(sp.position); f.scale.setScalar(0.5); sp.parent.add(f); foams.push(f);
        emit(TEX.puff, wp(sp), {v:new V3(0, 0.5, 0.2), life:0.6, size:0.3, grow:1});
        if(!giggled){ giggled = true; floatText('Хи-хи!', headTop(s)); }
        if(!left) finish(); else mgHint(`Ещё ${left} ${plural(left, 'пятнышко', 'пятнышка', 'пятнышек')}`);
      }
    }
  });
  for(const ev of ['pointerup', 'pointercancel']) mgOn(mgRoot, ev, () => { down = false; sponge.classList.remove('on'); });
  mgTick(() => { const sp = spots.find(x => x.visible); if(sp){ const c = toScreen(wp(sp)); place(finger, c.x, c.y); } });
  await soaped;
  mgClose(); sfx.good(); floatText('Пенка!', headTop(s));
  await wait(0.5);

  // пузыри поднимаются из ванны — лопай пальцем
  const GOAL = 8;
  mgOpen(`Лопай пузыри! Ещё ${GOAL}`);
  const bubbles = [];
  let popped = 0, spawnT = 0, fin2;
  const popDone = new Promise(r => fin2 = r);
  const spawn = () => {
    const a = Math.random()*Math.PI*2, r = Math.random()*0.8;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:SOAP_TEX, transparent:true, depthWrite:false}));
    sp.position.set(tub.position.x + Math.cos(a)*r, 0.8, tub.position.z + Math.sin(a)*r*0.6 + 0.3);
    sp.scale.setScalar(0.01); sp.userData = {size:0.3 + Math.random()*0.2, ph:Math.random()*6, v:0.5 + Math.random()*0.35};
    scene.add(sp); bubbles.push(sp);
  };
  mgTick(dt => {
    spawnT -= dt;
    if(spawnT < 0 && bubbles.length < 6){ spawnT = 0.45; spawn(); }
    for(let i = bubbles.length - 1; i >= 0; i--){
      const b = bubbles[i], u = b.userData;
      b.position.y += u.v*dt; b.position.x += Math.sin(now*2 + u.ph)*dt*0.25;
      b.scale.setScalar(Math.min(u.size, b.scale.x + dt*0.8));
      if(b.position.y > 3.4){ scene.remove(b); b.material.dispose(); bubbles.splice(i, 1); }
    }
  });
  mgOn(mgRoot, 'pointerdown', e => {
    let best = -1, bd = 62;
    bubbles.forEach((b, i) => { const p = toScreen(b.position), d = Math.hypot(p.x - e.clientX, p.y - e.clientY); if(d < bd){ bd = d; best = i; } });
    if(best < 0) return;
    const b = bubbles.splice(best, 1)[0];
    scene.remove(b); b.material.dispose();
    sfx.pop(); emit(TEX.star, b.position, {v:new V3(0, 0.4, 0), life:0.45, size:0.2, spin:4});
    const f = foams.pop(); if(f){ f.parent.remove(f); f.material.dispose(); }
    popped++;
    if(popped >= GOAL) fin2(); else mgHint(`Лопай пузыри! Ещё ${GOAL - popped}`);
  });
  await popDone;
  mgClose();
  bubbles.forEach(b => { scene.remove(b); b.material.dispose(); });
  // отряхивается: брызги во все стороны
  foams.forEach(f => { f.parent.remove(f); f.material.dispose(); });
  spots.forEach(sp => { sp.parent.remove(sp); sp.material.dispose(); });
  sfx.splash();
  for(let i = 0; i < 12; i++){ const a = i/12*Math.PI*2; emit(TEX.drop, headTop(s), {v:new V3(Math.cos(a)*1.6, 1 + Math.random(), Math.sin(a)*0.8), g:4, life:0.9, size:0.18}); }
  await tween(0.7, k => { s.shake = Math.sin(k*Math.PI*8)*0.45*(1 - k); s.wobble = Math.sin(k*Math.PI*8)*0.06*(1 - k); }, ease.lin);
  s.shake = 0; s.wobble = 0;
  floatText(gg('Чистенький!', 'Чистенькая!'), headTop(s), '#2F9E72');
  hop(s, 0.45, 0.5);
  await tween(0.4, k => tub.scale.setScalar(Math.max(0.01, 1 - k)));
  scene.remove(tub);
}

/* ---------- Уложить: погладить медленно-медленно, пока глазки не закроются ---------- */
async function petSleep(s){
  const bed = makeBed(); bed.position.copy(s.root.position); bed.scale.setScalar(0.01); scene.add(bed); s.bed = bed;
  s.headBase = s.head.position.clone();
  sfx.whoosh(); hop(s, 0.35, 0.45);
  await tween(0.45, k => bed.scale.setScalar(Math.max(0.01, k*PET_SCALE)), ease.back);
  const h0 = s.head.position.clone(), h1 = new V3(0, 1.3, 0.78);
  await tween(0.5, k => s.head.position.lerpVectors(h0, h1, k));
  $('#night').classList.add('on');
  focusCam(worldOf(s, new V3(0, -0.4, -0.3)), 2.5, 0.2);

  mgOpen('Погладь малыша медленно-медленно');
  const gauge = mgNode('div', 'gauge-wrap moon', '<span class="ic">🌙</span><div class="gauge"><div class="fill"></div></div>').lastChild;
  const fill = gauge.querySelector('.fill'), finger = mgNode('div', 'finger', '👆');
  s.blinkT = 99;
  let sleepy = 0, last = null, tickleT = -9, rubT = 0, yawned = false, finish;
  const done = new Promise(r => finish = r);
  const center = () => toScreen(worldOf(s, new V3(0, -0.3, -0.3)));
  mgOn(mgRoot, 'pointerdown', e => { last = {x:e.clientX, y:e.clientY, t:e.timeStamp}; finger.hidden = true; });
  mgOn(mgRoot, 'pointermove', e => {
    if(!last) return;
    const d = Math.hypot(e.clientX - last.x, e.clientY - last.y), v = d/Math.max(8, e.timeStamp - last.t)*1000;
    last = {x:e.clientX, y:e.clientY, t:e.timeStamp};
    const c = center();
    if(!d || Math.hypot(e.clientX - c.x, e.clientY - c.y) > 180) return;
    if(v > 1600 && d > 14){   // слишком быстро — щекотно, малыш хихикает (без наказания, чуть бодрее)
      if(now - tickleT > 1.2){ tickleT = now; sfx.arf(); floatText('Хи-хи! Щекотно', headTop(s)); mgHint('Медленнее… тихонько-тихонько'); sleepy = Math.max(0, sleepy - 0.06); }
      return;
    }
    sleepy = Math.min(1, sleepy + d/1000);
    if(now - rubT > 0.3){ rubT = now; tone(330, 0.25, {vol:0.03, to:300}); }
    if(!yawned && sleepy > 0.5){ yawned = true; sfx.yawn(); floatText('Ааа-у…', headTop(s), '#6B6A7E'); mgHint('Хорошо! Глазки закрываются…'); }
    if(sleepy >= 1) finish();
  });
  for(const ev of ['pointerup', 'pointercancel']) mgOn(mgRoot, ev, () => { last = null; });
  mgTick(() => {
    s.eyes.forEach(e => e.scale.y = Math.max(0.12, 1 - sleepy*0.88));
    fill.style.height = sleepy*(gauge.clientHeight - 14) + 'px';
    const c = center(); finger.style.left = c.x + 'px'; finger.style.top = c.y + 'px';
  });
  await done;
  mgClose();
  const bl = makeBlanket(); setBlanket(bl, 0); s.inner.add(bl); s.blanket = bl;
  await tween(0.6, k => setBlanket(bl, k), ease.back);
  s.eyes.forEach(e => e.scale.y = 1); s.blinkT = 2;
  setMood(s, 'sleep'); s.sleeping = true; s.zzzT = 0.3; sfx.lullaby();
  floatText('Сладких снов!', headTop(s).add(new V3(0, 0.3, 0)), '#6B6A7E');
  await wait(1.6);
}
async function petWake(){
  const s = petSeal; if(!s.bed) return;
  s.sleeping = false; $('#night').classList.remove('on');
  setMood(s, 'happy'); sfx.arf(); floatText('Доброе утро!', headTop(s));
  const bl = s.blanket, bed = s.bed, h0 = s.head.position.clone();
  await tween(0.45, k => { if(bl) setBlanket(bl, 1 - k); s.head.position.lerpVectors(h0, s.headBase, k); });
  if(bl) s.inner.remove(bl); s.blanket = null;
  hop(s, 0.35, 0.45);
  await tween(0.35, k => bed.scale.setScalar(Math.max(0.01, (1 - k)*PET_SCALE)));
  scene.remove(bed); s.bed = null; s.happyUntil = now + 2;
}

/* ---------- Поиграть: мяч туда-обратно, малыш отбивает носом ---------- */
async function petPlay(s){
  const ball = petBall, rest = ball.userData.rest.clone();
  const Q = new V3(PET_SPOT.x + 0.1, 0.95, PET_SPOT.z + 2.3);   // «твоя» точка — ближе к экрану
  const nose = () => worldOf(s, s.noseLocal).add(new V3(0, 0.2, 0.05));
  focusCam(new V3(PET_SPOT.x, 1.05, PET_SPOT.z + 1.1), 3.6, 0.1);
  sfx.whoosh(); await flyTo(ball, rest.clone(), Q.clone(), 0.6, 0.6);
  const GOAL = 5;
  mgOpen('Нажми — подбрось мяч малышу!');
  const ring = mgNode('div', 'target'); ring.hidden = true;
  let state = 'ready', k = 0, from = Q.clone(), hits = 0, finish;
  const done = new Promise(r => finish = r);
  const up = () => { state = 'up'; k = 0; from = ball.position.clone(); hits++; sfx.tap(); ring.hidden = true;
    mgHint(hits >= GOAL ? 'Последний!' : `Отбито: ${hits} из ${GOAL}`); };
  const miss = async () => {
    state = 'miss'; ring.hidden = true;
    const p0 = ball.position.clone(), floor = new V3(p0.x, 0.47, Math.min(p0.z, PET_SPOT.z + 2.5));
    await tween(0.3, q => ball.position.lerpVectors(p0, floor, q), ease.lin); sfx.plop();
    await tween(0.35, q => { ball.position.copy(floor); ball.position.y += Math.sin(q*Math.PI)*0.35; }, ease.lin); sfx.plop();
    mgHint('Ой, упал! Ничего — ещё разок');
    floatText('Ар!', headTop(s)); hop(s, 0.25, 0.35);
    await flyTo(ball, floor, Q.clone(), 0.6, 0.5);
    state = 'ready'; mgHint('Нажми — подбрось мяч ещё раз!');
  };
  mgOn(mgRoot, 'pointerdown', e => {
    e.preventDefault();
    if(state === 'ready') return up();
    if(state === 'down' && k >= 0.45){ burst(TEX.star, ball.position.clone(), 5, 1.2, 0.2); return up(); }
    if(state === 'down') mgHint('Подожди, пусть долетит до тебя!');
  });
  mgTick(dt => {
    ball.rotation.x += dt*5;
    if(state === 'up'){
      k = Math.min(1, k + dt/0.75); const to = nose();
      ball.position.lerpVectors(from, to, k); ball.position.y += Math.sin(k*Math.PI)*0.9;
      if(k >= 1){   // бум носом
        sfx.pop(); tween(0.3, q => s.nod = -Math.sin(q*Math.PI)*0.35, ease.lin);
        if(hits >= GOAL){ state = 'end'; return finish(); }
        if(Math.random() < 0.5) floatText(['Ап!', 'Оп!', 'Хоп!'][Math.floor(Math.random()*3)], headTop(s));
        state = 'down'; k = 0; from = to.clone();
      }
    } else if(state === 'down'){
      k += dt/0.95;
      if(k <= 1){ ball.position.lerpVectors(from, Q, k); ball.position.y += Math.sin(k*Math.PI)*1.0; }
      else { ball.position.copy(Q); ball.position.y -= (k - 1)*2.2; ball.position.z += (k - 1)*0.6; }
      if(k >= 0.45){ const p = toScreen(ball.position); ring.hidden = false; ring.style.left = p.x + 'px'; ring.style.top = p.y + 'px'; mgHint('Жми!'); }
      if(k > 1.35) miss();
    }
  });
  await done;
  mgClose();
  // финал: мяч подлетает и ложится малышу на нос
  const top = nose().add(new V3(0, 1.4, 0)), p0 = ball.position.clone();
  await tween(0.5, q => ball.position.lerpVectors(p0, top, q), ease.out);
  await tween(0.5, q => ball.position.lerpVectors(top, nose().add(new V3(0, 0.12, 0)), q), ease.io);
  sfx.good(); floatText('Та-да! Мяч на носу!', headTop(s).add(new V3(0, 0.5, 0)), '#D9527E');
  await tween(1.2, q => { const n = nose(); ball.position.set(n.x + Math.sin(q*Math.PI*4)*0.04, n.y + 0.12, n.z); }, ease.lin);
  await flyTo(ball, ball.position.clone(), rest, 0.7, 0.8);
  ball.rotation.set(0, 0, 0.4);
}
const PET_GAMES = {food:petFeed, bath:petBath, sleep:petSleep, fun:petPlay};

/* ---------- Нарядить: вещи из лавки ---------- */
async function petDress(){
  const items = SHOP.filter(x => x.kind === 'wear' && owns(x.id));
  if(!items.length) return toast('В лавке 🐚 есть бантики и шапочки — купи и наряди малыша!', 3200);
  const s = petSeal; setBusy(true); s.bubble.visible = false;
  if(s.sleeping) await petWake();
  focusCam(worldOf(s, new V3(0, -0.25, 0)), 2.0, 0.4);
  mgOpen('Наряди малыша');
  const nav = mgNode('nav', 'tools wardrobe');
  const mark = () => nav.querySelectorAll('.tool[data-id]').forEach(b => b.classList.toggle('on', Object.values(wearIds(s)).includes(b.dataset.id)));
  for(const it of items){
    const b = document.createElement('button'); b.className = 'tool'; b.dataset.id = it.id;
    b.innerHTML = `<span class="face"><img src="${thumb(it.id)}" alt=""></span><span class="name">${it.name}</span>`;
    mgOn(b, 'click', () => { wearOn(s, it.id); sfx.pop(); squash(s, 0.1, 0.25); mark(); save.pet.wear = wearIds(s); persist(); });
    nav.appendChild(b);
  }
  const ok = document.createElement('button'); ok.className = 'tool'; ok.id = 'dressDone';
  ok.innerHTML = '<span class="face">✓</span><span class="name">Готово</span>'; nav.appendChild(ok);
  mark();
  await new Promise(r => mgOn(ok, 'click', r));
  mgClose(); unfocusCam();
  sfx.arf(); s.happyUntil = now + 3; setMood(s, 'happy'); floatText('Красиво!', headTop(s), '#D9527E');
  setBusy(false); petRefresh();
}

/* ---------- покадрово ---------- */
let petRefreshT = 0;
function petTick(t, dt){
  if(!petSeal) return;
  updateSeal(petSeal, t, dt);
  if(petSeal.sleeping && petMode){
    petSeal.zzzT -= dt;
    if(petSeal.zzzT < 0){ petSeal.zzzT = 1.2; floatText('z', worldOf(petSeal, new V3(0.85 + Math.random()*0.2, 0.35, 0.3)), '#8E99C9'); }
  }
  petRefreshT -= dt;
  if(petRefreshT < 0){ petRefreshT = 2; if(save.pet){ petDecay(); if(!busy) petRefresh(); } }
}

buildPetBar();
if(save.pet){ petDecay(); placePet(); drawSign(); }
if(document.fonts) document.fonts.ready.then(drawSign);
