/* ---------------- Праздники (Фаза 6): игра знает, какой сегодня день ----------------
   По дате на устройстве в игре начинается праздник: льдины больницы и малыша украшаются сами,
   на первом экране поздравление, и раз в год — подарок (особая шапочка в гардероб или ракушки).
   Нового интерфейса нет: мир просто наряжается. Посмотреть заранее: ?holiday=halloween (newyear, valentine, bday).
   День рождения Сабрины папа вписывает в BDAY ([месяц, число]) — год не пишем: репозиторий публичный.
   Подключается после mail.js (почтовый ящик, уголок малыша) и до game.js. */
const BDAY = null;   // например [5, 17] — 17 мая
const HOLIDAYS = [
  {id:'halloween', from:[10, 24], to:[11, 1], ic:'🎃', greet:L('С Хэллоуином!', 'Happy Halloween!'), gift:{wear:'pumpkin'}},
  {id:'newyear',   from:[12, 20], to:[1, 7],  ic:'🎄', greet:L('С Новым годом!', 'Happy New Year!'), gift:{wear:'santa'}},
  {id:'valentine', from:[2, 12],  to:[2, 14], ic:'💗', greet:L('С Днём всех влюблённых!', 'Happy Valentine\'s Day!'), gift:{shells:14}},
  {id:'bday',      from:BDAY,     to:BDAY,    ic:'🎂', greet:L('С днём рождения, Сабрина!', 'Happy birthday, Sabrina!'), gift:{shells:30}}
];
// праздничные шапочки: в лавке не продаются (gift:true), приходят подарком
SHOP.push({id:'pumpkin', kind:'wear', slot:'head', name:L('Шапочка-тыква', 'Pumpkin hat'), gift:true},
  {id:'santa', kind:'wear', slot:'head', name:L('Новогодний колпак', 'Holiday hat'), gift:true});
WEAR.pumpkin = () => {   // оранжевая «тыква»-шапочка с рёбрышками, хвостиком и листиком
  const g = new THREE.Group(), m = toon(0xFF9A3D);
  const dome = addOutline(new THREE.Mesh(new THREE.SphereGeometry(0.46, 24, 12, 0, Math.PI*2, 0, Math.PI/2), m), 1.05); dome.scale.y = 0.9; g.add(dome);
  for(let i = 0; i < 3; i++){ const r = new THREE.Mesh(new THREE.TorusGeometry(0.462, 0.018, 6, 24, Math.PI), toon(0xE07A24)); r.scale.y = 0.9; r.rotation.y = i*Math.PI/3; g.add(r); }
  const stem = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.18, 8), toon(0x7A9A4A)), 1.15); stem.position.y = 0.48; stem.rotation.z = 0.2; g.add(stem);
  const leaf = addOutline(new THREE.Mesh(SMALL, toon(0x86C96A)), 1.12); leaf.scale.set(0.13, 0.03, 0.07); leaf.position.set(0.12, 0.47, 0.02); leaf.rotation.z = -0.3; g.add(leaf);
  g.userData.at = [0, 0.58, -0.02, -0.15, 0, 0.1]; return g;
};
WEAR.santa = () => {   // красный колпак с белым отворотом и помпоном, кончик свисает набок
  const g = new THREE.Group(), red = toon(0xFF6F7F), white = toon(0xFFFDF8);
  const cone = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.75, 20), red), 1.05); cone.position.set(0.05, 0.36, 0); cone.rotation.z = -0.35; g.add(cone);
  const cuff = addOutline(new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.1, 10, 28), white), 1.06); cuff.rotation.x = Math.PI/2; g.add(cuff);
  const pom = addOutline(new THREE.Mesh(SMALL, white), 1.08); pom.scale.setScalar(0.13); pom.position.set(0.32, 0.7, 0); g.add(pom);
  g.userData.at = [0, 0.58, -0.02, -0.15, 0, 0.1]; return g;
};

// какой праздник сегодня (или из адреса ?holiday=… — для проверки, в сохранение не пишется)
const md = d => (d.getMonth() + 1)*100 + d.getDate();
function holidayNow(d = new Date()){
  const q = (location.search.match(/[?&]holiday=(\w+)/) || [])[1];
  if(q) return HOLIDAYS.find(h => h.id === q) || null;
  const x = md(d);
  return HOLIDAYS.find(h => {
    if(!h.from) return false;
    const a = h.from[0]*100 + h.from[1], b = h.to[0]*100 + h.to[1];
    return a <= b ? x >= a && x <= b : x >= a || x <= b;   // Новый год переходит через 1 января
  }) || null;
}
const HOL = holidayNow();

