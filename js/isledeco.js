/* ---------------- 🏝️ Одеваем остров (Спринт 8, задача 1) ----------------
   Разбор 30.09: на острове белый малыш на белом снегу, между местами пустые поля. Здесь — всё, что делает остров живым,
   но ничего не меняет в игре (по этому нельзя ходить, звёздочек и замков тут нет):
   • земля: тропинки между местами (IDE_PATHS — заодно подсказывают, куда идти), пятна голубого льда, проталины с мхом
     и полярными маками (IDE_MOSS) — ideTint(x, z, h, c) зовёт islBuild, когда красит землю;
   • мелочи: камушки вдоль тропинок, ледяные кристаллы (IDE_CRYST), фонарики (ночью светят), флажки-гирлянды (IDE_GARL),
     у мест — скамейка и ведро рыбы у больницы, коврик и пар над иглу, ящики у лавки, круг и бочки у причала, посылки у почты;
   • жизнь: чайки кружат (IDE_GULLS), рыбки выпрыгивают у берега, тюленята дремлют на льдинках (IDE_NAPS — подошла, проснулись
     и поздоровались), следы малыша на снегу (на пузике — дорожка), тень под малышом и Пингом.
   Мелочи — бледные и через InstancedMesh (один вызов на вид), чтобы не спорить с подписями мест и не тормозить на планшете.
   Крючки из island.js: ideTint (раскраска земли), ideBuild(G) (в конце islBuild), ideStep(dt) (каждый кадр прогулки, не в пещере).
   Подключается сразу после island.js. Новая мелочь — строчка в таблице ниже; новое место на острове — тропинка в IDE_PATHS. */

// тропинки: ломаные [x, z] (координаты острова, как в ISL_PL); первая точка — откуда, последняя — у места
const IDE_PATHS = [
  [[0, -4], [-7, -12], [-15, -15], [-22, -15.6]],   // 🏥 больница
  [[0, -4], [-1, -14], [-2, -24.6]],                // ✉️ почта
  [[-1, -14], [-8, -24], [-15, -28.4]],             // 🎣 мостки
  [[-1, -14], [5, -15.5], [9.6, -16.6]],            // 🛷 на горку
  [[0, -4], [-9, -3], [-20, 1], [-29.6, 3.4]],      // 🛍️ лавка
  [[0, -4], [8, -4.6], [14, -2.4], [20, -2.8]],     // 🏠 иглу
  [[14, -2.4], [20.5, -11], [22, -21]],             // 🏔️ забег
  [[14, -2.4], [22, 4], [27.6, 9.4]],               // 🛣️ дорога к Туче
  [[20, -2.8], [24, -1.6], [26.4, -1.2]],           // 🧱 стройка
  [[0, -4], [-6, 3], [-14, 8.4]],                   // 🐾 прогулка
  [[-14, 8.4], [-16, 17], [-17, 24.4]],             // 🤿 причал
  [[-14, 8.4], [-20.5, 15], [-22.6, 20.6]],         // 🎣 лунка у берега
  [[0, -4], [4, 4], [8.8, 11.4]],                   // 🔎 потеряшка
  [[4, 4], [0.2, 12], [-0.6, 21], [-3, 29.6]]       // 🏊 к заплыву, на берег
];
const IDE_PATH_W = 0.7;                                         // полуширина тропинки, м
const IDE_MOSS = [[-27, 16, 2.6], [13.5, 7.2, 2.0], [-18, -6.5, 2.1], [26.5, -3.5, 2.0], [-9, 26, 2.3], [5, -30, 2.0], [-33, -9, 2.0]];   // проталины: x, z, радиус
const IDE_CRYST = [[-35, -6], [36, 0], [30, 16], [-30, -18], [16, 25], [-12, -22], [-34, 12], [3, -35]];   // ледяные кристаллы кучками
const IDE_LAMPS = [[0, 0.35, 1], [0, 0.8, -1], [4, 0.5, 1], [5, 0.5, -1], [8, 0.6, 1], [9, 0.55, -1], [11, 0.5, 1], [12, 0.45, -1], [6, 0.7, -1]];   // [тропинка, где на ней 0…1, сторона]
const IDE_GARL = [[[-2.9, -6.6], [2.9, -6.6], 2.7], [[-25.2, -13.6], [-18.8, -13.6], 2.5], [[-32, -1.3], [-28, -1.3], 2.6]];   // флажки: от, до, высота столбиков
const IDE_GULLS = [[-10, 4, 8, 10], [20, 18, 9, 12], [-24, -22, 7, 11], [30, 30, 5, 9]];   // чайки кружат: центр x, z, радиус, высота
const IDE_NAPS = [[23.2, 40.4, 0xF6C4D3], [-44.2, -11.4, 0xC6DCF4], [-7, 41.6, 0xE9D3AE, 0xC9A479]];   // тюленята на льдинках: x, z, окрас, пятнышки
const IDE_STEP = 0.55, IDE_MARKS = 90, IDE_MARK_LIFE = 11;   // шаг следов, сколько их сразу, сколько живут, с

