/* ---------------- «Спасаем потеряшку», уровень 3: «Метель» (идеи папы 25–26.09: «Рация / Навигатор») ----------------
   Пипа нашлась, но её мама ушла искать её в метель. Пипа едет у Силача на спине, идём вместе, вид сбоку.
   Метель — белая пелена: видно только рядом с тюленями, у зажжённых фонариков 🏮 и у звёздочек ⭐.
     🏮 фонарики — коснулся, и вокруг светло (и для напарника тоже);
     💨 ветер — порывами сдувает Прыгуна назад, а Силача почти нет: Прыгун идёт прямо за Силачом и прячется от ветра;
     🔭 вышка и невидимые льдины — Прыгун залезает на вышку (прыжок, ещё раз в воздухе — на ступеньку, так же — наверх),
        смотрит в подзорную трубу: ему видно всю воду, и касанием он ставит на льдины звёздочки ⭐ — они светятся
        сквозь метель у обоих. Силач прыгает по звёздочкам (упал — не страшно: выплыл и назад). На том берегу рычаг
        поднимает ледяной мост — для всех;
     ⛏️ завал — копает только Силач (несколько нажатий);
     🔥 маяк — две плиты сразу: маяк загорается, метель стихает — и видно трёх пингвинов. Пипа говорит приметы мамы.
   3 жемчужинки 🦪: на дне у льдин (Силач ныряет, пока не подняли мост), над вышкой (Прыгун — прыжок с вышки),
   над завалом (Прыгун — с головы Силача).
   Сеть: фонарик — bzl, звёздочка — bzf, копнул — bzd, маяк — bzb, мама — bzm; рычаг моста — общий qlv.
   Подключается после grotto.js. */
const BZ = {
  ground:[[-3, 35.5, -3.2, 0], [48.5, 74, -3.2, 0]],
  walls:[[-2.2, -1, 0, 7], [72.4, 74, 0, 9], [35.5, 48.5, -4.4, -3.2]],   // края и дно у льдин
  water:[35.5, 48.5],
  lamps:[10.5, 16, 23.5, 28.4, 51.6, 57.8],
  wind:[18.5, 30.2],
  step:[30.4, 31.6, 1.95, 2.25],       // ступенька вышки (на неё встают сверху, снизу проходят насквозь)
  nest:[32.4, 34.6, 3.95, 4.25],       // площадка наверху
  scope:33.9,                          // подзорная труба
  floes:[[36.3, 37.4, 0.3], [38.6, 39.6, 0.9], [40.9, 42.0, 0.4], [43.2, 44.3, 1.0], [45.5, 46.6, 0.5]],
  sway:2,                              // эта льдина плавает туда-сюда
  lever:{x:49.6, y:0},
  wall:{x0:55, x1:56.4, h:3.2},
  plates:[{x:59.6, y:0}, {x:63.4, y:0}],
  beacon:61.5,
  moms:[66.4, 68.5, 70.6],
  pearls:[{x:42.3, y:-2.75}, {x:33.2, y:6.3}, {x:55.7, y:3.95}]   // на дне, над вышкой, над завалом
};
const BZ_GUST = {calm:2.4, warn:0.9, blow:1.8, jump:3.2, strong:1.0};
const BZ_PAT = [{p:'stripes', w:() => L('в полоску', 'striped')}, {p:'dots', w:() => L('в горошек', 'polka-dot')}, {p:'hearts', w:() => L('в сердечках', 'with hearts')}];
const BZ_LIGHT = {me:1.55, pal:1.25, lamp:2.5, star:1.0, fire:1.6};

/* ---------- постройка ---------- */
const bzRoot = new THREE.Group(); bzRoot.visible = false; scene.add(bzRoot);
const BZW = {};
let bzBuilt = false;
function bzBox(x0, x1, y0, y1, mat, zd = 1.1){ return rsBox(x0, x1, y0, y1, mat, zd, bzRoot); }
const BZ_MAT = {post:toon(0xC9A479), lamp:toon(0xFFF3C4), lit:new THREE.MeshBasicMaterial({color:0xFFD66B}), fire:new THREE.MeshBasicMaterial({color:0xFFA552}),
  fire2:new THREE.MeshBasicMaterial({color:0xFFE08A}), stone:toon(0xAFC3D8), tent:toon(0xFF9BB8), snowwall:toon(0xFFFFFF), hill:toon(0xEAF4FB)};
