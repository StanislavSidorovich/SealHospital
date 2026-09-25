/* ---------------- Играем вместе (Фаза 13): бой с Большой Тучей ----------------
   Парная игра «вместе, а не против» в духе Cuphead (попроще) и Split Fiction.
   Арена — длинная льдина, вид сбоку (под телефон стоймя). Над ней летает Большая Ворчливая Туча и засыпает всех снегом.
   Тюлени сами кидают снежки вверх — «щекочут» Тучку; игрок водит пальцем (тюлень бежит), ⬆️ или смахнуть вверх — прыжок.
   Три фазы: 1) снежки падают (тень на льду заранее показывает куда); 2) + катятся снежные шары — перепрыгни
   или запрыгни на льдинку-платформу; 3) + ряд сосулек с просветом — встань в просвет.
   Попало три раза — тюлень в пузыре. Напарник касается пузыря — спасён сразу, иначе пузырь сам лопнет через 6 с.
   Только если в пузырях оба — «Ой-ой!», эта фаза начинается заново (не весь бой). Проиграть насовсем нельзя.
   В конце Туча хохочет, чихает радугой и мирится. Напарник: папа по сети (js/net.js), Пинг (помогает сам) или без напарника.
   По сети: кто создал комнату — «хозяин», у него живёт Туча и её атаки; второй присылает, сколько раз попал.
   Каждый сам считает попадания по своему тюленю (честно на своём экране, задержка сети не мешает).
   Подключается после net.js и до game.js. */
const COOP_POS = new V3(-400, 0, 0);
const CO_HALF = 3.5;                       // арена от −3,5 до 3,5 м
const CO_G = 24, CO_VY = 9.4, CO_RUN = 5.5;   // прыжок ≈1,8 м
const CO_SC = 0.5;                         // размер тюленей на арене
const CO_HEARTS = 3, CO_REVIVE = 6, CO_INV = 1.6;
const CO_SHOT_T = 0.3, CO_SHOT_V = 13;
const CO_PLATS = [{x:-2.2, y:1.5, w:1.6}, {x:2.2, y:1.5, w:1.6}];
const CLOUD_Y = 7.5, CLOUD_SC = 1.5;
const BOSS_HP = [60, 75, 90];              // «ворчливость» в каждой фазе (без напарника — меньше)
const CO_BUB_Y = 1.3;                      // пузырь висит низко: напарник достаёт его просто подбежав
const CO_DAILY = 2;                        // ракушки — за первые две победы в день
const CO_GIFT = 10, CO_FIRST = 25;
// атаки фаз: по кругу, gap — пауза между ними
const CO_PH = [
  {seq:['drop', 'drop', 'drop2'], gap:1.5, spd:0.45},
  {seq:['drop', 'roll', 'drop2', 'drop', 'roll'], gap:1.55, spd:0.6},
  {seq:['rain', 'drop', 'roll', 'drop2', 'rain', 'drop'], gap:1.65, spd:0.75}
];
if(!save.coop) save.coop = typeof sanitizeCoop === 'function' ? sanitizeCoop(null) : {wins:0, tries:0, net:0, day:{d:'', n:0}};   // Pages мог отдать старый data.js
const coopRoot = new THREE.Group(); coopRoot.visible = false; scene.add(coopRoot);
const coAt = (x, y, z = 0) => new V3(COOP_POS.x + x, COOP_POS.y + y, COOP_POS.z + z);
const coClamp = x => Math.max(-CO_HALF + 0.35, Math.min(CO_HALF - 0.35, x));
const coToday = () => new Date().toDateString();
const coWinsToday = () => save.coop.day && save.coop.day.d === coToday() ? save.coop.day.n : 0;

/* ---------- арена: льдина, две льдинки-платформы, айсберги вдали ---------- */
let coBuilt = false;
function coBuild(){
  if(coBuilt) return; coBuilt = true;
  const w = new THREE.Mesh(new THREE.PlaneGeometry(140, 90), toon(0x6FC0DF)); w.rotation.x = -Math.PI/2; w.position.copy(coAt(0, -0.05, -20)); coopRoot.add(w);
  const fl = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(1, 1.06, 0.6, 48), toon(0xD6EAF5)), 1.02);
  fl.scale.set(CO_HALF + 0.7, 1, 1.7); fl.position.copy(coAt(0, -0.3)); coopRoot.add(fl);
  for(const p of CO_PLATS){
    const m = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(p.w/2, p.w/2*0.8, 0.32, 28), toon(0xE6F3FA)), 1.05);
    m.scale.z = 0.6; m.position.copy(coAt(p.x, p.y - 0.16)); coopRoot.add(m); p.o = m;
  }
  for(const [x, z, s] of [[-9, -24, 1.6], [-4.5, -34, 2.2], [5, -30, 1.8], [10, -22, 1.4], [15, -36, 2.4], [-15, -30, 2]]){
    const b = addOutline(new THREE.Mesh(new THREE.ConeGeometry(s, s*1.2, 6), toon(0xF3FAFD)), 1.03); b.position.copy(coAt(x, s*0.4, z)); coopRoot.add(b);
  }
}

/* ---------- модели ---------- */
function coSealOf(d){   // d — малыш {name, coat, stage, f, wear}; без малыша — белый тюлень
  let s;
  try{
    if(d && d.coat){
      s = makePetSeal({name:d.name || '', f:!!d.f, coat:d.coat, stage:Math.min(SHINY, Math.max(0, d.stage | 0)), wear:{}});
      for(const id of Object.values(d.wear || {})) if(WEAR[id] && shopItem(id)) wearOn(s, id);
      petTuft(s);
    }
  }catch(e){ s = null; }
  if(!s) s = makeSeal({name:'', f:false, color:0xFFFFFF});
  s.root.scale.setScalar(CO_SC);
  return s;
}
const coPetDesc = () => save.pet ? {name:save.pet.name, coat:save.pet.coat, stage:save.pet.stage || 0, f:!!save.pet.f, wear:{...(save.pet.wear || {})}} : null;
const CO_BUB_MAT = () => new THREE.SpriteMaterial({map:BUBBLE_TEX, transparent:true, depthWrite:false});
function coPlayer(m, name, kind){
  const bub = new THREE.Sprite(CO_BUB_MAT()); bub.scale.setScalar(1.7); bub.visible = false; coopRoot.add(bub);
  coopRoot.add(m.root);
  return {m, name, kind, x:0, y:0, vy:0, air:false, on:null, hp:CO_HEARTS, inv:0, bub:false, bubT:0, shotT:Math.random()*CO_SHOT_T,
    face:0, tx:null, bubO:bub, nx:0, ny:0, revT:0, aiT:0, lost:false, gone:false};
}