let ideRnd = 7;   // своя «случайность»: у всех один и тот же остров
const ideR = () => (ideRnd = (ideRnd*16807) % 2147483647)/2147483647;
function ideSegD(x, z, a, b){   // расстояние от точки до отрезка
  const dx = b[0] - a[0], dz = b[1] - a[1], l = dx*dx + dz*dz, t = l ? Math.max(0, Math.min(1, ((x - a[0])*dx + (z - a[1])*dz)/l)) : 0;
  return Math.hypot(x - a[0] - dx*t, z - a[1] - dz*t);
}
function idePathD(x, z){
  let d = 99;
  for(const P of IDE_PATHS) for(let i = 1; i < P.length; i++) d = Math.min(d, ideSegD(x, z, P[i - 1], P[i]));
  return d;
}
function ideMossK(x, z){   // 0…1: насколько тут проталина (край неровный)
  let k = 0;
  for(const [mx, mz, r] of IDE_MOSS){
    const a = Math.atan2(z - mz, x - mx), rr = r*(1 + 0.18*Math.sin(a*3 + mx) + 0.1*Math.sin(a*5 + mz)), d = Math.hypot(x - mx, z - mz);
    k = Math.max(k, islSm(Math.max(0, Math.min(1, (rr - d)/0.7))));
  }
  return k;
}
// точка на тропинке: t — доля всей длины (0…1), side — на сколько вбок (+ вправо по ходу)
function idePathAt(P, t, side = 0){
  const seg = []; let L = 0;
  for(let i = 1; i < P.length; i++){ const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); seg.push(l); L += l; }
  let d = t*L, i = 0; while(i < seg.length - 1 && d > seg[i]){ d -= seg[i]; i++; }
  const a = P[i], b = P[i + 1], k = d/seg[i], dx = (b[0] - a[0])/seg[i], dz = (b[1] - a[1])/seg[i];
  return {x:a[0] + (b[0] - a[0])*k - dz*side, z:a[1] + (b[1] - a[1])*k + dx*side, yaw:Math.atan2(dx, dz)};
}

/* ---------- земля: зовёт islBuild для каждой вершины ---------- */
// свет на земле ≈ ×1,45 (солнце + небо): светлые цвета выгорают в белый, поэтому тут всё темнее, чем видно на экране
const IDE_C = {path:new THREE.Color(0xAE99A8), edge:new THREE.Color(0xA2B0CA), ice:new THREE.Color(0x9AB6CE), moss:new THREE.Color(0xA3C58C), moss2:new THREE.Color(0x8FB879)};
function ideTint(x, z, h, c){
  if(h < 0.1) return;   // у воды — как было (голубой лёд)
  // пятна голубого льда на ровных местах
  const n = Math.sin(x*0.23 + 1.3)*Math.sin(z*0.19 + 0.4) + 0.55*Math.sin(x*0.47 - z*0.33 + 2);
  if(n > 0.95) c.lerp(IDE_C.ice, Math.min(1, (n - 0.95)*3)*0.8);
  // проталины: мох пятнами
  const mk = ideMossK(x, z);
  if(mk > 0) c.lerp(Math.sin(x*1.7 + z*1.3) > 0.2 ? IDE_C.moss2 : IDE_C.moss, mk);
  // тропинки: утоптанный снег, по краю — лёгкая голубая кромка
  const d = idePathD(x, z);
  if(d < IDE_PATH_W + 0.6) c.lerp(IDE_C.edge, islSm(Math.max(0, Math.min(1, (IDE_PATH_W + 0.6 - d)/0.6)))*0.7);
  if(d < IDE_PATH_W + 0.25) c.lerp(IDE_C.path, islSm(Math.max(0, Math.min(1, (IDE_PATH_W + 0.25 - d)/0.35))));
}

