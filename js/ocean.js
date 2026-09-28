/* ---------------- 🐠 Океанариум: комната иглу со стеклянной стеной прямо в море (Спринт 7, задача 1) ----------------
   Идея папы (28.09): «окно в океан — интересно, если там видеть экосистему». Иглу растёт: в стене прихожей (js/home.js)
   появляется арка. Сначала она заложена снежными кирпичиками — касание: медведь-сосед (или Пинг) построит океанариум
   за OC_PRICE 🐚, готово на следующий день (мир живёт без тебя; в ?test=1 — сразу). Потом арка открыта — туда.
   Внутри: пол с солнечными зайчиками, задняя половина купола — стекло, за ним кусочек бухты ярусами:
   у дна — жители, позванные из «Нырнуть» (save.dive.tank: краб ходит, звёздочка прилипла к стеклу, медузы наверху…),
   в середине — две стайки (по InstancedMesh: плывут вместе и разворачиваются разом) и все рыбки, что есть:
   пойманные на рыбалке (save.sea) и спасённые в приключениях (save.adv.fish). Новенькие сначала подплывают к стеклу.
   Гости: акула-подружка машет плавником, черепаха, гость дня бухты вдали, Клякса светится ночью (по часам устройства).
   Касания: стекло — стайки брызнут в стороны и вернутся; житель — имя и факт; 🍤 кормушка — то же кормление раз в день,
   что у аквариума (save.home.fed; не кормили — рыбки вялые); люк в полу — прямо в «Нырнуть»; арка — обратно в прихожую.
   Три места на дне (oc1…oc3) — украшения через «Обустроить», как мебель. Сохранение: save.home.rooms / build / oc (data.js).
   Подключается после home.js, dive.js (DV_MAKE), gloom.js (glOctoModel), festival.js (feBearMake), island.js (islBox…) и до game.js. */
const OC_POS = new V3(260, 0, 0), OC_R = 4.0, OC_Y = HOME_Y, OC_PRICE = 80;   // где комната, радиус купола, пол, цена стройки
const OC_HALL_A = -0.45, OC_DOOR_A = -1.3;   // где арка: в стене прихожей и в океанариуме (угол от задней стенки)
const OC_FEED = [2.95, -1.15], OC_HATCH = [1.75, 1.35];   // кормушка и люк на полу
const ocRoot = new THREE.Group(); ocRoot.position.copy(OC_POS); ocRoot.visible = false; scene.add(ocRoot);
const ocDay = () => new Date().toDateString();
const ocNight = () => { const h = new Date().getHours(); return h >= 20 || h < 7; };
const ocBuilt = () => !!save.home.rooms.ocean;
const ocLocked = () => typeof stGate === 'function' && stGate('ocean') >= 0;
const ocWho = () => save.pt && save.pt.bear ? L('Медведь', 'The bear') : pengMet() ? L('Пинг', 'Ping') : L('Соседи', 'The neighbours');
// дно: у стекла ровное, дальше уходит вглубь, с пологими холмиками
function ocSeabed(x, z){ return -0.55 - Math.max(0, -z - 4.5)*0.09 + 0.22*Math.sin(x*0.45 + 1)*Math.cos(z*0.37) * Math.min(1, Math.max(0, -z - 5)/3); }
const ocAt = (a, r) => [Math.sin(a)*r, -Math.cos(a)*r];   // точка на полу по углу от задней стенки

/* ---------- текстуры ---------- */
const OC_FLOOR_TEX = canvasTex(256, (g, s) => {   // голубая плитка
  g.fillStyle = '#9CCFE0'; g.fillRect(0, 0, s, s);
  const n = 8, c = s/n;
  for(let i = 0; i < n; i++) for(let j = 0; j < n; j++){ g.fillStyle = (i + j) % 2 ? '#CFEFF6' : '#E6F8FB'; g.fillRect(i*c + 2, j*c + 2, c - 4, c - 4); }
});
OC_FLOOR_TEX.wrapS = OC_FLOOR_TEX.wrapT = THREE.RepeatWrapping; OC_FLOOR_TEX.repeat.set(2, 2);
const OC_CAUSTIC = canvasTex(256, (g, s) => {   // солнечные зайчики, как сквозь воду
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 4; g.lineJoin = 'round';
  let seed = 7; const r = () => (seed = (seed*16807) % 2147483647)/2147483647;
  for(let i = 0; i < 26; i++){
    const cx = r()*s, cy = r()*s, rr = 14 + r()*22;
    g.beginPath();
    for(let k = 0; k <= 12; k++){ const a = k/12*Math.PI*2, q = rr*(0.75 + 0.35*Math.sin(a*3 + i)); k ? g.lineTo(cx + Math.cos(a)*q, cy + Math.sin(a)*q) : g.moveTo(cx + Math.cos(a)*q, cy + Math.sin(a)*q); }
    g.stroke();
  }
});
OC_CAUSTIC.wrapS = OC_CAUSTIC.wrapT = THREE.RepeatWrapping; OC_CAUSTIC.repeat.set(2.5, 2.5);
const OC_BACK_TEX = canvasTex(64, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#BDEBF7'); gr.addColorStop(0.35, '#6FC0DF'); gr.addColorStop(0.62, '#3E8FC0'); gr.addColorStop(1, '#1E5584');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}, 256);
const OC_RAY_TEX = canvasTex(64, (g, w, h) => {   // луч света сверху: мягкий по краям, гаснет книзу
  const gx = g.createLinearGradient(0, 0, w, 0); gx.addColorStop(0, 'rgba(255,255,255,0)'); gx.addColorStop(0.5, 'rgba(255,255,255,1)'); gx.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gx; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'destination-in';
  const gy = g.createLinearGradient(0, 0, 0, h); gy.addColorStop(0, 'rgba(0,0,0,1)'); gy.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gy; g.fillRect(0, 0, w, h);
}, 256);
const OC_RING_TEX = canvasTex(128, (g, s) => { g.beginPath(); g.arc(s/2, s/2, s/2 - 8, 0, 7); g.lineWidth = 7; g.strokeStyle = '#fff'; g.stroke(); });
const OC_HOLE_TEX = canvasTex(128, (g, s) => {   // открытая арка: там, в глубине, вода
  const gr = g.createRadialGradient(s/2, s*0.62, 4, s/2, s*0.62, s*0.62); gr.addColorStop(0, '#BDEBF7'); gr.addColorStop(0.5, '#4FA6D2'); gr.addColorStop(1, '#1E5584');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
  g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 3;
  for(const [x, y, r] of [[40, 70, 6], [52, 50, 4], [86, 80, 5], [78, 40, 3]]){ g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); }
});
const OC_BRICK_TEX = canvasTex(128, (g, s) => {   // заложено снежными кирпичиками
  g.fillStyle = '#F4F9FD'; g.fillRect(0, 0, s, s);
  g.strokeStyle = '#A9C6DE'; g.lineWidth = 4;
  for(let r = 0; r < 5; r++){ const y = r*s/5; g.beginPath(); g.moveTo(0, y); g.lineTo(s, y); g.stroke();
    for(let i = 0; i < 3; i++){ const x = (r % 2 ? s/6 : 0) + i*s/3; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + s/5); g.stroke(); } }
});
function ocMarkTex(ic){   // значок над аркой: пунктирный кружок и рыбка
  return canvasTex(128, (g, s) => {
    g.beginPath(); g.arc(s/2, s/2, s/2 - 8, 0, 7); g.fillStyle = 'rgba(255,253,248,.95)'; g.fill();
    g.lineWidth = 7; g.strokeStyle = '#D9527E'; g.setLineDash([14, 9]); g.stroke(); g.setLineDash([]);
    g.font = '62px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ic, s/2, s/2 + 4);
  });
}

/* ---------- склейка геометрий для стайки (одна InstancedMesh на всю стайку) ---------- */
function ocMerge(list){
  let n = 0; const pos = [], nor = [], idx = [];
  for(const g of list){
    const p = g.attributes.position, q = g.attributes.normal;
    for(let i = 0; i < p.count; i++){ pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(q.getX(i), q.getY(i), q.getZ(i)); }
    if(g.index) for(let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + n); else for(let i = 0; i < p.count; i++) idx.push(i + n);
    n += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); out.setIndex(idx);
  return out;
}
const OC_FISH_GEO = (() => {
  const body = k => new THREE.SphereGeometry(1, 12, 8).scale(0.3*k, 0.15*k, 0.1*k);
  const tail = k => { const t = new THREE.ConeGeometry(0.13*k, 0.22*k, 4); t.rotateZ(Math.PI/2); t.scale(1, 1, 0.4); t.translate(-0.36, 0, 0); return t; };
  const eyes = [-1, 1].map(sd => new THREE.SphereGeometry(0.035, 8, 6).translate(0.17, 0.04, sd*0.075));
  return {fill:ocMerge([body(1), tail(1)]), ol:ocMerge([body(1.12), tail(1.18)]), eyes:ocMerge(eyes)};
})();

