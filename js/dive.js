/* ---------------- Нырнуть: подводная бухта (Спринт 3, задача 4, часть 1) ----------------
   ⚽ «Поиграть» → 🤿 «Нырнуть». Вид сбоку, как в аквариуме: x — вдоль бухты (0…64), y — глубина
   (0 — поверхность, дно ≈ −8…−15), малыш плавает в плоскости z = 0. Держи палец — плывёт туда;
   коснись жителя или вещи — подплывёт сам и сделает дело (сфотографирует, откроет, поднимет).
   Занятия:
   📖 энциклопедия моря — сфотографируй жителя, выходит карточка с настоящим фактом (все 15 — картина в иглу);
   🦪 три раковины — по жемчужинке в день; 🌱 подводный сад — росток растёт по настоящему времени;
   🐢 черепаха в старой сети — развязать узелки кругом пальца (один раз, потом плавает свободно);
   🗺️ три кусочка карты → сундук в затонувшем кораблике (лампа-жемчужина в иглу);
   🦈 акула-непоседа: приплывает поиграть в салки — прячься в водорослях, в щели между камнями или в кораблике;
      после двух пряток выясняется, что она потеряла мячик — найди его и верни, акула становится подружкой (коврик в иглу).
   Гости дня (калан, белуха, рыба-луна, нарвал) — по одному в день. Проиграть нельзя, воздух не кончается.
   Часть 2 (Спринт 3, задача 4):
   🌑 Мгла — тёмное облако с горящими глазами выползает из грота. Её боятся даже акулы: гаснет свет, всё прячется.
      От неё только прятаться; поймала — выплёвывает наверх (одна — домой, вдвоём — к началу бухты). Про неё потом будет история и бой.
   🌐 вдвоём по сети («Вместе» → 🤿): плывём рядом, коснись напарника — держишься за его ласту (вдвоём быстрее);
      🦪 большая раковина в глубине открывается только вдвоём (или с Пингом); акула и Мгла охотятся за обоими.
      Главный — хозяин комнаты: у него акула и Мгла, гостю приходит, где они. Сохранения у каждого свои.
   Бухта стоит далеко в стороне (DV_POS), камера — runCam, как в забеге. Подключается после icecode.js и до game.js. */
const DV_POS = new V3(400, 0, 0);
const DV_SPEED = 4.2, DV_LEN = 64;                  // скорость малыша под водой; длина бухты
const DV_SHARK_V = 3.0, DV_SHARK_T = [24, 42];      // акула чуть медленнее малыша; приплывает через 24 с, потом раз в 42 с
const DV_HIDES = 2;                                 // сколько раз спрятаться, чтобы узнать про мячик
const DV_PEARL = 3, DV_NEW = 3, DV_TURTLE = 15, DV_GARDEN = 4;   // ракушки: жемчужинка, новый житель, черепаха, грядка
const DV_GROW = [6, 18];                            // росток подрастает через 6 ч и вырастает через 18 ч
const DV_GLOOM_T = [55, 80];                        // Мгла: первый раз через 55 с после погружения, потом раз в 80 с
const DV_GLOOM_V = [2.2, 3.6], DV_GLOOM_SEE = 7.5;  // ползёт / гонится (малыш — 4,2, за ласту — быстрее); видит на 7,5 м
const DV_GLOOM_LONG = 22;                           // сколько секунд Мгла рыщет по бухте, потом уползает в грот
const DV_BIG = 10, DV_BIG_X = 50.8;                 // большая раковина: ракушки за большую жемчужину (раз в день), где лежит
const DV_FLOOR = [[-8, -8.2], [6, -8.8], [14, -10], [22, -11.8], [34, -12.4], [42, -13.6], [52, -14.8], [80, -14.8]];
function dvFloor(x){
  const f = DV_FLOOR; x = Math.max(f[0][0], x);
  for(let i = 1; i < f.length; i++) if(x <= f[i][0]){ const [x0, y0] = f[i - 1], [x1, y1] = f[i], k = (x - x0)/(x1 - x0); return y0 + (y1 - y0)*k*k*(3 - 2*k); }
  return f[f.length - 1][1];
}
if(!save.dive) save.dive = sanitizeDive(null);   // Pages мог отдать старый data.js
const dvToday = () => new Date().toDateString();
const dvDayN = () => Math.floor((Date.now() - new Date().getTimezoneOffset()*6e4)/864e5);
// где прятаться от акулы: водоросли, щель между камнями, кораблик
const DV_HIDE = [{x:12, y:() => dvFloor(12) + 1.7, r:1.9}, {x:30.3, y:() => dvFloor(30.3) + 1.1, r:1.3},
  {x:37.5, y:() => dvFloor(37.5) + 1.7, r:1.9}, {x:56.6, y:() => dvFloor(56.6) + 1.2, r:1.7}];

