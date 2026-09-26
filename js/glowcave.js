/* ---------------- «Спасаем потеряшку», уровень 4: «Пещера сияния» (Спринт 5, задача 4) ----------------
   Белый тюленёнок Лучик забрёл в тёмную пещеру и боится темноты. Сквозь трещинки в потолке падают солнечные
   лучики — на ледяные зеркала. Повернёшь зеркало 🪞 — луч полетит вбок, попадёт в кристалл — ледяная дверь растает.
     🪞 первое зеркало — просто повернуть (для всех, учимся);
     🌉 пропасть: луч над ней — мост из света. Зеркало пружинит назад, поэтому один ДЕРЖИТ зеркало 🪞, другой идёт
        по лучу; на том берегу — второе зеркало, теперь держит тот, кто перешёл. Упал — светлячки вернут на берег;
     🧗 высокий уступ с зеркалом: Прыгун — только с головы Силача; луч растопит стену;
     💎 последняя дверь: два луча сразу — Силач держит зеркало внизу, Прыгун — на уступе. Вся пещера засияет,
        и мама Лучика придёт по светлому ходу.
   3 жемчужинки 🦪: высоко над световым мостом (Прыгун, двойной прыжок), на дне лужи (Силач ныряет),
   над уступом с зеркалом (Прыгун с уступа).
   Физика, пузыри, кнопки, сеть и итоги — общие, в rescue.js; тут только сам уровень (RS_LVS.glow).
   Сеть: кто держит зеркало — видно по тюленю (qp.h); повернули зеркало — qmir; Лучик свободен — qglfree.
   Подключается после blizzard.js. */
const GC = {
  ground:[[-3, 18, -3.2, 0], [28, 36.5, -3.2, 0], [39.5, 84, -3.2, 0]],
  walls:[[-2.2, -1, 0, 8], [36.5, 39.5, -4.4, -3.2], [83, 84, 0, 8]],     // левый край, дно лужи, конец хода
  ledge3:[33.2, 35.4, 2.75, 3.05],                          // уступ с зеркалом — только с головы Силача
  ledge5:[48.6, 50.6, 1.7, 2.0],                            // уступ у последней двери — Прыгун двойным прыжком
  water:[36.5, 39.5],
  pit:[18, 28],
  bridge:{x0:18, x1:28, y0:0.04, y1:0.24},
  top:8,                                                    // потолок пещеры
  doors:[{x0:12.9, x1:13.5}, {x0:41.5, x1:42.1}, {x0:55.4, x1:56.0}, {x0:61, x1:62, end:true}],
  // зеркала: x, fy — на чём стоит, by — высота луча, out — куда отражает, spring — пружинит (надо держать)
  mirrors:[{x:6, fy:0, by:0.75, out:1}, {x:17.2, fy:0, by:0.32, out:1, spring:true}, {x:28.8, fy:0, by:0.32, out:-1, spring:true},
    {x:34.6, fy:3.05, by:3.65, out:1}, {x:46, fy:0, by:0.9, out:1, spring:true}, {x:49.8, fy:2.0, by:2.6, out:1, spring:true}],
  // кристаллы: door — какую дверь топит, dir — ловит только луч, летящий в эту сторону (на берегах пропасти)
  crystals:[{x:12.75, y:0.75, door:0}, {x:28.25, y:0.32, dir:1}, {x:17.75, y:0.32, dir:-1}, {x:41.35, y:3.65, door:1},
    {x:55.25, y:0.9, door:2}, {x:55.25, y:2.6, door:2}],
  pearls:[{x:23, y:3.3}, {x:38, y:-2.75}, {x:34.2, y:5.9}],
  spot:32.6,                                                // где встать Силачу под уступом
  pup:57.8, mom:81.6, momTo:80.3,
  esc:{x0:62.5, end:78, pile:[70, 71.2, 0, 2.7]}              // финал: ход к маме, сыплются сосульки, завал
};
const GC_ICE = {every:0.95, warn:0.75, dig:3};                 // сосульки: как часто, сколько видна тень; сколько копать завал
const GC_DARK = {hemi:0.3, sun:0.26};

/* ---------- постройка ---------- */
const gcRoot = new THREE.Group(); gcRoot.visible = false; scene.add(gcRoot);
const GC_MAT = {back:toon(0x34365F), rock:toon(0x565A95), ice:toon(0x7F8BC9), cap:toon(0xC9C8F2), deep:toon(0x2A2B4E),
  dim:toon(0x8A7FD0), door:toon(0xB8C8F2), mirror:toon(0xEAF4FF), rim:toon(0xFFD66B), wood:RS_MAT.wood,
  lit:new THREE.MeshBasicMaterial({color:0xFFF3A8}), lit2:new THREE.MeshBasicMaterial({color:0xA8F0FF}), lit3:new THREE.MeshBasicMaterial({color:0xFFC6E0})};