/* ---------- состояние боя ---------- */
let CO = null;
function coEmpty(mode){
  return {mode, host:mode !== 'net' || net.host, me:null, pal:null, B:null, H:[], shots:[], st:'ready', t:0,
    pendHits:0, hitSendT:0, sendT:0, bSendT:0, keyDir:0, drag:null, hud:null, wipeT:0, end:null, hiT:0, won:false, rainbow:null, gigT:0};
}
const coHasPal = () => CO.pal && !CO.pal.gone;
function coHpMax(ph){ return Math.round(BOSS_HP[ph]*(coHasPal() ? 1 : 0.6)); }
function coBossMake(){
  const c = makeCloud(); cloudKind(c, false); c.scale.setScalar(CLOUD_SC); coopRoot.add(c);
  return {c, x:0, y:CLOUD_Y, tx:0, ty:CLOUD_Y, hp:coHpMax(0), ph:0, st:'intro', t:0, atkT:2.2, seq:0, sq:0};
}
// где приземлится то, что падает сверху: на льдинку-платформу или на лёд
function coLandY(x){ const p = CO_PLATS.find(p => Math.abs(x - p.x) <= p.w/2); return p ? p.y : 0; }

/* ---------- атаки Тучи ---------- */
const CO_SNOW_MAT = toon(0xFFFFFF), CO_ICE_MAT = toon(0xBFE6F7);
const CO_SHADOW = new THREE.MeshBasicMaterial({color:0x3B3A4A, transparent:true, opacity:0.25, depthWrite:false});
function coBall(r){ const o = addOutline(new THREE.Mesh(SMALL, CO_SNOW_MAT), 1.08); o.scale.setScalar(r); coopRoot.add(o); return o; }
function coShadow(r){ const o = new THREE.Mesh(new THREE.CircleGeometry(r, 20), CO_SHADOW); o.rotation.x = -Math.PI/2; coopRoot.add(o); return o; }
function coSpawn(a){   // a = {k:'drop', x} | {k:'roll', from} | {k:'rain', g}; у хозяина — сразу, у гостя — по сообщению
  if(!CO) return;
  if(a.k === 'drop'){
    const land = coLandY(a.x), o = coBall(0.42), sh = coShadow(0.5);
    o.position.copy(coAt(a.x, CLOUD_Y - 1.1)); sh.position.copy(coAt(a.x, land + 0.03)); sh.scale.setScalar(0.2);
    CO.H.push({k:'drop', x:a.x, land, o, sh, t:0, y:CLOUD_Y - 1.1});
  }
  if(a.k === 'roll'){
    const warn = new THREE.Sprite(new THREE.SpriteMaterial({map:bubbleTex('⚠️'), transparent:true, depthWrite:false}));
    warn.scale.setScalar(1.1); warn.position.copy(coAt(a.from*(CO_HALF - 0.5), 1.1, 0.4)); coopRoot.add(warn);
    const o = coBall(0.5); o.visible = false;
    CO.H.push({k:'roll', from:a.from, x:a.from*(CO_HALF + 1.2), o, warn, t:0});
    sfx.grr();
  }
  if(a.k === 'rain'){
    const ics = [];
    for(let i = 0; i < 7; i++){
      if(i === a.g || i === a.g + 1) continue;   // просвет из двух мест
      const x = -3 + i, o = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.9, 8), CO_ICE_MAT), 1.1);
      o.rotation.x = Math.PI; o.position.copy(coAt(x, CLOUD_Y - 1.6)); coopRoot.add(o);
      const sh = coShadow(0.28); sh.position.copy(coAt(x, coLandY(x) + 0.03)); sh.scale.setScalar(0.3);
      ics.push({x, o, sh, y:CLOUD_Y - 1.6, land:coLandY(x), done:false});
    }
    CO.H.push({k:'rain', g:a.g, ics, t:0});
    sfx.sparkle();
  }
}
function coAttack(k){   // хозяин решает, какая атака и куда
  const B = CO.B, alive = [CO.me, CO.pal].filter(p => p && !p.gone && !p.bub);
  const aim = () => { const p = alive.length ? alive[Math.floor(Math.random()*alive.length)] : CO.me; return coClamp(p.x + (Math.random() - 0.5)*0.9); };
  const list = [];
  if(k === 'drop') list.push({k:'drop', x:aim()});
  if(k === 'drop2'){ const x = aim(), sd = x > 0 ? -1 : 1; list.push({k:'drop', x}, {k:'drop', x:coClamp(x + sd*(1.6 + Math.random()))}); }
  if(k === 'roll') list.push({k:'roll', from:Math.random() < 0.5 ? -1 : 1});
  if(k === 'rain') list.push({k:'rain', g:Math.floor(Math.random()*6)});
  for(const a of list){ coSpawn(a); if(CO.mode === 'net') netSend({t:'atk', a}); }
  if(k === 'rain') B.atkT += 1.2;   // после сосулек — передышка
}
function coClearHaz(){
  for(const h of CO.H){
    if(h.o) coopRoot.remove(h.o); if(h.sh) coopRoot.remove(h.sh); if(h.warn) coopRoot.remove(h.warn);
    if(h.ics) h.ics.forEach(i => { coopRoot.remove(i.o); coopRoot.remove(i.sh); });
  }
  CO.H = [];
}
// двигаем опасности; бьём только «своих» тюленей (у гостя — только его, у хозяина — его и Пинга)
function coHazStep(dt){
  const mine = [CO.me, CO.pal && CO.pal.kind === 'ping' ? CO.pal : null].filter(Boolean);
  const hitP = (p, x, y, r) => { if(p.bub || p.inv > 0) return false; const dx = x - p.x, dy = y - (p.y + 0.45); return dx*dx + dy*dy < (r + 0.42)**2; };
  CO.H = CO.H.filter(h => {
    h.t += dt;
    if(h.k === 'drop'){
      const T0 = 0.85;
      h.sh.scale.setScalar(Math.min(1, 0.2 + h.t/T0*0.8));
      if(h.t < T0){ h.o.position.x = coAt(h.x + Math.sin(h.t*30)*0.04, 0).x; return true; }   // дрожит под Тучкой — сейчас упадёт
      h.y -= dt*16; h.o.position.y = COOP_POS.y + h.y;
      for(const p of mine) if(hitP(p, h.x, h.y, 0.42)) coHurt(p);
      if(h.y <= h.land + 0.3){
        burst(TEX.puff, coAt(h.x, h.land + 0.2), 8, 1.6, 0.4); sfx.plop();
        coopRoot.remove(h.o); coopRoot.remove(h.sh); return false;
      }
      return true;
    }
    if(h.k === 'roll'){
      if(h.t < 1.0){ h.warn.material.opacity = 0.55 + Math.sin(h.t*18)*0.45; return true; }
      if(h.warn){ coopRoot.remove(h.warn); h.warn = null; h.o.visible = true; }
      h.x -= h.from*dt*5.2; h.o.position.copy(coAt(h.x, 0.5)); h.o.rotation.z += h.from*dt*10;
      for(const p of mine) if(!p.bub && p.inv <= 0 && Math.abs(h.x - p.x) < 0.85 && p.y < 0.75) coHurt(p);
      if(Math.random() < dt*12) emit(TEX.puff, coAt(h.x, 0.1, 0.3), {v:new V3(h.from, 0.5, 0), life:0.5, size:0.3});
      if(Math.abs(h.x) > CO_HALF + 1.4){ coopRoot.remove(h.o); return false; }
      return true;
    }
    if(h.k === 'rain'){
      const T0 = 1.15; let left = false;
      for(const i of h.ics){
        if(i.done) continue; left = true;
        i.sh.scale.setScalar(Math.min(1, 0.3 + h.t/T0*0.7));
        if(h.t < T0){ i.o.position.x = coAt(i.x + Math.sin(h.t*40 + i.x)*0.03, 0).x; continue; }
        i.y -= dt*15; i.o.position.y = COOP_POS.y + i.y;
        for(const p of mine) if(!p.bub && p.inv <= 0 && Math.abs(i.x - p.x) < 0.5 && i.y - 0.45 < p.y + 0.9 && i.y > p.y) coHurt(p);
        if(i.y - 0.45 <= i.land){
          i.done = true; burst(TEX.star, coAt(i.x, i.land + 0.15), 5, 1.4, 0.18);
          coopRoot.remove(i.o); coopRoot.remove(i.sh);
        }
      }
      if(h.t > T0 && h.t < T0 + 0.05) sfx.whoosh();
      return left;
    }
    return false;
  });
}