function bzGlow(col, s){ const g = glow(col, s); return g; }
function bzBuild(){
  if(bzBuilt) return; bzBuilt = true;
  const G = BZ, R = rsRand(11);
  // даль: снежные холмы и ледяные ёлочки
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(240, 60), toon(0x7FB9DA)); sea.position.copy(rsAt(34, RS_WS - 30, -6)); bzRoot.add(sea);
  const far = new THREE.Mesh(new THREE.PlaneGeometry(240, 80), BZ_MAT.hill); far.rotation.x = -Math.PI/2; far.position.copy(rsAt(34, -0.05, -46)); bzRoot.add(far);
  for(let x = -8; x < 80; x += 6 + R()*5){
    const s = 2 + R()*2.4, b = addOutline(new THREE.Mesh(new THREE.ConeGeometry(s, s*1.2, 7), BZ_MAT.hill), 1.03); b.position.copy(rsAt(x, s*0.4, -18 - R()*14)); bzRoot.add(b);
  }
  for(let x = -4; x < 76; x += 3 + R()*4){
    const h = 1 + R()*1.2, t = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.4 + R()*0.2, h, 6), toon(0xCFE8F5)), 1.06); t.position.copy(rsAt(x, h/2, -2.6 - R()*3)); bzRoot.add(t);
  }
  for(const g of G.ground){ bzBox(g[0], g[1], g[2], g[3], RS_MAT.ice); bzBox(g[0] + 0.02, g[1] - 0.02, g[3] - 0.02, g[3] + 0.1, RS_MAT.snow, 1.14); }
  for(const w of G.walls) bzBox(w[0], w[1], w[2], w[3], RS_MAT.cliff);
  // лагерь на старте: палатка и костёр
  const tent = addOutline(new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.5, 4), BZ_MAT.tent), 1.04); tent.rotation.y = Math.PI/4; tent.position.copy(rsAt(1.4, 0.75, -1.2)); bzRoot.add(tent);
  const camp = bzFire(); camp.position.copy(rsAt(4.2, 0, -0.4)); bzRoot.add(camp);
  // вода у льдин
  const [wx0, wx1] = G.water, wm = new THREE.Mesh(new THREE.BoxGeometry(wx1 - wx0, RS_WS + 3.2, 2.4), RS_WATER);
  wm.position.copy(rsAt((wx0 + wx1)/2, (RS_WS - 3.2)/2)); wm.renderOrder = 2; bzRoot.add(wm);
  const foam = new THREE.Mesh(new THREE.BoxGeometry(wx1 - wx0, 0.06, 2.42), new THREE.MeshBasicMaterial({color:0xEAF7FB, transparent:true, opacity:0.8}));
  foam.position.copy(rsAt((wx0 + wx1)/2, RS_WS)); bzRoot.add(foam); BZW.foam = foam;
  // вышка: столб позади, ступенька, площадка, подзорная труба
  bzBox(33.35, 33.65, 0, G.nest[2], BZ_MAT.post, 0.15).position.z -= 0.9;
  for(const s of [G.step, G.nest]){ bzBox(s[0], s[1], s[2], s[3], RS_MAT.ice); bzBox(s[0] + 0.02, s[1] - 0.02, s[3] - 0.02, s[3] + 0.1, RS_MAT.snow, 1.14); }
  bzBox(31.0, 31.1, 0, G.step[2], BZ_MAT.post, 0.12).position.z -= 0.8;
  const sc = new THREE.Group(); sc.position.copy(rsAt(G.scope, G.nest[3], -0.5)); bzRoot.add(sc);
  const leg = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.6, 6), BZ_MAT.post), 1.2); leg.position.y = 0.3; sc.add(leg);
  const tube = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.11, 0.6, 10), toon(0xFFD66B)), 1.1); tube.rotation.z = -1.2; tube.position.set(0.12, 0.66, 0); sc.add(tube);
  BZW.scope = sc;
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.32), new THREE.MeshBasicMaterial({color:0xFF9BB8, side:THREE.DoubleSide})); flag.position.copy(rsAt(33.8, G.nest[3] + 1.9, -0.9)); bzRoot.add(flag); BZW.flag = flag;
  const fp = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.9, 6), BZ_MAT.post), 1.2); fp.position.copy(rsAt(33.5, G.nest[3] + 1.0, -0.9)); bzRoot.add(fp);
  // льдины (в метели их не видно) и звёздочки над ними
  const starMat = () => new THREE.SpriteMaterial({map:TEX.star, transparent:true, depthWrite:false});
  BZW.floes = G.floes.map(([x0, x1, y], i) => {
    const o = new THREE.Group(); bzRoot.add(o);
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.35, 1.9), RS_MAT.ice); m.add(new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 + 0.08, 0.43, 1.98), outlineMat)); m.position.y = -0.175; o.add(m);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 - 0.06, 0.08, 1.86), RS_MAT.snow); cap.position.y = 0.02; o.add(cap);
    const st = new THREE.Sprite(starMat()); st.scale.setScalar(0.55); st.position.set(0, 0.9, 0.3); st.visible = false; o.add(st);
    return {i, x0, x1, y, w:x1 - x0, cx:(x0 + x1)/2, o, st, on:false, k:1, s:{x0, x1, y0:y - 0.35, y1:y, k:'floe', v:0, one:true, fi:i}};
  });
  // ледяной мост (поднимается рычагом на том берегу)
  BZW.bridge = {o:bzBox(G.water[0], G.water[1], -0.4, 0, RS_MAT.gate, 1.0), k:0, s:{x0:G.water[0], x1:G.water[1], y0:-0.4, y1:0, k:'bridge'}};
  BZW.levers = [rsLeverObj(G.lever, bzRoot)];
  // фонарики
  BZW.lamps = G.lamps.map(x => {
    const g = new THREE.Group(); g.position.copy(rsAt(x, 0, -0.55)); bzRoot.add(g);
    const p = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.3, 8), BZ_MAT.post), 1.15); p.position.y = 0.65; g.add(p);
    const l = addOutline(new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, 0.28), BZ_MAT.lamp), 1.08); l.position.y = 1.45; g.add(l);
    const roof = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.18, 4), toon(0xFF9BB8)), 1.1); roof.rotation.y = Math.PI/4; roof.position.y = 1.71; g.add(roof);
    const gl = bzGlow(0xFFE9A0, 2.2); gl.position.y = 1.45; gl.visible = false; g.add(gl);
    return {x, g, l, gl, on:false};
  });
  // завал из снега
  const W = G.wall; BZW.wall = {o:bzBox(W.x0, W.x1, 0, W.h, BZ_MAT.snowwall, 1.05), n:0, s:{x0:W.x0, x1:W.x1, y0:0, y1:W.h, k:'wall'}};
  // маяк на двух плитах
  const bc = new THREE.Group(); bc.position.copy(rsAt(G.beacon, 0, -0.4)); bzRoot.add(bc);
  const base = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 1.1, 10), BZ_MAT.stone), 1.05); base.position.y = 0.55; bc.add(base);
  const bowl = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.45, 0.4, 12), toon(0xC9A479)), 1.06); bowl.position.y = 1.3; bc.add(bowl);
  const fire = bzFire(true); fire.position.y = 1.4; fire.visible = false; bc.add(fire);
  BZW.beacon = {g:bc, fire, lit:false};
  BZW.plates = G.plates.map(p => {
    const o = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 0.14, 24), RS_MAT.plate), 1.08);
    o.scale.z = 0.8; o.position.copy(rsAt(p.x, p.y + 0.07, 0.2)); bzRoot.add(o);
    return {...p, o, on:false};
  });
  BZW.gust = {st:'calm', t:0};
  RS_LVS.snow.pearlO = rsPearlsBuild(RS_LVS.snow);
}
function bzFire(big){   // костёр: поленья и огонёк
  const g = new THREE.Group(), s = big ? 1.3 : 1;
  for(const r of [-0.5, 0.5]){ const l = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.07*s, 0.07*s, 0.6*s, 6), BZ_MAT.post), 1.15); l.rotation.set(Math.PI/2, 0, 0); l.rotation.y = r; l.position.y = 0.07*s; g.add(l); }
  const f1 = new THREE.Mesh(new THREE.ConeGeometry(0.22*s, 0.55*s, 8), BZ_MAT.fire); f1.position.y = 0.35*s; g.add(f1);
  const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.12*s, 0.32*s, 8), BZ_MAT.fire2); f2.position.y = 0.3*s; f2.position.z = 0.06; g.add(f2);
  const gl = bzGlow(0xFFD08A, 1.8*s); gl.position.y = 0.35*s; g.add(gl);
  g.userData.f = [f1, f2];
  return g;
}
function bzReset(){
  for(const f of BZW.floes){ f.on = false; f.st.visible = false; f.k = 1; f.o.visible = true; f.o.scale.setScalar(1); }
  const b = BZW.bridge; b.k = 0;
  BZW.levers[0].on = false; BZW.levers[0].arm.rotation.z = 0.7;
  for(const l of BZW.lamps){ l.on = false; l.gl.visible = false; l.l.material = BZ_MAT.lamp; }
  const w = BZW.wall; w.n = 0; w.o.visible = true; w.o.scale.y = 1; w.s.y1 = BZ.wall.h;
  BZW.beacon.lit = false; BZW.beacon.fire.visible = false;
  for(const p of BZW.plates){ p.on = false; p.o.material = RS_MAT.plate; }
  BZW.gust = {st:'calm', t:0};
  BZW.calm = 0;
  bzSync();
}
function bzSync(){
  for(const f of BZW.floes){
    const sw = f.i === BZ.sway ? Math.sin(now*0.9)*0.55 : 0;
    const x0 = f.x0 + sw;
    f.s.v = f.i === BZ.sway ? Math.cos(now*0.9)*0.55*0.9 : 0;
    f.s.x0 = x0; f.s.x1 = x0 + f.w; f.cx = x0 + f.w/2;
    f.o.position.copy(rsAt(f.cx, f.y + Math.sin(now*1.8 + f.i)*0.02 - (1 - f.k)*0.6, 0));
  }
  const b = BZW.bridge, top = -1.3*(1 - b.k);
  b.o.position.y = RS_POS.y + top - 0.2;
  const w = BZW.wall, h = BZ.wall.h*(1 - w.n/3);
  w.s.y1 = h; w.o.scale.y = Math.max(0.001, 1 - w.n/3); w.o.position.y = RS_POS.y + h/2; w.o.visible = w.n < 3;
}

