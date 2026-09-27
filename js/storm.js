/* ---------------- 🌪️ Великий шторм (Спринт 5, задача 7 — глава 8 «Книги острова») ----------------
   Одна угроза, с которой не подружишься: стихия. Шторм и большая вода идут на остров, и все объединяются.
   Четыре части, каждая — своя маленькая игра на 1,5–3 минуты; прошла часть — «Дальше ▶» или домой (прогресс не теряется):
   1. 🚨 Тревога — малыши-потеряшки испугались: подойди — идут за тобой цепочкой, отведи в иглу-убежище.
      Поперёк льдины катятся волны: полоса заранее синеет, чайка кричит «Волна!». Плюх — малыши разбегаются рядом.
   2. 🛟 Спасаем всех — акула тянет плот, мы плывём за ним по 4 полосам (как «Дорога»): соседи на отколотых льдинках
      (медведь, мама-калан, черепаха, краб, мама Лучика, пингвинёнок) — подплыви, и они прыгают на плот. Валы — прыгать,
      айсберги — объезжать. Проплыли мимо соседа — он появится снова.
   3. 🗼 Держим маяк — волны бьют в ледяную стену перед маяком: трещина → большая трещина → протекает. Коснись блока —
      тюлень бежит и ставит новую льдинку. Чинишь — шторм слабеет (полоска), протекло — чуть назад.
   4. 🌈 Глаз бури — темно, Клякса светит, Туча держит ветер. Подъём по винтовой лестнице маяка: 🌬️ ветер — держи палец
      на экране, иначе сдует на пару ступенек. Наверху — крути пальцем вокруг лампы → маяк загорелся, шторм уходит, радуга.
   Проиграть нельзя: ошибка откатывает чуть назад, после 2–3 промахов сами приходят друзья (мама Пипы, медведь, Туча).
   Одна, с Пингом (сам делает свою часть) или вдвоём по сети. По сети главный — хозяин комнаты: волны, малыши, соседи,
   трещины и порывы ветра решает он, каждый сам водит своего тюленя. Прогресс сюжета пишется у хозяина (чей мир),
   гость получает ракушки и фото.
   Сохранение — save.storm = {st — сколько частей пройдено (0…4), n — сколько раз прогнали шторм до конца, d — день
   последней игры (награда за повтор — раз в день), net — сколько раз играли вместе} (sanitizeStorm в data.js).
   Подключается после visit.js, до story.js. */
const SM_POS = new V3(0, 0, 1000);
const smAt = (x, z, y = 0) => new V3(SM_POS.x + x, 0.25 + y, SM_POS.z + z);
const smRoot = new THREE.Group(); smRoot.visible = false; scene.add(smRoot);
const SM_SC = 0.42;                          // размер тюленей
const SM_GIFT = [15, 15, 20, 30], SM_AGAIN = 5;   // ракушки за часть в первый раз; повтор — раз в день
const smDay = () => new Date().toDateString();
const smOn = () => save.story.open >= 8 || save.storm.st > 0;   // глава 8 открыта — шторм идёт
const SM_PARTS = [
  {ic:'🚨', name:L('Тревога', 'The alarm')},
  {ic:'🛟', name:L('Спасаем всех', 'Save everyone')},
  {ic:'🗼', name:L('Держим маяк', 'Hold the lighthouse')},
  {ic:'🌈', name:L('Глаз бури', 'The eye of the storm')}
];
let SM = null;

/* ---------- общее: небо, дождь, молнии, маяк ---------- */
let smSkyDark = null, smSkyBright = null, smRain = null;
function smBuildOnce(){
  if(smRain) return;
  smSkyDark = crSkyTex(['#4E5873', '#8C98B3']);
  smSkyBright = crSkyTex(['#9ED8F0', '#FFF1DA']);
  const N = reduced ? 90 : 220, geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N*6), 3));
  smRain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({color:0xE2ECF8, transparent:true, opacity:0.5}));
  smRain.frustumCulled = false;
  smRain.userData.p = Array.from({length:N}, () => ({x:(Math.random() - 0.5)*18, y:Math.random()*11, z:(Math.random() - 0.5)*16}));
  smRoot.add(smRain);
}
function smFxStep(dt){
  const r = smRain, P = r.userData.p, a = r.geometry.attributes.position.array, c = runCam.look, k = SM.rain;
  r.visible = k > 0.02; r.material.opacity = 0.5*k;
  if(r.visible){
    const w = SM.wind;
    for(let i = 0; i < P.length; i++){
      const p = P[i]; p.y -= dt*12; p.x -= dt*3.5*w;
      if(p.y < -1.5){ p.y = 9 + Math.random()*2; p.x = (Math.random() - 0.5)*18 + 2*w; p.z = (Math.random() - 0.5)*16; }
      const j = i*6; a[j] = c.x + p.x; a[j + 1] = c.y + p.y - 3; a[j + 2] = c.z + p.z;
      a[j + 3] = a[j] + 0.16*w; a[j + 4] = a[j + 1] + 0.6; a[j + 5] = a[j + 2];
    }
    r.geometry.attributes.position.needsUpdate = true;
  }
  if(k > 0.5 && (SM.boltT -= dt) <= 0){ SM.boltT = 6 + Math.random()*6; SM.flashK = 1; setTimeout(smThunder, 280); }
  SM.flashK = Math.max(0, SM.flashK - dt*4);
  HEMI.intensity = SM.light + SM.flashK*0.7; sun.intensity = SM.light*0.9 + SM.flashK*0.3;
}
// гром — мягкий и далёкий (не пугаем)
function smThunder(){ if(!SM || typeof noise !== 'function') return; noise(1.5, {vol:0.09, freq:170, type:'lowpass', att:0.05}); tone(55, 1.1, {type:'triangle', vol:0.06, to:42, att:0.06}); }
function smWindSfx(){ if(typeof noise === 'function') noise(1.3, {vol:0.07, freq:700, to:1700, att:0.35}); }
// маяк: полосатая башня, наверху — лампа под стеклом. userData.lamp — светящийся шар, glow — ореол, beam — луч
function smLighthouse(h = 7.2){
  const g = new THREE.Group(), n = 6, seg = h/n;
  for(let i = 0; i < n; i++){
    const r0 = 1.25 - i*0.06, r1 = r0 - 0.06;
    const m = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, seg, 28), toon(i % 2 ? 0xFFFFFF : 0xFF9BB8)), 1.02); m.position.y = seg*(i + 0.5); g.add(m);
  }
  const top = h, rt = 1.25 - n*0.06;
  const deck = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(rt + 0.35, rt + 0.3, 0.16, 28), toon(0xFFFDF8)), 1.04); deck.position.y = top + 0.08; g.add(deck);
  const glass = new THREE.Mesh(new THREE.CylinderGeometry(rt*0.75, rt*0.75, 0.9, 20), new THREE.MeshBasicMaterial({color:0xDFF3FF, transparent:true, opacity:0.45})); glass.position.y = top + 0.61; g.add(glass);
  const lamp = new THREE.Mesh(SMALL, new THREE.MeshBasicMaterial({color:0x8A8FA6})); lamp.scale.setScalar(0.34); lamp.position.y = top + 0.6; g.add(lamp);
  const roof = addOutline(new THREE.Mesh(new THREE.ConeGeometry(rt*0.95, 0.75, 20), toon(0xD9527E)), 1.05); roof.position.y = top + 1.43; g.add(roof);
  const ball = addOutline(new THREE.Mesh(SMALL, toon(0xFFD66B)), 1.1); ball.scale.setScalar(0.12); ball.position.y = top + 1.88; g.add(ball);
  const door = new THREE.Mesh(new THREE.CircleGeometry(0.38, 20, 0, Math.PI), new THREE.MeshBasicMaterial({color:0x5C6E91})); door.position.set(0, 0.02, 1.26); g.add(door);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.puff, color:0xFFE38A, transparent:true, depthWrite:false, opacity:0})); glow.scale.setScalar(0.1); glow.position.y = top + 0.6; g.add(glow);
  const beam = new THREE.Group(); beam.position.y = top + 0.6; beam.visible = false; g.add(beam);
  for(const sd of [-1, 1]){
    const c = new THREE.Mesh(new THREE.ConeGeometry(1.4, 9, 20, 1, true), new THREE.MeshBasicMaterial({color:0xFFF3B0, transparent:true, opacity:0.28, depthWrite:false, side:THREE.DoubleSide}));
    c.rotation.z = sd*Math.PI/2; c.position.x = sd*4.6; beam.add(c);
  }
  g.userData = {lamp, glow, beam, top};
  return g;
}
function smIgloo(sc = 1){
  const g = new THREE.Group();
  g.add(addOutline(new THREE.Mesh(new THREE.SphereGeometry(1.1, 28, 14, 0, Math.PI*2, 0, Math.PI/2), toon(0xFFFFFF)), 1.03));
  const tun = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.7, 18, 1, false, -Math.PI/2, Math.PI), toon(0xFFFFFF)), 1.05);
  tun.rotation.x = Math.PI/2; tun.position.set(0, 0, 1.05); g.add(tun);
  const door = new THREE.Mesh(new THREE.CircleGeometry(0.32, 18, 0, Math.PI), new THREE.MeshBasicMaterial({color:0x5C6E91})); door.position.set(0, 0, 1.41); g.add(door);
  g.userData.door = door; g.scale.setScalar(sc);
  return g;
}
function smWater(col = 0x4F86A8){
  const w = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), toon(col)); w.rotation.x = -Math.PI/2; w.position.copy(smAt(0, 0, -0.32)); SM.grp.add(w); return w;
}
// круглый вал воды с пеной сверху (вдоль x); len — длина
function smRoll(len, r = 0.38){
  const g = new THREE.Group();
  const w = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 16), toon(0x6FC0DF)), 1.06); w.rotation.z = Math.PI/2; g.add(w);
  const f = new THREE.Mesh(new THREE.CylinderGeometry(r*0.55, r*0.55, len + 0.1, 12), toon(0xFFFFFF)); f.rotation.z = Math.PI/2; f.position.set(0, r*0.62, r*0.2); g.add(f);
  return g;
}

/* ---------- тюлени и друзья на сцене ---------- */
function smActor(root, seal, kind, x, z, yawOff = 0){
  SM.grp.add(root);
  return {root, seal, kind, x, z, y:0, vy:0, yaw:0, yawOff, tumble:0, hop:0, nx:x, nz:z, ny:0, aiT:0};
}
function smMe(){ const s = coSealOf(coPetDesc()); s.root.scale.setScalar(SM_SC); return s; }
function smPalSeal(){
  if(SM.mode === 'ping'){ const m = makePenguin(PENG); m.root.scale.setScalar(SM_SC*0.95); return m; }
  const s = coSealOf(SM.pal0); s.root.scale.setScalar(SM_SC); return s;
}
const smAng = (a, b) => { let d = a - b; while(d > Math.PI) d -= Math.PI*2; while(d < -Math.PI) d += Math.PI*2; return d; };
function smDraw(o, dt){
  if(!o || !o.root.visible && !o.show) return;
  o.root.position.copy(smAt(o.x, o.z, o.y + (o.hop ? Math.abs(Math.sin(o.hop))*0.07 : 0)));
  o.root.rotation.y += smAng(o.yaw + o.yawOff, o.root.rotation.y)*Math.min(1, dt*9);
  if(o.seal){
    o.seal.inner.rotation.x = o.tumble > 0 ? -(1 - o.tumble/0.8)*Math.PI*2 : 0;
    o.seal.inner.position.y = o.tumble > 0 ? Math.sin((1 - o.tumble/0.8)*Math.PI)*0.4 : 0;
    updateSeal(o.seal, now + o.x, dt);
  }
  if(o.tumble > 0) o.tumble = Math.max(0, o.tumble - dt);
}
function smMoveTo(o, tx, tz, v, dt){
  const dx = tx - o.x, dz = tz - o.z, d = Math.hypot(dx, dz);
  if(d < 0.06){ o.hop = 0; return true; }
  const s = Math.min(d, v*dt); o.x += dx/d*s; o.z += dz/d*s; o.yaw = Math.atan2(dx, dz); o.hop += dt*14;
  return false;
}
function smSay(t, ms = 2400){ mgHint(t); setTimeout(() => { if(SM && mgHintEl.textContent === t) mgHint(''); }, ms); }
// камера: смотрим на look под углом pitch и отъезжаем так, чтобы влезло W в ширину и H в глубину
function smCam(look, W, H, pitch, k = 1){
  const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov)/2), a = Math.min(camera.aspect, 1.5);
  const d = Math.max(W/2/(tv*a), H*Math.sin(pitch)/2/tv, 5);
  const pos = look.clone().add(new V3(0, Math.sin(pitch)*d, Math.cos(pitch)*d));
  if(k >= 1){ runCam.pos.copy(pos); runCam.look.copy(look); } else { runCam.pos.lerp(pos, k); runCam.look.lerp(look, k); }
}
const smRay = new THREE.Raycaster(), smNdc = new THREE.Vector2();
function smGround(cx, cy, y = 0.25){   // точка касания на льду (плоскость y)
  smNdc.set(cx/innerWidth*2 - 1, -(cy/innerHeight)*2 + 1); smRay.setFromCamera(smNdc, camera);
  const p = new V3(); if(!smRay.ray.intersectPlane(new THREE.Plane(new V3(0, 1, 0), -y), p)) return null;
  return {x:p.x - SM_POS.x, z:p.z - SM_POS.z};
}
// значок-надпись с общей текстурой (волн и соседей много — не плодим холсты)
const smSpriteMat = {};
function smSprite(text, color){
  const k = text + color, m = smSpriteMat[k] || (smSpriteMat[k] = textSprite(text, color).material);
  const sp = new THREE.Sprite(m); sp.scale.set(1.9, 0.71, 1); sp.renderOrder = 10; return sp;
}
function smHud(html){ if(!SM.hud) SM.hud = mgNode('div', 'run-hud sm-hud', ''); if(SM.hudHtml !== html){ SM.hudHtml = html; SM.hud.innerHTML = html; } }
function smBar(k){ return `<span class="bar"><i style="width:${Math.round(Math.max(0, Math.min(1, k))*100)}%"></i></span>`; }
const smPart = () => `<span class="pill">${SM_PARTS[SM.part].ic} ${SM.part + 1}/4</span>`;
// промах: после нескольких сами приходят друзья (SM.D.help)
function smMiss(){ SM.misses++; if(!SM.helped && SM.D.helpAt && SM.misses >= SM.D.helpAt && SM.host){ SM.helped = true; SM.D.help(); } }

