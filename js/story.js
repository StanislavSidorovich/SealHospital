/* «Книга острова» и «Сегодня на острове» (Спринт 5, задача 2).
   📖 в углу (и «🗺️ Что сегодня?» на первом экране) открывает книжку с двумя вкладками:
   — «Сегодня»: карта острова — метки мест, где сегодня что-то ждёт, — и дела дня с галочками. Без серий и штрафов:
     не сделала — завтра будут новые.
   — «Главы»: 8 глав истории. Пункты глав считаются из того, что уже лежит в сохранении (ничего нового не копим).
     Следующая глава открывается, когда в текущей сделана половина; праздник главы — когда сделано всё.
     Пункт «скоро» (soon:true) — то, что ещё строим: пока он есть, праздник такой главы впереди.
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
  chase: {ic:'🦈', name:L('Салки', 'Tag'),             x:66, y:88, pet:true},
  slide: {ic:'🛷', name:L('Горка', 'Slide'),           x:64, y:27, pet:true, show:() => typeof slideGame === 'function'},   // js/slide.js
  storm: {ic:'🌪️', name:L('Шторм', 'Storm'),          x:90, y:86, pet:true, show:() => typeof smPlay === 'function' && smPlay()}   // глава 8 или «Все игры открыты» (js/storm.js)
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
      {ic:'🛷', t:L('Скатись с Ледяной горки Пинга', 'Ride Ping\'s Ice Slide'), n:() => [save.sl.n, 1], go:'slide'},
      {ic:'🏔️', t:L('Пробеги «Забег по льдинам»', 'Finish the «Ice floe dash»'), n:() => [save.adv.best.bay1 || 0, 1], go:'run'},
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
      {ic:'🎉', t:L('Праздник мам (и кто-то рычит…)', 'The mums\' party (and someone growls…)'), n:() => [stLv('fest'), 1], go:'rescue'},
      {ic:'🐻‍❄️', t:L('Вылечи медведю лапу', 'Heal the bear\'s paw'), ok:() => save.pt.bear, go:'hosp'}
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
      {ic:'🐙', t:L('Спаси Кляксу', 'Save Blot'), n:() => [save.dive.gloom.st, 3], go:'dive'},
      {ic:'🩹', t:L('Вылечи Кляксе царапинку', 'Fix Blot\'s scratch'), ok:() => save.pt.blot, go:'hosp'}
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
      {ic:'🐠', t:L('Построй в иглу океанариум', 'Build an oceanarium in the igloo'), ok:() => !!save.home.rooms.ocean, go:'home'},
      {ic:'🐟', t:L('Поймай 5 разных рыбок моря', 'Catch 5 different sea fish'), n:() => [save.sea.got.length, 5], go:'hosp'},
      {ic:'📸', t:L('Сфотографируй 8 жителей бухты', 'Photograph 8 bay creatures'), n:() => [save.dive.seen.length, 8], go:'dive'},
      {ic:'🦀', t:L('Позови 3 жителей бухты в аквариум', 'Invite 3 bay creatures to the fish tank'), n:() => [save.dive.tank.length, 3], go:'dive'},
      {ic:'🍤', t:L('Покорми рыбок в аквариуме', 'Feed the fish in the tank'), ok:() => !!save.home.fed, go:'home'}
    ]},
  {ic:'🌪️', name:L('Великий шторм', 'The Great Storm'),
    about:L('Небо почернело: на остров идёт Великий шторм и большая вода! Нужны отвага, скорость и смекалка — и все друзья вместе.', 'The sky has turned black: the Great Storm and high water are coming to the island! You need courage, speed and wits — and all your friends together.'),
    end:L('Шторм ушёл, над островом радуга 🌈', 'The storm is gone, and there is a rainbow over the island 🌈'),
    items:[
      {ic:'🚨', t:L('Тревога: отведи малышей в убежище', 'The alarm: lead the little ones to the shelter'), ok:() => save.storm.st > 0, go:'storm'},
      {ic:'🛟', t:L('Спасаем всех: соседи на льдинах', 'Save everyone: neighbours on the floes'), ok:() => save.storm.st > 1, go:'storm'},
      {ic:'🗼', t:L('Держим маяк', 'Hold the lighthouse'), ok:() => save.storm.st > 2, go:'storm'},
      {ic:'🌈', t:L('Глаз бури: зажги маяк', 'The eye of the storm: light the lighthouse'), ok:() => save.storm.st > 3, go:'storm'}
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
/* ---------- сквозная линия: шторм надвигается (разбор 27.09) ----------
   Великий шторм не падает как снег на голову: на него нужна вся команда бывших «страшилок», и у каждого в шторме
   своя работа (акула тянет плот, Клякса светит, Туча держит ветер, медведь носит льдинки). Пока команда
   собирается, на карте над морем растёт тёмная туча, небо острова хмурится, а после праздника каждой главы
   кто-то замечает примету (ST_OMEN). Глава 8 открывается, когда в главе 7 сделана половина И вся команда в сборе. */