/* ---------- состояние уровня ---------- */
const bzBridge = () => BZW.bridge.k >= 1;
const bzPearlDone = i => Q.pearl[i] || (rsResc().pearls.snow || []).includes(i);
const bzStrong = () => [Q.me, Q.pal].find(p => p && p.role === 'strong');
function bzSheltered(p){   // Прыгун прячется за Силачом: Силач чуть впереди (правее) и рядом
  return rsBoth().some(o => o !== p && o.role === 'strong' && !o.bub && o.x - p.x > 0.15 && o.x - p.x < 1.7 && Math.abs(o.y - p.y) < 0.7);
}
const bzInWind = p => p.x > BZ.wind[0] && p.x < BZ.wind[1] && p.y < 1.6;
function bzProg(p){   // где идёт по льдинам: −1 — наш берег, 0…4 — льдина, 5 — тот берег
  if(p.x > BZ.water[1] - 0.2 && !p.inW) return p.bzp = 5;
  if(p.ground && p.ground.k === 'floe') return p.bzp = p.ground.fi;
  if(p.x < BZ.water[0] + 0.1 && !p.inW && p.y > -0.1) return p.bzp = -1;
  return p.bzp != null ? p.bzp : -1;
}

/* ---------- мир: ветер, фонарики, льдины, мост, плиты, маяк ---------- */
function bzSolids(out){
  const W = BZW;
  out.push({x0:BZ.step[0], x1:BZ.step[1], y0:BZ.step[2], y1:BZ.step[3], k:'step', one:true});
  out.push({x0:BZ.nest[0], x1:BZ.nest[1], y0:BZ.nest[2], y1:BZ.nest[3], k:'nest', one:true});
  if(!bzBridge()) for(const f of W.floes) out.push(f.s);
  else out.push(W.bridge.s);
  if(W.wall.n < 3) out.push(W.wall.s);
}
function bzWorld(dt){
  const W = BZW, G = W.gust;
  // ветер: тихо → «💨» (скоро порыв) → порыв
  const inZone = rsBoth().some(bzInWind);
  G.t += dt;
  if(G.st === 'calm' && G.t > BZ_GUST.calm && inZone){ G.st = 'warn'; G.t = 0; for(const p of rsBoth()) if(bzInWind(p)) floatText('💨', rsAt(p.x + 2.4, p.y + 1.5), '#6B9BC8'); sfx.tick(); }
  else if(G.st === 'warn' && G.t > BZ_GUST.warn){ G.st = 'blow'; G.t = 0; if(inZone) sfx.whoosh(); }
  else if(G.st === 'blow' && G.t > BZ_GUST.blow){ G.st = 'calm'; G.t = 0; }
  // фонарики: коснулся — горит (по сети каждый зажигает своим тюленем и говорит другому)
  W.lamps.forEach((l, i) => { if(!l.on && [Q.me, Q.pal].some(p => p && rsLocal(p) && !p.gone && !p.bub && Math.abs(p.x - l.x) < 0.8 && p.y < 1.6)) bzLamp(i); });
  // мост: рычаг на том берегу
  const b = W.bridge;
  if(W.levers[0].on && b.k < 1){
    b.k = Math.min(1, b.k + dt*0.8);
    if(b.k >= 1){   // мост поднялся: кто в воде — на мост; льдины тают
      sfx.thud();
      for(const p of [Q.me, Q.pal]) if(p && rsLocal(p) && p.x > BZ.water[0] && p.x < BZ.water[1] && p.y < 0.1){ p.y = 0; p.vy = 0; p.inW = false; p.air = false; }
      for(const f of W.floes){ f.st.visible = false; burst(TEX.puff, rsAt(f.cx, f.y), 5, 1.2, 0.3); }
    }
  }
  for(const f of W.floes){ if(bzBridge()) f.k = Math.max(0, f.k - dt*1.5); f.o.visible = f.k > 0.01; f.o.scale.setScalar(Math.max(0.01, 0.4 + f.k*0.6)); }
  // плиты у маяка: обе сразу — маяк горит
  for(const p of W.plates){
    const on = rsBoth().some(s => rsOnPlate(s, p));
    if(on !== p.on){ p.on = on; p.o.material = on ? RS_MAT.on : RS_MAT.plate; if(on) sfx.tick(); }
    p.o.position.y = RS_POS.y + p.y + (p.on ? 0.03 : 0.07);
  }
  if(!W.beacon.lit && W.plates.every(p => p.on) && Q.st === 'go') bzBeacon();
  if(W.beacon.lit) W.calm = Math.min(1, W.calm + dt*0.5);
  // огоньки дрожат
  for(const g of [W.beacon.fire]) if(g.visible) g.userData.f.forEach((f, i) => f.scale.set(1 + Math.sin(now*9 + i)*0.08, 1 + Math.sin(now*11 + i*2)*0.14, 1));
  W.flag.rotation.y = Math.sin(now*(G.st === 'blow' ? 12 : 4))*0.4;
  W.foam.position.y = RS_POS.y + RS_WS + Math.sin(now*2)*0.02;
  bzSync();
}
// ветер дует в спину… то есть в нос: толкает назад (влево). Без напарника Прыгун сам держится за Силачом
function bzPre(h){
  const W = BZW, me = Q.me, pal = Q.pal;
  // без напарника: Прыгун держится за Силачом через весь ветер (подведи Силача к нему — и вперёд)
  if(Q.mode === 'solo' && pal && pal.kind === 'idle' && pal.role === 'jump' && me.role === 'strong' && !pal.bub && pal.y < 1.6
    && pal.x > BZ.wind[0] - 2.5 && pal.x < BZ.wind[1] && me.x - pal.x > 0.2 && me.x - pal.x < 3){
    const d = me.x - 0.8 - pal.x; pal.x += Math.sign(d)*Math.min(Math.abs(d), 3.4*h); if(Math.abs(d) > 0.05) pal.face = Math.sign(d);
  }
  if(W.gust.st !== 'blow') return;
  for(const p of [me, pal]){
    if(!p || !rsLocal(p) || p.gone || p.bub || !bzInWind(p)) continue;
    if(p.role === 'jump'){
      if(bzSheltered(p)){ if(Math.random() < h*2 && p === me) floatText('🛡️', rsAt(p.x, p.y + 1.3)); continue; }
      p.x -= BZ_GUST.jump*h; if(p.vx > 0) p.vx *= 0.5;
      if(p === me && !Q.said.has('blown')){ Q.said.add('blown'); mgHint(L('Уф, сдуло! Спрячься за Силачом — иди прямо за ним 💪', 'Whoa, blown back! Hide behind the strong one — walk right behind 💪')); Q.hintT = now + 4; }
    } else p.x -= BZ_GUST.strong*h;
  }
}
// течение у льдин тянет к нашему берегу (нырнул — не мешает)
function bzFlow(p){ if(p.dive) return 0; return Math.max(-0.7, Math.min(0, (BZ.water[0] + 0.6 - p.x)*0.25)); }
function bzLamp(i, remote){
  const l = BZW.lamps[i]; if(!l || l.on) return;
  l.on = true; l.gl.visible = true; l.l.material = BZ_MAT.lit;
  sfx.ding(); burst(TEX.star, rsAt(l.x, 1.5, -0.4), 8, 1.4, 0.2);
  if(!remote && Q.mode === 'net') netSend({t:'bzl', i});
  if(!Q.said.has('lamp1')){ Q.said.add('lamp1'); floatText(L('Светло! 🏮', 'Light! 🏮'), rsAt(l.x, 2.2), '#E0A21B'); }
}
function bzStar(i, remote, on){
  const f = BZW.floes[i]; if(!f || bzBridge()) return;
  f.on = on != null ? on : !f.on; f.st.visible = f.on;
  if(f.on){ sfx.sparkle(); burst(TEX.star, rsAt(f.cx, f.y + 0.9, 0.3), 6, 1.2, 0.18); } else sfx.tick();
  if(!remote && Q.mode === 'net') netSend({t:'bzf', i, on:f.on});
}
function bzDig(remote, n){
  const w = BZW.wall; if(w.n >= 3) return;
  w.n = n != null ? Math.max(w.n, n) : w.n + 1;
  sfx.thud(); burst(TEX.puff, rsAt(BZ.wall.x0, BZ.wall.h*(1 - w.n/3) + 0.3, 0.5), 10, 1.8, 0.45);
  if(w.n >= 3){ floatText(L('Раскопали! ⛏️', 'Dug through! ⛏️'), rsAt(BZ.wall.x0 + 0.7, 1.6), '#3E8DB8'); sfx.good(); Q.hintT = 0; }
  else floatText(L(['Копаю!', 'Ещё!'], ['Digging!', 'More!'])[w.n - 1], rsAt(BZ.wall.x0 - 0.3, 2.2), '#3E8DB8');
  if(!remote && Q.mode === 'net') netSend({t:'bzd', n:w.n});
}
function bzBeacon(remote){
  const B = BZW.beacon; if(B.lit) return;
  B.lit = true; B.fire.visible = true; sfx.good(); sfx.sparkle();
  if(!remote && Q.mode === 'net') netSend({t:'bzb'});
  burst(TEX.star, rsAt(BZ.beacon, 2.2, 0), 18, 2.4, 0.3);
  floatText(L('Маяк горит! Метель стихает…', 'The beacon is lit! The blizzard calms…'), rsAt(BZ.beacon, 3.2), '#E0A21B');
  mgHint(L('Метель стихает… Смотрите — пингвины! 🐧', 'The blizzard calms… Look — penguins! 🐧'));
  Q.momAsk = now + 2.6; Q.hintT = now + 3;
}

