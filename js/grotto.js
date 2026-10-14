/* ---------------- «Спасаем потеряшку», уровень 2: «Грот» (Спринт 3, задача 3, часть 2) ----------------
   Пингвинёнок Пипа — сестрёнка Пинга — заблудилась в ледяном гроте. Идём вместе, вид сбоку:
     🪢 верёвка: Прыгун запрыгивает на уступ и держит верёвку, Силач по ней залезает (потом она привязана — для всех);
     ⚪ снежные комы катятся по ступенькам: Прыгун перепрыгивает, о Силача они разбиваются; наверху рычаг закрывает
        жёлоб и открывает дверь;
     🛶 плот-льдина по подземной реке: поплывёт, когда на нём оба; упал в воду — течение несёт обратно к плоту;
     в конце Пипа сидит на высокой полке: Силач встаёт под ней, Прыгун запрыгивает ему на голову — и оттуда наверх.
   🌊 Финал «Побег от прилива» (14.10, вместо «ледышек-прыгунов» — финалы «Потеряшки» не повторяют глагол, DESIGN.md §3):
     Пипу нашли — река поднимается, ледяная стенка справа трескается: там шахта наверх, к солнцу. Пипа едет у Силача на спине.
     Два этажа, на каждом: 🦘 Прыгун дёргает кольцо под потолком — люк открывается; 💪 Силач толкает глыбу к уступу (ступенька)
     и вторую — под люк (она сама встаёт точно под ним), с глыбы — ⬆️ в люк (кнопка, без прыжка-на-миллиметр).
     Вода догоняет, но не выше того, кто ниже всех (−0,3 м): упал — вода держит, как льдина (проиграть нельзя).
     Оба наверху — солнышко, Пипа спрыгивает, фото. Пинг идёт «в ногу»: Прыгун лезет в люк, только когда Силач уже у люка.
   3 жемчужинки 🦪: на дне реки (Силач ныряет с плота), над рекой (Прыгун — двойной прыжок с плота),
   на уступе над обрывом (Прыгун — с головы Силача).
   Физика, пузыри, кнопки, сеть и итоги — общие, в rescue.js; тут только сам уровень (RS_LVS.grot).
   Сеть: комы запускает хозяин (qball), разбились — qbx; плот поплыл — qraft; верёвку привязали — qrope; Пипа — qfree;
   прилив: люк открыли — qgh {i}, глыбы шлёт тот, у кого Силач (qgb {i, x}), оба наверху — qgtop; вода у каждого своя (по обоим тюленям).
   Подключается после rescue.js. */
const GR = {
  ground:[[-3, 10.9, -3.2, 0], [10.9, 20, -3.2, 2.4], [20, 21.2, -3.2, 2.8], [21.2, 22.4, -3.2, 3.2], [22.4, 23.6, -3.2, 3.6],
    [23.6, 24.8, -3.2, 4.0], [24.8, 33.2, -3.2, 4.4], [33.2, 38.6, -3.2, 0], [57, 81.4, -3.2, 0.8]],
  walls:[[-2.2, -1, 0, 7], [81.4, 83, 0.8, 18], [68.8, 69.4, 3.0, 18], [38.6, 57, -4.4, -3.2]],   // левый край, стены шахты, дно реки
  ledge:[15.4, 16.8, 5.1, 5.35],       // уступ с жемчужинкой над обрывом (только с головы Силача)
  shelf:[66, 68.8, 3.5, 3.85],         // полка, где сидит Пипа
  water:[38.6, 57],
  rope:{cx:10.4, top:2.4, post:11.9},  // по верёвке лезут у края обрыва; держат у столбика наверху
  gate:{x0:32.6, x1:33.2, y0:4.4, h:3},
  lever:{x:29.6, y:4.4},
  chute:{x:32.1, y:5.7},               // отсюда выкатываются снежные комы
  raft:{x0:38.8, w:2.8, end:54.15, v:1.4, top:-0.05},
  pearls:[{x:46.5, y:-2.7}, {x:49.5, y:2.75}, {x:16.1, y:5.75}],   // на дне реки, над рекой, на уступе
  spotP:14.6, spot:65.1,               // где встать Силачу: под уступом и под полкой Пипы
  pipa:67.6,
  // 🌊 шахта прилива (x 69,4–81,4): стенка-проход, два этажа с люками, уступы, глыбы (w × h) и где они ездят
  door:[68.95, 69.4, 0.8, 3.0],
  slabs:[{y0:4.5, y1:4.8, hole:[78.4, 80.2], hop:77.85, ring:70.8, rb:3.95},
         {y0:8.6, y1:8.9, hole:[70.4, 72.2], hop:72.85, ring:77.0, rb:8.05}],
  ledges:[[75.6, 81.4, 2.3, 2.6], [69.4, 74.6, 6.4, 6.7]],
  blocks:[{x:72.6, y0:0.8, min:70.5, max:75.1}, {x:77.2, y0:2.6, min:76.1, max:79.3}, {x:76.5, y0:4.8, min:75.1, max:76.9}, {x:72.9, y0:6.7, min:71.3, max:73.9}],
  blockW:1.0, blockH:0.9, shaft:[69.4, 81.4], sky:15.5
};
GR.more = [...GR.slabs.flatMap(s => [[GR.shaft[0], s.hole[0], s.y0, s.y1], [s.hole[1], GR.shaft[1], s.y0, s.y1]]), ...GR.ledges];
const GR_BALL = {r:0.36, v:2.7, every:2.5, melt:13.2};

/* ---------- постройка ---------- */
const grRoot = new THREE.Group(); grRoot.visible = false; scene.add(grRoot);
const GR_MAT = {rock:toon(0x9DBFE3), deep:toon(0x6F8CC4), back:toon(0x86A6D8), raft:toon(0xD6EAF5), ball:toon(0xFFFFFF),
  glow:new THREE.MeshBasicMaterial({color:0xA8F0FF}), glow2:new THREE.MeshBasicMaterial({color:0xFFC6E0}), hole:new THREE.MeshBasicMaterial({color:0x3E4F7A})};