/* ---------- одинаковые мелочи — одним InstancedMesh (и контур — вторым) ---------- */
function ideInst(G, geo, mat, items, ol = 0){
  const n = items.length; if(!n) return null;
  const m = new THREE.InstancedMesh(geo, mat, n), o = ol ? new THREE.InstancedMesh(geo, outlineMat, n) : null;
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new V3(), c = new THREE.Color();
  items.forEach((it, i) => {
    e.set(it.rx || 0, it.ry || 0, it.rz || 0); q.setFromEuler(e); sc.copy(it.s);
    M.compose(it.p, q, sc); m.setMatrixAt(i, M);
    if(it.c !== undefined) m.setColorAt(i, c.set(it.c));
    if(o){ sc.multiplyScalar(ol); M.compose(it.p, q, sc); o.setMatrixAt(i, M); }
  });
  if(m.instanceColor) m.instanceColor.needsUpdate = true;
  m.frustumCulled = false; G.add(m);   // границы у InstancedMesh считаются по одной штуке — без этого пропадают целиком
  if(o){ o.frustumCulled = false; G.add(o); }
  return m;
}
const ideY = (x, z) => islTerrain(x, z);

/* ---------- модельки мест ---------- */
function ideBench(G, x, z, yaw){
  const g = new THREE.Group(); g.position.set(x, ideY(x, z), z); g.rotation.y = yaw; G.add(g);
  islBox(g, 0xFF9BB8, 1.6, 0.12, 0.5, 0, 0.5, 0); islBox(g, 0xFF9BB8, 1.6, 0.4, 0.1, 0, 0.8, -0.22);
  for(const sx of [-0.65, 0.65]) islBox(g, 0x8C6A52, 0.1, 0.5, 0.4, sx, 0.25, 0);
  return g;
}
function ideBucket(G, x, z){   // ведро с рыбкой: хвостик торчит
  const g = new THREE.Group(); g.position.set(x, ideY(x, z), z); G.add(g);
  islCyl(g, 0x7FB8F0, 0.3, 0.24, 0.42, 0, 0.21, 0, 16, 1.08);
  const f = makeFish(0xFFA552); f.scale.setScalar(0.5); f.position.set(0.05, 0.5, 0); f.rotation.set(0, 0.4, 1.2); g.add(f);
  return g;
}
function ideCrate(G, x, z, s, yaw, y = 0){
  const g = new THREE.Group(); g.position.set(x, ideY(x, z) + y, z); g.rotation.y = yaw; G.add(g);
  islBox(g, 0xC89A6A, s, s, s, 0, s/2, 0);
  for(const k of [-1, 1]) islBox(g, 0xA87B52, s*1.02, s*0.12, s*1.02, 0, s/2 + k*s*0.32, 0, 1.0);
  return g;
}
function ideBarrel(G, x, z){
  const g = new THREE.Group(); g.position.set(x, ideY(x, z), z); G.add(g);
  islCyl(g, 0xB88A5E, 0.32, 0.32, 0.8, 0, 0.4, 0, 16, 1.06);
  for(const y of [0.18, 0.62]){ const r = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.035, 6, 18), inkMat); r.rotation.x = Math.PI/2; r.position.y = y; g.add(r); }
  return g;
}
function ideRing(G, x, y, z, yaw){   // спасательный круг: розовый с белыми полосками
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = yaw; G.add(g);
  g.add(addOutline(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.13, 10, 24), toon(0xFF7F9E)), 1.06));
  for(let i = 0; i < 4; i++){ const a = i*Math.PI/2 + Math.PI/4, b = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.29, 0.29), toon(0xFFFFFF)); b.position.set(Math.cos(a)*0.42, Math.sin(a)*0.42, 0); b.rotation.z = a; g.add(b); }
  return g;
}
function ideParcels(G, x, z){
  const g = new THREE.Group(); g.position.set(x, ideY(x, z), z); g.rotation.y = 0.3; G.add(g);
  islBox(g, 0xF3E2BC, 0.55, 0.36, 0.45, 0, 0.18, 0); islBox(g, 0xFFD66B, 0.4, 0.28, 0.34, 0.05, 0.5, 0.02);
  for(const [w, d] of [[0.56, 0.08], [0.08, 0.46]]) islBox(g, 0xFF7F9E, w, 0.37, d, 0, 0.185, 0, 1.0);
  return g;
}
function ideMat(G, x, z){   // коврик у двери иглу
  const m = new THREE.Mesh(new THREE.CircleGeometry(0.7, 24), toon(0xFF9BB8)); m.scale.set(1, 0.6, 1); m.rotation.x = -Math.PI/2;
  m.position.set(x, ideY(x, z) + 0.04, z); G.add(m);
  const h = new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.heart, transparent:true, depthWrite:false})); h.scale.setScalar(0.35); h.position.set(x, ideY(x, z) + 0.12, z); G.add(h);
}
function ideLamp(G, x, z){
  const g = new THREE.Group(), y = ideY(x, z); g.position.set(x, y, z); G.add(g);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.9, 8), inkMat); pole.position.y = 0.95; g.add(pole);
  const on = new THREE.MeshBasicMaterial({color:0xFFE9A8}), off = toon(0xFFF6DD);
  const lamp = addOutline(new THREE.Mesh(SMALL, off), 1.12); lamp.scale.set(0.2, 0.24, 0.2); lamp.position.y = 2.0; g.add(lamp);
  const cap = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.2, 10), toon(0xFF9BB8)), 1.1); cap.position.y = 2.3; g.add(cap);
  const gl = new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX, transparent:true, depthWrite:false, color:0xFFE38A})); gl.scale.setScalar(2.2); gl.position.y = 2.0; gl.visible = false; g.add(gl);
  return {lamp, gl, on, off};
}
function ideGarland(G, a, b, h){   // два столбика и провисшая верёвочка с флажками
  const flags = [], y0 = Math.max(ideY(...a), ideY(...b));
  for(const p of [a, b]){ const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, h, 8), toon(0x8C6A52)); pole.position.set(p[0], ideY(...p) + h/2, p[1]); G.add(pole); }
  const pts = [], N = Math.max(6, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1])/0.5));
  for(let i = 0; i <= 20; i++){ const k = i/20; pts.push(new V3(a[0] + (b[0] - a[0])*k, y0 + h - 0.1 - Math.sin(k*Math.PI)*0.45, a[1] + (b[1] - a[1])*k)); }
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({color:INK})); G.add(line);
  const yaw = Math.atan2(b[0] - a[0], b[1] - a[1]) - Math.PI/2, cols = [0xFF9BB8, 0xFFD66B, 0x9CD3F0, 0xBDE7C8];
  for(let i = 1; i < N; i++){
    const k = i/N; flags.push({p:new V3(a[0] + (b[0] - a[0])*k, y0 + h - 0.1 - Math.sin(k*Math.PI)*0.45 - 0.2, a[1] + (b[1] - a[1])*k), s:new V3(1, 1, 1), ry:yaw, c:cols[i % 4]});
  }
  return flags;
}
function ideGull(){   // маленькая чайка без кепки (кепка — только у папиной чайки из забега)
  const g = new THREE.Group(), white = toon(0xFFFFFF), grey = toon(0xC9D3E0);
  const body = addOutline(new THREE.Mesh(SMALL, white), 1.08); body.scale.set(0.26, 0.22, 0.42); g.add(body);
  const head = addOutline(new THREE.Mesh(SMALL, white), 1.08); head.scale.setScalar(0.18); head.position.set(0, 0.14, 0.36); g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 8), toon(0xFFC94D)); beak.rotation.x = Math.PI/2; beak.position.set(0, 0.12, 0.56); g.add(beak);
  const wings = [-1, 1].map(sd => { const pv = new THREE.Group(); pv.position.set(sd*0.18, 0.06, 0); g.add(pv);
    const w = addOutline(new THREE.Mesh(SMALL, grey), 1.08); w.scale.set(0.5, 0.04, 0.2); w.position.x = sd*0.45; pv.add(w); pv.userData.sd = sd; return pv; });
  g.userData.wings = wings;
  return g;
}

