/* 🎬 Сцены и шаги истории (30.09.2026): история идёт по ходу игры, а не списком в книжке.
   — talk(lines, {ch, btns}) — сцена-разговор: внизу «наклейка» с рожицей, именем и репликой; текст печатается,
     касание — дальше, «Пропустить» — сразу к концу. ch — номер главы с нуля: сверху титул «Глава N». btns — кнопки
     под последней репликой ([{k, t, ghost}]), talk вернёт k нажатой. Реплика — {who: ключ из BT_WHO, t: текст}.
   — Пролог главы (BT_OPEN): глава открылась → в спокойную минуту герои рассказывают, что случилось, и зовут «Идём ▶».
     Глава 1 начинается с первого экрана, у главы 8 своя сцена (stStormArrive в story.js).
   — Шаг истории: пункт открытой главы сделан → сверху наклейка «📖 Шаг истории!» с точками главы;
     сделаны все — в ней кнопка «🎉 Праздник!».
   — Звезда дня: BT_DAY_NEED любых дел дня → сундучок (ракушки и сердечки малышу), раз в день (save.story.td.gift).
   Всё это проверяет btCheck() — его зовёт stCheck() в story.js раз в 2 с. Новая реплика — строчка в BT_OPEN,
   новый герой — строчка в BT_WHO. Своего в сохранении — только td.gift. Подключается сразу после story.js. */
const BT_DAY_NEED = 3, BT_DAY_GIFT = 10, BT_DAY_LOVE = 5;
const BT_WHO = {
  gull:  {ic:'🕊️', name:() => L('Чайка', 'Gull'), bg:'#DDF1FA', v:'caw'},
  pup:   {ic:'🦭', name:() => save.pet ? save.pet.name : L('Малыш', 'Pup'), bg:'#FFE3EC', v:'arf'},
  ping:  {ic:'🐧', name:() => L('Пинг', 'Ping'), bg:'#DCE6FF', v:'quack'},
  mum:   {ic:'🦭', name:() => L('Мама-тюлениха', 'Mother seal'), bg:'#EDE6F7', v:'mama'},
  turtle:{ic:'🐢', name:() => L('Черепаха', 'Turtle'), bg:'#DDF5EA', v:'pop'},
  cloud: {ic:'☁️', name:() => L('Туча', 'Cloud'), bg:'#E3E7F0', v:'grr'},
  bear:  {ic:'🐻‍❄️', name:() => L('Медведь', 'Bear'), bg:'#F3F0E6', v:'thud'},
  shark: {ic:'🦈', name:() => L('Акула', 'Shark'), bg:'#DCEAF2', v:'splash'},
  blot:  {ic:'🐙', name:() => L('Клякса', 'Blot'), bg:'#EBDDF7', v:'giggle'},
  tiny:  {ic:'🦭', name:() => L('Кроха', 'Tiny'), bg:'#DDF5EA', v:'arf'},
  ray:   {ic:'✨', name:() => L('Лучик', 'Little Ray'), bg:'#FFF1C9', v:'sparkle'}
};

/* ---------- сцена-разговор ---------- */
const tkEl = document.createElement('div');
tkEl.id = 'talk'; tkEl.className = 'talk'; tkEl.hidden = true;
tkEl.innerHTML = `<div class="tk-title" hidden><small></small><span class="ic" aria-hidden="true"></span><b class="display"></b></div>
  <button class="tk-skip">${L('Пропустить', 'Skip')} ⏭</button>
  <div class="tk-box"><span class="tk-face" aria-hidden="true"></span><b class="tk-name display"></b>
    <p class="tk-text" aria-live="polite"></p><span class="tk-more" aria-hidden="true">▶</span><div class="tk-btns" hidden></div></div>`;