/* ---------- украшения на дне (места oc1…oc3, выбираются как мебель в «Обустроить») ---------- */
FURN.push(
  {id:'oc_castle', slot:'oc1', name:L('Ледяной замок', 'Ice castle'),            price:45},
  {id:'oc_ship',   slot:'oc1', name:L('Затонувший кораблик', 'Sunken ship'),     price:50},
  {id:'oc_chest',  slot:'oc2', name:L('Сундук с пузырями', 'Bubble chest'),      price:30},
  {id:'oc_clam',   slot:'oc2', name:L('Ракушка с жемчужиной', 'Pearl clam'),     price:35},
  {id:'oc_coral',  slot:'oc3', name:L('Коралловый садик', 'Coral garden'),       price:0},
  {id:'oc_shell',  slot:'oc3', name:L('Домик-ракушка', 'Shell house'),           price:25}
);
const ocBubbles = (o, at, n = 5) => { const p = o.localToWorld(at.clone()); for(let i = 0; i < n; i++) emit(SOAP_TEX, p.clone().add(new V3((Math.random() - 0.5)*0.3, i*0.12, (Math.random() - 0.5)*0.2)), {v:new V3(0, 0.7 + Math.random()*0.4, 0), life:2.2, size:0.14 + Math.random()*0.1}); };
Object.assign(FURN_MAKE, {
  oc_castle(){
    const g = new THREE.Group(), ice = toon(0xCFE8F7), roof = toon(0xFF9BB8);
    islBlob(g, 0xB9C2D0, 1.3, 0.35, 0.9, 0, 0.1, 0);
    const tops = [];
    for(const [x, r, h] of [[0, 0.38, 1.7], [-0.72, 0.28, 1.15], [0.72, 0.28, 1.15]]){
      const t = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(r, r*1.08, h, 18), ice), 1.05); t.position.set(x, 0.3 + h/2, 0); g.add(t);
      const c = addOutline(new THREE.Mesh(new THREE.ConeGeometry(r*1.3, r*1.9, 18), roof), 1.06); c.position.set(x, 0.3 + h + r*0.9, 0); g.add(c);
      const w = new THREE.Mesh(new THREE.CircleGeometry(r*0.3, 14), inkMat); w.position.set(x, 0.3 + h*0.7, r*1.02); g.add(w);
      tops.push(new V3(x, 0.3 + h + r*1.8, 0));
    }
    const sh = new THREE.Shape(); sh.moveTo(-0.2, 0); sh.lineTo(-0.2, 0.3); sh.absarc(0, 0.3, 0.2, Math.PI, 0, true); sh.lineTo(0.2, 0); sh.closePath();
    const door = new THREE.Mesh(new THREE.ShapeGeometry(sh, 10), new THREE.MeshBasicMaterial({color:0x5C6E91})); door.position.set(0, 0.32, 0.39); g.add(door);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.25), new THREE.MeshBasicMaterial({color:0xFFD66B, side:THREE.DoubleSide})); flag.position.set(0.2, tops[0].y + 0.25, 0); g.add(flag);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5), inkMat); pole.position.set(0, tops[0].y + 0.2, 0); g.add(pole);
    let bt = 2;
    g.userData.anim = (t, dt) => { flag.rotation.y = Math.sin(t*3)*0.35; if((bt -= dt) < 0){ bt = 3 + Math.random()*3; ocBubbles(g, tops[Math.floor(Math.random()*3)], 3); } };
    g.userData.play = () => { tops.forEach(p => ocBubbles(g, p, 6)); sfx.sparkle(); };
    return g;
  },
  oc_ship(){
    const g = new THREE.Group(), in_ = new THREE.Group(); in_.rotation.set(0, -0.3, 0.22); g.add(in_);
    islBlob(in_, 0xB88A5E, 1.35, 0.45, 0.58, 0, 0.35, 0);
    islBox(in_, 0xD9A66A, 2.0, 0.08, 0.7, 0, 0.62, 0);
    const mast = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.9, 8), toon(0x8C6A52)), 1.15); mast.position.set(0.1, 1.5, 0); in_.add(mast);
    const sail = new THREE.Shape(); sail.moveTo(0, 0); sail.lineTo(0, 1.2); sail.lineTo(0.85, 0.1); sail.closePath();
    const sm = new THREE.Mesh(new THREE.ShapeGeometry(sail), new THREE.MeshToonMaterial({color:0xFFFDF8, side:THREE.DoubleSide})); sm.position.set(0.14, 0.9, 0.02); in_.add(sm);
    for(const x of [-0.6, -0.1, 0.4]){ const p = new THREE.Mesh(new THREE.CircleGeometry(0.1, 14), new THREE.MeshBasicMaterial({color:0x5C6E91})); p.position.set(x, 0.38, 0.57); in_.add(p); }
    const fish = makeFish(0xFFD66B); fish.scale.setScalar(0.6); fish.visible = false; g.add(fish);
    let dart = 0;
    g.userData.anim = (t, dt) => {
      in_.rotation.z = 0.22 + Math.sin(t*0.7)*0.03;
      if(dart > 0){ dart -= dt; const k = 1 - dart/2.2; fish.visible = true; fish.position.set(-0.1 + Math.sin(k*Math.PI)*1.6, 0.5 + k*0.9, 0.7); fish.rotation.y = k < 0.5 ? 0 : Math.PI; if(dart <= 0) fish.visible = false; }
    };
    g.userData.play = () => { dart = 2.2; ocBubbles(g, new V3(-0.1, 0.4, 0.6), 6); sfx.plop(); };
    return g;
  },
  oc_chest(){
    const g = new THREE.Group(), wood = toon(0x9C6B3F), gold = toon(0xFFD66B);
    islBox(g, 0x9C6B3F, 1.1, 0.55, 0.7, 0, 0.28, 0);
    for(const x of [-0.35, 0.35]) islBox(g, 0xFFD66B, 0.1, 0.57, 0.72, x, 0.28, 0, 1.0);
    for(const [x, y] of [[-0.2, 0.62], [0.1, 0.66], [0.25, 0.6], [-0.05, 0.7]]){ const c = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 12), gold); c.position.set(x, y, 0); c.rotation.x = 0.4; g.add(c); }
    const gl = glow(0xFFE9A8, 1.6); gl.position.set(0, 0.8, 0.1); gl.visible = false; g.add(gl);
    const lid = new THREE.Group(); lid.position.set(0, 0.56, -0.35); g.add(lid);
    const lm = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.1, 18, 1, false, 0, Math.PI), wood), 1.04); lm.rotation.z = Math.PI/2; lm.position.z = 0.35; lid.add(lm);
    let ot = 4, open = 0;
    g.userData.anim = (t, dt) => {
      if((ot -= dt) < 0){ ot = 6 + Math.random()*4; open = 1.6; ocBubbles(g, new V3(0, 0.7, 0), 6); }
      if(open > 0) open -= dt;
      const want = open > 0 ? 1 : 0; lid.userData.k = (lid.userData.k || 0) + (want - (lid.userData.k || 0))*Math.min(1, dt*4);
      lid.rotation.x = -lid.userData.k*1.0; gl.visible = lid.userData.k > 0.3;
    };
    g.userData.play = () => { open = 2.5; ocBubbles(g, new V3(0, 0.7, 0), 10); burst(TEX.star, g.localToWorld(new V3(0, 0.9, 0)), 8, 1.4, 0.24); sfx.coin(); };
    return g;
  },
  oc_clam(){
    const g = new THREE.Group(), sm = toon(0xE7B8E6);
    const bot = addOutline(new THREE.Mesh(new THREE.SphereGeometry(0.7, 24, 10, 0, Math.PI*2, Math.PI/2, Math.PI/2), sm), 1.05); bot.scale.y = 0.45; bot.position.y = 0.3; g.add(bot);
    const back = new THREE.Group(); back.position.set(0, 0.3, -0.6); g.add(back);
    const top = addOutline(new THREE.Mesh(new THREE.SphereGeometry(0.7, 24, 10, 0, Math.PI*2, 0, Math.PI/2), sm), 1.05); top.scale.y = 0.45; top.position.z = 0.6; back.add(top);
    const pm = new THREE.MeshBasicMaterial({color:0xFFF6FB});
    const pearl = addOutline(new THREE.Mesh(SMALL, pm), 1.08); pearl.scale.setScalar(0.22); pearl.position.set(0, 0.42, 0.05); g.add(pearl);
    const gl = glow(0xFFE6F4, 1.8); gl.position.set(0, 0.5, 0.25); g.add(gl);
    let boost = 0;
    g.userData.anim = (t, dt) => { if(boost > 0) boost -= dt; back.rotation.x = -0.35 - (0.5 + 0.5*Math.sin(t*0.6))*0.5 - (boost > 0 ? 0.4 : 0); gl.material.opacity = 0.6 + Math.sin(t*2)*0.2 + (boost > 0 ? 0.3 : 0); };
    g.userData.play = () => { boost = 2.5; sfx.sparkle(); burst(TEX.star, g.localToWorld(new V3(0, 0.7, 0)), 8, 1.2, 0.22); };
    return g;
  },
  oc_coral(){
    const g = new THREE.Group(), sway = [];
    for(const [x, z, col, h] of [[-0.6, 0.1, 0xFF8FB0, 1.1], [0.1, -0.2, 0xFFA36B, 1.5], [0.7, 0.15, 0xB69CF2, 0.9], [-0.1, 0.35, 0xFF7F9E, 0.7]]){
      const piv = new THREE.Group(); piv.position.set(x, 0, z); g.add(piv); sway.push(piv);
      const m = toon(col);
      const st = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, h, 8), m), 1.15); st.position.y = h/2; piv.add(st);
      for(const [bx, by, bh] of [[-0.18, h*0.5, h*0.45], [0.2, h*0.65, h*0.35]]){
        const b = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, bh, 8), m), 1.15); b.position.set(bx*0.6, by + bh*0.35, 0); b.rotation.z = -bx*2.4; piv.add(b);
        const tip = new THREE.Mesh(SMALL, toon(0xFFFDF8)); tip.scale.setScalar(0.07); tip.position.set(bx*1.5, by + bh*0.75, 0); piv.add(tip);
      }
      const tip = new THREE.Mesh(SMALL, toon(0xFFFDF8)); tip.scale.setScalar(0.08); tip.position.y = h; piv.add(tip);
    }
    const fan = new THREE.Mesh(new THREE.CircleGeometry(0.55, 20, 0, Math.PI), new THREE.MeshToonMaterial({color:0xFFD66B, side:THREE.DoubleSide})); fan.position.set(0.35, 0.1, -0.45); g.add(fan); sway.push(fan);
    const fish = SEA_MAKE.clown ? makeSeaFish(seaDef('clown')) : makeFish(0xFF8A2E); fish.scale.setScalar(0.9); fish.visible = false; g.add(fish);
    let dart = 0;
    g.userData.anim = (t, dt) => {
      sway.forEach((p, i) => p.rotation.z = Math.sin(t*1.2 + i)*0.08);
      if(dart > 0){ dart -= dt; const k = 1 - dart/2.4; fish.visible = true; fish.position.set(Math.cos(k*Math.PI*2)*0.9, 0.9 + Math.sin(k*Math.PI)*0.6, Math.sin(k*Math.PI*2)*0.5 + 0.3); fish.rotation.y = -k*Math.PI*2 - Math.PI/2; if(dart <= 0) fish.visible = false; }
    };
    g.userData.play = () => { dart = 2.4; sfx.pop(); };
    return g;
  },
  oc_shell(){   // большая витая ракушка, в ней живёт рак-отшельник
    const g = new THREE.Group(), m = toon(0xFFD9C2);
    const body = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.4, 20), m), 1.05); body.rotation.z = Math.PI/2 + 0.15; body.position.set(-0.2, 0.5, 0); g.add(body);
    for(let i = 0; i < 3; i++){ const r = inkRing(new THREE.Mesh(new THREE.TorusGeometry(0.45 - i*0.12, 0.05, 8, 20), toon(0xFFB3C7))); r.rotation.y = Math.PI/2; r.position.set(-0.05 - i*0.3, 0.5 + i*0.03, 0); g.add(r); }
    const lip = inkRing(new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.1, 10, 24), toon(0xFF9BB8))); lip.rotation.y = Math.PI/2 - 0.5; lip.position.set(0.5, 0.48, 0.12); g.add(lip);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.45, 20), new THREE.MeshBasicMaterial({color:0x7A4E5E})); hole.rotation.y = Math.PI/2 - 0.5; hole.position.set(0.49, 0.48, 0.12); g.add(hole);
    const crab = new THREE.Group(); crab.position.set(0.55, 0.3, 0.3); g.add(crab);
    const c = DV_MAKE.crab(); c.scale.setScalar(0.7); c.rotation.y = -0.4; crab.add(c);
    let peek = 3, out = 0;
    g.userData.anim = (t, dt) => {
      if((peek -= dt) < 0){ peek = 5 + Math.random()*4; out = 1.8; }
      if(out > 0) out -= dt;
      crab.userData.k = (crab.userData.k || 0) + ((out > 0 ? 1 : 0) - (crab.userData.k || 0))*Math.min(1, dt*5);
      const k = crab.userData.k; crab.position.set(0.35 + k*0.4, 0.2 + k*0.1, 0.1 + k*0.35); crab.scale.setScalar(0.3 + k*0.7);
    };
    g.userData.play = () => { out = 3; sfx.pop(); floatText(L('Привет!', 'Hi!'), g.localToWorld(new V3(0.8, 1.3, 0.4)), '#D9527E'); };
    return g;
  }
});
async function ocDecorPlay(s, o, quiet){
  homeSay(s, ...[['Красиво!', 'So pretty!'], ['Смотри!', 'Look!'], ['Ух ты!', 'Wow!']][Math.floor(Math.random()*3)]);
  if(o.userData.play) o.userData.play();
  await tween(1.6, k => s.nod = Math.sin(k*Math.PI*4)*0.12, ease.lin); s.nod = 0;
  if(!quiet){ sfx.arf(); burst(TEX.heart, headTop(s), 5, 1.2, 0.22); await wait(0.3); }
}