/* ---------- Пипа на спине у Силача, мамы-пингвины ---------- */
function bzFamily(seed){
  const r = rsRand(seed ^ 0x5eed);
  const ci = Math.floor(r()*RS_SCARF.length), cj = (ci + 1 + Math.floor(r()*(RS_SCARF.length - 1))) % RS_SCARF.length;
  const pi = Math.floor(r()*BZ_PAT.length), pj = (pi + 1 + Math.floor(r()*(BZ_PAT.length - 1))) % BZ_PAT.length;
  const moms = [{c:RS_SCARF[ci], p:BZ_PAT[pi], ok:true}, {c:RS_SCARF[ci], p:BZ_PAT[pj]}, {c:RS_SCARF[cj], p:BZ_PAT[pi]}];
  for(let i = moms.length - 1; i > 0; i--){ const j = Math.floor(r()*(i + 1)); [moms[i], moms[j]] = [moms[j], moms[i]]; }
  return {moms, c:RS_SCARF[ci], p:BZ_PAT[pi]};
}
function bzSetup(fam){
  const f = bzFamily(Q.seed || 1);
  Q.bzFam = f;
  // Пипа: та же, что в гроте (розовый шарфик в горошек)
  const s = makePenguin({name:'', f:true, color:0x5C6FA6});
  setScarf(s, '#FF7A9C', 'dots'); s.scarf.visible = true; s.scarf.scale.setScalar(1);
  Q.pipa = {s, on:null, x:0, y:0, face:1, callT:now + 3};
  bzPipaRide();
  Q.moms = f.moms.map((m, i) => {
    const ps = makePenguin({name:'', f:true, color:0x46557A});
    setScarf(ps, m.c.c, m.p.p); ps.scarf.visible = true; ps.scarf.scale.setScalar(1);
    ps.root.scale.setScalar(RS_SC*1.45); bzRoot.add(ps.root); ps.root.rotation.y = -0.35;   // крупно: узор шарфика должно быть видно
    return {s:ps, ok:!!m.ok, x:BZ.moms[i], tx:null, z:0, zz:0, shakeT:0, hug:false};
  });
  Q.bzLook = false;
}
function bzPipaRide(){   // Пипа сидит на спине у Силача (за ним и ездит)
  const P = Q.pipa, st = bzStrong(); if(!P || !st) return;
  if(P.s.root.parent) P.s.root.parent.remove(P.s.root);
  st.m.root.add(P.s.root); P.on = st;
  P.s.root.scale.setScalar(0.42); P.s.root.position.set(0, 1.45, -0.45); P.s.root.rotation.set(0, 0, 0);
}
function bzClue(){
  const f = Q.bzFam;
  return L(`«У моей мамы ${f.c.w()} шарфик ${f.p.w()}!»`, `“My mum has a ${f.c.w()} ${f.p.w()} scarf!”`);
}
function bzStep(dt, go){
  const P = Q.pipa;
  if(go && Q.momAsk && now > Q.momAsk){ Q.momAsk = 0; Q.asked = true; Q.said.delete('s9' + Q.me.role); rsHintNow(true); Q.hintT = now + 60; sfx.mama(); }
  // Пипа: зовёт маму и болтает ногами
  if(P && P.on && P.on.m){
    P.s.flap = Q.won ? 1 : 0.2 + Math.sin(now*3)*0.1;
    if(!Q.won && now > P.callT){ P.callT = now + 6 + Math.random()*3; const st = P.on; floatText(Q.asked ? '💭' : L('Ма-ма!', 'Mu-um!'), rsAt(st.x, st.y + 1.6), '#6B6A7E'); if(!Q.asked && Q.me.x > 8) sfx.mama(); }
  }
  if(P) updateSeal(P.s, now, dt);
  // на вышке с трубой: выйти, если пошёл или прыгнул
  if(Q.bzLook && (Q.in.dir || Q.me.air || Q.me.bub || !(Q.me.ground && Q.me.ground.k === 'nest'))) bzLookOff();
  if(Q.actB) Q.actB.classList.toggle('look', Q.actB.dataset.k === 'look' && !!Q.bzLook);
  // подсказка у воды: Силач ждёт звёздочек, а Прыгун ещё не на вышке
  const me = Q.me;
  if(go && me.role === 'jump' && !bzBridge() && Q.pal && !Q.pal.gone && Q.mode !== 'solo' && Q.pal.x > 33 && Q.pal.x < 35.6 && me.y < 3.5 && !Q.said.has('navhint')){
    Q.navT = (Q.navT || 0) + dt;
    if(Q.navT > 4){ Q.said.add('navhint'); mgHint(L(`${Q.pal.name} ждёт у воды! Залезь на вышку и поставь звёздочки ⭐`, `${Q.pal.name} is waiting at the water! Climb the tower and place stars ⭐`)); Q.hintT = now + 6; }
  }
}
function bzLookOff(){ Q.bzLook = false; Q.hintT = 0; }
async function bzMom(i, remote){
  const m = Q.moms[i]; if(!m || Q.won || !Q.asked) return;
  if(!remote && Q.mode === 'net') netSend({t:'bzm', i});
  const st = Q.pipa.on || Q.me;
  if(!m.ok){
    sfx.bad(); m.shakeT = now + 0.8;
    floatText(L('Это не моя мама…', 'That\'s not my mum…'), rsAt(st.x, st.y + 1.7), '#6B6A7E');
    wait(0.7).then(() => { if(Q && !Q.won) floatText(L('Но я тоже добрая 🙂', 'But I\'m kind too 🙂'), rsAt(m.x, 2), '#3E8DB8'); });
    return;
  }
  Q.won = true; Q.st = 'end';
  mgHint(L('Мама нашлась! 💗', 'Mum is found! 💗')); sfx.good(); sfx.hug();
  // Пипа спрыгивает со спины и бежит к маме, мама — навстречу
  const P = Q.pipa, from = P.s.root.getWorldPosition(new V3());
  if(P.s.root.parent) P.s.root.parent.remove(P.s.root);
  bzRoot.add(P.s.root); P.s.root.scale.setScalar(RS_SC*0.62); P.on = null;
  const mx = BZ.moms[0] - 0.2;
  Q.moms.forEach(o => { if(o === m) o.tx = mx + 0.5; else { o.z = -1.6; setMood(o.s, 'happy'); } });
  floatText(L('Мама!', 'Mum!'), from.clone().add(new V3(0, 0.9, 0)), '#D9527E');
  const x0 = from.x - RS_POS.x, y0 = from.y - RS_POS.y;
  await tween(1.1, k => { P.s.root.position.copy(rsAt(x0 + (mx - 0.5 - x0)*k, y0*(1 - k) + Math.sin(k*Math.PI)*1.3, 0.2)); P.s.root.rotation.y = 1.1; }, ease.lin);
  if(!Q) return;
  sfx.thud(); P.s.root.rotation.y = 0.9;
  await wait(0.5); if(!Q) return;
  setMood(m.s, 'happy'); setMood(P.s, 'happy'); m.hug = true;
  burst(TEX.heart, rsAt(mx, 1.4), 18, 2.4, 0.34); sfx.purr();
  floatText(L('Пипочка моя!', 'My little Pipa!'), rsAt(mx + 0.5, 2.4), '#D9527E');
  if(Q.mode === 'ping' && Q.pal) floatText(L('Мама! Кря!', 'Mum! Quack!'), rsAt(Q.pal.x, Q.pal.y + 1.7), '#3E8DB8');
  Q.photoX = mx - 1.4;
  for(const p of [Q.me, Q.pal]) if(p && rsLocal(p) && !p.gone){ p.auto = mx - (p.role === 'jump' ? 1.9 : 2.9); if(p.bub) rsRevive(p); }
  await wait(2.6); if(!Q) return;
  Q.end = 'win';
}
function bzMomDraw(m, dt){
  const s = m.s;
  if(m.tx != null) m.x += (m.tx - m.x)*Math.min(1, dt*2);
  m.zz += ((m.z || 0) - m.zz)*Math.min(1, dt*2);
  s.root.position.copy(rsAt(m.x + (m.shakeT > now ? Math.sin(now*30)*0.04 : 0), 0, m.zz));
  const want = m.hug ? -1.1 : -0.35;
  s.root.rotation.y += (want - s.root.rotation.y)*Math.min(1, dt*5);
  if(m.shakeT > now) s.shake = Math.sin(now*25)*0.3; else s.shake *= 0.8;
  updateSeal(s, now + m.x, dt);
}

