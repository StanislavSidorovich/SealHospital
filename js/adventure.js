/* ---------------- Приключения (Фаза 9): забег по льдинам ----------------
   ⚽ «Поиграть» → 🏔️ «Приключение» → карта островков → уровень.
   Малыш сам скользит на пузике по ледяной дорожке из трёх полос. Касание — прыжок через сугроб или трещину,
   провести пальцем влево/вправо — на соседнюю полосу (как Subway Surfers), вверх — тоже прыжок.
   Ракушки висят дугой над препятствиями и цепочкой по полосам (как монетки у Марио).
   Стрелки-ускорители на льду — «вжух!» (Mario Kart), трамплин — высокий прыжок через трещину.
   Врезался — смешной кувырок, пара ракушек рассыпается вперёд по дорожке, их можно подобрать снова.
   Упал в трещину — «плюх!», малыш сам выпрыгивает. По краям мягкие бортики: с дорожки не упасть. Проиграть нельзя.
   Рыбки заперты в ледяных пузырях: коснись пузыря — «пуф!», рыбка спасена (как светлячки у Rayman).
   Уровень 2 «Догони Тучку» (часть 2): Ворчливая Тучка летит впереди и кидает снежки на полосу малыша
   (тень на льду заранее показывает куда). Догнал на ускорителе — пощекочи её, она роняет ракушки.
   На финише Тучка чихает радугой, становится доброй и живёт над уголком малыша.
   В конце флажок и три звезды: добежал, собрал ракушки, спас всех рыбок. Все рыбки — кубок на полку в домике.
   Дорожка стоит далеко в стороне (RUN_POS), камера летит за малышом (runCam, её подхватывает frame() в game.js).
   Подключается после home.js и до mail.js/game.js. */
const RUN_POS = new V3(-200, 0, 0);          // старт дорожки; бежим в сторону −z
const RUN_SPEED = 5.2, RUN_G = 22, RUN_VY = 8.4;   // прыжок: высота ≈1,6, в воздухе ≈0,76 с — пролетаем ≈4 м
const RUN_W = 3.6, LANE = 1.1;               // ширина дорожки и шаг между тремя полосами (−1 левая, 0, 1 правая)
const BOOST_T = 1.5, BOOST_K = 1.6;          // ускоритель: сколько секунд и во сколько раз быстрее
const RAMP_L = 2.4, RAMP_H = 0.75, RAMP_VY = 11;   // трамплин: длина, высота, толчок вверх (≈1 с в воздухе)
const runCam = {on:false, pos:new V3(), look:new V3()};
const BUB_Y = 1.9;   // пузыри с рыбками висят над водой сбоку от дорожки и чуть выше малыша: он их не заслоняет
const runRoot = new THREE.Group(); runRoot.visible = false; scene.add(runRoot);
if(!save.adv) save.adv = sanitizeAdv(null);   // Pages мог отдать старый data.js
if(!save.adv.tips) save.adv.tips = [];
const tipSeen = k => save.adv.tips.includes(k);
const tipDone = k => { if(!tipSeen(k)){ save.adv.tips.push(k); persist(); } };

// Уровни. z — метры от старта, ln — полоса (−1, 0, 1; нет — середина).
// line [z, n, ln] — ракушки цепочкой; drift [z, arc, ln] — сугроб (без ln — во всю ширину, с ln — маленький на одной полосе);
// crack [z, w, arc] — трещина шириной w; arc — над препятствием дуга из трёх ракушек;
// fish [z, сторона −1/1] — ледяной пузырь с рыбкой над водой; boost [z, ln] — стрелки-ускоритель;
// ramp [z] — трамплин (z — его верхний край), за ним дуга ракушек по полёту.
// chase — Ворчливая Тучка летит впереди и кидает снежки раз в every[0]…every[1] секунд.
const ISLES = [
  {id:'bay', ic:'🏝️', name:L('Снежная бухта', 'Snowy Bay'), levels:['bay1', 'bay2']},
  {id:'cave', ic:'🌌', name:L('Пещера северного сияния', 'Northern Lights Cave'), soon:true},
  {id:'village', ic:'🏘️', name:L('Деревня айсбергов', 'Iceberg Village'), soon:true}
];
const LEVELS = {
  bay1: {name:L('Забег по льдинам', 'Ice floe dash'), len:318, items:[
    ['line', 12, 3], ['drift', 30, 1], ['line', 40, 3, -1], ['fish', 50, -1], ['crack', 62, 1.6, 1], ['boost', 72, 0], ['drift', 80],
    ['line', 88, 3, 1], ['crack', 102, 2.0], ['fish', 112, 1], ['drift', 126, 1], ['drift', 138], ['line', 146, 2, -1],
    ['fish', 160, -1], ['boost', 166, 1], ['crack', 174, 2.2, 1], ['line', 184, 3, 1], ['drift', 200], ['fish', 210, 1], ['crack', 222, 1.8],
    ['drift', 234], ['boost', 242, 0], ['ramp', 250], ['crack', 252.8, 1.4], ['fish', 270, -1], ['drift', 284, 1], ['line', 292, 4]]},
  bay2: {name:L('Догони Тучку', 'Catch the Cloud'), len:300, chase:{every:[3.4, 5]}, after:'bay1', items:[
    ['line', 14, 2], ['line', 25, 3, -1], ['drift', 28, 0, 0], ['boost', 40, 1], ['line', 44, 2, 1], ['fish', 55, 1],
    ['drift', 66, 1], ['line', 77, 3, 0], ['drift', 80, 0, -1], ['drift', 80, 0, 1], ['crack', 94, 1.8, 1], ['fish', 104, -1],
    ['boost', 114, 0], ['ramp', 122], ['crack', 124.8, 1.4], ['line', 136, 2, -1], ['drift', 140, 0, 1],
    ['line', 149, 2, 1], ['drift', 152, 0, 0], ['fish', 162, 1], ['drift', 174, 1], ['boost', 186, -1], ['line', 190, 3, -1],
    ['crack', 204, 2.0], ['line', 212, 2, 1], ['drift', 216, 0, -1], ['drift', 216, 0, 0], ['fish', 228, -1],
    ['boost', 238, 1], ['line', 242, 2, 1], ['drift', 254], ['line', 264, 2, 0], ['crack', 278, 2.2, 1], ['line', 286, 3]]}
};
const levelName = id => LEVELS[id].name;
const SHELL_GOAL = 0.8;   // звезда за ракушки — если собрано 80% и больше
// Ракушки с дорожки идут в копилку только в первых RUN_DAILY забегах за день, дальше на дорожке звёздочки
// (звезду за них дают так же): иначе забег за минуту приносил бы больше, чем смена в больнице
const RUN_DAILY = 2;
const runsToday = () => save.adv.day && save.adv.day.d === new Date().toDateString() ? save.adv.day.n : 0;
const BUBBLE_TEX = canvasTex(128, (g, s) => {   // пузырь: прозрачный, с голубым отливом, обводкой и бликом
  g.beginPath(); g.arc(s/2, s/2, s/2 - 6, 0, 7); g.fillStyle = 'rgba(190,232,250,.38)'; g.fill();
  g.lineWidth = 6; g.strokeStyle = '#3B3A4A'; g.stroke();
  g.beginPath(); g.arc(s/2, s/2, s/2 - 18, Math.PI*1.1, Math.PI*1.45); g.lineWidth = 7; g.lineCap = 'round'; g.strokeStyle = '#fff'; g.stroke();
});