$('#app').appendChild(tkEl);
let tkOn = false, tkTap = null, tkSkip = null;
tkEl.addEventListener('pointerdown', e => { if(e.target.closest('button')) return; e.preventDefault(); if(tkTap) tkTap(); });
tkEl.querySelector('.tk-skip').addEventListener('click', () => { if(tkSkip) tkSkip(); });
addEventListener('keydown', e => {   // с клавиатуры: пробел или Enter — дальше (когда под репликой кнопки — выбирает сама)
  if(!tkOn || e.key !== ' ' && e.key !== 'Enter' || !tkEl.querySelector('.tk-btns').hidden) return;
  e.preventDefault(); e.stopPropagation(); if(tkTap) tkTap();
}, true);
function talk(lines, {ch = -1, btns = null} = {}){
  lines = lines.filter(Boolean);
  if(!lines.length || tkOn) return Promise.resolve(null);
  return new Promise(done => {
    const q = s => tkEl.querySelector(s), box = q('.tk-box'), text = q('.tk-text'), more = q('.tk-more'), bt = q('.tk-btns'), ttl = q('.tk-title');
    const was = busy; if(!was) setBusy(true);
    tkOn = true; document.body.classList.add('talk-on'); $('#toast').hidden = true;
    if(typeof ISL !== 'undefined' && ISL){ const R = ISL.R; R.hold = false; R.tgt = null; R.goal = null; R.key.set(0, 0, 0); }   // на острове малыш встаёт послушать
    ttl.hidden = ch < 0;
    if(ch >= 0){ ttl.querySelector('small').textContent = L(`Глава ${ch + 1}`, `Chapter ${ch + 1}`); ttl.querySelector('.ic').textContent = STORY[ch].ic; ttl.querySelector('b').textContent = STORY[ch].name; }
    let i = -1, chars = [], n = 0, timer = 0;
    const end = k => {
      clearInterval(timer); tkTap = tkSkip = null; tkEl.hidden = true; tkOn = false; document.body.classList.remove('talk-on');
      if(!was) setBusy(false);
      done(k);
    };
    const full = () => {
      clearInterval(timer); n = chars.length; text.textContent = chars.join('');
      const last = i === lines.length - 1;
      more.hidden = last && !!btns; bt.hidden = !(last && btns);
    };
    const line = () => {
      const ln = lines[i], W = BT_WHO[ln.who] || BT_WHO.gull;
      q('.tk-face').textContent = W.ic; q('.tk-face').style.background = W.bg; q('.tk-name').textContent = W.name();
      box.classList.remove('in'); void box.offsetWidth; box.classList.add('in');
      if(sfx[W.v]) sfx[W.v]();
      chars = Array.from(ln.t); n = 0; text.textContent = ''; more.hidden = true; bt.hidden = true; q('.tk-skip').hidden = i === lines.length - 1;
      clearInterval(timer);
      if(reduced) return full();
      timer = setInterval(() => { n = Math.min(chars.length, n + 2); text.textContent = chars.slice(0, n).join(''); if(n >= chars.length) full(); }, 34);
    };
    tkTap = () => {
      if(n < chars.length) return full();       // первое касание — допечатать
      if(i + 1 < lines.length){ i++; sfx.tick(); line(); }
      else if(!btns) end(null);
    };
    tkSkip = () => { sfx.tap(); if(!btns) return end(null); i = lines.length - 1; line(); full(); };
    bt.innerHTML = (btns || []).map(b => `<button class="btn${b.ghost ? ' ghost small' : ''}" data-k="${b.k}">${stEsc(b.t)}</button>`).join('');
    bt.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { sfx.tap(); end(b.dataset.k); }));
    tkEl.hidden = false; i = 0; line();
  });
}

/* ---------- прологи глав ----------
   go — куда зовёт «Идём ▶» (место из ST_PLACES), lines() — реплики (пустые выпадают: так герой говорит, только если уже знаком). */