/* ---------- украшения ---------- */
function makePumpkin(s = 1){
  const g = new THREE.Group(), m = toon(0xFF9A3D);
  for(let i = 0; i < 6; i++){ const a = i/6*Math.PI*2, r = addOutline(new THREE.Mesh(SMALL, m), 1.06); r.scale.set(0.2, 0.26, 0.2); r.position.set(Math.cos(a)*0.13, 0.25, Math.sin(a)*0.13); g.add(r); }
  const stem = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.16, 8), toon(0x7A9A4A)), 1.15); stem.position.y = 0.55; stem.rotation.z = 0.25; g.add(stem);
  // добрая мордочка: глазки-точки, румянец и улыбка — никаких страшных рожиц
  const face = new THREE.Group(); face.position.set(0, 0.27, 0.33); g.add(face);
  for(const sd of [-1, 1]){
    const e = new THREE.Mesh(SMALL, inkMat); e.scale.set(0.035, 0.045, 0.02); e.position.set(sd*0.1, 0.04, 0); face.add(e);
    const bl = new THREE.Mesh(new THREE.CircleGeometry(0.04, 12), new THREE.MeshBasicMaterial({color:0xFF7F8F, transparent:true, opacity:0.7})); bl.position.set(sd*0.17, -0.03, -0.01); face.add(bl);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.014, 6, 12, Math.PI), inkMat); mouth.rotation.z = Math.PI; mouth.position.y = -0.02; face.add(mouth);
  g.scale.setScalar(s); return g;
}
function makeGhost(){   // мягкое привидение-простынка с румянцем: парит и покачивается
  const g = new THREE.Group(), m = toon(0xF6F9FF);
  const b = addOutline(new THREE.Mesh(SPH, m), 1.05); b.scale.set(0.38, 0.46, 0.36); g.add(b);
  for(const x of [-0.24, 0, 0.24]){ const t = addOutline(new THREE.Mesh(SMALL, m), 1.08); t.scale.set(0.13, 0.16, 0.13); t.position.set(x, -0.4, 0); g.add(t); }
  for(const sd of [-1, 1]){
    const e = new THREE.Mesh(SMALL, inkMat); e.scale.set(0.045, 0.06, 0.03); e.position.set(sd*0.12, 0.08, 0.33); g.add(e);
    const bl = new THREE.Mesh(new THREE.CircleGeometry(0.05, 12), new THREE.MeshBasicMaterial({color:0xFF9BB8, transparent:true, opacity:0.75})); bl.position.set(sd*0.22, -0.02, 0.3); g.add(bl);
  }
  const mouth = new THREE.Mesh(SMALL, inkMat); mouth.scale.set(0.04, 0.05, 0.02); mouth.position.set(0, -0.06, 0.35); g.add(mouth);
  return g;
}
function makeTree(s = 1){   // ёлочка: три конуса, звезда, огоньки
  const g = new THREE.Group();
  const trunk = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.25, 8), toon(0xB07A4A)), 1.1); trunk.position.y = 0.12; g.add(trunk);
  [[0.55, 0.6, 0.5], [0.44, 0.5, 0.85], [0.32, 0.42, 1.15]].forEach(([r, h, y]) => { const c = addOutline(new THREE.Mesh(new THREE.ConeGeometry(r, h, 16), toon(0x5FBF8A)), 1.05); c.position.y = y; g.add(c); });
  const st = addOutline(new THREE.Mesh(STAR_GEO, toon(0xFFD66B)), 1.08); st.scale.setScalar(0.42); st.position.y = 1.45; g.add(st);
  const cols = [0xFF6F95, 0xFFD66B, 0x6FB6F5, 0xB69CF2], bulbs = [];
  for(let i = 0; i < 12; i++){ const a = i*2.4, y = 0.4 + (i % 4)*0.24, r = 0.5 - (y - 0.4)*0.45; const bb = new THREE.Mesh(SMALL, new THREE.MeshBasicMaterial({color:cols[i % 4]})); bb.scale.setScalar(0.045); bb.position.set(Math.cos(a)*r, y, Math.sin(a)*r); g.add(bb); bulbs.push(bb); }
  g.userData.bulbs = bulbs; g.scale.setScalar(s); return g;
}
function makeGiftBox(col, s = 1){
  const g = new THREE.Group();
  const b = addOutline(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.3, 0.36), toon(col)), 1.05); b.position.y = 0.15; g.add(b);
  for(const r of [0, Math.PI/2]){ const rb = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.31, 0.06), toon(0xFFFDF8)); rb.position.y = 0.15; rb.rotation.y = r; g.add(rb); }
  for(const sd of [-1, 1]){ const l = addOutline(new THREE.Mesh(SMALL, toon(0xFFFDF8)), 1.1); l.scale.set(0.08, 0.05, 0.04); l.position.set(sd*0.07, 0.33, 0); l.rotation.z = sd*0.4; g.add(l); }
  g.scale.setScalar(s); return g;
}
function makeBalloon(col){   // сердечко-шарик на ниточке
  const g = new THREE.Group();
  const h = addOutline(new THREE.Mesh(HEART_GEO, toon(col)), 1.08); h.scale.setScalar(0.5); h.position.y = 1.5; g.add(h);
  const str = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.3, 4), inkMat); str.position.y = 0.72; g.add(str);
  g.userData.top = h; return g;
}
// что где стоит: у больницы (центр — пациент, слева ящик, сзади иглу) и в уголке малыша
const holRoot = new THREE.Group(); scene.add(holRoot);
const holBits = {spin:[], bob:[], blink:[]};
function holBuild(h){
  const at = (o, x, z, ry = 0, y = 0.25) => { o.position.set(x, y, z); o.rotation.y = ry; holRoot.add(o); return o; };
  const P = PET_POS;
  // на узком телефоне стоя видно немного: всё — рядом с пациентом и малышом (проверено на 375×812)
  if(h.id === 'halloween'){
    at(makePumpkin(1), 1.1, 1.7, -0.5); at(makePumpkin(0.75), 1.5, -1.55, -0.3); at(makePumpkin(0.65), -0.55, -2.3, 0.1);
    at(makePumpkin(0.8), P.x + 1.45, 0.55, -0.5); at(makePumpkin(0.6), P.x - 1.45, 1.25, 0.4);   // в уголке — мимо миски и мячика
    const gh = at(makeGhost(), -0.6, -2.4, 0.3, 2.8); holBits.bob.push({o:gh, y:2.8, ph:0});
    const g2 = at(makeGhost(), P.x + 0.4, -2.4, -0.3, 2.7); g2.scale.setScalar(0.7); holBits.bob.push({o:g2, y:2.7, ph:2});
  }
  if(h.id === 'newyear'){
    const t1 = at(makeTree(1), 1.5, -1.6, 0); holBits.blink.push(t1);
    at(makeGiftBox(0xFF9BB8), 1.1, 1.7, 0.3); at(makeGiftBox(0x9BD3F0, 0.8), 0.6, 1.95, -0.4);
    const t2 = at(makeTree(0.75), P.x + 0.75, -2.2, 0); holBits.blink.push(t2);   // за малышом, не закрывает табличку с именем
    at(makeGiftBox(0xFFD66B, 0.8), P.x - 1.75, 0.55, 0.5);
  }
  if(h.id === 'valentine' || h.id === 'bday'){
    const cols = [0xFF9BB8, 0xFF6F95, 0xFFC2D4];
    [[1.2, 1.6], [1.5, -1.5], [-0.9, -2.2], [P.x + 1.45, 0.55], [P.x + 1.4, -1.5]].forEach(([x, z], i) => { const b = at(makeBalloon(cols[i % 3]), x, z, 0); holBits.bob.push({o:b.userData.top, y:1.5, ph:i}); });
    if(h.id === 'bday') at(makeGiftBox(0xB69CF2), 0.6, 1.95, 0.3);
  }
}
if(HOL) holBuild(HOL);
function holTick(t, dt){
  if(!HOL) return;
  holRoot.visible = !homeMode && !runCam.on;
  for(const b of holBits.bob){ b.o.position.y = b.y + Math.sin(t*1.4 + b.ph)*0.12; b.o.rotation.z = Math.sin(t*0.9 + b.ph)*0.08; }
  for(const tr of holBits.blink) tr.userData.bulbs.forEach((bb, i) => bb.visible = Math.sin(t*3 + i*1.7) > -0.3);
}

