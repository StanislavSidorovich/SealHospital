/* ---------------- «Спасаем потеряшку», уровень 6: «Праздник мам» (Спринт 5, задача 4) ----------------
   Мамы всех потеряшек устраивают праздник в честь спасателей, но ветер разнёс украшения. Собираем праздник вдвоём:
     🎈 три шарика улетели высоко: Прыгун — двойным прыжком, самый высокий — с головы Силача;
     🎂 торт на санках: везёт Силач (🛷); мост через трещину поднят — Прыгун запрыгивает на полку и тянет рычаг;
     🏮 гирлянда: встаньте у двух столбиков и держите концы 🏮 вместе — повиснет и загорится.
   Всё готово — гости кричат «Ура!», и тут с сугроба прыгает 🐻‍❄️ белый медведь, рычит и утаскивает торт!
   Мини-босс (проиграть нельзя): медведь пятится в три шага и кидается снежками — катящиеся разбиваются о Силача
   (Прыгун перепрыгивает или прячется за ним), а большие летят дугой — где упадут, видно по тени, отойди.
   Подойдите к нему оба — он рычит и отступает дальше. У сугроба деваться некуда — медведь садится и плачет:
   в лапе ледяная заноза! Тянем вместе ✋ (Пинг и папа по сети тоже тянут) → медведь-друг возвращает торт и остаётся.
   3 жемчужинки 🦪: за шариками (Прыгун), на дне трещины (Силач ныряет), над столбиком гирлянды (Прыгун).
   Физика, пузыри, кнопки, сеть и итоги — общие, в rescue.js; тут только сам уровень (RS_LVS.fest).
   Сеть: шарик — qfbal, санки — qsled (ведёт тот, кто везёт), гирлянда — qgar, медведь (ведёт хозяин) — qbear,
   снежки — qfeb/qfebx, тянем занозу — qfep, заноза вышла — qfeout. Подключается после kelpforest.js. */
const FE = {
  ground:[[-3, 26, -3.2, 0], [28, 71, -3.2, 0]],
  walls:[[-2.2, -1, 0, 8], [26, 28, -4.4, -3.2], [64, 65, 0, 3], [70, 71, 0, 8]],   // левый край, дно трещины, сугроб, край
  shelf:[22.4, 24.4, 1.7, 2.0],                                 // полка с рычагом моста (Прыгун)
  water:[26, 28],
  bridge:{x0:25.9, x1:28.1, y0:-0.25, y1:0},
  lever:{x:23.4, y:2.0},
  balloons:[{x:6, y:2.6, c:0xFF9BB8}, {x:9.2, y:2.9, c:0xFFD66B}, {x:12.8, y:3.9, c:0x9BD6F5}],
  spot:12.8,                                                    // где встать Силачу под самым высоким шариком
  sled:{x:18.5, stop:25.2, park:50.5},
  posts:[35, 43],
  table:56.5,
  rounds:[54.5, 58, 61.8],                                      // где стоит медведь; последний — у сугроба
  pearls:[{x:15.8, y:2.7}, {x:27, y:-2.8}, {x:43, y:3.5}]
};
const FE_BALL = {r:0.3, v:3, roll:1.9, arc:2.5, fly:1.1};       // снежки: радиус, скорость, как часто, сколько летит дуга
const FE_PULL = 14, FE_PULL_SOLO = 9;                          // сколько раз потянуть занозу (вдвоём / одной)

/* ---------- постройка ---------- */
const feRoot = new THREE.Group(); feRoot.visible = false; scene.add(feRoot);
const FE_MAT = {white:toon(0xFFFFFF), cream:toon(0xF3EEE4), pink:toon(0xFFC2D6), cake:toon(0xFFE0B8), icing:toon(0xFF9BB8),
  berry:toon(0xE0445F), sled:toon(0xE07A5F), shadow:new THREE.MeshBasicMaterial({color:0x6B7FA6, transparent:true, opacity:0.35, depthWrite:false})};
