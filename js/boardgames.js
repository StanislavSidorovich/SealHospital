/* ---------------- 🎲 «Игротека» (Спринт 6): короткие игры вдвоём по ходам ----------------
   Коробки с играми — коллекция: первая («Мемори») сама появляется на полке в иглу, когда откроется глава 2,
   остальные выносит волной на прогулке (bgWalkBox), приносит папа в письме (LETTERS: gift:{game:'id'})
   или дарит напарник по сети (сыграли в его коробку — она теперь и у тебя). Коробки стоят стопкой в иглу
   (место games в home.js), касание — полка «Игротека»: выбираешь коробку, потом с кем играть:
   🐧 с Пингом (бот поддаётся, когда впереди), 👫 вдвоём на одном телефоне, 🌐 по сети, ⏱️ одна (если игра умеет).
   Та же полка — вкладка «🎲 Игротека» в «Играем вместе».

   Как добавить игру: bgReg({...}) в конце этого файла (или в своём файле после него). Игра — чистые правила + вид:
     id, ic, col (цвет коробки), name(), say() — как играть (одна строчка),
     modes    — какие режимы умеет: ['ping', 'duo', 'net', 'solo'],
     opts     — (не обязательно) {ключ:{name(), list:[[значение, подпись()], …], def}} — выбор перед игрой (размер поля…),
     setup(o) — начальное состояние (обычный JSON: по сети его целиком отправляет хозяин); o = {mode, seed, …выбранные opts},
     turn(st) — чей ход: 0 или 1 (в одиночной игре всегда 0),
     legal(st, mv) — можно ли так походить; mv.s — кто ходит (ставит движок),
     apply(st, mv) — меняет st и возвращает событие ev для вида; случайность — только через bgRnd(st), иначе по сети разойдётся,
     over(st) — null, пока игра идёт, или {win:0|1|-1} (−1 — ничья); в одиночной — {stars:1…3, say},
     score(st) — [очки 0, очки 1] для шапки (не обязательно),
     bot(st, seat, mem, soft) — ход Пинга; mem — его память на всю партию, soft 0…1 — как сильно поддаваться,
     botSee(mem, st, ev) — (не обязательно) Пинг «видит» каждый ход (например, какие карточки открывали),
     secret — у игроков есть тайное (морской бой): вдвоём на одном телефоне между ходами просим передать телефон,
     view:{build(el, BGS), draw(BGS, ev) → Promise} — доска в DOM: build один раз, draw после каждого хода (ev = null — просто перерисовать);
       ход игрока — BGS.try(mv). Кто смотрит на доску — BGS.eye (важно для secret), чей ход — g.turn(BGS.st).
   Сеть: сообщения {t:'bg', k:…}: hi (гость → имя), start (хозяин → игра и состояние), mv (ход с номером i),
   at/mvs (после обрыва догоняем пропущенные ходы), again, bye. Ходы по очереди, поэтому главного нет: оба применяют одно и то же.
   Проиграть нельзя по-настоящему: ракушки получают оба, вместо «ты проиграла» — «Реванш?».
   save.bg = {got:[коробки], n:{игра: партий}, w:{игра: побед}, day:{d, n}, box — день последней коробки с прогулки} (sanitizeBg в data.js).
   Подключается после coop.js/icecode.js (CO_GAMES) и home.js, до story.js (ST_GATE.bg). */