/* ---------- касания: звёздочки из подзорной трубы, мамы ---------- */
function bzTap(near){
  if(Q.bzLook){
    let best = null, bd = 1e9;   // ближайшая к пальцу льдина
    for(const f of BZW.floes){ const v = rsAt(f.cx, f.y - 0.1); for(let r = 20; r <= 80; r += 10) if(near(v, r)){ if(r < bd){ bd = r; best = f; } break; } }
    if(best){ bzStar(best.i); return true; }
    return false;
  }
  if(Q.asked && !Q.won) for(let i = 0; i < Q.moms.length; i++) if(near(rsAt(Q.moms[i].x, 1.1), 95)){ sfx.tap(); bzMom(i); return true; }
  return false;
}
function bzAct(me){
  if(me.bub) return null;
  if(me.ground && me.ground.k === 'nest' && Math.abs(me.x - BZ.scope) < 0.9 && !bzBridge())
    return {k:'look', ic:'🔭', aria:L('Подзорная труба', 'Telescope')};
  if(BZW.wall.n < 3 && me.x > BZ.wall.x0 - 1.1 && me.x < BZ.wall.x0 && me.y < 0.3 && !me.air){
    if(me.role === 'strong') return {k:'dig', ic:'⛏️', aria:L('Копать', 'Dig')};
  }
  return null;
}
function bzDoAct(p, k){
  if(k === 'look'){
    if(p !== Q.me) return;
    Q.bzLook = !Q.bzLook; sfx.tap();
    if(Q.bzLook){ mgHint(L('Видно все льдины! Нажимай на льдину — поставишь звёздочку ⭐', 'You can see all the ice floes! Tap a floe to place a star ⭐')); Q.hintT = now + 5; }
    else mgHint('');
  } else if(k === 'dig' && p.role === 'strong'){
    if(now - (p.digT || 0) < 0.25) return;
    p.digT = now; p.face = 1; bzDig();
  }
}
// камера: в трубу — вся вода сразу (подальше); в конце — мамы
function bzCam(){
  if(Q.bzLook) return [41.2, 0.6, 1.85];   // и вышка, и вся вода
  if(Q.asked && !Q.won) return [BZ.moms[1], -0.1, 0.8];   // мамы крупно
  return null;
}