/* ---------- мир забега: вода, дорожка, айсберги ---------- */
const TRACK_TEX = canvasTex(128, (g, w, h) => {   // лёд с полосками вдоль — видно, как быстро едем и где полосы
  g.fillStyle = '#C4E4F4'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#A9D4EC'; for(const x of [40, 82]) g.fillRect(x, 0, 6, h);
  g.fillStyle = '#FFFFFF'; for(let i = 0; i < 6; i++) g.fillRect((i*41) % w, (i*53) % h, 10, 3);
});
TRACK_TEX.wrapS = TRACK_TEX.wrapT = THREE.RepeatWrapping;
const BOOST_TEX = canvasTex(64, (g, w, h) => {   // три жёлтые стрелки вперёд на розовой плашке (крутится по offset.y)
  g.fillStyle = '#FF9BB8'; g.fillRect(0, 0, w, h);
  g.lineJoin = 'round'; g.lineCap = 'round';
  for(const y of [8, 40, 72]){ g.beginPath(); g.moveTo(12, y + 22); g.lineTo(32, y + 6); g.lineTo(52, y + 22); g.lineWidth = 16; g.strokeStyle = '#3B3A4A'; g.stroke(); g.lineWidth = 9; g.strokeStyle = '#FFD66B'; g.stroke(); }
}, 96);
BOOST_TEX.wrapT = THREE.RepeatWrapping;
const runWater = new THREE.Mesh(new THREE.PlaneGeometry(90, 120), toon(0x6FC0DF)); runWater.rotation.x = -Math.PI/2; runWater.position.y = -0.05; runRoot.add(runWater);
// лёд с обводкой-коробкой: addOutline раздувает длинную плиту в торцах, поэтому обводка — своя коробка чуть больше.
// По краям — мягкие снежные бортики: с дорожки не упасть
function iceSlab(z0, z1){
  const len = z1 - z0, g = new THREE.Group(); g.position.set(RUN_POS.x, -0.05, RUN_POS.z - (z0 + z1)/2);
  const m = toon(0xFFFFFF); m.map = TRACK_TEX.clone(); m.map.needsUpdate = true; m.map.repeat.set(1, len/3);
  g.add(new THREE.Mesh(new THREE.BoxGeometry(RUN_W, 0.6, len), m));
  g.add(new THREE.Mesh(new THREE.BoxGeometry(RUN_W + 0.1, 0.64, len + 0.1), outlineMat));
  for(const sd of [-1, 1]){
    const bank = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, len - 0.3, 10), toon(0xFFFFFF)); bank.rotation.x = Math.PI/2; bank.position.set(sd*(RUN_W/2 - 0.08), 0.32, 0); g.add(bank);
    const ol = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, len - 0.26, 10), outlineMat); ol.rotation.x = Math.PI/2; ol.position.copy(bank.position); g.add(ol);
  }
  return g;
}
function makeDrift(){   // сугроб: пухлая снежная горка
  const g = new THREE.Group();
  const b = addOutline(new THREE.Mesh(SPH, toon(0xFFFFFF)), 1.05); b.scale.set(1.0, 0.55, 0.62); g.add(b);
  for(const [x, s] of [[-0.75, 0.45], [0.8, 0.38]]){ const k = addOutline(new THREE.Mesh(SMALL, toon(0xFFFFFF)), 1.08); k.scale.set(s, s*0.8, s); k.position.set(x, 0.05, 0.1); g.add(k); }
  return g;
}
function makeBubble(){   // ледяной пузырь, внутри рыбка
  const g = new THREE.Group();
  const f = makeFish(); f.scale.setScalar(0.62); f.rotation.y = -0.6; g.add(f);
  const glass = new THREE.Sprite(new THREE.SpriteMaterial({map:BUBBLE_TEX, transparent:true, depthWrite:false}));
  glass.scale.setScalar(1.15); glass.renderOrder = 2; g.add(glass);
  return g;
}
function makeBoost(){   // стрелки-ускоритель на льду
  const m = new THREE.MeshBasicMaterial({map:BOOST_TEX}), g = new THREE.Group();
  const p = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.1), m); p.rotation.x = -Math.PI/2; g.add(p);
  const ol = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 2.24), inkMat); ol.rotation.x = -Math.PI/2; ol.position.y = -0.01; g.add(ol);
  return g;
}
// трамплин: снежный клин во всю ширину, низкий край навстречу малышу; верхний край — в точке группы
const RAMP_GEO = (() => {
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(RAMP_L, 0); sh.lineTo(0, RAMP_H); sh.lineTo(0, 0);
  const g = new THREE.ExtrudeGeometry(sh, {depth:RUN_W - 0.3, bevelEnabled:false}); g.rotateY(-Math.PI/2); g.translate((RUN_W - 0.3)/2, 0, 0); return g;
})();
function makeRamp(){
  const g = new THREE.Group();
  g.add(addOutline(new THREE.Mesh(RAMP_GEO, toon(0xE3F4FC)), 1.03));
  for(const sd of [-1, 1]){ const f = new THREE.Mesh(new THREE.CircleGeometry(0.2, 3), new THREE.MeshToonMaterial({color:sd < 0 ? 0xFF9BB8 : 0xFFD66B, side:THREE.DoubleSide})); f.position.set(sd*(RUN_W/2 - 0.35), RAMP_H + 0.45, 0.05); f.rotation.z = -Math.PI/2; g.add(f);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 6), inkMat); pole.position.set(sd*(RUN_W/2 - 0.2), RAMP_H + 0.35, 0.05); g.add(pole); }
  return g;
}
function makeFinish(){   // ворота-финиш: два столбика, верёвка с флажками, надпись
  const g = new THREE.Group(), cols = [0xFF9BB8, 0xFFD66B, 0x86DDB5, 0x9BD3F0, 0xB69CF2];
  for(const s of [-1, 1]){ const p = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.2, 10), toon(0xE0A36B)), 1.12); p.position.set(s*(RUN_W/2 + 0.2), 1.6, 0); g.add(p); }
  const a = new V3(-RUN_W/2 - 0.2, 3.1, 0), b = new V3(RUN_W/2 + 0.2, 3.1, 0), pts = [];
  for(let i = 0; i <= 16; i++){ const k = i/16, p = a.clone().lerp(b, k); p.y -= Math.sin(k*Math.PI)*0.35; pts.push(p); }
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.025, 5), inkMat));
  const tri = new THREE.CircleGeometry(0.2, 3);
  for(let i = 1; i < 9; i++){
    const k = i/9, p = a.clone().lerp(b, k); p.y -= Math.sin(k*Math.PI)*0.35 + 0.16;
    const f = new THREE.Mesh(tri, new THREE.MeshToonMaterial({color:cols[i % cols.length], side:THREE.DoubleSide})); f.position.copy(p); f.rotation.z = -Math.PI/2; g.add(f);
  }
  const t = textSprite(L('Финиш!', 'Finish!'), '#D9527E'); t.position.set(0, 3.8, 0); t.scale.set(2.6, 0.97, 1); t.material.depthTest = true; g.add(t);
  return g;
}
// айсберги по сторонам — одни на все забеги
for(let z = 10; z < 360; z += 22){
  for(const sd of [-1, 1]){
    const s = 1.6 + ((z*7 + sd*3) % 5)*0.4, x = sd*(9 + ((z*13) % 7));
    const b = addOutline(new THREE.Mesh(new THREE.ConeGeometry(s, s*1.4, 6), toon(0xF3FAFD)), 1.04); b.position.set(RUN_POS.x + x, s*0.45, RUN_POS.z - z - sd*6); runRoot.add(b);
  }
}

/* ---------- Ворчливая Тучка ----------
   Пухлое облако с лицом (смотрит на +z — в камеру и на малыша). grumpy — серая, брови домиком, ротик скобкой;
   добрая — белая, улыбается, румянец. Та же модель потом живёт над уголком малыша. */