const GC_WATER = new THREE.MeshBasicMaterial({color:0x5F6FC0, transparent:true, opacity:0.6, depthWrite:false});
const GC_CORE = new THREE.MeshBasicMaterial({color:0xFFF6C8, transparent:true, opacity:0.95, depthWrite:false});
const GC_HALO = new THREE.MeshBasicMaterial({color:0xFFE27A, transparent:true, opacity:0.3, depthWrite:false, blending:THREE.AdditiveBlending});
const GC_SUN = new THREE.MeshBasicMaterial({color:0xFFF0B0, transparent:true, opacity:0.22, depthWrite:false, blending:THREE.AdditiveBlending});
const GC_BOX = new THREE.BoxGeometry(1, 1, 1);
const GC_Z = -0.45;   // зеркала и лучи — чуть позади тюленей
const GCW = {};
let gcBuilt = false;
function gcBox(x0, x1, y0, y1, mat, zd = 1.1){ return rsBox(x0, x1, y0, y1, mat, zd, gcRoot); }
function gcCluster(n, s, dim){   // кучка кристаллов: тусклая, пока пещера не засияет
  const g = new THREE.Group(), R = rsRand(n*7 + 3), mats = [GC_MAT.lit, GC_MAT.lit2, GC_MAT.lit3], cones = [];
  for(let i = 0; i < n; i++){
    const c = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.18*s, (0.6 + R()*0.5)*s, 6), dim), 1.08);
    c.position.set((i - (n - 1)/2)*0.24*s, 0.3*s, 0); c.rotation.z = (i - (n - 1)/2)*0.35; g.add(c);
    c.userData.lit = mats[Math.floor(R()*3)]; cones.push(c);
  }
  const gl = glow(0xFFF3A8, 1.6*s); gl.position.y = 0.35*s; gl.visible = false; g.add(gl);
  return {g, cones, gl};
}
function gcBuild(){
  if(gcBuilt) return; gcBuilt = true;
  const G = GC, R = rsRand(19);
  // стена пещеры позади, потолок со сталактитами, тусклые кристаллы на стене
  const back = new THREE.Mesh(new THREE.PlaneGeometry(240, 40), GC_MAT.back); back.position.copy(rsAt(30, 5, -7)); gcRoot.add(back);
  const pit = new THREE.Mesh(new THREE.PlaneGeometry(G.pit[1] - G.pit[0], 6), GC_MAT.deep); pit.position.copy(rsAt((G.pit[0] + G.pit[1])/2, -3.2, -1)); gcRoot.add(pit);
  gcBox(-4, 88, G.top, G.top + 4, GC_MAT.rock, 4);
  for(let x = -2; x < 86; x += 2.2 + R()*1.8){
    const h = 0.7 + R()*1.3, c = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.26 + R()*0.2, h, 7), GC_MAT.rock), 1.06);
    c.rotation.x = Math.PI; c.position.copy(rsAt(x, G.top - h/2, -1.4 - R()*2.4)); gcRoot.add(c);
  }
  GCW.deco = [];
  for(let x = 0; x < 82; x += 3.6 + R()*3){
    const cl = gcCluster(3, 0.9 + R()*0.7, GC_MAT.dim); cl.g.position.copy(rsAt(x, 0.6 + R()*5.5, -6.3)); gcRoot.add(cl.g); GCW.deco.push(cl);
  }
  // пол, берега, уступы, снежно-лиловые шапки
  for(const g of G.ground){ gcBox(g[0], g[1], g[2], g[3], GC_MAT.ice); gcBox(g[0] + 0.02, g[1] - 0.02, g[3] - 0.02, g[3] + 0.1, GC_MAT.cap, 1.14); }
  for(const w of G.walls) gcBox(w[0], w[1], w[2], w[3], GC_MAT.rock);
  for(const s of [G.ledge3, G.ledge5]){ gcBox(s[0], s[1], s[2], s[3], GC_MAT.ice); gcBox(s[0] + 0.02, s[1] - 0.02, s[3] - 0.02, s[3] + 0.1, GC_MAT.cap, 1.14); }
  // лужа
  const [wx0, wx1] = G.water, wm = new THREE.Mesh(new THREE.BoxGeometry(wx1 - wx0, RS_WS + 3.2, 2.4), GC_WATER);
  wm.position.copy(rsAt((wx0 + wx1)/2, (RS_WS - 3.2)/2)); wm.renderOrder = 2; gcRoot.add(wm);
  GCW.foam = new THREE.Mesh(new THREE.BoxGeometry(wx1 - wx0, 0.06, 2.42), new THREE.MeshBasicMaterial({color:0xDCE2FF, transparent:true, opacity:0.7}));
  GCW.foam.position.copy(rsAt((wx0 + wx1)/2, RS_WS)); gcRoot.add(GCW.foam);
  // ледяные двери (тают — уходят в пол); последняя — стена в конце, за ней светлый ход
  GCW.doors = G.doors.map(d => {
    const h = G.top - 0.02, o = gcBox(d.x0, d.x1, 0, h, d.end ? GC_MAT.rock : GC_MAT.door, d.end ? 1.1 : 1.0);
    return {...d, h, o, k:0, open:false, s:{x0:d.x0, x1:d.x1, y0:0, y1:h, k:'gate'}};
  });
  const tunnel = new THREE.Mesh(new THREE.PlaneGeometry(6, 5), new THREE.MeshBasicMaterial({color:0xFFF3C8})); tunnel.position.copy(rsAt(82, 2.3, -1.2)); gcRoot.add(tunnel);
  // трещинки в потолке: светлое пятнышко над каждым зеркалом
  for(const m of G.mirrors){
    const h = new THREE.Mesh(new THREE.CircleGeometry(0.34, 16), new THREE.MeshBasicMaterial({color:0xFFF8D8})); h.position.copy(rsAt(m.x, G.top - 0.02, GC_Z - 0.3)); h.rotation.x = Math.PI/2; gcRoot.add(h);
    const gl = glow(0xFFF0B0, 1.4); gl.position.copy(rsAt(m.x, G.top - 0.2, GC_Z)); gcRoot.add(gl);
  }
  // зеркала: подставка и круглое ледяное зеркало с жёлтой каёмкой; рычаг-«пружинка» — розовый бантик
  GCW.mirrors = G.mirrors.map(m => {
    const g = new THREE.Group(); g.position.copy(rsAt(m.x, m.fy, GC_Z)); gcRoot.add(g);
    const st = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, Math.max(0.05, m.by - m.fy - 0.12), 8), GC_MAT.wood), 1.2);
    st.position.y = (m.by - m.fy - 0.12)/2; g.add(st);
    const disc = new THREE.Group(); disc.position.y = m.by - m.fy; g.add(disc);
    const d = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.07, 24), GC_MAT.mirror), 1.08); disc.add(d);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.04, 6, 24), GC_MAT.rim); rim.rotation.x = Math.PI/2; disc.add(rim);
    if(m.spring){ const b = addOutline(new THREE.Mesh(SMALL, RS_MAT.lever), 1.1); b.scale.setScalar(0.09); b.position.set(0, -0.14, 0.12); g.add(b); b.position.y = m.by - m.fy - 0.2; }
    const gl = glow(0xFFF6C8, 0.9); gl.position.y = m.by - m.fy; g.add(gl);
    return {...m, g, disc, gl, on:false, act:false, a:0};
  });
  // кристаллы-приёмники
  GCW.crystals = G.crystals.map(c => {
    const cl = gcCluster(3, c.door == null ? 0.55 : 0.75, GC_MAT.dim); cl.g.position.copy(rsAt(c.x, c.y - 0.3, GC_Z)); gcRoot.add(cl.g);
    return {...c, cl, lit:false, was:false};
  });
  // финал: завал в ходе и ледяная плита над Силачом (сосульки о неё разбиваются)
  const pl = G.esc.pile; GCW.pile = {o:new THREE.Group(), n:0, s:{x0:pl[0], x1:pl[1], y0:pl[2], y1:pl[3], k:'pile'}};
  for(let i = 0; i < 7; i++){ const r = addOutline(new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 + R()*0.25), GC_MAT.rock), 1.05); r.position.set((R() - 0.5)*0.8, 0.4 + (i % 3)*0.75, (R() - 0.5)*1.2); GCW.pile.o.add(r); }
  GCW.pile.o.position.copy(rsAt((pl[0] + pl[1])/2, 0)); gcRoot.add(GCW.pile.o);
  GCW.slab = gcBox(-0.8, 0.8, 0, 0.16, GC_MAT.door, 0.7); GCW.slab.visible = false;
  GCW.ices = []; GCW.iceId = 0;
  // мост из света и пул лучей
  GCW.bridge = {on:false, grace:0, s:{...G.bridge, k:'bridge'}};
  GCW.beams = [];
  GCW.levers = [];
  RS_LVS.glow.pearlO = rsPearlsBuild(RS_LVS.glow);
}
function gcReset(){
  for(const d of GCW.doors){ d.k = 0; d.open = false; d.o.scale.y = 1; d.o.visible = true; }
  for(const m of GCW.mirrors){ m.on = false; m.act = false; m.a = 0; }
  for(const c of GCW.crystals){ c.lit = c.was = false; gcLight(c.cl, false); }
  for(const c of GCW.deco) gcLight(c, false);
  Object.assign(GCW.bridge, {on:false, grace:0});
  GCW.pairT = 0; GCW.shine = 0; GCW.esc = 0; GCW.iceT = 1;
  GCW.pile.n = 0; GCW.pile.o.visible = true; GCW.pile.o.scale.setScalar(1); GCW.slab.visible = false;
  for(const c of GCW.ices){ gcRoot.remove(c.o); gcRoot.remove(c.sh); }
  GCW.ices.length = 0;
  gcSync();
}
function gcLight(cl, on){
  for(const c of cl.cones) c.material = on ? c.userData.lit : GC_MAT.dim;
  cl.gl.visible = on;
}
function gcSync(){
  for(const d of GCW.doors){ const dy = -d.h*d.k; d.s.y0 = dy; d.s.y1 = d.h + dy; d.o.position.y = RS_POS.y + d.h/2 + dy; d.o.visible = d.k < 0.999; }
}

