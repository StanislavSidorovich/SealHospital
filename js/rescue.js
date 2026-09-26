/* ---------------- «Спасаем потеряшку вдвоём» (Фаза 13, Спринт 3, задача 3) ----------------
   Парная игра в духе It Takes Two и Rayman: вид сбоку, идём из А в Б, у двух тюленей разные умения.
     🦘 Прыгун — прыгает высоко, второй раз прямо в воздухе;
     💪 Силач — толкает ледяные глыбы, прыгает на качели так, что Прыгун взлетает, и ныряет под лёд.
   Один в одиночку не пройдёт: плиты-кнопки держат ворота, рычаги открывают двери, качели-катапульта,
   ледяная стена в воде, глыба-ступенька, льдина-лифт. Сосульки падают — попало, тюлень в пузыре:
   напарник касается пузыря (или сам лопнет через 5 с). В конце — две плиты разом, решётка тает,
   малыш-потеряшка ищет маму по приметам (бывшая задача 6 Спринта 2) — нажми на его маму.
   Напарник: папа по сети (js/net.js, у каждого свой тюлень), Пинг-Силач (помогает сам) или без напарника
   (управляешь обоими, 🔄 — переключиться). Проиграть нельзя.
   Сеть: каждый ведёт своего тюленя и шлёт, где он; плиты и ворота каждый считает сам по обоим тюленям;
   рычаги, решётка и мама — событиями; глыбу двигает только Силач и рассылает, где она.
   Уровни: RS_LVS.bay — «Бухта потеряшки» (тут), RS_LVS.grot — «Грот» (js/grotto.js). Всё, что зависит от уровня
   (постройка, мир, подсказки, Пинг, финал), лежит в объекте уровня; физика, пузыри, кнопки, сеть и итоги — общие.
   На каждом уровне 3 жемчужинки 🦪 (зачем проходить ещё раз). Пинг может быть и Силачом, и Прыгуном.
   Подключается после gull.js и до grotto.js. */
const RS_POS = new V3(-600, 0, 0);
const rsAt = (x, y, z = 0) => new V3(RS_POS.x + x, RS_POS.y + y, RS_POS.z + z);
const RS_SC = 0.42, RS_HW = 0.42, RS_H = 0.85;     // размер тюленя и его «коробка» для столкновений
const RS_G = 24, RS_STEP = 0.45;                    // сила тяжести; на ступеньку до 0,45 м заходит сам
const RS_WS = -0.35, RS_FLOAT = RS_WS - 0.5;        // уровень воды и где держится тюлень на плаву
const RS_BUB_T = 5, RS_LAUNCH = 14.5;               // пузырь сам лопается через 5 с; скорость взлёта с качелей
const RS_DAILY = 2, RS_GIFT = 10, RS_FIRST = 25;    // ракушки: за первую победу и за первые две в день
const RS_ROLE = {
  jump:  {ic:'🦘', run:3.5, jv:8.2, jv2:7.4, name:() => L('Прыгун', 'Jumper'), can:() => L('прыгает высоко — и ещё раз прямо в воздухе', 'jumps high — and once more in mid-air')},
  strong:{ic:'💪', run:3.1, jv:7.6, jv2:0, name:() => L('Силач', 'Strong one'), can:() => L('толкает льдины, ныряет под лёд, держит друга на плечах', 'pushes ice, dives under the ice, lifts a friend on his shoulders')}
};
if(save.coop && !save.coop.resc) save.coop.resc = {wins:0, day:{d:'', n:0}};   // Pages мог отдать старый data.js
const RS_PEARL = 5, RS_PEARLS3 = 15;                // ракушки за новую жемчужинку и за все три на уровне
const RS_LVS = {};                                  // уровни по id; Q.L — текущий, Q.W — его подвижные части
let rsLvPick = 'bay';                               // какой уровень выбран в меню (помним до перезагрузки)
const rsResc = () => { const c = save.coop, r = c.resc || (c.resc = {wins:0, day:{d:'', n:0}}); r.lv = r.lv || {}; r.pearls = r.pearls || {}; return r; };
const rsLvOpen = id => id === 'bay' || (id === 'snow' ? (rsResc().lv.grot || 0) > 0 : (rsResc().lv.bay || rsResc().wins) > 0);   // Грот — после Бухты, Метель — после Грота

/* ---------- уровень «Бухта потеряшки» (x — вдоль, y — вверх, земля y=0) ----------
   0–8 старт · 9–15 плиты и ворота · 16–27 качели и полка с рычагом · 29–36 вода и ледяная стена ·
   38–42 сосульки · 42–48 глыба и лифт на скалу · 51–59 две плиты и решётка · 60–66 мамы */
const RS_LV = {
  ground:[[-3, 29, -3.2, 0], [36, 48.4, -3.2, 0], [48.4, 67.5, -3.2, 3]],   // лёд и скала (верх — земля)
  walls:[[-2.2, -1, 0, 7], [66.4, 67.5, 3, 8], [26.3, 27.1, 3.2, 10], [28, 37, -4.4, -3.2]],   // края, столб над дверью, дно
  shelf:[21.5, 26.3, 3.2, 3.6],
  water:[29, 36],
  gates:[
    {id:'g1', x0:11.8, x1:12.4, y0:0, h:3.5, by:'plate'},   // ворота: держит любая плита 1 или 2
    {id:'g2', x0:26.3, x1:27.1, y0:0, h:3.2, by:0},         // дверь под полкой: рычаг 0 на полке
    {id:'cl', x0:55.9, x1:56.3, y0:3, h:2.2, by:'cage'},    // решётка клетки слева
    {id:'cr', x0:58.7, x1:59.1, y0:3, h:2.2, by:'cage'}     // и справа
  ],
  wall:{x0:32, x1:33.2, y0:-1.6, y1:6, up:2.3},            // ледяная стена в воде: рычаг 1 поднимает её
  plates:[{x:9.5, y:0}, {x:14.8, y:0}, {x:52.2, y:3}, {x:54.3, y:3}],
  levers:[{x:23.6, y:3.6}, {x:37.6, y:0}, {x:50.6, y:3}],
  see:{x:19, half:1.6, hi:0.55, lo:0.15},                  // качели: левый край высокий, правый низкий
  icicles:[38.9, 40.1, 41.3], iceTop:3.5,
  block:{x:43.2, min:42.8, max:45.5, s:1},                 // глыба ездит по желобку
  lift:{x0:47, x1:48.4, top:3, bot:0.4},
  pup:57.5, moms:[61.2, 63.3, 65.4]
};
const RS_END = RS_LV.moms[0] - 1.2;

/* ---------- кто есть кто: мама и потеряшка (приметы) ---------- */
const RS_COATS = [   // шубки заметно разные даже сбоку (пятнышки со стороны почти не видно — в приметы их не берём)
  {id:'grey', c:0xB0BBCB, w:() => L('серая', 'grey')},
  {id:'sand', c:0xE9D3AE, w:() => L('песочная', 'sandy')},
  {id:'snow', c:0xFFFFFF, w:() => L('белая', 'white')},
  {id:'pink', c:0xF6C4D3, w:() => L('розовая', 'pink')},
  {id:'sky', c:0xC6DCF4, w:() => L('голубая', 'light blue')}
];
const RS_SCARF = [
  {c:'#FF7A9C', w:() => L('розовый', 'pink')},
  {c:'#7FB8F0', w:() => L('голубой', 'blue')},
  {c:'#FFB547', w:() => L('жёлтый', 'yellow')},
  {c:'#7FD1A8', w:() => L('мятный', 'mint')}
];
function rsRand(seed){ let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0)/4294967296; }; }
// мама: шубка A + шарфик X; обманки — та же шубка с другим шарфиком и другая шубка с тем же шарфиком
function rsFamily(seed){
  const r = rsRand(seed), pick = a => a[Math.floor(r()*a.length)];
  const coatA = pick(RS_COATS), coatB = pick(RS_COATS.filter(c => c !== coatA)), sx = Math.floor(r()*RS_SCARF.length);
  const sy = (sx + 1 + Math.floor(r()*(RS_SCARF.length - 1))) % RS_SCARF.length;
  const moms = [{coat:coatA, sc:RS_SCARF[sx], ok:true}, {coat:coatA, sc:RS_SCARF[sy]}, {coat:coatB, sc:RS_SCARF[sx]}];
  for(let i = moms.length - 1; i > 0; i--){ const j = Math.floor(r()*(i + 1)); [moms[i], moms[j]] = [moms[j], moms[i]]; }
  return {moms, coat:coatA, sc:RS_SCARF[sx]};
}
function rsSealLook(coat, scarf, sc){
  const s = makeSeal({name:'', f:true, color:coat.c, spot:coat.spot});
  setScarf(s, scarf, 'plain'); s.scarf.visible = true; s.scarf.scale.setScalar(1);
  s.root.scale.setScalar(sc);
  return s;
}

/* ---------- постройка ---------- */
const rsRoot = new THREE.Group(); rsRoot.visible = false; scene.add(rsRoot);
const rsLive = new THREE.Group(); scene.add(rsLive);   // тюлени, пузыри, значки — на любом уровне
const RS_MAT = {ice:toon(0xC9E4F4), cliff:toon(0xB5D5EC), snow:toon(0xF7FBFE), gate:toon(0xA8DDF2), block:toon(0xCFEFFB),
  plate:toon(0xFFD66B), on:toon(0x9BE3B5), lever:toon(0xFF9BB8), wood:toon(0xC9A479), bar:toon(0xBFE6F7)};
