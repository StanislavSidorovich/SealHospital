/* ---------------- мой тюленёнок (Фаза 3): знакомство, уголок, потребности, уход, рост, ласка ----------------
   Малыш из события «в гости» остаётся жить у Сабрины. Его уголок — вторая льдина справа от больницы
   (PET_POS); кнопка 🦭/🏥 в углу плавно везёт туда камеру (camOff в game.js).
   Четыре потребности тают в реальном времени, у каждой своя мини-игра на слое #mg.
   Проиграть нельзя: малыш не болеет и не обижается, просто грустит и показывает пузырь-мысль.
   Часть 2: за сердечки дружбы малыш растёт по стадиям STAGES (размер, пропорции, пятнышки, усы, сияние),
   на новой стадии — праздник, фото в альбом и подарок.
   Подключается после shift.js и до game.js. */
const PET_POS = new V3(10, 0, 0);           // центр льдины-уголка
const PET_SPOT = new V3(10, 0.25, 0.2);     // где стоит малыш
// Стадии роста. at — сколько сердечек дружбы нужно; sc — размер; head — голова относительно тела (у малыша большая);
// body — пропорции тела (x, y, z): с возрастом тюлень вытягивается
const STAGES = [
  {m:L('Малыш', 'Baby'),         f:L('Малышка', 'Baby'),    ic:'🍼', at:0,  sc:0.62, head:1.14, body:[0.95, 1, 0.9]},
  {m:L('Детёныш', 'Pup'),        f:L('Детёныш', 'Pup'),     ic:'🐾', at:2,  sc:0.72, head:1.08, body:[0.98, 1, 0.96]},
  {m:L('Подросток', 'Teen'),     f:L('Подросток', 'Teen'),  ic:'⭐', at:5,  sc:0.84, head:1.0,  body:[1, 1, 1.04]},
  {m:L('Взрослый', 'Adult'),     f:L('Взрослая', 'Adult'),  ic:'🦭', at:11, sc:0.96, head:0.94, body:[1.02, 1.02, 1.1]},
  {m:L('Сияющий', 'Shiny'),      f:L('Сияющая', 'Shiny'),   ic:'✨', at:17, sc:0.96, head:0.94, body:[1.02, 1.02, 1.1]}
];
const SHINY = STAGES.length - 1;
const GROW_GIFT = 10;     // ракушек в подарок на новой стадии
const PATIENT_XP = 2;     // малыш гордится доктором: за каждого вылеченного пациента (game.js)
const PAT_XP = 1, PAT_MAX = 6;   // ласка: +1 опыт за «сеанс», не больше 6 раз в день
const PET_COATS = [
  {id:'snow', c:0xFFFFFF, name:L('Белоснежный', 'Snow white')},
  {id:'pink', c:0xF6C4D3, name:L('Розовый', 'Pink')},   // чуть насыщеннее, чем у пациентов: в мультяшном свете бледные почти не отличить
  {id:'sky',  c:0xC6DCF4, name:L('Голубой', 'Sky blue')},
  {id:'mint', c:0xC4E6D0, name:L('Мятный', 'Mint')},
  {id:'sand', c:0xE9D3AE, spot:0xC9A479, name:L('Песочный в пятнышках', 'Sandy with spots')},
  {id:'grey', c:0xB9C2D0, spot:0x8591A8, name:L('Серый в пятнышках', 'Grey with spots')}
];
const PET_NAMES = {
  m:L(['Пломбир', 'Пончик', 'Кекс', 'Буся', 'Тофу', 'Мармелад', 'Сугроб', 'Орешек', 'Хрустик', 'Пушок'],
      ['Sundae', 'Donut', 'Muffin', 'Bean', 'Tofu', 'Jelly', 'Snowdrift', 'Nutmeg', 'Crunchy', 'Fluff']),
  f:L(['Булочка', 'Плюшка', 'Льдинка', 'Снежинка', 'Карамелька', 'Пуговка', 'Ватрушка', 'Мася', 'Жемчужинка', 'Пушинка'],
      ['Bun', 'Cookie', 'Icicle', 'Snowflake', 'Caramel', 'Button', 'Cupcake', 'Daisy', 'Pearl', 'Fluffy'])
};
// rate — сколько потребность теряет за час (1 → 0 примерно за 7–14 часов)
const NEEDS = {
  food: {ic:'🐟', act:L('Покормить', 'Feed'), want:L('Хочет кушать', 'Wants to eat'), say:L('Хочу кушать!', 'I want to eat!'), rate:0.12},
  bath: {ic:'🛁', act:L('Искупать', 'Bathe'), want:L('Хочет купаться', 'Wants a bath'), say:L('Хочу купаться!', 'I want a bath!'), rate:0.07},
  sleep:{ic:'🌙', act:L('Уложить', 'Bedtime'), want:L('Хочет спать', 'Wants to sleep'), say:L('Хочу баиньки…', 'I want to sleeeep…'), rate:0.09},
  fun:  {ic:'⚽', act:L('Поиграть', 'Play'), want:L('Хочет играть', 'Wants to play'), say:L('Давай играть!', 'Let us play!'), rate:0.15}
};
const NEED_KEYS = Object.keys(NEEDS);
const NEED_TEX = {food:bubbleTex('🐟'), bath:bubbleTex('🛁'), sleep:bubbleTex('💤'), fun:bubbleTex('⚽')};
const HEART_XP = 30;   // столько опыта — одно сердечко дружбы
const MISS_H = 8;     // столько часов малыша не навещали — он встречает радостно: «Я скучал!» (без упрёков)
let petMode = false, petSeal = null, petHelloShown = false;
let homeMode = false;   // малыш у себя в иглу (js/home.js); petMode при этом тоже включён
const gg = (m, f) => save.pet && save.pet.f ? f : m;   // род: «сыт / сыта»
const coatOf = id => PET_COATS.find(c => c.id === id) || PET_COATS[0];
const hexCss = c => '#' + c.toString(16).padStart(6, '0');
const adoptPending = () => !save.pet && save.shifts >= 1;
// GitHub Pages кеширует файлы ~10 минут: если data.js ещё старый, sanitizePet не знает новых полей — подставим
function petFix(){ const p = save.pet; if(!p) return; if(!Number.isInteger(p.stage)) p.stage = 0; if(!p.pat) p.pat = {d:'', n:0}; if(!Number.isFinite(p.seen)) p.seen = Number.isFinite(p.t) ? p.t : Date.now();
  if(!p.walk) p.walk = {d:'', n:0}; if(!Array.isArray(p.finds)) p.finds = []; if(!p.tricks) p.tricks = {}; }