const BG = {}, BG_ORDER = [];
const BG_GIFT = 4, BG_DAILY = 4;   // ракушек за партию и сколько партий в день с ракушками
const BG_BOX_EVERY = 2;            // коробка с прогулки — не чаще раза в столько дней
const BG_BOT_WAIT = [0.7, 1.3];    // Пинг «думает» столько секунд
if(!save.bg) save.bg = sanitizeBg(null);   // Pages мог отдать старый data.js
function bgReg(g){ BG[g.id] = g; if(!BG_ORDER.includes(g.id)) BG_ORDER.push(g.id); }
const bgOn = () => typeof stGate !== 'function' || stGate('bg') < 0;
const bgHas = id => save.bg.got.includes(id);
const bgDay = () => new Date().toDateString();
// случайность в правилах: живёт в самом состоянии (st.seed), поэтому у обоих игроков по сети выходит одно и то же
function bgRnd(st){ st.seed = (Math.imul(st.seed | 0, 1103515245) + 12345) & 0x7fffffff; return st.seed/0x80000000; }
function bgShuffle(st, a){ for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(bgRnd(st)*(i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const bgEsc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'}[c]));

/* ---------- коробки: получить, первая сама, с прогулки ---------- */
function bgGive(id, how){
  if(!BG[id] || bgHas(id)) return false;
  save.bg.got.push(id);
  if(!save.owned.includes('bg_shelf')) save.owned.push('bg_shelf');
  if(!save.home.s.games) save.home.s.games = 'bg_shelf';
  persist();
  if(typeof homeMode !== 'undefined' && homeMode) homeBuild();
  const G = BG[id];
  if(how) toast(how === 'net' ? L(`${G.ic} «${G.name()}» теперь и на твоей полке в иглу!`, `${G.ic} “${G.name()}” is on your shelf in the igloo now too!`)
    : how === 'mail' ? L(`${G.ic} Папа прислал игру «${G.name()}»! Она в иглу, на полке с играми 🎲`, `${G.ic} Dad sent you “${G.name()}”! It is in the igloo, on the games shelf 🎲`)
    : L(`${G.ic} Новая игра «${G.name()}» — в иглу, на полке с играми 🎲`, `${G.ic} A new game, “${G.name()}” — in the igloo, on the games shelf 🎲`), 3600);
  return true;
}
// глава открылась — на полке появляется первая коробка (зовём при входе в иглу и в «Вместе»)
function bgEnsure(){
  if(!bgOn() || save.bg.got.length || !BG.memo) return false;
  bgGive('memo');
  return true;
}
// какие коробки ещё можно найти (не у всех игр есть коробка на прогулке: письма папы приносят свои)
const bgLeft = () => BG_ORDER.filter(id => !bgHas(id) && !BG[id].mailOnly);
// на прогулке: раз в пару дней, если есть что найти, волна выносит коробку (js/walk.js в конце прогулки)
function bgWalkBoxDue(){
  if(!bgOn() || !save.bg.got.length || !bgLeft().length) return false;
  const last = save.bg.box ? new Date(save.bg.box) : null;
  return !last || (Date.now() - last.getTime())/864e5 >= BG_BOX_EVERY - 0.01;
}
function bgWalkBox(){
  const id = bgLeft()[0]; if(!id) return null;
  save.bg.box = bgDay(); bgGive(id); return BG[id];
}

/* ---------- 3D: стопка коробок на столике в иглу (home.js: FURN_MAKE.bg_shelf) ---------- */
function bgStackMake(){
  const g = new THREE.Group(), wood = toon(0xD99A5E);
  const top = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.1, 32), wood), 1.04); top.position.y = 0.42; g.add(top);
  for(let i = 0; i < 3; i++){ const a = i/3*Math.PI*2 + 0.4, leg = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.4, 10), wood), 1.08); leg.position.set(Math.sin(a)*0.42, 0.2, Math.cos(a)*0.42); g.add(leg); }
  const got = BG_ORDER.filter(bgHas), boxes = [];
  got.forEach((id, i) => {
    const G = BG[id], w = 0.78 - (i % 2)*0.06, b = addOutline(new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, 0.56), toon(G.col || 0xFF9BB8)), 1.05);
    b.position.set((i % 2 ? 0.04 : -0.03), 0.55 + i*0.17, 0); b.rotation.y = (i % 3 - 1)*0.18; b.userData.y0 = b.position.y; g.add(b);
    const lid = new THREE.Sprite(new THREE.SpriteMaterial({map:findTex(G.ic), transparent:true, depthWrite:false}));
    lid.scale.setScalar(0.26); lid.position.set(0, 0.1, 0.2); b.add(lid); boxes.push(b);
  });
  if(!got.length){   // пусто: только кубик-«?» — ждём первую коробку
    const q = new THREE.Sprite(new THREE.SpriteMaterial({map:findTex('🎲'), transparent:true, depthWrite:false})); q.scale.setScalar(0.4); q.position.y = 0.7; g.add(q);
  }
  g.userData.nb = got.length; g.userData.boxes = boxes;
  return g;
}