/* ---------- модельки: смотрят на +x (кроме краба и осьминога — те лицом к нам), размеры в метрах ---------- */
function dvBlob(g, col, sx, sy, sz, x = 0, y = 0, z = 0, ol = 1.06){
  const m = addOutline(new THREE.Mesh(SMALL, typeof col === 'number' ? toon(col) : col), ol); m.scale.set(sx, sy, sz); m.position.set(x, y, z); g.add(m); return m;
}
function dvEyes(g, x, y, z, r = 0.05, front = false){   // глаза-точки с бликом; front — оба спереди (лицом к нам)
  for(const sd of [-1, 1]){
    const p = front ? [x + sd*z, y, 0] : [x, y, sd*z];
    const e = new THREE.Mesh(SMALL, inkMat); e.scale.setScalar(r); e.position.set(...p); g.add(e);
    const h = new THREE.Mesh(SMALL, whiteMat); h.scale.setScalar(r*0.38);
    h.position.set(p[0] + r*0.3, p[1] + r*0.35, front ? p[2] + r*0.85 : p[2] + sd*r*0.85); g.add(h);
  }
}
function dvBlush(g, x, y, z, front = false){
  for(const sd of [-1, 1]){ const b = new THREE.Mesh(SMALL, new THREE.MeshBasicMaterial({color:0xFFB3C7})); b.scale.set(0.05, 0.03, 0.01);
    b.position.set(front ? x + sd*z : x, y, front ? 0 : sd*z); g.add(b); }
}
function dvKelp(h, col = 0x5DB57E, seg = 6){   // стебель из звеньев: каждое чуть качается (dvSway)
  const g = new THREE.Group(), m = toon(col), pivs = [], L = h/seg;
  let par = g;
  for(let i = 0; i < seg; i++){
    const p = new THREE.Group(); p.position.y = i ? L : 0; par.add(p); pivs.push(p);
    const leaf = addOutline(new THREE.Mesh(SMALL, m), 1.1); leaf.scale.set(0.09 + 0.05*Math.sin(i*1.7 + h), L*0.62, 0.2); leaf.position.y = L*0.5; leaf.rotation.z = (i % 2 ? 1 : -1)*0.18; p.add(leaf);
    par = p;
  }
  g.userData.pivs = pivs; g.userData.ph = Math.random()*6; return g;
}
const DV_MAKE = {
  kelp(){ const g = new THREE.Group(); [[0, 4.2], [0.35, 3.3], [-0.3, 2.6]].forEach(([x, h], i) => { const k = dvKelp(h, i ? 0x6CC28C : 0x4FA877); k.position.x = x; g.add(k); }); return g; },
  starfish(){
    const g = new THREE.Group(), st = addOutline(new THREE.Mesh(STAR_GEO, toon(0xFF8A5B)), 1.06); st.scale.setScalar(0.9); st.rotation.x = -0.75; g.add(st);
    for(const [x, y] of [[0, 0.2], [0.17, -0.02], [-0.15, 0.05], [0.1, -0.2], [-0.1, -0.18]]){ const d = new THREE.Mesh(SMALL, toon(0xFFD1B8)); d.scale.set(0.03, 0.03, 0.02); d.position.set(x, y, 0.1); st.add(d); }
    const face = new THREE.Group(); face.position.set(0, 0.02, 0.12); st.add(face); dvEyes(face, 0, 0.03, 0.07, 0.035, true); dvBlush(face, 0, -0.04, 0.13, true);
    return g;
  },
  crab(){
    const g = new THREE.Group(), c = 0xFF6B5B;
    dvBlob(g, c, 0.42, 0.24, 0.3, 0, 0.3, 0);
    for(const sd of [-1, 1]){
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.22, 6), inkMat); st.position.set(sd*0.12, 0.6, 0.12); g.add(st);
      const e = new THREE.Mesh(SMALL, whiteMat); e.scale.setScalar(0.07); e.position.set(sd*0.12, 0.72, 0.12); g.add(addOutline(e, 1.2));
      const p = new THREE.Mesh(SMALL, inkMat); p.scale.setScalar(0.035); p.position.set(sd*0.12, 0.72, 0.18); g.add(p);
      dvBlob(g, c, 0.15, 0.12, 0.1, sd*0.5, 0.42, 0.12);
      const pin = dvBlob(g, c, 0.07, 0.05, 0.06, sd*0.6, 0.52, 0.12); pin.rotation.z = sd*0.6;
      for(let i = 0; i < 3; i++){ const l = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.3, 6), toon(c)); l.position.set(sd*(0.38 + i*0.04), 0.12, -0.12 + i*0.1); l.rotation.z = sd*0.7; g.add(l); }
    }
    dvBlush(g, 0, 0.28, 0.2, true); g.children.slice(-2).forEach(b => b.position.z = 0.29);
    return g;
  },
  urchin(){
    const g = new THREE.Group(); dvBlob(g, 0x9575CD, 0.28, 0.24, 0.28, 0, 0.24, 0);
    const sp = new THREE.ConeGeometry(0.03, 0.26, 5), sm = toon(0x6E4FA8);
    for(let i = 0; i < 30; i++){
      const y = 1 - (i + 0.5)/30*2, a = i*2.4, r = Math.sqrt(1 - y*y), d = new V3(Math.cos(a)*r, y, Math.sin(a)*r);
      if(d.y < -0.4 || (d.z > 0.55 && Math.abs(d.y) < 0.45 && Math.abs(d.x) < 0.6)) continue;   // снизу и на мордочке иголок нет
      const c = new THREE.Mesh(sp, sm); c.position.set(d.x*0.34, 0.24 + d.y*0.3, d.z*0.34); c.quaternion.setFromUnitVectors(new V3(0, 1, 0), d); g.add(c);
    }
    dvEyes(g, 0, 0.3, 0.08, 0.035, true); g.children.slice(-4).forEach(e => e.position.z = 0.28 + (e.material === whiteMat ? 0.03 : 0));
    return g;
  },
  anemone(){
    const g = new THREE.Group(), tents = new THREE.Group(); tents.position.y = 0.5; g.add(tents);
    const base = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 0.5, 18), toon(0xFF8FB0)), 1.06); base.position.y = 0.25; g.add(base);
    for(let i = 0; i < 12; i++){
      const a = i/12*Math.PI*2, p = new THREE.Group(); p.position.set(Math.cos(a)*0.17, 0, Math.sin(a)*0.17); p.rotation.set(Math.sin(a)*0.5, 0, -Math.cos(a)*0.5); tents.add(p);
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.36, 6), toon(0xFFB3C9)); t.position.y = 0.18; p.add(t);
      const tip = new THREE.Mesh(SMALL, toon(0xFFE0EA)); tip.scale.setScalar(0.05); tip.position.y = 0.37; p.add(tip);
    }
    const face = new THREE.Group(); face.position.set(0, 0.28, 0.27); g.add(face); dvEyes(face, 0, 0.02, 0.07, 0.035, true); dvBlush(face, 0, -0.05, 0.12, true);
    g.userData.tents = tents; return g;
  },
  jelly(){
    const g = new THREE.Group(), jm = new THREE.MeshToonMaterial({color:0xFFB3D1, transparent:true, opacity:0.88});
    const dome = addOutline(new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 12, 0, Math.PI*2, 0, Math.PI/2), jm), 1.05); dome.scale.y = 0.85; g.add(dome);
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.4, 0.07, 24), jm); skirt.position.y = -0.02; g.add(skirt);
    const face = new THREE.Group(); face.position.set(0, 0.14, 0.4); g.add(face); dvEyes(face, 0, 0, 0.12, 0.04, true); dvBlush(face, 0, -0.07, 0.2, true);
    for(let i = 0; i < 6; i++){
      const a = i/6*Math.PI*2 + 0.3, pts = []; for(let j = 0; j <= 5; j++) pts.push(new V3(Math.cos(a)*0.28 + Math.sin(j*1.3 + i)*0.06, -j*0.14, Math.sin(a)*0.28));
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.03, 6), toon(0xF2A6C6)));   // без контура: трубка далеко от центра, контур бы съехал
    }
    return g;
  },
  turtle(){
    const g = new THREE.Group(), skin = 0xB5D98C, fl = [];
    dvBlob(g, 0x6FAF7A, 0.62, 0.3, 0.5, 0, 0.05, 0);
    dvBlob(g, 0xE6D9A2, 0.58, 0.14, 0.46, 0, -0.12, 0);
    for(const [x, z] of [[0, 0], [0.28, 0.18], [-0.28, 0.18], [0.28, -0.18], [-0.28, -0.18], [0, 0.34]]){ const d = new THREE.Mesh(SMALL, toon(0x4E8C5C)); d.scale.set(0.13, 0.05, 0.11); d.position.set(x, 0.3 - Math.abs(z)*0.25, z); g.add(d); }
    const head = new THREE.Group(); head.position.set(0.72, 0.06, 0); g.add(head); dvBlob(head, skin, 0.22, 0.18, 0.17);
    dvEyes(head, 0.1, 0.06, 0.12, 0.04); dvBlush(head, 0.08, -0.03, 0.15);
    for(const [x, z, s] of [[0.32, 1, 1], [0.32, -1, 1], [-0.38, 1, 0.7], [-0.38, -1, 0.7]]){
      const p = new THREE.Group(); p.position.set(x, -0.05, z*0.42); g.add(p); fl.push(p);
      const f = dvBlob(p, skin, 0.3*s, 0.05, 0.13*s, 0.05, 0, z*0.12); f.rotation.y = -z*0.5;
    }
    g.userData.fl = fl; return g;
  },
  ray(){
    const g = new THREE.Group(), in_ = new THREE.Group(); in_.rotation.x = -0.55; g.add(in_);
    const w = dvBlob(in_, 0x8FA3C8, 0.62, 0.09, 0.85); w.rotation.y = Math.PI/4;
    const b = new THREE.Mesh(SMALL, toon(0xF1F5FA)); b.scale.set(0.5, 0.07, 0.7); b.rotation.y = Math.PI/4; b.position.y = -0.03; in_.add(b);
    const tl = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.04, 1.2, 6), toon(0x7D90B5)); tl.rotation.z = Math.PI/2; tl.position.x = -1.0; in_.add(tl);
    const face = new THREE.Group(); face.position.set(0.3, 0.08, 0); in_.add(face); dvEyes(face, 0, 0.02, 0.12, 0.045); dvBlush(face, -0.05, 0.02, 0.2);
    g.userData.wing = in_; return g;
  },
  octopus(){
    const g = new THREE.Group(), c = 0xFF8F7A;
    dvBlob(g, c, 0.4, 0.46, 0.38, 0, 0.62, 0);
    for(let i = 0; i < 8; i++){
      const a = (i/8 - 0.5)*Math.PI*1.7, pts = [];
      for(let j = 0; j <= 6; j++){ const r = 0.2 + j*0.1, y = 0.3 - j*0.05 + (j > 3 ? (j - 3)*0.05 : 0); pts.push(new V3(Math.sin(a)*r + (j > 4 ? Math.sin(a)*0.05 : 0), Math.max(0.03, y), 0.05 + Math.cos(a)*r*0.6)); }
      g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.06, 7), toon(0xF27C68)));
    }
    for(const [x, y] of [[-0.18, 0.85], [0.2, 0.9], [0.05, 1.0]]){ const d = new THREE.Mesh(SMALL, toon(0xFFC0B0)); d.scale.set(0.05, 0.05, 0.02); d.position.set(x, y, 0.3); g.add(d); }
    const face = new THREE.Group(); face.position.set(0, 0.58, 0.36); g.add(face); dvEyes(face, 0, 0.02, 0.12, 0.05, true); dvBlush(face, 0, -0.08, 0.2, true);
    return g;
  },
  angler(){
    const g = new THREE.Group();
    dvBlob(g, 0x6D5F96, 0.45, 0.38, 0.34);
    const bl = new THREE.Mesh(SMALL, toon(0x9D8FC4)); bl.scale.set(0.36, 0.2, 0.3); bl.position.set(0.05, -0.16, 0); g.add(bl);
    const tl = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.3, 4), toon(0x6D5F96)), 1.1); tl.rotation.z = Math.PI/2; tl.position.x = -0.55; tl.scale.z = 0.4; g.add(tl);
    for(const sd of [-1, 1]){
      const m = new THREE.Mesh(SMALL, inkMat); m.scale.set(0.14, 0.025, 0.02); m.position.set(0.36, -0.08, sd*0.24); m.rotation.y = -sd*0.6; g.add(m);
      for(const x of [0.3, 0.4]){ const t = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 4), whiteMat); t.rotation.z = Math.PI; t.position.set(x, -0.1, sd*(0.27 - (x - 0.3))); g.add(t); }
    }
    dvEyes(g, 0.3, 0.14, 0.26, 0.05);
    const pts = [new V3(0.1, 0.34, 0), new V3(0.3, 0.7, 0), new V3(0.6, 0.78, 0), new V3(0.72, 0.62, 0)];
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.018, 5), inkMat));
    const bulb = new THREE.Mesh(SMALL, new THREE.MeshBasicMaterial({color:0xFFF2A0})); bulb.scale.setScalar(0.09); bulb.position.set(0.72, 0.56, 0); g.add(bulb);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX, color:0xFFF4C0, transparent:true, depthWrite:false})); gl.scale.setScalar(1.8); gl.position.copy(bulb.position); g.add(gl);
    g.userData.glow = gl; return g;
  },
  otter(){   // калан лежит на спинке, на животике ракушка
    const g = new THREE.Group(), c = 0x9A6B4A;
    dvBlob(g, c, 0.58, 0.2, 0.26);
    const bl = new THREE.Mesh(SMALL, toon(0xD9B48F)); bl.scale.set(0.46, 0.12, 0.22); bl.position.y = 0.1; g.add(bl);
    const head = new THREE.Group(); head.position.set(0.6, 0.1, 0); g.add(head);
    dvBlob(head, c, 0.24, 0.22, 0.22); dvBlob(head, 0xEAD5B8, 0.14, 0.11, 0.15, 0.14, -0.02, 0);
    const nose = new THREE.Mesh(SMALL, inkMat); nose.scale.set(0.04, 0.03, 0.03); nose.position.set(0.28, 0.02, 0); head.add(nose);
    dvEyes(head, 0.12, 0.1, 0.13, 0.035); dvBlush(head, 0.1, 0, 0.19);
    for(const sd of [-1, 1]) dvBlob(g, c, 0.07, 0.06, 0.06, 0.3, 0.22, sd*0.1);
    const sh = dvBlob(g, 0xFFC2D6, 0.1, 0.03, 0.09, 0.18, 0.26, 0); sh.rotation.z = 0.2;
    const tail = dvBlob(g, c, 0.28, 0.06, 0.1, -0.7, 0.05, 0); tail.rotation.z = -0.2;
    return g;
  },
  beluga(){
    const g = new THREE.Group(), w = 0xF4F8FC, fl = [];
    dvBlob(g, w, 1.35, 0.55, 0.55);
    dvBlob(g, w, 0.42, 0.42, 0.42, 1.2, 0.14, 0);   // лоб-«дыня»
    dvBlob(g, 0xE6EEF6, 0.2, 0.15, 0.2, 1.52, -0.08, 0);
    dvEyes(g, 1.3, 0.12, 0.34, 0.05); dvBlush(g, 1.36, -0.02, 0.36);
    for(const sd of [-1, 1]){ const m = new THREE.Mesh(SMALL, inkMat); m.scale.set(0.12, 0.018, 0.02); m.position.set(1.5, -0.14, sd*0.14); m.rotation.y = -sd*0.5; g.add(m); }
    for(const sd of [-1, 1]){ const f = dvBlob(g, w, 0.28, 0.05, 0.14, 0.55, -0.3, sd*0.5); f.rotation.set(sd*0.4, 0, -0.5); }
    const tail = new THREE.Group(); tail.position.x = -1.3; g.add(tail); fl.push(tail);
    for(const sd of [-1, 1]){ const f = dvBlob(tail, w, 0.3, 0.05, 0.16, -0.2, 0, sd*0.2); f.rotation.y = sd*0.6; }
    g.userData.fl = fl; return g;
  },
  sunfish(){
    const g = new THREE.Group(), c = 0xB9C6D6;
    dvBlob(g, c, 0.72, 0.78, 0.2);
    for(const [x, y] of [[-0.2, 0.3], [0.2, 0.4], [-0.3, -0.2], [0.1, -0.35], [0.35, 0.05]]){ const d = new THREE.Mesh(SMALL, toon(0xD8E1EC)); d.scale.set(0.08, 0.08, 0.02); d.position.set(x, y, 0.19); g.add(d); }
    for(const sd of [-1, 1]){ const f = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.8, 4), toon(0x9EAEC2)), 1.08); f.position.set(-0.15, sd*0.95, 0); f.scale.z = 0.3; if(sd < 0) f.rotation.z = Math.PI; f.rotation.z += sd*0.2; g.add(f); }
    dvBlob(g, 0x9EAEC2, 0.14, 0.62, 0.12, -0.7, 0, 0);
    const mo = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.02, 6, 12), inkMat); mo.position.set(0.7, -0.05, 0); mo.rotation.y = Math.PI/2; g.add(mo);
    dvEyes(g, 0.48, 0.18, 0.16, 0.05); dvBlush(g, 0.45, 0.02, 0.19);
    return g;
  },
  narwhal(){
    const g = new THREE.Group(), c = 0x9FAEC0, fl = [];
    dvBlob(g, c, 1.2, 0.45, 0.45);
    for(const [x, y] of [[-0.4, 0.25], [0, 0.32], [0.4, 0.22], [-0.2, 0.05], [0.2, 0.1], [-0.7, 0.12]]){ const d = new THREE.Mesh(SMALL, toon(0x6F8094)); d.scale.set(0.07, 0.05, 0.02); for(const sd of [-1, 1]){ const e = d.clone(); e.position.set(x, y, sd*0.4); g.add(e); } }
    const tusk = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.05, 1.6, 8), toon(0xF3EEDC)), 1.15); tusk.rotation.z = -Math.PI/2; tusk.position.set(1.95, 0.08, 0); g.add(tusk);
    for(let i = 0; i < 5; i++){ const r = new THREE.Mesh(new THREE.TorusGeometry(0.045 - i*0.007, 0.008, 4, 10), inkMat); r.rotation.y = Math.PI/2; r.position.set(1.3 + i*0.22, 0.08, 0); g.add(r); }
    dvEyes(g, 1.0, 0.12, 0.32, 0.045); dvBlush(g, 1.02, -0.02, 0.34);
    for(const sd of [-1, 1]){ const f = dvBlob(g, c, 0.24, 0.05, 0.12, 0.5, -0.28, sd*0.42); f.rotation.set(sd*0.4, 0, -0.5); }
    const tail = new THREE.Group(); tail.position.x = -1.15; g.add(tail); fl.push(tail);
    for(const sd of [-1, 1]){ const f = dvBlob(tail, c, 0.26, 0.05, 0.14, -0.18, 0, sd*0.18); f.rotation.y = sd*0.6; }
    g.userData.fl = fl; return g;
  },
  shark(){
    const g = new THREE.Group(), c = 0x8FA8CC, fl = [];
    dvBlob(g, c, 1.05, 0.42, 0.4);
    const bl = new THREE.Mesh(SMALL, toon(0xF4F8FC)); bl.scale.set(0.9, 0.24, 0.34); bl.position.set(0.1, -0.14, 0); g.add(bl);
    const df = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.55, 4), toon(c)), 1.08); df.position.set(-0.05, 0.55, 0); df.rotation.z = 0.35; df.scale.z = 0.3; g.add(df);
    const tail = new THREE.Group(); tail.position.x = -1.0; g.add(tail); fl.push(tail);
    for(const sd of [-1, 1]){ const t = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6, 4), toon(c)), 1.08); t.position.set(-0.22, sd*0.26, 0); t.rotation.z = sd > 0 ? 0.7 : Math.PI - 0.7; t.scale.z = 0.3; tail.add(t); }
    for(const sd of [-1, 1]){ const f = dvBlob(g, c, 0.3, 0.05, 0.14, 0.3, -0.3, sd*0.35); f.rotation.set(sd*0.5, 0, -0.6); }
    dvEyes(g, 0.72, 0.12, 0.3, 0.075); dvBlush(g, 0.78, -0.06, 0.33);
    for(const sd of [-1, 1]){
      const m = new THREE.Mesh(SMALL, inkMat); m.scale.set(0.16, 0.025, 0.02); m.position.set(0.86, -0.17, sd*0.24); m.rotation.set(0, -sd*0.55, 0.25); g.add(m);
      const t = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 4), whiteMat); t.rotation.z = Math.PI; t.position.set(0.86, -0.21, sd*0.26); g.add(t);
    }
    g.userData.fl = fl; return g;
  }
};
// энциклопедия моря: порядок — как в книжке. mv: still — стоит, crawl — ползёт по дну, swim — плавает туда-сюда,
// float — медленно поднимается и опускается, surf — лежит у поверхности. y: число или 'floor' (+ fy над дном). hy — где центр для касания
const DV_LIFE = [
  {id:'kelp', ic:'🌿', name:L('Ламинария', 'Kelp'), x:9.4, y:'floor', z:0.9, mv:'still', r:1.4, hy:2.2,
    fact:L('Ламинария — водоросль, её ещё зовут морской капустой. Растёт очень быстро и складывается в целые подводные леса.', 'Kelp is a seaweed that grows very fast. Lots of kelp together makes a real underwater forest.')},
  {id:'starfish', ic:'⭐', name:L('Морская звезда', 'Starfish'), x:7.4, y:'floor', fy:0.35, z:1.1, mv:'still', r:0.6,
    fact:L('У морской звезды на кончике каждого лучика есть глазок! А потерянный лучик вырастает заново.', 'A starfish has a tiny eye at the tip of each arm! And a lost arm grows back.')},
  {id:'crab', ic:'🦀', name:L('Краб', 'Crab'), lim:[2, 17], v:0.6, y:'floor', fy:0.02, z:1.2, mv:'crawl', r:0.6, hy:0.35, front:true,
    fact:L('Краб ходит боком — так его ножкам удобнее. А панцирь у него вместо кожи: вырос — сбрасывает старый и отращивает новый.', 'A crab walks sideways — it is easier for its legs. When it grows, it sheds its old shell and grows a new one.')},
  {id:'urchin', ic:'🟣', name:L('Морской ёж', 'Sea urchin'), x:16.4, y:'floor', z:1.0, mv:'still', r:0.5, hy:0.25, front:true,
    fact:L('Морской ёж шагает на сотнях крошечных ножек-присосок, которые прячутся между иголками.', 'A sea urchin walks on hundreds of tiny sucker feet hidden between its spines.')},
  {id:'anemone', ic:'🌸', name:L('Актиния', 'Sea anemone'), x:19.6, y:'floor', z:0.9, mv:'still', r:0.6, hy:0.45, front:true,
    fact:L('Актиния похожа на цветок, но это животное! Щупальцами она ловит крошечную еду. А рыбка-клоун в ней живёт как в домике.', 'A sea anemone looks like a flower, but it is an animal! It catches tiny food with its tentacles. Clownfish live in it like in a house.')},
  {id:'jelly', ic:'🪼', name:L('Медуза', 'Jellyfish'), lim:[17, 30], v:0.35, y:-5, z:-0.4, mv:'float', r:0.7,
    fact:L('У медузы нет ни мозга, ни сердца — она почти вся из воды. А живут медузы в море ещё с тех пор, когда не было динозавров!', 'A jellyfish has no brain and no heart — it is almost all water. Jellyfish lived in the sea even before the dinosaurs!')},
  {id:'turtle', ic:'🐢', name:L('Морская черепаха', 'Sea turtle'), lim:[14, 42], v:1.1, y:-4, z:-0.6, mv:'swim', r:0.9,
    fact:L('Морская черепаха переплывает целый океан, а откладывать яйца возвращается на тот самый пляж, где вылупилась сама.', 'A sea turtle swims across a whole ocean, and comes back to lay eggs on the very beach where it hatched.')},
  {id:'ray', ic:'🪁', name:L('Скат', 'Stingray'), lim:[20, 44], v:1.3, y:'floor', fy:1.3, z:-0.3, mv:'swim', r:1.0,
    fact:L('Скат — родственник акулы! Он плоский, как блинчик, и «летает» под водой, взмахивая плавниками, как крыльями.', 'A ray is a cousin of the shark! It is flat like a pancake and "flies" underwater, flapping its fins like wings.')},
  {id:'octopus', ic:'🐙', name:L('Осьминог', 'Octopus'), x:42.6, y:'floor', fy:0.05, z:0.6, mv:'still', r:0.8, hy:0.6, front:true,
    fact:L('У осьминога три сердца и голубая кровь! А ещё он умеет менять цвет, чтобы спрятаться.', 'An octopus has three hearts and blue blood! And it can change colour to hide.')},
  {id:'angler', ic:'🔦', name:L('Рыба-удильщик', 'Anglerfish'), lim:[49, 62], v:0.5, y:-12.2, z:0.2, mv:'swim', r:0.7,
    fact:L('У рыбы-удильщика на голове свой фонарик. В тёмной глубине он светится и приманивает еду прямо к её рту.', 'An anglerfish has its own little lamp on its head. In the dark deep sea it glows and lures food right to its mouth.')},
  {id:'otter', ic:'🦦', name:L('Калан', 'Sea otter'), lim:[4, 30], v:0.5, y:-0.55, z:0.4, mv:'surf', r:0.8, rare:true,
    fact:L('Каланы спят на спинке прямо в воде и держатся за лапки, чтобы течение не унесло их друг от друга.', 'Sea otters sleep on their backs in the water and hold paws so the current does not pull them apart.')},
  {id:'beluga', ic:'🐋', name:L('Белуха', 'Beluga whale'), lim:[8, 60], v:1.6, y:-5.5, z:-2.2, mv:'swim', r:1.6, rare:true,
    fact:L('Белуху зовут «морской канарейкой»: она свистит, щёлкает и чирикает. И умеет кивать головой — не каждый кит так может!', 'The beluga is called the "sea canary": it whistles, clicks and chirps. And it can nod its head — not every whale can!')},
  {id:'sunfish', ic:'🌝', name:L('Рыба-луна', 'Ocean sunfish'), lim:[18, 44], v:0.6, y:-2.3, z:-1.2, mv:'swim', r:1.0, rare:true,
    fact:L('Рыба-луна — самая тяжёлая костистая рыба: весит как машина! Она любит греться на солнышке у самой поверхности.', 'The ocean sunfish is the heaviest bony fish — as heavy as a car! It loves to sunbathe near the surface.')},
  {id:'narwhal', ic:'🦄', name:L('Нарвал', 'Narwhal'), lim:[26, 62], v:1.4, y:-7.5, z:-1.6, mv:'swim', r:1.4, rare:true,
    fact:L('Длинный рог нарвала — на самом деле зуб! Он растёт прямо сквозь губу и бывает длиннее самого папы.', 'The narwhal’s long horn is really a tooth! It grows right through its lip and can be longer than a grown-up is tall.')},
  {id:'shark', ic:'🦈', name:L('Акула', 'Shark'), r:1.2,
    fact:L('У акулы зубы растут рядами: выпал один — на его место выдвигается новый. За жизнь у акулы бывают тысячи зубов!', 'Shark teeth grow in rows: when one falls out, a new one moves up. A shark can have thousands of teeth in its life!')}
];
const DV_RARE = DV_LIFE.filter(d => d.rare).map(d => d.id);
const dvDef = id => DV_LIFE.find(d => d.id === id);
const dvGuest = () => DV_RARE[dvDayN() % DV_RARE.length];   // гость дня: по одному, по кругу
const dvThumbs = {};
function dvThumb(id){
  if(dvThumbs[id]) return dvThumbs[id];
  const o = DV_MAKE[id](); o.traverse(c => { if(c.isSprite) c.visible = false; });   // свечение не нужно: в книжке из картинки делается силуэт
  return dvThumbs[id] = objThumb(o, id === 'ray' ? new V3(0.3, 1.4, 1) : new V3(0.2, 0.3, 1));
}

