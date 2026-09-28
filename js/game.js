/* ---------------- state ---------------- */
let S = null, busy = false, started = false;

/* ---------------- UI ---------------- */
let toastTimer = 0, toastEnd = 0;
function toast(msg, ms = 2600){
  const el = $('#toast'); el.textContent = msg; el.hidden = false;
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.hidden = true, ms);
  toastEnd = performance.now() + ms;
}
// зов «загляни туда-то» (книжка, письмо, иглу, желание малыша): по одному и с паузой после любого тоста,
// иначе в первые секунды у малыша зовут четыре вещи сразу. Не показали — false, позовём в следующий кадр
function nudge(msg, ms = 3400){
  if(performance.now() < toastEnd + 5000) return false;
  toast(msg, ms); return true;
}
function buildTools(){
  const nav = $('#tools'); nav.innerHTML = '';
  for(const k of ORDER){
    const b = document.createElement('button'); b.className = 'tool'; b.dataset.tool = k; b.id = 'tool-' + k;
    b.innerHTML = `<span class="face" aria-hidden="true">${TOOLS[k].icon}</span><span class="name">${TOOLS[k].name}</span>`;
    b.addEventListener('click', () => { sfx.tap(); useTool(k); });
    nav.appendChild(b);
  }
}
function renderCard(){
  if(!S) return;
  $('#pNo').textContent = shift ? shift.n + 1 : 1;
  $('#pName').textContent = S.p.name;
  $('#pText').textContent = S.p.text;
  const ul = $('#pNeeds'); ul.innerHTML = '';
  if(S.stage === 'arriving' || S.stage === 'diagnose'){   // осмотр: симптомы открываются по мере находок лупой
    for(const a of S.p.ail){
      const li = document.createElement('li'), found = S.found.has(a);
      li.className = found ? 'found' : 'lock';
      li.innerHTML = found ? `<span class="ic" aria-hidden="true">${SYMPTOMS[a].ic}</span><span class="lbl">${SYMPTOMS[a].name(S.p.f)}</span>`
        : '<span class="ic" aria-hidden="true">🔍</span><span class="lbl">???</span>';
      ul.appendChild(li);
    }
    return;
  }
  for(const n of S.needs){
    const li = document.createElement('li'); if(S.done.has(n)) li.className = 'done';
    li.innerHTML = `<span class="ic" aria-hidden="true">${TOOLS[n].icon}</span><span class="lbl">${TOOLS[n].task}</span>`;
    ul.appendChild(li);
  }
  const li = document.createElement('li');
  const hugNow = S.stage === 'hug', hugDone = S.stage === 'cured';
  if(hugNow){
    const b = document.createElement('button'); b.className = 'now'; b.id = 'hugBtn';
    b.innerHTML = `<span class="ic" aria-hidden="true">♡</span><span class="lbl">${L('Обнять!', 'Hug!')}</span>`;
    b.addEventListener('click', hug); li.style.cssText = 'border:0;padding:0;background:none'; li.appendChild(b);
  } else {
    li.className = hugDone ? 'done' : 'lock';
    li.innerHTML = `<span class="ic" aria-hidden="true">♡</span><span class="lbl">${L('Обнять', 'Hug')}</span>`;
  }
  ul.appendChild(li);
  document.querySelectorAll('.tool').forEach(b => b.classList.toggle('used', S.done.has(b.dataset.tool)));
}
function setBusy(v){ busy = v; $('#tools').setAttribute('aria-busy', v ? 'true' : 'false'); }
// до трёх рыбок лежат сверху в ведре
const bucketFish = [];
function renderBucket(){
  const n = Math.min(3, save.fish);
  while(bucketFish.length < n){
    const i = bucketFish.length, f = makeFish(); f.scale.setScalar(0.45);
    f.rotation.set(0, (i - 1)*0.45, 0.35 - i*0.35); f.position.set((i - 1)*0.08, 0.25 + i*0.06, 0.04);   // боком к камере: видно глаз и хвост
    bucket.add(f); bucketFish.push(f);
  }
}
function renderAlbumCount(){ $('#albumCount').textContent = save.album.length; }
// в альбоме до 40 фото; лишние убираем из самых старых пациентов, а фото своего малыша не трогаем
function albumAdd(e){
  save.album.push(e);
  while(save.album.length > 40){ const i = save.album.findIndex(a => !a.pet); if(i < 0) break; save.album.splice(i, 1); }
  persist();
}
function openAlbum(){
  const grid = $('#albumGrid'); grid.innerHTML = '';
  const mine = save.album.filter(a => a.pet), cured = save.album.filter(a => !a.pet);
  $('#albumSub').textContent = save.progress ? L(`Вылечено: ${save.progress}`, `Healed: ${save.progress}`) : '';
  const head = t => { const h = document.createElement('h3'); h.className = 'album-h display'; h.textContent = t; grid.appendChild(h); };
  const fig = (a, cls, capText, date) => {
    const f = document.createElement('figure'); if(cls) f.className = cls;
    const img = document.createElement('img'); img.src = a.img; img.alt = nameL(a.name);
    const cap = document.createElement('figcaption'); cap.textContent = capText;
    if(date){ const d = new Date(a.d), sm = document.createElement('small'); sm.textContent = `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`; cap.append(sm); }
    f.append(img, cap); grid.appendChild(f);
  };
  if(mine.length){   // «как рос мой малыш» — по порядку, от знакомства
    head(save.pet ? L(`${save.pet.name} растёт ♡`, `${save.pet.name} is growing up ♡`) : L('Мой малыш растёт ♡', 'My pup is growing up ♡'));
    mine.forEach(a => fig(a, 'pet', capL(a.cap) || nameL(a.name), true));
    head(L('Пациенты', 'Patients'));
  }
  if(!cured.length) grid.insertAdjacentHTML('beforeend', `<p class="empty">${L('Пока пусто. Вылечи первого пациента!', 'Nothing here yet. Heal your first patient!')}</p>`);
  for(const a of cured.slice().reverse()) fig(a, '', nameL(a.name), false);
  $('#album').hidden = false;
}