/* ---------- комната ---------- */
const OC = {made:false, life:null, res:[], pals:[], schools:[], vis:[], rays:[], sway:[], food:0, foodAt:new V3(), excite:0, lookT:6, fog:new THREE.Fog(0x3E8FC0, 30, 70), bg:new THREE.Color(0x2F7FB5), fog0:null, bg0:null, night:false, ripples:[]};
HOME_ROOMS.ocean = {root:ocRoot, pos:OC_POS, spot:[0.3, 0.7], view:ocView, ui:ocUi, tap:ocTap, tick:ocTick, wander:ocWander, leave:ocOff};
for(const [k, name, x, z, rot, stand, mk] of [
  ['oc1', L('Большое украшение', 'Big decoration'), -3.3, -6.2, 0.35, [-1.8, -2.6], 2.9],
  ['oc2', L('Сокровище', 'Treasure'),               0.2, -6.9, 0,     [-0.9, -2.5], 1.5],
  ['oc3', L('Садик на дне', 'Seabed garden'),       3.5, -6.0, -0.35, [1.8, -2.55], 2.0]
]) homeSlotAdd(k, {room:'ocean', name, floor:[x, z], rot, y:ocSeabed(x, z), stand, mk});
HOME_PLAY.oc1 = HOME_PLAY.oc2 = HOME_PLAY.oc3 = ocDecorPlay;
HOME_ROOMS.hall.tap = ocHallTap; HOME_ROOMS.hall.tick = ocHallTick;