const stageOf = xp => STAGES.reduce((i, st, k) => xp >= st.at*HEART_XP ? k : i, 0);
const stageName = (i, f = save.pet && save.pet.f) => f ? STAGES[i].f : STAGES[i].m;
// подпись к фото малыша в альбоме хранится ключом ('intro', 'stage:2'), старые сохранения — русским текстом; показываем на нужном языке
const RU_STAGE_CAPS = [['Малыш', 'Малышка'], ['Детёныш'], ['Подросток'], ['Взрослый', 'Взрослая'], ['Сияющий', 'Сияющая']];
function capL(cap){
  if(!cap) return '';
  if(cap === 'intro' || cap === 'Знакомство ♡') return L('Знакомство ♡', 'First meeting ♡');
  const m = /^stage:(\d)$/.exec(cap), i = m ? +m[1] : RU_STAGE_CAPS.findIndex(a => a.includes(cap));
  return i >= 0 ? stageName(i) : cap;
}
const petMissed = () => !!save.pet && (Date.now() - save.pet.seen)/3.6e6 >= MISS_H;
const growPending = () => !!save.pet && stageOf(save.pet.xp) > save.pet.stage;
const petScale = () => STAGES[save.pet ? save.pet.stage : 0].sc;
const petK = () => petScale()/STAGES[0].sc;   // во сколько раз малыш больше новорождённого: для камеры и ванны
// в уголке камера ближе, чем в больнице: малыш меньше пациента; подрастает — камера отъезжает
function petView(){ const q = 1 - 0.75*(petScale() - STAGES[0].sc)/(STAGES[3].sc - STAGES[0].sc); return new V3(0, -0.75*q, -2.2*q); }

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
  petCorner.add(h); petCorner.userData.house = h; petCorner.userData.heart = heart;   // касание по домику — внутрь (js/home.js)
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
const GLOW_TEX = canvasTex(128, (g, w) => {
  const r = g.createRadialGradient(w/2, w/2, w*0.12, w/2, w/2, w/2);
  r.addColorStop(0, 'rgba(255,246,196,.95)'); r.addColorStop(0.5, 'rgba(255,205,228,.55)'); r.addColorStop(1, 'rgba(255,205,228,0)');
  g.fillStyle = r; g.fillRect(0, 0, w, w);
});
function makePetSeal(p = save.pet){
  const c = coatOf(p.coat), sg = p.stage || 0, st = STAGES[sg];
  // подросток и старше — в пятнышках, как настоящие нерпы (чуть темнее своего окраса)
  const spot = c.spot || (sg >= 2 ? new THREE.Color(c.c).lerp(new THREE.Color(0x5F6E8C), 0.55).getHex() : undefined);
  const s = makeSeal({name:p.name, f:p.f, color:c.c, spot});
  s.root.scale.setScalar(st.sc);
  s.head.scale.setScalar(st.head); s.head.position.y += (st.head - 1)*0.6; if(s.bodyK) s.bodyK.set(...st.body);
  // ротик «о»: малыш открывает его, когда к нему несут рыбку
  const o = onHead(new THREE.Mesh(new THREE.CircleGeometry(0.075, 20), inkMat), 0, -0.16, 1, 0.012);
  o.scale.y = 1.2; o.visible = false; s.head.add(o); s.mouthO = o;
  if(sg < 2){   // хохолок у малыша и детёныша
    const tuft = new THREE.Group(); tuft.position.set(0, 0.7, 0.05);
    for(const [x, r, k] of [[-0.08, 0.55, 0.08], [0.02, 0, 0.1], [0.11, -0.6, 0.075]]){
      const t = addOutline(new THREE.Mesh(SMALL, s.bodyMat), 1.18); t.scale.set(k*0.7, k*1.7, k*0.7);
      t.position.set(x, k*1.2, 0); t.rotation.z = r; tuft.add(t);
    }
    s.head.add(tuft); s.tuft = tuft;
  }
  if(sg >= 2){   // пятнышки и на макушке: со спины их не видно, а с макушки — сразу
    const sm = toon(spot);
    for(const [x, y, z, k] of [[0.5, 0.62, 0.35, 0.13], [-0.58, 0.52, 0.3, 0.1], [0.12, 0.95, 0.1, 0.09], [-0.25, 0.85, -0.3, 0.12]]){
      const m = onHead(new THREE.Mesh(SMALL, sm), x, y, z, -0.012); m.scale.set(k, k*0.8, 0.03); s.head.add(m);
    }
  }
  if(sg >= 2) for(const sd of [-1, 1]) for(const [x, y] of [[0.17, -0.02], [0.24, -0.08], [0.16, -0.11]])   // точки-усики на мордочке
    s.head.add(onHead(new THREE.Mesh(new THREE.CircleGeometry(0.018, 10), inkMat), x*sd, y, 1, 0.006));
  if(sg >= 3) for(const sd of [-1, 1]) for(const [y, r] of [[-0.02, 0.12], [-0.09, -0.1]]){   // взрослые усы
    const w = onHead(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.016, 0.01), inkMat), 0.36*sd, y, 0.95, 0.01);
    w.rotateZ(r*sd); s.head.add(w);
  }
  if(sg === SHINY){   // сияние: мягкий ореол позади и радужный отлив (переливается в petTick)
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX, transparent:true, depthWrite:false}));
    halo.position.set(0, 1.5, -1.7); halo.scale.setScalar(5.2); s.inner.add(halo); s.halo = halo;
    s.bodyMat.emissive.setHSL(0.12, 0.8, 0.12);
  }
  for(const slot of ['head', 'face']){ const id = p.wear && p.wear[slot]; if(id && WEAR[id] && owns(id)) wearOn(s, id); }
  petTuft(s);
  s.happyUntil = 0;
  return s;
}
function petTuft(s){ if(s.tuft) s.tuft.visible = !s.wear.head; }   // под шапочкой хохолка не видно
function placePet(){
  if(petSeal) scene.remove(petSeal.root);
  petSeal = makePetSeal(); petSeal.root.position.copy(PET_SPOT); scene.add(petSeal.root);
  return petSeal;
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
// желание: когда всё хорошо, малыш сам предлагает занятие — облачко над головой, касание по нему начинает
const WISHES = {
  pat:    {tex:bubbleTex('🤚'), ic:'🤚', say:() => L('Погладь меня!', 'Pet me!'), card:() => L('Хочет, чтобы погладили', 'Wants a cuddle')},
  walk:   {tex:bubbleTex('🐾'), ic:'🐾', say:() => L('Пойдём гулять? Там что-то блестит!', 'Let\'s go for a walk! Something shines out there!'), card:() => L('Хочет гулять', 'Wants a walk')},
  tricks: {tex:bubbleTex('🎓'), ic:'🎓', say:() => L('Давай учить трюк!', 'Let\'s learn a trick!'), card:() => L('Хочет учить трюк', 'Wants to learn a trick')},
  ball:   {tex:bubbleTex('⚽'), ic:'⚽', say:() => L('Поиграем в мяч?', 'Shall we play ball?'), card:() => L('Хочет поиграть в мяч', 'Wants to play ball')}
};
const WISH_WAIT = 6;   // секунд после занятия, пока не появится следующее желание
let petWish = null, lastWish = null, wishT = 0, wishShown = false;
function wishPick(){
  const p = save.pet, c = [];
  if(p.pat.d !== new Date().toDateString() || p.pat.n < PAT_MAX) c.push('pat');
  if(walkGiftToday()) c.push('walk');
  if(TRICKS.some(t => p.stage >= t.stage && (p.tricks[t.id] || 0) < 3)) c.push('tricks');
  c.push('ball');
  const pool = c.filter(k => k !== lastWish);
  return pool.length ? pool[Math.floor(Math.random()*pool.length)] : 'ball';
}
const wishCan = () => petMode && !homeMode && !petLow() && !growPending() && !(petSeal.letter && petSeal.letter.visible) && now >= wishT;
function wishDone(k){
  if(!petWish || (k && k !== petWish)) return;
  lastWish = petWish; petWish = null; wishShown = false; wishT = now + WISH_WAIT;
}
function wishGo(){
  const k = petWish, s = petSeal; if(!k) return;
  sfx.tap();
  if(k === 'pat'){ sfx.arf(); squash(s, 0.15, 0.3); floatText(WISHES.pat.say(), headTop(s), '#D9527E'); return toast(L('Проведи пальцем по голове или по пузику ♡', 'Stroke the head or the tummy with your finger ♡'), 3000); }
  funPre = k; petDo('fun');
}
function petRefresh(){
  if(!save.pet) return renderPetBtn();
  if(petSeal && !busy && !petSeal.sleeping){
    const low = petLow();
    setMood(petSeal, now < petSeal.happyUntil ? 'happy' : low && save.pet.needs[low] < 0.25 ? 'sad' : 'ok');
    if(!petWish && wishCan()) petWish = wishPick();
    const wish = petWish && wishCan() ? petWish : null, map = homeMode ? null : low ? NEED_TEX[low] : wish && WISHES[wish].tex;   // в домике пузырей нет: уход — снаружи
    petSeal.bubble.visible = !!map;
    if(map && petSeal.bubble.material.map !== map){ petSeal.bubble.material.map = map; petSeal.bubble.material.needsUpdate = true; }
    if(wish && !low && !wishShown && !homeMode){ wishShown = true; sfx.arf(); toast(L(`${save.pet.name}: «${WISHES[wish].say()}» Нажми на облачко ${WISHES[wish].ic}`, `${save.pet.name}: “${WISHES[wish].say()}” Tap the cloud ${WISHES[wish].ic}`), 3400); }
  }
  renderPetCard(); renderPetBar(); renderPetBtn();
}
// касание по облачку над малышом: нужда — сразу уход, желание — занятие
function bubbleHit(e){
  const b = petSeal.bubble; if(!b.visible) return false;
  const p = toScreen(b.getWorldPosition(new V3()));
  return Math.hypot(p.x - e.clientX, p.y - e.clientY) < 60*Math.max(1, petK()*0.8);
}
function renderPetCard(){
  const p = save.pet; $('#petCard').hidden = !p; if(!p) return;
  $('#petName').textContent = p.name;
  $('#petStage').textContent = `${STAGES[p.stage].ic} ${stageName(p.stage)}`;
  const left = p.stage < SHINY ? STAGES[p.stage + 1].at - Math.floor(p.xp/HEART_XP) : 0;
  $('#petGrowHint').textContent = p.stage === SHINY ? L('Лучшие друзья навсегда ♡', 'Best friends forever ♡')
    : left <= 0 ? L('✨ Сейчас что-то будет…', '✨ Something is about to happen…')
    : L(`${p.stage + 1 === SHINY ? 'Засияет' : 'Подрастёт'} через ${left} 💗`, `${p.stage + 1 === SHINY ? 'Will shine' : 'Will grow up'} in ${left} 💗`);
  const low = petLow(), wish = petSeal && petSeal.bubble.visible && petWish;
  $('#petStatus').textContent = petSeal && petSeal.sleeping ? L('Сладко спит… z-z-z. Нажми, чтобы разбудить', 'Sleeping sweetly… z-z-z. Tap to wake up')
    : low ? `${NEEDS[low].ic} ${NEEDS[low].want}` : wish ? `${WISHES[wish].ic} ${WISHES[wish].card()}` : L(gg('Счастлив! ♡', 'Счастлива! ♡'), 'Happy! ♡');
  $('#petLove').style.width = (p.xp % HEART_XP)/HEART_XP*100 + '%';
  $('#petHearts').textContent = Math.floor(p.xp/HEART_XP);
}
function buildPetBar(){
  const nav = $('#petBar'); nav.innerHTML = '';
  for(const k of NEED_KEYS.concat('dress')){
    const b = document.createElement('button'); b.className = 'tool'; b.id = 'pet-' + k;
    b.innerHTML = k === 'dress' ? '<span class="face" aria-hidden="true">🎀</span><span class="name">' + L('Нарядить', 'Dress up') + '</span>'
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
  b.setAttribute('aria-label', petMode ? L('В больницу', 'To the hospital') : L('Мой малыш', 'My pup'));
  const grow = growPending();
  $('#petAlert').textContent = grow ? '✨' : '!';
  $('#petAlert').hidden = petMode || !(grow || NEED_KEYS.some(k => save.pet.needs[k] < 0.35));
  renderHomeBtn();
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
  if(lv > lv0){ sfx.star(); burst(TEX.heart, headTop(petSeal), 16, 2.2, 0.34); toast(L(`Вы дружите ещё крепче! Сердечек дружбы: ${lv} 💗`, `You are even closer friends! Friendship hearts: ${lv} 💗`), 3200); }
  renderPetCard();
}

/* ---------- переключатель «Больница / Мой малыш» ---------- */
function setPetMode(on){
  petMode = on; document.body.classList.toggle('pet-mode', on);
  camOffWant.copy(on ? PET_POS.clone().add(petView()) : new V3()); unfocusCam();
  $('#night').classList.toggle('on', on && !!petSeal && petSeal.sleeping);
  renderPetBtn();
}
function goPet(on){
  if(on === petMode || !save.pet) return;
  if(on && mgCanPark()) mgPark();   // лупа или лечение подождут: вернёшься — продолжишь с того же места (minigames.js)
  if(busy || !mgRoot.hidden) return toast(L('Сначала закончи то, что начала 🙂', 'Finish what you started first 🙂'));
  if(homeMode) homeExit();   // из домика — сразу в больницу
  sfx.whoosh(); setPetMode(on);
  if(!on && mgUnpark()) return toast(L(`${S.p.name} ${S.p.f ? 'ждала' : 'ждал'} тебя! Продолжаем 🩺`, `${S.p.name} waited for you! Let's go on 🩺`), 2400);
  if(on){
    const missed = petMissed(); save.pet.seen = Date.now();
    wishT = Math.max(wishT, now + 4);   // желание — после приветствия, а не вместо него
    petDecay(); petRefresh();
    if(missed){ petHelloShown = true; petMiss(); }
    else if(!petHelloShown){ petHelloShown = true; const low = petLow();
      if(!growPending()) toast(low ? L(`${save.pet.name}: «${NEEDS[low].say}» Выбирай внизу ${NEEDS[low].ic}`, `${save.pet.name}: “${NEEDS[low].say}” Pick below ${NEEDS[low].ic}`) : L(`${save.pet.name} ${gg('рад', 'рада')} тебя видеть! Погладь пальцем ♡`, `${save.pet.name} is happy to see you! Pet with your finger ♡`), 3400); }
  } else if(!shift || shift.n >= SHIFT_SIZE) startShift();   // смена кончилась — в больнице ждёт новая
}
// долго не виделись: малыш радуется встрече, а не грустит (что он хочет, видно по пузырю и карточке)
async function petMiss(){
  const s = petSeal, p = save.pet; if(!s || s.sleeping) return;
  await wait(0.8);
  if(!petMode || busy || s !== petSeal) return;
  s.happyUntil = now + 4; setMood(s, 'happy'); s.flap = 1;
  sfx.arf(); sfx.star(); burst(TEX.heart, headTop(s), 14, 2.2, 0.34); hop(s, 0.35, 0.45);
  if(!growPending()) toast(L(`${p.name}: «Я скучал${gg('', 'а')}! Как хорошо, что ты пришла!» ♡`, `${p.name}: “I missed you! I am so glad you came!” ♡`), 3800);
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
  const draft = {name:L('Малыш', 'Baby'), f:false, coat:PET_COATS[Math.floor(Math.random()*4)].id, wear:{}};
  petSeal = makePetSeal(draft); setMood(petSeal, 'ok');
  await arrive(petSeal);
  sfx.arf(); floatText(L('Привет, доктор!', 'Hello, doctor!'), headTop(petSeal));
  focusCam(worldOf(petSeal, new V3(0, -0.7, 0)), 3.2, 0.95);
  await wait(0.6);

  mgOpen(L('Малыш приплыл снова!', 'The pup is back!'));
  const ask = mgNode('div', 'mg-panel adopt', `<p>${L('Он так тебя полюбил, что хочет остаться жить у тебя. Возьмёшь его?', 'He loves you so much that he wants to stay and live with you. Will you take him in?')}</p><button class="btn" id="adoptYes">${L('Конечно! ♡', 'Of course! ♡')}</button>`);
  await new Promise(r => mgOn(ask.querySelector('#adoptYes'), 'click', r));
  sfx.tap(); ask.classList.add('away'); await wait(0.3); mgClose();
  setMood(petSeal, 'happy'); sfx.hug(); petSeal.flap = 1;
  burst(TEX.heart, headTop(petSeal), 18, 2.2, 0.32);
  await tween(0.8, k => { petSeal.inner.position.y = Math.sin(k*Math.PI)*0.9; petSeal.inner.rotation.y = k*Math.PI*2; }, ease.io);
  petSeal.inner.position.y = 0; petSeal.inner.rotation.y = 0; petSeal.flap = 0.3;
  await squash(petSeal, 0.25);
  floatText(L('Ура-а!', 'Hooray!'), headTop(petSeal), '#D9527E');
  await wait(0.6);

  // окрас и мальчик/девочка: малыш на экране сразу меняется
  mgOpen(L('Какой у тебя малыш?', 'What is your pup like?'));
  const look = mgNode('div', 'mg-panel picker', `
    <p class="row-lbl">${L('Окрас', 'Coat')}</p>
    <div class="swatches">${PET_COATS.map(c => `<button class="swatch${c.spot ? ' spotty' : ''}" data-c="${c.id}" style="--c:${hexCss(c.c)};--s:${hexCss(c.spot || c.c)}" aria-label="${c.name}"></button>`).join('')}</div>
    <p class="row-lbl">${L('Кто это?', 'Who is it?')}</p>
    <div class="sex"><button data-f="0">${L('👦 Мальчик', '👦 Boy')}</button><button data-f="1">${L('👧 Девочка', '👧 Girl')}</button></div>
    <button class="btn" id="lookDone">${L('Дальше →', 'Next →')}</button>`);
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
    draft.f = b.dataset.f === '1'; mark(); sfx.pop(); floatText(draft.f ? L('Я девочка!', 'I am a girl!') : L('Я мальчик!', 'I am a boy!'), headTop(petSeal));
  }));
  await new Promise(r => mgOn(look.querySelector('#lookDone'), 'click', r));
  sfx.tap(); look.classList.add('away'); await wait(0.3); mgClose();

  // имя: можно написать (вместе с папой) или выбрать подсказку
  focusCam(worldOf(petSeal, new V3(0, -0.5, 0)), 3.0, -1.1);   // малыш внизу, панель с именем сверху
  mgOpen('');
  const nm = mgNode('div', 'mg-panel name-panel', `
    <p class="ttl display">${L(`Как зовут ${draft.f ? 'малышку' : 'малыша'}?`, `What is ${draft.f ? 'her' : 'his'} name?`)}</p>
    <input id="petNameIn" maxlength="14" autocomplete="off" autocapitalize="words" enterkeyhint="done" placeholder="${L('Имя', 'Name')}" aria-label="${L('Имя малыша', 'Name of the pup')}">
    <div class="chips" id="nameChips"></div>
    <p class="tip">${L('Придумай вместе с папой ♡', 'Think of one together with Dad ♡')}</p>
    <button class="btn" id="nameDone">${L('Готово ✓', 'Done ✓')}</button>`);
  const input = nm.querySelector('#petNameIn'), chips = nm.querySelector('#nameChips');
  const deal = () => {
    const pool = PET_NAMES[draft.f ? 'f' : 'm'].slice().sort(() => Math.random() - 0.5).slice(0, 5);
    chips.innerHTML = pool.map(n => `<button class="chip">${n}</button>`).join('') + `<button class="chip dice" aria-label="${L('Другие имена', 'More names')}">🎲</button>`;
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
      if(!v){ sfx.bad(); wiggle(input); input.placeholder = L('Напиши имя или выбери ↓', 'Write a name or pick one ↓'); return; }
      r(v);
    };
    mgOn(nm.querySelector('#nameDone'), 'click', ok);
    mgOn(input, 'keydown', e => { if(e.key === 'Enter') ok(); });
  });
  input.blur();
  save.pet = sanitizePet({...draft, name, born:Date.now(), xp:0, t:Date.now(), needs:{food:0.35, bath:0.55, sleep:0.7, fun:0.25}}); petFix();
  persist(); keepSave();   // теперь в сохранении живой малыш: просим браузер беречь его
  nm.classList.add('away'); await wait(0.3); mgClose();
  petSeal.p.name = name; drawSign();
  setMood(petSeal, 'happy'); sfx.hug(); burst(TEX.heart, headTop(petSeal), 20, 2.4, 0.34);
  floatText(name + '!', headTop(petSeal), '#D9527E');
  await hop(petSeal, 0.4, 0.45);
  await wait(0.9);
  toast(L(`${name} переезжает в свой уголок! 🦭`, `${name} is moving into a cozy corner! 🦭`), 2600);
  await petMoveIn();
  petSeal.happyUntil = now + 2; setMood(petSeal, 'happy');
  await wait(0.9);
  petPhoto('intro');   // первая страница «альбома малыша»
  setBusy(false);
  petHelloShown = true; petRefresh();
  floatText(L('Мой домик!', 'My home!'), headTop(petSeal));
  toast(L(`Добро пожаловать домой, ${name}! Выбирай внизу, что ${gg('ему', 'ей')} нужно`, `Welcome home, ${name}! Pick below what ${gg('he', 'she')} needs`), 4200);
}
function petPhoto(cap){
  const img = snapshot(petSeal, 1.9);
  albumAdd({name:save.pet.name, img, d:Date.now(), pet:true, stage:save.pet.stage, cap});
  renderAlbumCount(); return img;
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
  if(k === 'sleep' && s.sleeping) return toast(L(`${p.name} сладко спит 💤 Нажми на ${gg('него', 'неё')}, чтобы разбудить`, `${p.name} is sleeping sweetly 💤 Tap ${gg('him', 'her')} to wake ${gg('him', 'her')} up`));
  if(k === 'food' && before >= 0.9) return petNope(L(`${gg('Я сыт', 'Я сыта')}! Давай поиграем?`, 'I am full! Shall we play?'));
  if(k === 'sleep' && before >= 0.9) return petNope(L(`Не хочу спать! Я ${gg('бодрый', 'бодрая')}!`, 'I do not want to sleep! I am wide awake!'));
  const wasGood = allGood();
  setBusy(true); s.bubble.visible = false;
  if(s.sleeping) await petWake();
  if(await PET_GAMES[k](s) === false){ unfocusCam(); setBusy(false); return petRefresh(); }   // «Потом» в выборе игры
  unfocusCam();
  if(k === 'fun') wishDone(); else if(!petWish) wishT = now + WISH_WAIT;   // новое желание — не сразу после ухода
  p.needs[k] = 1;
  if(k === 'fun') for(const [n, v] of Object.entries(FUN_COST[funKind])) p.needs[n] = Math.max(0, p.needs[n] - v);   // игра, прогулка или трюки (walk.js)
  if(!s.sleeping){ s.happyUntil = now + 3; setMood(s, 'happy'); }   // уснувшему не открываем глазки
  petGive(4 + Math.round(6*(1 - before)));
  persist(); renderPetCard(); renderPetBar();
  if(k === 'fun') toast(FUN_SAY[funKind](), 3000);
  if(!wasGood && allGood()){   // все потребности закрыты — маленький праздник
    await wait(0.8);
    burst(TEX.heart, headTop(s), 20, 2.4, 0.34);
    if(s.sleeping){ sfx.lullaby(); floatText(L(gg('Счастлив во сне ♡', 'Счастлива во сне ♡'), 'Happy in dreams ♡'), headTop(s).add(new V3(0, 0.4, 0)), '#D9527E'); }
    else {
      sfx.hug(); s.flap = 1; floatText(L(gg('Я счастлив!', 'Я счастлива!'), 'I am happy!'), headTop(s), '#D9527E');
      await tween(0.8, q => { s.inner.position.y = Math.sin(q*Math.PI)*0.7; s.inner.rotation.y = q*Math.PI*2; }, ease.io);
      s.inner.position.y = 0; s.inner.rotation.y = 0; s.flap = 0;
    }
    petGive(5);
  }
  setBusy(false); petRefresh();
  petMaybeGrow();
}
async function petNope(msg){
  const s = petSeal; setBusy(true); sfx.arf(); floatText(msg, headTop(s)); toast(msg);
  await tween(0.6, k => { s.shake = Math.sin(k*Math.PI*4)*0.3*(1 - k); }, ease.lin); s.shake = 0;
  setBusy(false);
}
// касание малыша: гладить (petStroke) или просто «ар!» (petStrokeEnd), спящего — разбудить
function petTap(e){
  if(!petSeal || busy || !mgRoot.hidden) return;
  if(!petSeal.sleeping && bubbleHit(e)){ const low = petLow(); if(low){ sfx.tap(); return petDo(low); } return wishGo(); }
  if(!petPart(e)){ if(homeHouseHit(e)) homeEnter(); return; }   // мимо малыша, но по иглу — заходим в домик
  if(petLetterTap()) return;   // в зубах письмо от папы (js/mail.js)
  if(petSeal.sleeping){ setBusy(true); petWake().then(() => { setBusy(false); petRefresh(); }); return; }
  stroke = {id:e.pointerId, x:e.clientX, y:e.clientY, d:0, fx:0, done:false};
}