/* ---------------- game flow ---------------- */
function headTop(s){ return worldOf(s, new V3(0, 1.0, 0.2)); }
async function arrive(s){
  const r = s.root; r.position.set(-7.5, -0.55, 0.6); r.rotation.y = Math.PI/2; s.swimming = true; scene.add(r);
  await tween(1.8, k => { r.position.x = -7.5 + k*4.1; }, ease.out);
  sfx.splash(); burst(TEX.puff, new V3(-3.4, 0.1, 0.6), 10, 1.6, 0.45);
  s.swimming = false; s.inner.position.y = 0;
  await tween(0.75, k => { r.position.x = -3.4 + 3.4*k; r.position.y = -0.55 + 0.8*k + Math.sin(k*Math.PI)*1.3; }, ease.lin);
  r.position.set(0, 0.25, 0); sfx.thud(); await squash(s);
  await tween(0.45, k => { r.rotation.y = Math.PI/2*(1 - k); });
}
async function leave(s){
  const r = s.root; s.flap = 0.6;
  await tween(0.4, k => { r.rotation.y = k*Math.PI/2; });
  await tween(0.75, k => { r.position.x = 3.5*k; r.position.y = 0.25 - 0.8*k + Math.sin(k*Math.PI)*1.3; }, ease.lin);
  sfx.splash(); burst(TEX.puff, new V3(3.5, 0.1, 0), 10, 1.6, 0.45);
  s.swimming = true; s.flap = 0;
  await tween(1.4, k => { r.position.x = 3.5 + k*6; }, ease.io);
  scene.remove(r);
}
function squash(s, amt = 0.2, dur = 0.35){
  return tween(dur, k => { const q = Math.sin(k*Math.PI)*amt; s.inner.scale.set(1 + q*0.6, 1 - q, 1 + q*0.6); }, ease.lin);
}
async function hop(s, h = 0.3, dur = 0.4){
  await tween(dur, k => { s.inner.position.y = Math.sin(k*Math.PI)*h; }, ease.lin);
  s.inner.position.y = 0;
}
async function spawnPatient(){
  if(cloudDue()) return spawnCloud();   // простывшая Туча после третьего этапа дороги (js/cloudcure.js)
  if(sharkDue()) return spawnShark();   // акула с больным зубом из «Салок» (js/sharktooth.js)
  if(typeof blotDue === 'function' && blotDue()) return spawnBlot();   // Клякса с царапинкой (js/guests.js)
  if(typeof bearDue === 'function' && bearDue()) return spawnBear();   // медведь: лапа после занозы (js/guests.js)
  if(pengDue()) return spawnImpostor();   // иногда вместо тюленя — пингвин в костюме (shift.js)
  const p = patientFor(save.progress);
  const seal = makeSeal(p);
  S = {p, seal, needs:needsFor(p.ail), done:new Set(), found:new Set(), ail:Object.fromEntries(p.ail.map(a => [a, true])), stage:'arriving'};
  applyAilments(seal, S.ail); setMood(seal, 'sad');
  seal.bubble.position.x = 0.6; seal.bubble.userData.y = 2.2;   // облачко-мысль ближе к голове: справа сверху его закрывали кнопки
  seal.hat.visible = seal.hat.userData.on = p.ail.includes('sneeze');
  $('#card').hidden = false; $('#wardrobe').hidden = true; $('#tools').hidden = false; renderCard();
  setBusy(true); await arrive(seal); setBusy(false);
  S.stage = 'diagnose'; renderCard();
  setBusy(true);
  await mgLupa(seal, p.ail, a => { S.found.add(a); renderCard(); }, at => { shift.secrets++; addShells(3, at); });
  unfocusCam(); setBusy(false);
  S.stage = 'treat'; renderCard();
  toast(L('Всё нашла! Теперь лечи — выбирай внизу', 'Found it all! Now treat — pick below'));
}