/* ---------- поздравление и подарок ---------- */
if(HOL){
  const p = document.createElement('p'); p.className = 'intro-hol display'; p.textContent = `${HOL.ic} ${HOL.greet} ${HOL.ic}`;
  $('#introStat').before(p);
}
// подарок — один раз за праздник в году (save.hol: 'halloween-2026')
function holGift(){
  if(!HOL || !HOL.gift) return;
  const d = new Date(), y = HOL.id === 'newyear' && d.getMonth() === 0 ? d.getFullYear() - 1 : d.getFullYear(), key = `${HOL.id}-${y}`;
  if(save.hol.includes(key)) return;
  save.hol.push(key);
  const g = HOL.gift;
  if(g.wear && !owns(g.wear)) save.owned.push(g.wear);
  if(g.shells) save.shells += g.shells;
  persist(); shellsShown = save.shells; renderShells();
  sfx.buy();
  toast(g.wear ? L(`🎁 ${HOL.greet} Подарок: ${shopItem(g.wear).name}! Надевай пациентам и малышу ${HOL.ic}`, `🎁 ${HOL.greet} A gift: ${shopItem(g.wear).name}! Put it on patients and your pup ${HOL.ic}`)
    : L(`🎁 ${HOL.greet} Подарок: +${g.shells} 🐚`, `🎁 ${HOL.greet} A gift: +${g.shells} 🐚`), 4200);
}
if(!save.hol) save.hol = [];   // Pages мог отдать старый data.js
for(const id of ['btnStart', 'btnIntroPet']) $('#' + id).addEventListener('click', () => setTimeout(holGift, 2600), {once:true});