/* ---------- лучи ---------- */
const gcNear = (p, m) => p && !p.gone && !p.bub && Math.abs(p.x - m.x) < 0.9 && Math.abs(p.y - m.fy) < 0.35 && (p.kind === 'net' ? p.ng : !p.air);
const gcHeld = m => rsBoth().some(s => s.hold && gcNear(s, m));
// горизонтальный луч от (x, y) в сторону d: где остановится и какой кристалл зажжёт
function gcRay(x, y, d){
  let best = 40, hit = null;
  for(const c of GCW.crystals){
    if(Math.abs(c.y - y) > 0.3 || (c.dir && c.dir !== d)) continue;
    const t = (c.x - x)*d; if(t > 0.05 && t < best){ best = t; hit = c; }
  }
  for(const s of Q.sol){
    if(s.k === 'bridge' || y <= s.y0 || y >= s.y1) continue;
    const t = ((d > 0 ? s.x0 : s.x1) - x)*d; if(t > 0.05 && t < best){ best = t; hit = null; }
  }
  return {x1:x + d*best, hit};
}
function gcBeams(){
  let n = 0;
  const seg = (x0, y0, x1, y1, w, mat) => {
    let o = GCW.beams[n++];
    if(!o){ o = new THREE.Mesh(GC_BOX, mat); o.renderOrder = 3; gcRoot.add(o); GCW.beams.push(o); }
    o.material = mat; o.visible = true;
    o.position.copy(rsAt((x0 + x1)/2, (y0 + y1)/2, GC_Z));
    o.scale.set(Math.max(w, Math.abs(x1 - x0)), Math.max(w, Math.abs(y1 - y0)), w);
  };
  for(const c of GCW.crystals) c.lit = false;
  for(const m of GCW.mirrors){
    seg(m.x, GC.top, m.x, m.by, 0.62, GC_SUN);   // солнечный лучик из трещинки
    if(!m.act) continue;
    const r = gcRay(m.x, m.by, m.out), fl = 0.85 + Math.sin(now*14 + m.x)*0.15;
    seg(m.x, m.by, r.x1, m.by, 0.4*fl, GC_HALO); seg(m.x, m.by, r.x1, m.by, 0.1, GC_CORE);
    if(r.hit) r.hit.lit = true;
  }
  const B = GCW.bridge;   // луч погас, а мост ещё миг держится — мигает
  if(B.on && !GCW.mirrors[1].act && !GCW.mirrors[2].act && Math.floor(now*14) % 2) seg(GC.pit[0], 0.32, GC.pit[1], 0.32, 0.3, GC_HALO);
  for(; n < GCW.beams.length; n++) GCW.beams[n].visible = false;
}