const TREAT = {
  thermo: s => mgThermo(s),
  async medicine(s){
    await mgMedicine(s);
    floatText(L('Ам!', 'Yum!'), headTop(s)); burst(TEX.star, headTop(s), 8, 1.8, 0.3); sfx.pop();
    S.ail.fever = false; S.ail.sneeze = false; applyAilments(s, S.ail);
  },
  async bandage(s){
    await mgBandage(s);
    S.ail.scratch = false; applyAilments(s, S.ail); floatText(L('Не больно!', 'No more ouch!'), headTop(s));
  },
  async fish(s){
    await mgFishing(s);
    for(let i = 0; i < 2; i++){ sfx.chomp(); await tween(0.2, k => { s.head.scale.set(1, 1 - Math.sin(k*Math.PI)*0.1, 1); }, ease.lin); }
    s.head.scale.set(1, 1, 1);
    S.ail.hungry = false; applyAilments(s, S.ail); floatText(L('Ням!', 'Nom!'), headTop(s));
  },
  async scarf(s){
    await mgScarf(s);
    S.ail.cold = false; applyAilments(s, S.ail); floatText(L('Тепло!', 'Warm!'), headTop(s));
  }
};
async function wrong(s, msg){
  if(shift) shift.mistakes++;
  sfx.bad(); toast(msg); setBusy(true);
  floatText('?', headTop(s));
  await tween(0.7, k => { s.shake = Math.sin(k*Math.PI*4)*0.4*(1 - k); }, ease.lin); s.shake = 0;
  setBusy(false);
}
async function useTool(k){
  if(!S || S.stage !== 'treat' || busy) {
    if(S && S.stage === 'hug') toast(L('Лечение закончено. Теперь обними пациента: погладь тюленя пальчиком ♡', 'Treatment is done. Now hug your patient: stroke the seal ♡'));
    return;
  }
  const s = S.seal;
  if(S.done.has(k)) return toast(L('Это уже сделано!', 'That is already done!'));
  if(!S.needs.includes(k)){
    return wrong(s, k === 'thermo' ? L('Температуры нет, лоб холодный. Посмотри карту пациента!', 'No fever, the forehead is cool. Check the patient card!') : L('Этому пациенту это не нужно. Посмотри карту!', 'This patient does not need that. Check the card!'));
  }
  if(k === 'medicine' && S.needs.includes('thermo') && !S.done.has('thermo')) return wrong(s, L('Сначала измерь температуру 🌡️', 'Take the temperature first 🌡️'));
  setBusy(true);
  await TREAT[k](s);
  unfocusCam();
  S.done.add(k); sfx.good(); hop(s);
  if(S.done.size === S.needs.length){
    S.stage = 'hug'; setMood(s, 'ok');
    await wait(0.5); sfx.arf();
    const well = L(`${S.p.name} ${S.p.f ? 'здорова' : 'здоров'}!`, `${S.p.name} is well!`);
    if(showWardrobe(s)){ $('#tools').hidden = true; toast(L(`${well} Можно нарядить 🎀 и обнять — погладь тюленя ♡`, `${well} You can dress up 🎀 and hug — stroke the seal ♡`), 4200); }
    else toast(L(`${well} Осталось обнять — погладь тюленя пальчиком ♡`, `${well} Now a hug — stroke the seal with your finger ♡`), 3600);
  }
  renderCard(); setBusy(false);
}
async function hug(e0){
  if(!S || S.stage !== 'hug' || busy) return;
  const s = S.seal; setBusy(true);
  $('#wardrobe').hidden = true; $('#tools').hidden = true; $('#toast').hidden = true;
  await strokeHug(s, e0 && e0.type === 'pointerdown' ? e0 : null);   // подержать пальчик и погладить (minigames.js)
  S.stage = 'cured'; renderCard();
  setMood(s, 'happy'); sfx.hug(); s.flap = 1;
  burst(TEX.heart, headTop(s), 18, 2.4, 0.38);
  await tween(0.9, k => { s.inner.position.y = Math.sin(k*Math.PI)*1.1; s.inner.rotation.y = k*Math.PI*2; }, ease.io);
  s.inner.position.y = 0; s.inner.rotation.y = 0;
  sfx.arf(); await squash(s, 0.25);
  burst(TEX.heart, headTop(s), 10, 2, 0.32);
  await wait(0.45);
  const img = snapshot();
  save.progress++;
  if(save.pet) save.pet.xp += PATIENT_XP;   // малыш гордится доктором: опыт растёт и в больнице
  albumAdd({name:s.p.name, img, d:Date.now(), scarf:S.scarf, wear:wearIds(s)});
  renderAlbumCount();
  shift.photos.push(img); shift.n++;
  const earned = 3 + S.needs.length;   // 5–8 ракушек: чем больше лечили, тем больше
  addShells(earned, toScreen(headTop(s)));
  s.flap = 0.35;
  await wait(1.1);
  await (s.p.peng ? pengBye(s) : tuckIn(s));   // пингвин в кроватку не хочет — у него свой танец
  $('#curedShells').textContent = `+${earned} 🐚` + (save.pet ? `  +${PATIENT_XP} 💗` : '');
  $('#btnNext').textContent = shift.n >= SHIFT_SIZE ? L('Итоги смены ⭐', 'Shift results ⭐') : L('Следующий пациент', 'Next patient');
  $('#curedImg').src = img;
  $('#curedTitle').textContent = L(`${s.p.name} ${s.p.f ? 'здорова' : 'здоров'}!`, `${s.p.name} is well!`);
  const thx = thanksFor(s.p, Object.keys(wearIds(s)).length > 0);
  $('#curedThanks').textContent = L(`${s.p.name}: «${thx}»`, `${s.p.name}: “${thx}”`);
  $('#curedLetter').hidden = !isSabrinaPlayer();   // записка от папы — только у Сабрины
  $('#cured').hidden = false; setBusy(false);
}
async function nextPatient(){
  $('#cured').hidden = true;
  if(!S || busy) return;
  setBusy(true); const old = S.seal;
  $('#card').hidden = true; unfocusCam();
  await wakeUp(old);
  await leave(old);
  if(shift.n === SHIFT_SIZE - 1 && !shift.event){ shift.event = true; await runEvent(); }
  if(shift.n >= SHIFT_SIZE){ setBusy(false); return showResults(); }
  await spawnPatient();
}
// круглое фото тюленя s для альбома; pad — сколько места вокруг (в размерах тюленя)
function snapshot(s = S.seal, pad = 1.75){
  renderer.render(scene, camera);
  const src = renderer.domElement, W = src.width, H = src.height;
  const c = s.root.position, k = s.root.scale.x, y = c.y + 1.0*k;
  const p1 = new V3(c.x, y, c.z).project(camera), p2 = new V3(c.x + pad*k, y, c.z).project(camera);
  const cx = (p1.x + 1)/2*W, cy = (1 - p1.y)/2*H, r = Math.abs(p2.x - p1.x)/2*W;
  const out = document.createElement('canvas'); out.width = out.height = 200;
  const g = out.getContext('2d'), grd = g.createLinearGradient(0, 0, 0, 200);
  grd.addColorStop(0, '#C6E8F5'); grd.addColorStop(1, '#F2FAFD'); g.fillStyle = grd; g.fillRect(0, 0, 200, 200);
  try{ g.drawImage(src, cx - r, cy - r*1.05, 2*r, 2*r, 0, 0, 200, 200); return out.toDataURL('image/jpeg', 0.82); }
  catch(e){ return out.toDataURL('image/jpeg', 0.8); }
}

