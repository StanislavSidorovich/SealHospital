/* ---------------- «Спасаем потеряшку», уровень 5: «Подводный лес» (Спринт 5, задача 4) ----------------
   Калан-малыш Пуговка уплыл от мамы, пока она ныряла за ракушкой, и запутался в водорослях. Весь уровень — в море:
   Силач ныряет ⬇️ куда угодно, Прыгун под воду не может, зато выпрыгивает из воды высоко (и ещё раз в воздухе).
     🔧 ледяная стена до самого дна: Силач ныряет и тянет рычаг на дне — стена уходит в песок;
     🧊 толстая льдина: Прыгун запрыгивает на айсберг и тянет рычаг — водоросли подо льдом расступаются,
        Силач проплывает снизу, а Прыгун идёт по льдине сверху;
     🌊 сильное течение наверху: Прыгун прыгает по льдинкам, Силач ныряет поглубже — там тихо;
     🦦 Пуговка: Силач распутывает корешок на дне 🌿 (3 раза), Прыгун звонит в ракушку-колокольчик на айсберге 🔔 —
        мама слышит, приплывает, и малыш забирается к ней на животик.
   3 жемчужинки 🦪: высоко над айсбергом (Прыгун), на дне под течением (Силач), над льдинками (Прыгун, двойной прыжок).
   Физика, пузыри, кнопки, сеть и итоги — общие, в rescue.js; тут только сам уровень (RS_LVS.kelp).
   Сеть: рычаги — qlv (общие), корешок — qknot, колокольчик — qbell, мама приплыла — qkffree.
   Подключается после glowcave.js. */
const KF = {
  ground:[[-3, 5, -9, 0.2]],                                  // камень на старте
  walls:[[-2.2, -1, 0.2, 7], [5, 66, -9, -4.5], [66, 68, -9, 2.2]],   // левый край, морское дно, скала в конце
  water:[5, 66],
  wall:{x0:12, x1:13, y0:-4.5, y1:4, down:5.8},               // ледяная стена до дна: рычаг 0 опускает её в песок
  berg:[17, 20, -2.5, 1.5],                                   // айсберг с рычагом 1 (только Прыгун)
  sheet:[23, 31, -0.7, 1.2],                                  // толстая льдина: сверху — Прыгун, снизу — Силач
  gate:{x0:27, x1:27.5, y0:-4.5, y1:-0.7},                    // водоросли подо льдом: рычаг 1
  floes:[[34.5, 36, -0.6, 0.3], [38.5, 40, -0.6, 0.3], [42.5, 44, -0.6, 0.3]],
  flow:[33, 46], flowV:-2.8,                                  // течение у поверхности (глубже −1,8 — тихо)
  berg2:[49, 51.5, -2.5, 1.5],                                // айсберг с ракушкой-колокольчиком
  levers:[{x:9, y:-4.5}, {x:18.5, y:1.5}],
  bell:{x:50.3, y:1.5},
  knot:{x:56, y:-4.5},
  pup:56, mom:66, momTo:54.6,
  swirl:{x:63.5, safe:53.4, v:0.55, push:0.38},                 // финал: водоворот тянет Пуговку; дотолкать до айсберга
  pearls:[{x:18.5, y:4.2}, {x:40.3, y:-4.1}, {x:41.3, y:3.2}]
};
const KF_KNOT = 3;   // сколько раз распутывать корешок
const KF_CHUNK = {every:1.7, v:1.9};   // льдинки из водоворота: как часто, скорость

/* ---------- постройка ---------- */
const kfRoot = new THREE.Group(); kfRoot.visible = false; scene.add(kfRoot);
const KF_MAT = {sand:toon(0xF1DDB0), rock:toon(0x7F93AA), ice:RS_MAT.ice, snow:RS_MAT.snow, gate:RS_MAT.gate,
  kelp:toon(0x4FA877), kelp2:toon(0x6CC28C), shell:toon(0xFFC2D6), deep:toon(0x3F8FB8)};
