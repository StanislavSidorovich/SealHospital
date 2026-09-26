/* ---------------- История и бой с Мглой (Спринт 3, задача 4¾) ----------------
   Мгла (dive.js, часть 2) — не злая. История по шагам (save.dive.gloom.st):
   0 → 1  🛢️ в глубине, за корабликом, лежит старая ржавая бочка: из неё сочится нефть. Мгла всегда уползает туда
          (после встречи над бочкой «❓», а когда Мгла уползла — подсказка). Коснись бочки — карточка про нефть.
   1 → 2  спряталась, и Мгла уползает не поймав — «хнык… хнык…»: она плачет! Карточка: Мгла сама в нефтяной мути,
          ничего не видит и боится света. Значит, её можно отмыть.
   2 → 3  бой: Мгла приходит (раньше обычного) и уже не уползает. В бухте светится планктон ✨ — проплыви сквозь него,
          он прилипает (до GL_CARRY). Коснись Мглы — бросишь в неё свет: муть смывается, Мгла светлеет, вздрагивает.
          Три фазы: после каждой уползает в грот и возвращается меньше и быстрее. Поймала — выплёвывает наверх (как раньше),
          но свет, что уже смыт, остаётся. Пинг помогает светить сам; по сети светят оба (главный — хозяин комнаты).
          Конец: муть растворяется — внутри маленький сиреневый осьминожек Клякса. «Спасибо!» + ракушки
          и ночник-осьминожек в иглу. Клякса плывёт к бочке: подплыви — закроете её крышкой (у Кляксы восемь лапок),
          и карточка про нефть в море. Потом Клякса живёт у бочки, Мгла больше не приходит.
   Сеть (dev): гость → 'ghit' (попал), 'gthr' (бросил — напарнику видно лучик); хозяин → 'gboss' {hp, ph, mx}, 'gph', 'gwin'.
   Крючки в dive.js: glPopulate, glStep, glTap, glBossOn/glBossFx/glBossStep, glGrabbed, glLeft, glNetEv, glDark, glBookRow.
   Подключается после dive.js и до visit.js. */
const GL_BARREL_X = 62.4;                   // старая бочка — в самой глубине, под навесом грота
const GL_HP = 3, GL_HP2 = 4;                // сколько лучиков нужно на фазу: одной / вдвоём (с Пингом или по сети)
const GL_V = [2.5, 2.8, 3.1], GL_VP = 1.9;  // как быстро гонится по фазам (малыш — 4,2) и как рыщет
const GL_SC = [1, 0.8, 0.62];               // Мгла уменьшается от фазы к фазе
const GL_CARRY = 3, GL_ORB_T = 7;           // сколько планктона можно нести; через сколько секунд он светится снова
const GL_ORBS = [[5, -3], [13, -6.5], [21, -3.2], [28, -7.5], [36, -4.2], [44, -8.4], [52, -5.5], [59, -9.5]];
const GL_GIFT = 20;                         // ракушек за спасённую Кляксу
const GL_WASH = new THREE.Color(0xB9ADE0);  // цвет отмытой мути
if(save.dive && !Number.isFinite(save.dive.gloom.st)) save.dive.gloom.st = 0;   // Pages мог отдать старый data.js