const ST_TEAM = [
  {ic:'🐻‍❄️', name:L('Медведь', 'Bear'), job:L('принесёт льдинки', 'will bring ice blocks'), ch:2, ok:() => !!save.pt.bear},
  {ic:'🦈', name:L('Акула', 'Shark'), job:L('потянет плот', 'will tow the raft'), ch:3, ok:() => save.dive.shark.tooth > 1},
  {ic:'🐙', name:L('Клякса', 'Blot'), job:L('посветит в темноте', 'will shine in the dark'), ch:4, ok:() => save.dive.gloom.st >= 3},
  {ic:'☁️', name:L('Туча', 'Cloud'), job:L('удержит ветер', 'will hold back the wind'), ch:5, ok:() => save.coop.cs.cure > 1}
];
const stFriend = f => { try{ return !!f.ok(); }catch(e){ return false; } };
const stTeamN = () => ST_TEAM.filter(stFriend).length;
const stTeamReady = () => stTeamN() === ST_TEAM.length;
const stTeamIcons = () => ST_TEAM.map(f => `<i class="${stFriend(f) ? 'y' : ''}" title="${stEsc(f.name)}">${f.ic}</i>`).join('');
// примета после праздника главы 1…7 (видна и потом, на странице прочитанной главы)
const ST_OMEN = [
  L('Чайка принесла весть: далеко в море собираются тёмные тучи…', 'The gull brought news: far out at sea, dark clouds are gathering…'),
  L('Пинг чешет затылок: «Моя льдинка с домиком что-то покачивается… Это к непогоде».', 'Ping scratches his head: “My little floe with my house is rocking a bit… Bad weather is coming.”'),
  L('Мамы шепчутся: «Малыши потерялись, потому что море стало беспокойным…»', 'The mums whisper: “The little ones got lost because the sea got restless…”'),
  L('Акула: «В глубине неспокойно, идёт что-то большое. Если что — я сильная, потяну плот!»', 'The shark: “It’s restless in the deep, something big is coming. If anything happens — I’m strong, I’ll tow a raft!”'),
  L('Клякса: «Бочку принесло волнами издалека — там уже бушует шторм. Станет темно — я посвечу!»', 'Blot: “The waves brought the barrel from far away — a storm is already raging there. If it gets dark, I’ll shine!”'),
  L('Туча: «Я чувствую погоду… Идёт Великий шторм! Но ветер я удержу».', 'The Cloud: “I can feel the weather… The Great Storm is coming! But I’ll hold back the wind.”'),
  L('Иглу крепкое и тёплое: если придёт большая вода, здесь спрячутся все малыши.', 'The igloo is strong and warm: if high water comes, all the little ones can hide here.')
];
// открываем главы по порядку, пока в последней открытой сделана половина; шторм (глава 8) ждёт всю команду
function stOpenUp(){
  const st = save.story; let grew = false;
  while(st.open < STORY.length && stChapter(st.open - 1).half && (st.open < STORY.length - 1 || stTeamReady() || save.storm.st > 0)){ st.open++; grew = true; }
  return grew;
}
// «Дальше по истории» (до двух шагов из разных глав): сначала — к другу, которого не хватает в команде для шторма
// (глава 7 уже открыта, а шторм ждёт), потом самая новая открытая глава, потом самая ранняя недочитанная
function stNextSteps(){
  const out = [], seen = new Set(), st = save.story;
  const next = i => STORY[i].items.find(it => !it.soon && !stItemDone(it));
  const add = i => { if(out.length >= 2 || i < 0 || i >= st.open || seen.has(i) || st.fest.includes(i + 1)) return; const it = next(i); if(it){ seen.add(i); out.push({i, it}); } };
  if(st.open === STORY.length - 1) ST_TEAM.filter(f => !stFriend(f)).forEach(f => add(f.ch));
  add(st.open - 1);
  for(let i = 0; i < st.open; i++) add(i);
  return out;
}
// какие игры «Поиграть» и «Вместе» ведут по истории (значок 📖 на плитке)
const ST_PICK = {walk:'walk', run:'run', dive:'dive', chase:'chase', slide:'slide', road:'coop', rescue:'coop', storm:'coop'};
function stMarkPicks(panel){
  for(const {it} of stNextSteps()){
    const b = panel.querySelector(`.picks [data-k="${ST_PICK[it.go]}"]`);
    if(b && !b.querySelector('.st-bk')) b.insertAdjacentHTML('beforeend', `<span class="st-bk" aria-label="${stEsc(L('по истории', 'story'))}">📖</span>`);
  }
}
// с какой главы (номер с нуля) игра открывается в «Поиграть», «Вместе» и на карте (разбор 27.09: всё было открыто сразу,
// «Салки» раньше главы «Акула» — и игра казалась набором случайных уровней). Закрытая плитка в «Поиграть» — с 🔒 и главой.
// ?test=1 открывает всё (для проверок), ?test=1&lock=1 — как у игрока
const ST_GATE = {rescue:2, dive:3, chase:3, road:5, fight:5, bg:1, ocean:3, gameroom:2, trophy:3, coop:-1};   // bg — 🎲 Игротека в иглу (js/boardgames.js), ocean — 🐠 океанариум (js/ocean.js), gameroom и trophy — комнаты иглу (js/rooms.js)
function stGate(k){
  const i = ST_GATE[k];
  if(i == null || i < 0 || save.story.open > i || save.free) return -1;   // 🔓 «Все игры открыты» в ⚙️
  return typeof TEST !== 'undefined' && TEST && !/lock/.test(location.search) ? -1 : i;
}
const stGateSay = i => L(`🔒 Откроется в главе ${i + 1} «${STORY[i].name}» 📖`, `🔒 Opens in chapter ${i + 1} «${STORY[i].name}» 📖`);
// закрытые плитки в «Поиграть»: вместо подписи — глава; касание — подсказка, а не игра (вызывать до mgOn на кнопках)
function stLockPicks(panel){
  panel.querySelectorAll('.picks [data-k]').forEach(b => {
    const i = stGate(b.dataset.k); if(i < 0) return;
    b.classList.add('st-lock'); b.setAttribute('aria-disabled', 'true');
    const sm = b.querySelector('small'); if(sm) sm.textContent = L(`🔒 глава ${i + 1}: ${STORY[i].name}`, `🔒 chapter ${i + 1}: ${STORY[i].name}`);
    b.addEventListener('click', e => { e.stopImmediatePropagation(); sfx.bad(); toast(stGateSay(i), 3000); });
  });
}
const stCoGames = () => stNextSteps().map(x => x.it.go).filter(g => g === 'road' || g === 'rescue' || g === 'storm');
// небо острова хмурится, пока идёт к шторму; во время шторма (глава 8) — грозовое
const ST_FOG = scene.fog;
function stSky(){
  const b = document.body.classList, s = save.storm.st;
  const on = typeof smOn === 'function' && smOn() && s < 4;
  const near = !on && s < 4 && (stTeamN() >= 2 || save.story.open >= 7);
  b.toggle('sky-storm', on); b.toggle('sky-omen', near);
  if(ST_FOG && ST_FOG.color) ST_FOG.color.setHex(on ? 0xBAC3D3 : near ? 0xDCE8EF : 0xE2F3F9);
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
  {id:'blot', ic:'🐙', t:() => L('Клякса ждёт в больнице: царапинка!', 'Blot is waiting in the hospital: a scratch!'), show:() => save.dive.gloom.st >= 3 && !save.pt.blot,
    done:() => false, go:'hosp'},
  {id:'bear', ic:'🐻‍❄️', t:() => L('Медведь ждёт в больнице: болит лапа!', 'The bear is waiting in the hospital: his paw hurts!'), show:() => stLv('fest') > 0 && !save.pt.bear,
    done:() => false, go:'hosp'},
  {id:'ride', ic:'🌊', t:() => L('Покатайся на акуле в бухте', 'Ride the shark in the bay'), show:() => !!save.pet && save.dive.shark.tooth === 2,
    done:() => save.dive.shark.ride === dvToday(), go:'dive'},
  {id:'chase', ic:'🦈', t:() => { const T = chTheme(); return L(`Погоня дня${T ? ': ' + T.ic + ' ' + T.name : ''}`, `Chase of the day${T ? ': ' + T.ic + ' ' + T.name : ''}`); },
    show:() => !!save.pet, done:() => save.dive.chase.day.d === stDay() && save.dive.chase.day.n > 0, go:'chase'},
  {id:'slide', ic:'🛷', t:() => { const T = typeof slTheme === 'function' && slTheme(); return L(`Горка дня${T ? ': ' + T.ic + ' ' + T.name : ''}`, `Slide of the day${T ? ': ' + T.ic + ' ' + T.name : ''}`); },
    show:() => !!save.pet && typeof slideGame === 'function', done:() => save.sl.day.d === stDay() && save.sl.day.n > 0, go:'slide'},
  {id:'garden', ic:'🌱', t:() => L('Рыбка-садовник ждёт с подарком', 'The gardener fish has a gift'), show:() => !!save.pet && stGardenGift(),
    done:() => !stGardenGift(), go:'dive'},
  {id:'guest', ic:'🤿', t:() => { const d = dvDef(dvGuest()); return L(`Гость бухты: ${d ? d.ic + ' ' + d.name : ''}`, `Bay guest: ${d ? d.ic + ' ' + d.name : ''}`); },
    show:() => !!save.pet && !save.dive.seen.includes(dvGuest()), done:() => save.dive.seen.includes(dvGuest()), go:'dive'},
  {id:'storm', ic:'🌪️', t:() => { const st = Math.min(3, save.storm.st); return L(`Великий шторм! Часть ${st + 1} из 4: ${SM_PARTS[st].name}`, `The Great Storm! Part ${st + 1} of 4: ${SM_PARTS[st].name}`); },
    show:() => !!save.pet && typeof smOn === 'function' && smOn() && save.storm.st < 4, done:() => save.storm.d === stDay(), go:'storm'},
  {id:'party', ic:'🎉', t:() => L('Шторм позади — друзья зовут на праздник!', 'The storm is over — your friends invite you to a party!'),
    show:() => save.storm.st >= 4 && !save.story.fest.includes(8), done:() => save.story.fest.includes(8), go:'party'},
  {id:'feed', ic:'🍤', t:() => L('Покорми рыбок в аквариуме', 'Feed the fish in the tank'), show:() => !!save.pet && /^tank_/.test(save.home.s.tank || ''),
    done:() => save.home.fed === stDay(), go:'home'}
];
function stTodayList(){
  const td = save.story.td, out = [];
  if(td.d !== stDay()){ td.d = stDay(); td.ok = []; }
  for(const it of TODAY){
    let show = false, done = false, n = null;
    try{
      show = (it.show() && stGate(it.go) < 0) || td.ok.includes(it.id);   // дела закрытых игр ждут своей главы
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
  stSky();
  const news = stNews();
  const b = $('#storyAlert'); if(b) b.hidden = !news;
  const calm = started && $('#intro').hidden && $('#story').hidden && mgRoot.hidden && !busy;
  // глава 8 открылась — шторм приходит на остров сценой, а не только строчкой в книжке (один раз, в уголке малыша)
  if(st.open >= STORY.length && !st.sa){
    if(save.storm.st > 0){ st.sa = true; persist(); }
    else if(calm && petMode && !homeMode && save.pet){ stToldNews = true; stStormArrive(); return; }
  }
  if(news && !stToldNews && calm && nudge(L('📖 В Книге острова что-то новое! Нажми на книжку', '📖 Something new in the Island book! Tap the book'))) stToldNews = true;
  if(!news) stToldNews = false;
}
async function stStormArrive(){
  save.story.sa = true; persist();
  setBusy(true); sfx.grr(); flash();
  mgOpen('');
  const panel = mgNode('div', 'mg-panel fun-pick st-arrive', `
    <p class="ttl display">🌩️ ${L('Идёт Великий шторм!', 'The Great Storm is coming!')}</p>
    <p class="got">${L('Небо над морем почернело, волны всё выше. Чайка кричит: «Шторм! Большая вода!»', 'The sky over the sea has turned black and the waves keep rising. The gull cries: “Storm! High water!”')}</p>
    <ul class="st-crew">${ST_TEAM.map(f => `<li><span aria-hidden="true">${f.ic}</span><b>${stEsc(f.name)}</b><small>${stEsc(f.job)}</small></li>`).join('')}</ul>
    <p class="got">${L('Вся команда в сборе. Спасём остров вместе!', 'The whole team is here. Let’s save the island together!')}</p>
    <div class="row col"><button class="btn" data-k="go">🌪️ ${L('Спасать остров!', 'Save the island!')}</button>
    <button class="btn ghost small" data-k="no">${L('Чуть позже', 'A bit later')}</button></div>`);
  const k = await new Promise(r => panel.querySelectorAll('[data-k]').forEach(b => mgOn(b, 'click', () => { sfx.tap(); r(b.dataset.k); })));
  panel.classList.add('away'); await wait(0.2); mgClose(); setBusy(false);
  if(k === 'go') stGo('storm');
  else toast(L('Шторм ждёт в Книге острова 📖 — глава 8', 'The storm waits in the Island book 📖 — chapter 8'), 3200);
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
    if(i >= save.story.open && i === STORY.length - 1)   // шторм: кого ещё не хватает в команде
      return stOmenToast(save.story.open < i ? L('Это последняя глава. ', 'This is the last chapter. ')
        : stChapter(i - 1).half ? '' : L(`Сначала — половина главы «${STORY[i - 1].name}». `, `First, half of «${STORY[i - 1].name}». `));
    if(i >= save.story.open) return toast(L(`Эта глава откроется, когда в главе «${STORY[i - 1].name}» будет сделана половина`, `This chapter opens when half of «${STORY[i - 1].name}» is done`), 3200);
    stCh = i; stRender(); $('#story').scrollTop = 0;
  }));
  body.querySelectorAll('[data-omen]').forEach(b => b.addEventListener('click', () => { sfx.tap(); stOmenToast(); }));
  const back = body.querySelector('#stBack'); if(back) back.addEventListener('click', () => { sfx.tap(); stCh = -1; stRender(); });
  const fest = body.querySelector('#stFest'); if(fest) fest.addEventListener('click', () => stFest(stCh));
  body.querySelectorAll('[data-fin]').forEach(b => b.addEventListener('click', () => { sfx.tap(); b.dataset.fin === 'dip' ? stDiploma() : fnGo(); }));
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
  const pins = Object.entries(ST_PLACES).filter(([k, p]) => (!p.show || p.show()) && stGate(k) < 0).map(([k, p]) => {
    const off = p.pet && !save.pet;
    return `<button class="st-pin${off ? ' off' : ''}" data-go="${k}" style="left:${p.x}%;top:${p.y}%"><span class="ic" aria-hidden="true">${off ? '🔒' : p.ic}</span>${off ? '' : stPinBadge(k, today)}<b>${stEsc(p.name)}</b></button>`;
  }).join('');
  const rows = today.map(({it, done, n}) => `<li class="${done ? 'done' : ''}">
    <span class="ic" aria-hidden="true">${it.ic}</span><span class="t">${stEsc(it.t())}${n && !done ? ` <small>${n[0]}/${n[1]}</small>` : ''}</span>
    ${done ? '<span class="ok" aria-label="Готово">✓</span>' : `<button class="go" data-go="${it.go}">${L('Идём', 'Go')} ▶</button>`}</li>`).join('');
  // туча над морем растёт, пока собирается команда; шторм идёт — это метка 🌪️; прошёл — радуга
  const s = save.storm.st, k = (1 + stTeamN())/(ST_TEAM.length + 1);
  const cloud = s >= 4 ? `<span class="st-cloud rb" aria-hidden="true">🌈</span>`
    : !(typeof smOn === 'function' && smOn()) ? `<button class="st-cloud" data-omen="1" style="--k:${k.toFixed(2)}" aria-label="${stEsc(L('Туча над морем', 'A cloud over the sea'))}">🌩️</button>` : '';
  const story = stNextSteps().map(({i, it}) => `<li><span class="ic" aria-hidden="true">${it.ic}</span><span class="t">${stEsc(it.t)}<small class="ch">${L(`Глава ${i + 1} · ${STORY[i].name}`, `Chapter ${i + 1} · ${STORY[i].name}`)}</small></span>
    ${it.go ? `<button class="go" data-go="${it.go}">${L('Идём', 'Go')} ▶</button>` : ''}</li>`).join('');
  return `<div class="st-map">${ST_MAP_SVG}${cloud}${pins}</div>
    ${story ? `<p class="st-sub display">📖 ${L('Дальше по истории', 'Next in the story')}</p><ul class="st-todo st-next">${story}</ul>` : ''}
    <p class="st-sub display">${left ? L(`Сегодня на острове: ${left} ${plural(left, 'дело', 'дела', 'дел', 'thing', 'things')}`, `Today on the island: ${left} ${plural(left, '', '', '', 'thing', 'things')}`) : L('Всё на сегодня сделано! Завтра будет новое ♡', 'All done for today! Something new tomorrow ♡')}</p>
    <ul class="st-todo">${rows}</ul>`;
}
function stBookHtml(){
  const st = save.story;
  const tiles = STORY.map((c, i) => {
    const open = i < st.open, s = stChapter(i), fest = stFestReady(i), was = st.fest.includes(i + 1);
    const cls = !open ? 'lock' : fest ? 'fest' : was ? 'done' : '';
    const dots = c.items.map(it => `<i class="${stItemDone(it) ? 'y' : it.soon ? 's' : ''}"></i>`).join('');
    const storm = !open && i === STORY.length - 1;   // последняя глава не прячется за замком: над ней гроза и команда, которую надо собрать
    return `<button class="st-ch ${cls}${storm ? ' omen' : ''}" data-ch="${i}">
      <span class="ic" aria-hidden="true">${open ? c.ic : storm ? '🌩️' : '🔒'}</span>
      <small>${L(`Глава ${i + 1}`, `Chapter ${i + 1}`)}</small><b>${open ? stEsc(c.name) : '???'}</b>
      ${open ? `<span class="dots">${dots}</span>` : storm ? `<span class="st-team">${stTeamIcons()}</span>` : ''}${fest ? `<span class="tag">🎉 ${L('Праздник!', 'Party!')}</span>` : was ? '<span class="tag ok">✓</span>' : ''}</button>`;
  }).join('');
  const got = st.fest.length;
  if(st.fest.includes(8)) return `<p class="st-sub display">🌈 ${L('История прочитана! Но остров живёт дальше — заходи каждый день ♡', 'The story is finished! But the island lives on — come back every day ♡')}</p>
    ${stFinBtns()}<div class="st-book">${tiles}</div>`;
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
    ${fest ? `<button class="btn" id="stFest">🎉 ${i === 7 ? L('Большой праздник!', 'The big party!') : L('Праздник главы!', 'Chapter party!')}</button>`
      : was ? `<p class="st-end display">🎉 ${stEsc(c.end)}</p>${ST_OMEN[i] && save.storm.st < 4 ? `<p class="st-omen">🌩️ ${stEsc(ST_OMEN[i])}</p>` : ''}${i === 7 ? stFinBtns() : ''}`
      : `<p class="st-note">${next && !s.half ? L(`Сделай ещё ${Math.ceil(s.all/2) - s.done} — и откроется следующая глава`, `Do ${Math.ceil(s.all/2) - s.done} more and the next chapter opens`) + ' · ' : ''}${c.items.some(it => it.soon) ? L('Пункты «скоро» ещё впереди ✨', 'The «soon» steps are still ahead ✨') : L('Сделай всё — и будет праздник 🎉', 'Do everything for a party 🎉')}</p>`}
    ${i === STORY.length - 2 && save.story.open < STORY.length ? `<p class="st-note">🌩️ ${L('Глава 8 ждёт всю команду:', 'Chapter 8 needs the whole team:')} <span class="st-team">${stTeamIcons()}</span></p>` : ''}`;
}

// кто ещё не в команде для шторма (туча на карте, закрытая глава 8)
function stOmenToast(pre = ''){
  const miss = ST_TEAM.filter(f => !stFriend(f)), n = ST_TEAM.length - miss.length, all = ST_TEAM.length;
  toast(`🌩️ ${pre}` + (miss.length
    ? L(`Над морем собираются тучи… Против шторма нужна вся команда (${n} из ${all}). Подружись: ${miss.map(f => f.ic + ' ' + f.name).join(', ')}`,
        `Clouds are gathering over the sea… To face the storm you need the whole team (${n} of ${all}). Make friends with: ${miss.map(f => f.ic + ' ' + f.name).join(', ')}`)
    : L('Вся команда в сборе! Шторм совсем близко…', 'The whole team is here! The storm is very close…')), 5200);
}

/* ---------- после истории: праздник ещё раз и грамота (js/finale.js) ---------- */
const stFinBtns = () => `<div class="row st-fin"><button class="btn" data-fin="dip">📜 ${L('Грамота', 'Certificate')}</button><button class="btn ghost" data-fin="party">🎉 ${L('Праздник', 'Party')}</button></div>`;
async function stDiploma(){
  const body = $('#storyBody'); body.innerHTML = '';
  await fnDiplomaPanel(fnLastPhoto(), body, L('← Назад', '← Back'));
  if(!$('#story').hidden) stRender();
}

/* ---------- праздник главы ---------- */
function stFest(i){
  if(!stFestReady(i)) return;
  if(i === 7) return fnGo();   // глава 8 — большой праздник острова и грамота (js/finale.js)
  const c = STORY[i], gift = ST_GIFT[i] || 20;
  save.story.fest.push(i + 1); persist();
  sfx.grow ? sfx.grow() : sfx.star();
  const body = $('#storyBody');
  body.innerHTML = `<div class="st-party">
    <div class="st-conf" aria-hidden="true">${'🎉✨💗⭐🎊'.repeat(3).match(/./gu).map((e, k) => `<i style="left:${(k*37) % 100}%;animation-delay:${(k % 5)*0.18}s">${e}</i>`).join('')}</div>
    <span class="big" aria-hidden="true">${c.ic}</span>
    <h3 class="display">${L(`Глава «${stEsc(c.name)}» прочитана!`, `Chapter «${stEsc(c.name)}» is finished!`)}</h3>
    <p>${stEsc(c.end)}</p>
    ${ST_OMEN[i] && save.storm.st < 4 ? `<p class="st-omen">🌩️ ${stEsc(ST_OMEN[i])}</p>` : ''}
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
  if(k === 'party') return fnGo();
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
  if(k === 'road' || k === 'rescue' || k === 'storm'){ coGame = k; funPre = 'coop'; }
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