const KF_WATER = new THREE.MeshBasicMaterial({color:0x4FA8D6, transparent:true, opacity:0.42, depthWrite:false});
const KFW = {};
let kfBuilt = false;
function kfBox(x0, x1, y0, y1, mat, zd = 1.1){ return rsBox(x0, x1, y0, y1, mat, zd, kfRoot); }
function kfIce(b){ kfBox(b[0], b[1], b[2], b[3], KF_MAT.ice); kfBox(b[0] + 0.02, b[1] - 0.02, b[3] - 0.02, b[3] + 0.1, KF_MAT.snow, 1.14); }
function kfBuild(){
  if(kfBuilt) return; kfBuilt = true;
  const K = KF, R = rsRand(23);
  // даль: небо, море, льдинки; под водой — тёмная толща, песок, водоросли, камешки
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(240, 30), toon(0xBDE5F4)); sky.position.copy(rsAt(30, 12, -9)); kfRoot.add(sky);
  const deep = new THREE.Mesh(new THREE.PlaneGeometry(240, 14), KF_MAT.deep); deep.position.copy(rsAt(30, RS_WS - 7, -6)); kfRoot.add(deep);
  const far = new THREE.Mesh(new THREE.PlaneGeometry(240, 80), toon(0x8FD0EA)); far.rotation.x = -Math.PI/2; far.position.copy(rsAt(30, RS_WS - 0.02, -46)); kfRoot.add(far);
  for(const [x, z, s] of [[-4, -26, 2], [10, -33, 2.6], [26, -28, 2], [40, -36, 3], [55, -27, 2.2], [70, -32, 2.6]]){
    const b = addOutline(new THREE.Mesh(new THREE.ConeGeometry(s, s*1.3, 6), toon(0xF3FAFD)), 1.03); b.position.copy(rsAt(x, s*0.4, z)); kfRoot.add(b);
  }
  for(const w of K.walls) kfBox(w[0], w[1], w[2], w[3], w[3] < -4 ? KF_MAT.sand : KF_MAT.rock);
  for(const g of K.ground){ kfBox(g[0], g[1], g[2], g[3], KF_MAT.rock); kfBox(g[0] + 0.02, g[1] - 0.02, g[3] - 0.02, g[3] + 0.1, KF_MAT.snow, 1.14); }
  KFW.sway = [];
  for(let x = 6; x < 65; x += 1.3 + R()*2.2){
    if(Math.abs(x - K.knot.x) < 1.2) continue;
    const k = dvKelp(1.6 + R()*3, R() < 0.5 ? 0x4FA877 : 0x6CC28C); k.position.copy(rsAt(x, -4.5, -1.2 - R()*3)); kfRoot.add(k); KFW.sway.push(k);
  }
  for(let i = 0; i < 16; i++){ const s = addOutline(new THREE.Mesh(SMALL, R() < 0.5 ? KF_MAT.rock : KF_MAT.shell), 1.08); s.scale.set(0.2 + R()*0.3, 0.14 + R()*0.15, 0.2); s.position.copy(rsAt(6 + R()*58, -4.45, -0.8 - R()*2)); kfRoot.add(s); }
  for(const b of [K.berg, K.berg2, K.sheet, ...K.floes]) kfIce(b);
  // вода: прозрачная толща спереди, светлая кромка
  const [wx0, wx1] = K.water, wm = new THREE.Mesh(new THREE.BoxGeometry(wx1 - wx0, RS_WS + 4.5, 2.4), KF_WATER);
  wm.position.copy(rsAt((wx0 + wx1)/2, (RS_WS - 4.5)/2)); wm.renderOrder = 2; kfRoot.add(wm);
  KFW.foam = new THREE.Mesh(new THREE.BoxGeometry(wx1 - wx0, 0.06, 2.42), new THREE.MeshBasicMaterial({color:0xEAF7FB, transparent:true, opacity:0.8}));
  KFW.foam.position.copy(rsAt((wx0 + wx1)/2, RS_WS)); kfRoot.add(KFW.foam);
  // течение: стрелочки влево у поверхности
  KFW.flow = [];
  const am = new THREE.SpriteMaterial({map:canvasTex(64, g => { g.strokeStyle = '#EAF7FB'; g.lineWidth = 10; g.lineCap = g.lineJoin = 'round'; g.beginPath(); g.moveTo(44, 14); g.lineTo(20, 32); g.lineTo(44, 50); g.stroke(); }), transparent:true, opacity:0.75, depthWrite:false});
  for(let x = K.flow[0] + 0.8; x < K.flow[1]; x += 1.6){ const a = new THREE.Sprite(am); a.scale.setScalar(0.42); a.position.copy(rsAt(x, RS_WS - 0.35, 1.3)); kfRoot.add(a); KFW.flow.push(a); }
  // ледяная стена и водоросли-ворота
  const W = K.wall; KFW.wall = {o:kfBox(W.x0, W.x1, W.y0, W.y1, KF_MAT.gate), k:0, s:{x0:W.x0, x1:W.x1, y0:W.y0, y1:W.y1, k:'wall'}};
  const G = K.gate, gg = new THREE.Group(); kfRoot.add(gg);
  for(let x = G.x0 + 0.05; x < G.x1; x += 0.22) for(const z of [-0.6, 0, 0.6]){ const k = dvKelp(G.y1 - G.y0, 0x3E9468, 5); k.position.set(x - (G.x0 + G.x1)/2, 0, z); gg.add(k); KFW.sway.push(k); }
  KFW.gate = {o:gg, k:0, s:{x0:G.x0, x1:G.x1, y0:G.y0, y1:G.y1, k:'gate'}};
  KFW.levers = K.levers.map(l => rsLeverObj(l, kfRoot));
  // ракушка-колокольчик на айсберге
  const bg = new THREE.Group(); bg.position.copy(rsAt(K.bell.x, K.bell.y, 0.2)); kfRoot.add(bg);
  const post = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1, 8), RS_MAT.wood), 1.2); post.position.y = 0.5; bg.add(post);
  const bar = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8), RS_MAT.wood), 1.2); bar.rotation.z = Math.PI/2; bar.position.set(0.25, 1, 0); bg.add(bar);
  const bell = new THREE.Group(); bell.position.set(0.45, 0.98, 0); bg.add(bell);
  const bs = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.34, 10, 1, true), KF_MAT.shell), 1.1); bs.material.side = THREE.DoubleSide; bs.position.y = -0.18; bell.add(bs);
  const cl = new THREE.Mesh(SMALL, inkMat); cl.scale.setScalar(0.05); cl.position.y = -0.34; bell.add(cl);
  KFW.bell = bell;
  // корешок на дне и водоросли, которыми запутался Пуговка
  const kn = addOutline(new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.09, 8, 16), KF_MAT.kelp), 1.1); kn.position.copy(rsAt(K.knot.x, K.knot.y + 0.2, 0.3)); kfRoot.add(kn);
  KFW.knotO = kn;
  KFW.tether = [-0.25, 0, 0.25].map((dx, i) => { const k = dvKelp(-0.5 - K.knot.y, i === 1 ? 0x3E9468 : 0x4FA877, 7); k.position.copy(rsAt(K.knot.x + dx, K.knot.y, 0.25)); kfRoot.add(k); KFW.sway.push(k); return k; });
  // водоворот: закрученная воронка у поверхности (крутится, пока Пуговку тянет)
  const sw = new THREE.Group(); sw.position.copy(rsAt(K.swirl.x, RS_WS - 0.05, 0)); kfRoot.add(sw);
  const swm = new THREE.MeshBasicMaterial({map:canvasTex(128, g => { g.strokeStyle = '#EAF7FB'; g.lineWidth = 7; g.lineCap = 'round'; for(let a = 0; a < 3; a++){ g.beginPath(); for(let t = 0; t < 1; t += 0.02){ const r = 8 + t*54, q = a*2.1 + t*7; g.lineTo(64 + Math.cos(q)*r, 64 + Math.sin(q)*r); } g.stroke(); } }), transparent:true, depthWrite:false, side:THREE.DoubleSide});
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1.6, 32), swm); disc.rotation.x = -Math.PI/2; sw.add(disc);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.6, 24, 1, true), new THREE.MeshBasicMaterial({color:0x2F7FB0, transparent:true, opacity:0.35, depthWrite:false, side:THREE.DoubleSide}));
  cone.rotation.x = Math.PI; cone.position.y = -1.3; sw.add(cone);
  KFW.swirl = sw; sw.visible = false;
  const buoy = addOutline(new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.08, 8, 18), toon(0xFF7A7A)), 1.1); buoy.rotation.x = Math.PI/2; kfRoot.add(buoy);
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 5), inkMat); kfRoot.add(rope);
  KFW.buoy = buoy; KFW.rope = rope; KFW.chunks = [];
  RS_LVS.kelp.pearlO = rsPearlsBuild(RS_LVS.kelp);
}
function kfReset(){
  KFW.wall.k = 0; KFW.gate.k = 0;
  for(const l of KFW.levers){ l.on = false; l.arm.rotation.z = 0.7; }
  KFW.knot = 0; KFW.rung = false; KFW.free = false;
  KFW.sw = 0; KFW.tied = false; KFW.chunkT = 1; KFW.chunkId = 0; KFW.sendT = 0;
  KFW.swirl.visible = false; KFW.buoy.visible = false; KFW.rope.visible = false;
  for(const c of KFW.chunks) kfRoot.remove(c.o);
  KFW.chunks.length = 0;
  KFW.knotO.visible = true; KFW.knotO.scale.setScalar(1);
  for(const k of KFW.tether){ k.visible = true; k.scale.set(1, 1, 1); }
  kfSync();
}
function kfSync(){
  const W = KFW.wall, w = KF.wall, dy = -w.down*W.k;
  W.s.y0 = w.y0 + dy; W.s.y1 = w.y1 + dy; W.o.position.y = RS_POS.y + (w.y0 + w.y1)/2 + dy;
  const G = KFW.gate, g = KF.gate, gy = -(g.y1 - g.y0 + 0.1)*G.k;
  G.s.y0 = g.y0 + gy; G.s.y1 = g.y1 + gy; G.o.position.copy(rsAt((g.x0 + g.x1)/2, g.y0 + gy, 0)); G.o.visible = G.k < 0.999;
}