/* ---------- бухта: строится один раз ---------- */
const dvRoot = new THREE.Group(); dvRoot.position.copy(DV_POS); dvRoot.visible = false; scene.add(dvRoot);
const dvSwayers = [], dvRays = [], dvShoals = [];
let dvBuilt = false;
function dvGradTex(){
  return canvasTex(64, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#E6F7FC'); gr.addColorStop(0.2, '#BDEBF7'); gr.addColorStop(0.215, '#8FD6EE'); gr.addColorStop(0.45, '#4FA6D2'); gr.addColorStop(1, '#1B4C78');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, 256);
}
function dvBuild(){
  if(dvBuilt) return; dvBuilt = true;
  // вода позади: градиент от светлой поверхности к синей глубине (без тумана)
  const back = new THREE.Mesh(new THREE.PlaneGeometry(300, 70), new THREE.MeshBasicMaterial({map:dvGradTex(), fog:false}));
  back.position.set(32, -20, -18); dvRoot.add(back); dvRoot.userData.backM = back.material;
  // поверхность снизу: светлая рябь
  const surfTex = canvasTex(256, (g, s) => {
    g.fillStyle = '#CFF1FA'; g.fillRect(0, 0, s, s); g.strokeStyle = '#FFFFFF'; g.lineWidth = 6; g.lineCap = 'round';
    for(let i = 0; i < 9; i++){ g.beginPath(); for(let x = 0; x <= s; x += 8) g.lineTo(x, i*30 + 12 + Math.sin(x/22 + i)*8); g.stroke(); }
  });
  surfTex.wrapS = surfTex.wrapT = THREE.RepeatWrapping; surfTex.repeat.set(24, 6);
  const surf = new THREE.Mesh(new THREE.PlaneGeometry(300, 60), new THREE.MeshBasicMaterial({map:surfTex, transparent:true, opacity:0.75, side:THREE.DoubleSide, fog:false}));
  surf.rotation.x = Math.PI/2; surf.position.set(32, 0.02, -10); dvRoot.add(surf); dvRoot.userData.surf = surfTex; dvRoot.userData.surfM = surf.material;
  for(const [x, w] of [[-3, 3.2], [21, 2.6], [45, 3.4]]){ const f = dvBlob(dvRoot, 0xD6EAF5, w, 0.4, 2, x, 0.05, -1.5, 1.03); }
  // дно: профиль DV_FLOOR, вытянутый вглубь
  const sh = new THREE.Shape(); sh.moveTo(-40, -24);
  for(let x = -40; x <= 110; x += 1) sh.lineTo(x, dvFloor(x));
  sh.lineTo(110, -24); sh.closePath();
  const fl = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, {depth:40, bevelEnabled:false, curveSegments:1}), toon(0xD6BC8C));
  fl.position.z = -13; dvRoot.add(fl);
  // солнечные блики на песке: сетка светлых линий по рельефу дна, медленно плывёт
  const cau = canvasTex(256, (g, sz) => {
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 3.5; g.lineCap = 'round';
    const r2 = (i => () => (i = (i*9301 + 49297) % 233280)/233280)(3);
    for(let i = 0; i < 26; i++){ const x = r2()*sz, y = r2()*sz, rx = 18 + r2()*26, ry = 12 + r2()*18;
      for(const dx of [-sz, 0, sz]) for(const dy of [-sz, 0, sz]){ g.beginPath(); g.ellipse(x + dx, y + dy, rx, ry, r2()*3, 0, 7); g.stroke(); } }
  });
  cau.wrapS = cau.wrapT = THREE.RepeatWrapping; cau.repeat.set(14, 5);
  const cg = new THREE.PlaneGeometry(96, 36, 96, 1); cg.rotateX(-Math.PI/2);
  const cp = cg.attributes.position; for(let i = 0; i < cp.count; i++) cp.setY(i, dvFloor(cp.getX(i) + 32) + 0.04);
  const caustic = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({map:cau, transparent:true, opacity:0.16, depthWrite:false, blending:THREE.AdditiveBlending}));
  caustic.position.set(32, 0, 4); dvRoot.add(caustic); dvRoot.userData.cau = cau; dvRoot.userData.cauM = caustic.material;
  // камешки и кочки
  const rnd = (i => () => (i = (i*9301 + 49297) % 233280)/233280)(7);
  for(let i = 0; i < 150; i++){
    const x = -12 + rnd()*88, z = -10 + rnd()*26, s = 0.15 + rnd()*0.3;
    const p = new THREE.Mesh(SMALL, toon([0xD7BE92, 0xC9B089, 0xF2E2C2, 0xB9C7D6][i % 4])); p.scale.set(s*1.4, s*0.6, s); p.position.set(x, dvFloor(x), z); dvRoot.add(p);
  }
  for(let i = 0; i < 26; i++){
    const x = -6 + rnd()*76, z = -9 + rnd()*7, s = 0.5 + rnd()*1.1;
    dvBlob(dvRoot, [0x8FA3B8, 0x7F93AA, 0xA3B4C6][i % 3], s*1.3, s*0.8, s, x, dvFloor(x) + s*0.2, z, 1.04);
  }
  for(let i = 0; i < 18; i++){   // камешки на переднем плане, ниже малыша
    const x = -8 + rnd()*82, z = 3 + rnd()*9, s = 0.3 + rnd()*0.4;
    dvBlob(dvRoot, [0xA3B4C6, 0xC9B089][i % 2], s*1.4, s*0.5, s, x, dvFloor(x), z, 1.04);
  }
  // яркие губки и кораллы вдали
  for(let i = 0; i < 16; i++){
    const x = 2 + rnd()*54, z = -7 + rnd()*5, c = [0xFF9BB8, 0xFFD66B, 0x86DDB5, 0xB69CF2][i % 4];
    for(let j = 0; j < 3; j++){ const h = 0.4 + rnd()*0.7; const m = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, h, 8), toon(c)), 1.1); m.position.set(x + (j - 1)*0.25, dvFloor(x) + h/2, z + j*0.1); m.rotation.z = (j - 1)*0.25; dvRoot.add(m); }
  }
  // лес водорослей: две рощи-прятки и отдельные стебли вдали
  const kelp = (x, z, h, col) => { const k = dvKelp(h, col); k.position.set(x, dvFloor(x) - 0.1, z); dvRoot.add(k); dvSwayers.push(k); };
  for(const cx of [12, 37.5]) for(let i = 0; i < 7; i++) kelp(cx - 1.5 + i*0.5 + rnd()*0.2, [-0.9, 0.9, -0.4, 1.3, -1.2, 0.6, 1.1][i], 3.4 + rnd()*1.8, i % 2 ? 0x4FA877 : 0x6CC28C);
  for(let i = 0; i < 20; i++){ const x = -4 + rnd()*68; kelp(x, -3 - rnd()*6, 2.5 + rnd()*4.5, [0x4FA877, 0x5DB57E, 0x3E9468][i % 3]); }
  // щель между камнями (прятка)
  for(const [x, s] of [[29.2, 1], [31.5, 1.1]]){ const r = dvBlob(dvRoot, 0x7F93AA, 0.95*s, 1.9*s, 1.1, x, dvFloor(x) + 1.2, 0.3, 1.04); r.rotation.z = (x < 30 ? 0.12 : -0.12); }
  dvBlob(dvRoot, 0x6F839C, 1.9, 0.5, 1.2, 30.35, dvFloor(30.3) + 3.1, 0.2, 1.04);
  // камень с норкой осьминога
  dvBlob(dvRoot, 0x8FA3B8, 1.6, 1.3, 1.1, 42.6, dvFloor(42.6) + 0.6, -0.6, 1.04);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.62, 24), new THREE.MeshBasicMaterial({color:0x2A3A55})); hole.scale.y = 0.75; hole.position.set(42.6, dvFloor(42.6) + 0.55, 0.45); dvRoot.add(hole);
  // грот: тёмный навес над глубиной
  const cave = new THREE.Shape(); cave.moveTo(45, 2); cave.lineTo(45, -2.5);
  for(let x = 45; x <= 110; x += 1.5) cave.lineTo(x, -3.4 - Math.sin((x - 45)*0.35)*0.5 - (x < 48 ? (48 - x)*0.5 : 0));
  cave.lineTo(110, 2); cave.closePath();
  const cv = new THREE.Mesh(new THREE.ExtrudeGeometry(cave, {depth:10, bevelEnabled:false, curveSegments:1}), toon(0x5E7290)); cv.position.z = -12; dvRoot.add(cv);
  dvBlob(dvRoot, 0x6F839C, 1.3, 5, 1.4, 45.6, dvFloor(45.6) + 3.6, -2.2, 1.03);
  // затонувший кораблик (прятка): корпус, мачта, обрывок паруса
  const boat = new THREE.Group(); boat.position.set(56.6, dvFloor(56.6) + 0.2, -0.9); boat.rotation.z = 0.12; dvRoot.add(boat);
  const hs = new THREE.Shape(); hs.moveTo(-2.4, 1.2); hs.lineTo(2.6, 1.2); hs.quadraticCurveTo(2.4, -0.2, 1.4, -0.4); hs.lineTo(-1.8, -0.4); hs.quadraticCurveTo(-2.4, 0, -2.4, 1.2);
  const hull = addOutline(new THREE.Mesh(new THREE.ExtrudeGeometry(hs, {depth:0.3, bevelEnabled:true, bevelThickness:0.06, bevelSize:0.06, bevelSegments:2}), toon(0xB07A4E)), 1.02);
  hull.position.z = -0.9; boat.add(hull);
  const hull2 = hull.clone(); hull2.position.z = 0.9; boat.add(hull2);
  for(const y of [0.1, 0.6]){ const pl = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.05, 0.04), toon(0x7E5433)); pl.position.set(0.1, y, 1.27); boat.add(pl); }
  const deck = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.12, 1.9), toon(0x9A6A42)); deck.position.set(0.1, -0.3, 0.15); boat.add(deck);
  const mast = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.2, 8), toon(0x8A5D3B)), 1.1); mast.position.set(0.4, 2.2, 0.2); mast.rotation.z = -0.25; boat.add(mast);
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.6), new THREE.MeshToonMaterial({color:0xF3E6C8, side:THREE.DoubleSide})); sail.position.set(0.95, 2.6, 0.2); sail.rotation.z = -0.25; boat.add(sail);
  dvRoot.userData.boat = boat;
  // солнечные лучи сквозь воду
  const rayTex = canvasTex(64, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, 256);
  for(let i = 0; i < 8; i++){
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6 + rnd()*1.6, 14), new THREE.MeshBasicMaterial({map:rayTex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, opacity:0.5, fog:false}));
    m.position.set(-2 + i*6.5 + rnd()*2, -7, -4 - rnd()*3); m.rotation.z = 0.28; m.userData.ph = rnd()*6; dvRoot.add(m); dvRays.push(m);
  }
  // стайки мелких рыбок (для красоты: разлетаются от малыша)
  for(const [cx, cy, col] of [[8, -3.5, 0xB4D8CE], [33, -7, 0xFFD66B]]){
    const sh2 = {c:new V3(cx, cy, -0.8), home:new V3(cx, cy, -0.8), f:[]};
    for(let i = 0; i < 11; i++){ const f = makeFish(col); f.scale.setScalar(0.65); f.userData = {a:i/11*Math.PI*2, r:0.6 + (i % 3)*0.35, y:(i % 4 - 1.5)*0.25, sp:0.9 + (i % 5)*0.08}; dvRoot.add(f); sh2.f.push(f); }
    dvShoals.push(sh2);
  }
}
function dvSway(t){
  for(const k of DV.sway.length ? dvSwayers.concat(DV.sway) : dvSwayers){ const ph = k.userData.ph; k.userData.pivs.forEach((p, i) => p.rotation.z = Math.sin(t*1.1 + ph + i*0.55)*0.075); }
  const lit = 1 - 0.85*(DV ? DV.dark : 0);   // пришла Мгла — лучи гаснут
  dvRays.forEach(m => m.material.opacity = (0.32 + Math.sin(now*0.7 + m.userData.ph)*0.16)*lit);
  if(dvRoot.userData.surf) dvRoot.userData.surf.offset.x = now*0.02;
  if(dvRoot.userData.cau) dvRoot.userData.cau.offset.set(now*0.012, Math.sin(now*0.3)*0.03);
}

/* ---------- состояние погружения ---------- */
let DV = null, diveSay = '';
const dvRay = new THREE.Raycaster(), dvNdc = new THREE.Vector2();
const dvW = v => v.clone().add(DV_POS);   // бухта → мир
function dvPoint(cx, cy){   // касание → точка в плоскости z = 0 (координаты бухты)
  const rect = canvas.getBoundingClientRect();
  dvNdc.set((cx - rect.left)/rect.width*2 - 1, -((cy - rect.top)/rect.height)*2 + 1);
  dvRay.setFromCamera(dvNdc, camera);
  const o = dvRay.ray.origin, d = dvRay.ray.direction, k = (DV_POS.z - o.z)/d.z;
  return o.clone().addScaledVector(d, k).sub(DV_POS);
}
function dvClamp(p){
  p.x = Math.max(-2, Math.min(DV_LEN + 2, p.x));
  p.y = Math.max(dvFloor(p.x) + 0.55, Math.min(-0.6, p.y));
  return p;
}

// s — малыш из уголка; по сети (opt.pal — напарник) из «Вместе» ныряет свой тюлень, а малыш остаётся в уголке (как в бою с Тучей)
async function petDive(s, opt = {}){
  const own = !s, pal = opt.pal || null;
  if(own){ s = coSealOf(coPetDesc()); s.root.scale.setScalar(petScale()); scene.add(s.root); }
  const cam0 = camOffWant.clone(), fog = scene.fog, bg = scene.background, sv = save.dive, today = dvToday();
  if(sv.day.d !== today) sv.day = {d:today, cl:[]};
  sv.n++; persist();
  sfx.splash(); flash();
  dvBuild(); dvRoot.visible = true; runCam.on = true; snow.visible = false;
  scene.fog = new THREE.Fog(0x3E8FC0, 12, 72); scene.background = new THREE.Color(0x3E8FC0);
  document.body.classList.add('run-on', 'dive-on');
  if(s.bubble) s.bubble.visible = false; s.swimming = true; s.flap = 0.3; setMood(s, 'happy');
  DV = {s, own, sc:own ? s.root.scale.x : petScale(), pos:new V3(1.6, -1.8, 0), vel:new V3(), tgt:null, hold:false, pid:null, goal:null, face:1, yaw:Math.PI/2, pause:false, mode:'swim',
    t:0, tumble:0, taps:[], life:[], grp:new THREE.Group(), carry:null, sway:[], fresh:0, ping:null, bubT:0, key:new V3(), cx:1.6, cy:-4, camD:20, rings:[], said:new Set(),
    auth:!pal || net.host, pal0:pal, pal:null, grab:false, bigOn:false, sendT:0, dark:0, safeT:0, out:false, net:null};
  dvRoot.add(DV.grp);
  dvPopulate();
  if(pal) dvPalMake(pal);
  mgOpen('', {hintBottom:true});
  DV.hud = mgNode('div', 'run-hud dv-hud', '');
  dvHud();
  dvControls();
  if(pal) dvNetUi();
  const vig = document.createElement('div'); vig.className = 'dv-vig'; canvas.after(vig); DV.vig = vig;   // темнота по краям, когда рядом Мгла (под кнопками)
  const homeB = document.createElement('button'); homeB.id = 'btnRunHome'; homeB.className = 'round home';
  homeB.innerHTML = '<span aria-hidden="true">🏠</span>'; homeB.setAttribute('aria-label', L('Домой', 'Home')); $('#btnSound').after(homeB);
  let done; const fin = new Promise(r => done = r);
  homeB.addEventListener('click', () => { sfx.tap(); if(DV && !DV.pause) done(); else if(DV) toast(L('Сначала закончи то, что начала 🫧', 'Finish what you started first 🫧')); });
  DV.quit = done;
  if(pal) dvNetWire();
  mgTick(dt => { if(DV) dvStep(dt); });
  pal ? dvNetIntro() : dvIntro();
  const how = await fin;
  // домой: малыш снова в уголке
  if(pal){ netSend({t:'dbye'}); netClose(); }
  mgClose();
  homeB.remove(); vig.remove(); document.body.classList.remove('run-on', 'dive-on', 'gloom-on'); flash();
  const fresh = DV.fresh;
  if(DV.pal) scene.remove(DV.pal.s.root);
  dvRoot.remove(DV.grp); DV = null;
  dvRoot.visible = false; runCam.on = false; homeLights(false); snow.visible = true;
  scene.fog = fog; scene.background = bg;
  camOff.copy(cam0); camOffWant.copy(cam0);
  if(own){ scene.remove(s.root); return {dive:1}; }
  s.swimming = false; s.root.position.copy(PET_SPOT); s.root.rotation.set(0, 0, 0); s.inner.rotation.set(0, 0, 0); s.inner.position.set(0, 0, 0); s.wobble = 0; s.flap = 0;
  s.happyUntil = now + 3; setMood(s, how === 'gloom' ? 'ok' : 'happy');
  diveSay = how === 'gloom' ? L('Брр! Мгла выплюнула нас наверх… Она уже уползла в грот — можно нырнуть снова 🫧', 'Brr! The Gloom spat us out to the surface… It has crawled back into the grotto — we can dive again 🫧')
    : fresh ? L(`Какое погружение! Новых жителей в энциклопедии: ${fresh} 📖`, `What a dive! New friends in the sea book: ${fresh} 📖`)
    : L(`${gg('Наплавался', 'Наплавалась')}! Солёная водичка — пора купаться 🛁`, 'What a swim! All salty — bath time 🛁');
}
async function dvIntro(){
  const n = save.pet.name, g = dvDef(dvGuest());
  if(!tipSeen('dive1')){
    tipDone('dive1');
    mgHint(L(`Держи палец на экране — ${n} плывёт за ним 🫧`, `Hold your finger on the screen — ${n} swims after it 🫧`));
    await wait(4.5); if(!DV) return;
    mgHint(L('Коснись морского жителя — сфотографируешь его для энциклопедии 📷', 'Tap a sea creature to take its photo for the sea book 📷'));
    await wait(4.5); if(!DV) return;
    toast(L('Тюлени умеют не дышать больше 20 минут — плавай сколько хочешь! 🫧', 'Seals can hold their breath for over 20 minutes — swim as long as you like! 🫧'), 3600);
    await wait(3.5); if(!DV) return;
  }
  mgHint(L(`Сегодня в бухте гость: ${g.name} ${g.ic}`, `Today's guest in the bay: ${g.name} ${g.ic}`));
  await wait(3.5); if(DV && mgHintEl.textContent.includes(g.ic)) mgHint('');
}

