/* ---------------- 🎲 Игровая: комната иглу для настольных игр (Спринт 7, задача 5) ----------------
   Каркас комнат — js/rooms.js (арка в прихожей, стройка, переходы). Здесь — сама комната: розовые обои со звёздочками,
   ковровый пол, гирлянда флажков под потолком, большой круглый стол: на нём лежат коробки всех игр, что есть (save.bg.got,
   js/boardgames.js) — касание по коробке сразу открывает выбор «с кем играть» (bgGo(id)), по столу — полку со всеми коробками.
   Если Пинг живёт по соседству, он сидит за столом и ждёт партию. На стене — «доска счёта»: сколько партий и побед.
   Три места (gm1…gm3) — пуфики, игрушки и плакаты: выбираются через «Обустроить», как мебель. Подарок при стройке — по одной вещи.
   Подключается после rooms.js, boardgames.js (bgGo), shift.js (makePenguin, PENG) и до homewalk.js. */
const GM_TABLE = [0, -0.5], GM_FRONT = [0, 0.95];   // стол и где стоит малыш, когда играет
// точка на куполе: угол от задней стенки и высота-угол, как у настенных мест мебели (home.js: slotPlace)
function rmWall(o, a, e, tilt = true, r = HOME_R*0.955){
  o.position.set(Math.sin(a)*Math.cos(e)*r, HOME_Y + Math.sin(e)*r, -Math.cos(a)*Math.cos(e)*r);
  o.rotation.set(tilt ? e : 0, -a, 0, 'YXZ'); return o;
}
const GM_WALL = canvasTex(256, (g, w, h) => {   // розовые обои: полоска и звёздочки
  g.fillStyle = '#FFD3E4'; g.fillRect(0, 0, w, h);
  for(let i = 0; i < 8; i++){ g.fillStyle = i % 2 ? '#FFC3DA' : '#FFDDEA'; g.fillRect(i*w/8, 0, w/8, h); }
  g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '26px "Segoe UI Symbol",sans-serif'; g.textAlign = 'center';
  for(let r = 0; r < 4; r++) for(let i = 0; i < 4; i++) g.fillText('★', (i + (r % 2 ? 0.5 : 0.2))*w/4 + 12, 40 + r*h/4);
}, 256);
GM_WALL.wrapS = THREE.RepeatWrapping; GM_WALL.repeat.set(2, 1);
const GM_FLOOR = canvasTex(256, (g, s) => {   // мягкий ковёр в шахматку
  const n = 8, c = s/n;
  for(let i = 0; i < n; i++) for(let j = 0; j < n; j++){ g.fillStyle = (i + j) % 2 ? '#B69CF2' : '#D9C8FA'; g.fillRect(i*c, j*c, c, c); }
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3; g.strokeRect(6, 6, s - 12, s - 12);
});
GM_FLOOR.wrapS = GM_FLOOR.wrapT = THREE.RepeatWrapping; GM_FLOOR.repeat.set(1.6, 1.6);
const GM = rmDefine('games', {
  shell:{wall:GM_WALL, floor:GM_FLOOR, side:0xE7D8FB, rim:0xFFF3FA}, spot:[-0.3, 1.5],
  cam:{c:[0.1, -0.5, 0.7], p:5.4, l:7, lift:-1.0, up:0.5},
  fill:gmFill, enter:gmEnter, tap:gmTap, tick:gmTick, ui:gmUi,
  gift:{gm1:'pouf_heart', gm2:'toys_chest', gm3:'post_dice'},
  first:() => L('Игровая! На столе лежат все твои игры. Нажми на коробку — сыграем 🎲', 'The game room! All your games are on the table. Tap a box to play 🎲'),
  boxes:[], flags:[], nb:-1, ping:null, board:null
});
for(const [k, name, x, z, rot, stand, mk] of [
  ['gm1', L('Пуфик', 'Pouf'),       -2.15, 0.45, 0.5,  [-1.15, 0.75], 0.9],
  ['gm2', L('Игрушки', 'Toys'),      2.25, 0.55, -0.4, [1.25, 0.85],  1.1]
]) homeSlotAdd(k, {room:'games', name, floor:[x, z], rot, stand, mk});
homeSlotAdd('gm3', {room:'games', name:L('Плакат', 'Poster'), wall:[0.85, 0.52], tilt:true, stand:[1.0, -1.15]});
FURN.push(
  {id:'pouf_heart', slot:'gm1', name:L('Пуфик-сердечко', 'Heart pouf'),  price:0},
  {id:'pouf_cloud', slot:'gm1', name:L('Пуфик-облачко', 'Cloud pouf'),   price:20},
  {id:'pouf_bear',  slot:'gm1', name:L('Пуф-мишка', 'Teddy pouf'),       price:30},
  {id:'toys_chest', slot:'gm2', name:L('Сундук с игрушками', 'Toy chest'), price:0},
  {id:'toys_tower', slot:'gm2', name:L('Башня из кубиков', 'Block tower'), price:25},
  {id:'toys_balls', slot:'gm2', name:L('Корзина с мячами', 'Ball basket'), price:25},
  {id:'post_dice',  slot:'gm3', name:L('Плакат с кубиками', 'Dice poster'), price:0},
  {id:'post_star',  slot:'gm3', name:L('Плакат со звездой', 'Star poster'), price:15},
  {id:'post_seal',  slot:'gm3', name:L('Плакат с тюленем', 'Seal poster'), price:20}
);
function gmPoster(kind){
  const g = new THREE.Group();
  const fr = addOutline(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.8, 0.07), toon(0xFFFDF8)), 1.05); g.add(fr);
  const tex = canvasTex(256, (c, w, h) => {
    const bg = { dice:['#FFE38A', '#FFB36B'], star:['#8FA8F0', '#3E4E9A'], seal:['#BDE5F4', '#6FC0DF'] }[kind];
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, bg[0]); gr.addColorStop(1, bg[1]); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.font = '110px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText({ dice:'🎲', star:'🌟', seal:'🦭' }[kind], w/2, h/2 + 6);
    c.font = '28px "Segoe UI Emoji",sans-serif'; if(kind === 'dice') c.fillText('♠ ♥ ♦ ♣', w/2, h - 26);
  }, 192);
  const ph = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 0.64), new THREE.MeshBasicMaterial({map:tex})); ph.position.z = 0.04; g.add(ph);
  return g;
}
Object.assign(FURN_MAKE, {
  pouf_heart(){
    const g = new THREE.Group(); islBlob(g, 0xFF9BB8, 0.62, 0.36, 0.62, 0, 0.34, 0);
    const h = new THREE.Sprite(new THREE.SpriteMaterial({map:findTex('💗'), transparent:true, depthWrite:false})); h.scale.setScalar(0.4); h.position.set(0, 0.55, 0.42); g.add(h);
    g.userData.top = 0.62; return g;
  },
  pouf_cloud(){
    const g = new THREE.Group();
    for(const [x, y, z, r, c] of [[0, 0.3, 0, 0.42, 0xFFFFFF], [-0.36, 0.26, 0.05, 0.3, 0xEAF5FB], [0.36, 0.26, -0.02, 0.32, 0xEAF5FB], [0.05, 0.5, -0.05, 0.32, 0xFFFFFF]]) islBlob(g, c, r, r*0.8, r, x, y, z);
    g.userData.top = 0.72; return g;
  },
  pouf_bear(){
    const g = new THREE.Group(), br = 0xB07A4F;
    islBlob(g, br, 0.6, 0.42, 0.6, 0, 0.4, 0);
    for(const sd of [-1, 1]) islBlob(g, br, 0.18, 0.18, 0.12, sd*0.4, 0.82, 0);
    for(const sd of [-1, 1]){ const e = new THREE.Mesh(SMALL, inkMat); e.scale.setScalar(0.05); e.position.set(sd*0.2, 0.55, 0.52); g.add(e); }
    islBlob(g, 0xF2D3B3, 0.2, 0.14, 0.12, 0, 0.42, 0.52); const n = new THREE.Mesh(SMALL, inkMat); n.scale.set(0.07, 0.05, 0.05); n.position.set(0, 0.47, 0.62); g.add(n);
    g.userData.top = 0.82; return g;
  },
  toys_chest(){
    const g = new THREE.Group(), lid = new THREE.Group();
    islBox(g, 0xC98A52, 1.0, 0.5, 0.62, 0, 0.25, 0);
    for(const x of [-0.32, 0.32]) islBox(g, 0xFFD66B, 0.1, 0.52, 0.64, x, 0.25, 0, 1.0);
    lid.position.set(0, 0.5, -0.31); g.add(lid);
    const lm = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 1.0, 16, 1, false, 0, Math.PI), toon(0xB77A45)), 1.04); lm.rotation.z = Math.PI/2; lm.position.z = 0.31; lid.add(lm);
    for(const [x, c] of [[-0.25, 0xFF9BB8], [0.05, 0x9DD9F0], [0.3, 0xFFD66B]]){ const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), toon(c)); b.position.set(x, 0.55, 0.05); b.rotation.set(0.4, x*3, 0.2); g.add(b); b.visible = false; (g.userData.toys = g.userData.toys || []).push(b); }
    let open = 0;
    g.userData.anim = (t, dt) => { if(open > 0) open -= dt; const k = lid.userData.k = (lid.userData.k || 0) + ((open > 0 ? 1 : 0) - (lid.userData.k || 0))*Math.min(1, dt*6); lid.rotation.x = -k*1.1; g.userData.toys.forEach(b => b.visible = k > 0.4); };
    g.userData.play = () => { open = 2.2; burst(TEX.star, g.localToWorld(new V3(0, 0.8, 0.1)), 10, 1.6, 0.26); sfx.sparkle(); };
    return g;
  },
  toys_tower(){
    const g = new THREE.Group(), cubes = [];
    [0xFF9BB8, 0x9DD9F0, 0xFFD66B, 0xB69CF2, 0x8FD9A8].forEach((c, i) => { const b = islBox(g, c, 0.42 - i*0.02, 0.4, 0.42 - i*0.02, (i % 2 - 0.5)*0.05, 0.2 + i*0.4, 0); b.userData.home = b.position.clone(); cubes.push(b); });
    let fall = 0;
    g.userData.anim = (t, dt) => {
      if(fall > 0) fall -= dt;
      cubes.forEach((b, i) => {
        const h = b.userData.home, k = fall > 0 ? Math.min(1, (2.6 - fall)*1.6) : 0;
        if(fall > 0 && i > 0){ const q = Math.min(1, k), dir = i % 2 ? 1 : -1; b.position.set(h.x + dir*q*(0.4 + i*0.25), Math.max(0.2, h.y*(1 - q*q) + 0.2*q), h.z + q*0.5*i*0.3); b.rotation.set(q*i*0.8, q*dir*2, q*dir); }
        else { b.position.lerp(h, Math.min(1, dt*5)); b.rotation.x *= 0.85; b.rotation.y *= 0.85; b.rotation.z *= 0.85; }
      });
    };
    g.userData.play = () => { fall = 2.6; sfx.thud(); setTimeout(() => sfx.pop(), 700); };
    return g;
  },
  toys_balls(){
    const g = new THREE.Group(), balls = [];
    const bs = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.4, 0.4, 20, 1, true), new THREE.MeshToonMaterial({color:0xE3B980, side:THREE.DoubleSide})), 1.04); bs.position.y = 0.2; g.add(bs);
    [[-0.2, 0xFF7F9E], [0.2, 0x7FB8F0], [0, 0xFFD66B], [-0.05, 0x8FD9A8], [0.28, 0xB69CF2]].forEach(([x, c], i) => { const b = islBlob(g, c, 0.2, 0.2, 0.2, x, 0.45 + (i > 1 ? 0.2 : 0), (i % 2 - 0.5)*0.2); b.userData.y0 = b.position.y; balls.push(b); });
    let jump = 0;
    g.userData.anim = (t, dt) => { if(jump > 0) jump -= dt; balls.forEach((b, i) => b.position.y = b.userData.y0 + (jump > 0 ? Math.abs(Math.sin((2 - jump)*7 + i*1.3))*0.9*Math.min(1, jump) : 0)); };
    g.userData.play = () => { jump = 2; sfx.pop(); };
    return g;
  },
  post_dice(){ return gmPoster('dice'); },
  post_star(){ return gmPoster('star'); },
  post_seal(){ return gmPoster('seal'); }
});
HOME_PLAY.gm2 = HOME_PLAY.gm3 = ocDecorPlay;
HOME_PLAY.gm1 = async function(s, o, quiet){   // пуфик: запрыгнуть и попрыгать
  const top = o.userData.top || 0.6, c = o.getWorldPosition(new V3()).add(new V3(0, top, 0));
  await hopTo(s, c, 0.8, 0.55);
  homeSay(s, 'Боинг!', 'Boing!', '#D9527E');
  for(let i = 0; i < 3; i++){ sfx.pop(); await tween(0.42, k => { s.inner.position.y = Math.sin(k*Math.PI)*0.55*petK(); o.scale.set(1 + Math.sin(k*Math.PI)*0.06, 1 - Math.sin((k + 0.5)*Math.PI*2)*0.08, 1); }, ease.lin); }
  o.scale.set(1, 1, 1); s.inner.position.y = 0; burst(TEX.heart, headTop(s), quiet ? 4 : 8, 1.6, 0.26);
  await hopTo(s, hp(...homeStand(o.userData.id)), 0.6, 0.5);
};