/* ---------- мир ---------- */
function kfWorld(dt){
  const W = KFW;
  W.wall.k = Math.min(W.levers[0].on ? 1 : 0, W.wall.k + dt*0.7);
  W.gate.k = Math.min(W.levers[1].on ? 1 : 0, W.gate.k + dt*0.9);
  for(const a of W.flow){ a.position.x -= dt*1.3; if(a.position.x < RS_POS.x + KF.flow[0] + 0.3) a.position.x += KF.flow[1] - KF.flow[0] - 0.6; }
  for(const k of W.sway){ const ph = k.userData.ph; k.userData.pivs.forEach((p, i) => p.rotation.z = Math.sin(now*1.1 + ph + i*0.55)*0.09); }
  if(W.bellT > now) W.bell.rotation.z = Math.sin(now*22)*0.5*(W.bellT - now);
  W.foam.position.y = RS_POS.y + RS_WS + Math.sin(now*2)*0.02;
  if(W.sw) kfSwirlStep(dt);
  kfSync();
}
function kfSolids(out){ out.push(KFW.wall.s, KFW.gate.s); }
// течение у поверхности уносит назад; глубоко (и нырнувшему) — тихо
function kfFlow(p){ return !p.dive && p.y > -1.8 && p.x > KF.flow[0] && p.x < KF.flow[1] ? KF.flowV : 0; }
// у рычага и корешка на дне Силач держится лапой — не всплывает, пока не отплывёт
const kfHandle = p => p.role === 'strong' && p.inW && p.y < -3.6 && (
  (!KFW.levers[0].on && Math.abs(p.x - KF.levers[0].x) < 0.8) || (KFW.knot < KF_KNOT && Math.abs(p.x - KF.knot.x) < 0.9));