/* =====================================================================================================
   Часть 1. 🚨 Тревога: отведи малышей в иглу-убежище, волны катятся поперёк льдины
   ===================================================================================================== */
const P1_DOOR = {x:0, z:-3.95}, P1_W = 3.25, P1_ZB = 4.8, P1_ZT = -3.5;
const P1_PUPS = [
  {n:L('Пипа', 'Pipa'), peng:0x5C6FA6, at:[-2.4, 3.4]},
  {n:L('Лучик', 'Little Ray'), c:0xFFFFFF, sc:'#FFD66B', at:[2.5, 2.6]},
  {n:L('Пуговка', 'Button'), otter:true, at:[-2.6, -1.2]},
  {n:L('Кроха', 'Tiny'), c:0xC6D3E4, sc:'#9FD8B8', at:[2.4, -2.2]},
  {n:L('Снежинка', 'Snowflake'), c:0xE9DDCB, sc:'#B9A0F2', at:[-0.3, 1.2]},
  {n:L('Бусинка', 'Bead'), c:0xB8C4D6, sc:'#8FCBFF', at:[0.9, 4.4]},
  {n:L('Пушинка', 'Fluff'), c:0xF3EEE4, sc:'#FFB86B', at:[-1.4, -2.9]}
];
const P1_WARN = 1.9, P1_GAP = 3.8, P1_V = 2.7, P1_CHAIN = 2;   // за хвостик держатся не больше двоих
const P1 = {
  helpAt:2,
  intro:() => [L('Небо потемнело… Идёт Великий шторм! 🌪️', 'The sky went dark… The Great Storm is coming! 🌪️'),
    L('Малыши испугались! Подойди — пойдут за тобой (по двое). Отведи всех в иглу-убежище 🏠', 'The little ones are scared! Walk up — they follow you (two at a time). Lead everyone to the igloo shelter 🏠'),
    L('Синяя полоса — сейчас прокатится волна! Уходи с неё 🌊', 'A blue stripe means a wave is coming! Step off it 🌊')],
  setup(){
    const G = SM.grp, P = SM.P;
    smWater();
    const floe = addOutline(new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.6, 11.8), toon(0xD6EAF5)), 1.01); floe.position.copy(smAt(0, -0.3, -0.3)); G.add(floe);
    const ig = smIgloo(1.05); ig.position.copy(smAt(0, -5.3)); G.add(ig); P.ig = ig;
    for(const [x, z, s] of [[-2.8, -4.6, 0.55], [2.8, -4.4, 0.6]]){ const i2 = smIgloo(s); i2.position.copy(smAt(x, z)); i2.rotation.y = -x*0.12; G.add(i2); }
    const lh = smLighthouse(); lh.scale.setScalar(0.6); lh.position.copy(smAt(-3.6, -17, -0.3)); G.add(lh);
    P.pups = P1_PUPS.map((d, i) => {
      let root, seal = null, off = 0;
      if(d.otter){ root = DV_MAKE.otter(); root.scale.setScalar(0.42); off = -Math.PI/2; }
      else if(d.peng){ seal = makePenguin({name:'', f:true, color:d.peng}); seal.root.scale.setScalar(0.22); root = seal.root; }
      else { seal = rsSealLook({c:d.c}, d.sc, 0.24); root = seal.root; }
      const a = smActor(root, seal, 'pup', d.at[0] + (Math.random() - 0.5)*0.5, d.at[1] + (Math.random() - 0.5)*0.4, off);
      a.yaw = 0; return Object.assign(a, {i, n:d.n, c:0, ord:0, inSh:false, callT:now + 2 + i*1.3, shake:0});
    });
    const ms = smMe(); SM.me = smActor(ms.root, ms, 'me', SM.host ? -0.6 : 0.6, 4);
    P.waves = []; P.waveT = 4.5; P.dir = 1; P.ord = 0; P.inSh = 0; P.sendT = 0;
    P.gull = makeGull(); P.gull.scale.setScalar(0.8); G.add(P.gull); P.gullAt = smAt(3.4, -11, 3.8); P.gull.position.copy(P.gullAt);
    // управление: веди пальцем по льду — тюлень идёт туда (или просто коснись, куда идти)
    let hold = null;
    const aim = e => { const p = smGround(e.clientX, e.clientY); if(p){ SM.me.tx = Math.max(-P1_W, Math.min(P1_W, p.x)); SM.me.tz = Math.max(-4.6, Math.min(P1_ZB, p.z)); } };
    mgOn(mgRoot, 'pointerdown', e => { if(e.target.closest('button') || SM.st !== 'go') return; e.preventDefault(); hold = e.pointerId; aim(e); });
    mgOn(mgRoot, 'pointermove', e => { if(hold === e.pointerId && SM.st === 'go') aim(e); });
    const up = e => { if(hold === e.pointerId) hold = null; };
    mgOn(mgRoot, 'pointerup', up); mgOn(mgRoot, 'pointercancel', up);
    const keys = {};
    mgOn(window, 'keydown', e => { if(/^Arrow/.test(e.key)){ e.preventDefault(); keys[e.key] = true; } });
    mgOn(window, 'keyup', e => { keys[e.key] = false; });
    P.keys = keys;
  },
  hud(){ const P = SM.P; smHud(`${smPart()}<span class="pill">🏠 <b>${P.inSh}/${P.pups.length}</b></span>${smBar(P.inSh/P.pups.length)}`); },
  step(dt){
    const P = SM.P, me = SM.me, go = SM.st === 'go';
    // своё управление
    if(go && me.tumble <= 0){
      const k = P.keys, kx = (k.ArrowRight ? 1 : 0) - (k.ArrowLeft ? 1 : 0), kz = (k.ArrowDown ? 1 : 0) - (k.ArrowUp ? 1 : 0);
      if(kx || kz){ me.tx = Math.max(-P1_W, Math.min(P1_W, me.x + kx)); me.tz = Math.max(-4.6, Math.min(P1_ZB, me.z + kz)); }
      if(me.tx != null){ if(smMoveTo(me, me.tx, me.tz, P1_V, dt)) me.tx = null; }
      else me.hop = 0;
    }
    // Пинг и мама-помощница (у хозяина)
    if(SM.host && go){
      if(SM.pal && SM.pal.kind === 'ping' && SM.pal.tumble <= 0) p1AI(SM.pal, dt, 2, 2);
      for(const n of SM.npc) if(n.tumble <= 0) p1AI(n, dt, 3, 1.8);
    }
    if(SM.pal && SM.pal.kind === 'net') smPalFollow(SM.pal, dt);
    if(!SM.host) for(const n of SM.npc) smPalFollow(n, dt);
    // волны
    if(SM.host && go && (P.waveT -= dt) <= 0 && P.inSh < P.pups.length){ P.waveT = P1_GAP*(SM.helped ? 1.15 : 1)*(0.9 + Math.random()*0.25); p1Wave(); }
    p1Waves(dt);
    // малыши: цепочкой за тем, кто ведёт; кто свободен — дрожит и зовёт маму
    if(SM.host){
      for(const a of p1Leaders()) if(a.o.tumble <= 0 && go) for(const p of P.pups) if(!p.c && !p.inSh && Math.hypot(p.x - a.o.x, p.z - a.o.z) < 0.8){
        if(P.pups.filter(q => q.c === a.c && !q.inSh).length >= p1Max(a.c)){
          if(a.c === 1 && now > (P.fullT || 0)){ P.fullT = now + 4; floatText(L('Сначала отведи этих двоих! 🏠', 'Take these two home first! 🏠'), smAt(a.o.x, a.o.z, 1.3), '#6B6A7E'); }
          continue;
        }
        p.c = a.c; p.ord = ++P.ord; sfx.arf(); floatText(L(`${p.n}: иду! 💗`, `${p.n}: coming! 💗`), smAt(p.x, p.z, 0.9), '#D9527E');
      }
      for(const a of p1Leaders()){
        const line = P.pups.filter(p => p.c === a.c && !p.inSh).sort((u, v) => u.ord - v.ord);
        let lead = a.o;
        for(const p of line){ const d = Math.hypot(lead.x - p.x, lead.z - p.z); if(d > 0.5) smMoveTo(p, lead.x, lead.z, Math.min(4.5, (d - 0.5)*6 + 1), dt); else p.hop = 0; lead = p; }
        if(line.length && go && Math.hypot(a.o.x - P1_DOOR.x, a.o.z - P1_DOOR.z) < 1.3) for(const p of line) p1Home(p);
      }
      if((P.sendT -= dt) <= 0 && SM.mode === 'net'){ P.sendT = 0.12; netSend({t:'sme', k:'pu', a:P.pups.map(p => [+p.x.toFixed(2), +p.z.toFixed(2), p.c, p.inSh ? 1 : 0])}); }
    } else for(const p of P.pups) if(!p.inSh){ const d = Math.hypot(p.nx - p.x, p.nz - p.z); if(d > 0.02) smMoveTo(p, p.nx, p.nz, Math.max(1, d*8), dt); else p.hop = 0; }
    for(const p of P.pups){
      if(p.inSh) continue;
      if(!p.c){ p.shake = Math.sin(now*40)*0.02; if(now > p.callT && go){ p.callT = now + 5 + Math.random()*4; floatText(L('Ма-ма!', 'Mu-um!'), smAt(p.x, p.z, 0.9), '#6B6A7E'); } }
      else p.shake = 0;
      smDraw(p, dt); p.root.position.x += p.shake;
    }
    // чайка-разведчица
    const gl = P.gull, gt = P.gullT || P.gullAt;
    gl.position.lerp(gt, Math.min(1, dt*1.6)); gl.rotation.y = Math.atan2(gt.x - gl.position.x, gt.z - gl.position.z) || gl.rotation.y;
    gl.children[0].rotation.z = Math.sin(now*12)*0.15;
    // камера: вся льдина
    smCam(smAt(0, -0.4, 0), 7.4, 10.6, 0.8);
    this.hud();
    if(SM.host && go && P.inSh >= P.pups.length) p1Win();
  },
  help(){   // мама Пипы прибегает помогать
    const s = makePenguin({name:'', f:true, color:0x46557A}); s.root.scale.setScalar(0.34);
    const n = smActor(s.root, s, 'npc', P1_DOOR.x, P1_DOOR.z + 0.3); SM.npc.push(n);
    toast(L('Мама Пипы спешит на помощь! 🐧💗', 'Pipa’s mum is coming to help! 🐧💗'), 2600); sfx.good();
    if(SM.mode === 'net') netSend({t:'sme', k:'npc'});
  }
};
// кто ведёт малышей: c — 1 хозяин, 2 напарник (Пинг или гость), 3 мама-помощница (с точки зрения хозяина)
function p1Leaders(){
  const out = [{o:SM.me, c:1}];
  if(SM.pal && !SM.pal.gone) out.push({o:SM.pal, c:2});
  SM.npc.forEach(n => out.push({o:n, c:3}));
  return out;
}
// сколько малышей может вести: я и напарник по сети — двоих, Пинг и мама-помощница — по одному (главное делаешь ты)
const p1Max = c => c === 1 || c === 2 && SM.pal && SM.pal.kind === 'net' ? P1_CHAIN : 1;
function p1AI(a, dt, c, v){
  const P = SM.P, mine = P.pups.filter(p => p.c === c && !p.inSh), free = P.pups.filter(p => !p.c && !p.inSh);
  let tx = a.x, tz = a.z;
  if(mine.length >= p1Max(c) || (!free.length && mine.length)){ tx = P1_DOOR.x; tz = P1_DOOR.z + 0.6; }
  else if(free.length){
    // ближайший свободный — но не тот, к которому идёт игрок
    const myT = a === SM.me ? null : SM.me.tx != null ? {x:SM.me.tx, z:SM.me.tz} : SM.me;
    const cost = p => Math.hypot(p.x - a.x, p.z - a.z) + (myT && Math.hypot(p.x - myT.x, p.z - myT.z) < 1 ? 3 : 0);
    free.sort((p, q) => cost(p) - cost(q));
    tx = free[0].x; tz = free[0].z;
  }
  for(const w of P.waves) if(Math.abs(a.z - w.z) < 1.05 && (w.st === 'warn' || w.dir*(a.x - w.x) > -0.8)){ tz = a.z < w.z ? w.z - 1.3 : w.z + 1.3; tx = a.x; }   // уходит с синей полосы
  smMoveTo(a, Math.max(-P1_W, Math.min(P1_W, tx)), Math.max(-4.6, Math.min(P1_ZB, tz)), v, dt);
}
function p1Wave(z, dir){
  const P = SM.P, spawn = z == null;
  if(spawn){
    P.dir = -P.dir; dir = P.dir;
    const busy = SM.helped ? [SM.me.z] : [];
    for(let i = 0; i < 6; i++){ z = P1_ZT + 0.6 + Math.random()*(P1_ZB - P1_ZT - 1.2); if(!busy.some(b => Math.abs(b - z) < 0.6)) break; }
    z = +z.toFixed(2);
    if(SM.mode === 'net') netSend({t:'sme', k:'w1', z, d:dir});
  }
  const warn = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 1.6), new THREE.MeshBasicMaterial({color:0x2E6FA8, transparent:true, opacity:0, depthWrite:false}));
  warn.rotation.x = -Math.PI/2; warn.position.copy(smAt(0, z, 0.02)); SM.grp.add(warn);
  const roll = smRoll(1.6, 0.36); roll.rotation.y = Math.PI/2; roll.visible = false; SM.grp.add(roll);
  const w = {z, dir, st:'warn', t:0, x:-dir*4.6, warn, roll, hit:new Set()};
  P.waves.push(w);
  P.gullT = smAt(-dir*2.8, z, 2.4); sfx.caw();
  setTimeout(() => { if(SM && SM.P === P) floatText(L('Волна! 🌊', 'Wave! 🌊'), smAt(-dir*2.6, z, 1.9), '#2E6FA8'); }, 300);
}
function p1Waves(dt){
  const P = SM.P, warnT = P1_WARN*(SM.helped ? 1.3 : 1);
  P.waves = P.waves.filter(w => {
    w.t += dt;
    if(w.st === 'warn'){
      w.warn.material.opacity = 0.16 + 0.14*Math.sin(w.t*12);
      if(w.t >= warnT){ w.st = 'go'; w.roll.visible = true; sfx.splash(); P.gullT = null; }
      return true;
    }
    w.x += w.dir*8.5*dt; w.warn.material.opacity = Math.max(0, w.warn.material.opacity - dt*0.6);
    w.roll.position.copy(smAt(w.x, w.z, 0.12));
    if(Math.random() < 0.5) emit(TEX.puff, smAt(w.x, w.z + (Math.random() - 0.5)*1.4, 0.45), {v:new V3(w.dir*1.5, 1.2, 0), life:0.5, size:0.45, grow:1});
    const hitAt = o => Math.abs(o.z - w.z) < 0.85 && Math.abs(o.x - w.x) < 0.45 && !w.hit.has(o);
    if(hitAt(SM.me) && SM.st === 'go'){ w.hit.add(SM.me); p1Splash(SM.me, w.dir); if(SM.mode === 'net' && !SM.host) netSend({t:'sme', k:'spl', d:w.dir}); }
    if(SM.host){
      for(const o of [SM.pal, ...SM.npc]) if(o && o.kind !== 'net' && hitAt(o)){ w.hit.add(o); p1Splash(o, w.dir); }
      for(const p of P.pups) if(!p.c && !p.inSh && hitAt(p)){ w.hit.add(p); p.x = Math.max(-P1_W, Math.min(P1_W, p.x + w.dir*0.8)); p.tumble = 0.6; floatText(L('Ой!', 'Oops!'), smAt(p.x, p.z, 0.8)); }
    }
    if(Math.abs(w.x) > 5){ SM.grp.remove(w.warn); SM.grp.remove(w.roll); return false; }
    return true;
  });
}
// волна накрыла: плюх — отнесло чуть в сторону, малыши разбегаются рядом (не теряются)
function p1Splash(o, dir){
  o.tumble = 0.8; o.tx = null; o.x = Math.max(-P1_W, Math.min(P1_W, o.x + dir*0.9));
  sfx.plop(); burst(TEX.drop, smAt(o.x, o.z, 0.5), 8, 1.6, 0.18);
  floatText(o.kind === 'ping' ? L('Кря! 💦', 'Quack! 💦') : L('Плюх! 💦', 'Splash! 💦'), smAt(o.x, o.z, 1.1), '#2E6FA8');
  if(o === SM.me){ sfx.arf(); smMiss(); if(SM.misses === 1) smSay(L('Ничего! Малыши рядом — собери их снова 💗', 'It’s okay! The little ones are close — gather them again 💗'), 2600); }
  if(!SM.host) return;
  const c = o === SM.me ? 1 : o === SM.pal ? 2 : 3;
  for(const p of SM.P.pups) if(p.c === c && !p.inSh){ p.c = 0; p.x = Math.max(-P1_W, Math.min(P1_W, p.x + dir*0.6 + (Math.random() - 0.5)*0.6)); p.z += (Math.random() - 0.5)*0.6; p.tumble = 0.6; }
}
function p1Home(p){
  const P = SM.P; if(p.inSh) return;
  p.inSh = true; p.c = 0; P.inSh++;
  sfx.coin(); floatText(L(`${p.n} в домике! 🏠`, `${p.n} is safe! 🏠`), smAt(P1_DOOR.x, P1_DOOR.z, 1.3), '#D9527E');
  const from = p.root.position.clone(), to = smAt(P1_DOOR.x, P1_DOOR.z - 0.6), s0 = p.root.scale.x;
  tween(0.5, k => { p.root.position.lerpVectors(from, to, k); p.root.scale.setScalar(s0*(1 - k*0.8)); }, ease.io).then(() => { p.root.visible = false; });
}
function p1Win(){
  SM.st = 'end';
  if(SM.mode === 'net') netSend({t:'sme', k:'win'});
  p1WinFx();
}
async function p1WinFx(){
  SM.st = 'end'; sfx.good();
  mgHint(L('Все малыши в убежище! Молодец 💗', 'All the little ones are safe! Well done 💗'));
  const ig = SM.P.ig;
  burst(TEX.heart, ig.position.clone().add(new V3(0, 1.4, 0)), 14, 2, 0.3);
  await tween(0.5, k => ig.scale.setScalar(1.05*(1 + Math.sin(k*Math.PI)*0.12)), ease.lin);
  await wait(1.6); if(SM) SM.end = 'win';
}
function p1Net(m){
  const P = SM.P;
  if(m.k === 'w1' && !SM.host) p1Wave(m.z, m.d);
  else if(m.k === 'pu' && !SM.host) m.a.forEach(([x, z, c, i], j) => { const p = P.pups[j]; if(!p) return; p.nx = x; p.nz = z;
    if(c !== p.c && c === 2 && !p.c) sfx.arf();
    p.c = c; if(i && !p.inSh){ p.inSh = true; P.inSh++; p1HomeFx(p); } });
  else if(m.k === 'spl' && SM.host && SM.pal){ const pl = SM.pal; for(const p of P.pups) if(p.c === 2 && !p.inSh){ p.c = 0; p.x += m.d*0.6 + (Math.random() - 0.5)*0.6; p.tumble = 0.6; } pl.tumble = 0.8; }
  else if(m.k === 'npc' && !SM.host){ const s = makePenguin({name:'', f:true, color:0x46557A}); s.root.scale.setScalar(0.34); SM.npc.push(smActor(s.root, s, 'npc', P1_DOOR.x, P1_DOOR.z + 0.3)); toast(L('Мама Пипы спешит на помощь! 🐧💗', 'Pipa’s mum is coming to help! 🐧💗'), 2600); }
  else if(m.k === 'np' && !SM.host) m.a.forEach(([x, z], j) => { const n = SM.npc[j]; if(n){ n.nx = x; n.nz = z; } });
  else if(m.k === 'win' && !SM.host) p1WinFx();
}
function p1HomeFx(p){ sfx.coin(); floatText(L(`${p.n} в домике! 🏠`, `${p.n} is safe! 🏠`), smAt(P1_DOOR.x, P1_DOOR.z, 1.3), '#D9527E'); p.root.visible = false; }