const GR_WATER = new THREE.MeshBasicMaterial({color:0x5FB0D6, transparent:true, opacity:0.6, depthWrite:false});
const GRW = {};
let grBuilt = false;
function grBox(x0, x1, y0, y1, mat, zd = 1.1){ return rsBox(x0, x1, y0, y1, mat, zd, grRoot); }
function grBuild(){
  if(grBuilt) return; grBuilt = true;
  const G = GR, R = rsRand(7);
  // стена грота позади, потолок, сосульки-сталактиты и светящиеся кристаллы
  const back = new THREE.Mesh(new THREE.PlaneGeometry(240, 40), GR_MAT.back); back.position.copy(rsAt(34, 5, -7)); grRoot.add(back);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(240, 14), GR_MAT.deep); floor.rotation.x = -Math.PI/2; floor.position.copy(rsAt(34, -3.2, -2)); grRoot.add(floor);
  grBox(-4, 68.8, 9.2, 13, GR_MAT.deep, 4); grBox(83, 92, 9.2, 13, GR_MAT.deep, 4);   // потолок; над шахтой — открыто
  for(let x = -2; x < 68; x += 2.4 + R()*1.6){
    const h = 0.8 + R()*1.4, c = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.28 + R()*0.2, h, 7), GR_MAT.rock), 1.06);
    c.rotation.x = Math.PI; c.position.copy(rsAt(x, 9.2 - h/2, -1.2 - R()*2.4)); grRoot.add(c);
  }
  for(let x = 1; x < 70; x += 5 + R()*4){
    const g = new THREE.Group(); g.position.copy(rsAt(x, 1 + R()*5, -6.2)); grRoot.add(g);
    for(let i = 0; i < 3; i++){
      const c = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9 + R()*0.6, 6), R() < 0.3 ? GR_MAT.glow2 : GR_MAT.glow), 1.08);
      c.position.set((i - 1)*0.3, 0.3, 0); c.rotation.z = (i - 1)*0.4; g.add(c);
    }
  }
  // лёд, скалы, снежные шапки
  for(const g of G.ground){
    grBox(g[0], g[1], g[2], g[3], g[3] > 1 ? GR_MAT.rock : RS_MAT.ice);
    grBox(g[0] + 0.02, g[1] - 0.02, g[3] - 0.02, g[3] + 0.1, RS_MAT.snow, 1.14);
  }
  for(const w of G.walls) grBox(w[0], w[1], w[2], w[3], GR_MAT.rock);
  for(const s of [G.ledge, G.shelf, ...G.more]){ grBox(s[0], s[1], s[2], s[3], RS_MAT.ice); grBox(s[0] + 0.02, s[1] - 0.02, s[3] - 0.02, s[3] + 0.1, RS_MAT.snow, 1.14); }
  grTideBuild();
  // подземная река
  const [wx0, wx1] = G.water, wm = new THREE.Mesh(new THREE.BoxGeometry(wx1 - wx0, RS_WS + 3.2, 2.4), GR_WATER);
  wm.position.copy(rsAt((wx0 + wx1)/2, (RS_WS - 3.2)/2)); wm.renderOrder = 2; grRoot.add(wm); GRW.riverM = wm;
  const foam = new THREE.Mesh(new THREE.BoxGeometry(wx1 - wx0, 0.06, 2.42), new THREE.MeshBasicMaterial({color:0xEAF7FB, transparent:true, opacity:0.8}));
  foam.position.copy(rsAt((wx0 + wx1)/2, RS_WS)); grRoot.add(foam); GRW.foam = foam;
  // стрелочки течения на воде
  GRW.flow = [];
  const am = new THREE.SpriteMaterial({map:canvasTex(64, g => { g.strokeStyle = '#EAF7FB'; g.lineWidth = 10; g.lineCap = g.lineJoin = 'round'; g.beginPath(); g.moveTo(20, 14); g.lineTo(44, 32); g.lineTo(20, 50); g.stroke(); }), transparent:true, opacity:0.7, depthWrite:false});
  for(let x = wx0 + 1.5; x < wx1 - 1; x += 3){ const a = new THREE.Sprite(am); a.scale.setScalar(0.4); a.position.copy(rsAt(x, RS_WS + 0.15, 1.3)); grRoot.add(a); GRW.flow.push(a); }
  // столбик наверху и верёвка
  const rp = G.rope;
  grBox(rp.post - 0.12, rp.post + 0.12, rp.top, rp.top + 0.9, RS_MAT.wood, 0.14);
  const coil = addOutline(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.06, 6, 14), RS_MAT.wood), 1.1); coil.rotation.x = Math.PI/2; coil.position.copy(rsAt(rp.post + 0.35, rp.top + 0.06, 0.3)); grRoot.add(coil);
  const line = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 6), RS_MAT.wood); grRoot.add(line);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, rp.post - rp.cx - 0.25, 6), RS_MAT.wood); top.rotation.z = Math.PI/2;
  top.position.copy(rsAt((rp.post + rp.cx + 0.25)/2, rp.top + 0.55, 0.35)); grRoot.add(top);
  GRW.rope = {tied:false, coil, line, top};
  // заслонка-дверь и рычаг, дыра жёлоба
  const gt = G.gate; GRW.gate = {o:grBox(gt.x0, gt.x1, gt.y0, gt.y0 + gt.h, RS_MAT.gate), k:0, s:{x0:gt.x0, x1:gt.x1, y0:gt.y0, y1:gt.y0 + gt.h, k:'gate'}};
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.62, 20), GR_MAT.hole); hole.position.copy(rsAt(G.chute.x, G.chute.y, -1.08)); grRoot.add(hole);
  const rim = addOutline(new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.12, 8, 20), RS_MAT.snow), 1.08); rim.position.copy(rsAt(G.chute.x, G.chute.y, -1.02)); grRoot.add(rim);
  GRW.lid = addOutline(new THREE.Mesh(new THREE.CircleGeometry(0.66, 20), RS_MAT.gate), 1.02); GRW.lid.position.copy(rsAt(G.chute.x, G.chute.y + 1.4, -1)); grRoot.add(GRW.lid);
  GRW.levers = [rsLeverObj(G.lever, grRoot)];
  // плот-льдина
  const F = G.raft, raft = new THREE.Group(); grRoot.add(raft);
  const fb = addOutline(new THREE.Mesh(new THREE.BoxGeometry(F.w, 0.35, 1.9), GR_MAT.raft), 1.04); fb.position.set(F.w/2, -0.175, 0); raft.add(fb);
  const fs = new THREE.Mesh(new THREE.BoxGeometry(F.w - 0.1, 0.08, 1.8), RS_MAT.snow); fs.position.set(F.w/2, 0.01, 0); raft.add(fs);
  const mast = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 6), RS_MAT.wood), 1.2); mast.position.set(0.25, 0.55, -0.6); raft.add(mast);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.3), new THREE.MeshBasicMaterial({color:0xFF9BB8, side:THREE.DoubleSide})); flag.position.set(0.5, 0.95, -0.6); raft.add(flag);
  GRW.raft = {o:raft, flag, x:F.x0, go:false, done:false, s:{x0:F.x0, x1:F.x0 + F.w, y0:F.top - 0.35, y1:F.top, k:'raft', v:0, one:true}};   // на плот встают сверху, из воды выныривают сквозь него
  GRW.balls = []; GRW.ballT = 1; GRW.ballId = 0;
  RS_LVS.grot.pearlO = rsPearlsBuild(RS_LVS.grot);
}
function grReset(){
  GRW.gate.k = 0; GRW.levers[0].on = false; GRW.levers[0].arm.rotation.z = 0.7;
  GRW.rope.tied = false;
  Object.assign(GRW.raft, {x:GR.raft.x0, go:false, done:false}); GRW.raft.s.v = 0;
  for(const b of GRW.balls) grRoot.remove(b.o);
  GRW.balls.length = 0; GRW.ballT = 1;
  GRW.lid.position.y = RS_POS.y + GR.chute.y + 1.4;
  grTideReset();
  grSync();
}
function grSync(){
  const g = GRW.gate, gt = GR.gate, dy = -gt.h*g.k;
  g.s.y0 = gt.y0 + dy; g.s.y1 = gt.y0 + gt.h + dy; g.o.position.y = RS_POS.y + gt.y0 + gt.h/2 + dy;
  const R = GRW.raft;
  R.s.x0 = R.x; R.s.x1 = R.x + GR.raft.w;
  R.o.position.copy(rsAt(R.x, GR.raft.top + Math.sin(now*2.2)*0.025, 0));
}
// высота льда под x — по ней катятся комы
function grGroundY(x){ let y = -9; for(const g of GR.ground) if(x >= g[0] && x < g[1]) y = Math.max(y, g[3]); return y; }
const grOnRaft = p => { const R = GRW.raft; return !p.bub && !p.gone && (p.kind === 'net' ? p.ng && p.x > R.x && p.x < R.x + GR.raft.w && Math.abs(p.y - GR.raft.top) < 0.03 : p.ground === R.s); };
const grPearlDone = i => Q.pearl[i] || (rsResc().pearls.grot || []).includes(i);