/* ---------- кто и что в бухте сегодня ---------- */
function dvTap(o){ DV.taps.push(o); return o; }
function dvPopulate(){
  const sv = save.dive, G = DV.grp, guest = dvGuest();
  for(const d of DV_LIFE){
    if(d.id === 'shark' || (d.rare && d.id !== guest)) continue;
    const o = DV_MAKE[d.id](), c = {def:d, o, x:d.lim ? d.lim[0] + Math.random()*(d.lim[1] - d.lim[0]) : d.x, dir:Math.random() < 0.5 ? -1 : 1, ph:Math.random()*6, hop:0};
    if(d.id === 'turtle' && !sv.turt){ c.stuck = true; c.x = 24; dvNet(c); }
    G.add(o); DV.life.push(c);
    dvLifeStep(c, 0);
    dvTap({k:d.id, r:d.r, p:() => c.o.position.clone().add(new V3(0, d.hy || 0, 0)), go:() => c.stuck ? dvTurtle(c) : dvPhoto(d.id, c)});
    if(d.id === 'kelp') o.children.forEach(k => DV.sway.push(k));
  }
  // раковины с жемчужинкой (по одной в день)
  DV.clams = [15.2, 27.4, 47.6].map((x, i) => {
    const g = new THREE.Group(); g.position.set(x, dvFloor(x) + 0.12, 1.0); G.add(g);
    const shm = toon(0xC9A2D8);
    const bot = addOutline(new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI*2, Math.PI/2, Math.PI/2), shm), 1.06); bot.scale.set(0.5, 0.22, 0.42); g.add(bot);
    const inside = new THREE.Mesh(new THREE.CircleGeometry(1, 20), toon(0xF6E4F4)); inside.rotation.x = -Math.PI/2; inside.scale.set(0.46, 0.38, 1); inside.position.y = 0.005; g.add(inside);
    const hinge = new THREE.Group(); hinge.position.set(0, 0, -0.38); g.add(hinge);
    const top = addOutline(new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI*2, 0, Math.PI/2), shm), 1.06); top.scale.set(0.5, 0.22, 0.42); top.position.z = 0.38; hinge.add(top);
    for(let j = -2; j <= 2; j++){ const r = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.62), toon(0xB185C6)); r.position.set(j*0.16, 0.1, 0.38); r.rotation.z = -j*0.25; hinge.add(r); }
    const pearl = new THREE.Mesh(SMALL, new THREE.MeshBasicMaterial({color:0xFFF6FB})); pearl.scale.setScalar(0.13); pearl.position.y = 0.1; g.add(addOutline(pearl, 1.12));
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX, transparent:true, depthWrite:false})); gl.scale.setScalar(0.9); gl.position.y = 0.2; g.add(gl);
    const got = sv.day.cl.includes(i);
    pearl.visible = gl.visible = !got; hinge.rotation.x = got ? -0.8 : 0;
    const c = {g, hinge, pearl, gl, i, open:got};
    dvTap({k:'clam', r:0.6, p:() => g.position.clone().add(new V3(0, 0.2, 0)), go:() => dvClam(c)});
    return c;
  });
  // подводный сад: три грядки у входа
  DV.garden = [3.0, 4.5, 6.0].map((x, i) => {
    const g = new THREE.Group(); g.position.set(x, dvFloor(x), 1.4); G.add(g);
    for(let j = 0; j < 7; j++){ const a = j/7*Math.PI*2, st = dvBlob(g, 0xB9C7D6, 0.12, 0.08, 0.1, Math.cos(a)*0.45, 0.04, Math.sin(a)*0.3, 1.1); }
    dvBlob(g, 0xC9A67A, 0.4, 0.1, 0.26, 0, 0.02, 0, 1.03);
    const c = {g, i, plant:null, st:-2};
    dvGardenShow(c);
    dvTap({k:'garden', r:0.55, p:() => g.position.clone().add(new V3(0, 0.4, 0)), go:() => dvGarden(c)});
    return c;
  });
  // кусочки карты и сундук у кораблика
  const MAP_AT = [[12.7, 1.0, 0.3], [33.4, 0.35, 1.0], [52.4, 0.45, 1.0]];
  DV.maps = sv.chest ? [] : MAP_AT.map(([x, fy, z], i) => {
    if(sv.map.includes(i)) return null;
    const o = new THREE.Group(); o.position.set(x, dvFloor(x) + fy, z); G.add(o);
    const pg = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.46), new THREE.MeshBasicMaterial({map:DV_MAP_TEX, side:THREE.DoubleSide})); o.add(addOutline(pg, 1.08));
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX, transparent:true, depthWrite:false})); gl.scale.setScalar(1.1); gl.position.z = -0.05; o.add(gl);
    const c = {o, i, got:false, y0:o.position.y};
    dvTap({k:'map', r:0.45, p:() => o.position.clone(), go:() => dvMapGot(c), on:() => !c.got});
    return c;
  }).filter(Boolean);
  const ch = new THREE.Group(); ch.position.set(59.8, dvFloor(59.8), 1.0); G.add(ch);
  const box = addOutline(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.6, 0.72), toon(0x9A6A42)), 1.04); box.position.y = 0.3; ch.add(box);
  const lidP = new THREE.Group(); lidP.position.set(0, 0.6, -0.36); ch.add(lidP);
  const lid = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 1.1, 16, 1, false, 0, Math.PI), toon(0xB07A4E)), 1.04); lid.rotation.set(0, 0, Math.PI/2); lid.rotation.order = 'ZXY'; lid.position.z = 0.36; lidP.add(lid);
  for(const x of [-0.35, 0.35]){ const b = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.62, 0.75), toon(0xFFD66B)); b.position.set(x, 0.3, 0); ch.add(b); }
  const lock = dvBlob(ch, 0xFFD66B, 0.1, 0.12, 0.05, 0, 0.55, 0.38, 1.1);
  const cgl = new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX, transparent:true, depthWrite:false})); cgl.scale.setScalar(2.4); cgl.position.set(0, 0.6, 0.3); ch.add(cgl);
  cgl.visible = !sv.chest && sv.map.length >= 3; lidP.rotation.x = sv.chest ? -1.2 : 0;
  DV.chest = {g:ch, lid:lidP, gl:cgl, lock};
  dvTap({k:'chest', r:0.7, p:() => ch.position.clone().add(new V3(0, 0.4, 0)), go:dvChest});
  // акула: подружка плавает рядом, незнакомка приплывёт поиграть в салки
  const sh = DV_MAKE.shark(); sh.visible = false; G.add(sh);
  DV.sh = {o:sh, st:sv.shark.friend ? 'friend' : 'off', x:50, y:-5, dir:-1, t:sv.shark.friend ? 0 : DV_SHARK_T[0], ph:0};
  if(sv.shark.friend){ sh.visible = true; DV.sh.x = 40; }
  dvTap({k:'shark', r:1.1, p:() => sh.position.clone(), go:dvSharkTap, on:() => sh.visible});
  // Пинг ныряет за компанию (если живёт по соседству и ныряем не по сети)
  if(typeof nbHere === 'function' && nbHere() && !DV.pal0){
    const p = makePenguin(PENG); p.root.scale.setScalar(0.8*0.62); p.swimming = true; G.add(p.root);
    DV.ping = {s:p, pos:new V3(-0.5, -2.4, 0), vel:new V3(), face:1, yaw:Math.PI/2, hold:false, big:false};
    dvTap({k:'ping', r:0.7, p:() => DV.ping.pos.clone(), go:dvPingTap});
  }
  dvBigMake();
  // Мгла живёт в гроте (пока спит)
  const gm = makeGloom(); gm.visible = false; G.add(gm);
  DV.gl = {o:gm, st:'off', t:DV_GLOOM_T[0] + Math.random()*15, x:DV_LEN + 6, y:-10, dir:-1, fade:0, ch:0, puffT:0, caught:false};
}
const DV_MAP_TEX = canvasTex(128, (g, s) => {   // кусочек старой карты: бумага, пунктир и крестик
  g.fillStyle = '#F3E2BC'; g.fillRect(0, 0, s, s);
  g.strokeStyle = '#B98B55'; g.lineWidth = 5; g.setLineDash([9, 8]); g.beginPath(); g.moveTo(10, 100); g.quadraticCurveTo(60, 20, 110, 70); g.stroke();
  g.setLineDash([]); g.strokeStyle = '#D9527E'; g.lineWidth = 9; g.beginPath(); g.moveTo(88, 52); g.lineTo(112, 80); g.moveTo(112, 52); g.lineTo(88, 80); g.stroke();
  g.fillStyle = '#7FB8F0'; g.beginPath(); g.arc(28, 34, 13, 0, 7); g.fill();
});
// черепаха в старой сети: верёвки поверх панциря и три узелка спереди
function dvNet(c){
  const g = new THREE.Group(), rope = toon(0x5E9C7C); c.o.add(g); c.net = g;
  for(const [a, b] of [[[-0.6, 0.1, 0.5], [0.4, 0.35, -0.5]], [[0.6, 0.05, 0.5], [-0.4, 0.35, -0.5]], [[-0.7, -0.05, 0], [0.8, 0.1, 0]], [[0, -0.15, 0.55], [0, 0.4, -0.3]]]){
    const pts = []; for(let i = 0; i <= 10; i++){ const k = i/10, v = new V3(...a).lerp(new V3(...b), k); v.y += Math.sin(k*Math.PI)*0.2; v.z *= 1.05; pts.push(v); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.035, 6), rope));
  }
  c.knots = [[-0.35, 0.2, 0.5], [0.12, 0.34, 0.46], [0.5, 0.14, 0.44]].map(p => {
    const k = new THREE.Group(); k.position.set(...p); g.add(k);
    const b = addOutline(new THREE.Mesh(SMALL, toon(0xE9B872)), 1.12); b.scale.setScalar(0.1); k.add(b);
    for(const sd of [-1, 1]){ const l = addOutline(new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.024, 6, 14), toon(0xE9B872)), 1.12); l.position.x = sd*0.11; l.rotation.y = sd*0.5; k.add(l); }
    return {o:k, free:false};
  });
}

/* ---------- управление: держи палец — плывёт туда; коснись вещи — подплывёт и сделает ---------- */
function dvHit(cx, cy){
  const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov)/2), px = innerHeight/2/(DV.camD*tv);
  let best = null, bd = 1;
  for(const o of DV.taps){
    if(o.on && !o.on()) continue;
    const q = toScreen(dvW(o.p())), d = Math.hypot(q.x - cx, q.y - cy)/Math.max(46, o.r*px + 14);
    if(d < bd){ bd = d; best = o; }
  }
  return best;
}
function dvControls(){
  mgOn(mgRoot, 'pointerdown', e => {
    if(!DV || (e.target.closest && e.target.closest('.mg-panel, .dv-hud, button'))) return;
    if(DV.pause || DV.mode !== 'swim') return;
    const hit = dvHit(e.clientX, e.clientY);
    if(hit){ DV.goal = hit; DV.hold = false; DV.tgt = null; sfx.tap(); return; }
    if(DV.grab) dvLetGo();   // держалась за ласту — отпустила и плывёт сама
    DV.goal = null; DV.hold = true; DV.pid = e.pointerId; DV.tgt = dvClamp(dvPoint(e.clientX, e.clientY));
  });
  mgOn(mgRoot, 'pointermove', e => { if(DV && DV.hold && e.pointerId === DV.pid && !DV.pause) DV.tgt = dvClamp(dvPoint(e.clientX, e.clientY)); });
  for(const ev of ['pointerup', 'pointercancel']) mgOn(mgRoot, ev, e => { if(DV && e.pointerId === DV.pid) DV.hold = false; });
  const keys = {ArrowLeft:[-1, 0], ArrowRight:[1, 0], ArrowUp:[0, 1], ArrowDown:[0, -1]};
  const kd = e => { if(DV && keys[e.key]){ DV.key.set(...keys[e.key], 0); DV.goal = null; if(DV.grab) dvLetGo(); e.preventDefault(); } };
  const ku = e => { if(DV && keys[e.key]){ const [x, y] = keys[e.key]; if(DV.key.x === x && DV.key.y === y) DV.key.set(0, 0, 0); } };
  mgOn(window, 'keydown', kd); mgOn(window, 'keyup', ku);
}
function dvHud(){
  if(!DV || !DV.hud) return;
  const sv = save.dive, map = sv.chest ? '' : `<span class="pill">🗺️ <b>${sv.map.length}/3</b></span>`;
  DV.hud.innerHTML = `<button class="pill dv-book" aria-label="${L('Энциклопедия моря', 'Sea book')}">📖 <b>${sv.seen.length}/${DV_LIFE.length}</b></button>
    <span class="pill">🦪 <b>${sv.day.cl.length}/3</b></span>${map}`;
  DV.hud.querySelector('.dv-book').addEventListener('click', e => { e.stopPropagation(); sfx.tap(); dvBook(); });
}