/* ---------- пелена метели: белое полотно с «окошками» света ---------- */
const BZ_FLAKES = Array.from({length:80}, () => ({x:Math.random(), y:Math.random(), v:0.5 + Math.random()*0.8, l:6 + Math.random()*10}));
function bzVeil(dt){
  let cv = Q.bzVeil;
  if(!cv || !cv.isConnected){ cv = Q.bzVeil = document.createElement('canvas'); cv.className = 'bz-veil'; mgStage.prepend(cv); }
  const k = 0.5, w = Math.ceil(innerWidth*k), h = Math.ceil(innerHeight*k);
  if(cv.width !== w || cv.height !== h){ cv.width = w; cv.height = h; }
  const g = cv.getContext('2d');
  g.clearRect(0, 0, w, h);
  // сила метели: в лагере тихо, дальше — пелена; маяк зажгли — стихает
  const storm = Math.max(0, Math.min(1, (Q.cx - 6.5)/3))*(1 - (BZW.calm || 0));
  if(storm <= 0.01) return;
  camera.position.copy(runCam.pos); camera.lookAt(runCam.look); camera.updateMatrixWorld();
  const alpha = (Q.bzLook ? 0.18 : 0.94)*storm;
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = `rgba(236,244,250,${alpha})`; g.fillRect(0, 0, w, h);
  // окошки света
  g.globalCompositeOperation = 'destination-out';
  const hole = (x, y, r) => {
    const c = toScreen(rsAt(x, y)), e = toScreen(rsAt(x + r, y)), rr = Math.max(8, Math.abs(e.x - c.x))*k;
    const gr = g.createRadialGradient(c.x*k, c.y*k, rr*0.35, c.x*k, c.y*k, rr);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(c.x*k, c.y*k, rr, 0, 7); g.fill();
  };
  for(const p of [Q.me, Q.pal]) if(p && !p.gone) hole(p.x, p.y + 0.45, p === Q.me ? BZ_LIGHT.me : BZ_LIGHT.pal);
  for(const l of BZW.lamps) if(l.on) hole(l.x, 1.2, BZ_LIGHT.lamp);
  for(const f of BZW.floes) if(f.on && f.k > 0.5) hole(f.cx, f.y + 0.4, BZ_LIGHT.star);
  hole(4.2, 0.5, BZ_LIGHT.fire);
  if(BZW.beacon.lit) hole(BZ.beacon, 1.6, 3);
  // снежинки летят справа налево (в порыв — быстрее)
  g.globalCompositeOperation = 'source-over';
  const blow = BZW.gust.st === 'blow' && rsBoth().some(bzInWind) ? 3 : 1;
  g.strokeStyle = `rgba(255,255,255,${0.85*storm})`; g.lineWidth = 1.6; g.lineCap = 'round';
  g.beginPath();
  for(const f of BZ_FLAKES){
    f.x -= f.v*dt*0.35*blow; f.y += f.v*dt*0.12;
    if(f.x < -0.05){ f.x = 1.05; f.y = Math.random(); } if(f.y > 1.05) f.y = -0.05;
    const x = f.x*w, y = f.y*h, l = f.l*k*blow;
    g.moveTo(x, y); g.lineTo(x + l, y - l*0.3);
  }
  g.stroke();
}
function bzDraw(dt){
  for(const m of Q.moms) bzMomDraw(m, dt);
  // звёздочки качаются; в трубу льдины подсвечены
  for(const f of BZW.floes) if(f.on) f.st.position.y = 0.9 + Math.sin(now*3 + f.i)*0.08;
  bzVeil(dt);
}

