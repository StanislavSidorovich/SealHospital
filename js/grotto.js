/* ---------------- «Спасаем потеряшку», уровень 2: «Грот» (Спринт 3, задача 3, часть 2) ----------------
   Пингвинёнок Пипа — сестрёнка Пинга — заблудилась в ледяном гроте. Идём вместе, вид сбоку:
     🪢 верёвка: Прыгун запрыгивает на уступ и держит верёвку, Силач по ней залезает (потом она привязана — для всех);
     ⚪ снежные комы катятся по ступенькам: Прыгун перепрыгивает, о Силача они разбиваются; наверху рычаг закрывает
        жёлоб и открывает дверь;
     🛶 плот-льдина по подземной реке: поплывёт, когда на нём оба; упал в воду — течение несёт обратно к плоту;
     в конце Пипа сидит на высокой полке: Силач встаёт под ней, Прыгун запрыгивает ему на голову — и оттуда наверх.
   3 жемчужинки 🦪: на дне реки (Силач ныряет с плота), над рекой (Прыгун — двойной прыжок с плота),
   на уступе над обрывом (Прыгун — с головы Силача).
   Физика, пузыри, кнопки, сеть и итоги — общие, в rescue.js; тут только сам уровень (RS_LVS.grot).
   Сеть: комы запускает хозяин (qball), разбились — qbx; плот поплыл — qraft; верёвку привязали — qrope; Пипа — qfree.
   Подключается после rescue.js. */