const CLOUD_GREY = new THREE.Color(0x9AA3B8), CLOUD_WHITE = new THREE.Color(0xFFFFFF);
function makeCloud(){
  const g = new THREE.Group(), mat = toon(0x9AA3B8);
  for(const [x, y, z, s] of [[0, 0, 0, 1], [-0.95, -0.12, -0.05, 0.72], [0.95, -0.1, -0.05, 0.75], [-0.45, 0.58, -0.1, 0.62], [0.42, 0.62, -0.1, 0.58], [0, -0.3, 0.25, 0.72]]){
    const b = addOutline(new THREE.Mesh(SMALL, mat), 1.05); b.scale.set(s, s*0.86, s*0.9); b.position.set(x, y, z); g.add(b);
  }
  const face = new THREE.Group(); face.position.set(0, 0.02, 0.95); g.add(face);
  const eyes = [];
  for(const sd of [-1, 1]){
    const e = new THREE.Mesh(SMALL, inkMat); e.scale.set(0.085, 0.11, 0.05); e.position.set(sd*0.3, 0.05, 0.02); face.add(e); eyes.push(e);
    const hl = new THREE.Mesh(SMALL, new THREE.MeshBasicMaterial({color:0xffffff})); hl.scale.setScalar(0.03); hl.position.set(sd*0.3 + 0.03, 0.09, 0.07); face.add(hl);
    const bl = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), new THREE.MeshBasicMaterial({color:0xFF9BB8, transparent:true, opacity:0.75})); bl.position.set(sd*0.5, -0.12, -0.12); face.add(bl);
  }
  const brows = [];
  for(const sd of [-1, 1]){ const b = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.04), inkMat); b.position.set(sd*0.3, 0.26, 0.03); b.rotation.z = sd*0.42; face.add(b); brows.push(b); }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.025, 6, 14, Math.PI), inkMat); mouth.position.set(0, -0.2, 0.02); face.add(mouth);
  g.userData = {mat, eyes, brows, mouth, face, kind:false};
  return g;
}
function cloudKind(c, kind){   // превращение: серая ворчунья ↔ белая добрая
  const u = c.userData; u.kind = kind;
  u.mat.color.copy(kind ? CLOUD_WHITE : CLOUD_GREY);
  u.brows.forEach(b => b.visible = !kind);
  u.mouth.rotation.z = kind ? Math.PI : 0; u.mouth.position.y = kind ? -0.14 : -0.2;
}
// добрая Тучка над уголком малыша — после того, как её догнали в первый раз
const friendCloud = makeCloud(); cloudKind(friendCloud, true); friendCloud.scale.setScalar(0.42);
friendCloud.position.copy(PET_POS).add(new V3(-1, 2.6, -2.2)); friendCloud.visible = false; scene.add(friendCloud);
function advTick(t, dt){
  friendCloud.visible = (save.adv.best.bay2 || 0) > 0 && !runCam.on && !homeMode;
  if(!friendCloud.visible) return;
  friendCloud.position.y = PET_POS.y + 2.6 + Math.sin(t*0.9)*0.12;   // над льдиной слева, в кадре и на узком телефоне
  friendCloud.position.x = PET_POS.x - 1 + Math.sin(t*0.3)*0.2;
  const blink = (t % 4.2) < 0.12 ? 0.15 : 1;
  friendCloud.userData.eyes.forEach(e => e.scale.y = 0.11*blink);
  if(Math.random() < dt*0.25) emit(TEX.star, friendCloud.position.clone().add(new V3((Math.random() - 0.5)*0.8, -0.3, 0.3)), {v:new V3(0, -0.4, 0), life:0.8, size:0.12, spin:3});
}

/* ---------- сборка уровня ---------- */
function runPickup(i, stars){   // ракушка или (если сегодня уже бегали) звёздочка
  if(stars){ const o = addOutline(new THREE.Mesh(STAR_GEO, toon(0xFFD66B)), 1.1); o.scale.setScalar(0.5); return o; }
  const o = makeShell([0xFFC4D6, 0xFFD9A8, 0xD9C8FF][i % 3], false); o.scale.setScalar(1.15); o.rotation.set(0.9, 0, 0); return o;
}
let R = null;   // текущий забег
const runAt = (z, x = 0, y = 0) => new V3(RUN_POS.x + x, 0.25 + y, RUN_POS.z - z);
function runBuild(id){
  if(R && R.grp) runRoot.remove(R.grp);
  const lv = LEVELS[id], grp = new THREE.Group(); runRoot.add(grp);
  const r = {id, lv, grp, z:-4, y:0, vy:0, air:false, sp:RUN_SPEED, splash:0, tumble:0, shells:0, fish:0, total:0, fishTotal:0,
    lane:0, x:0, boost:0, ramp:null, bumpT:0,
    pick:[], drifts:[], cracks:[], bubbles:[], boosts:[], ramps:[], snowballs:[], puffT:0, slow:null,
    taught:{jump:save.adv.runs > 0, fish:save.adv.runs > 0}, state:'ready',   // подсказки с замедлением про прыжок и рыбок — только в самом первом забеге
    stars:runsToday() >= RUN_DAILY};   // сегодня уже бегали — на дорожке звёздочки вместо ракушек
  const shell = (z, x, y, extra) => {
    const o = runPickup(r.pick.length, r.stars);
    o.position.copy(runAt(z, x, 0.35 + y)); grp.add(o);
    r.pick.push({o, z, x, y:0.35 + y, extra:!!extra}); if(!extra) r.total++;
    return o;
  };
  // трещины — дырки в дорожке: плиты льда идут между ними
  let z0 = -6;
  for(const [k, z, w = 2] of lv.items.filter(i => i[0] === 'crack')){
    grp.add(iceSlab(z0, z - w/2)); r.cracks.push({z0:z - w/2, z1:z + w/2}); z0 = z + w/2;
    for(const sd of [-1, 1]) for(const dx of [0.5, 1.3]){ const ch = addOutline(new THREE.Mesh(new THREE.DodecahedronGeometry(0.28), toon(0xF3FAFD)), 1.08); ch.scale.set(1, 0.4, 1); ch.position.copy(runAt(z, sd*dx, -0.3)); grp.add(ch); }
  }
  grp.add(iceSlab(z0, lv.len + 14));
  for(const it of lv.items){
    const [k, z] = it;
    if(k === 'line'){ const x = (it[3] || 0)*LANE; for(let i = 0; i < it[2]; i++) shell(z + i*1.5, x, 0); r.lines = r.lines || []; r.lines.push({z, ln:it[3] || 0}); }
    if(k === 'drift'){
      const ln = it[3], d = makeDrift(); d.position.copy(runAt(z, ln === undefined ? 0 : ln*LANE));
      if(ln === undefined) d.scale.set(1.42, 1, 1); else d.scale.set(0.52, 0.8, 0.8);
      grp.add(d); r.drifts.push({o:d, z, hit:false, ln});
    }
    if((k === 'drift' && it[2]) || (k === 'crack' && it[3])){ const x = k === 'drift' && it[3] !== undefined ? it[3]*LANE : 0; for(const dz of [-1.3, 0, 1.3]) shell(z + dz, x, 1.45*(1 - (dz/2.1)**2)); }   // дуга по прыжку
    if(k === 'fish'){ const b = makeBubble(), x = Math.sign(it[2])*(RUN_W/2 + 0.75); b.position.copy(runAt(z, x, BUB_Y)); grp.add(b); r.bubbles.push({o:b, z, x, ph:Math.random()*6, free:false}); r.fishTotal++; }
    if(k === 'boost'){ const b = makeBoost(); b.position.copy(runAt(z, it[2]*LANE, 0.02)); grp.add(b); r.boosts.push({o:b, z, ln:it[2]}); }
    if(k === 'ramp'){
      const m = makeRamp(); m.position.copy(runAt(z)); grp.add(m); r.ramps.push({z});
      for(let i = 1; i <= 5; i++){ const t = i*0.17, y = RAMP_H + RAMP_VY*t - RUN_G*t*t/2; shell(z + RUN_SPEED*t, 0, y + 0.1); }   // дуга по полёту с трамплина
    }
  }
  const fin = makeFinish(); fin.position.copy(runAt(lv.len)); grp.add(fin); r.finish = fin;
  if(lv.chase){   // Тучка впереди
    const c = makeCloud(); cloudKind(c, false); c.scale.setScalar(0.9); grp.add(c);
    Object.assign(r, {cloud:c, gap:14, cx:0, throwT:3, windup:false, tickleT:0, tickles:0});
    c.position.copy(runAt(r.z + r.gap, 0, 4.1));
  }
  R = r;
}
const runPupAt = () => new V3(RUN_POS.x + R.x, 0.25 + R.y, RUN_POS.z - R.z);
const inCrack = z => R.cracks.some(c => z > c.z0 + 0.15 && z < c.z1 - 0.15);