/* ---------- тюлени: удар, пузырь, спасение ---------- */
function coHurt(p){
  if(p.bub || p.inv > 0 || CO.st !== 'go') return;
  p.hp--; p.inv = CO_INV; sfx.plop();
  floatText(p.kind === 'ping' ? L('Кря!', 'Quack!') : L('Ой!', 'Oof!'), coAt(p.x, p.y + 1.2));
  squash(p.m, 0.25, 0.3);
  if(p.hp <= 0) coBubble(p);
  coHud();
  if(p === CO.me) coSendMe();
}
function coBubble(p){
  p.bub = true; p.bubT = CO_REVIVE; p.vy = 0; p.air = false; p.on = null; sfx.pop();
  burst(TEX.puff, coAt(p.x, p.y + 0.5), 10, 1.8, 0.4);
  if(p === CO.me) mgHint(coHasPal() ? L(`Ты в пузыре! ${CO.pal.name} может тебя спасти — или подожди`, `You're in a bubble! ${CO.pal.name} can save you — or just wait`) : L('Ты в пузыре! Сейчас попробуем ещё раз', 'You\'re in a bubble! Let\'s try again'));
  else floatText(L('Помоги!', 'Help!'), coAt(p.x, CO_BUB_Y + 1.1), '#D9527E');
}
function coRevive(p, byPal){
  if(!p.bub) return;
  p.bub = false; p.hp = CO_HEARTS; p.inv = 2; p.y = CO_BUB_Y; p.vy = 2; p.air = true; p.bubT = 0;
  sfx.hug(); burst(TEX.heart, coAt(p.x, CO_BUB_Y + 0.6), 12, 2, 0.3);
  if(byPal) floatText(p.kind === 'ping' ? L('Спасибо! Кря!', 'Thanks! Quack!') : L('Спасибо!', 'Thank you!'), coAt(p.x, CO_BUB_Y + 1.4), '#D9527E');
  if(p === CO.me){ mgHint(''); coSendMe(); }
  coHud();
}
function coJump(p){
  if(p.bub || p.air || CO.st === 'end') return;
  p.air = true; p.on = null; p.vy = CO_VY; if(p === CO.me) sfx.whoosh();
}
// движение и прыжки своего тюленя (и Пинга)
function coMove(p, dt, dir){
  if(p.bub){
    p.y += (CO_BUB_Y - p.y)*Math.min(1, dt*3);
    return;
  }
  let v = 0;
  if(dir) v = dir*CO_RUN;
  else if(p.tx !== null){ const d = p.tx - p.x; v = Math.abs(d) < 0.05 ? 0 : Math.sign(d)*Math.min(CO_RUN, Math.abs(d)*8); }
  p.x = coClamp(p.x + v*dt);
  if(Math.abs(v) > 0.3) p.face = Math.sign(v);
  else p.face *= Math.max(0, 1 - dt*4);
  if(p.on && Math.abs(p.x - p.on.x) > p.on.w/2){ p.on = null; p.air = true; p.vy = 0; }   // сошёл с льдинки — падает
  if(p.air){
    const y0 = p.y; p.vy -= CO_G*dt; p.y += p.vy*dt;
    if(p.vy < 0) for(const pl of CO_PLATS)
      if(y0 >= pl.y - 0.02 && p.y <= pl.y && Math.abs(p.x - pl.x) <= pl.w/2){ p.y = pl.y; p.air = false; p.on = pl; p.vy = 0; sfx.thud(); }
    if(p.air && p.y <= 0){ p.y = 0; p.air = false; p.vy = 0; if(y0 > 0.4) sfx.thud(); }
  }
}
function coDraw(p, dt){
  const m = p.m;
  m.root.position.copy(coAt(p.x, p.bub ? p.y - 0.35 + Math.sin(now*2.2)*0.08 : p.y));
  m.root.rotation.y += ((p.bub ? now*1.5 % (Math.PI*2) - Math.PI : p.face*0.9) - m.root.rotation.y)*Math.min(1, dt*(p.bub ? 1 : 10));
  m.flap = p.air ? 1 : Math.abs(p.face) > 0.5 ? 0.35 : 0;
  m.root.visible = !(p.inv > 0 && !p.bub && Math.floor(p.inv*10) % 2) && !p.gone;   // мигает после удара
  p.bubO.visible = p.bub && !p.gone;
  if(p.bub) p.bubO.position.copy(coAt(p.x, p.y + 0.15 + Math.sin(now*2.2)*0.08, 0.3));
  if(p.lost) m.root.visible = Math.floor(now*2) % 2 === 0;
  updateSeal(m, now, dt);
}

/* ---------- снежки игроков ---------- */
const CO_SHOT_GEO = new THREE.SphereGeometry(0.14, 10, 8);
function coShoot(p, mine){
  const o = addOutline(new THREE.Mesh(CO_SHOT_GEO, CO_SNOW_MAT), 1.2); coopRoot.add(o);
  const x = p.x + (Math.random() - 0.5)*0.12, y = p.y + 1.1;
  o.position.copy(coAt(x, y, 0.15)); CO.shots.push({o, x, y, mine});
}
function coShotsStep(dt){
  const B = CO.B;
  CO.shots = CO.shots.filter(s => {
    s.y += CO_SHOT_V*dt; s.o.position.y = COOP_POS.y + s.y;
    if(B.st !== 'win' && Math.abs(s.x - B.x) < 2.1 && Math.abs(s.y - B.y) < 1.0){
      coopRoot.remove(s.o);
      emit(TEX.puff, coAt(s.x, s.y, 0.6), {v:new V3(0, 0.6, 0), life:0.4, size:0.25});
      B.sq = 1;
      if(s.mine && B.st === 'go'){ if(CO.host) coBossHit(1); else { CO.pendHits++; B.hp = Math.max(0, B.hp - 1); } }
      return false;
    }
    if(s.y > CLOUD_Y + 4){ coopRoot.remove(s.o); return false; }
    return true;
  });
}
function coBossHit(n){
  const B = CO.B; if(B.st !== 'go') return;
  B.hp -= n;
  if(now - CO.gigT > 2.2 && Math.random() < 0.3){ CO.gigT = now; sfx.giggle(); floatText(L(['Хи!', 'Ай, щекотно!', 'Хи-хи', 'Ну хватит!'], ['Hee!', 'That tickles!', 'Hee-hee', 'Stop it!'])[Math.floor(Math.random()*4)], coAt(B.x + 1.8, B.y + 1.2), '#6B6A7E'); }
  if(B.hp <= 0) coPhaseEnd();
  coHud();
}