function ocMake(){
  if(OC.made) return; OC.made = true;
  const G = ocRoot;
  // дно
  const sg = new THREE.PlaneGeometry(100, 64, 50, 32); sg.rotateX(-Math.PI/2);
  const p = sg.attributes.position;
  for(let i = 0; i < p.count; i++){ const x = p.getX(i), z = p.getZ(i) - 14; p.setZ(i, z); p.setY(i, ocSeabed(x, z)); }
  sg.computeVertexNormals();
  G.add(new THREE.Mesh(sg, toon(0xE9D3A8)));
  // вода позади
  const back = new THREE.Mesh(new THREE.PlaneGeometry(160, 70), new THREE.MeshBasicMaterial({map:OC_BACK_TEX, fog:false}));
  back.position.set(0, 10, -44); G.add(back); OC.back = back;
  // камни, водоросли, кораллы
  for(const [x, z, s] of [[-6.6, -6.2, 1.1], [5.9, -5.9, 0.9], [-2.6, -11.5, 1.6], [8.2, -12.5, 2], [-10.5, -9, 1.4], [3, -16, 2.4], [-7, -15, 2]]){
    const r = addOutline(new THREE.Mesh(new THREE.DodecahedronGeometry(s), toon(0x8FA3B8)), 1.04); r.scale.y = 0.6; r.position.set(x, ocSeabed(x, z) + s*0.2, z); r.rotation.y = x; G.add(r);
  }
  for(const [x, z, h, c] of [[-8.6, -7.2, 5.5, 0x4FA877], [-7.7, -8, 4.2, 0x6CC28C], [9.6, -7.2, 5, 0x4FA877], [10.4, -8.4, 6.2, 0x6CC28C], [-4, -13.5, 6.5, 0x4FA877], [6.4, -14.5, 7, 0x5DB57E], [-12.5, -12, 6, 0x6CC28C], [12.8, -11, 5.5, 0x4FA877], [-5.2, -8.4, 3.2, 0x5DB57E]]){
    const k = dvKelp(h, c); k.position.set(x, ocSeabed(x, z) - 0.1, z); G.add(k); OC.sway.push(k);
  }
  for(const [x, z, col] of [[-5, -9.5, 0xFF8FB0], [4.8, -8.6, 0xFFA36B], [-1.6, -9.6, 0xB69CF2], [7.2, -9.8, 0xFF7F9E], [-9.4, -11, 0xFFA36B], [1.4, -12, 0xFF8FB0]]){
    for(let i = 0; i < 4; i++){ const b = islBlob(G, col, 0.28, 0.36 + i*0.08, 0.28, x + Math.cos(i*1.7)*0.45, ocSeabed(x, z) + 0.2 + i*0.05, z + Math.sin(i*1.7)*0.35, 1.08); b.rotation.z = Math.cos(i)*0.4; }
  }
  // лучи света сверху
  for(const [x, z, r] of [[-7, -11, 0.25], [-2.5, -14, 0.18], [2.2, -10.5, 0.22], [6.8, -13, 0.28], [11, -15, 0.2]]){
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 18), new THREE.MeshBasicMaterial({map:OC_RAY_TEX, transparent:true, opacity:0.16, blending:THREE.AdditiveBlending, depthWrite:false, fog:false}));
    m.position.set(x, 8, z); m.rotation.z = r; G.add(m); OC.rays.push(m);
  }
  // пол: плитка, блики, снежный бортик
  const side = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(OC_R + 0.15, OC_R + 0.3, 0.95, 64), toon(0xD6EAF5)), 1.02); side.position.y = OC_Y - 0.47; G.add(side);
  const fm = toon(0xFFFFFF); fm.map = OC_FLOOR_TEX;
  const top = new THREE.Mesh(new THREE.CircleGeometry(OC_R + 0.02, 64), fm); top.rotation.x = -Math.PI/2; top.position.y = OC_Y + 0.002; G.add(top);
  const caus = new THREE.Mesh(new THREE.CircleGeometry(OC_R, 48), new THREE.MeshBasicMaterial({map:OC_CAUSTIC, transparent:true, opacity:0.3, blending:THREE.AdditiveBlending, depthWrite:false}));
  caus.rotation.x = -Math.PI/2; caus.position.y = OC_Y + 0.01; G.add(caus); OC.caus = caus;
  // стекло: задняя половина купола, рёбра рамы, блики
  const glass = new THREE.Mesh(new THREE.SphereGeometry(OC_R, 48, 20, Math.PI, Math.PI, 0, Math.PI/2), new THREE.MeshBasicMaterial({color:0xD8F4FF, transparent:true, opacity:0.1, depthWrite:false, side:THREE.DoubleSide}));
  glass.position.y = OC_Y; glass.renderOrder = 6; G.add(glass); OC.glass = glass;
  for(const [ph, w] of [[Math.PI + 0.55, 0.28], [Math.PI + 2.35, 0.18]]){
    const sh = new THREE.Mesh(new THREE.SphereGeometry(OC_R*0.99, 16, 10, ph, w, 0.35, 0.8), new THREE.MeshBasicMaterial({color:0xFFFFFF, transparent:true, opacity:0.16, depthWrite:false, side:THREE.DoubleSide}));
    sh.position.y = OC_Y; sh.renderOrder = 7; G.add(sh);
  }
  const frame = toon(0xF4F9FD);
  const arch = inkRing(new THREE.Mesh(new THREE.TorusGeometry(OC_R, 0.14, 10, 72, Math.PI), frame)); arch.position.y = OC_Y; G.add(arch);
  const base = inkRing(new THREE.Mesh(new THREE.TorusGeometry(OC_R, 0.1, 8, 64, Math.PI), frame)); base.rotation.x = -Math.PI/2; base.position.y = OC_Y + 0.05; G.add(base);
  const e = 0.72, mid = inkRing(new THREE.Mesh(new THREE.TorusGeometry(OC_R*Math.cos(e), 0.06, 8, 56, Math.PI), frame)); mid.rotation.x = -Math.PI/2; mid.position.y = OC_Y + OC_R*Math.sin(e); G.add(mid);
  for(const a of [-1.0, -0.33, 0.33, 1.0]){ const rib = inkRing(new THREE.Mesh(new THREE.TorusGeometry(OC_R, 0.06, 8, 28, Math.PI/2), frame)); rib.rotation.y = Math.PI/2 - a; rib.position.y = OC_Y; G.add(rib); }
  // арка обратно в прихожую: ледяная стенка с проёмом
  { const g = new THREE.Group(), [x, z] = ocAt(OC_DOOR_A, OC_R - 0.05); g.position.set(x, OC_Y, z); g.rotation.y = -OC_DOOR_A; G.add(g);
    islBox(g, 0xDDEFFA, 2.1, 2.1, 0.7, 0, 1.05, -0.25);
    const sh = new THREE.Shape(); sh.moveTo(-0.6, 0); sh.lineTo(-0.6, 0.75); sh.absarc(0, 0.75, 0.6, Math.PI, 0, true); sh.lineTo(0.6, 0); sh.closePath();
    const hole = new THREE.Mesh(new THREE.ShapeGeometry(sh, 16), new THREE.MeshBasicMaterial({color:0x8FB7D6})); hole.position.z = 0.11; g.add(hole);
    const fr = inkRing(new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.12, 10, 28, Math.PI), frame)); fr.position.set(0, 0.75, 0.13); g.add(fr);
    for(const sd of [-1, 1]) islCyl(g, 0xF4F9FD, 0.12, 0.12, 0.75, sd*0.62, 0.375, 0.13, 10, 1.1);
    const lbl = new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTex('🏠'), transparent:true, depthWrite:false})); lbl.scale.setScalar(0.55); lbl.position.set(0, 1.75, 0.2); g.add(lbl);
    g.userData.oc = 'door'; OC.door = g; }
  // кормушка у стекла
  { const g = new THREE.Group(); g.position.set(OC_FEED[0], OC_Y, OC_FEED[1]); G.add(g);
    islCyl(g, 0xFFFDF8, 0.1, 0.12, 1.2, 0, 0.6, 0, 12, 1.1);
    const f = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.45, 16, 1, true), toon(0xFF9BB8)), 1.06); f.rotation.x = Math.PI; f.position.y = 1.35; f.material.side = THREE.DoubleSide; g.add(f);
    islBox(g, 0xFFD66B, 0.5, 0.3, 0.4, 0, 0.15, 0.3);
    const ic = new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTex('🍤'), transparent:true, depthWrite:false})); ic.scale.setScalar(0.5); ic.position.set(0, 1.95, 0); g.add(ic); g.userData.ic = ic;
    g.userData.oc = 'feed'; OC.feeder = g; }
  // люк в полу: прямо в бухту
  { const g = new THREE.Group(); g.position.set(OC_HATCH[0], OC_Y, OC_HATCH[1]); G.add(g);
    const w = new THREE.Mesh(new THREE.CircleGeometry(0.6, 32), new THREE.MeshBasicMaterial({color:0x3E8FC0})); w.rotation.x = -Math.PI/2; w.position.y = 0.015; g.add(w);
    const rg = inkRing(new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.1, 10, 32), toon(0xB8C6D6))); rg.rotation.x = -Math.PI/2; rg.position.y = 0.05; g.add(rg);
    const rp = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.26, 24), new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:0.6, depthWrite:false})); rp.rotation.x = -Math.PI/2; rp.position.y = 0.03; g.add(rp); g.userData.rp = rp;
    const ic = new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTex('🤿'), transparent:true, depthWrite:false})); ic.scale.setScalar(0.5); ic.position.set(0, 0.8, 0); g.add(ic); g.userData.ic = ic;
    g.userData.oc = 'hatch'; OC.hatch = g; }
  // две стайки
  for(const [n, col, ph, sp, sz] of [[22, 0x9CC7E0, 0, 1, 0.9], [14, 0xFFD66B, 2.4, 1.25, 0.75]]){
    const fill = new THREE.InstancedMesh(OC_FISH_GEO.fill, toon(col), n), eyes = new THREE.InstancedMesh(OC_FISH_GEO.eyes, inkMat, n), ol = new THREE.InstancedMesh(OC_FISH_GEO.ol, outlineMat, n);
    for(const m of [fill, eyes, ol]){ m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); G.add(m); }
    const off = [], sc = [];
    for(let i = 0; i < n; i++){ off.push(new V3((Math.random() - 0.5)*3.2, (Math.random() - 0.5)*1.3, (Math.random() - 0.5)*2)); sc.push(new V3()); }
    OC.schools.push({n, fill, eyes, ol, off, sc, ph, sp, sz, t:Math.random()*50, pos:new V3(), yaw:0, boost:0, P:off.map(() => new V3())});
  }
  OC.life = new THREE.Group(); G.add(OC.life);
}