const RS_WATER = new THREE.MeshBasicMaterial({color:0x6FC0DF, transparent:true, opacity:0.55, depthWrite:false});
function rsBox(x0, x1, y0, y1, mat, zd = 1.1, parent = rsRoot){   // брусок с контуром одинаковой толщины (addOutline раздул бы длинный)
  const w = x1 - x0, h = y1 - y0, m = new THREE.Mesh(new THREE.BoxGeometry(w, h, zd*2), mat);
  m.add(new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, h + 0.08, zd*2 + 0.08), outlineMat));
  m.position.copy(rsAt((x0 + x1)/2, (y0 + y1)/2)); parent.add(m);
  return m;
}
function rsIconTex(emoji){
  return canvasTex(128, g => {
    g.fillStyle = '#FFFDF8'; g.strokeStyle = '#3B3A4A'; g.lineWidth = 8;
    g.beginPath(); g.arc(64, 64, 52, 0, 7); g.fill(); g.stroke();
    g.font = '64px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(emoji, 64, 70);
  });
}
const RS_ICON = {jump:rsIconTex('🦘'), strong:rsIconTex('💪')};
function rsLeverObj(l, parent){   // рычаг: столбик и ручка
  const g = new THREE.Group(); g.position.copy(rsAt(l.x, l.y, 0.3)); parent.add(g);
  const base = addOutline(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.4), RS_MAT.wood), 1.08); base.position.y = 0.11; g.add(base);
  const arm = new THREE.Group(); arm.position.y = 0.2; arm.rotation.z = 0.7; g.add(arm);
  const st = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.7, 8), RS_MAT.wood), 1.2); st.position.y = 0.35; arm.add(st);
  const kn = addOutline(new THREE.Mesh(SMALL, RS_MAT.lever), 1.1); kn.scale.setScalar(0.13); kn.position.y = 0.72; arm.add(kn);
  return {...l, g, arm, on:false};
}
// жемчужинки уровня: перламутровый шарик с бликом; уже найденные раньше — бледные
const RS_PEARL_MAT = toon(0xFFF1F6), RS_PEARL_OLD = new THREE.MeshBasicMaterial({color:0xFFFFFF, transparent:true, opacity:0.45, depthWrite:false});
function rsPearlsBuild(L){
  return L.pearls.map(p => {
    const g = new THREE.Group(); g.position.copy(rsAt(p.x, p.y, 0.3)); L.root.add(g);
    const b = addOutline(new THREE.Mesh(SMALL, RS_PEARL_MAT), 1.1); b.scale.setScalar(0.2); g.add(b);
    const hi = new THREE.Mesh(SMALL, whiteMat); hi.scale.setScalar(0.06); hi.position.set(-0.07, 0.07, 0.17); g.add(hi);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.star, transparent:true, depthWrite:false})); sp.scale.setScalar(0.22); sp.position.set(0.18, 0.2, 0.1); g.add(sp);
    return {...p, g, b, sp};
  });
}
let rsBuilt = false;
const RSW = {};   // подвижные части уровня (строятся один раз)
function rsBuild(){
  if(rsBuilt) return; rsBuilt = true;
  const lv = RS_LV;
  // море позади и под льдом
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(220, 60), toon(0x6FC0DF)); sea.position.copy(rsAt(30, RS_WS - 30, -6)); rsRoot.add(sea);
  const far = new THREE.Mesh(new THREE.PlaneGeometry(220, 80), toon(0x8FD0EA)); far.rotation.x = -Math.PI/2; far.position.copy(rsAt(30, RS_WS - 0.02, -46)); rsRoot.add(far);
  for(const [x, z, s] of [[-6, -26, 2], [6, -34, 2.8], [18, -28, 2.2], [31, -38, 3], [44, -27, 2], [56, -35, 2.6], [70, -30, 2.2]]){
    const b = addOutline(new THREE.Mesh(new THREE.ConeGeometry(s, s*1.3, 6), toon(0xF3FAFD)), 1.03); b.position.copy(rsAt(x, s*0.4, z)); rsRoot.add(b);
  }
  for(const g of lv.ground){
    rsBox(g[0], g[1], g[2], g[3], g[3] > 0 ? RS_MAT.cliff : RS_MAT.ice);
    rsBox(g[0] + 0.02, g[1] - 0.02, g[3] - 0.02, g[3] + 0.1, RS_MAT.snow, 1.14);   // снежная шапка
  }
  for(const w of lv.walls) rsBox(w[0], w[1], w[2], w[3], RS_MAT.cliff);
  const sh = lv.shelf; rsBox(sh[0], sh[1], sh[2], sh[3], RS_MAT.ice); rsBox(sh[0] + 0.02, sh[1] - 0.02, sh[3] - 0.02, sh[3] + 0.1, RS_MAT.snow, 1.14);
  // вода: прозрачная толща спереди (тюленя под водой видно), светлая кромка
  const [wx0, wx1] = lv.water, wm = new THREE.Mesh(new THREE.BoxGeometry(wx1 - wx0, RS_WS + 3.2, 2.4), RS_WATER);
  wm.position.copy(rsAt((wx0 + wx1)/2, (RS_WS - 3.2)/2)); wm.renderOrder = 2; rsRoot.add(wm);
  const foam = new THREE.Mesh(new THREE.BoxGeometry(wx1 - wx0, 0.06, 2.42), new THREE.MeshBasicMaterial({color:0xEAF7FB, transparent:true, opacity:0.8}));
  foam.position.copy(rsAt((wx0 + wx1)/2, RS_WS)); rsRoot.add(foam); RSW.foam = foam;
  // ворота и решётки (опускаются в лёд)
  RSW.gates = lv.gates.map(g => {
    let o;
    if(g.by === 'cage'){
      o = new THREE.Group(); o.position.copy(rsAt((g.x0 + g.x1)/2, g.y0 + g.h/2)); rsRoot.add(o);
      for(const z of [-0.7, -0.23, 0.23, 0.7]){ const b = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, g.h, 10), RS_MAT.bar), 1.12); b.position.z = z; o.add(b); }
    } else {
      o = rsBox(g.x0, g.x1, g.y0, g.y0 + g.h, RS_MAT.gate);
    }
    return {...g, o, k:0, s:{x0:g.x0, x1:g.x1, y0:g.y0, y1:g.y0 + g.h, k:'gate'}};
  });
  // крышка и прутья клетки спереди (тают вместе с решёткой)
  const lid = rsBox(RS_LV.gates[2].x0 - 0.1, RS_LV.gates[3].x1 + 0.1, 5.2, 5.45, RS_MAT.bar, 0.95); RSW.lid = lid;
  const front = new THREE.Group(); front.position.copy(rsAt(0, 4.1, 0.8)); rsRoot.add(front); RSW.front = front;
  for(let x = RS_LV.gates[2].x1 + 0.35; x < RS_LV.gates[3].x0; x += 0.5){ const b = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 8), RS_MAT.bar), 1.15); b.position.x = RS_POS.x + x - front.position.x; front.add(b); }
  // ледяная стена в воде
  const W = lv.wall; RSW.wall = {o:rsBox(W.x0, W.x1, W.y0, W.y1, RS_MAT.gate), k:0, s:{x0:W.x0, x1:W.x1, y0:W.y0, y1:W.y1, k:'wall'}};
  // плиты-кнопки
  RSW.plates = lv.plates.map(p => {
    const o = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.14, 24), RS_MAT.plate), 1.08);
    o.scale.z = 0.8; o.position.copy(rsAt(p.x, p.y + 0.07, 0.2)); rsRoot.add(o);
    return {...p, o, on:false};
  });
  // рычаги: столбик и ручка
  RSW.levers = lv.levers.map(l => rsLeverObj(l, rsRoot));
  // качели-катапульта: доска на подставке
  const S = lv.see, pv = new THREE.Group(); pv.position.copy(rsAt(S.x, 0.35, 0.1)); rsRoot.add(pv);
  const plank = addOutline(new THREE.Mesh(new THREE.BoxGeometry(S.half*2, 0.14, 1.0), RS_MAT.wood), 1.03); pv.add(plank);
  const tri = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.4, 3), RS_MAT.ice), 1.05); tri.position.copy(rsAt(S.x, 0.17, 0.1)); rsRoot.add(tri);
  RSW.see = {pv, k:0, t:0, a:{x0:S.x - S.half, x1:S.x, y0:0, y1:S.hi, k:'seeA'}, b:{x0:S.x, x1:S.x + S.half, y0:0, y1:S.lo, k:'seeB'}};
  // сосульки под козырьком
  rsBox(RS_LV.icicles[0] - 0.8, RS_LV.icicles[2] + 0.8, 4.1, 4.6, RS_MAT.ice, 1.0);
  RSW.ices = lv.icicles.map(x => {
    const o = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 8), RS_MAT.bar), 1.12); o.rotation.x = Math.PI; rsRoot.add(o);
    return {x, o, st:'hang', t:0, y:lv.iceTop + 0.35};
  });
  // глыба и лифт
  const B = lv.block; RSW.block = {o:rsBox(-B.s/2, B.s/2, 0, B.s, RS_MAT.block), x:B.x, dx:0, s:{x0:0, x1:0, y0:0, y1:B.s, k:'block'}};
  const F = lv.lift, lo = rsBox(F.x0, F.x1, F.bot - 0.4, F.bot, RS_MAT.ice); RSW.lift = {o:lo, top:F.bot, dir:0, wait:0, s:{x0:F.x0, x1:F.x1, y0:F.bot - 0.4, y1:F.bot, k:'lift'}};   // стоит внизу, пока не потянут рычаг
  // журавль на скале: столбик, перекладина и два каната до льдины-лифта
  rsBox(F.x1 + 0.25, F.x1 + 0.5, F.top, F.top + 1.9, RS_MAT.wood, 0.14);
  rsBox(F.x0 - 0.1, F.x1 + 0.6, F.top + 1.75, F.top + 1.95, RS_MAT.wood, 0.14);
  RSW.ropes = [F.x0 + 0.2, F.x1 - 0.2].map(x => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 6), inkMat); r.position.copy(rsAt(x, 0, 0)); rsRoot.add(r); return r; });
}
// сбросить подвижные части перед новым забегом
function rsReset(){
  for(const g of RSW.gates){ g.k = 0; }
  RSW.wall.k = 0;
  for(const p of RSW.plates) p.on = false;
  for(const l of RSW.levers){ l.on = false; l.arm.rotation.z = 0.7; }
  RSW.see.k = 0; RSW.see.t = 0;
  for(const i of RSW.ices){ i.st = 'hang'; i.t = 0; i.y = RS_LV.iceTop + 0.35; i.o.visible = true; i.o.scale.setScalar(1); }
  RSW.block.x = RS_LV.block.x; RSW.block.dx = 0;
  Object.assign(RSW.lift, {top:RS_LV.lift.bot, dir:0, wait:0});
  RSW.lid.visible = true; RSW.lid.position.y = RS_POS.y + 5.325;
  rsWorldSync(0);
}

/* ---------- состояние ---------- */
let Q = null;
function rsSeal(m, role, kind, name){
  const bub = new THREE.Sprite(new THREE.SpriteMaterial({map:BUBBLE_TEX, transparent:true, depthWrite:false})); bub.scale.setScalar(1.35); bub.visible = false; rsLive.add(bub);
  const ic = new THREE.Sprite(new THREE.SpriteMaterial({map:RS_ICON[role], transparent:true, depthWrite:false})); ic.scale.setScalar(0.42); rsLive.add(ic);
  rsLive.add(m.root);
  return {m, role, kind, name, x:0, y:0, vx:0, vy:0, air:false, coy:0, jq:0, jumps:0, ground:null, face:1, inW:false,
    bub:false, bubT:0, bubY:0, inv:0, bubO:bub, ic, nx:0, ny:0, ng:true, nw:false, dive:false, push:false,
    aiT:0, stuckT:0, lastX:0, said:0, lost:false, gone:false};
}
const rsLocal = p => p && p.kind !== 'net';
const rsBoth = () => [Q.me, Q.pal].filter(p => p && !p.gone);
const rsOnPlate = (p, pl) => p && !p.gone && !p.bub && Math.abs(p.x - pl.x) < 0.55 && Math.abs(p.y - pl.y) < 0.15 && (p.kind === 'net' ? p.ng : !p.air);
const rsInWater = x => { const w = Q.L.water; return x > w[0] && x < w[1]; };
const rsHeld = () => rsBoth().some(s => s.hold);   // кто-то держит верёвку (Грот)