/* ---------- фазы, «Ой-ой», победа (решает хозяин) ---------- */
const CO_PH_SAY = [
  () => L('Большая Туча засыпает всех снегом! Защекочем её снежками — вместе! ☁️', 'The Big Cloud is burying everyone in snow! Let\'s tickle it with snowballs — together! ☁️'),
  () => L('«Ах так?! Тогда покатаю снежные шары!» — прыгай через них ⬆️', '“Oh yeah?! Then have some rolling snowballs!” — jump over them ⬆️'),
  () => L('«Сосульки!» — найди просвет и встань туда ❄️', '“Icicles!” — find the gap and stand in it ❄️')
];
async function coPhaseEnd(){
  const B = CO.B;
  if(B.ph >= CO_PH.length - 1) return coWin();
  B.st = 'change'; coClearHaz(); sfx.grr();
  if(CO.mode === 'net') netSend({t:'ph', ph:B.ph + 1});
  await coPhaseShow(B.ph + 1);
  if(!CO || CO.B !== B) return;
  B.hp = coHpMax(B.ph); B.st = 'go'; B.atkT = 1.4; B.seq = 0; coHud();
}
async function coPhaseShow(ph){   // Туча сердится: трясётся и темнеет
  const B = CO.B, u = B.c.userData; B.ph = ph; B.st = 'change';
  mgHint(CO_PH_SAY[ph]());
  const c0 = u.mat.color.clone(), c1 = new THREE.Color(0x9AA3B8).lerp(new THREE.Color(0x6F7890), ph/2);
  await tween(1.6, k => { B.c.rotation.z = Math.sin(k*Math.PI*10)*0.08*(1 - k); u.mat.color.copy(c0).lerp(c1, k); }, ease.lin);
  B.c.rotation.z = 0;
  setTimeout(() => { if(CO && mgHintEl.textContent === CO_PH_SAY[ph]()) mgHint(''); }, 2200);
}
async function coWipe(){   // оба в пузырях: фаза сначала, все снова на льду
  const B = CO.B; if(B.st !== 'go') return;
  B.st = 'wipe'; coClearHaz();
  if(CO.mode === 'net' && CO.host) netSend({t:'wipe'});
  await coWipeShow();
  if(!CO || CO.B !== B) return;
  B.hp = coHpMax(B.ph); B.st = 'go'; B.atkT = 1.6; B.seq = 0; coHud();
}
async function coWipeShow(){
  CO.B.st = 'wipe'; sfx.bad();
  mgHint(coHasPal() ? L('Ой-ой! Оба в пузырях. Ещё разок — у вас получится! 💪', 'Uh-oh! Both in bubbles. One more go — you can do it! 💪') : L('Ой-ой! Ещё разок — у тебя получится! 💪', 'Uh-oh! One more go — you can do it! 💪'));
  await wait(1.8);
  if(!CO) return;
  coRevive(CO.me); if(CO.pal && CO.pal.kind === 'ping') coRevive(CO.pal);
  mgHint('');
}
async function coWin(){
  const B = CO.B; if(B.st === 'win') return;
  B.st = 'win'; CO.won = true; coClearHaz();
  if(CO.mode === 'net' && CO.host) netSend({t:'win'});
  CO.st = 'end';
  const c = B.c; sfx.giggle(); mgHint(L('«Хи-хи-хи! Щекотно! Всё, мир!» ☁️🌈', '“Hee-hee-hee! That tickles! Okay, let\'s be friends!” ☁️🌈'));
  await tween(1.2, k => { c.rotation.z = Math.sin(k*Math.PI*12)*0.1*(1 - k); c.position.y = COOP_POS.y + CLOUD_Y - k*1.2; }, ease.lin);
  B.y = CLOUD_Y - 1.2; cloudKind(c, true); sfx.sneeze(); sfx.hug();
  const rb = new THREE.Group(); rb.position.copy(coAt(B.x, CLOUD_Y - 2, -1.5)); coopRoot.add(rb); CO.rainbow = rb;
  [0xFF9BB8, 0xFFC56B, 0xFFF08A, 0x9BE3B5, 0x8CC8F2, 0xB9A2F0].forEach((col, i) => {
    const a = new THREE.Mesh(new THREE.TorusGeometry(3.4 - i*0.2, 0.1, 6, 40, Math.PI), new THREE.MeshBasicMaterial({color:col})); rb.add(a);
  });
  rb.scale.setScalar(0.01);
  await tween(0.8, k => rb.scale.setScalar(Math.max(0.01, k)), ease.out);
  // все на лёд, встаём рядышком для фото
  const side = CO.mode !== 'net' || net.host ? -1 : 1, two = coHasPal();
  const ps = [CO.me, CO.pal].filter(p => p && !p.gone && p.kind !== 'net');   // папин тюлень встанет сам на своём телефоне и пришлёт, где он
  ps.forEach(p => { if(p.bub) coRevive(p); p.tx = null; });
  const from = ps.map(p => [p.x, p.y]), to = two ? [side*0.62, -side*0.62] : [0];
  await tween(0.7, k => ps.forEach((p, i) => { p.x = from[i][0] + (to[i] - from[i][0])*k; p.y = from[i][1]*(1 - k) + Math.sin(k*Math.PI)*0.6; p.face = 0; }), ease.io);
  ps.forEach(p => { p.y = 0; p.air = false; p.vy = 0; p.m.flap = 1; burst(TEX.heart, coAt(p.x, 1), 10, 2, 0.3); });
  await wait(1.4);
  if(CO) CO.end = 'win';
}

/* ---------- Пинг-помощник (без сети): бежит под Тучку, уворачивается, спасает из пузыря ---------- */
function coAI(p, dt){
  if(p.bub) return;
  p.aiT -= dt;
  const me = CO.me;
  for(const h of CO.H) if(h.k === 'roll' && h.o.visible && !p.air && Math.sign(p.x - h.x) === -h.from && Math.abs(p.x - h.x) < 1.7 && p.y < 0.2 && !h.pj){ h.pj = true; if(Math.random() < 0.9) coJump(p); }
  if(p.aiT > 0) return;
  p.aiT = 0.2 + Math.random()*0.15;
  let tx = CO.B.x + Math.sin(now*0.7)*0.9;
  if(me.bub) tx = me.x;
  else if(Math.abs(tx - me.x) < 0.9) tx = me.x + (tx > me.x ? 1 : -1)*1.1;   // не толкаться с напарником
  for(const h of CO.H){
    if(h.k === 'drop' && h.t < 0.85 && Math.abs(h.x - tx) < 1.1 && Math.random() < 0.9) tx = h.x + (tx < h.x ? -1.5 : 1.5);
    if(h.k === 'rain' && h.t < 1.15){ const g = -3 + h.g + 0.5; tx = g + (me.bub ? 0 : (me.x > g ? -0.35 : 0.35)); }
  }
  if(tx < -CO_HALF + 0.4 || tx > CO_HALF - 0.4) tx = coClamp(tx) - Math.sign(tx)*0.8;
  p.tx = coClamp(tx);
}