/* ---------- мир: дверь, верёвка, плот, комы ---------- */
function grWorld(dt){
  const W = GRW, R = W.raft, lv = W.levers[0].on;
  W.gate.k = Math.min(lv ? 1 : 0, W.gate.k + dt*1.2);
  W.lid.position.y += ((RS_POS.y + GR.chute.y + (lv ? 0 : 1.4)) - W.lid.position.y)*Math.min(1, dt*4);
  // верёвка: висит, пока держат или когда привязана
  const rp = W.rope, down = rp.tied || rsHeld();
  rp.coil.visible = !down; rp.line.visible = rp.top.visible = down;
  if(down){ const y0 = 0.15, y1 = GR.rope.top + 0.55; rp.line.scale.y = y1 - y0; rp.line.position.copy(rsAt(GR.rope.cx + 0.3, (y0 + y1)/2, 0.35)); rp.line.rotation.z = Math.sin(now*1.7)*0.02; }
  // плот: поплыл, когда на нём оба
  if(!R.go && Q.st === 'go'){ const b = rsBoth(); if(b.length === 2 && b.every(grOnRaft)) grRaftGo(); }
  if(R.go && !R.done){
    R.x += GR.raft.v*dt; R.s.v = GR.raft.v;
    if(R.x >= GR.raft.end){ R.x = GR.raft.end; R.done = true; R.s.v = 0; sfx.thud(); burst(TEX.puff, rsAt(R.x + GR.raft.w, 0.1, 0.4), 8, 1.4, 0.35);
      floatText(L('Приплыли!', 'We\'re here!'), rsAt(R.x + 1.4, 1.4), '#3E8DB8'); }
  } else R.s.v = 0;
  R.flag.rotation.y = Math.sin(now*4)*0.3;
  for(const a of W.flow){ a.position.x += dt*0.8; if(a.position.x > RS_POS.x + GR.water[1] - 0.8) a.position.x -= 18; }
  grTideWorld(dt);
  W.foam.position.y = RS_POS.y + RS_WS + Math.sin(now*2)*0.02;
  // снежные комы: катятся, пока открыт жёлоб и кто-то на обрыве; запускает хозяин комнаты
  const host = Q.mode !== 'net' || net.host;
  const busy = rsBoth().some(s => s.x > 13.4 && s.x < 32.4 && s.y > 1.8);
  if(host && !lv && busy && Q.st === 'go' && (W.ballT -= dt) <= 0){
    W.ballT = GR_BALL.every*(0.85 + Math.random()*0.3);
    const id = ++W.ballId; grBall(id);
    if(Q.mode === 'net') netSend({t:'qball', id});
  }
  for(let i = W.balls.length - 1; i >= 0; i--){
    const b = W.balls[i], r = GR_BALL.r;
    b.x -= GR_BALL.v*dt;
    const gy = grGroundY(b.x);
    if(b.y > gy + 0.001){ b.vy -= RS_G*dt; b.y = Math.max(gy, b.y + b.vy*dt); if(b.y === gy){ b.vy = b.vy < -4 ? -b.vy*0.25 : 0; if(b.vy) sfx.tick(); } }
    else { b.y = gy; b.vy = 0; }
    b.o.position.copy(rsAt(b.x, b.y + r, 0.1)); b.o.rotation.z += GR_BALL.v*dt/r;
    let hit = b.x < GR_BALL.melt;
    for(const s of rsBoth()){
      if(hit || s.bub || s.climb || Math.abs(s.x - b.x) > RS_HW + r*0.8 || b.y + r*2 < s.y + 0.05 || b.y > s.y + RS_H*0.8) continue;
      if(s.role === 'strong'){ hit = true; if(rsLocal(s)){ sfx.thud(); floatText(L('Бум! 💪', 'Boom! 💪'), rsAt(s.x, s.y + 1.4), '#3E8DB8'); } }
      else if(rsLocal(s) && s.inv <= 0){ hit = true; rsBubble(s); }
    }
    if(hit) grBallGone(i, true);
  }
  grSync();
}
function grBall(id){
  const o = addOutline(new THREE.Mesh(SMALL, GR_MAT.ball), 1.08); o.scale.setScalar(GR_BALL.r); grRoot.add(o);
  GRW.balls.push({id, o, x:GR.chute.x, y:GR.chute.y - GR_BALL.r, vy:0});
  emit(TEX.puff, rsAt(GR.chute.x, GR.chute.y, 0.2), {v:new V3(-0.5, 0.2, 0), life:0.5, size:0.4});
}
function grBallGone(i, send){
  const b = GRW.balls[i]; if(!b) return;
  burst(TEX.puff, rsAt(b.x, b.y + GR_BALL.r, 0.3), 8, 1.3, 0.34);
  grRoot.remove(b.o); GRW.balls.splice(i, 1);
  if(send && Q.mode === 'net') netSend({t:'qbx', id:b.id});
}
function grRaftGo(remote){
  const R = GRW.raft; if(R.go) return;
  R.go = true; sfx.whoosh(); sfx.splash();
  floatText(L('Поплыли! 🛶', 'Off we go! 🛶'), rsAt(R.x + 1.4, 1.5), '#3E8DB8');
  if(!remote && Q.mode === 'net') netSend({t:'qraft'});
  Q.hintT = 0;
}
function grTie(remote){
  const rp = GRW.rope; if(rp.tied) return;
  rp.tied = true; sfx.good();
  for(const s of rsBoth()) s.hold = false;
  floatText(L('Верёвку привязали! 🪢', 'The rope is tied! 🪢'), rsAt(GR.rope.post, GR.rope.top + 1.4), '#2F9E72');
  if(!remote && Q.mode === 'net') netSend({t:'qrope'});
  Q.hintT = 0;
}

/* ---------- верёвка: держать и лезть ---------- */
function grClimb(p, dt){
  if(p.hop) return grHopStep(p, dt);   // ⬆️ в люк (прилив)
  if(!(GRW.rope.tied || rsBoth().some(s => s.hold && s !== p))) return false;   // отпустили — соскальзывает
  p.x += (GR.rope.cx - p.x)*Math.min(1, dt*10); p.vx = p.vy = 0; p.air = false; p.face = 1;
  p.y += 1.7*dt;
  if(Math.random() < dt*4) sfx.tick();
  if(p.y >= GR.rope.top){ p.y = GR.rope.top; p.x = GR.rope.cx + 1; p.climb = false; p.inv = 0.3; grTie(); }
  return true;
}
function grAct(me){
  if(me.climb) return null;
  if(GRW.tide.on){ const i = grHopAt(me); return i >= 0 ? {k:'hop', ic:'⬆️', aria:L('Наверх в люк', 'Up through the hatch')} : null; }
  const rp = GR.rope;
  if(!GRW.rope.tied && Math.abs(me.x - rp.post) < 0.8 && Math.abs(me.y - rp.top) < 0.15 && !me.air)
    return {k:'hold', ic:'🪢', aria:L('Держать верёвку', 'Hold the rope')};
  if((GRW.rope.tied || rsBoth().some(s => s.hold && s !== me)) && Math.abs(me.x - rp.cx) < 0.9 && me.y < 0.3 && !me.air)
    return {k:'climb', ic:'🧗', aria:L('Лезть по верёвке', 'Climb the rope')};
  return null;
}
function grDoAct(p, k){
  if(k === 'lever') rsLever(0);
  else if(k === 'hold'){
    p.hold = !p.hold; p.face = -1; sfx.tick();
    if(p.hold) floatText(L('Держу! 🪢', 'Holding! 🪢'), rsAt(p.x, p.y + 1.4), '#2F9E72');
    if(p === Q.me) Q.hintT = 0;
  } else if(k === 'climb' && !p.climb){ p.climb = true; sfx.whoosh(); }
  else if(k === 'hop' && !p.climb){ const i = grHopAt(p); if(i >= 0){ p.hop = {i, k:0, x0:p.x, y0:p.y}; p.climb = true; sfx.whoosh(); } }
}
// течение в реке тянет к плоту (нырнул — не мешает)
function grFlow(p){ if(p.dive) return 0; const c = GRW.raft.x + GR.raft.w/2; return Math.max(-1.6, Math.min(1.6, (c - p.x)*1.2)); }
// вынырнул у плота — сам запрыгивает обратно
function grPre(){
  if(GRW.blocks) for(const B of GRW.blocks) B.dx = 0;   // сдвиг глыбы за шаг — кто стоит на ней, едет следом
  const c = GRW.raft.x + GR.raft.w/2;
  for(const p of [Q.me, Q.pal]) if(p && rsLocal(p) && !p.gone && p.inW && !p.dive && !p.bub && Math.abs(p.x - c) < 1.1 && p.y > RS_FLOAT - 0.25 && p.jq <= 0) p.jq = 0.15;
}