/* ---------------- input ---------------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
canvas.addEventListener('pointerdown', e => {
  if(petMode) return homeMode ? homeTap(e) : petTap(e);
  if(!S || busy) return;
  const rect = canvas.getBoundingClientRect();
  ndc.set((e.clientX - rect.left)/rect.width*2 - 1, -((e.clientY - rect.top)/rect.height)*2 + 1);
  ray.setFromCamera(ndc, camera);
  if(!ray.intersectObjects(S.seal.hits, false).length) return;
  if(S.stage === 'hug') return hug(e);
  if(S.stage === 'treat'){
    const s = S.seal, peng = S.p.peng; peng ? sfx.quack() : sfx.arf();
    floatText((peng ? L(['Кря!','Кря-кря','Хи-хи','Кря?'], ['Quack!','Quack quack','Hehe','Quack?']) : L(['Ар!','Ур-р','Хи-хи','Ар-ар!'], ['Arf!','Urr','Hehe','Arf arf!']))[Math.floor(Math.random()*4)], headTop(s));
    squash(s, 0.15, 0.3);
  }
});
$('#btnSound').addEventListener('click', () => { save.muted = !save.muted; persist(); renderMute(); if(!save.muted) sfx.tap(); });
// музыка — отдельно от звуков (⚙️); включили музыку при выключенном звуке — включаем и звук, иначе её не услышать
for(const b of document.querySelectorAll('#musicSeg button')) b.addEventListener('click', () => {
  save.music = b.dataset.m === '1';
  if(save.music && save.muted){ save.muted = false; renderMute(); }
  persist(); renderMusic(); sfx.tap();
});
// 🔓 «Все игры открыты» (⚙️, для игры с папой): замки глав и уровней не мешают выбрать любую игру; сюжет не сбивается —
// шторм до главы 8 идёт как тренировка (js/storm.js), главы открываются как обычно
function renderFree(){ document.querySelectorAll('#freeSeg button').forEach(b => b.classList.toggle('on', (b.dataset.f === '1') === save.free)); }
for(const b of document.querySelectorAll('#freeSeg button')) b.addEventListener('click', () => {
  const on = b.dataset.f === '1'; if(on === save.free) return;
  save.free = on; persist(); renderFree(); sfx.tap();
  toast(on ? L('🔓 Все игры и уровни открыты!', '🔓 All games and levels are open!') : L('📖 Игры снова открываются по главам', '📖 Games unlock by chapter again'), 2600);
});
renderFree();
/* ---------------- код сохранения (настройки) ---------------- */
const codeBox = $('#codeBox'), codeMsg = $('#codeMsg');
let codeNew = null;   // прочитанный код, который ждёт «Да, загрузить»
function codeSay(t, bad = false){ codeMsg.textContent = t; codeMsg.classList.toggle('bad', bad); }
function openSettings(){
  sfx.tap(); codeBox.value = ''; codeNew = null; $('#codeAsk').hidden = true; codeSay('');
  $('#storeNote').textContent = '';
  keepSave().then(ok => { $('#storeNote').textContent = ok === null ? '' : ok ? L('🔒 Браузер обещал не стирать сохранение.', '🔒 The browser promised to keep your save.') : L('Браузер может стереть сохранение, если кончится место: лучше скопируй код и спрячь его.', 'The browser may erase your save if it runs out of space: better copy the code and keep it safe.'); });
  $('#dadStats').open = false;
  renderWhoRow();
  $('#settings').hidden = false;
}
async function copyCode(){
  sfx.tap(); $('#codeAsk').hidden = true; codeNew = null;
  const code = makeCode(); codeBox.value = code; codeBox.focus(); codeBox.select(); codeBox.scrollTop = 0;
  let ok = false;
  try{ await navigator.clipboard.writeText(code); ok = true; }
  catch(e){ try{ ok = document.execCommand('copy'); }catch(e2){} }
  codeSay(ok ? L('Код скопирован ✓ Отправь его себе или сохрани в заметки.', 'Code copied ✓ Send it to yourself or save it in your notes.') : L('Нажми на поле и скопируй код вручную (выдели всё и «Копировать»).', 'Tap the box and copy the code by hand (select all, then “Copy”).'), !ok);
  if(ok) sfx.good();
}
async function pasteCode(){
  sfx.tap(); $('#codeAsk').hidden = true; codeNew = null;
  if(!codeBox.value.trim()){
    try{ codeBox.value = await navigator.clipboard.readText(); }catch(e){}
    if(!codeBox.value.trim()){ codeBox.focus(); return codeSay(L('Вставь код в поле (долгое нажатие → «Вставить») и нажми «Вставить» ещё раз.', 'Paste the code into the box (long press → “Paste”) and tap “Paste” again.')); }
  }
  const d = readCode(codeBox.value);
  if(!d){ sfx.bad(); return codeSay(L('Не получилось прочитать код. Скопируй его целиком ещё раз.', 'Could not read the code. Copy the whole thing again.'), true); }
  codeNew = d; codeSay('');
  const has = d.pet ? L(`малыш ${d.pet.name}`, `pup ${d.pet.name}`) : L('малыша пока нет', 'no pup yet'), lose = save.pet && !d.pet ? L(` Внимание: сейчас здесь живёт ${save.pet.name}, а в коде его нет!`, ` Careful: ${save.pet.name} lives here now, but is not in the code!`) : '';
  $('#codeAskText').textContent = L(`В коде: ${has}, вылечено ${d.progress}, ракушек ${d.shells} 🐚. Заменить то, что сейчас на этом устройстве?${lose}`, `In the code: ${has}, healed ${d.progress}, shells ${d.shells} 🐚. Replace what is on this device now?${lose}`);
  $('#codeAsk').hidden = false;
}
function applyCode(){
  if(!codeNew) return;
  const album = save.album;   // фото альбома остаются свои
  Object.keys(save).forEach(k => delete save[k]);
  Object.assign(save, codeNew, {album});
  persist(); location.reload();   // сцена собирается из сохранения при запуске: проще всего начать заново
}
$('#btnSettings').addEventListener('click', openSettings);
$('#btnIntroSet').addEventListener('click', openSettings);
$('#btnIntroCoop').addEventListener('click', () => { if(typeof coopFromIntro === 'function') coopFromIntro(); });   // бой вдвоём с первого экрана (js/coop.js)
$('#btnSetClose').addEventListener('click', () => { sfx.tap(); $('#settings').hidden = true; });
$('#btnCodeCopy').addEventListener('click', copyCode);
$('#btnCodePaste').addEventListener('click', pasteCode);
$('#btnCodeYes').addEventListener('click', () => { sfx.good(); applyCode(); });
$('#btnCodeNo').addEventListener('click', () => { sfx.tap(); $('#codeAsk').hidden = true; codeNew = null; });
codeBox.addEventListener('input', () => { $('#codeAsk').hidden = true; codeNew = null; });
/* ---------------- тихий счётчик (для папы в ⚙️ и для будущей грамоты) ----------------
   Раз в кадр смотрим, где сейчас игрок (statPlace), и копим секунды по местам в save.st.g. Время идёт, только
   пока вкладка видна и экран трогали последние STAT_IDLE секунд: телефон, забытый на столе, не считается. */