/* ---------- мир: ворота, стена, лифт, качели, сосульки ---------- */
function rsSolids(){
  const out = Q.sol;
  out.length = 0;
  for(const s of Q.stat) out.push(s);
  Q.L.solids(out);
  return out;
}
function rsBaySolids(out){
  for(const g of RSW.gates) out.push(g.s);
  out.push(RSW.wall.s, RSW.see.a, RSW.see.b, RSW.block.s, RSW.lift.s);
}
function rsWorldSync(){
  const B = RSW.block, bs = RS_LV.block.s;
  B.s.x0 = B.x - bs/2; B.s.x1 = B.x + bs/2; B.o.position.copy(rsAt(B.x, bs/2));
  for(const g of RSW.gates){ const dy = -g.h*g.k; g.s.y0 = g.y0 + dy; g.s.y1 = g.y0 + g.h + dy; g.o.position.y = RS_POS.y + g.y0 + g.h/2 + dy; }
  RSW.front.position.y = RS_POS.y + 4.1 - 2.2*RSW.gates[2].k;
  const W = RSW.wall, wl = RS_LV.wall, wu = wl.up*W.k; W.s.y0 = wl.y0 + wu; W.s.y1 = wl.y1 + wu; W.o.position.y = RS_POS.y + (wl.y0 + wl.y1)/2 + wu;
  const F = RSW.lift; F.s.y0 = F.top - 0.4; F.s.y1 = F.top; F.o.position.y = RS_POS.y + F.top - 0.2;
  const beam = RS_LV.lift.top + 1.75;
  for(const r of RSW.ropes){ r.scale.y = beam - F.top; r.position.y = RS_POS.y + (beam + F.top)/2; }
  const S = RS_LV.see, sw = RSW.see, k = sw.k;   // k: 0 — левый край вверху, 1 — правый
  sw.a.y1 = S.hi + (S.lo - S.hi)*k; sw.b.y1 = S.lo + (S.hi - S.lo)*k;
  sw.pv.rotation.z = -Math.atan2(S.hi - S.lo, S.half*2)*(1 - 2*k);
}
function rsBayWorld(dt){
  // ворота 1 держит любая плита 1–2; пока кто-то стоит в проёме — не закрываются
  const pl = RSW.plates;
  for(const p of pl){
    const on = rsBoth().some(s => rsOnPlate(s, p));
    if(on !== p.on){ p.on = on; p.o.material = on ? RS_MAT.on : RS_MAT.plate; if(on) sfx.tick(); }
    p.o.position.y = RS_POS.y + p.y + (p.on ? 0.03 : 0.07);
  }
  const inGap = g => rsBoth().some(s => s.x + RS_HW > g.x0 - 0.05 && s.x - RS_HW < g.x1 + 0.05 && s.y < g.y0 + g.h);
  for(const g of RSW.gates){
    const want = g.by === 'plate' ? (pl[0].on || pl[1].on || (g.k > 0.05 && inGap(g)) ? 1 : 0)
      : g.by === 'cage' ? (Q.cage ? 1 : 0) : (RSW.levers[g.by].on ? 1 : 0);
    const k0 = g.k;
    g.k += Math.sign(want - g.k)*Math.min(Math.abs(want - g.k), dt*(want ? 1.6 : 1.1));
    if(k0 === 0 && g.k > 0 && g.by === 'plate') sfx.whoosh();
  }
  const W = RSW.wall; W.k = Math.min(RSW.levers[1].on ? 1 : 0, W.k + dt*0.8);
  // лифт: после рычага ездит вверх-вниз; снизу кто-то есть — ждёт
  const F = RSW.lift, lf = RS_LV.lift;
  if(RSW.levers[2].on){
    if(F.wait > 0) F.wait -= dt;
    else {
      if(!F.dir) F.dir = 1;
      const under = rsBoth().some(s => s.x + RS_HW > lf.x0 && s.x - RS_HW < lf.x1 && s.y + RS_H > F.top - 0.45 && s.y < F.top - 0.4);
      if(!(F.dir < 0 && under)) F.top += F.dir*dt*1.5;
      if(F.top <= lf.bot){ F.top = lf.bot; F.dir = 1; F.wait = 1.8; sfx.thud(); }
      if(F.top >= lf.top){ F.top = lf.top; F.dir = -1; F.wait = 1.4; }
    }
    for(const s of rsBoth()) if(rsLocal(s) && s.ground === F.s && !s.bub) s.y = F.top;   // кто стоит на лифте — едет с ним (и при редких кадрах)
  }
  // качели возвращаются
  const sw = RSW.see;
  if(sw.t > 0){ sw.t -= dt; sw.k = Math.min(1, sw.k + dt*9); } else sw.k = Math.max(0, sw.k - dt*2.5);
  // сосульки: подошли — дрожит, падает, отрастает
  for(const i of RSW.ices){
    i.t += dt;
    if(i.st === 'hang'){
      i.o.position.copy(rsAt(i.x, i.y));
      if(rsBoth().some(s => !s.bub && Math.abs(s.x - i.x) < 1.05 && s.y < 2)){ i.st = 'shake'; i.t = 0; }
    } else if(i.st === 'shake'){
      i.o.position.copy(rsAt(i.x + Math.sin(i.t*40)*0.05, i.y));
      if(i.t > 0.55){ i.st = 'fall'; i.t = 0; i.v = 0; sfx.whoosh(); }
    } else if(i.st === 'fall'){
      i.v += 30*dt; i.y -= i.v*dt; i.o.position.copy(rsAt(i.x, i.y));
      for(const s of [Q.me, Q.pal]) if(s && rsLocal(s) && !s.bub && s.inv <= 0 && Math.abs(s.x - i.x) < RS_HW + 0.12 && i.y - 0.35 < s.y + RS_H && i.y > s.y) rsBubble(s);
      if(i.y - 0.35 <= 0){ i.st = 'gone'; i.t = 0; i.o.visible = false; burst(TEX.star, rsAt(i.x, 0.2), 6, 1.4, 0.2); sfx.plop(); }
    } else if(i.st === 'gone' && i.t > 2.6){
      i.st = 'grow'; i.t = 0; i.y = RS_LV.iceTop + 0.35; i.o.visible = true; i.o.position.copy(rsAt(i.x, i.y));
    } else if(i.st === 'grow'){
      i.o.scale.setScalar(Math.max(0.01, Math.min(1, i.t/0.8))); if(i.t > 0.8) i.st = 'hang';
    }
  }
  rsWorldSync();
  RSW.foam.position.y = RS_POS.y + RS_WS + Math.sin(now*2)*0.02;
}

/* ---------- тюлень: бег, прыжки, вода, столкновения ---------- */
function rsJump(p){ if(p && !p.bub && Q && Q.st === 'go') p.jq = 0.15; }
function rsMove(p, dt, dir, dive){
  const R = RS_ROLE[p.role];
  if(p.bub){ p.y += (p.bubY - p.y)*Math.min(1, dt*2.5); p.vx = p.vy = 0; if(p.bubG && p.bubG.v) p.x += p.bubG.v*dt; return; }   // пузырь над плотом плывёт с ним
  if(p.climb){ if(Q.L.climb && Q.L.climb(p, dt)) return; p.climb = false; p.air = true; }   // лезет по верёвке (Грот)
  if(p.hold && (dir || p.air)) p.hold = false;   // держит верёвку, пока стоит; пошёл — отпустил
  const wasW = p.inW;
  p.inW = rsInWater(p.x) && p.y < RS_WS - 0.1;
  if(p.inW && !wasW && p.vy < -2){ p.vy *= 0.3; sfx.splash(); burst(TEX.puff, rsAt(p.x, RS_WS + 0.1, 0.4), 8, 1.4, 0.35); }
  const sp = p.inW ? 2.6 : p.push ? 1.8 : R.run;
  if(p.fling > 0) p.fling -= dt;   // взлёт с качелей: несёт к полке, пока сам не повернёшь
  if(p.fling > 0 && !dir && p.air) p.vx = 2.4;
  else p.vx += (dir*sp - p.vx)*Math.min(1, dt*(p.air && !p.inW ? 8 : 16));
  if(Math.abs(dir) > 0) p.face = Math.sign(dir);
  p.dive = p.inW && p.role === 'strong' && dive;
  if(p.inW){
    const tgt = p.dive ? -3 : Math.max(-2.5, Math.min(2.4, (RS_FLOAT - p.y)*5));
    p.vy += (tgt - p.vy)*Math.min(1, dt*5);
  } else p.vy -= RS_G*dt;
  if(p.jq > 0){
    p.jq -= dt;
    const surf = p.inW && p.y > RS_FLOAT - 0.3;
    if(surf){ p.vy = 8; p.jq = 0; p.jumps = 1; sfx.drip(); burst(TEX.puff, rsAt(p.x, RS_WS + 0.1, 0.4), 6, 1.2, 0.3); }
    else if(!p.inW && p.coy > 0){ p.vy = R.jv; p.jq = 0; p.jumps = 1; p.coy = 0; p.air = true; if(p === Q.me) sfx.whoosh(); }
    else if(!p.inW && R.jv2 && p.jumps < 2 && p.air){ p.vy = R.jv2; p.jq = 0; p.jumps = 2; sfx.boing(); burst(TEX.puff, rsAt(p.x, p.y + 0.1), 6, 1.2, 0.3); }
  }
  const sol = Q.sol;
  // по горизонтали
  let nx = p.x + p.vx*dt + (p.air && p.cv ? p.cv*dt : 0) + (p.inW && Q.L.flow ? Q.L.flow(p)*dt : 0); p.push = false;   // cv — скорость плота, с которого прыгнул; flow — течение
  for(const s of sol){
    if(s.one || nx + RS_HW <= s.x0 || nx - RS_HW >= s.x1 || p.y + RS_H <= s.y0 + 0.01 || p.y >= s.y1 - 0.01) continue;   // one — только сверху (плот)
    if(!p.air && s.y1 - p.y <= RS_STEP && s.y1 - p.y > 0 && !sol.some(o => o !== s && nx + RS_HW > o.x0 && nx - RS_HW < o.x1 && s.y1 + RS_H > o.y0 && s.y1 < o.y1)){ p.y = s.y1; continue; }
    if(s.k === 'block' && Q.blockMine && p.role === 'strong' && !p.air && Math.abs(p.vx) > 0.2){   // Силач толкает глыбу
      const B = RSW.block, bl = RS_LV.block, want = nx > p.x ? nx + RS_HW + bl.s/2 : nx - RS_HW - bl.s/2;
      const x1 = Math.max(bl.min, Math.min(bl.max, want));
      if(Math.abs(x1 - B.x) > 1e-4 && !rsBoth().some(o => o !== p && Math.abs(o.x - x1) < bl.s/2 + RS_HW - 0.05 && o.y < bl.s - 0.1)){
        B.dx += x1 - B.x; B.x = x1; rsWorldSync(); p.push = true;
        if(Math.random() < dt*10) emit(TEX.puff, rsAt(B.x + Math.sign(nx - p.x)*0.5, 0.1, 0.5), {v:new V3(0, 0.5, 0), life:0.5, size:0.28});
        nx = nx > p.x ? Math.min(nx, B.s.x0 - RS_HW - 1e-4) : Math.max(nx, B.s.x1 + RS_HW + 1e-4);
        continue;   // толкает — не останавливается
      }
    } else if(s.k === 'block' && p.role !== 'strong' && !p.air && p === Q.me && now - (Q.heavyT || 0) > 3){ Q.heavyT = now; floatText(L('Тяжёлая! Это для Силача 💪', 'Too heavy! That\'s for the strong one 💪'), rsAt(p.x, p.y + 1.4)); }
    nx = nx > p.x ? Math.min(nx, s.x0 - RS_HW - 1e-4) : Math.max(nx, s.x1 + RS_HW + 1e-4);
    p.vx = 0; p.wallT = now;
  }
  p.x = nx;
  // по вертикали
  let ny = p.y + p.vy*dt, ground = null;
  for(const s of sol){
    if(p.x + RS_HW - 0.02 <= s.x0 || p.x - RS_HW + 0.02 >= s.x1 || ny + RS_H <= s.y0 || ny >= s.y1) continue;
    if(p.vy <= 0.5 && p.y >= s.y1 - 0.3){ ny = s.y1; ground = s; }
    else if(p.vy > 0 && !s.one && p.y + RS_H <= s.y0 + 0.3){ ny = s.y0 - RS_H; p.vy = 0; }
  }
  if(!ground && Q.L.stack && p.role === 'jump' && p.vy <= 0.5) for(const o of rsBoth()){   // Прыгун встаёт Силачу на голову
    if(o === p || o.role !== 'strong' || o.bub || o.climb) continue;
    const top = o.y + RS_H;
    if(Math.abs(p.x - o.x) < 0.55 && p.y >= top - 0.3 && ny <= top){ ny = top; ground = {k:'pal', o, y1:top}; }
  }
  if(ground){
    if(p.air && p.vy < -3 && ground.k === 'seeA' && p.role === 'strong') rsSeeHit(p);
    if(p.air && p.vy < -7) sfx.thud();
    p.vy = Math.max(0, p.vy); p.air = false; p.jumps = 0; p.coy = 0.12; p.ground = ground;
  } else { p.air = !p.inW; p.ground = null; p.coy -= dt; }
  p.y = ny;
  if(p.ground && p.ground.k === 'block') p.x += RSW.block.dx;   // едет на глыбе
  if(p.ground && p.ground.k === 'pal'){ const o = p.ground.o; if(p.palX != null) p.x += o.x - p.palX; p.palX = o.x; } else p.palX = null;   // на голове у Силача
  if(p.ground && p.ground.v) p.x += p.ground.v*dt;   // на плоту
  if(p.ground) p.cv = p.ground.v || 0; else if(p.inW) p.cv = 0;
  if(p.inv > 0) p.inv -= dt;
}
// Силач прыгнул на высокий край качелей — кто стоит на низком, взлетает
function rsSeeHit(p){
  RSW.see.t = 0.8; sfx.boing();
  burst(TEX.puff, rsAt(RS_LV.see.x - 0.9, 0.3, 0.4), 8, 1.4, 0.35);
  if(Q.mode === 'net') netSend({t:'qsee'});
  rsLaunchCheck();
}
function rsLaunchCheck(){
  RSW.see.t = 0.8;
  const S = RS_LV.see;
  for(const s of [Q.me, Q.pal]){
    if(!s || !rsLocal(s) || s.bub || s.air || s.role !== 'jump') continue;
    if(s.x > S.x - 0.1 && s.x < S.x + S.half + 0.3 && s.y < S.lo + 0.2){
      s.vy = RS_LAUNCH; s.air = true; s.jumps = 1; s.coy = 0; s.y += 0.05; s.vx = 2.4; s.fling = 1.1; s.face = 1;
      sfx.whoosh(); floatText(L('Вжух!', 'Whee!'), rsAt(s.x, s.y + 1.3), '#D9527E');
      burst(TEX.star, rsAt(s.x, 0.4), 10, 2, 0.26);
    }
  }
}

