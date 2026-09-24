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
// Всё сохранение живёт под одним ключом sh.save: {version, album, progress, muted, fish, shells, owned, decor, shifts, pet, mail, home, adv}.
// Новое поле: добавь значение по умолчанию в sanitize(); если меняется смысл старых
// данных — подними SAVE_VERSION и добавь функцию в MIGRATIONS (индекс = версия «из»).
const SAVE_KEY = 'sh.save', SAVE_VERSION = 1;
const MIGRATIONS = [
  // 0 → 1: раньше было три отдельных ключа sh.album, sh.progress, sh.muted
  () => ({album:store.get('sh.album', []), progress:store.get('sh.progress', 0), muted:store.get('sh.muted', false)})
];
function sanitize(d){
  return {...d, version:SAVE_VERSION,
    album:Array.isArray(d.album) ? d.album : [],
    progress:Number.isFinite(d.progress) ? d.progress : 0,
    muted:!!d.muted,
    fish:Number.isFinite(d.fish) ? d.fish : 0,     // рыбки в ведре (Фаза 1, рыбалка)
    shells:Number.isFinite(d.shells) ? Math.max(0, d.shells) : 0,   // ракушки — валюта (Фаза 2)
    owned:strList(d.owned),    // купленное в лавке (id из SHOP)
    decor:strList(d.decor),    // какие украшения сейчас стоят на льдине
    shifts:Number.isFinite(d.shifts) ? d.shifts : 0,   // сколько смен отработано
    pet:sanitizePet(d.pet),    // свой тюленёнок (Фаза 3) или null, пока не познакомились
    mail:sanitizeMail(d.mail),   // папина почта (Фаза 7)
    home:sanitizeHome(d.home),   // домик малыша (Фаза 4)
    adv:sanitizeAdv(d.adv)};     // приключения (Фаза 9)
}
// adv = {best:{уровень: звёзды 0…3}, cups:[уровни, где спасли всех рыбок — кубок на полке в домике], runs, day:{d, n} — забегов сегодня,
//        tips:[какие подсказки забега уже показали: lane, boost, snow, tickle]} (js/adventure.js)
function sanitizeAdv(a){
  a = a && typeof a === 'object' ? a : {};
  const best = a.best && typeof a.best === 'object' ? Object.fromEntries(Object.entries(a.best).filter(([, v]) => Number.isInteger(v)).map(([k, v]) => [k, Math.min(3, Math.max(0, v))])) : {};
  const day = a.day && typeof a.day.d === 'string' && Number.isFinite(a.day.n) ? {d:a.day.d, n:a.day.n} : {d:'', n:0};
  return {best, cups:[...new Set(strList(a.cups))], runs:Number.isFinite(a.runs) ? a.runs : 0, day, tips:[...new Set(strList(a.tips))]};
}
// home = {s:{слот: id вещи}, v} — мебель в иглу малыша (js/home.js) и заходили ли туда. Нет поля — стартовая мебель.
// Купленная мебель, как и всё из лавки, лежит в owned; пустой слот — просто нет ключа.
function sanitizeHome(h){
  if(!h || typeof h !== 'object' || !h.s || typeof h.s !== 'object') return {s:{bed:'bed_basic', window:'win_basic', shelf:'shelf'}, v:false};
  return {s:Object.fromEntries(Object.entries(h.s).filter(([, v]) => typeof v === 'string')), v:!!h.v};
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
    finds:[...new Set(strList(p.finds))],
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
  fever:  [f => L('Лобик больше не горячий! Спасибо, доктор Сабрина!', 'My forehead isn\'t hot anymore! Thank you, Doctor Sabrina!')],
  sneeze: [f => L('Апчхи… ой, а я больше не чихаю! Спасибо!', 'Achoo… oh, I\'m not sneezing anymore! Thank you!')],
  scratch:[f => L(`С пластырем я ${f ? 'как настоящая героиня' : 'как настоящий герой'}!`, 'With this bandage I look like a real hero!')],
  hungry: [f => L('Рыбка была такая вкусная! Ням-ням, спасибо!', 'That fish was so yummy! Nom-nom, thank you!')],
  cold:   [f => L(`Шарфик такой тёплый! Я ${f ? 'согрелась' : 'согрелся'}, спасибо!`, 'The scarf is so warm! I\'m all cozy now, thank you!')],
  any:    [f => L('Спасибо, доктор Сабрина!', 'Thank you, Doctor Sabrina!'),
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