/* ---------- Пипа ---------- */
function grSetup(){
  const s = makePenguin({name:'', f:true, color:0x5C6FA6});
  setScarf(s, '#FF7A9C', 'dots'); s.scarf.visible = true; s.scarf.scale.setScalar(1);
  s.root.scale.setScalar(RS_SC*0.62); grRoot.add(s.root);
  Q.pipa = {s, x:GR.pipa, y:GR.shelf[3], face:-1, callT:now + 3, hop:0};
  Q.fam = null;
}
function grStep(dt, go){
  const P = Q.pipa; if(!P) return;
  // освободили: кто-то из своих добрался до полки
  if(go && !Q.cage) for(const p of [Q.me, Q.pal]) if(p && rsLocal(p) && !p.bub && p.ground && p.ground.k === 'shelf'){ grFree(); break; }
  if(!Q.cage && now > P.callT && Q.me.x > 44){ P.callT = now + 4 + Math.random()*2; floatText(L('Пи-пи! Я тут!', 'Peep-peep! I\'m here!'), rsAt(P.x, P.y + 1.1), '#6B6A7E'); sfx.mama(); }
  const s = P.s;
  if(!P.on){ s.root.position.copy(rsAt(P.x, P.y)); s.root.rotation.y += (P.face*0.9 - s.root.rotation.y)*Math.min(1, dt*6); }
  else s.root.position.y = 1.45 + Math.abs(Math.sin(now*5))*0.06;   // едет у Силача на спине — подпрыгивает
  s.flap = Q.cage ? 1 : 0;
  updateSeal(s, now, dt);
  // над уступом жемчужинка: подскажем, как достать (один раз)
  const me = Q.me;
  if(go && !grPearlDone(2) && !Q.said.has('pearl3') && me.y > 1.8 && Math.abs(me.x - GR.ledge[0]) < 2.2 && !me.bub){
    Q.said.add('pearl3');
    const n = Q.pal && !Q.pal.gone ? Q.pal.name : '', solo = Q.mode === 'solo';
    mgHint(me.role === 'jump' ? L(`Наверху жемчужинка! Встань ${solo ? 'Силачу' : n} на голову — и прыгай ⬆️⬆️`, `A pearl up there! Stand on ${solo ? 'the strong one' : n}'s head — and jump ⬆️⬆️`)
      : L(`Наверху жемчужинка! Постой тут — ${solo ? 'Прыгун' : n} запрыгнет тебе на голову`, `A pearl up there! Stay here — ${solo ? 'the jumper' : n} can jump on your head`));
    Q.hintT = now + 6;
  }
}
// Пипу нашли — радуемся, и тут начинается прилив (финал — grTop наверху шахты)
async function grFree(remote){
  if(Q.cage) return;
  Q.cage = true;
  if(!remote && Q.mode === 'net') netSend({t:'qfree'});
  const P = Q.pipa, q = Q;
  sfx.good(); sfx.sparkle(); mgHint(L('Пипа нашлась! 💗', 'Pipa is found! 💗'));
  floatText(L('Ура! Вы меня нашли!', 'Yay! You found me!'), rsAt(P.x, P.y + 1.3), '#D9527E');
  burst(TEX.heart, rsAt(P.x, P.y + 0.6), 14, 2, 0.3);
  await wait(1.8); if(Q !== q) return;
  grTideGo();
}
// оба наверху шахты: солнышко, Пипа спрыгивает со спины, «дай пять!», фото
async function grTop(remote){
  const T = GRW.tide; if(!T.on || T.top) return;
  T.top = true; Q.st = 'end';
  if(!remote && Q.mode === 'net') netSend({t:'qgtop'});
  const P = Q.pipa, ping = Q.mode === 'ping', y = GR.slabs[1].y1, q = Q, cx = 76;
  sfx.good(); sfx.sparkle(); mgHint(L('Выбрались! Солнышко! ☀️', 'We made it out! Sunshine! ☀️'));
  burst(TEX.star, rsAt(cx, y + 2.4), 18, 2.6, 0.3);
  Q.photoX = cx; Q.photoY = y + 1.0;
  for(const p of [Q.me, Q.pal]) if(p && rsLocal(p) && !p.gone){
    if(p.bub) rsRevive(p);
    if(p.x < GR.slabs[1].hole[1]){ p.x = 73.4; p.y = y; burst(TEX.puff, rsAt(p.x, y + 0.3, 0.4), 6, 1.2, 0.3); }   // стоял слева от люка — к остальным
    p.auto = p.role === 'jump' ? 77.3 : 74.7; p.hold = false;
  }
  await wait(1.0); if(Q !== q) return;
  // Пипа спрыгивает со спины
  const st = rsBoth().find(o => o.role === 'strong');
  if(P.on){ const w = P.s.root.getWorldPosition(new V3()); P.on.m.root.remove(P.s.root); grRoot.add(P.s.root); P.s.root.scale.setScalar(RS_SC*0.62); P.on = null; P.x = w.x - RS_POS.x; P.y = w.y - RS_POS.y; }
  else if(st){ P.x = st.x; P.y = y; }
  const x0 = P.x, y0 = P.y;
  P.face = 1; sfx.whoosh();
  await tween(0.8, k => { P.x = x0 + (cx - x0)*k; P.y = y0 + (y - y0)*k + Math.sin(k*Math.PI)*1.1; }, t => t);
  if(Q !== q) return;
  sfx.thud(); burst(TEX.puff, rsAt(P.x, y + 0.1, 0.4), 8, 1.3, 0.3); P.face = -1;
  floatText(ping ? L('Пинг! Братик!', 'Ping! My brother!') : L('Спасибо! 💗', 'Thank you! 💗'), rsAt(P.x, y + 1.6), '#D9527E');
  if(ping && Q.pal) floatText(L('Сестрёнка! Кря!', 'Little sister! Quack!'), rsAt(Q.pal.x, Q.pal.y + 1.7), '#3E8DB8');
  await wait(1.3); if(Q !== q) return;
  // «дай пять!»
  const a = Q.me, b = Q.pal && !Q.pal.gone ? Q.pal : null;
  const hx = b ? (a.x + b.x)/2 : a.x;
  floatText(L('Дай пять! ✋', 'High five! ✋'), rsAt(hx, y + 2.1), '#D9527E');
  burst(TEX.star, rsAt(hx, y + 1.0), 16, 2.4, 0.3); sfx.hug();
  for(const p of [a, b]) if(p){ p.m.flap = 1; setMood(p.m, 'happy'); }
  await wait(2.2); if(Q !== q) return;
  Q.end = 'win';
}

