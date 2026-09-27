/* «Книга острова» и «Сегодня на острове» (Спринт 5, задача 2).
   📖 в углу (и «🗺️ Что сегодня?» на первом экране) открывает книжку с двумя вкладками:
   — «Сегодня»: карта острова — метки мест, где сегодня что-то ждёт, — и дела дня с галочками. Без серий и штрафов:
     не сделала — завтра будут новые.
   — «Главы»: 8 глав истории. Пункты глав считаются из того, что уже лежит в сохранении (ничего нового не копим).
     Следующая глава открывается, когда в текущей сделана половина; праздник главы — когда сделано всё.
     Пункты «скоро» — то, что ещё строим (Великий шторм):
     пока их нет, праздник такой главы впереди.
   Своё в сохранении — save.story (sanitizeStory в data.js):
     open — сколько глав открыто, fest:[номера отпразднованных глав], seen — сколько открытых глав уже показали,
     pg — сколько было вылечено при прошлой проверке, hd — в какой день лечили, td:{d, ok:[дела дня, уже сделанные сегодня]}. */
const ST_GIFT = [15, 20, 20, 25, 25, 25, 30, 50];   // ракушки за праздник главы 1…8

const stDay = () => new Date().toDateString();

/* ---------- места острова: куда ведёт метка на карте и кнопка «Идём» ----------
   pet — нужен свой малыш (почти всё начинается из его уголка). x, y — где метка на карте, в процентах. */
const ST_PLACES = {
  hosp:  {ic:'🏥', name:L('Больница', 'Hospital'),     x:22, y:25},
  mail:  {ic:'✉️', name:L('Почта', 'Mail'),            x:50, y:13},
  shop:  {ic:'🛍️', name:L('Лавка', 'Shop'),            x:10, y:52},
  pet:   {ic:'🦭', name:L('Малыш', 'Pup'),             x:50, y:42, pet:true},
  home:  {ic:'🏠', name:L('Иглу', 'Igloo'),            x:78, y:40, pet:true},
  walk:  {ic:'🐾', name:L('Прогулка', 'Walk'),         x:33, y:60, pet:true},
  run:   {ic:'🏔️', name:L('Забег', 'Run'),             x:80, y:14, pet:true},
  road:  {ic:'🛣️', name:L('Дорога', 'Road'),          x:86, y:62, pet:true},
  rescue:{ic:'🔎', name:L('Потеряшки', 'Lost pups'),   x:62, y:64, pet:true},
  dive:  {ic:'🤿', name:L('Бухта', 'Bay'),             x:28, y:86, pet:true},
  chase: {ic:'🦈', name:L('Салки', 'Tag'),             x:66, y:88, pet:true}
};

/* ---------- главы ----------
   Пункт: ic, t — текст, n() → [сколько есть, сколько нужно] или ok() → да/нет, go — место из ST_PLACES, soon — ещё строим. */
