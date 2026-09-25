/* ---------------- Мой иглу (Фаза 4, часть 1): домик малыша изнутри ----------------
   В уголке малыша кнопка 🏠 (или касание по иглу) — и мы внутри. Иглу «в разрезе», как кукольный домик:
   передней половины купола нет, камера смотрит спереди-сверху, пальцем можно чуть повернуть комнату.
   В комнате места под мебель (HOME_SLOTS): кровать, коврик, лампа, аквариум, окно, полка находок, картина.
   ➕ на пустом месте или «Обустроить» → выбор вещи: она сразу встаёт на место, купить — за ракушки.
   Малыш живёт в домике: сам бродит от вещи к вещи, а если нажать на вещь — поиграет с ней
   (поспит в кровати, покувыркается на коврике, посмотрит на рыбок…). Полка показывает находки с прогулок.
   Комната стоит далеко в стороне (HOME_POS), камера переносится туда за белой вспышкой.
   Подключается после walk.js (находки, waddleTo, hopTo) и до mail.js/game.js. */
const HOME_POS = new V3(200, 0, 0), HOME_R = 3.6, HOME_Y = 0.25;   // центр пола, радиус купола, высота пола
const homeRoot = new THREE.Group(); homeRoot.position.copy(HOME_POS); homeRoot.visible = false; scene.add(homeRoot);
const hp = (x, z, y = HOME_Y) => HOME_POS.clone().add(new V3(x, y, z));   // точка комнаты → мир
const HOME_SPOT = [-0.5, 1.75];   // где малыш стоит, когда ничего не делает (спереди, чтобы не заслонять мебель)
const FOG = scene.fog, HEMI = scene.children.find(o => o.isHemisphereLight);
// в домике камера смотрит сверху, а верх у всего освещён сильнее всего: чуть приглушаем свет, иначе пастель выгорает в белое
const HOME_LIGHT = {hemi:0.55, sun:0.5}, OUT_LIGHT = {hemi:HEMI.intensity, sun:sun.intensity};
function homeLights(inside){ const l = inside ? HOME_LIGHT : OUT_LIGHT; HEMI.intensity = l.hemi; sun.intensity = l.sun; }
if(!save.home) save.home = sanitizeHome(null);   // Pages мог отдать старый data.js из кеша

// floor: [x, z] и поворот; wall: [угол от задней стенки, высота-угол] на куполе; stand — где встаёт малыш, чтобы поиграть;
// mk — высота значка ➕/✏️ над вещью
const HOME_SLOTS = {
  bed:    {name:L('Кровать', 'Bed'),         floor:[-1.95, -0.95], rot:0.45, stand:[-0.75, -0.05], mk:1.25},
  rug:    {name:L('Коврик', 'Rug'),          floor:[0.15, 0.35],   rot:0,    stand:[0.15, 0.35],  mk:0.5},
  lamp:   {name:L('Лампа', 'Lamp'),          floor:[2.45, -1.3],   rot:-0.4, stand:[1.35, -0.45], mk:2.45},
  tank:   {name:L('Аквариум', 'Fish tank'),  floor:[2.35, 1.15],   rot:-0.6, stand:[1.0, 0.55],   mk:2.0},
  window: {name:L('Окно', 'Window'),         wall:[-0.62, 0.62], tilt:true, stand:[-0.85, -1.25]},
  shelf:  {name:L('Полка', 'Shelf'),         wall:[0.06, 0.3],               stand:[0.95, -1.65]},   // сбоку: малыш не заслоняет полку
  pic:    {name:L('Картина', 'Picture'),     wall:[0.66, 0.58], tilt:true,  stand:[1.05, -1.25]}
};
const SLOT_KEYS = Object.keys(HOME_SLOTS);
// мебель: price 0 — есть с самого начала. Товары домика лежат в save.owned, как покупки из лавки
const FURN = [
  {id:'bed_basic',   slot:'bed',    name:L('Лежанка', 'Cozy basket'),        price:0},
  {id:'bed_shell',   slot:'bed',    name:L('Кровать-ракушка', 'Seashell bed'), price:40},
  {id:'bed_cloud',   slot:'bed',    name:L('Кровать-облачко', 'Cloud bed'),    price:55},
  {id:'rug_heart',   slot:'rug',    name:L('Коврик-сердечко', 'Heart rug'),    price:15},
  {id:'rug_round',   slot:'rug',    name:L('Круглый коврик', 'Round rug'),     price:15},
  {id:'rug_fish',    slot:'rug',    name:L('Коврик-рыбка', 'Fish rug'),        price:25},
  {id:'lamp_star',   slot:'lamp',   name:L('Лампа-звёздочка', 'Star lamp'),    price:25},
  {id:'lamp_moon',   slot:'lamp',   name:L('Ночник-луна', 'Moon night-light'), price:30},
  {id:'lamp_jelly',  slot:'lamp',   name:L('Лампа-медуза', 'Jellyfish lamp'),  price:40},
  {id:'tank_bowl',   slot:'tank',   name:L('Круглый аквариум', 'Fish bowl'),   price:30},
  {id:'tank_big',    slot:'tank',   name:L('Большой аквариум', 'Big fish tank'), price:60},
  {id:'win_basic',   slot:'window', name:L('Окошко', 'Little window'),         price:0},
  {id:'win_curtain', slot:'window', name:L('Окно с занавесками', 'Curtained window'), price:20},
  {id:'win_heart',   slot:'window', name:L('Окно-сердечко', 'Heart window'),   price:35},
  {id:'shelf',       slot:'shelf',  name:L('Полка находок', 'Treasure shelf'), price:0},
  {id:'pic_photo',   slot:'pic',    name:L('Фото в рамке', 'Framed photo'),    price:10},
  {id:'pic_heart',   slot:'pic',    name:L('Рамка-сердечко', 'Heart frame'),   price:20}
];
const furn = id => FURN.find(x => x.id === id);
const homeHas = id => { const f = furn(id); return !!f && (!f.price || owns(id)); };

/* ---------- комната: пол, купол в разрезе, снежный бортик, снег вокруг ---------- */
const IGLOO_TEX = canvasTex(512, (g, w, h) => {   // ледяные кирпичики изнутри
  g.fillStyle = '#D2E5F3'; g.fillRect(0, 0, w, h);
  g.strokeStyle = '#98B9D6'; g.lineWidth = 5; g.lineCap = 'round';
  const rows = 6, n = 8;
  for(let r = 0; r < rows; r++){
    const y = r*h/rows; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
    for(let i = 0; i < n; i++){ const x = (r % 2 ? w/n/2 : 0) + i*w/n; g.beginPath(); g.moveTo(x, y + 7); g.lineTo(x, y + h/rows - 7); g.stroke(); }
  }
}, 256);
IGLOO_TEX.wrapS = THREE.RepeatWrapping; IGLOO_TEX.repeat.set(2, 1);
const FLOOR_TEX = canvasTex(512, (g, w) => {   // тёплый деревянный пол
  g.fillStyle = '#DDAE7A'; g.fillRect(0, 0, w, w);
  const pl = w/8;
  for(let i = 0; i < 8; i++){
    g.fillStyle = i % 2 ? '#D8A873' : '#E2B684'; g.fillRect(i*pl, 0, pl, w);
    g.fillStyle = '#A8784B'; g.fillRect(i*pl, 0, 3, w);
    const cut = ((i*173) % 5 + 1)*w/6; g.fillRect(i*pl, cut, pl, 3);
  }
});
{ const floorSide = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(HOME_R + 0.15, HOME_R + 0.3, 0.5, 64), toon(0xD6EAF5)), 1.02);
  floorSide.position.y = HOME_Y - 0.25; homeRoot.add(floorSide);
  const fm = toon(0xFFFFFF); fm.map = FLOOR_TEX;
  const floorTop = new THREE.Mesh(new THREE.CircleGeometry(HOME_R + 0.02, 64), fm); floorTop.rotation.x = -Math.PI/2; floorTop.position.y = HOME_Y + 0.002; homeRoot.add(floorTop);
  // задняя половина купола: видна изнутри (phi от π до 2π — это сторона z < 0)
  const wm = toon(0xFFFFFF); wm.map = IGLOO_TEX; wm.side = THREE.DoubleSide;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(HOME_R, 56, 24, Math.PI, Math.PI, 0, Math.PI/2), wm); dome.position.y = HOME_Y; homeRoot.add(dome);
  // край разреза — толстая снежная арка
  const arch = inkRing(new THREE.Mesh(new THREE.TorusGeometry(HOME_R, 0.14, 10, 72, Math.PI), toon(0xF4F9FD))); arch.position.y = HOME_Y; homeRoot.add(arch);
  // снег вокруг иглу и сугробы вдалеке
  const ground = new THREE.Mesh(new THREE.CircleGeometry(160, 48), toon(0xEAF4FA)); ground.rotation.x = -Math.PI/2; ground.position.y = -0.3; homeRoot.add(ground);
  for(const [x, z, s] of [[-7, -6, 2.4], [6.5, -7.5, 3], [-12, -14, 4], [12, -13, 3.6], [0, -16, 5], [-9, 2, 1.8], [9.5, 1.5, 2]]){
    const m = addOutline(new THREE.Mesh(SMALL, toon(0xF6FBFE)), 1.04); m.scale.set(s, s*0.45, s); m.position.set(x, -0.3, z); homeRoot.add(m);
  }
}