/* ---------- сеть: что шлём и что получаем ---------- */
function coSendMe(){ const p = CO.me; netSend({t:'p', x:+p.x.toFixed(2), y:+p.y.toFixed(2), hp:p.hp, b:p.bub, f:+p.face.toFixed(2)}); }
function coNetWire(){
  netOn('p', m => { const p = CO && CO.pal; if(!p) return;
    p.nx = m.x; p.ny = m.y; p.face = m.f; p.hp = m.hp;
    if(m.b && !p.bub){ p.bub = true; burst(TEX.puff, coAt(p.x, p.y + 0.5), 10, 1.8, 0.4); sfx.pop(); floatText(L('Помоги!', 'Help!'), coAt(p.x, CO_BUB_Y + 1.1), '#D9527E'); }
    if(!m.b && p.bub){ p.bub = false; burst(TEX.heart, coAt(p.x, CO_BUB_Y + 0.6), 12, 2, 0.3); }
    coHud();
  });
  netOn('b', m => { const B = CO && CO.B; if(!B || CO.host) return; B.tx = m.x; B.ty = m.y; B.hp = Math.max(0, m.hp - CO.pendHits); if(m.ph !== B.ph && B.st === 'go') B.ph = m.ph; coHud(); });
  netOn('atk', m => { if(CO && !CO.host && CO.st === 'go') coSpawn(m.a); });
  netOn('hit', m => { if(CO && CO.host) coBossHit(m.n); });
  netOn('rev', () => { if(CO && CO.me.bub) coRevive(CO.me, true); });
  netOn('ph', m => { if(CO && !CO.host){ coClearHaz(); coPhaseShow(m.ph).then(() => { if(CO){ CO.B.st = 'go'; CO.B.hp = coHpMax(m.ph); coHud(); } }); } });
  netOn('wipe', () => { if(CO && !CO.host){ coClearHaz(); coWipeShow().then(() => { if(CO) CO.B.st = 'go'; }); } });
  netOn('win', () => { if(CO && !CO.host) coWin(); });
  netOn('emo', () => { if(CO && CO.pal) coHeart(CO.pal); });
  netOn('bye', () => { if(!CO || !CO.pal) return; CO.pal.gone = true; CO.B.hp = Math.min(CO.B.hp, coHpMax(CO.B.ph)); toast(L('Напарник уплыл домой 👋', 'Your partner went home 👋')); coHud(); if(CO.onBye) CO.onBye(); });
  net.onLost = () => { if(CO && CO.pal){ CO.pal.lost = true; mgHint(L('Связь пропала… подождём 🌊', 'Lost the connection… let\'s wait 🌊')); } };
  net.onBack = () => { if(CO && CO.pal){ CO.pal.lost = false; mgHint(''); toast(L('Снова вместе! 💗', 'Together again! 💗')); } };
}
function coHeart(p){ burst(TEX.heart, coAt(p.x, p.y + 1.3), 8, 1.6, 0.3); sfx.purr(); }

/* ---------- кадр боя ---------- */
function coStep(dt){
  if(!CO) return;
  const {me, pal, B} = CO;
  // камера: вся арена по ширине, Туча сверху
  const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov)/2), d = Math.max((CO_HALF + 0.45)/(tv*camera.aspect), 6/tv);
  runCam.look.copy(coAt(0, 3.4, 0)); runCam.pos.copy(coAt(Math.sin(now*0.2)*0.15, 4.4, d));
  const go = CO.st === 'go';
  // свой тюлень
  if(go) coMove(me, dt, CO.keyDir);
  if(me.inv > 0) me.inv -= dt;
  if(pal && !pal.gone){
    if(pal.kind === 'ping'){ if(go){ coAI(pal, dt); coMove(pal, dt, 0); } if(pal.inv > 0) pal.inv -= dt; }
    else { pal.x += (pal.nx - pal.x)*Math.min(1, dt*12); pal.y += (pal.ny - pal.y)*Math.min(1, dt*12); }
  }
  // пузыри: сам лопается через 6 с, если напарник на ногах; напарник касается — спасён сразу
  if(go){
    for(const p of [me, pal]){
      if(!p || p.gone || !p.bub || (p.kind === 'net')) continue;
      const other = p === me ? pal : me, palOk = other && !other.gone && (!other.bub || other.lost);
      p.bubT -= dt;
      if(p.bubT <= 0 && palOk) coRevive(p);
    }
    for(const [a, b] of [[me, pal], [pal, me]]){
      if(!a || !b || a.gone || b.gone || a.bub || !b.bub || a.kind === 'net') continue;
      const dx = a.x - b.x, dy = a.y + 0.45 - CO_BUB_Y;
      if(dx*dx + dy*dy < 1.25 && (a.revT -= dt) <= 0){
        a.revT = 0.6;
        if(b.kind === 'net') netSend({t:'rev'}); else coRevive(b, true);
      }
    }
    if(CO.host && B.st === 'go'){
      const allDown = me.bub && (!coHasPal() || (pal.bub && !pal.lost));
      if(allDown && (coHasPal() || me.bubT < CO_REVIVE - 1.2)) coWipe();
    }
  }
  // снежки
  if(go && B.st === 'go'){
    for(const p of [me, pal]){
      if(!p || p.gone || p.bub || p.lost) continue;
      p.shotT -= dt;
      if(p.shotT <= 0){ p.shotT += CO_SHOT_T; coShoot(p, p.kind !== 'net'); }
    }
  }
  coShotsStep(dt);
  coHazStep(dt);
  // Туча
  if(CO.host){
    if(B.st === 'go'){
      B.t += dt;
      const ph = CO_PH[B.ph];
      B.x = Math.sin(B.t*ph.spd)*1.9 + Math.sin(B.t*ph.spd*2.7)*0.25; B.y = CLOUD_Y + Math.sin(B.t*1.3)*0.25;
      B.atkT -= dt;
      if(B.atkT <= 0){ const k = ph.seq[B.seq++ % ph.seq.length]; B.atkT = ph.gap; coAttack(k); }
    }
    if(CO.mode === 'net' && (CO.bSendT -= dt) <= 0){ CO.bSendT = 0.1; netSend({t:'b', x:+B.x.toFixed(2), y:+B.y.toFixed(2), hp:B.hp, ph:B.ph}); }
  } else if(B.st !== 'win'){ B.x += (B.tx - B.x)*Math.min(1, dt*8); B.y += (B.ty - B.y)*Math.min(1, dt*8); }
  if(CO.mode === 'net'){
    if((CO.sendT -= dt) <= 0){ CO.sendT = 0.08; coSendMe(); }
    if(!CO.host && CO.pendHits && (CO.hitSendT -= dt) <= 0){ CO.hitSendT = 0.15; netSend({t:'hit', n:CO.pendHits}); CO.pendHits = 0; }
  }
  const c = B.c, u = c.userData;
  if(B.st !== 'win') c.position.copy(coAt(B.x, B.y));
  B.sq = Math.max(0, B.sq - dt*5);
  c.scale.set(CLOUD_SC*(1 + B.sq*0.06), CLOUD_SC*(1 - B.sq*0.06), CLOUD_SC);
  u.eyes.forEach(e => e.scale.y = B.sq > 0.3 ? 0.03 : 0.11*((now % 3.7) < 0.12 ? 0.15 : 1));   // щекотно — жмурится
  if(CO.rainbow) CO.rainbow.position.x = coAt(B.x, 0).x;
  for(const p of [me, pal]) if(p) coDraw(p, dt);
}