/* ---------- мир ---------- */
function gcWorld(dt){
  const W = GCW;
  for(const m of W.mirrors){
    m.act = m.spring ? gcHeld(m) : m.on;
    const want = m.act ? -m.out*Math.PI/4 : 0;
    m.a += (want - m.a)*Math.min(1, dt*(m.act ? 14 : 6));
    m.disc.rotation.z = m.a;
    m.gl.material.opacity = m.act ? 0.9 : 0.45 + Math.sin(now*4 + m.x)*0.25;   // не повёрнуто — мерцает, зовёт
  }
  gcBeams();
  // кристаллы: зажёгся — звенит; двери тают
  for(const c of W.crystals){
    if(c.lit !== c.was){
      c.was = c.lit; gcLight(c.cl, c.lit || (c.door != null && W.doors[c.door].open));
      if(c.lit && Q.st === 'go'){ sfx.ding(); burst(TEX.star, rsAt(c.x, c.y, GC_Z + 0.5), 8, 1.4, 0.22); }
    }
  }
  const lit = i => W.crystals.filter(c => c.door === i).every(c => c.lit);
  for(let i = 0; i < 2; i++) if(!W.doors[i].open && lit(i)) gcMelt(i);
  if(!W.esc && Q.st === 'go'){ W.pairT = lit(2) ? W.pairT + dt : 0; if(W.pairT > 0.35) gcFree(); }
  if(W.esc === 2) gcIces(dt);
  for(const d of W.doors) if(d.open && d.k < 1){ d.k = Math.min(1, d.k + dt*0.9); if(Math.random() < dt*14) emit(TEX.puff, rsAt(d.x0 + Math.random()*(d.x1 - d.x0), 0.2 + Math.random()*2, 0.8), {v:new V3(0, 0.6, 0), life:0.6, size:0.35}); }
  // мост из света: горит, пока светит луч над пропастью; погас — ещё миг мигает
  const B = W.bridge, on = W.mirrors[1].act || W.mirrors[2].act;
  if(on){ if(!B.on && Q.st === 'go'){ sfx.sparkle(); floatText(L('Мост из света! ✨', 'A bridge of light! ✨'), rsAt(23, 1.3), '#C9A12E'); } B.on = true; B.grace = 0.45; }
  else if(B.on && (B.grace -= dt) <= 0) B.on = false;
  W.foam.position.y = RS_POS.y + RS_WS + Math.sin(now*2)*0.02;
  if(W.shine){ for(const c of W.deco) c.g.rotation.z = Math.sin(now*2 + c.g.position.x)*0.05; }
  gcSync();
}
function gcSolids(out){
  if(GCW.pile.n < GC_ICE.dig) out.push(GCW.pile.s);
  for(const d of GCW.doors) if(d.k < 0.999) out.push(d.s);
  const B = GCW.bridge;
  if(B.on) out.push(B.s);
}
function gcMelt(i, remote){
  const d = GCW.doors[i]; if(d.open) return;
  d.open = true; sfx.good(); sfx.whoosh();
  for(const c of GCW.crystals) if(c.door === i) gcLight(c.cl, true);
  if(i < 3) floatText(L('Лёд тает! 💧', 'The ice is melting! 💧'), rsAt((d.x0 + d.x1)/2, 2.4), '#3E8DB8');
  if(Q) Q.hintT = 0;
}
function gcTurn(i, on, remote){
  const m = GCW.mirrors[i]; if(!m || m.spring) return;
  m.on = on == null ? !m.on : on; sfx.tick();
  if(m.on) burst(TEX.star, rsAt(m.x, m.by, GC_Z + 0.6), 6, 1.2, 0.2);
  if(!remote && Q.mode === 'net') netSend({t:'qmir', i, on:m.on});
}
// упал в пропасть — светлячки приносят на берег
function gcPre(){
  for(const p of [Q.me, Q.pal]){
    if(!p || !rsLocal(p) || p.gone || p.bub) continue;
    if(p.ground && p.ground.k !== 'bridge') p.gcLast = p.x;
    if(p.y < -1.4 && p.x > GC.pit[0] - 0.5 && p.x < GC.pit[1] + 0.5){
      const left = (p.gcLast == null ? 0 : p.gcLast) < 23;
      p.x = left ? 16.3 : 29.7; p.y = 0.6; p.vx = p.vy = 0; p.air = true; p.inv = 1; p.hold = false; p.face = left ? 1 : -1;
      sfx.sparkle(); burst(TEX.star, rsAt(p.x, 0.8), 12, 1.6, 0.22);
      floatText(L('Светлячки помогли! ✨', 'The fireflies helped! ✨'), rsAt(p.x, 1.9), '#C9A12E');
      if(p === Q.me) { mgHint(L('Ничего! По лучу можно идти, только пока зеркало держат 🪞', 'No problem! You can walk on the beam only while someone holds the mirror 🪞')); Q.hintT = now + 4; }
    }
    // из лужи — сам выпрыгивает на берег, если плывёт к нему
    if(p.inW && !p.dive && p.vy <= 0.5 && p.y > RS_FLOAT - 0.25 && p.jq <= 0 && ((p.x > GC.water[1] - 0.8 && p.face > 0) || (p.x < GC.water[0] + 0.8 && p.face < 0)) && (Math.abs(p.vx) > 0.3 || now - (p.wallT || 0) < 0.2)) p.jq = 0.15;
  }
}
function gcAct(me){
  if(me.bub || me.air) return null;
  if(GCW.esc){
    const pl = GC.esc.pile;
    return me.role === 'strong' && GCW.pile.n < GC_ICE.dig && me.x > pl[0] - 1.1 && me.x < pl[0] ? {k:'dig', ic:'⛏️', aria:L('Копать', 'Dig')} : null;
  }
  const i = GCW.mirrors.findIndex(m => gcNear(me, m));
  if(i < 0) return null;
  return GCW.mirrors[i].spring ? {k:'hold', ic:'🪞', aria:L('Держать зеркало', 'Hold the mirror')} : {k:'turn', ic:'🪞', aria:L('Повернуть зеркало', 'Turn the mirror')};
}
function gcDoAct(p, k){
  if(k === 'dig'){ if(p.role === 'strong' && now - (p.digT || 0) > 0.25){ p.digT = now; p.face = 1; gcDig(); } return; }
  const i = GCW.mirrors.findIndex(m => gcNear(p, m)); if(i < 0) return;
  const m = GCW.mirrors[i];
  if(k === 'turn') gcTurn(i);
  else if(k === 'hold'){
    p.hold = !p.hold; p.face = m.out; sfx.tick();
    if(p.hold) floatText(L('Держу! ✨', 'Holding! ✨'), rsAt(p.x, p.y + 1.4), '#C9A12E');
    if(p === Q.me) Q.hintT = 0;
  }
}

