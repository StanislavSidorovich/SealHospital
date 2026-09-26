/* ---------------- «Ледяной код» (идея папы 25.09, как Mastermind / «Быки и коровы») ----------------
   Кто-то загадывает 4 разных предмета из шести (🐟 ❄️ 🐚 ⭐ 🦀 🍓) в каком-то порядке, второй угадывает.
   После каждой попытки: 🟢 — предмет на своём месте, 🟡 — такой есть, но стоит в другом месте. Без спешки,
   попыток сколько угодно, после третьей можно попросить 💡 подсказку. Проиграть нельзя.
   Три способа: 🐧 загадка Пинга (придумывает игра), ✉️ «Загадать» — код и ссылка для WhatsApp (сервер не нужен:
   загадка лежит в самой ссылке …/?ice=КОД&from=Имя), 🔑 «Отгадать код», который прислали.
   Код — 4 знака (цифры и латинские буквы), в нём перемешан ответ и проверочный знак — на глаз не прочитать.
   Разгадала — ракушки (за загадки Пинга — первые три в день, за чужой код — один раз), и ответ-хвастушка для папы.
   Подключается после grotto.js (и после coop.js — вкладка «🧊 Код» в «Играем вместе»). */
const ICE_ITEMS = [
  {e:'🐟', n:() => L('рыбка', 'fish')}, {e:'❄️', n:() => L('снежинка', 'snowflake')}, {e:'🐚', n:() => L('ракушка', 'shell')},
  {e:'⭐', n:() => L('звёздочка', 'star')}, {e:'🦀', n:() => L('крабик', 'crab')}, {e:'🍓', n:() => L('клубничка', 'strawberry')}
];
const ICE_N = 4, ICE_RAND_DAILY = 3, ICE_GIFT = 5, ICE_CODE_GIFT = 10, ICE_TIP_AFTER = 3;
const ICE_URL = 'https://stanislavsidorovich.github.io/SealHospital/';
const ICE_M = 46656, ICE_INV7 = (() => { for(let x = 1; x < ICE_M; x++) if(x*7 % ICE_M === 1) return x; return 1; })();
const iceSave = () => { const c = save.coop; if(!c.ice) c.ice = {wins:0, day:{d:'', n:0}, got:[]}; return c.ice; };

