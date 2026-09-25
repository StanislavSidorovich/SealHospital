/* ---------------- Соседи (Фаза 10): пингвин Пинг живёт рядом с малышом ----------------
   После того как Сабрина разоблачила пингвина-самозванца в больнице (shift.js), Пинг приплывает
   на своей льдинке к уголку малыша и остаётся жить по соседству (NB_POS, за табличкой с именем).
   • Мяч втроём: ты → малыш → Пинг → снова ты (кнопка ⚽ «Поиграть» или облачко-желание малыша).
   • Просьба дня: у Пинга над головой облачко с тем, что он хочет посмотреть (искупать малыша, прогулка,
     трюк, забег, наряд, мяч втроём). Сделала — у Пинга подарок 🎁: касание по нему → ракушки и дружба 💙.
     За 3 💙 — «Шапочка Пинга» в гардероб. Не успела — ничего не пропадает, завтра будет новая просьба.
   • Пинг шутник: касание без просьбы — шутка, прыжок или танец. Когда малыш спит, Пинг тоже спит.
   Сохранение: save.nb.ping = {in, xp, q:{d, id, ok, got}} (sanitizeNb в data.js).
   Подключается после adventure.js (walk.js, pet.js уже есть) и до mail.js. */
const NB_POS = PET_POS.clone().add(new V3(1.6, 0, -6.8));   // центр льдинки Пинга
const NB_SPOT = NB_POS.clone().add(new V3(0.45, 0.25, 0.35));   // где Пинг стоит дома
const NB_EDGE = NB_POS.clone().add(new V3(0.1, 0.25, 1.05));   // край льдинки Пинга, откуда он прыгает к малышу
const NB_LAND = PET_POS.clone().add(new V3(0.8, 0.25, -2.4));   // куда приземляется на льдине малыша
const NB_SC = 0.52;          // Пинг-сосед — маленький пингвинёнок
const NB_GIFT = 6;           // ракушек за выполненную просьбу
const NB_CAP_AT = 3;         // столько 💙 — и Пинг дарит свою шапочку
if(!save.nb || !save.nb.ping) save.nb = {ping:{in:false, xp:0, q:{d:'', id:'', ok:false, got:false}}};   // Pages мог отдать старый data.js
const nbP = () => save.nb.ping;
const nbToday = () => new Date().toDateString();