const STAT_IDLE = 60;
const STAT_NAMES = {hosp:['🏥 Больница', '🏥 Hospital'], pet:['🦭 Малыш', '🦭 Pup'], home:['🏠 Иглу', '🏠 Igloo'], map:['🗺️ Карта забегов', '🗺️ Run map'],
  run:['🏃 Забег', '🏃 Run'], road:['☁️ Дорога к Туче', '☁️ Road to the Cloud'], cloud:['⛈️ Бой с Тучей', '⛈️ Cloud battle'], gull:['🕊️ Чайка', '🕊️ Gull'],
  bay:['🌊 Потеряшка: Бухта', '🌊 Lost pup: Bay'], grot:['🕯️ Потеряшка: Грот', '🕯️ Lost pup: Grotto'], snow:['❄️ Потеряшка: Метель', '❄️ Lost pup: Blizzard'],
  dive:['🤿 Бухта под водой', '🤿 Underwater bay'], chase:['🦈 Салки с акулой', '🦈 Shark tag'], slide:['🛷 Ледяная горка', '🛷 Ice slide'], gloom:['🌑 Мгла', '🌑 Gloom'],
  ice:['🧊 Ледяной код', '🧊 Ice code'], visit:['🏝️ Остров в гостях', '🏝️ Island visit'], shop:['🛍️ Лавка', '🛍️ Shop'], mail:['✉️ Почта', '✉️ Mail'], book:['📖 Книга острова', '📖 Island book'], storm:['🌪️ Великий шторм', '🌪️ The Great Storm'], party:['🎉 Праздник острова', '🎉 Island party'], games:['🎲 Игротека', '🎲 Game shelf']};
