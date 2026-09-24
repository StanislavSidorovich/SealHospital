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
// Всё сохранение живёт под одним ключом sh.save: {version, album, progress, muted, fish, shells, owned, decor, shifts, pet}.
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
    pet:sanitizePet(d.pet)};   // свой тюленёнок (Фаза 3) или null, пока не познакомились
}
// pet = {name, f, coat, born, xp, stage, t, seen, needs:{food, bath, sleep, fun}, wear:{head, face}, pat:{d, n}}
// needs — от 0 (очень хочет) до 1 (всё хорошо), тают со временем; t — когда их пересчитали последний раз
// seen — когда малыша последний раз навещали в уголке: долго не заходили — он встречает радостно («Я скучал!»)
// stage — стадия роста, которую уже отпраздновали (0 малыш … 4 сияющий); если опыт xp дорос до следующей — будет праздник
// pat — сколько раз сегодня (d = дата) гладили за сердечки: ласка даёт опыт не больше PAT_MAX раз в день
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
  thermo:  {icon:'🌡️', name:'Градусник', task:'Измерить температуру'},
  medicine:{icon:'💊', name:'Лекарство', task:'Дать лекарство'},
  bandage: {icon:'🩹', name:'Пластырь', task:'Заклеить ранку'},
  fish:    {icon:'🐟', name:'Рыбка', task:'Покормить'},
  scarf:   {icon:'🧣', name:'Шарфик', task:'Согреть шарфиком'}
};
const ORDER = ['thermo','medicine','bandage','fish','scarf'];
const PATIENTS = [
  {name:'Моти', f:false, color:0xF7F5EF, ail:['cold','sneeze'], text:'Моти весь день катался с ледяной горки. Замёрз и теперь чихает.'},
  {name:'Бублик', f:false, color:0xCBD2DC, spot:0x98A3B4, ail:['scratch','hungry'], text:'Бублик поцарапал лобик об острую льдинку и очень-очень проголодался.'},
  {name:'Зефирка', f:true, color:0xF8DDE4, ail:['fever','sneeze'], text:'У Зефирки горячий лоб, и она всё время чихает. Похоже, простуда!'},
  {name:'Тюпа', f:false, color:0xEFE4CF, spot:0xD2BF9C, ail:['scratch','cold'], text:'Тюпа нырял за ракушкой, стукнулся о льдину и замёрз.'},
  {name:'Пельмешка', f:true, color:0xE6ECF5, ail:['hungry','cold'], text:'Пельмешка уплыла далеко от дома, замёрзла и ничего не ела с утра.'},
  {name:'Снежок', f:false, color:0xFFFFFF, spot:0xD6DCE6, ail:['fever','hungry'], text:'Снежок какой-то вялый: лоб горячий, а в животике урчит.'},
  {name:'Ириска', f:true, color:0xE3CBAE, spot:0xC4A27E, ail:['scratch','sneeze','hungry'], text:'Ириска поцарапала лобик, чихает и мечтает о рыбке.'},
  {name:'Кнопка', f:true, color:0xC4CCDA, spot:0x8E99AD, ail:['fever','cold','scratch','hungry'], text:'Кнопка — самый трудный пациент: жар, замёрзла, поцарапалась и голодная. Доктор, вся надежда на тебя!'}
];
// симптомы, которые доктор находит лупой (Фаза 1)
const SYMPTOMS = {
  fever:  {ic:'🤒', name:() => 'Горячий лоб'},
  sneeze: {ic:'🤧', name:() => 'Чихает'},
  scratch:{ic:'🤕', name:() => 'Ранка'},
  hungry: {ic:'😋', name:f => f ? 'Голодная' : 'Голодный'},
  cold:   {ic:'🥶', name:f => f ? 'Замёрзла' : 'Замёрз'}
};
const PHRASE = {fever:'горячий лоб', sneeze:'чихает', scratch:'ранка на лобике', hungry:'урчит животик', cold:f => f ? 'замёрзла' : 'замёрз'};
function patientFor(n){
  if(n < PATIENTS.length) return PATIENTS[n];
  const base = PATIENTS[Math.floor(Math.random()*PATIENTS.length)];
  const pool = ['fever','sneeze','scratch','hungry','cold'].sort(() => Math.random() - 0.5);
  const ail = pool.slice(0, 2 + (Math.random() < 0.35 ? 1 : 0));
  const list = ail.map(a => typeof PHRASE[a] === 'function' ? PHRASE[a](base.f) : PHRASE[a]);
  return {...base, ail, text:`${base.name} снова ${base.f ? 'приплыла' : 'приплыл'} в больницу: ${list.join(', ')}.`};
}
// 1 рыбка, 2 рыбки, 5 рыбок
function plural(n, one, few, many){
  const a = n % 10, b = n % 100;
  return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many;
}
function needsFor(ail){
  const set = new Set();
  for(const a of ail){ ({fever:['thermo','medicine'], sneeze:['medicine'], scratch:['bandage'], hungry:['fish'], cold:['scarf']})[a].forEach(x => set.add(x)); }
  return ORDER.filter(x => set.has(x));
}