const stNum = v => Number.isFinite(v) ? v : 0;
const stLv = k => stNum(save.coop.resc.lv[k]);
const STORY = [
  {ic:'🩺', name:L('Доктор', 'Doctor'),
    about:L(`К льдине приплывают больные тюлени. Кто им поможет? Конечно, доктор ${pname()}!`, `Sick seals are swimming to the ice floe. Who will help them? Doctor ${pname()}, of course!`),
    end:L('Больнице дают флажок! Теперь он развевается над крышей 🚩', 'The hospital gets a flag! Now it waves over the roof 🚩'),
    items:[
      {ic:'🩺', t:L('Вылечи первого пациента', 'Heal your first patient'), n:() => [save.progress, 1], go:'hosp'},
      {ic:'⭐', t:L('Отработай целую смену', 'Work a whole shift'), n:() => [save.shifts, 1], go:'hosp'},
      {ic:'🛍️', t:L('Купи подарок в лавке', 'Buy something in the shop'), n:() => [save.owned.length, 1], go:'shop'},
      {ic:'📷', t:L('Вылечи 10 пациентов', 'Heal 10 patients'), n:() => [save.progress, 10], go:'hosp'}
    ]},
  {ic:'🍼', name:L('Малыш', 'Pup'),
    about:L('После смены у льдины кто-то ждёт… Это твой малыш! Вырасти его — пусть засияет.', 'After a shift someone is waiting by the ice… It is your pup! Raise it until it shines.'),
    end:L('Праздник роста! Малыш засиял — вы лучшие друзья навсегда ✨', 'A growing-up party! Your pup shines — best friends forever ✨'),
    items:[
      {ic:'🦭', t:L('Познакомься с малышом', 'Meet your pup'), ok:() => !!save.pet, go:'hosp'},
      {ic:'🐾', t:L('Малыш подрос', 'Your pup grows up'), n:() => [save.pet ? save.pet.stage : 0, 1], go:'pet'},
      {ic:'🎁', t:L('Найди 3 находки на прогулке', 'Find 3 treasures on walks'), n:() => [save.pet ? save.pet.finds.length : 0, 3], go:'walk'},
      {ic:'🎓', t:L('Выучи трюк на три звезды', 'Learn a trick to three stars'), ok:() => !!save.pet && Object.values(save.pet.tricks).some(v => v >= 3), go:'pet'},
      {ic:'✨', t:L('Малыш засиял', 'Your pup shines'), n:() => [save.pet ? save.pet.stage : 0, typeof SHINY === 'number' ? SHINY : 4], go:'pet'}
    ]},
  {ic:'🔎', name:L('Потеряшки', 'Lost pups'),
    about:L('Малыши потерялись в бухте, в гроте, в метели, в тёмной пещере и в подводном лесу. Их мамы очень волнуются!', 'Little ones got lost in the bay, the grotto, the blizzard, a dark cave and a kelp forest. Their mums are so worried!'),
    end:L('Все мамы нашли своих малышей и теперь приходят в гости 💗', 'Every mum found her little one, and now they come to visit 💗'),
    items:[
      {ic:'🌊', t:L('Найди потеряшку в Бухте', 'Find the lost pup in the Bay'), n:() => [stLv('bay'), 1], go:'rescue'},
      {ic:'🕯️', t:L('Найди потеряшку в Гроте', 'Find the lost pup in the Grotto'), n:() => [stLv('grot'), 1], go:'rescue'},
      {ic:'❄️', t:L('Найди потеряшку в Метели', 'Find the lost pup in the Blizzard'), n:() => [stLv('snow'), 1], go:'rescue'},
      {ic:'✨', t:L('Принеси свет Лучику в Пещеру сияния', 'Bring light to Little Ray in the Shining Cave'), n:() => [stLv('glow'), 1], go:'rescue'},
      {ic:'🌿', t:L('Спаси калана Пуговку в подводном лесу', 'Save Button the sea otter in the kelp forest'), n:() => [stLv('kelp'), 1], go:'rescue'},
      {ic:'🎉', t:L('Праздник мам (и кто-то рычит…)', 'The mums\' party (and someone growls…)'), n:() => [stLv('fest'), 1], go:'rescue'}
    ]},
  {ic:'🦈', name:L('Акула', 'Shark'),
    about:L('В бухте живёт акула. Страшная? Посмотрим… И почему она всё время гонится за тобой?', 'A shark lives in the bay. Scary? We\'ll see… And why does it keep chasing you?'),
    end:L('Акула теперь друг и катает тебя на спине 🦈', 'The shark is your friend now and gives you rides 🦈'),
    items:[
      {ic:'🫣', t:L('Спрячься от акулы в бухте', 'Hide from the shark in the bay'), ok:() => save.dive.shark.hid > 0 || save.dive.shark.friend, go:'dive'},
      {ic:'🏁', t:L('Доплыви в «Салках» 3 раза', 'Finish «Tag» 3 times'), n:() => [save.dive.chase.n, 3], go:'chase'},
      {ic:'⭐', t:L('Три звезды в «Салках»', 'Three stars in «Tag»'), n:() => [save.dive.chase.best, 3], go:'chase'},
      {ic:'🦷', t:L('Акула застряла… Что с ней?', 'The shark is stuck… What is wrong?'), ok:() => save.dive.shark.tooth > 0, go:'chase'},
      {ic:'🩺', t:L('Вылечи акуле зуб в больнице', 'Fix the shark\'s tooth in the hospital'), ok:() => save.dive.shark.tooth > 1, go:'hosp'},
      {ic:'🌊', t:L('Покатайся на акуле в бухте', 'Ride the shark in the bay'), ok:() => !!save.dive.shark.ride, go:'dive'}
    ]},
  {ic:'🌑', name:L('Мгла', 'Gloom'),
    about:L('Из грота выползает тёмная Мгла, и все прячутся. Но что там за тихий плач?', 'A dark Gloom creeps out of the grotto and everyone hides. But what is that quiet crying?'),
    end:L('Клякса светится в гроте — теперь она ваша соседка 🐙', 'Blot glows in the grotto — she is your neighbour now 🐙'),
    items:[
      {ic:'🌑', t:L('Встреть Мглу в бухте', 'Meet the Gloom in the bay'), n:() => [save.dive.gloom.met, 1], go:'dive'},
      {ic:'🛢️', t:L('Найди бочку', 'Find the barrel'), n:() => [save.dive.gloom.st, 1], go:'dive'},
      {ic:'💧', t:L('Услышь, как плачет Мгла', 'Hear the Gloom crying'), n:() => [save.dive.gloom.st, 2], go:'dive'},
      {ic:'🐙', t:L('Спаси Кляксу', 'Save Blot'), n:() => [save.dive.gloom.st, 3], go:'dive'}
    ]},
  {ic:'☁️', name:L('Туча', 'Cloud'),
    about:L('Большая Туча засыпает льдину снегом и ворчит. Может, ей просто одиноко?', 'The Big Cloud buries the ice in snow and grumbles. Maybe it is just lonely?'),
    end:L('Туча больше не ворчит и поливает сад дождиком 🌧️', 'The Cloud no longer grumbles and waters the garden with rain 🌧️'),
    items:[
      {ic:'🛣️', t:L('Добеги «Дорогу к Туче»', 'Finish «Road to the Cloud»'), n:() => [save.coop.road, 1], go:'road'},
      {ic:'🎯', t:L('Выполни задание дороги дня', 'Do the task of the road of the day'), ok:() => !!save.coop.rday, go:'road'},
      {ic:'☁️', t:L('Победи Большую Тучу', 'Beat the Big Cloud'), n:() => [save.coop.wins, 1], go:'road'},
      {ic:'🤧', t:L('Три дня дороги: почему Туча ворчит?', 'Three days of the road: why does the Cloud grumble?'), n:() => [save.coop.cs.n, 3], go:'road'},
      {ic:'🩺', t:L('Вылечи Тучу в больнице', 'Make the Cloud better in the hospital'), ok:() => save.coop.cs.cure > 1, go:'hosp'},
      {ic:'🌧️', t:L('Туча поливает подводный сад', 'The Cloud waters the underwater garden'), ok:() => !!save.coop.cs.rain, go:'dive'}
    ]},
  {ic:'🏠', name:L('Дом', 'Home'),
    about:L('У малыша есть своё иглу. Сделай его самым уютным домом на острове!', 'Your pup has its own igloo. Make it the cosiest home on the island!'),
    end:L('Новоселье! Все друзья пришли в гости 🏠', 'A house-warming party! All your friends came over 🏠'),
    items:[
      {ic:'🚪', t:L('Загляни в иглу', 'Peek into the igloo'), ok:() => save.home.v, go:'home'},
      {ic:'🛋️', t:L('Обставь 5 мест в иглу', 'Furnish 5 spots in the igloo'), n:() => [Object.keys(save.home.s).length, 5], go:'home'},
      {ic:'🐟', t:L('Поймай 5 разных рыбок моря', 'Catch 5 different sea fish'), n:() => [save.sea.got.length, 5], go:'hosp'},
      {ic:'📸', t:L('Сфотографируй 8 жителей бухты', 'Photograph 8 bay creatures'), n:() => [save.dive.seen.length, 8], go:'dive'},
      {ic:'🦀', t:L('Позови 3 жителей бухты в аквариум', 'Invite 3 bay creatures to the fish tank'), n:() => [save.dive.tank.length, 3], go:'dive'},
      {ic:'🍤', t:L('Покорми рыбок в аквариуме', 'Feed the fish in the tank'), ok:() => !!save.home.fed, go:'home'}
    ]},
  {ic:'🌪️', name:L('Великий шторм', 'The Great Storm'),
    about:L('Небо темнеет на горизонте… Эта глава ещё впереди.', 'The sky is darkening on the horizon… This chapter is still ahead.'),
    end:L('Шторм ушёл, над островом радуга 🌈', 'The storm is gone, and there is a rainbow over the island 🌈'),
    items:[
      {ic:'🚨', t:L('Тревога', 'The alarm'), soon:true},
      {ic:'🛟', t:L('Спасаем всех', 'Save everyone'), soon:true},
      {ic:'🗼', t:L('Держим маяк', 'Hold the lighthouse'), soon:true},
      {ic:'🌈', t:L('Глаз бури', 'The eye of the storm'), soon:true}
    ]}
];
function stItemDone(it){
  if(it.soon) return false;
  try{ if(it.n){ const [a, b] = it.n(); return stNum(a) >= b; } return !!it.ok(); }catch(e){ return false; }
}
function stChapter(i){
  const c = STORY[i], done = c.items.filter(stItemDone).length;
  return {c, done, all:c.items.length, full:done === c.items.length, half:done >= Math.ceil(c.items.length/2)};
}
// открываем главы по порядку, пока в последней открытой сделана половина
function stOpenUp(){
  const st = save.story; let grew = false;
  while(st.open < STORY.length && stChapter(st.open - 1).half){ st.open++; grew = true; }
  return grew;
}
const stFestReady = i => i < save.story.open && !save.story.fest.includes(i + 1) && stChapter(i).full;
const stNews = () => save.story.open > save.story.seen || STORY.some((c, i) => stFestReady(i));