/* ---------- бочка и Клякса: строятся в каждом погружении ---------- */
function glPopulate(){
  const D = DV, sv = save.dive.gloom, x = GL_BARREL_X, closed = sv.st >= 3;
  const b = new THREE.Group(); b.position.set(x, dvFloor(x) + 0.02, -0.2); b.rotation.set(0, 0.3, 0.16); D.grp.add(b);
  const rust = toon(0x9A5B3A);
  const body = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.3, 20), rust), 1.04); body.position.y = 0.65; b.add(body);
  for(const y of [0.3, 1.0]){ const h = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.04, 6, 24), toon(0x6E3F28)); h.rotation.x = Math.PI/2; h.position.y = y; b.add(h); }
  for(const [px, py] of [[0.3, 0.55], [-0.2, 0.85], [0.1, 0.2]]){ const r = dvBlob(b, 0xC0784A, 0.12, 0.08, 0.04, px, py, 0.53, 1.1); }   // рыжие пятна ржавчины
  const oil = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), new THREE.MeshBasicMaterial({color:0x151022})); oil.rotation.x = -Math.PI/2; oil.position.y = 1.31; b.add(oil);
  const lid = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.12, 20), toon(0x8FA3B8)), 1.06); lid.position.y = 1.36; b.add(lid);
  const bow = new THREE.Group(); bow.position.set(0, 1.46, 0); b.add(bow);
  for(const sd of [-1, 1]){ const c = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 10), toon(0xFF9BB8)), 1.1); c.rotation.z = sd*Math.PI/2; c.position.x = sd*0.16; bow.add(c); }
  dvBlob(bow, 0xD9527E, 0.08, 0.08, 0.08, 0, 0, 0, 1.12);
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(1.2, 24), new THREE.MeshBasicMaterial({color:0x1B1633, transparent:true, opacity:0.55, depthWrite:false}));
  puddle.rotation.x = -Math.PI/2; puddle.scale.y = 0.6; puddle.position.set(x + 0.6, dvFloor(x + 0.6) + 0.04, 0.3); D.grp.add(puddle);
  const q = new THREE.Sprite(new THREE.SpriteMaterial({map:bubbleTex('❓'), transparent:true, depthWrite:false})); q.scale.setScalar(1.1); q.position.set(x, dvFloor(x) + 2.4, 0.2); D.grp.add(q);
  lid.visible = bow.visible = closed; oil.visible = puddle.visible = !closed;
  D.glB = {g:b, lid, bow, oil, puddle, q, closed, dripT:0};
  dvTap({k:'barrel', r:1.0, p:() => b.position.clone().add(new V3(0, 0.9, 0)), go:glBarrel});
  D.glOrbs = null; D.glShots = []; D.glCarry = 0; D.glOcto = null; D.glHud = null; D.glPingT = 3;
  if(closed) glOctoMake('home', x - 2.5, dvFloor(x - 2.5) + 1.3);
  if(sv.st === 2) D.gl.t = Math.min(D.gl.t, 18);   // Мгла ждёт, чтобы её отмыли, — приходит пораньше
  // лучики света, которые несёшь с собой
  D.glHalo = [0, 1, 2].map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX, color:0x9FF6FF, transparent:true, depthWrite:false, fog:false})); s.scale.setScalar(0.55); s.visible = false; D.grp.add(s); return s; });
}
function glStep(dt){
  const D = DV, B = D.glB, G = D.gl; if(!B) return;
  const sv = save.dive.gloom;
  if(!B.closed && (B.dripT -= dt) < 0){   // из открытой бочки сочится муть
    B.dripT = 0.7 + Math.random()*0.5;
    emit(INK_TEX, dvW(B.g.position).add(new V3((Math.random() - 0.5)*0.4, 1.5, 0.2)), {v:new V3((Math.random() - 0.5)*0.3, 0.55, 0), life:2.2, size:0.55, grow:0.7});
  }
  B.q.visible = sv.st === 0 && sv.met >= 1; if(B.q.visible) B.q.position.y = dvFloor(GL_BARREL_X) + 2.4 + Math.sin(now*2.2)*0.1;
  if(D.glOrbs) glOrbStep(dt);
  glShotStep(dt);
  D.glHalo.forEach((s, i) => { s.visible = i < D.glCarry && !D.out; if(s.visible){ const a = now*3 + i*2.09; s.position.set(D.pos.x + Math.cos(a)*0.75, D.pos.y + 0.2 + Math.sin(a)*0.45, 0.6); s.material.opacity = 0.75 + Math.sin(now*6 + i)*0.2; } });
  if(G.boss){
    G.wash = (G.wash || 0) + (glProgress() - (G.wash || 0))*Math.min(1, dt*2);
    glTint(G.wash);
    // Пинг светит сам, когда Мгла рядом
    if(D.ping && D.auth && (D.glPingT -= dt) < 0 && G.o.visible && ['prowl', 'chase', 'sniff'].includes(G.st) && Math.hypot(G.x - D.ping.pos.x, G.y - D.ping.pos.y) < 9){
      D.glPingT = 5 + Math.random()*2; glThrow(D.ping.pos.clone().setZ(0.3), 'ping');
      if(!D.glPingSaid){ D.glPingSaid = true; floatText(L('Пинг светит! ✨', 'Ping shines! ✨'), dvW(D.ping.pos).add(new V3(0, 0.9, 0)), '#3E8DB8'); }
    }
  }
  if(D.glSoon && G.st === 'off' && D.auth){ D.glSoon = false; G.t = Math.min(G.t, 20); }   // услышали «хнык» — бой скоро
  if(D.glOcto) glOctoStep(dt);
  glHudDraw();
}
async function glBarrel(){
  const D = DV, B = D.glB, sv = save.dive.gloom, at = dvW(B.g.position).add(new V3(0, 2, 0));
  if(sv.st === 0){
    sv.st = 1; persist(); sfx.paper();
    D.pause = true; D.hold = false; D.tgt = null;
    await dvCard({ttl:L('Старая бочка 🛢️', 'An old barrel 🛢️'),
      txt:L('Из ржавой бочки сочится что-то чёрное и липкое. Это нефть! Её уронили в море давным-давно. Нефть пачкает всё вокруг: мех, перья, водоросли…', 'Something black and sticky is leaking out of the rusty barrel. It is oil! Someone dropped it into the sea a long time ago. Oil makes everything dirty: fur, feathers, seaweed…')
        + (sv.met ? ' ' + L('И Мгла всегда уползает именно сюда… 🤔', 'And the Gloom always crawls back right here… 🤔') : ''),
      got:L('📖 Новая страница в энциклопедии моря', '📖 A new page in the sea book')});
    if(DV === D) D.pause = false;
    return;
  }
  if(sv.st === 1) return floatText(L('Нефть… Бр-р. Кто же тут прячется?', 'Oil… Brr. Who is hiding here?'), at, '#3B3A4A');
  if(sv.st === 2) return floatText(L('Сначала поможем Мгле ✨', 'Let\'s help the Gloom first ✨'), at, '#3B3A4A');
  if(B.closed) return floatText(L('Закрыто навсегда! 🎀', 'Closed forever! 🎀'), at, '#D9527E');
  // закрываем вместе с Кляксой: у неё восемь лапок
  D.pause = true; D.hold = false; D.tgt = null;
  const O = D.glOcto; if(O) O.st = 'lid';
  const lp = B.lid.position.clone();
  B.lid.visible = true; B.lid.position.y = lp.y + 1.4;
  sfx.lever(); await tween(0.8, k => { B.lid.position.y = lp.y + 1.4*(1 - ease.out(k)); });
  B.lid.position.copy(lp); B.oil.visible = B.puddle.visible = false; B.closed = true;
  sfx.thud(); burst(TEX.puff, at.clone().add(new V3(0, -0.6, 0)), 8, 1.4, 0.4);
  await wait(0.3); B.bow.visible = true; B.bow.scale.setScalar(0.01);
  sfx.pop(); await tween(0.35, k => B.bow.scale.setScalar(0.01 + ease.out(k)));
  sfx.hug(); for(let i = 0; i < 3; i++) setTimeout(() => burst(TEX.star, at, 10, 2, 0.28), i*180);
  if(O) O.st = 'home';
  await wait(0.8); if(DV !== D) return;
  await dvCard({ttl:L('Бочка закрыта! 🎀', 'The barrel is closed! 🎀'),
    txt:L('Нефть легче воды: она растекается по морю тёмной плёнкой. Если она попадёт на мех тюленя или на перья птицы, они перестанут греть. Поэтому люди собирают нефть плавучими заборчиками-бонами, а испачканных зверей бережно отмывают.', 'Oil is lighter than water: it spreads over the sea in a dark film. If it gets on a seal\'s fur or a bird\'s feathers, they stop keeping them warm. That is why people collect oil with floating fences called booms, and gently wash the animals that got dirty.'),
    got:L('Клякса будет жить у бочки и сторожить её 🐙', 'Blot will live by the barrel and guard it 🐙')});
  if(DV === D) D.pause = false;
}
// Мгла уползла (у хозяина — dvGloomLeave, у гостя — 'gleave'): подсказка про бочку или «хнык…»
function glLeft(caught){
  const D = DV, sv = save.dive.gloom; if(!D) return;
  if(sv.st === 0 && sv.met >= 1 && !caught) setTimeout(() => {
    if(DV !== D || dvGloomOn() || save.dive.gloom.st) return;
    mgHint(L('Мгла уползла в глубину, к старой бочке… Что там? 🛢️', 'The Gloom crawled into the deep, to the old barrel… What is there? 🛢️'));
    setTimeout(() => { if(DV === D && mgHintEl.textContent.includes('🛢️')) mgHint(''); }, 5000);
  }, 4300);
  if(sv.st === 1 && !caught) glWhisper();
}
async function glWhisper(){
  const D = DV, G = D.gl; if(D.glWh) return; D.glWh = true;
  floatText(L('хнык… хнык…', 'sniff… sniff…'), dvW(new V3(Math.min(G.x, DV_LEN + 2), G.y + 1.8, 0)), '#8E99C9'); sfx.mama();
  await wait(1.2); if(DV !== D) return;
  floatText(L('хнык…', 'sniff…'), dvW(new V3(Math.min(G.x, DV_LEN + 3), G.y + 1.5, 0)), '#8E99C9'); sfx.mama();
  await wait(2); if(DV !== D) return;
  while(D.pause || D.mode !== 'swim'){ await wait(0.5); if(DV !== D) return; }
  if(save.dive.gloom.st !== 1) return;
  save.dive.gloom.st = 2; persist(); D.glSoon = true;
  D.pause = true; D.hold = false; D.tgt = null;
  await dvCard({ttl:L('Ты слышала? 🌑', 'Did you hear that? 🌑'),
    txt:L('Уползая, Мгла тихонько всхлипывала: «хнык… хнык…» Кажется, она не злая, а грустная. Она вся в нефтяной мути и ничего не видит — поэтому и хватает всех подряд. А ещё Мгла боится света. В бухте светится планктон ✨ Давай в следующий раз отмоем Мглу светом!', 'As it crawled away, the Gloom was quietly sobbing: “sniff… sniff…” Maybe it is not mean, just sad. It is covered in oily murk and cannot see anything — that is why it grabs everyone. And the Gloom is afraid of light. There is glowing plankton in the bay ✨ Next time, let\'s wash the Gloom clean with light!'),
    btn:L('Поможем Мгле! ✨', 'Let\'s help the Gloom! ✨')});
  if(DV === D) D.pause = false;
}