/* ---------- Покормить: неси рыбку ко рту ---------- */
async function petFeed(s){
  const p = save.pet, n = Math.max(1, Math.min(3, Math.ceil((1 - p.needs.food)/0.34)));
  focusCam(worldOf(s, new V3(0, -0.35, 0)), 2.2*petK(), 0.4);
  await wait(0.4);
  mgOpen(n > 1 ? L('Неси рыбку прямо ко рту', 'Carry the fish right to the mouth') : L('Одну рыбку — неси ко рту', 'One fish — carry it to the mouth'));
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
    floatText(L(['Ам!', 'Ням!', 'Вкусно!'], ['Yum!', 'Nom!', 'Tasty!'])[left % 3], headTop(s));
    burst(TEX.star, worldOf(s, s.mouthLocal), 5, 1.2, 0.2);
    for(let i = 0; i < 2; i++){ sfx.chomp(); await tween(0.16, k => s.head.scale.set(1, 1 - Math.sin(k*Math.PI)*0.1, 1), ease.lin); }
    s.head.scale.set(1, 1, 1);
    if(!left) finish(); else mgHint(L(`Ещё ${left === 1 ? 'одну' : left}!`, `${left === 1 ? 'One' : left} more!`));
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
      sfx.bad(); mgHint(L('Почти! Неси прямо ко рту', 'Almost! Carry it right to the mouth'));
    };
    mgOn(el, 'pointerup', drop); mgOn(el, 'pointercancel', drop);
  }
  await done;
  mgHint(L('Спасибо! Вкусно! ♡', 'Thank you! Yummy! ♡')); sfx.good();
  await wait(0.8);
  mgClose(); open(false);
  hop(s, 0.3, 0.4);
}