// выпрыгнуть из воды на льдину, если плывёшь к ней и до верха можно достать
function kfPre(){
  for(const p of [Q.me, Q.pal]){
    if(!p || !rsLocal(p) || p.gone || p.bub) continue;
    if(kfHandle(p) && p.vy > 0) p.vy = 0;
    if(!p.inW || p.dive || p.vy > 0.5 || p.y < RS_FLOAT - 0.25 || p.jq > 0 || now - (p.wallT || 0) > 0.2) continue;
    const reach = p.role === 'jump' ? 1.9 : 0.75, ahead = p.x + p.face*(RS_HW + 0.2);
    if(Q.sol.some(s => ahead > s.x0 && ahead < s.x1 && s.y0 < 0.2 && s.y1 > RS_WS && s.y1 < reach)) p.jq = 0.15;
  }
}
function kfAct(me){
  if(me.bub) return null;
  if(me.role === 'strong' && KFW.knot < KF_KNOT && me.inW && me.y < -3.6 && Math.abs(me.x - KF.knot.x) < 0.9) return {k:'knot', ic:'🌿', aria:L('Распутать', 'Untangle')};
  if(!KFW.rung && !me.air && Math.abs(me.x - KF.bell.x) < 0.9 && Math.abs(me.y - KF.bell.y) < 0.2) return {k:'bell', ic:'🔔', aria:L('Позвонить', 'Ring')};
  if(KFW.sw === 1 && !Q.cage){
    const onB = !me.air && Math.abs(me.y - KF.berg2[3]) < 0.1 && me.x > KF.berg2[0] - 0.3 && me.x < KF.berg2[1] + 0.3;
    if(onB && !KFW.tied) return {k:'buoy', ic:'🛟', aria:L('Бросить круг', 'Throw the ring')};
    if(onB && KFW.tied) return {k:'hold', ic:'🪢', aria:L('Держать верёвку', 'Hold the rope')};
    if(me.role === 'strong' && me.inW && me.y < -0.6 && Math.abs(me.x - Q.pup.x) < 1.3) return {k:'push', ic:'💪', aria:L('Толкать', 'Push')};
  }
  return null;
}
function kfDoAct(p, k){
  if(k === 'knot' && p.role === 'strong'){
    if(now - (p.knotT || 0) < 0.3) return;
    p.knotT = now; kfKnot();
  } else if(k === 'bell') kfBell();
  else if(k === 'buoy') kfBuoy();
  else if(k === 'hold'){ p.hold = !p.hold; p.face = 1; sfx.tick(); if(p.hold) floatText(L('Держу! 🪢', 'Holding! 🪢'), rsAt(p.x, p.y + 1.4), '#2F9E72'); if(p === Q.me) Q.hintT = 0; }
  else if(k === 'push' && p.role === 'strong'){ if(now - (p.pushT || 0) < 0.22) return; p.pushT = now; kfPush(); }
}
function kfKnot(remote, n){
  if(KFW.knot >= KF_KNOT) return;
  KFW.knot = n != null ? n : KFW.knot + 1;
  if(!remote && Q.mode === 'net') netSend({t:'qknot', n:KFW.knot});
  const K = KF.knot, left = KF_KNOT - KFW.knot;
  sfx.rub(); burst(TEX.puff, rsAt(K.x, K.y + 0.4, 0.5), 8, 1.2, 0.3);
  KFW.knotO.scale.setScalar(1 - KFW.knot*0.25);
  if(left){ floatText(L(`Ещё ${left}!`, `${left} more!`), rsAt(K.x, K.y + 1.3), '#2F9E72'); return; }
  sfx.good(); KFW.knotO.visible = false;
  floatText(L('Распутали! 🌿', 'Untangled! 🌿'), rsAt(K.x, K.y + 1.3), '#2F9E72');
  for(const k of KFW.tether) tween(0.8, t => { k.scale.y = Math.max(0.01, 1 - t); }, ease.io).then(() => { k.visible = false; });
  if(Q.pup){ Q.pup.happy = now + 3; floatText(L('Ура, я свободен!', 'Yay, I\'m free!'), rsAt(Q.pup.x, 1.2), '#D9527E'); }
  Q.hintT = 0; kfFreeCheck();
}
function kfBell(remote){
  if(KFW.rung) return;
  KFW.rung = true; KFW.bellT = now + 1.4;
  if(!remote && Q.mode === 'net') netSend({t:'qbell'});
  sfx.ding(); setTimeout(() => sfx.ding(), 260);
  floatText(L('Дзинь-дзинь! 🔔', 'Ding-ding! 🔔'), rsAt(KF.bell.x, KF.bell.y + 1.7), '#D9527E');
  if(Q.pup) wait(0.8).then(() => { if(Q && !Q.cage) floatText(L('Мама, я тут!', 'Mum, I\'m here!'), rsAt(Q.pup.x, 1.2), '#6B6A7E'); });
  Q.hintT = 0; kfFreeCheck();
}
function kfFreeCheck(){ if(KFW.knot >= KF_KNOT && KFW.rung && !Q.cage && !KFW.sw) kfSwirl(); }
/* ---------- финал: водоворот ---------- */
function kfSwirl(remote){
  const W = KFW; if(W.sw) return;
  W.sw = 1; W.swirl.visible = true; W.swirl.scale.setScalar(0.01); W.chunkT = 1.5;
  tween(0.8, k => W.swirl.scale.setScalar(Math.max(0.01, k)), ease.out);
  if(!remote && Q.mode === 'net') netSend({t:'qkfsw'});
  sfx.whoosh(); sfx.splash();
  mgHint(L('Ой! Течение уносит Пуговку к водовороту! 🌀', 'Oh no! The current is pulling Button to the whirlpool! 🌀')); Q.hintT = now + 4;
  if(Q.pup) floatText(L('Ой-ой! Помогите!', 'Oh no! Help!'), rsAt(Q.pup.x, 1.2), '#D9527E');
  Q.said.clear();
}
function kfSwirlStep(dt){
  const W = KFW, P = Q.pup, K = KF.swirl, host = Q.mode !== 'net' || net.host;
  W.swirl.rotation.y -= dt*(W.sw === 1 ? 3 : 0.6);
  if(W.sw !== 1 || !P) return;
  // Пуговку тянет к воронке, пока никто не держит верёвку
  const B2 = KF.berg2, held = W.tied && rsBoth().some(s => s.hold && s.x > B2[0] - 0.3 && s.x < B2[1] + 0.3 && s.y > B2[3] - 0.1);
  if(host){
    if(P.x < K.x - 0.6) P.x = Math.min(K.x - 0.6, P.x + K.v*(held ? 0.3 : 1)*dt);   // держат верёвку — тянет слабее, но тянет: толкай!
    if(Q.mode === 'net' && (W.sendT -= dt) <= 0){ W.sendT = 0.1; netSend({t:'qkfpup', x:+P.x.toFixed(2)}); }
    if(P.x <= K.safe && !Q.cage) kfFree();
  }
  if(!held && Math.random() < dt*0.5 && Q.st === 'go') floatText(L('Держите меня!', 'Hold on to me!'), rsAt(P.x, 1.2), '#D9527E');
  // круг и верёвка до того, кто держит (или до айсберга)
  W.buoy.visible = W.tied; W.rope.visible = W.tied;
  if(W.tied){
    W.buoy.position.copy(rsAt(P.x, RS_WS + 0.15, 0.45));
    const h = rsBoth().find(s => s.role === 'jump' && Math.abs(s.y - KF.berg2[3]) < 0.2) , a = rsAt(h ? h.x + 0.3 : KF.berg2[1], KF.berg2[3] + (h ? 0.5 : 0.1), 0.3), b = W.buoy.position;
    W.rope.position.copy(a).lerp(b, 0.5); W.rope.scale.y = a.distanceTo(b);
    W.rope.quaternion.setFromUnitVectors(new V3(0, 1, 0), b.clone().sub(a).normalize());
  }
  // льдинки из водоворота плывут навстречу под водой; попала — пузырь
  if(host && Q.st === 'go' && (W.chunkT -= dt) <= 0){ W.chunkT = KF_CHUNK.every*(0.8 + Math.random()*0.4); kfChunk(++W.chunkId, -0.9 - Math.random()*3); }
  for(let i = W.chunks.length - 1; i >= 0; i--){
    const c = W.chunks[i];
    c.x -= KF_CHUNK.v*dt; c.o.position.copy(rsAt(c.x, c.y + Math.sin(now*3 + c.id)*0.1, 0.2)); c.o.rotation.z += dt*2;
    let gone = c.x < KF.berg2[1] + 0.3;
    for(const s of [Q.me, Q.pal]) if(!gone && s && rsLocal(s) && !s.gone && !s.bub && s.inW && s.inv <= 0 && Math.abs(s.x - c.x) < 0.7 && c.y > s.y - 0.3 && c.y < s.y + RS_H + 0.2){ gone = true; rsBubble(s); }
    if(gone){ burst(TEX.puff, rsAt(c.x, c.y, 0.4), 6, 1.2, 0.3); kfRoot.remove(c.o); W.chunks.splice(i, 1); }
  }
}
function kfChunk(id, y, remote){
  const W = KFW; if(W.chunks.some(c => c.id === id)) return;
  const o = addOutline(new THREE.Mesh(new THREE.DodecahedronGeometry(0.34), toon(0xD6EAF5)), 1.08); kfRoot.add(o);
  W.chunks.push({id, o, x:KF.swirl.x - 0.5, y});
  if(!remote && Q.mode === 'net') netSend({t:'qkfch', id, y:+y.toFixed(2)});
}
function kfBuoy(remote){
  const W = KFW; if(W.tied || W.sw !== 1) return;
  W.tied = true; sfx.whoosh();
  if(!remote && Q.mode === 'net') netSend({t:'qkfbuoy'});
  floatText(L('Лови круг! 🛟', 'Catch the ring! 🛟'), rsAt(Q.pup.x, 1.4), '#2F9E72');
  wait(0.4).then(() => { if(Q && Q.pup) floatText(L('Поймал!', 'Got it!'), rsAt(Q.pup.x, 1.2), '#D9527E'); });
  if(Q.me.role === 'jump' && !Q.me.hold){ mgHint(L('Держи верёвку 🪢 — а Силач толкает Пуговку к айсбергу!', 'Hold the rope 🪢 — the strong one pushes Button to the iceberg!')); Q.hintT = now + 5; }
}
function kfPush(remote){
  const P = Q.pup; if(!P || KFW.sw !== 1) return;
  if(!remote && Q.mode === 'net') netSend({t:'qkfpush'});
  if(Q.mode !== 'net' || net.host) P.x = Math.max(KF.swirl.safe - 0.1, P.x - KF.swirl.push);
  sfx.boing(); burst(TEX.puff, rsAt(P.x + 0.5, RS_WS - 0.3, 0.5), 5, 1, 0.25);
  if(Math.random() < 0.4) floatText(L('Толк! 💪', 'Push! 💪'), rsAt(P.x, 0.9), '#3E8DB8');
}
function kfLever(i){
  const at = i ? KF.gate : KF.wall;
  wait(0.5).then(() => { if(Q) floatText(i ? L('Водоросли расступились!', 'The kelp moved aside!') : L('Стена уходит в песок!', 'The wall sinks into the sand!'), rsAt((at.x0 + at.x1)/2, i ? -1.6 : 1.6), '#3E8DB8'); });
}