const GR = {
  ground:[[-3, 10.9, -3.2, 0], [10.9, 20, -3.2, 2.4], [20, 21.2, -3.2, 2.8], [21.2, 22.4, -3.2, 3.2], [22.4, 23.6, -3.2, 3.6],
    [23.6, 24.8, -3.2, 4.0], [24.8, 33.2, -3.2, 4.4], [33.2, 38.6, -3.2, 0], [57, 71, -3.2, 0.8]],
  walls:[[-2.2, -1, 0, 7], [69.4, 71, 0.8, 9], [38.6, 57, -4.4, -3.2]],   // левый край, стена в конце, дно реки
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
  pipa:67.6
};
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
  grBox(-4, 74, 9.2, 13, GR_MAT.deep, 4);
  for(let x = -2; x < 72; x += 2.4 + R()*1.6){
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
  for(const s of [G.ledge, G.shelf]){ grBox(s[0], s[1], s[2], s[3], RS_MAT.ice); grBox(s[0] + 0.02, s[1] - 0.02, s[3] - 0.02, s[3] + 0.1, RS_MAT.snow, 1.14); }
  // подземная река
  const [wx0, wx1] = G.water, wm = new THREE.Mesh(new THREE.BoxGeometry(wx1 - wx0, RS_WS + 3.2, 2.4), GR_WATER);
  wm.position.copy(rsAt((wx0 + wx1)/2, (RS_WS - 3.2)/2)); wm.renderOrder = 2; grRoot.add(wm);
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
  if(!(GRW.rope.tied || rsBoth().some(s => s.hold && s !== p))) return false;   // отпустили — соскальзывает
  p.x += (GR.rope.cx - p.x)*Math.min(1, dt*10); p.vx = p.vy = 0; p.air = false; p.face = 1;
  p.y += 1.7*dt;
  if(Math.random() < dt*4) sfx.tick();
  if(p.y >= GR.rope.top){ p.y = GR.rope.top; p.x = GR.rope.cx + 1; p.climb = false; p.inv = 0.3; grTie(); }
  return true;
}
function grAct(me){
  if(me.climb) return null;
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
}
// течение в реке тянет к плоту (нырнул — не мешает)
function grFlow(p){ if(p.dive) return 0; const c = GRW.raft.x + GR.raft.w/2; return Math.max(-1.6, Math.min(1.6, (c - p.x)*1.2)); }
// вынырнул у плота — сам запрыгивает обратно
function grPre(){
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
  s.root.position.copy(rsAt(P.x, P.y));
  s.root.rotation.y += (P.face*0.9 - s.root.rotation.y)*Math.min(1, dt*6);
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
async function grFree(remote){
  if(Q.cage) return;
  Q.cage = true; Q.st = 'end';
  if(!remote && Q.mode === 'net') netSend({t:'qfree'});
  const P = Q.pipa, ping = Q.mode === 'ping';
  sfx.good(); sfx.sparkle(); mgHint(L('Пипа нашлась! 💗', 'Pipa is found! 💗'));
  floatText(L('Ура! Вы меня нашли!', 'Yay! You found me!'), rsAt(P.x, P.y + 1.3), '#D9527E');
  burst(TEX.heart, rsAt(P.x, P.y + 0.6), 14, 2, 0.3);
  // тюлени спускаются и встают для фото, Пипа спрыгивает к ним
  Q.photoX = 63.2;
  for(const p of [Q.me, Q.pal]) if(p && rsLocal(p) && !p.gone){ p.auto = p.role === 'jump' ? 64.5 : 61.8; p.hold = false; if(p.bub) rsRevive(p); }
  await wait(1.2); if(!Q) return;
  const x0 = P.x, y0 = P.y;
  P.face = -1; sfx.whoosh();
  await tween(0.9, k => { P.x = x0 + (63.2 - x0)*k; P.y = y0 + (0.8 - y0)*k + Math.sin(k*Math.PI)*1.2; }, t => t);
  if(!Q) return;
  sfx.thud(); burst(TEX.puff, rsAt(P.x, 0.9, 0.4), 8, 1.3, 0.3); P.face = 1;
  floatText(ping ? L('Пинг! Братик!', 'Ping! My brother!') : L('Спасибо! 💗', 'Thank you! 💗'), rsAt(P.x, 2.4), '#D9527E');
  if(ping && Q.pal) floatText(L('Сестрёнка! Кря!', 'Little sister! Quack!'), rsAt(Q.pal.x, Q.pal.y + 1.7), '#3E8DB8');
  await wait(1.3); if(!Q) return;
  // «дай пять!»
  const a = Q.me, b = Q.pal && !Q.pal.gone ? Q.pal : null;
  const hx = b ? (a.x + b.x)/2 : a.x;
  floatText(L('Дай пять! ✋', 'High five! ✋'), rsAt(hx, 2.9), '#D9527E');
  burst(TEX.star, rsAt(hx, 1.8), 16, 2.4, 0.3); sfx.hug();
  for(const p of [a, b]) if(p){ p.m.flap = 1; setMood(p.m, 'happy'); }
  await wait(2.2); if(!Q) return;
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
function grAI(p, dt){ return p.role === 'jump' ? grAIJ(p) : grAIS(p); }
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

/* ---------- подсказки ---------- */
function grSec(p){
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
  netOn('qball', m => { if(Q && Q.L.id === 'grot' && !GRW.balls.some(b => b.id === m.id)) grBall(m.id); });
  netOn('qbx', m => { if(!Q || Q.L.id !== 'grot') return; const i = GRW.balls.findIndex(b => b.id === m.id); if(i >= 0) grBallGone(i, false); });
  netOn('qraft', () => { if(Q && Q.L.id === 'grot') grRaftGo(true); });
  netOn('qrope', () => { if(Q && Q.L.id === 'grot') grTie(true); });
  netOn('qfree', () => { if(Q && Q.L.id === 'grot') grFree(true); });
}

RS_LVS.grot = {id:'grot', ic:'🕯️', name:() => L('Грот', 'Grotto'),
  say:() => L('Пингвинёнок Пипа потерялась в гроте: верёвка, снежные комы, плот по реке — и высокая полка.', 'Pipa the penguin chick is lost in the grotto: a rope, rolling snowballs, a raft on the river — and a high shelf.'),
  root:grRoot, ground:GR.ground, walls:GR.walls, more:[GR.ledge, [...GR.shelf, 'shelf']], water:GR.water, stack:true,
  pearls:GR.pearls, pearlO:null,
  W:() => GRW, build:grBuild, reset:grReset, solids(out){ out.push(GRW.gate.s, GRW.raft.s); }, world:grWorld, pre:grPre,
  lever(){ wait(0.4).then(() => { if(Q) floatText(L('Жёлоб закрыт, дверь открыта!', 'The chute is shut, the door is open!'), rsAt(GR.gate.x0, 6.2), '#3E8DB8'); }); },
  flow:grFlow, climb:grClimb, act:grAct, doAct:grDoAct,
  ai:grAI, sec:grSec, hint:grHint, step:grStep, stuck:grStuck, wire:grWire,
  setup:grSetup, clean(){ if(Q.pipa) grRoot.remove(Q.pipa.s.root); for(const b of GRW.balls) grRoot.remove(b.o); GRW.balls.length = 0; },
  endX:63.2, photoY:1.35,
  photo:() => L('Пипа нашлась в гроте', 'Pipa found in the grotto'),
  endTtl:() => L('Пипа нашлась! 💗', 'Pipa is found! 💗'),
  endSay:() => Q && Q.mode === 'ping' ? L('Пинг обнимает сестрёнку — спасибо вам! 🐧', 'Ping hugs his little sister — thank you! 🐧') : L('Пингвинёнок снова не одна — и всё благодаря вам 🐧', 'The penguin chick is safe — all thanks to you 🐧')
};