/* ---------- собираем один раз (конец islBuild) ---------- */
function ideBuild(G){
  ideRnd = 7;
  const U = G.userData, D = U.deco = {marks:[], mi:0, lastMark:null, foot:1, fishT:3, nightT:0, night:null, lamps:[], naps:[], gulls:[], steamT:0};
  // камушки вдоль тропинок (через раз, то слева, то справа)
  const pebbles = [];
  for(const P of IDE_PATHS){
    let L = 0; for(let i = 1; i < P.length; i++) L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
    for(let d = 1.2, sd = 1; d < L - 1; d += 1.6 + ideR()*1.4, sd = -sd){
      if(ideR() < 0.3) continue;
      const q = idePathAt(P, d/L, sd*(IDE_PATH_W + 0.35 + ideR()*0.25)), s = 0.12 + ideR()*0.1;
      if(idePathD(q.x, q.z) < IDE_PATH_W + 0.2) continue;
      pebbles.push({p:new V3(q.x, ideY(q.x, q.z) + s*0.25, q.z), s:new V3(s, s*0.6, s), ry:ideR()*6, c:[0xA9B2C8, 0xB8AEC8, 0x9FAEC4][Math.floor(ideR()*3)]});
    }
  }
  ideInst(G, new THREE.DodecahedronGeometry(1), toon(0xFFFFFF), pebbles, 1.14);
  // проталины: травка и полярные маки
  const grass = [], flowers = [];
  for(const [mx, mz, r] of IDE_MOSS){
    for(let i = 0; i < 9; i++){
      const a = ideR()*Math.PI*2, d = Math.sqrt(ideR())*r*0.8, x = mx + Math.cos(a)*d, z = mz + Math.sin(a)*d;
      if(ideMossK(x, z) < 0.5 || idePathD(x, z) < IDE_PATH_W + 0.3) continue;
      grass.push({p:new V3(x, ideY(x, z) + 0.12, z), s:new V3(0.07, 0.3, 0.07), rx:(ideR() - 0.5)*0.5, rz:(ideR() - 0.5)*0.5, c:0x8FBF7A});
      if(ideR() < 0.7){
        const fx = x + 0.25, fz = z + 0.1;
        flowers.push({p:new V3(fx, ideY(fx, fz) + 0.3, fz), s:new V3(0.15, 0.08, 0.15), c:[0xFFD66B, 0xFFD66B, 0xFFFFFF, 0xFF9BB8][Math.floor(ideR()*4)]});
        grass.push({p:new V3(fx, ideY(fx, fz) + 0.14, fz), s:new V3(0.025, 0.16, 0.025), c:0x7FAF6A});
      }
    }
  }
  ideInst(G, new THREE.ConeGeometry(1, 1, 5), toon(0xFFFFFF), grass);
  ideInst(G, SMALL, toon(0xFFFFFF), flowers, 1.25);
  // ледяные кристаллы кучками по 3–4
  const cr = [];
  for(const [x, z] of IDE_CRYST){
    const n = 3 + (ideR() < 0.5 ? 1 : 0);
    for(let i = 0; i < n; i++){
      const a = i/n*Math.PI*2 + ideR(), d = i ? 0.35 + ideR()*0.25 : 0, h = i ? 0.5 + ideR()*0.4 : 1.1, px = x + Math.cos(a)*d, pz = z + Math.sin(a)*d;
      cr.push({p:new V3(px, ideY(px, pz) + h*0.4, pz), s:new V3(0.2 + ideR()*0.08, h, 0.2 + ideR()*0.08), rx:i ? Math.sin(a)*0.35 : 0, rz:i ? -Math.cos(a)*0.35 : 0, ry:ideR()*2,
        c:[0xBFE6F7, 0xCDEFE3, 0xDCD3F5, 0xBFE6F7][Math.floor(ideR()*4)]});
    }
  }
  ideInst(G, new THREE.ConeGeometry(1, 1, 5), toon(0xFFFFFF), cr, 1.1);
  // фонарики вдоль тропинок и флажки
  for(const [pi, t, sd] of IDE_LAMPS){ const q = idePathAt(IDE_PATHS[pi], t, sd*(IDE_PATH_W + 0.55)); D.lamps.push(ideLamp(G, q.x, q.z)); }
  const flags = [];
  for(const [a, b, h] of IDE_GARL) flags.push(...ideGarland(G, a, b, h));
  const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.13, 0.1, 0, 0.13, 0.1, 0, 0, -0.2, 0], 3)); tri.computeVertexNormals();
  const fm = toon(0xFFFFFF); fm.side = THREE.DoubleSide;
  D.flags = ideInst(G, tri, fm, flags); D.flagItems = flags;
  // у мест: сценки
  ideBench(G, -25.4, -15.2, 0.25); ideBucket(G, -18.9, -15.4);
  ideMat(G, 20, -3.1); D.steam = new V3(20, ideY(20, -6) + 2.35, -6);
  ideCrate(G, -32.7, 0.4, 0.7, 0.2); ideCrate(G, -32.6, 0.45, 0.5, -0.3, 0.7); ideBarrel(G, -27.2, 0.3);
  ideRing(G, -18.25, 0.95, 25.1, Math.PI/2); ideBarrel(G, -15.3, 24.1); ideBarrel(G, -14.7, 24.9);
  ideParcels(G, -0.7, -25.4);
  // чайки
  for(const [x, z, r, h] of IDE_GULLS){ const g = ideGull(); G.add(g); D.gulls.push({g, x, z, r, h, a:ideR()*6, v:(0.25 + ideR()*0.15)*(ideR() < 0.5 ? -1 : 1)}); }
  // рыбка выпрыгивает у берега (одна на всех, по очереди)
  D.fish = makeFish(0xFFA552); D.fish.scale.setScalar(0.7); D.fish.visible = false; G.add(D.fish);
  // тюленята дремлют на льдинках
  for(const [x, z, c, sp] of IDE_NAPS){
    const s = makeSeal({name:'', f:ideR() < 0.5, color:c, spot:sp}); s.root.scale.setScalar(0.42); s.root.position.set(x, 0.25, z); s.root.rotation.y = ideR()*6;
    setMood(s, 'sleep'); if(s.bubble) s.bubble.visible = false; G.add(s.root);
    const zz = new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTex('💤'), transparent:true, depthWrite:false})); zz.scale.setScalar(0.55); G.add(zz);
    D.naps.push({s, x, z, zz, wake:0});
  }
  // следы на снегу и тени
  const mg = new THREE.CircleGeometry(1, 10); mg.rotateX(-Math.PI/2);
  const mm = new THREE.MeshBasicMaterial({color:0xC9D4EA, transparent:true, opacity:0.75, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-2, polygonOffsetUnits:-2});
  D.markMesh = new THREE.InstancedMesh(mg, mm, IDE_MARKS); D.markMesh.frustumCulled = false; D.markMesh.renderOrder = 1; G.add(D.markMesh);
  for(let i = 0; i < IDE_MARKS; i++) D.marks.push({t:-99, p:new V3(), sx:0, sz:0, yaw:0});
  ideMarksDraw(D, true);
  const shm = new THREE.MeshBasicMaterial({color:0x4F5F86, transparent:true, opacity:0.2, depthWrite:false, polygonOffset:true, polygonOffsetFactor:-3, polygonOffsetUnits:-3});
  D.shadow = new THREE.Mesh(mg, shm); D.shadow.renderOrder = 2; G.add(D.shadow);
  D.pShadow = new THREE.Mesh(mg, shm); D.pShadow.renderOrder = 2; D.pShadow.visible = false; G.add(D.pShadow);
}