/* ---------- кто живёт за стеклом ---------- */
function ocResList(){
  const out = [];
  for(const id of save.sea.got){ const d = seaDef(id); if(d) out.push({key:'sea:' + id, name:d.name, fact:d.fact, make:() => makeSeaFish(d), sc:1.7}); }
  for(const id of save.adv.fish){ const d = fishDef(id); if(d) out.push({key:'run:' + id, name:d.name, fact:L(`Из приключения «${LEVELS[d.lv] ? levelName(d.lv) : ''}» ♡`, `From the «${LEVELS[d.lv] ? levelName(d.lv) : ''}» adventure ♡`), make:() => makeRunFish(d), sc:1.6}); }
  return out;
}
// жители бухты: где сидят у стекла (glass — прилипла к стеклу: угол и высота-угол), walk — ходит, fl — плавает наверху
const OC_PAL = {
  starfish:{glass:[0.62, 0.8], s:1.0}, crab:{at:[-1.4, -5.4], walk:3.2, s:1.0}, urchin:{at:[-5.4, -6.3], s:0.95},
  anemone:{at:[5.9, -5.9], rock:0.75, s:1.0}, jelly:{at:[-3.4, -8.5], fl:4.6, s:0.9, n:3}, octopus:{at:[2.4, -9.6], s:0.85}
};
function ocPopulate(){
  const L0 = OC.life; while(L0.children.length) L0.remove(L0.children[0]);
  OC.res = []; OC.pals = []; OC.vis = [];
  const seen = new Set(save.home.oc), fresh = [];
  ocResList().forEach((d, i) => {
    const o = d.make(); o.scale.setScalar(d.sc); L0.add(o);
    const pos = new V3(-9 + (i*5.3) % 18, 1.2 + (i*1.7) % 4, -6 - (i*2.3) % 6);
    const r = {...d, o, pos, vel:new V3(), tgt:null, yaw:0, sp:0.9 + (i % 4)*0.18, look:0, flip:0, ph:i*1.3};
    o.userData.ocRes = r; OC.res.push(r);
    if(!seen.has(d.key)) fresh.push(r);
  });
  for(const id of (save.dive.tank || []).filter(p => OC_PAL[p])){
    const P = OC_PAL[id], n = P.n || 1;
    for(let j = 0; j < n; j++){
      const o = DV_MAKE[id](); o.traverse(c => { if(c.isSprite) c.visible = false; }); o.scale.setScalar(P.s*(j ? 0.6 : 1)); L0.add(o);
      const pal = {id, key:'pal:' + id, o, P, j, name:dvDef(id).ic + ' ' + dvDef(id).name, fact:dvDef(id).fact};
      if(P.glass){
        const [a, e] = P.glass, r = OC_R + 0.12; o.position.set(Math.sin(a)*Math.cos(e)*r, OC_Y + Math.sin(e)*r, -Math.cos(a)*Math.cos(e)*r);
        ocRoot.updateMatrixWorld(true); o.lookAt(OC_POS.clone().add(new V3(0, OC_Y + 1, 0))); if(o.children[0]) o.children[0].rotation.x = 0;
      } else {
        const x = P.at[0] + j*1.6, z = P.at[1] - j*1.1; o.position.set(x, P.fl ? P.fl - j*0.8 : ocSeabed(x, z) + (P.rock || 0), z);
      }
      if(id === 'jelly' && OC.night){ const gl = glow(0xFFC8E0, 2.2); o.add(gl); }
      pal.base = o.position.clone(); o.userData.ocRes = pal; OC.pals.push(pal);
      if(!j && !seen.has(pal.key)) fresh.push(pal);
    }
  }
  // гости: акула-подружка, черепаха, Клякса, гость дня
  const vis = (k, o, v) => { L0.add(o); const V = {k, o, t:v.t0, ...v}; o.userData.ocRes = V; o.visible = false; OC.vis.push(V); return V; };
  if(save.dive.shark.friend){ const o = DV_MAKE.shark(); o.scale.setScalar(1.1); vis('shark', o, {t0:7, every:38, y:2.4, z:-9, v:2.2, name:L('🦈 Акула-подружка', '🦈 Shark friend'), fact:L('Акула-подружка машет тебе плавником! ♡', 'Your shark friend waves a fin at you! ♡'), look:save.dive.shark.tooth > 1}); }
  if(save.dive.turt){ const o = DV_MAKE.turtle(); o.scale.setScalar(1.3); vis('turtle', o, {t0:18, every:52, y:4.6, z:-12.5, v:1.1, name:dvDef('turtle').ic + ' ' + dvDef('turtle').name, fact:dvDef('turtle').fact}); }
  { const id = dvGuest(), d = dvDef(id), known = save.dive.seen.includes(id), o = DV_MAKE[id](); o.traverse(c => { if(c.isSprite) c.visible = false; }); o.scale.setScalar(1.5);
    vis('guest', o, {t0:12, every:64, y:id === 'otter' ? 6.5 : 5.2, z:-21, v:1.4, name:known ? `${d.ic} ${d.name}` : L('Кто-то большой…', 'Someone big…'),
      fact:known ? L(`Гость дня: ${d.ic} ${d.name}. Сегодня плавает в бухте!`, `Guest of the day: ${d.ic} ${d.name}. It is swimming in the bay today!`)
        : L('Вдалеке плывёт гость дня! Нырни в бухту 🤿 и сфотографируй его', 'The guest of the day is swimming far away! Dive into the bay 🤿 and take its photo')}); }
  if(save.dive.gloom.st >= 3){
    const o = glOctoModel(); o.scale.setScalar(0.75); o.position.set(-6.6, ocSeabed(-6.6, -6.2) + 0.85, -6.2); L0.add(o);
    const gl = glow(0xD8C8FF, 3); gl.position.y = 0.7; gl.visible = OC.night; o.add(gl);
    const B = {key:'blot', o, name:L('🐙 Клякса', '🐙 Blot'), fact:OC.night ? L('Клякса светит тебе в темноте ✨', 'Blot shines for you in the dark ✨') : L('Клякса живёт на камушке. Ночью она светится!', 'Blot lives on a little rock. At night she glows!'), base:o.position.clone(), blot:true};
    o.userData.ocRes = B; OC.pals.push(B);
  }
  return fresh;
}

/* ---------- покадрово ---------- */
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new V3();
const OC_ZMAX = -(OC_R + 0.7);   // рыбкам ближе нельзя: там стекло
function ocTick(t, dt){
  if(!OC.made) return;
  const d = camera.position.distanceTo(OC_POS); OC.fog.near = d + 4; OC.fog.far = d + 42;
  OC_CAUSTIC.offset.set(t*0.02, t*0.013); OC.caus.material.opacity = 0.16 + Math.sin(t*0.8)*0.05;
  OC.rays.forEach((m, i) => m.material.opacity = 0.12 + Math.sin(t*0.5 + i*1.7)*0.06);
  OC.sway.forEach(k => { const ph = k.userData.ph; k.userData.pivs.forEach((p, i) => p.rotation.z = Math.sin(t*1.1 + ph + i*0.55)*0.075); });
  const hp_ = OC.hatch.userData; hp_.rp.scale.setScalar(1 + (t*0.6 % 1)*1.6); hp_.rp.material.opacity = 0.6*(1 - t*0.6 % 1); hp_.ic.position.y = 0.8 + Math.sin(t*2.5)*0.08;
  OC.feeder.userData.ic.position.y = 1.95 + Math.sin(t*2.5 + 1)*0.08;
  const hungry = save.home.fed !== homeDay();
  if(OC.food > 0) OC.food -= dt;
  if(OC.excite > 0) OC.excite -= dt;
  const pace = (hungry && OC.food <= 0 ? 0.55 : 1) + (OC.excite > 0 ? 0.8 : 0);
  // стайки: центр плывёт по петле, все поворачивают разом; кормим — к корму; стукнули в стекло — брызгают в стороны
  for(const S of OC.schools){
    if(S.boost > 0) S.boost -= dt;
    S.t += dt*S.sp*pace*(1 + (S.boost > 0 ? 1.5 : 0));
    const path = (u, out) => out.set(Math.sin(u*0.11 + S.ph)*8.5, 2.7 + Math.sin(u*0.23 + S.ph)*1.3, -9 + Math.cos(u*0.15 + S.ph*2)*2.6);
    const c = path(S.t, new V3()), c2 = path(S.t + 0.3, new V3()), dir = c2.clone().sub(c);
    if(OC.food > 0) c.lerp(OC.foodAt, Math.min(1, OC.food, 0.8));
    S.pos.lerp(c, Math.min(1, dt*2));
    const yaw = Math.atan2(-dir.z, dir.x); S.yaw += Math.atan2(Math.sin(yaw - S.yaw), Math.cos(yaw - S.yaw))*Math.min(1, dt*3);
    const cy = Math.cos(S.yaw), sy = Math.sin(S.yaw);
    for(let i = 0; i < S.n; i++){
      const o = S.off[i], sc = S.sc[i], p = S.P[i];
      sc.multiplyScalar(Math.exp(-dt*1.1));
      p.set(S.pos.x + o.x*cy + o.z*sy + sc.x, S.pos.y + o.y + Math.sin(t*2 + i)*0.08 + sc.y, S.pos.z - o.x*sy + o.z*cy + sc.z);
      p.z = Math.min(p.z, OC_ZMAX);
      _e.set(0, S.yaw + Math.sin(t*3 + i)*0.15 + (sc.lengthSq() > 0.3 ? Math.atan2(-sc.z, sc.x) - S.yaw : 0)*0.6, Math.sin(t*2 + i)*0.08); _q.setFromEuler(_e);
      _m4.compose(p, _q, _s.setScalar(S.sz)); S.fill.setMatrixAt(i, _m4); S.eyes.setMatrixAt(i, _m4); S.ol.setMatrixAt(i, _m4);
    }
    S.fill.instanceMatrix.needsUpdate = S.eyes.instanceMatrix.needsUpdate = S.ol.instanceMatrix.needsUpdate = true;
  }
  // рыбки-жители: бродят сами; одна подплывает к стеклу посмотреть на малыша
  OC.lookT -= dt;
  if(OC.lookT < 0 && OC.res.length){ OC.lookT = 8 + Math.random()*6; const r = OC.res[Math.floor(Math.random()*OC.res.length)]; if(!r.look) r.look = 4; }
  const pupL = petSeal ? petSeal.root.position.clone().sub(OC_POS) : new V3();
  for(const r of OC.res){
    let tgt;
    if(OC.food > 0) tgt = OC.foodAt.clone().add(new V3(Math.sin(r.ph)*1.2, Math.cos(r.ph*1.7)*0.6, Math.cos(r.ph)*0.8));
    else if(r.look > 0){ const a = Math.atan2(pupL.x, -pupL.z) || 0; tgt = new V3(Math.sin(a)*(OC_R + 0.9), 1.5 + Math.sin(r.ph)*0.4, -Math.cos(a)*(OC_R + 0.9)); tgt.z = Math.min(tgt.z, OC_ZMAX); }
    else { if(!r.tgt || r.tgt.distanceTo(r.pos) < 0.6) r.tgt = new V3(-10 + Math.random()*20, 0.8 + Math.random()*4.6, -5.6 - Math.random()*7); tgt = r.tgt; }
    const dv = tgt.clone().sub(r.pos), l = dv.length(), near = r.look > 0 && l < 0.5;
    r.vel.lerp(l > 0.05 ? dv.multiplyScalar(Math.min(1, l)*r.sp*pace*1.4/l) : new V3(), Math.min(1, dt*2));
    r.pos.addScaledVector(r.vel, dt); r.pos.z = Math.min(r.pos.z, OC_ZMAX);
    if(near){
      r.yaw += Math.atan2(Math.sin(-Math.PI/2 - r.yaw), Math.cos(-Math.PI/2 - r.yaw))*Math.min(1, dt*4);   // лицом к нам
      r.look -= dt;
      if(!r.said){ r.said = true; const at = ocRoot.localToWorld(r.pos.clone().add(new V3(0, 0.7, 0)));
        if(r.newbie){ r.newbie = false; burst(TEX.star, at, 10, 1.6, 0.26); sfx.sparkle(); floatText(L(`Привет! Я ${r.name}`, `Hi! I am ${r.name}`), at, '#D9527E'); }
        else burst(TEX.heart, at, 3, 0.8, 0.2); }
      if(r.look <= 0){ r.look = 0; r.said = false; }
    } else if(r.vel.lengthSq() > 0.01){ const y = Math.atan2(-r.vel.z, r.vel.x); r.yaw += Math.atan2(Math.sin(y - r.yaw), Math.cos(y - r.yaw))*Math.min(1, dt*4); }
    if(r.flip > 0) r.flip = Math.max(0, r.flip - dt*1.5);
    r.o.position.copy(r.pos); r.o.rotation.set((1 - r.flip)*Math.PI*2*(r.flip > 0 ? 1 : 0), r.yaw + Math.sin(t*6 + r.ph)*0.08, 0);
  }
  // жители бухты
  for(const p of OC.pals){
    const o = p.o, b = p.base;
    if(p.blot){ o.position.y = b.y + Math.sin(t*1.5)*0.06; continue; }
    if(p.P.walk) o.position.x = b.x + Math.sin(t*0.45 + p.j)*p.P.walk;
    else if(p.P.fl){ o.position.y = b.y + Math.sin(t*0.9 + p.j*2)*0.5; o.position.x = b.x + Math.sin(t*0.2 + p.j)*1.2; o.scale.y = o.scale.x*(1 + Math.sin(t*3 + p.j)*0.08); }
    else if(!p.P.glass) o.rotation.y = Math.sin(t*0.5 + p.j)*0.3;
    if(o.userData.tents) o.userData.tents.rotation.y = Math.sin(t)*0.2;
  }
  // гости проплывают мимо
  for(const V of OC.vis){
    V.t -= dt;
    if(!V.on){ if(V.t < 0){ V.on = true; V.dir = V.dir === 1 ? -1 : 1; V.x = -V.dir*24; V.stop = V.look ? 2.6 : 0; V.o.visible = true; } continue; }
    const o = V.o, fl = o.userData.fl;
    if(V.stop > 0 && Math.abs(V.x) < 0.5){   // акула у стекла машет хвостом
      V.stop -= dt; o.position.set(0, V.y, OC_ZMAX - 0.9); o.rotation.y += (-Math.PI/2 - o.rotation.y)*Math.min(1, dt*3);
      if(fl) fl[0].rotation.y = Math.sin(t*10)*0.6;
      if(!V.said){ V.said = true; sfx.shark && sfx.shark(); floatText(L('Привет, доктор! ♡', 'Hi, doctor! ♡'), ocRoot.localToWorld(new V3(0, V.y + 1.2, OC_ZMAX)), '#3E8DB8'); }
      continue;
    }
    V.x += V.dir*V.v*dt*(V.scare > 0 ? 2 : 1); if(V.scare > 0) V.scare -= dt;
    o.position.set(V.x, V.y + Math.sin(t*0.8)*0.3, V.z); o.rotation.y = V.dir > 0 ? 0 : Math.PI;
    if(fl) fl.forEach((f, i) => f.rotation.y = Math.sin(t*4 + i)*0.4);
    if(Math.abs(V.x) > 25){ V.on = false; V.said = false; V.t = V.every; o.visible = false; }
  }
  // круги на стекле
  for(let i = OC.ripples.length - 1; i >= 0; i--){ const R = OC.ripples[i]; R.k += dt*1.4; R.sp.scale.setScalar(0.3 + R.k*1.6); R.sp.material.opacity = Math.max(0, 1 - R.k); if(R.k >= 1){ R.sp.parent.remove(R.sp); R.sp.material.dispose(); OC.ripples.splice(i, 1); } }
}