/* ---------- Пуговка и мама ---------- */
function kfOtter(sc){ const g = DV_MAKE.otter(); g.scale.setScalar(sc); return g; }
function kfSetup(){
  const pup = kfOtter(0.85), mom = kfOtter(1.45);
  kfRoot.add(pup); kfRoot.add(mom);
  Q.pup = {o:pup, x:KF.pup, tx:null, happy:0, callT:now + 3};
  Q.kfMom = {o:mom, x:KF.mom, z:-3, tx:null, tz:-3};
  mom.visible = false;
  Q.fam = null;
}
function kfStep(dt, go){
  const P = Q.pup; if(!P) return;
  if(P.tx != null) P.x += (P.tx - P.x)*Math.min(1, dt*1.8);
  const bob = Math.sin(now*2.2)*0.05, hop = P.happy > now ? Math.abs(Math.sin(now*9))*0.18 : 0;
  P.o.position.copy(rsAt(P.x, RS_WS + 0.15 + bob + hop + (P.onMom ? 0.4 : 0), 0.45));
  P.o.rotation.z = Math.sin(now*1.3)*0.1 + (KFW.knot < KF_KNOT ? Math.sin(now*6)*0.08 : 0);
  P.o.rotation.y = KFW.sw === 1 ? Math.max(0, 1 - (KF.swirl.x - P.x)/5)*now*4 : 0;   // у воронки кружится
  if(!Q.cage && !KFW.sw && now > P.callT && Q.me.x > 44){ P.callT = now + 4 + Math.random()*2; floatText(L('Ма-ма! Я запутался!', 'Mu-um! I\'m tangled!'), rsAt(P.x, 1.1), '#6B6A7E'); sfx.mama(); }
  const M = Q.kfMom;
  if(M.tx != null){ M.x += (M.tx - M.x)*Math.min(1, dt*1.2); M.z += (M.tz - M.z)*Math.min(1, dt*1.2); }
  M.o.position.copy(rsAt(M.x, RS_WS + 0.1 + Math.sin(now*2 + 1)*0.05, M.z));
  M.o.rotation.y = M.x > P.x + 0.3 ? Math.PI : 0;
  M.o.rotation.z = Math.sin(now*1.2)*0.06;
  // над айсбергом жемчужинка: подскажем Прыгуну (один раз)
  const me = Q.me;
  if(go && !kfPearlDone(0) && !Q.said.has('pearlK') && me.role === 'jump' && me.ground && Math.abs(me.y - KF.berg[3]) < 0.05 && me.x > KF.berg[0] && me.x < KF.berg[1]){
    Q.said.add('pearlK'); mgHint(L('Над айсбергом жемчужинка! Прыжок и ещё раз ⬆️⬆️', 'A pearl above the iceberg! Jump, then once more ⬆️⬆️')); Q.hintT = now + 5;
  }
}
const kfPearlDone = i => Q.pearl[i] || (rsResc().pearls.kelp || []).includes(i);
async function kfFree(remote){
  if(Q.cage) return;
  Q.cage = true; Q.st = 'end'; if(Q.actB) Q.actB.hidden = true;
  if(!remote && Q.mode === 'net') netSend({t:'qkffree'});
  const P = Q.pup, M = Q.kfMom, W = KFW;
  W.sw = 2; W.tied = false; W.buoy.visible = W.rope.visible = false;
  for(const c of W.chunks) kfRoot.remove(c.o);
  W.chunks.length = 0;
  tween(1.2, k => W.swirl.scale.setScalar(Math.max(0.01, 1 - k)), ease.io).then(() => { W.swirl.visible = false; });
  for(const s of rsBoth()) s.hold = false;
  mgHint(L('Спасли! Водоворот стих, и мама услышала! 💗', 'Saved! The whirlpool calmed down, and mum heard! 💗')); sfx.good();
  Q.photoX = KF.momTo - 1.8;
  for(const p of [Q.me, Q.pal]) if(p && rsLocal(p) && !p.gone){ p.auto = p.role === 'jump' ? KF.momTo - 3.2 : KF.momTo - 4.4; if(p.bub) rsRevive(p); }
  await wait(0.6); if(!Q) return;
  M.o.visible = true; M.tx = KF.momTo; M.tz = 0.35; sfx.splash();
  floatText(L('Пуговка!', 'Button!'), rsAt(KF.mom - 1, 1.4), '#D9527E');
  await wait(2); if(!Q) return;
  P.tx = KF.momTo; P.happy = now + 1;
  await wait(0.8); if(!Q) return;
  P.onMom = true; sfx.purr(); sfx.hug();
  burst(TEX.heart, rsAt(KF.momTo, 0.4), 18, 2.4, 0.34);
  floatText(L('Мама!', 'Mum!'), rsAt(KF.momTo, 1.4), '#D9527E');
  floatText(L('Держись за мою лапку 💗', 'Hold my paw 💗'), rsAt(KF.momTo, 2.2), '#D9527E');
  for(const p of [Q.me, Q.pal]) if(p && !p.gone){ p.m.flap = 1; setMood(p.m, 'happy'); }
  await wait(2.4); if(!Q) return;
  Q.end = 'win';
}