/* ---------- экран: полоска «ворчливости», сердечки, кнопки ---------- */
function coHudBuild(){
  const hud = mgNode('div', 'co-hud', `
    <div class="co-boss"><span class="ic" aria-hidden="true">☁️</span><span class="bar"><i></i></span><span class="ph"></span></div>
    <div class="co-pl"><span class="pill me"></span><span class="pill pal" hidden></span></div>`);
  const btns = mgNode('div', 'co-btns', `
    ${CO.mode === 'net' ? `<button class="round co-mic" aria-label="${L('Микрофон', 'Microphone')}">🎤</button>` : ''}
    <button class="round co-heart" aria-label="${L('Сердечко напарнику', 'A heart for your partner')}">💗</button>
    <button class="co-jump" aria-label="${L('Прыжок', 'Jump')}">⬆️</button>`);
  CO.hud = hud;
  const jb = btns.querySelector('.co-jump');
  mgOn(jb, 'pointerdown', e => { e.preventDefault(); e.stopPropagation(); if(CO.st === 'go') coJump(CO.me); });
  mgOn(btns.querySelector('.co-heart'), 'click', e => {
    e.stopPropagation(); coHeart(CO.me);
    if(CO.mode === 'net') netSend({t:'emo'});
    else if(CO.pal && CO.pal.kind === 'ping') setTimeout(() => { if(CO && CO.pal){ coHeart(CO.pal); floatText(L('Кря! 💙', 'Quack! 💙'), coAt(CO.pal.x, CO.pal.y + 1.6)); } }, 700);
  });
  const mic = btns.querySelector('.co-mic');
  if(mic) mgOn(mic, 'click', async e => {
    e.stopPropagation(); sfx.tap();
    if(net.mic){ netMicOff(false); mic.classList.remove('on'); mic.textContent = '🎤'; return; }
    const ok = await netMicOn();
    if(ok){ mic.classList.add('on'); mic.textContent = '🎙️'; toast(L('Микрофон включён — вас слышно 🎙️', 'Microphone on — you can be heard 🎙️')); }
    else toast(L('Микрофон не разрешён. Можно созвониться по телефону 📞', 'The microphone is not allowed. You can call each other on the phone 📞'));
  });
  coHud();
}
function coHud(){
  if(!CO || !CO.hud) return;
  const B = CO.B, h = CO.hud, max = coHpMax(B.ph);
  h.querySelector('.bar i').style.width = (B.st === 'win' ? 0 : Math.max(0, B.hp)/max*100) + '%';
  h.querySelector('.ph').textContent = CO_PH.map((_, i) => i < B.ph || B.st === 'win' ? '●' : i === B.ph ? '◉' : '○').join('');
  const hearts = p => p.bub ? '🫧' : '❤️'.repeat(Math.max(0, p.hp)) + '🤍'.repeat(Math.max(0, CO_HEARTS - p.hp));
  h.querySelector('.me').textContent = `${CO.me.name} ${hearts(CO.me)}`;
  const pe = h.querySelector('.pal');
  pe.hidden = !CO.pal || CO.pal.gone;
  if(CO.pal) pe.textContent = `${CO.pal.name} ${hearts(CO.pal)}`;
}

/* ---------- управление: вести пальцем (относительно, чтобы палец не закрывал тюленя), ⬆️ или смахнуть вверх — прыжок ---------- */
const coRay = new THREE.Raycaster(), coNdc = new THREE.Vector2(), coPlane = new THREE.Plane(new V3(0, 0, 1), -COOP_POS.z), coHit = new V3();
function coWorldX(cx, cy){
  coNdc.set(cx/innerWidth*2 - 1, -(cy/innerHeight)*2 + 1); coRay.setFromCamera(coNdc, camera);
  return coRay.ray.intersectPlane(coPlane, coHit) ? coHit.x - COOP_POS.x : 0;
}
function coControls(){
  mgOn(mgRoot, 'pointerdown', e => {
    if(e.target.closest('button')) return;
    e.preventDefault();
    CO.drag = {id:e.pointerId, x0:coWorldX(e.clientX, e.clientY), sx:CO.me.x, cy:e.clientY, t:performance.now(), jumped:false};
    CO.me.tx = CO.me.x;
  });
  mgOn(mgRoot, 'pointermove', e => {
    const d = CO.drag; if(!d || d.id !== e.pointerId) return;
    CO.me.tx = coClamp(d.sx + (coWorldX(e.clientX, e.clientY) - d.x0)*1.25);
    if(!d.jumped && d.cy - e.clientY > 55 && performance.now() - d.t < 350){ d.jumped = true; if(CO.st === 'go') coJump(CO.me); }
  });
  const up = e => { if(CO.drag && CO.drag.id === e.pointerId){ CO.drag = null; CO.me.tx = null; } };
  mgOn(mgRoot, 'pointerup', up); mgOn(mgRoot, 'pointercancel', up);
  const keys = {};
  mgOn(window, 'keydown', e => {
    if(e.key === 'ArrowLeft' || e.key === 'ArrowRight'){ e.preventDefault(); keys[e.key] = true; }
    if((e.key === ' ' || e.key === 'ArrowUp') && !e.repeat){ e.preventDefault(); if(CO.st === 'go') coJump(CO.me); }
    CO.keyDir = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
  });
  mgOn(window, 'keyup', e => { keys[e.key] = false; CO.keyDir = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0); });
}

/* ---------- во что и с кем играем ----------
   Две игры: ☁️ бой с Большой Тучей (тут) и 🦭 «Спасаем потеряшку» (js/rescue.js). Возвращает {game, mode} или null. */