/* ---------- кадр ---------- */
function dvStep(dt){
  const D = DV, s = D.s, sc = petScale();
  D.t += dt;
  dvSway(now);
  // малыш
  if(!D.pause && D.mode === 'swim'){
    if(D.key.lengthSq()) D.tgt = dvClamp(D.pos.clone().addScaledVector(D.key, 3));
    if(D.goal){
      const g = D.goal, gp = g.p(), side = Math.sign(D.pos.x - gp.x) || -D.face;
      D.tgt = dvClamp(new V3(gp.x + side*(g.r + 0.7), gp.y + 0.15, 0));
      if(D.pos.distanceTo(gp) < g.r + 1.25){ D.goal = null; D.tgt = null; D.vel.multiplyScalar(0.3); D.face = gp.x > D.pos.x ? 1 : -1; g.go(); }
    }
    // держусь за ласту напарника: плыву за ним чуть позади
    if(D.grab && D.pal){ const P = D.pal; D.tgt = dvClamp(P.pos.clone().add(new V3(-P.face*1.1, -0.35, 0))); }
    else if(D.grab) D.grab = false;
  }
  // вдвоём быстрее: за мою ласту держится напарник или Пинг
  const boost = (D.pal && D.pal.hd && !D.grab) || (D.ping && D.ping.hold) ? 1.3 : 1, vmax = D.grab ? DV_SPEED*1.7 : DV_SPEED*boost;
  const want = new V3();
  if(D.grab && D.pal && D.tgt && !D.pause){   // за ластой: скорость напарника плюс подтяжка к его ласте — не отстаём
    want.copy(D.pal.v).addScaledVector(D.tgt.clone().sub(D.pos), 4); if(want.length() > vmax) want.setLength(vmax);
  } else if(D.tgt && !D.pause){ const d = D.tgt.clone().sub(D.pos), l = d.length(); if(l > 0.12) want.copy(d).multiplyScalar(Math.min(vmax, l*2.4)/l); else if(!D.hold && !D.grab) D.tgt = null; }
  D.vel.lerp(want, Math.min(1, dt*(want.lengthSq() ? 3.2 : 1.6)));
  D.pos.addScaledVector(D.vel, dt); dvClamp(D.pos);
  if(Math.abs(D.vel.x) > 0.35) D.face = Math.sign(D.vel.x);
  D.yaw += (D.face*Math.PI/2 - D.yaw)*Math.min(1, dt*5);
  const pitch = Math.max(-0.8, Math.min(0.8, Math.atan2(D.vel.y, Math.abs(D.vel.x) + 0.6)*0.8));
  s.root.position.copy(dvW(D.pos)).add(new V3(0, -0.72*sc, 0));
  s.root.rotation.set(0, D.yaw, 0);
  if(D.tumble > 0){ D.tumble -= dt; s.inner.rotation.x = -(1 - Math.max(0, D.tumble)/0.8)*Math.PI*2; }
  else s.inner.rotation.x += (-pitch - s.inner.rotation.x)*Math.min(1, dt*6);
  const sp = D.vel.length();
  s.flap = 0.15 + Math.min(1, sp/DV_SPEED)*0.75;
  if(D.own) updateSeal(s, now, dt);   // свой тюлень по сети (малыш из уголка обновляется в pet.js)
  D.safeT = Math.max(0, D.safeT - dt);
  if((boost > 1 || D.grab) && sp > 1 && Math.random() < dt*2.5) emit(TEX.heart, worldOf(s, new V3(0, 0.4, -0.6)), {v:new V3(-D.face*0.6, 0.8, 0), life:0.9, size:0.18});
  D.bubT -= dt;
  if(D.bubT < 0){ D.bubT = sp > 1 ? 0.25 : 0.9; emit(TEX.dot, worldOf(s, new V3(0, 0.1, 0.9)), {v:new V3((Math.random() - 0.5)*0.3, 1.3, 0), life:1.4, size:0.12 + Math.random()*0.08, grow:0.3}); }
  if(D.carry){ D.carry.position.copy(worldOf(s, new V3(0, 0.55, 1.05))).sub(DV_POS); D.carry.rotation.z += dt*2; }
  // жители, стайки, раковины, сад, карта, акула, Пинг
  for(const c of D.life) dvLifeStep(c, dt);
  dvShoalStep(dt);
  for(const c of D.clams) if(!c.open){ c.gl.material.opacity = 0.55 + Math.sin(now*3 + c.i)*0.35; }
  for(const c of D.maps) if(!c.got){ c.o.position.y = c.y0 + Math.sin(now*1.6 + c.i)*0.12; c.o.rotation.y = Math.sin(now*0.9 + c.i)*0.5; }
  if(D.chest.gl.visible) D.chest.gl.material.opacity = 0.5 + Math.sin(now*3)*0.3;
  for(const c of D.garden) dvGardenTick(c, dt);
  const boss = !D.pal || D.auth;   // акулой и Мглой управляет хозяин комнаты (или я одна)
  if(boss){ if(!D.pause){ dvSharkStep(dt); dvGloomStep(dt); } else { dvSharkPose(dt); dvGloomPose(dt); } }
  else { dvSharkMirror(dt); dvGloomMirror(dt); }
  if(D.ping) dvPingStep(dt);
  dvBigStep(dt);
  if(D.pal0){ dvPalStep(dt); D.sendT -= dt; if(D.sendT <= 0){ D.sendT = 0.1; dvNetSend(); } }
  // свет: в глубине, под навесом грота, темнее; пришла Мгла — темнеет вся бухта
  const cave = Math.max(0, Math.min(1, (D.pos.x - 44)/8));
  D.dark += ((dvGloomOn() ? 1 : 0) - D.dark)*Math.min(1, dt*0.9);
  const dk = 1 - 0.55*D.dark, gd = D.gl.o.visible ? Math.hypot(D.gl.x - D.pos.x, D.gl.y - D.pos.y) : 99;
  HEMI.intensity = (0.74 - 0.34*cave)*dk; sun.intensity = (0.6 - 0.3*cave)*dk; dvRoot.userData.cauM.opacity = 0.16*(1 - cave*0.85)*dk;
  scene.fog.color.setHex(0x3E8FC0).lerp(DV_DEEP, cave*0.7).lerp(DV_GLOOM_FOG, D.dark*0.65); scene.background.copy(scene.fog.color);
  dvRoot.userData.backM.color.setScalar(1 - 0.62*D.dark); dvRoot.userData.surfM.color.setScalar(1 - 0.5*D.dark);   // вода позади не освещается — темним сами
  if(D.vig) D.vig.style.opacity = (D.dark*0.55 + Math.max(0, 1 - gd/11)*0.45*D.gl.fade).toFixed(3);
  // камера: сбоку и чуть сверху вниз, как в аквариум — дно уходит вдаль. Камера всегда под водой (не выше −0,4)
  const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov)/2), d = Math.min(32, Math.max(4.3/(tv*camera.aspect), 4.8/tv)), hw = d*tv*camera.aspect;
  D.camD = d;
  const up = d*DV_TILT, wantX = Math.max(-5 + hw, Math.min(DV_LEN + 5 - hw, D.pos.x)), wantY = Math.min(-0.4, D.pos.y + 4);
  D.cx += (wantX - D.cx)*Math.min(1, dt*2.2); D.cy += (wantY - D.cy)*Math.min(1, dt*2.2);
  runCam.pos.set(DV_POS.x + D.cx, D.cy, d); runCam.look.set(DV_POS.x + D.cx, D.cy - up, 0);
}
const DV_DEEP = new THREE.Color(0x1C4468), DV_TILT = Math.tan(0.1);   // камера смотрит вниз на ≈6°
const DV_GLOOM_FOG = new THREE.Color(0x0E1428);
function dvLifeStep(c, dt){
  const d = c.def, o = c.o;
  if(c.stuck){   // черепаха в сети: дёргается на месте
    o.position.set(c.x, dvFloor(c.x) + 1.4 + Math.sin(now*2)*0.05, 0.4); o.rotation.set(0, 0.35, Math.sin(now*3)*0.08);
    if(o.userData.fl) o.userData.fl.forEach((f, i) => f.rotation.x = Math.sin(now*9 + i)*0.3);
    if(DV && !DV.said.has('turtle') && DV.pos.distanceTo(o.position) < 7){ DV.said.add('turtle'); floatText(L('Помогите!', 'Help!'), dvW(o.position).add(new V3(0, 0.9, 0)), '#D9527E'); sfx.mama(); }
    return;
  }
  const mv = d.mv, spd = c.v || d.v || 0;
  if(mv !== 'still'){
    c.x += c.dir*spd*dt;
    if(c.x > d.lim[1]){ c.x = d.lim[1]; c.dir = -1; } if(c.x < d.lim[0]){ c.x = d.lim[0]; c.dir = 1; }
  }
  let y = d.y === 'floor' ? dvFloor(c.x) + (d.fy || 0) : d.y;
  if(mv === 'swim') y += Math.sin(now*0.8 + c.ph)*0.3;
  if(mv === 'float') y += Math.sin(now*0.5 + c.ph)*1.3;
  if(mv === 'surf') y += Math.sin(now*1.3 + c.ph)*0.06;
  if(c.hop > 0){ c.hop = Math.max(0, c.hop - dt); y += Math.sin((1 - c.hop/0.6)*Math.PI)*0.5; }
  o.position.set(c.x, y, d.z || 0);
  if(!d.front && mv !== 'still'){ const w = c.dir > 0 ? 0 : Math.PI; o.rotation.y += (w - o.rotation.y)*Math.min(1, dt*2.5); }
  if(mv === 'crawl') o.rotation.z = Math.sin(now*8)*0.04;
  const u = o.userData;
  if(u.fl) u.fl.forEach((f, i) => { if(f.position.x < 0) f.rotation.y = Math.sin(now*3 + i)*0.35; else f.rotation.x = Math.sin(now*2.5 + i*1.3)*0.35; });
  if(u.wing) u.wing.rotation.z = Math.sin(now*2.2 + c.ph)*0.18;
  if(u.tents) u.tents.children.forEach((p, i) => p.rotation.y = Math.sin(now*1.5 + i)*0.2);
  if(u.glow) u.glow.material.opacity = 0.7 + Math.sin(now*2.4)*0.25;
  if(d.id === 'jelly'){ const k = 1 + Math.sin(now*2.2)*0.08; o.scale.set(k, 2 - k, k); }
  if(d.id === 'otter') o.rotation.z = Math.sin(now*1.3 + c.ph)*0.08;
}
function dvShoalStep(dt){
  const G = DV.gl, scared = dvGloomOn();
  for(const sh of dvShoals){
    const me = DV.pos, away = sh.c.clone().sub(me); away.z = 0;
    if(scared){ sh.c.x += (sh.c.x < G.x ? -1 : 1)*dt*2.4; sh.c.y += (dvFloor(sh.c.x) + 1.3 - sh.c.y)*dt; sh.c.x = Math.max(-6, Math.min(DV_LEN + 6, sh.c.x)); }   // Мгла — все прячутся
    else if(away.length() < 3.2){ sh.c.addScaledVector(away.normalize(), dt*3.2); }   // малыш рядом — стайка отплывает
    else sh.c.lerp(sh.home, dt*0.15);
    sh.c.y = Math.max(dvFloor(sh.c.x) + 1.2, Math.min(-1, sh.c.y));
    for(const f of sh.f){
      const u = f.userData; u.a += dt*u.sp;
      f.position.set(sh.c.x + Math.cos(u.a)*u.r*1.6, sh.c.y + u.y + Math.sin(u.a*2)*0.1, sh.c.z + Math.sin(u.a)*u.r);
      f.rotation.y = -u.a - Math.PI/2;
    }
  }
}

/* ---------- фото жителя и карточки ---------- */
async function dvCard({img, ttl, txt, got, btn}){
  const panel = mgNode('div', 'mg-panel dv-card', `${img ? `<img class="dv-img" src="${img}" alt="">` : ''}
    <p class="ttl display">${ttl}</p>${txt ? `<p class="dv-fact">${txt}</p>` : ''}${got ? `<p class="got">${got}</p>` : ''}
    <button class="btn">${btn || L('Дальше 🫧', 'Next 🫧')}</button>`);
  await new Promise(r => mgOn(panel.querySelector('.btn'), 'click', e => { e.stopPropagation(); sfx.tap(); r(); }));
  panel.classList.add('away'); await wait(0.2); panel.remove();
}
async function dvPhoto(id, c){
  const D = DV; if(!D) return;
  D.pause = true; D.hold = false; D.tgt = null;
  const d = dvDef(id), at = dvW(c ? c.o.position : D.sh.o.position).add(new V3(0, (d.hy || 0) + 0.5, 0));
  if(c) c.hop = 0.6;
  sfx.ding(); burst(TEX.star, at, 10, 1.6, 0.26); floatText('📷', at.clone().add(new V3(0, 0.6, 0)));
  const fresh = !save.dive.seen.includes(id);
  if(fresh){ save.dive.seen.push(id); D.fresh++; persist(); }
  await wait(0.5);
  await dvCard({img:dvThumb(id), ttl:`${d.name}`, txt:d.fact,
    got:fresh ? L(`📖 Новый житель в энциклопедии! +${DV_NEW} 🐚`, `📖 New in the sea book! +${DV_NEW} 🐚`) : ''});
  if(!DV) return;
  if(fresh){ addShells(DV_NEW, {x:innerWidth/2, y:innerHeight*0.45}); sfx.star(); }
  dvHud();
  await dvBookGift();
  if(DV) DV.pause = false;
}
async function dvBookGift(){
  const sv = save.dive;
  if(sv.book || sv.seen.length < DV_LIFE.length) return;
  sv.book = true; if(!owns('pic_sea')) save.owned.push('pic_sea'); persist();
  sfx.hug(); burst(TEX.heart, headTop(DV.s), 16, 2.2, 0.3);
  await dvCard({img:typeof homeThumb === 'function' ? homeThumb('pic_sea') : '', ttl:L('Энциклопедия собрана! 📖', 'The sea book is complete! 📖'),
    txt:L('Ты познакомилась со всеми жителями бухты. Подарок для иглу — картина «Морские жители» 🖼️', 'You met everyone in the bay. A gift for the igloo — the "Sea friends" picture 🖼️')});
}
// книжка: все жители, незнакомые — силуэтами (как Покедекс)
async function dvBook(){
  if(!DV || DV.pause) return;
  DV.pause = true; DV.hold = false;
  const sv = save.dive, guest = dvGuest();
  const panel = mgNode('div', 'mg-panel dv-book-panel', `
    <p class="ttl display">📖 ${L('Энциклопедия моря', 'The sea book')}</p>
    <p class="got">${L(`Сфотографировано: ${sv.seen.length} из ${DV_LIFE.length}`, `Photographed: ${sv.seen.length} of ${DV_LIFE.length}`)}${sv.book ? ' ✨' : ''}</p>
    <div class="dv-grid">${DV_LIFE.map(d => { const got = sv.seen.includes(d.id);
      return `<button class="${got ? 'got' : 'no'}" data-id="${d.id}"><img src="${dvThumb(d.id)}" alt=""><span>${got ? d.name : '?'}</span>${d.id === guest ? `<i class="tag">${L('сегодня', 'today')}</i>` : ''}</button>`; }).join('')}</div>
    <p class="got dv-say">${L('Коснись жителя, чтобы прочитать про него. Гости приплывают по одному в день 🌊', 'Tap a friend to read about it. Guests come one per day 🌊')}</p>
    <button class="btn" data-k="ok">${L('Плыть дальше 🫧', 'Keep swimming 🫧')}</button>`);
  const say = panel.querySelector('.dv-say');
  panel.querySelectorAll('.dv-grid button').forEach(b => mgOn(b, 'click', e => {
    e.stopPropagation(); sfx.tap(); const d = dvDef(b.dataset.id);
    say.textContent = sv.seen.includes(d.id) ? `${d.ic} ${d.fact}` : d.rare ? L('Этот гость приплывает не каждый день. Загляни в другой раз 🌊', 'This guest does not come every day. Come back another time 🌊')
      : d.id === 'shark' ? L('Кто-то большой иногда заплывает в бухту… 🦈', 'Someone big sometimes swims into the bay… 🦈') : L('Этот житель где-то в бухте. Поищи! 🔎', 'This one lives somewhere in the bay. Look around! 🔎');
  }));
  await new Promise(r => mgOn(panel.querySelector('[data-k="ok"]'), 'click', e => { e.stopPropagation(); sfx.tap(); r(); }));
  panel.classList.add('away'); await wait(0.2); panel.remove();
  if(DV) DV.pause = false;
}

/* ---------- раковины, сад, карта, сундук ---------- */
async function dvClam(c){
  const at = dvW(c.g.position).add(new V3(0, 0.5, 0));
  if(c.open){ floatText(L('Пусто. Завтра вырастет новая жемчужинка', 'Empty. A new pearl grows by tomorrow'), at, '#6B6A7E'); return; }
  c.open = true; save.dive.day.cl.push(c.i); persist();
  sfx.lever(); await tween(0.45, k => c.hinge.rotation.x = -0.8*ease.out(k));
  sfx.coin(); burst(TEX.star, at, 8, 1.2, 0.22); c.gl.visible = false;
  const p0 = c.pearl.position.clone();
  await tween(0.5, k => { c.pearl.position.y = p0.y + Math.sin(k*Math.PI)*0.9; c.pearl.scale.setScalar(0.13*(1 - k*0.6)); });
  c.pearl.visible = false; c.pearl.position.copy(p0); c.pearl.scale.setScalar(0.13);
  addShells(DV_PEARL, toScreen(at));
  floatText(L('Жемчужинка!', 'A pearl!'), at, '#D9527E');
  dvHud();
  if(save.dive.day.cl.length >= 3 && DV) setTimeout(() => DV && mgHint(L('Все жемчужинки на сегодня собраны 🦪 Завтра будут новые', 'All of today\'s pearls are found 🦪 More tomorrow')), 900);
}
const dvStage = i => { const t0 = save.dive.garden[i]; if(!t0) return -1; const h = (Date.now() - t0)/3.6e6; return h < DV_GROW[0] ? 0 : h < DV_GROW[1] ? 1 : 2; };
function dvGardenShow(c){
  const st = dvStage(c.i); if(st === c.st) return; c.st = st;
  if(c.plant){ c.g.remove(c.plant); c.plant = null; }
  const p = new THREE.Group(); c.g.add(p); c.plant = p; p.userData = {};
  if(st < 0){ const sp = textSprite('＋', '#3B8F5E'); sp.scale.set(0.9, 0.34, 1); sp.position.y = 0.55; p.add(sp); p.userData.plus = sp; return; }
  if(st === 0){ for(const sd of [-1, 1]){ const l = dvBlob(p, 0x7FD1A8, 0.06, 0.16, 0.1, sd*0.07, 0.2, 0, 1.12); l.rotation.z = -sd*0.5; } return; }
  const k = dvKelp(st === 1 ? 1.1 : 2.4, 0x6CC28C, st === 1 ? 3 : 5); p.add(k); DV.sway.push(k); p.userData.k = k;
  if(st === 2){
    for(const [x, y] of [[0.2, 1.2], [-0.2, 1.7], [0.15, 2.2]]) dvBlob(p, 0xFF9BB8, 0.08, 0.08, 0.08, x, y, 0.1, 1.12);
    const f = makeFish(0xFFB3C7); f.scale.setScalar(0.6); p.add(f); p.userData.fish = f;
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX, transparent:true, depthWrite:false})); gl.scale.setScalar(1.3); gl.position.y = 1.4; p.add(gl); p.userData.gl = gl;
  }
}
function dvGardenTick(c, dt){
  const u = c.plant && c.plant.userData; if(!u) return;
  if(u.plus) u.plus.position.y = 0.55 + Math.sin(now*2.5 + c.i)*0.08;
  if(u.fish){ const a = now*1.4 + c.i; u.fish.position.set(Math.cos(a)*0.55, 1.4 + Math.sin(a*2)*0.2, Math.sin(a)*0.4); u.fish.rotation.y = -a - Math.PI/2; }
  if(u.gl) u.gl.visible = save.dive.gh[c.i] !== dvToday();
}
async function dvGarden(c){
  const sv = save.dive, st = dvStage(c.i), at = dvW(c.g.position).add(new V3(0, 1.0, 0));
  if(st < 0){
    sv.garden[c.i] = Date.now(); persist(); sfx.pop(); burst(TEX.puff, at, 6, 1, 0.3); dvGardenShow(c);
    floatText(L('Посадили! 🌱', 'Planted! 🌱'), at, '#3B8F5E');
    if(!tipSeen('garden')){ tipDone('garden'); DV.pause = true;
      await dvCard({ttl:L('Подводный сад 🌱', 'Underwater garden 🌱'), txt:L('Водоросли растут по-настоящему, как цветы. Загляни сюда завтра — росток подрастёт, а в выросшей водоросли поселится рыбка-садовник и будет дарить ракушки 🐚', 'Seaweed grows for real, like flowers. Come back tomorrow — the sprout will be bigger, and a little gardener fish will live in the grown one and give you shells 🐚')});
      if(DV) DV.pause = false; }
    return;
  }
  if(st < 2){ floatText(st === 0 ? L('Растёт… Загляни завтра 🌱', 'Growing… Come back tomorrow 🌱') : L('Подрастает! Скоро вырастет 🌿', 'Getting bigger! Almost grown 🌿'), at, '#3B8F5E'); c.plant.scale.setScalar(1.15); tween(0.3, k => c.plant.scale.setScalar(1.15 - 0.15*k)); return; }
  if(sv.gh[c.i] !== dvToday()){
    sv.gh[c.i] = dvToday(); persist(); sfx.coin(); burst(TEX.heart, at, 8, 1.4, 0.24);
    addShells(DV_GARDEN, toScreen(at)); floatText(L('Рыбка-садовник дарит ракушки!', 'The gardener fish gives you shells!'), at, '#D9527E');
  } else floatText(L('Сад растёт ♡ Подарок будет завтра', 'The garden grows ♡ Another gift tomorrow'), at, '#3B8F5E');
}
async function dvMapGot(c){
  if(c.got) return; c.got = true;
  const sv = save.dive; sv.map.push(c.i); persist();
  sfx.paper(); sfx.sparkle();
  const from = c.o.position.clone(), to = () => worldOf(DV.s, new V3(0, 1.2, 0)).sub(DV_POS);
  await tween(0.5, k => { c.o.position.lerpVectors(from, to(), k); c.o.scale.setScalar(1 - k*0.7); });
  DV.grp.remove(c.o);
  floatText(L(`Кусочек карты ${sv.map.length}/3`, `Map piece ${sv.map.length}/3`), dvW(to()), '#B98B55');
  dvHud();
  if(sv.map.length >= 3){
    DV.chest.gl.visible = true; DV.pause = true;
    await dvCard({img:DV_MAP_TEX.image.toDataURL(), ttl:L('Карта собрана! 🗺️', 'The map is complete! 🗺️'),
      txt:L('Крестик нарисован у старого кораблика в глубине. Там сундук! ⚓', 'The X is by the old boat in the deep. There is a chest! ⚓')});
    if(DV) DV.pause = false;
  }
}
async function dvChest(){
  const sv = save.dive, ch = DV.chest, at = dvW(ch.g.position).add(new V3(0, 1, 0));
  if(sv.chest) return floatText(L('Пусто — подарок уже в иглу 🏠', 'Empty — the gift is in the igloo 🏠'), at, '#6B6A7E');
  if(sv.map.length < 3){ sfx.bad(); return floatText(L(`Заперто 🔒 Кусочков карты: ${sv.map.length}/3`, `Locked 🔒 Map pieces: ${sv.map.length}/3`), at, '#6B6A7E'); }
  sv.chest = true; if(!owns('lamp_pearl')) save.owned.push('lamp_pearl'); persist();
  DV.pause = true; ch.gl.visible = false; ch.lock.visible = false;
  sfx.lever(); await tween(0.6, k => ch.lid.rotation.x = -1.2*ease.out(k));
  sfx.buy(); for(let i = 0; i < 3; i++) setTimeout(() => burst(TEX.star, at, 12, 2.2, 0.3), i*200);
  await wait(0.7);
  await dvCard({img:typeof homeThumb === 'function' ? homeThumb('lamp_pearl') : '', ttl:L('Сокровище! ✨', 'Treasure! ✨'),
    txt:L('В сундуке — лампа-жемчужина для иглу. Поставь её в домике: «Обустроить» → Лампа 💡', 'In the chest is a pearl lamp for the igloo. Put it in the house: "Decorate" → Lamp 💡')});
  dvHud();
  if(DV) DV.pause = false;
}