/* ---------- следы ---------- */
const ideM4 = new THREE.Matrix4(), ideQ = new THREE.Quaternion(), ideE = new THREE.Euler(), ideS = new V3();
function ideMarksDraw(D, all){
  for(let i = 0; i < D.marks.length; i++){
    const m = D.marks[i], age = now - m.t, k = age > IDE_MARK_LIFE ? 0 : Math.min(1, (IDE_MARK_LIFE - age)/3);
    if(!all && k >= 1 && !m.fresh) continue;
    m.fresh = false;
    ideE.set(0, m.yaw, 0); ideQ.setFromEuler(ideE); ideS.set(m.sx*k || 0.0001, 1, m.sz*k || 0.0001);
    ideM4.compose(m.p, ideQ, ideS); D.markMesh.setMatrixAt(i, ideM4);
  }
  D.markMesh.instanceMatrix.needsUpdate = true;
}
function ideMark(D, x, y, z, yaw, sx, sz){
  const m = D.marks[D.mi]; D.mi = (D.mi + 1) % D.marks.length;
  m.t = now; m.p.set(x, y, z); m.yaw = yaw; m.sx = sx; m.sz = sz; m.fresh = true;
}
function ideFeet(D, R, sc){
  const P = R.pos, g = islGround(P.x, P.z), onSnow = !R.air && !R.water && g > 0.12 && islTerrain(P.x, P.z) >= g - 0.05;
  if(!onSnow){ D.lastMark = null; return; }
  if(!D.lastMark){ D.lastMark = P.clone(); return; }
  const slide = R.slide > 0.3, step = slide ? 0.3 : IDE_STEP*sc/0.84;
  if(Math.hypot(P.x - D.lastMark.x, P.z - D.lastMark.z) < step) return;
  D.lastMark.copy(P);
  const yaw = R.yaw, y = g + (slide ? 0.05 : 0.03);
  if(slide) ideMark(D, P.x, y, P.z, yaw, 0.42*sc, 0.34*sc);   // на пузике — дорожка
  else {   // ласты: то левая, то правая
    D.foot = -D.foot; const off = 0.3*sc*D.foot;
    ideMark(D, P.x + Math.cos(yaw)*off, y, P.z - Math.sin(yaw)*off, yaw, 0.13*sc, 0.2*sc);
  }
}