/* ---------- пузырь ---------- */
function rsBubble(p){
  if(p.bub || p.inv > 0 || Q.st !== 'go') return;
  p.bub = true; p.bubG = p.ground; p.hold = false; p.climb = false; p.bubT = RS_BUB_T; p.bubY = Math.min(p.y + 0.9, 3.2 + (p.y >= 2.9 ? 3 : 0)); p.vx = p.vy = 0; sfx.pop();
  burst(TEX.puff, rsAt(p.x, p.y + 0.5), 10, 1.8, 0.4);
  floatText(L('Ой!', 'Oops!'), rsAt(p.x, p.y + 1.4));
  if(p === Q.me){
    const pal = Q.pal && !Q.pal.gone && Q.mode !== 'solo' ? Q.pal.name : null;
    mgHint(pal ? L(`Ты в пузыре! ${pal} может его лопнуть — или подожди`, `You're in a bubble! ${pal} can pop it — or just wait`) : L('Ой, пузырь! Сейчас лопнет', 'Oops, a bubble! It will pop soon'));
    Q.hintT = now + 3;
    if(Q.mode === 'net') rsSendMe();
  } else floatText(L('Помоги!', 'Help!'), rsAt(p.x, p.bubY + 1.2), '#D9527E');
}
function rsRevive(p, byPal){
  if(!p.bub) return;
  p.bub = false; p.inv = 1.8; p.vy = 1; p.air = true;
  sfx.hug(); burst(TEX.heart, rsAt(p.x, p.y + 0.5), 10, 2, 0.3);
  if(byPal) floatText(p.kind === 'ai' ? L('Кря! Спасибо!', 'Quack! Thanks!') : L('Спасибо!', 'Thank you!'), rsAt(p.x, p.y + 1.3), '#D9527E');
  if(p === Q.me){ if(mgHintEl.textContent.includes('🫧') || mgHintEl.textContent.includes(L('пузыр', 'bubble'))) mgHint(''); if(Q.mode === 'net') rsSendMe(); }
}

/* ---------- рычаги, решётка, мамы ---------- */
function rsLever(i, remote){
  const l = Q.W.levers[i]; if(!l || l.on) return;
  l.on = true; sfx.lever();
  floatText(L('Щёлк!', 'Click!'), rsAt(l.x, l.y + 1.1), '#2F9E72');
  burst(TEX.star, rsAt(l.x, l.y + 0.7), 8, 1.6, 0.24);
  if(!remote && Q.mode === 'net') netSend({t:'qlv', i});
  Q.L.lever(i);
  Q.hintT = 0;
}
function rsBayLever(i){
  if(i === 2){ RSW.lift.wait = 1.2; RSW.lift.dir = 1; }   // лифт чуть подождёт — вдруг на нём ещё не стоят
  const at = [RS_LV.gates[1], RS_LV.wall, RS_LV.lift][i];
  wait(0.5).then(() => { if(Q) floatText([L('Дверь открылась!', 'The door is open!'), L('Стена поднялась!', 'The wall went up!'), L('Лифт поехал!', 'The lift is moving!')][i], rsAt((at.x0 + at.x1)/2, i === 1 ? 1.2 : i === 2 ? 3.8 : 2.2), '#3E8DB8'); });
  for(const k of ['s4', 's6']) for(const r of ['jump', 'strong']) Q.said.delete(k + r);
}
function rsCage(remote){
  if(Q.cage) return;
  Q.cage = true; sfx.good(); sfx.sparkle();
  if(!remote && Q.mode === 'net') netSend({t:'qcage'});
  tween(1.2, k => { RSW.lid.position.y = RS_POS.y + 5.325 + k*0.6; RSW.lid.scale.setScalar(Math.max(0.01, 1 - k)); }, ease.io).then(() => { RSW.lid.visible = false; });
  const pp = Q.pup;
  floatText(L('Ура! Свободен!', 'Yay! I\'m free!'), rsAt(pp.x, 4.6), '#D9527E');
  burst(TEX.heart, rsAt(pp.x, 3.8), 12, 2, 0.3);
  pp.happy = now + 3;
  wait(0.9).then(() => { if(Q && Q.pup === pp){ pp.tx = RS_END; Q.momAsk = now + 1.6; } });
}
function rsClue(){
  const f = Q.fam;
  return L(`«У моей мамы шубка ${f.coat.w()} и ${f.sc.w()} шарфик!»`, `“My mum has a ${f.coat.w()} coat and a ${f.sc.w()} scarf!”`);
}
function rsBayTap(near){
  if(Q.asked && !Q.won) for(let i = 0; i < Q.moms.length; i++) if(near(rsAt(Q.moms[i].x, 3.7), 85)){ sfx.tap(); rsMom(i); return true; }
  return false;
}
function rsMom(i, remote){
  const m = Q.moms[i]; if(!m || Q.won || !Q.asked) return;
  if(!remote && Q.mode === 'net') netSend({t:'qmom', i});
  if(!m.ok){
    sfx.bad(); m.shakeT = now + 0.8;
    floatText(L('Это не моя мама…', 'That\'s not my mum…'), rsAt(Q.pup.x, 4.5), '#6B6A7E');
    wait(0.7).then(() => { if(Q && !Q.won) floatText(L('Но я тоже добрая 🙂', 'But I\'m kind too 🙂'), rsAt(m.x, 5), '#3E8DB8'); });
    return;
  }
  rsWin(i);
}
async function rsWin(i){
  if(Q.won) return;
  Q.won = true; Q.st = 'end';
  const m = Q.moms[i], pp = Q.pup, mx = RS_LV.moms[0] + 0.5;
  mgHint(L('Мама нашлась! 💗', 'Mum is found! 💗')); sfx.good(); sfx.hug();
  floatText(L('Мама!', 'Mum!'), rsAt(pp.x, 4.6), '#D9527E');
  // мама спешит к малышу, другие мамы отходят назад и радуются издалека
  Q.moms.forEach(o => { if(o === m) o.tx = mx; else { o.z = -1.6; setMood(o.s, 'happy'); } });
  pp.tx = mx - 0.9; pp.run = true;
  await wait(1.3); if(!Q) return;
  setMood(m.s, 'happy'); setMood(pp.s, 'happy'); m.hug = true;
  burst(TEX.heart, rsAt(mx - 0.5, 4.3), 18, 2.4, 0.34); sfx.purr();
  floatText(L('Малыш мой!', 'My little one!'), rsAt(mx, 5.2), '#D9527E');
  for(const o of Q.moms) if(o !== m) floatText('💗', rsAt(o.x, 4.6, o.zz));
  // тюлени подходят поближе — для фото
  Q.photoX = mx - 1.7;
  for(const p of [Q.me, Q.pal]) if(p && rsLocal(p) && !p.gone){ p.auto = mx - (p.role === 'jump' ? 2.2 : 3.2); if(p.bub) rsRevive(p); }
  await wait(2.6); if(!Q) return;
  Q.end = 'win';
}

/* ---------- Пинг: сам помогает (по участкам уровня) ----------
   Уровень отдаёт цель {tx — куда идти, jump, dive, up — двойной прыжок на макушке, act — действие уровня}. */