const FEW = {};
let feBuilt = false;
function feBox(x0, x1, y0, y1, mat, zd = 1.1){ return rsBox(x0, x1, y0, y1, mat, zd, feRoot); }
function feBalloon(col){
  const g = new THREE.Group();
  const b = addOutline(new THREE.Mesh(SMALL, toon(col)), 1.08); b.scale.set(0.3, 0.36, 0.3); g.add(b);
  const hi = new THREE.Mesh(SMALL, whiteMat); hi.scale.setScalar(0.06); hi.position.set(-0.1, 0.12, 0.25); g.add(hi);
  const s = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 4), inkMat); s.position.y = -0.8; g.add(s);
  return g;
}
function feCake(){
  const g = new THREE.Group();
  const a = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.36, 20), FE_MAT.cake), 1.06); a.position.y = 0.18; g.add(a);
  const b = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.3, 20), FE_MAT.icing), 1.07); b.position.y = 0.51; g.add(b);
  for(let i = 0; i < 6; i++){ const r = new THREE.Mesh(SMALL, FE_MAT.berry); r.scale.setScalar(0.06); r.position.set(Math.cos(i)*0.4, 0.38, Math.sin(i)*0.4); g.add(r); }
  const c = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 8), toon(0xFFFDF8)), 1.2); c.position.y = 0.77; g.add(c);
  const f = glow(0xFFD66B, 0.45); f.position.y = 0.95; g.add(f);
  return g;
}
function feBearMake(){   // белый медведь: круглый, с румянцем; брови — сердитые, потом грустные и весёлые
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  const body = addOutline(new THREE.Mesh(SPH, FE_MAT.white), 1.04); body.scale.set(0.95, 0.9, 0.8); body.position.y = 0.95; inner.add(body);
  const belly = new THREE.Mesh(SPH, FE_MAT.cream); belly.scale.set(0.6, 0.6, 0.3); belly.position.set(0, 0.85, 0.58); inner.add(belly);
  for(const sd of [-1, 1]){ const f = addOutline(new THREE.Mesh(SMALL, FE_MAT.white), 1.08); f.scale.set(0.3, 0.2, 0.36); f.position.set(sd*0.45, 0.12, 0.3); inner.add(f); }
  const head = new THREE.Group(); head.position.set(0, 1.95, 0.15); inner.add(head);
  const h = addOutline(new THREE.Mesh(SPH, FE_MAT.white), 1.05); h.scale.set(0.6, 0.52, 0.52); head.add(h);
  for(const sd of [-1, 1]){
    const e = addOutline(new THREE.Mesh(SMALL, FE_MAT.white), 1.1); e.scale.setScalar(0.18); e.position.set(sd*0.4, 0.42, -0.05); head.add(e);
    const ei = new THREE.Mesh(SMALL, FE_MAT.pink); ei.scale.set(0.1, 0.1, 0.05); ei.position.set(sd*0.4, 0.42, 0.1); head.add(ei);
    const eye = new THREE.Mesh(SMALL, inkMat); eye.scale.setScalar(0.06); eye.position.set(sd*0.2, 0.08, 0.47); head.add(eye);
    const hl = new THREE.Mesh(SMALL, whiteMat); hl.scale.setScalar(0.022); hl.position.set(sd*0.2 + 0.02, 0.11, 0.52); head.add(hl);
    const bl = new THREE.Mesh(SMALL, new THREE.MeshBasicMaterial({color:0xFFB3C7})); bl.scale.set(0.09, 0.05, 0.02); bl.position.set(sd*0.34, -0.08, 0.44); head.add(bl);
  }
  const mz = new THREE.Mesh(SMALL, FE_MAT.cream); mz.scale.set(0.24, 0.17, 0.14); mz.position.set(0, -0.12, 0.44); head.add(mz);
  const nose = new THREE.Mesh(SMALL, inkMat); nose.scale.set(0.08, 0.055, 0.05); nose.position.set(0, -0.05, 0.57); head.add(nose);
  const brows = [-1, 1].map(sd => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.03), inkMat); b.position.set(sd*0.2, 0.2, 0.5); head.add(b); return b; });
  // лапа с ледяной занозой (поднимает её, когда плачет)
  const paw = new THREE.Group(); paw.position.set(0.62, 1.05, 0.25); inner.add(paw);
  const pw = addOutline(new THREE.Mesh(SMALL, FE_MAT.white), 1.08); pw.scale.set(0.24, 0.3, 0.24); paw.add(pw);
  const pad = new THREE.Mesh(SMALL, FE_MAT.pink); pad.scale.set(0.13, 0.13, 0.05); pad.position.set(0, 0.05, 0.22); paw.add(pad);
  const shard = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.34, 6), RS_MAT.bar), 1.15); shard.position.set(0, 0.08, 0.3); shard.rotation.x = Math.PI/2; paw.add(shard);
  const other = addOutline(new THREE.Mesh(SMALL, FE_MAT.white), 1.08); other.scale.set(0.22, 0.28, 0.22); other.position.set(-0.62, 0.95, 0.25); inner.add(other);
  g.userData = {inner, head, brows, paw, shard};
  return g;
}
function feBrows(mood){   // 'mad' — брови домиком вниз, 'sad' — вверх, 'ok' — ровно
  const b = FEW.bear.userData.brows, a = mood === 'mad' ? 0.45 : mood === 'sad' ? -0.45 : 0;
  b[0].rotation.z = -a; b[1].rotation.z = a;
  b.forEach(o => o.visible = mood !== 'ok');
}
function feBuild(){
  if(feBuilt) return; feBuilt = true;
  const F = FE, R = rsRand(29);
  // даль: море, льдинки, праздничный флажок
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(240, 60), toon(0x6FC0DF)); sea.position.copy(rsAt(30, RS_WS - 30, -6)); feRoot.add(sea);
  const far = new THREE.Mesh(new THREE.PlaneGeometry(240, 80), toon(0x8FD0EA)); far.rotation.x = -Math.PI/2; far.position.copy(rsAt(30, RS_WS - 0.02, -46)); feRoot.add(far);
  for(const [x, z, s] of [[-5, -28, 2], [9, -34, 2.8], [24, -27, 2.2], [38, -36, 3], [52, -29, 2.4], [68, -33, 2.8]]){
    const b = addOutline(new THREE.Mesh(new THREE.ConeGeometry(s, s*1.3, 6), toon(0xF3FAFD)), 1.03); b.position.copy(rsAt(x, s*0.4, z)); feRoot.add(b);
  }
  for(const g of F.ground){ feBox(g[0], g[1], g[2], g[3], RS_MAT.ice); feBox(g[0] + 0.02, g[1] - 0.02, g[3] - 0.02, g[3] + 0.1, RS_MAT.snow, 1.14); }
  for(const w of F.walls) feBox(w[0], w[1], w[2], w[3], w[3] <= 3 && w[2] >= 0 ? RS_MAT.snow : RS_MAT.cliff);
  const sh = F.shelf; feBox(sh[0], sh[1], sh[2], sh[3], RS_MAT.ice); feBox(sh[0] + 0.02, sh[1] - 0.02, sh[3] - 0.02, sh[3] + 0.1, RS_MAT.snow, 1.14);
  feBox(sh[0] + 0.8, sh[0] + 1.1, 0, sh[2], RS_MAT.wood, 0.14);   // столбик под полкой
  // вода в трещине
  const [wx0, wx1] = F.water, wm = new THREE.Mesh(new THREE.BoxGeometry(wx1 - wx0, RS_WS + 3.2, 2.4), RS_WATER);
  wm.position.copy(rsAt((wx0 + wx1)/2, (RS_WS - 3.2)/2)); wm.renderOrder = 2; feRoot.add(wm);
  // подъёмный мост: доска на петле у того берега
  const hinge = new THREE.Group(); hinge.position.copy(rsAt(F.bridge.x1, 0, 0)); feRoot.add(hinge);
  const plank = addOutline(new THREE.Mesh(new THREE.BoxGeometry(F.bridge.x1 - F.bridge.x0, 0.22, 1.6), RS_MAT.wood), 1.03); plank.position.x = -(F.bridge.x1 - F.bridge.x0)/2; hinge.add(plank);
  FEW.bridge = {hinge, k:0, s:{...F.bridge, k:'bridge'}};
  FEW.levers = [rsLeverObj(F.lever, feRoot)];
  // шарики
  FEW.balloons = F.balloons.map(b => { const o = feBalloon(b.c); feRoot.add(o); return {...b, o, got:false}; });
  // санки с тортом
  const sled = new THREE.Group(); feRoot.add(sled);
  const base = addOutline(new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.14, 0.9), FE_MAT.sled), 1.05); base.position.y = 0.2; sled.add(base);
  for(const z of [-0.36, 0.36]){ const r = addOutline(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 0.06), RS_MAT.wood), 1.1); r.position.set(0.05, 0.04, z); sled.add(r); }
  const cake = feCake(); cake.position.y = 0.28; sled.add(cake);
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 5), inkMat); rope.rotation.z = Math.PI/2; feRoot.add(rope);
  FEW.sled = {o:sled, cake, rope, x:F.sled.x, by:null, park:false};
  // гирлянда: два столбика и фонарики — лежат на льду, повесят — загорятся
  for(const x of F.posts){ feBox(x - 0.08, x + 0.08, 0, 2.7, RS_MAT.wood, 0.1); const t = addOutline(new THREE.Mesh(SMALL, RS_MAT.lever), 1.1); t.scale.setScalar(0.13); t.position.copy(rsAt(x, 2.78, 0)); feRoot.add(t); }
  const cols = [0xFF9BB8, 0xFFD66B, 0x9BD6F5, 0x9BE3B5];
  FEW.lamps = [];
  for(let i = 0; i < 11; i++){
    const o = addOutline(new THREE.Mesh(SMALL, toon(cols[i % 4])), 1.1); o.scale.set(0.13, 0.17, 0.13); feRoot.add(o);
    const gl = glow(cols[i % 4], 0.8); gl.visible = false; o.add(gl);
    FEW.lamps.push({o, gl, k:i/10});
  }
  FEW.garland = {k:0, hung:false, t:0};
  // праздничная полянка: стол, флажки на верёвке, гости
  const tb = new THREE.Group(); tb.position.copy(rsAt(F.table, 0, -0.7)); feRoot.add(tb);
  const top = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.1, 24), toon(0xFFFDF8)), 1.05); top.position.y = 0.62; tb.add(top);
  const leg = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.6, 10), RS_MAT.wood), 1.1); leg.position.y = 0.3; tb.add(leg);
  FEW.tableTop = 0.67;
  for(let x = 49; x < 63.5; x += 0.7){ const f = new THREE.Mesh(new THREE.CircleGeometry(0.18, 3), new THREE.MeshBasicMaterial({color:cols[Math.floor(x*1.43) % 4], side:THREE.DoubleSide})); f.position.copy(rsAt(x, 3.6 - Math.sin((x - 49)/14.5*Math.PI)*0.4, -2.2)); f.rotation.z = -Math.PI/2; feRoot.add(f); }
  // тени снежков-дуг
  FEW.balls = []; FEW.ballId = 0;
  FEW.bear = feBearMake(); feRoot.add(FEW.bear);
  RS_LVS.fest.pearlO = rsPearlsBuild(RS_LVS.fest);
}
function feReset(){
  const W = FEW;
  W.bridge.k = 0; W.levers[0].on = false; W.levers[0].arm.rotation.z = 0.7;
  for(const b of W.balloons){ b.got = false; b.o.visible = true; b.o.position.copy(rsAt(b.x, b.y)); b.o.scale.setScalar(1); }
  Object.assign(W.sled, {x:FE.sled.x, by:null, park:false, sent:0, t:0}); W.sled.cake.position.set(0, 0.28, 0); W.sled.o.add(W.sled.cake);
  Object.assign(W.garland, {k:0, hung:false, t:0});
  for(const l of W.lamps) l.gl.visible = false;
  for(const b of W.balls){ feRoot.remove(b.o); if(b.sh) feRoot.remove(b.sh); }
  W.balls.length = 0;
  W.bear.visible = false; W.bear.userData.shard.visible = true; feBrows('mad');
  W.phase = 'prep'; W.round = 0; W.pulls = 0; W.rollT = 1.2; W.arcT = 2; W.nearT = 0;
  feSync();
}
function feSync(){
  const B = FEW.bridge; B.hinge.rotation.z = -(1 - B.k)*Math.PI/2*0.96;   // поднят — стоит торчком у того берега
  const S = FEW.sled;
  S.o.position.copy(rsAt(S.x, 0, 0.35));
  const G = FEW.garland, [a, b] = FE.posts;
  for(const l of FEW.lamps){
    const x = a + (b - a)*l.k, hang = 2.55 - Math.sin(l.k*Math.PI)*0.55, low = 0.14 + Math.sin(l.k*Math.PI*5)*0.03;
    l.o.position.copy(rsAt(x, low + (hang - low)*G.k, G.k > 0.5 ? 0 : 0.5));
  }
}

