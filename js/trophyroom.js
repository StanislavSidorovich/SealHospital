/* ---------------- 🏆 Комната трофеев: маленький музей малыша и его доктора (Спринт 7, задача 5) ----------------
   Каркас — js/rooms.js. Здесь всё, чего Сабрина добилась, стоит на виду и считается из сохранения (своих полей нет):
   • на задней стене — полка кубков: по кубку за уровень приключений, где спасли всех рыбок (save.adv.cups), и за горку; ещё не выигранные —
     серые силуэты; выше — рамки с последними фото из альбома (касание — открыть альбом);
   • слева — витрина медалей (TR_MEDALS): каждая считается из сохранения, у серой — подсказка, как её получить; справа — витрина находок с прогулок
     (та же полка, что в прихожей: homeFinds), на стене — грамота с праздника острова (fnDiplomaPanel), когда праздник был;
   • по красной дорожке — место для статуи (tr1) и уголок tr2: выбираются через «Обустроить», как мебель.
   Подключается после rooms.js, walk.js (TREASURES), finale.js (грамота) и до homewalk.js. */
const TR_WALL = canvasTex(256, (g, w, h) => {   // тёплые панели с золотой линией
  g.fillStyle = '#FFF0CC'; g.fillRect(0, 0, w, h);
  for(let i = 0; i < 4; i++){ g.fillStyle = i % 2 ? '#FFE7B0' : '#FFF5DA'; g.fillRect(i*w/4 + 6, 14, w/4 - 12, h - 28); g.strokeStyle = '#E2B24F'; g.lineWidth = 3; g.strokeRect(i*w/4 + 6, 14, w/4 - 12, h - 28); }
}, 256);
TR_WALL.wrapS = THREE.RepeatWrapping; TR_WALL.repeat.set(2, 1);
const TR_FLOOR = canvasTex(256, (g, s) => {   // мрамор в шахматку
  const n = 6, c = s/n;
  for(let i = 0; i < n; i++) for(let j = 0; j < n; j++){ g.fillStyle = (i + j) % 2 ? '#DCE7F0' : '#F7F3E8'; g.fillRect(i*c, j*c, c, c); g.strokeStyle = 'rgba(170,190,210,.5)'; g.lineWidth = 2; g.strokeRect(i*c, j*c, c, c); }
});
TR_FLOOR.wrapS = TR_FLOOR.wrapT = THREE.RepeatWrapping; TR_FLOOR.repeat.set(1.5, 1.5);
const TROOM = rmDefine('trophy', {
  shell:{wall:TR_WALL, floor:TR_FLOOR, side:0xF3E2B0, rim:0xFFE9A8}, spot:[-0.5, 1.7],
  cam:{c:[0.1, -0.6, 0.8], p:5.2, l:6.8, lift:-1.0, up:0.5},
  fill:trFill, enter:trEnter, tap:trTap, tick:trTick, ui:trUi,
  gift:{tr1:'tr_globe', tr2:'tr_plant'},
  first:() => L(`Комната трофеев! Здесь всё, чего ты ${pg('добился', 'добилась')}: кубки, медали, находки и фото пациентов. Нажимай на витрины 🏆`, 'The trophy room! Everything you have achieved is here: cups, medals, treasures and patient photos. Tap the displays 🏆'),
  dyn:null, hits:[], flakes:[], spin:[]
});
homeSlotAdd('tr1', {room:'trophy', name:L('Постамент', 'Pedestal'), floor:[0.15, -0.1], rot:0, stand:[0.9, 0.45], mk:1.9});
homeSlotAdd('tr2', {room:'trophy', name:L('Уголок', 'Corner'), floor:[1.45, 0.95], rot:-0.3, stand:[0.95, 1.3], mk:1.2});
FURN.push(
  {id:'tr_globe',  slot:'tr1', name:L('Снежный шар', 'Snow globe'),          price:0},
  {id:'tr_seal',   slot:'tr1', name:L('Золотой тюлень', 'Golden seal'),      price:60},
  {id:'tr_star',   slot:'tr1', name:L('Хрустальная звезда', 'Crystal star'), price:40},
  {id:'tr_plant',  slot:'tr2', name:L('Ёлочка в горшке', 'Potted fir'),      price:0},
  {id:'tr_flag',   slot:'tr2', name:L('Флаг острова', 'Island flag'),        price:15},
  {id:'tr_lamp',   slot:'tr2', name:L('Ледяной фонарь', 'Ice lantern'),      price:20}
);
const TR_GOLD = 0xFFD66B;
function trPedestal(g, h = 0.5, col = 0xF4F9FD){ islCyl(g, col, 0.42, 0.5, h, 0, h/2, 0, 24, 1.05); islCyl(g, TR_GOLD, 0.45, 0.45, 0.05, 0, h, 0, 24, 1.06); }
function trCupGeo(){
  const p = [[0.001, 0], [0.11, 0], [0.11, 0.025], [0.03, 0.05], [0.03, 0.13], [0.09, 0.17], [0.16, 0.3], [0.155, 0.32], [0.14, 0.31], [0.001, 0.19]].map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(p, 18);
}
const TR_CUP_GEO = trCupGeo();
function trCup(col, earned){
  const g = new THREE.Group(), m = earned ? toon(col) : new THREE.MeshBasicMaterial({color:0xC7CDD9, transparent:true, opacity:0.55});
  m.side = THREE.DoubleSide;
  const b = earned ? addOutline(new THREE.Mesh(TR_CUP_GEO, m), 1.08) : new THREE.Mesh(TR_CUP_GEO, m); g.add(b);
  for(const sd of [-1, 1]){ const h = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 12, Math.PI), earned ? toon(col) : m); h.position.set(sd*0.16, 0.24, 0); h.rotation.z = sd > 0 ? -Math.PI/2 : Math.PI/2; g.add(h); }
  return g;
}
Object.assign(FURN_MAKE, {
  tr_globe(){
    const g = new THREE.Group(); trPedestal(g, 0.42);
    const gl = new THREE.Mesh(new THREE.SphereGeometry(0.46, 24, 16), new THREE.MeshBasicMaterial({color:0xCFEFFF, transparent:true, opacity:0.32, depthWrite:false})); gl.position.y = 0.95; g.add(gl);
    islBlob(g, 0xFFFFFF, 0.16, 0.14, 0.16, 0, 0.6, 0); islBlob(g, 0xFFFFFF, 0.11, 0.1, 0.11, 0, 0.78, 0);
    const cn = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.09, 8), toon(0xFF8A2E)), 1.1); cn.rotation.x = Math.PI/2; cn.position.set(0, 0.78, 0.11); g.add(cn);
    const fl = []; for(let i = 0; i < 9; i++){ const s = new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.dot, transparent:true, depthWrite:false, opacity:0.9})); s.scale.setScalar(0.05); s.userData.p = {a:i*0.7, y:0.6 + (i % 5)*0.13, r:0.15 + (i % 3)*0.07}; g.add(s); fl.push(s); }
    let shake = 0;
    g.userData.anim = (t, dt) => { if(shake > 0) shake -= dt; const k = 1 + (shake > 0 ? 5 : 0); fl.forEach(s => { const p = s.userData.p; p.a += dt*0.5*k; p.y -= dt*0.05*k*(1 + (shake > 0)); if(p.y < 0.55) p.y = 1.3; s.position.set(Math.cos(p.a)*p.r, p.y, Math.sin(p.a)*p.r); }); };
    g.userData.play = () => { shake = 2.2; sfx.sparkle(); };
    return g;
  },
  tr_seal(){
    const g = new THREE.Group(); trPedestal(g, 0.42);
    const gold = 0xFFD66B;
    islBlob(g, gold, 0.36, 0.3, 0.5, 0, 0.72, -0.05); islBlob(g, gold, 0.27, 0.25, 0.27, 0, 1.0, 0.24);
    islBlob(g, gold, 0.1, 0.05, 0.16, -0.32, 0.68, 0.1); islBlob(g, gold, 0.1, 0.05, 0.16, 0.32, 0.68, 0.1); islBlob(g, 0xFFC04D, 0.2, 0.05, 0.12, 0, 0.68, -0.5);
    for(const sd of [-1, 1]){ const e = new THREE.Mesh(SMALL, inkMat); e.scale.setScalar(0.035); e.position.set(sd*0.1, 1.04, 0.47); g.add(e); }
    const n = new THREE.Mesh(SMALL, inkMat); n.scale.set(0.05, 0.035, 0.035); n.position.set(0, 0.97, 0.5); g.add(n);
    const gl = glow(0xFFE9A8, 1.8); gl.position.set(0, 0.95, 0.1); g.add(gl);
    g.userData.anim = (t, dt) => { gl.material.opacity = 0.5 + Math.sin(t*2)*0.18; };
    g.userData.play = () => { sfx.star(); burst(TEX.star, g.localToWorld(new V3(0, 1.3, 0.2)), 12, 1.8, 0.28); };
    return g;
  },
  tr_star(){
    const g = new THREE.Group(); trPedestal(g, 0.42);
    const st = new THREE.Mesh(STAR_GEO, new THREE.MeshToonMaterial({color:0xBFE9FF, transparent:true, opacity:0.9})); st.scale.setScalar(1.3); st.position.y = 1.15; g.add(st);
    const ol = addOutline(st, 1.05);
    const gl = glow(0xCFEFFF, 2.2); gl.position.y = 1.15; g.add(gl);
    g.userData.spin = st; let boost = 0;
    g.userData.anim = (t, dt) => { if(boost > 0) boost -= dt; st.rotation.y += dt*(0.7 + (boost > 0 ? 5 : 0)); st.position.y = 1.15 + Math.sin(t*1.6)*0.05; gl.position.y = st.position.y; };
    g.userData.play = () => { boost = 1.8; sfx.sparkle(); };
    return g;
  },
  tr_plant(){
    const g = new THREE.Group();
    islCyl(g, 0xC98A52, 0.26, 0.2, 0.3, 0, 0.15, 0, 16, 1.06);
    for(const [r, y, h] of [[0.34, 0.5, 0.42], [0.26, 0.8, 0.4], [0.17, 1.08, 0.36]]){ const c = addOutline(new THREE.Mesh(new THREE.ConeGeometry(r, h, 14), toon(0x4FA877)), 1.06); c.position.y = y; g.add(c); }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.star, transparent:true, depthWrite:false})); s.scale.setScalar(0.3); s.position.y = 1.38; g.add(s);
    g.userData.anim = (t) => { s.scale.setScalar(0.3 + Math.sin(t*3)*0.03); };
    g.userData.play = () => { burst(TEX.star, g.localToWorld(new V3(0, 1.3, 0)), 8, 1.2, 0.22); sfx.sparkle(); };
    return g;
  },
  tr_flag(){
    const g = new THREE.Group();
    islCyl(g, 0xF4F9FD, 0.22, 0.26, 0.1, 0, 0.05, 0, 16, 1.06); islCyl(g, 0x8C6A52, 0.03, 0.03, 1.5, 0, 0.8, 0, 8, 1.3);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.42, 6, 1), new THREE.MeshBasicMaterial({color:0xFF9BB8, side:THREE.DoubleSide})); fl.position.set(0.36, 1.35, 0); g.add(fl);
    const h = new THREE.Sprite(new THREE.SpriteMaterial({map:findTex('🦭'), transparent:true, depthWrite:false})); h.scale.setScalar(0.28); h.position.set(0.36, 1.35, 0.02); g.add(h);
    const p = fl.geometry.attributes.position, base = p.array.slice();
    g.userData.anim = (t) => { for(let i = 0; i < p.count; i++){ const x = base[i*3]; p.setZ(i, Math.sin(t*4 + x*5)*0.06*(x + 0.35)); } p.needsUpdate = true; };
    g.userData.play = () => { sfx.whoosh(); };
    return g;
  },
  tr_lamp(){
    const g = new THREE.Group();
    islCyl(g, 0xDDEFFA, 0.28, 0.32, 0.5, 0, 0.25, 0, 14, 1.06);
    const fire = new THREE.Mesh(SMALL, new THREE.MeshBasicMaterial({color:0xFFE38A})); fire.scale.set(0.12, 0.16, 0.12); fire.position.y = 0.6; g.add(fire);
    islCyl(g, 0xB9DDF2, 0.2, 0.3, 0.14, 0, 0.55, 0, 14, 1.06);
    const gl = glow(0xFFE9A8, 1.6); gl.position.y = 0.62; g.add(gl);
    g.userData.anim = (t) => { gl.material.opacity = 0.6 + Math.sin(t*5)*0.12; fire.scale.y = 0.16 + Math.sin(t*7)*0.015; };
    g.userData.play = () => { sfx.sparkle(); burst(TEX.star, g.localToWorld(new V3(0, 0.8, 0)), 6, 1, 0.2); };
    return g;
  }
});
HOME_PLAY.tr1 = HOME_PLAY.tr2 = ocDecorPlay;