/* ---------- Искупать: намылить губкой и полопать пузыри ---------- */
// пузырь с радужным краем и тёмной обводкой: на белом снегу и белой пенке бледный пузырь было не видно
const SOAP_TEX = canvasTex(128, (g, s) => {
  const c = s/2, R0 = s/2 - 7;
  const gr = g.createRadialGradient(c, c, R0*0.35, c, c, R0);
  gr.addColorStop(0, 'rgba(200,236,252,.25)'); gr.addColorStop(0.7, 'rgba(214,190,255,.5)'); gr.addColorStop(1, 'rgba(255,155,184,.8)');
  g.beginPath(); g.arc(c, c, R0, 0, 7); g.fillStyle = gr; g.fill();
  g.lineWidth = 6; g.strokeStyle = '#3B3A4A'; g.stroke();
  g.beginPath(); g.arc(c, c, R0 - 12, Math.PI*1.08, Math.PI*1.48); g.lineWidth = 8; g.lineCap = 'round'; g.strokeStyle = '#fff'; g.stroke();
  g.beginPath(); g.arc(c + R0*0.38, c + R0*0.4, 5, 0, 7); g.fillStyle = '#fff'; g.fill();
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
  const tk = petK(), tub = makeTub(); tub.position.set(s.root.position.x, 0.25 + 0.275*tk, s.root.position.z); tub.scale.setScalar(0.01); scene.add(tub);
  sfx.splash(); hop(s, 0.45, 0.5);
  await tween(0.5, k => tub.scale.setScalar(Math.max(0.01, k*tk)), ease.back);
  // кадр: от дна ванны до макушки, малыш чуть ниже середины — сверху подсказка
  const c = s.root.position, y0 = 0.25, y1 = headTop(s).y + 0.15*tk;
  const frameY = (a, b, k = 1.3) => focusCam(new V3(c.x, (a + b)/2, c.z + 0.2*tk), (b - a)*k, -0.08*(b - a));
  frameY(y0, y1);
  // грязные пятнышки — все на голове, спереди: туловище в ванне закрыто головой и пенкой
  const spots = [];
  for(const [x, y, z] of [[0.45, 0.5, 0.7], [-0.5, 0.4, 0.75], [0.05, 0.8, 0.55], [0.85, 0.05, 0.55], [-0.85, 0.0, 0.55]]){
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:DIRT_TEX, transparent:true, depthWrite:false}));
    onHead(sp, x, y, z, 0.04); sp.scale.setScalar(0.28); s.head.add(sp); spots.push(sp);
  }
  const foams = [];
  const wp = o => o.getWorldPosition(new V3());
  await wait(0.4);

  mgOpen(L('Потри губкой — намыль малыша', 'Rub with the sponge — lather the pup'));
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
        if(!giggled){ giggled = true; floatText(L('Хи-хи!', 'Hehe!'), headTop(s)); }
        if(!left) finish(); else mgHint(L(`Ещё ${left} ${plural(left, 'пятнышко', 'пятнышка', 'пятнышек')}`, `${left} more ${left === 1 ? 'spot' : 'spots'}`));
      }
    }
  });
  for(const ev of ['pointerup', 'pointercancel']) mgOn(mgRoot, ev, () => { down = false; sponge.classList.remove('on'); });
  mgTick(() => { const sp = spots.find(x => x.visible); if(sp){ const c = toScreen(wp(sp)); place(finger, c.x, c.y); } });
  await soaped;
  mgClose(); sfx.good(); floatText(L('Пенка!', 'Bubbles!'), headTop(s));
  await wait(0.5);

  // пузыри поднимаются из ванны — лопай пальцем. Камера отъезжает, чтобы над головой было место;
  // пузыри летят медленно и сами лопаются под подсказкой, а не улетают за край экрана
  const GOAL = 8, top = y1 + 0.9*tk;
  frameY(y0, top, 1.2);
  mgOpen(L(`Лопай пузыри! Ещё ${GOAL}`, `Pop the bubbles! ${GOAL} to go`));
  const hintY = () => mgHintEl.getBoundingClientRect().bottom + 30;
  const bubbles = [];
  let popped = 0, spawnT = 0, fin2;
  const popDone = new Promise(r => fin2 = r);
  const spawn = () => {
    const a = Math.random()*Math.PI*2, r = Math.random()*0.8*tk;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:SOAP_TEX, transparent:true, depthWrite:false, depthTest:false}));   // поверх головы и ванны
    sp.renderOrder = 5;
    sp.position.set(tub.position.x + Math.cos(a)*r, 0.25 + 0.55*tk, tub.position.z + Math.sin(a)*r*0.6 + 0.3*tk);
    sp.scale.setScalar(0.01); sp.userData = {size:(0.4 + Math.random()*0.2)*Math.max(1, tk*0.85), ph:Math.random()*6, v:(0.28 + Math.random()*0.2)*tk};
    scene.add(sp); bubbles.push(sp);
  };
  mgTick(dt => {
    spawnT -= dt;
    if(spawnT < 0 && bubbles.length < 6){ spawnT = 0.45; spawn(); }
    for(let i = bubbles.length - 1; i >= 0; i--){
      const b = bubbles[i], u = b.userData;
      b.position.y += u.v*dt; b.position.x += Math.sin(now*2 + u.ph)*dt*0.25;
      b.scale.setScalar(Math.min(u.size, b.scale.x + dt*0.8));
      if(b.position.y > top || toScreen(b.position).y < hintY()){   // долетел до верха — лопается сам (не считается)
        emit(TEX.puff, b.position, {v:new V3(0, 0.2, 0), life:0.35, size:0.2, grow:1});
        scene.remove(b); b.material.dispose(); bubbles.splice(i, 1);
      }
    }
  });
  mgOn(mgRoot, 'pointerdown', e => {
    let best = -1, bd = 72;
    bubbles.forEach((b, i) => { const p = toScreen(b.position), d = Math.hypot(p.x - e.clientX, p.y - e.clientY); if(d < bd){ bd = d; best = i; } });
    if(best < 0) return;
    const b = bubbles.splice(best, 1)[0];
    scene.remove(b); b.material.dispose();
    sfx.pop(); emit(TEX.star, b.position, {v:new V3(0, 0.4, 0), life:0.45, size:0.2, spin:4});
    const f = foams.pop(); if(f){ f.parent.remove(f); f.material.dispose(); }
    popped++;
    if(popped >= GOAL) fin2(); else mgHint(L(`Лопай пузыри! Ещё ${GOAL - popped}`, `Pop the bubbles! ${GOAL - popped} to go`));
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
  floatText(L(gg('Чистенький!', 'Чистенькая!'), 'All clean!'), headTop(s), '#2F9E72');
  hop(s, 0.45, 0.5);
  await tween(0.4, k => tub.scale.setScalar(Math.max(0.01, (1 - k)*tk)));
  scene.remove(tub);
}

/* ---------- Уложить: погладить медленно-медленно, пока глазки не закроются ---------- */
async function petSleep(s){
  const bed = makeBed(); bed.position.copy(s.root.position); bed.scale.setScalar(0.01); scene.add(bed); s.bed = bed;
  s.headBase = s.head.position.clone();
  sfx.whoosh(); hop(s, 0.35, 0.45);
  await tween(0.45, k => bed.scale.setScalar(Math.max(0.01, k*petScale())), ease.back);
  const h0 = s.head.position.clone(), h1 = new V3(0, 1.3, 0.78);
  await tween(0.5, k => s.head.position.lerpVectors(h0, h1, k));
  $('#night').classList.add('on');
  focusCam(worldOf(s, new V3(0, -0.4, -0.3)), 2.5*petK(), 0.2);

  mgOpen(L('Погладь малыша медленно-медленно', 'Pet the pup very, very slowly'));
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
      if(now - tickleT > 1.2){ tickleT = now; sfx.arf(); floatText(L('Хи-хи! Щекотно', 'Hehe! Tickles'), headTop(s)); mgHint(L('Медленнее… тихонько-тихонько', 'Slower… nice and gentle')); sleepy = Math.max(0, sleepy - 0.06); }
      return;
    }
    sleepy = Math.min(1, sleepy + d/1000);
    if(now - rubT > 0.3){ rubT = now; tone(330, 0.25, {vol:0.03, to:300}); }
    if(!yawned && sleepy > 0.5){ yawned = true; sfx.yawn(); floatText(L('Ааа-у…', 'Yaaawn…'), headTop(s), '#6B6A7E'); mgHint(L('Хорошо! Глазки закрываются…', 'Good! Eyes are getting heavy…')); }
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
  floatText(L('Сладких снов!', 'Sweet dreams!'), headTop(s).add(new V3(0, 0.3, 0)), '#6B6A7E');
  await wait(1.6);
}
async function petWake(){
  const s = petSeal; if(!s.bed) return;
  s.sleeping = false; $('#night').classList.remove('on');
  setMood(s, 'happy'); sfx.arf(); floatText(L('Доброе утро!', 'Good morning!'), headTop(s));
  const bl = s.blanket, bed = s.bed, h0 = s.head.position.clone();
  await tween(0.45, k => { if(bl) setBlanket(bl, 1 - k); s.head.position.lerpVectors(h0, s.headBase, k); });
  if(bl) s.inner.remove(bl); s.blanket = null;
  hop(s, 0.35, 0.45);
  await tween(0.35, k => bed.scale.setScalar(Math.max(0.01, (1 - k)*petScale())));
  scene.remove(bed); s.bed = null; s.happyUntil = now + 2;
}