/* ---------- Пинг в море ---------- */
function kfAI(p, dt){ return p.role === 'jump' ? kfAIJ(p) : kfAIS(p); }
// Силач: рычаг на дне, под льдину, под течением глубоко, корешок
function kfAIS(p){
  const me = Q.me, W = KFW, K = KF;
  if(Q.cage) return {tx:p.x};
  if(!W.levers[0].on){
    const l = K.levers[0];
    if(Math.abs(p.x - l.x) < 0.5 && p.y < -3.9) rsLever(0);
    return {tx:l.x, dive:p.inW};
  }
  if(p.x < K.sheet[0] - 1.2){
    if(!W.levers[1].on || W.gate.k < 0.9) return {tx:Math.max(p.x, 15.2)};   // ждём у айсберга
    return {tx:K.sheet[0] + 1, dive:p.inW && p.x > 15};                      // под айсберг и под льдину
  }
  if(p.x < K.flow[1] + 0.5){
    if(!kfPearlDone(1) && p.x > K.flow[0]){ const P = K.pearls[1]; return {tx:P.x, dive:true}; }
    return {tx:K.flow[1] + 2, dive:p.inW && p.x < K.flow[1]};
  }
  if(W.knot < KF_KNOT){
    const n = K.knot, at = Math.abs(p.x - n.x) < 0.6 && p.y < -3.8;
    return {tx:n.x, dive:true, act:at ? 'knot' : null};
  }
  if(W.sw === 1){   // толкать Пуговку к айсбергу, от льдинок — вниз или вверх
    const P = Q.pup, c = W.chunks.find(o => o.x > p.x && o.x - p.x < 2.6 && Math.abs(o.y - (p.y + 0.4)) < 0.9);
    const at = Math.abs(p.x - (P.x + 0.5)) < 0.9 && p.y < -0.6 && p.y > -2.4;
    return {tx:P.x + 0.6, dive:c ? c.y > p.y : p.y > -1.2, act:at && now - (p.aiPush || 0) > 0.3 ? (p.aiPush = now, 'push') : null};
  }
  return {tx:Math.min(me.x - 1.2, 54)};
}
// Прыгун: на айсберг к рычагу, по толстой льдине, по льдинкам через течение, к колокольчику
function kfAIJ(p){
  const me = Q.me, W = KFW, K = KF;
  if(Q.cage) return {tx:p.x};
  const onTop = b => p.ground && !p.air && Math.abs(p.y - b[3]) < 0.05 && p.x > b[0] - 0.3 && p.x < b[1] + 0.3;
  if(p.x < K.wall.x1 + 0.3 && W.wall.k < 0.9) return {tx:10.5};
  if(!W.levers[1].on){
    const l = K.levers[1];
    if(onTop(K.berg)){ if(Math.abs(p.x - l.x) < 0.5) rsLever(1); return {tx:l.x}; }
    return {tx:K.berg[0] + 0.5, up:true};   // у айсберга сам выпрыгнет (kfPre), на макушке — ещё раз
  }
  if(p.x < K.sheet[1] - 0.3){
    if(onTop(K.berg)) return {tx:K.sheet[0] + 1.5, jump:p.x > K.berg[1] - 0.45, up:true};
    return {tx:K.sheet[1] - 0.2, up:true};
  }
  if(p.x < K.flow[1] + 0.5){
    if(onTop(K.sheet)) return {tx:K.floes[0][0] + 0.8, jump:p.x > K.sheet[1] - 0.15, up:true};
    for(let i = 0; i < K.floes.length; i++){
      const f = K.floes[i], nx = K.floes[i + 1];
      if(onTop(f)) return nx ? {tx:nx[0] + 0.7, jump:p.x > f[1] - 0.3, up:true} : {tx:K.berg2[0] - 0.8, jump:p.x > f[1] - 0.3};
    }
    if(p.air) return {tx:p.x + 1.5, up:true};
    return {tx:p.x - 1, up:true};   // в воде: течение несёт к льдинке — выпрыгнет на неё
  }
  if(!W.rung || W.sw === 1){
    if(onTop(K.berg2)){
      if(!W.rung) return {tx:K.bell.x, act:Math.abs(p.x - K.bell.x) < 0.5 ? 'bell' : null};
      if(!W.tied) return {tx:p.x, act:'buoy'};
      return p.hold ? {tx:p.x} : {tx:p.x, act:'hold'};
    }
    return {tx:K.berg2[0] + 0.5, up:true};
  }
  return {tx:p.x};
}