/* ---------- Пинг в гроте ---------- */
const grBallNear = p => GRW.balls.some(b => b.x > p.x && b.x - p.x < 1.8 && Math.abs(b.y - p.y) < 0.6);
// Прыгун: на голову Силачу o, оттуда — на полку (x0 — её левый край, top — верх, sx — куда встать)
function grStackUp(p, o, x0, top, sx){
  if(p.ground) p.aiHead = p.ground.k === 'pal';
  if(p.y > top - 0.05 && p.x > x0 - 0.3) return {tx:sx};
  if(p.ground && p.ground.k === 'pal') return {tx:o.x, jump:true};
  if(p.air && p.aiHead) return {tx:p.y > top + 0.05 ? sx : o.x, up:true};
  if(p.air) return {tx:o.x};
  return {tx:o.x, jump:Math.abs(p.x - o.x) < 0.9};
}
function grAI(p, dt){ if(GRW.tide.on) return grTideAI(p); return p.role === 'jump' ? grAIJ(p) : grAIS(p); }
// Пинг-Силач: лезет по верёвке, идёт первым к рычагу (комы о него разбиваются), ныряет за жемчужинкой, встаёт под полкой
function grAIS(p){
  const me = Q.me, W = GRW, R = W.raft, lv = W.levers[0].on;
  if(p.climb) return {tx:p.x};
  if(p.x < 10.9 && p.y < 1.5){
    if(W.rope.tied || rsHeld()){ const tx = GR.rope.cx; return {tx, act:Math.abs(p.x - tx) < 0.5 && !p.air ? 'climb' : null}; }
    return {tx:9.4};
  }
  if(p.x < 33.2 && p.y > 1.8){
    if(lv) return {tx:36};
    if(!grPearlDone(2) && me.y > 1.8 && me.x > 12.5 && me.x < 18.5) return {tx:GR.spotP};   // подсадить за жемчужинкой
    if(me.y < 1.8) return {tx:Math.max(12.2, Math.min(p.x, 14))};   // Прыгун ещё внизу — ждём наверху
    return {tx:GR.lever.x, act:Math.abs(p.x - GR.lever.x) < 0.5 && !p.air ? 'lever' : null};
  }
  if(!R.go) return {tx:R.x + 2};
  if(!R.done){
    const P = GR.pearls[0], c = R.x + GR.raft.w/2;
    if(!grPearlDone(0) && P.x - c < 2.4 && P.x - c > -1.5) return {tx:P.x, dive:p.inW};
    return {tx:R.x + 2};
  }
  if(p.y < 0.5) return {tx:59};
  if(!Q.cage) return {tx:GR.spot};
  return {tx:Math.min(me.x - 1.2, 63)};
}
// Пинг-Прыгун: запрыгивает на уступ и держит верёвку, прыгает через комы, за жемчужинкой над рекой, к Пипе — с головы Силача
function grAIJ(p){
  const me = Q.me, W = GRW, R = W.raft, lv = W.levers[0].on;
  if(p.x < 10.9 && p.y < 1.5) return {tx:11.8, up:true};   // у стенки прыгнет, на макушке — ещё раз
  if(p.x < 33.2 && p.y > 1.8){
    if(!W.rope.tied && me.y < 1.5 && me.x < 10.9){ const tx = GR.rope.post, at = Math.abs(p.x - tx) < 0.4 && !p.air; return {tx, act:at && !p.hold ? 'hold' : null}; }
    if(lv) return {tx:36};
    if(!grPearlDone(2) && me.y > 1.8 && Math.abs(me.x - GR.spotP) < 0.6 && !me.air && Math.abs(p.x - me.x) < 4.5) return grStackUp(p, me, GR.ledge[0], GR.ledge[3], 16.1);
    const tx = Math.min(GR.lever.x, Math.max(12.2, me.x - 1.3));
    return {tx, jump:grBallNear(p) && !p.air, act:Math.abs(p.x - GR.lever.x) < 0.5 && !p.air ? 'lever' : null};
  }
  if(!R.go) return {tx:R.x + 0.9};
  if(!R.done){
    const P = GR.pearls[1], ahead = P.x - p.x;
    if(!grPearlDone(1) && ahead < 1.3 && ahead > 0.3 && p.ground === R.s) return {tx:p.x, jump:true};
    if(p.air) return {tx:p.x, up:!grPearlDone(1)};
    return {tx:R.x + 0.9};
  }
  if(p.y < 0.5) return {tx:59, up:true};
  if(!Q.cage){
    if(Math.abs(me.x - GR.spot) < 0.8 && !me.air && me.y > 0.5 && me.y < 1) return grStackUp(p, me, GR.shelf[0], GR.shelf[3], 67.3);
    return {tx:GR.spot - 1.6};
  }
  return {tx:Math.min(me.x + 1, 64)};
}