/* =====================================================================================================
   Часть 2. 🛟 Спасаем всех: плывём за плотом акулы по 4 полосам и подбираем соседей
   ===================================================================================================== */
const P2_LN = 1.1, p2X = l => (l - 1.5)*P2_LN, P2_V = 5, P2_VY = 7.6, P2_G = 21, P2_RAFT = 15;   // плот — на 15 м впереди
const P2_NB = [
  {n:L('Белый медведь', 'The polar bear'), make(){ const g = feBearMake(); g.scale.setScalar(0.3); return g; }},
  {n:L('Мама-калан', 'Mummy otter'), off:-Math.PI/2, make(){ const g = DV_MAKE.otter(); g.scale.setScalar(0.62); return g; }},
  {n:L('Черепаха', 'The turtle'), off:-Math.PI/2, make(){ const g = DV_MAKE.turtle(); g.scale.setScalar(0.5); return g; }},
  {n:L('Мама Лучика', 'Little Ray’s mum'), make(){ const s = rsSealLook({c:0xE3E9F2}, '#FFD66B', 0.3); return s.root; }},
  {n:L('Крабик', 'The crab'), make(){ const g = DV_MAKE.crab(); g.scale.setScalar(0.7); return g; }},
  {n:L('Пингвинёнок', 'The penguin chick'), make(){ const s = makePenguin({name:'', f:true, color:0x7C8DB5}); s.root.scale.setScalar(0.26); return s.root; }}
];
const P2 = {
  helpAt:3,
  intro:() => [L('Шторм раскалывает льдины! Соседей уносит в море 🌊', 'The storm is breaking the ice! Our neighbours are drifting out to sea 🌊'),
    L('Акула тянет плот 🦈 Подплывай к льдинке с соседом — он прыгнет на плот', 'The shark is pulling a raft 🦈 Swim up to a floe with a neighbour — they jump onto the raft'),
    L('Проведи пальцем ⬅️ ➡️ — полоса, коснись — прыжок через вал 🌊', 'Swipe ⬅️ ➡️ to change lane, tap to jump over a wave 🌊')],
  setup(){
    const G = SM.grp, P = SM.P;
    P.water = smWater(0x4A80A3);
    // пунктир полос на воде (едет вместе с нами)
    const lt = canvasTex(128, (g, w, h) => { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,0.45)'; for(const x of [32, 64, 96]) g.fillRect(x - 2, 0, 4, h*0.55); });
    lt.wrapS = lt.wrapT = THREE.RepeatWrapping; lt.repeat.set(1, 18);
    const lanes = new THREE.Mesh(new THREE.PlaneGeometry(P2_LN*4, 60), new THREE.MeshBasicMaterial({map:lt, transparent:true, depthWrite:false}));
    lanes.rotation.x = -Math.PI/2; G.add(lanes); P.lanes = lanes; P.laneTex = lt;
    P.z = 0; P.sp = 0; P.rows = []; P.rid = 0; P.genZ = 10; P.queue = P2_NB.map((d, i) => i); P.got = 0; P.shells = 0; P.zT = 0; P.nbGap = 0;
    P.rnd = rsRand(Math.floor(Math.random()*1e9));
    // плот с сиденьями и акула с верёвкой
    const raft = new THREE.Group(); G.add(raft); P.raft = raft;
    for(let i = 0; i < 5; i++){ const log = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 2.3, 10), toon(0xC99A6B)), 1.06); log.rotation.z = Math.PI/2; log.position.set(0, 0, -0.75 + i*0.36); raft.add(log); }
    P.seats = [[-0.7, -0.5], [0, -0.55], [0.7, -0.5], [-0.7, 0.35], [0, 0.4], [0.7, 0.35]];
    const sh = DV_MAKE.shark(); sh.scale.setScalar(0.62); sh.rotation.y = Math.PI/2; G.add(sh); P.shark = sh;
    const rope = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(), new V3(), new V3()]), new THREE.LineBasicMaterial({color:0x3B3A4A})); rope.frustumCulled = false; G.add(rope); P.rope = rope;
    const lh = smLighthouse(); lh.scale.setScalar(0.7); G.add(lh); P.lh = lh;
    for(let z = 0; z < 400; z += 22) for(const sd of [-1, 1]){
      const s = 1.2 + ((z*7 + sd*3) % 5)*0.35, b = addOutline(new THREE.Mesh(new THREE.ConeGeometry(s, s*1.3, 6), toon(0xDCE8F2)), 1.04);
      b.position.copy(smAt(sd*(8 + (z*13) % 6), -z - sd*7, s*0.4 - 0.3)); G.add(b);
    }
    SM.me = p2Swimmer(smMe(), 'me', SM.host ? 1 : 2);
    let g = null;
    const ok = () => SM && SM.st === 'go';
    mgOn(mgRoot, 'pointerdown', e => { if(e.target.closest('button')) return; e.preventDefault(); g = ok() ? {id:e.pointerId, x:e.clientX, y:e.clientY, used:false} : null; });
    mgOn(mgRoot, 'pointermove', e => {
      if(!g || g.used || e.pointerId !== g.id || !ok()) return;
      const dx = e.clientX - g.x, dy = e.clientY - g.y;
      if(Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)){ g.used = true; p2Lane(SM.me, Math.sign(dx)); }
      else if(dy < -34 && -dy > Math.abs(dx)){ g.used = true; p2Jump(SM.me); }
    });
    mgOn(mgRoot, 'pointerup', e => { if(!g || e.pointerId !== g.id) return; const t = g; g = null; if(!t.used && ok()) p2Jump(SM.me); });
    mgOn(mgRoot, 'pointercancel', () => g = null);
    mgOn(window, 'keydown', e => {
      if(!ok() || e.repeat) return;
      if(e.key === 'ArrowLeft'){ e.preventDefault(); p2Lane(SM.me, -1); }
      else if(e.key === 'ArrowRight'){ e.preventDefault(); p2Lane(SM.me, 1); }
      else if(e.key === 'ArrowUp' || e.key === ' '){ e.preventDefault(); p2Jump(SM.me); }
    });
  },
  hud(){ const P = SM.P; smHud(`${smPart()}<span class="pill">🛟 <b>${P.got}/${P2_NB.length}</b></span><span class="pill">🐚 <b>${P.shells}</b></span>${smBar(P.got/P2_NB.length)}`); },
  step(dt){
    const P = SM.P, go = SM.st === 'go' || SM.st === 'end';
    if(go){
      const want = SM.st === 'end' ? 0 : P2_V*(SM.helped ? 0.84 : 1);
      P.sp += (want - P.sp)*Math.min(1, dt*(SM.st === 'end' ? 1.5 : 1.2));
      const z0 = P.z; P.z += P.sp*dt;
      if(SM.st === 'go'){
        if(SM.host) p2Gen();
        for(const p of [SM.me, SM.pal]){ if(!p || p.gone || p.kind === 'net') continue; if(p.kind === 'ping') p2AI(p, dt); p2Body(p, dt, z0); }
      }
    }
    if(SM.pal && SM.pal.kind === 'net' && !SM.pal.gone){ const p = SM.pal; p.x += (p.nx - p.x)*Math.min(1, dt*12); p.y += (p.ny - p.y)*Math.min(1, dt*14); }
    if(SM.mode === 'net' && SM.host && (P.zT -= dt) <= 0){ P.zT = 0.5; netSend({t:'sme', k:'z2', z:+P.z.toFixed(2)}); }
    // мимо соседа проплыли — вернётся позже; позади — убираем
    P.rows = P.rows.filter(r => {
      if(r.z < P.z - 4){
        if(r.k === 'nb' && !r.got && SM.host && SM.st === 'go'){ P.queue.unshift(r.n); P.nbGap = 0; floatText(L('Вернёмся за ним! 🔄', 'We’ll come back! 🔄'), smAt(p2X(r.ln), -P.z, 1.2), '#2E6FA8'); }
        if(r.o) SM.grp.remove(r.o); return false;
      }
      return true;
    });
    for(const r of P.rows){
      if(r.o){ const show = r.z < (P.rz || 99) - 1.2; if(show && !r.o.visible){ r.o.visible = true; r.o.scale.setScalar(0.3); tween(0.3, k => { if(r.o) r.o.scale.setScalar(0.3 + 0.7*k); }, ease.back); } else if(!show) r.o.visible = false; }
      if(r.k === 'nb' && r.o && !r.got){ r.o.position.y = smAt(0, 0, -0.18 + Math.sin(now*2 + r.z)*0.05).y; r.o.rotation.z = Math.sin(now*1.6 + r.z)*0.05; }
      if(r.k === 'wave' && r.o) r.o.position.y = smAt(0, 0, -0.05 + Math.sin(now*3 + r.z)*0.04).y;
      if(r.k === 'sh' && r.o) r.o.children.forEach(c => { if(c.visible) c.rotation.y += dt*3; });
    }
    // плот и акула впереди
    const rz = P.rz = P.z + P2_RAFT, shz = rz + 3.2;   // плот впереди; всё, что на воде, показывается из-за плота
    P.raft.position.copy(smAt(Math.sin(now*0.7)*0.3, -rz, -0.2 + Math.sin(now*2.2)*0.05)); P.raft.rotation.z = Math.sin(now*1.7)*0.04;
    P.shark.position.copy(smAt(Math.sin(now*0.7 + 0.5)*0.35, -shz, -0.05)); P.shark.rotation.z = Math.sin(now*6)*0.05;
    const tail = P.shark.children.find(c => c.position.x === -1.0); if(tail) tail.rotation.y = Math.sin(now*8)*0.4;
    const ra = P.rope.geometry.attributes.position;
    const a = P.shark.position.clone().add(new V3(0, 0.05, 0.5)), b = P.raft.position.clone().add(new V3(0, 0.1, -0.95));
    ra.setXYZ(0, a.x, a.y, a.z); ra.setXYZ(1, (a.x + b.x)/2, Math.min(a.y, b.y) - 0.12, (a.z + b.z)/2); ra.setXYZ(2, b.x, b.y, b.z); ra.needsUpdate = true;
    P.lh.position.copy(smAt(-4.5, -(P.z + 60), -0.4));
    for(const p of [SM.me, SM.pal]) if(p) p2Draw(p, dt);
    P.water.position.copy(smAt(0, -P.z - 20, -0.32));
    P.lanes.position.copy(smAt(0, -P.z - 22, -0.28)); P.laneTex.offset.y = (P.z/60*18) % 1;
    const far = Math.max(1, Math.min(1.5, 0.62/camera.aspect));
    runCam.pos.copy(smAt(0.2, -(P.z - 9.4*far), 4.9*far**1.7 - 0.25));
    runCam.look.copy(smAt(0, -(P.z + 6.5 + (far - 1)*6), 0.4));
    this.hud();
  },
  help(){
    floatText(L('Я поплыву потише! 🦈', 'I’ll swim slower! 🦈'), SM.P.shark.position.clone().add(new V3(0, 1, 0)), '#D9527E');
    smSay(L('Акула плывёт помедленнее — успеешь! 💗', 'The shark is slowing down — you’ll make it! 💗'), 2400);
  }
};
function p2Swimmer(s, kind, ln){
  SM.grp.add(s.root); s.swimming = true;
  return {root:s.root, seal:s, kind, ln, x:p2X(ln), y:0, vy:0, air:false, tumble:0, nx:p2X(ln), ny:0, aiT:0, gone:false};
}
function p2Jump(p){ if(!p.air && p.tumble <= 0 && SM.st === 'go'){ p.air = true; p.vy = P2_VY; if(p === SM.me) sfx.whoosh(); } }
function p2Lane(p, d){ const n = p.ln + d; if(n < 0 || n > 3){ if(p === SM.me) sfx.tick(); return; } p.ln = n; if(p === SM.me) sfx.tap(); }
function p2Bonk(p){
  if(p.tumble > 0) return;
  p.tumble = 0.7; sfx.plop();
  floatText(p.kind === 'ping' ? L('Кря!', 'Quack!') : L(['Бульк!', 'Ой!', 'Буль-буль!'], ['Blub!', 'Oops!', 'Glug!'])[Math.floor(Math.random()*3)], smAt(p.x, -SM.P.z, p.y + 1), '#2E6FA8');
  if(p === SM.me){ sfx.arf(); smMiss(); if(SM.misses === 1) smSay(L('Ничего! Плывём дальше 🌊', 'No problem! Keep swimming 🌊'), 1800); }
}
function p2Row(r){
  const P = SM.P, g = new THREE.Group(); r.o = g; g.visible = false; SM.grp.add(g);
  if(r.k === 'nb'){
    const fl = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.3, 14), toon(0xE6F2FA)), 1.05); g.add(fl);
    const d = P2_NB[r.n], m = d.make(); m.position.y = 0.15; m.rotation.y = d.off || 0; g.add(m); r.m = m;
    const sp = smSprite('🆘', '#D9527E'); sp.position.y = 1.4; sp.scale.multiplyScalar(0.8); g.add(sp);
    g.position.copy(smAt(p2X(r.ln), -r.z, -0.18));
  } else if(r.k === 'wave'){
    const w = smRoll(P2_LN*2 - 0.1, 0.3); g.add(w); g.position.copy(smAt((p2X(r.ln) + p2X(r.ln + 1))/2, -r.z, -0.05));
  } else if(r.k === 'berg'){
    const b = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.2, 6), toon(0xF3FAFD)), 1.05); b.position.y = 0.3; g.add(b);
    g.position.copy(smAt(p2X(r.ln), -r.z, -0.2));
  } else {
    for(let i = 0; i < 4; i++){ const s = makeShell(0xFFC2D1); s.scale.multiplyScalar(0.75); s.rotation.x = 0.9; s.position.set(0, 0.3, -i*1.2); g.add(s); }
    g.position.copy(smAt(p2X(r.ln), -r.z, 0));
  }
  P.rows.push(r);
}
function p2Gen(){   // хозяин раскладывает впереди: соседи, валы, айсберги, ракушки
  const P = SM.P, rnd = P.rnd;
  while(P.genZ < P.z + 46){
    P.genZ += 6.2 + rnd()*2.2;
    let r;
    if(P.queue.length && P.nbGap >= 3 && P.got + P.rows.filter(q => q.k === 'nb' && !q.got).length < P2_NB.length){
      r = {k:'nb', n:P.queue.shift(), ln:Math.floor(rnd()*4)}; P.nbGap = 0;
      if(SM.helped) r.ln = SM.me.ln;
    } else {
      const k = rnd(), help = SM.helped ? 0.5 : 1;
      r = k < 0.36 ? {k:'wave', ln:Math.floor(rnd()*3)} : k < 0.36 + 0.3*help ? {k:'berg', ln:Math.floor(rnd()*4)} : {k:'sh', ln:Math.floor(rnd()*4)};
      P.nbGap++;
    }
    r.id = P.rid++; r.z = +P.genZ.toFixed(2); r.hit = new Set();
    p2Row(r);
    if(SM.mode === 'net') netSend({t:'sme', k:'row', r:{id:r.id, k:r.k, z:r.z, ln:r.ln, n:r.n}});
  }
}
function p2Body(p, dt, z0){
  const P = SM.P, wx = p2X(p.ln); p.x += (wx - p.x)*Math.min(1, dt*11);
  if(p.tumble > 0) p.tumble = Math.max(0, p.tumble - dt);
  if(p.air){ p.y += p.vy*dt - P2_G*dt*dt/2; p.vy -= P2_G*dt; if(p.y <= 0 && p.vy < 0){ p.y = 0; p.air = false; if(p === SM.me) sfx.plop(); burst(TEX.puff, smAt(p.x, -P.z, 0), 4, 0.8, 0.3); } }
  const who = p === SM.me ? 'me' : 'pal', near = z => z > z0 - 0.5 && z < P.z + 0.5;
  for(const r of P.rows){
    if(r.hit.has(who) || !near(r.z)) continue;
    if(r.k === 'wave'){ if(p.x > p2X(r.ln) - 0.6 && p.x < p2X(r.ln + 1) + 0.6){ r.hit.add(who); if(p.y < 0.42) p2Bonk(p); } }
    else if(Math.abs(p2X(r.ln) - p.x) < 0.62){
      r.hit.add(who);
      if(r.k === 'berg'){ if(p.y < 0.9) p2Bonk(p); }
      else if(r.k === 'sh'){ /* ракушки собираем по одной ниже */ }
      else if(r.k === 'nb' && !r.got){ if(SM.host) p2Got(r, who === 'me' ? 1 : 2); else netSend({t:'sme', k:'pick', id:r.id}); }
    }
  }
  for(const r of P.rows) if(r.k === 'sh' && Math.abs(p2X(r.ln) - p.x) < 0.6 && p.y < 1.1) r.o.children.forEach((s, i) => {
    const sz = r.z + i*1.2; if(s.visible && sz > z0 - 0.6 && sz < P.z + 0.6){ s.visible = false; if(who === 'me'){ P.shells++; sfx.coin(); } }
  });
}
// сосед спасён: прыгает с льдинки на плот (who: 1 — хозяин, 2 — напарник)
function p2Got(r, who){
  const P = SM.P; if(r.got) return;
  r.got = true; P.got++;
  if(SM.mode === 'net' && SM.host) netSend({t:'sme', k:'got', id:r.id, w:who});
  const d = P2_NB[r.n], m = r.m, seat = P.seats[(P.got - 1) % P.seats.length];
  sfx.good(); floatText(L(`${d.n}: спасибо! 💗`, `${d.n}: thank you! 💗`), r.o.position.clone().add(new V3(0, 1.6, 0)), '#D9527E');
  const from = m.getWorldPosition(new V3()); r.o.remove(m); SM.grp.add(m); m.position.copy(from);
  const sp = r.o.children.find(c => c.isSprite); if(sp) sp.visible = false;
  tween(0.8, k => {
    const to = P.raft.localToWorld(new V3(seat[0], 0.25, seat[1]));
    m.position.lerpVectors(from, to, k); m.position.y += Math.sin(k*Math.PI)*1.6;
  }, ease.lin).then(() => { if(!SM || SM.P !== P) return; SM.grp.remove(m); m.position.set(seat[0], 0.2, seat[1]); m.rotation.y = (d.off || 0) + Math.PI; P.raft.add(m); burst(TEX.heart, P.raft.position.clone().add(new V3(0, 0.8, 0)), 6, 1.4, 0.25); });
  if(P.got >= P2_NB.length && SM.host) p2Win();
}
function p2Win(){ if(SM.st !== 'go') return; SM.st = 'end'; if(SM.mode === 'net') netSend({t:'sme', k:'win'}); p2WinFx(); }
async function p2WinFx(){
  SM.st = 'end'; sfx.good();
  mgHint(L('Все соседи на плоту! Акула везёт всех к маяку 🗼', 'All the neighbours are on the raft! The shark takes everyone to the lighthouse 🗼'));
  await wait(2.6); if(SM) SM.end = 'win';
}
function p2AI(p, dt){
  if(p.tumble > 0) return;
  const P = SM.P, z = P.z;
  if(!p.air && P.rows.some(r => r.k === 'wave' && r.z - z > 1.0 && r.z - z < 1.9 && p.x > p2X(r.ln) - 0.6 && p.x < p2X(r.ln + 1) + 0.6) && Math.random() < 0.95) p2Jump(p);
  if((p.aiT -= dt) > 0) return;
  p.aiT = 0.28 + Math.random()*0.12;
  const score = l => {
    let s = 0;
    for(const r of P.rows){ const d = r.z - z; if(d < 0.3 || d > 9) continue;
      if(r.k === 'berg' && r.ln === l && d < 6) s -= 10;
      if(r.k === 'nb' && !r.got && r.ln === l) s += 7 - d*0.3;
      if(r.k === 'sh' && r.ln === l) s += 0.8; }
    if(l === SM.me.ln) s -= 1.5;
    return s - Math.abs(l - p.ln)*0.7;
  };
  let best = p.ln, bs = -1e9;
  for(let l = 0; l < 4; l++){ const s = score(l); if(s > bs){ bs = s; best = l; } }
  if(best !== p.ln) p2Lane(p, Math.sign(best - p.ln));
}
function p2Draw(p, dt){
  const s = p.seal;
  s.root.visible = !p.gone;
  s.root.position.copy(smAt(p.x, -SM.P.z, p.y - 0.22 + Math.sin(now*4 + p.x)*0.04));
  s.root.rotation.set(0, Math.PI, (p2X(p.ln) - p.x)*0.3);
  s.inner.rotation.x = p.tumble > 0 ? -(1 - p.tumble/0.7)*Math.PI*2 : p.air ? -0.25 : 0.1;
  s.flap = p.air ? 0.8 : 0.4;
  if(!p.air && Math.random() < dt*6) emit(TEX.puff, smAt(p.x + (Math.random() - 0.5)*0.3, -SM.P.z + 0.3, -0.1), {v:new V3(0, 0.3, 1.2), life:0.4, size:0.22, grow:1});
  updateSeal(s, now, dt);
}
function p2Net(m){
  const P = SM.P;
  if(m.k === 'row' && !SM.host){ const r = Object.assign({hit:new Set()}, m.r); p2Row(r); }
  else if(m.k === 'z2' && !SM.host){ const d = m.z - P.z; if(Math.abs(d) > 4) P.z = m.z; else P.z += d*0.5; }
  else if(m.k === 'pick' && SM.host){ const r = P.rows.find(q => q.id === m.id); if(r && r.k === 'nb' && !r.got) p2Got(r, 2); }
  else if(m.k === 'got' && !SM.host){ const r = P.rows.find(q => q.id === m.id); if(r) p2Got(r, m.w); else P.got++; }
  else if(m.k === 'win' && !SM.host) p2WinFx();
}