/* ---------- касания ---------- */
function ocRay(cx, cy){
  const rect = canvas.getBoundingClientRect();
  ndc.set((cx - rect.left)/rect.width*2 - 1, -((cy - rect.top)/rect.height)*2 + 1); ray.setFromCamera(ndc, camera);
}
function ocTap(cx, cy){
  ocRay(cx, cy);
  const hit = ray.intersectObjects([OC.door, OC.feeder, OC.hatch], true)[0];
  if(hit){ let o = hit.object; while(o && !o.userData.oc) o = o.parent;
    const k = o && o.userData.oc; if(k === 'door') return ocBack(); if(k === 'feed') return ocFeed(); if(k === 'hatch') return ocDive(); }
  // житель: попали в него или рядом на экране
  const all = [...OC.res, ...OC.pals, ...OC.vis.filter(V => V.on)];
  const h2 = ray.intersectObjects(all.map(r => r.o), true)[0];
  let who = null;
  if(h2){ let o = h2.object; while(o && !o.userData.ocRes) o = o.parent; who = o && o.userData.ocRes; }
  if(!who){ let bd = 42; for(const r of all){ const q = toScreen(r.o.getWorldPosition(new V3())), dd = Math.hypot(q.x - cx, q.y - cy); if(dd < bd){ bd = dd; who = r; } } }
  if(who){
    sfx.pop(); floatText(who.name, who.o.getWorldPosition(new V3()).add(new V3(0, 0.9, 0)), '#D9527E');
    if(who.fact) toast(who.fact, 4200);
    if(who.flip !== undefined) who.flip = 1;
    return;
  }
  const g = ray.intersectObject(OC.glass)[0];
  if(g) ocKnock(g.point);
}
// тук-тук по стеклу: круги, стайки брызгают в стороны, малыш прижимается носом
function ocKnock(pw){
  sfx.tap(); setTimeout(() => sfx.tap(), 140);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:OC_RING_TEX, transparent:true, depthWrite:false, depthTest:false})); sp.renderOrder = 9;
  sp.position.copy(pw).sub(OC_POS); ocRoot.add(sp); OC.ripples.push({sp, k:0});
  const pl = pw.clone().sub(OC_POS);
  for(const S of OC.schools){ S.boost = 1.2; for(let i = 0; i < S.n; i++){ const d = S.P[i].clone().sub(pl), l = d.length(); if(l < 6) S.sc[i].add(d.setY(d.y*0.5).normalize().multiplyScalar((6 - l)*0.9)); } }
  for(const r of OC.res){ const d = r.pos.clone().sub(pl); if(d.length() < 5){ r.look = 0; r.tgt = r.pos.clone().add(d.normalize().multiplyScalar(4)); r.tgt.z = Math.min(r.tgt.z, OC_ZMAX - 1); r.vel.add(d.multiplyScalar(2)); } }
  for(const V of OC.vis) if(V.on && V.stop <= 0) V.scare = 1.5;
  if(!busy && petSeal){ (async () => {
    setBusy(true); const s = petSeal, a = Math.atan2(pl.x, -pl.z);
    await homeGo([Math.sin(a)*(OC_R - 0.8), -Math.cos(a)*(OC_R - 0.8)]); await faceTo(s, pw);
    squash(s, 0.2, 0.3); homeSay(s, 'Тук-тук!', 'Knock-knock!', '#3E8DB8');
    await wait(0.6); setBusy(false);
  })(); }
}
async function ocFeed(){
  if(busy) return; setBusy(true); homeIdleT = 12;
  const s = petSeal, first = save.home.fed !== homeDay();
  await homeGo([OC_FEED[0] - 0.9, OC_FEED[1] + 0.5]); await faceTo(s, OC.feeder.getWorldPosition(new V3()));
  await tween(0.25, k => { s.flippers[1].userData.up = k*0.9; }); sfx.ding();
  await tween(0.25, k => { s.flippers[1].userData.up = (1 - k)*0.9; });
  save.home.fed = homeDay(); persist();
  homeSay(s, 'Кушать подано!', 'Dinner time!', '#D9527E');
  const a = Math.atan2(OC_FEED[0], -OC_FEED[1]); OC.foodAt.set(Math.sin(a)*(OC_R + 1.6), 3.2, -Math.cos(a)*(OC_R + 1.6)); OC.foodAt.z = Math.min(OC.foodAt.z, OC_ZMAX - 0.6);
  OC.food = 6; OC.excite = 8;
  for(let i = 0; i < 18; i++){
    emit(FEED_TEX, ocRoot.localToWorld(OC.foodAt.clone().add(new V3((Math.random() - 0.5)*1.4, 2.6 + Math.random(), (Math.random() - 0.5)*0.8))), {v:new V3(0, -0.7 - Math.random()*0.3, 0), life:4, size:0.13 + Math.random()*0.05});
    if(i % 5 === 0) sfx.tap();
    await wait(0.05);
  }
  await wait(2.2); sfx.chomp(); floatText(L('Ням! ♡', 'Yum! ♡'), ocRoot.localToWorld(OC.foodAt.clone().add(new V3(0, 1, 0))), '#D9527E');
  await wait(1.2);
  if(first){
    addShells(HOME_FEED, {x:innerWidth/2, y:innerHeight*0.45}); petGive(2); sfx.star();
    toast(L(`Все рыбки сыты и довольны! +${HOME_FEED} 🐚`, `All the fish are full and happy! +${HOME_FEED} 🐚`), 2600);
  } else toast(L('Рыбки уже обедали сегодня, но всё равно рады ♡', 'The fish already ate today, but they are happy anyway ♡'), 2600);
  setBusy(false); homeUi();
}
async function ocDive(){
  if(busy) return;
  const i = typeof stGate === 'function' ? stGate('dive') : -1;
  if(i >= 0){ sfx.bad(); return toast(stGateSay(i), 3000); }
  setBusy(true);
  const s = petSeal;
  await homeGo([OC_HATCH[0] - 1.1, OC_HATCH[1] - 0.3]);
  homeSay(s, 'Ныряем!', 'Dive in!', '#3E8DB8');
  await hopTo(s, OC.hatch.getWorldPosition(new V3()).add(new V3(0, -0.2, 0)), 0.9, 0.6);
  sfx.splash(); burst(TEX.puff, s.root.position.clone(), 10, 1.6, 0.45);
  await wait(0.3); setBusy(false);
  stGo('dive');
}