/* ---------- Поиграть: мяч туда-обратно, малыш отбивает носом ---------- */
async function petPlay(s){
  const ball = petBall, rest = ball.userData.rest.clone();
  const sc = petScale(), Q = new V3(PET_SPOT.x + 0.1, 0.95, PET_SPOT.z + 1.5 + 1.3*sc);   // «твоя» точка — ближе к экрану
  const nose = () => worldOf(s, s.noseLocal).add(new V3(0, 0.2, 0.05));
  focusCam(new V3(PET_SPOT.x, 0.8 + 0.4*sc, PET_SPOT.z + 0.3 + 1.3*sc), 3.6*(0.55 + 0.45*petK()), 0.1);
  sfx.whoosh(); await flyTo(ball, rest.clone(), Q.clone(), 0.6, 0.6);
  const GOAL = 5;
  mgOpen(L('Нажми — подбрось мяч малышу!', 'Tap — toss the ball to the pup!'));
  const ring = mgNode('div', 'target'); ring.hidden = true;
  let state = 'ready', k = 0, from = Q.clone(), hits = 0, finish;
  const done = new Promise(r => finish = r);
  const up = () => { state = 'up'; k = 0; from = ball.position.clone(); hits++; sfx.tap(); ring.hidden = true;
    mgHint(hits >= GOAL ? L('Последний!', 'Last one!') : L(`Отбито: ${hits} из ${GOAL}`, `Bounced: ${hits} of ${GOAL}`)); };
  const miss = async () => {
    state = 'miss'; ring.hidden = true;
    const p0 = ball.position.clone(), floor = new V3(p0.x, 0.47, Math.min(p0.z, Q.z + 0.2));
    await tween(0.3, q => ball.position.lerpVectors(p0, floor, q), ease.lin); sfx.plop();
    await tween(0.35, q => { ball.position.copy(floor); ball.position.y += Math.sin(q*Math.PI)*0.35; }, ease.lin); sfx.plop();
    mgHint(L('Ой, упал! Ничего — ещё разок', 'Oops, it fell! Never mind — once more'));
    floatText(L('Ар!', 'Arf!'), headTop(s)); hop(s, 0.25, 0.35);
    await flyTo(ball, floor, Q.clone(), 0.6, 0.5);
    state = 'ready'; mgHint(L('Нажми — подбрось мяч ещё раз!', 'Tap — toss the ball again!'));
  };
  mgOn(mgRoot, 'pointerdown', e => {
    e.preventDefault();
    if(state === 'ready') return up();
    if(state === 'down' && k >= 0.45){ burst(TEX.star, ball.position.clone(), 5, 1.2, 0.2); return up(); }
    if(state === 'down') mgHint(L('Подожди, пусть долетит до тебя!', 'Wait, let it come down to you!'));
  });
  mgTick(dt => {
    ball.rotation.x += dt*5;
    if(state === 'up'){
      k = Math.min(1, k + dt/0.75); const to = nose();
      ball.position.lerpVectors(from, to, k); ball.position.y += Math.sin(k*Math.PI)*0.9;
      if(k >= 1){   // бум носом
        sfx.pop(); tween(0.3, q => s.nod = -Math.sin(q*Math.PI)*0.35, ease.lin);
        if(hits >= GOAL){ state = 'end'; return finish(); }
        if(Math.random() < 0.5) floatText(L(['Ап!', 'Оп!', 'Хоп!'], ['Up!', 'Hop!', 'Boing!'])[Math.floor(Math.random()*3)], headTop(s));
        state = 'down'; k = 0; from = to.clone();
      }
    } else if(state === 'down'){
      k += dt/0.95;
      if(k <= 1){ ball.position.lerpVectors(from, Q, k); ball.position.y += Math.sin(k*Math.PI)*1.0; }
      else { ball.position.copy(Q); ball.position.y -= (k - 1)*2.2; ball.position.z += (k - 1)*0.6; }
      if(k >= 0.45){ const p = toScreen(ball.position); ring.hidden = false; ring.style.left = p.x + 'px'; ring.style.top = p.y + 'px'; mgHint(L('Жми!', 'Now!')); }
      if(k > 1.35) miss();
    }
  });
  await done;
  mgClose();
  // финал: мяч подлетает и ложится малышу на нос
  const top = nose().add(new V3(0, 1.4, 0)), p0 = ball.position.clone();
  await tween(0.5, q => ball.position.lerpVectors(p0, top, q), ease.out);
  await tween(0.5, q => ball.position.lerpVectors(top, nose().add(new V3(0, 0.12, 0)), q), ease.io);
  sfx.good(); floatText(L('Та-да! Мяч на носу!', 'Ta-da! Ball on the nose!'), headTop(s).add(new V3(0, 0.5, 0)), '#D9527E');
  await tween(1.2, q => { const n = nose(); ball.position.set(n.x + Math.sin(q*Math.PI*4)*0.04, n.y + 0.12, n.z); }, ease.lin);
  await flyTo(ball, ball.position.clone(), rest, 0.7, 0.8);
  ball.rotation.set(0, 0, 0.4);
}
const PET_GAMES = {food:petFeed, bath:petBath, sleep:petSleep, fun:s => petFun(s)};   // «Поиграть» — выбор: мяч, прогулка, трюки (walk.js)