/* =====================================================================================================
   Часть 3. 🗼 Держим маяк: волны бьют в ледяную стену — чиним трещины
   ===================================================================================================== */
const P3_N = 5, p3X = i => (i - 2)*1.18, P3_WZ = -1.3, P3_STAND = 0.35, P3_FIX = 0.45;
const P3_NEED = [16, 20];   // сколько починок, чтобы шторм ослаб: одной / вдвоём
const P3_CRACK = [1, 2].map(lv => canvasTex(128, (g, w, h) => {
  g.lineCap = 'round'; g.lineJoin = 'round';
  for(const [lw, c] of [[lv > 1 ? 16 : 13, '#3B3A4A'], [lv > 1 ? 8 : 6, lv > 1 ? '#5FB8E8' : '#8FD3F5']]){
    g.lineWidth = lw; g.strokeStyle = c; g.beginPath();
    g.moveTo(64, 6); g.lineTo(52, 40); g.lineTo(72, 62); g.lineTo(56, 96); g.lineTo(66, 122);
    g.moveTo(52, 40); g.lineTo(28, 50); g.moveTo(72, 62); g.lineTo(98, 70);
    if(lv > 1){ g.moveTo(56, 96); g.lineTo(26, 110); g.moveTo(72, 62); g.lineTo(96, 30); g.moveTo(28, 50); g.lineTo(12, 76); }
    g.stroke();
  }
}));
const P3 = {
  helpAt:2,
  intro:() => [L('Волны бьют в ледяную стену у маяка! 🗼', 'Waves are hitting the ice wall by the lighthouse! 🗼'),
    L('Трещина? Коснись блока — тюлень поставит новую льдинку 🧊', 'A crack? Tap the block — your seal puts in a new piece of ice 🧊'),
    L('Смотри, куда катится волна, и чини заранее! Большую трещину — два раза', 'Watch where the wave rolls and fix it early! A big crack needs two fixes')],
  setup(){
    const G = SM.grp, P = SM.P;
    smWater(0x4A80A3);
    const ground = addOutline(new THREE.Mesh(new THREE.BoxGeometry(8, 0.6, 5), toon(0xD6EAF5)), 1.01); ground.position.copy(smAt(0, 1.6, -0.3)); G.add(ground);
    const lh = smLighthouse(); lh.scale.setScalar(0.62); lh.position.copy(smAt(-3.2, 2.2, -0.05)); G.add(lh); P.lh = lh;
    P.blocks = [];
    for(let i = 0; i < P3_N; i++){
      const g = new THREE.Group(); g.position.copy(smAt(p3X(i), P3_WZ, 0)); G.add(g);
      const b = addOutline(new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.0, 0.7), toon(0xBFE6F7)), 1.03); b.position.y = 0.5; g.add(b);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.12, 0.72), toon(0xFFFFFF)); cap.position.y = 1.02; g.add(cap);
      const cr = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.98), new THREE.MeshBasicMaterial({map:P3_CRACK[0], transparent:true, depthWrite:false})); cr.position.set(0, 0.5, 0.36); cr.visible = false; g.add(cr);
      P.blocks.push({i, lv:0, g, cr, sprayT:0, mat:b.material});
    }
    P.waves = []; P.waveT = 3.2; P.pr = 0; P.leaks = 0; P.need = P3_NEED[SM.mode === 'solo' && !SM.helped ? 0 : 1]; P.bear = null;
    const ms = smMe(); SM.me = smActor(ms.root, ms, 'me', SM.host ? -0.65 : 0.65, P3_STAND); SM.me.tgt = null; SM.me.fix = 0;
    mgOn(mgRoot, 'pointerdown', e => {
      if(e.target.closest('button') || SM.st !== 'go') return; e.preventDefault();
      let best = -1, bd = 1e9;
      for(const b of P.blocks){ const s = toScreen(b.g.position.clone().add(new V3(0, 0.5, 0))), d = Math.hypot(s.x - e.clientX, s.y - e.clientY); if(d < bd){ bd = d; best = b.i; } }
      if(bd > Math.max(110, innerWidth*0.22)) return;
      SM.me.tgt = best; sfx.tap();
    });
    mgOn(window, 'keydown', e => { const n = +e.key; if(n >= 1 && n <= 5 && SM.st === 'go') SM.me.tgt = n - 1; });
  },
  hud(){ const P = SM.P; smHud(`${smPart()}<span class="pill">🧊 <b>${P.pr}/${P.need}</b></span>${smBar(P.pr/P.need)}`); },
  step(dt){
    const P = SM.P, go = SM.st === 'go';
    for(const o of [SM.me, SM.pal, P.bear]){ if(!o || o.gone || o.kind === 'net') continue; if(o.kind !== 'me' && go && (SM.host || o.kind === 'bear')) p3AI(o); p3Walk(o, dt); }
    if(SM.pal && SM.pal.kind === 'net') smPalFollow(SM.pal, dt);
    if(SM.host && go && (P.waveT -= dt) <= 0){ P.waveT = Math.max(2.3, 3.4 - P.pr*0.06)*(SM.helped ? 1.12 : 1)*(0.9 + Math.random()*0.2); p3Wave(); }
    P.waves = P.waves.filter(w => {
      w.z += dt*5.4; w.o.position.copy(smAt(w.x, w.z, -0.05 + Math.min(0.35, (w.z + 12)*0.05)));
      if(Math.random() < 0.3) emit(TEX.puff, smAt(w.x + (Math.random() - 0.5)*w.len, w.z, 0.4), {v:new V3(0, 0.6, 0.4), life:0.4, size:0.4, grow:1});
      w.o.children[0].rotation.x = now*3;   // вал катится
      w.marks.forEach((m, j) => m.position.y = P.blocks[w.a + j].g.position.y + 1.55 + Math.abs(Math.sin(now*6))*0.12);
      if(w.z >= P3_WZ - 0.6){ SM.grp.remove(w.o); w.marks.forEach(m => SM.grp.remove(m)); p3Hit(w); return false; }
      return true;
    });
    for(const b of P.blocks){
      b.cr.visible = b.lv > 0; if(b.lv) b.cr.material.map = P3_CRACK[b.lv - 1];
      b.mat.color.setHex(b.lv === 2 ? 0x9FCDE6 : b.lv ? 0xB2DDF1 : 0xBFE6F7);
      if(b.lv === 2 && (b.sprayT -= dt) <= 0){ b.sprayT = 0.12; emit(TEX.drop, b.g.position.clone().add(new V3((Math.random() - 0.5)*0.6, 0.6, 0.4)), {v:new V3((Math.random() - 0.5), 1.2, 1.6), g:4, life:0.6, size:0.12}); }
    }
    // маяк мигает слабым светом — «держится»
    const u = P.lh.userData; u.glow.material.opacity = 0.25 + Math.sin(now*3)*0.1; u.glow.scale.setScalar(1.6);
    smCam(smAt(0, -1.4, 0.3), 6.4, 8.4, 0.86);
    this.hud();
  },
  help(){
    const b = feBearMake(); b.scale.setScalar(0.3);
    SM.P.bear = smActor(b, null, 'bear', 3.8, P3_STAND); Object.assign(SM.P.bear, {tgt:null, fix:0, slow:true});
    toast(L('Медведь несёт льдинки! 🐻‍❄️🧊', 'The bear brings ice blocks! 🐻‍❄️🧊'), 2600); sfx.good();
    if(SM.mode === 'net') netSend({t:'sme', k:'bear'});
  }
};
function p3Walk(o, dt){
  const P = SM.P;
  if(o.fix > 0){
    o.fix -= dt; o.z = P3_STAND - 0.45; o.hop += dt*20;
    if(o.fix <= 0){
      o.hop = 0; const i = o.tgt; o.tgt = null;
      if(SM.host) p3Fix(i, o); else if(o === SM.me) netSend({t:'sme', k:'fix', i});
    }
  } else if(o.tgt != null){
    const tx = p3X(o.tgt) + (o.kind === 'bear' ? 0.2 : 0);
    o.z += (P3_STAND - o.z)*Math.min(1, dt*8);
    if(smMoveTo(o, tx, o.z, o.slow ? 2.4 : 3.8, dt)){
      const b = P.blocks[o.tgt];
      if(b.lv > 0){ o.fix = P3_FIX*(o.slow ? 1.4 : 1); o.yaw = Math.PI; sfx.tick(); }
      else { if(o === SM.me) floatText(L('Тут крепко 👍', 'This one is fine 👍'), b.g.position.clone().add(new V3(0, 1.4, 0))); o.tgt = null; }
    }
  } else { o.z += (P3_STAND - o.z)*Math.min(1, dt*8); o.hop = 0; o.yaw = Math.PI; }
  smDraw(o, dt);
}
function p3AI(o){   // Пинг и медведь: к самой большой трещине, куда не идут другие
  if(o.tgt != null || o.fix > 0) return;
  if(o.kind === 'bear' && (o.waitT = (o.waitT || 0) + 1) < 40) return;   // медведь не торопится
  o.waitT = 0;
  const P = SM.P, busy = new Set([SM.me.tgt, SM.pal && SM.pal.tgt, P.bear && P.bear.tgt].filter(v => v != null));
  const c = P.blocks.filter(b => b.lv > 0 && !busy.has(b.i)).sort((a, b) => b.lv - a.lv || Math.abs(p3X(a.i) - o.x) - Math.abs(p3X(b.i) - o.x));
  if(c.length) o.tgt = c[0].i;
}
function p3Wave(a, n){
  const P = SM.P, spawn = a == null;
  if(spawn){ n = Math.random() < 0.35 + P.pr*0.02 ? 2 : 1; a = Math.floor(Math.random()*(P3_N - n + 1)); if(SM.mode === 'net') netSend({t:'sme', k:'w3', a, n}); }
  const len = n*1.18 - 0.08, o = smRoll(len, 0.46), x = (p3X(a) + p3X(a + n - 1))/2;
  const crest = smSprite('🌊', '#3B3A4A'); crest.scale.multiplyScalar(1.5); crest.position.y = 1.1; o.add(crest);
  const marks = [];   // «!» над блоками, куда ударит волна
  for(let i = a; i < a + n; i++){ const m = smSprite('❗', '#D9527E'); m.scale.multiplyScalar(1.3); m.position.copy(P.blocks[i].g.position).add(new V3(0, 1.55, 0)); SM.grp.add(m); marks.push(m); }
  SM.grp.add(o); P.waves.push({a, n, len, o, x, z:-12, marks});
}
function p3Hit(w){
  const P = SM.P; let leak = false;
  sfx.splash(); burst(TEX.puff, smAt(w.x, P3_WZ - 0.3, 1.1), 10, 2.2, 0.5);
  if(!SM.host) return;
  for(let i = w.a; i < w.a + w.n; i++){ const b = P.blocks[i]; if(b.lv < 2) b.lv++; else leak = true; }
  if(leak){
    P.pr = Math.max(0, P.pr - 1); P.leaks++; smMiss();
    floatText(L('Протекло! 💦', 'A leak! 💦'), smAt(w.x, P3_WZ, 1.6), '#2E6FA8'); burst(TEX.drop, smAt(w.x, P3_WZ + 0.6, 0.8), 12, 1.8, 0.16);
    if(P.leaks === 1) smSay(L('Большие трещины протекают — чини их первыми! 🧊', 'Big cracks leak — fix them first! 🧊'), 2600);
  }
  p3Sync();
}
function p3Fix(i, o){
  const P = SM.P, b = P.blocks[i]; if(!b || !b.lv) return;
  b.lv--; P.pr++;
  sfx.thud(); sfx.lever();
  const cube = addOutline(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.3), toon(0xE6F6FD)), 1.06); cube.position.copy(b.g.position.clone().add(new V3(0, 2.2, 0.4))); SM.grp.add(cube);
  tween(0.3, k => cube.position.y = b.g.position.y + 2.2 - k*1.6, ease.lin).then(() => { if(SM) SM.grp.remove(cube); burst(TEX.star, b.g.position.clone().add(new V3(0, 0.8, 0.4)), 5, 1.2, 0.2); });
  floatText(b.lv ? L('Ещё разок!', 'One more!') : '+1 🧊', b.g.position.clone().add(new V3(0, 1.5, 0)), '#3E8DB8');
  if(P.pr === Math.ceil(P.need/2)) smSay(L('Шторм слабеет! Ещё немного 💪', 'The storm is getting weaker! A bit more 💪'), 2200);
  p3Sync();
  if(P.pr >= P.need && SM.st === 'go') p3Win();
}
function p3Sync(){ const P = SM.P; if(SM.mode === 'net' && SM.host) netSend({t:'sme', k:'blk', lv:P.blocks.map(b => b.lv), pr:P.pr, need:P.need}); }
function p3Win(){ SM.st = 'end'; if(SM.mode === 'net') netSend({t:'sme', k:'win'}); p3WinFx(); }
async function p3WinFx(){
  SM.st = 'end'; sfx.good();
  const P = SM.P; P.waves.forEach(w => { SM.grp.remove(w.o); w.marks.forEach(m => SM.grp.remove(m)); }); P.waves = [];
  mgHint(L('Маяк выстоял! Стена крепкая 🗼💪', 'The lighthouse held! The wall is strong 🗼💪'));
  for(const b of P.blocks){ b.lv = 0; burst(TEX.star, b.g.position.clone().add(new V3(0, 1, 0.3)), 4, 1.2, 0.2); }
  await wait(2.4); if(SM) SM.end = 'win';
}
function p3Net(m){
  const P = SM.P;
  if(m.k === 'w3' && !SM.host) p3Wave(m.a, m.n);
  else if(m.k === 'blk' && !SM.host){ m.lv.forEach((v, i) => { const b = P.blocks[i]; if(b && v < b.lv){ sfx.thud(); floatText('+1 🧊', b.g.position.clone().add(new V3(0, 1.5, 0)), '#3E8DB8'); } if(b) b.lv = v; }); P.pr = m.pr; P.need = m.need; }
  else if(m.k === 'fix' && SM.host) p3Fix(m.i, SM.pal);
  else if(m.k === 'bear' && !SM.host){ const b = feBearMake(); b.scale.setScalar(0.3); P.bear = smActor(b, null, 'bear', 3.8, P3_STAND); Object.assign(P.bear, {tgt:null, fix:0, slow:true}); toast(L('Медведь несёт льдинки! 🐻‍❄️🧊', 'The bear brings ice blocks! 🐻‍❄️🧊'), 2600); }
  else if(m.k === 'win' && !SM.host) p3WinFx();
}