// просьбы дня: ev — какое занятие в уголке её выполняет (petDo → nbEvent), can — можно ли её сейчас просить
const PING_ASKS = [
  {id:'ball',  ic:'⚽', ev:'ping',   ask:() => L('Поиграем в мяч втроём? Нажми ⚽ «Поиграть»!', 'Let\'s play ball, all three of us! Tap ⚽ “Play”!'),
    thx:() => L('Вот это был матч! Кря!', 'What a match! Quack!')},
  {id:'bath',  ic:'🛁', ev:'bath',   ask:() => L(`Искупай ${save.pet.name}! Я обожаю мыльные пузыри`, `Give ${save.pet.name} a bath! I love soap bubbles`),
    thx:() => L('Какие пузыри! Один даже долетел до меня!', 'Such bubbles! One even flew over to me!')},
  {id:'walk',  ic:'🐾', ev:'walk',   ask:() => L('Сходите погулять по льдинкам — а потом расскажете, что нашли!', 'Go for a walk on the little floes — then tell me what you found!'),
    thx:() => L('Я видел, как вы прыгали по льдинкам! Здорово!', 'I saw you hopping on the floes! Cool!')},
  {id:'trick', ic:'🎓', ev:'tricks', ask:() => L('Покажи, какой трюк умеет малыш! Я тоже хочу научиться', 'Show me a trick your pup can do! I want to learn too'),
    thx:() => L('Я попробовал так же… и шлёпнулся! Кря-ха-ха!', 'I tried it too… and plopped over! Quack-ha-ha!')},
  {id:'run',   ic:'🏔️', ev:'run',    ask:() => L('Сбегай в приключение по льдинам! Я буду болеть за вас', 'Go on an ice floe adventure! I\'ll cheer for you'),
    thx:() => L('Я кричал «Давай-давай!» с моей льдинки!', 'I was shouting “Go, go!” from my floe!')},
  {id:'dress', ic:'🎀', ev:'dress',  ask:() => L('Наряди малыша — устроим показ мод!', 'Dress up your pup — let\'s have a fashion show!'),
    thx:() => L('Самый модный тюлень на всём льду!', 'The most stylish seal on the whole ice!'),
    can:() => SHOP.some(x => x.kind === 'wear' && owns(x.id))}
];
const pingAsk = id => PING_ASKS.find(a => a.id === id);
const PING_JOKES = [
  () => L('Почему пингвины не летают? Потому что плавать веселее! Кря!', 'Why don\'t penguins fly? Because swimming is more fun! Quack!'),
  () => L('Я вчера катался на пузе — до самого горизонта!', 'Yesterday I slid on my tummy all the way to the horizon!'),
  () => L('Тюлений костюм я больше не надеваю. Ну… почти.', 'I don\'t wear the seal costume anymore. Well… almost.'),
  () => L('У меня есть рыбка-подушка. Только она уплыла.', 'I have a fish pillow. It swam away, though.'),
  () => L('Как пингвин строит дом? Иглу-по-иглу! Кря-ха-ха!', 'How does a penguin build a house? Igloo by igloo! Quack-ha-ha!'),
  () => L(`${save.pet.name} — мой самый лучший сосед!`, `${save.pet.name} is my very best neighbour!`),
  () => L('Хочешь, станцую? Смотри!', 'Want to see me dance? Watch!')
];
let lastJoke = -1;

/* ---------- шапочка Пинга: подарок дружбы (в лавке не продаётся) ---------- */
SHOP.push({id:'pingcap', kind:'wear', slot:'head', name:L('Шапочка Пинга', 'Ping\'s hat'), gift:true});
WEAR.pingcap = () => {   // тёмно-синяя шапочка-пингвин: белая «мордочка» с глазками и клювиком, оранжевый помпон
  const g = new THREE.Group(), m = toon(0x46557A);
  const dome = addOutline(new THREE.Mesh(new THREE.SphereGeometry(0.46, 24, 12, 0, Math.PI*2, 0, Math.PI/2), m), 1.05); dome.scale.y = 0.9; g.add(dome);
  const face = new THREE.Mesh(SMALL, toon(0xFFFDF8)); face.scale.set(0.26, 0.2, 0.08); face.position.set(0, 0.2, 0.4); face.rotation.x = -0.45; g.add(face);
  for(const sd of [-1, 1]){ const e = new THREE.Mesh(SMALL, inkMat); e.scale.set(0.03, 0.04, 0.02); e.position.set(sd*0.09, 0.25, 0.46); g.add(e); }
  const beak = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.1, 10), toon(0xFFA552)), 1.12); beak.rotation.x = Math.PI/2; beak.position.set(0, 0.17, 0.5); g.add(beak);
  const cuff = addOutline(new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.08, 10, 28), toon(0x46557A)), 1.06); cuff.rotation.x = Math.PI/2; g.add(cuff);
  const pom = addOutline(new THREE.Mesh(SMALL, toon(0xFFA552)), 1.08); pom.scale.setScalar(0.12); pom.position.y = 0.46; g.add(pom);
  g.userData.at = [0, 0.6, -0.02, -0.15, 0, 0.1]; return g;
};