/* ---------- бой: планктон, лучики, фазы ---------- */
const glBossOn = () => save.dive.gloom.st === 2;   // решает хозяин комнаты (или я одна)
const glProgress = () => { const G = DV.gl, mx = G.mx || GL_HP; return Math.min(1, ((G.ph || 0)*mx + (mx - (G.hp == null ? mx : G.hp)))/(3*mx)); };
const glDark = () => 1 - 0.5*(DV.gl.wash || 0);   // чем больше смыто, тем светлее в бухте
function glTint(w){
  const u = DV.gl.o.userData;
  for(const b of u.blobs){ if(!b.userData.c0) b.userData.c0 = b.material.color.clone(); b.material.color.copy(b.userData.c0).lerp(GL_WASH, w*0.85); }
  for(const p of u.tents){ const m = p.children[0].material; if(!m.userData.c0) m.userData.c0 = m.color.clone(); m.color.copy(m.userData.c0).lerp(GL_WASH, w*0.85); }
}
function glBossFx(){   // Мгла пришла на бой (у гостя — по 'gcome' с b:1)
  const D = DV, G = D.gl;
  G.mx = D.pal0 || D.ping ? GL_HP2 : GL_HP;
  if(!Number.isFinite(G.hp)){ G.ph = 0; G.hp = G.mx; G.wash = 0; }
  G.sc = GL_SC[G.ph];
  sfx.gloom(); document.body.classList.add('gloom-on', 'gloom-boss'); dvRingsOn(true);
  glOrbsOn();
  if(D.ping){ const P = D.ping; P.hide = null; P.big = false; floatText(L('Я с тобой! Светим вместе! 🐧', 'I\'m with you! Let\'s shine together! 🐧'), dvW(P.pos).add(new V3(0, 0.9, 0)), '#3E8DB8'); }
  mgHint(L('🌑 Мгла! Проплыви сквозь светящийся планктон ✨ и коснись Мглы — бросишь в неё свет!', '🌑 The Gloom! Swim through the glowing plankton ✨ and tap the Gloom to throw light at it!'));
  if(!tipSeen('glBoss')){
    tipDone('glBoss'); D.pause = true; D.hold = false; D.tgt = null;
    dvCard({ttl:L('Отмоем Мглу! ✨', 'Let\'s wash the Gloom! ✨'),
      txt:L('Мгла боится света. В бухте светится планктон — проплыви сквозь него, и он прилипнет к тебе (до трёх). Потом коснись Мглы — бросишь в неё лучик. Каждый лучик смывает муть! Она всё равно будет гоняться — прячься, как раньше.', 'The Gloom is afraid of light. Glowing plankton floats in the bay — swim through it and it sticks to you (up to three). Then tap the Gloom to throw a ray of light. Every ray washes the murk away! It will still chase you — hide like before.'),
      btn:L('Вперёд! ✨', 'Let\'s go! ✨')}).then(() => { if(DV === D) D.pause = false; });
  }
}
function glOrbsOn(){
  const D = DV; if(D.glOrbs) return;
  D.glOrbs = GL_ORBS.map(([x, y], i) => {
    const g = new THREE.Group(); g.position.set(x, y, 0.3); D.grp.add(g);
    const gl = new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX, color:0x8FF3FF, transparent:true, depthWrite:false, fog:false})); gl.scale.setScalar(1.5); g.add(gl);
    const dots = [];
    for(let j = 0; j < 5; j++){ const d = new THREE.Mesh(SMALL, new THREE.MeshBasicMaterial({color:0xE8FFFF, fog:false})); d.scale.setScalar(0.05 + (j % 2)*0.03); g.add(d); dots.push(d); }
    return {g, gl, dots, x, y, on:true, t:0, ph:i*1.3};
  });
}
function glOrbsOff(){ const D = DV; if(!D.glOrbs) return; D.glOrbs.forEach(o => D.grp.remove(o.g)); D.glOrbs = null; }
function glOrbStep(dt){
  const D = DV;
  for(const o of D.glOrbs){
    if(!o.on){ if((o.t -= dt) <= 0){ o.on = true; o.g.visible = true; o.g.scale.setScalar(0.01); } else { o.g.visible = false; continue; } }
    o.g.scale.setScalar(Math.min(1, o.g.scale.x + dt*2));
    o.g.position.y = o.y + Math.sin(now*1.5 + o.ph)*0.25; o.gl.material.opacity = 0.65 + Math.sin(now*3 + o.ph)*0.25;
    o.dots.forEach((d, j) => { const a = now*(1.2 + j*0.2) + j*1.3; d.position.set(Math.cos(a)*0.32, Math.sin(a*1.3)*0.28, Math.sin(a)*0.2); });
    if(D.glCarry < GL_CARRY && !D.out && Math.hypot(D.pos.x - o.x, D.pos.y - o.g.position.y) < 1.2){
      o.on = false; o.t = GL_ORB_T; o.g.visible = false; D.glCarry++;
      sfx.sparkle(); burst(TEX.star, dvW(o.g.position), 6, 1.2, 0.2);
      if(!tipSeen('glOrb')){ tipDone('glOrb'); mgHint(L('Планктон прилип! Теперь коснись Мглы — и бросишь свет ✨', 'The plankton stuck to you! Now tap the Gloom to throw the light ✨')); }
    }
  }
}
// коснулась Мглы (dvControls): бросить лучик
function glTap(cx, cy){
  const D = DV, G = D && D.gl;
  if(!G || !G.boss || !G.o.visible || ['end', 'flee', 'off', 'leave'].includes(G.st) || D.out) return false;
  const q = toScreen(dvW(new V3(G.x, G.y, 0.5))), tv = Math.tan(THREE.MathUtils.degToRad(camera.fov)/2), px = innerHeight/2/(D.camD*tv);
  if(Math.hypot(q.x - cx, q.y - cy) > Math.max(60, 1.5*(G.sc || 1)*px)) return false;
  if(!D.glCarry){ sfx.bad(); floatText(L('Сначала собери светящийся планктон ✨', 'Collect some glowing plankton first ✨'), headTop(D.s), '#3E8DB8'); return true; }
  if(Math.hypot(G.x - D.pos.x, G.y - D.pos.y) > 14){ floatText(L('Далеко! Подплыви ближе', 'Too far! Swim closer'), headTop(D.s), '#3E8DB8'); return true; }
  D.glCarry--; glThrow(D.pos.clone().setZ(0.3), 'me');
  return true;
}
function glThrow(from, who){   // who: 'me' | 'ping' | 'pal' (у напарника — только видно, попадание считает он сам)
  const D = DV, g = new THREE.Group(); g.position.copy(from); D.grp.add(g);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({map:GLOW_TEX, color:0xB5FBFF, transparent:true, depthWrite:false, fog:false})); sp.scale.setScalar(1.2); g.add(sp);
  const c = new THREE.Mesh(SMALL, new THREE.MeshBasicMaterial({color:0xFFFFFF, fog:false})); c.scale.setScalar(0.14); g.add(c);
  D.glShots.push({g, p:from.clone(), who, t:0, trT:0});
  sfx.sparkle();
  if(who === 'me' && D.pal) netSend({t:'dev', k:'gthr', x:Math.round(from.x*100)/100, y:Math.round(from.y*100)/100});
}
function glShotStep(dt){
  const D = DV, G = D.gl;
  for(const s of D.glShots.slice()){
    s.t += dt;
    const to = new V3(G.x, G.y, 0.5), d = to.sub(s.p), l = d.length();
    const drop = () => { D.grp.remove(s.g); D.glShots.splice(D.glShots.indexOf(s), 1); };
    if(!G.o.visible || s.t > 2.2 || G.st === 'end'){ drop(); continue; }
    if(l < 0.9*(G.sc || 1) + 0.3){
      drop(); burst(TEX.star, dvW(s.p), 10, 2, 0.3); sfx.ding();
      if(s.who !== 'pal'){ if(D.auth) glHit(); else netSend({t:'dev', k:'ghit'}); }
      continue;
    }
    s.p.addScaledVector(d, Math.min(l, 13*dt)/l); s.g.position.copy(s.p);
    if((s.trT -= dt) < 0){ s.trT = 0.05; emit(TEX.dot, dvW(s.p), {v:new V3(0, 0.3, 0), life:0.5, size:0.14}); }
  }
}
function glHit(){   // у хозяина (или одной): лучик попал
  const D = DV, G = D.gl;
  if(!G.boss || !['prowl', 'chase', 'sniff', 'stun', 'warn'].includes(G.st)) return;
  G.hp = Math.max(0, G.hp - 1);
  glHitFx();
  if(G.hp <= 0){
    if(G.ph >= 2){ glSync(); if(D.pal) netSend({t:'dev', k:'gwin'}); glEnding(); return; }
    G.ph++; G.hp = G.mx; G.st = 'flee'; G.t2 = 4;
    if(D.pal) netSend({t:'dev', k:'gph', ph:G.ph});
    glPhaseFx(G.ph);
  } else { G.st = 'stun'; G.t2 = 1.1; }
  glSync();
}
function glSync(){ const G = DV.gl; if(DV.pal && DV.auth) netSend({t:'dev', k:'gboss', hp:G.hp, ph:G.ph, mx:G.mx}); }
function glHitFx(){
  const G = DV.gl, at = dvW(new V3(G.x, G.y + 1.5*(G.sc || 1), 0.8)), says = [L('Ай! Светло!', 'Ow! So bright!'), L('Ой-ой!', 'Oh-oh!'), L('Хнык!', 'Sniff!')];
  floatText(says[Math.floor(Math.random()*says.length)], at, '#8E99C9');
  burst(TEX.star, at, 8, 1.8, 0.26);
}
function glPhaseFx(ph){
  const G = DV.gl;
  floatText(L('Хнык… Светло!', 'Sniff… Too bright!'), dvW(new V3(G.x, G.y + 1.6, 0.8)), '#8E99C9'); sfx.mama();
  mgHint(ph === 1 ? L('Муть смывается! Мгла уползла в грот — сейчас вернётся поменьше. Набирай планктон ✨', 'The murk is washing off! The Gloom crawled into the grotto — it will be back, smaller. Grab more plankton ✨')
    : L('Ещё чуть-чуть! Мгла совсем маленькая — и очень шустрая ✨', 'Almost there! The Gloom is tiny now — and very quick ✨'));
}
// Мгла в бою (у хозяина или одной): не уходит, рыщет по всей бухте, гонится, вздрагивает от света
function glBossStep(dt){
  const D = DV, G = D.gl;
  const mv = (x, y, v) => { const dx = x - G.x, dy = y - G.y, l = Math.hypot(dx, dy); if(l > 0.05){ const k = Math.min(l, v*dt)/l; G.x += dx*k; G.y += dy*k; } if(Math.abs(dx) > 0.3) G.dir = Math.sign(dx); return l; };
  const aim = k => k === 'pal' && D.pal ? {pos:D.pal.pos, hid:D.pal.h >= 0 ? DV_HIDE[D.pal.h] : null, safe:D.pal.safe} : {pos:D.pos, hid:dvHidden(), safe:D.safeT > 0 || D.out || D.pause};
  const lane = () => Math.max(dvFloor(G.x) + 1.6, Math.min(-1.8, -6 + Math.sin(now*0.45)*3.5));
  const see = () => { const w = dvWho(G.x, G.y), me = w.k === 'me';
    if(!w.hid && !w.safe && !(me && D.pause) && Math.hypot(w.pos.x - G.x, w.pos.y - G.y) < DV_GLOOM_SEE){
      G.st = 'chase'; G.ch = 0; G.who = w.k; sfx.gloomSee(); floatText('!', dvW(new V3(G.x, G.y + 1.8*(G.sc || 1), 0)), '#FFD23F'); } };
  if(G.st === 'warn'){ mv(DV_LEN - 1, -9, 2.6); if(G.t <= 0){ G.st = 'prowl'; G.dirX = -1; } }
  else if(G.st === 'prowl'){
    const tx = (G.dirX || -1) < 0 ? 3 : DV_LEN - 3;
    mv(tx, lane(), GL_VP + G.ph*0.3); if(Math.abs(G.x - tx) < 1) G.dirX = -(G.dirX || -1);
    see();
  } else if(G.st === 'chase'){
    G.ch += dt;
    const w = aim(G.who);
    if(w.hid || w.safe){ G.st = 'sniff'; G.t2 = 2.4; G.hs = w.hid; floatText('?', dvW(new V3(G.x, G.y + 1.8*(G.sc || 1), 0)), '#FFD23F'); }
    else {
      const l = mv(w.pos.x, w.pos.y, GL_V[G.ph]);
      if(l < 1.3*(G.sc || 1) + 0.2) G.who === 'pal' ? dvGloomGrabPal() : dvGloomGrab();
      else if(G.ch > 7 || l > 12){ G.st = 'prowl'; }
    }
  } else if(G.st === 'sniff'){
    G.t2 -= dt;
    const hs = G.hs; if(hs) mv(hs.x + (G.x < hs.x ? -1 : 1)*(hs.r + 1.3), hs.y() + Math.sin(now*2)*0.4, 1.2);
    const w = aim(G.who);
    if(!w.hid && !w.safe && Math.hypot(w.pos.x - G.x, w.pos.y - G.y) < DV_GLOOM_SEE*0.7){ G.st = 'chase'; G.ch = 0; sfx.gloomSee(); }
    else if(G.t2 <= 0) G.st = 'prowl';
  } else if(G.st === 'stun'){   // вздрогнула от света: дрожит на месте
    G.t2 -= dt; G.x += Math.sin(now*40)*0.02;
    if(G.t2 <= 0) G.st = 'prowl';
  } else if(G.st === 'flee'){   // фаза кончилась: в грот — и обратно поменьше
    mv(DV_LEN + 7, -10, 5.5); G.t2 -= dt;
    if(G.t2 <= 0){ G.sc = GL_SC[G.ph]; G.st = 'warn'; G.t = 2.2; G.x = DV_LEN + 7; G.y = -10; sfx.gloom(); }
  }
  dvGloomPose(dt);
}
function glGrabbed(){   // поймала кого-то: в бою не уползает, а рыщет дальше, прочь от выплюнутого
  const G = DV.gl; G.st = 'prowl'; G.dirX = 1;
}
function glNetEv(m){
  const D = DV, G = D.gl, k = m.k;
  if(k === 'ghit'){ if(D.auth) glHit(); }
  else if(k === 'gthr') glThrow(new V3(+m.x || 0, +m.y || 0, 0.3), 'pal');
  else if(k === 'gboss'){
    const hit = Number.isFinite(G.hp) && (m.hp < G.hp || m.ph > G.ph);
    G.boss = true; G.hp = m.hp; G.ph = Math.min(2, m.ph | 0); G.mx = m.mx || GL_HP2; if(G.st !== 'flee') G.sc = GL_SC[G.ph];
    if(hit && m.ph === G.ph) glHitFx();
  }
  else if(k === 'gph'){ G.ph = Math.min(2, m.ph | 0); glHitFx(); glPhaseFx(G.ph); setTimeout(() => { if(DV === D) G.sc = GL_SC[G.ph]; }, 4000); }
  else if(k === 'gwin') glEnding();
}
function glHudDraw(){
  const D = DV, G = D.gl, on = !!(G.boss && G.st !== 'end');
  if(!on){ if(D.glHud){ D.glHud.remove(); D.glHud = null; } return; }
  if(!D.glHud){ D.glHud = mgNode('div', 'gl-hud', `<span class="pill gl-carry"></span><span class="gl-meter" aria-label="${L('Мгла', 'The Gloom')}"><span class="ic">🌑</span><span class="bar"><i></i></span></span>`); D.glHudK = ''; }
  const left = 1 - glProgress(), key = D.glCarry + '/' + left.toFixed(3);
  if(key === D.glHudK) return; D.glHudK = key;
  D.glHud.querySelector('.gl-carry').textContent = `✨ ${D.glCarry}/${GL_CARRY}`;
  D.glHud.querySelector('.bar i').style.width = Math.round(left*100) + '%';
}