/* ---------- подсказки ---------- */
function kfSec(p){
  if(Q.cage) return 7;
  const x = p.x, W = KFW;
  if(W.sw === 1) return W.tied ? 9 : 8;
  if(x > KF.flow[1] + 0.5) return 6;
  if(x > KF.flow[0] - 0.5) return 5;
  if(x > KF.sheet[0] - 0.5) return W.levers[1].on ? 4 : 3;
  if(x > KF.wall.x1) return W.levers[1].on ? 4 : 3;
  if(x > 4.2) return W.levers[0].on ? 10 : 1;
  return 0;
}
function kfHint(sec, role){
  const n = Q.pal && !Q.pal.gone ? Q.pal.name : '', J = role === 'jump', solo = Q.mode === 'solo';
  const nJ = solo ? L('Прыгун', 'the jumper') : n, nS = solo ? L('Силач', 'the strong one') : n;
  switch(sec){
    case 0: return L('Калан-малыш Пуговка потерялся в подводном лесу! Силач ныряет ⬇️, Прыгун высоко выпрыгивает из воды ⬆️⬆️', 'Button the baby sea otter is lost in the kelp forest! The strong one dives ⬇️, the jumper leaps high out of the water ⬆️⬆️');
    case 1: return J ? L(`Ледяная стена до самого дна! ${nS} нырнёт и потянет рычаг на дне`, `An ice wall down to the bottom! ${nS} dives and pulls the lever on the seabed`)
      : L('Ледяная стена до самого дна! Нырни ⬇️ и потяни рычаг на дне 🔧', 'An ice wall down to the bottom! Dive ⬇️ and pull the lever on the seabed 🔧');
    case 3: return J ? L(`Запрыгни на айсберг: из воды ⬆️ и ещё раз ⬆️. Потяни рычаг 🔧 — водоросли подо льдом откроются для ${nS}`, `Jump onto the iceberg: out of the water ⬆️ and again ⬆️. Pull the lever 🔧 — the kelp under the ice opens for ${nS}`)
      : L(`Подо льдом — ворота из водорослей. ${nJ} откроет их рычагом на айсберге, а ты ныряй под айсберг ⬇️`, `Kelp gates under the ice. ${nJ} opens them with the lever on the iceberg — you dive under the iceberg ⬇️`);
    case 4: return J ? L('Толстая льдина! Запрыгни наверх и иди по ней ➡️', 'Thick ice! Jump on top and walk across ➡️')
      : L('Нырни под айсберг и толстую льдину ⬇️ и плыви ➡️', 'Dive under the iceberg and the thick ice ⬇️ and swim ➡️');
    case 5: return J ? L('Сильное течение! Прыгай с льдинки на льдинку ⬆️', 'A strong current! Hop from floe to floe ⬆️')
      : L('Наверху сильное течение! Нырни поглубже ⬇️ — там тихо', 'A strong current up top! Dive deeper ⬇️ — it\'s calm down there');
    case 6: return J ? L(`Пуговка запутался! Запрыгни на айсберг и позвони в колокольчик 🔔 — мама услышит. А ${nS} распутает водоросли`, `Button is tangled! Jump onto the iceberg and ring the bell 🔔 — mum will hear. ${nS} untangles the kelp`)
      : L(`Пуговку держат водоросли! Нырни к корешку на дне и распутай 🌿🌿🌿. А ${nJ} позовёт маму колокольчиком`, `Kelp is holding Button! Dive to the root on the seabed and untangle it 🌿🌿🌿. ${nJ} calls mum with the bell`);
    case 7: return L('Пуговка нашёл маму! 💗', 'Button found his mum! 💗');
    case 8: return J ? L('Пуговку уносит к водовороту! Брось ему круг 🛟 с айсберга', 'Button is being pulled to the whirlpool! Throw him the ring 🛟 from the iceberg')
      : L(`Пуговку уносит к водовороту! Толкай его к айсбергу 💪, а ${nJ} бросит круг. Берегись льдинок!`, `Button is being pulled to the whirlpool! Push him to the iceberg 💪 — ${nJ} throws the ring. Watch out for ice chunks!`);
    case 9: return J ? L(`Держи верёвку 🪢 — пока держишь, течение тянет слабее. А ${nS} толкает Пуговку 💪`, `Hold the rope 🪢 — while you hold, the current pulls weaker. ${nS} pushes Button 💪`)
      : L('Нырни к Пуговке и толкай его к айсбергу 💪💪💪. Льдинки — проплывай сверху или снизу', 'Swim to Button and push him to the iceberg 💪💪💪. Dodge the ice chunks above or below');
  }
  return '';
}
function kfStuck(dt){
  const me = Q.me, pal = Q.pal; if(!pal || pal.gone || Q.mode === 'solo' || me.bub) return;
  let key = '', say = '';
  if(KFW.sw === 1 && me.role === 'strong' && KFW.tied && !pal.hold){ key = 'stuckH'; say = L('Толкай! А верёвку сейчас подержат 🪢', 'Keep pushing! Someone will hold the rope soon 🪢'); }
  else if(KFW.sw === 1 && me.role === 'jump' && KFW.tied && !me.hold){ key = 'stuckJ'; say = L('Держи верёвку 🪢 — иначе течение снова тянет!', 'Hold the rope 🪢 — or the current pulls again!'); }
  else if(me.x > KF.flow[1] + 0.5 && !Q.cage && KFW.knot >= KF_KNOT && !KFW.rung && me.role === 'strong'){ key = 'stuckK'; say = L(`Распутали! Теперь ${pal.name} позвонит в колокольчик 🔔`, `Untangled! Now ${pal.name} rings the bell 🔔`); }
  Q.stuckT = say ? (Q.stuckT || 0) + dt : 0;
  if(Q.stuckT > 2 && !Q.said.has(key)){ Q.said.add(key); mgHint(say); Q.hintT = now + 5; }
}
function kfCam(){
  const me = Q.me;
  if(Q.cage) return null;
  if(KFW.sw === 1) return [(KF.berg2[0] + KF.swirl.x)/2, -0.6, 1.25];
  if(me.x > KF.flow[1] + 0.5) return [(KF.bell.x + KF.knot.x)/2, -0.6, 1.2];
  return null;
}
function kfWire(){
  netOn('qknot', m => { if(Q && Q.L.id === 'kelp') kfKnot(true, m.n); });
  netOn('qbell', () => { if(Q && Q.L.id === 'kelp') kfBell(true); });
  netOn('qkffree', () => { if(Q && Q.L.id === 'kelp') kfFree(true); });
  const on = (t, f) => netOn(t, m => { if(Q && Q.L.id === 'kelp') f(m); });
  on('qkfsw', () => kfSwirl(true));
  on('qkfpup', m => { if(Q.pup && KFW.sw === 1) Q.pup.x = m.x; });
  on('qkfch', m => kfChunk(m.id, m.y, true));
  on('qkfbuoy', () => kfBuoy(true));
  on('qkfpush', () => kfPush(true));
}