/* ---------- льдинка Пинга: маленький голубой домик и флажок-рыбка ---------- */
const nbRoot = new THREE.Group(); nbRoot.position.copy(NB_POS); nbRoot.visible = false; scene.add(nbRoot);
{ const fl = addOutline(new THREE.Mesh(floeGeo, floe.material), 1.03); fl.position.y = -0.05; fl.scale.set(0.37, 1, 0.37); fl.rotation.y = 0.8; nbRoot.add(fl);
  const fm = new THREE.Mesh(foam.geometry, foam.material); fm.rotation.x = -Math.PI/2; fm.position.y = 0.1; fm.scale.setScalar(0.37); nbRoot.add(fm);
  const h = new THREE.Group(); h.position.set(-0.45, 0.25, -0.3); h.rotation.y = 0.35;
  h.add(addOutline(new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 12, 0, Math.PI*2, 0, Math.PI/2), toon(0xDDEEFF)), 1.04));
  const tunnel = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.3, 16, 1, false, -Math.PI/2, Math.PI), toon(0xDDEEFF)), 1.06);
  tunnel.rotation.x = Math.PI/2; tunnel.position.set(0, 0, 0.47); h.add(tunnel);
  const door = new THREE.Mesh(new THREE.CircleGeometry(0.15, 16, 0, Math.PI), new THREE.MeshBasicMaterial({color:0x46557A})); door.position.set(0, 0, 0.625); h.add(door);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6), inkMat); pole.position.set(0.25, 0.75, 0); h.add(pole);
  const flag = makeFish(0xFFA552); flag.scale.setScalar(0.55); flag.position.set(0.25 + 0.2, 0.95, 0); h.add(flag); nbRoot.userData.flag = flag;
  nbRoot.add(h);
}
let ping = null;   // модель Пинга-соседа (makePenguin из seal.js)
const PING_TEX = {gift:bubbleTex('🎁'), zzz:bubbleTex('💤')};
const pingAskTex = {};
function nbPlace(){
  if(ping) scene.remove(ping.root);
  ping = makePenguin(PENG); ping.root.scale.setScalar(NB_SC);
  ping.root.position.copy(NB_SPOT); ping.root.rotation.y = -0.35;   // смотрит на уголок малыша
  ping.bubble.position.x = -0.5; ping.bubble.userData.y = 3.7;   // облачко над головой: справа его срезает край узкого экрана
  scene.add(ping.root); return ping;
}
const nbIn = () => !!save.pet && nbP().in;
const nbHere = () => nbIn() && !homeMode && !!ping && !(petSeal && petSeal.sleeping);   // можно звать играть
let nbBusy = false, nbIdle = false, nbIdleT = 4, nbSeenT = 0, nbSleep = false;   // nbIdle — Пинг занят своей ужимкой

/* ---------- просьба дня ---------- */
function nbQuest(){
  const p = nbP(), q = p.q, today = nbToday();
  if(q.d === today || (q.ok && !q.got)) return q;   // подарок за вчерашнее никуда не девается
  const pool = PING_ASKS.filter(a => a.id !== q.id && (!a.can || a.can()));
  const a = !p.xp && !q.id ? pingAsk('ball') : pool[Math.floor(Math.random()*pool.length)];   // первая просьба — мяч втроём
  p.q = {d:today, id:a.id, ok:false, got:false}; persist();
  return p.q;
}
// что показывает облачко над Пингом: подарок, просьбу или ничего
function nbBubble(){
  if(!ping) return;
  const q = nbQuest(), b = ping.bubble;
  const map = nbSleep ? PING_TEX.zzz : q.ok && !q.got ? PING_TEX.gift : !q.ok ? (pingAskTex[q.id] || (pingAskTex[q.id] = bubbleTex(pingAsk(q.id).ic))) : null;
  b.visible = !!map && !nbBusy;
  if(map && b.material.map !== map){ b.material.map = map; b.material.needsUpdate = true; }
}
// занятие в уголке закончилось (petDo в pet.js): вдруг Пинг именно этого и ждал
function nbEvent(ev){
  if(!nbIn()) return;
  const q = nbQuest();
  if(q.ok || pingAsk(q.id).ev !== ev) return;
  q.ok = true; persist(); nbBubble();
  setTimeout(() => {
    if(!petMode || homeMode) return;
    if(ping){ sfx.quack(); ping.flap = 1; hop(ping, 0.3, 0.4).then(() => ping && (ping.flap = 0)); }
    toast(ev === 'ping' ? L('🐧 Пинг: «Спасибо за игру!» Нажми на него — у него для тебя подарок 🎁', '🐧 Ping: “Thanks for the game!” Tap him — he has a gift for you 🎁')
      : L('🐧 Пинг всё видел! Нажми на него — у него для тебя подарок 🎁', '🐧 Ping saw it all! Tap him — he has a gift for you 🎁'), 3400);
  }, 3300);   // после тоста самого занятия (и когда Пинг уже дома)
}