/* ---------- конец боя: муть растворяется — внутри Клякса ---------- */
async function glEnding(){
  const D = DV, G = D && D.gl; if(!G || G.st === 'end') return;
  G.st = 'end'; G.boss = true; G.melt = 0;
  D.pause = true; D.hold = false; D.tgt = null; D.goal = null; D.grab = false;
  mgHint(''); glOrbsOff(); D.glCarry = 0; D.glShots.forEach(s => D.grp.remove(s.g)); D.glShots = [];
  sfx.grow();
  const at = () => dvW(new V3(G.x, G.y, 0.8));
  await tween(2.6, k => {
    G.melt = k;
    if(Math.random() < 0.6) emit(TEX.star, at().add(new V3((Math.random() - 0.5)*2.6, (Math.random() - 0.5)*2, 0)), {v:new V3(0, 0.8, 0), life:1, size:0.2, spin:3});
  }, ease.io);
  if(DV !== D) return;
  G.o.visible = false; G.st = 'off'; G.boss = false; G.melt = 0; G.fade = 0; G.t = 1e9; G.gone = true;
  document.body.classList.remove('gloom-on', 'gloom-boss'); dvRingsOn(false); if(D.ping) D.ping.hide = null;
  const O = glOctoMake('rise', G.x, Math.max(G.y, dvFloor(G.x) + 1.2));
  sfx.pop(); await tween(0.6, k => O.o.scale.setScalar(0.55*ease.out(k)));
  sfx.hug(); burst(TEX.heart, dvW(O.o.position).add(new V3(0, 0.6, 0)), 14, 2.2, 0.3);
  floatText(L('Спасибо!', 'Thank you!'), dvW(O.o.position).add(new V3(0, 1.1, 0)), '#D9527E');
  const sv = save.dive.gloom, first = sv.st < 3;
  sv.st = 3; if(!owns('lamp_octo')) save.owned.push('lamp_octo'); persist();
  await wait(1.3); if(DV !== D) return;
  await dvCard({img:glOctoThumb(), ttl:L('Это Клякса! 🐙', 'It\'s Blot! 🐙'),
    txt:L('Внутри Мглы прятался маленький осьминожек! Он испачкался в нефти из старой бочки, испугался и спрятался в муть — а муть всё росла и росла. Он ничего не видел и хватал всех подряд. Теперь он чистый — и совсем не страшный 💜', 'A little octopus was hiding inside the Gloom! It got dirty with oil from the old barrel, got scared and hid in the murk — and the murk kept growing and growing. It could not see and grabbed everyone. Now it is clean — and not scary at all 💜'),
    got:first ? `+${GL_GIFT} 🐚 · 🎁 ${L('Ночник-осьминожек для иглу', 'An octopus night-light for the igloo')}` : '',
    btn:L('Ура! 💜', 'Hooray! 💜')});
  if(DV !== D) return;
  if(first){ addShells(GL_GIFT, {x:innerWidth/2, y:innerHeight*0.45}); sfx.star(); }
  O.st = 'toBarrel'; D.pause = false;
  mgHint(L('Клякса плывёт к старой бочке. Поплыли следом — закроем её, чтобы нефть больше не текла! 🛢️', 'Blot is swimming to the old barrel. Follow — let\'s close it so no more oil leaks out! 🛢️'));
}
function glOctoModel(){   // Клякса: сиреневый осьминожек (в бухте живёт и обычный, коралловый)
  const o = DV_MAKE.octopus(), map = {0xFF8F7A:0xB9A0F2, 0xF27C68:0xA58BE6, 0xFFC0B0:0xE6DBFF};
  o.traverse(m => { if(m.isMesh && m.material && m.material.type === 'MeshToonMaterial'){ const c = map[m.material.color.getHex()]; if(c !== undefined){ m.material = m.material.clone(); m.material.color.setHex(c); } } });
  dvBlob(o, 0x3B3A4A, 0.09, 0.05, 0.07, 0.17, 1.04, 0.22, 1.1);   // маленькая клякса на макушке — на память
  return o;
}
let glThumb = null;
function glOctoThumb(){ return glThumb || (glThumb = objThumb(glOctoModel(), new V3(0.2, 0.3, 1))); }
function glOctoMake(st, x, y){
  const D = DV, o = glOctoModel(); o.scale.setScalar(st === 'rise' ? 0.01 : 0.55); o.position.set(x, y, 0.6); D.grp.add(o);
  D.glOcto = {o, st, x, y, dir:1, ph:Math.random()*6, sayI:0};
  dvTap({k:'octo', r:0.7, p:() => o.position.clone().add(new V3(0, 0.4, 0)), on:() => D.glOcto && D.glOcto.st !== 'rise', go:glOctoTap});
  return D.glOcto;
}
function glOctoStep(dt){
  const O = DV.glOcto, o = O.o, bx = GL_BARREL_X, fy = dvFloor(bx) + 1.3;
  if(O.st === 'toBarrel'){
    const dx = bx - 1.3 - O.x, dy = fy - O.y, l = Math.hypot(dx, dy);
    if(l > 0.1){ const k = Math.min(l, 2.2*dt)/l; O.x += dx*k; O.y += dy*k; O.dir = Math.sign(dx) || 1; }
    else if(!DV.glB.closed && !O.said){ O.said = true; floatText(L('Закроем бочку? У меня восемь лапок!', 'Shall we close the barrel? I have eight arms!'), dvW(o.position).add(new V3(0, 1, 0)), '#8E6FD8'); }
  } else if(O.st === 'lid'){   // держит крышку сверху
    O.x += (bx - O.x)*Math.min(1, dt*4); O.y += (dvFloor(bx) + 2.3 - O.y)*Math.min(1, dt*4);
  } else if(O.st === 'home'){   // живёт у бочки: плавает туда-сюда
    O.x += O.dir*0.6*dt; if(O.x > bx + 2) O.dir = -1; if(O.x < bx - 4) O.dir = 1;
    O.y += (fy + Math.sin(now*0.8 + O.ph)*0.5 - O.y)*Math.min(1, dt*2);
  }
  o.position.set(O.x, O.y + Math.sin(now*2 + O.ph)*0.08, 0.6);
  o.rotation.z = Math.sin(now*1.6 + O.ph)*0.12; o.rotation.y = Math.sin(now*0.7)*0.3;
}
function glOctoTap(){
  const O = DV.glOcto, at = dvW(O.o.position).add(new V3(0, 1, 0)), says = [L('Спасибо, что отмыла меня! 💜', 'Thank you for washing me clean! 💜'), L('Я сторожу бочку!', 'I\'m guarding the barrel!'), L('Теперь я всё-всё вижу!', 'Now I can see everything!'), L('Обнимашки восемью лапками! 🐙', 'An eight-arm hug! 🐙')];
  sfx.boing(); burst(TEX.heart, at, 8, 1.4, 0.26); floatText(says[O.sayI++ % says.length], at, '#8E6FD8');
}
// строчка в энциклопедии моря (dvBook)
function glBookRow(){
  const sv = save.dive.gloom; if(!sv.met && !sv.st) return '';
  const t = sv.st >= 3 ? L('🐙 <b>Клякса</b> — была Мглой, пока не отмылась от нефти. Живёт у старой бочки и сторожит её 🎀', '🐙 <b>Blot</b> — was the Gloom until it washed off the oil. Lives by the old barrel and guards it 🎀')
    : sv.st === 2 ? L('🌑 <b>Мгла</b> — кажется, ей грустно… Она вся в нефти и боится света ✨', '🌑 <b>The Gloom</b> — it seems sad… It is covered in oil and afraid of light ✨')
    : sv.st === 1 ? L('🌑 <b>Мгла</b> — живёт в глубине, у старой бочки с нефтью. 🛢️ Нефть пачкает мех и перья — и зверям становится холодно', '🌑 <b>The Gloom</b> — lives in the deep, by the old oil barrel. 🛢️ Oil makes fur and feathers dirty — and animals get cold')
    : L('🌑 <b>Мгла</b> — ??? Кто это? Куда она уползает?', '🌑 <b>The Gloom</b> — ??? Who is it? Where does it crawl away to?');
  return `<p class="got gl-row">${t}</p>`;
}

