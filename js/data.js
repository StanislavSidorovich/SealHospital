/* Общее: утилиты, сохранение и игровые данные. Подключается первым. */
const $ = s => document.querySelector(s);
const V3 = THREE.Vector3;
const INK = 0x3B3A4A;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get(k, d){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }catch(e){ return d; } },
  set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};

/* ---------------- save ---------------- */
// Всё сохранение живёт под одним ключом sh.save: {version, who, album, progress, muted, music, free, fish, shells, owned, decor, shifts, pet, mail, home, adv, hol, sea, nb, coop, dive, st, story, storm, sl, pt, bg, isl, sw}.
// Новое поле: добавь значение по умолчанию в sanitize(); если меняется смысл старых
// данных — подними SAVE_VERSION и добавь функцию в MIGRATIONS (индекс = версия «из»).
// Игроки на устройстве (Фаза 11, часть 2): sh.players = [{id, name}], sh.player = кто играет сейчас. У каждого своё сохранение.
// Первый игрок ('p1') живёт под прежним ключом sh.save — у Сабрины ничего не переезжает; остальные — под sh.save.<id>.
// Список и выбор — настройка устройства (как язык), в код сохранения не входят; код переносит того, кто играет сейчас.
const PLAYERS_KEY = 'sh.players', PLAYER_KEY = 'sh.player';
const saveKeyOf = id => id === 'p1' ? 'sh.save' : 'sh.save.' + id;
function loadPlayers(){
  const a = store.get(PLAYERS_KEY, null);
  const list = (Array.isArray(a) ? a : []).filter(p => p && typeof p.id === 'string' && /^p\d{1,3}$/.test(p.id)).map(p => ({id:p.id, name:typeof p.name === 'string' ? p.name.slice(0, 12) : ''}));
  if(!list.length) list.push({id:'p1', name:''});
  let cur = store.get(PLAYER_KEY, 'p1');
  if(!list.some(p => p.id === cur)) cur = list[0].id;
  return {list, cur};
}
const PLAYERS = loadPlayers();
const SAVE_KEY = saveKeyOf(PLAYERS.cur), SAVE_VERSION = 2;
const MIGRATIONS = [
  // 0 → 1: раньше было три отдельных ключа sh.album, sh.progress, sh.muted
  () => ({album:store.get('sh.album', []), progress:store.get('sh.progress', 0), muted:store.get('sh.muted', false)}),
  // 1 → 2 (Спринт 8, редактор иглу): мебель больше не привязана к местам — home.s {место: вещь} → home.f {вещь: [комната]}, встанет туда же, где стояла
  d => d.home && typeof d.home === 'object' && d.home.s && !d.home.f ? {...d, home:{...d.home, f:homeFromSlots(d.home.s), s:undefined}} : d
];
// who = {name, g:'f'|'m', asked} — кто играет («Кто играет?», Фаза 11 часть 1). Имя ограничено 12 буквами.
// asked=false только у совсем нового сохранения — тогда игра сама спросит имя перед первым экраном;
// у сохранений, где уже что-то есть (лечила, гуляла, письма), считаем, что это Сабрина, и не переспрашиваем.
function sanitizeWho(w, hasHistory){
  w = w && typeof w === 'object' ? w : {};
  const name = typeof w.name === 'string' && w.name.trim() ? w.name.trim().slice(0, 12) : L('Сабрина', 'Sabrina');
  return {name, g:w.g === 'm' ? 'm' : 'f', asked:!!(w.asked || hasHistory)};
}
function sanitize(d){
  const hasHistory = !!(d.progress || d.shifts || d.pet || d.album && d.album.length || d.mail && d.mail.got && d.mail.got.length);
  return {...d, version:SAVE_VERSION,
    who:sanitizeWho(d.who, hasHistory),
    album:Array.isArray(d.album) ? d.album : [],
    progress:Number.isFinite(d.progress) ? d.progress : 0,
    muted:!!d.muted,
    music:d.music !== false,   // фоновая музыка (js/audio.js); 🔇 в углу выключает и её
    free:!!d.free,             // 🔓 «Все игры открыты» (⚙️): замки глав и уровней не мешают, сюжет идёт своим чередом (stGate в js/story.js)
    fish:Number.isFinite(d.fish) ? d.fish : 0,     // рыбки в ведре (Фаза 1, рыбалка)
    shells:Number.isFinite(d.shells) ? Math.max(0, d.shells) : 0,   // ракушки — валюта (Фаза 2)
    owned:strList(d.owned),    // купленное в лавке (id из SHOP)
    decor:strList(d.decor),    // какие украшения сейчас стоят на льдине
    shifts:Number.isFinite(d.shifts) ? d.shifts : 0,   // сколько смен отработано
    pet:sanitizePet(d.pet),    // свой тюленёнок (Фаза 3) или null, пока не познакомились
    mail:sanitizeMail(d.mail),   // папина почта (Фаза 7)
    home:sanitizeHome(d.home),   // домик малыша (Фаза 4)
    adv:sanitizeAdv(d.adv),      // приключения (Фаза 9)
    hol:strList(d.hol),          // какие праздничные подарки уже получены ('halloween-2026', js/holidays.js)
    sea:sanitizeSea(d.sea),      // рыбки моря с рыбалки (js/minigames.js)
    nb:sanitizeNb(d.nb),         // соседи (js/neighbors.js)
    coop:sanitizeCoop(d.coop),   // играем вместе: бой с Большой Тучей (js/coop.js)
    dive:sanitizeDive(d.dive),   // подводная бухта (js/dive.js)
    st:sanitizeSt(d.st),         // тихий счётчик: время в игре и по местам (statTick в js/game.js), для папы и будущей грамоты
    story:sanitizeStory(d.story),   // «Книга острова» и дела на сегодня (js/story.js)
    storm:sanitizeStorm(d.storm),   // 🌪️ Великий шторм (js/storm.js)
    sl:sanitizeSlide(d.sl),         // 🛷 Ледяная горка (js/slide.js)
    pt:sanitizePt(d.pt),            // 🐙🐻‍❄️ гости-пациенты (js/guests.js)
    bg:sanitizeBg(d.bg),            // 🎲 Игротека (js/boardgames.js)
    isl:sanitizeIsl(d.isl),         // 🗺️ прогулка по острову (js/island.js)
    sw:sanitizeSwim(d.sw)};         // 🏊 заплыв (js/swimrace.js)
}
// isl = {got:[номера найденных звёздочек острова], n — сколько раз гуляли по острову,
//        cave:{keys, open, chest — буквы ключей r/b/y: найденные ключи, открытые двери, открытые сундуки; gem — номера 💎; n — сколько раз заходили}} (js/island.js, js/cave.js)
function sanitizeIsl(a){
  a = a && typeof a === 'object' ? a : {};
  const got = Array.isArray(a.got) ? [...new Set(a.got.filter(i => Number.isInteger(i) && i >= 0 && i < 64))] : [];
  const c = a.cave && typeof a.cave === 'object' ? a.cave : {};
  const kk = v => Array.isArray(v) ? [...new Set(v.filter(k => k === 'r' || k === 'b' || k === 'y'))] : [];
  const cave = {keys:kk(c.keys), open:kk(c.open), chest:kk(c.chest), gem:Array.isArray(c.gem) ? [...new Set(c.gem.filter(i => Number.isInteger(i) && i >= 0 && i < 32))] : [],
    n:Number.isFinite(c.n) ? Math.max(0, Math.floor(c.n)) : 0};
  return {got, n:Number.isFinite(a.n) ? Math.max(0, Math.floor(a.n)) : 0, cave};
}
// bg = {got:[коробки игр на полке], n:{игра: сколько партий}, w:{игра: побед}, day:{d, n — партий сегодня (ракушки за первые)}, box — день коробки с прогулки}
function sanitizeBg(a){
  a = a && typeof a === 'object' ? a : {};
  const cnt = v => Object.fromEntries(Object.entries(v && typeof v === 'object' ? v : {}).filter(([k, x]) => /^[a-z0-9]{2,12}$/.test(k) && Number.isFinite(x)).map(([k, x]) => [k, Math.max(0, Math.floor(x))]));
  const day = a.day && typeof a.day === 'object' ? a.day : {};
  return {got:[...new Set(strList(a.got))].filter(x => /^[a-z0-9]{2,12}$/.test(x)), n:cnt(a.n), w:cnt(a.w),
    day:{d:typeof day.d === 'string' ? day.d.slice(0, 20) : '', n:Number.isFinite(day.n) ? Math.max(0, day.n) : 0}, box:typeof a.box === 'string' ? a.box.slice(0, 20) : ''};
}
// pt = {blot — Кляксу вылечили (царапинка), bear — медведя вылечили (лапа)} (js/guests.js)
function sanitizePt(a){ a = a && typeof a === 'object' ? a : {}; return {blot:!!a.blot, bear:!!a.bear}; }
// sl = {n — сколько раз скатились, bt — лучшее время (секунды, 0 — ещё нет), st — лучшие звёзды, win — сколько раз приехали первыми в гонке,
//       gold — нашли золотую ракушку, flips — кувырков всего, net — сколько раз вместе, day:{d, n — спусков сегодня (ракушки за первые два), st — звёзды сегодня}} (js/slide.js)
function sanitizeSlide(a){
  a = a && typeof a === 'object' ? a : {};
  const num = v => Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0, dy = a.day && typeof a.day === 'object' ? a.day : {};
  return {n:num(a.n), bt:Number.isFinite(a.bt) && a.bt > 0 ? Math.round(a.bt*10)/10 : 0, st:Math.min(3, num(a.st)), win:num(a.win), gold:!!a.gold, flips:num(a.flips), net:num(a.net),
    day:{d:typeof dy.d === 'string' ? dy.d.slice(0, 20) : '', n:num(dy.n), st:Math.min(3, num(dy.st))}};
}
// sw = {n — сколько раз доплыли, best — лучшие звёзды (0…3), bt — лучшее время (с, 0 — ещё нет), win — сколько раз приплыли первыми с друзьями,
//       sec — находили короткий путь черепахи, day:{d, n — заплывов сегодня (ракушки за первые два), st — звёзды сегодня}} (js/swimrace.js)
function sanitizeSwim(a){
  a = a && typeof a === 'object' ? a : {};
  const num = v => Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0, dy = a.day && typeof a.day === 'object' ? a.day : {};
  return {n:num(a.n), best:Math.min(3, num(a.best)), bt:Number.isFinite(a.bt) && a.bt > 0 ? Math.round(a.bt*10)/10 : 0, win:num(a.win), sec:!!a.sec,
    day:{d:typeof dy.d === 'string' ? dy.d.slice(0, 20) : '', n:num(dy.n), st:Math.min(3, num(dy.st))}};
}
// storm = {st — сколько частей шторма пройдено (0…4), n — сколько раз прошли весь шторм, d — день последней игры (toDateString), net — сколько раз вместе} (js/storm.js)
function sanitizeStorm(a){
  a = a && typeof a === 'object' ? a : {};
  const num = v => Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
  return {st:Math.min(4, num(a.st)), n:num(a.n), d:typeof a.d === 'string' ? a.d.slice(0, 20) : '', net:num(a.net)};
}
// story = {open — сколько глав «Книги острова» открыто (1…8), fest:[номера отпразднованных глав], seen — сколько открытых глав уже показали,
//          pg — сколько было вылечено при прошлой проверке, hd — день, когда лечили (toDateString), td:{d, ok:[дела дня, сделанные сегодня], gift — сундучок «звезды дня» открыт (js/beats.js)},
//          sa — показали ли сцену «Идёт Великий шторм!» (когда открылась глава 8),
//          fin:{n — сколько раз был праздник острова, g:[кто на каком из 6 мест за столом]} (js/finale.js)} (js/story.js)
function sanitizeStory(a){
  a = a && typeof a === 'object' ? a : {};
  const num = v => Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0, td = a.td && typeof a.td === 'object' ? a.td : {}, fin = a.fin && typeof a.fin === 'object' ? a.fin : {};
  const open = Math.min(8, Math.max(1, num(a.open)));
  return {open, fest:[...new Set((Array.isArray(a.fest) ? a.fest : []).filter(i => Number.isInteger(i) && i >= 1 && i <= 8))],
    seen:Math.min(open, Math.max(1, num(a.seen))), pg:num(a.pg), hd:typeof a.hd === 'string' ? a.hd.slice(0, 20) : '', sa:a.sa === true,
    td:{d:typeof td.d === 'string' ? td.d.slice(0, 20) : '', ok:strList(td.ok).slice(0, 20), gift:td.gift === true},
    fin:{n:num(fin.n), g:Array.from({length:6}, (x, i) => Array.isArray(fin.g) && typeof fin.g[i] === 'string' ? fin.g[i].slice(0, 12) : '')}};
}
// st = {t — секунд в игре всего (только пока касаются экрана), days — в скольких разных днях играли, first/last — первый и последний день (YYYY-MM-DD),
//       tog — сколько раз начинали игру вместе (по сети или в гостях), g:{место: [секунд, заходов, последний день]}} — места из statPlace() в js/game.js
function sanitizeSt(a){
  a = a && typeof a === 'object' ? a : {};
  const num = v => Number.isFinite(v) ? Math.max(0, v) : 0, day = v => typeof v === 'string' ? v.slice(0, 10) : '';
  const g = a.g && typeof a.g === 'object' ? a.g : {}, out = {};
  for(const k of Object.keys(g).slice(0, 40)) if(Array.isArray(g[k])) out[k.slice(0, 12)] = [num(g[k][0]), num(g[k][1]), day(g[k][2])];
  return {t:num(a.t), days:num(a.days), first:day(a.first), last:day(a.last), tog:num(a.tog), g:out};
}
// dive = {n — сколько раз ныряли, seen:[жители из DV_LIFE, которых сфотографировали], tank:[жители бухты, позванные в аквариум иглу], day:{d, cl:[раковины, открытые сегодня]},
//         garden:[когда посажен росток, мс, или 0 — три грядки], gh:[в какой день грядка последний раз дарила ракушки],
//         turt — черепаху освободили, shark:{hid — сколько раз спрятались, friend — подружились,
//         tooth — история зуба (js/sharktooth.js): 0 — ещё нет, 1 — застряла в «Салках», ждёт в больнице, 2 — вылечили, катает; ride — день последнего катания}, map:[найденные кусочки 0–2], chest, book — подарок за всю энциклопедию,
//         big — в какой день открыли большую раковину (вдвоём), gloom:{met — сколько раз приходила Мгла, hid — спрятались, out — выбросила наверх,
//         st — история Мглы (js/gloom.js): 0 — только прятались, 1 — нашли бочку, 2 — услышали, как Мгла плачет (можно спасать), 3 — спасли Кляксу},
//         chase:{n — сколько раз доплыли в «Салках с акулой» (js/chase.js), best — лучшие звёзды, day:{d, n — погонь сегодня (ракушки за первые две), st — звёзды сегодня}}}
function sanitizeDive(a){
  a = a && typeof a === 'object' ? a : {};
  const day = a.day && typeof a.day === 'object' ? a.day : {}, sh = a.shark && typeof a.shark === 'object' ? a.shark : {}, gl = a.gloom && typeof a.gloom === 'object' ? a.gloom : {};
  const ch = a.chase && typeof a.chase === 'object' ? a.chase : {}, cd = ch.day && typeof ch.day === 'object' ? ch.day : {};
  const num = v => Number.isFinite(v) ? Math.max(0, v) : 0, three = (v, f) => [0, 1, 2].map(i => f(Array.isArray(v) ? v[i] : undefined));
  return {n:num(a.n), seen:[...new Set(strList(a.seen))],
    day:{d:typeof day.d === 'string' ? day.d : '', cl:Array.isArray(day.cl) ? [...new Set(day.cl.filter(i => i === 0 || i === 1 || i === 2))] : []},
    garden:three(a.garden, num), gh:three(a.gh, v => typeof v === 'string' ? v : ''),
    turt:!!a.turt, shark:{hid:num(sh.hid), friend:!!sh.friend, tooth:Math.min(2, Math.floor(num(sh.tooth))), ride:typeof sh.ride === 'string' ? sh.ride.slice(0, 20) : ''},
    map:Array.isArray(a.map) ? [...new Set(a.map.filter(i => i === 0 || i === 1 || i === 2))] : [], chest:!!a.chest, book:!!a.book, tank:[...new Set(strList(a.tank))].slice(0, 20),
    big:typeof a.big === 'string' ? a.big : '', gloom:{met:num(gl.met), hid:num(gl.hid), out:num(gl.out), st:Math.min(3, Math.floor(num(gl.st)))},
    chase:{n:num(ch.n), best:Math.min(3, Math.floor(num(ch.best))), day:{d:typeof cd.d === 'string' ? cd.d.slice(0, 20) : '', n:num(cd.n), st:Math.min(3, Math.floor(num(cd.st)))}}};
}
// coop = {wins — побед над Большой Тучей, tries — боёв, net — побед по сети, day:{d, n} — сколько побед сегодня (ракушки за первые две),
//         gull:{d, n} — полёты чайкой, resc:{wins, day:{d, n}, lv:{bay, grot}, pearls:{bay:[], grot:[]}} — спасённые потеряшки:
//         всего, сегодня, по уровням и найденные жемчужинки (номера 0–2),
//         road — сколько раз добежали «Дорогу к Туче» (js/cloudroad.js),
//         ice:{wins, day:{d, n}, got:[коды]} — «Ледяной код» (js/icecode.js): разгадано, сегодня (ракушки за первые три), чьи коды уже разгаданы,
//         visit:{n, d} — «Остров в гостях» (js/visit.js): сколько раз были в гостях или звали, день последнего фото}
function sanitizeCoop(a){
  a = a && typeof a === 'object' ? a : {};
  const n = v => Number.isFinite(v) ? Math.max(0, v) : 0, day = a.day && typeof a.day === 'object' ? a.day : {};
  const gl = a.gull && typeof a.gull === 'object' ? a.gull : {};   // gull — сколько раз сегодня летал чайкой в чужом забеге (js/gull.js)
  const rs = a.resc && typeof a.resc === 'object' ? a.resc : {}, rd = rs.day && typeof rs.day === 'object' ? rs.day : {};   // resc — «Спасаем потеряшку» (js/rescue.js): победы и сколько сегодня
  const lvs = {}, prl = {}, ob = v => v && typeof v === 'object' ? v : {};
  const ic = ob(a.ice), id = ob(ic.day);   // ice — «Ледяной код»
  for(const [k, v] of Object.entries(ob(rs.lv))) if(/^[a-z]{2,8}$/.test(k)) lvs[k] = n(v);
  for(const [k, v] of Object.entries(ob(rs.pearls))) if(/^[a-z]{2,8}$/.test(k) && Array.isArray(v)) prl[k] = [...new Set(v.filter(i => Number.isInteger(i) && i >= 0 && i < 3))].sort();
  return {wins:n(a.wins), tries:n(a.tries), net:n(a.net), day:{d:typeof day.d === 'string' ? day.d : '', n:n(day.n)},
    gull:{d:typeof gl.d === 'string' ? gl.d : '', n:n(gl.n)},
    resc:{wins:n(rs.wins), day:{d:typeof rd.d === 'string' ? rd.d : '', n:n(rd.n)}, lv:lvs, pearls:prl},
    visit:{n:n(ob(a.visit).n), d:typeof ob(a.visit).d === 'string' ? ob(a.visit).d.slice(0, 20) : ''},   // «Остров в гостях» (js/visit.js): встреч и день фото
    cs:{n:Math.min(3, n(ob(a.cs).n)), d:typeof ob(a.cs).d === 'string' ? ob(a.cs).d.slice(0, 20) : '', cure:Math.min(2, n(ob(a.cs).cure)), rain:typeof ob(a.cs).rain === 'string' ? ob(a.cs).rain.slice(0, 20) : ''},   // история Тучи (js/cloudcure.js)
    road:n(a.road), rday:typeof a.rday === 'string' ? a.rday.slice(0, 20) : '', ice:{wins:n(ic.wins), day:{d:typeof id.d === 'string' ? id.d : '', n:n(id.n)},
      got:Array.isArray(ic.got) ? ic.got.filter(c => typeof c === 'string' && /^[0-9A-Z]{4}$/.test(c)).slice(-60) : []}};
}
// nb = {ping:{in — Пинг живёт по соседству с малышом, xp — дружба 💙 (сколько просьб выполнено),
//        q:{d — день, id — просьба дня из PING_ASKS, ok — выполнена, got — подарок забран}}}
function sanitizeNb(a){
  a = a && typeof a === 'object' ? a : {};
  const p = a.ping && typeof a.ping === 'object' ? a.ping : {}, q = p.q && typeof p.q === 'object' ? p.q : {};
  return {ping:{in:!!p.in, xp:Number.isFinite(p.xp) ? Math.max(0, p.xp) : 0,
    q:{d:typeof q.d === 'string' ? q.d : '', id:typeof q.id === 'string' ? q.id : '', ok:!!q.ok, got:!!q.got}}};
}
// sea = {got:[виды из SEA_FISH, пойманные хоть раз — южные живут в аквариуме], n — сколько всего поймали, r — на каком улове была последняя южная гостья,
//        d:{d — день, n — уловов на острове в этот день (первые ISL_FISH_DAY — с ракушкой)}} (js/minigames.js, js/island.js)
function sanitizeSea(a){
  a = a && typeof a === 'object' ? a : {};
  const d = a.d && typeof a.d === 'object' ? a.d : {};
  return {got:[...new Set(strList(a.got))], n:Number.isFinite(a.n) ? a.n : 0, r:Number.isFinite(a.r) ? a.r : 0,
    d:{d:typeof d.d === 'string' ? d.d : '', n:Number.isFinite(d.n) ? Math.max(0, d.n) : 0}};
}
// adv = {best:{уровень: звёзды 0…3}, cups:[уровни, где спасли всех рыбок — кубок на полке в домике], runs, day:{d, n} — забегов сегодня,
//        tips:[какие подсказки забега уже показали: lane, boost, snow, tickle],
//        fish:[спасённые рыбки RUN_FISH — живут в аквариуме в домике], sec:[уровни, где нашли секретную ракушку],
//        quest:{d — день, ids — три задания дня, done — какие выполнены}} (js/adventure.js)
function sanitizeAdv(a){
  a = a && typeof a === 'object' ? a : {};
  const best = a.best && typeof a.best === 'object' ? Object.fromEntries(Object.entries(a.best).filter(([, v]) => Number.isInteger(v)).map(([k, v]) => [k, Math.min(3, Math.max(0, v))])) : {};
  const day = a.day && typeof a.day.d === 'string' && Number.isFinite(a.day.n) ? {d:a.day.d, n:a.day.n} : {d:'', n:0};
  return {best, cups:[...new Set(strList(a.cups))], runs:Number.isFinite(a.runs) ? a.runs : 0, day, tips:[...new Set(strList(a.tips))],
    fish:[...new Set(strList(a.fish))], sec:[...new Set(strList(a.sec))],
    quest:a.quest && typeof a.quest.d === 'string' ? {d:a.quest.d, ids:strList(a.quest.ids), done:strList(a.quest.done)} : {d:'', ids:[], done:[]}};
}
// home = {f:{id вещи: [комната, x, z, поворот]}, paint, v, fed, rooms, build, oc} — мебель в иглу малыша (js/home.js, редактор js/homeedit.js),
// заходили ли туда, в какой день кормили рыбок. Мебель стоит где угодно (Спринт 8): комната 'hall' | 'games' | 'trophy' | 'ocean', x и z — точка пола
// (у настенной вещи x — угол по стене, z — высота-угол), поворот — в радианах. [комната] без чисел — «на своё обычное место» (HOME_SLOTS её вида),
// home.js сам найдёт там свободное место и допишет числа. Нет ключа — вещь в коробке. Купленная мебель, как и всё из лавки, лежит в owned.
// paint = {комната: {w, f}} — краска стен и пола (HE_WALLS / HE_FLOORS в js/homeedit.js; купленные краски — 'pw_…' / 'pf_…' в owned).
// Комнаты иглу (Спринт 7, js/ocean.js): rooms = {id: 1 — построена, 2 — уже заходили}, build = {id, d} — что строится и в какой день
// заказали (готово на следующий день) или null; oc — кого уже видели в океанариуме ('sea:clown', 'run:minty', 'pal:crab'): новенькие подплывают к стеклу.
const HOME_ROOM_IDS = ['hall', 'games', 'trophy', 'ocean'];
// до версии 2 мебель стояла по местам: s = {место: id вещи}. Вид места подсказывает комнату (oc… — океанариум, gm… — игровая, tr… — трофеи)
const homeSlotRoom = k => /^oc/.test(k) ? 'ocean' : /^gm/.test(k) ? 'games' : /^tr/.test(k) ? 'trophy' : 'hall';
function homeFromSlots(s){
  const f = {};
  for(const [k, id] of Object.entries(s && typeof s === 'object' ? s : {})) if(typeof id === 'string') f[id] = [homeSlotRoom(k)];
  return f;
}
function sanitizeHome(h){
  h = h && typeof h === 'object' ? h : null;
  const f0 = !h ? {bed_basic:['hall'], win_basic:['hall'], shelf:['hall']} : h.f && typeof h.f === 'object' ? h.f : homeFromSlots(h.s);
  const f = {};
  for(const [id, p] of Object.entries(f0)){
    if(!Array.isArray(p) || !HOME_ROOM_IDS.includes(p[0])) continue;
    const n = p.slice(1, 4);
    f[id] = n.length === 3 && n.every(Number.isFinite) ? [p[0], ...n.map(v => Math.round(Math.max(-12, Math.min(12, v))*1000)/1000)] : [p[0]];
  }
  h = h || {};
  const paint = {};
  for(const [r, v] of Object.entries(h.paint && typeof h.paint === 'object' ? h.paint : {})){
    if(!HOME_ROOM_IDS.includes(r) || !v || typeof v !== 'object') continue;
    const w = typeof v.w === 'string' ? v.w.slice(0, 12) : '', fl = typeof v.f === 'string' ? v.f.slice(0, 12) : '';
    if(w || fl) paint[r] = {w, f:fl};
  }
  const rooms = h.rooms && typeof h.rooms === 'object' ? Object.fromEntries(Object.entries(h.rooms).filter(([, v]) => v === 1 || v === 2)) : {};
  const build = h.build && typeof h.build.id === 'string' && typeof h.build.d === 'string' && !rooms[h.build.id] ? {id:h.build.id, d:h.build.d.slice(0, 20)} : null;
  return {f, paint, v:!!h.v, fed:typeof h.fed === 'string' ? h.fed.slice(0, 20) : '', rooms, build, oc:strList(h.oc).slice(-160)};
}
// mail = {got:[{id, t}], d} — полученные письма (id из letterId(), t — когда открыли) и день последнего «письма дня» (ymd)
function sanitizeMail(m){
  m = m && typeof m === 'object' ? m : {};
  const got = Array.isArray(m.got) ? m.got.filter(x => x && typeof x.id === 'string' && Number.isFinite(x.t)).map(x => ({id:x.id, t:x.t})) : [];
  return {got, d:typeof m.d === 'string' ? m.d : ''};
}
// pet = {name, f, coat, born, xp, stage, t, seen, needs:{food, bath, sleep, fun}, wear:{head, face}, pat:{d, n}, walk:{d, n}, finds:[], tricks:{}}
// needs — от 0 (очень хочет) до 1 (всё хорошо), тают со временем; t — когда их пересчитали последний раз
// seen — когда малыша последний раз навещали в уголке: долго не заходили — он встречает радостно («Я скучал!»)
// stage — стадия роста, которую уже отпраздновали (0 малыш … 4 сияющий); если опыт xp дорос до следующей — будет праздник
// pat — сколько раз сегодня (d = дата) гладили за сердечки: ласка даёт опыт не больше PAT_MAX раз в день
// finds — находки с прогулок (id из TREASURES), walk — сколько раз гуляли сегодня (новая находка — раз в день),
// tricks — звёзды за трюки {paw:0…3, …} (js/walk.js)
function sanitizePet(p){
  if(!p || typeof p !== 'object' || typeof p.name !== 'string' || !p.name.trim()) return null;
  const n = p.needs && typeof p.needs === 'object' ? p.needs : {}, level = v => Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0.5;
  const w = p.wear && typeof p.wear === 'object' ? p.wear : {};
  const t = Number.isFinite(p.t) ? p.t : Date.now();
  return {name:p.name.trim().slice(0, 14), f:!!p.f, coat:typeof p.coat === 'string' ? p.coat : 'snow',
    born:Number.isFinite(p.born) ? p.born : Date.now(), xp:Number.isFinite(p.xp) ? Math.max(0, p.xp) : 0,
    stage:Number.isInteger(p.stage) ? Math.min(4, Math.max(0, p.stage)) : 0,
    t, seen:Number.isFinite(p.seen) ? p.seen : t,
    pat:p.pat && typeof p.pat.d === 'string' && Number.isFinite(p.pat.n) ? {d:p.pat.d, n:p.pat.n} : {d:'', n:0},
    walk:p.walk && typeof p.walk.d === 'string' && Number.isFinite(p.walk.n) ? {d:p.walk.d, n:p.walk.n} : {d:'', n:0},
    finds:[...new Set(strList(p.finds))], played:!!p.played || strList(p.finds).length > 0,   // played — уже играли вместе (после этого в уголке появляется «В гости»)
    tricks:Object.fromEntries(Object.entries(p.tricks && typeof p.tricks === 'object' ? p.tricks : {}).filter(([, v]) => Number.isInteger(v)).map(([k, v]) => [k, Math.min(3, Math.max(0, v))])),
    needs:{food:level(n.food), bath:level(n.bath), sleep:level(n.sleep), fun:level(n.fun)},
    wear:Object.fromEntries(['head', 'face'].filter(k => typeof w[k] === 'string').map(k => [k, w[k]]))};
}
function strList(a){ return Array.isArray(a) ? a.filter(x => typeof x === 'string') : []; }
// Доводит сохранение любой версии до текущей (миграции + sanitize). Общая часть для загрузки и для кода сохранения.
function upgrade(d){
  let v = d.version;
  while(v < SAVE_VERSION){ d = MIGRATIONS[v](d); v++; }
  return sanitize(d);
}
function loadSave(){
  let d = store.get(SAVE_KEY, null);
  if(!(d && typeof d === 'object' && Number.isInteger(d.version))) d = {version:0};
  const migrated = d.version < SAVE_VERSION;
  d = upgrade(d);
  if(migrated) store.set(SAVE_KEY, d);
  return d;
}
const save = loadSave();
const persist = () => store.set(SAVE_KEY, save);
// имя активного игрока — в списке (показывается в ⚙️ «Игроки»); список запоминаем при любом изменении
function playersSave(){ store.set(PLAYERS_KEY, PLAYERS.list); store.set(PLAYER_KEY, PLAYERS.cur); }
function playersSync(){
  const me = PLAYERS.list.find(p => p.id === PLAYERS.cur);
  if(save.who.asked && me.name !== save.who.name){ me.name = save.who.name; }
  playersSave();
}
// Переключиться на другого игрока (или завести нового: id = null) — сцена собирается из сохранения при запуске, поэтому перезагружаем страницу.
function playerSwitch(id){
  persist();
  if(!id){
    let n = 1; while(PLAYERS.list.some(p => p.id === 'p' + n)) n++;
    id = 'p' + n; PLAYERS.list.push({id, name:''});
  }
  PLAYERS.cur = id; playersSave(); location.reload();
}
playersSync();
const pname = () => save.who.name;                          // имя игрока (по умолчанию — Сабрина)
const pg = (m, f) => save.who.g === 'm' ? m : f;             // род игрока: pg('вылечил', 'вылечила')
const isSabrinaPlayer = () => save.who.name === L('Сабрина', 'Sabrina') && save.who.g === 'f';   // папины письма и записки — только у неё