/* ---------- касание по Пингу ---------- */
// strict — только точное попадание (его проверяем раньше облачка малыша, которое висит рядом)
function pingHit(e, strict){
  if(!ping || !nbRoot.visible) return false;
  const rect = canvas.getBoundingClientRect();
  ndc.set((e.clientX - rect.left)/rect.width*2 - 1, -((e.clientY - rect.top)/rect.height)*2 + 1);
  ray.setFromCamera(ndc, camera);
  if(ray.intersectObjects(ping.hits, false).length) return true;
  const r = strict ? 26 : 52;   // Пинг далеко и маленький — мимо малыша касание щедрое
  const pts = [ping.root.position.clone().add(new V3(0, 0.9*NB_SC, 0)), ping.bubble.visible && ping.bubble.getWorldPosition(new V3())].filter(Boolean);
  return pts.some(v => { const q = toScreen(v); return Math.hypot(q.x - e.clientX, q.y - e.clientY) < r; });
}
function nbTap(e, strict = false){
  if(!nbIn() || nbBusy || busy || !pingHit(e, strict)) return false;
  sfx.tap();
  if(nbSleep){ floatText('z-z-z', headTop(ping), '#8E99C9'); toast(L('Тсс… Пинг тоже спит 💤', 'Shh… Ping is sleeping too 💤')); return true; }
  const q = nbQuest();
  if(q.ok && !q.got) nbGift(q);
  else if(!q.ok){ sfx.quack(); squash(ping, 0.15, 0.3); floatText(L('Кря!', 'Quack!'), headTop(ping)); toast(L(`Пинг: «${pingAsk(q.id).ask()}» ${pingAsk(q.id).ic}`, `Ping: “${pingAsk(q.id).ask()}” ${pingAsk(q.id).ic}`), 3800); }
  else nbJoke();
  return true;
}
async function nbJoke(){
  let i; do i = Math.floor(Math.random()*PING_JOKES.length); while(i === lastJoke && PING_JOKES.length > 1);
  lastJoke = i;
  sfx.quack(); toast(L(`Пинг: «${PING_JOKES[i]()}» 💙 ${nbP().xp}`, `Ping: “${PING_JOKES[i]()}” 💙 ${nbP().xp}`), 3600);
  if(nbIdle) return squash(ping, 0.15, 0.3);   // уже чем-то занят — просто «кря»
  nbBusy = true;
  await (i === PING_JOKES.length - 1 ? pingDance(ping) : i % 2 ? pingSlide(ping) : hop(ping, 0.35, 0.4));
  nbBusy = false;
}
async function nbGift(q){
  const p = nbP(), a = pingAsk(q.id), s = ping;
  nbBusy = true; while(nbIdle) await wait(0.1); q.got = true; p.xp++; persist(); nbBubble();
  sfx.quack(); s.flap = 1; setMood(s, 'happy');
  floatText(a.thx(), headTop(s), '#D9527E');
  await hop(s, 0.4, 0.45);
  sfx.pop(); burst(TEX.star, headTop(s), 10, 1.8, 0.26);
  addShells(NB_GIFT, toScreen(headTop(s)));
  if(petSeal && !petSeal.sleeping){ petSeal.happyUntil = now + 3; setMood(petSeal, 'happy'); petGive(3); }
  s.flap = 0.3;
  let msg = L(`Пинг: «${a.thx()}» Дружба с Пингом: ${p.xp} 💙`, `Ping: “${a.thx()}” Friendship with Ping: ${p.xp} 💙`);
  if(p.xp >= NB_CAP_AT && !owns('pingcap')){
    save.owned.push('pingcap'); persist();
    await wait(1.2); sfx.buy(); burst(TEX.heart, headTop(s), 14, 2, 0.3);
    msg = L('🎁 Пинг дарит тебе свою шапочку! Ищи её в 🎀 «Нарядить» 🐧', '🎁 Ping gives you his very own hat! Find it in 🎀 “Dress up” 🐧');
  }
  toast(msg, 4000);
  await wait(0.8); setMood(s, 'ok'); s.flap = 0;
  nbBusy = false; nbBubble();
  petMaybeGrow();
}