/* ---------- обстановка: стол, табуретки, флажки, доска счёта ---------- */
function gmFill(root){
  const G = new THREE.Group(); G.position.set(GM_TABLE[0], HOME_Y, GM_TABLE[1]); root.add(G); GM.table = G;
  islCyl(G, 0xEDB77D, 1.0, 1.0, 0.14, 0, 0.66, 0, 40, 1.03);
  islCyl(G, 0xD99A5E, 0.16, 0.24, 0.62, 0, 0.32, 0, 14, 1.06);
  islCyl(G, 0xD99A5E, 0.5, 0.6, 0.08, 0, 0.04, 0, 24, 1.06);
  for(const [x, c] of [[-1.5, 0xFF9BB8], [1.5, 0x9DD9F0]]){ const st = new THREE.Group(); st.position.set(x, 0, 0.15); G.add(st); islCyl(st, c, 0.3, 0.3, 0.42, 0, 0.21, 0, 20, 1.06); islCyl(st, 0xFFFDF8, 0.31, 0.31, 0.05, 0, 0.43, 0, 20, 1.05); }
  // флажки под потолком
  for(let i = 0; i < 15; i++){
    const a = -1.3 + i*0.186, e = 1.02 - Math.sin((i/14)*Math.PI)*0.16, sh = new THREE.Shape(); sh.moveTo(-0.13, 0); sh.lineTo(0.13, 0); sh.lineTo(0, -0.34); sh.closePath();
    const f = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({color:[0xFF9BB8, 0xFFD66B, 0x9DD9F0, 0xB69CF2, 0x8FD9A8][i % 5], side:THREE.DoubleSide}));
    rmWall(f, a, e, false, HOME_R*0.93); f.userData.ph = i; root.add(f); GM.flags.push(f);
  }
  // доска счёта
  const bd = new THREE.Group(); rmWall(bd, -0.05, 0.5, true, HOME_R*0.945); root.add(bd); GM.boardG = bd;
  const fr = addOutline(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.86, 0.06), toon(0xC98A52)), 1.05); bd.add(fr);
  GM.board = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 0.72), new THREE.MeshBasicMaterial({map:gmBoardTex()})); GM.board.position.z = 0.04; bd.add(GM.board);
}
function gmBoardTex(){
  const sv = save.bg, n = Object.values(sv.n).reduce((a, b) => a + b, 0), w = Object.values(sv.w).reduce((a, b) => a + b, 0);
  return canvasTex(256, (g, W, H) => {
    g.fillStyle = '#2E5A4A'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#F4F9E6'; g.textAlign = 'center'; g.font = '30px Pangolin, "Comic Sans MS", cursive'; g.fillText(L('Доска счёта', 'Scoreboard'), W/2, 34);
    g.font = '24px Nunito, sans-serif'; g.fillText(L(`Партий: ${n}`, `Games: ${n}`), W/2, 74); g.fillText(L(`Побед: ${w}`, `Wins: ${w}`), W/2, 106);
    g.font = '32px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.fillText(BG_ORDER.filter(bgHas).map(id => BG[id].ic).join(' ') || '🎲', W/2, 150);
  }, 136);
}
// коробки на столе — заново, когда их число поменялось; Пинг за столом, если живёт рядом
function gmEnter(){
  const got = BG_ORDER.filter(bgHas).join();
  if(GM.nb !== got){
    GM.nb = got;
    GM.boxes.forEach(b => b.parent.remove(b)); GM.boxes = [];
    const ids = got ? got.split(',') : [];
    ids.forEach((id, i) => {
      const G = BG[id], a = ids.length === 1 ? 0.4 : i/ids.length*Math.PI*2 + 0.5, r = ids.length === 1 ? 0.3 : 0.58;
      const b = addOutline(new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.12, 0.4), toon(G.col || 0xFF9BB8)), 1.06);
      b.position.set(Math.sin(a)*r, 0.79, Math.cos(a)*r); b.rotation.y = a + (i % 2 ? 0.3 : -0.3); b.userData.game = id;
      const lid = new THREE.Sprite(new THREE.SpriteMaterial({map:findTex(G.ic), transparent:true, depthWrite:false})); lid.scale.setScalar(0.3); lid.position.y = 0.16; b.add(lid);
      GM.table.add(b); GM.boxes.push(b);
    });
    if(!ids.length){ const q = new THREE.Sprite(new THREE.SpriteMaterial({map:findTex('🎲'), transparent:true, depthWrite:false})); q.scale.setScalar(0.5); q.position.y = 1.0; GM.table.add(q); GM.boxes.push(q); }
  }
  GM.board.material.map.dispose(); GM.board.material.map = gmBoardTex(); GM.board.material.needsUpdate = true;
  const peng = typeof pengMet === 'function' && pengMet();
  if(peng && !GM.ping){ const p = makePenguin(PENG); p.root.scale.setScalar(0.5); p.root.position.set(1.5, 0.5, 0.15); p.root.rotation.y = -1.2; GM.table.add(p.root); GM.ping = p; }
  if(GM.ping) GM.ping.root.visible = !!peng;
}
function gmTick(t, dt){
  GM.flags.forEach(f => f.rotation.z = Math.sin(t*2 + f.userData.ph*0.7)*0.18);
  if(GM.ping) GM.ping.root.position.y = 0.5 + Math.abs(Math.sin(t*2.2))*0.03;
  GM.boxes.forEach((b, i) => { if(b.userData.game) b.position.y = 0.79 + Math.sin(t*1.6 + i)*0.008; });
}
function gmUi(){
  const got = BG_ORDER.filter(bgHas).length;
  $('#homeHint').textContent = L('Нажми на коробку — сыграем! Стол — все игры', 'Tap a box to play! The table has all the games');
  const m = homeIn().length;
  $('#homeCount').textContent = L(`Коробок: ${got} из ${BG_ORDER.length} · Вещей: ${m}`, `Boxes: ${got} of ${BG_ORDER.length} · Things: ${m}`);
}