/* ---------- Нарядить: вещи из лавки ---------- */
async function petDress(){
  const items = SHOP.filter(x => x.kind === 'wear' && owns(x.id));
  if(!items.length) return toast(L('В лавке 🐚 есть бантики и шапочки — купи и наряди малыша!', 'The shop 🐚 has bows and hats — buy some and dress up your pup!'), 3200);
  const s = petSeal; setBusy(true); s.bubble.visible = false;
  if(s.sleeping) await petWake();
  focusCam(worldOf(s, new V3(0, -0.25, 0)), 2.0*petK(), 0.4);
  mgOpen(L('Наряди малыша', 'Dress up the pup'));
  const nav = mgNode('nav', 'tools wardrobe');
  const mark = () => nav.querySelectorAll('.tool[data-id]').forEach(b => b.classList.toggle('on', Object.values(wearIds(s)).includes(b.dataset.id)));
  for(const it of items){
    const b = document.createElement('button'); b.className = 'tool'; b.dataset.id = it.id;
    b.innerHTML = `<span class="face"><img src="${thumb(it.id)}" alt=""></span><span class="name">${it.name}</span>`;
    mgOn(b, 'click', () => { wearOn(s, it.id); petTuft(s); sfx.pop(); squash(s, 0.1, 0.25); mark(); save.pet.wear = wearIds(s); persist(); });
    nav.appendChild(b);
  }
  const ok = document.createElement('button'); ok.className = 'tool'; ok.id = 'dressDone';
  ok.innerHTML = `<span class="face">✓</span><span class="name">${L('Готово', 'Done')}</span>`; nav.appendChild(ok);
  mark();
  await new Promise(r => mgOn(ok, 'click', r));
  mgClose(); unfocusCam();
  sfx.arf(); s.happyUntil = now + 3; setMood(s, 'happy'); floatText(L('Красиво!', 'Pretty!'), headTop(s), '#D9527E');
  setBusy(false); petRefresh();
}