/* ---------- Пинг в метели ---------- */
function bzAI(p, dt){ return p.role === 'jump' ? bzAIJ(p, dt) : bzAIS(p, dt); }
const bzPlateGo = (me, p) => { const [a, b] = BZ.plates; return rsOnPlate(me, a) ? b.x : rsOnPlate(me, b) ? a.x : Math.abs(me.x - a.x) < Math.abs(me.x - b.x) ? b.x : a.x; };
// Пинг-Силач: идёт первым в ветер, ждёт звёздочек у воды, прыгает по ним, тянет рычаг, копает, встаёт на плиту
function bzAIS(p, dt){
  const me = Q.me, W = BZW;
  if(Q.asked) return {tx:Math.min(me.x - 1.2, BZ.moms[0] - 2.4)};
  if(p.x < BZ.wind[0] - 1.5) return {tx:Math.min(me.x + 2.5, BZ.wind[0] - 0.5)};   // ведёт, но не убегает (цель — за границей участка, иначе застынет на ней)
  if(p.x < 32){   // ветер: впереди Прыгуна, чтобы он спрятался
    if(me.x < p.x - 2.2 && bzInWind(p)) return {tx:p.x};   // Прыгун отстал — ждём
    return {tx:Math.min(34.6, Math.max(me.x + 1.6, BZ.wind[0] - 0.5))};
  }
  if(!bzBridge()){
    const prog = bzProg(p);
    if(p.inW){
      if(!bzPearlDone(0) && p.aiPearl) return {tx:BZ.pearls[0].x, dive:true};
      p.aiPearl = false;
      return {tx:BZ.water[0] - 0.6, jump:p.x < BZ.water[0] + 0.9};
    }
    if(prog === -1 && !bzPearlDone(0) && !p.aiPearlDone){ p.aiPearl = true; p.aiPearlDone = true; }   // сначала — за жемчужинкой на дне
    if(p.aiPearl) return {tx:38.0};   // спрыгнуть в воду между льдинами
    if(prog < 5){
      const n = prog + 1, F = W.floes;
      const cur = prog < 0 ? null : F[prog];
      if(n <= 4 && !F[n].on) return {tx:cur ? cur.cx : BZ.water[0] - 0.5};   // ждём звёздочку
      const tcx = n <= 4 ? F[n].cx : BZ.water[1] + 0.8, edge = cur ? cur.s.x1 : BZ.water[0];
      if(p.air) return {tx:tcx};
      if(p.x > edge - 0.12) return {tx:tcx, jump:true};
      return {tx:edge + 0.35};
    }
    if(!W.levers[0].on){ const tx = BZ.lever.x; if(Math.abs(p.x - tx) < 0.5 && !p.air) rsLever(0); return {tx}; }
    return {tx:BZ.water[1] + 1};
  }
  if(W.wall.n < 3){
    const tx = BZ.wall.x0 - 0.55;
    if(Math.abs(p.x - tx) < 0.35 && !p.air && me.x > BZ.water[1] - 1) return {tx, act:'dig'};
    return {tx:me.x > BZ.water[1] - 1 ? tx : Math.min(tx, me.x + 1.5)};
  }
  if(!bzPearlDone(2) && me.x > 52 && me.x < 57.5 && me.role === 'jump') return {tx:BZ.pearls[2].x - 0.1};   // подсадить за жемчужинкой
  if(!BZW.beacon.lit) return {tx:me.x > 57 ? bzPlateGo(me, p) : Math.min(BZ.plates[0].x - 1, me.x + 1.5)};
  return {tx:Math.min(me.x - 1.2, BZ.moms[0] - 2.4)};
}
// Пинг-Прыгун: прячется за Силачом, лезет на вышку, ставит звёздочки, прыгает за жемчужинками
function bzAIJ(p, dt){
  const me = Q.me, W = BZW;
  if(Q.asked) return {tx:Math.min(me.x - 1.2, BZ.moms[0] - 2.4)};
  if(p.x < BZ.wind[0] - 0.5 && p.y < 1) return {tx:me.x - 0.8};
  if(!bzBridge() && (p.y > 1.7 || (p.x > 29.8 && me.x > 29) || (me.x > 32 && p.x > 28))){
    if(p.ground) p.aiOn = p.ground.k;
    if(p.y < 3.5 && p.aiOn !== 'step') return {tx:31.0, jump:!p.air && Math.abs(p.x - 31.0) < 0.3, up:true};   // на ступеньку: прыжок и ещё раз
    if(p.y < 3.5) return p.air ? {tx:33.4, up:true} : {tx:33.4, jump:p.x > 31.15, up:true};   // со ступеньки — на площадку
    // на площадке: звёздочки на льдины — на две вперёд от Силача
    const F = W.floes, nx = F.findIndex(f => !f.on), pr = bzProg(me);
    if(nx >= 0){
      if(now > (p.aiStarT || 0) && nx <= pr + 2){ p.aiStarT = now + 1.1; bzStar(nx); floatText('⭐', rsAt(p.x, p.y + 1.3)); }
      return {tx:BZ.scope};
    }
    if(!bzPearlDone(1)) return {tx:BZ.pearls[1].x, jump:!p.air && Math.abs(p.x - BZ.pearls[1].x) < 0.3, up:true};
    return {tx:BZ.scope};
  }
  if(p.x < 32 && bzInWind(p)) return {tx:Math.min(me.x - 0.75, 30)};   // за спиной у Силача
  if(bzBridge() && p.y > 1.7 && p.x > 30 && p.x < 35) return {tx:35.4};   // мост готов — спускаемся с вышки
  if(!bzPearlDone(2) && Math.abs(me.x - (BZ.pearls[2].x - 0.1)) < 0.6 && !me.air && me.y < 0.3 && Math.abs(p.x - me.x) < 4) return grStackUp(p, me, BZ.wall.x0, BZ.wall.h, BZ.pearls[2].x);
  if(!BZW.beacon.lit && me.x > 57) return {tx:bzPlateGo(me, p)};
  return {tx:Math.min(me.x - 1.2, 64)};
}