const btT = (who, ru, en) => ({who, t:L(ru, en)});
const BT_OPEN = [
  null,
  {go:'pet', lines:() => save.pet ? [
    btT('gull', `Доктор ${pname()}! У твоей льдины теперь живёт малыш. Я видела — ${gg('он', 'она')} уже машет ластой!`, `Doctor ${pname()}! A pup lives by your ice floe now. I saw ${gg('him', 'her')} waving a flipper!`),
    btT('pup', `Ар! Хочу гулять, учить трюки и кататься с горки!`, `Arf! I want walks, tricks and a ride down the slide!`),
    btT('gull', `Заботься о ${gg('нём', 'ней')} каждый день — и однажды ${gg('он засияет', 'она засияет')} ✨`, `Look after ${gg('him', 'her')} every day — and one day ${gg('he', 'she')} will shine ✨`)
  ] : [
    btT('gull', `Доктор ${pname()}! У льдины кто-то маленький. Кажется, ждёт тебя…`, `Doctor ${pname()}! Someone small is by the ice floe. Waiting for you, I think…`),
    btT('gull', `Вылечи пациента — и познакомитесь!`, `Heal a patient and you two will meet!`)
  ]},
  {go:'rescue', lines:() => [
    btT('gull', `Беда! Море волнуется, и малыши потерялись кто где!`, `Trouble! The sea is restless, and the little ones got lost all over!`),
    btT('mum', `Мой Кроха уплыл в бухту и не вернулся… Помогите!`, `My Tiny swam off to the bay and never came back… Please help!`),
    btT('pup', `Не плачь! Доктор ${pname()} и я — мы всех найдём!`, `Don't cry! Doctor ${pname()} and I will find them all!`),
    typeof nbIn === 'function' && nbIn() && btT('ping', `Кря! Я с вами. Я прыгаю выше всех!`, `Quack! I'm coming too. I jump higher than anyone!`)
  ]},
  {go:'dive', lines:() => [
    btT('gull', `В бухте кто-то большой… С плавником! 🦈`, `Someone big is in the bay… With a fin! 🦈`),
    btT('pup', `Ой. А она страшная?`, `Uh-oh. Is it scary?`),
    btT('turtle', `Хм-м. Она всё время за кем-то гонится. Вот только зачем?..`, `Hmm. It is always chasing someone. But why?..`),
    btT('gull', `Ныряй — и узнаешь. А если что, прячься в водорослях!`, `Dive in and find out. And if anything happens, hide in the seaweed!`)
  ]},
  {go:'dive', lines:() => [
    btT('gull', `Из грота ползёт что-то тёмное. Все рыбки попрятались!`, `Something dark is creeping out of the grotto. All the fish are hiding!`),
    btT('pup', `Там темно… Но слышишь? Кто-то тихонько плачет.`, `It's dark in there… But listen — someone is crying softly.`),
    save.dive.shark.tooth > 1 && btT('shark', `Я тоже была «страшная». А у меня просто болел зуб!`, `I was “scary” too. I just had a toothache!`),
    btT('gull', `Страшилки иногда просто грустят. Посмотрим, кто там?`, `Scary things are sometimes just sad. Shall we see who it is?`)
  ]},
  {go:'road', lines:() => [
    btT('gull', `Большая Туча опять засыпала льдину снегом! Ворчит и ворчит.`, `The Big Cloud buried the ice in snow again! Grumble, grumble.`),
    btT('cloud', `Р-р-р! Уходите! А… а… апчхи!`, `Grrr! Go away! Ah… ah… achoo!`),
    btT('pup', `Она чихнула… Может, ей нездоровится?`, `She sneezed… Maybe she isn't feeling well?`),
    btT('gull', `К ней ведёт длинная дорога. Вдвоём бежать веселее!`, `A long road leads to her. It's more fun to run it together!`)
  ]},
  {go:'home', lines:() => [
    btT('pup', `У нас столько друзей! А позвать их некуда…`, `We have so many friends! But nowhere to invite them…`),
    save.pt.bear ? btT('bear', `Я сильный. Построю в иглу новую комнату — только скажи!`, `I'm strong. I'll build a new room in the igloo — just say the word!`)
      : btT('gull', `Обставь иглу — и будет самый уютный дом на острове!`, `Furnish the igloo and it'll be the cosiest home on the island!`),
    save.dive.gloom.st >= 3 && btT('blot', `А за стеклом буду светиться я. Ночью — красивее всего!`, `And I'll glow behind the glass. It's prettiest at night!`),
    btT('gull', `Все твои рыбки и друзья из бухты поселятся рядом.`, `All your fish and friends from the bay will live next door.`)
  ]},
  null
];
const btIsle = () => typeof ISL !== 'undefined' && !!ISL && !ISL.fishing;
// спокойная минута: ничего не открыто и не идёт (на прогулке по острову — тоже можно)
const btCalm = () => started && !tkOn && !document.querySelector('.overlay:not([hidden])') && !document.body.classList.contains('visit-on') && (btIsle() || mgRoot.hidden && !busy);
async function btPrologue(i){
  const sc = BT_OPEN[i]; save.story.seen = save.story.open; persist();
  if(!sc) return;
  sfx.paper();
  const P = ST_PLACES[sc.go];
  const k = await talk(sc.lines(), {ch:i, btns:[{k:'go', t:`${P.ic} ${L('Идём', 'Let\'s go')} ▶`}, {k:'no', t:L('Потом', 'Later'), ghost:true}]});
  stCheck();
  if(k !== 'go') return toast(L(`Глава ${i + 1} ждёт в Книге острова 📖`, `Chapter ${i + 1} waits in the Island book 📖`), 3000);
  if(btIsle() && typeof islWalkTo === 'function'){ if(!islWalkTo(sc.go)) toast(L(`Ищи на острове: ${P.ic} ${P.name}`, `Look for it on the island: ${P.ic} ${P.name}`), 3000); }
  else stGo(sc.go);
}