/* ---------- полка «Игротека»: какие коробки есть и во что играем ---------- */
// modes — какие кнопки показать; вернёт {id, mode, opts} или null
async function bgShelf(){
  bgEnsure();
  mgOpen('');
  const all = BG_ORDER, got = all.filter(bgHas);
  const panel = mgNode('div', 'mg-panel fun-pick bg-shelf', `
    <p class="ttl display">🎲 ${L('Игротека', 'Game shelf')}</p>
    <p class="got">${L(`Коробок: ${got.length} из ${all.length}`, `Boxes: ${got.length} of ${all.length}`)}</p>
    <div class="picks bg-boxes">${all.map(id => { const G = BG[id]; return bgHas(id)
      ? `<button data-k="${id}" style="--bx:#${new THREE.Color(G.col || 0xFF9BB8).getHexString()}"><span class="ic">${G.ic}</span><b>${G.name()}</b><small>${bgWins(id)}</small></button>`
      : `<button data-k="" class="bg-no" aria-label="${L('Коробка ещё не найдена', 'Box not found yet')}"><span class="ic">❔</span><small>${G.mailOnly ? L('придёт в письме', 'comes by mail') : L('ищи на прогулке', 'find it on a walk')}</small></button>`; }).join('')}</div>
    <p class="tip">${bgLeft().length ? L('Новые коробки выносит волной на прогулке 🌊', 'Waves wash new boxes up on walks 🌊') : L('Все коробки собраны! ♡', 'All boxes collected! ♡')}</p>
    <button class="btn ghost small" data-k="no">${L('Потом', 'Later')}</button>`);
  panel.querySelectorAll('.bg-no').forEach(b => mgOn(b, 'click', () => { sfx.bad(); wiggle(b); }));
  const k = await new Promise(r => panel.querySelectorAll('[data-k]:not(.bg-no)').forEach(b => mgOn(b, 'click', () => { sfx.tap(); r(b.dataset.k); })));
  panel.classList.add('away'); await wait(0.2); mgClose();
  return k === 'no' ? null : k;
}
const bgWins = id => { const n = save.bg.n[id] || 0, w = save.bg.w[id] || 0; return n ? L(`партий: ${n} · побед: ${w}`, `played ${n} · won ${w}`) : L('новая!', 'new!'); };
const bgBot = () => typeof pengMet === 'function' && pengMet() ? {name:L('Пинг', 'Ping'), ic:'🐧'} : {name:save.pet ? save.pet.name : L('Малыш', 'Pup'), ic:'🦭'};
// с кем играем + настройки игры; вернёт {mode, o} или null
async function bgModes(id){
  const G = BG[id], bot = bgBot(), o = {};
  for(const [k, op] of Object.entries(G.opts || {})) o[k] = bgOptGet(id, k, op);
  mgOpen('');
  const m = G.modes, btn = (k, ic, b, s, wide) => m.includes(k) ? `<button data-k="${k}"${wide ? ' class="wide"' : ''}><span class="ic">${ic}</span><b>${b}</b><small>${s}</small></button>` : '';
  const netOk = m.includes('net') && typeof netAvail === 'function' && netAvail();
  const panel = mgNode('div', 'mg-panel fun-pick bg-modes', `
    <p class="ttl display">${G.ic} ${G.name()}</p>
    <p class="got">${G.say()}</p>
    ${Object.entries(G.opts || {}).map(([k, op]) => `<div class="bg-opt" data-o="${k}"><span>${op.name()}</span>${op.list.map(([v, t]) => `<button data-v="${v}">${t()}</button>`).join('')}</div>`).join('')}
    <div class="picks">
      ${btn('ping', bot.ic, bot.name, L('играть вдвоём', 'play together'))}
      ${btn('duo', '👫', L('Вдвоём тут', 'Two here'), L('на одном телефоне', 'on one phone'))}
      ${m.includes('ping') && typeof pengMet === 'function' && !pengMet() && typeof coPingHosp === 'function' ? `<button class="st-lock wide" data-k="hosp"><span class="ic">🐧</span><b>${L('С Пингом', 'With Ping')} 🔒</b><small>${L('сначала вылечи ▶', 'treat him first ▶')}</small></button>` : ''}
      ${netOk ? btn('net', '🌐', L('По сети', 'Online'), L('с папой или другом', 'with Dad or a friend'), true) : ''}
      ${btn('solo', '⏱️', pg(L('Один', 'Alone'), L('Одна', 'Alone')), L('на звёзды', 'for stars'), true)}
    </div>
    <button class="btn ghost small" data-k="no">${L('Назад', 'Back')}</button>`);
  const opt = () => panel.querySelectorAll('.bg-opt').forEach(r => r.querySelectorAll('[data-v]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v) === String(o[r.dataset.o]))));
  panel.querySelectorAll('.bg-opt').forEach(r => r.querySelectorAll('[data-v]').forEach(b => mgOn(b, 'click', () => {
    const op = G.opts[r.dataset.o], v = op.list.find(x => String(x[0]) === b.dataset.v)[0];
    o[r.dataset.o] = v; sfx.tick(); opt(); try{ localStorage.setItem(`sh.bg.${id}.${r.dataset.o}`, String(v)); }catch(e){}
  })));
  opt();
  const k = await new Promise(r => panel.querySelectorAll('.picks [data-k], [data-k="no"]').forEach(b => mgOn(b, 'click', () => { sfx.tap(); r(b.dataset.k); })));
  panel.classList.add('away'); await wait(0.2); mgClose();
  return k === 'no' ? null : {mode:k, o};
}
function bgOptGet(id, k, op){
  let v = null; try{ v = localStorage.getItem(`sh.bg.${id}.${k}`); }catch(e){}
  const hit = op.list.find(x => String(x[0]) === v);
  return hit ? hit[0] : op.def;
}

/* ---------- вход: из иглу (полка), из «Вместе» (вкладка) ---------- */
let bgWant = null;   // по сети: какую коробку открывает хозяин (coopNet → coopNetGo → bgNet)
async function bgGo(id = null){
  for(;;){
    const g = id || await bgShelf(); if(!g) return null;
    const pick = await bgModes(g);
    if(!pick){ if(id) return null; continue; }
    if(pick.mode === 'hosp'){ coPingHosp('bg'); return null; }   // 🔒 «С Пингом»: сначала лечим его в больнице (js/coop.js)
    if(pick.mode === 'net'){
      if(await netLobby() !== 'ok'){ if(id) return null; continue; }
      bgWant = {id:g, o:pick.o}; coGame = 'bg';
      return coopNet('bg');
    }
    return bgGame(g, pick.mode, pick.o);
  }
}

/* ---------- партия ---------- */
let BGS = null;   // идёт партия (одна на всю игру)
async function bgGame(id, mode, o, pal = null){
  document.body.classList.add('bg-on');
  try{ return await bgLoop(id, mode, o, pal); }
  finally{ document.body.classList.remove('bg-on'); BGS = null; if(mode === 'net') netClose(); }
}
async function bgLoop(id, mode, o, pal){
  let res = null;
  for(;;){
    let st, names, g = BG[id];
    if(mode === 'net'){
      const s = await bgNetStart(id, o);
      if(!s) return res;
      ({st, names} = s); id = s.id; g = BG[id];
    } else {
      st = g.setup({...o, mode, seed:Math.floor(Math.random()*1e9)});
      const bot = bgBot();
      names = mode === 'ping' ? [{name:pname(), ic:'🦭'}, bot] : mode === 'duo' ? [{name:pname(), ic:'🩷'}, {name:L('Друг', 'Friend'), ic:'💙'}] : [{name:pname(), ic:'🦭'}];
    }
    const r = await bgPlay(g, st, mode, names);
    if(r === 'quit' || r === 'bye') return res;
    res = r;
    const again = await bgEnd(g, r, mode);
    if(!again) return res;
  }
}
// одна партия: шапка с игроками, доска, подсказка; вернёт {res, st, me, names} или 'quit' / 'bye'
function bgPlay(g, st, mode, names){
  mgOpen('');
  const me = mode === 'net' ? (net.host ? 0 : 1) : 0;
  const panel = mgNode('div', 'mg-panel bg-panel', `
    <div class="bg-top">
      <button class="round bg-home" aria-label="${L('Выйти', 'Leave')}">🏠</button>
      <p class="bg-say" aria-live="polite"></p>
    </div>
    <div class="bg-players">${names.map((p, i) => `<div class="bg-pl p${i}"><span class="av">${p.ic}</span><b>${bgEsc(p.name)}</b><span class="sc">0</span></div>`).join('')}</div>
    <div class="bg-board"></div>
    <div class="bg-cover" hidden><p class="display"></p><button class="btn">${L('Можно смотреть! 👀', 'Ready! 👀')}</button></div>`);
  return new Promise(done => {
    BGS = {g, st, mode, me, names, i:0, log:[], q:[], busy:false, mem:{}, eye:me, over:false, done, panel,
      board:panel.querySelector('.bg-board'), sayEl:panel.querySelector('.bg-say'), botT:null};
    BGS.try = mv => bgTry(mv);
    BGS.say = t => { BGS.sayEl.textContent = t; };
    g.view.build(BGS.board, BGS);
    let leave = 0;
    mgOn(panel.querySelector('.bg-home'), 'click', () => {   // выйти посреди партии — нажать 🏠 два раза (confirm во фрейме Artifact не работает)
      sfx.tap();
      if(!BGS.over && performance.now() - leave > 2500){ leave = performance.now(); toast(L('Нажми 🏠 ещё раз, чтобы выйти', 'Tap 🏠 again to leave'), 2400); return; }
      if(mode === 'net') netSend({t:'bg', k:'bye'});
      bgFinish('quit');
    });
    if(mode === 'net') bgNetWire();
    bgHead(); bgNext(true);
  });
}
function bgFinish(r){ if(!BGS || BGS.fin) return; BGS.fin = true; clearTimeout(BGS.botT); const d = BGS.done; mgClose(); d(r); }
// шапка: очки и чей ход
function bgHead(){
  const sc = BGS.g.score ? BGS.g.score(BGS.st) : null, t = BGS.over ? -1 : BGS.g.turn(BGS.st);
  BGS.panel.querySelectorAll('.bg-pl').forEach((el, i) => { el.classList.toggle('now', i === t && BGS.names.length > 1); el.querySelector('.sc').textContent = sc ? sc[i] : ''; });
}
const bgWho = seat => BGS.mode === 'duo' ? 'local' : BGS.mode === 'solo' ? 'local' : seat === BGS.me ? 'local' : BGS.mode === 'ping' ? 'bot' : 'net';
// после каждого хода: конец? кто ходит? Пингу — подумать и походить
async function bgNext(first){
  const g = BGS.g, st = BGS.st;
  bgHead();
  const r = g.over(st);
  if(r){
    BGS.over = true; bgHead();
    const w = r.win, mine = BGS.mode === 'solo' ? true : w === BGS.me;
    BGS.say(BGS.mode === 'solo' ? r.say || L('Готово! 🎉', 'Done! 🎉') : w < 0 ? L('Ничья! 🤝', 'A draw! 🤝') : BGS.mode === 'duo' ? L(`Победа: ${BGS.names[w].name}! 🎉`, `${BGS.names[w].name} wins! 🎉`) : mine ? L('Победа! 🎉', 'You won! 🎉') : L(`${BGS.names[w].name} в этот раз впереди 😉`, `${BGS.names[w].name} is ahead this time 😉`));
    if(mine || w < 0){ sfx.good(); burstDom({x:innerWidth/2, y:innerHeight*0.4}); } else sfx.tap();
    await wait(1.6);
    return bgFinish({res:r, st, me:BGS.me, names:BGS.names});
  }
  const t = g.turn(st), who = bgWho(t);
  if(g.secret && BGS.mode === 'duo' && BGS.eye !== t && !first){   // тайное на одном телефоне: передаём телефон
    await bgCover(t);
    if(!BGS || BGS.fin) return;
  }
  if(g.secret && BGS.mode === 'duo' && BGS.eye !== t){ BGS.eye = t; g.view.draw(BGS, null); }
  const same = !first && t === BGS.lastT; BGS.lastT = t;   // ход у того же (нашёл пару) — оставляем, что сказала игра
  if(same && who !== 'bot'){ if(who === 'net') bgPump(); return; }
  if(who === 'local') BGS.say(BGS.names.length < 2 ? '' : BGS.mode === 'duo' ? L(`Ходит: ${BGS.names[t].ic} ${BGS.names[t].name}`, `${BGS.names[t].ic} ${BGS.names[t].name}'s turn`) : L('Твой ход!', 'Your turn!'));
  else BGS.say(L(`Ходит ${BGS.names[t].name}…`, `${BGS.names[t].name}'s turn…`));
  if(who === 'bot'){
    const [a, b] = BG_BOT_WAIT;
    BGS.botT = setTimeout(() => {
      if(!BGS || BGS.busy || BGS.over || g.turn(BGS.st) !== t) return;
      const mv = g.bot(BGS.st, t, BGS.mem, bgSoft(t));
      if(mv && g.legal(BGS.st, {...mv, s:t})) bgDo(mv, t, false);
    }, (a + Math.random()*(b - a))*1000);
  }
  if(who === 'net') bgPump();
}
// как сильно Пинг поддаётся: впереди — сильнее, в первые партии — ещё сильнее
function bgSoft(bot){
  const sc = BGS.g.score ? BGS.g.score(BGS.st) : [0, 0], lead = sc[bot] - sc[1 - bot];
  const fresh = (save.bg.n[BGS.g.id] || 0) < 3 ? 0.15 : 0;
  return Math.max(0.1, Math.min(0.9, 0.3 + 0.18*lead + fresh));
}
async function bgCover(t){
  const c = BGS.panel.querySelector('.bg-cover');
  c.querySelector('p').textContent = L(`Передай телефон: ${BGS.names[t].ic} ${BGS.names[t].name} 🙈`, `Pass the phone to ${BGS.names[t].ic} ${BGS.names[t].name} 🙈`);
  BGS.eye = -1; BGS.busy = true; BGS.g.view.draw(BGS, null);   // пока телефон передают — тайное не видно никому
  c.hidden = false;
  await new Promise(r => c.querySelector('button').addEventListener('click', () => { sfx.tap(); r(); }, {once:true}));
  c.hidden = true; if(BGS) BGS.busy = false;
}
// ход игрока с доски
function bgTry(mv){
  if(!BGS || BGS.busy || BGS.over) return false;
  const t = BGS.g.turn(BGS.st);
  if(bgWho(t) !== 'local'){ sfx.bad(); BGS.say(BGS.mode === 'ping' || BGS.mode === 'net' ? L(`Сейчас ходит ${BGS.names[t].name} — подожди 🙂`, `It is ${BGS.names[t].name}'s turn — wait a moment 🙂`) : ''); wiggle(BGS.sayEl); return false; }
  if(!BGS.g.legal(BGS.st, {...mv, s:t})){ sfx.bad(); return false; }
  bgDo(mv, t, true);
  return true;
}
async function bgDo(mv, seat, local){
  BGS.busy = true;
  const m = {...mv, s:seat}, i = BGS.i;
  const ev = BGS.g.apply(BGS.st, m);
  BGS.log.push(m); BGS.i++;
  if(BGS.mode === 'net' && local) netSend({t:'bg', k:'mv', mv:m, i});
  if(BGS.g.botSee && BGS.mode === 'ping') BGS.g.botSee(BGS.mem, BGS.st, ev);
  bgHead();
  try{ await BGS.g.view.draw(BGS, ev); }catch(e){ console.error(e); }
  if(!BGS || BGS.fin) return;
  BGS.busy = false;
  bgNext(false);
}

/* ---------- сеть ---------- */
// хозяин: ждём имя гостя, отправляем игру и состояние; гость: здороваемся, пока не придёт start
function bgNetStart(id, o){
  return new Promise(res => {
    let iv = null, t = null;
    const fin = v => { clearInterval(iv); clearTimeout(t); res(v); };
    mgOpen(L('Раскладываем игру… 🎲', 'Setting up the game… 🎲'));
    const onBye = () => { toast(L('Напарник ушёл домой 👋', 'Your partner went home 👋')); mgClose(); fin(null); };
    if(net.host){
      const g = BG[id];
      const go = name => {
        const st = g.setup({...o, mode:'net', seed:Math.floor(Math.random()*1e9)});
        const names = [{name:pname(), ic:'🦭'}, {name:name || L('Друг', 'Friend'), ic:'💙'}];
        const send = () => netSend({t:'bg', k:'start', id, st, names});
        send(); iv = setInterval(send, 700);   // повторяем, пока гость не скажет «ок»
        netOn('bg', m => { if(m.k === 'ok'){ mgClose(); fin({id, st, names}); } if(m.k === 'bye') onBye(); });
      };
      let got = false;
      netOn('bg', m => { if(m.k === 'hi' && !got){ got = true; clearInterval(iv); go(m.name); } if(m.k === 'bye') onBye(); });
      const call = () => netSend({t:'bg', k:'again'});   // гость может ещё смотреть итоги прошлой партии — зовём, пока не поздоровается
      call(); iv = setInterval(call, 700);
      t = setTimeout(() => { if(!got){ got = true; clearInterval(iv); go(''); } }, 9000);
    } else {
      const hi = () => netSend({t:'bg', k:'hi', name:pname()});
      hi(); iv = setInterval(hi, 600);
      netOn('bg', m => {
        if(m.k === 'bye') return onBye();
        if(m.k !== 'start') return;
        netSend({t:'bg', k:'ok'});
        if(!BG[m.id]){ toast(L('У напарника новая игра — обнови страницу 🔄', 'Your partner has a newer game — reload the page 🔄'), 4000); mgClose(); return fin(null); }
        if(!bgHas(m.id)) bgGive(m.id, 'net');
        mgClose(); fin({id:m.id, st:m.st, names:m.names});
      });
    }
  });
}
function bgNetWire(){
  netOn('bg', m => {
    if(!BGS) return;
    if(m.k === 'mv'){ BGS.q.push(m); bgPump(); }
    if(m.k === 'at' && m.i < BGS.i) netSend({t:'bg', k:'mvs', from:m.i, mvs:BGS.log.slice(m.i)});   // напарник отстал — досылаем ходы
    if(m.k === 'mvs') m.mvs.forEach((mv, j) => BGS.q.push({mv, i:m.from + j})), bgPump();
    if(m.k === 'start' && !net.host) netSend({t:'bg', k:'ok'});   // хозяин не услышал «ок» — повторяем
    if(m.k === 'bye'){ toast(L('Напарник ушёл домой 👋', 'Your partner went home 👋'), 3000); bgFinish('bye'); }
  });
  net.onLost = () => { if(BGS && !BGS.over) BGS.say(L('Связь пропала… ждём напарника 📡', 'Connection lost… waiting for your partner 📡')); };
  net.onBack = () => { if(!BGS || BGS.over) return; netSend({t:'bg', k:'at', i:BGS.i}); BGS.lastT = -1; bgNext(false); };
}
// чужие ходы — строго по номерам: дубли пропускаем, дыру просим дослать
function bgPump(){
  if(!BGS || BGS.busy || BGS.over) return;
  BGS.q.sort((a, b) => a.i - b.i);
  while(BGS.q.length && BGS.q[0].i < BGS.i) BGS.q.shift();
  const m = BGS.q[0]; if(!m) return;
  if(m.i > BGS.i){ netSend({t:'bg', k:'at', i:BGS.i}); return; }
  BGS.q.shift();
  const s = m.mv.s;
  if(bgWho(s) !== 'net' || !BGS.g.legal(BGS.st, m.mv)){ netSend({t:'bg', k:'at', i:BGS.i}); return; }
  bgDo(m.mv, s, false);
}
// по сети (из coopNetGo): хозяин открывает выбранную коробку, гость ждёт
function bgNet(pal){
  const w = bgWant || {id:BG_ORDER.find(bgHas) || 'memo', o:{}}; bgWant = null;
  return bgGame(w.id, 'net', w.o, pal);
}

/* ---------- конец партии: ракушки обоим, «Реванш?» ---------- */
async function bgEnd(g, r, mode){
  const {res, me, names} = r, sv = save.bg, today = bgDay();
  if(sv.day.d !== today) sv.day = {d:today, n:0};
  const gift = sv.day.n < BG_DAILY ? BG_GIFT : 0;
  sv.day.n++; sv.n[g.id] = (sv.n[g.id] || 0) + 1;
  const won = mode !== 'solo' && res.win === me && mode !== 'duo';
  if(won) sv.w[g.id] = (sv.w[g.id] || 0) + 1;
  persist();
  const lost = mode !== 'solo' && mode !== 'duo' && res.win >= 0 && res.win !== me;
  const sc = g.score ? g.score(r.st) : null;
  mgOpen('');
  const panel = mgNode('div', 'mg-panel run-end co-end bg-end', `
    <p class="ttl display">${mode === 'solo' ? `${g.ic} ${L('Готово!', 'Done!')}` : res.win < 0 ? L('Ничья! 🤝', 'A draw! 🤝') : mode === 'duo' ? `🏆 ${bgEsc(names[res.win].name)}` : won ? L('Победа! 🎉', 'You won! 🎉') : L('Реванш? 😉', 'Rematch? 😉')}</p>
    ${mode === 'solo' ? `<p class="stars">${'⭐'.repeat(res.stars)}${'☆'.repeat(3 - res.stars)}</p>${res.say ? `<p class="got">${res.say}</p>` : ''}`
      : sc ? `<p class="got bg-final">${names.map((p, i) => `${p.ic} ${bgEsc(p.name)}: <b>${sc[i]}</b>`).join(' · ')}</p>` : ''}
    ${lost ? `<p class="got">${L(`${bgEsc(names[res.win].name)} в этот раз впереди. Сыграем ещё?`, `${bgEsc(names[res.win].name)} is ahead this time. One more game?`)}</p>` : ''}
    <p class="earned display">${gift ? `+${gift} 🐚` : ''}</p>
    ${!gift ? `<p class="got">${L('Ракушки за игры на сегодня собраны — завтра будут новые 🌊', 'Today\'s shells for games are collected — more tomorrow 🌊')}</p>` : ''}
    <p class="got co-wait" hidden></p>
    <div class="row"><button class="btn ghost" data-k="home">${L('Хватит', 'Done')}</button>${mode !== 'net' || net.host ? `<button class="btn" data-k="again">${L('Ещё раз ↻', 'Again ↻')}</button>` : ''}</div>`);
  if(gift) setTimeout(() => addShells(gift, {x:innerWidth/2, y:innerHeight*0.4}), 700);
  const k = await new Promise(res2 => {
    panel.querySelectorAll('[data-k]').forEach(b => mgOn(b, 'click', () => { sfx.tap(); res2(b.dataset.k); }));
    if(mode === 'net'){
      const w = panel.querySelector('.co-wait');
      if(!net.host){ w.hidden = false; w.textContent = L('Напарник решает: ещё раз или хватит…', 'Your partner is deciding: again or done…'); }
      netOn('bg', m => {
        if((m.k === 'again' || m.k === 'start') && !net.host) res2('again');   // хозяин начал новую партию — bgNetStart её услышит (start он повторяет)
        if(m.k === 'bye'){ w.hidden = false; w.textContent = L('Напарник ушёл домой 👋', 'Your partner went home 👋'); const a = panel.querySelector('[data-k="again"]'); if(a) a.remove(); }
      });
    }
  });
  if(mode === 'net' && k === 'home') netSend({t:'bg', k:'bye'});
  panel.classList.add('away'); await wait(0.25); mgClose();
  return k === 'again';
}

/* ---------- «Вместе»: вкладка «🎲 Игротека» ---------- */
CO_GAMES.bg = {ic:'🎲', name:() => L('Игротека', 'Games'),
  say:() => L('Короткие игры по очереди: с Пингом, вдвоём на одном телефоне или по сети с папой.', 'Short turn-by-turn games: with Ping, two on one phone, or online with Dad.'),
  wins:() => { const n = Object.values(save.bg.n).reduce((a, b) => a + b, 0); return n ? `🎲 ${L(`Сыграно партий: ${n}`, `Games played: ${n}`)}` : ''; },
  picks:() => { bgEnsure(); return BG_ORDER.filter(bgHas).map(id => `<button data-k="${id}"><span class="ic">${BG[id].ic}</span><b>${BG[id].name()}</b><small>${bgWins(id)}</small></button>`).join('')
    + (bgLeft().length ? `<button data-k="" class="wide bg-no" disabled><span class="ic">❔</span><small>${L('новые коробки — на прогулке', 'new boxes — on walks')}</small></button>` : ''); }};

/* ======================================================================
   🃏 Мемори: найди пару. Открываешь две карточки; пара — забираешь и ходишь ещё, нет — ход переходит.
   Одной — на звёзды: чем меньше открываний, тем больше звёзд.
   ====================================================================== */
const MEMO_PICS = ['🦭', '🐧', '🦈', '🐙', '🐻‍❄️', '☁️', '🐟', '🦀', '⭐', '🐚', '🐳', '🌈', '🍓', '❄️'];
bgReg({id:'memo', ic:'🃏', col:0xFFC4D6, name:() => L('Мемори', 'Memory'),
  say:() => L('Открой две карточки. Одинаковые — твоя пара, и ходишь ещё!', 'Turn over two cards. A match is yours — and you go again!'),
  modes:['ping', 'duo', 'net', 'solo'],
  opts:{size:{name:() => L('Карточек:', 'Cards:'), def:16, list:[[12, () => '12'], [16, () => '16'], [20, () => '20']]}},
  setup(o){
    const st = {seed:o.seed | 0, n:o.size || 16, solo:o.mode === 'solo', t:0, sc:[0, 0], up:[], flips:0};
    const pics = bgShuffle(st, MEMO_PICS.map((_, i) => i)).slice(0, st.n/2);
    st.cards = bgShuffle(st, pics.concat(pics));
    st.own = st.cards.map(() => -1);
    return st;
  },
  turn:st => st.t,
  legal:(st, mv) => Number.isInteger(mv.c) && mv.c >= 0 && mv.c < st.n && st.own[mv.c] < 0 && !st.up.includes(mv.c),
  apply(st, mv){
    const c = mv.c; st.flips++;
    if(!st.up.length){ st.up = [c]; return {k:'one', c}; }
    const a = st.up[0]; st.up = [];
    if(st.cards[a] === st.cards[c]){ st.own[a] = st.own[c] = st.t; st.sc[st.t]++; return {k:'pair', a, b:c}; }
    if(!st.solo) st.t = 1 - st.t;
    return {k:'miss', a, b:c};
  },
  over(st){
    if(st.own.some(o => o < 0)) return null;
    if(st.solo){ const k = st.flips/st.n, stars = k <= 1.9 ? 3 : k <= 2.6 ? 2 : 1;
      return {stars, say:L(`Открываний: ${st.flips} (лучше всего — ${st.n})`, `Flips: ${st.flips} (the best is ${st.n})`)}; }
    return {win:st.sc[0] === st.sc[1] ? -1 : st.sc[0] > st.sc[1] ? 0 : 1};
  },
  score:st => st.sc,
  // Пинг помнит открытые карточки, но не все (и забывает нарочно, когда поддаётся)
  botSee(mem, st, ev){
    mem.k = mem.k || {};
    const see = c => { if(Math.random() < 0.85) mem.k[c] = st.cards[c]; };
    if(ev.k === 'one') see(ev.c); else { see(ev.a); see(ev.b); }
    for(const c of Object.keys(mem.k)) if(st.own[c] >= 0) delete mem.k[c];
  },
  bot(st, seat, mem, soft){
    const k = mem.k || {}, free = st.own.map((o, i) => o < 0 && !st.up.includes(i) ? i : -1).filter(i => i >= 0);
    const unknown = free.filter(i => k[i] === undefined), any = a => a[Math.floor(Math.random()*a.length)];
    const sharp = Math.random() >= soft;
    if(!st.up.length){
      if(sharp){ const seen = {}; for(const i of free) if(k[i] !== undefined){ if(seen[k[i]] !== undefined) return {c:seen[k[i]]}; seen[k[i]] = i; } }
      return {c:any(unknown.length ? unknown : free)};
    }
    const a = st.up[0], mate = free.find(i => k[i] === st.cards[a]);
    if(sharp && mate !== undefined) return {c:mate};
    const guess = unknown.length ? unknown : free.filter(i => k[i] !== st.cards[a] || Math.random() < soft);
    return {c:any(guess.length ? guess : free)};
  },
  view:{
    build(el, BGS){
      const st = BGS.st, cols = st.n === 12 ? 4 : st.n === 16 ? 4 : 5;
      el.innerHTML = `<div class="memo" style="--cols:${cols}">${st.cards.map((p, i) => `<button class="mc" data-c="${i}" aria-label="${L('Карточка', 'Card')} ${i + 1}"><span class="bk" aria-hidden="true">🐚</span><span class="fr">${MEMO_PICS[p]}</span></button>`).join('')}</div>`;
      el.querySelectorAll('.mc').forEach(b => mgOn(b, 'click', () => { if(BGS.try({c:+b.dataset.c})) sfx.pop(); }));
      this.draw(BGS, null);
    },
    async draw(BGS, ev){
      const st = BGS.st, cs = [...BGS.board.querySelectorAll('.mc')];
      const paint = () => cs.forEach((b, i) => {
        const own = st.own[i];
        b.classList.toggle('up', own >= 0 || st.up.includes(i));
        b.classList.toggle('o0', own === 0); b.classList.toggle('o1', own === 1);
        b.disabled = own >= 0;
      });
      if(!ev) return paint();
      if(st.solo) BGS.say(L(`Открываний: ${st.flips}`, `Flips: ${st.flips}`));
      if(ev.k === 'one'){ paint(); return wait(0.25); }
      if(ev.k === 'pair'){
        cs[ev.b].classList.add('up'); await wait(0.45);
        paint(); sfx.ding(); [ev.a, ev.b].forEach(i => wiggle(cs[i]));
        if(!st.solo) BGS.say(bgWho(st.own[ev.a]) === 'local' && BGS.mode !== 'duo' ? L('Пара! Ходи ещё 🎉', 'A match! Go again 🎉') : L(`Пара у ${BGS.names[st.own[ev.a]].name}!`, `A match for ${BGS.names[st.own[ev.a]].name}!`));
        return wait(0.7);
      }
      cs[ev.b].classList.add('up'); cs[ev.a].classList.add('up');   // не пара: смотрим и запоминаем, потом карточки закрываются
      await wait(1.1); sfx.tick();
      paint();
      return wait(0.3);
    }
  }
});