/* ---------- 🌊 прилив: шахта наверх ---------- */
const GR_SKY = canvasTex(64, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9FD6F0'); gr.addColorStop(0.7, '#DDF2FA'); gr.addColorStop(1, '#FFF4CF'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
function grTideBuild(){
  const G = GR, W = GRW;
  // ледяная стенка-проход: трескается, когда начинается прилив
  const d = G.door; W.door = {o:grBox(d[0], d[1], d[2], d[3], RS_MAT.gate), s:{x0:d[0], x1:d[1], y0:d[2], y1:d[3], k:'ice'}, open:false};
  // люки (крышки) и кольца под потолком
  W.hatch = G.slabs.map((s, i) => {
    const lid = grBox(s.hole[0], s.hole[1], s.y0 + 0.02, s.y1 - 0.02, RS_MAT.gate, 1.0);
    const g = new THREE.Group(); g.position.copy(rsAt(s.ring, s.y0, 0.3)); grRoot.add(g);
    const len = s.y0 - s.rb - 0.3;
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, len, 6), RS_MAT.wood); cord.position.y = -len/2; g.add(cord);
    const ring = addOutline(new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.055, 8, 18), RS_MAT.lever), 1.15); ring.position.y = -len - 0.15; g.add(ring);
    return {lid, g, ring, open:false, k:0, s:{x0:s.hole[0], x1:s.hole[1], y0:s.y0, y1:s.y1, k:'ice'}};
  });
  // глыбы: Силач толкает (общий код в rescue.js — по s.pb)
  W.blocks = G.blocks.map((b, i) => {
    const w = G.blockW, h = G.blockH, o = addOutline(new THREE.Mesh(new THREE.BoxGeometry(w, h, 1.0), RS_MAT.block), 1.04); grRoot.add(o);
    const B = {i, x0:b.x, x:b.x, y0:b.y0, w, h, min:b.min, max:b.max, dx:0, o, sent:b.x, nT:0};
    B.s = {x0:0, x1:0, y0:b.y0, y1:b.y0 + h, k:'gblock', pb:B};
    B.sync = () => { B.s.x0 = B.x - w/2; B.s.x1 = B.x + w/2; o.position.copy(rsAt(B.x, B.y0 + h/2)); };
    B.sync(); return B;
  });
  // вода прилива и пена
  const wm = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 2.6), GR_WATER); wm.renderOrder = 3; wm.visible = false; grRoot.add(wm);
  const foam = new THREE.Mesh(new THREE.BoxGeometry(1, 0.07, 2.62), new THREE.MeshBasicMaterial({color:0xEAF7FB, transparent:true, opacity:0.85})); foam.visible = false; grRoot.add(foam);
  W.tide = {on:false, top:false, W:RS_WS, wm, foam, sndT:0, s:{x0:G.water[0], x1:G.shaft[1], y0:0, y1:0, one:true, k:'tide'}};
  // наверху — небо и солнышко
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(G.shaft[1] - G.shaft[0] + 1.6, 12), new THREE.MeshBasicMaterial({map:GR_SKY})); sky.position.copy(rsAt((G.shaft[0] + G.shaft[1])/2, 9.2 + 6, -6.8)); grRoot.add(sky);
  const sun = new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTex('☀️'), transparent:true, depthWrite:false})); sun.scale.setScalar(1.6); sun.position.copy(rsAt(78.5, G.sky, -6)); grRoot.add(sun);
  const gl = glow(0xFFF3A8, 5); gl.position.copy(rsAt(78.5, G.sky, -6.2)); grRoot.add(gl);
}
function grTideReset(){
  const W = GRW, T = W.tide; if(!T) return;
  T.on = false; T.top = false; T.W = RS_WS; T.wm.visible = T.foam.visible = false;
  if(W.riverM){ W.riverM.visible = true; W.foam.visible = true; }
  const d = W.door, D = GR.door; d.open = false; d.o.visible = true; d.o.scale.y = 1; d.o.position.y = RS_POS.y + (D[2] + D[3])/2;
  W.hatch.forEach((h, i) => { const s = GR.slabs[i]; h.open = false; h.k = 0; h.lid.position.x = RS_POS.x + (s.hole[0] + s.hole[1])/2; h.ring.material = RS_MAT.lever; });
  W.blocks.forEach(B => { B.x = B.sent = B.x0; B.dx = 0; B.sync(); });
}
// этаж тюленя в шахте: 0 — низ (пол, первый уступ), 1 — над первым люком, 2 — наверху
function grStage(p){
  const S = GR.slabs, inSh = p.x > GR.shaft[0] - 0.1;
  return inSh && p.y >= S[1].y1 - 0.1 ? 2 : inSh && p.y >= S[0].y1 - 0.1 ? 1 : 0;
}
const grStrongMine = () => { const S = rsBoth().find(o => o.role === 'strong'); return !S || rsLocal(S); };
function grTideGo(){
  const W = GRW, T = W.tide; if(T.on) return;
  T.on = true; T.W = RS_WS; T.wm.visible = T.foam.visible = true; W.riverM.visible = false; W.foam.visible = false;
  sfx.splash(); sfx.thud(); sfx.grr();
  W.door.open = true;
  burst(TEX.puff, rsAt(69.2, 1.9, 0.4), 14, 2, 0.45); burst(TEX.star, rsAt(69.2, 2, 0.4), 8, 1.6, 0.25);
  floatText(L('Крак! Там ход наверх!', 'Crack! A way up!'), rsAt(70.4, 3.4), '#3E8DB8');
  grPipaRide();
  Q.hintT = 0; rsHintNow(true);
}
function grPipaRide(){   // Пипа запрыгивает Силачу на спину (как в Метели)
  const P = Q.pipa, st = rsBoth().find(o => o.role === 'strong'); if(!P || !st) return;
  burst(TEX.puff, rsAt(P.x, P.y + 0.3, 0.4), 8, 1.3, 0.3); sfx.boing();
  if(P.s.root.parent) P.s.root.parent.remove(P.s.root);
  st.m.root.add(P.s.root); P.on = st;
  P.s.root.scale.setScalar(0.42); P.s.root.position.set(0, 1.45, -0.45); P.s.root.rotation.set(0, 0, 0);
  floatText(L('Пипа, держись! 🐧', 'Hold on, Pipa! 🐧'), rsAt(st.x, st.y + 1.8), '#D9527E');
}
function grHatch(i, remote){
  const h = GRW.hatch[i]; if(!h || h.open) return;
  h.open = true; sfx.lever(); sfx.whoosh(); h.ring.material = RS_MAT.on;
  const s = GR.slabs[i];
  floatText(L('Дзынь! Люк открыт!', 'Ding! The hatch is open!'), rsAt((s.hole[0] + s.hole[1])/2, s.y1 + 0.9), '#2F9E72');
  burst(TEX.star, rsAt(s.ring, s.rb, 0.4), 10, 1.8, 0.25);
  if(!remote && Q.mode === 'net') netSend({t:'qgh', i});
  Q.hintT = 0;
}
// стоит под открытым люком на глыбе (или чём-то не ниже 1,45 м от этажа) — кнопка ⬆️
function grHopAt(p){
  if(!GRW.tide.on || p.air || p.bub) return -1;
  return GR.slabs.findIndex((s, i) => GRW.hatch[i].open && p.x > s.hole[0] + 0.25 && p.x < s.hole[1] - 0.25 && p.y < s.y0 && s.y1 - p.y <= 1.45);
}
function grHopStep(p, dt){
  const H = p.hop, s = GR.slabs[H.i];
  H.k = Math.min(1, H.k + dt/0.6);
  p.x = H.x0 + (s.hop - H.x0)*H.k; p.y = H.y0 + (s.y1 - H.y0)*H.k + Math.sin(H.k*Math.PI)*0.7; p.vx = p.vy = 0; p.air = true;
  p.face = Math.sign(s.hop - H.x0) || 1;
  if(H.k >= 1){ p.y = s.y1; p.hop = null; p.climb = false; p.inv = 0.3; sfx.thud(); burst(TEX.puff, rsAt(p.x, s.y1 + 0.1, 0.4), 6, 1.2, 0.3); if(p === Q.me) Q.hintT = 0; }
  return true;
}
function grTideSolids(out){
  const W = GRW, T = W.tide; if(!T) return;
  if(!W.door.open) out.push(W.door.s);
  for(const h of W.hatch) if(!h.open) out.push(h.s);
  for(const B of W.blocks) out.push(B.s);
  if(T.on && T.W > 0.9) out.push(T.s);   // вода держит, как льдина
}
function grTideWorld(dt){
  const W = GRW, T = W.tide; if(!T) return;
  // стенка-проход оседает
  const d = W.door, D = GR.door;
  if(d.open && d.o.visible){ d.o.scale.y = Math.max(0.02, d.o.scale.y - dt*2.5); d.o.position.y = RS_POS.y + D[2] + (D[3] - D[2])*d.o.scale.y/2; if(d.o.scale.y <= 0.02) d.o.visible = false; }
  // люки: крышка уезжает в этаж, кольцо качается
  W.hatch.forEach((h, i) => {
    const s = GR.slabs[i], w = s.hole[1] - s.hole[0];
    h.k += ((h.open ? 1 : 0) - h.k)*Math.min(1, dt*4);
    h.lid.position.x = RS_POS.x + (s.hole[0] + s.hole[1])/2 + w*h.k*(i ? 1 : -1);
    h.g.rotation.z = Math.sin(now*2 + i)*(h.open ? 0.02 : 0.08);
  });
  if(!T.on) return;
  // кольцо: Прыгун допрыгнул — люк открыт
  if(!T.top) for(const p of rsBoth()){
    if(!rsLocal(p) || p.bub || p.climb || p.role !== 'jump') continue;
    W.hatch.forEach((h, i) => { const s = GR.slabs[i]; if(!h.open && Math.abs(p.x - s.ring) < 0.6 && p.y + RS_H >= s.rb && p.y < s.y0) grHatch(i); });
  }
  // вода: догоняет того, кто ниже всех, но не выше его лап
  if(!T.top){
    const ps = rsBoth().filter(p => !p.bub);
    for(const p of ps) if(!p.air || p.grY === undefined || p.y < p.grY) p.grY = p.y;   // в прыжке считаем, где стоял: вода не обгоняет прыгнувшего
    if(ps.length){
      const lo = Math.min(...ps.map(p => p.grY)), tgt = Math.min(lo - 0.3, GR.slabs[1].y1 - 0.4);
      if(tgt > T.W){ T.W = Math.min(tgt, T.W + (tgt - T.W > 1.5 ? 2.4 : 0.9)*dt); if((T.sndT -= dt) <= 0){ T.sndT = 0.5 + Math.random()*0.6; sfx.drip(); } }
    }
  }
  T.s.y1 = T.W; T.s.y0 = T.W - 0.6;
  const x0 = GR.water[0], x1 = GR.shaft[1], h = T.W + 3.2;
  T.wm.scale.set(x1 - x0, h, 1); T.wm.position.copy(rsAt((x0 + x1)/2, -3.2 + h/2));
  T.foam.scale.x = x1 - x0; T.foam.position.copy(rsAt((x0 + x1)/2, T.W + Math.sin(now*2)*0.02));
  if(Math.random() < dt*5) emit(TEX.puff, rsAt(58 + Math.random()*23, T.W + 0.05, 0.6), {v:new V3(0, 0.4, 0), life:0.6, size:0.18});
  // упал в воду — она держит: всплыл и стоит
  for(const p of rsBoth()){
    if(!rsLocal(p) || p.bub || p.climb) continue;
    if(p.x > GR.water[0] && p.y < T.W - 0.05){ p.y = T.W; p.vy = Math.max(0, p.vy); }
    const on = !!(p.ground && p.ground.k === 'tide');
    if(on && !p.grTide){ sfx.splash(); burst(TEX.puff, rsAt(p.x, T.W + 0.1, 0.4), 8, 1.4, 0.3); if(p === Q.me) floatText(L('Плюх! Вода держит', 'Splash! The water holds you'), rsAt(p.x, p.y + 1.4), '#3E8DB8'); }
    p.grTide = on;
  }
  // оба наверху — выбрались!
  if(!T.top && Q.st === 'go'){ const ps = rsBoth(); if(ps.length && ps.every(p => !p.bub && !p.climb && grStage(p) >= 2)) grTop(); }
}
// камера: видно обоих и воду под ними
function grTideCam(){
  const T = GRW.tide; if(!T || !T.on || T.top) return null;
  const ps = rsBoth(); if(!ps.length) return null;
  const ys = ps.map(p => p.y), lo = Math.min(...ys), hi = Math.max(...ys), inSh = Math.min(...ps.map(p => p.x)) > GR.shaft[0] - 0.5;
  return [inSh ? 75.4 : Math.min(72, Math.max(Q.me.x + 1.5, 66)), Math.max(0.3, (lo + hi)/2 - 0.3), 1.05 + Math.min(0.5, (hi - lo)*0.1) + (inSh ? 0.2 : 0)];
}
// по сети глыбы рассылает тот, у кого Силач
function grTideNet(dt){
  if(!GRW.tide.on || !grStrongMine()) return;
  for(const B of GRW.blocks) if(Math.abs(B.x - B.sent) > 0.005 && (B.nT -= dt) <= 0){ B.nT = 0.08; B.sent = B.x; netSend({t:'qgb', i:B.i, x:+B.x.toFixed(3)}); }
}
// Пинг в шахте: Прыгун открывает люк и лезет следом, когда Силач уже у люка; Силач ставит глыбы ступенькой и под люк
function grTideAI(p){
  if(GRW.tide.top) return {tx:p.x};
  const st = grStage(p);
  if(st === 0 && p.x < GR.shaft[0] + 0.3) return {tx:71.2, far:true};   // сначала — в шахту
  return {...(p.role === 'jump' ? grTideAIJ(p, st) : grTideAIS(p, st)), far:true};
}
function grTideAIJ(p, st){
  if(st >= 2) return {tx:Math.max(73.2, Math.min(p.x, 79))};
  const s = GR.slabs[st], h = GRW.hatch[st], L = GR.ledges[st], hc = (s.hole[0] + s.hole[1])/2;
  if(p.air && p.y > s.y1 + 0.02) return {tx:st ? 73.4 : 77.6};   // вылетел из люка — шаг на этаж
  if(!h.open) return {tx:s.ring, jump:!p.air && Math.abs(p.x - s.ring) < 0.3, up:true};
  const S = rsBoth().find(o => o.role === 'strong');
  const ready = !S || S === p || grStage(S) > st || grHopAt(S) === st || !!S.hop;   // «в ногу»: Силач уже у люка
  if(p.y >= L[3] - 0.05){   // на уступе (или на глыбе)
    if(!ready) return {tx:st ? 73.6 : 77.0};
    return {tx:hc, jump:!p.air && Math.abs(p.x - hc) < 0.35, up:true};
  }
  if(!ready) return {tx:st ? 76.2 : 73.8};
  const edge = st ? L[1] + 0.5 : L[0] - 0.5;   // откуда прыгать на уступ, не задев его снизу
  if(p.air) return {tx:p.y > L[3] + 0.05 ? (st ? L[1] - 0.8 : L[0] + 0.8) : edge, up:true};
  return {tx:edge, jump:Math.abs(p.x - edge) < 0.3, up:true};
}
function grTideAIS(p, st){
  if(st >= 2) return {tx:Math.max(73.2, Math.min(p.x, 76))};
  if(grHopAt(p) === st) return {tx:p.x, act:'hop'};
  const L = GR.ledges[st], Bs = GRW.blocks[st*2], Bh = GRW.blocks[st*2 + 1], side = st ? 1 : -1;   // этаж 0 толкаем вправо, этаж 1 — влево
  const push = (B, at) => {
    if(Math.abs(B.x - at) < 0.05) return null;
    if(p.ground && p.ground.pb === B) return {tx:B.x + side*1.2};   // слезть на нужную сторону
    if(st ? p.x < B.x : p.x > B.x) return {tx:B.x + side*1.3};       // обойти (упрётся — перепрыгнет)
    return {tx:st ? B.min - 2 : B.max + 2};
  };
  if(p.y < L[3] - 0.05) return push(Bs, st ? Bs.min : Bs.max) || {tx:st ? L[1] - 0.6 : L[0] + 0.6};   // ступенька — и по ней на уступ
  return push(Bh, st ? Bh.min : Bh.max) || {tx:Bh.x};   // глыбу под люк — и ждать на ней
}