/* ---------- дела на сегодня ----------
   show — есть ли это дело сегодня вообще, done — сделано. Что сделали сегодня, помним в td.ok: галочка остаётся до завтра,
   даже если дело потом «исчезло» (гостя бухты сфотографировали — он больше не гость). */
const stGardenGift = () => [0, 1, 2].some(i => dvStage(i) === 2 && save.dive.gh[i] !== stDay());
const TODAY = [
  {id:'hosp', ic:'🩺', t:() => L('Вылечи пациента', 'Heal a patient'), show:() => true, done:() => save.story.hd === stDay(), go:'hosp'},
  {id:'mail', ic:'💌', t:() => L('Прочитай письмо от папы', 'Read Dad\'s letter'), show:() => !!mailWaiting || save.mail.d === ymd(),
    done:() => !mailWaiting, go:'mail'},
  {id:'care', ic:'🦭', t:() => L(`Позаботься о малыше: ${save.pet.name}`, `Take care of ${save.pet.name}`), show:() => !!save.pet,
    done:() => !petLow(), go:'pet'},
  {id:'find', ic:'🐾', t:() => L('Находка дня на прогулке', 'Treasure of the day on a walk'), show:() => !!save.pet && !foundAll(),
    done:() => !walkGiftToday(), go:'walk'},
  {id:'ping', ic:'🐧', t:() => { const a = pingAsk(nbQuest().id); return L(`Просьба Пинга ${a ? a.ic : ''}`, `Ping's wish ${a ? a.ic : ''}`); },
    show:() => nbIn(), done:() => nbQuest().ok, go:'pet'},
  {id:'quest', ic:'🏔️', t:() => L('Задания дня в забеге', 'Run tasks of the day'), show:() => !!save.pet,
    n:() => { const q = advQuests(); return [q.done.length, q.ids.length || 3]; }, go:'run'},
  {id:'road', ic:'🛣️', t:() => { const T = crTheme(); return L(`Дорога дня${T ? ': ' + T.ic + ' ' + T.name : ''}`, `Road of the day${T ? ': ' + T.ic + ' ' + T.name : ''}`); },
    show:() => !!save.pet, done:() => crTaskDone(), go:'road'},
  {id:'tooth', ic:'🦷', t:() => L('Акула ждёт в больнице: болит зуб!', 'The shark is waiting in the hospital: toothache!'), show:() => save.dive.shark.tooth === 1,
    done:() => false, go:'hosp'},
  {id:'cloud', ic:'☁️', t:() => L(`Почему Туча ворчит? Этап ${Math.min(3, save.coop.cs.n + 1)} из 3`, `Why does the Cloud grumble? Stage ${Math.min(3, save.coop.cs.n + 1)} of 3`),
    show:() => !!save.pet && save.coop.cs.n < 3 && save.coop.cs.d !== advDayKey() || save.coop.cs.d === advDayKey() && save.coop.cs.cure === 0, done:() => save.coop.cs.d === advDayKey(), go:'road'},
  {id:'cloudsick', ic:'🤧', t:() => L('Туча ждёт в больнице: простыла!', 'The Cloud is waiting in the hospital: she has a cold!'), show:() => save.coop.cs.cure === 1,
    done:() => false, go:'hosp'},
  {id:'ride', ic:'🌊', t:() => L('Покатайся на акуле в бухте', 'Ride the shark in the bay'), show:() => !!save.pet && save.dive.shark.tooth === 2,
    done:() => save.dive.shark.ride === dvToday(), go:'dive'},
  {id:'chase', ic:'🦈', t:() => { const T = chTheme(); return L(`Погоня дня${T ? ': ' + T.ic + ' ' + T.name : ''}`, `Chase of the day${T ? ': ' + T.ic + ' ' + T.name : ''}`); },
    show:() => !!save.pet, done:() => save.dive.chase.day.d === stDay() && save.dive.chase.day.n > 0, go:'chase'},
  {id:'garden', ic:'🌱', t:() => L('Рыбка-садовник ждёт с подарком', 'The gardener fish has a gift'), show:() => !!save.pet && stGardenGift(),
    done:() => !stGardenGift(), go:'dive'},
  {id:'guest', ic:'🤿', t:() => { const d = dvDef(dvGuest()); return L(`Гость бухты: ${d ? d.ic + ' ' + d.name : ''}`, `Bay guest: ${d ? d.ic + ' ' + d.name : ''}`); },
    show:() => !!save.pet && !save.dive.seen.includes(dvGuest()), done:() => save.dive.seen.includes(dvGuest()), go:'dive'},
  {id:'feed', ic:'🍤', t:() => L('Покорми рыбок в аквариуме', 'Feed the fish in the tank'), show:() => !!save.pet && /^tank_/.test(save.home.s.tank || ''),
    done:() => save.home.fed === stDay(), go:'home'}
];
function stTodayList(){
  const td = save.story.td, out = [];
  if(td.d !== stDay()){ td.d = stDay(); td.ok = []; }
  for(const it of TODAY){
    let show = false, done = false, n = null;
    try{
      show = it.show() || td.ok.includes(it.id);
      if(!show) continue;
      if(it.n){ n = it.n(); done = n[0] >= n[1]; } else done = !!it.done();
    }catch(e){ continue; }
    if(done && !td.ok.includes(it.id)) td.ok.push(it.id);
    if(!done && td.ok.includes(it.id)) done = true;   // сделали сегодня — галочка до завтра
    out.push({it, done, n});
  }
  return out;
}