/* ---------- из прихожей в океанариум и обратно ---------- */
function ocOn(){
  ocMake(); OC.night = ocNight();
  const fresh = ocPopulate();
  ocRoot.visible = true; homeRoot.visible = false;
  OC.fog0 = scene.fog; OC.bg0 = scene.background;
  OC.fog.color.setHex(OC.night ? 0x1F4A74 : 0x3E8FC0); OC.bg.setHex(OC.night ? 0x173C63 : 0x2F7FB5);
  OC.back.material.color.setHex(OC.night ? 0x5A6E9E : 0xFFFFFF);
  scene.fog = OC.fog; scene.background = OC.bg;
  $('#homeDim').classList.remove('on'); document.body.classList.add('ocean-on');
  return fresh;
}
function ocOff(){
  ocRoot.visible = false; document.body.classList.remove('ocean-on');
  if(scene.fog === OC.fog){ scene.fog = OC.fog0; scene.background = OC.bg0; }
}
async function ocGo(){
  if(busy || !mgRoot.hidden || !ocBuilt() || homeRoom !== 'hall') return;
  setBusy(true); homeEdit = false; homeIdleT = 12;
  const s = petSeal;
  if(s.sleeping) await petWake();
  await homeGo(ocAt(OC_HALL_A, HOME_R - 1.3)); await waddleTo(s, hp(...ocAt(OC_HALL_A, HOME_R - 0.4)), 0.45);
  sfx.whoosh(); flash();
  homeRoom = 'ocean'; const fresh = ocOn();
  s.root.position.copy(hp(...ocAt(OC_DOOR_A, OC_R - 0.5))); s.root.rotation.set(0, 0, 0);
  camFocus.yaw = 0; homeView(true); homeUi();
  await wait(0.35);
  await waddleTo(s, hp(-1.3, -2.2), 1.1); await turnTo(s, Math.PI + 0.4, 0.3);   // сбоку: не заслоняет середину дна
  const first = save.home.rooms.ocean !== 2;
  sfx.arf(); s.happyUntil = now + 3; setMood(s, 'happy'); hop(s, 0.3, 0.4);
  floatText(L('Ух ты!', 'Wow!'), headTop(s), '#D9527E');
  if(first){ save.home.rooms.ocean = 2; renderHomeBtn(); }
  // новенькие подплывают к стеклу знакомиться
  fresh.slice(0, 4).forEach((r, i) => { if(r.look !== undefined){ r.look = 5 + i*1.5; r.newbie = true; } });
  save.home.oc = [...new Set([...save.home.oc, ...OC.res.map(r => r.key), ...OC.pals.filter(p => p.key && p.key !== 'blot').map(p => p.key)])].slice(-160);
  persist();
  const n = OC.res.length + OC.pals.length;
  if(first) toast(L(`Океанариум! За стеклом — настоящее море. Коснись стекла — рыбки брызнут в стороны. 🍤 — покормить, люк — прямо в бухту 🤿`, `The oceanarium! Behind the glass is the real sea. Tap the glass and the fish scatter. 🍤 feeds them, the hatch leads right into the bay 🤿`), 6500);
  else if(fresh.length) toast(L(`В океанариуме новенькие: ${fresh.slice(0, 4).map(r => r.name).join(', ')} ✨`, `New in the oceanarium: ${fresh.slice(0, 4).map(r => r.name).join(', ')} ✨`), 4200);
  else if(save.home.fed !== homeDay()) toast(L('Рыбки проголодались — нажми на кормушку 🍤', 'The fish are hungry — tap the feeder 🍤'), 3200);
  else if(!n) toast(L('Пока тут плавают только стайки. Рыбачь, спасай рыбок и ныряй в бухту — новые жители приплывут сюда!', 'Only the schools of fish live here so far. Go fishing, save fish and dive in the bay — new friends will swim here!'), 5200);
  setBusy(false);
}
async function ocBack(){
  if(busy || homeRoom !== 'ocean') return;
  setBusy(true); homeEdit = false; homeIdleT = 12;
  const s = petSeal;
  await homeGo(ocAt(OC_DOOR_A, OC_R - 1.3)); await waddleTo(s, hp(...ocAt(OC_DOOR_A, OC_R - 0.4)), 0.45);
  sfx.whoosh(); flash();
  ocOff(); homeRoom = 'hall'; homeRoot.visible = true; scene.fog = null;
  if(!homeLight) $('#homeDim').classList.add('on');
  s.root.position.copy(hp(...ocAt(OC_HALL_A, HOME_R - 0.5))); camFocus.yaw = 0; homeView(true); homeUi();
  await wait(0.3);
  await waddleTo(s, hp(HOME_SPOT[0], HOME_SPOT[1]), 1.0); await turnTo(s, 0, 0.3);
  setBusy(false);
}
function ocRoomGo(){ if(homeRoom === 'hall') ocGo(); else ocBack(); }
function ocRoomBtn(b){
  if(!b) return;
  b.hidden = !ocBuilt();
  const hall = homeRoom === 'hall';
  b.querySelector('.face').textContent = hall ? '🐠' : '🏠';
  b.querySelector('.name').textContent = hall ? L('Океанариум', 'Oceanarium') : L('Прихожая', 'Hallway');
}
function ocView(instant){
  const portrait = innerWidth < innerHeight, c = hp(0, -1.4, 1.4), size = portrait ? 8.6 : 10.5, lift = portrait ? -2.2 : -0.8, up = 0.38;
  if(!instant) return camGlide(c, size, 0.6, lift, up);
  focusCam(c, size, lift, up); camFocus.k = 1;
}
function ocUi(){
  const n = OC.res.length + OC.pals.length, dec = roomSlots(), m = dec.filter(k => homeItems[k]).length;
  $('#homeName').textContent = L('🐠 Океанариум', '🐠 Oceanarium');
  $('#homeHint').textContent = homeEdit ? L('Нажми на ✏️ или ➕ на дне — выбери украшение', 'Tap ✏️ or ➕ on the seabed to choose a decoration')
    : save.home.fed !== homeDay() ? L('Рыбки проголодались — нажми на кормушку 🍤', 'The fish are hungry — tap the feeder 🍤')
    : L('Коснись стекла или жителя. Люк 🤿 — прямо в бухту', 'Tap the glass or a sea friend. The hatch 🤿 leads to the bay');
  $('#homeCount').textContent = L(`Жителей: ${n} · Украшения: ${m} из ${dec.length}`, `Sea friends: ${n} · Decorations: ${m} of ${dec.length}`);
  homeEditUi();
}
async function ocWander(){
  const opts = roomSlots().filter(k => homeItems[k]);
  if(opts.length && Math.random() < 0.4) return homePlay(opts[Math.floor(Math.random()*opts.length)], true);
  setBusy(true);
  const s = petSeal, a = (Math.random() - 0.5)*1.8;
  await homeGo([Math.sin(a)*(OC_R - 1.0), -Math.cos(a)*(OC_R - 1.0)]);
  await faceTo(s, hp(Math.sin(a)*(OC_R + 2), -Math.cos(a)*(OC_R + 2)));
  const r = OC.res[Math.floor(Math.random()*OC.res.length)]; if(r && !r.look) r.look = 4;
  homeSay(s, ...(Math.random() < 0.5 ? ['Рыбка!', 'Fishy!'] : ['Плыви сюда!', 'Come here!']));
  await tween(1.4, k => s.nod = Math.sin(k*Math.PI*4)*0.12, ease.lin); s.nod = 0;
  setBusy(false);
}