/* ---------- медали: считаются из сохранения ---------- */
const TR_MEDALS = [
  {ic:'🩺', name:L('Доктор', 'Doctor'),          how:L('Вылечи 10 пациентов', 'Heal 10 patients'),                  n:() => [Math.min(10, save.progress), 10]},
  {ic:'🎣', name:L('Морской рыбак', 'Sea fisher'), how:L('Поймай всех рыбок моря', 'Catch every sea fish'),           n:() => [save.sea.got.length, SEA_FISH.length]},
  {ic:'🗺️', name:L('Путешественник', 'Explorer'), how:L('Найди все звёздочки острова', 'Find all the island stars'), n:() => [save.isl.got.length, ISL_STARS.length]},
  {ic:'🎲', name:L('Игрок', 'Player'),            how:L('Выиграй 5 настольных игр', 'Win 5 board games'),            n:() => [Math.min(5, Object.values(save.bg.w).reduce((a, b) => a + b, 0)), 5]},
  {ic:'🛷', name:L('Ледяной гонщик', 'Ice racer'), how:L('Найди золотую ракушку на горке', 'Find the golden shell on the slide'), n:() => [save.sl.gold ? 1 : 0, 1]},
  {ic:'🦈', name:L('Друг акулы', 'Shark friend'), how:L('Подружись с акулой', 'Make friends with the shark'),          n:() => [save.dive.shark.friend ? 1 : 0, 1]},
  {ic:'☁️', name:L('Друг Тучи', 'Cloud friend'),  how:L('Вылечи Большую Тучу', 'Cure the Big Cloud'),               n:() => [save.coop.cs.cure >= 2 ? 1 : 0, 1]},
  {ic:'🌪️', name:L('Хранитель маяка', 'Lighthouse keeper'), how:L('Пройди Великий шторм', 'Get through the Great Storm'), n:() => [save.storm.st >= 4 ? 1 : 0, 1]},
  {ic:'🎉', name:L('Праздник острова', 'Island party'), how:L('Устрой праздник острова', 'Throw the island party'),     n:() => [save.story.fin.n > 0 ? 1 : 0, 1]}
];
const trMedalOk = m => { const [a, b] = m.n(); return a >= b; };
const TR_CUPS = () => [...Object.keys(RUN_FISH), 'slide'];
const trCupName = id => id === 'slide' ? L('Ледяная горка', 'Ice slide') : LEVELS[id] ? LEVELS[id].name : id;