/* ---------- Лучик и его мама ---------- */
function gcSetup(){
  const pup = rsSealLook({c:0xFFFFFF}, '#FFD66B', 0.28); gcRoot.add(pup.root);
  const mom = rsSealLook({c:0xE3E9F2}, '#FFD66B', 0.5); gcRoot.add(mom.root);
  Q.pup = {s:pup, x:GC.pup, tx:null, face:-1, hop:0, callT:now + 3, happy:0, run:false};
  Q.gcMom = {s:mom, x:GC.mom, tx:null, face:-1, hop:0};
  Q.gcL = {hemi:HEMI.intensity, sun:sun.intensity};
  HEMI.intensity = GC_DARK.hemi; sun.intensity = GC_DARK.sun;
  Q.fam = null;
}
function gcWalker(o, dt, y){
  if(o.tx != null){
    const d = o.tx - o.x;
    if(Math.abs(d) > 0.05){ o.x += Math.sign(d)*Math.min(Math.abs(d), (o.run ? 3 : 2)*dt); o.face = Math.sign(d); o.hop += dt*12; } else o.hop = 0;
  }
  const s = o.s;
  s.root.position.copy(rsAt(o.x, y + Math.abs(Math.sin(o.hop))*0.1));
  s.root.rotation.y += (o.face*1.1 - s.root.rotation.y)*Math.min(1, dt*6);
  updateSeal(s, now + o.x, dt);
}
function gcStep(dt, go){
  const P = Q.pup; if(!P) return;
  if(!GCW.esc && now > P.callT && Q.me.x > 42){ P.callT = now + 4 + Math.random()*2; floatText(L('Темно… Ма-ма!', 'It\'s dark… Mu-um!'), rsAt(P.x, 1.6), '#6B6A7E'); sfx.mama(); }
  P.s.flap = P.happy > now || Q.won || P.on ? 1 : 0;
  const S = P.on && rsBoth().find(o => o.role === 'strong');   // Лучик едет у Силача на спине
  if(S){ P.x = S.x - 0.1*S.face; P.face = S.face; P.s.root.position.copy(rsAt(P.x, S.y + 0.55, 0.05)); P.s.root.rotation.y = S.face*1.1; updateSeal(P.s, now, dt); }
  else gcWalker(P, dt, 0);
  const E = GC.esc;
  if(GCW.esc === 2 && !Q.cage){
    if(now > (Q.gcCallT || 0)){ Q.gcCallT = now + 5; floatText(L('Лучик! Сюда!', 'Little Ray! Over here!'), rsAt(GC.mom, 2.2), '#D9527E'); }
    if(go && rsBoth().every(s => s.x > E.end && !s.bub)) gcHome();
  }
  gcWalker(Q.gcMom, dt, 0);
  // жемчужинка над уступом: подскажем (один раз)
  const me = Q.me;
  if(go && !gcPearlDone(2) && !Q.said.has('pearlG') && me.role === 'jump' && me.ground && Math.abs(me.y - GC.ledge3[3]) < 0.05 && me.x > GC.ledge3[0]){
    Q.said.add('pearlG'); mgHint(L('Над головой жемчужинка! Прыгни и ещё раз в воздухе ⬆️⬆️', 'A pearl overhead! Jump, then once more in the air ⬆️⬆️')); Q.hintT = now + 5;
  }
}
const gcPearlDone = i => Q.pearl[i] || (rsResc().pearls.glow || []).includes(i);
async function gcFree(remote){
  const W = GCW; if(W.esc) return;
  W.esc = 1;
  if(!remote && Q.mode === 'net') netSend({t:'qglfree'});
  const P = Q.pup;
  gcMelt(2); sfx.good(); sfx.sparkle();
  mgHint(L('Пещера засияла! ✨', 'The cave is shining! ✨')); Q.hintT = now + 3;
  // вся пещера сияет: кристаллы на стенах загораются волной, становится светло
  W.shine = 1;
  W.deco.forEach((c, i) => wait(0.05*i).then(() => { if(Q){ gcLight(c, true); if(i % 3 === 0) sfx.tick(); } }));
  tween(1.6, k => { HEMI.intensity = GC_DARK.hemi + (0.62 - GC_DARK.hemi)*k; sun.intensity = GC_DARK.sun + (0.58 - GC_DARK.sun)*k; }, ease.io);
  for(const p of rsBoth()) p.hold = false;
  await wait(1.1); if(!Q) return;
  P.happy = now + 3; P.tx = 56.8; P.run = true;
  floatText(L('Светло! Как красиво!', 'It\'s bright! So pretty!'), rsAt(P.x, 1.7), '#D9527E');
  burst(TEX.heart, rsAt(P.x, 0.9), 12, 2, 0.3);
  await wait(1.4); if(!Q) return;
  // пещера дрожит: открывается ход к маме, Лучик забирается Силачу на спину
  sfx.thud(); sfx.gloom(); gcMelt(3);
  floatText(L('Ой! Пещера дрожит!', 'Oh! The cave is shaking!'), rsAt(58, 3), '#3B3A4A');
  for(let i = 0; i < 8; i++) emit(TEX.puff, rsAt(52 + i*1.5, GC.top - 0.3, 0), {v:new V3(0, -1.5, 0), life:0.8, size:0.35});
  P.on = true; P.run = false; P.tx = null;
  floatText(L('Я с тобой! Бежим к маме!', 'I\'m with you! Let\'s run to mum!'), rsAt(P.x, 1.7), '#D9527E');
  W.slab.visible = true; W.esc = 2; W.iceT = 1.2;
  Q.hintT = 0;
}
// сосульки: сначала тень и дрожь под потолком, потом падает; о плиту Силача — разбивается
function gcIces(dt){
  const W = GCW, E = GC.esc, host = Q.mode !== 'net' || net.host;
  if(host && !Q.cage && Q.st === 'go' && (W.iceT -= dt) <= 0){
    W.iceT = GC_ICE.every*(0.8 + Math.random()*0.4);
    const t = rsBoth().filter(s => s.x > E.x0 - 1 && !s.bub), s = t[Math.floor(Math.random()*t.length)];
    if(s){ const x = Math.max(E.x0, Math.min(E.end + 1, s.x + (Math.random() - 0.3)*3)); gcIce(++W.iceId, x); }
  }
  const S = rsBoth().find(o => o.role === 'strong');
  for(let i = W.ices.length - 1; i >= 0; i--){
    const c = W.ices[i];
    c.t += dt;
    if(c.t < GC_ICE.warn){ c.o.position.copy(rsAt(c.x + Math.sin(c.t*50)*0.04, c.y, 0)); c.sh.scale.setScalar(0.4 + c.t/GC_ICE.warn*0.6); continue; }
    c.v += 26*dt; c.y -= c.v*dt; c.o.position.copy(rsAt(c.x, c.y, 0));
    let hit = c.y <= 0.2;
    if(!hit && S && !S.bub && Math.abs(S.x - c.x) < 0.95 && c.y < S.y + 1.55){   // разбилась о плиту Силача
      hit = true; sfx.thud(); floatText(L('Бум! 🧊', 'Boom! 🧊'), rsAt(S.x, S.y + 2), '#3E8DB8');
    }
    if(!hit) for(const p of [Q.me, Q.pal]) if(p && rsLocal(p) && !p.gone && !p.bub && p.inv <= 0 && Math.abs(p.x - c.x) < 0.55 && c.y < p.y + RS_H + 0.1 && c.y > p.y){ hit = true; rsBubble(p); }
    if(hit){ burst(TEX.star, rsAt(c.x, Math.max(0.2, c.y), 0.4), 6, 1.3, 0.2); if(c.y <= 0.2) sfx.plop(); gcRoot.remove(c.o); gcRoot.remove(c.sh); W.ices.splice(i, 1); }
  }
  if(S){ W.slab.position.copy(rsAt(S.x, S.y + 1.35, 0)); W.slab.visible = !S.bub && !S.gone; }
}
function gcIce(id, x, remote){
  const W = GCW; if(W.ices.some(c => c.id === id)) return;
  const o = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.8, 8), GC_MAT.door), 1.1); o.rotation.x = Math.PI; gcRoot.add(o);
  const sh = new THREE.Mesh(new THREE.CircleGeometry(0.5, 18), new THREE.MeshBasicMaterial({color:0x2A2B4E, transparent:true, opacity:0.4, depthWrite:false}));
  sh.rotation.x = -Math.PI/2; sh.position.copy(rsAt(x, 0.03, 0.3)); gcRoot.add(sh);
  W.ices.push({id, x, y:GC.top - 0.5, t:0, v:0, o, sh});
  if(!remote && Q.mode === 'net') netSend({t:'qgcice', id, x:+x.toFixed(2)});
}
function gcDig(remote, n){
  const P = GCW.pile; if(P.n >= GC_ICE.dig) return;
  P.n = n != null ? n : P.n + 1;
  if(!remote && Q.mode === 'net') netSend({t:'qgcdig', n:P.n});
  const pl = GC.esc.pile, left = GC_ICE.dig - P.n;
  sfx.thud(); burst(TEX.puff, rsAt(pl[0], 1, 0.6), 10, 1.4, 0.4);
  P.o.scale.setScalar(1 - P.n*0.25);
  if(left){ floatText(L(`Ещё ${left}!`, `${left} more!`), rsAt(pl[0], 3.2), '#2F9E72'); return; }
  P.o.visible = false; sfx.good();
  floatText(L('Путь свободен!', 'The way is clear!'), rsAt(pl[0], 3.2), '#2F9E72');
  Q.hintT = 0;
}
async function gcHome(remote){
  if(Q.cage) return;
  Q.cage = true; Q.st = 'end'; if(Q.actB) Q.actB.hidden = true;
  if(!remote && Q.mode === 'net') netSend({t:'qglhome'});
  const W = GCW, P = Q.pup, M = Q.gcMom;
  for(const c of W.ices){ gcRoot.remove(c.o); gcRoot.remove(c.sh); }
  W.ices.length = 0; W.slab.visible = false;
  mgHint(L('Лучик дома! 💗', 'Little Ray is home! 💗'));
  Q.photoX = GC.momTo - 1.6;
  for(const p of [Q.me, Q.pal]) if(p && rsLocal(p) && !p.gone){ p.auto = p.role === 'jump' ? GC.momTo - 2.9 : GC.momTo - 4.1; if(p.bub) rsRevive(p); }
  P.on = false; P.tx = GC.momTo - 0.9; P.run = true; P.happy = now + 5; sfx.whoosh();
  M.tx = GC.momTo; M.run = true;
  await wait(1.2); if(!Q) return;
  setMood(P.s, 'happy'); setMood(M.s, 'happy');
  burst(TEX.heart, rsAt(GC.momTo - 0.5, 1.2), 18, 2.4, 0.34); sfx.purr(); sfx.hug();
  floatText(L('Мама!', 'Mum!'), rsAt(P.x, 1.7), '#D9527E');
  floatText(L('Спасибо, что принесли свет! 💗', 'Thank you for bringing the light! 💗'), rsAt(GC.momTo, 2.6), '#D9527E');
  for(const p of [Q.me, Q.pal]) if(p && !p.gone){ p.m.flap = 1; setMood(p.m, 'happy'); }
  await wait(2.4); if(!Q) return;
  Q.end = 'win';
}
// Пинг в ходе: Силач идёт первым, копает завал и ждёт Прыгуна; Прыгун — под плитой, за Силачом
function gcEscAI(p){
  const W = GCW, me = Q.me, E = GC.esc, pl = E.pile;
  if(W.esc < 2) return {tx:p.x};
  if(p.role === 'strong'){
    const jx = me.role === 'jump' ? me.x : p.x;
    if(W.pile.n < GC_ICE.dig && p.x < pl[0]){
      const at = p.x > pl[0] - 0.9 && !p.air;
      return {tx:Math.min(pl[0] - 0.5, jx + 1.2), act:at && now - (p.aiDig || 0) > 0.3 ? (p.aiDig = now, 'dig') : null};
    }
    return {tx:Math.min(E.end + 1.5, jx + 1.2)};
  }
  const S = rsBoth().find(o => o.role === 'strong');
  return {tx:S ? Math.min(E.end + 1.4, S.x - 0.55) : E.end + 1.4};
}