/* ---------- мир ---------- */
const feNear = (p, x, r = 0.8) => p && !p.gone && !p.bub && Math.abs(p.x - x) < r && p.y < 0.3 && (p.kind === 'net' ? p.ng : !p.air);
function feWorld(dt){
  const W = FEW, S = W.sled;
  W.bridge.k = Math.min(W.levers[0].on ? 1 : 0, W.bridge.k + dt*1.2);
  // шарики: качаются; коснулся — полетел на праздник
  W.balloons.forEach((b, i) => {
    if(b.got) return;
    b.o.position.copy(rsAt(b.x + Math.sin(now*1.3 + i)*0.08, b.y + Math.sin(now*2 + i*2)*0.08, 0.2));
    if(Q.st !== 'go') return;
    for(const p of [Q.me, Q.pal]) if(p && rsLocal(p) && !p.gone && !p.bub && Math.abs(p.x - b.x) < RS_HW + 0.3 && b.y > p.y - 0.3 && b.y < p.y + RS_H + 0.2){ feBal(i); break; }
  });
  // санки: едут за Силачом на верёвке; мост поднят — дальше трещины не проедут
  if(S.by && !S.park){
    const p = S.by, want = p.x - 1.35;
    if(rsLocal(p)){
      const lim = W.bridge.k > 0.95 ? 99 : FE.sled.stop;
      if(want > S.x) S.x = Math.min(want, lim);
      if(p.x - S.x > 4.2 || p.bub){ feSledOff(p); }
      else if(S.x >= FE.sled.park) feSledPark();
      if(Q.mode === 'net' && Math.abs(S.x - (S.sent || 0)) > 0.01 && (S.t -= dt) <= 0){ S.t = 0.08; S.sent = S.x; netSend({t:'qsled', x:+S.x.toFixed(2)}); }
    }
    const rx = S.x + 0.7, dx = p.x - 0.3 - rx; W.sled.rope.visible = S.by && dx > 0.1;
    W.sled.rope.scale.y = Math.max(0.01, dx); W.sled.rope.position.copy(rsAt(rx + dx/2, 0.35, 0.35));
  } else W.sled.rope.visible = false;
  // гирлянда: держат оба конца — повисла
  const G = W.garland;
  if(!G.hung){
    const held = FE.posts.map(x => rsBoth().some(s => s.hold && feNear(s, x)));
    G.t = held[0] && held[1] ? G.t + dt : 0;
    if(G.t > 0.4) feGarland();
  } else if(G.k < 1) G.k = Math.min(1, G.k + dt*1.6);
  if(G.hung) for(const l of W.lamps) l.gl.material.opacity = 0.7 + Math.sin(now*4 + l.k*9)*0.3;
  // всё готово — праздник (и медведь)
  if(W.phase === 'prep' && Q.st === 'go' && W.balloons.every(b => b.got) && S.park && G.hung) feParty();
  if(W.phase === 'bear' || W.phase === 'pull') feBearStep(dt);
  feBalls(dt);
  feSync();
}
function feSolids(out){ if(FEW.bridge.k > 0.95) out.push(FEW.bridge.s); }
function feBal(i, remote){
  const b = FEW.balloons[i]; if(!b || b.got) return;
  b.got = true; sfx.pop(); sfx.coin();
  if(!remote && Q.mode === 'net') netSend({t:'qfbal', i});
  const n = FEW.balloons.filter(o => o.got).length;
  floatText(`🎈 ${n}/3`, rsAt(b.x, b.y + 0.7), '#D9527E');
  burst(TEX.star, rsAt(b.x, b.y), 8, 1.4, 0.22);
  const from = b.o.position.clone(), to = rsAt(FE.table - 1.6 + i*0.5, 3.1 + i*0.25, -0.9);
  tween(1.8, k => { b.o.position.lerpVectors(from, to, k); b.o.position.y += Math.sin(k*Math.PI)*2; }, ease.io);
  if(Q) Q.hintT = 0;
}
function feSledOn(p, remote){
  const S = FEW.sled; if(S.park || S.by === p) return;
  if(p.role !== 'strong'){ if(p === Q.me && now - (Q.heavyT || 0) > 2){ Q.heavyT = now; floatText(L('Тяжело! Это для Силача 💪', 'Too heavy! That\'s for the strong one 💪'), rsAt(p.x, p.y + 1.4)); } return; }
  S.by = p; sfx.tick();
  floatText(L('Поехали! 🛷', 'Off we go! 🛷'), rsAt(p.x, p.y + 1.4), '#2F9E72');
  if(!remote && Q.mode === 'net') netSend({t:'qsled', on:1});
  if(p === Q.me) Q.hintT = 0;
}
function feSledOff(p){
  const S = FEW.sled; S.by = null;
  if(p === Q.me || p.kind === 'ai') floatText(L('Ой, верёвка выскользнула!', 'Oops, the rope slipped!'), rsAt(p.x, p.y + 1.4), '#6B6A7E');
  if(Q.mode === 'net') netSend({t:'qsled', on:0, x:+S.x.toFixed(2)});
}
function feSledPark(remote){
  const S = FEW.sled; if(S.park) return;
  S.park = true; S.by = null; sfx.good();
  if(!remote && Q.mode === 'net') netSend({t:'qsled', park:1});
  floatText(L('Торт приехал! 🎂', 'The cake is here! 🎂'), rsAt(S.x, 1.6), '#D9527E');
  // торт — на стол
  const c = S.cake, from = c.getWorldPosition(new V3()), to = rsAt(FE.table, FEW.tableTop, -0.7);
  feRoot.attach(c);
  tween(0.9, k => { c.position.lerpVectors(feRoot.worldToLocal(from.clone()), feRoot.worldToLocal(to.clone()), k); c.position.y += Math.sin(k*Math.PI)*0.8; }, ease.io);
  if(Q) Q.hintT = 0;
}
function feGarland(remote){
  const G = FEW.garland; if(G.hung) return;
  G.hung = true; sfx.good(); sfx.sparkle();
  if(!remote && Q.mode === 'net') netSend({t:'qgar'});
  for(const s of rsBoth()) s.hold = false;
  for(const l of FEW.lamps) l.gl.visible = true;
  floatText(L('Гирлянда горит! 🏮', 'The garland is lit! 🏮'), rsAt((FE.posts[0] + FE.posts[1])/2, 3.2), '#D9527E');
  if(Q) Q.hintT = 0;
}