/* ---------- ужимки Пинга ---------- */
async function pingDance(s){
  sfx.quack(); s.flap = 1;
  await tween(1.4, k => { s.inner.rotation.z = Math.sin(k*Math.PI*6)*0.2; s.inner.rotation.y = Math.sin(k*Math.PI*3)*0.6; }, ease.lin);
  s.inner.rotation.z = s.inner.rotation.y = 0; s.flap = 0;
}
// проехаться на пузе: падает вперёд и катится кружок перед домиком, потом встаёт
async function pingSlide(s){
  const r = s.root, c = NB_SPOT.clone().add(new V3(-0.1, 0, 0.3)), p0 = r.position.clone(), a0 = Math.atan2(p0.z - c.z, p0.x - c.x), R = Math.hypot(p0.x - c.x, p0.z - c.z) || 0.5;
  sfx.whoosh(); await tween(0.25, k => s.inner.rotation.x = k*1.35);
  await tween(1.4, k => { const a = a0 + k*Math.PI*2; r.position.set(c.x + Math.cos(a)*R, 0.25, c.z + Math.sin(a)*R); r.rotation.y = -a; }, ease.io);
  r.position.copy(p0); r.rotation.y = Math.atan2(Math.sin(r.rotation.y), Math.cos(r.rotation.y));   // полный круг — угол обратно в ±π
  await tween(0.3, k => s.inner.rotation.x = 1.35*(1 - k)); s.inner.rotation.x = 0;
  await turnTo(s, -0.35, 0.3); sfx.quack();
}

/* ---------- Пинг переезжает (один раз): льдинка приплывает к уголку ---------- */
async function nbMoveIn(){
  nbBusy = true; setBusy(true);
  const p = nbP(); nbPlace(); nbRoot.visible = true;
  const far = new V3(9, 0, 1.5), s = ping;
  focusCam(PET_SPOT.clone().lerp(NB_SPOT, 0.5).setY(0.9), 4.8, 0);
  nbRoot.position.copy(NB_POS).add(far); s.root.position.copy(NB_SPOT).add(far);
  sfx.quack(); s.flap = 1;
  await tween(2.6, k => { const o = far.clone().multiplyScalar(1 - k); nbRoot.position.copy(NB_POS).add(o); s.root.position.copy(NB_SPOT).add(o); }, ease.out);
  s.flap = 0.4; sfx.thud(); burst(TEX.puff, NB_POS.clone().add(new V3(0, 0.1, 0.8)), 8, 1.2, 0.45);
  floatText(L('Привет, соседи!', 'Hi, neighbours!'), headTop(s), '#D9527E');
  await hop(s, 0.4, 0.45);
  if(petSeal && !petSeal.sleeping){ petSeal.happyUntil = now + 4; setMood(petSeal, 'happy'); sfx.arf(); hop(petSeal, 0.35, 0.45); floatText(L('Ар-ар!', 'Arf arf!'), headTop(petSeal)); }
  await wait(1.0);
  toast(L(`Пинг: «Можно я буду жить рядом? Мне так понравилось у вас!» Теперь ${save.pet.name} и Пинг — соседи 🐧`, `Ping: “Can I live next door? I love it here!” Now ${save.pet.name} and Ping are neighbours 🐧`), 4200);
  await wait(4.2);
  p.in = true; persist();
  nbQuest(); s.flap = 0;
  toast(L('Нажимай на Пинга: у него бывают просьбы, а за них — подарки 🎁', 'Tap Ping: he has requests, and gifts for doing them 🎁'), 3600);
  unfocusCam(); nbBusy = false; setBusy(false); nbBubble(); petRefresh();
}