/* ---------- Пинг в пещере ---------- */
function gcAI(p, dt){
  const o = gcAIGo(p);
  if(p.hold && Math.abs(o.tx - p.x) > 0.4) p.hold = false;   // пора идти — отпускает зеркало
  return o;
}
function gcAIGo(p){
  const me = Q.me, W = GCW, M = W.mirrors, J = p.role === 'jump';
  const at = x => Math.abs(p.x - x) < 0.35 && !p.air;
  const holdAt = i => { const m = M[i]; if(p.hold && gcNear(p, m)) return {tx:p.x}; return {tx:m.x, act:at(m.x) && !p.hold ? 'hold' : null}; };
  if(Q.cage) return {tx:p.x};
  if(W.esc) return gcEscAI(p);
  // первая дверь: повернуть зеркало
  if(p.x < 13.6 && !W.doors[0].open){
    if(M[0].on || gcNear(me, M[0])) return {tx:11.6};
    return {tx:M[0].x, act:at(M[0].x) && !M[0].on ? 'turn' : null};
  }
  // пропасть: на левом берегу
  if(p.x < GC.pit[0] && p.y > -0.5){
    if(me.x > GC.pit[1] && me.y > -0.5){   // ты уже там
      if(M[2].act) return {tx:30};
      return p.hold ? {tx:p.x} : {tx:16.6};
    }
    if(me.hold && gcNear(me, M[1])) return {tx:30};   // ты держишь — иду по лучу
    return holdAt(1);
  }
  if(p.x < GC.pit[1] && p.y > -0.5) return {tx:30};   // на мосту — вперёд
  // правый берег: подержать зеркало для тебя
  if(p.x < 31 && me.x < GC.pit[1] + 0.2 && !W.doors[1].open) return holdAt(2);
  // высокий уступ
  if(p.x < 42.2 && !W.doors[1].open){
    if(J){
      if(p.y > GC.ledge3[3] - 0.1 && p.x > GC.ledge3[0] - 0.2) return {tx:M[3].x, act:at(M[3].x) && !M[3].on ? 'turn' : null};
      if(Math.abs(me.x - GC.spot) < 0.7 && !me.air && me.y < 0.3) return grStackUp(p, me, GC.ledge3[0], GC.ledge3[3], M[3].x);
      return {tx:GC.spot - 1.5};
    }
    return {tx:GC.spot};
  }
  if(p.x < 42.2){
    if(J && p.y > GC.ledge3[3] - 0.1 && !gcPearlDone(2)){ const P = GC.pearls[2]; return {tx:P.x, jump:at(P.x), up:true}; }
    if(!J && !gcPearlDone(1)){ const P = GC.pearls[1]; return {tx:P.x, dive:p.inW}; }
    return {tx:44};
  }
  // последняя дверь: Силач держит зеркало внизу, Прыгун — наверху
  if(!J) return holdAt(4);
  if(p.y > GC.ledge5[3] - 0.1) return holdAt(5);
  if(!p.air && p.x < 46.6) p.gcRun = true;   // разбег слева, прыжок у края уступа, на макушке — ещё раз
  if(!p.air && p.x > 48.6) p.gcRun = false;  // не допрыгнул — отойти и снова
  if(!p.gcRun) return {tx:46.2};
  return {tx:49.6, jump:!p.air && p.x > 46.9 && p.x < 47.6, up:true};
}