function rsAI(p, dt){
  const me = Q.me;
  let o;
  if(me.bub){ o = {tx:me.x}; if(Math.abs(me.x - p.x) < 1.3 && Math.abs(me.y - p.y) < 2.5 && (p.aiT -= dt) < 0){ p.aiT = 0.4; rsRevive(me, true); } }
  else o = Q.L.ai(p, dt);
  const tx = o.tx; let jump = !!o.jump;
  if(o.act && Q.L.doAct) Q.L.doAct(p, o.act);
  if(o.up && p.air && p.jumps === 1 && p.vy < 1 && RS_ROLE[p.role].jv2) jump = true;   // двойной прыжок на макушке
  // застрял у стенки — подпрыгни
  if(Math.abs(p.x - p.lastX) < 0.01 && Math.abs(tx - p.x) > 0.4 && !p.air && !p.inW && !p.hold){ p.stuckT += dt; if(p.stuckT > 0.35){ jump = true; p.stuckT = 0; } } else p.stuckT = 0;
  p.lastX = p.x;
  const d = tx - p.x;
  let dir = Math.abs(d) < 0.12 || p.hold || (p.fling > 0 && p.air) ? 0 : Math.sign(d)*Math.min(1, Math.abs(d)*2.5);
  if(jump) p.jq = 0.12;
  return {dir, dive:!!o.dive};
}
// Бухта, Пинг-Силач
function rsBayAI(p, dt){
  if(p.role === 'jump') return rsBayAIJ(p, dt);
  const me = Q.me, lv = RS_LV, W = RSW;
  let tx = me.x - 1.3, jump = false, dive = false;
  const lever = i => W.levers[i].on;
  if(p.x < 12.4){   // ворота с плитами
    const open = W.gates[0].k > 0.8;
    if(me.x > 12.4) tx = open ? 13.8 : 11.1;
    else if(rsOnPlate(me, lv.plates[0])) tx = lv.plates[1].x;
    else if(me.x > 6.5) tx = lv.plates[0].x;
  } else if(p.x < 16.4 && me.x < 12.4) tx = lv.plates[1].x;   // держим ворота с той стороны
  else if(p.x < 26.3){   // качели и дверь под полкой
    const S = lv.see;
    if(lever(0) || me.y > 3){ tx = W.gates[1].k > 0.8 ? 29 : 25.6; }
    else if(me.x > S.x && me.x < S.x + S.half && !me.air && me.y < 0.3){
      // сначала отойти для разбега, потом бежать и прыгнуть на высокий край (без дрожи на границе)
      if(p.x < 16.3 && !p.air) p.aiRun = true;
      if(p.aiRun){ tx = 18.2; if(p.x > 15.9 && p.x < 16.6 && !p.air) jump = true; if(p.x > 17.6 || (p.ground && p.ground.k === 'seeA')) p.aiRun = false; }
      else tx = 16.1;
    } else tx = p.x > S.x - S.half ? 16.1 : Math.min(16.1, Math.max(p.x, me.x - 1.3));
  } else if(!lever(1)){   // вода: ныряем под стену и тянем рычаг на том берегу
    if(me.x < 26.5 && p.x < 28.5) tx = 28;
    else if(p.inW || p.x < 35.2){ tx = 36.6; dive = p.inW && p.x < 33.7; if(p.inW && p.x > 34.4) jump = true; }
    else { tx = lv.levers[1].x; if(Math.abs(p.x - tx) < 0.5 && !p.air) rsLever(1); }
  } else if(p.y < 2.5 && p.x < 48.4){   // глыба и лифт
    const B = W.block, F = W.lift, bl = lv.block;
    if(!lever(2)){
      if(me.x < 36.5) tx = Math.max(37, me.x + 1.2);
      else if(B.x < bl.max - 0.05){ tx = p.x < B.x ? 47 : B.x - 1.6; }
      else tx = B.x - 1.4;
    } else {
      if(p.ground && p.ground.k === 'lift') tx = F.top > lv.lift.top - 0.05 ? 50.2 : 47.7;
      else if(p.x < B.x + 0.5){ tx = 46.6; if(!p.air && p.x > B.x - 1.15 && p.x < B.x - 0.6) jump = true; }
      else tx = F.top < 0.7 && F.wait > 0.3 ? 47.7 : 46.5;
    }
  } else {   // на скале: две плиты, потом — к мамам
    const [p3, p4] = [lv.plates[2], lv.plates[3]];
    if(!Q.cage){ tx = rsOnPlate(me, p4) ? p3.x : me.x > p4.x - 0.6 && me.x < p4.x + 0.6 ? p3.x : p4.x; if(rsOnPlate(me, p3)) tx = p4.x; }
    else tx = Math.min(RS_END - 1.4, me.x - 1.2);
  }
  return {tx, jump, dive};
}
// Бухта, Пинг-Прыгун: встаёт на плиты, взлетает с качелей, тянет рычаги, запрыгивает с глыбы на скалу
function rsBayAIJ(p, dt){
  const me = Q.me, lv = RS_LV, W = RSW, S = lv.see, lever = i => W.levers[i].on;
  let tx = me.x - 1.3, jump = false, up = false;
  const pull = i => { tx = lv.levers[i].x; if(Math.abs(p.x - tx) < 0.5 && !p.air) rsLever(i); };
  if(p.ground) p.aiBlk = p.ground.k === 'block';
  if(p.x < 12.4 && p.y < 1){   // ворота с плитами — как у Силача
    const open = W.gates[0].k > 0.8;
    if(me.x > 12.4) tx = open ? 13.8 : 11.1;
    else if(rsOnPlate(me, lv.plates[0])) tx = lv.plates[1].x;
    else if(me.x > 6.5) tx = lv.plates[0].x;
  } else if(p.x < 16.4 && me.x < 12.4) tx = lv.plates[1].x;
  else if(p.x < 26.3){   // качели, полка, рычаг
    if(p.y > 3){ if(!lever(0)) pull(0); else tx = 20.6; }   // с полки — влево и вниз
    else if(p.fling > 0) tx = p.x;
    else if(lever(0)) tx = W.gates[1].k > 0.8 ? 28.2 : 25.6;
    else tx = S.x + 0.9;   // низкий край качелей: ждём, когда Силач прыгнет
  } else if(!lever(1) && p.x < 29.5) tx = 28.2;   // ждём, пока Силач откроет стену
  else if(p.x < 36.2){ tx = 37.2; if(p.inW && p.x > 34.4) jump = true; }
  else if(p.y < 2.5 && p.x < 48.4){   // глыба: Силач толкает к скале, с неё — наверх
    const B = W.block, bl = lv.block;
    if(B.x < bl.max - 0.05) tx = Math.max(37.1, Math.min(me.x - 1.3, B.x - 1.4));   // ждём за Силачом, но уже на берегу
    else if(p.ground && p.ground.k === 'block'){ tx = 49.6; if(p.x > B.x + 0.1) jump = true; }
    else if(p.air && p.aiBlk){ tx = 49.6; up = true; }   // прыгнул с глыбы — на макушке ещё раз
    else { tx = B.x; if(!p.air && Math.abs(p.x - B.x) < 1.35) jump = true; }
  } else if(!Q.cage){   // на скале: рычаг лифта, потом две плиты
    const [p3, p4] = [lv.plates[2], lv.plates[3]];
    if(!lever(2)) pull(2);
    else { tx = rsOnPlate(me, p4) ? p3.x : me.x > p4.x - 0.6 && me.x < p4.x + 0.6 ? p3.x : p4.x; if(rsOnPlate(me, p3)) tx = p4.x; }
  } else tx = Math.min(RS_END - 1.4, me.x - 1.2);
  return {tx, jump, up};
}

/* ---------- подсказки по участкам ---------- */
function rsSec(p){
  const x = p.x;
  if(Q.cage) return 8;
  if(x > 48.3 && p.y > 2.5) return 7;
  if(x > 42) return 6;
  if(x > 37.8) return 5;
  if(x > 27.2) return 4;
  if(x > 16.2) return RSW.levers[0].on ? 3 : 2;
  if(x > 7.5) return 1;
  return 0;
}
function rsSecHint(sec, role){
  const n = Q.pal && !Q.pal.gone ? Q.pal.name : '', J = role === 'jump', solo = Q.mode === 'solo';
  const who = r => solo ? RS_ROLE[r].name() : r === role ? L('ты', 'you') : n;
  switch(sec){
    case 0: return L('Малыш-потеряшка отстал от мамы и застрял во льду! Идите к нему вместе ➡️', 'A lost pup got separated from its mum and is stuck in the ice! Go to it together ➡️');
    case 1: return L('Встань на жёлтую плиту — ворота откроются для напарника. А с той стороны он откроет тебе!', 'Stand on the yellow plate — the gate opens for your partner. Then they open it for you from the other side!');
    case 2: return J ? L(`Встань на низкий край качелей — ${solo ? 'Силач' : n} прыгнет на высокий, и ты взлетишь на полку! 🦘`, `Stand on the low end of the seesaw — ${solo ? 'the strong one' : n} jumps on the high end, and you fly up to the ledge! 🦘`)
      : L(`Когда ${solo ? 'Прыгун' : n} встанет на низкий край качелей — прыгни на высокий край ⬆️`, `When ${solo ? 'the jumper' : n} stands on the low end of the seesaw — jump onto the high end ⬆️`);
    case 3: return J ? L('Потяни рычаг 🔧 — дверь внизу откроется', 'Pull the lever 🔧 — the door below will open') : L(`Дверь откроется — ${who('jump')} потянет рычаг наверху`, `The door will open — ${who('jump')} pulls the lever up there`);
    case 4: return J ? L(`Ледяная стена до самого дна! ${solo ? 'Силач' : n} нырнёт под неё и откроет`, `An ice wall down to the bottom! ${solo ? 'The strong one' : n} will dive under it and open it`)
      : L('Нырни под ледяную стену — держи ⬇️ — и потяни рычаг на том берегу', 'Dive under the ice wall — hold ⬇️ — and pull the lever on the other shore');
    case 5: return L('Сосульки! Подойдёшь — задрожит и упадёт. Проскочи быстро 💨', 'Icicles! Come close and one shakes and falls. Dash past quickly 💨');
    case 6: return RSW.levers[2].on ? L('Лифт поехал! Силач, прокатись наверх 🛗', 'The lift is moving! Strong one, ride it up 🛗')
      : J ? L(`${solo ? 'Силач' : n} подвинет глыбу к скале. Запрыгни на неё — и ещё раз в воздухе наверх! Там рычаг`, `${solo ? 'The strong one' : n} pushes the block to the cliff. Jump on it — and once more in the air to get up! There's a lever`)
      : L('Толкни глыбу к скале ➡️ — с неё Прыгун запрыгнет наверх', 'Push the block to the cliff ➡️ — the jumper can get up from it');
    case 7: return L('Встаньте на обе плиты вместе — решётка растает!', 'Stand on both plates together — the bars will melt!');
    case 8: return Q.asked ? rsClue() + ' ' + L('Нажми на его маму 👆', 'Tap his mum 👆') : L('Малыш свободен! 💗', 'The pup is free! 💗');
  }
  return '';
}
function rsHintNow(force){
  const me = Q.me, sec = Q.L.sec(me), key = 's' + sec + me.role;
  if(!force && Q.said.has(key)) return;
  Q.said.add(key); mgHint(Q.L.hint(sec, me.role)); Q.hintT = now + (force ? 6 : 7);
}

/* ---------- сеть ---------- */
function rsSendMe(){ const p = Q.me; netSend({t:'qp', x:+p.x.toFixed(2), y:+p.y.toFixed(2), f:p.face, g:!p.air, b:p.bub, w:p.inW, d:p.dive, h:!!p.hold, c:!!p.climb}); }
function rsNetWire(){
  netOn('qp', m => { const p = Q && Q.pal; if(!p || p.kind !== 'net') return;
    p.nx = m.x; p.ny = m.y; p.face = m.f; p.ng = m.g; p.nw = m.w; p.dive = m.d; p.hold = !!m.h; p.climb = !!m.c;
    if(m.b && !p.bub){ p.bub = true; burst(TEX.puff, rsAt(p.x, p.y + 0.5), 10, 1.8, 0.4); sfx.pop(); floatText(L('Помоги!', 'Help!'), rsAt(p.x, p.y + 1.6), '#D9527E'); }
    if(!m.b && p.bub){ p.bub = false; burst(TEX.heart, rsAt(p.x, p.y + 0.5), 10, 2, 0.3); }
  });
  netOn('qbk', m => { if(Q && !Q.blockMine){ RSW.block.x = m.x; } });
  netOn('qlv', m => { if(Q) rsLever(m.i, true); });
  netOn('qsee', () => { if(Q) rsLaunchCheck(); });
  netOn('qrev', () => { if(Q && Q.me.bub) rsRevive(Q.me, true); });
  netOn('qcage', () => { if(Q) rsCage(true); });
  netOn('qmom', m => { if(Q) rsMom(m.i, true); });
  netOn('qpearl', m => { if(Q) rsPearl(m.i, true); });
  if(Q.L.wire) Q.L.wire();   // события своего уровня
  netOn('emo', () => { if(Q && Q.pal) rsHeart(Q.pal); });
  netOn('bye', () => rsPalGone());
  net.onLost = () => { if(Q && Q.pal){ Q.pal.lost = true; mgHint(L('Связь пропала… подождём 🌊', 'Lost the connection… let\'s wait 🌊')); } };
  net.onBack = () => { if(Q && Q.pal){ Q.pal.lost = false; mgHint(''); toast(L('Снова вместе! 💗', 'Together again! 💗')); } };
}
function rsPalGone(){   // напарник ушёл: его тюлень остаётся — теперь им управляешь ты (🔄)
  if(!Q || !Q.pal || Q.mode !== 'net') return;
  toast(L('Напарник уплыл домой 👋 Теперь ты ведёшь обоих — 🔄', 'Your partner went home 👋 Now you lead both — 🔄'), 3600);
  Q.mode = 'solo'; Q.netGone = true; Q.pal.kind = 'idle'; Q.pal.lost = false; Q.blockMine = true;
  Q.pal.x = Q.pal.nx; Q.pal.y = Q.pal.ny;
  const sw = document.querySelector('.rs-swap'); if(sw) sw.hidden = false;
  const mic = document.querySelector('.rs-side .co-mic'); if(mic) mic.remove();
  netClose();
}
function rsHeart(p){ burst(TEX.heart, rsAt(p.x, p.y + 1.2), 8, 1.6, 0.3); sfx.purr(); }