/* ---------- витрины (стены и пол) ---------- */
function trFill(root){
  // красная дорожка от двери к постаменту
  const rg = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 3.6), toon(0xD9527E)); rg.rotation.x = -Math.PI/2; rg.position.set(0.15, HOME_Y + 0.006, 0.6); root.add(rg);
  for(const sd of [-1, 1]){ const b = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 3.6), new THREE.MeshBasicMaterial({color:TR_GOLD})); b.rotation.x = -Math.PI/2; b.position.set(0.15 + sd*0.5, HOME_Y + 0.008, 0.6); root.add(b); }
  TROOM.dyn = new THREE.Group(); root.add(TROOM.dyn);
}
function trHit(o, k){ o.userData.tr = k; TROOM.hits.push(o); return o; }
function trpClear(){
  TROOM.dyn.traverse(o => {   // освобождаем видеопамять: витрины пересобираются при каждом заходе (общие SMALL, кубок и картинки-эмодзи не трогаем)
    if(o.geometry && o.geometry !== SMALL && o.geometry !== TR_CUP_GEO) o.geometry.dispose();
    const m = o.material; if(m && !o.isSprite){ if(m.map) m.map.dispose(); m.dispose(); }
  });
  while(TROOM.dyn.children.length) TROOM.dyn.remove(TROOM.dyn.children[0]);
  TROOM.hits = []; TROOM.spin = [];
}
function trPhotoTex(img){
  const tex = new THREE.Texture(); tex.encoding = THREE.sRGBEncoding;
  if(img){ const im = new Image(); im.onload = () => { tex.image = im; tex.needsUpdate = true; }; im.src = img; }
  return tex;
}
function trBuild(){
  trpClear();
  const D = TROOM.dyn;
  // рамки с фото (последние пять; в альбоме до 40)
  const photos = save.album.filter(a => a.img).slice(-5).reverse();
  for(let i = 0; i < 5; i++){
    const g = new THREE.Group(); rmWall(g, -0.86 + i*0.43, 0.62, true, HOME_R*0.945); D.add(g);
    g.add(addOutline(new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.66, 0.06), toon(i % 2 ? 0xFF9BB8 : 0xFFD66B)), 1.05));
    const p = photos[i], m = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.52), p ? new THREE.MeshBasicMaterial({map:trPhotoTex(p.img)}) : new THREE.MeshBasicMaterial({color:0xE9EEF5}));
    m.position.z = 0.04; g.add(m);
    if(!p){ const q = new THREE.Sprite(new THREE.SpriteMaterial({map:findTex('📷'), transparent:true, depthWrite:false})); q.scale.setScalar(0.3); q.position.z = 0.08; g.add(q); }
    trHit(g, 'album');
  }
  // полка кубков
  const cups = TR_CUPS(), got = save.adv.cups, cols = Math.ceil(cups.length/2);
  const sh = new THREE.Group(); rmWall(sh, 0.3, 0.34, true, HOME_R*0.945); D.add(sh);
  const bw = cols*0.36 + 0.2;
  for(const y of [-0.34, 0.16]){ const b = addOutline(new THREE.Mesh(new THREE.BoxGeometry(bw, 0.06, 0.34), toon(0xC98A52)), 1.06); b.position.set(0, y, 0.15); sh.add(b); }
  cups.forEach((id, i) => {
    const row = i < cols ? 0 : 1, c = trCup(TR_GOLD, got.includes(id)); c.position.set((i % cols - (cols - 1)/2)*0.36, row ? -0.31 : 0.19, 0.16); sh.add(c);
  });
  trHit(sh, 'cups');
  // грамота
  const dp = new THREE.Group(); rmWall(dp, -0.78, 0.3, true, HOME_R*0.945); D.add(dp);
  dp.add(addOutline(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.84, 0.06), toon(TR_GOLD)), 1.05));
  const has = save.story.fin.n > 0;
  const dm = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.72), new THREE.MeshBasicMaterial({map:canvasTex(128, (g, w, h) => {
    g.fillStyle = has ? '#FFFDF8' : '#E9EEF5'; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '52px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.fillText(has ? '📜' : '❔', w/2, h*0.4);
    g.fillStyle = has ? '#D9527E' : '#8A93A6'; g.font = '17px Nunito, sans-serif'; g.fillText(has ? L('Грамота', 'Certificate') : L('Скоро…', 'Soon…'), w/2, h*0.72); }, 184)})); dm.position.z = 0.04; dp.add(dm);
  trHit(dp, 'diploma');
  // витрина медалей (слева) и находок (справа)
  D.add(trCase(-2.35, -0.55, 0.3, 'medals', TR_MEDALS.map(m => ({ic:m.ic, ok:trMedalOk(m)})), 3));
  const fin = save.pet ? save.pet.finds : [];
  D.add(trCase(2.25, -0.3, -0.35, 'finds', TREASURES.map(t => ({ic:t.ic, ok:fin.includes(t.id)})), 3));
}
// стеклянная витрина: на ножках, полки, значки
function trCase(x, z, rot, key, list, cols){
  const g = new THREE.Group(); g.position.set(x, HOME_Y, z); g.rotation.y = rot;
  const rows = Math.ceil(list.length/cols), H = 0.5 + rows*0.36;
  islBox(g, 0xC98A52, 1.15, 0.22, 0.6, 0, 0.11, 0);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(1.05, H), new THREE.MeshBasicMaterial({color:0xFFF3D2})); back.position.set(0, 0.22 + H/2, -0.24); g.add(back);
  for(const sd of [-1, 1]) islBox(g, 0xC98A52, 0.06, H, 0.5, sd*0.52, 0.22 + H/2, 0);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.05, H, 0.5), new THREE.MeshBasicMaterial({color:0xCFEFFF, transparent:true, opacity:0.2, depthWrite:false})); glass.position.y = 0.22 + H/2; g.add(glass);
  islBox(g, 0xC98A52, 1.15, 0.08, 0.6, 0, 0.22 + H + 0.04, 0);
  for(let r = 0; r < rows; r++){
    islBox(g, 0xFFFDF8, 1.0, 0.04, 0.46, 0, 0.5 + r*0.36, 0, 1.06);
    for(let c = 0; c < cols; c++){
      const it = list[r*cols + c]; if(!it) continue;
      const px = (c - (cols - 1)/2)*0.3, py = 0.5 + r*0.36 + 0.2;
      if(key === 'medals'){
        const d = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 20), toon(it.ok ? TR_GOLD : 0xC7CDD9)), 1.1); d.rotation.x = Math.PI/2; d.position.set(px, py, 0.1); g.add(d);
      }
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:findTex(it.ok ? it.ic : '❔'), transparent:true, depthWrite:false, opacity:it.ok ? 1 : 0.7})); sp.scale.setScalar(key === 'medals' ? 0.19 : 0.26); sp.position.set(px, py, 0.16); g.add(sp);
    }
  }
  g.userData.mk = H + 0.5;
  return trHit(g, key);
}
function trEnter(){ if(!TROOM.dyn) return; trBuild(); }
function trTick(t, dt){ if(TROOM.dyn) TROOM.dyn.children.forEach(c => { if(c.userData.tr === 'cups') c.children.forEach((k, j) => { if(j > 1) k.rotation.y = Math.sin(t*1.1 + j)*0.25; }); }); }   // кубки чуть поворачиваются
function trUi(){
  const got = save.adv.cups.length, all = TR_CUPS().length, med = TR_MEDALS.filter(trMedalOk).length;
  $('#homeHint').textContent = homeEdit ? L('Нажми на ✏️ или ➕ — выбери статую или уголок', 'Tap ✏️ or ➕ to choose a statue or a corner')
    : L('Нажимай на кубки, медали, рамки и витрины — узнаешь про каждое', 'Tap the cups, medals, frames and cases to learn about them');
  $('#homeCount').textContent = L(`Кубки: ${got} из ${all} · Медали: ${med} из ${TR_MEDALS.length}`, `Cups: ${got} of ${all} · Medals: ${med} of ${TR_MEDALS.length}`);
}