/* ---------- черепаха в сети: узелки кругом пальца (как «Скорая») ---------- */
async function dvTurtle(c){
  const D = DV; D.pause = true; D.mode = 'knot'; D.hold = false; D.tgt = null; D.vel.set(0, 0, 0);
  mgHint(L('Черепаха запуталась в старой сети! Покрути пальцем вокруг узелка 🔄', 'The turtle is tangled in an old net! Circle your finger around the knot 🔄'));
  let left = c.knots.length;
  for(const kn of c.knots){
    const at = () => kn.o.getWorldPosition(new V3()), sc = () => toScreen(at());
    const ring = mgNode('div', 'circle-hint net-hint'), un = pin(ring, at);
    const pulse = () => kn.o.scale.setScalar(1 + Math.sin(now*6)*0.14); mgTick(pulse);
    let a0 = null, sum = 0, moved = false;
    const ang = e => { const q = sc(); return Math.atan2(e.clientY - q.y, e.clientX - q.x); };
    await gesture({
      pointerdown:e => { const q = sc(); if(Math.hypot(e.clientX - q.x, e.clientY - q.y) > 150){ mgHint(L('Узелок — там, где светится круг 🔄', 'The knot is inside the glowing circle 🔄')); return false; } a0 = ang(e); sum = 0; moved = false; return false; },
      pointerup:() => { if(a0 !== null && !moved) mgHint(L('Не нажимай — покрути пальцем по кругу 🔄', 'Don\'t tap — draw a circle with your finger 🔄')); a0 = null; return false; },
      pointermove:e => {
        if(a0 === null) return false;
        const q = sc(); if(Math.hypot(e.clientX - q.x, e.clientY - q.y) < 18) return false;
        const a = ang(e), da = Math.atan2(Math.sin(a - a0), Math.cos(a - a0)); a0 = a; sum += da;
        if(Math.abs(da) > 0.02){ moved = true; kn.o.rotation.z += da; if(Math.random() < 0.15) sfx.rub(); }
        ring.style.setProperty('--p', Math.min(1, Math.abs(sum)/(Math.PI*1.6)));
        return Math.abs(sum) >= Math.PI*1.6;
      }});
    un(); mgTicks.delete(pulse);
    if(!DV) return;
    kn.free = true; left--;
    sfx.pop(); sfx.star(); burst(TEX.star, at(), 8, 1.4, 0.24);
    const o = kn.o; tween(0.35, k => { o.scale.setScalar(Math.max(0.01, 1 - k)); o.rotation.z += 0.3; }).then(() => o.parent && o.parent.remove(o));
    if(left) mgHint(L(`Ещё ${left} ${plural(left, 'узелок', 'узелка', 'узелков', 'knot', 'knots')}!`, `${left} more ${plural(left, 'узелок', 'узелка', 'узелков', 'knot', 'knots')}!`));
  }
  mgHint('');
  const net = c.net, y0 = net.position.y;
  await tween(0.7, k => { net.position.y = y0 - k*1.8; net.scale.setScalar(1 - k*0.4); }, ease.io);
  c.o.remove(net); c.net = null;
  c.stuck = false; c.x = c.o.position.x; c.dir = 1; c.hop = 0.6;
  save.dive.turt = true; persist();
  const at = dvW(c.o.position).add(new V3(0, 0.8, 0));
  sfx.hug(); burst(TEX.heart, at, 14, 2, 0.3); floatText(L('Свобода! Спасибо!', 'Free! Thank you!'), at, '#D9527E');
  addShells(DV_TURTLE, toScreen(at));
  await wait(1.2);
  const fresh = !save.dive.seen.includes('turtle'); if(fresh){ save.dive.seen.push('turtle'); DV.fresh++; persist(); }
  await dvCard({img:dvThumb('turtle'), ttl:L('Ты спасла черепаху! 🐢', 'You saved the turtle! 🐢'),
    txt:`${dvDef('turtle').fact} ${L('Старые сети и пакеты в море очень опасны для черепах и тюленей. Поэтому мусор — только в урну ♡', 'Old nets and plastic bags are very dangerous for turtles and seals. That is why rubbish always goes in the bin ♡')}`,
    got:fresh ? L('📖 Новый житель в энциклопедии!', '📖 New in the sea book!') : ''});
  dvHud();
  if(DV){ DV.mode = 'swim'; DV.pause = false; await dvBookGift(); }
}

/* ---------- акула-непоседа: салки → мячик → подружка ---------- */
function dvHidden(){ return DV_HIDE.find(h => Math.hypot(DV.pos.x - h.x, DV.pos.y - h.y()) < h.r); }
function dvRingsOn(on){
  if(!on){ DV.rings.forEach(u => u()); DV.rings = []; return; }
  if(DV.rings.length) return;
  DV.rings = DV_HIDE.map(h => pin(mgNode('div', 'target dv-hide'), () => dvW(new V3(h.x, h.y(), 0))));
}
function dvSharkStep(dt){
  const S = DV.sh, sv = save.dive.shark, o = S.o, me = DV.pos;
  S.t -= dt;
  const moveTo = (x, y, v) => { const dx = x - S.x, dy = y - S.y, l = Math.hypot(dx, dy); if(l > 0.05){ const k = Math.min(l, v*dt)/l; S.x += dx*k; S.y += dy*k; } if(Math.abs(dx) > 0.3) S.dir = Math.sign(dx); return l; };
  if(S.st === 'off'){ if(S.t <= 0 && DV.mode === 'swim' && !dvGloomOn()) dvSharkCome(); dvSharkPose(dt); return; }
  // за кем гоняется: по сети — за ближним из двоих, кто не спрятался
  const who = dvWho(S.x, S.y), tp = who.pos;
  if(S.st === 'friend'){   // подружка: плавает туда-сюда по бухте; пришла Мгла — прячется за кораблик
    if(dvGloomOn()) moveTo(58, -9.5, 3.5);
    else { S.x += S.dir*1.2*dt; if(S.x > 60) S.dir = -1; if(S.x < 16) S.dir = 1;
      S.y += (-6.5 + Math.sin(now*0.5)*0.8 - S.y)*Math.min(1, dt*2); }
  } else if(S.st === 'warn'){
    moveTo(tp.x + S.side*9, tp.y, 3);
    if(S.t <= 0){ S.st = 'hunt'; S.t = 12; }
  } else if(S.st === 'hunt'){
    const h = who.hid;
    if(h){
      const l = moveTo(h.x + S.side*(h.r + 1.4), h.y(), DV_SHARK_V);
      if(l < 0.6){ S.st = 'sniff'; S.t = 2.4; S.who = who.k; floatText('?', dvW(new V3(S.x, S.y + 0.9, 0)), '#3B3A4A'); sfx.purr(); }
    } else {
      const l = moveTo(tp.x, tp.y, DV_SHARK_V);
      if(l < 1.3 && !who.safe) who.k === 'pal' ? dvTagPal() : dvTag();
    }
    if(S.st === 'hunt' && S.t <= 0) dvSharkLeave(false);
  } else if(S.st === 'sniff'){
    S.y += Math.sin(now*6)*0.01;
    const P = S.who === 'pal' ? DV.pal : null;
    if(P ? P.h < 0 : !dvHidden()){ S.st = 'hunt'; S.t = Math.max(S.t, 5); }
    else if(S.t <= 0){ sv.hid++; persist(); dvSharkLeave(true); }
  } else if(S.st === 'leave'){
    S.x += S.dir*4.5*dt; S.y += (-4 - S.y)*dt;
    if(S.t <= 0){ S.st = 'off'; S.t = DV_SHARK_T[1]; o.visible = false; if(!dvGloomOn()) dvRingsOn(false); }
  } else if(S.st === 'sad'){   // потеряла мячик: ждёт рядом (пришла Мгла — прячется за кораблик)
    const l = dvGloomOn() ? moveTo(58, -9.5, 3.5) : moveTo(me.x + S.side*4.2, Math.max(me.y, -9), 1.8);
    if(DV.carry && Math.hypot(S.x - me.x, S.y - me.y) < 3) dvGiveBall();
  }
  dvSharkPose(dt);
}
function dvSharkPose(dt){   // акула на экране (по сети у гостя — только это: где она, присылает хозяин)
  const S = DV.sh, o = S.o;
  o.position.set(S.x, S.y + Math.sin(now*2)*0.12, S.st === 'friend' ? -1.2 : 0.3);
  const w = S.dir > 0 ? 0 : Math.PI; o.rotation.y += (w - o.rotation.y)*Math.min(1, dt*3);
  o.userData.fl.forEach(f => f.rotation.y = Math.sin(now*(S.st === 'hunt' ? 9 : 4))*0.4);
  if(S.bub) S.bub.position.set(S.x + 0.5, S.y + 1.3 + Math.sin(now*2)*0.08, 0.3);
}
// за кем охотятся (акула и Мгла): я или напарник по сети — кто ближе и не спрятался; hid — где спрятался
function dvWho(x, y){
  const me = {k:'me', pos:DV.pos, hid:dvHidden(), safe:DV.safeT > 0 || DV.out}, P = DV.pal;
  if(!P || P.gone) return me;
  const pal = {k:'pal', pos:P.pos, hid:P.h >= 0 ? DV_HIDE[P.h] : null, safe:P.safe};
  if(me.safe) return pal;
  if(pal.safe) return me;
  const score = w => Math.hypot(w.pos.x - x, w.pos.y - y) + (w.hid ? 30 : 0);   // спрятавшегося ищут, только если спрятались оба
  return score(pal) < score(me) ? pal : me;
}
function dvSharkCome(){
  const S = DV.sh, sv = save.dive.shark, me = DV.pos;
  S.side = me.x > DV_LEN/2 ? -1 : 1; S.x = me.x + S.side*16; S.y = me.y; S.dir = -S.side; S.o.visible = true;
  if(sv.hid >= DV_HIDES && !DV.pal){   // всё поняли: она ищет мячик (эта история — одной; по сети акула просто играет в салки)
    S.st = 'sad'; S.bub = new THREE.Sprite(new THREE.SpriteMaterial({map:bubbleTex('⚽'), transparent:true, depthWrite:false})); S.bub.scale.setScalar(1.1); DV.grp.add(S.bub);
    sfx.mama(); dvBallOut();
    mgHint(L('Акула грустит… Она потеряла мячик! Поищи его у затонувшего кораблика ⚓', 'The shark looks sad… She lost her ball! Look for it by the sunken boat ⚓'));
    return;
  }
  S.st = 'warn'; S.t = 2.2; dvSharkHi();
  if(DV.pal) netSend({t:'dev', k:'scome'});
  if(DV.ping){ const h = DV_HIDE.reduce((a, b) => Math.abs(b.x - me.x) < Math.abs(a.x - me.x) ? b : a); DV.ping.hide = h; floatText(L('Сюда! 🌿', 'Over here! 🌿'), dvW(DV.ping.pos).add(new V3(0, 0.9, 0)), '#3B8F5E'); }
}
function dvSharkHi(){   // акула приплыла (у гостя по сети — по сигналу хозяина)
  sfx.shark(); dvRingsOn(true);
  mgHint(L('🦈 Ой, акула! Спрячься в водорослях, в щели между камнями или в кораблике!', '🦈 Oh, a shark! Hide in the seaweed, between the rocks or in the boat!'));
}
function dvSharkLeave(fooled){
  const S = DV.sh; S.st = 'leave'; S.t = 4; S.dir = S.x > DV.pos.x ? 1 : -1;
  if(DV.pal) netSend({t:'dev', k:'sleave', f:fooled ? 1 : 0});
  dvSharkBye(fooled);
}
function dvSharkBye(fooled){
  if(!dvGloomOn()) dvRingsOn(false);
  if(DV.ping && !dvGloomOn()) DV.ping.hide = null;
  if(fooled){
    const n = save.dive.shark.hid;
    floatText(L('Где же ты? 🤭', 'Where are you? 🤭'), dvW(new V3(S.x, S.y + 1, 0)), '#3B3A4A'); sfx.giggle();
    mgHint(n >= DV_HIDES && !DV.pal0 ? L('Не нашла! Кажется, акула что-то ищет… 🤔', 'She did not find you! The shark seems to be looking for something… 🤔') : L('Не нашла! Ты хорошо спряталась 🌿', 'She did not find you! Great hiding 🌿'));
  } else mgHint(L('Акула уплыла. Уф! 🫧', 'The shark swam away. Phew! 🫧'));
  setTimeout(() => { if(DV && /🌿|🫧|🤔/.test(mgHintEl.textContent)) mgHint(''); }, 3000);
}
function dvTag(remote){   // догнала: это просто салки! (remote — по сети догнали меня, акулу ведёт хозяин)
  const S = DV.sh; DV.tumble = 0.8; DV.vel.set(-S.dir*3, 1.5, 0);
  sfx.boing(); sfx.giggle();
  const at = headTop(DV.s); burst(TEX.puff, at, 8, 1.4, 0.3);
  floatText(L('Салки! Ты водишь 😄', 'Tag! You\'re it 😄'), at, '#D9527E');
  if(!remote) dvSharkLeave(false);
  mgHint(L('Акула просто играет в салки! Но прятаться интереснее 🌿', 'The shark just plays tag! But hiding is more fun 🌿'));
}
function dvTagPal(){   // по сети акула догнала напарника
  const P = DV.pal, at = dvW(P.pos).add(new V3(0, 1, 0));
  sfx.boing(); burst(TEX.puff, at, 8, 1.4, 0.3); floatText(L('Салки! 😄', 'Tag! 😄'), at, '#D9527E');
  netSend({t:'dev', k:'tag'});
  dvSharkLeave(false);
}
function dvBallOut(){
  if(DV.ball) return;
  const tex = canvasTex(128, (g, s) => { ['#FF9BB8', '#FFFDF8', '#7FB8F0', '#FFFDF8', '#FFD66B', '#FFFDF8'].forEach((c, i) => { g.fillStyle = c; g.fillRect(0, i*s/6, s, s/6 + 1); }); });
  const b = addOutline(new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 14), toon(0xFFFFFF)), 1.08); b.material.map = tex;
  b.position.set(58.2, dvFloor(58.2) + 3.1, 0.5); DV.grp.add(b); DV.ball = b;
  const gl = new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX, transparent:true, depthWrite:false})); gl.scale.setScalar(1.6); b.add(gl);
  dvTap({k:'ball', r:0.5, p:() => b.position.clone(), on:() => DV.ball === b && !DV.carry, go:() => {
    DV.carry = b; b.children[0].visible = false; sfx.pop(); sfx.arf();
    mgHint(L('Нашла мячик! Отнеси его акуле 🦈', 'You found the ball! Take it to the shark 🦈'));
  }});
}
async function dvGiveBall(){
  const S = DV.sh, b = DV.carry; if(!b || DV.pause) return;
  DV.pause = true; DV.carry = null; DV.vel.set(0, 0, 0);
  const from = b.position.clone(), to = S.o.position.clone().add(new V3(S.dir*1.2, 0.5, 0));
  sfx.boing(); await tween(0.6, k => { b.position.lerpVectors(from, to, k); b.position.y += Math.sin(k*Math.PI)*1.2; });
  if(S.bub){ DV.grp.remove(S.bub); S.bub = null; }
  // акула рада: кувырок и мячик на носу
  sfx.hug(); sfx.giggle();
  const at = dvW(S.o.position).add(new V3(0, 1, 0)); burst(TEX.heart, at, 18, 2.4, 0.32);
  floatText(L('Мой мячик! Давай дружить! 💗', 'My ball! Let\'s be friends! 💗'), at, '#D9527E');
  const x0 = S.x, y0 = S.y;
  await tween(1.2, k => { S.o.rotation.z = k*Math.PI*2; b.position.set(S.x + S.dir*0.9, S.y + 0.8 + Math.abs(Math.sin(k*Math.PI*3))*0.9, 0.3); });
  S.o.rotation.z = 0; DV.grp.remove(b); DV.ball = null;
  const sv = save.dive; sv.shark.friend = true; if(!owns('rug_shark')) save.owned.push('rug_shark');
  const fresh = !sv.seen.includes('shark'); if(fresh){ sv.seen.push('shark'); DV.fresh++; }
  persist(); mgHint('');
  await dvCard({img:dvThumb('shark'), ttl:L('Акула — твоя подружка! 🦈💗', 'The shark is your friend! 🦈💗'),
    txt:`${L('Она не пугала — она искала, с кем поиграть. А мячик потеряла у кораблика.', 'She was not being scary — she was looking for someone to play with, and lost her ball by the boat.')} ${dvDef('shark').fact}`,
    got:L('🎁 Подарок для иглу — коврик-акулёнок!', '🎁 A gift for the igloo — the shark rug!') + (fresh ? L(' · 📖 новый житель', ' · 📖 new in the book') : '')});
  if(!DV) return;
  S.st = 'friend'; S.x = x0; S.y = y0; dvHud(); DV.pause = false;
  await dvBookGift();
}
function dvSharkTap(){
  const S = DV.sh, at = dvW(S.o.position).add(new V3(0, 1, 0));
  if(S.st === 'friend'){ sfx.boing(); burst(TEX.heart, at, 8, 1.4, 0.26); floatText(L('Привет, подружка! 💗', 'Hi, friend! 💗'), at, '#D9527E'); if(!save.dive.seen.includes('shark')) dvPhoto('shark'); return; }
  if(S.st === 'sad') return floatText(DV.carry ? L('Подплыви поближе с мячиком ⚽', 'Swim closer with the ball ⚽') : L('Где мой мячик? ⚽', 'Where is my ball? ⚽'), at, '#3B3A4A');
  floatText(L('Прячься! 🌿', 'Hide! 🌿'), at, '#3B3A4A');
}