/* =====================================================================================================
   Часть 4. 🌈 Глаз бури: подъём на маяк в ветер и зажечь лампу
   ===================================================================================================== */
const P4_R = 1.95, P4_TURNS = 2, P4_H = 7.2, P4_V = 0.052, P4_A0 = 0.35;
const P4_SPIN = [3, 4];   // сколько оборотов пальцем вокруг лампы: одной / вдвоём (напарник крутит тоже)
const p4Ang = h => P4_A0 - h*P4_TURNS*Math.PI*2;
const p4Pos = (h, dr = 0) => { const a = p4Ang(h); return {x:Math.sin(a)*(P4_R + dr), z:Math.cos(a)*(P4_R + dr), y:0.15 + h*(P4_H - 0.15)}; };
const P4 = {
  helpAt:1,
  intro:() => [L('Глаз бури: стало тихо и темно… Клякса светит, Туча держит ветер ☁️🐙', 'The eye of the storm: it’s quiet and dark… Blot shines, the Cloud holds back the wind ☁️🐙'),
    L('Поднимись на маяк и зажги его! 🗼', 'Climb the lighthouse and light it up! 🗼'),
    L('🌬️ Ветер! Нажми и держи палец на экране — тогда не сдует ✋', '🌬️ Wind! Press and hold your finger on the screen — then it won’t blow you away ✋')],
  setup(){
    const G = SM.grp, P = SM.P;
    smWater(0x3F6F90);
    const rock = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(3.4, 4.2, 1.2, 10), toon(0xA9B8C8)), 1.02); rock.position.copy(smAt(0, 0, -0.85)); G.add(rock);
    const lh = smLighthouse(P4_H); lh.position.copy(smAt(0, 0, -0.25)); G.add(lh); P.lh = lh;
    // винтовая лестница с перилами
    const n = 44, stepM = toon(0xFFFDF8), railM = toon(0xD9527E);
    for(let i = 0; i < n; i++){
      const h = i/(n - 1), p = p4Pos(h, 0), a = p4Ang(h);
      const st = addOutline(new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.1, 0.5), stepM), 1.05); st.position.copy(smAt(p.x, p.z, p.y - 0.2)); st.rotation.y = a; G.add(st);
      if(i % 3 === 0){ const q = p4Pos(h, 0.42); const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 6), railM); post.position.copy(smAt(q.x, q.z, q.y + 0.05)); G.add(post); }
    }
    const pts = []; for(let i = 0; i <= 120; i++){ const q = p4Pos(i/120, 0.42); pts.push(smAt(q.x, q.z, q.y + 0.32)); }
    G.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 0.035, 6), railM));
    // Клякса светит рядом, Туча держит ветер
    const blot = glOctoModel(); blot.scale.setScalar(0.3); G.add(blot); P.blot = blot;
    const bg = new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.puff, color:0xC9B6FF, transparent:true, depthWrite:false, opacity:0.7})); bg.scale.setScalar(2.6); G.add(bg); P.blotGlow = bg;
    const cl = makeCloud(); cloudKind(cl, true); cl.scale.setScalar(0.7); G.add(cl); P.cloud = cl;
    const ms = smMe(); SM.me = {root:ms.root, seal:ms, kind:'me', h:0, tumble:0, hold:false, top:false}; G.add(ms.root);
    P.g = {st:'calm', t:3.5, n:0}; P.spin = 0; P.lit = false; P.camA = p4Ang(0); P.tip = 0;
    SM.light = 0.5; SM.rain = 0.35; SM.wind = 0.4;
    // управление: держать палец = держаться; наверху — крутить вокруг лампы
    let last = null;
    const down = e => { if(e.target.closest('button')) return; e.preventDefault(); SM.me.hold = true; last = e.pointerId === undefined ? null : {id:e.pointerId, a:p4TouchA(e)}; };
    mgOn(mgRoot, 'pointerdown', down);
    mgOn(mgRoot, 'pointermove', e => {
      if(!last || last.id !== e.pointerId || !p4Spinning()) return;
      const a = p4TouchA(e); let d = a - last.a; while(d > Math.PI) d -= Math.PI*2; while(d < -Math.PI) d += Math.PI*2;
      last.a = a; p4SpinAdd(Math.min(0.6, Math.abs(d))/(Math.PI*2));
    });
    const up = e => { if(last && last.id === e.pointerId) last = null; SM.me.hold = false; };
    mgOn(mgRoot, 'pointerup', up); mgOn(mgRoot, 'pointercancel', up);
    mgOn(window, 'keydown', e => { if(e.key === ' ' || e.key === 'ArrowUp'){ e.preventDefault(); SM.me.hold = true; if(p4Spinning() && !e.repeat) p4SpinAdd(0.25); } });
    mgOn(window, 'keyup', e => { if(e.key === ' ' || e.key === 'ArrowUp') SM.me.hold = false; });
  },
  hud(){
    const P = SM.P, sp = p4Spinning() || P.lit;
    smHud(`${smPart()}<span class="pill">${sp ? `💡 <b>${Math.min(P.spin, P.need()).toFixed(1).replace('.0', '')}/${P.need()}</b>` : `🗼 <b>${Math.round(SM.me.h*100)}%</b>`}</span>${smBar(sp ? P.spin/P.need() : SM.me.h)}`
      + `<span class="sm-hold${SM.me.hold ? ' on' : ''}${P.g.st === 'warn' || P.g.st === 'blow' ? ' warn' : ''}" aria-hidden="true">✋</span>`);
  },
  step(dt){
    const P = SM.P, me = SM.me, go = SM.st === 'go';
    P.need = () => P4_SPIN[SM.pal && !SM.pal.gone ? 1 : 0];
    // порывы ветра (решает хозяин)
    if(SM.host && go && !P.lit) p4Gust(dt);
    // подъём
    for(const p of [me, SM.pal]){
      if(!p || p.gone || p.kind === 'net') continue;
      if(p.kind === 'ping') p.hold = P.g.st === 'warn' ? Math.random() < 0.6 || p.hold : P.g.st === 'blow' ? p.hold || Math.random() < 0.03 : false;
      if(go && !p.top && p.tumble <= 0 && !(p.hold && P.g.st !== 'calm')){ p.h = Math.min(1, p.h + P4_V*dt*(p.hold ? 0.3 : 1)); p.hop = (p.hop || 0) + dt*12; }
      if(p.h >= 1 && !p.top){ p.top = true; if(p === me){ sfx.good(); smSay(L('Наверху! 🗼', 'At the top! 🗼'), 1600); } }
    }
    if(SM.pal && SM.pal.kind === 'net' && !SM.pal.gone){ const p = SM.pal; p.h += (p.nh - p.h)*Math.min(1, dt*8); }
    if(SM.pal && SM.pal.kind === 'ping' && p4Spinning()) p4SpinAdd(dt*0.28, true);
    if(!P.tip && me.top && !p4Spinning()){ P.tip = 1; smSay(L('Подожди напарника — зажжём вместе! 💗', 'Wait for your partner — we’ll light it together! 💗'), 2400); }
    if(P.tip < 2 && p4Spinning()){ P.tip = 2; mgHint(L('Крути пальцем по кругу вокруг лампы! 🔄💡', 'Swirl your finger around the lamp! 🔄💡')); }
    // тюлени на лестнице
    [me, SM.pal].forEach((p, j) => {
      if(!p || p.gone) return;
      const q = p4Pos(p.h, j ? 0.18 : -0.12), a = p4Ang(p.h), s = p.seal, blow = P.g.st === 'blow' && p.hold;
      p.root.position.copy(smAt(q.x, q.z, q.y + (p.hop && !p.top ? Math.abs(Math.sin(p.hop))*0.05 : 0)));
      p.root.rotation.set(0, a - Math.PI/2 + (p.top ? Math.PI/2 : 0), 0);
      if(s){
        s.inner.rotation.x = p.tumble > 0 ? -(1 - p.tumble/0.8)*Math.PI*2 : 0;
        s.inner.rotation.z = blow ? Math.sin(now*30)*0.05 : 0; s.flap = blow ? 0.2 : p.top ? 0.6 : 0.3;
        s.body.scale.y *= blow ? 0.85 : 1;
        updateSeal(s, now + j, dt);
      }
      if(p.tumble > 0) p.tumble = Math.max(0, p.tumble - dt);
    });
    // Клякса светит рядом со мной (чуть ближе к камере), Туча — справа в небе, дует навстречу ветру
    const right = new V3(Math.cos(P.camA), 0, -Math.sin(P.camA)), toward = new V3(Math.sin(P.camA), 0, Math.cos(P.camA));
    const mw = me.root.position, bt = mw.clone().addScaledVector(toward, 0.9).addScaledVector(right, -0.55); bt.y += 0.75 + Math.sin(now*2)*0.1;
    P.blot.position.lerp(bt, Math.min(1, dt*3)); P.blot.rotation.y = P.camA;
    P.blotGlow.position.copy(P.blot.position); P.blotGlow.material.opacity = P.lit ? 0 : 0.55 + Math.sin(now*3)*0.1;
    const cy = Math.min(P4_H + 2.2, me.h*(P4_H - 0.15) + 2.7), ct = smAt(0, 0, cy + Math.sin(now*1.5)*0.15).addScaledVector(right, 1.5).addScaledVector(toward, 2.6);
    P.cloud.position.lerp(ct, Math.min(1, dt*2));
    P.cloud.rotation.y = P.camA; P.cloud.scale.setScalar(0.6*(P.g.st === 'blow' && P.g.block ? 1.25 : 1));
    if(P.g.st === 'blow' && Math.random() < 0.7) p4WindFx();
    // лампа
    const u = P.lh.userData, k = P.lit ? 1 : Math.min(1, P.spin/P.need());
    u.lamp.material.color.setRGB(0.54 + k*0.46, 0.56 + k*0.4, 0.65 - k*0.1); u.glow.material.opacity = k*0.9; u.glow.scale.setScalar(0.4 + k*(P.lit ? 5 : 2.2));
    if(P.lit){ u.beam.visible = true; u.beam.rotation.y += dt*1.1; }
    // камера вокруг маяка — со стороны тюленя
    if(!P.fin){
      const want = p4Ang(me.h) + 0.3; P.camA += smAng(want, P.camA)*Math.min(1, dt*1.5);
      const top = me.top || p4Spinning(), y = top ? P4_H + 0.4 : me.h*(P4_H - 0.15) + 0.4;
      const far = Math.max(1, Math.min(1.45, 0.62/camera.aspect)), R = (top ? 12 : 11)*far;
      runCam.pos.lerp(smAt(Math.sin(P.camA)*R, Math.cos(P.camA)*R, y + 2.4*far), Math.min(1, dt*3));
      runCam.look.lerp(smAt(Math.sin(P.camA)*1.2, Math.cos(P.camA)*1.2, y + (top ? 0.5 : 0.1)), Math.min(1, dt*3));
    }
    this.hud();
  },
  help(){
    floatText(L('Я держу ветер! 💨☁️', 'I’m holding back the wind! 💨☁️'), SM.P.cloud.position.clone().add(new V3(0, 1.1, 0)), '#3E8DB8');
    smSay(L('Туча дует навстречу ветру — теперь полегче! ☁️', 'The Cloud blows against the wind — easier now! ☁️'), 2400);
  }
};
function p4Spinning(){ const P = SM.P; return SM.me.top && (!SM.pal || SM.pal.gone || SM.pal.h >= 0.99) && !P.lit; }
function p4TouchA(e){ const s = toScreen(SM.P.lh.userData.lamp.getWorldPosition(new V3())); return Math.atan2(e.clientY - s.y, e.clientX - s.x); }
function p4SpinAdd(d, bot){
  const P = SM.P; if(P.lit || SM.st !== 'go') return;
  if(!bot && Math.random() < d*6) emit(TEX.star, P.lh.userData.lamp.getWorldPosition(new V3()), {v:new V3((Math.random() - 0.5)*2, 1.2, (Math.random() - 0.5)*2), life:0.6, size:0.2, spin:4});
  if(!SM.host){ P.spin += d; P.sendSpin = (P.sendSpin || 0) + d; if(P.sendSpin > 0.1){ netSend({t:'sme', k:'spin', d:+P.sendSpin.toFixed(3)}); P.sendSpin = 0; } return; }
  const was = Math.floor(P.spin); P.spin += d;
  if(Math.floor(P.spin) > was){ sfx.sparkle(); if(SM.mode === 'net') netSend({t:'sme', k:'sp', v:+P.spin.toFixed(2)}); }
  if(P.spin >= P.need()) p4Light();
}
function p4Gust(dt){
  const P = SM.P, g = P.g;
  g.t -= dt;
  if(g.st === 'calm' && g.t <= 0){
    g.st = 'warn'; g.t = 1.45; g.n++; g.block = g.n % 2 === 0 || SM.helped && g.n % 3 !== 1;   // Туча держит каждый 2-й порыв (после промаха — чаще)
    p4GustFx('warn');
  } else if(g.st === 'warn' && g.t <= 0){ g.st = 'blow'; g.t = 1.1; g.hit = new Set(); p4GustFx('blow'); }
  else if(g.st === 'blow'){
    for(const p of [SM.me, SM.pal]) if(p && !p.gone && p.kind !== 'net' && !p.hold && !p.top && !g.hit.has(p) && !g.block && g.t < 0.8) p4Slide(p);
    if(g.t <= 0){ g.st = 'calm'; g.t = 3.2 + Math.random()*1.4; p4GustFx('calm'); }
  }
}
function p4GustFx(st){
  const P = SM.P, g = P.g;
  if(SM.mode === 'net' && SM.host) netSend({t:'sme', k:'g4', st, b:g.block ? 1 : 0});
  g.st = st;
  if(st === 'warn'){ smWindSfx(); if(!SM.me.top) mgHint(L('🌬️ Ветер! Держись — нажми и держи ✋', '🌬️ Wind! Hold on — press and hold ✋')); SM.wind = 1.4; }
  else if(st === 'blow'){ if(g.block){ floatText(L('Держу! ☁️💨', 'Got it! ☁️💨'), P.cloud.position.clone().add(new V3(0, 1, 0)), '#3E8DB8'); sfx.whoosh(); } SM.wind = g.block ? 0.8 : 2.2; }
  else { SM.wind = 0.4; if(!p4Spinning() && !P.lit && mgHintEl.textContent.includes('🌬️')) mgHint(''); }
}
function p4Slide(p){
  const P = SM.P; P.g.hit.add(p);
  p.tumble = 0.8; p.h = Math.max(0, p.h - (SM.helped ? 0.04 : 0.07));
  sfx.whoosh(); floatText(p.kind === 'ping' ? L('Кря-а-а!', 'Qua-a-ack!') : L('Уууух!', 'Wheee!'), SM.grp.localToWorld(p.root.position.clone()).add(new V3(0, 0.8, 0)), '#3E8DB8');
  if(p === SM.me){ sfx.arf(); smMiss(); if(SM.misses === 1 && !SM.helped) smSay(L('Сдуло на пару ступенек! Держись, когда дует ✋', 'Blown down a couple of steps! Hold on when it blows ✋'), 2400); }
}
function p4WindFx(){
  const c = runCam.look, a = SM.P.camA;
  const side = new V3(Math.cos(a), 0, -Math.sin(a));
  emit(TEX.dot, c.clone().add(side.clone().multiplyScalar(-4)).add(new V3(0, (Math.random() - 0.3)*3, 0)), {v:side.clone().multiplyScalar(9), life:0.8, size:0.07});
}
function p4Light(){ const P = SM.P; if(P.lit) return; P.lit = true; SM.st = 'end'; if(SM.mode === 'net' && SM.host) netSend({t:'sme', k:'lit'}); p4Finale(); }
// маяк горит — шторм уходит, радуга, все друзья внизу на льдине
async function p4Finale(){
  const P = SM.P; P.lit = true; SM.st = 'end'; P.fin = true;
  sfx.grow(); mgHint(L('Маяк горит! ✨', 'The lighthouse is shining! ✨'));
  burst(TEX.star, P.lh.userData.lamp.getWorldPosition(new V3()), 18, 3, 0.3);
  // друзья на льдине перед маяком
  const F = new THREE.Group(); SM.grp.add(F); P.friends = F;
  const floe = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.6, 0.5, 20), toon(0xD6EAF5)), 1.02); floe.scale.z = 0.55; floe.position.copy(smAt(0, 6.4, -0.3)); F.add(floe);
  const pals = [];
  const put = (o, x, z, sc, yaw = 0) => { o.position.copy(smAt(x, 6.4 + z, 0)); o.scale.setScalar(sc); o.rotation.y = yaw; F.add(o); pals.push(o); };
  put(makePenguin(PENG).root, -1.6, 0.2, 0.3);
  put(feBearMake(), 1.9, -0.4, 0.26);
  put(DV_MAKE.otter(), 0.9, 0.9, 0.5, -Math.PI/2);
  put(DV_MAKE.turtle(), -0.6, 1.1, 0.4, -Math.PI/2);
  put(DV_MAKE.crab(), 2.6, 0.7, 0.55);
  put(makePenguin({name:'', f:true, color:0x5C6FA6}).root, -2.5, 0.8, 0.2);
  put(rsSealLook({c:0xFFFFFF}, '#FFD66B', 0.22).root, 0.1, 0.4, 0.22);
  const sh = DV_MAKE.shark(); sh.scale.setScalar(0.6); sh.rotation.y = -Math.PI/2 + 0.4; sh.position.copy(smAt(-3.6, 8.3, -0.15)); F.add(sh);
  const gl = makeGull(); gl.scale.setScalar(0.9); gl.position.copy(smAt(-1, 5.8, 3.4)); F.add(gl);
  // радуга
  const rb = new THREE.Group(); rb.position.copy(smAt(0, -3, -0.3)); F.add(rb);
  ['#FF8FA3', '#FFB86B', '#FFE38A', '#9FE3A8', '#8FCBFF', '#B9A0F2'].forEach((c, i) => {
    const t = new THREE.Mesh(new THREE.TorusGeometry(9.5 - i*0.32, 0.17, 8, 64, Math.PI), new THREE.MeshBasicMaterial({color:c, transparent:true, opacity:0, depthWrite:false})); rb.add(t);
  });
  // шторм уходит
  const from = {rain:SM.rain, light:SM.light, wind:SM.wind}, pos0 = runCam.pos.clone(), look0 = runCam.look.clone();
  const far = Math.max(1, Math.min(1.45, 0.62/camera.aspect)), posT = smAt(0.4, 15 + 8*far, 4 + 2*far), lookT = smAt(0, 2.4, 3.9);
  let bgSwap = false;
  await tween(3.2, k => {
    SM.rain = from.rain*(1 - k); SM.light = from.light + (0.78 - from.light)*k; SM.wind = from.wind*(1 - k);
    runCam.pos.lerpVectors(pos0, posT, k); runCam.look.lerpVectors(look0, lookT, k);
    rb.children.forEach(t => t.material.opacity = Math.max(0, k*1.4 - 0.4)*0.85);
    if(k > 0.5 && !bgSwap){ bgSwap = true; scene.background = smSkyBright; scene.fog = new THREE.Fog(0xEAF7FB, 30, 90); sun.color.setHex(0xFFF1D6); }
  }, ease.io);
  if(!SM) return;
  SM.boltT = 1e9; sfx.hug();
  mgHint(L('Шторм ушёл! Над островом радуга 🌈', 'The storm is gone! A rainbow over the island 🌈'));
  pals.forEach((o, i) => setTimeout(() => { if(SM && SM.P === P) tween(0.4, k => o.position.y = smAt(0, 0, Math.sin(k*Math.PI)*0.5).y, ease.lin); }, 300 + i*140));
  burst(TEX.heart, smAt(0, 6.4, 1.2), 20, 2.4, 0.32);
  await wait(1.2); if(!SM) return;
  P.photo = snapshot({root:{position:smAt(0, 4.6, 1.2), scale:{x:1}}}, 5.6);
  await wait(1.4); if(SM) SM.end = 'win';
}
function p4Net(m){
  const P = SM.P;
  if(m.k === 'g4' && !SM.host){ P.g.block = !!m.b; if(m.st === 'blow'){ P.g.hit = new Set(); P.g.t = 1.1; } p4GustFx(m.st); }
  else if(m.k === 'spin' && SM.host) p4SpinAdd(m.d, true);
  else if(m.k === 'sp' && !SM.host){ P.spin = Math.max(P.spin, m.v); sfx.sparkle(); }
  else if(m.k === 'lit' && !SM.host) p4Finale();
}
// у гостя: свой порыв считаем сами (хозяин прислал только «дует»)
function p4GuestGust(dt){
  const P = SM.P, g = P.g;
  if(SM.host || g.st !== 'blow') return;
  g.t -= dt;
  if(!SM.me.hold && !SM.me.top && !g.hit.has(SM.me) && !g.block && g.t < 0.8) p4Slide(SM.me);
}