/* ---------- касания ---------- */
async function trPanel(ttl, html){
  if(busy) return; setBusy(true); homeIdleT = 12;
  mgOpen('');
  const panel = mgNode('div', 'mg-panel fun-pick tr-panel', `<p class="ttl display">${ttl}</p>${html}<button class="btn" id="trOk">${L('Закрыть', 'Close')}</button>`);
  await new Promise(r => mgOn(panel.querySelector('#trOk'), 'click', r));
  sfx.tap(); panel.classList.add('away'); await wait(0.25); mgClose(); setBusy(false);
}
async function trAct(k){
  if(busy || !mgRoot.hidden || homeRoom !== 'trophy') return;
  sfx.pop();
  if(k === 'album'){ setBusy(true); await homeGo([0.4, 1.0]); await faceTo(petSeal, hp(0, -3)); setBusy(false); return openAlbum(); }
  if(k === 'finds'){ setBusy(true); await homeGo([1.3, 0.3]); setBusy(false); return trFinds(); }
  if(k === 'cups'){
    const got = save.adv.cups;
    return trPanel(`🏆 ${L('Кубки', 'Cups')}`, `<div class="tr-list">${TR_CUPS().map(id => `<p class="${got.includes(id) ? 'ok' : 'no'}"><span>${got.includes(id) ? '🏆' : '⚪'}</span> ${trCupName(id)}</p>`).join('')}</div>
      <p class="tip">${got.length >= TR_CUPS().length ? L('Все кубки собраны! ♡', 'All the cups are yours! ♡') : L('Кубок — за спасение всех рыбок на уровне. Горка — за золотую ракушку 🐚', 'A cup is for saving every fish on a level. The slide cup is for the golden shell 🐚')}</p>`);
  }
  if(k === 'medals'){
    return trPanel(`🎖️ ${L('Медали', 'Medals')}`, `<div class="tr-list">${TR_MEDALS.map(m => { const [a, b] = m.n(), ok = a >= b; return `<p class="${ok ? 'ok' : 'no'}"><span>${ok ? m.ic : '⚪'}</span> <b>${m.name}</b> — ${ok ? L('есть! ✓', 'yours! ✓') : `${m.how}${b > 1 ? ` (${a}/${b})` : ''}`}</p>`; }).join('')}</div>`);
  }
  if(k === 'diploma'){
    if(save.story.fin.n <= 0){ return toast(L('Грамота появится после большого праздника острова 🎉 — его устроят в конце истории', 'The certificate will appear after the big island party 🎉 — at the end of the story'), 4200); }
    setBusy(true); mgOpen(''); await fnDiplomaPanel(fnLastPhoto(), mgStage, L('← Назад', '← Back')); mgClose(); setBusy(false);
  }
}
async function trFinds(){   // та же полка находок, что и в прихожей
  if(busy) return; setBusy(true); await homeFinds(); setBusy(false);
}
function trTap(cx, cy){
  ocRay(cx, cy);
  const hit = ray.intersectObjects(TROOM.hits, true)[0];
  if(!hit) return;
  let o = hit.object; while(o && !o.userData.tr) o = o.parent;
  if(o) trAct(o.userData.tr);
}
rmReady('trophy');