/* ---------- подсказки ---------- */
function gcSec(p){
  if(Q.cage) return 7;
  if(GCW.esc) return GCW.esc < 2 ? 10 : GCW.pile.n < GC_ICE.dig && p.x > GC.esc.pile[0] - 4 && p.x < GC.esc.pile[0] ? 9 : 8;
  const x = p.x;
  if(x > 42.2) return 6;
  if(x > 31) return GCW.doors[1].open ? 10 : 4;
  if(x > GC.pit[1] - 0.2 && p.y > -0.5) return 3;
  if(x > 13.6) return 2;
  if(x > 3.5) return GCW.doors[0].open ? 10 : 1;
  return 0;
}
function gcHint(sec, role){
  const n = Q.pal && !Q.pal.gone ? Q.pal.name : '', J = role === 'jump', solo = Q.mode === 'solo';
  const nJ = solo ? L('Прыгун', 'the jumper') : n, nS = solo ? L('Силач', 'the strong one') : n;
  switch(sec){
    case 0: return L('Малыш Лучик боится темноты в Пещере сияния! Несите ему свет ➡️', 'Little Ray is scared of the dark in the Shining Cave! Bring him light ➡️');
    case 1: return L('Солнечный лучик падает на зеркало. Подойди и нажми 🪞 — луч попадёт в кристалл на двери', 'A sunbeam falls on the mirror. Walk up and press 🪞 — the beam hits the crystal on the door');
    case 2: return solo ? L('Пропасть! Встань у зеркала и держи 🪞 — луч станет мостом. Потом 🔄 — и переведи второго', 'A chasm! Stand by the mirror and hold 🪞 — the beam becomes a bridge. Then 🔄 — and lead the other one across')
      : L(`Пропасть! Луч станет мостом: один держит зеркало 🪞, другой идёт по лучу ✨`, `A chasm! The beam becomes a bridge: one holds the mirror 🪞, the other walks on the beam ✨`);
    case 3: return solo ? L('На этом берегу тоже зеркало: держи 🪞, потом 🔄 — и второй перейдёт', 'There\'s a mirror on this side too: hold 🪞, then 🔄 — and the other one crosses')
      : L(`Тут тоже зеркало! Подержи 🪞 — ${n} перейдёт к тебе по лучу`, `Another mirror here! Hold 🪞 — ${n} crosses to you on the beam`);
    case 4: return J ? L(`Зеркало на высоком уступе! Встань ${solo ? 'Силачу' : n} на голову — и прыгай ⬆️⬆️`, `A mirror on a high ledge! Stand on ${nS}'s head — and jump ⬆️⬆️`)
      : L(`Зеркало на высоком уступе! Встань под ним — ${nJ} запрыгнет тебе на голову`, `A mirror on a high ledge! Stand under it — ${nJ} jumps on your head`);
    case 6: return J ? L(`Нужны два луча сразу! Запрыгни на уступ ⬆️⬆️ и держи зеркало 🪞, а ${nS} — зеркало внизу`, `Two beams at once! Jump up the ledge ⬆️⬆️ and hold the mirror 🪞 — ${nS} holds the one below`)
      : L(`Нужны два луча сразу! Держи зеркало внизу 🪞, а ${nJ} — наверху на уступе`, `Two beams at once! Hold the mirror below 🪞 — ${nJ} holds the one up on the ledge`);
    case 7: return L('Лучик дома! 💗', 'Little Ray is home! 💗');
    case 8: return J ? L(`Сыплются сосульки! Держись поближе к ${solo ? 'Силачу' : 'напарнику'} 💪 — они разбиваются о его льдину 🧊. От тени — отходи`, `Icicles are falling! Stay close to ${nS} — they smash on the ice slab 🧊. Step away from shadows`)
      : L(`Сыплются сосульки! Они разбиваются о твою льдину 🧊 — веди ${nJ} за собой к маме ➡️`, `Icicles are falling! They smash on your ice slab 🧊 — lead ${nJ} to mum ➡️`);
    case 9: return J ? L(`Завал! ${nS} раскопает его ⛏️ — стой рядом, под льдиной`, `A rockfall! ${nS} digs through ⛏️ — stay close, under the slab`)
      : L('Завал! Копай ⛏️⛏️⛏️', 'A rockfall! Dig ⛏️⛏️⛏️');
  }
  return '';
}
function gcStuck(dt){
  const me = Q.me, pal = Q.pal; if(!pal || pal.gone || Q.mode === 'solo' || me.bub) return;
  const M = GCW.mirrors;
  let say = '', key = '';
  if(me.x > GC.pit[1] && me.x < 31 && pal.x < GC.pit[0] && !M[2].act){ key = 'stuckB'; say = L(`Подержи зеркало 🪞 — ${pal.name} перейдёт по лучу!`, `Hold the mirror 🪞 — ${pal.name} can cross on the beam!`); }
  else if(me.x < GC.pit[0] && me.x > 13.6 && pal.hold && gcNear(pal, M[1]) && !me.hold){ key = 'stuckA'; say = L(`${pal.name} держит зеркало — иди по лучу! ➡️`, `${pal.name} is holding the mirror — walk on the beam! ➡️`); }
  else if(GCW.esc === 2 && me.role === 'jump' && Math.abs(me.x - pal.x) > 2.5){ key = 'stuckE'; say = L('Держись поближе к напарнику 💪 — под его льдиной сосульки не страшны 🧊', `Stay close to ${pal.name} — icicles can't reach you under the slab 🧊`); }
  else if(me.x > 42.2 && !GCW.esc && (M[4].act !== M[5].act)){ key = 'stuckC'; say = me.hold ? L(`Держи! Ждём второй луч от ${pal.name} ✨`, `Keep holding! Waiting for ${pal.name}'s beam ✨`) : L(`${pal.name} держит одно зеркало — возьми второе 🪞`, `${pal.name} holds one mirror — take the other one 🪞`); }
  Q.stuckT = say ? (Q.stuckT || 0) + dt : 0;
  if(Q.stuckT > 2.5 && !Q.said.has(key)){ Q.said.add(key); mgHint(say); Q.hintT = now + 5; }
}
function gcCam(){
  const me = Q.me;
  if(Q.cage || GCW.esc) return null;
  if(me.x > 15.6 && me.x < 30.4 && me.y > -1) return [23, 0.9, 1.45];
  if(me.x > 43.5) return [51.2, 1.6, 1.25];
  return null;
}
function gcWire(){
  netOn('qmir', m => { if(Q && Q.L.id === 'glow') gcTurn(m.i, m.on, true); });
  netOn('qglfree', () => { if(Q && Q.L.id === 'glow') gcFree(true); });
  netOn('qgcice', m => { if(Q && Q.L.id === 'glow') gcIce(m.id, m.x, true); });
  netOn('qgcdig', m => { if(Q && Q.L.id === 'glow') gcDig(true, m.n); });
  netOn('qglhome', () => { if(Q && Q.L.id === 'glow') gcHome(true); });
}