let statLastIn = -1e9, statAcc = 0, statWas = null;
['pointerdown', 'keydown'].forEach(e => addEventListener(e, () => statLastIn = performance.now(), {capture:true, passive:true}));
const statDay = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
function statPlace(){
  if(!$('#intro').hidden) return null;
  if(!$('#story').hidden) return 'book';
  const b = document.body.classList;
  if(b.contains('gloom-on')) return 'gloom';
  if(b.contains('fin-on')) return 'party';
  if(b.contains('storm-on')) return 'storm';
  if(b.contains('visit-on')) return 'visit';
  if(b.contains('ice-on')) return 'ice';
  if(b.contains('bg-on')) return 'games';
  if(b.contains('chase-on')) return 'chase';
  if(b.contains('slide-on')) return 'slide';
  if(b.contains('dive-on')) return 'dive';
  if(b.contains('run-on')) return CR ? 'road' : CO ? 'cloud' : GL ? 'gull' : Q ? (Q.L && Q.L.id) || 'bay' : 'run';
  if(b.contains('map-on')) return 'map';
  if(shopOpen) return 'shop';
  if(mailOpen) return 'mail';
  if(petMode) return homeMode ? 'home' : 'pet';
  return 'hosp';
}
function statTick(dt){
  if(document.hidden || performance.now() - statLastIn > STAT_IDLE*1000) return;
  const where = statPlace();
  if(!where) return;
  const st = save.st, day = statDay();
  if(st.last !== day){ st.days++; st.last = day; if(!st.first) st.first = day; }
  const g = st.g[where] || (st.g[where] = [0, 0, '']);
  if(where !== statWas){   // зашли в новое место: +1 заход; вместе — если есть связь с другим устройством
    g[1]++; statWas = where;
    if(where !== 'hosp' && where !== 'pet' && where !== 'home' && where !== 'map' && (where === 'visit' || net.conn && net.conn.open)) st.tog++;
  }
  g[2] = day;
  statAcc += Math.min(dt, 1);
  if(statAcc >= 1){ const s = Math.floor(statAcc); statAcc -= s; st.t += s; g[0] += s; }
}
// «📊 Для папы» в настройках: всё время, дни, игры вместе и таблица мест по времени
function statMin(s){ const m = Math.round(s/60); if(!m) return L('<1 мин', '<1 min'); return m < 60 ? L(`${m} мин`, `${m} min`) : L(`${Math.floor(m/60)} ч ${m % 60} мин`, `${Math.floor(m/60)} h ${m % 60} min`); }
function renderStats(){
  const st = save.st, el = $('#statBody');
  if(!st.t){ el.textContent = L('Пока ничего не набралось: счётчик начал считать с этой версии.', 'Nothing yet: the counter started with this version.'); return; }
  const rows = Object.entries(st.g).filter(([, g]) => g[0] >= 30 || g[1]).sort((a, b) => b[1][0] - a[1][0]);
  const esc = t => String(t).replace(/[&<>]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;'})[c]);
  el.innerHTML = `<p>${esc(L(`Всего: ${statMin(st.t)} · дней: ${st.days} (с ${st.first}) · игр вместе: ${st.tog}`, `Total: ${statMin(st.t)} · days: ${st.days} (since ${st.first}) · games together: ${st.tog}`))}</p>`
    + `<table><tr><th>${esc(L('Где', 'Where'))}</th><th>${esc(L('Время', 'Time'))}</th><th>${esc(L('Раз', 'Times'))}</th><th>${esc(L('Последний', 'Last'))}</th></tr>`
    + rows.map(([k, g]) => `<tr><td>${esc(STAT_NAMES[k] ? L(...STAT_NAMES[k]) : k)}</td><td>${esc(statMin(g[0]))}</td><td>${g[1]}</td><td>${esc(g[2].slice(5))}</td></tr>`).join('') + '</table>';
}
$('#dadStats').addEventListener('toggle', () => { if($('#dadStats').open) renderStats(); });

// когда вкладку закрывают или прячут, дописываем сохранение (там же «когда навещали малыша»)
addEventListener('pagehide', persist);
document.addEventListener('visibilitychange', () => { if(document.hidden) persist(); });
$('#btnAlbum').addEventListener('click', () => { sfx.tap(); openAlbum(); });
/* ---------------- 🎒 рюкзак: звук, альбом и настройки ----------------
   В углу остаются главные кнопки (ракушки, почта, книга, малыш), остальное — в рюкзаке: полоска слева от 🎒.
   Альбом и настройки закрывают рюкзак, звук — нет (видно, что переключилось); касание мимо — тоже закрывает. */
const cornerEl = $('#corner'), bagBtn = $('#btnBag'), bagEl = $('#bag');
function bagToggle(on = !cornerEl.classList.contains('bag-open')){
  cornerEl.classList.toggle('bag-open', on); bagBtn.setAttribute('aria-expanded', on ? 'true' : 'false');
  if(on) bagEl.style.top = (bagBtn.offsetTop + bagBtn.offsetHeight/2 - bagEl.offsetHeight/2) + 'px';
}
bagBtn.addEventListener('click', () => { sfx.tap(); bagToggle(); });
for(const id of ['#btnAlbum', '#btnSettings']) $(id).addEventListener('click', () => bagToggle(false));
addEventListener('pointerdown', e => { if(cornerEl.classList.contains('bag-open') && !cornerEl.contains(e.target)) bagToggle(false); }, {capture:true});
let albumFromCured = false;
$('#btnCuredAlbum').addEventListener('click', () => { sfx.tap(); $('#cured').hidden = true; albumFromCured = true; openAlbum(); });
$('#btnAlbumClose').addEventListener('click', () => {
  sfx.tap(); $('#album').hidden = true;
  if(albumFromCured) $('#cured').hidden = false;
  albumFromCured = false;
});
$('#btnNext').addEventListener('click', () => { sfx.tap(); nextPatient(); });
$('#btnStart').addEventListener('click', async () => {
  ac(); sfx.good(); keepSave(); $('#intro').hidden = true;
  if(started) return; started = true;
  try{ await document.fonts.load('40px Pangolin'); }catch(e){}
  if(adoptPending()) adopt(); else startShift();   // сыгравших смену у льдины ждёт малыш (Фаза 3)
  if(mailWaiting && save.progress && !adoptPending()) setTimeout(() => { if(mailWaiting && !mailOpen) toast(L('💌 Тебе письмо от папы! Нажми на почтовый ящик', '💌 You have a letter from Dad! Tap the mailbox'), 3400); }, 1200);
});
$('#btnIntroPet').addEventListener('click', async () => {
  ac(); sfx.good(); keepSave(); $('#intro').hidden = true;
  if(started) return; started = true;
  try{ await document.fonts.load('40px Pangolin'); }catch(e){}
  goPet(true);
});

/* ---------------- camera & loop ---------------- */
const camBase = new V3(), camTarget = new V3();
// Приближение для мини-игр: камера плавно наезжает на center так, чтобы влез предмет размером size.
// lift > 0 поднимает предмет выше середины экрана (когда внизу панель мини-игры).
const camFocus = {k:0, want:0, center:new V3(), size:3, lift:0, up:0.35, yaw:0};   // yaw — поворот вокруг центра (в домике можно повращать)
// Сдвиг всей камеры: 0 — больница, PET_POS — уголок малыша (js/pet.js)
const camOff = new V3(), camOffWant = new V3();
// up — насколько камера смотрит сверху (0.35 — чуть сверху; на прогулке выше, чтобы малыш не заслонял льдинки)
function focusCam(center, size = 3, lift = 0, up = 0.35){ camFocus.center.copy(center); camFocus.size = size; camFocus.lift = lift; camFocus.up = up; camFocus.want = 1; }
function unfocusCam(){ camFocus.want = 0; }
const _camPos = new V3(), _camLook = new V3(), _focusLook = new V3();
function resize(){
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false); camera.aspect = w/h; camera.updateProjectionMatrix();
  const portrait = w < h, tv = Math.tan(THREE.MathUtils.degToRad(camera.fov)/2), th = tv*camera.aspect;
  const d = Math.max((portrait ? 4.3 : 7.5)/2/th, (portrait ? 7 : 5.6)/2/tv);
  camBase.set(0, 1.2 + d*0.3, d); camTarget.set(0, portrait ? 1.7 : 1.3, 0);
}
window.addEventListener('resize', resize); resize();