/* ---------- Пинг плывёт рядом ---------- */
function dvPingStep(dt){
  const P = DV.ping, p = P.s, me = DV.pos, sc = 0.8*0.62, B = DV.bigC;
  const want = P.hide ? new V3(P.hide.x + 0.6, P.hide.y() + 0.4, 0)
    : P.big && B ? B.g.position.clone().add(new V3(DV.pos.x < B.g.position.x ? 1.5 : -1.5, 0.5, -1))   // держит большую раковину с другой стороны
    : P.hold ? me.clone().add(new V3(-DV.face*1.0, -0.3, 0))   // держится за ласту
    : me.clone().add(new V3(-DV.face*1.9, 0.7 + Math.sin(now*1.2)*0.3, 0));
  const d = want.sub(P.pos), l = d.length();
  P.vel.lerp(l > 0.3 ? d.multiplyScalar(Math.min(DV_SPEED*1.1, l*1.8)/l) : new V3(), Math.min(1, dt*2.5));
  P.pos.addScaledVector(P.vel, dt); dvClamp(P.pos);
  if(Math.abs(P.vel.x) > 0.3) P.face = Math.sign(P.vel.x);
  P.yaw += (P.face*Math.PI/2 - P.yaw)*Math.min(1, dt*5);
  p.root.position.copy(P.pos).add(new V3(0, -0.9*sc, 0.4));   // Пинг живёт в группе бухты: координаты бухты, не мира
  p.root.rotation.set(0, P.yaw, 0);   // плывёт боком, как малыш
  p.inner.rotation.x = 1.0; p.flap = 0.4 + Math.min(1, P.vel.length()/3)*0.6;
  updateSeal(p, now, dt);
}

function dvPingTap(){   // коснись Пинга — он держится за твою ласту (вдвоём быстрее); ещё раз — плывёт сам
  const P = DV.ping, at = dvW(P.pos).add(new V3(0, 0.9, 0));
  if(P.hide) return floatText(L('Тсс! Прячемся 🤫', 'Shh! We are hiding 🤫'), at, '#3E8DB8');
  P.hold = !P.hold; P.big = false; sfx.quack();
  floatText(P.hold ? L('Держусь за ласту! Вдвоём быстрее 💨', 'Holding your flipper! Faster together 💨') : L('Плыву сам 🐧', 'I\'ll swim on my own 🐧'), at, '#3E8DB8');
}

/* ---------- 🌑 Мгла: тёмное облако из грота. Её боятся даже акулы — от неё только прятаться ----------
   Не рыба, а расплывчатая клякса: тёмные шары-клубы, мутный ореол, щупальца-струйки и два горящих глаза.
   Выползает из грота → рыщет по бухте к выходу (DV_GLOOM_LONG с) → уползает обратно. Заметила (ближе DV_GLOOM_SEE) — гонится,
   чуть медленнее малыша. Спрятался — шарит рядом и ползёт дальше. Поймала — «Ам!», темно, и выплёвывает наверх. */
const INK_TEX = canvasTex(64, (g, s) => {
  const gr = g.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
  gr.addColorStop(0, 'rgba(18,14,36,.85)'); gr.addColorStop(0.55, 'rgba(22,18,44,.45)'); gr.addColorStop(1, 'rgba(22,18,44,0)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
});
function makeGloom(){
  const g = new THREE.Group(), blobs = [], tents = [], glows = [];
  const puff = new THREE.Sprite(new THREE.SpriteMaterial({map:INK_TEX, transparent:true, depthWrite:false, fog:false})); puff.scale.setScalar(6.2); puff.position.z = -0.6; g.add(puff);
  const mat = (c, op) => new THREE.MeshBasicMaterial({color:c, transparent:true, opacity:op, depthWrite:false, fog:false});
  [[0, 0, 0, 1.25, 0x15112A, 0.95], [0.9, 0.35, -0.2, 0.8, 0x211A3C, 0.75], [-0.95, 0.2, -0.1, 0.85, 0x1B1533, 0.8], [0.3, 0.9, -0.3, 0.7, 0x2A2148, 0.7],
   [-0.4, -0.75, 0.1, 0.75, 0x191430, 0.8], [0.7, -0.6, -0.2, 0.6, 0x241C40, 0.7], [-1.4, -0.3, -0.4, 0.55, 0x2A2148, 0.6], [1.45, -0.1, -0.4, 0.5, 0x2A2148, 0.6]]
    .forEach(([x, y, z, r, c, op], i) => { const m = new THREE.Mesh(SMALL, mat(c, op)); m.position.set(x, y, z); m.scale.setScalar(r); m.userData = {r, op, ph:i*1.7}; g.add(m); blobs.push(m); });
  // щупальца-струйки снизу и сзади
  for(let i = 0; i < 7; i++){
    const p = new THREE.Group(), a = -0.9 + i*0.3; p.position.set(Math.sin(a)*0.9, -0.7, -0.2 + (i % 2)*0.3); g.add(p);
    const pts = []; for(let j = 0; j <= 6; j++) pts.push(new V3(Math.sin(a)*j*0.18 + Math.sin(j*0.9 + i)*0.12, -j*0.32, 0));
    const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.11 - i%3*0.02, 6), mat(0x1B1533, 0.8)); p.add(t);
    p.userData = {ph:i*0.9}; tents.push(p);
  }
  // глаза: жёлтые щёлки с сиянием, чуть «сердитые»
  const eyes = new THREE.Group(); eyes.position.set(0, 0.25, 1.15); g.add(eyes);
  for(const sd of [-1, 1]){
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX, color:0xFFD23F, transparent:true, depthWrite:false, fog:false})); gl.scale.setScalar(0.7); gl.position.set(sd*0.36, 0, -0.05); eyes.add(gl); glows.push(gl);
    const e = new THREE.Mesh(SMALL, new THREE.MeshBasicMaterial({color:0xFFF0A0, fog:false})); e.scale.set(0.2, 0.1, 0.05); e.position.set(sd*0.36, 0, 0); e.rotation.z = sd*0.3; eyes.add(e);
    const p = new THREE.Mesh(SMALL, new THREE.MeshBasicMaterial({color:0x2A1E08, fog:false})); p.scale.set(0.035, 0.085, 0.02); p.position.set(sd*0.36, 0, 0.05); eyes.add(p);
  }
  g.userData = {blobs, tents, glows, eyes, puff};
  return g;
}
const dvGloomOn = () => !!(DV && DV.gl && DV.gl.st !== 'off' && DV.gl.st !== 'leave');
function dvGloomStep(dt){
  const G = DV.gl, D = DV;
  G.t -= dt;
  const mv = (x, y, v) => { const dx = x - G.x, dy = y - G.y, l = Math.hypot(dx, dy); if(l > 0.05){ const k = Math.min(l, v*dt)/l; G.x += dx*k; G.y += dy*k; } if(Math.abs(dx) > 0.3) G.dir = Math.sign(dx); return l; };
  const aim = w => w.k === 'pal' && D.pal ? {pos:D.pal.pos, hid:D.pal.h >= 0 ? DV_HIDE[D.pal.h] : null, safe:D.pal.safe} : {pos:D.pos, hid:dvHidden(), safe:D.safeT > 0 || D.out || D.pause};
  if(G.st === 'off'){
    // не в первое погружение, не посреди салок и не пока что-то делаешь
    if(G.t <= 0){ if(save.dive.n >= 2 && D.mode === 'swim' && !['warn', 'hunt', 'sniff'].includes(D.sh.st)) dvGloomCome(); else G.t = 6; }
  } else if(G.st === 'warn'){
    mv(DV_LEN + 1, -9, DV_GLOOM_V[0]);
    if(G.t <= 0){ G.st = 'prowl'; G.t = DV_GLOOM_LONG; }
  } else if(G.st === 'prowl'){
    mv(G.x - 4, Math.max(dvFloor(G.x) + 1.6, Math.min(-1.8, -6 + Math.sin(G.t*0.45)*3.5)), DV_GLOOM_V[0]);
    const w = dvWho(G.x, G.y), d = Math.hypot(w.pos.x - G.x, w.pos.y - G.y);
    if(!w.hid && !w.safe && d < DV_GLOOM_SEE){
      G.st = 'chase'; G.ch = 0; G.who = w.k; sfx.gloomSee();
      floatText('!', dvW(new V3(G.x, G.y + 1.8, 0)), '#FFD23F');
      if(w.k === 'me') mgHint(L('Мгла тебя заметила! Плыви и прячься! 🌿', 'The Gloom has seen you! Swim and hide! 🌿'));
    }
    if(G.x < -3 || G.t <= 0) dvGloomLeave(false);
  } else if(G.st === 'chase'){
    G.ch += dt;
    const w = aim({k:G.who});
    if(w.hid || w.safe){ G.st = 'sniff'; G.t2 = 2.6; G.hs = w.hid; floatText('?', dvW(new V3(G.x, G.y + 1.8, 0)), '#FFD23F'); }
    else {
      const l = mv(w.pos.x, w.pos.y, DV_GLOOM_V[1]);
      if(l < 1.5) G.who === 'pal' ? dvGloomGrabPal() : dvGloomGrab();
      else if(G.ch > 8 || l > 12){ G.st = 'prowl'; if(G.who === 'me') mgHint(L('Оторвалась! Но Мгла ещё тут — спрячься 🌿', 'You got away! But the Gloom is still here — hide 🌿')); }
    }
  } else if(G.st === 'sniff'){   // шарит у укрытия; вылезешь рядом — снова погонится
    G.t2 -= dt;
    const hs = G.hs; if(hs) mv(hs.x + (G.x < hs.x ? -1 : 1)*(hs.r + 1.3), hs.y() + Math.sin(now*2)*0.4, 1.2);
    const w = aim({k:G.who});
    if(!w.hid && !w.safe && Math.hypot(w.pos.x - G.x, w.pos.y - G.y) < DV_GLOOM_SEE*0.7){ G.st = 'chase'; G.ch = 0; sfx.gloomSee(); }
    else if(G.t2 <= 0){ G.st = 'prowl'; G.x -= 0.5; }
  } else if(G.st === 'leave'){
    mv(DV_LEN + 9, -10, 4.5);
    if(G.x > DV_LEN + 7.5){ G.st = 'off'; G.t = DV_GLOOM_T[1] + Math.random()*20; }
  }
  dvGloomPose(dt);
}
function dvGloomPose(dt){
  const G = DV.gl, o = G.o, u = o.userData;
  G.fade += ((G.st !== 'off' && G.x < DV_LEN + 5 ? 1 : 0) - G.fade)*Math.min(1, dt*1.4);
  o.visible = G.fade > 0.02;
  if(!o.visible) return;
  o.position.set(G.x, G.y + Math.sin(now*1.3)*0.25, 0.5);
  const hunt = G.st === 'chase';
  u.blobs.forEach(b => { const d = b.userData, k = 1 + Math.sin(now*(hunt ? 3.2 : 1.7) + d.ph)*0.12; b.scale.set(d.r*k, d.r*(2 - k), d.r); b.material.opacity = d.op*G.fade; });
  u.puff.material.opacity = 0.8*G.fade; u.puff.scale.setScalar(6.2 + Math.sin(now*1.1)*0.5);
  u.tents.forEach((p, i) => { p.rotation.z = Math.sin(now*(hunt ? 4 : 2) + p.userData.ph)*0.4 - G.dir*0.35; p.children[0].material.opacity = 0.8*G.fade; });
  u.eyes.position.x += (G.dir*0.5 - u.eyes.position.x)*Math.min(1, dt*3);
  const blink = (now*0.31 + 0.2) % 1 > 0.965 ? 0.12 : 1;
  u.eyes.scale.set(1, blink*(hunt ? 1.25 : 1), 1);
  u.glows.forEach(g => { g.material.opacity = (hunt ? 0.9 : 0.5 + Math.sin(now*2)*0.12)*G.fade; g.scale.setScalar(hunt ? 0.95 : 0.7); });
  // за Мглой тянется муть
  G.puffT -= dt;
  if(G.puffT < 0 && G.fade > 0.5){ G.puffT = 0.16; emit(INK_TEX, dvW(o.position).add(new V3((Math.random() - 0.5)*2, (Math.random() - 0.5)*1.4, -0.4)), {v:new V3(-G.dir*0.5, 0.25, 0), life:1.6, size:1.2, grow:1.2}); }
}
function dvGloomCome(){
  const G = DV.gl, S = DV.sh;
  G.st = 'warn'; G.t = 3.2; G.x = DV_LEN + 7; G.y = -10; G.dir = -1; G.caught = false; G.fade = 0;
  if(['warn', 'hunt', 'sniff'].includes(S.st)){   // даже акула боится Мглы — удирает
    S.st = 'leave'; S.t = 4; S.dir = -1;
    floatText(L('Ай! Мгла! 😱', 'Eek! The Gloom! 😱'), dvW(new V3(S.x, S.y + 1.2, 0)), '#3B3A4A');
    if(DV.pal) netSend({t:'dev', k:'sleave', f:0});
  }
  if(DV.pal) netSend({t:'dev', k:'gcome'});
  dvGloomFx(true);
}
function dvGloomLeave(caught){
  const G = DV.gl; if(G.st === 'leave' || G.st === 'off') return;
  G.st = 'leave'; G.caught = !!caught;
  if(DV.pal) netSend({t:'dev', k:'gleave', c:caught ? 1 : 0});
  dvGloomFx(false, caught);
}
function dvGloomFx(on, caught){   // что видно и слышно (у гостя по сети — по сигналам хозяина)
  const D = DV, sv = save.dive.gloom;
  if(on){
    sv.met++; persist();
    sfx.gloom(); document.body.classList.add('gloom-on'); dvRingsOn(true);
    mgHint(sv.met <= 1 ? L('🌑 Из грота выползает Мгла! Её боятся даже акулы. Скорее прячься — в водоросли, в щель между камнями или в кораблик!', '🌑 The Gloom is crawling out of the grotto! Even sharks are scared of it. Quick, hide — in the seaweed, between the rocks or in the boat!')
      : L('🌑 Мгла! Все прячутся — и ты прячься! 🌿', '🌑 The Gloom! Everyone hides — you hide too! 🌿'));
    if(D.ping){
      const P = D.ping; P.hold = false; P.big = false;
      P.hide = DV_HIDE.reduce((a, b) => Math.abs(b.x - P.pos.x) < Math.abs(a.x - P.pos.x) ? b : a);
      floatText(L('Ой-ой… Прячемся! 🐧', 'Uh-oh… Let\'s hide! 🐧'), dvW(P.pos).add(new V3(0, 0.9, 0)), '#3E8DB8');
    }
    return;
  }
  document.body.classList.remove('gloom-on');
  if(!['warn', 'hunt', 'sniff'].includes(D.sh.st)) dvRingsOn(false);
  if(D.ping) D.ping.hide = null;
  if(D.out) return;
  if(caught) mgHint(L('Мгла уползла в грот… Напарника выплюнуло наверх — сейчас вернётся 🫧', 'The Gloom crawled back into the grotto… Your partner was spat out to the surface — they will be back soon 🫧'));
  else { sv.hid++; persist(); mgHint(L('Уф… Мгла уползла обратно в грот. Не нашла! 🫧', 'Phew… The Gloom crawled back into the grotto. It didn\'t find you! 🫧')); }
  setTimeout(() => { if(DV && /🫧/.test(mgHintEl.textContent) && /Мгла|Gloom/.test(mgHintEl.textContent)) mgHint(''); }, 4000);
}
async function dvGloomGrab(){   // Мгла поймала меня: темно — и наверх (одна — домой, вдвоём — к началу бухты)
  const D = DV; if(!D || D.out) return;
  D.out = true; D.pause = true; D.hold = false; D.tgt = null; D.goal = null; D.vel.set(0, 0, 0); D.grab = false; D.bigOn = false;
  save.dive.gloom.out++; persist();
  sfx.gloomGrab(); mgHint('');
  const ink = mgNode('div', 'dv-ink', `<p class="display">${L('Ам!', 'Gulp!')}</p>`);
  setTimeout(() => ink.classList.add('on'), 30);
  if(D.auth) dvGloomLeave(true);
  await wait(1.6); if(DV !== D) return;
  ink.querySelector('p').textContent = L('Мгла выплюнула тебя наверх!', 'The Gloom spat you out to the surface!');
  if(!D.pal0){ await wait(1.2); if(DV === D) D.quit('gloom'); return; }
  D.pos.set(1.6, -1.2, 0); D.cx = 1.6; D.cy = -4; D.s.inner.rotation.x = 0;
  await wait(1); ink.classList.remove('on'); await wait(0.5); ink.remove();
  if(DV !== D) return;
  D.out = false; D.pause = false; D.safeT = 3;
  mgHint(L('Брр! Тебя выплюнуло наверх. Ныряй обратно к напарнику 🫧', 'Brr! You were spat out to the surface. Dive back to your partner 🫧'));
}
function dvGloomGrabPal(){   // по сети Мгла поймала напарника
  const P = DV.pal, at = dvW(P.pos).add(new V3(0, 1, 0));
  sfx.gloomGrab(); burst(INK_TEX, at, 10, 1.6, 0.8);
  floatText(L(`Ой! Мгла поймала: ${P.name}`, `Oh no! The Gloom got ${P.name}`), at, '#3B3A4A');
  P.safe = true;
  netSend({t:'dev', k:'gout'});
  dvGloomLeave(true);
}