/* ---------- подсказки ---------- */
function grSec(p){
  const T = GRW.tide;
  if(T.on && !T.top){ const st = grStage(p); return st >= 2 ? 44 : 40 + st*2 + (GRW.hatch[st].open ? 1 : 0); }
  if(Q.cage) return 7;
  if(p.x > 56.8 && p.y > 0.5) return 6;
  if(p.x > 33.2 && p.y < 3) return GRW.raft.go ? 5 : 4;
  if(p.y > 1.8 && p.x > 10.8) return p.x > 24 ? 3 : 2;
  if(p.x > 5.5) return 1;
  return 0;
}
function grHint(sec, role){
  const n = Q.pal && !Q.pal.gone ? Q.pal.name : '', J = role === 'jump', solo = Q.mode === 'solo';
  const nJ = solo ? L('Прыгун', 'the jumper') : n, nS = solo ? L('Силач', 'the strong one') : n;
  switch(sec){
    case 0: return Q.mode === 'ping' ? L('В гроте потерялась Пипа — сестрёнка Пинга! Идите на голос ➡️', 'Pipa — Ping\'s little sister — is lost in the grotto! Follow her voice ➡️')
      : L('В гроте потерялась пингвинёнок Пипа! Идите на голос ➡️', 'Pipa the penguin chick is lost in the grotto! Follow her voice ➡️');
    case 1: return GRW.rope.tied ? L('Верёвка привязана — подойди и нажми 🧗', 'The rope is tied — walk up to it and press 🧗')
      : J ? L(`Запрыгни на уступ: прыжок и ещё раз в воздухе ⬆️⬆️. Там верёвка — нажми 🪢 и держи, пока ${nS} лезет`, `Jump up the ledge: jump, then once more in the air ⬆️⬆️. There's a rope — press 🪢 and hold it while ${nS} climbs`)
      : L(`Высоко! ${nJ} запрыгнет наверх и подержит верёвку 🪢 — тогда подойди к ней и нажми 🧗`, `Too high! ${nJ} jumps up and holds the rope 🪢 — then walk up to it and press 🧗`);
    case 2: return J ? L(`Снежные комы! Перепрыгивай ⬆️ — или иди за ${solo ? 'Силачом' : n}: о него комы разбиваются 💪`, `Snowballs! Jump over them ⬆️ — or walk behind ${nS}: they smash against the strong one 💪`)
      : L('Снежные комы! Ты сильный — они о тебя разбиваются. Иди первым 💪', 'Snowballs! You\'re strong — they smash against you. Go first 💪');
    case 3: return L('Наверху рычаг 🔧 — он закроет снежный жёлоб и откроет дверь', 'The lever up here 🔧 closes the snow chute and opens the door');
    case 4: return L('Плот-льдина! Встаньте на него оба — и поплывём по реке 🛶', 'An ice raft! Both of you stand on it — and off we float down the river 🛶');
    case 5: return J ? L('Плывём! Над водой висит жемчужинка — прыгни за ней ⬆️⬆️', 'Floating! A pearl hangs above the water — jump for it ⬆️⬆️')
      : L('Плывём! На дне блестит жемчужинка — спрыгни в воду и держи ⬇️', 'Floating! A pearl shines on the bottom — hop in and hold ⬇️');
    case 6: return J ? L(`Пипа на высокой полке! Встань ${solo ? 'Силачу' : n} на голову — и прыгай оттуда ⬆️⬆️`, `Pipa is on a high shelf! Stand on ${nS}'s head — and jump from there ⬆️⬆️`)
      : L(`Пипа на высокой полке! Встань под ней — ${nJ} запрыгнет тебе на голову, а оттуда к Пипе`, `Pipa is on a high shelf! Stand under it — ${nJ} jumps on your head and up to Pipa`);
    case 7: return L('Пипа нашлась! 💗', 'Pipa is found! 💗');
    case 40: case 42: { const up = sec === 42 ? L('Ещё этаж! ', 'One more floor! ') : L('Прилив! Вода поднимается — бегом наверх! ', 'The tide! The water is rising — up we go! ');
      return up + (J ? L('Под потолком кольцо 🔔 — прыгни под ним и ещё раз в воздухе ⬆️⬆️, люк откроется', 'There\'s a ring 🔔 under the ceiling — jump under it and again in the air ⬆️⬆️, the hatch opens')
        : L(`Толкни глыбу к уступу 💪 — будет ступенька, а вторую — под люк. Люк откроет ${nJ}: кольцо 🔔 под потолком`, `Push a block to the ledge 💪 — it makes a step, and the second one under the hatch. ${nJ} opens the hatch: the ring 🔔 under the ceiling`)); }
    case 41: case 43: return J ? L(`Люк открыт! Запрыгни на уступ — и в люк ⬆️⬆️. ${nS} поднимется с глыбы`, `The hatch is open! Jump onto the ledge — and up through the hatch ⬆️⬆️. ${nS} climbs from the block`)
      : L('Люк открыт! Толкни глыбу под люк, залезь на неё и нажми ⬆️', 'The hatch is open! Push a block under the hatch, climb on it and press ⬆️');
    case 44: return L(`Наверху светло! ☀️ Ждём ${solo ? (J ? 'Силача' : 'Прыгуна') : n}`, `It's bright up here! ☀️ Waiting for ${solo ? (J ? 'the strong one' : 'the jumper') : n}`);
  }
  return '';
}
// напарник внизу, а верёвку никто не держит — подскажем
function grStuck(dt){
  const me = Q.me, pal = Q.pal; if(!pal || pal.gone || Q.mode === 'solo') return;
  const wait = !GRW.rope.tied && pal.x < 10.9 && pal.y < 1.5 && me.y > 1.8 && !me.hold;
  Q.stuckT = wait ? (Q.stuckT || 0) + dt : 0;
  if(Q.stuckT > 3 && !Q.said.has('stuckR')){ Q.said.add('stuckR'); mgHint(L(`${pal.name} ждёт внизу! Подойди к столбику и нажми 🪢`, `${pal.name} is waiting below! Go to the post and press 🪢`)); Q.hintT = now + 5; }
}
function grWire(){
  netOn('qgh', m => { if(Q && Q.L.id === 'grot') grHatch(+m.i, true); });
  netOn('qgb', m => { if(!Q || Q.L.id !== 'grot') return; const B = GRW.blocks[+m.i]; if(B && !grStrongMine() && Number.isFinite(+m.x)){ B.x = Math.max(B.min, Math.min(B.max, +m.x)); B.sync(); } });
  netOn('qgtop', () => { if(Q && Q.L.id === 'grot') grTop(true); });
  netOn('qball', m => { if(Q && Q.L.id === 'grot' && !GRW.balls.some(b => b.id === m.id)) grBall(m.id); });
  netOn('qbx', m => { if(!Q || Q.L.id !== 'grot') return; const i = GRW.balls.findIndex(b => b.id === m.id); if(i >= 0) grBallGone(i, false); });
  netOn('qraft', () => { if(Q && Q.L.id === 'grot') grRaftGo(true); });
  netOn('qrope', () => { if(Q && Q.L.id === 'grot') grTie(true); });
  netOn('qfree', () => { if(Q && Q.L.id === 'grot') grFree(true); });
}