let last = performance.now(), t = 0;
const TEST = /test/.test(location.search);
const DT_CAP = TEST ? 5 : 0.05;
function loop(ts){ frame(ts); requestAnimationFrame(loop); }
function frame(ts){
  const dt = Math.min(DT_CAP, Math.max(0, ts - last)/1000); last = ts; t += dt; now = t;
  updateTweens();
  updateWater(t);
  mgTicks.forEach(f => f(dt));
  const sway = reduced ? 0 : 1;
  camOff.lerp(camOffWant, Math.min(1, dt*2)); snow.position.x = camOff.x;
  _camPos.set(camBase.x + Math.sin(t*0.25)*0.3*sway, camBase.y + Math.sin(t*0.4)*0.06*sway, camBase.z).add(camOff);
  _camLook.copy(camTarget).add(camOff);
  camFocus.k += (camFocus.want - camFocus.k)*Math.min(1, dt*3.5);
  if(camFocus.k > 0.001){
    const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov)/2), fd = Math.max(camFocus.size/2/(tv*camera.aspect), camFocus.size/2/tv);
    _focusLook.copy(camFocus.center); _focusLook.y -= camFocus.lift;
    const k = ease.io(camFocus.k);
    _camLook.lerp(_focusLook, k);
    _camPos.lerp(_focusLook.clone().add(new V3(Math.sin(camFocus.yaw)*fd, fd*camFocus.up, Math.cos(camFocus.yaw)*fd)), k);
  }
  if(runCam.on){ _camPos.copy(runCam.pos); _camLook.copy(runCam.look); }   // забег: камера летит за малышом (js/adventure.js)
  camera.position.copy(_camPos);
  camera.lookAt(_camLook);
  snow.position.set(_camLook.x, 0, _camLook.z);   // снег всегда вокруг того, куда смотрим (уголок, прогулка)
  for(let i = 0; i < SN; i++){
    snowPos[i*3+1] -= dt*(0.35 + (i % 5)*0.08); snowPos[i*3] += Math.sin(t + i)*dt*0.12;
    if(snowPos[i*3+1] < -0.2) snowPos[i*3+1] = 12;
  }
  snowGeo.attributes.position.needsUpdate = true;
  chunks.forEach((c, i) => { c.position.y = 0.05 + Math.sin(t*1.2 + i)*0.05; c.rotation.y += dt*0.05; });

  if(S){
    const s = S.seal; updateSeal(s, t, dt);
    sneezeTick(s, dt, S.stage === 'treat' && S.ail.sneeze && !busy && !shopOpen && !mailOpen && !petMode);
    if((S.stage === 'treat' && !busy || S.stage === 'diagnose') && !petMode){   // урчит и под лупой: видно, где искать «голодный»
      if(S.ail.hungry){
        s.rumbleT -= dt;
        if(s.rumbleT < 0){ s.rumbleT = 5 + Math.random()*2; floatText(L('урр...', 'grrr...'), s.rumble.getWorldPosition(new V3()).add(new V3(0, 0.3, 0)), '#6B6A7E');
          tween(0.6, k => s.wobble = Math.sin(k*Math.PI*5)*0.04*(1 - k), ease.lin); }
      }
    }
  }
  shiftTick(t, dt);
  petTick(t, dt); walkTick(t); homeTick(t, dt); mailTick(t, dt); advTick(t, dt); if(typeof gsTick === 'function') gsTick(t, dt);
  if(typeof holTick === 'function') holTick(t, dt);
  if(typeof nbTick === 'function') nbTick(t, dt);   // сосед Пинг (js/neighbors.js)   // старый index.html из кеша может ещё не знать про holidays.js
  if(typeof gullIsleTick === 'function') gullIsleTick(t, dt);   // чайка напарника порхает над уголком (js/gull.js)
  if(typeof visitTick === 'function') visitTick(t, dt);   // «Остров в гостях» (js/visit.js)
  if(typeof stTick === 'function') stTick(t);   // флажок над больницей (js/story.js)
  statTick(dt);
  updateParts(dt);
  renderer.render(scene, camera);
}