/* ---------- подарок в иглу: ночник-осьминожек (js/home.js) ---------- */
if(typeof FURN !== 'undefined' && !FURN.some(f => f.id === 'lamp_octo')){
  FURN.push({id:'lamp_octo', slot:'lamp', name:L('Ночник-осьминожек', 'Octopus night-light'), price:0, gift:true});
  FURN_MAKE.lamp_octo = () => {
    const g = lampBase(0.8), m = new THREE.MeshBasicMaterial({color:0xD9C8FF});
    const head = addOutline(new THREE.Mesh(SMALL, m), 1.05); head.scale.set(0.46, 0.5, 0.44); head.position.y = 1.3; g.add(head);
    const tents = [];
    for(let i = 0; i < 8; i++){
      const a = i/8*Math.PI*2, piv = new THREE.Group(); piv.position.set(Math.cos(a)*0.28, 1.0, Math.sin(a)*0.28);
      const pts = []; for(let j = 0; j <= 4; j++) pts.push(new V3(Math.cos(a)*j*0.07, -j*0.08 + (j > 2 ? (j - 2)*0.05 : 0), Math.sin(a)*j*0.07));
      const tb = addOutline(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.045, 6), toon(0xB9A0F2)), 1.2);
      piv.add(tb); piv.userData.ph = i; g.add(piv); tents.push(piv);
    }
    for(const s of [-1, 1]){
      const e = new THREE.Mesh(SMALL, inkMat); e.scale.set(0.045, 0.06, 0.03); e.position.set(0.15*s, 1.32, 0.42); g.add(e);
      const bl = new THREE.Mesh(SMALL, new THREE.MeshBasicMaterial({color:0xFFB3C7})); bl.scale.set(0.06, 0.035, 0.02); bl.position.set(0.25*s, 1.22, 0.38); g.add(bl);
    }
    const gl = glow(0xE0D4FF, 2.4); gl.position.set(0, 1.35, 0.3); g.add(gl);
    g.userData = {bulb:m, on:0xD9C8FF, off:0xC9C0DA, glow:gl, tents};
    return g;
  };
}