/* ---------- напарник по сети: плавно к тому, что прислал ---------- */
function smPalFollow(p, dt){
  if(p.gone) return;
  const d = Math.hypot(p.nx - p.x, p.nz - p.z);
  if(d > 0.03){ smMoveTo(p, p.nx, p.nz, Math.max(1.2, d*8), dt); } else p.hop = 0;
  if(p.ntb && p.tumble <= 0) p.tumble = 0.8;
}
function smNetStep(dt){
  if(SM.mode !== 'net' || (SM.sendT -= dt) > 0) return;
  SM.sendT = 0.09;
  const me = SM.me, m = {t:'smp', x:+(me.x || 0).toFixed(2), z:+(me.z || 0).toFixed(2), y:+(me.y || 0).toFixed(2), h:+(me.h || 0).toFixed(3), tb:me.tumble > 0.6 ? 1 : 0, g:me.tgt != null ? me.tgt : -1, f:me.fix > 0 ? 1 : 0};
  netSend(m);
  if(SM.host && SM.part === 0 && SM.npc.length) netSend({t:'sme', k:'np', a:SM.npc.map(n => [+n.x.toFixed(2), +n.z.toFixed(2)])});
}
function smNetWire(){
  netOn('smp', m => {
    const p = SM && SM.pal; if(!p || p.kind !== 'net') return;
    if(SM.part === 1){ p.nx = m.x; p.ny = m.y; if(m.tb && p.tumble <= 0) p.tumble = 0.7; }
    else if(SM.part === 3){ p.nh = m.h; if(m.tb && p.tumble <= 0) p.tumble = 0.8; if(m.h >= 1) p.top = true; }
    else { p.nx = m.x; p.nz = m.z; p.ntb = !!m.tb; if(SM.part === 2){ p.tgt = m.g >= 0 ? m.g : null; p.fixing = !!m.f; } }
  });
  netOn('sme', m => { if(!SM) return; [p1Net, p2Net, p3Net, p4Net][SM.part](m); });
  netOn('emo', () => { const p = SM && SM.pal; if(p){ burst(TEX.heart, p.root.getWorldPosition(new V3()).add(new V3(0, 0.6, 0)), 8, 1.6, 0.3); sfx.purr(); } });
  netOn('bye', () => {
    if(!SM || !SM.pal) return;
    SM.pal.gone = true; SM.pal.root.visible = false;
    toast(SM.host ? L('Напарник ушёл домой 👋 Играем дальше!', 'Your partner went home 👋 Let’s carry on!') : L('Хозяин комнаты ушёл домой 👋', 'The room host went home 👋'), 3000);
    if(SM.host && SM.part === 0) for(const p of SM.P.pups) if(p.c === 2 && !p.inSh) p.c = 0;   // малыши напарника остаются ждать на льдине
    if(SM.onBye) SM.onBye();
  });
  net.onLost = () => { if(SM && SM.pal) mgHint(L('Связь пропала… играем дальше 🌊', 'Lost the connection… keep playing 🌊')); };
  net.onBack = () => { if(SM && SM.pal){ mgHint(''); toast(L('Снова вместе! 💗', 'Together again! 💗')); } };
}