RS_LVS.kelp = {id:'kelp', ic:'🌿', name:() => L('Подводный лес', 'Kelp forest'),
  say:() => L('Калан-малыш запутался в водорослях. Силач ныряет, Прыгун выпрыгивает высоко: стена до дна, толстая льдина, течение — и колокольчик для мамы.', 'A baby sea otter is tangled in the kelp. The strong one dives, the jumper leaps high: a wall to the seabed, thick ice, a current — and a bell for mum.'),
  root:kfRoot, ground:KF.ground, walls:KF.walls, more:[KF.berg, KF.berg2, KF.sheet, ...KF.floes], water:KF.water,
  pearls:KF.pearls, pearlO:null,
  W:() => KFW, build:kfBuild, reset:kfReset, solids:kfSolids, world:kfWorld, pre:kfPre, flow:kfFlow, lever:kfLever,
  act:kfAct, doAct:kfDoAct, cam:kfCam,
  ai:kfAI, sec:kfSec, hint:kfHint, step:kfStep, stuck:kfStuck, wire:kfWire,
  setup:kfSetup,
  clean(){ if(Q.pup) kfRoot.remove(Q.pup.o); if(Q.kfMom) kfRoot.remove(Q.kfMom.o); for(const c of KFW.chunks) kfRoot.remove(c.o); KFW.chunks.length = 0; },
  endX:KF.momTo - 1.8, photoY:-0.2,
  photo:() => L('Пуговка и мама-калан', 'Button and his sea otter mum'),
  endTtl:() => L('Пуговка нашёл маму! 💗', 'Button found his mum! 💗'),
  endSay:() => L('Малыш-калан снова держит маму за лапку — всё благодаря вам 🦦', 'The baby otter is holding mum\'s paw again — all thanks to you 🦦')
};