/* ---------- праздник и медведь ---------- */
async function feParty(){
  const W = FEW; if(W.phase !== 'prep') return;
  W.phase = 'party'; Q.hintT = 0;
  mgHint(L('Всё готово! Праздник! 🎉', 'All set! Party time! 🎉'));
  for(const g of Q.feGuests) g.hop = now + 2;
  floatText(L('Ура! Спасибо, спасатели!', 'Hooray! Thank you, rescuers!'), rsAt(56, 2.8), '#D9527E'); sfx.hug();
  await wait(2.2); if(!Q || W.phase !== 'party') return;
  // с сугроба прыгает медведь и хватает торт
  const B = W.bear; B.visible = true; feBrows('mad'); sfx.gloom();
  await tween(0.9, k => { B.position.copy(rsAt(67 - (67 - 58.8)*k, Math.sin(k*Math.PI)*2.5, 0)); }, t => t);
  if(!Q) return;
  sfx.thud(); burst(TEX.puff, rsAt(58.8, 0.2, 0.5), 14, 2, 0.45);
  floatText(L('Р-р-р! Торт мой!', 'Grrr! The cake is mine!'), rsAt(58.8, 3.4), '#3B3A4A');
  for(const g of Q.feGuests){ g.tz = -2.6; g.tx = 49.5 + (g.tx - 49.5)*0.25; g.scare = true; }
  const c = FEW.sled.cake, from = c.position.clone();
  await tween(0.6, k => { c.position.lerpVectors(from, feRoot.worldToLocal(rsAt(63.2, 0, 0)), k); c.position.y += Math.sin(k*Math.PI)*1.2; }, ease.io);
  if(!Q) return;
  W.phase = 'bear'; W.round = 0; W.bx = 58.8; W.bTo = FE.rounds[0]; W.rollT = 1; W.arcT = 1.8;
  Q.hintT = 0;
}
// медведь пятится к сугробу и кидает снежки; подошли оба — рычит и отступает; у сугроба — садится и плачет
function feBearStep(dt){
  const W = FEW, B = W.bear, host = Q.mode !== 'net' || net.host;
  W.bx += (W.bTo - W.bx)*Math.min(1, dt*3);
  B.position.copy(rsAt(W.bx, 0, 0));
  B.rotation.y += ((W.phase === 'pull' ? -0.35 : -0.75) - B.rotation.y)*Math.min(1, dt*4);
  const inner = B.userData.inner;
  if(W.phase === 'bear'){
    inner.scale.y = 1 + Math.sin(now*3)*0.02;
    if(host && Q.st === 'go'){
      const fast = 1 - W.round*0.15;   // с каждым шагом кидает чуть чаще
      if((W.rollT -= dt) <= 0){ W.rollT = FE_BALL.roll*fast*(0.8 + Math.random()*0.4); feThrow('roll'); }
      if((W.arcT -= dt) <= 0){ W.arcT = FE_BALL.arc*fast*(0.8 + Math.random()*0.4); feThrow('arc'); }
      const need = Q.mode === 'solo' ? [Q.me] : rsBoth();
      const near = need.every(s => !s.bub && s.x > W.bTo - 2.4);
      W.nearT = near ? W.nearT + dt : 0;
      if(W.nearT > 1){ W.nearT = 0;   // постояли рядом под снежками секунду — рычит и отступает
        feRound(W.round + 1); if(Q.mode === 'net') netSend({t:'qbear', r:W.round}); }
    }
  } else {   // плачет, лапа с занозой вперёд
    inner.rotation.z = Math.sin(now*6)*0.03;
    B.userData.paw.position.y = 1.35 + Math.sin(now*5)*0.04;
    B.userData.shard.position.z = 0.3 + (W.pulls/feNeed())*0.25 + Math.sin(now*30)*0.01*(W.pulls > 0 ? 1 : 0);
    if(now > (W.cryT || 0)){ W.cryT = now + 3.5; floatText(L('У-у-у… лапка болит…', 'Boo-hoo… my paw hurts…'), rsAt(W.bx, 3.3), '#6B6A7E'); }
  }
}
const feNeed = () => Q.mode === 'solo' ? FE_PULL_SOLO : FE_PULL;
function feRound(r){
  const W = FEW; if(r <= W.round || W.phase !== 'bear') return;
  W.round = r; sfx.gloom();
  if(r < FE.rounds.length){
    W.bTo = FE.rounds[r];
    floatText([L('Р-р-р! Не подходите!', 'Grrr! Stay back!'), L('Р-Р-Р! Уходите!', 'GRRR! Go away!')][Math.min(1, r - 1)], rsAt(W.bx, 3.4), '#3B3A4A');
    burst(TEX.puff, rsAt(W.bx, 0.3, 0.5), 10, 1.8, 0.4);
    // рык сдувает всех чуть назад — не больно
    for(const p of [Q.me, Q.pal]) if(p && rsLocal(p) && !p.gone && !p.bub && p.x > W.bx - 4){ p.vx = -6; p.vy = 4; p.air = true; p.face = 1; }
    Q.hintT = 0;
    return;
  }
  // деваться некуда: садится, плачет, показывает лапу
  W.phase = 'pull'; W.pulls = 0; feBrows('sad');
  for(const b of W.balls){ feRoot.remove(b.o); if(b.sh) feRoot.remove(b.sh); }
  W.balls.length = 0;
  sfx.bad(); mgHint(L('Ой! Медведь плачет — у него в лапе ледяная заноза! Подойди и тяни ✋', 'Oh! The bear is crying — there\'s an ice splinter in his paw! Walk up and pull ✋'));
  Q.hintT = now + 8;
  floatText(L('Ай-ай… заноза…', 'Ouch… a splinter…'), rsAt(W.bx, 3.3), '#6B6A7E');
}
function feThrow(k, remote, id, tx){
  const W = FEW;
  id = id || ++W.ballId;
  if(k === 'arc' && tx == null){   // целится в тюленя (чуть мимо), тень покажет куда
    const t = rsBoth().filter(s => !s.bub); const s = t[Math.floor(Math.random()*t.length)];
    tx = s ? s.x + (Math.random() - 0.5)*0.8 : W.bx - 4;
  }
  const o = addOutline(new THREE.Mesh(SMALL, FE_MAT.white), 1.08); o.scale.setScalar(FE_BALL.r*(k === 'arc' ? 1.5 : 1)); feRoot.add(o);
  const b = {id, k, o, x:W.bx - 0.9, y:k === 'arc' ? 2.2 : 0, t:0, x0:W.bx - 0.9, tx};
  if(k === 'arc'){ b.sh = new THREE.Mesh(new THREE.CircleGeometry(0.6, 20), FE_MAT.shadow); b.sh.rotation.x = -Math.PI/2; b.sh.position.copy(rsAt(tx, 0.03, 0.3)); feRoot.add(b.sh); }
  W.balls.push(b); sfx.whoosh();
  if(!remote && Q.mode === 'net') netSend({t:'qfeb', id, k, tx:tx != null ? +tx.toFixed(2) : null});
}
function feBallGone(i, send){
  const b = FEW.balls[i]; if(!b) return;
  burst(TEX.puff, rsAt(b.x, b.y + 0.3, 0.4), 8, 1.3, 0.34);
  feRoot.remove(b.o); if(b.sh) feRoot.remove(b.sh); FEW.balls.splice(i, 1);
  if(send && Q.mode === 'net') netSend({t:'qfebx', id:b.id});
}
function feBalls(dt){
  const W = FEW;
  for(let i = W.balls.length - 1; i >= 0; i--){
    const b = W.balls[i];
    let hit = false;
    if(b.k === 'roll'){
      b.x -= FE_BALL.v*dt; b.y = 0;
      b.o.position.copy(rsAt(b.x, FE_BALL.r, 0.1)); b.o.rotation.z += FE_BALL.v*dt/FE_BALL.r;
      hit = b.x < 48.5;
      for(const s of rsBoth()){
        if(hit || s.bub || Math.abs(s.x - b.x) > RS_HW + FE_BALL.r*0.8 || s.y > FE_BALL.r*2 - 0.05) continue;
        if(s.role === 'strong'){ hit = true; if(rsLocal(s)){ sfx.thud(); floatText(L('Бум! 💪', 'Boom! 💪'), rsAt(s.x, s.y + 1.4), '#3E8DB8'); } }
        else if(rsLocal(s) && s.inv <= 0){ hit = true; rsBubble(s); }
      }
    } else {
      b.t += dt; const k = Math.min(1, b.t/FE_BALL.fly);
      b.x = b.x0 + (b.tx - b.x0)*k; b.y = 2.2*(1 - k) + Math.sin(k*Math.PI)*2.4;
      b.o.position.copy(rsAt(b.x, b.y + FE_BALL.r, 0.2));
      b.sh.scale.setScalar(0.4 + k*0.6); b.sh.material.opacity = 0.2 + k*0.25;
      if(k >= 1){
        hit = true; sfx.plop();
        for(const s of [Q.me, Q.pal]) if(s && rsLocal(s) && !s.gone && !s.bub && s.inv <= 0 && Math.abs(s.x - b.tx) < 0.75 && s.y < 1) rsBubble(s);
      }
    }
    if(hit) feBallGone(i, b.k === 'roll');
  }
}
function fePull(p, remote){
  const W = FEW; if(W.phase !== 'pull' || W.pulls >= feNeed()) return;
  W.pulls++;
  if(!remote && Q.mode === 'net') netSend({t:'qfep'});
  sfx.tick(); burst(TEX.star, rsAt(W.bx + 0.5, 1.4, 0.8), 4, 1, 0.18);
  if(p === Q.me || remote){ mgHint(`${L('Тянем!', 'Pull!')} ✋ ${'●'.repeat(Math.round(W.pulls/feNeed()*7))}${'○'.repeat(7 - Math.round(W.pulls/feNeed()*7))}`); Q.hintT = now + 4; }
  if(W.pulls >= feNeed()) feOut();
}
async function feOut(remote){
  const W = FEW; if(W.phase !== 'pull') return;
  W.phase = 'done'; Q.cage = true; Q.st = 'end'; if(Q.actB) Q.actB.hidden = true;
  if(!remote && Q.mode === 'net') netSend({t:'qfeout'});
  const B = W.bear, sh = B.userData.shard, from = sh.position.clone();
  sfx.pop(); sfx.good();
  tween(0.6, k => { sh.position.set(from.x, from.y + k*0.8, from.z + k*0.6); sh.rotation.z = k*4; }, ease.out).then(() => { sh.visible = false; });
  burst(TEX.star, rsAt(W.bx + 0.6, 1.6, 0.8), 14, 2, 0.26);
  mgHint(L('Заноза вышла! 💗', 'The splinter is out! 💗'));
  await wait(0.8); if(!Q) return;
  feBrows('ok'); B.userData.paw.position.y = 1.05;
  floatText(L('Ой, не болит! Простите, я рычал от боли…', 'Oh, it doesn\'t hurt! Sorry, I growled because it hurt…'), rsAt(W.bx, 3.4), '#D9527E');
  burst(TEX.heart, rsAt(W.bx, 2.4), 12, 2, 0.3); sfx.purr();
  await wait(1.6); if(!Q) return;
  // медведь возвращает торт на стол, гости выходят
  const c = FEW.sled.cake, c0 = c.position.clone(), c1 = feRoot.worldToLocal(rsAt(FE.table, FEW.tableTop, -0.7));
  W.bTo = FE.table + 2.2;
  await tween(1.1, k => { c.position.lerpVectors(c0, c1, k); c.position.y += Math.sin(k*Math.PI)*1.4; }, ease.io);
  if(!Q) return;
  for(const g of Q.feGuests){ g.tz = g.z0; g.tx = g.x0; g.scare = false; g.hop = now + 3; }
  floatText(L('Медведь — тоже гость! 🐻‍❄️', 'The bear is a guest too! 🐻‍❄️'), rsAt(FE.table, 3.2), '#D9527E');
  sfx.hug();
  Q.photoX = FE.table - 1.2;
  for(const p of [Q.me, Q.pal]) if(p && rsLocal(p) && !p.gone){ p.auto = p.role === 'jump' ? FE.table - 1.6 : FE.table - 2.8; p.hold = false; if(p.bub) rsRevive(p); }
  for(let i = 0; i < 6; i++) wait(0.3*i).then(() => { if(Q) burst([TEX.star, TEX.heart][i % 2], rsAt(FE.table - 3 + i*1.2, 2.5 + Math.random(), 0.5), 12, 2.2, 0.3); });
  await wait(2); if(!Q) return;
  for(const p of [Q.me, Q.pal]) if(p && !p.gone){ p.m.flap = 1; setMood(p.m, 'happy'); }
  floatText(L('Спасибо, спасатели! 💗', 'Thank you, rescuers! 💗'), rsAt(FE.table, 3.8), '#D9527E');
  await wait(2.2); if(!Q) return;
  Q.end = 'win';
}