/* ---------- ⚽ мяч втроём: ты → малыш → Пинг → ты ---------- */
async function nbBall(s){
  const ball = petBall, rest = ball.userData.rest.clone(), sc = petScale(), P = ping;
  const home = P.root.position.clone(), yaw0 = P.root.rotation.y;
  const spot = PET_SPOT.clone().add(new V3(1.2 + 0.7*sc, 0, 0.05));   // рядом с малышом, справа
  nbBusy = true; P.bubble.visible = false;
  while(nbIdle) await wait(0.1);   // докатится на пузе — и придёт
  nbSleep = false; setMood(P, 'ok');
  focusCam(PET_SPOT.clone().lerp(NB_POS, 0.45).setY(0.8), 6.5, 0.2);
  // Пинг прыгает с льдинки на льдинку и шлёпает к малышу
  sfx.quack(); floatText(L('Я иду!', 'Coming!'), headTop(P), '#D9527E');
  await waddleTo(P, NB_EDGE, 0.6);
  await hopTo(P, NB_LAND, 1.3, 0.9);
  await waddleTo(P, spot, 1.1);
  await turnTo(P, -0.55, 0.3); await turnTo(s, 0.45, 0.3);
  const Q = new V3(PET_SPOT.x + 0.8, 0.95, PET_SPOT.z + 1.7 + 1.3*sc);   // «твоя» точка — ближе к экрану, между ними
  focusCam(new V3(PET_SPOT.x + 0.65, 0.75 + 0.4*sc, PET_SPOT.z + 0.4 + 1.0*sc), 3.0*(0.6 + 0.4*petK()), 0.15);
  sfx.whoosh(); await flyTo(ball, rest.clone(), Q.clone(), 0.6, 0.6);
  const GOAL = 4;
  mgOpen(L('Мяч втроём! Нажми — подбрось малышу', 'Ball for three! Tap — toss it to the pup'));
  const ring = mgNode('div', 'target'); ring.hidden = true;
  const nose = () => worldOf(s, s.noseLocal).add(new V3(0, 0.2, 0.05));
  const beak = () => headTop(P).add(new V3(0, 0.05, 0));
  let state = 'ready', k = 0, from = Q.clone(), rounds = 0, finish, silly = false;
  const done = new Promise(r => finish = r);
  const say = (who, arr) => { if(Math.random() < 0.6) floatText(arr[Math.floor(Math.random()*arr.length)], headTop(who)); };
  const up = () => { state = 'toPup'; k = 0; from = ball.position.clone(); sfx.tap(); ring.hidden = true;
    mgHint(rounds >= GOAL - 1 ? L('Последний круг!', 'Last round!') : L(`Круг ${rounds + 1} из ${GOAL}`, `Round ${rounds + 1} of ${GOAL}`)); };
  const miss = async () => {
    state = 'miss'; ring.hidden = true;
    const p0 = ball.position.clone(), floor = new V3(p0.x, 0.47, Math.min(p0.z, Q.z + 0.2));
    await tween(0.3, q => ball.position.lerpVectors(p0, floor, q), ease.lin); sfx.plop();
    await tween(0.35, q => { ball.position.copy(floor); ball.position.y += Math.sin(q*Math.PI)*0.35; }, ease.lin); sfx.plop();
    sfx.quack(); floatText(L('Кря-ха-ха! Бывает!', 'Quack-ha-ha! It happens!'), headTop(P)); hop(P, 0.25, 0.35);
    mgHint(L('Ой, упал! Ничего — ещё разок', 'Oops, it fell! Never mind — once more'));
    await flyTo(ball, floor, Q.clone(), 0.6, 0.5);
    state = 'ready'; mgHint(L('Нажми — подбрось мяч малышу!', 'Tap — toss the ball to the pup!'));
  };
  mgOn(mgRoot, 'pointerdown', e => {
    e.preventDefault();
    if(state === 'ready') return up();
    if(state === 'toYou' && k >= 0.45){ rounds++; burst(TEX.star, ball.position.clone(), 5, 1.2, 0.2); if(rounds >= GOAL){ state = 'end'; ring.hidden = true; return finish(); } return up(); }
    if(state === 'toYou') mgHint(L('Подожди, пусть долетит до тебя!', 'Wait, let it come down to you!'));
  });
  mgTick(dt => {
    ball.rotation.x += dt*5;
    if(state === 'toPup'){
      k = Math.min(1, k + dt/0.75); const to = nose();
      ball.position.lerpVectors(from, to, k); ball.position.y += Math.sin(k*Math.PI)*0.9;
      if(k >= 1){ sfx.pop(); tween(0.3, q => s.nod = -Math.sin(q*Math.PI)*0.35, ease.lin); say(s, L(['Ап!', 'Пинг, лови!', 'Хоп!'], ['Up!', 'Catch, Ping!', 'Hop!'])); state = 'toPing'; k = 0; from = to.clone(); }
    } else if(state === 'toPing'){
      k = Math.min(1, k + dt/0.8); const to = beak();
      ball.position.lerpVectors(from, to, k); ball.position.y += Math.sin(k*Math.PI)*0.8;
      if(k >= 1){
        sfx.pop(); tween(0.3, q => P.nod = -Math.sin(q*Math.PI)*0.4, ease.lin);
        silly = rounds === 1;   // на втором круге Пинг дурачится: мяч скачет у него на голове
        state = silly ? 'silly' : 'toYou'; k = 0; from = to.clone();
        if(silly){ sfx.quack(); floatText(L('Ой-ой-ой!', 'Whoa-whoa!'), headTop(P).add(new V3(0, 0.4, 0))); P.flap = 1; }
        else say(P, L(['Кря!', 'Держи!', 'Бум клювиком!'], ['Quack!', 'Here!', 'Beak bump!']));
      }
    } else if(state === 'silly'){
      k += dt/1.3; const h = beak();
      ball.position.set(h.x + Math.sin(k*Math.PI*3)*0.12, h.y + Math.abs(Math.sin(k*Math.PI*3))*0.45, h.z);
      P.inner.rotation.z = Math.sin(k*Math.PI*6)*0.15;
      if(k >= 1){ P.inner.rotation.z = 0; P.flap = 0; sfx.pop(); floatText(L('Фух! Держи!', 'Phew! Here!'), headTop(P)); state = 'toYou'; k = 0; from = ball.position.clone(); }
    } else if(state === 'toYou'){
      k += dt/0.95;
      if(k <= 1){ ball.position.lerpVectors(from, Q, k); ball.position.y += Math.sin(k*Math.PI)*1.0; }
      else { ball.position.copy(Q); ball.position.y -= (k - 1)*2.2; ball.position.z += (k - 1)*0.6; }
      if(k >= 0.45){ const p = toScreen(ball.position); ring.hidden = false; ring.style.left = p.x + 'px'; ring.style.top = p.y + 'px'; mgHint(L('Жми!', 'Now!')); }
      if(k > 1.35) miss();
    }
  });
  await done;
  mgClose();
  // финал: мяч свечкой вверх, все трое прыгают — «Ура!»
  const top = Q.clone().add(new V3(-0.3, 2.2, -0.8)), p0 = ball.position.clone();
  await tween(0.6, q => ball.position.lerpVectors(p0, top, q), ease.out);
  sfx.good(); s.flap = 1; P.flap = 1; setMood(P, 'happy');
  floatText(L('Ура-а!', 'Hooray!'), headTop(s).add(new V3(0.4, 0.5, 0)), '#D9527E');
  burst(TEX.heart, headTop(s).lerp(headTop(P), 0.5), 16, 2.2, 0.3);
  await Promise.all([hop(s, 0.5, 0.5), hop(P, 0.55, 0.5), tween(0.5, q => ball.position.lerpVectors(top, rest.clone().setY(1.6), q), ease.io)]);
  s.flap = 0; P.flap = 0; sfx.quack();
  await flyTo(ball, ball.position.clone(), rest, 0.5, 0.3); ball.rotation.set(0, 0, 0.4);
  // Пинг идёт домой
  await turnTo(s, 0, 0.3);
  unfocusCam();
  nbGoHome(P, home, yaw0);
}
async function nbGoHome(P, home, yaw0){
  floatText(L('Пока-пока!', 'Bye-bye!'), headTop(P));
  await waddleTo(P, NB_LAND, 1.0);
  await hopTo(P, NB_EDGE, 1.3, 0.9);
  await waddleTo(P, home, 0.6);
  await turnTo(P, yaw0, 0.3);
  setMood(P, 'ok'); nbBusy = false; nbBubble();
}