/* ---------- подсказки ---------- */
function bzSec(p){   // 10 — между участками, подсказки нет
  if(Q.asked) return 9;
  if(BZW.beacon.lit) return 10;
  if(p.x > 57.2) return 8;
  if(p.x > 52) return BZW.wall.n < 3 ? 7 : 10;
  if(p.x > BZ.water[1] - 0.2 && !p.inW) return bzBridge() ? 10 : 6;
  if(p.y > 3.5 && p.x > 32 && p.x < 35) return bzBridge() ? 10 : 4;
  if(p.x > BZ.water[0] - 0.1 || p.inW) return bzBridge() ? 10 : 5;
  if(p.x > 29.6 || p.y > 1.7) return bzBridge() ? 10 : 3;
  if(p.x > BZ.wind[0] - 0.8) return 2;
  if(p.x > 7.5) return 1;
  return 0;
}
function bzHint(sec, role){
  const n = Q.pal && !Q.pal.gone ? Q.pal.name : '', J = role === 'jump', solo = Q.mode === 'solo';
  const nJ = solo ? L('Прыгун', 'the jumper') : n, nS = solo ? L('Силач', 'the strong one') : n;
  switch(sec){
    case 0: return L('Пипа: «Мама ушла искать меня в метель! Найдите её — я поеду у Силача на спине» 🐧', 'Pipa: “Mum went looking for me in the blizzard! Find her — I\'ll ride on the strong one\'s back” 🐧');
    case 1: return L('Метель! Видно только рядом. Коснись фонарика 🏮 — станет светлее', 'A blizzard! You can only see nearby. Touch a lantern 🏮 to make it brighter');
    case 2: return J ? L(`Ветер! Иди прямо за ${solo ? 'Силачом' : n} — он закрывает от ветра 💨`, `Wind! Walk right behind ${nS} — they block the wind 💨`)
      : L(`Ветер! Иди первым — ${nJ} спрячется за тобой 💨`, `Wind! Go first — ${nJ} can hide behind you 💨`);
    case 3: return J ? L('Вышка! Прыжок и ещё раз в воздухе ⬆️⬆️ — на ступеньку, потом так же наверх', 'A tower! Jump, then again in the air ⬆️⬆️ — onto the step, then up the same way')
      : L(`Впереди вода, а льдин в метели не видно! ${nJ} залезет на вышку и покажет звёздочками ⭐`, `Water ahead, and the ice floes are hidden in the blizzard! ${nJ} will climb the tower and mark them with stars ⭐`);
    case 4: return Q.bzLook ? L(`Нажимай на льдины — ставь звёздочки ⭐, по ним пойдёт ${nS}`, `Tap the floes — place stars ⭐ for ${nS} to follow`)
      : L('Нажми 🔭 — в подзорную трубу видно все льдины', 'Press 🔭 — the telescope shows all the ice floes');
    case 5: return !J && !bzPearlDone(0) && !BZW.floes.some(f => f.on) ? L('Ждём звёздочек ⭐… А пока — на дне блестит жемчужинка: прыгни в воду и держи ⬇️', 'Waiting for stars ⭐… Meanwhile a pearl shines on the bottom: hop in and hold ⬇️')
      : L('Прыгай по звёздочкам ⭐ с льдины на льдину! Упал — не страшно: выплывай и назад', 'Jump from star ⭐ to star! Fell in? No problem — swim back and try again');
    case 6: return L('Потяни рычаг 🔧 — поднимется ледяной мост для всех', 'Pull the lever 🔧 — an ice bridge rises for everyone');
    case 7: return J ? L(`Завал! Его раскопает ${solo ? 'Силач' : n} ⛏️. А наверху жемчужинка — встань ему на голову ⬆️⬆️`, `A snow pile! ${nS} will dig through ⛏️. And there's a pearl up top — stand on their head ⬆️⬆️`)
      : L('Завал! Подойди и копай ⛏️ — жми несколько раз', 'A snow pile! Walk up and dig ⛏️ — press a few times');
    case 8: return L('Маяк! Встаньте на обе плиты сразу — он загорится и прогонит метель 🔥', 'A beacon! Stand on both plates at once — it lights up and chases the blizzard away 🔥');
    case 9: return bzClue() + ' ' + L('Нажми на маму Пипы 👆', 'Tap Pipa\'s mum 👆');
  }
  return '';
}
function bzWire(){
  netOn('bzl', m => { if(Q && Q.L.id === 'snow') bzLamp(m.i, true); });
  netOn('bzf', m => { if(Q && Q.L.id === 'snow') bzStar(m.i, true, !!m.on); });
  netOn('bzd', m => { if(Q && Q.L.id === 'snow') bzDig(true, m.n); });
  netOn('bzb', () => { if(Q && Q.L.id === 'snow') bzBeacon(true); });
  netOn('bzm', m => { if(Q && Q.L.id === 'snow') bzMom(m.i, true); });
}

RS_LVS.snow = {id:'snow', ic:'❄️', name:() => L('Метель', 'Blizzard'),
  say:() => L('Мама Пипы ушла искать её в метель. Видно только рядом: фонарики, ветер, вышка-навигатор и маяк.', 'Pipa\'s mum went looking for her in the blizzard. You only see nearby: lanterns, wind, a lookout tower and a beacon.'),
  root:bzRoot, ground:BZ.ground, walls:BZ.walls, water:BZ.water, stack:true,
  pearls:BZ.pearls, pearlO:null,
  W:() => BZW, build:bzBuild, reset:bzReset, solids:bzSolids, world:bzWorld, pre:bzPre, flow:bzFlow,
  lever(){ wait(0.5).then(() => { if(Q) floatText(L('Мост поднимается!', 'The bridge is rising!'), rsAt(42, 1.6), '#3E8DB8'); }); Q.hintT = 0; },
  act:bzAct, doAct:bzDoAct, tap:bzTap, cam:bzCam,
  ai:bzAI, sec:bzSec, hint:bzHint, step:bzStep, draw:bzDraw, wire:bzWire,
  setup:bzSetup,
  clean(){
    if(Q.pipa && Q.pipa.s.root.parent) Q.pipa.s.root.parent.remove(Q.pipa.s.root);
    for(const m of Q.moms || []) bzRoot.remove(m.s.root);
    if(Q.bzVeil) Q.bzVeil.remove();
  },
  endX:BZ.moms[0] - 1.6, photoY:1.1,
  photo:() => L('Пипа и мама после метели', 'Pipa and mum after the blizzard'),
  endTtl:() => L('Мама Пипы нашлась! 💗', 'Pipa\'s mum is found! 💗'),
  endSay:() => Q && Q.mode === 'ping' ? L('Пинг, Пипа и мама снова вместе — спасибо вам! 🐧', 'Ping, Pipa and mum are together again — thank you! 🐧') : L('Метель стихла, и Пипа снова с мамой — всё благодаря вам 🐧', 'The blizzard is over, and Pipa is back with mum — all thanks to you 🐧')
};