/* ---------- гости: все спасённые мамы и малыши ---------- */
function feSetup(){
  const G = [], add = (s, x, y = 0, z = -1.3) => { feRoot.add(s.root || s); G.push({s, x0:x, x, tx:x, z0:z, z, tz:z, y, hop:0, scare:false}); };
  const seal = (c, sc, scarf) => rsSealLook({c}, scarf, sc);
  const peng = (c, sc, col) => { const s = makePenguin({name:'', f:true, color:c}); setScarf(s, col, 'dots'); s.scarf.visible = true; s.scarf.scale.setScalar(1); s.root.scale.setScalar(sc); return s; };
  add(seal(0xB0BBCB, 0.5, '#FF7A9C'), 51.6); add(seal(0xB0BBCB, 0.28, '#FF7A9C'), 52.6, 0, -0.8);   // из Бухты
  add(peng(0x46557A, RS_SC*1.2, '#FFB547'), 58.6); add(peng(0x5C6FA6, RS_SC*0.62, '#FF7A9C'), 59.4, 0, -0.8);   // Пипа и мама
  add(seal(0xE3E9F2, 0.5, '#FFD66B'), 61.2); add(seal(0xFFFFFF, 0.28, '#FFD66B'), 62, 0, -0.8);   // Лучик и мама
  const om = DV_MAKE.otter(); om.scale.setScalar(1.3); add(om, 54, 0.15, -2); const op = DV_MAKE.otter(); op.scale.setScalar(0.75); add(op, 54, 0.45, -2);   // Пуговка на маме
  for(const g of G) if(g.s.root) g.s.root.rotation.y = -0.35;
  Q.feGuests = G;
  Q.fam = null;
}
function feStep(dt, go){
  for(const g of Q.feGuests){
    g.x += (g.tx - g.x)*Math.min(1, dt*2); g.z += (g.tz - g.z)*Math.min(1, dt*2);
    const hop = g.hop > now ? Math.abs(Math.sin(now*8 + g.x0))*0.2 : 0, sh = g.scare ? Math.sin(now*30 + g.x0)*0.02 : 0;
    const o = g.s.root || g.s;
    o.position.copy(rsAt(g.x + sh, g.y + hop, g.z));
    if(g.s.root){ g.s.flap = hop ? 1 : 0; updateSeal(g.s, now + g.x0, dt); }
  }
  const me = Q.me;
  if(go && me.x > 46.5 && FEW.phase === 'prep' && now > (Q.feAskT || 0)){
    Q.feAskT = now + 7;
    const miss = feMissing();
    if(miss) floatText(L(`Ещё нужно: ${miss}`, `Still needed: ${miss}`), rsAt(55, 2.6), '#6B6A7E');
  }
}
const feMissing = () => [FEW.balloons.every(b => b.got) ? '' : '🎈', FEW.sled.park ? '' : '🎂', FEW.garland.hung ? '' : '🏮'].join(' ').trim();
const fePearlDone = i => Q.pearl[i] || (rsResc().pearls.fest || []).includes(i);
function fePre(){
  for(const p of [Q.me, Q.pal]){   // из трещины сам выпрыгивает на берег, если плывёт к нему
    if(!p || !rsLocal(p) || p.gone || p.bub) continue;
    if(p.inW && !p.dive && p.vy <= 0.5 && p.y > RS_FLOAT - 0.25 && p.jq <= 0 && ((p.x > FE.water[1] - 0.8 && p.face > 0) || (p.x < FE.water[0] + 0.8 && p.face < 0)) && (Math.abs(p.vx) > 0.3 || now - (p.wallT || 0) < 0.2)) p.jq = 0.15;
  }
}
function feAct(me){
  if(me.bub || me.air) return null;
  const W = FEW, S = W.sled;
  if(W.phase === 'pull' && Math.abs(me.x - W.bx) < 2) return {k:'pull', ic:'✋', aria:L('Тянуть занозу', 'Pull the splinter')};
  if(W.phase !== 'prep') return null;
  if(!W.garland.hung && FE.posts.some(x => feNear(me, x))) return {k:'hold', ic:'🏮', aria:L('Держать гирлянду', 'Hold the garland')};
  if(!S.park && S.by !== me && me.role === 'strong' && Math.abs(me.x - (S.x + 0.6)) < 1.1 && me.y < 0.3) return {k:'sled', ic:'🛷', aria:L('Везти санки', 'Pull the sled')};
  return null;
}
function feDoAct(p, k){
  if(k === 'pull'){ if(now - (p.pullT || 0) < 0.15) return; p.pullT = now; fePull(p); }
  else if(k === 'sled') feSledOn(p);
  else if(k === 'hold'){
    p.hold = !p.hold; p.face = 1; sfx.tick();
    if(p.hold) floatText(L('Держу! 🏮', 'Holding! 🏮'), rsAt(p.x, p.y + 1.4), '#D9527E');
    if(p === Q.me) Q.hintT = 0;
  }
}
function feLever(){ wait(0.5).then(() => { if(Q) floatText(L('Мост опускается!', 'The bridge is coming down!'), rsAt(27, 1.6), '#3E8DB8'); }); }