/* ---------- касания и события забега ---------- */
function runJump(){
  if(R.air || R.splash > 0 || R.tumble > 0.25 || R.ramp) return;
  R.air = true; R.vy = RUN_VY; sfx.whoosh();
  if(R.slow === 'jump'){ R.slow = null; R.taught.jump = true; runSayHint(L('Ура! Так и прыгай 👍', 'Yay! Jump just like that 👍'), 1600); }
}
function runSayHint(t, ms){ mgHint(t); setTimeout(() => { if(R && R.state === 'go' && !R.slow && mgHintEl.textContent === t) mgHint(''); }, ms); }
function runLane(dir){   // на соседнюю полосу; у края — мягкий бортик
  if(R.splash > 0) return;
  const to = R.lane + dir;
  if(to < -1 || to > 1){ R.bumpT = 0.25; sfx.plop(); return; }
  R.lane = to; sfx.rub(); sfx.tap();
  if(R.slow === 'lane' && R.lane === R.slowLn){ R.slow = null; tipDone('lane'); runSayHint(L('Отлично! Вот так и рули 👍', 'Great! That\'s how you steer 👍'), 1600); }
}
function runBubbleAt(e){
  let best = null, bd = 80;
  for(const b of R.bubbles){
    if(b.free || b.z < R.z - 1 || b.z > R.z + 24) continue;
    const q = toScreen(b.o.position), d = Math.hypot(q.x - e.clientX, q.y - e.clientY);
    if(d < bd){ bd = d; best = b; }
  }
  return best;
}
function runFree(b){
  b.free = true; R.fish++; sfx.pop(); sfx.star();
  const p = b.o.position.clone(); R.grp.remove(b.o);
  burst(TEX.star, p, 10, 1.8, 0.26); emit(TEX.puff, p, {v:new V3(0, 0.3, 0), life:0.4, size:0.9, grow:1});
  // рыбка ныряет в воду и благодарит
  const f = makeFish(); f.scale.setScalar(0.62); f.position.copy(p); scene.add(f);
  const to = p.clone().add(new V3(b.x > 0 ? 2.2 : -2.2, -1.8, 0.5));
  tween(0.7, k => { f.position.lerpVectors(p, to, k); f.position.y += Math.sin(k*Math.PI)*1.2; f.rotation.z = -k*2; }, ease.lin).then(() => { scene.remove(f); sfx.plop(); burst(TEX.puff, to.clone().setY(0.1), 5, 0.8, 0.35); });
  floatText(L('Спасибо!', 'Thank you!'), p.clone().add(new V3(0, 0.6, 0)), '#2F9E72');
  if(R.slow === 'fish'){ R.slow = null; R.taught.fish = true; runSayHint(L('Рыбка спасена! Ищи ещё пузыри 🫧', 'The fish is free! Look for more bubbles 🫧'), 1800); }
  runHud();
}
// ракушки вылетают из точки from и ложатся на дорожку впереди (после падения или из щекотной Тучки)
function runDrop(n, from, zAhead){
  for(let i = 0; i < n; i++){
    const z = R.z + zAhead + i*1.6, x = Math.max(-LANE, Math.min(LANE, R.x + (i - (n - 1)/2)*0.5));
    const o = runPickup(i, R.stars), to = new V3(RUN_POS.x + x, 0.6, RUN_POS.z - z);
    o.position.copy(from); R.grp.add(o);
    const p = {o, z, x, y:0.35, extra:true, flying:true}; R.pick.push(p);
    tween(0.5, k => { o.position.lerpVectors(from, to, k); o.position.y += Math.sin(k*Math.PI)*1.2; }, ease.lin).then(() => p.flying = false);
  }
}
// врезался или упал: пара ракушек рассыпается вперёд по дорожке — их можно подобрать снова
function runScatter(){
  const n = Math.min(R.shells, 2 + (Math.random() < 0.5 ? 1 : 0)); if(!n) return;
  R.shells -= n; runDrop(n, runPupAt().add(new V3(0, 0.6, 0)), 4.5);
  runHud();
}
function runCrash(d){   // сугроб: кувырок через голову, сугроб — «пуф» и приплюснулся
  const s = petSeal; d.hit = true; R.tumble = 0.7; R.sp = RUN_SPEED*0.45; R.boost = 0;
  sfx.plop(); sfx.arf(); floatText(L(['Ой!', 'Бух!', 'Упс!'], ['Oops!', 'Bonk!', 'Whoops!'])[Math.floor(Math.random()*3)], headTop(s));
  burst(TEX.puff, d.o.position.clone().add(new V3(0, 0.4, 0)), 10, 1.6, 0.5);
  const s0 = d.o.scale.clone();
  tween(0.3, k => d.o.scale.set(s0.x*(1 + k*0.3), s0.y*(1 - k*0.75), s0.z*(1 + k*0.2)));
  runScatter(); cloudLaugh();
  if(!R.saidOops){ R.saidOops = true; runSayHint(L('Ничего! Ракушки впереди — подбери их снова', 'No problem! The shells are ahead — pick them up again'), 2200); }
}
function runSplash(){   // трещина: плюх в воду и сам выпрыгивает
  R.splash = 0.35; R.air = false; R.vy = 0; R.sp = RUN_SPEED*0.55; R.boost = 0;
  sfx.splash(); burst(TEX.puff, runPupAt().setY(0.1), 10, 1.6, 0.45);
  floatText(L('Плюх!', 'Splash!'), headTop(petSeal), '#3E8DB8');
  runScatter(); cloudLaugh();
}
function runBoost(b){
  b.used = true; R.boost = BOOST_T; sfx.boost();
  floatText(L('Вжух!', 'Whoosh!'), headTop(petSeal), '#D9527E');
  if(!tipSeen('boost')){ tipDone('boost'); runSayHint(L('Стрелки — ускорение! 🚀', 'Arrows make you zoom! 🚀'), 1800); }
}
let runHudEl = null;
function runHud(){
  if(!runHudEl || !R) return;
  runHudEl.querySelector('.sh').textContent = R.shells;
  runHudEl.querySelector('.pic').textContent = R.stars ? '⭐' : '🐚';
  runHudEl.querySelector('.fi').textContent = `${R.fish}/${R.fishTotal}`;
  runHudEl.querySelector('.bar i').style.width = Math.max(0, Math.min(1, R.z/R.lv.len))*100 + '%';
}