/* ---------- одна часть шторма: возвращает {win, part, ...} или null (ушли домой) ---------- */
async function stormRun(mode, pal0, part){
  smBuildOnce();
  sfx.whoosh(); flash();
  const fog = scene.fog, bg = scene.background, sunC = sun.color.getHex();
  scene.fog = new THREE.Fog(0x7E8AA6, 24, 80); scene.background = smSkyDark; sun.color.setHex(0xC9D2E6);
  smRoot.visible = true; runCam.on = true;
  document.body.classList.add('run-on', 'storm-on');
  const homeB = document.createElement('button'); homeB.id = 'btnRunHome'; homeB.className = 'round home';
  homeB.innerHTML = '<span aria-hidden="true">🏠</span>'; homeB.setAttribute('aria-label', L('Домой', 'Home')); $('#corner').prepend(homeB);
  let done; const fin = new Promise(r => done = r);
  homeB.addEventListener('click', () => { sfx.tap(); done('quit'); });
  const host = mode !== 'net' || net.host;
  SM = {mode, host, part, pal0, st:'ready', grp:new THREE.Group(), me:null, pal:null, npc:[], hud:null, end:null, misses:0, helped:false,
    rain:1, wind:1, light:0.5, flashK:0, boltT:2.5, sendT:0, P:{}, D:null, onBye:null};
  smRoot.add(SM.grp);
  // по сети: хозяин говорит, какую часть играем (у гостя сюжет может быть в другом месте)
  if(mode === 'net'){
    smNetWire();
    if(net.host){ await Promise.race([new Promise(r => netOn('smready', r)), wait(8), fin]); netSend({t:'smgo', part}); }
    else {
      const g = new Promise(r => netOn('smgo', m => r(m))), iv = setInterval(() => netSend({t:'smready'}), 400);
      netSend({t:'smready'}); const m = await Promise.race([g, fin]); clearInterval(iv);
      if(m && m.part >= 0 && m.part < 4) SM.part = part = m.part;
    }
  }
  if(!host) SM.onBye = () => done('left');   // у гостя всё решает хозяин: он ушёл — и мы домой
  const D = SM.D = [P1, P2, P3, P4][part];
  mgOpen('', {hintBottom:true});
  D.setup();
  // напарник
  const palX = SM.host ? 0.6 : -0.6;
  if(mode !== 'solo'){
    const s = smPalSeal(), kind = mode === 'ping' ? 'ping' : 'net';
    if(part === 1) SM.pal = p2Swimmer(s, kind, SM.host ? 2 : 1);
    else if(part === 3){ SM.pal = {root:s.root, seal:s, kind, h:0, nh:0, tumble:0, hold:false, top:false}; SM.grp.add(s.root); }
    else { SM.pal = smActor(s.root, s, kind, palX, part === 0 ? 4 : P3_STAND); SM.pal.tgt = null; SM.pal.fix = 0; }
  }
  if(part === 2 && mode === 'solo') SM.P.need = P3_NEED[0];
  const btns = mgNode('div', 'co-btns', mode !== 'solo' ? `<button class="round co-heart" aria-label="${L('Сердечко напарнику', 'A heart for your partner')}">💗</button>` : '');
  const hb = btns.querySelector('.co-heart');
  if(hb) mgOn(hb, 'pointerdown', e => {
    e.stopPropagation(); e.preventDefault(); sfx.purr();
    burst(TEX.heart, SM.me.root.getWorldPosition(new V3()).add(new V3(0, 0.6, 0)), 8, 1.6, 0.3);
    if(mode === 'net') netSend({t:'emo'});
    else if(SM.pal) setTimeout(() => { if(SM && SM.pal){ burst(TEX.heart, SM.pal.root.getWorldPosition(new V3()).add(new V3(0, 0.6, 0)), 8, 1.6, 0.3); } }, 700);
  });
  mgTick(dt => {
    if(!SM) return;
    D.step(dt);
    if(part === 3) p4GuestGust(dt);
    if(SM.part === 0 || SM.part === 2) for(const n of SM.npc) smDraw(n, dt);
    if(SM.part === 0 && SM.pal) smDraw(SM.pal, dt);
    if(SM.part === 0) smDraw(SM.me, dt);
    if(SM.part === 2 && SM.pal && SM.pal.kind === 'net'){ smDraw(SM.pal, dt); }
    smFxStep(dt); smNetStep(dt);
    if(SM.end) done(SM.end);
  });
  const tick = t => Promise.race([wait(t), fin]);
  sfx.grr();
  const lines = D.intro(), first = save.storm.st <= part;
  for(const [i, t] of lines.entries()){ if(i && !first && i < lines.length - 1) continue; mgHint(t); await tick(i ? 2.6 : 2.2); if(SM && SM.end) break; }
  if(SM && !SM.end && part !== 3) for(const n of ['3', '2', '1']){ mgHint(n); sfx.tick(); await tick(0.45); }
  if(SM && !SM.end && SM.st === 'ready'){ SM.st = 'go'; mgHint(part === 3 ? L('Вверх! 🗼', 'Up we go! 🗼') : L('Вперёд! 💪', 'Go! 💪')); sfx.arf(); setTimeout(() => { if(SM && /💪|🗼/.test(mgHintEl.textContent) && !/Держись|Hold/.test(mgHintEl.textContent)) mgHint(''); }, 1200); }
  const how = await fin;
  let res = null;
  if(how === 'win') res = smResults();
  if(how === 'quit' && mode === 'net') netSend({t:'bye'});
  let next = null;
  if(res){ mgHint(''); next = await smPanel(res); }
  mgHint(''); mgClose();
  smRoot.remove(SM.grp);
  SM = null;
  homeB.remove(); document.body.classList.remove('run-on', 'storm-on');
  smRoot.visible = false; runCam.on = false; homeLights(false);
  scene.fog = fog; scene.background = bg; sun.color.setHex(sunC);
  return res ? {res, next} : null;
}