/* ---------- касания ---------- */
async function gmPlay(id){
  if(busy || !mgRoot.hidden || homeRoom !== 'games') return;
  setBusy(true); homeIdleT = 12;
  const s = petSeal;
  await homeGo(GM_FRONT); await faceTo(s, hp(GM_TABLE[0], GM_TABLE[1]));
  homeSay(s, 'Поиграем? 🎲', 'Shall we play? 🎲', '#D9527E'); sfx.pop();
  if(id){ const b = GM.boxes.find(x => x.userData.game === id); if(b) await tween(0.4, k => b.position.y = 0.79 + Math.sin(k*Math.PI)*0.25, ease.lin); }
  await wait(0.2);
  await bgGo(id || null);
  if(homeMode){ homeBuild(); homeUi(); homeView(); }
  setBusy(false);
}
function gmTap(cx, cy){
  ocRay(cx, cy);
  const hit = ray.intersectObjects(GM.boxes.filter(b => b.userData.game), true)[0];
  if(hit){ let o = hit.object; while(o && !o.userData.game) o = o.parent; if(o) return gmPlay(o.userData.game); }
  if(ray.intersectObject(GM.table, true).length || (GM.ping && ray.intersectObject(GM.ping.root, true).length)) return gmPlay(null);
  if(ray.intersectObject(GM.boardG, true).length) return gmBoard();
}
async function gmBoard(){
  if(busy) return; setBusy(true);
  mgOpen('');
  const sv = save.bg, ids = BG_ORDER.filter(bgHas);
  const panel = mgNode('div', 'mg-panel fun-pick', `
    <p class="ttl display">🎲 ${L('Доска счёта', 'Scoreboard')}</p>
    <div class="tr-list">${ids.length ? ids.map(id => `<p><span>${BG[id].ic}</span> <b>${BG[id].name()}</b> — ${bgWins(id)}</p>`).join('') : `<p>${L('Пока нет ни одной коробки. Их выносит волной на прогулке 🌊', 'No boxes yet. Waves wash them up on walks 🌊')}</p>`}</div>
    <button class="btn" id="gmOk">${L('Закрыть', 'Close')}</button>`);
  await new Promise(r => mgOn(panel.querySelector('#gmOk'), 'click', r));
  sfx.tap(); panel.classList.add('away'); await wait(0.25); mgClose(); setBusy(false);
}
rmReady('games');
