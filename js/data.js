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
// Всё сохранение живёт под одним ключом sh.save: {version, album, progress, muted, fish}.
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
    fish:Number.isFinite(d.fish) ? d.fish : 0};   // рыбки в ведре (Фаза 1, рыбалка)
}
function loadSave(){
  let d = store.get(SAVE_KEY, null), v = 0;
  if(d && typeof d === 'object' && Number.isInteger(d.version)) v = d.version; else d = {};
  const migrated = v < SAVE_VERSION;
  while(v < SAVE_VERSION){ d = MIGRATIONS[v](d); v++; }
  d = sanitize(d);
  if(migrated) store.set(SAVE_KEY, d);
  return d;
}
const save = loadSave();
const persist = () => store.set(SAVE_KEY, save);

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