/* ---------- облачко-желание малыша: «Позовём Пинга?» ---------- */
WISHES.ping = {tex:bubbleTex('🐧'), ic:'🐧', say:() => L('Позовём Пинга играть в мяч?', 'Shall we call Ping to play ball?'), card:() => L('Хочет играть с Пингом', 'Wants to play with Ping')};

/* ---------- покадрово ---------- */
function nbTick(t, dt){
  const p = nbP();
  if(!ping && nbIn()) nbPlace();
  nbRoot.visible = (nbIn() || nbBusy) && !homeMode && !runCam.on;
  if(ping) ping.root.visible = nbRoot.visible || nbBusy;
  if(!ping || !ping.root.visible) return nbMaybeMoveIn(dt);
  updateSeal(ping, t, dt);
  const f = nbRoot.userData.flag; f.rotation.y = Math.sin(t*2.2)*0.4; f.rotation.z = Math.sin(t*3.1)*0.1;
  ping.bubble.scale.setScalar(1.6*(1 + Math.sin(t*3.2)*0.06));   // Пинг маленький и далеко — облачко крупнее обычного
  // малыш спит — и Пинг спит
  const sleep = !!(petSeal && petSeal.sleeping) && !nbBusy;
  if(sleep !== nbSleep){ nbSleep = sleep; setMood(ping, sleep ? 'sleep' : 'ok'); nbBubble(); }
  if(!petMode || nbBusy || nbIdle || busy || !mgRoot.hidden) return;
  nbSeenT -= dt; if(nbSeenT < 0){ nbSeenT = 2; nbBubble(); }
  if(nbSleep) return;
  nbIdleT -= dt;
  if(nbIdleT < 0){   // сам по себе: машет, подпрыгивает, иногда катается на пузе
    nbIdleT = 5 + Math.random()*5;
    const r = Math.random(), s = ping; nbIdle = true;
    const go = r < 0.4 ? (async () => { s.flap = 1; await wait(0.9); s.flap = 0; })() : r < 0.75 ? hop(s, 0.3, 0.4) : r < 0.9 ? pingSlide(s) : pingDance(s);
    go.then(() => { nbIdle = false; });
  }
}
// переезд — когда Пинг уже вылечен в больнице и Сабрина спокойно стоит в уголке пару секунд
let nbWaitT = 0;
function nbMaybeMoveIn(dt){
  if(!save.pet || nbP().in || nbBusy || !pengMet() || !petMode || homeMode || busy || !mgRoot.hidden || growPending() || !petSeal || petSeal.sleeping){ nbWaitT = 0; return; }
  nbWaitT += dt;
  if(nbWaitT > 3.5){ nbWaitT = 0; nbMoveIn(); }
}