/* ---------- Тучка в забеге ---------- */
function cloudLaugh(){
  if(!R.cloud || R.state !== 'go') return;
  R.gap = Math.min(19, R.gap + 3.5);
  floatText(L('Ха-ха!', 'Ha-ha!'), R.cloud.position.clone().add(new V3(0, 1.1, 0)), '#6B6A7E');
}
// снежок: Тучка надувает щёки («Ррр!»), кидает снежок на полосу малыша; тень на льду заранее показывает, куда упадёт.
// Упавший снежок — маленький сугроб на одной полосе: объехать или перепрыгнуть
const SHADOW_GEO = new THREE.CircleGeometry(0.55, 24);
const TICKLE_GIFTS = 3;
function cloudThrow(){
  const r = R, ln = Math.random() < 0.72 ? r.lane : [-1, 0, 1][Math.floor(Math.random()*3)];
  let tz = r.z + 11;
  const busy = z => r.cracks.some(c => z > c.z0 - 2.5 && z < c.z1 + 2.5) || r.ramps.some(m => z > m.z - RAMP_L - 2 && z < m.z + 9)
    || r.drifts.some(d => Math.abs(d.z - z) < 3 && (d.ln === undefined || d.ln === ln)) || r.boosts.some(b => Math.abs(b.z - z) < 2.5 && b.ln === ln);
  for(let i = 0; i < 4 && busy(tz); i++) tz += 2.5;
  if(busy(tz) || tz > r.lv.len - 10) return;
  const o = addOutline(new THREE.Mesh(SMALL, toon(0xFFFFFF)), 1.1); o.scale.setScalar(0.32);
  const from = r.cloud.position.clone().add(new V3(0, -0.6, 0.6)), to = runAt(tz, ln*LANE, 0.1);
  o.position.copy(from); r.grp.add(o);
  const sh = new THREE.Mesh(SHADOW_GEO, new THREE.MeshBasicMaterial({color:0x3E6F9E, transparent:true, opacity:0.35, depthWrite:false}));
  sh.rotation.x = -Math.PI/2; sh.position.copy(runAt(tz, ln*LANE, 0.03)); sh.scale.setScalar(0.3); r.grp.add(sh);
  r.snowballs.push({o, sh, from, to, tz, ln, t:0, T:1.05});
  sfx.whoosh();
  if(!tipSeen('snow') && !r.slow){ r.slow = 'snow'; r.slowLn = ln; }
}
function snowLand(sb){
  const r = R; r.grp.remove(sb.o); r.grp.remove(sb.sh);
  sfx.plop(); burst(TEX.puff, sb.to.clone().add(new V3(0, 0.3, 0)), 8, 1.3, 0.4);
  const d = makeDrift(); d.position.copy(runAt(sb.tz, sb.ln*LANE)); r.grp.add(d);
  tween(0.25, k => d.scale.set(0.5*k, 0.72*k, 0.75*k), ease.out);
  r.drifts.push({o:d, z:sb.tz, hit:false, ln:sb.ln, snow:true});
}
function cloudTickleAt(e){
  const r = R;
  if(!r.cloud || r.state !== 'go' || r.gap > 10.5 || r.tickleT > 0) return false;
  const q = toScreen(r.cloud.position);
  if(Math.hypot(q.x - e.clientX, q.y - e.clientY) > 110) return false;
  r.tickleT = 2.2; r.tickles++; r.gap += 5;   // ракушки роняет только первые TICKLE_GIFTS раз: забег не должен быть выгоднее смены
  sfx.giggle(); floatText(L('Хи-хи-хи!', 'Hee-hee!'), r.cloud.position.clone().add(new V3(0, 1.1, 0)), '#D9527E');
  tween(0.6, k => r.cloud.rotation.z = Math.sin(k*Math.PI*6)*0.18*(1 - k), ease.lin);
  if(r.tickles <= TICKLE_GIFTS) runDrop(2, r.cloud.position.clone().add(new V3(0, -0.8, 0)), 7);
  tipDone('tickle'); mgHint('');
  return true;
}
function cloudStep(d, dt){
  const r = R, c = r.cloud;
  if(r.state === 'go'){
    const want = r.boost > 0 ? 7 : 13;
    r.gap += (want - r.gap)*Math.min(1, d*(r.boost > 0 ? 1.1 : 0.22));
    r.cx += (r.x - r.cx)*Math.min(1, d*1.1);
    r.tickleT -= d;
    // догнали — можно пощекотать
    const near = r.gap < 10.5 && r.tickleT <= 0;
    if(near && !r.tickleHinted && !tipSeen('tickle') && !r.slow){ r.tickleHinted = true; runSayHint(L('Догнали Тучку! Нажми на неё — пощекочи 👆', 'You caught up! Tap the Cloud to tickle it 👆'), 3000); }
    if(r.gap > 12) r.tickleHinted = false;
    // снежки
    if(r.z > 10 && r.z < r.lv.len - 22 && !r.slow){
      r.throwT -= d;
      if(r.throwT < 0.6 && !r.windup){ r.windup = true; sfx.grr(); floatText(L('Ррр!', 'Grrr!'), c.position.clone().add(new V3(0, 1.1, 0)), '#6B6A7E'); }
      if(r.throwT <= 0){ r.windup = false; const [a, b] = r.lv.chase.every; r.throwT = a + Math.random()*(b - a); cloudThrow(); }
    }
    const puff = r.windup ? 1 + Math.sin(now*30)*0.05 + 0.08 : 1;
    c.scale.setScalar(0.9*puff);
    c.position.copy(runAt(r.z + r.gap, r.cx, 4.1 + Math.sin(now*1.6)*0.18));
    if(Math.random() < dt*6) emit(TEX.puff, c.position.clone().add(new V3((Math.random() - 0.5)*1.6, -0.8, 0)), {v:new V3(0, -1.6, 0), life:0.7, size:0.12});
  }
  if(r.state === 'end'){   // финиш: Тучка спускается к малышу и висит прямо над ним (на телефоне по бокам места нет)
    const sc = petScale(), to = runPupAt().add(new V3(0, 1.3 + 1.2*sc, 0.4));
    c.position.lerp(to, Math.min(1, dt*2));
    c.rotation.y += (Math.PI - c.rotation.y)*Math.min(1, dt*3);   // разворачивается лицом к малышу и камере
    if(!r.friendFx) c.scale.setScalar(c.scale.x + (0.72 - c.scale.x)*Math.min(1, dt*3));
    if(r.rainbow) r.rainbow.position.copy(c.position).add(new V3(0, 0.2, 0.5));
  }
  // полёт снежков (в игровом времени: в замедлении подсказки они тоже замедляются)
  for(const sb of r.snowballs){
    if(sb.done) continue;
    sb.t += d; const k = Math.min(1, sb.t/sb.T);
    sb.o.position.lerpVectors(sb.from, sb.to, k); sb.o.position.y += Math.sin(k*Math.PI)*1.0;
    sb.sh.scale.setScalar(0.3 + 0.7*k); sb.sh.material.opacity = 0.2 + 0.3*k;
    if(k >= 1){ sb.done = true; snowLand(sb); }
  }
}
// на финише: Тучка чихает радугой и становится доброй
async function cloudFriend(){
  const r = R, c = r.cloud; if(!c) return;
  await wait(0.5);
  sfx.sneezeSoft(); r.friendFx = true; tween(0.4, k => c.scale.setScalar(0.72*(1 + Math.sin(k*Math.PI)*0.12)), ease.lin);
  await wait(0.55); if(R !== r) return;
  sfx.sneeze(); floatText(L('Апчхи!', 'Achoo!'), c.position.clone().add(new V3(0, 1.2, 0)));
  const rb = new THREE.Group(), cols = [0xFF8FA3, 0xFFC07A, 0xFFE27A, 0x8EDDB0, 0x8CC8F0, 0xB9A0F0];
  cols.forEach((col, i) => { const m = new THREE.Mesh(new THREE.TorusGeometry(0.8 + i*0.09, 0.05, 6, 40, Math.PI), new THREE.MeshBasicMaterial({color:col})); rb.add(m); });
  rb.position.copy(c.position).add(new V3(0, 0.2, 0.5)); rb.rotation.y = Math.PI; rb.scale.setScalar(0.01); r.grp.add(rb); r.rainbow = rb;   // радуга аркой над Тучкой
  tween(0.7, k => rb.scale.setScalar(Math.max(0.01, k)), ease.out);
  const from = CLOUD_GREY.clone();
  tween(0.8, k => c.userData.mat.color.copy(from).lerp(CLOUD_WHITE, k), ease.lin);
  await wait(0.5); if(R !== r) return;
  cloudKind(c, true); sfx.hug(); burst(TEX.heart, c.position, 12, 2, 0.3);
  floatText(L('Я больше не ворчу!', 'I\'m not grumpy anymore!'), c.position.clone().add(new V3(0, 1.3, 0)), '#D9527E');
  await wait(1.1);
  r.friendDone = true;
}