/* ---------- каждый кадр прогулки ---------- */
function ideStep(dt){
  const D = islRoot.userData.deco; if(!D || !ISL) return;
  const R = ISL.R, P = R.pos, sc = petScale();
  // тень под малышом: меньше и светлее, когда высоко
  const g = islGround(P.x, P.z), wet = g < ROAM_DEEP, up = Math.max(0, P.y - g);
  D.shadow.visible = !wet;
  if(!wet){ const k = Math.max(0.35, 1 - up/3.5); D.shadow.position.set(P.x, g + 0.03, P.z); D.shadow.scale.set(1.05*sc*k, 1, 1.35*sc*k); D.shadow.rotation.y = R.yaw; D.shadow.material.opacity = 0.2*k + 0.04; }
  if(ISL.ping){ const p = ISL.ping.pos, pg0 = islGround(p.x, p.z); D.pShadow.visible = pg0 > ROAM_DEEP; D.pShadow.position.set(p.x, pg0 + 0.03, p.z); D.pShadow.scale.set(0.55, 1, 0.55); }
  else D.pShadow.visible = false;
  // следы
  ideFeet(D, R, sc); ideMarksDraw(D, false);
  // флажки треплются (раз в несколько кадров хватает)
  D.flagT = (D.flagT || 0) - dt;
  if(D.flags && D.flagT <= 0){
    D.flagT = 0.08;
    D.flagItems.forEach((f, i) => { ideE.set(Math.sin(now*3 + i*0.9)*0.35, f.ry, 0); ideQ.setFromEuler(ideE); ideM4.compose(f.p, ideQ, f.s); D.flags.setMatrixAt(i, ideM4); });
    D.flags.instanceMatrix.needsUpdate = true;
  }
  // ночью фонарики светят
  D.nightT -= dt;
  if(D.nightT <= 0){ D.nightT = 5; const n = islNight(); if(n !== D.night){ D.night = n; for(const l of D.lamps){ l.lamp.material = n ? l.on : l.off; l.gl.visible = n; } } }
  if(D.night) for(const l of D.lamps) l.gl.material.opacity = 0.75 + Math.sin(now*2.3 + l.lamp.id)*0.12;
  // чайки кружат и машут
  for(const c of D.gulls){
    c.a += c.v*dt;
    const x = c.x + Math.cos(c.a)*c.r, z = c.z + Math.sin(c.a)*c.r;
    c.g.position.set(x, c.h + Math.sin(now*0.9 + c.r)*0.6, z);
    c.g.rotation.set(0, Math.atan2(-Math.sin(c.a)*Math.sign(c.v), Math.cos(c.a)*Math.sign(c.v)), -0.3*Math.sign(c.v));
    const flap = Math.sin(now*1.3 + c.r) > 0.2 ? Math.sin(now*9 + c.r)*0.5 : 0.08;   // то машет, то парит
    for(const w of c.g.userData.wings) w.rotation.z = w.userData.sd*flap;
  }
  // пар над иглу
  D.steamT -= dt;
  if(D.steamT <= 0){ D.steamT = 0.7; if(Math.hypot(P.x - D.steam.x, P.z - D.steam.z) < 30) emit(TEX.puff, ISL_POS.clone().add(D.steam), {v:new V3(0.15, 0.6, 0), life:2.2, size:0.5, grow:1.4}); }
  // рыбка выпрыгивает у берега, недалеко от малыша
  ideFishStep(D, dt, P);
  // тюленята дремлют; подошла — просыпаются и здороваются
  for(const n of D.naps){
    const d = Math.hypot(P.x - n.x, P.z - n.z);
    if(d > 45){ n.zz.visible = false; continue; }
    const s = n.s;
    if(d < 3.2 && n.wake <= 0){
      n.wake = 7; setMood(s, 'happy'); s.flap = 0.8; hop(s, 0.35, 0.45); sfx.arf();
      floatText(L(['Привет!', 'Ой, гости!', 'Поиграем?'], ['Hi!', 'Oh, visitors!', 'Wanna play?'])[Math.floor(Math.random()*3)], ISL_POS.clone().add(new V3(n.x, 1.4, n.z)), '#D9527E');
      burst(TEX.heart, ISL_POS.clone().add(new V3(n.x, 0.9, n.z)), 5, 1.2, 0.22);
    }
    if(n.wake > 0){ n.wake -= dt; if(n.wake <= 0){ setMood(s, 'sleep'); s.flap = 0; } }
    else s.flap = 0;
    n.zz.visible = n.wake <= 0;
    if(n.zz.visible){ const k = (now*0.4 + n.x) % 1; n.zz.position.set(n.x + 0.3 + k*0.3, 0.9 + k*0.8, n.z); n.zz.material.opacity = Math.sin(k*Math.PI); }
    updateSeal(s, now + n.x, dt);
    s.body.scale.y *= n.wake > 0 ? 1 : 1 + Math.sin(now*1.4 + n.x)*0.03;   // дышит во сне
  }
}
function ideFishStep(D, dt, P){
  const f = D.fish;
  if(f.visible){
    const k = (now - D.fishT0)/1.1;
    if(k >= 1){ f.visible = false; emit(TEX.dot, ISL_POS.clone().add(D.fishB), {v:new V3(0, 1.4, 0), life:0.7, size:0.2, grow:0.6}); sfx.drip && sfx.drip(); return; }
    const p = D.fishA.clone().lerp(D.fishB, k); p.y = -0.1 + Math.sin(k*Math.PI)*1.7;
    f.position.copy(p); f.rotation.set(0, D.fishYaw, (0.5 - k)*2.2);
    return;
  }
  D.fishT -= dt; if(D.fishT > 0) return;
  D.fishT = 3.5 + Math.random()*4;
  // точка у берега в сторону от малыша к морю
  const a0 = Math.atan2((P.z + 2)/34, P.x/40), a = a0 + (Math.random() - 0.5)*0.9, fk = 1 + 0.06*Math.sin(3*a) + 0.04*Math.sin(5*a + 1) + 0.03*Math.sin(9*a + 2);
  const x = 40*fk*1.12*Math.cos(a), z = 34*fk*1.12*Math.sin(a) - 2;
  if(Math.hypot(x - P.x, z - P.z) > 22 || islTerrain(x, z) > -0.3) return;
  const dir = Math.random()*Math.PI*2;
  D.fishA = new V3(x, -0.1, z); D.fishB = new V3(x + Math.cos(dir)*2.2, -0.1, z + Math.sin(dir)*2.2); D.fishYaw = -dir; D.fishT0 = now;
  f.children[0].material.color.set([0xFFA552, 0xFF9BB8, 0x9CD3F0, 0xFFD66B][Math.floor(Math.random()*4)]);
  f.visible = true; emit(TEX.dot, ISL_POS.clone().add(D.fishA), {v:new V3(0, 1.4, 0), life:0.6, size:0.18, grow:0.5});
}