/* ---------- кадр ---------- */
function rsStep(dt){
  if(!Q) return;
  const {me, pal} = Q, go = Q.st === 'go';
  rsSolids();
  if(go){
    // мой тюлень (и Пинг / второй мой) — маленькими шагами, чтобы не проскочить сквозь тонкую льдину
    const ai = pal && pal.kind === 'ai' ? rsAI(pal, dt) : null;
    const n = Math.ceil(dt/0.016), h = dt/n;
    for(let i = 0; i < n; i++){
      if(Q.L.pre) Q.L.pre(h);
      rsMove(me, h, me.auto != null ? 0 : Q.in.dir, Q.in.dive);
      if(pal && rsLocal(pal) && !pal.gone) rsMove(pal, h, ai ? ai.dir : 0, ai ? ai.dive : false);
    }
  } else {   // в конце тюлени сами подходят к маме
    for(const p of [me, pal]) if(p && rsLocal(p) && !p.gone){
      const d = p.auto != null ? p.auto - p.x : 0;
      rsMove(p, dt, Math.abs(d) < 0.15 ? 0 : Math.sign(d)*0.6, false);
    }
  }
  if(pal && pal.kind === 'net' && !pal.gone){ pal.x += (pal.nx - pal.x)*Math.min(1, dt*12); pal.y += (pal.ny - pal.y)*Math.min(1, dt*12); pal.air = !pal.ng; pal.inW = pal.nw; }
  Q.L.world(dt);
  for(const l of Q.W.levers) l.arm.rotation.z += ((l.on ? -0.7 : 0.7) - l.arm.rotation.z)*Math.min(1, dt*10);
  // пузыри: сами лопаются
  for(const p of [me, pal]) if(p && rsLocal(p) && p.bub && (p.bubT -= dt) <= 0) rsRevive(p);
  Q.L.step(dt, go);   // решётка, потеряшка, мамы — у каждого уровня свои
  rsPearlStep(dt);
  // подсказка участка (один раз) и кнопка действия
  if(go){
    if(now > Q.hintT && Q.hintT){ Q.hintT = 0; if(!Q.asked) mgHint(''); }
    if(!me.bub) rsHintNow(false);
    if(Q.L.stuck) Q.L.stuck(dt);
    rsActBtn();
  }
  // сеть
  if(Q.mode === 'net'){
    if((Q.sendT -= dt) <= 0){ Q.sendT = 0.08; rsSendMe(); }
    if(Q.L.net) Q.L.net(dt);
  }
  rsCam(dt);
  for(const p of [me, pal]) if(p) rsDraw(p, dt);
  if(Q.L.draw) Q.L.draw(dt);
  rsPalArrow();
}
// Бухта: решётка на двух плитах, потеряшка зовёт маму, мамы
function rsBayStep(dt, go){
  if(!Q.cage && RSW.plates[2].on && RSW.plates[3].on) rsCage();
  rsPupStep(dt);
  if(go && Q.momAsk && now > Q.momAsk){ Q.momAsk = 0; Q.asked = true; Q.said.delete('s8' + Q.me.role); rsHintNow(true); Q.hintT = now + 60; sfx.arf(); }
}
function rsBayNet(dt){
  if(Q.blockMine && Math.abs(RSW.block.x - Q.bSent) > 0.005 && (Q.bT -= dt) <= 0){ Q.bT = 0.08; Q.bSent = RSW.block.x; netSend({t:'qbk', x:+RSW.block.x.toFixed(3)}); }
}
/* ---------- жемчужинки: коснулся — твоя (по сети — общая) ---------- */
function rsPearlStep(dt){
  const P = Q.pearlO; if(!P) return;
  P.forEach((o, i) => {
    if(!o.g.visible) return;
    o.g.rotation.y += dt*1.6; o.g.position.y = RS_POS.y + o.y + Math.sin(now*2.4 + i)*0.06; o.sp.material.rotation += dt;
    if(Q.st !== 'go') return;
    for(const p of [Q.me, Q.pal]) if(p && rsLocal(p) && !p.gone && !p.bub && Math.abs(p.x - o.x) < RS_HW + 0.22 && o.y > p.y - 0.22 && o.y < p.y + RS_H + 0.22){ rsPearl(i); return; }
  });
}
function rsPearl(i, remote){
  const o = Q.pearlO[i]; if(!o || !o.g.visible) return;
  o.g.visible = false; Q.pearl[i] = true;
  if(!remote && Q.mode === 'net') netSend({t:'qpearl', i});
  const had = (rsResc().pearls[Q.L.id] || []).includes(i);
  sfx.sparkle(); sfx.coin(); burst(TEX.star, rsAt(o.x, o.y), 12, 2, 0.26);
  const n = Q.pearl.filter(Boolean).length;
  floatText(had ? `🦪 ${n}/3` : L(`Жемчужинка! 🦪 ${n}/3`, `A pearl! 🦪 ${n}/3`), rsAt(o.x, o.y + 0.8), '#D9527E');
}
function rsStuckHints(dt){   // напарник застрял за воротами: подскажем, что делать
  const me = Q.me, pal = Q.pal; if(!pal || pal.gone || Q.mode === 'solo') return;
  const behind = pal.x < 11.8 && me.x > 12.4 && RSW.gates[0].k < 0.2;
  Q.stuckT = behind ? (Q.stuckT || 0) + dt : 0;
  if(Q.stuckT > 2.5 && !Q.said.has('stuck1')){ Q.said.add('stuck1'); mgHint(L(`Встань на плиту — ${pal.name} пройдёт! 🟡`, `Stand on the plate — ${pal.name} can get through! 🟡`)); Q.hintT = now + 5; }
}
function rsActBtn(){
  const me = Q.me, b = Q.actB; if(!b) return;
  let k = '', ic = '🔧', aria = L('Потянуть рычаг', 'Pull the lever');
  if(!me.bub){
    const l = Q.W.levers.findIndex(l => !l.on && Math.abs(me.x - l.x) < 0.85 && Math.abs(me.y - l.y) < 0.6);
    const a = l < 0 && Q.L.act ? Q.L.act(me) : null;   // своё действие уровня: держать верёвку, лезть
    if(l >= 0) k = 'lever:' + l;
    else if(a){ k = a.k; ic = a.ic; aria = a.aria; }
    else if(me.role === 'strong' && me.inW){ k = 'dive'; ic = '⬇️'; aria = L('Нырнуть', 'Dive'); }
  }
  if(b.dataset.k !== k){
    b.dataset.k = k; b.hidden = !k;
    b.textContent = ic;
    b.setAttribute('aria-label', aria);
    if(k && k !== 'dive') wiggle(b);
    if(k !== 'dive') Q.in.dive = false;
  }
  if(k === 'hold') b.classList.toggle('on', !!me.hold);
}
function rsCam(dt){
  const me = Q.me, tv = Math.tan(THREE.MathUtils.degToRad(camera.fov)/2);
  const W = camera.aspect < 1 ? 9 : 13, d = Math.max(W/2/(tv*camera.aspect), 7.5/tv);
  let fx = me.x + me.face*0.9, fy = Math.max(-0.5, Math.min(4.5, me.y*0.6)), fz = 1;
  const f = Q.L.cam && Q.L.cam(); if(f){ fx = f[0]; fy = f[1]; fz = f[2] || 1; }   // уровень просит показать место (мам, полку Пипы) — и отъехать подальше (fz)
  if(Q.photoX != null){ fx = Q.photoX; fy = 1.8; }
  Q.cx += (fx - Q.cx)*Math.min(1, dt*3); Q.cy += (fy - Q.cy)*Math.min(1, dt*3); Q.cz = (Q.cz || 1) + (fz - (Q.cz || 1))*Math.min(1, dt*3);
  const look = rsAt(Q.cx, Q.cy + (camera.aspect < 1 ? 1.2 : 1.4), 0);
  runCam.look.copy(look); runCam.pos.copy(look).add(new V3(0, 3.2*Q.cz, d*Q.cz));   // чуть сверху — видно снежные верхушки льдин
}
function rsDraw(p, dt){
  const m = p.m, sw = p.inW && !p.bub;
  m.root.position.copy(rsAt(p.x, p.bub ? p.y - 0.25 + Math.sin(now*2.2)*0.08 : sw ? p.y + 0.05 : p.y));
  const ry = p.bub ? now*1.5 % (Math.PI*2) - Math.PI : p.face*1.1;
  m.root.rotation.y += (ry - m.root.rotation.y)*Math.min(1, dt*(p.bub ? 1 : 10));
  m.root.rotation.z = sw ? -p.face*0.25 + (p.dive ? -p.face*0.5 : 0) : 0;
  m.flap = p.air || sw ? 1 : Math.abs(p.vx) > 0.4 ? 0.4 : 0;
  m.swimming = sw;
  m.root.visible = !p.gone && !(p.inv > 0 && !p.bub && Math.floor(p.inv*10) % 2) && !(p.lost && Math.floor(now*2) % 2);
  p.bubO.visible = p.bub && !p.gone;
  if(p.bub) p.bubO.position.copy(rsAt(p.x, p.y + 0.2 + Math.sin(now*2.2)*0.08, 0.3));
  p.ic.visible = !p.gone && !p.bub && Q.st !== 'end';
  p.ic.position.copy(rsAt(p.x, p.y + 1.35 + Math.sin(now*3 + p.x)*0.04, 0.2));
  p.ic.material.opacity = p === Q.me ? 1 : 0.8;
  updateSeal(m, now, dt);
}
function rsMomDraw(m, dt){
  const s = m.s;
  if(m.tx != null) m.x += (m.tx - m.x)*Math.min(1, dt*2);
  m.zz += ((m.z || 0) - m.zz)*Math.min(1, dt*2);
  s.root.position.copy(rsAt(m.x + (m.shakeT > now ? Math.sin(now*30)*0.04 : 0), 3, m.zz));
  const want = m.hug ? -1.1 : -0.35;
  s.root.rotation.y += (want - s.root.rotation.y)*Math.min(1, dt*5);
  if(m.shakeT > now) s.shake = Math.sin(now*25)*0.3; else s.shake *= 0.8;
  updateSeal(s, now + m.x, dt);
}
function rsPupStep(dt){
  const pp = Q.pup; if(!pp) return;
  if(pp.tx != null){
    const d = pp.tx - pp.x, sp = pp.run ? 3.2 : 2;
    if(Math.abs(d) > 0.05){ pp.x += Math.sign(d)*Math.min(Math.abs(d), sp*dt); pp.face = Math.sign(d); pp.hop += dt*12; }
    else pp.face = 1;
  }
  const s = pp.s;
  s.root.position.copy(rsAt(pp.x, 3 + Math.abs(Math.sin(pp.hop))*0.12*(pp.tx != null && Math.abs(pp.tx - pp.x) > 0.05 ? 1 : 0)));
  s.root.rotation.y += (pp.face*1.1*(Q.cage ? 1 : 0.4) - s.root.rotation.y)*Math.min(1, dt*6);
  s.flap = pp.happy > now || Q.won ? 1 : 0;
  // зовёт маму, пока сидит в клетке
  if(!Q.cage && now > pp.callT && Math.abs(Q.me.x - pp.x) < 12){ pp.callT = now + 4 + Math.random()*2; floatText(L('Ма-ма!', 'Mu-um!'), rsAt(pp.x, 4.3), '#6B6A7E'); sfx.mama(); }
  if(Q.asked && !Q.won && now > pp.callT){ pp.callT = now + 5; floatText('💭', rsAt(pp.x, 4.3)); }
  updateSeal(s, now, dt);
}
function rsPalArrow(){
  const a = Q.arrow, pal = Q.pal; if(!a) return;
  if(!pal || pal.gone || Q.st === 'end' || Q.asked){ a.hidden = true; return; }
  const q = toScreen(rsAt(pal.x, pal.y + 0.5));
  const off = q.x < 10 ? -1 : q.x > innerWidth - 10 ? 1 : 0;
  a.hidden = !off;
  if(off){
    a.textContent = off < 0 ? `◀ ${RS_ROLE[pal.role].ic}` : `${RS_ROLE[pal.role].ic} ▶`;
    a.style.left = off < 0 ? '8px' : ''; a.style.right = off > 0 ? '8px' : '';
    a.style.top = Math.max(120, Math.min(innerHeight - 200, q.y)) + 'px';
  }
}