/* ---------- награда и итоги части ---------- */
function smResults(){
  const s = save.storm, part = SM.part, today = smDay();
  const first = SM.host && s.st <= part;
  let gift = 0;
  if(first){ s.st = part + 1; gift = SM_GIFT[part]; }
  else if(s.d !== today) gift = SM_AGAIN;
  if(part === 3 && SM.host) s.n++;
  s.d = today; if(SM.mode === 'net') s.net++;
  let photo = null;
  if(part === 3 && SM.P.photo){ photo = SM.P.photo; albumAdd({name:SM.mode === 'net' ? L('Мы вместе: радуга', 'Together: the rainbow') : L('Радуга после шторма', 'Rainbow after the storm'), img:photo, d:Date.now()}); renderAlbumCount(); }
  persist();
  return {part, gift, first, photo, mode:SM.mode};
}
const SM_WIN = [
  () => L('Все малыши в убежище! 🏠', 'All the little ones are safe! 🏠'),
  () => L('Все соседи спасены! 🛟', 'All the neighbours are saved! 🛟'),
  () => L('Маяк выстоял! 🗼', 'The lighthouse held! 🗼'),
  () => L('Шторм ушёл! 🌈', 'The storm is gone! 🌈')
];
const SM_NEXT = [
  () => L('А волны всё выше… Льдины откалываются, соседей уносит!', 'But the waves keep rising… Floes are breaking off, the neighbours are drifting away!'),
  () => L('Акула везёт плот к маяку, а волны бьют в его стену…', 'The shark takes the raft to the lighthouse, but the waves hit its wall…'),
  () => L('Вдруг всё стихло — это глаз бури. Надо зажечь маяк!', 'Suddenly it’s quiet — it’s the eye of the storm. We must light the lighthouse!'),
  () => L('Все вместе — и никакой шторм не страшен 💗', 'All together — no storm is scary 💗')
];
async function smPanel(r){
  const net1 = r.mode === 'net', last = r.part === 3, canNext = !last && (!net1 || net.host);
  const panel = mgNode('div', 'mg-panel run-end co-end sm-end', `
    <p class="ttl display">${SM_WIN[r.part]()}</p>
    ${r.photo ? `<img class="co-photo" src="${r.photo}" alt=""><p class="got">📷 ${L('Фото — в альбоме', 'The photo is in the album')}</p>` : ''}
    <p class="got">${SM_NEXT[r.part]()}</p>
    ${last && save.storm.n === 1 && r.first ? `<p class="got">📖 ${L('Глава «Великий шторм» прочитана — загляни в Книгу острова!', 'The «Great Storm» chapter is done — look in the Island book!')}</p>` : ''}
    ${!last ? `<p class="got sm-steps">${SM_PARTS.map((p, i) => `<span class="${i <= r.part ? 'ok' : ''}">${p.ic}</span>`).join('')}</p>` : ''}
    <p class="earned display">${r.gift ? `+${r.gift} 🐚` : ''}</p>
    <p class="got co-wait" hidden></p>
    <div class="row">${canNext ? `<button class="btn" data-k="next">${L('Дальше ▶', 'Next ▶')}</button>` : ''}<button class="btn${canNext ? ' ghost' : ''}" data-k="home">${L('Домой 🏠', 'Home 🏠')}</button></div>`);
  if(r.gift) setTimeout(() => addShells(r.gift, {x:innerWidth/2, y:innerHeight*0.4}), 900);
  if(save.pet && typeof petGive === 'function' && petSeal) setTimeout(() => { try{ petGive(4); }catch(e){} }, 1500);
  sfx.hug();
  const k = await new Promise(res => {
    panel.querySelectorAll('[data-k]').forEach(b => mgOn(b, 'click', () => { sfx.tap(); res(b.dataset.k); }));
    if(net1 && !net.host && !last){ const w = panel.querySelector('.co-wait'); w.hidden = false; w.textContent = L('Напарник решает: дальше или домой…', 'Your partner is deciding: next or home…'); netOn('smnext', () => res('next')); }
    if(net1) netOn('bye', () => { const w = panel.querySelector('.co-wait'); w.hidden = false; w.textContent = L('Напарник ушёл домой 👋', 'Your partner went home 👋'); const nb = panel.querySelector('[data-k="next"]'); if(nb && !net.host) nb.remove(); if(!net.host) res('home'); });
  });
  if(net1){ if(k === 'next' && net.host) netSend({t:'smnext'}); if(k === 'home') netSend({t:'bye'}); }
  panel.classList.add('away'); await wait(0.25);
  return k === 'next';
}

/* ---------- какую часть играть: следующую по сюжету; шторм уже пройден — выбрать ---------- */
async function smPickPart(){
  const st = save.storm.st;
  if(st < 4) return st;
  mgOpen('');
  const panel = mgNode('div', 'mg-panel fun-pick sm-pick', `
    <p class="ttl display">🌪️ ${L('Великий шторм', 'The Great Storm')}</p>
    <p class="got">${L('Какую часть сыграем ещё раз?', 'Which part shall we play again?')}</p>
    <div class="picks">${SM_PARTS.map((p, i) => `<button data-k="${i}"><span class="ic">${p.ic}</span><b>${p.name}</b></button>`).join('')}</div>
    <button class="btn ghost small" data-k="no">${L('Потом', 'Later')}</button>`);
  const k = await new Promise(r => panel.querySelectorAll('[data-k]').forEach(b => mgOn(b, 'click', () => { sfx.tap(); r(b.dataset.k); })));
  mgClose();
  return k === 'no' ? null : +k;
}
// вход: из «Вместе» (по сети, с Пингом, одна) и из «Книги острова»
async function stormGame(mode, pal0 = null){
  let part = mode === 'net' && !net.host ? 0 : await smPickPart(), res = null;
  if(part == null){ if(mode === 'net') netClose(); return null; }
  for(;;){
    const r = await stormRun(mode, pal0, part);
    if(!r) break;
    res = r.res;
    if(!r.next || r.res.part >= 3) break;
    part = r.res.part + 1;
  }
  if(mode === 'net') netClose();
  return res;
}
if(typeof CO_GAMES !== 'undefined') CO_GAMES.storm = {ic:'🌪️', name:() => L('Шторм', 'Storm'),
  say:() => { const st = save.storm.st;
    return st >= 4 ? L('Шторм позади — но можно сыграть любую часть ещё раз, с Пингом или с папой!', 'The storm is over — but you can play any part again, with Ping or with Dad!')
      : L(`Идёт Великий шторм! Все друзья вместе спасают остров. Часть ${st + 1} из 4: ${SM_PARTS[st].ic} ${SM_PARTS[st].name}`, `The Great Storm is coming! All the friends save the island together. Part ${st + 1} of 4: ${SM_PARTS[st].ic} ${SM_PARTS[st].name}`); },
  wins:() => save.storm.st ? SM_PARTS.map((p, i) => i < save.storm.st ? p.ic : '▫️').join(' ') : ''};