// 🎬 на странице главы в книжке: посмотреть начало главы ещё раз (без кнопок — просто сцена)
function btReplay(i){ if(BT_OPEN[i] && !tkOn){ sfx.paper(); talk(BT_OPEN[i].lines(), {ch:i}); } }

/* ---------- наклейка сверху: шаг истории, дело дня, сундучок ---------- */
const btEl = document.createElement('button');
btEl.id = 'beat'; btEl.className = 'beat'; btEl.hidden = true;
$('#app').appendChild(btEl);
let btShown = null, btTimer = 0;
const btQ = [];
function btHide(){ clearTimeout(btTimer); btEl.hidden = true; btShown = null; }
function btShow(o, html, ms){
  btShown = o; btEl.innerHTML = html; btEl.className = 'beat ' + (o.cls || '');
  btEl.hidden = false; btEl.style.animation = 'none'; void btEl.offsetWidth; btEl.style.animation = '';
  clearTimeout(btTimer); if(ms) btTimer = setTimeout(btHide, ms);
}
btEl.addEventListener('click', () => {
  const o = btShown; if(!o) return;
  sfx.tap();
  if(o.gift) return btDayGift(btEl);
  btHide();
  if(o.day || tkOn) return;
  if(stFestReady(o.i) || !btIsle()) stOpenAt(o.i);   // на острове книжку открываем только ради праздника
});
// какие пункты глав уже были сделаны, когда игру открыли; новые — в очередь
const btKey = (i, j) => i*100 + j, btSeen = new Set();
STORY.forEach((c, i) => c.items.forEach((it, j) => { if(stItemDone(it)) btSeen.add(btKey(i, j)); }));
function btScan(){
  STORY.forEach((c, i) => c.items.forEach((it, j) => {
    const k = btKey(i, j);
    if(btSeen.has(k) || !stItemDone(it)) return;
    btSeen.add(k);
    if(i < save.story.open && !save.story.fest.includes(i + 1)) btQ.push({i, j});
  }));
  while(btQ.filter(o => !o.day).length > 2) btQ.splice(btQ.findIndex(o => !o.day), 1);   // загрузили другое сохранение — не сыпем десятком наклеек
}
function btStep(o){
  const c = STORY[o.i], it = c.items[o.j], fest = stFestReady(o.i);
  const dots = c.items.map((x, j) => `<i class="${stItemDone(x) ? 'y' : ''}${j === o.j ? ' new' : ''}"></i>`).join('');
  sfx.star();
  btShow(o, `<small>📖 ${L('Шаг истории!', 'A story step!')}</small>
    <b><span class="ok" aria-hidden="true">✓</span>${it.ic} ${stEsc(it.t)}</b>
    <span class="ln"><em>${L(`Глава ${o.i + 1} · ${stEsc(c.name)}`, `Chapter ${o.i + 1} · ${stEsc(c.name)}`)}</em><span class="dots">${dots}</span></span>
    ${fest ? `<span class="cta display">🎉 ${L('Праздник главы!', 'Chapter party!')} ▶</span>` : ''}`, fest ? 9000 : 4600);
}
// звезда дня: сколько дел сделано сегодня и сколько нужно (дел может быть меньше трёх — тогда все)
function btDay(){
  const list = stTodayList(), td = save.story.td;
  return {n:Math.min(td.ok.length, BT_DAY_NEED), need:Math.max(1, Math.min(BT_DAY_NEED, list.length)), gift:!!td.gift, list};
}
let btDayD = save.story.td.d, btDayN = save.story.td.d === stDay() ? save.story.td.ok.length : 0;
function btDayScan(){
  const d = btDay(), td = save.story.td;
  if(td.d !== btDayD){ btDayD = td.d; btDayN = 0; }
  if(td.ok.length > btDayN){
    const id = td.ok[td.ok.length - 1]; btDayN = td.ok.length; persist();
    if(!d.gift) btQ.push({day:true, id});
  }
}
const btSlots = d => `<span class="dots big">${Array.from({length:d.need}, (x, k) => `<i class="${k < d.n ? 'y' : ''}"></i>`).join('')}</span>`;
function btDayShow(o){
  const d = btDay(); if(d.gift) return;
  const it = TODAY.find(x => x.id === o.id), ready = d.n >= d.need;
  ready ? sfx.star() : sfx.good();
  btShow({...o, gift:ready, cls:'day'}, `<small>☀️ ${L('Дело дня сделано!', 'A thing of the day is done!')}</small>
    <b><span class="ok" aria-hidden="true">✓</span>${it ? it.ic + ' ' + stEsc(it.t()) : ''}</b>
    <span class="ln"><em>⭐ ${L('Звезда дня', 'Star of the day')}</em>${btSlots(d)}</span>
    ${ready ? `<span class="cta display">🎁 ${L('Открыть сундучок!', 'Open the chest!')} ▶</span>` : ''}`, ready ? 12000 : 3800);
}
// сундучок дня: из наклейки или из «Сегодня» в книжке (el — откуда летят ракушки)
function btDayGift(el){
  const d = btDay(); if(d.gift || d.n < d.need) return;
  save.story.td.gift = true;
  if(save.pet) save.pet.xp += BT_DAY_LOVE;   // без petGive: малыш может быть не на экране
  persist();
  const r = el.getBoundingClientRect();
  sfx.coin(); addShells(BT_DAY_GIFT, {x:r.left + r.width/2, y:r.top + r.height/2});
  btShow({day:true, cls:'day'}, `<small>🎁 ${L('Сундучок дня', 'Chest of the day')}</small>
    <b>+${BT_DAY_GIFT} 🐚${save.pet ? `  +${BT_DAY_LOVE} 💗` : ''}</b>
    <span class="ln"><em>${L('День удался! Завтра на острове будет новое ♡', 'What a day! Something new on the island tomorrow ♡')}</em></span>`, 4200);
  if(!$('#story').hidden) stRender();
}
// строка «⭐ Звезда дня» над делами дня в книжке (stTodayHtml)
function btDayRow(){
  const d = btDay(), left = d.need - d.n;
  return `<div class="st-day${d.gift ? ' got' : ''}"><span class="t display">⭐ ${L('Звезда дня', 'Star of the day')}</span>${btSlots(d)}
    ${d.gift ? `<span class="note">🎁 ✓</span>` : left > 0 ? `<span class="note">${L(`ещё ${left}`, `${left} to go`)} → 🎁</span>`
      : `<button class="go" data-daygift="1">🎁 ${L('Открыть', 'Open')}</button>`}</div>`;
}

/* ---------- раз в 2 с (из stCheck): что нового показать; true — заняли экран, остальным зовам подождать ---------- */
function btCheck(){
  btScan(); btDayScan();
  if(tkOn || btShown) return !!tkOn;
  if(!btCalm()) return false;
  const st = save.story;
  if(btQ.length){ const o = btQ.shift(); o.day ? btDayShow(o) : btStep(o); return false; }
  if(st.open > st.seen && st.open < STORY.length){ btPrologue(st.open - 1); return true; }
  return false;
}