RS_LVS.glow = {id:'glow', ic:'✨', name:() => L('Пещера сияния', 'Shining cave'),
  say:() => L('Малыш Лучик боится темноты. Поворачивайте зеркала: луч растопит лёд и станет мостом через пропасть.', 'Little Ray is scared of the dark. Turn the mirrors: a beam melts the ice and becomes a bridge over the chasm.'),
  root:gcRoot, ground:GC.ground, walls:GC.walls, more:[GC.ledge3, GC.ledge5], water:GC.water, stack:true,
  pearls:GC.pearls, pearlO:null,
  W:() => GCW, build:gcBuild, reset:gcReset, solids:gcSolids, world:gcWorld, pre:gcPre,
  lever(){}, act:gcAct, doAct:gcDoAct, cam:gcCam,
  ai:gcAI, sec:gcSec, hint:gcHint, step:gcStep, stuck:gcStuck, wire:gcWire,
  setup:gcSetup,
  clean(){
    if(Q.pup) gcRoot.remove(Q.pup.s.root);
    if(Q.gcMom) gcRoot.remove(Q.gcMom.s.root);
    if(Q.gcL){ HEMI.intensity = Q.gcL.hemi; sun.intensity = Q.gcL.sun; }
  },
  endX:GC.momTo - 1.6, photoY:1.1,
  photo:() => L('Лучик и мама в Пещере сияния', 'Little Ray and mum in the Shining Cave'),
  endTtl:() => L('Пещера засияла! ✨', 'The cave is shining! ✨'),
  endSay:() => L('Лучик больше не боится темноты — он снова с мамой, и всё благодаря вам 🦭', 'Little Ray isn\'t scared of the dark anymore — he\'s back with mum, all thanks to you 🦭')
};