let coGame = 'fight';
const CO_GAMES = {
  fight:{ic:'☁️', name:() => L('Большая Туча', 'The Big Cloud'),
    say:() => L('Туча засыпает льдину снегом. Щекочите её снежками вдвоём! Упал — напарник спасёт из пузыря.', 'The Cloud is burying the ice in snow. Tickle it with snowballs, two of you! Fall down — your partner saves you from the bubble.')},
  rescue:{ic:'🦭', name:() => L('Потеряшка', 'Lost pup'),
    say:() => L('Малыш потерялся и застрял во льду. Один прыгает высоко, другой сильный и ныряет — дойдите до него вместе!', 'A pup is lost and stuck in the ice. One of you jumps high, the other is strong and dives — reach it together!')}
};
async function coopMenu(){
  for(;;){
    mgOpen(L('Играем вместе!', 'Let\'s play together!'));
    const pingOk = typeof pengMet === 'function' && pengMet();
    const games = typeof rescueGame === 'function' ? ['fight', 'rescue'] : ['fight'];
    if(!games.includes(coGame)) coGame = 'fight';
    const panel = mgNode('div', 'mg-panel fun-pick co-pick', `
      ${games.length > 1 ? `<div class="co-games" role="tablist">${games.map(g => `<button role="tab" data-g="${g}"><span aria-hidden="true">${CO_GAMES[g].ic}</span> ${CO_GAMES[g].name()}</button>`).join('')}</div>` : ''}
      <p class="ttl display"${games.length > 1 ? ' hidden' : ''}></p>
      <p class="got co-say"></p>
      <div class="picks">
        ${netAvail() ? `<button data-k="net" class="wide"><span class="ic">🌐</span><b>${L('По сети', 'Online')}</b><small>${L('с папой или другом', 'with Dad or a friend')}</small></button>` : ''}
        ${pingOk ? `<button data-k="ping"><span class="ic">🐧</span><b>${L('С Пингом', 'With Ping')}</b><small>${L('он поможет', 'he\'ll help')}</small></button>` : ''}
        <button data-k="solo"${pingOk ? '' : ' class="wide"'}><span class="ic">🦭</span><b>${L('Без напарника', 'Solo')}</b><small>${L('полегче', 'a bit easier')}</small></button>
      </div>
      ${netAvail() ? `<p class="got small-note">🐦 ${L('Если напарник позвал чайку из забега — выбирай «По сети», и ты прилетишь к нему чайкой', 'If your partner called the gull from a dash, pick “Online” and you will fly in as the gull')}</p>` : ''}
      <p class="got co-wins"></p>
      <button class="btn ghost small" data-k="no">${L('Потом', 'Later')}</button>`);
    const show = () => {
      const G = CO_GAMES[coGame], rw = save.coop.resc ? save.coop.resc.wins : 0;
      panel.querySelector('.ttl').textContent = `${G.ic} ${G.name()}`;
      panel.querySelector('.co-say').textContent = G.say();
      const w = coGame === 'fight' ? (save.coop.wins ? `🏆 ${L(`Побед над Тучей: ${save.coop.wins}`, `Wins against the Cloud: ${save.coop.wins}`)}` : '')
        : rw ? `💗 ${L(`Спасено потеряшек: ${rw}`, `Lost pups rescued: ${rw}`)}` : '';
      const we = panel.querySelector('.co-wins'); we.textContent = w; we.hidden = !w;
      panel.querySelectorAll('[data-g]').forEach(b => b.setAttribute('aria-selected', b.dataset.g === coGame));
      const pb = panel.querySelector('[data-k="ping"] small'); if(pb) pb.textContent = coGame === 'rescue' ? L('он Силач', 'he\'s strong') : L('он поможет', 'he\'ll help');
      const sb = panel.querySelector('[data-k="solo"] small'); if(sb) sb.textContent = coGame === 'rescue' ? L('ведёшь обоих', 'lead both') : L('полегче', 'a bit easier');
    };
    panel.querySelectorAll('[data-g]').forEach(b => mgOn(b, 'click', () => { if(coGame !== b.dataset.g){ sfx.tap(); coGame = b.dataset.g; show(); } }));
    show();
    const k = await new Promise(r => panel.querySelectorAll('[data-k]').forEach(b => mgOn(b, 'click', () => { sfx.tap(); r(b.dataset.k); })));
    panel.classList.add('away'); await wait(0.2); mgClose();
    if(k === 'no') return null;
    if(k !== 'net') return {game:coGame, mode:k};
    if(await netLobby() === 'ok') return {game:coGame, mode:'net'};
  }
}
// соединились по сети: здороваемся и решаем, во что играем. Напарник в забеге — летим к нему чайкой (js/gull.js);
// выбрали разное — играем в то, что выбрал хозяин комнаты
async function coopNet(game){
  mgOpen(L('Здороваемся… 👋', 'Saying hello… 👋'));
  const pal = await coHello(game); mgClose();
  if(pal && pal.want === 'run' && typeof gullFly === 'function') return gullFly(pal);
  let g = game;
  if(!net.host && pal && CO_GAMES[pal.want] && pal.want !== game && (pal.want !== 'rescue' || typeof rescueGame === 'function')){
    g = pal.want; coGame = g;
    toast(L(`Напарник выбрал «${CO_GAMES[g].name()}» — играем в неё!`, `Your partner picked “${CO_GAMES[g].name()}” — let's play that!`), 3200);
  }
  return g === 'rescue' ? rescueGame('net', pal) : coopFight('net', pal);
}
function coopPlay(pick){ return pick.mode === 'net' ? coopNet(pick.game) : pick.game === 'rescue' ? rescueGame(pick.mode) : coopFight(pick.mode); }
// знакомство по сети: обмениваемся малышами, хозяин даёт старт
// want — чем занят: 'fight' (бой с Тучей) или 'run' (забег, напарник прилетит чайкой — js/gull.js); придёт в pal.want
function coHello(want = 'fight'){
  return new Promise(res => {
    let got = null, t = null;
    const take = m => { got = {...(m.pet || {}), want:m.want || 'fight'}; };
    netOn('hi', m => { take(m); netSend({t:'hi2', pet:coPetDesc(), want}); fin(); });
    netOn('hi2', m => { take(m); fin(); });
    const fin = () => { clearTimeout(t); res(got); };
    netSend({t:'hi', pet:coPetDesc(), want});
    t = setTimeout(() => res(got || {}), 8000);
  });
}