// Просим браузер не стирать сохранение, когда ему не хватает места (Chrome решает сам, Firefox спросит, Safari даёт установленным на экран).
// Зовём после нажатия, а не при загрузке: так браузеру проще согласиться. Ответ нужен только для подсказки в настройках.
function keepSave(){
  try{
    const st = navigator.storage;
    if(!st || !st.persist) return Promise.resolve(null);
    return st.persisted().then(p => p || st.persist()).catch(() => null);
  }catch(e){ return Promise.resolve(null); }
}

/* ---------------- код сохранения ---------------- */
// «Код» = SEAL1.<контрольная сумма>.<сохранение в base64>. Нужен, чтобы перенести малыша на другое устройство и хранить копию.
// Фото альбома в код не входят (они тяжёлые), всё остальное — да. Сумма ловит обрезанную или испорченную вставку.
const CODE_TAG = 'SEAL1';
function codeSum(str){ let h = 5381; for(let i = 0; i < str.length; i++) h = ((h*33) ^ str.charCodeAt(i)) >>> 0; return h.toString(36); }
function makeCode(){
  const b = btoa(unescape(encodeURIComponent(JSON.stringify({...save, album:[]})))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${CODE_TAG}.${codeSum(b)}.${b}`;
}
// возвращает уже проверенное и доведённое до текущей версии сохранение или null
function readCode(text){
  try{
    const [tag, sum, b] = String(text).replace(/[\s"'`«»]+/g, '').split('.');
    if(tag !== CODE_TAG || !b || codeSum(b) !== sum) return null;
    const d = JSON.parse(decodeURIComponent(escape(atob(b.replace(/-/g, '+').replace(/_/g, '/')))));
    if(!d || typeof d !== 'object' || !Number.isInteger(d.version) || d.version < 1) return null;
    return upgrade(d);
  }catch(e){ return null; }
}