/* ---------- мебель: модели. Вещь смотрит на +z; у напольных начало — центр на полу, у настенных — середина ---------- */
// обводка для больших колец: такое же кольцо чуть толще, видно только изнанкой (addOutline раздувает радиус)
function inkRing(mesh){
  const p = mesh.geometry.parameters, o = new THREE.Mesh(new THREE.TorusGeometry(p.radius, p.tube + 0.035, p.radialSegments, p.tubularSegments, p.arc), outlineMat);
  mesh.add(o); return mesh;
}
function starShape(r = 0.5, k = 0.46){
  const s = new THREE.Shape();
  for(let i = 0; i < 10; i++){ const rr = i % 2 ? r*k : r, a = Math.PI/2 + i*Math.PI/5; i ? s.lineTo(Math.cos(a)*rr, Math.sin(a)*rr) : s.moveTo(Math.cos(a)*rr, Math.sin(a)*rr); }
  s.closePath(); return s;
}
const STAR_GEO = new THREE.ExtrudeGeometry(starShape(), {depth:0.14, bevelEnabled:true, bevelThickness:0.04, bevelSize:0.04, bevelSegments:2}).center();
const WOOD = 0xD99A5E, WOOD_L = 0xEDB77D;
function flat(shape, col, y, k = 1, basic = false){   // плоская фигура на полу (коврики)
  const m = new THREE.Mesh(new THREE.ShapeGeometry(shape, 24), basic ? new THREE.MeshBasicMaterial({color:col}) : toon(col));
  m.rotation.x = -Math.PI/2; m.position.y = y; m.scale.setScalar(k); return m;
}
function glow(col = 0xFFFFFF, size = 2){
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX, color:col, transparent:true, depthWrite:false}));
  sp.scale.setScalar(size); return sp;
}
function lampBase(h){
  const g = new THREE.Group();
  const base = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.4, 0.12, 24), toon(WOOD)), 1.08); base.position.y = 0.06; g.add(base);
  const pole = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, h, 10), toon(0xFFFDF8)), 1.25); pole.position.y = h/2; g.add(pole);
  return g;
}
// в окне — небо и падающий снег (текстура снега едет вниз в homeTick)
const WIN_SKY = canvasTex(128, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9FD4F0'); gr.addColorStop(0.7, '#DDF1FA'); gr.addColorStop(1, '#FFFFFF');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = '#FFFFFF'; g.beginPath(); g.ellipse(30, h, 60, 34, 0, 0, 7); g.ellipse(104, h, 50, 26, 0, 0, 7); g.fill();
});
const WIN_SNOW = canvasTex(128, g => {
  g.fillStyle = '#fff';
  for(let i = 0; i < 26; i++){ g.beginPath(); g.arc((i*53) % 128, (i*37 + (i % 3)*11) % 128, 2.5 + (i % 3), 0, 7); g.fill(); }
});
WIN_SNOW.wrapS = WIN_SNOW.wrapT = THREE.RepeatWrapping; WIN_SNOW.repeat.set(1.4, 1.4);
function snowPane(geo){
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({map:WIN_SNOW, transparent:true, depthWrite:false})); m.position.z = 0.012; return m;
}
function roundWindow(){
  const g = new THREE.Group();
  const circ = new THREE.CircleGeometry(0.6, 40);
  g.add(new THREE.Mesh(circ, new THREE.MeshBasicMaterial({map:WIN_SKY})), snowPane(circ));
  const fr = addOutline(new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.085, 10, 44), toon(WOOD_L)), 1.06); fr.position.z = 0.03; g.add(fr);
  for(const r of [0, Math.PI/2]){ const b = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.06, 0.05), toon(WOOD_L)); b.rotation.z = r; b.position.z = 0.03; g.add(b); }
  const sill = addOutline(new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 0.24), toon(WOOD_L)), 1.06); sill.position.set(0, -0.68, 0.1); g.add(sill);
  return g;
}
// фото малыша для картины: последнее фото из альбома («{имя} растёт»), вырезанное кругом или сердечком
function photoTex(heart){
  const tex = canvasTex(256, () => {});
  const draw = img => {
    const c = tex.image, g = c.getContext('2d'), s = c.width;
    g.clearRect(0, 0, s, s); g.save();
    if(heart){ heartPath(g, s*1.02, -s*0.01, s*0.02); g.clip(); }
    const gr = g.createLinearGradient(0, 0, 0, s); gr.addColorStop(0, '#C6E8F5'); gr.addColorStop(1, '#F2FAFD'); g.fillStyle = gr; g.fillRect(0, 0, s, s);
    if(img) g.drawImage(img, 0, 0, s, s);
    else { g.font = `${s*0.55}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🦭', s/2, s*0.55); }
    g.restore(); tex.needsUpdate = true;
  };
  draw(null);
  const ph = save.album.filter(a => a.pet).pop();
  if(ph){ const img = new Image(); img.onload = () => draw(img); img.src = ph.img; }
  return tex;
}
const FIND_TEX = {};
const findTex = ic => FIND_TEX[ic] || (FIND_TEX[ic] = emojiTex(ic));

const FURN_MAKE = {
  bed_basic(){   // плетёная корзинка с мятной подушкой
    const g = new THREE.Group(), w = toon(0xD9A66A);
    const base = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.98, 0.22, 40), w), 1.03); base.position.y = 0.11; g.add(base);
    const rim = addOutline(new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.2, 12, 44), w), 1.04); rim.rotation.x = Math.PI/2; rim.scale.z = 0.9; rim.position.y = 0.3; g.add(rim);
    for(let i = 0; i < 16; i++){ const a = i/16*Math.PI*2, st = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.34, 0.03), toon(0xC9975F)); st.position.set(Math.sin(a)*1.2, 0.26, Math.cos(a)*1.2); st.rotation.y = a; g.add(st); }
    const cush = addOutline(new THREE.Mesh(SPH, toon(0x8FD0B3)), 1.03); cush.scale.set(0.92, 0.15, 0.92); cush.position.y = 0.3; g.add(cush);
    g.scale.set(1, 1, 1.12); g.userData.top = 0.36; return g;
  },
  bed_shell(){   // ракушка-гребешок: розовый веер позади, матрасик, жемчужина
    const g = new THREE.Group(), pink = toon(0xFFC4D6);
    const base = addOutline(new THREE.Mesh(SPH, pink), 1.03); base.scale.set(1.15, 0.2, 1.2); base.position.y = 0.18; g.add(base);
    const mat = new THREE.Mesh(SPH, toon(0xFFF3F6)); mat.scale.set(1.0, 0.17, 1.05); mat.position.y = 0.26; g.add(mat);
    for(let i = 0; i < 7; i++){
      const piv = new THREE.Group(); piv.position.set(0, 0.25, -1.0); piv.rotation.set(-0.25, 0, (i/6 - 0.5)*2.3);
      const rib = addOutline(new THREE.Mesh(SPH, pink), 1.05); rib.scale.set(0.2, 0.82, 0.12); rib.position.y = 0.75; piv.add(rib); g.add(piv);
    }
    const pearl = addOutline(new THREE.Mesh(SMALL, toon(0xFFFFFF)), 1.1); pearl.scale.setScalar(0.2); pearl.position.set(0.8, 0.42, 0.72); g.add(pearl);
    g.userData.top = 0.38; return g;
  },
  bed_cloud(){   // облачко из пухлых шариков и две подушки-звёздочки
    const g = new THREE.Group(), m = toon(0xEEF6FF);
    for(let i = 0; i < 9; i++){ const a = i/9*Math.PI*2, p = addOutline(new THREE.Mesh(SMALL, m), 1.06); p.scale.set(0.5, 0.36, 0.5); p.position.set(Math.cos(a)*0.85, 0.28, Math.sin(a)*1.0); g.add(p); }
    const mid = new THREE.Mesh(SPH, m); mid.scale.set(0.95, 0.3, 1.1); mid.position.y = 0.3; g.add(mid);
    for(const [x, z] of [[-0.42, -0.8], [0.45, -0.85]]){ const st = addOutline(new THREE.Mesh(STAR_GEO, toon(0xFFD66B)), 1.08); st.scale.setScalar(0.55); st.position.set(x, 0.72, z); st.rotation.set(-0.4, 0, x*0.6); g.add(st); }
    g.userData.top = 0.45; return g;
  },
  rug_heart(){
    const g = new THREE.Group();
    g.add(flat(heartShape(), INK, 0.004, 2.75, true), flat(heartShape(), 0xFF9BB8, 0.008, 2.6), flat(heartShape(), 0xFFFDF8, 0.012, 1.75), flat(heartShape(), 0xFFB8CB, 0.016, 1.45));
    g.children.forEach(m => m.position.z = 0.1);
    return g;
  },
  rug_round(){   // круглый полосатый
    const g = new THREE.Group();
    const tex = canvasTex(256, (c, s) => {
      ['#FFD66B', '#FFFDF8', '#86DDB5', '#FFFDF8', '#9BD3F0', '#FFFDF8', '#FF9BB8'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(s/2, s/2, s/2*(1 - i*0.14), 0, 7); c.fill(); });
    });
    const edge = new THREE.Mesh(new THREE.CircleGeometry(1.42, 48), inkMat); edge.rotation.x = -Math.PI/2; edge.position.y = 0.004; g.add(edge);
    const top = new THREE.Mesh(new THREE.CircleGeometry(1.36, 48), toon(0xFFFFFF)); top.material.map = tex; top.rotation.x = -Math.PI/2; top.position.y = 0.01; g.add(top);
    return g;
  },
  rug_fish(){   // голубая рыбка: тело-овал, хвостик, глазик и улыбка
    const g = new THREE.Group();
    const body = new THREE.Shape(); body.absellipse(0, 0, 1.15, 0.72, 0, Math.PI*2);
    const tail = new THREE.Shape(); tail.moveTo(-0.95, 0); tail.lineTo(-1.75, 0.62); tail.quadraticCurveTo(-1.55, 0, -1.75, -0.62); tail.closePath();
    for(const [sh, col, y, k, b] of [[body, INK, 0.004, 1.06, true], [tail, INK, 0.004, 1.06, true], [body, 0x9BD3F0, 0.01, 1, false], [tail, 0x7FB8F0, 0.01, 1, false]]){ const m = flat(sh, col, y, k, b); m.position.x = 0.3; g.add(m); }
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), inkMat); eye.rotation.x = -Math.PI/2; eye.position.set(1.0, 0.02, -0.18); g.add(eye);
    for(let i = 0; i < 3; i++){ const sc = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16, 0, Math.PI), new THREE.MeshBasicMaterial({color:0xFFFDF8})); sc.rotation.set(-Math.PI/2, 0, Math.PI/2); sc.position.set(0.1 - i*0.36, 0.016, 0.1*(i % 2)); g.add(sc); }
    g.rotation.y = 0.2; return g;
  },
  lamp_star(){
    const g = lampBase(1.6);
    const star = addOutline(new THREE.Mesh(STAR_GEO, new THREE.MeshBasicMaterial({color:0xFFE07A})), 1.07); star.scale.setScalar(1.05); star.position.y = 1.85; g.add(star);
    const gl = glow(0xFFF2B8, 2.4); gl.position.set(0, 1.85, 0.2); g.add(gl);
    g.userData = {bulb:star.material, on:0xFFE07A, off:0xE8D9A8, glow:gl, spin:star};
    return g;
  },
  lamp_moon(){   // сонная луна на ножке
    const g = lampBase(0.95);
    const moon = addOutline(new THREE.Mesh(SMALL, new THREE.MeshBasicMaterial({color:0xFFF1A8})), 1.06); moon.scale.setScalar(0.5); moon.position.y = 1.45; g.add(moon);
    const arc = new THREE.TorusGeometry(0.08, 0.018, 8, 16, Math.PI);
    for(const s of [-1, 1]){ const e = new THREE.Mesh(arc, inkMat); e.position.set(0.17*s, 1.5, 0.48); e.rotation.z = Math.PI; g.add(e);
      const bl = new THREE.Mesh(new THREE.CircleGeometry(0.07, 14), new THREE.MeshBasicMaterial({color:0xFFB3C8})); bl.position.set(0.28*s, 1.38, 0.43); bl.rotation.y = 0.5*s; g.add(bl); }
    const zz = addOutline(new THREE.Mesh(STAR_GEO, new THREE.MeshBasicMaterial({color:0xFFD66B})), 1.1); zz.scale.setScalar(0.3); zz.position.set(0.55, 1.95, 0.1); g.add(zz);
    const gl = glow(0xFFF6C8, 2.2); gl.position.set(0, 1.45, 0.25); g.add(gl);
    g.userData = {bulb:moon.material, on:0xFFF1A8, off:0xE3DDB8, glow:gl, spin:zz};
    return g;
  },
  lamp_jelly(){   // медуза: светящийся купол и мягкие щупальца
    const g = lampBase(1.25);
    const jm = new THREE.MeshBasicMaterial({color:0xFFB3D1});
    const dome = addOutline(new THREE.Mesh(new THREE.SphereGeometry(0.55, 28, 14, 0, Math.PI*2, 0, Math.PI/2), jm), 1.05); dome.scale.y = 0.85; dome.position.y = 1.55; g.add(dome);
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.5, 0.08, 28), jm); skirt.position.y = 1.53; g.add(skirt);
    for(const s of [-1, 1]){ const e = new THREE.Mesh(SMALL, inkMat); e.scale.set(0.04, 0.05, 0.03); e.position.set(0.16*s, 1.72, 0.44); g.add(e); }
    const tents = [];
    for(let i = 0; i < 6; i++){
      const a = i/6*Math.PI*2 + 0.3, piv = new THREE.Group(); piv.position.set(Math.cos(a)*0.38, 1.5, Math.sin(a)*0.38);
      const pts = []; for(let j = 0; j <= 5; j++) pts.push(new V3(Math.sin(j*1.3 + i)*0.06, -j*0.1, 0));
      const tb = addOutline(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.022, 6), toon(0xFFD0E2)), 1.25);
      piv.add(tb); piv.userData.ph = i; g.add(piv); tents.push(piv);
    }
    const gl = glow(0xFFC8E0, 2.4); gl.position.set(0, 1.6, 0.25); g.add(gl);
    g.userData = {bulb:jm, on:0xFFB3D1, off:0xE6C9D6, glow:gl, tents};
    return g;
  },
  tank_bowl(){   // круглый аквариум на тумбочке, две рыбки плавают по кругу
    const g = new THREE.Group();
    const st = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.52, 0.8, 24), toon(WOOD_L)), 1.05); st.position.y = 0.4; g.add(st);
    const c = new V3(0, 1.38, 0);
    const water = new THREE.Mesh(new THREE.SphereGeometry(0.58, 28, 16, 0, Math.PI*2, 0.95, Math.PI - 0.95), new THREE.MeshBasicMaterial({color:0x8FD3F0, transparent:true, opacity:0.55, depthWrite:false}));
    water.position.copy(c); water.renderOrder = 1; g.add(water);
    const surf = new THREE.Mesh(new THREE.CircleGeometry(Math.sin(0.95)*0.58, 28), water.material); surf.rotation.x = -Math.PI/2; surf.position.set(0, c.y + Math.cos(0.95)*0.58, 0); surf.renderOrder = 1; g.add(surf);
    const glass = new THREE.Mesh(new THREE.SphereGeometry(0.64, 28, 16, 0, Math.PI*2, 0.55, Math.PI - 0.55), new THREE.MeshBasicMaterial({color:0xE6F7FF, transparent:true, opacity:0.3, depthWrite:false, side:THREE.DoubleSide}));
    glass.position.copy(c); glass.renderOrder = 2; g.add(glass);
    const rim = addOutline(new THREE.Mesh(new THREE.TorusGeometry(Math.sin(0.55)*0.64, 0.035, 8, 28), toon(0xFFFFFF)), 1.15); rim.rotation.x = Math.PI/2; rim.position.set(0, c.y + Math.cos(0.55)*0.64, 0); g.add(rim);
    for(const [x, col] of [[-0.2, 0xFF9BB8], [0.1, 0xFFD66B], [0.25, 0x86DDB5]]){ const p = new THREE.Mesh(SMALL, toon(col)); p.scale.set(0.09, 0.06, 0.09); p.position.set(x, c.y - 0.5, x*0.5); g.add(p); }
    // спасённые в забеге рыбки (в круглом помещаются TANK_CAP.tank_bowl), пока их нет — две обычные
    const mine = tankFish('tank_bowl'), n = mine.length || 2;
    const fish = Array.from({length:n}, (_, i) => { const f = mine[i] ? makeRunFish(mine[i]) : makeFish(); f.scale.setScalar(0.5); g.add(f); f.userData = {a:i*Math.PI*2/n, r:0.24 + (i % 2)*0.06, y:c.y - 0.12 + i*0.1, sp:1 + i*0.25}; return f; });
    g.userData = {fish, nf:mine.length, bubbleAt:c.clone().add(new V3(0, 0.3, 0))};
    return g;
  },
  tank_big(){   // большой аквариум: песок, водоросли, три рыбки туда-сюда, пузырьки
    const g = new THREE.Group(), W = 1.7, H = 1.05, D = 0.8, y0 = 0.72;
    const st = addOutline(new THREE.Mesh(new THREE.BoxGeometry(W + 0.1, y0, D + 0.1), toon(WOOD)), 1.03); st.position.y = y0/2; g.add(st);
    const sand = new THREE.Mesh(new THREE.BoxGeometry(W - 0.04, 0.14, D - 0.04), toon(0xFFE3A3)); sand.position.y = y0 + 0.07; g.add(sand);
    const weeds = [];
    for(const [x, z, h] of [[-0.6, -0.2, 0.75], [-0.45, 0.1, 0.5], [0.55, -0.15, 0.65]]){
      const piv = new THREE.Group(); piv.position.set(x, y0 + 0.12, z);
      const w = addOutline(new THREE.Mesh(SPH, toon(0x7FD1A8)), 1.12); w.scale.set(0.07, h/2, 0.05); w.position.y = h/2; piv.add(w); g.add(piv); weeds.push(piv);
    }
    const water = new THREE.Mesh(new THREE.BoxGeometry(W - 0.04, H - 0.18, D - 0.04), new THREE.MeshBasicMaterial({color:0x7FCBEA, transparent:true, opacity:0.3, depthWrite:false}));
    water.position.y = y0 + (H - 0.18)/2; water.renderOrder = 1; g.add(water);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), new THREE.MeshBasicMaterial({color:0xE6F7FF, transparent:true, opacity:0.22, depthWrite:false}));
    glass.position.y = y0 + H/2; glass.renderOrder = 2; g.add(glass);
    const fm = toon(WOOD_L);   // рамка: верх и уголки
    const top = addOutline(new THREE.Mesh(new THREE.BoxGeometry(W + 0.08, 0.07, D + 0.08), fm), 1.04); top.position.y = y0 + H; g.add(top);
    for(const sx of [-1, 1]) for(const sz of [-1, 1]){ const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, H, 0.06), fm); p.position.set(sx*W/2, y0 + H/2, sz*D/2); g.add(p); }
    const mine = tankFish('tank_big'), n = mine.length || 3;
    const fish = Array.from({length:n}, (_, i) => { const f = mine[i] ? makeRunFish(mine[i]) : makeFish(); f.scale.setScalar(0.48); g.add(f); f.userData = {ph:i*2.1, y:y0 + 0.3 + (i % 4)*0.17, z:-0.24 + (i % 3)*0.2, sp:0.5 + (i % 3)*0.2, w:W/2 - 0.3}; return f; });
    g.userData = {fish, nf:mine.length, weeds, box:true, bubbleAt:new V3(0.3, y0 + 0.2, 0.1)};
    return g;
  },
  win_basic(){ return roundWindow(); },
  win_curtain(){   // то же окошко, а по бокам — розовые занавески на карнизе
    const g = roundWindow();
    const rod = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.8, 8), toon(WOOD)), 1.2); rod.rotation.z = Math.PI/2; rod.position.set(0, 0.82, 0.14); g.add(rod);
    for(const s of [-1, 1]){
      const c = addOutline(new THREE.Mesh(SPH, toon(0xFFB8CB)), 1.05); c.scale.set(0.26, 0.8, 0.07); c.position.set(0.72*s, 0.1, 0.14); c.rotation.z = 0.12*s; g.add(c);
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 16), toon(0xFFFDF8)); tie.position.set(0.7*s, -0.1, 0.2); tie.scale.set(1.4, 0.5, 1); g.add(tie);
    }
    return g;
  },
  win_heart(){
    const g = new THREE.Group();
    const hs = new THREE.ShapeGeometry(heartShape(0.95), 24);
    const sky = new THREE.Mesh(hs, new THREE.MeshBasicMaterial({color:0xBFE6F5})); sky.scale.setScalar(1.3); g.add(sky);
    const sn = snowPane(hs); sn.scale.setScalar(1.3); g.add(sn);
    const fr = addOutline(new THREE.Mesh(HEART_RING, toon(0xFF9BB8)), 1.05); fr.scale.set(1.45, 1.45, 0.6); fr.position.z = 0.03; g.add(fr);
    return g;
  },
  shelf(){   // две полочки; находки с прогулок встают на них (homeShelf)
    const g = new THREE.Group(), w = toon(WOOD);
    for(const y of [-0.34, 0.36]){
      const pl = addOutline(new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.08, 0.38), w), 1.05); pl.position.set(0, y, 0.2); g.add(pl);
      for(const x of [-0.7, 0.7]){ const br = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.2, 0.28), toon(WOOD_L)); br.position.set(x, y - 0.14, 0.14); g.add(br); }
    }
    const finds = new THREE.Group(); g.add(finds);
    g.userData = {finds, shelf:true};
    return g;
  },
  pic_photo(){
    const g = new THREE.Group();
    const fr = addOutline(new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 0.08), toon(WOOD_L)), 1.05); g.add(fr);
    const ph = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), new THREE.MeshBasicMaterial({map:photoTex(false)})); ph.position.z = 0.045; g.add(ph);
    const hrt = addOutline(new THREE.Mesh(HEART_GEO, toon(0xFF6F95)), 1.1); hrt.scale.setScalar(0.22); hrt.position.set(0.42, 0.42, 0.08); g.add(hrt);
    return g;
  },
  pic_heart(){
    const g = new THREE.Group();
    const ph = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({map:photoTex(true), transparent:true})); ph.position.y = 0.03; g.add(ph);
    const fr = addOutline(new THREE.Mesh(HEART_RING, toon(0xFF9BB8)), 1.05); fr.scale.set(1.5, 1.5, 0.6); fr.position.z = 0.03; g.add(fr);
    return g;
  }
};

/* ---------- места и то, что на них стоит ---------- */
function slotPlace(k, o){
  const sl = HOME_SLOTS[k];
  if(sl.floor){ o.position.set(sl.floor[0], HOME_Y, sl.floor[1]); o.rotation.y = sl.rot + (o.rotation.y || 0); return; }
  const [a, e] = sl.wall, r = HOME_R*0.955;
  o.position.set(Math.sin(a)*Math.cos(e)*r, HOME_Y + Math.sin(e)*r, -Math.cos(a)*Math.cos(e)*r);
  o.rotation.set(sl.tilt ? e : 0, -a, 0, 'YXZ');   // лицом к середине комнаты; окно и картина наклонены вместе со стеной купола
}
const homeItems = {};   // слот → 3D-вещь, которая сейчас стоит
function homeSet(k, id){
  const old = homeItems[k];
  if(old && old.userData.id === id) return old;
  if(old){ homeRoot.remove(old); homeItems[k] = null; }
  if(!id || !FURN_MAKE[id]) return null;
  const o = FURN_MAKE[id](); o.userData.id = id; o.userData.slot = k;
  slotPlace(k, o); homeRoot.add(o); homeItems[k] = o;
  if(o.userData.shelf) homeShelf(o);
  if(o.userData.bulb) lampSet(o, homeLight);
  return o;
}
function homeBuild(){
  for(const k of SLOT_KEYS){
    const id = save.home.s[k], o = homeItems[k];
    const newFish = o && o.userData.nf !== undefined && o.userData.nf !== tankFish(id).length;   // в забеге спасли новых рыбок — аквариум заново
    if(o && (o.userData.id !== id || /^pic_/.test(id) || newFish)){ homeRoot.remove(o); homeItems[k] = null; }   // картину — заново: вдруг в альбоме новое фото
    homeSet(k, homeHas(id) ? id : null);
    if(homeItems[k] && homeItems[k].userData.shelf) homeShelf(homeItems[k]);
  }
}
// находки с прогулок и кубки приключений на полке: по пять на полочку
function homeShelf(o){
  const g = o.userData.finds; while(g.children.length) g.remove(g.children[0]);
  const list = TREASURES.filter(t => save.pet && save.pet.finds.includes(t.id)).map(t => t.ic).concat((save.adv ? save.adv.cups : []).map(() => '🏆'));
  list.slice(0, 10).forEach((ic, i) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:findTex(ic), transparent:true, depthWrite:false}));
    sp.scale.setScalar(0.4); sp.position.set(-0.68 + (i % 5)*0.34, (i < 5 ? 0.36 : -0.34) + 0.24, 0.22); g.add(sp);
  });
}
// где у места «середина» (для камеры и значков)
function slotWorld(k){
  const sl = HOME_SLOTS[k], o = homeItems[k];
  if(o) return o.getWorldPosition(new V3()).add(new V3(0, sl.floor ? Math.min(sl.mk, 1.2)*0.6 : 0, 0));
  const t = new THREE.Object3D(); slotPlace(k, t); return t.position.clone().add(HOME_POS);
}
// значки: ➕ на пустом месте, ✏️ над вещью в режиме «Обустроить»
function markTex(kind){
  return canvasTex(128, (g, s) => {
    g.beginPath(); g.arc(s/2, s/2, s/2 - 8, 0, 7);
    g.fillStyle = kind === 'plus' ? 'rgba(255,253,248,.92)' : '#FF9BB8'; g.fill();
    g.lineWidth = 7; g.strokeStyle = kind === 'plus' ? '#D9527E' : '#3B3A4A'; if(kind === 'plus') g.setLineDash([14, 9]); g.stroke(); g.setLineDash([]);
    if(kind === 'plus'){ g.fillStyle = '#D9527E'; g.fillRect(s/2 - 7, s/2 - 30, 14, 60); g.fillRect(s/2 - 30, s/2 - 7, 60, 14); }
    else { g.font = '60px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('✏️', s/2, s/2 + 4); }
  });
}
const MARK_TEX = {plus:markTex('plus'), edit:markTex('edit')};
const homeMarks = {};
for(const k of SLOT_KEYS){
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:MARK_TEX.plus, transparent:true, depthWrite:false, depthTest:false}));
  sp.renderOrder = 8; sp.scale.setScalar(0.62); sp.visible = false; homeRoot.add(sp); homeMarks[k] = sp;
}
function markPos(k){
  const sl = HOME_SLOTS[k];
  if(sl.floor) return new V3(sl.floor[0], HOME_Y + (homeItems[k] ? sl.mk : 0.45), sl.floor[1]);
  const t = new THREE.Object3D(); slotPlace(k, t); return t.position.multiplyScalar(0.86).setY(t.position.y);
}

/* ---------- вход, выход, камера ---------- */
let homeEdit = false, homeLight = true, homeIdleT = 12, homeDrag = null;
function homeView(instant){
  const portrait = innerWidth < innerHeight, c = hp(0.2, -0.3, 0.6), size = portrait ? 6.2 : 7.4, lift = portrait ? -1.2 : -0.2;
  if(!instant) return camGlide(c, size, 0.6, lift, 0.5);
  focusCam(c, size, lift, 0.5); camFocus.k = 1;
}
function flash(){   // белая вспышка: пока она на экране, камера переезжает
  const f = $('#fade'); f.style.transition = 'none'; f.classList.add('on'); void f.offsetWidth; f.style.transition = ''; f.classList.remove('on');
}
function homeHouseHit(e){
  const h = petCorner.userData.house; if(!h) return false;
  const rect = canvas.getBoundingClientRect();
  ndc.set((e.clientX - rect.left)/rect.width*2 - 1, -((e.clientY - rect.top)/rect.height)*2 + 1);
  ray.setFromCamera(ndc, camera);
  return ray.intersectObject(h, true).length > 0;
}
async function homeEnter(){
  if(homeMode || !petMode || !petSeal || !save.pet) return;
  if(busy || !mgRoot.hidden) return toast(L('Сначала закончи то, что начала 🙂', 'Finish what you started first 🙂'));
  sfx.tap(); setBusy(true);
  const s = petSeal;
  if(s.sleeping) await petWake();
  // малыш бежит к двери своего иглу
  const door = PET_POS.clone().add(new V3(-1.3, 0.25, -0.9));
  await waddleTo(s, door, 0.7);
  sfx.whoosh(); flash();
  homeMode = true; document.body.classList.add('home-mode'); homeRoot.visible = true;
  scene.fog = null; snow.visible = false; homeLights(true); homeEdit = false; homeLight = true;
  homeBuild(); homeUi();
  s.bubble.visible = false; s.root.position.copy(hp(0, HOME_R + 0.5)); s.root.rotation.set(0, Math.PI, 0);
  camOff.copy(HOME_POS); camOffWant.copy(HOME_POS); camFocus.yaw = 0; homeView(true);
  renderPetBtn(); petRefresh();
  await wait(0.35);
  await waddleTo(s, hp(HOME_SPOT[0], HOME_SPOT[1]), 1.0);
  await turnTo(s, 0, 0.3);
  sfx.arf(); s.happyUntil = now + 3; setMood(s, 'happy');
  floatText(L('Мой домик!', 'My home!'), headTop(s), '#D9527E'); hop(s, 0.3, 0.4);
  const first = !save.home.v; save.home.v = true; persist();
  toast(first ? L(`${save.pet.name}: «Это мой домик!» Нажимай на вещи — ${gg('он', 'она')} поиграет с ними. ➕ — место для новой мебели`, `${save.pet.name}: “This is my home!” Tap things — ${gg('he', 'she')} will play with them. ➕ is a spot for new furniture`)
    : L(`${save.pet.name} дома ♡`, `${save.pet.name} is home ♡`), first ? 5200 : 2200);
  homeIdleT = 12; setBusy(false);
}
// выйти из домика (сразу, без анимации): малыш снова на своей льдине, камера — над уголком
function homeExit(){
  if(!homeMode) return;
  flash();
  homeMode = false; homeEdit = false; homeDrag = null; document.body.classList.remove('home-mode'); homeRoot.visible = false;
  scene.fog = FOG; snow.visible = true; homeLights(false); $('#homeDim').classList.remove('on');
  camFocus.yaw = 0; camFocus.want = 0; camFocus.k = 0;
  const v = PET_POS.clone().add(petView()); camOff.copy(v); camOffWant.copy(v);
  const s = petSeal; if(s){ s.root.position.copy(PET_SPOT); s.root.rotation.set(0, 0, 0); s.inner.position.set(0, 0, 0); s.inner.rotation.set(0, 0, 0); }
  renderPetBtn(); petRefresh();
}
function homeLeave(){
  if(!homeMode) return;
  if(busy || !mgRoot.hidden) return toast(L('Сначала закончи то, что начала 🙂', 'Finish what you started first 🙂'));
  sfx.whoosh(); homeExit();
  floatText(L('Гулять!', 'Outside!'), headTop(petSeal)); hop(petSeal, 0.3, 0.4);
}
function renderHomeBtn(){
  const b = $('#btnHome'); if(!b) return;
  b.hidden = !save.pet || !petMode;
  $('#homeIc').textContent = homeMode ? '🚪' : '🏠';
  b.setAttribute('aria-label', homeMode ? L('Выйти из домика', 'Leave the home') : L('Мой домик', 'My home'));
  $('#homeAlert').hidden = homeMode || !save.pet || save.home.v;
}
function homeUi(){
  if(!save.pet) return;
  const name = save.pet.name, n = SLOT_KEYS.filter(k => homeItems[k]).length;
  $('#homeName').textContent = L(`Здесь живёт ${name}`, `${name} lives here`);
  $('#homeHint').textContent = homeEdit ? L('Нажми на ✏️ или ➕ — выбери, что поставить', 'Tap ✏️ or ➕ to choose what goes there')
    : L(`Нажимай на вещи — ${name} поиграет с ними ♡`, `Tap things — ${name} will play with them ♡`);
  $('#homeCount').textContent = L(`Мебель: ${n} из ${SLOT_KEYS.length}`, `Furniture: ${n} of ${SLOT_KEYS.length}`);
  const e = $('#homeEditBtn');
  if(e){ e.classList.toggle('on', homeEdit); e.querySelector('.face').textContent = homeEdit ? '✓' : '🛋️'; e.querySelector('.name').textContent = homeEdit ? L('Готово', 'Done') : L('Обустроить', 'Decorate'); }
}
function buildHomeBar(){
  const nav = $('#homeBar'); nav.innerHTML = '';
  for(const [id, ic, name, fn] of [['homeEditBtn', '🛋️', L('Обустроить', 'Decorate'), () => { homeEdit = !homeEdit; homeIdleT = 12; homeUi(); }],
                                   ['homeOutBtn', '🚪', L('Выйти', 'Go out'), homeLeave]]){
    const b = document.createElement('button'); b.className = 'tool'; b.id = id;
    b.innerHTML = `<span class="face" aria-hidden="true">${ic}</span><span class="name">${name}</span>`;
    b.addEventListener('click', () => { sfx.tap(); fn(); });
    nav.appendChild(b);
  }
}

/* ---------- касания: малыш, значки, мебель; провести пальцем — повернуть комнату ---------- */
function homeHitSlot(e){
  for(const k of SLOT_KEYS){   // сначала значки: они поверх всего
    const m = homeMarks[k]; if(!m.visible) continue;
    const q = toScreen(m.getWorldPosition(new V3()));
    if(Math.hypot(q.x - e.clientX, q.y - e.clientY) < 44) return {k, mark:true};
  }
  const rect = canvas.getBoundingClientRect();
  ndc.set((e.clientX - rect.left)/rect.width*2 - 1, -((e.clientY - rect.top)/rect.height)*2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(SLOT_KEYS.map(k => homeItems[k]).filter(Boolean), true)[0];
  if(!hit) return null;
  let o = hit.object; while(o && !o.userData.slot) o = o.parent;
  return o ? {k:o.userData.slot, mark:false} : null;
}
function homeTap(e){
  if(!petSeal || busy || !mgRoot.hidden) return;
  homeIdleT = 12;
  if(petPart(e)){   // малыш: письмо в зубах или погладить
    if(petLetterTap()) return;
    stroke = {id:e.pointerId, x:e.clientX, y:e.clientY, d:0, fx:0, done:false};
    return;
  }
  homeDrag = {id:e.pointerId, x:e.clientX, yaw:camFocus.yaw, moved:false, hit:homeHitSlot(e)};
}
canvas.addEventListener('pointermove', e => {
  if(!homeDrag || e.pointerId !== homeDrag.id) return;
  const dx = e.clientX - homeDrag.x;
  if(Math.abs(dx) > 12) homeDrag.moved = true;
  if(homeDrag.moved) camFocus.yaw = Math.max(-0.6, Math.min(0.6, homeDrag.yaw - dx*0.005));
});
for(const ev of ['pointerup', 'pointercancel']) canvas.addEventListener(ev, e => {
  const d = homeDrag; if(!d || e.pointerId !== d.id) return;
  homeDrag = null;
  if(d.moved || !d.hit || ev === 'pointercancel' || busy || !homeMode) return;
  const {k, mark} = d.hit;
  if(mark || homeEdit || !homeItems[k]) homePick(k); else homePlay(k);
});

/* ---------- выбор мебели для места ---------- */
async function homePick(k){
  if(busy || !mgRoot.hidden) return;
  setBusy(true); homeIdleT = 12;
  const sl = HOME_SLOTS[k], was = homeHas(save.home.s[k]) ? save.home.s[k] : null, list = FURN.filter(f => f.slot === k);
  let sel = was;
  const c = slotWorld(k);
  camGlide(c, sl.floor ? 3.4 : 2.9, 0.6, sl.floor ? 0.95 : 0.85, 0.45);
  mgOpen(sl.name);
  const panel = mgNode('div', 'mg-panel home-pick', `
    <p class="wallet">${L('У тебя', 'You have')} <b>${save.shells}</b> 🐚</p>
    <div class="shop-grid home-grid">${list.map(f => `<button class="item" data-id="${f.id}"><img src="${homeThumb(f.id)}" alt=""><span class="nm">${f.name}</span><span class="price"></span></button>`).join('')}
      <button class="item empty" data-id=""><span class="none" aria-hidden="true">✕</span><span class="nm">${L('Пусто', 'Empty')}</span><span class="price own"></span></button></div>
    <div class="row"><button class="btn" id="homeBuy"></button><button class="btn ghost" id="homeCancel">${L('Отмена', 'Cancel')}</button></div>`);
  const buy = panel.querySelector('#homeBuy');
  const render = () => {
    panel.querySelectorAll('.item').forEach(b => {
      const id = b.dataset.id || null, f = id && furn(id), pr = b.querySelector('.price');
      b.classList.toggle('sel', id === sel);
      if(!f){ pr.textContent = was === null ? L('Сейчас', 'Now') : ''; pr.hidden = was !== null; return; }
      pr.className = 'price' + (homeHas(id) ? ' own' : '');
      pr.textContent = id === was ? L('Стоит ✓', 'Here ✓') : homeHas(id) ? (f.price ? L('Есть ✓', 'Owned ✓') : L('Даром', 'Free')) : `🐚 ${f.price}`;
    });
    const f = sel && furn(sel); buy.classList.remove('off');
    if(sel === was) buy.textContent = L('Готово ✓', 'Done ✓');
    else if(!f) buy.textContent = L('Убрать', 'Remove');
    else if(homeHas(sel)) buy.textContent = L('Поставить ✓', 'Put it here ✓');
    else { const need = f.price - save.shells; buy.textContent = need > 0 ? L(`Не хватает ${need} 🐚`, `Need ${need} more 🐚`) : L(`Купить за ${f.price} 🐚`, `Buy for ${f.price} 🐚`); if(need > 0) buy.classList.add('off'); }
  };
  render();
  panel.querySelectorAll('.item').forEach(b => mgOn(b, 'click', () => {
    sel = b.dataset.id || null; sfx.pop(); render();
    const o = homeSet(k, sel);   // примерка: вещь сразу на месте
    if(o){ const sc = o.scale.clone(); tween(0.35, q => o.scale.copy(sc).multiplyScalar(Math.max(0.01, q)), ease.back); }
  }));
  const res = await new Promise(r => {
    mgOn(buy, 'click', () => {
      const f = sel && furn(sel);
      if(f && !homeHas(sel) && save.shells < f.price){ sfx.bad(); wiggle(buy); return toast(L('Лечи пациентов в больнице — за них дают ракушки 🐚', 'Heal patients at the hospital — you get shells for them 🐚')); }
      r('ok');
    });
    mgOn(panel.querySelector('#homeCancel'), 'click', () => r('cancel'));
  });
  sfx.tap(); panel.classList.add('away'); await wait(0.25); mgClose();
  let bought = null;
  if(res === 'cancel' || sel === was) homeSet(k, was);
  else {
    const f = sel && furn(sel);
    if(f && !homeHas(sel)){ save.shells -= f.price; save.owned.push(sel); shellsShown = save.shells; renderShells(); bought = f; }
    if(sel) save.home.s[k] = sel; else delete save.home.s[k];
    persist();
  }
  homeUi(); homeView(); setBusy(false);
  if(res === 'cancel' || sel === was || !sel) return;
  // обновка: звёздочки, малыш бежит смотреть
  sfx[bought ? 'buy' : 'pop'](); burst(TEX.star, slotWorld(k), 14, 2, 0.3);
  await wait(0.4);
  await homePlay(k, false, bought);
}
// картинки мебели для выбора (как в лавке: рендер 3D-модели)
const homeThumbs = {};
function homeThumb(id){
  if(homeThumbs[id]) return homeThumbs[id];
  const f = furn(id), o = FURN_MAKE[id](), rug = f.slot === 'rug', wall = !HOME_SLOTS[f.slot].floor;
  o.rotation.set(0, wall ? 0 : rug ? 0 : 0.35, 0);
  o.traverse(x => { if(x.isSprite && x.material.map === GLOW_TEX) x.visible = false; });   // ореол лампы на прозрачном фоне выходит серым
  return homeThumbs[id] = objThumb(o, new V3(0, rug ? 1.4 : wall ? 0.1 : 0.45, 1), HOME_LIGHT);
}

/* ---------- малыш играет с вещами ---------- */
async function homeGo(xz, dur){
  const s = petSeal, to = hp(xz[0], xz[1]), d = s.root.position.distanceTo(to);
  if(d < 0.12) return;
  const mid = hp(0.1, 0.9);   // через середину: так малыш не проходит сквозь мебель
  if(d > 2.4 && s.root.position.distanceTo(mid) > 0.8 && to.distanceTo(mid) > 0.8) await waddleTo(s, mid, 0.3 + 0.3*s.root.position.distanceTo(mid));
  await waddleTo(s, to, dur || 0.3 + 0.3*s.root.position.distanceTo(to));
}
async function homePlay(k, quiet = false, bought = null){
  const o = homeItems[k], s = petSeal; if(!o || !s || busy) return;
  setBusy(true); homeIdleT = 11 + Math.random()*5;
  if(!quiet){ const c = o.getWorldPosition(new V3()).lerp(hp(...HOME_SLOTS[k].stand), 0.5).setY(1.1); camGlide(c, 4.2, 0.8, 0, 0.45); }   // поближе: видно, что делает малыш
  await homeGo(HOME_SLOTS[k].stand);
  if(k !== 'rug') await faceTo(s, o.getWorldPosition(new V3()));
  await HOME_PLAY[k](s, o, quiet, bought);
  if(bought){
    s.happyUntil = now + 3; setMood(s, 'happy'); sfx.hug(); burst(TEX.heart, headTop(s), 14, 2.2, 0.32);
    toast(L(`${save.pet.name}: «Ура! ${bought.name}!» ♡`, `${save.pet.name}: “Yay! ${bought.name}!” ♡`), 3000);
    petGive(3);
  }
  if(!quiet) homeView();
  setBusy(false); petRefresh();
}
const homeSay = (s, ru, en, col) => floatText(L(ru, en), headTop(s), col);
const HOME_PLAY = {
  async bed(s, o, quiet){   // запрыгнуть, свернуться, поспать чуть-чуть
    const top = o.userData.top || 0.36, c = o.getWorldPosition(new V3()).add(new V3(0, top, 0));
    await hopTo(s, c, 0.7, 0.55); await turnTo(s, HOME_SLOTS.bed.rot*0.6, 0.3);
    setMood(s, 'sleep'); sfx.yawn(); homeSay(s, 'Ааа-у…', 'Yaaawn…', '#6B6A7E');
    for(let i = 0; i < 3; i++){ await wait(0.7); floatText('z', worldOf(s, new V3(0.85, 0.35 + i*0.1, 0.3)), '#8E99C9'); }
    await wait(0.5);
    const p = save.pet;
    if(!quiet && p.needs.sleep < 1){ p.needs.sleep = Math.min(1, p.needs.sleep + 0.3); persist(); }
    setMood(s, 'happy'); sfx.arf(); homeSay(s, quiet ? 'Мягко!' : gg('Выспался!', 'Выспалась!'), quiet ? 'So soft!' : 'What a nap!');
    await hopTo(s, hp(...HOME_SLOTS.bed.stand), 0.6, 0.5);
  },
  async rug(s){   // кувырок на коврике
    s.flap = 1; sfx.whoosh();
    await tween(0.9, k => { s.inner.rotation.z = -k*Math.PI*2; s.inner.position.y = Math.sin(k*Math.PI)*0.6*petK(); }, ease.io);
    s.inner.rotation.z = 0; s.inner.position.y = 0; s.flap = 0; sfx.plop(); await squash(s, 0.2, 0.3);
    burst(TEX.star, headTop(s), 8, 1.6, 0.26); homeSay(s, 'Кувырок!', 'Roly-poly!', '#D9527E');
    await turnTo(s, 0, 0.3);
  },
  async lamp(s, o, quiet, bought){   // дотронуться ластой — свет гаснет или загорается
    if(bought && !homeLight){ homeLight = true; lampSet(o, true); }   // новая лампа — сначала пусть светит
    if(quiet || bought){ homeSay(s, 'Светится! ✨', 'It glows! ✨'); return wait(0.6); }
    s.flippers.forEach(f => f.userData.up = 0);
    await tween(0.25, k => { s.flippers[1].userData.up = k*0.9; }); sfx.ding();
    homeLight = !homeLight; lampSet(o, homeLight);
    await tween(0.25, k => { s.flippers[1].userData.up = (1 - k)*0.9; });
    homeSay(s, homeLight ? 'Светло!' : 'Уютно… ✨', homeLight ? 'Lights on!' : 'So cozy… ✨', '#D9527E');
    await wait(0.4);
  },
  async tank(s, o, quiet){   // смотрит на рыбок, рыбки носятся, пузырьки
    o.userData.excite = 3; homeSay(s, 'Рыбки!', 'Fishies!');
    const at = o.localToWorld(o.userData.bubbleAt.clone());
    for(let i = 0; i < 6; i++) emit(SOAP_TEX, at.clone().add(new V3((Math.random() - 0.5)*0.4, i*0.05, 0)), {v:new V3(0, 0.6 + Math.random()*0.3, 0), life:1.2, size:0.12 + Math.random()*0.08});
    await tween(1.4, k => s.nod = Math.sin(k*Math.PI*4)*0.15, ease.lin); s.nod = 0;
    if(quiet) return;
    sfx.chomp(); homeSay(s, 'Можно одну?..', 'Can I have one?..');
    await wait(1.1); sfx.arf(); homeSay(s, 'Шучу! ♡', 'Just kidding! ♡', '#D9527E'); burst(TEX.heart, headTop(s), 6, 1.4, 0.24);
    await wait(0.5);
    await homeFishPanel(o.userData.id);
  },
  async window(s, o){   // смотрит в окно, снег идёт сильнее
    homeSnowK = 3; homeSay(s, 'Снежок идёт!', 'It is snowing!');
    await tween(1.6, k => s.inner.rotation.z = Math.sin(k*Math.PI*3)*0.08, ease.lin); s.inner.rotation.z = 0;
  },
  async shelf(s, o, quiet){
    homeSay(s, 'Мои сокровища!', 'My treasures!'); sfx.sparkle();
    await wait(0.6);
    if(!quiet) await homeFinds();
  },
  async pic(s){
    sfx.arf(); homeSay(s, 'Это я! ♡', 'That is me! ♡', '#D9527E'); burst(TEX.heart, headTop(s), 8, 1.6, 0.26);
    await hop(s, 0.3, 0.4); await wait(0.4);
  }
};
function lampSet(o, on){
  const u = o.userData; if(!u.bulb) return;
  u.bulb.color.setHex(on ? u.on : u.off); u.glow.visible = on;
  $('#homeDim').classList.toggle('on', homeMode && !on);   // лампа выключена — в домике вечер, светится только ночник
}
// полка находок: что уже нашли на прогулках
async function homeFinds(){
  const p = save.pet, got = TREASURES.filter(t => p.finds.includes(t.id));
  mgOpen(L('Полка находок', 'Treasure shelf'));
  const panel = mgNode('div', 'mg-panel walk-end finds-panel', `
    <p class="ttl display">${L(`Находки: ${got.length} из ${TREASURES.length}`, `Treasures: ${got.length} of ${TREASURES.length}`)}</p>
    <div class="finds">${TREASURES.map(t => p.finds.includes(t.id) ? `<i data-n="${t.name}">${t.ic}</i>` : '<i class="no">?</i>').join('')}</div>
    ${save.adv.cups.length ? `<p class="got">${L('Кубки:', 'Cups:')} ${save.adv.cups.map(id => `🏆 ${LEVELS[id] ? LEVELS[id].name : ''}`).join(', ')}</p>` : ''}
    <p class="tip">${foundAll() ? L('Все сокровища собраны! ♡', 'All treasures found! ♡') : L('Гуляйте вместе — каждый день новая находка 🐾', 'Go for walks together — a new treasure every day 🐾')}</p>
    <button class="btn" id="findsOk">${L('Закрыть', 'Close')}</button>`);
  panel.querySelectorAll('.finds i[data-n]').forEach(el => mgOn(el, 'click', () => { sfx.tap(); mgHint(el.dataset.n); wiggle(el); }));
  await new Promise(r => mgOn(panel.querySelector('#findsOk'), 'click', r));
  sfx.tap(); panel.classList.add('away'); await wait(0.25); mgClose();
}
// рыбки из приключений: спасённые живут в аквариуме, у каждой имя; ещё не спасённые — «?»
const TANK_CAP = {tank_bowl:3, tank_big:10};
const tankFish = id => TANK_CAP[id] ? save.adv.fish.map(fishDef).filter(Boolean).slice(0, TANK_CAP[id]) : [];
const fishThumbs = {};
function fishThumb(fd){
  if(fishThumbs[fd.id]) return fishThumbs[fd.id];
  const o = makeRunFish(fd); o.rotation.y = -0.35;
  return fishThumbs[fd.id] = objThumb(o, new V3(0, 0.15, 1));
}
async function homeFishPanel(tankId){
  const got = save.adv.fish, cap = TANK_CAP[tankId] || 0;
  mgOpen(L('Аквариум', 'Fish tank'));
  const where = lv => LEVELS[lv] ? levelName(lv) : '';
  const panel = mgNode('div', 'mg-panel walk-end finds-panel fish-panel', `
    <p class="ttl display">${L(`Рыбки: ${got.length} из ${FISH_ALL.length}`, `Fish: ${got.length} of ${FISH_ALL.length}`)}</p>
    <div class="finds">${FISH_ALL.map(fd => got.includes(fd.id)
      ? `<i data-n="${fd.name} · ${where(fd.lv)}"><img src="${fishThumb(fd)}" alt="${fd.name}"></i>` : '<i class="no">?</i>').join('')}</div>
    <p class="tip">${!got.length ? L('Спасай рыбок из ледяных пузырей в приключениях — они поселятся здесь! 🫧', 'Free the fish from ice bubbles on adventures — they will move in here! 🫧')
      : got.length > cap ? L(`В этом аквариуме помещаются ${cap} ${plural(cap, 'рыбка', 'рыбки', 'рыбок')} — остальные ждут большой аквариум`, `This tank fits ${cap} ${plural(cap, '', '', '', 'fish', 'fish')} — the others are waiting for the big tank`)
      : got.length < FISH_ALL.length ? L('Нажми на рыбку — узнаешь, как её зовут. Ещё рыбки ждут в приключениях 🫧', 'Tap a fish to see its name. More fish are waiting on adventures 🫧') : L('Все рыбки спасены! ♡', 'All the fish are saved! ♡')}</p>
    <button class="btn" id="fishOk">${L('Закрыть', 'Close')}</button>`);
  panel.querySelectorAll('.finds i[data-n]').forEach(el => mgOn(el, 'click', () => { sfx.tap(); mgHint(el.dataset.n); wiggle(el); }));
  await new Promise(r => mgOn(panel.querySelector('#fishOk'), 'click', r));
  sfx.tap(); panel.classList.add('away'); await wait(0.25); mgClose();
}
// сам по себе: время от времени малыш подходит к вещам (тихо, без окошек)
async function homeWander(){
  const opts = SLOT_KEYS.filter(k => homeItems[k]);
  const k = opts.length && Math.random() < 0.8 ? opts[Math.floor(Math.random()*opts.length)] : null;
  if(k) return homePlay(k, true);
  setBusy(true);
  await homeGo(HOME_SPOT); await turnTo(petSeal, 0, 0.3);
  sfx.arf(); homeSay(petSeal, 'Ар!', 'Arf!'); await hop(petSeal, 0.25, 0.35);
  setBusy(false);
}

/* ---------- покадрово ---------- */
let homeSnowK = 1, cornerT = 0, cornerHint = false;
function homeTick(t, dt){
  if(!homeMode){   // в уголке: подсказать, что в домик можно зайти (один раз, пока не заходили)
    if(petMode && save.pet && !save.home.v && !busy && mgRoot.hidden && !cornerHint){
      cornerT += dt;
      if(cornerT > 9){ cornerHint = true; toast(L('Загляни в домик: нажми на иглу или 🏠', 'Peek inside the home: tap the igloo or 🏠'), 3600); }
    } else cornerT = 0;
    const hr = petCorner.userData.heart;
    if(hr) hr.scale.setScalar(save.pet && !save.home.v && petMode ? 1 + Math.sin(t*4)*0.14 : 1);   // сердечко над иглу «зовёт»
    return;
  }
  WIN_SNOW.offset.y += dt*0.07*homeSnowK; homeSnowK += (1 - homeSnowK)*Math.min(1, dt*0.8);
  for(const k of SLOT_KEYS){
    const o = homeItems[k], m = homeMarks[k];
    // значки: ➕ на пустом месте всегда, ✏️ над вещью — в «Обустроить»
    const show = mgRoot.hidden && !busy && (!o || homeEdit);
    m.visible = show;
    if(show){
      const tex = o ? MARK_TEX.edit : MARK_TEX.plus; if(m.material.map !== tex){ m.material.map = tex; m.material.needsUpdate = true; }
      m.position.copy(markPos(k)); m.position.y += Math.sin(t*3 + k.length)*0.06;
      m.scale.setScalar(0.62*(1 + Math.sin(t*4 + k.length)*0.05));
    }
    if(!o) continue;
    const u = o.userData;
    if(u.excite) u.excite = Math.max(0, u.excite - dt);
    const fast = 1 + (u.excite ? 2.5 : 0);
    if(u.fish) u.fish.forEach(f => {
      const d = f.userData;
      if(u.box){ const x = Math.sin(t*d.sp*fast*0.8 + d.ph)*d.w; f.position.set(x, d.y + Math.sin(t*2 + d.ph)*0.05, d.z); f.rotation.y = Math.cos(t*d.sp*fast*0.8 + d.ph) > 0 ? 0 : Math.PI; }
      else { d.a += dt*d.sp*fast; f.position.set(Math.cos(d.a)*d.r, d.y + Math.sin(d.a*2)*0.04, Math.sin(d.a)*d.r); f.rotation.y = -d.a - Math.PI/2; }
    });
    if(u.weeds) u.weeds.forEach((w, i) => w.rotation.z = Math.sin(t*1.5 + i)*0.18);
    if(u.tents) u.tents.forEach(p => p.rotation.x = Math.sin(t*1.8 + p.userData.ph)*0.2);
    if(u.spin) u.spin.rotation.y = Math.sin(t*0.9)*0.35;
    if(u.glow && u.glow.visible) u.glow.material.opacity = 0.8 + Math.sin(t*2.2)*0.15;
    if(u.glow && !homeLight){ const q = toScreen(u.glow.getWorldPosition(new V3())), dim = $('#homeDim').style; dim.setProperty('--x', q.x + 'px'); dim.setProperty('--y', q.y + 'px'); }
  }
  // малыш сам подходит к вещам, если долго ничего не нажимали
  if(!busy && mgRoot.hidden && !homeEdit && !stroke && !homeDrag && !document.querySelector('.overlay:not([hidden])') && !petSeal.sleeping){
    homeIdleT -= dt;
    if(homeIdleT < 0){ homeIdleT = 12 + Math.random()*6; homeWander(); }
  }
}
addEventListener('resize', () => { if(homeMode && mgRoot.hidden && !busy) homeView(); });
$('#btnHome').addEventListener('click', () => { if(homeMode) homeLeave(); else homeEnter(); });
buildHomeBar();