/* ---------- Пинг на празднике ---------- */
function feAI(p, dt){
  const o = p.role === 'jump' ? feAIJ(p) : feAIS(p);
  if(p.hold && Math.abs(o.tx - p.x) > 0.4) p.hold = false;
  return o;
}
function feBearAI(p){   // медведь: Силач идёт первым, Прыгун — за ним и прыгает через снежки; от тени — в сторону
  const W = FEW, me = Q.me;
  if(W.phase === 'pull') return {tx:W.bx - 1.2 - (p.role === 'jump' ? 0.5 : 0), act:Math.abs(p.x - W.bx) < 1.9 && !p.air && now - (p.aiPull || 0) > 0.35 ? (p.aiPull = now, 'pull') : null};
  if(W.phase !== 'bear') return {tx:p.role === 'jump' ? 52.6 : 51.4};
  const sh = W.balls.find(b => b.k === 'arc' && Math.abs(b.tx - p.x) < 1.1);
  if(sh) return {tx:sh.tx > p.x ? p.x - 1.6 : p.x + 1.6};
  const goal = W.bTo - 2;
  if(p.role === 'jump'){
    const s = rsBoth().find(o => o.role === 'strong');
    const roll = W.balls.some(b => b.k === 'roll' && b.x > p.x && b.x - p.x < 1.6);
    return {tx:s && s !== p && s.x < goal - 0.3 ? Math.min(goal, s.x - 0.9) : goal, jump:roll && !p.air};
  }
  return {tx:goal};
}
function feAIS(p){
  const W = FEW, S = W.sled, me = Q.me;
  if(W.phase !== 'prep' && W.phase !== 'party') return feBearAI(p);
  if(!W.balloons[2].got){
    if(Math.abs(me.x - FE.spot) < 5) return {tx:FE.spot};   // подставить голову под самый высокий шарик
    return {tx:Math.min(FE.spot, Math.max(p.x, me.x + 1))};
  }
  if(!S.park){
    if(S.by !== p) return {tx:S.x + 0.6, act:Math.abs(p.x - (S.x + 0.6)) < 0.5 && !p.air ? 'sled' : null};
    if(W.bridge.k < 0.95) return {tx:FE.sled.stop + 1.2};
    if(!W.garland.hung){
      const x = me.hold && feNear(me, FE.posts[1]) ? FE.posts[0] : FE.posts[1];
      if(p.x > x - 0.3 && Math.abs(p.x - x) < 0.35 && !p.air) return p.hold ? {tx:p.x} : {tx:x, act:'hold'};
      return {tx:x};
    }
    return {tx:FE.sled.park + 1.6};
  }
  if(!W.garland.hung){
    const x = me.hold && feNear(me, FE.posts[1]) ? FE.posts[0] : FE.posts[1];
    return p.hold && feNear(p, x) ? {tx:p.x} : {tx:x, act:Math.abs(p.x - x) < 0.35 && !p.air && !p.hold ? 'hold' : null};
  }
  return {tx:p.role === 'jump' ? 52.6 : 51.4};
}
function feAIJ(p){
  const W = FEW, me = Q.me;
  if(W.phase !== 'prep' && W.phase !== 'party') return feBearAI(p);
  const at = x => Math.abs(p.x - x) < 0.3 && !p.air;
  for(let i = 0; i < 2; i++){ const b = W.balloons[i]; if(!b.got) return {tx:b.x, jump:at(b.x), up:true}; }
  if(!W.balloons[2].got){
    const B = W.balloons[2];
    if(p.ground) p.aiHead = p.ground.k === 'pal';
    if(Math.abs(me.x - FE.spot) < 0.6 && !me.air && me.y < 0.2){
      if(p.ground && p.ground.k === 'pal') return {tx:me.x, jump:true};
      if(p.air && p.aiHead) return {tx:me.x, up:true};
      if(p.air) return {tx:me.x};
      return {tx:me.x, jump:Math.abs(p.x - me.x) < 0.9};
    }
    return {tx:FE.spot - 1.6};
  }
  if(!W.levers[0].on){
    const sh = FE.shelf;
    if(p.ground && Math.abs(p.y - sh[3]) < 0.05){ if(at(FE.lever.x)) rsLever(0); return {tx:FE.lever.x}; }
    if(!p.air && p.x < sh[0] - 1.5) p.aiRun = true;
    if(!p.air && p.x > sh[0] - 0.2) p.aiRun = false;
    if(!p.aiRun) return {tx:sh[0] - 1.9};
    return {tx:sh[0] + 1, jump:!p.air && p.x > sh[0] - 1.45 && p.x < sh[0] - 0.8, up:true};
  }
  if(!W.garland.hung){
    const x = me.hold && feNear(me, FE.posts[0]) ? FE.posts[1] : FE.posts[0];
    return p.hold && feNear(p, x) ? {tx:p.x} : {tx:x, act:Math.abs(p.x - x) < 0.35 && !p.air && !p.hold ? 'hold' : null};
  }
  return {tx:p.role === 'jump' ? 52.6 : 51.4};
}