/* ---------- код: 4 знака base36 = 3 знака перемешанного ответа + проверочный ---------- */
function iceEnc(d){
  const n = ((d[0]*6 + d[1])*6 + d[2])*6 + d[3], s = Math.floor(Math.random()*36);
  let v = ((n + s*1296)*7 + 13) % ICE_M, t = '';
  for(let i = 0; i < 3; i++){ t = (v % 36).toString(36) + t; v = Math.floor(v/36); }
  return (t + iceChk(t)).toUpperCase();
}
function iceChk(t){ let a = 7; for(const c of t.toLowerCase()) a = (a*31 + parseInt(c, 36)) % 36; return a.toString(36); }
function iceDec(code){
  const u = String(code || '').toUpperCase().trim();
  const m = u.match(/ICE[-=\s]?([0-9A-Z]{4})(?![0-9A-Z])/) || u.match(/^([0-9A-Z]{4})$/);   // «ICE-7K2Q», ссылка «?ice=7K2Q» или просто «7K2Q»
  if(!m) return null;
  const t = m[1].slice(0, 3).toLowerCase();
  if(iceChk(t) !== m[1][3].toLowerCase()) return null;
  const v = parseInt(t, 36), n = ((v - 13 + ICE_M) % ICE_M)*ICE_INV7 % ICE_M % 1296;
  const d = [Math.floor(n/216), Math.floor(n/36) % 6, Math.floor(n/6) % 6, n % 6];
  return new Set(d).size === ICE_N ? {d, code:m[1]} : null;
}
function iceRandom(){ const a = [0, 1, 2, 3, 4, 5]; for(let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random()*(i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, ICE_N); }
function iceScore(sec, g){
  let ok = 0, has = 0;
  g.forEach((x, i) => { if(sec[i] === x) ok++; else if(sec.includes(x)) has++; });
  return {ok, has};
}
function iceLink(code, from){
  const base = /github\.io$|^localhost$|^127\./.test(location.hostname) ? location.origin + location.pathname : ICE_URL;
  return `${base}?ice=${code}${from ? '&from=' + encodeURIComponent(from.slice(0, 16)) : ''}${LANG === 'en' ? '&lang=en' : ''}`;
}
// поделиться: на телефоне — меню «Поделиться» (WhatsApp там есть), иначе — скопировать
async function iceShare(text){
  try{ if(navigator.share){ await navigator.share({text}); return 'shared'; } }catch(e){ if(e && e.name === 'AbortError') return 'cancel'; }
  try{ await navigator.clipboard.writeText(text); return 'copied'; }catch(e){}
  return 'manual';
}
const iceName = () => { try{ return localStorage.getItem('sh.icename') || ''; }catch(e){ return ''; } };

/* ---------- доска: угадываем ---------- */
function iceItems(d){ return d.map(i => `<span aria-label="${ICE_ITEMS[i].n()}">${ICE_ITEMS[i].e}</span>`).join(''); }
function icePalette(){ return ICE_ITEMS.map((it, i) => `<button data-e="${i}" aria-label="${it.n()}">${it.e}</button>`).join(''); }
function iceSlots(){ return Array.from({length:ICE_N}, (_, i) => `<button class="slot" data-i="${i}" aria-label="${L('Место', 'Slot')} ${i + 1}"></button>`).join(''); }
async function iceBoard(sec, say){
  const P = mgNode('div', 'mg-panel ice-panel', `
    <p class="ttl display">🧊 ${L('Ледяной код', 'Ice code')}</p>
    <p class="got ice-say">${say}</p>
    <div class="ice-rows" aria-live="polite"></div>
    <p class="ice-key">🟢 ${L('на своём месте', 'in the right spot')} · 🟡 ${L('есть, но не тут', 'there, but elsewhere')}</p>
    <div class="ice-cur">${iceSlots()}</div>
    <div class="ice-pal">${icePalette()}</div>
    <div class="row"><button class="round ice-tip" aria-label="${L('Подсказка', 'Hint')}" hidden>💡</button><button class="btn ice-go" disabled>${L('Проверить ✔', 'Check ✔')}</button></div>
    <button class="btn ghost small ice-no">${L('Потом', 'Later')}</button>`);
  const rows = P.querySelector('.ice-rows'), slots = [...P.querySelectorAll('.slot')], go = P.querySelector('.ice-go'), tipB = P.querySelector('.ice-tip');
  const cur = Array(ICE_N).fill(-1), lock = Array(ICE_N).fill(false);
  let n = 0, tips = 0;
  const draw = () => {
    slots.forEach((s, i) => { s.textContent = cur[i] >= 0 ? ICE_ITEMS[cur[i]].e : ''; s.classList.toggle('lock', lock[i]); });
    P.querySelectorAll('.ice-pal button').forEach(b => b.disabled = cur.includes(+b.dataset.e));
    go.disabled = cur.includes(-1);
    tipB.hidden = n < ICE_TIP_AFTER || lock.every(Boolean);
  };
  P.querySelectorAll('.ice-pal button').forEach(b => mgOn(b, 'click', () => {
    const e = +b.dataset.e, i = cur.indexOf(-1); if(i < 0 || cur.includes(e)) return;
    cur[i] = e; sfx.tap(); wiggle(slots[i]); draw();
  }));
  slots.forEach((s, i) => mgOn(s, 'click', () => { if(cur[i] < 0 || lock[i]) return; cur[i] = -1; sfx.tick(); draw(); }));
  mgOn(tipB, 'click', () => {   // подсказка: одно место открывается и замораживается
    const free = [...Array(ICE_N).keys()].filter(i => !lock[i]); if(!free.length) return;
    const i = free[Math.floor(Math.random()*free.length)], e = sec[i];
    const j = cur.indexOf(e); if(j >= 0) cur[j] = -1;
    cur[i] = e; lock[i] = true; tips++; sfx.sparkle(); wiggle(slots[i]);
    toast(L(`Подсказка: на месте ${i + 1} — ${ICE_ITEMS[e].n()} ${ICE_ITEMS[e].e}`, `Hint: slot ${i + 1} is the ${ICE_ITEMS[e].n()} ${ICE_ITEMS[e].e}`), 2600);
    draw();
  });
  draw();
  return new Promise(res => {
    mgOn(P.querySelector('.ice-no'), 'click', () => { sfx.tap(); P.classList.add('away'); setTimeout(() => res(null), 250); });
    mgOn(go, 'click', async () => {
      if(cur.includes(-1)) return;
      n++;
      const g = cur.slice(), sc = iceScore(sec, g);
      const row = document.createElement('div'); row.className = 'ice-row';
      row.innerHTML = `<span class="n">${n}</span><span class="its">${iceItems(g)}</span><span class="pegs" aria-label="${L(`на месте ${sc.ok}, есть ${sc.has}`, `right spot ${sc.ok}, elsewhere ${sc.has}`)}">${
        '<i class="g"></i>'.repeat(sc.ok) + '<i class="y"></i>'.repeat(sc.has) + '<i></i>'.repeat(ICE_N - sc.ok - sc.has)}</span>`;
      rows.appendChild(row); rows.scrollTop = rows.scrollHeight;
      if(sc.ok === ICE_N){
        sfx.good(); sfx.hug(); row.classList.add('win'); go.disabled = true;
        burstDom({x:innerWidth/2, y:innerHeight*0.45});
        P.querySelector('.ice-say').textContent = L('Разгадала! 🎉', 'Cracked it! 🎉');
        await wait(1.2); P.classList.add('away'); await wait(0.25);
        return res({n, tips, g});
      }
      sfx.tap();
      const s = P.querySelector('.ice-say');
      s.textContent = sc.ok === 3 ? L('Совсем близко! Одно место не то 👀', 'So close! One spot is off 👀')
        : sc.ok + sc.has === ICE_N ? L('Все предметы угаданы! Осталось поменять местами 🔄', 'You have all the items! Just swap them around 🔄')
        : sc.ok + sc.has === 0 ? L('Ни одного! Значит, эти четыре — не те. Это тоже подсказка 😉', 'None! So those four are not in it. That\'s a clue too 😉')
        : L(`🟢 ${sc.ok} · 🟡 ${sc.has} — думай дальше 🤔`, `🟢 ${sc.ok} · 🟡 ${sc.has} — keep thinking 🤔`);
      wiggle(s);
      for(let i = 0; i < ICE_N; i++) if(!lock[i]) cur[i] = -1;   // новая строка: подсказки остаются, остальное — заново
      draw();
    });
  });
}

/* ---------- загадать: выбрать 4 предмета → код и ссылка ---------- */
async function iceMake(){
  const P = mgNode('div', 'mg-panel ice-panel ice-make', `
    <p class="ttl display">✉️ ${L('Загадай код', 'Make a code')}</p>
    <p class="got ice-say">${L('Выбери 4 разных предмета по порядку. Папа (или друг) будет угадывать!', 'Pick 4 different items in order. Dad (or a friend) will guess!')}</p>
    <div class="ice-cur">${iceSlots()}</div>
    <div class="ice-pal">${icePalette()}</div>
    <label class="ice-sign">${L('Подпись', 'Sign it')}: <input maxlength="16" placeholder="${L('кто загадал', 'who made it')}" value=""></label>
    <div class="ice-out" hidden><p class="ice-code display"></p><p class="got ice-note"></p><textarea readonly rows="3" hidden></textarea></div>
    <div class="row"><button class="btn ice-go" disabled>${L('Готово ✔', 'Done ✔')}</button></div>
    <button class="btn ghost small ice-no">${L('Потом', 'Later')}</button>`);
  const inp = P.querySelector('input'); inp.value = iceName();
  const slots = [...P.querySelectorAll('.slot')], go = P.querySelector('.ice-go'), cur = Array(ICE_N).fill(-1);
  let code = '';
  const draw = () => {
    slots.forEach((s, i) => s.textContent = cur[i] >= 0 ? ICE_ITEMS[cur[i]].e : '');
    P.querySelectorAll('.ice-pal button').forEach(b => b.disabled = !!code || cur.includes(+b.dataset.e));
    go.disabled = !code && cur.includes(-1);
  };
  P.querySelectorAll('.ice-pal button').forEach(b => mgOn(b, 'click', () => { const e = +b.dataset.e, i = cur.indexOf(-1); if(i < 0 || code) return; cur[i] = e; sfx.tap(); wiggle(slots[i]); draw(); }));
  slots.forEach((s, i) => mgOn(s, 'click', () => { if(cur[i] < 0 || code) return; cur[i] = -1; sfx.tick(); draw(); }));
  mgOn(inp, 'pointerdown', e => e.stopPropagation());
  draw();
  return new Promise(res => {
    mgOn(P.querySelector('.ice-no'), 'click', () => { sfx.tap(); P.classList.add('away'); setTimeout(() => res(null), 250); });
    mgOn(go, 'click', async () => {
      const from = inp.value.trim().slice(0, 16);
      try{ localStorage.setItem('sh.icename', from); }catch(e){}
      if(!code){   // первый раз «Готово» — показываем код, дальше кнопка «Отправить»
        if(cur.includes(-1)) return;
        code = iceEnc(cur); sfx.good();
        P.querySelector('.ice-out').hidden = false;
        P.querySelector('.ice-code').textContent = `ICE-${code}`;
        P.querySelector('.ice-note').textContent = L('Отправь ссылку в WhatsApp — по ней сразу откроется загадка 🧊', 'Send the link on WhatsApp — it opens the puzzle straight away 🧊');
        go.textContent = L('Отправить 📤', 'Send 📤'); inp.disabled = true; draw();
        return;
      }
      const text = L(`🧊 Ледяной код!${from ? ` Загадка — ✍️ ${from}.` : ''} Угадай 4 предмета: ${iceLink(code, from)}  (или «Играем вместе» → 🧊 Код → ICE-${code})`,
        `🧊 An ice code${from ? ` from ${from}` : ''}! Guess the 4 items: ${iceLink(code, from)}  (or “Play together” → 🧊 Code → ICE-${code})`);
      const how = await iceShare(text);
      if(how === 'copied') toast(L('Скопировано! Вставь в WhatsApp 📋', 'Copied! Paste it into WhatsApp 📋'));
      if(how === 'manual'){ const ta = P.querySelector('textarea'); ta.hidden = false; ta.value = text; ta.select(); toast(L('Скопируй текст и отправь 📋', 'Copy the text and send it 📋')); }
      if(how === 'shared') toast(L('Отправлено! Ждём, когда разгадают 🧊', 'Sent! Now wait for them to crack it 🧊'));
    });
  });
}

/* ---------- отгадать: вставить код ---------- */
async function iceAsk(){
  const P = mgNode('div', 'mg-panel ice-panel ice-ask', `
    <p class="ttl display">🔑 ${L('Отгадать код', 'Crack a code')}</p>
    <p class="got">${L('Вставь код, который тебе прислали (например, ICE-7K2Q), или просто открой ссылку.', 'Paste the code you were sent (like ICE-7K2Q), or just open the link.')}</p>
    <input class="ice-in" maxlength="120" placeholder="ICE-…" autocapitalize="characters" autocomplete="off" spellcheck="false">
    <p class="got ice-err" hidden></p>
    <div class="row"><button class="btn ghost ice-paste">${L('Вставить 📋', 'Paste 📋')}</button><button class="btn ice-go">${L('Открыть 🧊', 'Open 🧊')}</button></div>
    <button class="btn ghost small ice-no">${L('Потом', 'Later')}</button>`);
  const inp = P.querySelector('.ice-in'), err = P.querySelector('.ice-err');
  mgOn(inp, 'pointerdown', e => e.stopPropagation());
  return new Promise(res => {
    const bad = t => { sfx.bad(); err.hidden = false; err.textContent = t; wiggle(inp); };
    const open = () => {
      const v = inp.value.trim(); if(!v) return bad(L('Сначала вставь код 🙂', 'Paste a code first 🙂'));
      const d = iceDec(v); if(!d) return bad(L('Такого кода нет. Проверь буквы и цифры (4 знака после ICE-).', 'That code doesn\'t work. Check the letters and digits (4 after ICE-).'));
      const f = (v.match(/[?&]from=([^&\s]+)/) || [])[1];
      let from = ''; try{ from = f ? decodeURIComponent(f) : ''; }catch(e){}
      sfx.good(); P.classList.add('away'); setTimeout(() => res({...d, from}), 250);
    };
    mgOn(P.querySelector('.ice-go'), 'click', open);
    mgOn(inp, 'keydown', e => { if(e.key === 'Enter') open(); });
    mgOn(P.querySelector('.ice-paste'), 'click', async () => { sfx.tap(); try{ inp.value = await navigator.clipboard.readText(); }catch(e){ inp.focus(); toast(L('Долгое нажатие → «Вставить»', 'Long press → “Paste”')); } });
    mgOn(P.querySelector('.ice-no'), 'click', () => { sfx.tap(); P.classList.add('away'); setTimeout(() => res(null), 250); });
  });
}

/* ---------- итог ---------- */
async function iceEnd(r, how){
  const s = iceSave(), today = new Date().toDateString();
  let gift = 0;
  if(how.code){ if(!s.got.includes(how.code)){ s.got.push(how.code); gift = ICE_CODE_GIFT; } }
  else { const n = s.day.d === today ? s.day.n : 0; if(n < ICE_RAND_DAILY) gift = ICE_GIFT; s.day = {d:today, n:n + 1}; }
  s.wins++; persist();
  const stars = r.n <= 4 ? 3 : r.n <= 6 ? 2 : 1;
  const P = mgNode('div', 'mg-panel run-end co-end ice-end', `
    <p class="ttl display">${L('Код разгадан! 🧊', 'Code cracked! 🧊')}</p>
    <p class="ice-its">${iceItems(r.g)}</p>
    <p class="stars" aria-label="${stars} ${L('звезды', 'stars')}">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</p>
    <p class="got">${L(`Попыток: ${r.n}`, `Guesses: ${r.n}`)}${r.tips ? ` · 💡 ${r.tips}` : ''}</p>
    ${how.code ? `<p class="got">${L('Похвастайся — отправь ответ тому, кто загадал 📤', `Tell ${how.from || 'them'} you cracked it 📤`)}</p>` : ''}
    <p class="earned display">${gift ? `+${gift} 🐚` : ''}</p>
    <div class="row">${how.code ? `<button class="btn ghost" data-k="tell">${L('Похвастаться 📤', 'Brag 📤')}</button>` : `<button class="btn ghost" data-k="again">${L('Ещё ↻', 'Again ↻')}</button>`}<button class="btn" data-k="home">${L('Готово', 'Done')}</button></div>`);
  if(gift) setTimeout(() => addShells(gift, {x:innerWidth/2, y:innerHeight*0.4}), 700);
  sfx.star();
  for(;;){
    const k = await new Promise(res => P.querySelectorAll('[data-k]').forEach(b => mgOn(b, 'click', () => { sfx.tap(); res(b.dataset.k); })));
    if(k === 'tell'){
      const t = L(`🧊 Я разгадала Ледяной код ICE-${how.code} за ${r.n} ${plural(r.n, 'попытку', 'попытки', 'попыток')}! ${iceItems(r.g).replace(/<[^>]+>/g, '')} ${'⭐'.repeat(stars)}`,
        `🧊 I cracked the ice code ICE-${how.code} in ${r.n} ${r.n === 1 ? 'guess' : 'guesses'}! ${iceItems(r.g).replace(/<[^>]+>/g, '')} ${'⭐'.repeat(stars)}`);
      const h = await iceShare(t);
      if(h === 'copied') toast(L('Скопировано! Вставь в WhatsApp 📋', 'Copied! Paste it into WhatsApp 📋'));
      if(h === 'manual') toast(t, 5000);
      continue;
    }
    P.classList.add('away'); await wait(0.25);
    return k === 'again';
  }
}

/* ---------- вход: из «Играем вместе» (mode = rand | make | solve) или по ссылке ---------- */
async function iceGame(mode, fromLink = null){
  document.body.classList.add('ice-on');   // кнопки в углу закрыли бы доску — оставляем только звук
  try{ return await iceLoop(mode, fromLink); } finally { document.body.classList.remove('ice-on'); }
}
async function iceLoop(mode, fromLink){
  let res = null;
  for(;;){
    mgOpen('');
    if(mode === 'make'){ await iceMake(); mgClose(); return null; }
    let how = fromLink;
    if(mode === 'solve' && !how){ how = await iceAsk(); if(!how){ mgClose(); return null; } }
    const ping = typeof pengMet === 'function' && pengMet();
    const sec = how ? how.d : iceRandom();
    const say = how ? L(`${how.from ? `✍️ ${how.from}: з` : 'З'}агадка — 4 разных предмета. Какие и в каком порядке?`, `${how.from ? `✍️ ${how.from}: a` : 'A'} puzzle — 4 different items. Which ones, and in what order?`)
      : ping ? L('Пинг спрятал 4 разных предмета. Какие и в каком порядке? 🐧', 'Ping hid 4 different items. Which ones, and in what order? 🐧')
      : L('Море спрятало 4 разных предмета. Какие и в каком порядке? 🌊', 'The sea hid 4 different items. Which ones, and in what order? 🌊');
    const r = await iceBoard(sec, say);
    if(!r){ mgClose(); return res; }
    res = {n:r.n};
    const again = await iceEnd(r, how ? {code:how.code, from:how.from} : {});
    mgClose();
    if(!again) return res;
    fromLink = null; mode = 'rand';
  }
}
CO_GAMES.code = {ic:'🧊', name:() => L('Код', 'Code'),
  say:() => L('Один загадывает 4 предмета, другой угадывает: 🟢 — на месте, 🟡 — есть, но не тут. Можно по ссылке в WhatsApp!', 'One hides 4 items, the other guesses: 🟢 — right spot, 🟡 — there, but elsewhere. Works over a WhatsApp link!'),
  wins:() => { const w = iceSave().wins; return w ? `🧊 ${L(`Разгадано кодов: ${w}`, `Codes cracked: ${w}`)}` : ''; },
  picks:() => {
    const ping = typeof pengMet === 'function' && pengMet();
    return `<button data-k="rand"><span class="ic">${ping ? '🐧' : '🌊'}</span><b>${ping ? L('Загадка Пинга', 'Ping\'s puzzle') : L('Загадка', 'Puzzle')}</b><small>${L('угадай 4 предмета', 'guess 4 items')}</small></button>
      <button data-k="make"><span class="ic">✉️</span><b>${L('Загадать', 'Make one')}</b><small>${L('для папы или друга', 'for Dad or a friend')}</small></button>
      <button data-k="solve" class="wide"><span class="ic">🔑</span><b>${L('Отгадать код', 'Crack a code')}</b><small>${L('который прислали', 'that you were sent')}</small></button>`;
  }};
// ссылка …/?ice=КОД&from=Имя: сразу загадка (поверх первого экрана)
(function iceFromUrl(){
  const q = new URLSearchParams(location.search), c = q.get('ice');
  if(!c) return;
  try{ const u = new URL(location.href); u.searchParams.delete('ice'); u.searchParams.delete('from'); history.replaceState(null, '', u.href); }catch(e){}
  const d = iceDec(c);
  if(!d) return setTimeout(() => toast(L('Этот ледяной код не читается 🧊', 'That ice code can\'t be read 🧊')), 900);
  setTimeout(async () => {
    const intro = $('#intro'), was = !intro.hidden;
    if(!mgRoot.hidden) return;
    intro.hidden = true;
    coGame = 'code';
    await iceGame('solve', {...d, from:(q.get('from') || '').slice(0, 16)});
    if(was) intro.hidden = false;
  }, 700);
})();