/* ---------- покадрово: движение, прыжки, сбор ---------- */
function runSlowHint(k){
  if(k === 'jump') return L('Сугроб! Нажми — прыжок 👆', 'A snowdrift! Tap to jump 👆');
  if(k === 'fish') return L('Рыбка в пузыре! Нажми на пузырь 🫧', 'A fish in a bubble! Tap the bubble 🫧');
  if(k === 'lane') return R.slowLn < R.lane ? L('Ракушки слева! Проведи пальцем влево ⬅️', 'Shells on the left! Swipe left ⬅️') : L('Ракушки справа! Проведи пальцем вправо ➡️', 'Shells on the right! Swipe right ➡️');
  if(k === 'snow') return L('Снежок! Уезжай в сторону ⬅️ ➡️ или прыгай', 'A snowball! Swipe aside ⬅️ ➡️ or jump');
  return '';
}
function runStep(dt){
  const r = R, s = petSeal;
  if(r.paused) return;   // пауза (🏠): всё замирает
  // обучение: перед первым сугробом, пузырём, ракушками на другой полосе и снежком время почти замирает, пока не сделаешь
  if(r.state === 'go' && !r.slow){
    const d0 = r.drifts[0], b0 = r.bubbles[0], l0 = (r.lines || []).find(l => l.ln !== 0 && l.z > r.z);
    if(!r.taught.jump && d0 && d0.z - r.z < 2.9 && d0.z > r.z && !r.air) r.slow = 'jump';   // прыжок перелетает сугроб, если до него 0,9…3 м
    else if(!r.taught.fish && b0 && !b0.free && b0.z - r.z < 8 && b0.z > r.z) r.slow = 'fish';
    else if(!tipSeen('lane') && l0 && l0.z - r.z < 6.5 && r.lane !== l0.ln && !r.air){ r.slow = 'lane'; r.slowLn = l0.ln; }
  }
  if(r.slow === 'fish' && (r.bubbles[0].free || r.bubbles[0].z < r.z - 0.5)){ r.slow = null; r.taught.fish = true; mgHint(''); }
  if(r.slow === 'lane' && !(r.lines || []).some(l => l.ln === r.slowLn && l.z > r.z - 1)){ r.slow = null; mgHint(''); }
  if(r.slow === 'snow' && !r.snowballs.some(sb => !sb.done)){   // снежок упал: дальше без замедления
    r.slow = null; tipDone('snow');
    runSayHint(r.lane !== r.slowLn ? L('Увернулись! 👍', 'Dodged it! 👍') : L('Прыгай или уезжай в сторону ⬅️ ➡️', 'Jump or swipe aside ⬅️ ➡️'), 1800);
  }
  const ts = r.slow ? (r.slow === 'jump' && r.drifts[0].z - r.z < 1.6 ? 0.04 : r.slow === 'lane' ? 0.1 : 0.12) : 1, d = dt*ts;
  const z0 = r.z;   // где был малыш кадр назад: ракушки и сугробы проверяем на всём пройденном отрезке
  if(r.state === 'go' || r.state === 'end'){
    if(r.boost > 0) r.boost -= d;
    const want = r.state === 'end' ? 0 : RUN_SPEED*(r.boost > 0 ? BOOST_K : 1);
    r.sp += (want - r.sp)*Math.min(1, d*(r.state === 'end' ? 1.6 : r.boost > 0 ? 4 : 1.4));
    r.z += r.sp*d;
  }
  // влево-вправо по полосам
  const wantX = r.lane*LANE; r.x += (wantX - r.x)*Math.min(1, d*11);
  if(r.bumpT > 0) r.bumpT -= d;
  // трамплин: въезжаем по клину, с верхнего края — высокий полёт
  if(r.state === 'go' && !r.air && r.splash <= 0){
    const m = r.ramps.find(m => r.z > m.z - RAMP_L && r.z < m.z + 0.3);
    if(m && r.z < m.z){ r.ramp = m; r.y = Math.max(0, (r.z - (m.z - RAMP_L))/RAMP_L)*RAMP_H; }
    else if(r.ramp){ r.ramp = null; r.air = true; r.vy = RAMP_VY; r.sp = Math.max(r.sp, RUN_SPEED); sfx.boost(); floatText(L('Уиии!', 'Wheee!'), headTop(s), '#D9527E'); }
  }
  // вверх-вниз: прыжок, плюх в трещину, приземление
  if(r.splash > 0){
    r.splash -= d; r.y = -0.55*Math.sin(Math.min(1, 1 - r.splash/0.35)*Math.PI/2);
    if(r.splash <= 0){ r.air = true; r.vy = RUN_VY*0.9; sfx.whoosh(); floatText(L('Брр!', 'Brrr!'), headTop(s)); }
  } else if(r.air){
    r.y += r.vy*d - RUN_G*d*d/2; r.vy -= RUN_G*d;   // точная парабола: высота прыжка не зависит от частоты кадров
    if(r.y <= 0 && r.vy < 0){
      if(inCrack(r.z)) runSplash();
      else { r.y = 0; r.air = false; sfx.plop(); burst(TEX.puff, runPupAt().setY(0.35), 5, 0.9, 0.35); squash(s, 0.18, 0.25); }
    }
  } else if(r.state === 'go' && !r.ramp && inCrack(r.z)) runSplash();
  if(r.tumble > 0) r.tumble = Math.max(0, r.tumble - d);
  // сугробы (во всю ширину или на одной полосе) и стрелки-ускорители
  const near = z => z > z0 - 0.6 && z < r.z + 0.6;
  if(r.state === 'go'){
    for(const dr of r.drifts) if(!dr.hit && near(dr.z) && r.y < 0.5 && r.splash <= 0 && (dr.ln === undefined || Math.abs(r.x - dr.ln*LANE) < 0.75)) runCrash(dr);
    for(const b of r.boosts) if(!b.used && b.z > z0 - 1.1 && b.z < r.z + 1.1 && r.y < 0.4 && Math.abs(r.x - b.ln*LANE) < 0.65) runBoost(b);
    const b0 = r.boosts.find(b => !b.used && b.z > r.z);
    if(b0 && !b0.hinted && !tipSeen('boost') && b0.z - r.z < 9 && !r.slow){ b0.hinted = true; runSayHint(L('Впереди стрелки — заезжай на них 🚀', 'Arrows ahead — ride over them 🚀'), 2400); }
  }
  BOOST_TEX.offset.y = (BOOST_TEX.offset.y - dt*1.6) % 1;
  // ракушки
  const py = r.y + 0.45*petScale();
  for(const p of r.pick){
    if(p.got || p.flying) continue;
    p.o.rotation.y += dt*3;
    if(p.z > z0 - 0.9 && p.z < r.z + 0.9 && Math.abs(p.y - py) < 1.0 && Math.abs(p.x - r.x) < 0.7){
      p.got = true; r.shells++; r.grp.remove(p.o); sfx.coin();
      emit(TEX.star, p.o.position, {v:new V3(0, 1, 0), life:0.45, size:0.22, spin:4}); runHud();
    }
  }
  for(const b of r.bubbles) if(!b.free) b.o.position.y = 0.25 + BUB_Y + Math.sin(now*2 + b.ph)*0.12;
  if(r.cloud) cloudStep(d, dt);
  // малыш: едет на пузике, в прыжке задирает нос, в кувырке крутится, на повороте наклоняется
  const pos = runPupAt(); s.root.position.copy(pos);
  s.root.rotation.set(0, Math.PI, (wantX - r.x)*0.35 + (r.bumpT > 0 ? Math.sin(r.bumpT*40)*0.08 : 0));
  if(r.slow) mgHint(runSlowHint(r.slow));
  s.inner.rotation.x = r.tumble > 0 ? -(1 - r.tumble/0.7)*Math.PI*2 : r.air ? Math.max(-0.35, Math.min(0.3, -r.vy*0.04)) : r.ramp ? -0.3 : 0;
  s.inner.position.y = r.tumble > 0 ? Math.sin((1 - r.tumble/0.7)*Math.PI)*0.5 : 0;
  s.wobble = r.air ? 0 : Math.sin(now*9)*0.03;
  s.flap = r.air ? 0.8 : r.boost > 0 ? 0.6 : 0.15;
  r.puffT -= dt;
  if(r.puffT < 0 && !r.air && r.splash <= 0 && r.sp > 1){ r.puffT = r.boost > 0 ? 0.04 : 0.09; emit(TEX.puff, pos.clone().add(new V3((Math.random() - 0.5)*0.6, 0.15, 1.2*petScale())), {v:new V3(0, 0.4, 1.5 + (r.boost > 0 ? 3 : 0)), life:0.5, size:0.35, grow:1}); }
  if(r.boost > 0 && Math.random() < dt*14){ const sd = Math.random() < 0.5 ? -1 : 1; emit(TEX.star, pos.clone().add(new V3(sd*(0.6 + Math.random()*0.5), 0.3 + Math.random()*0.8, 0.5)), {v:new V3(0, 0, 6), life:0.35, size:0.14}); }
  // вода и камера едут следом. На узком экране (телефон стоя) камера отъезжает дальше, чтобы видеть все три полосы
  runWater.position.set(RUN_POS.x, -0.05, pos.z - 30);
  const ck = petK() - 1;   // подрос — камера выше и дальше, чтобы малыш не закрывал дорожку
  const far = Math.max(1, Math.min(1.4, 0.6/camera.aspect)), zoom = Math.max(0, r.sp/RUN_SPEED - 1)*1.2;
  const cx = RUN_POS.x + r.x*0.55;
  runCam.pos.set(cx + 0.3, (4.6 + ck*4.5)*far**1.8 + Math.max(0, r.y)*0.35, pos.z + (10.5 + ck*6)*far + zoom);
  runCam.look.set(RUN_POS.x + r.x*0.75, 0.9 + ck*0.6 + Math.max(0, r.y)*0.3, pos.z - 7 - ck*2 - (far - 1)*6);
  if(r.state === 'end'){   // на финише камера облетает малыша спереди — видно, как он радуется
    r.endK = Math.min(1, (r.endK || 0) + dt*0.8); const k = ease.io(r.endK), sc = petScale();
    if(r.cloud){   // с Тучкой — подальше: в кадр над итогами должны влезть малыш, Тучка и радуга
      runCam.pos.lerp(pos.clone().add(new V3(1.0, 2.6 + 1.2*sc, -11 - 2.2*sc)), k);
      runCam.look.lerp(pos.clone().add(new V3(0, 0.5, 0)), k);
    } else {
      runCam.pos.lerp(pos.clone().add(new V3(1.5, 2.3 + 1.2*sc, -7 - 2.2*sc)), k);
      runCam.look.lerp(pos.clone().add(new V3(0, -0.9 + 0.5*sc, 0)), k);   // малыш повыше: внизу окошко с итогами
    }
  }
  runHud();
  // финиш
  if(r.state === 'go' && r.z >= r.lv.len){ r.state = 'end'; r.boost = 0; r.slow = null; mgHint(''); runFinishFx(); }
}
function runFinishFx(){
  const s = petSeal, p = R.finish.position.clone().add(new V3(0, 2.6, 0));
  sfx.good(); sfx.hug();
  for(let i = 0; i < 3; i++) setTimeout(() => { burst(TEX.star, p, 14, 2.6, 0.32); burst(TEX.heart, p, 6, 2, 0.28); }, i*250);
  floatText(L('Финиш!', 'Finish!'), headTop(s), '#D9527E');
  s.happyUntil = now + 4; setMood(s, 'happy');
  if(R.cloud) cloudFriend();
}