/* ---------- рост: праздник на новой стадии ---------- */
// Ждёт, пока малыш свободен и на экране нет окон: опыт мог прийти и в больнице (пациенты, событие смены).
function petMaybeGrow(){
  if(!petMode || homeMode || busy || !mgRoot.hidden || !growPending() || document.querySelector('.overlay:not([hidden])')) return;
  petGrow();
}
async function petGrow(){
  const p = save.pet, to = stageOf(p.xp), shiny = to === SHINY;
  setBusy(true); petRefreshT = 99;
  if(petSeal.sleeping) await petWake();
  let s = petSeal; s.bubble.visible = false; setMood(s, 'happy');
  const sc0 = s.root.scale.x, sc1 = STAGES[to].sc;
  const mid = () => new V3(PET_SPOT.x, 0.25 + 1.1*s.root.scale.x, PET_SPOT.z + 0.2);
  focusCam(new V3(PET_SPOT.x, 0.25 + 1.1*sc1, PET_SPOT.z + 0.3), 1.6 + 2.6*sc1, 0);
  floatText(L('Ой!', 'Oh!'), headTop(s)); sfx.arf();
  toast(shiny ? L('✨ Что-то волшебное…', '✨ Something magical…') : L('✨ Ой, что это происходит?', '✨ Oh, what is happening?'), 2400);
  await wait(0.6);
  // хоровод звёздочек, малыш кружится всё быстрее
  sfx.grow(); s.flap = 1;
  let spark = 0;
  await tween(1.9, k => {
    s.inner.rotation.y = k*k*Math.PI*6; s.inner.position.y = Math.sin(k*Math.PI)*0.35;
    if(now - spark > 0.05){
      spark = now; const a = now*7, r = 1.5*sc0*(1.2 - k*0.5), c = mid();
      emit(TEX.star, c.add(new V3(Math.cos(a)*r, (k - 0.5)*1.4*sc0, Math.sin(a)*r*0.6)), {v:new V3(0, 0.6, 0), life:0.7, size:0.2 + k*0.12, spin:5});
    }
  }, ease.lin);
  // пуф! — и вот он уже подрос
  const puff = new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.puff, transparent:true, depthWrite:false, depthTest:false}));
  puff.position.copy(mid()); puff.renderOrder = 5; scene.add(puff);
  sfx.pop(); sfx.whoosh();
  await tween(0.3, k => puff.scale.setScalar(0.5 + k*4.2*sc1), ease.out);
  scene.remove(s.root); p.stage = to; persist();
  s = placePet(); s.root.scale.setScalar(sc0); setMood(s, 'happy'); s.flap = 0.6;
  burst(TEX.star, mid(), 14, 2.4, 0.3);
  tween(0.5, k => { puff.material.opacity = 1 - k; puff.scale.setScalar((4.7 + k)*sc1); }).then(() => { scene.remove(puff); puff.material.dispose(); });
  await tween(0.7, k => s.root.scale.setScalar(sc0 + (sc1 - sc0)*k), ease.back);
  sfx.hug(); burst(TEX.heart, headTop(s), 20, 2.4, 0.34);
  floatText(shiny ? L('Я сияю!', 'I am shining!') : L(gg('Я подрос!', 'Я подросла!'), 'I grew up!'), headTop(s), '#D9527E');
  await hop(s, 0.45, 0.5); s.flap = 0;
  camOffWant.copy(PET_POS.clone().add(petView()));
  await wait(0.7);
  const img = petPhoto('stage:' + to);
  // окно праздника: фото, лесенка стадий, подарок
  $('#growImg').src = img;
  $('#growTitle').textContent = shiny ? L(`${p.name} ${gg('засиял', 'засияла')}!`, `${p.name} is shining!`) : L(`${p.name} ${gg('подрос', 'подросла')}!`, `${p.name} grew up!`);
  $('#growText').textContent = shiny ? L(`Вы так дружите, что ${gg('он', 'она')} теперь сияет ✨ Фото уже в альбоме ♡`, `You are such good friends that ${gg('he', 'she')} shines now ✨ The photo is already in the album ♡`)
    : L(`Теперь ${gg('он', 'она')} — ${stageName(to).toLowerCase()}. Фото уже в альбоме ♡`, `Now ${gg('he', 'she')} is ${/^[aeiou]/i.test(stageName(to)) ? 'an' : 'a'} ${stageName(to).toLowerCase()}. The photo is already in the album ♡`);
  $('#growStages').innerHTML = STAGES.map((st, i) =>
    `<li class="${i < to ? 'was' : i === to ? 'now' : ''}"><span class="ic">${st.ic}</span><span class="t">${stageName(i)}</span></li>`).join('');
  $('#growGift').textContent = L(`Подарок: +${GROW_GIFT} 🐚`, `Gift: +${GROW_GIFT} 🐚`);
  $('#grow').hidden = false; sfx.star();
  await new Promise(r => $('#btnGrowOk').addEventListener('click', r, {once:true}));
  sfx.tap(); $('#grow').hidden = true; unfocusCam();
  addShells(GROW_GIFT, toScreen(headTop(s)));
  s.happyUntil = now + 3;
  toast(to === 1 ? L(`Заботься ${gg('о нём', 'о ней')} дальше — ${gg('он', 'она')} ещё подрастёт!`, `Keep caring for ${gg('him', 'her')} — ${gg('he', 'she')} will grow even more!`)
    : to < SHINY - 1 ? L('Ещё немного дружбы — и новая стадия!', 'A little more friendship — and a new stage!')
    : to === SHINY - 1 ? L(`Совсем ${gg('взрослый', 'взрослая')}! А лучшие друзья даже сияют ✨`, 'All grown up! And the best friends even shine ✨') : L('Самые лучшие друзья ♡', 'The very best friends ♡'), 3600);
  setBusy(false); petRefreshT = 0; petRefresh();
}