/* ---------- «Бухта потеряшки» как уровень ---------- */
RS_LVS.bay = {id:'bay', ic:'🌊', name:() => L('Бухта', 'Bay'),
  say:() => L('Тюленёнок застрял во льду: плиты, качели, ледяная стена — и мама по приметам.', 'A seal pup is stuck in the ice: plates, a seesaw, an ice wall — and mum by the clues.'),
  root:rsRoot, ground:RS_LV.ground, walls:RS_LV.walls, more:[RS_LV.shelf], water:RS_LV.water,
  // жемчужинки: на дне у ледяной стены (Силач ныряет), высоко над полкой (Прыгун, двойной прыжок), между сосульками
  pearls:[{x:30.4, y:-2.75}, {x:22.2, y:6.3}, {x:40.7, y:2.9}], pearlO:null,
  W:() => RSW,
  build(){ rsBuild(); if(!this.pearlO) this.pearlO = rsPearlsBuild(this); },
  reset:rsReset, solids:rsBaySolids, world:rsBayWorld, pre(){ RSW.block.dx = 0; }, lever:rsBayLever,
  ai:rsBayAI, sec:rsSec, hint:rsSecHint, step:rsBayStep, net:rsBayNet, stuck:rsStuckHints, tap:rsBayTap,
  cam:() => Q.asked && !Q.won ? [(RS_END + RS_LV.moms[2])/2 - 0.3, 1.8] : null,
  draw(dt){ for(const m of Q.moms) rsMomDraw(m, dt); },
  setup(fam){   // потеряшка в клетке и три мамы
    const pupS = rsSealLook(fam.coat, fam.sc.c, 0.28); rsRoot.add(pupS.root);
    Q.pup = {s:pupS, x:RS_LV.pup, tx:null, face:1, hop:0, callT:now + 2, happy:0, run:false};
    Q.moms = fam.moms.map((f, i) => { const s = rsSealLook(f.coat, f.sc.c, 0.5); rsRoot.add(s.root); s.root.rotation.y = -0.35; return {s, ok:!!f.ok, x:RS_LV.moms[i], tx:null, z:0, zz:0, shakeT:0, hug:false}; });
  },
  clean(){ if(Q.pup) rsRoot.remove(Q.pup.s.root); for(const m of Q.moms) rsRoot.remove(m.s.root); },
  endX:RS_END, photoY:3.55,
  photo:() => L('Потеряшка нашла маму', 'The lost pup found mum'),
  endTtl:() => L('Потеряшка дома! 💗', 'The lost pup is home! 💗'),
  endSay:() => L('Малыш нашёл маму — и всё благодаря вам 🦭', 'The pup found mum — all thanks to you 🦭')
};

/* ---------- экран: кнопки ---------- */
function rsHud(){
  const pad = mgNode('div', 'rs-pad', `<button class="rs-l" aria-label="${L('Влево', 'Left')}">◀</button><button class="rs-r" aria-label="${L('Вправо', 'Right')}">▶</button>`);
  const rt = mgNode('div', 'rs-right', `<button class="rs-act" hidden></button><button class="co-jump rs-jump" aria-label="${L('Прыжок', 'Jump')}">⬆️</button>`);
  const side = mgNode('div', 'rs-side', `
    <button class="round rs-tip" aria-label="${L('Подсказка', 'Hint')}">💡</button>
    <button class="round rs-swap" aria-label="${L('Переключиться', 'Switch')}"${Q.mode === 'solo' ? '' : ' hidden'}>🔄</button>
    <button class="round co-heart" aria-label="${L('Сердечко напарнику', 'A heart for your partner')}"${Q.mode === 'solo' ? ' hidden' : ''}>💗</button>
    ${Q.mode === 'net' ? `<button class="round co-mic" aria-label="${L('Микрофон', 'Microphone')}">🎤</button>` : ''}`);
  Q.arrow = mgNode('div', 'rs-arrow'); Q.arrow.hidden = true;
  Q.actB = rt.querySelector('.rs-act'); Q.actB.dataset.k = '';
  const held = {l:false, r:false, k:0};
  const upd = () => { Q.in.dir = (held.r ? 1 : 0) - (held.l ? 1 : 0) || held.k; };
  const hold = (el, key) => {
    mgOn(el, 'pointerdown', e => { e.preventDefault(); e.stopPropagation(); try{ el.setPointerCapture(e.pointerId); }catch(er){} held[key] = true; el.classList.add('on'); upd(); });
    const off = e => { held[key] = false; el.classList.remove('on'); upd(); };
    mgOn(el, 'pointerup', off); mgOn(el, 'pointercancel', off); mgOn(el, 'lostpointercapture', off);
  };
  hold(pad.querySelector('.rs-l'), 'l'); hold(pad.querySelector('.rs-r'), 'r');
  const jb = rt.querySelector('.rs-jump');
  mgOn(jb, 'pointerdown', e => { e.preventDefault(); e.stopPropagation(); rsJump(Q.me); });
  const ab = Q.actB;
  mgOn(ab, 'pointerdown', e => {
    e.preventDefault(); e.stopPropagation();
    const k = ab.dataset.k;
    if(k === 'dive'){ try{ ab.setPointerCapture(e.pointerId); }catch(er){} Q.in.dive = true; ab.classList.add('on'); }
    else if(k.startsWith('lever')) rsLever(+k.split(':')[1]);
    else if(k && Q.L.doAct) Q.L.doAct(Q.me, k);
  });
  const dOff = () => { Q.in.dive = false; if(ab.dataset.k !== 'hold') ab.classList.remove('on'); };
  mgOn(ab, 'pointerup', dOff); mgOn(ab, 'pointercancel', dOff);
  mgOn(side.querySelector('.rs-tip'), 'click', e => { e.stopPropagation(); sfx.tap(); rsHintNow(true); });
  mgOn(side.querySelector('.rs-swap'), 'click', e => { e.stopPropagation(); rsSwap(); });
  mgOn(side.querySelector('.co-heart'), 'click', e => {
    e.stopPropagation(); rsHeart(Q.me);
    if(Q.mode === 'net') netSend({t:'emo'});
    else if(Q.pal && Q.pal.kind === 'ai') setTimeout(() => { if(Q && Q.pal){ rsHeart(Q.pal); floatText(L('Кря! 💙', 'Quack! 💙'), rsAt(Q.pal.x, Q.pal.y + 1.6)); } }, 700);
  });
  const mic = side.querySelector('.co-mic'); if(mic) gullMic(mic);
  for(const el of [side, rt, pad]) mgOn(el, 'pointerdown', e => e.stopPropagation());
  // касание по сцене: пузырь напарника, мама, свой второй тюлень
  mgOn(mgRoot, 'pointerdown', e => {
    if(e.target.closest('button, .mg-panel')) return;
    e.preventDefault();
    const near = (v, r) => { const q = toScreen(v); return Math.hypot(q.x - e.clientX, q.y - e.clientY) < r; };
    for(const p of [Q.pal, Q.me]){
      if(!p || !p.bub || p.gone) continue;
      if(p === Q.me && Q.mode !== 'solo') continue;
      if(near(rsAt(p.x, p.y + 0.3), 80)){ if(p.kind === 'net') netSend({t:'qrev'}); rsRevive(p, true); return; }
    }
    if(Q.L.tap && Q.L.tap(near)) return;
    if(Q.mode === 'solo' && Q.pal && near(rsAt(Q.pal.x, Q.pal.y + 0.5), 70)) rsSwap();
  });
  // клавиатура
  mgOn(window, 'keydown', e => {
    if(e.repeat) return;
    if(e.key === 'ArrowLeft' || e.key === 'ArrowRight'){ e.preventDefault(); held.k = e.key === 'ArrowRight' ? 1 : -1; upd(); }
    if(e.key === ' ' || e.key === 'ArrowUp'){ e.preventDefault(); rsJump(Q.me); }
    if(e.key === 'ArrowDown'){ e.preventDefault(); Q.in.dive = true; }
    if(e.key === 'e' || e.key === 'Enter'){ const k = Q.actB.dataset.k; if(k.startsWith('lever')) rsLever(+k.split(':')[1]); else if(k && k !== 'dive' && Q.L.doAct) Q.L.doAct(Q.me, k); }
    if(e.key === 'Tab' && Q.mode === 'solo'){ e.preventDefault(); rsSwap(); }
  });
  mgOn(window, 'keyup', e => {
    if((e.key === 'ArrowLeft' && held.k < 0) || (e.key === 'ArrowRight' && held.k > 0)){ held.k = 0; upd(); }
    if(e.key === 'ArrowDown') Q.in.dive = false;
  });
}
function rsSwap(){   // без напарника: переключиться на второго тюленя
  if(!Q || Q.mode !== 'solo' || !Q.pal || Q.st !== 'go') return;
  sfx.tap();
  const a = Q.me; Q.me = Q.pal; Q.pal = a; Q.me.kind = 'me'; Q.pal.kind = 'idle';
  Q.in.dive = false;
  burst(TEX.star, rsAt(Q.me.x, Q.me.y + 1.1), 8, 1.4, 0.22);
  floatText(RS_ROLE[Q.me.role].ic, rsAt(Q.me.x, Q.me.y + 1.5));
  Q.said.delete('s' + Q.L.sec(Q.me) + Q.me.role); Q.hintT = 0;
}

/* ---------- кто кем будет ---------- */
async function rsRolePick(mode, palName){
  const card = r => `<button data-r="${r}"><span class="ic">${RS_ROLE[r].ic}</span><b>${RS_ROLE[r].name()}</b><small>${RS_ROLE[r].can()}</small></button>`;
  mgOpen('');
  if(mode === 'net' && !net.host){
    const panel = mgNode('div', 'mg-panel fun-pick rs-roles', `<p class="ttl display">🦭 ${L('Спасаем потеряшку', 'Rescue the lost pup')}</p>
      <p class="got">${L(`${palName} выбирает уровень и кем быть…`, `${palName} is choosing the level and who to be…`)}</p>`);
    const m = await new Promise(r => { netOn('qstart', r); netOn('bye', () => r(null)); });
    panel.remove(); mgClose();
    return m;
  }
  const lvs = Object.values(RS_LVS);
  if(!RS_LVS[rsLvPick] || !rsLvOpen(rsLvPick)) rsLvPick = 'bay';
  const pearls = id => (rsResc().pearls[id] || []).length;
  const panel = mgNode('div', 'mg-panel fun-pick rs-roles', `
    <p class="ttl display">🦭 ${L('Спасаем потеряшку', 'Rescue the lost pup')}</p>
    ${lvs.length > 1 ? `<div class="co-games rs-lvs" role="tablist">${lvs.map(v => `<button role="tab" data-lv="${v.id}"${rsLvOpen(v.id) ? '' : ' class="lock"'}>
      <span><span aria-hidden="true">${rsLvOpen(v.id) ? v.ic : '🔒'}</span> ${v.name()}</span><small>🦪 ${pearls(v.id)}/3</small></button>`).join('')}</div>` : ''}
    <p class="got rs-say"></p>
    <p class="got">${mode === 'ping' ? L('Кем будешь ты? Пинг станет другим 🐧', 'Who will you be? Ping takes the other role 🐧')
      : mode === 'solo' ? L('Ты ведёшь обоих тюленей: 🔄 — переключиться', 'You lead both seals: 🔄 — switch')
      : L('Кем будешь ты? Второй станет другим', 'Who will you be? The other one takes the other role')}</p>
    <div class="picks">${mode !== 'solo' ? card('jump') + card('strong') : ''}</div>
    ${mode === 'solo' ? `<ul class="gull-how">${['jump', 'strong'].map(r => `<li><b>${RS_ROLE[r].ic}</b><span><strong>${RS_ROLE[r].name()}</strong> — ${RS_ROLE[r].can()}</span></li>`).join('')}</ul>
      <button class="btn" data-r="jump">${L('Поехали! 🐾', 'Let\'s go! 🐾')}</button>` : ''}
    <button class="btn ghost small" data-r="">${L('Потом', 'Later')}</button>`);
  const show = () => {
    panel.querySelectorAll('[data-lv]').forEach(b => b.setAttribute('aria-selected', b.dataset.lv === rsLvPick));
    panel.querySelector('.rs-say').textContent = RS_LVS[rsLvPick].say();
  };
  panel.querySelectorAll('[data-lv]').forEach(b => mgOn(b, 'click', () => {
    const id = b.dataset.lv;
    if(!rsLvOpen(id)){ sfx.bad(); wiggle(b); toast(id === 'snow' ? L('Сначала найдите Пипу в Гроте 🕯️', 'First find Pipa in the Grotto 🕯️') : L('Сначала спасите малыша в Бухте 🌊', 'First rescue the pup in the Bay 🌊')); return; }
    if(id !== rsLvPick){ sfx.tap(); rsLvPick = id; show(); }
  }));
  show();
  const r = await new Promise(res => panel.querySelectorAll('[data-r]').forEach(b => mgOn(b, 'click', () => { sfx.tap(); res(b.dataset.r); })));
  panel.classList.add('away'); await wait(0.2); mgClose();
  if(!r) return null;
  const m = {role:r, seed:Math.floor(Math.random()*1e9), lv:rsLvPick};
  if(mode === 'net') netSend({t:'qstart', role:r === 'jump' ? 'strong' : 'jump', seed:m.seed, lv:m.lv});
  return m;
}