/* ---------- карта островков ---------- */
function advStars(id){ return save.adv.best[id] || 0; }
async function advMap(){
  mgOpen(L('Куда отправимся?', 'Where shall we go?'));
  const starsOf = n => '★'.repeat(n) + '☆'.repeat(3 - n);
  const lvBtn = (is, id) => {
    const lv = LEVELS[id], open = !lv.after || advStars(lv.after) > 0;
    return open
      ? `<button class="isle on" data-lv="${id}"><span class="ic" aria-hidden="true">${lv.chase ? '☁️' : is.ic}</span><span class="t"><b>${levelName(id)}</b><small>${is.name}</small></span><span class="st" aria-label="${L('звёзды', 'stars')}">${starsOf(advStars(id))}</span></button>`
      : `<div class="isle lock"><span class="ic" aria-hidden="true">${lv.chase ? '☁️' : is.ic}</span><span class="t"><b>${levelName(id)}</b><small>${L(`Сначала пробеги «${levelName(lv.after)}» 🔒`, `First finish “${levelName(lv.after)}” 🔒`)}</small></span></div>`;
  };
  const panel = mgNode('div', 'mg-panel adv-map', `
    <p class="ttl display">${L('Карта приключений', 'Adventure map')}</p>
    <div class="isles">${ISLES.map(is => is.soon
      ? `<div class="isle lock"><span class="ic" aria-hidden="true">${is.ic}</span><span class="t"><b>${is.name}</b><small>${L('Скоро! 🔒', 'Coming soon! 🔒')}</small></span></div>`
      : is.levels.map(id => lvBtn(is, id)).join('')).join('')}</div>
    <button class="btn ghost small" data-lv="">${L('Потом', 'Later')}</button>`);
  const lv = await new Promise(r => panel.querySelectorAll('[data-lv]').forEach(b => mgOn(b, 'click', () => { sfx.tap(); r(b.dataset.lv || null); })));
  panel.classList.add('away'); await wait(0.25); mgClose();
  return lv;
}

/* ---------- управление: касание — прыжок, провести влево/вправо — полоса, вверх — прыжок ----------
   Прыжок — когда палец отпустили, не сдвинув (иначе каждый свайп был бы ещё и прыжком).
   Пузырь с рыбкой и Тучку ловим сразу при касании. На компьютере — стрелки и пробел. */
function runControls(){
  let g = null;
  const ok = () => R && R.state === 'go' && !R.paused;
  mgOn(mgRoot, 'pointerdown', e => {
    e.preventDefault(); g = null;
    if(!ok()) return;
    const b = runBubbleAt(e); if(b) return runFree(b);
    if(cloudTickleAt(e)) return;
    g = {id:e.pointerId, x:e.clientX, y:e.clientY, used:false};
  });
  mgOn(mgRoot, 'pointermove', e => {
    if(!g || g.used || e.pointerId !== g.id || !ok()) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if(Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)){ g.used = true; runLane(Math.sign(dx)); }
    else if(dy < -34 && -dy > Math.abs(dx)){ g.used = true; runJump(); }
  });
  const up = e => {
    if(!g || e.pointerId !== g.id) return;
    const t = g; g = null;
    if(!t.used && ok()) runJump();
  };
  mgOn(mgRoot, 'pointerup', up);
  mgOn(mgRoot, 'pointercancel', () => g = null);
  mgOn(window, 'keydown', e => {
    if(!ok() || e.repeat) return;
    if(e.key === 'ArrowLeft'){ e.preventDefault(); runLane(-1); }
    else if(e.key === 'ArrowRight'){ e.preventDefault(); runLane(1); }
    else if(e.key === 'ArrowUp' || e.key === ' '){ e.preventDefault(); runJump(); }
  });
}

/* ---------- сам забег (зовёт petFun в walk.js) ---------- */
async function petRun(s, id){
  const cam0 = camOffWant.clone();
  let again = true, result = null;
  // на старт: вспышка, камера за спиной малыша, свет чуть тише (сверху пастель выгорает)
  sfx.whoosh(); flash();
  runRoot.visible = true; runCam.on = true; HEMI.intensity = 0.62; sun.intensity = 0.58;
  s.bubble.visible = false; runBtn(true);
  while(again){
    runBuild(id); runStep(0);
    mgOpen('', {hintBottom:true});
    runHudEl = mgNode('div', 'run-hud', `<span class="pill"><i class="pic">🐚</i> <b class="sh">0</b></span><span class="pill">🐟 <b class="fi">0/0</b></span><span class="bar"><i></i><span class="flag" aria-hidden="true">🏁</span></span>`);
    runHud();
    let done;
    const fin = new Promise(r => done = r);
    runControls();
    mgTick(dt => { if(R) runStep(dt); if(R.state === 'end' && R.sp < 0.15 && R.endK >= 1 && (!R.cloud || R.friendDone) && !R.over){ R.over = true; done(); } });
    runQuit = () => { R.quit = true; done(); };
    // 3, 2, 1 — поехали! (на паузе отсчёт ждёт)
    const tick = async t => { while(R.paused) await wait(0.1); await wait(t); };
    if(R.stars){ mgHint(L('Сегодня вместо ракушек — звёздочки ⭐ Ракушки прилив принесёт завтра', 'Today there are stars instead of shells ⭐ The tide brings new shells tomorrow')); await tick(2.6); }
    if(R.cloud){ mgHint(L('Ворчливая Тучка хочет засыпать снегом иглу! Догони её ☁️', 'The Grumpy Cloud wants to bury the igloo in snow! Catch it ☁️')); sfx.grr(); await tick(2.8); }
    for(const n of ['3', '2', '1']){ if(R.quit) break; mgHint(n); sfx.tick(); await tick(0.55); }
    if(!R.quit){
      mgHint(L('Поехали! 🐾', 'Let\'s go! 🐾')); sfx.arf(); R.state = 'go';
      setTimeout(() => { if(R && R.state === 'go' && !R.slow && mgHintEl.textContent.includes('🐾')) mgHint(''); }, 1200);
    }
    await fin;
    if(R.quit){ mgClose(); break; }   // ушли домой с паузы: без итогов, забег можно пройти потом
    await wait(0.6);
    result = runResults();
    mgHint('');
    again = await runResultPanel(result);
    mgClose();
  }
  // домой: малыш снова в уголке
  runQuit = null; runBtn(false);
  flash();
  runRoot.visible = false; runCam.on = false; homeLights(false);
  if(R){ runRoot.remove(R.grp); R = null; } runHudEl = null;
  s.root.position.copy(PET_SPOT); s.root.rotation.set(0, 0, 0); s.inner.rotation.set(0, 0, 0); s.inner.position.set(0, 0, 0); s.wobble = 0; s.flap = 0;
  camOff.copy(cam0); camOffWant.copy(cam0);
  s.happyUntil = now + 3; setMood(s, 'happy');
  runSay = result ? (result.friend ? L('Смотри, Тучка теперь живёт у нас! ☁️💗', 'Look, the Cloud lives with us now! ☁️💗') : L(`Какое приключение! Звёзд: ${result.stars} ⭐`, `What an adventure! Stars: ${result.stars} ⭐`)) : '';
  if(!result){ s.happyUntil = 0; return false; }   // ушли с паузы, не добежав ни разу — как «Потом»: малыш просто дома
}
let runSay = '';