/* ---------- раз в пару секунд: лечили ли сегодня, новые главы, значок на 📖 ---------- */
let stToldNews = false;
function stCheck(){
  const st = save.story;
  if(save.progress > st.pg){ st.hd = stDay(); st.pg = save.progress; persist(); }
  if(save.progress < st.pg) st.pg = save.progress;   // загрузили другой код сохранения
  const grew = stOpenUp();
  if(grew) persist();
  const news = stNews();
  const b = $('#storyAlert'); if(b) b.hidden = !news;
  const calm = started && $('#intro').hidden && $('#story').hidden && mgRoot.hidden && !busy;
  if(news && !stToldNews && calm){ stToldNews = true; toast(L('📖 В Книге острова что-то новое! Нажми на книжку', '📖 Something new in the Island book! Tap the book'), 3400); }
  if(!news) stToldNews = false;
}

/* ---------- книжка ---------- */
let stTab = 'today', stCh = -1;   // stCh — открытая глава (−1 — список глав)
function stOpen(tab){
  sfx.paper(); stCheck();
  if(tab) stTab = tab;
  else if(save.story.open > save.story.seen || STORY.some((c, i) => stFestReady(i))) stTab = 'book';   // есть новости — сразу к главам
  stCh = -1; stRender(); $('#story').hidden = false; document.body.classList.add('story-on');
}
function stClose(){ $('#story').hidden = true; document.body.classList.remove('story-on'); stCheck(); }
const stEsc = t => String(t).replace(/[&<>"]/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'})[c]);
function stRender(){
  document.querySelectorAll('#storyTabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === stTab));
  const body = $('#storyBody');
  body.innerHTML = stTab === 'today' ? stTodayHtml() : stCh < 0 ? stBookHtml() : stChapterHtml(stCh);
  body.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { sfx.tap(); stGo(b.dataset.go); }));
  body.querySelectorAll('[data-ch]').forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.ch; sfx.tap();
    if(i >= save.story.open) return toast(L(`Эта глава откроется, когда в главе «${STORY[i - 1].name}» будет сделана половина`, `This chapter opens when half of «${STORY[i - 1].name}» is done`), 3200);
    stCh = i; stRender(); $('#story').scrollTop = 0;
  }));
  const back = body.querySelector('#stBack'); if(back) back.addEventListener('click', () => { sfx.tap(); stCh = -1; stRender(); });
  const fest = body.querySelector('#stFest'); if(fest) fest.addEventListener('click', () => stFest(stCh));
  if(stTab === 'book' && stCh < 0 && save.story.seen < save.story.open){ save.story.seen = save.story.open; persist(); stCheck(); }
}
// карта острова: вода, большая льдина, горка и маленькие льдинки; метки мест поверх
const ST_MAP_SVG = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
  <path d="M0 76 Q12 72 24 76 T50 76 T76 76 T100 76 V100 H0Z" fill="#6FC0DF"/>
  <path d="M4 22 Q6 6 30 6 Q58 2 82 6 Q98 10 96 34 Q98 62 84 72 Q60 80 34 76 Q8 74 4 56 Q0 38 4 22Z" fill="#D6EAF5" stroke="#3B3A4A" stroke-width=".9"/>
  <path d="M66 24 L80 6 L94 24Z" fill="#fff" stroke="#3B3A4A" stroke-width=".8" stroke-linejoin="round"/>
  <path d="M18 88 q4 -3 8 0 M44 94 q4 -3 8 0 M78 94 q4 -3 8 0 M8 96 q3 -2 6 0" fill="none" stroke="#fff" stroke-width="1.1" stroke-linecap="round"/>
  <ellipse cx="90" cy="84" rx="6" ry="2.4" fill="#EAF6FB" stroke="#3B3A4A" stroke-width=".6"/>