/* ---------- сам бой ---------- */
async function coopFight(mode, pal0 = null){   // по сети зовёт coopNet — там уже поздоровались
  coBuild();
  sfx.whoosh(); flash();
  const fog = scene.fog; scene.fog = null;
  coopRoot.visible = true; runCam.on = true; HEMI.intensity = 0.62; sun.intensity = 0.58;
  document.body.classList.add('run-on');
  const homeB = document.createElement('button'); homeB.id = 'btnRunHome'; homeB.className = 'round home';
  homeB.innerHTML = '<span aria-hidden="true">🏠</span>'; homeB.setAttribute('aria-label', L('Домой', 'Home')); $('#btnSound').after(homeB);
  let quit = null;
  homeB.addEventListener('click', () => { sfx.tap(); if(quit) quit(); });
  let again = true, res = null;
  while(again){
    CO = coEmpty(mode);
    const meName = save.pet ? save.pet.name : L('Ты', 'You');
    CO.me = coPlayer(coSealOf(coPetDesc()), meName, 'me');
    if(mode === 'ping'){ const m = makePenguin(PENG); m.root.scale.setScalar(CO_SC*0.95); CO.pal = coPlayer(m, L('Пинг', 'Ping'), 'ping'); }
    if(mode === 'net'){ CO.pal = coPlayer(coSealOf(pal0), (pal0 && pal0.name) || L('Папа', 'Dad'), 'net'); coNetWire(); }
    // хозяин стоит слева, гость справа
    const left = mode !== 'net' || net.host;
    CO.me.x = left ? -1.2 : 1.2; if(CO.pal){ CO.pal.x = CO.pal.nx = -CO.me.x; }
    CO.B = coBossMake(); CO.B.tx = 0; CO.B.ty = CLOUD_Y;
    save.coop.tries++; persist();
    mgOpen('', {hintBottom:true});
    coHudBuild(); coControls();
    let done; const fin = new Promise(r => done = r);
    quit = () => done('quit');
    CO.onBye = null;
    mgTick(dt => { coStep(dt); if(CO && CO.end) done(CO.end); });
    // старт: гость ждёт сигнала хозяина
    if(mode === 'net'){
      if(net.host){ await Promise.race([new Promise(r => netOn('ready', r)), wait(8), fin]); netSend({t:'go'}); }
      else {   // «готов» повторяем, пока хозяин не ответит: он мог ещё не начать слушать
        const go = new Promise(r => netOn('go', r)), iv = setInterval(() => netSend({t:'ready'}), 400);
        netSend({t:'ready'}); await Promise.race([go, fin]); clearInterval(iv);
      }
    }
    mgHint(CO_PH_SAY[0]()); sfx.grr(); await wait(2.4);
    if(!save.coop.wins){ mgHint(L('Води пальцем — тюлень бежит. Снежки летят сами! ⬆️ — прыжок', 'Slide your finger — your seal runs. Snowballs fly by themselves! ⬆️ — jump')); await wait(2.6); }
    for(const n of ['3', '2', '1']){ mgHint(n); sfx.tick(); await wait(0.5); }
    mgHint(L('Вперёд! ❄️', 'Go! ❄️')); sfx.arf();
    CO.st = 'go'; CO.B.st = 'go';
    setTimeout(() => { if(CO && mgHintEl.textContent.includes('❄️')) mgHint(''); }, 1100);
    const how = await fin;
    if(how === 'quit'){ if(mode === 'net') netSend({t:'bye'}); mgClose(); break; }
    mgHint(''); res = coResults();
    again = await coResultPanel(res);
    mgClose();
    coCleanRound();
  }
  coCleanRound();
  if(mode === 'net') netClose();
  homeB.remove(); document.body.classList.remove('run-on');
  flash();
  coopRoot.visible = false; runCam.on = false; homeLights(false); scene.fog = fog;
  return res;
}
function coCleanRound(){
  if(!CO) return;
  coClearHaz(); CO.shots.forEach(s => coopRoot.remove(s.o));
  for(const p of [CO.me, CO.pal]) if(p){ coopRoot.remove(p.m.root); coopRoot.remove(p.bubO); }
  coopRoot.remove(CO.B.c); if(CO.rainbow) coopRoot.remove(CO.rainbow);
  CO = null;
}
function coResults(){
  const c = save.coop, first = !c.wins, today = coToday();
  const n = coWinsToday(), paid = n < CO_DAILY;
  c.wins++; if(CO.mode === 'net') c.net++;
  c.day = {d:today, n:n + 1};
  const gift = first ? CO_FIRST : paid ? CO_GIFT : 0;
  let photo = null;
  if(first || CO.mode !== 'solo'){   // фото «мы вместе» — в альбом (с папой — каждый раз)
    photo = snapshot({root:{position:coAt(0, -0.5), scale:{x:1}}}, CO.pal && !CO.pal.gone ? 1.45 : 1.1);   // тюлени уже стоят рядышком (coWin)
    albumAdd({name:CO.mode === 'net' ? L('Мы вместе', 'Together') : CO.mode === 'ping' ? L('Пинг', 'Ping') : L('Туча', 'Cloud'), img:photo, d:Date.now()});
    renderAlbumCount();
  }
  persist();
  return {gift, first, photo, mode:CO.mode, pal:CO.pal && CO.pal.name, paid};
}
async function coResultPanel(res){
  const net1 = res.mode === 'net';
  const panel = mgNode('div', 'mg-panel run-end co-end', `
    <p class="ttl display">${L('Победа! 🏆', 'Victory! 🏆')}</p>
    <p class="got">${L('Большая Туча больше не ворчит — теперь она подружка ☁️🌈', 'The Big Cloud isn\'t grumpy anymore — now it\'s a friend ☁️🌈')}</p>
    ${res.pal ? `<p class="got">💗 ${L(`Ты и ${res.pal} — команда!`, `You and ${res.pal} — a team!`)}</p>` : ''}
    ${res.photo ? `<img class="co-photo" src="${res.photo}" alt=""><p class="got">📷 ${L('Фото — в альбоме', 'The photo is in the album')}</p>` : ''}
    ${!res.gift && !res.first ? `<p class="got">${L('Ракушки за бой на сегодня собраны — завтра будут новые 🌊', 'Today\'s shells for the fight are collected — more tomorrow 🌊')}</p>` : ''}
    <p class="earned display">${res.gift ? `+${res.gift} 🐚` : ''}</p>
    <p class="got co-wait" hidden></p>
    <div class="row"><button class="btn" data-k="home">${L('Домой 🏠', 'Home 🏠')}</button>${!net1 || net.host ? `<button class="btn ghost" data-k="again">${L('Ещё раз ↻', 'Again ↻')}</button>` : ''}</div>`);
  if(res.gift) setTimeout(() => addShells(res.gift, {x:innerWidth/2, y:innerHeight*0.4}), 900);
  if(save.pet && typeof petGive === 'function' && petSeal) setTimeout(() => { try{ petGive(5); }catch(e){} }, 1500);
  sfx.hug();
  const k = await new Promise(r => {
    panel.querySelectorAll('[data-k]').forEach(b => mgOn(b, 'click', () => { sfx.tap(); r(b.dataset.k); }));
    if(net1 && !net.host){
      const w = panel.querySelector('.co-wait'); w.hidden = false; w.textContent = L('Напарник решает: ещё раз или домой…', 'Your partner is deciding: again or home…');
      netOn('again', () => r('again'));
    }
    if(net1){ netOn('bye', () => { const w = panel.querySelector('.co-wait'); w.hidden = false; w.textContent = L('Напарник ушёл домой 👋', 'Your partner went home 👋'); const ag = panel.querySelector('[data-k="again"]'); if(ag) ag.remove(); }); }
  });
  if(net1){ if(k === 'again' && net.host) netSend({t:'again'}); if(k === 'home') netSend({t:'bye'}); }
  panel.classList.add('away'); await wait(0.25);
  return k === 'again';
}

/* ---------- вход: из «Поиграть» у малыша или с первого экрана ---------- */
FUN_COST.coop = {food:0.2, bath:0.2, sleep:0.2};
let coGull = false;   // последний раз летали чайкой в чужом забеге (js/gull.js), а не бились с Тучей
FUN_SAY.coop = () => coGull ? L('Хорошо полетали чайкой! 🐦', 'Great flying as the gull! 🐦')
  : coGame === 'rescue' ? L('Потеряшка нашла маму — мы молодцы! 💗', 'The lost pup found mum — well done us! 💗') : L('Вот это бой! Вместе мы — сила 💪', 'What a fight! Together we\'re strong 💪');
async function coopFromPet(s){
  if(typeof GL !== 'undefined' && GL && GL.home) gullRunEnd(true);   // чайка порхала над уголком — отпускаем: новая игра соединяется заново
  const pick = await coopMenu();
  if(!pick){ s.happyUntil = 0; return false; }
  const res = await coopPlay(pick);
  coGull = !!(res && res.gull);
  s.root.position.copy(PET_SPOT); s.happyUntil = now + 3; setMood(s, 'happy');
  if(!res) return false;
}
async function coopFromIntro(){
  ac(); sfx.good(); $('#intro').hidden = true;
  try{ await document.fonts.load('40px Pangolin'); }catch(e){}
  const pick = await coopMenu();
  if(pick) await coopPlay(pick);
  $('#intro').hidden = false;
}