/* ---------- 🦪 большая раковина: открывается только вдвоём (по сети или с Пингом) ---------- */
function dvBigMake(){
  const x = DV_BIG_X, g = new THREE.Group(); g.position.set(x, dvFloor(x) + 0.25, 1.2); DV.grp.add(g);
  const shm = toon(0xF0B6CC);
  const bot = addOutline(new THREE.Mesh(new THREE.SphereGeometry(1, 24, 10, 0, Math.PI*2, Math.PI/2, Math.PI/2), shm), 1.05); bot.scale.set(1.25, 0.5, 1.0); g.add(bot);
  const inside = new THREE.Mesh(new THREE.CircleGeometry(1, 24), toon(0xFBE6F0)); inside.rotation.x = -Math.PI/2; inside.scale.set(1.15, 0.9, 1); inside.position.y = 0.005; g.add(inside);
  const hinge = new THREE.Group(); hinge.position.set(0, 0, -0.9); g.add(hinge);
  const top = addOutline(new THREE.Mesh(new THREE.SphereGeometry(1, 24, 10, 0, Math.PI*2, 0, Math.PI/2), shm), 1.05); top.scale.set(1.25, 0.55, 1.0); top.position.z = 0.9; hinge.add(top);
  for(let j = -3; j <= 3; j++){ const r = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.45, 1.5), toon(0xDA8FB0)); r.position.set(j*0.33, 0.22, 0.9); r.rotation.z = -j*0.22; hinge.add(r); }
  const pearl = new THREE.Mesh(SMALL, new THREE.MeshBasicMaterial({color:0xFFF4FA})); pearl.scale.setScalar(0.3); pearl.position.y = 0.3; g.add(addOutline(pearl, 1.1));
  const gl = new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX, color:0xFFE0F0, transparent:true, depthWrite:false})); gl.scale.setScalar(3); gl.position.y = 0.4; g.add(gl);
  const icon = new THREE.Sprite(new THREE.SpriteMaterial({map:bubbleTex('🤝'), transparent:true, depthWrite:false})); icon.scale.setScalar(0.95); icon.position.set(0, 1.7, 0); g.add(icon);
  DV.bigC = {g, hinge, pearl, gl, icon, open:false, got:save.dive.big === dvToday()};
  dvTap({k:'big', r:1.3, p:() => g.position.clone().add(new V3(0, 0.5, 0)), go:dvBigTap});
}
function dvBigTap(){
  const D = DV, c = D.bigC, at = dvW(c.g.position).add(new V3(0, 1.6, 0));
  if(c.open) return floatText(L('Открыта! ✨', 'It is open! ✨'), at, '#D9527E');
  if(c.got && !D.pal0) return floatText(L('Большая жемчужина сегодня уже твоя. Завтра вырастет новая 🦪', 'The big pearl is already yours today. A new one grows by tomorrow 🦪'), at, '#6B6A7E');
  D.bigOn = true; sfx.lever();
  floatText(L('Тяжёлая! 💪', 'So heavy! 💪'), at, '#3B3A4A');
  if(D.ping && !D.ping.hide){ D.ping.big = true; D.ping.hold = false; floatText(L('Помогу! 🐧', 'I\'ll help! 🐧'), dvW(D.ping.pos).add(new V3(0, 0.9, 0)), '#3E8DB8'); }
  else if(D.pal){ if(!D.pal.b) mgHint(L(`Позови: ${D.pal.name}! Большую раковину открывают вдвоём 🤝`, `Call ${D.pal.name}! The giant clam opens only with two 🤝`)); }
  else mgHint(L('Одной не открыть! Нужен напарник: сосед Пинг или папа по сети («Вместе» → 🤿) 🤝', 'Too heavy for one! You need a partner: Ping the neighbour, or Dad online (“Together” → 🤿) 🤝'));
}
function dvBigStep(dt){
  const D = DV, c = D.bigC; if(!c) return;
  c.icon.visible = !c.open; c.icon.position.y = 1.7 + Math.sin(now*2.2)*0.1;
  if(!c.open) c.gl.material.opacity = 0.4 + Math.sin(now*2.4)*0.25;
  const cp = c.g.position;
  if(D.bigOn && (D.pos.distanceTo(cp) > 3.2 || D.out)){ D.bigOn = false; if(D.ping) D.ping.big = false; }
  if(!c.open) c.hinge.rotation.x = D.bigOn || (D.pal && D.pal.b) ? -0.05 - Math.abs(Math.sin(now*9))*0.05 : 0;   // пытаются приподнять
  if(c.open || !D.bigOn || (D.pal0 && !D.auth)) return;   // открывает хозяин комнаты
  const pingOk = D.ping && D.ping.big && D.ping.pos.distanceTo(cp) < 2.6;
  const palOk = D.pal && D.pal.b && D.pal.pos.distanceTo(cp) < 3.4;
  if(pingOk || palOk){ if(D.pal) netSend({t:'dev', k:'bigo'}); dvBigOpen(); }
}
async function dvBigOpen(){
  const D = DV, c = D && D.bigC; if(!c || c.open) return;
  c.open = true; D.bigOn = false; if(D.ping) D.ping.big = false;
  const at = dvW(c.g.position).add(new V3(0, 1, 0));
  sfx.lever(); await tween(0.6, k => c.hinge.rotation.x = -0.95*ease.out(k)); if(DV !== D) return;
  sfx.hug(); burst(TEX.star, at, 16, 2.2, 0.3); burst(TEX.heart, at, 8, 1.8, 0.26);
  floatText(L('Вместе открыли! 🤝', 'Opened together! 🤝'), at.clone().add(new V3(0, 1, 0)), '#D9527E');
  const p0 = c.pearl.position.clone();
  await tween(0.7, k => { c.pearl.position.y = p0.y + Math.sin(k*Math.PI)*1.4 + k*0.4; c.pearl.scale.setScalar(0.3*(1 - k*0.5)); });
  if(DV !== D) return;
  c.pearl.visible = false; c.gl.visible = false;
  if(!c.got){
    c.got = true; save.dive.big = dvToday(); persist();
    sfx.coin(); addShells(DV_BIG, toScreen(at));
    floatText(L(`Большая жемчужина! +${DV_BIG} 🐚`, `A big pearl! +${DV_BIG} 🐚`), at, '#D9527E');
  } else floatText(L('Твоя сегодня уже есть — эта напарнику 💗', 'You already have yours today — this one is for your partner 💗'), at, '#6B6A7E');
}

/* ---------- 🌐 вдвоём по сети: напарник плывёт рядом, держимся за ласты ---------- */
function dvPalMake(pal){
  const s = coSealOf(pal && pal.coat ? pal : null), sc = STAGES[Math.min(SHINY, Math.max(0, (pal && pal.stage) | 0))].sc;
  s.root.scale.setScalar(sc); s.swimming = true; if(s.bubble) s.bubble.visible = false; scene.add(s.root);
  const name = (pal && pal.name) || L('Папа', 'Dad');
  const lbl = textSprite(name, '#3E8DB8'); lbl.scale.set(0.3 + name.length*0.17, 0.36, 1); DV.grp.add(lbl);
  DV.pal = {s, sc, name, lbl, pos:new V3(0.2, -3, 0), tgt:new V3(0.2, -3, 0), v:new V3(), face:1, yaw:Math.PI/2, h:-1, hd:false, b:false, safe:false, at:now};
  dvTap({k:'pal', r:0.9, p:() => DV.pal ? DV.pal.pos.clone() : new V3(0, 99, 0), on:() => !!DV.pal && !DV.grab, go:() => {
    if(!DV.pal) return;
    DV.grab = true; DV.bigOn = false; sfx.purr();
    floatText(L('Держусь за ласту! 🤝', 'Holding the flipper! 🤝'), headTop(DV.s), '#D9527E');
    if(!tipSeen('diveGrab')){ tipDone('diveGrab'); mgHint(L('Держишься за ласту — плывёте вместе и быстрее! Коснись экрана — отпустишь 🤝', 'You are holding the flipper — you swim together and faster! Tap the screen to let go 🤝')); }
  }});
}
function dvLetGo(){ DV.grab = false; floatText('👋', headTop(DV.s), '#3E8DB8'); }
function dvPalStep(dt){
  const P = DV.pal; if(!P) return;
  const ahead = Math.min(0.25, now - P.at), want = P.tgt.clone().addScaledVector(P.v, ahead);
  P.pos.lerp(want, Math.min(1, dt*7));
  P.yaw += (P.face*Math.PI/2 - P.yaw)*Math.min(1, dt*5);
  const s = P.s, pitch = Math.max(-0.8, Math.min(0.8, Math.atan2(P.v.y, Math.abs(P.v.x) + 0.6)*0.8));
  s.root.position.copy(dvW(P.pos)).add(new V3(0, -0.72*P.sc, 0)); s.root.rotation.set(0, P.yaw, 0);
  s.inner.rotation.x += (-pitch - s.inner.rotation.x)*Math.min(1, dt*6);
  s.flap = 0.15 + Math.min(1, P.v.length()/DV_SPEED)*0.75;
  updateSeal(s, now, dt);
  P.lbl.position.set(P.pos.x, P.pos.y + 1.05, 0.3); P.lbl.visible = P.h < 0;   // спрятался — имени не видно
}
function dvNetSend(){
  const D = DV, h = dvHidden(), r = v => Math.round(v*100)/100;
  netSend({t:'dp', x:r(D.pos.x), y:r(D.pos.y), vx:r(D.vel.x), vy:r(D.vel.y), f:D.face, h:h ? DV_HIDE.indexOf(h) : -1,
    hd:D.grab ? 1 : 0, b:D.bigOn ? 1 : 0, s:D.pause || D.out || D.safeT > 0 ? 1 : 0});
  if(D.auth && D.pal){ const S = D.sh, G = D.gl;
    netSend({t:'dsh', s:{st:S.st, x:r(S.x), y:r(S.y), d:S.dir, v:S.o.visible ? 1 : 0}, g:{st:G.st, x:r(G.x), y:r(G.y), d:G.dir}}); }
}
function dvSharkMirror(dt){   // у гостя: акула там, где у хозяина
  const S = DV.sh, m = DV.net && DV.net.s;
  if(m){ S.st = m.st; S.o.visible = !!m.v; S.dir = m.d < 0 ? -1 : 1; const k = Math.min(1, dt*8); S.x += (m.x - S.x)*k; S.y += (m.y - S.y)*k; }
  dvSharkPose(dt);
}
function dvGloomMirror(dt){
  const G = DV.gl, m = DV.net && DV.net.g;
  if(m){ if(G.st === 'off' && m.st !== 'off'){ G.x = m.x; G.y = m.y; } G.st = m.st; G.dir = m.d < 0 ? -1 : 1; const k = Math.min(1, dt*8); G.x += (m.x - G.x)*k; G.y += (m.y - G.y)*k; }
  dvGloomPose(dt);
}
function dvNetWire(){
  netOn('dp', m => {
    const P = DV && DV.pal; if(!P) return;
    P.tgt.set(+m.x || 0, +m.y || 0, 0); P.v.set(+m.vx || 0, +m.vy || 0, 0); P.face = m.f < 0 ? -1 : 1;
    P.h = Number.isInteger(m.h) && DV_HIDE[m.h] ? m.h : -1; P.hd = !!m.hd; P.b = !!m.b; P.safe = !!m.s; P.at = now;
  });
  netOn('dsh', m => { if(DV && !DV.auth) DV.net = m; });
  netOn('dev', m => { if(DV) dvNetEv(m); });
  netOn('emo', () => { if(DV && DV.pal){ burst(TEX.heart, dvW(DV.pal.pos).add(new V3(0, 0.8, 0)), 8, 1.6, 0.3); sfx.purr(); } });
  netOn('dbye', dvPalBye);
  net.onLost = () => { if(DV && DV.pal) toast(L('Связь потерялась… Ждём напарника 🫧', 'Lost the connection… Waiting for your partner 🫧')); };
  net.onBack = () => { if(DV && DV.pal) toast(L('Напарник снова тут! 🫧', 'Your partner is back! 🫧')); };
}
function dvNetEv(m){
  const k = m.k;
  if(k === 'scome') dvSharkHi();
  else if(k === 'sleave'){ if(m.f){ save.dive.shark.hid++; persist(); } dvSharkBye(!!m.f); }
  else if(k === 'tag') dvTag(true);
  else if(k === 'gcome') dvGloomFx(true);
  else if(k === 'gleave') dvGloomFx(false, !!m.c);
  else if(k === 'gout') dvGloomGrab();
  else if(k === 'bigo') dvBigOpen();
}
function dvPalBye(){   // напарник уплыл домой: дальше ныряем одни, акула и Мгла — теперь мои
  const D = DV; if(!D || !D.pal) return;
  toast(L(`${D.pal.name} уплывает домой. Пока-пока! 👋`, `${D.pal.name} swims home. Bye-bye! 👋`), 3200);
  scene.remove(D.pal.s.root); D.grp.remove(D.pal.lbl); D.pal = null; D.grab = false;
  if(!D.auth){
    D.auth = true; D.net = null;
    if(dvGloomOn()) dvGloomLeave(false); else if(D.gl.st === 'off') D.gl.t = DV_GLOOM_T[1];
    if(D.sh.st === 'off') D.sh.t = DV_SHARK_T[1];
  }
}
function dvNetUi(){
  const b = mgNode('div', 'co-btns dv-btns', `<button class="round co-mic" aria-label="${L('Микрофон', 'Microphone')}">🎤</button>
    <button class="round co-heart" aria-label="${L('Сердечко напарнику', 'A heart for your partner')}">💗</button>`);
  gullMic(b.querySelector('.co-mic'));
  const hb = b.querySelector('.co-heart');
  mgOn(hb, 'pointerdown', e => e.stopPropagation());
  mgOn(hb, 'click', e => { e.stopPropagation(); if(!DV) return; burst(TEX.heart, headTop(DV.s), 8, 1.6, 0.3); sfx.purr(); netSend({t:'emo'}); });
}
async function dvNetIntro(){
  const n = DV.pal ? DV.pal.name : '';
  mgHint(L(`Ныряем вместе: ${n}! Коснись напарника — возьмёшься за ласту 🤝`, `Diving together with ${n}! Tap your partner to hold their flipper 🤝`));
  await wait(4.5); if(!DV) return;
  mgHint(L('В глубине у кораблика — большая раковина. Её открывают только вдвоём 🦪', 'By the boat in the deep there is a giant clam. Only two can open it 🦪'));
  await wait(4.5); if(DV && mgHintEl.textContent.includes('🦪')) mgHint('');
}
// из «Вместе» → 🤿 → «По сети» (js/coop.js, coopNet): ныряет свой тюлень, малыш ждёт в уголке
function diveNet(pal){ return petDive(null, {pal:pal || {}}); }
if(typeof CO_GAMES !== 'undefined') CO_GAMES.dive = {ic:'🤿', name:() => L('Нырнуть', 'Dive'),
  say:() => L('Ныряем вдвоём в подводную бухту! Держитесь за ласты, открывайте большую раковину — и прячьтесь от акулы и Мглы.', 'Dive into the underwater bay together! Hold flippers, open the giant clam — and hide from the shark and the Gloom.'),
  picks:() => `<button data-k="net" class="wide"><span class="ic">🌐</span><b>${L('По сети', 'Online')}</b><small>${L('с папой или другом', 'with Dad or a friend')}</small></button>
    <p class="got small-note">${L('Одной или с Пингом — у малыша: ⚽ → 🤿 Нырнуть', 'On your own or with Ping — from the pup: ⚽ → 🤿 Dive')}</p>`};