</svg>`;
function stPinBadge(k, today){
  const t = today.filter(x => !x.done && x.it.go === k);
  return t.length ? `<span class="st-new" aria-hidden="true">${t.length > 1 ? t.length : '!'}</span>` : '';
}
function stTodayHtml(){
  const today = stTodayList(), left = today.filter(x => !x.done).length;
  const pins = Object.entries(ST_PLACES).map(([k, p]) => {
    const off = p.pet && !save.pet;
    return `<button class="st-pin${off ? ' off' : ''}" data-go="${k}" style="left:${p.x}%;top:${p.y}%"><span class="ic" aria-hidden="true">${off ? '🔒' : p.ic}</span>${off ? '' : stPinBadge(k, today)}<b>${stEsc(p.name)}</b></button>`;
  }).join('');
  const rows = today.map(({it, done, n}) => `<li class="${done ? 'done' : ''}">
    <span class="ic" aria-hidden="true">${it.ic}</span><span class="t">${stEsc(it.t())}${n && !done ? ` <small>${n[0]}/${n[1]}</small>` : ''}</span>
    ${done ? '<span class="ok" aria-label="Готово">✓</span>' : `<button class="go" data-go="${it.go}">${L('Идём', 'Go')} ▶</button>`}</li>`).join('');
  return `<div class="st-map">${ST_MAP_SVG}${pins}</div>
    <p class="st-sub display">${left ? L(`Сегодня на острове: ${left} ${plural(left, 'дело', 'дела', 'дел', 'thing', 'things')}`, `Today on the island: ${left} ${plural(left, '', '', '', 'thing', 'things')}`) : L('Всё на сегодня сделано! Завтра будет новое ♡', 'All done for today! Something new tomorrow ♡')}</p>
    <ul class="st-todo">${rows}</ul>`;
}
function stBookHtml(){
  const st = save.story;
  const tiles = STORY.map((c, i) => {
    const open = i < st.open, s = stChapter(i), fest = stFestReady(i), was = st.fest.includes(i + 1);
    const cls = !open ? 'lock' : fest ? 'fest' : was ? 'done' : '';
    const dots = c.items.map(it => `<i class="${stItemDone(it) ? 'y' : it.soon ? 's' : ''}"></i>`).join('');
    return `<button class="st-ch ${cls}" data-ch="${i}">
      <span class="ic" aria-hidden="true">${open ? c.ic : '🔒'}</span>
      <small>${L(`Глава ${i + 1}`, `Chapter ${i + 1}`)}</small><b>${open ? stEsc(c.name) : '???'}</b>
      ${open ? `<span class="dots">${dots}</span>` : ''}${fest ? `<span class="tag">🎉 ${L('Праздник!', 'Party!')}</span>` : was ? '<span class="tag ok">✓</span>' : ''}</button>`;
  }).join('');
  const got = st.fest.length;
  return `<p class="st-sub">${got ? L(`Прочитано глав: ${got} из ${STORY.length}`, `Chapters finished: ${got} of ${STORY.length}`) : L('Твоя история на острове. Делай пункты глав — и узнаешь, чем всё кончится!', 'Your story on the island. Do the chapter steps and find out how it ends!')}</p>
    <div class="st-book">${tiles}</div>`;
}
function stChapterHtml(i){
  const c = STORY[i], was = save.story.fest.includes(i + 1), fest = stFestReady(i);
  const rows = c.items.map(it => {
    const done = stItemDone(it); let n = null;
    if(it.n && !done){ try{ n = it.n(); }catch(e){} }
    const prog = n && n[1] > 1 ? ` <small>${Math.min(stNum(n[0]), n[1])}/${n[1]}</small>` : '';
    return `<li class="${done ? 'done' : it.soon ? 'soon' : ''}"><span class="ic" aria-hidden="true">${it.ic}</span><span class="t">${stEsc(it.t)}${prog}</span>
      ${done ? '<span class="ok">✓</span>' : it.soon ? `<span class="soon-t">${L('скоро', 'soon')}</span>` : it.go ? `<button class="go" data-go="${it.go}">${L('Идём', 'Go')} ▶</button>` : ''}</li>`;
  }).join('');
  const s = stChapter(i), next = i + 1 < STORY.length && i + 1 >= save.story.open;
  return `<button class="st-back" id="stBack">← ${L('Главы', 'Chapters')}</button>
    <div class="st-head"><span class="ic" aria-hidden="true">${c.ic}</span><div><small>${L(`Глава ${i + 1}`, `Chapter ${i + 1}`)}</small><h3 class="display">${stEsc(c.name)}</h3></div></div>
    <p class="st-about">${stEsc(c.about)}</p>
    <ul class="st-todo">${rows}</ul>
    ${fest ? `<button class="btn" id="stFest">🎉 ${L('Праздник главы!', 'Chapter party!')}</button>`
      : was ? `<p class="st-end display">🎉 ${stEsc(c.end)}</p>`
      : `<p class="st-note">${next && !s.half ? L(`Сделай ещё ${Math.ceil(s.all/2) - s.done} — и откроется следующая глава`, `Do ${Math.ceil(s.all/2) - s.done} more and the next chapter opens`) + ' · ' : ''}${c.items.some(it => it.soon) ? L('Пункты «скоро» ещё впереди ✨', 'The «soon» steps are still ahead ✨') : L('Сделай всё — и будет праздник 🎉', 'Do everything for a party 🎉')}</p>`}`;
}

/* ---------- праздник главы ---------- */
function stFest(i){
  if(!stFestReady(i)) return;
  const c = STORY[i], gift = ST_GIFT[i] || 20;
  save.story.fest.push(i + 1); persist();
  sfx.grow ? sfx.grow() : sfx.star();
  const body = $('#storyBody');
  body.innerHTML = `<div class="st-party">
    <div class="st-conf" aria-hidden="true">${'🎉✨💗⭐🎊'.repeat(3).match(/./gu).map((e, k) => `<i style="left:${(k*37) % 100}%;animation-delay:${(k % 5)*0.18}s">${e}</i>`).join('')}</div>
    <span class="big" aria-hidden="true">${c.ic}</span>
    <h3 class="display">${L(`Глава «${stEsc(c.name)}» прочитана!`, `Chapter «${stEsc(c.name)}» is finished!`)}</h3>
    <p>${stEsc(c.end)}</p>
    <p class="earned display">+${gift} 🐚</p>
    <button class="btn" id="stPartyOk">${L('Ура! ♡', 'Hooray! ♡')}</button></div>`;
  const ok = body.querySelector('#stPartyOk'), r = ok.getBoundingClientRect();
  setTimeout(() => addShells(gift, {x:r.left + r.width/2, y:r.top}), 500);
  if(i === 0) stFlag(true);
  ok.addEventListener('click', () => { sfx.tap(); stCh = -1; stRender(); stCheck(); });
}

/* ---------- флажок над больницей (награда главы 1) ---------- */
let stFlagObj = null;
function stFlag(wave){
  if(stFlagObj || !save.story.fest.includes(1)) return;
  const g = new THREE.Group(); g.position.set(-1.7, 2.35, -2.0);   // над домиком больницы (world.js)
  const pole = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.0, 8), toon(0xFFFDF8)), 1.25); pole.position.y = 0.5; g.add(pole);
  const ball = addOutline(new THREE.Mesh(SMALL, toon(0xFFD66B)), 1.12); ball.scale.setScalar(0.07); ball.position.y = 1.02; g.add(ball);
  const tex = canvasTex(128, (x, w, h) => {
    x.fillStyle = '#FF9BB8'; x.beginPath(); x.moveTo(4, 4); x.lineTo(w - 6, h/2); x.lineTo(4, h - 4); x.closePath(); x.fill();
    x.lineWidth = 6; x.strokeStyle = '#3B3A4A'; x.stroke();
    x.fillStyle = '#FFFDF8'; x.fillRect(26, h/2 - 7, 30, 14); x.fillRect(34, h/2 - 15, 14, 30);
  }, 96);
  const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.46, 8, 1), new THREE.MeshBasicMaterial({map:tex, transparent:true, side:THREE.DoubleSide}));
  cloth.position.set(0.33, 0.76, 0); g.add(cloth);
  g.userData.cloth = cloth; g.userData.base = cloth.geometry.attributes.position.array.slice();
  scene.add(g); stFlagObj = g;
  if(wave){ g.scale.setScalar(0.01); tween(0.6, k => g.scale.setScalar(Math.max(0.01, k)), ease.out); }
}
function stTick(t){
  const g = stFlagObj; if(!g || reduced) return;
  const pos = g.userData.cloth.geometry.attributes.position, b = g.userData.base;
  for(let i = 0; i < pos.count; i++){ const x = b[i*3]; pos.array[i*3 + 2] = Math.sin(t*4 - x*6)*0.05*(x + 0.31); }
  pos.needsUpdate = true;
}

/* ---------- «Идём ▶»: к месту на острове ----------
   Почти всё начинается из уголка малыша: переходим туда и открываем нужную игру, как будто её выбрали в «Поиграть». */
async function stGo(k){
  const P = ST_PLACES[k]; if(!P) return;
  if(P.pet && !save.pet) return toast(L('Сначала познакомься со своим малышом: он ждёт у льдины после первой смены 🦭', 'Meet your pup first: it waits by the ice after your first shift 🦭'), 3400);
  const park = P.pet && mgCanPark();   // лупа или лечение подождут, как по кнопке малыша (goPet в pet.js)
  if(!park && (busy || !mgRoot.hidden)) return toast(L('Сначала закончи то, что начала 🙂', 'Finish what you started first 🙂'));
  $('#story').hidden = true; document.body.classList.remove('story-on');
  if(k === 'shop') return openShop();
  if(k === 'mail') return openMail();
  if(k === 'hosp'){
    if(petMode) goPet(false);
    else toast(L('Ты в больнице! Лечи пациентов 🩺', 'You are in the hospital! Heal your patients 🩺'));
    return;
  }
  if(homeMode && k !== 'home') homeExit();
  if(!petMode){ goPet(true); await wait(0.9); }
  for(let i = 0; i < 40 && busy; i++) await wait(0.1);   // малыш может радостно встречать — ждём
  if(!petMode || busy || !mgRoot.hidden) return;
  if(k === 'pet'){
    if(nbIn() && !nbQuest().ok) toast(L(`Пинг просит: ${pingAsk(nbQuest().id).ask()}`, `Ping asks: ${pingAsk(nbQuest().id).ask()}`), 4200);
    return;
  }
  if(k === 'home') return homeEnter();
  if(k === 'road' || k === 'rescue'){ coGame = k; funPre = 'coop'; }
  else funPre = k;   // walk, run, dive, chase — как в «Поиграть» (js/walk.js)
  petDo('fun');
}

/* ---------- кнопки ---------- */
$('#btnStory').addEventListener('click', () => stOpen());
$('#btnStoryClose').addEventListener('click', () => { sfx.tap(); stClose(); });
document.querySelectorAll('#storyTabs button').forEach(b => b.addEventListener('click', () => { sfx.tap(); stTab = b.dataset.tab; stCh = -1; stRender(); }));
// первый экран: «🗺️ Что сегодня?» — входим в игру (как «К малышу» или «Открыть больницу») и сразу открываем карту
$('#btnIntroToday').addEventListener('click', () => {
  (save.pet ? $('#btnIntroPet') : $('#btnStart')).click();
  if(save.pet || !adoptPending()) setTimeout(() => stOpen('today'), 700);
});
if(save.story.pg === 0 && save.progress) save.story.pg = save.progress;   // первый запуск с книжкой: сегодняшнее лечение считаем с этого момента
stOpenUp(); stFlag(false);
{ const n = stTodayList().filter(x => !x.done).length;
  if(n) $('#btnIntroToday').textContent = L(`🗺️ Сегодня: ${n} ${plural(n, 'дело', 'дела', 'дел', 'thing', 'things')}`, `🗺️ Today: ${n} ${plural(n, '', '', '', 'thing', 'things')}`); }
setInterval(stCheck, 2000); setTimeout(stCheck, 300);   // started и busy объявлены в game.js, он грузится после