/* ---------- подсказки ---------- */
function feSec(p){
  const W = FEW;
  if(W.phase === 'done') return 9;
  if(W.phase === 'pull') return 8;
  if(W.phase === 'bear') return 7 + W.round*10;
  if(W.phase === 'party') return 10;
  if(p.x > 46.5) return 6;
  if(p.x > 31) return W.garland.hung ? 10 : 5;
  if(p.x > 16) return W.sled.by ? (W.bridge.k > 0.95 ? 10 : 4) : W.sled.park ? 10 : 3;
  if(p.x > 3.5) return W.balloons.every(b => b.got) ? 10 : 2;
  return 0;
}
function feHint(sec, role){
  const n = Q.pal && !Q.pal.gone ? Q.pal.name : '', J = role === 'jump', solo = Q.mode === 'solo';
  const nJ = solo ? L('Прыгун', 'the jumper') : n, nS = solo ? L('Силач', 'the strong one') : n;
  if(sec === 7 || sec === 17 || sec === 27) return sec === 7 ? (J ? L(`Медведь кидается снежками! Катящиеся перепрыгивай ⬆️ или прячься за ${solo ? 'Силачом' : 'напарником'} 💪. От тени отходи! Подойдите к нему оба`, `The bear throws snowballs! Jump over the rolling ones ⬆️ or hide behind ${nS}. Step away from shadows! Walk up to him together`)
      : L('Медведь кидается снежками! Катящиеся разбиваются о тебя 💪, а от тени — отходи. Подойдите к нему оба', 'The bear throws snowballs! Rolling ones smash against you 💪, step away from shadows. Walk up to him together'))
    : L('Он отступает! Ещё ближе — вдвоём ➡️', 'He\'s backing off! Closer still — together ➡️');
  switch(sec){
    case 0: return L('Мамы потеряшек устраивают праздник в вашу честь! Но ветер разнёс украшения — соберите их ➡️', 'The lost pups\' mums are throwing a party for you! But the wind blew the decorations away — gather them ➡️');
    case 2: return J ? L(`Шарики улетели! Прыжок и ещё раз ⬆️⬆️. До самого высокого — с головы ${nS}`, `The balloons flew off! Jump, then once more ⬆️⬆️. The highest one — from ${nS}'s head`)
      : L(`Шарики высоко! Встань под самым высоким — ${nJ} запрыгнет тебе на голову 🎈`, `The balloons are high! Stand under the highest one — ${nJ} jumps on your head 🎈`);
    case 3: return J ? L(`Торт на санках — его повезёт ${nS}. А мост поднят: запрыгни на полку ⬆️⬆️ и потяни рычаг 🔧`, `The cake is on a sled — ${nS} pulls it. The bridge is up: jump onto the shelf ⬆️⬆️ and pull the lever 🔧`)
      : L('Торт на санках! Подойди и нажми 🛷 — повезёшь его на праздник', 'The cake is on a sled! Walk up and press 🛷 — pull it to the party');
    case 4: return J ? L('Мост поднят! Запрыгни на полку ⬆️⬆️ и потяни рычаг 🔧', 'The bridge is up! Jump onto the shelf ⬆️⬆️ and pull the lever 🔧')
      : L(`Мост поднят — санки не проедут. ${nJ} опустит его рычагом на полке`, `The bridge is up — the sled can't cross. ${nJ} lowers it with the lever on the shelf`);
    case 5: return L('Гирлянда! Встаньте у двух столбиков и держите концы 🏮 вместе', 'A garland! Stand by the two posts and hold both ends 🏮 together');
    case 6: return L(`Ещё нужно: ${feMissing()}`, `Still needed: ${feMissing()}`);
    case 8: return L('Медведь плачет — в лапе ледяная заноза! Подойди и тяни ✋✋✋', 'The bear is crying — an ice splinter in his paw! Walk up and pull ✋✋✋');
    case 9: return L('Праздник! 🎉', 'Party time! 🎉');
  }
  return '';
}
function feStuck(dt){
  const me = Q.me, pal = Q.pal; if(!pal || pal.gone || Q.mode === 'solo' || me.bub) return;
  const W = FEW;
  let key = '', say = '';
  if(!W.balloons[2].got && me.role === 'strong' && Math.abs(pal.x - FE.spot) < 2.5 && Math.abs(me.x - FE.spot) > 0.6 && W.balloons[0].got && W.balloons[1].got){ key = 'stB'; say = L(`Встань под самым высоким шариком — ${pal.name} запрыгнет тебе на голову!`, `Stand under the highest balloon — ${pal.name} jumps on your head!`); }
  else if(!W.garland.hung && W.phase === 'prep' && FE.posts.some(x => pal.hold && feNear(pal, x)) && !me.hold){ key = 'stG'; say = L(`${pal.name} держит один конец — встань у другого столбика и держи 🏮`, `${pal.name} holds one end — go to the other post and hold 🏮`); }
  else if(W.phase === 'pull' && Math.abs(me.x - W.bx) > 2){ key = 'stP'; say = L('Подойди к медведю и тяни ✋', 'Walk up to the bear and pull ✋'); }
  Q.stuckT = say ? (Q.stuckT || 0) + dt : 0;
  if(Q.stuckT > 2.5 && !Q.said.has(key)){ Q.said.add(key); mgHint(say); Q.hintT = now + 5; }
}
function feCam(){
  const W = FEW;
  if(W.phase === 'party' || W.phase === 'bear' || W.phase === 'pull') return [Math.max(Q.me.x + 1.5, W.phase === 'party' ? 56 : W.bx - 3), 1.4, 1.2];
  return null;
}
function feWire(){
  const on = (t, f) => netOn(t, m => { if(Q && Q.L.id === 'fest') f(m); });
  on('qfbal', m => feBal(m.i, true));
  on('qsled', m => {
    const S = FEW.sled;
    if(m.park) return feSledPark(true);
    if(m.on === 1){ S.by = Q.pal; return; }
    if(m.on === 0){ S.by = null; if(m.x != null) S.x = m.x; return; }
    if(m.x != null && !rsLocal(S.by || {})) S.x = m.x;
  });
  on('qgar', () => feGarland(true));
  on('qbear', m => feRound(m.r));
  on('qfeb', m => { if(!FEW.balls.some(b => b.id === m.id)) feThrow(m.k, true, m.id, m.tx); });
  on('qfebx', m => { const i = FEW.balls.findIndex(b => b.id === m.id); if(i >= 0) feBallGone(i, false); });
  on('qfep', () => fePull(Q.pal, true));
  on('qfeout', () => feOut(true));
}