/* ---------- ласка: погладь пальцем (голова — «ур-р», пузико — щекотно) ---------- */
let stroke = null, tickleT = -9;
function petPart(e){
  const rect = canvas.getBoundingClientRect();
  ndc.set((e.clientX - rect.left)/rect.width*2 - 1, -((e.clientY - rect.top)/rect.height)*2 + 1);
  ray.setFromCamera(ndc, camera);
  const h = ray.intersectObjects(petSeal.hits, false)[0];
  return h ? (h.object.parent === petSeal.head ? 'head' : 'body') : null;
}
function petStroke(e){
  if(!stroke || e.pointerId !== stroke.id || !petMode || busy || !petSeal || petSeal.sleeping) return;
  const d = Math.hypot(e.clientX - stroke.x, e.clientY - stroke.y); stroke.x = e.clientX; stroke.y = e.clientY;
  if(!d || !petPart(e)) return;
  const s = petSeal, part = petPart(e);
  stroke.d += d; stroke.fx += d;
  if(stroke.fx > 80){
    stroke.fx = 0; s.happyUntil = now + 1.5; setMood(s, 'happy');
    if(part === 'head'){ sfx.purr(); emit(TEX.heart, headTop(s).add(new V3((Math.random() - 0.5)*0.5, 0, 0)), {v:new V3(0, 0.9, 0.2), life:0.9, size:0.24}); }
    else {
      sfx.rub(); tween(0.4, k => s.wobble = Math.sin(k*Math.PI*4)*0.05*(1 - k), ease.lin);
      if(now - tickleT > 1.6){ tickleT = now; sfx.arf(); floatText(L(['Хи-хи! Щекотно!', 'Пузико! Хи-хи', 'Ой, щекотно!'], ['Hehe! Tickles!', 'Tummy! Hehe', 'Oh, it tickles!'])[Math.floor(Math.random()*3)], headTop(s)); }
    }
  }
  if(!stroke.done && stroke.d > 500){   // долго гладили — сердечко дружбы (не больше PAT_MAX раз в день)
    stroke.done = true;
    const p = save.pet, today = new Date().toDateString();
    if(p.pat.d !== today) p.pat = {d:today, n:0};
    floatText(part === 'head' ? L('Ур-р… ♡', 'Purr… ♡') : L('Люблю тебя! ♡', 'Love you! ♡'), headTop(s).add(new V3(0, 0.4, 0)), '#D9527E');
    if(p.pat.n < PAT_MAX){ p.pat.n++; petGive(PAT_XP); petMaybeGrow(); }
    if(petWish === 'pat'){ wishDone('pat'); s.bubble.visible = false; renderPetCard(); }
  }
}
function petStrokeEnd(e){
  if(!stroke || e.pointerId !== stroke.id) return;
  const tap = stroke.d < 14; stroke = null;
  if(!tap || busy || !petSeal) return;
  sfx.arf(); squash(petSeal, 0.15, 0.3);
  floatText(L(['Ар!', 'Хи-хи', '♡', 'Ар-ар!'], ['Arf!', 'Hehe', '♡', 'Arf arf!'])[Math.floor(Math.random()*4)], headTop(petSeal));
  emit(TEX.heart, headTop(petSeal), {v:new V3(0, 1, 0.3), life:0.9, size:0.3});
  const low = petLow(), wish = petSeal.bubble.visible && petWish;
  if(homeMode) return toast(L('Погладь пальцем ♡ А ещё нажимай на вещи — поиграем!', 'Pet with your finger ♡ And tap things — let us play!'));
  toast(low ? L(`${save.pet.name}: «${NEEDS[low].say}» Нажми ${NEEDS[low].ic} внизу`, `${save.pet.name}: “${NEEDS[low].say}” Tap ${NEEDS[low].ic} below`)
    : wish && wish !== 'pat' ? L(`${save.pet.name}: «${WISHES[wish].say()}» Нажми на облачко ${WISHES[wish].ic}`, `${save.pet.name}: “${WISHES[wish].say()}” Tap the cloud ${WISHES[wish].ic}`)
    : L('Погладь пальцем — по голове или по пузику ♡', 'Pet with your finger — on the head or the tummy ♡'));
}
canvas.addEventListener('pointermove', petStroke);
for(const ev of ['pointerup', 'pointercancel', 'pointerleave']) canvas.addEventListener(ev, petStrokeEnd);

/* ---------- покадрово ---------- */
let petRefreshT = 0, shineT = 0;
function petTick(t, dt){
  if(!petSeal) return;
  updateSeal(petSeal, t, dt);
  const wishing = petSeal.bubble.visible && petSeal.bubble.material.map === (petWish && WISHES[petWish].tex);
  petSeal.bubble.scale.setScalar(wishing ? 0.85*(1 + Math.sin(t*3.5)*0.07) : 0.85);   // облачко-желание «дышит»: его можно нажать
  if(petSeal.halo && petMode){   // сияющий: ореол дышит, отлив переливается, вокруг искорки
    petSeal.halo.material.opacity = 0.75 + Math.sin(t*2)*0.2;
    petSeal.bodyMat.emissive.setHSL((t*0.05) % 1, 0.9, 0.1 + Math.sin(t*1.7)*0.03);
    shineT -= dt;
    if(shineT < 0){
      shineT = 0.3 + Math.random()*0.3; const sc = petSeal.root.scale.x, a = Math.random()*Math.PI*2;
      emit(TEX.star, petSeal.root.position.clone().add(new V3(Math.cos(a)*1.4*sc, (0.4 + Math.random()*1.8)*sc, Math.sin(a)*0.9*sc)), {v:new V3(0, 0.35, 0), life:0.9, size:0.13, spin:3});
      if(Math.random() < 0.12 && !busy) sfx.sparkle();
    }
  }
  if(petSeal.sleeping && petMode){
    petSeal.zzzT -= dt;
    if(petSeal.zzzT < 0){ petSeal.zzzT = 1.2; floatText('z', worldOf(petSeal, new V3(0.85 + Math.random()*0.2, 0.35, 0.3)), '#8E99C9'); }
  }
  petRefreshT -= dt;
  if(petRefreshT < 0){ petRefreshT = 2; if(save.pet){ if(petMode) save.pet.seen = Date.now(); petDecay(); if(!busy) petRefresh(); petMaybeGrow(); } }
}

buildPetBar();
petFix();
if(save.pet){ petDecay(); placePet(); drawSign(); }
if(document.fonts) document.fonts.ready.then(drawSign);