/* ---------- сама игра ---------- */
async function rescueGame(mode, pal0 = null){
  const palName = mode === 'net' ? (pal0 && pal0.name) || L('Папа', 'Dad') : mode === 'ping' ? L('Пинг', 'Ping') : '';
  if(mode === 'net') netOn('bye', () => {});
  let again = true, res = null;
  const fog = scene.fog;
  let homeB = null, quit = null;
  while(again){
    const start = await rsRolePick(mode, palName);
    if(!start){ if(mode === 'net'){ netSend({t:'bye'}); netClose(); } break; }
    const LV = RS_LVS[start.lv] || RS_LVS.bay;
    LV.build();
    for(const v of Object.values(RS_LVS)) if(v.root) v.root.visible = v === LV;
    if(!homeB){
      sfx.whoosh(); flash();
      scene.fog = null; runCam.on = true; HEMI.intensity = 0.62; sun.intensity = 0.58;
      document.body.classList.add('run-on');
      homeB = document.createElement('button'); homeB.id = 'btnRunHome'; homeB.className = 'round home';
      homeB.innerHTML = '<span aria-hidden="true">🏠</span>'; homeB.setAttribute('aria-label', L('Домой', 'Home')); $('#btnSound').after(homeB);
      homeB.addEventListener('click', () => { sfx.tap(); if(quit) quit(); });
    }
    LV.reset();
    const fam = rsFamily(start.seed), myRole = start.role, palRole = myRole === 'jump' ? 'strong' : 'jump';
    Q = {mode, L:LV, W:LV.W(), st:'ready', seed:start.seed, me:null, pal:null, in:{dir:0, dive:false}, sol:[], stat:[], said:new Set(), hintT:0, cx:1, cy:0.5,
      sendT:0, bT:0, bSent:RS_LV.block.x, blockMine:true, cage:false, asked:false, momAsk:0, won:false, end:null, photoX:null,
      fam, moms:[], pup:null, arrow:null, actB:null, pearl:LV.pearls.map(() => false), pearlO:LV.pearlO};
    // неподвижные бруски
    for(const g of LV.ground) Q.stat.push({x0:g[0], x1:g[1], y0:g[2], y1:g[3], k:'ice'});
    for(const w of LV.walls) Q.stat.push({x0:w[0], x1:w[1], y0:w[2], y1:w[3], k:'ice'});
    for(const w of LV.more || []) Q.stat.push({x0:w[0], x1:w[1], y0:w[2], y1:w[3], k:w[4] || 'ice'});
    // жемчужинки: все на месте, найденные раньше — бледные
    const had = rsResc().pearls[LV.id] || [];
    Q.pearlO.forEach((o, i) => { const old = had.includes(i); o.g.visible = true; o.b.material = old ? RS_PEARL_OLD : RS_PEARL_MAT; o.b.children.forEach(c => c.visible = !old); o.sp.visible = !old; });
    // тюлени
    const mine = coSealOf(coPetDesc()); mine.root.scale.setScalar(RS_SC);
    Q.me = rsSeal(mine, myRole, 'me', save.pet ? save.pet.name : L('Ты', 'You'));
    if(mode === 'ping'){ const m = makePenguin(PENG); m.root.scale.setScalar(RS_SC*0.9); Q.pal = rsSeal(m, palRole, 'ai', palName); }
    else if(mode === 'net'){ const m = coSealOf(pal0 && pal0.coat ? pal0 : null); m.root.scale.setScalar(RS_SC); Q.pal = rsSeal(m, palRole, 'net', palName); Q.blockMine = myRole === 'strong'; rsNetWire(); }
    else { const m = makeSeal({name:'', f:false, color:0xC6DCF4}); m.root.scale.setScalar(RS_SC); Q.pal = rsSeal(m, palRole, 'idle', RS_ROLE[palRole].name()); }
    Q.me.x = mode === 'net' && !net.host ? 3 : 1.2; Q.pal.x = Q.pal.nx = mode === 'net' && !net.host ? 1.2 : 3;
    Q.cx = Q.me.x;
    LV.setup(fam);   // потеряшка, мамы — у каждого уровня свои
    rsResc();
    mgOpen('');
    rsHud();
    let done; const fin = new Promise(r => done = r);
    quit = () => done('quit');
    mgTick(dt => { rsStep(dt); if(Q && Q.end) done(Q.end); });
    if(mode === 'net'){   // гость ждёт «поехали» от хозяина
      if(net.host){ await Promise.race([new Promise(r => netOn('qready', r)), wait(8), fin]); netSend({t:'qgo'}); }
      else { const g = new Promise(r => netOn('qgo', r)), iv = setInterval(() => netSend({t:'qready'}), 400); netSend({t:'qready'}); await Promise.race([g, fin]); clearInterval(iv); }
    }
    Q.st = 'go'; sfx.arf();
    const how = await fin;
    if(how === 'quit'){ if(Q.mode === 'net') netSend({t:'bye'}); mgClose(); rsClean(); break; }
    mgHint('');
    res = rsResults();
    again = await rsResultPanel(res);
    mgClose(); rsClean();
    if(Q === null && mode === 'net' && !netLive()) break;
  }
  rsClean();
  if(mode === 'net') netClose();
  if(homeB){
    homeB.remove(); document.body.classList.remove('run-on'); flash();
    for(const v of Object.values(RS_LVS)) if(v.root) v.root.visible = false;
    runCam.on = false; homeLights(false); scene.fog = fog;
  }
  return res;
}
function rsClean(){
  if(!Q) return;
  for(const p of [Q.me, Q.pal]) if(p){ rsLive.remove(p.m.root); rsLive.remove(p.bubO); rsLive.remove(p.ic); }
  if(Q.L.clean) Q.L.clean();
  Q = null;
}
function rsResults(){
  const r = rsResc(), id = Q.L.id, first = !(r.lv[id] || (id === 'bay' && r.wins)), today = new Date().toDateString();
  const n = r.day && r.day.d === today ? r.day.n : 0, paid = n < RS_DAILY;
  r.wins++; r.day = {d:today, n:n + 1}; r.lv[id] = (r.lv[id] || 0) + 1;
  // жемчужинки: новые — в копилку уровня, за каждую ракушки, за все три — ещё
  const had = r.pearls[id] || [], fresh = Q.pearl.map((v, i) => v && !had.includes(i) ? i : -1).filter(i => i >= 0);
  r.pearls[id] = [...had, ...fresh].sort();
  const all3 = fresh.length > 0 && r.pearls[id].length >= Q.pearl.length;
  const pg = fresh.length*RS_PEARL + (all3 ? RS_PEARLS3 : 0);
  const gift = (first ? RS_FIRST : paid ? RS_GIFT : 0) + pg;
  let photo = null;
  try{
    // фото крупнее: камера на миг подъезжает к спасённому и тюленям
    const c = rsAt(Q.photoX != null ? Q.photoX : Q.L.endX, Q.L.photoY), tv = Math.tan(THREE.MathUtils.degToRad(camera.fov)/2), d = 5.4/(2*tv*Math.min(1, camera.aspect));
    camera.position.copy(c).add(new V3(0, 1.2, d)); camera.lookAt(c);
    photo = snapshot({root:{position:c.clone().setY(c.y - 1), scale:{x:1}}}, 4.4);
    albumAdd({name:Q.L.photo(), img:photo, d:Date.now()}); renderAlbumCount();
  }catch(e){}
  persist();
  return {gift, first, photo, mode:Q.mode, pal:Q.pal && !Q.pal.gone && Q.mode !== 'solo' ? Q.pal.name : null, netGone:!!Q.netGone,
    ttl:Q.L.endTtl(), say:Q.L.endSay(), pearls:r.pearls[id].length, fresh:fresh.length, all3, paid:first || paid};
}
async function rsResultPanel(res){
  const net1 = res.mode === 'net' && netLive();
  const panel = mgNode('div', 'mg-panel run-end co-end', `
    <p class="ttl display">${res.ttl}</p>
    <p class="got">${res.say}</p>
    ${res.pal ? `<p class="got">💗 ${L(`Ты и ${res.pal} — команда!`, `You and ${res.pal} — a team!`)}</p>` : ''}
    ${res.photo ? `<img class="co-photo" src="${res.photo}" alt=""><p class="got">📷 ${L('Фото — в альбоме', 'The photo is in the album')}</p>` : ''}
    <p class="got rs-pearls">🦪 ${L('Жемчужинки', 'Pearls')}: <b>${res.pearls}/3</b>${res.fresh ? ` · ${L('новых', 'new')}: +${res.fresh}` : ''}${res.all3 ? ` · ${L('все собраны! ✨', 'all found! ✨')}` : ''}</p>
    ${!res.paid ? `<p class="got">${L('Ракушки за спасение на сегодня собраны — завтра будут новые 🌊', 'Today\'s shells for rescues are collected — more tomorrow 🌊')}</p>` : ''}
    <p class="earned display">${res.gift ? `+${res.gift} 🐚` : ''}</p>
    <p class="got co-wait" hidden></p>
    <div class="row"><button class="btn" data-k="home">${L('Домой 🏠', 'Home 🏠')}</button>${!res.netGone && (!net1 || net.host) ? `<button class="btn ghost" data-k="again">${L('Ещё раз ↻', 'Again ↻')}</button>` : ''}</div>`);
  if(res.gift) setTimeout(() => addShells(res.gift, {x:innerWidth/2, y:innerHeight*0.4}), 900);
  if(save.pet && typeof petGive === 'function' && petSeal) setTimeout(() => { try{ petGive(5); }catch(e){} }, 1500);
  sfx.hug();
  const k = await new Promise(r => {
    panel.querySelectorAll('[data-k]').forEach(b => mgOn(b, 'click', () => { sfx.tap(); r(b.dataset.k); }));
    if(net1 && !net.host){
      const w = panel.querySelector('.co-wait'); w.hidden = false; w.textContent = L('Напарник решает: ещё раз или домой…', 'Your partner is deciding: again or home…');
      netOn('qagain', () => r('again'));
    }
    if(net1) netOn('bye', () => { const w = panel.querySelector('.co-wait'); w.hidden = false; w.textContent = L('Напарник ушёл домой 👋', 'Your partner went home 👋'); const ag = panel.querySelector('[data-k="again"]'); if(ag) ag.remove(); });
  });
  if(net1){ if(k === 'again' && net.host) netSend({t:'qagain'}); if(k === 'home') netSend({t:'bye'}); }
  panel.classList.add('away'); await wait(0.25);
  return k === 'again';
}