/* ---------------- «Кто играет?» (Фаза 11, часть 1): имя игрока на первом экране (save.who, pname/pg/isSabrinaPlayer — js/data.js) ---------------- */
let whoDraftG = 'f', whoFromSettings = false;
function whoRenderGender(){ for(const b of document.querySelectorAll('#whoGenderRow button')) b.classList.toggle('on', b.dataset.g === whoDraftG); }
function whoReset(){
  $('#whoPickRow').hidden = false; $('#whoNameRow').hidden = true; $('#whoGenderRow').hidden = true; $('#whoGoRow').hidden = true;
  $('#whoName').value = ''; whoDraftG = 'f'; whoRenderGender();
}
function whoFinish(name, g){
  save.who = {name, g, asked:true}; persist();
  applyPname(); renderWhoRow(); if(typeof mailApplyWho === 'function') mailApplyWho();
  $('#who').hidden = true;
  if(!whoFromSettings) $('#intro').hidden = false;
}
function applyPname(){
  $('#introText').textContent = L(`Доктор ${pname()}, к тебе приплывают пациенты! За смену — три тюленя: осмотри, вылечи, обними и уложи спать. За каждого — ракушки 🐚 для лавки.`,
    `Doctor ${pname()}, patients are swimming in! Three seals per shift: check them, heal them, hug them and tuck them in. Every patient earns you shells 🐚 for the shop.`);
}
function renderWhoRow(){ $('#whoRow').hidden = isSabrinaPlayer(); $('#whoRowName').textContent = pname(); }
$('#btnWhoMe').addEventListener('click', () => { sfx.tap(); whoFinish(L('Сабрина', 'Sabrina'), 'f'); });
$('#btnWhoOther').addEventListener('click', () => {
  sfx.tap(); $('#whoPickRow').hidden = true; $('#whoNameRow').hidden = false; $('#whoGenderRow').hidden = false; $('#whoGoRow').hidden = false; $('#whoName').focus();
});
for(const b of document.querySelectorAll('#whoGenderRow button')) b.addEventListener('click', () => { sfx.tap(); whoDraftG = b.dataset.g; whoRenderGender(); });
$('#btnWhoGo').addEventListener('click', () => {
  const name = $('#whoName').value.trim().slice(0, 12);
  if(!name) return $('#whoName').focus();
  sfx.tap(); whoFinish(name, whoDraftG);
});
$('#btnWhoChange').addEventListener('click', () => { sfx.tap(); $('#settings').hidden = true; whoFromSettings = true; whoReset(); $('#who').hidden = false; });
applyPname(); renderWhoRow();
if(!save.who.asked){ $('#intro').hidden = true; $('#who').hidden = false; }

/* ---------------- «Поставить на экран» (PWA): кнопка в ⚙️, ловим beforeinstallprompt; на iPhone/iPad подсказка картинкой ---------------- */
let deferredInstall = null;
function showInstallBlock(){ $('#installBlock').hidden = $('#btnInstall').hidden && $('#iosHint').hidden; }
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; $('#btnInstall').hidden = false; showInstallBlock(); });
addEventListener('appinstalled', () => { deferredInstall = null; $('#btnInstall').hidden = true; $('#iosHint').hidden = true; showInstallBlock(); });
$('#btnInstall').addEventListener('click', async () => {
  if(!deferredInstall) return;
  sfx.tap(); deferredInstall.prompt();
  try{ await deferredInstall.userChoice; }catch(e){}
  deferredInstall = null; $('#btnInstall').hidden = true; showInstallBlock();
});
{
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  if(iOS && !standalone && window.top === window){ $('#iosHint').hidden = false; showInstallBlock(); }
}

buildTools(); renderMute(); renderMusic(); renderAlbumCount(); renderBucket();
if(save.progress){ const st = $('#introStat'); st.textContent = L(`Ты уже вылечила пациентов: ${save.progress} · ракушек: ${save.shells} 🐚`, `Patients healed: ${save.progress} · shells: ${save.shells} 🐚`); st.hidden = false; $('#btnStart').textContent = L('Начать смену', 'Start a shift'); }
if(save.pet){ $('#introStat').textContent += ` · ${save.pet.name} ${petMissed() ? L(gg('соскучился', 'соскучилась'), 'misses you') : L('ждёт тебя', 'is waiting for you')} 🦭`; $('#btnIntroPet').hidden = false; }
else if(adoptPending()){ $('#introStat').textContent += L(' · Кто-то ждёт тебя у льдины…', ' · Someone is waiting for you by the ice…'); $('#btnStart').textContent = L('Открыть больницу', 'Open the hospital'); }
renderPetBtn();

/* ---------------- кнопка «Назад» (телефон): первый раз — спросить, второй — выйти ----------------
   В истории браузера лежит «сторожевая» запись. «Назад» снимает её (popstate) — показываем подсказку и сохраняемся;
   если за BACK_WAIT секунд нажали ещё раз, браузер просто уходит со страницы (или закрывает приложение),
   а если нет — ставим сторожа обратно. Запись ставится после первого касания: без него браузер её пропускает.
   Во фрейме (Artifact) не трогаем — там «Назад» принадлежит странице вокруг. */
const BACK_WAIT = 2.5;
if(window.top === window && history.pushState){
  let backT = 0;
  const guard = () => { try{ if(!(history.state && history.state.shGuard)) history.pushState({shGuard:1}, ''); }catch(e){} };
  addEventListener('pointerdown', guard, {once:true});
  addEventListener('popstate', () => {
    if(history.state && history.state.shGuard) return;   // вернулись вперёд на сторожа
    persist();
    toast(L('Нажми «Назад» ещё раз — и выйдешь из игры 👋', 'Press “Back” once more to leave the game 👋'), BACK_WAIT*1000);
    clearTimeout(backT); backT = setTimeout(guard, BACK_WAIT*1000);
  });
}
requestAnimationFrame(loop);
// ?test=1: скрытая вкладка почти не даёт кадров, поэтому подталкиваем кадры таймером
if(TEST) setInterval(() => { if(performance.now() - last > 120) frame(performance.now()); }, 60);