/* ---------- пауза и «домой» посреди забега ----------
   Пока бежим, в углу остаются только звук и 🏠. Касание 🏠 — пауза: «Бежим дальше!» или «Домой».
   Домой — без итогов и без наказания, забег можно пройти потом. На итогах 🏠 — то же, что кнопка «Домой». */
let runQuit = null;
function runBtn(on){
  document.body.classList.toggle('run-on', on);
  let b = $('#btnRunHome');
  if(!on){ if(b) b.remove(); return; }
  if(b) return;
  b = document.createElement('button'); b.id = 'btnRunHome'; b.className = 'round home';
  b.innerHTML = '<span aria-hidden="true">🏠</span>'; b.setAttribute('aria-label', L('Пауза и домой', 'Pause and go home'));
  $('#btnSound').after(b);
  b.addEventListener('click', () => { sfx.tap(); runPause(); });
}
async function runPause(){
  if(!R || !runQuit || R.paused) return;
  const endBtn = document.querySelector('.run-end [data-k="home"]');
  if(endBtn) return endBtn.click();
  if(R.state === 'end') return;   // финишная камера ещё летит — итоги вот-вот появятся
  R.paused = true; mgHintEl.style.visibility = 'hidden';
  const panel = mgNode('div', 'mg-panel run-pause', `
    <p class="ttl display">${L('Пауза ⏸', 'Paused ⏸')}</p>
    <p class="got">${L(`${save.pet.name} подождёт. Забег можно пройти в другой раз`, `${save.pet.name} will wait. You can do the dash another time`)}</p>
    <div class="row"><button class="btn" data-k="go">${L('Бежим дальше! ▶', 'Keep going! ▶')}</button><button class="btn ghost" data-k="home">${L('Домой 🏠', 'Home 🏠')}</button></div>`);
  const k = await new Promise(r => panel.querySelectorAll('[data-k]').forEach(b => mgOn(b, 'click', e => { e.stopPropagation(); sfx.tap(); r(b.dataset.k); })));
  panel.classList.add('away'); await wait(0.25); panel.remove();
  mgHintEl.style.visibility = '';
  if(!R) return;
  if(k === 'home' && runQuit) runQuit();
  R.paused = false;
}
// подсчёт звёзд, награда, рекорд, кубок
function runResults(){
  const r = R, shellsOk = r.shells >= Math.ceil(r.total*SHELL_GOAL), fishOk = r.fish >= r.fishTotal;
  const stars = 1 + (shellsOk ? 1 : 0) + (fishOk ? 1 : 0);
  const best = save.adv.best[r.id] || 0, cup = fishOk && !save.adv.cups.includes(r.id);
  const friend = !!r.cloud && best === 0;   // Тучку догнали в первый раз — она переезжает к малышу
  save.adv.best[r.id] = Math.max(best, stars);
  if(cup) save.adv.cups.push(r.id);
  save.adv.runs++;
  const today = new Date().toDateString(); save.adv.day = {d:today, n:runsToday() + 1};
  persist();
  return {stars, shellsOk, fishOk, shells:r.shells, total:r.total, fish:r.fish, fishTotal:r.fishTotal, starRun:r.stars, cup, friend, tickles:r.tickles || 0, id:r.id,
    gift:(r.stars ? 0 : r.shells) + (cup ? CUP_GIFT : 0)};
}
const CUP_GIFT = 10;
async function runResultPanel(res){
  const row = (ok, t, sm) => `<li class="${ok ? 'ok' : ''}"><span class="st">★</span><span>${t}<small>${sm}</small></span></li>`;
  const panel = mgNode('div', 'mg-panel run-end', `
    <p class="ttl display">${L('Финиш! 🏁', 'Finish! 🏁')}</p>
    <ul class="res-stars">
      ${row(true, LEVELS[res.id].chase ? L('Догнали Тучку', 'Caught the Cloud') : L('Добежали до флажка', 'Reached the flag'), L(`${save.pet.name} — молодец!`, `Well done, ${save.pet.name}!`))}
      ${row(res.shellsOk, res.starRun ? L('Звёздочки', 'Stars') : L('Ракушки', 'Shells'), L(`${res.shells} из ${res.total}`, `${res.shells} of ${res.total}`))}
      ${row(res.fishOk, L('Спасли всех рыбок', 'Saved all the fish'), L(`${res.fish} из ${res.fishTotal}`, `${res.fish} of ${res.fishTotal}`))}
    </ul>
    ${res.tickles ? `<p class="got">${L(`Пощекотали Тучку: ${res.tickles} ☁️`, `Tickled the Cloud: ${res.tickles} ☁️`)}</p>` : ''}
    ${res.friend ? `<p class="got cup">☁️ ${L('Тучка подружилась! Теперь она живёт над твоим уголком', 'The Cloud is your friend now! It lives above your corner')}</p>` : ''}
    ${res.starRun ? `<p class="got">${L('Ракушки на сегодня собраны — прилив принесёт новые завтра 🌊', 'The shells for today are collected — the tide brings new ones tomorrow 🌊')}</p>` : ''}
    ${res.cup ? `<p class="got cup">🏆 ${L(`Кубок «${levelName(res.id)}» — теперь на полке в домике!`, `The “${levelName(res.id)}” cup is now on the shelf at home!`)}</p>` : ''}
    <p class="earned display">${res.gift ? `+${res.gift} 🐚` : ''}</p>
    <div class="row"><button class="btn" data-k="home">${L('Домой 🏠', 'Home 🏠')}</button><button class="btn ghost" data-k="again">${L('Ещё раз ↻', 'Again ↻')}</button></div>`);
  panel.querySelectorAll('.res-stars li').forEach((li, i) => setTimeout(() => { li.classList.add('in'); if(li.classList.contains('ok')) sfx.star(); }, 250 + i*380));
  if(res.gift) setTimeout(() => addShells(res.gift, toScreen(headTop(petSeal))), 1400);
  if(res.stars === 3) setTimeout(() => { sfx.hug(); burst(TEX.heart, headTop(petSeal), 16, 2.2, 0.3); }, 1500);
  const k = await new Promise(r => panel.querySelectorAll('[data-k]').forEach(b => mgOn(b, 'click', () => { sfx.tap(); r(b.dataset.k); })));
  panel.classList.add('away'); await wait(0.25);
  return k === 'again';
}