RS_LVS.grot = {id:'grot', ic:'🕯️', name:() => L('Грот', 'Grotto'),
  say:() => L('Пингвинёнок Пипа потерялась в гроте: верёвка, снежные комы, плот по реке, высокая полка — а в конце прилив 🌊!', 'Pipa the penguin chick is lost in the grotto: a rope, rolling snowballs, a raft on the river, a high shelf — and the tide at the end 🌊!'),
  root:grRoot, ground:GR.ground, walls:GR.walls, more:[GR.ledge, [...GR.shelf, 'shelf'], ...GR.more], water:GR.water, stack:true,
  pearls:GR.pearls, pearlO:null,
  W:() => GRW, build:grBuild, reset:grReset, solids(out){ out.push(GRW.gate.s, GRW.raft.s); grTideSolids(out); }, world:grWorld, pre:grPre, cam:grTideCam, net:grTideNet,
  lever(){ wait(0.4).then(() => { if(Q) floatText(L('Жёлоб закрыт, дверь открыта!', 'The chute is shut, the door is open!'), rsAt(GR.gate.x0, 6.2), '#3E8DB8'); }); },
  flow:grFlow, climb:grClimb, act:grAct, doAct:grDoAct,
  ai:grAI, sec:grSec, hint:grHint, step:grStep, stuck:grStuck, wire:grWire,
  setup:grSetup, clean(){ if(Q.pipa && Q.pipa.s.root.parent) Q.pipa.s.root.parent.remove(Q.pipa.s.root); for(const b of GRW.balls) grRoot.remove(b.o); GRW.balls.length = 0; },
  endX:63.2, photoY:1.35,
  photo:() => L('Пипа нашлась в гроте', 'Pipa found in the grotto'),
  endTtl:() => L('Пипа нашлась! 💗', 'Pipa is found! 💗'),
  endSay:() => Q && Q.mode === 'ping' ? L('Пинг обнимает сестрёнку — спасибо вам! 🐧', 'Ping hugs his little sister — thank you! 🐧') : L('Пингвинёнок снова не одна — и всё благодаря вам 🐧', 'The penguin chick is safe — all thanks to you 🐧')
};