/* ---------- арка в прихожей: заложена → стройка → открыта ---------- */
function ocState(){ return ocLocked() && !ocBuilt() ? 'none' : ocBuilt() ? 'open' : save.home.build && save.home.build.id === 'ocean' ? 'build' : 'plan'; }
const OC_HALL = (() => {
  const g = new THREE.Group(), [x, z] = ocAt(OC_HALL_A, HOME_R*0.975); g.position.set(x, HOME_Y, z); g.rotation.y = -OC_HALL_A; homeRoot.add(g);
  const sh = new THREE.Shape(); sh.moveTo(-0.58, 0); sh.lineTo(-0.58, 0.72); sh.absarc(0, 0.72, 0.58, Math.PI, 0, true); sh.lineTo(0.58, 0); sh.closePath();
  const geo = new THREE.ShapeGeometry(sh, 16), uv = geo.attributes.uv;
  for(let i = 0; i < uv.count; i++) uv.setXY(i, (geo.attributes.position.getX(i) + 0.58)/1.16, geo.attributes.position.getY(i)/1.3);
  const hole = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({map:OC_BRICK_TEX})); hole.position.z = 0.02; g.add(hole);
  const fr = inkRing(new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.12, 10, 28, Math.PI), toon(0xF4F9FD))); fr.position.set(0, 0.72, 0.04); g.add(fr);
  for(const sd of [-1, 1]) islCyl(g, 0xF4F9FD, 0.12, 0.12, 0.72, sd*0.6, 0.36, 0.04, 10, 1.1);
  const mark = new THREE.Sprite(new THREE.SpriteMaterial({map:ocMarkTex('🐠'), transparent:true, depthWrite:false, depthTest:false})); mark.renderOrder = 8; mark.scale.setScalar(0.62); mark.position.set(0, 1.75, 0.2); g.add(mark);
  const site = new THREE.Group(); g.add(site);   // стройка: ледяные кирпичи и строитель
  for(const [bx, by, bz] of [[-0.75, 0.2, 0.55], [-0.35, 0.2, 0.7], [-0.55, 0.6, 0.62]]) islBox(site, 0xDDEFFA, 0.38, 0.38, 0.38, bx, by, bz);
  const cone = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.4, 12), toon(0xFFA552)), 1.08); cone.position.set(0.5, 0.2, 0.6); site.add(cone);
  g.userData = {hole, mark, site, st:'', builder:null, bt:0};
  return g;
})();
const OC_MARK_TEX = {plan:ocMarkTex('🐠'), build:emojiTex('🚧'), open:emojiTex('🐠')};
function ocHallUpd(){
  const U = OC_HALL.userData, st = ocState(); if(U.st === st) return; U.st = st;
  OC_HALL.visible = st !== 'none';
  U.hole.material.map = st === 'open' ? OC_HOLE_TEX : OC_BRICK_TEX; U.hole.material.needsUpdate = true;
  U.mark.material.map = OC_MARK_TEX[st] || OC_MARK_TEX.plan; U.mark.material.needsUpdate = true;
  U.site.visible = st === 'build';
  if(st === 'build' && !U.builder){
    let b;
    if(save.pt && save.pt.bear){ b = feBearMake(); b.scale.setScalar(0.34); const u = b.userData; if(u.shard) u.shard.visible = false; if(u.brows) u.brows.forEach(o => o.visible = false); }
    else { const p = makePenguin(PENG); b = p.root; b.scale.setScalar(0.5); }
    b.position.set(0.95, 0, 0.75); b.rotation.y = -0.5; U.site.add(b); U.builder = b;
  }
}
function ocHallTick(t, dt){
  ocHallUpd();
  const U = OC_HALL.userData;
  if(!OC_HALL.visible) return;
  const call = U.st === 'plan' || save.home.rooms.ocean === 1;
  U.mark.position.y = 1.75 + (call ? Math.abs(Math.sin(t*3))*0.15 : Math.sin(t*2)*0.05);
  if(U.builder) U.builder.position.y = Math.abs(Math.sin(t*4))*0.06;
  if(U.st === 'open' && (U.bt -= dt) < 0){ U.bt = 1.2 + Math.random(); emit(SOAP_TEX, OC_HALL.localToWorld(new V3((Math.random() - 0.5)*0.6, 0.3, 0.1)), {v:new V3(0, 0.5, 0.15), life:1.8, size:0.12}); }
}
function ocHallTap(cx, cy){
  if(!OC_HALL.visible) return;
  ocRay(cx, cy);
  const q = toScreen(OC_HALL.userData.mark.getWorldPosition(new V3()));
  if(!ray.intersectObject(OC_HALL, true).length && Math.hypot(q.x - cx, q.y - cy) > 44) return;
  const st = ocState();
  if(st === 'open') return ocGo();
  if(st === 'build'){
    if(ocReady()){ ocHallUpd(); return ocGo(); }
    sfx.tap(); return toast(L(`${ocWho()} строит океанариум! Приходи завтра — будет готово 🚧`, `${ocWho()} is building the oceanarium! Come back tomorrow — it will be ready 🚧`), 3400);
  }
  ocOrder();
}
// заказать стройку: окошко с ценой, как выбор мебели
async function ocOrder(){
  if(busy || !mgRoot.hidden) return;
  setBusy(true);
  camGlide(OC_HALL.getWorldPosition(new V3()).add(new V3(0, 0.9, 0)), 3.6, 0.6, 0.6, 0.45);
  mgOpen(L('🐠 Океанариум', '🐠 Oceanarium'));
  const who = ocWho(), need = OC_PRICE - save.shells;
  const panel = mgNode('div', 'mg-panel home-pick oc-order', `
    <p class="ttl display">🐠 ${L('Океанариум', 'Oceanarium')}</p>
    <p>${L(`${who} построит новую комнату: стеклянная стена прямо в море! Туда приплывут все, кого ты встретишь в бухте и поймаешь на рыбалке.`, `${who} will build a new room: a glass wall right into the sea! Everyone you meet in the bay and catch while fishing will swim there.`)}</p>
    <p class="wallet">${L('У тебя', 'You have')} <b>${save.shells}</b> 🐚</p>
    <div class="row"><button class="btn${need > 0 ? ' off' : ''}" id="ocBuy">${need > 0 ? L(`Не хватает ${need} 🐚`, `Need ${need} more 🐚`) : L(`Построить за ${OC_PRICE} 🐚`, `Build for ${OC_PRICE} 🐚`)}</button><button class="btn ghost" id="ocNo">${L('Потом', 'Later')}</button></div>`);
  const buy = panel.querySelector('#ocBuy');
  const res = await new Promise(r => {
    mgOn(buy, 'click', () => { if(save.shells < OC_PRICE){ sfx.bad(); wiggle(buy); return toast(L('Лечи пациентов в больнице — за них дают ракушки 🐚', 'Heal patients at the hospital — you get shells for them 🐚')); } r('ok'); });
    mgOn(panel.querySelector('#ocNo'), 'click', () => r('no'));
  });
  sfx.tap(); panel.classList.add('away'); await wait(0.25); mgClose();
  homeView(); setBusy(false);
  if(res !== 'ok') return;
  save.shells -= OC_PRICE; shellsShown = save.shells; renderShells();
  save.home.build = {id:'ocean', d:TEST ? '' : ocDay()}; persist();
  sfx.buy(); burst(TEX.star, OC_HALL.getWorldPosition(new V3()).add(new V3(0, 1, 0)), 14, 2, 0.3);
  ocHallUpd();
  if(TEST){ ocReady(); ocHallUpd(); toast(L('Готово! (в проверке строится сразу)', 'Done! (built at once in test mode)'), 2400); return; }
  toast(L(`${who} уже несёт льдинки! Приходи завтра — океанариум будет готов 🐠`, `${who} is already carrying ice blocks! Come back tomorrow — the oceanarium will be ready 🐠`), 4600);
}
// стройка закончилась (на следующий день): комната есть, на дне — коралловый садик в подарок
function ocReady(){
  const b = save.home.build;
  if(!b || b.id !== 'ocean' || b.d === ocDay()) return false;
  save.home.rooms.ocean = 1; save.home.build = null;
  if(!save.home.s.oc3) save.home.s.oc3 = 'oc_coral';
  persist(); ocCorner(); if(homeMode){ homeBuild(); homeUi(); renderHomeBtn(); } return true;
}
function ocAlert(){ return ocBuilt() ? save.home.rooms.ocean === 1 : !!(save.home.build && save.home.build.d !== ocDay()); }
async function ocHallNews(){
  const done = ocReady();
  if(save.home.rooms.ocean !== 1) return;
  if(done) homeBuild();
  await wait(2.6); if(!homeMode || homeRoom !== 'hall') return;
  sfx.star(); burst(TEX.star, OC_HALL.getWorldPosition(new V3()).add(new V3(0, 1.2, 0)), 14, 2, 0.3);
  toast(L(`${ocWho()} достроил океанариум! Нажми на арку 🐠 или кнопку внизу`, `${ocWho()} finished the oceanarium! Tap the arch 🐠 or the button below`), 4600);
  homeUi();
}
// снаружи иглу в уголке тоже растёт: рядом стеклянный купол с рыбкой
const OC_CORNER = (() => {
  const h = petCorner.userData.house, g = new THREE.Group(); g.position.set(-0.95, 0, -0.25);
  g.add(addOutline(new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 10, 0, Math.PI*2, 0, Math.PI/2), new THREE.MeshToonMaterial({color:0xBFE9F7})), 1.04));
  const f = new THREE.Sprite(new THREE.SpriteMaterial({map:emojiTex('🐠'), transparent:true, depthWrite:false})); f.scale.setScalar(0.34); f.position.set(0, 0.28, 0.5); g.add(f);
  g.visible = false; h.add(g); return g;
})();
function ocCorner(){ OC_CORNER.visible = ocBuilt(); }
ocReady(); ocCorner();