RS_LVS.fest = {id:'fest', ic:'🎉', name:() => L('Праздник мам', 'Mums\' party'),
  say:() => L('Все спасённые мамы и малыши устраивают праздник! Соберите шарики, торт и гирлянду… а кто это рычит за сугробом?', 'All the rescued mums and pups are throwing a party! Gather the balloons, the cake and the garland… and who is growling behind the snowdrift?'),
  root:feRoot, ground:FE.ground, walls:FE.walls, more:[FE.shelf], water:FE.water, stack:true,
  pearls:FE.pearls, pearlO:null,
  W:() => FEW, build:feBuild, reset:feReset, solids:feSolids, world:feWorld, pre:fePre, lever:feLever,
  act:feAct, doAct:feDoAct, cam:feCam,
  ai:feAI, sec:feSec, hint:feHint, step:feStep, stuck:feStuck, wire:feWire,
  setup:feSetup,
  clean(){
    for(const g of Q.feGuests || []) feRoot.remove(g.s.root || g.s);
    const c = FEW.sled.cake; if(c.parent !== FEW.sled.o){ FEW.sled.o.add(c); c.position.set(0, 0.28, 0); c.rotation.set(0, 0, 0); }
    for(const b of FEW.balls){ feRoot.remove(b.o); if(b.sh) feRoot.remove(b.sh); }
    FEW.balls.length = 0;
  },
  endX:FE.table - 1.2, photoY:1.2,
  photo:() => L('Праздник мам и белый медведь', 'The mums\' party and the polar bear'),
  endTtl:() => L('Праздник мам! 🎉', 'The mums\' party! 🎉'),
  endSay:() => L('Все мамы и малыши вместе, а медведь теперь друг — спасибо, спасатели! 🐻‍❄️', 'All the mums and pups are together, and the bear is a friend now — thank you, rescuers! 🐻‍❄️')
};