/* ---------------- game data ---------------- */
const TOOLS = {
  thermo:  {icon:'🌡️', name:L('Градусник', 'Thermo'), task:L('Измерить температуру', 'Take temperature')},
  medicine:{icon:'💊', name:L('Лекарство', 'Medicine'), task:L('Дать лекарство', 'Give medicine')},
  bandage: {icon:'🩹', name:L('Пластырь', 'Bandage'), task:L('Заклеить ранку', 'Cover the scratch')},
  fish:    {icon:'🐟', name:L('Рыбка', 'Fish'), task:L('Покормить', 'Feed')},
  scarf:   {icon:'🧣', name:L('Шарфик', 'Scarf'), task:L('Согреть шарфиком', 'Warm up with a scarf')}
};
const ORDER = ['thermo','medicine','bandage','fish','scarf'];
const PATIENTS = [
  {name:L('Моти', 'Mochi'), f:false, color:0xF7F5EF, ail:['cold','sneeze'], text:L('Моти весь день катался с ледяной горки. Замёрз и теперь чихает.', 'Mochi has been sliding down the ice slide all day. Now he is cold and sneezing.')},
  {name:L('Бублик', 'Bagel'), f:false, color:0xCBD2DC, spot:0x98A3B4, ail:['scratch','hungry'], text:L('Бублик поцарапал лобик об острую льдинку и очень-очень проголодался.', 'Bagel scratched his forehead on a sharp piece of ice and is very, very hungry.')},
  {name:L('Зефирка', 'Marshmallow'), f:true, color:0xF8DDE4, ail:['fever','sneeze'], text:L('У Зефирки горячий лоб, и она всё время чихает. Похоже, простуда!', 'Marshmallow has a hot forehead and keeps sneezing. Looks like a cold!')},
  {name:L('Тюпа', 'Tyupa'), f:false, color:0xEFE4CF, spot:0xD2BF9C, ail:['scratch','cold'], text:L('Тюпа нырял за ракушкой, стукнулся о льдину и замёрз.', 'Tyupa dove for a shell, bumped into the ice and got cold.')},
  {name:L('Пельмешка', 'Dumpling'), f:true, color:0xE6ECF5, ail:['hungry','cold'], text:L('Пельмешка уплыла далеко от дома, замёрзла и ничего не ела с утра.', 'Dumpling swam far from home, got cold and has not eaten since morning.')},
  {name:L('Снежок', 'Snowball'), f:false, color:0xFFFFFF, spot:0xD6DCE6, ail:['fever','hungry'], text:L('Снежок какой-то вялый: лоб горячий, а в животике урчит.', 'Snowball looks sleepy: his forehead is hot and his tummy is rumbling.')},
  {name:L('Ириска', 'Toffee'), f:true, color:0xE3CBAE, spot:0xC4A27E, ail:['scratch','sneeze','hungry'], text:L('Ириска поцарапала лобик, чихает и мечтает о рыбке.', 'Toffee scratched her forehead, keeps sneezing and dreams of a fish.')},
  {name:L('Кнопка', 'Button'), f:true, color:0xC4CCDA, spot:0x8E99AD, ail:['fever','cold','scratch','hungry'], text:L('Кнопка — самый трудный пациент: жар, замёрзла, поцарапалась и голодная. Доктор, вся надежда на тебя!', 'Button is the hardest patient: fever, cold, a scratch and hungry. Doctor, all hope is on you!')}
];
// симптомы, которые доктор находит лупой (Фаза 1)
const SYMPTOMS = {
  fever:  {ic:'🤒', name:() => L('Горячий лоб', 'Hot forehead')},
  sneeze: {ic:'🤧', name:() => L('Чихает', 'Sneezing')},
  scratch:{ic:'🤕', name:() => L('Ранка', 'Scratch')},
  hungry: {ic:'😋', name:f => L(f ? 'Голодная' : 'Голодный', 'Hungry')},
  cold:   {ic:'🥶', name:f => L(f ? 'Замёрзла' : 'Замёрз', 'Cold')}
};
const PHRASE = {fever:L('горячий лоб', 'hot forehead'), sneeze:L('чихает', 'sneezing'), scratch:L('ранка на лобике', 'a scratch on the forehead'), hungry:L('урчит животик', 'a rumbling tummy'), cold:f => L(f ? 'замёрзла' : 'замёрз', 'feeling cold')};
// «Спасибо» вылеченного пациента: про то, что лечили, плюс общие; одна и та же фраза два раза подряд не выпадает
const THANKS = {
  fever:  [f => L(`Лобик больше не горячий! Спасибо, доктор ${pname()}!`, `My forehead isn't hot anymore! Thank you, Doctor ${pname()}!`)],
  sneeze: [f => L('Апчхи… ой, а я больше не чихаю! Спасибо!', 'Achoo… oh, I\'m not sneezing anymore! Thank you!')],
  scratch:[f => L(`С пластырем я ${f ? 'как настоящая героиня' : 'как настоящий герой'}!`, 'With this bandage I look like a real hero!')],
  hungry: [f => L('Рыбка была такая вкусная! Ням-ням, спасибо!', 'That fish was so yummy! Nom-nom, thank you!')],
  cold:   [f => L(`Шарфик такой тёплый! Я ${f ? 'согрелась' : 'согрелся'}, спасибо!`, 'The scarf is so warm! I\'m all cozy now, thank you!')],
  any:    [f => L(`Спасибо, доктор ${pname()}!`, `Thank you, Doctor ${pname()}!`),
           f => L('Ты самый лучший доктор на всём льду!', 'You\'re the best doctor on the whole ice!'),
           f => L('Я расскажу всем друзьям про твою больницу!', 'I\'ll tell all my friends about your hospital!'),
           f => L(`Я снова ${f ? 'здорова' : 'здоров'} и могу нырять! Спасибо!`, 'I\'m well again and can dive! Thank you!'),
           f => L('Можно я тебя ещё разочек обниму?', 'Can I hug you one more time?')],
  wear:   [f => L('А можно мне оставить этот наряд? Он чудесный!', 'Can I keep this outfit? It\'s wonderful!')]
};
let lastThanks = null;
function thanksFor(p, dressed){
  const pool = [...p.ail.flatMap(a => THANKS[a] || []), ...THANKS.any, ...(dressed ? THANKS.wear : [])].filter(t => t !== lastThanks);
  lastThanks = pool[Math.floor(Math.random()*pool.length)];
  return lastThanks(p.f);
}
function patientFor(n){
  if(n < PATIENTS.length) return PATIENTS[n];
  const base = PATIENTS[Math.floor(Math.random()*PATIENTS.length)];
  const pool = ['fever','sneeze','scratch','hungry','cold'].sort(() => Math.random() - 0.5);
  const ail = pool.slice(0, 2 + (Math.random() < 0.35 ? 1 : 0));
  const list = ail.map(a => typeof PHRASE[a] === 'function' ? PHRASE[a](base.f) : PHRASE[a]);
  return {...base, ail, text:L(`${base.name} снова ${base.f ? 'приплыла' : 'приплыл'} в больницу: ${list.join(', ')}.`, `${base.name} is back at the hospital: ${list.join(', ')}.`)};
}
// 1 рыбка, 2 рыбки, 5 рыбок; по-английски — enOne для 1, enMany для остальных (1 fish, 2 fish)
function plural(n, one, few, many, enOne, enMany){
  if(LANG === 'en') return n === 1 ? enOne : enMany;
  const a = n % 10, b = n % 100;
  return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many;
}
function needsFor(ail){
  const set = new Set();
  for(const a of ail){ ({fever:['thermo','medicine'], sneeze:['medicine'], scratch:['bandage'], hungry:['fish'], cold:['scarf']})[a].forEach(x => set.add(x)); }
  return ORDER.filter(x => set.has(x));
}
