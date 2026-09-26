/* ---------------- «Дорога к Туче» (Спринт 3, задача 3½) ----------------
   Перед боем с Большой Тучей — забег вдвоём по широкой ледяной дороге (4 полосы). Туча улетает вперёд и
   кидает снежки: тень на льду показывает, куда упадёт, упавший снежок — маленький сугроб на одной полосе.
   Поперёк дороги — ледяные валики (прыгать обоим), сугробы на 1–2 полосах (объехать или перепрыгнуть),
   ракушки дорожками. 💗 Двойные ворота: пройдите их вместе, каждый в свою половинку — «Дай лапу!», вжух-ускорение.
   Врезался — смешной кувырок, ничего не теряешь. В конце догнали Тучу — и сразу бой (coopFight в coop.js).
   Управление как в забеге: провести пальцем влево-вправо — полоса, касание — прыжок; стрелки и пробел.
   Дорога общая: оба едут с одной скоростью, у каждого свой тюлень. По сети хозяин решает, куда летят снежки,
   и изредка присылает, где дорога (crz); каждый сам считает, во что врезался его тюлень.
   Напарник: папа по сети, Пинг (сам уворачивается и идёт в ворота рядом с тобой) или без напарника.
   Подключается после coop.js. */
const CR_POS = new V3(-800, 0, 0);
const CR_LEN = 170, CR_SPEED = 6, CR_BOOST = 1.45, CR_BT = 2.2;
const CR_LN = 1.05, CR_W = 4.9, CR_SC = 0.42;
const CR_G = 22, CR_VY = 8.2;
const CR_SNOW_T = 2.3;                  // как часто Туча кидает снежок
const crAt = (z, x = 0, y = 0) => new V3(CR_POS.x + x, 0.25 + y, CR_POS.z - z);
const crLx = i => (i - 1.5)*CR_LN;
const crRoot = new THREE.Group(); crRoot.visible = false; scene.add(crRoot);

/* ---------- мир: дорога на 4 полосы, вода, айсберги (строятся один раз) ---------- */
const CR_TEX = canvasTex(128, (g, w, h) => {
  g.fillStyle = '#C4E4F4'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#A9D4EC'; for(const x of [30, 61, 92]) g.fillRect(x, 0, 5, h);
  g.fillStyle = '#FFFFFF'; for(let i = 0; i < 7; i++) g.fillRect((i*41) % w, (i*53) % h, 10, 3);
});
CR_TEX.wrapS = CR_TEX.wrapT = THREE.RepeatWrapping;
let crBuilt = false, crWater = null;
function crBuild(){
  if(crBuilt) return; crBuilt = true;
  crWater = new THREE.Mesh(new THREE.PlaneGeometry(110, 140), toon(0x6FC0DF)); crWater.rotation.x = -Math.PI/2; crRoot.add(crWater);
  const len = CR_LEN + 40, g = new THREE.Group(); g.position.set(CR_POS.x, -0.05, CR_POS.z - len/2 + 14); crRoot.add(g);
  const m = toon(0xFFFFFF); m.map = CR_TEX; CR_TEX.repeat.set(1, len/3);
  g.add(new THREE.Mesh(new THREE.BoxGeometry(CR_W, 0.6, len), m));
  g.add(new THREE.Mesh(new THREE.BoxGeometry(CR_W + 0.1, 0.64, len + 0.1), outlineMat));
  for(const sd of [-1, 1]){
    const bank = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, len - 0.3, 10), toon(0xFFFFFF)); bank.rotation.x = Math.PI/2; bank.position.set(sd*(CR_W/2 - 0.08), 0.32, 0); g.add(bank);
    const ol = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, len - 0.26, 10), outlineMat); ol.rotation.x = Math.PI/2; ol.position.copy(bank.position); g.add(ol);
  }
  for(let z = 0; z < CR_LEN + 30; z += 20) for(const sd of [-1, 1]){
    const s = 1.6 + ((z*7 + sd*3) % 5)*0.4, x = sd*(9.5 + ((z*13) % 7));
    const b = addOutline(new THREE.Mesh(new THREE.ConeGeometry(s, s*1.4, 6), toon(0xF3FAFD)), 1.04); b.position.set(CR_POS.x + x, s*0.45, CR_POS.z - z - sd*6); crRoot.add(b);
  }
}
function crRidge(){   // ледяной валик во всю ширину: прыгают оба
  const g = new THREE.Group();
  const r = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, CR_W - 0.5, 14), toon(0xBFE6F7)), 1.08); r.rotation.z = Math.PI/2; r.position.y = 0.05; g.add(r);
  for(const x of [-1.6, -0.5, 0.6, 1.7]){ const k = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 6), toon(0xE6F6FD)), 1.12); k.position.set(x, 0.38, 0); g.add(k); }
  return g;
}
function crGate(){   // двойные ворота-сердечки на две соседние полосы
  const g = new THREE.Group(), mat = toon(0xFF9BB8);
  for(const sd of [-1, 0, 1]){ const p = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.9, 8), toon(0xE0A36B)), 1.15); p.position.set(sd*CR_LN, 0.95, 0); g.add(p); }
  const bar = addOutline(new THREE.Mesh(new THREE.BoxGeometry(CR_LN*2 + 0.2, 0.14, 0.14), mat), 1.08); bar.position.y = 1.9; g.add(bar);
  const h = new THREE.Sprite(new THREE.SpriteMaterial({map:TEX.heart, transparent:true, depthWrite:false})); h.scale.setScalar(0.62); h.position.y = 2.35; g.add(h);
  g.userData.h = h;
  return g;
}

/* ---------- трасса дня: из seed (по сети — одинаковая у обоих) ---------- */
function crLayout(seed){
  const r = rsRand(seed), L0 = {drifts:[], ridges:[], gates:[], shells:[]};
  const ln = () => Math.floor(r()*4);
  const line = (z, l, n = 5) => { for(let i = 0; i < n; i++) L0.shells.push({z:z + i*1.3, ln:l}); };
  // начало — по одной штуке, чтобы понять, что к чему
  line(12, 1); line(12, 2);
  L0.drifts.push({z:24, ln:0}, {z:24, ln:3});
  L0.gates.push({z:34, a:1});
  L0.ridges.push({z:44});
  let z = 54, last = '';
  while(z < CR_LEN - 16){
    const k = r();
    if(k < 0.3 && last !== 'drift'){
      const a = ln(), b = r() < 0.5 ? null : (a + 1 + Math.floor(r()*3)) % 4;
      L0.drifts.push({z, ln:a}); if(b !== null) L0.drifts.push({z, ln:b});
      last = 'drift';
    } else if(k < 0.5 && last !== 'ridge'){ L0.ridges.push({z}); last = 'ridge'; }
    else if(k < 0.72 && last !== 'gate'){ L0.gates.push({z, a:Math.floor(r()*3)}); last = 'gate'; }
    else { line(z - 2, ln()); last = 'shells'; }
    if(last !== 'shells' && r() < 0.6) line(z + 2.5, ln(), 3);
    z += 7 + r()*3;
  }
  return L0;
}

/* ---------- состояние ---------- */
let CR = null;
function crSeal(m, name, kind, ln){
  crRoot.add(m.root); m.root.scale.setScalar(CR_SC);
  return {m, name, kind, ln, x:crLx(ln), y:0, vy:0, air:false, tumble:0, nx:crLx(ln), ny:0, nt:false, aiT:0, lost:false, gone:false, puffT:0};
}
const crPals = () => [CR.me, CR.pal].filter(p => p && !p.gone);
function crJump(p){ if(!p.air && p.tumble <= 0 && CR.st === 'go'){ p.air = true; p.vy = CR_VY; if(p === CR.me) sfx.whoosh(); } }
function crLane(p, d){
  const n = p.ln + d;
  if(n < 0 || n > 3){ if(p === CR.me){ sfx.tick(); p.bump = 0.2; } return; }
  p.ln = n; if(p === CR.me) sfx.tap();
}
function crBonk(p, what){
  if(p.tumble > 0) return;
  p.tumble = 0.7; CR.bonks++;
  sfx.plop(); if(p === CR.me) sfx.arf();
  floatText(p.kind === 'ping' ? L('Кря!', 'Quack!') : L(['Ой!', 'Бух!', 'Упс!'], ['Oops!', 'Bonk!', 'Whoops!'])[Math.floor(Math.random()*3)], crAt(CR.z, p.x, p.y + 1.1));
  if(what && what.o){ burst(TEX.puff, what.o.position.clone().add(new V3(0, 0.3, 0)), 8, 1.4, 0.45); }
  if(CR.cloud && Math.random() < 0.6) floatText(L('Ха-ха!', 'Ha-ha!'), CR.cloud.position.clone().add(new V3(0, 1.2, 0)), '#6B6A7E');
  if(p === CR.me && !CR.saidOops){ CR.saidOops = true; crSay(L('Ничего! Бежим дальше 🐾', 'No problem! Keep going 🐾'), 1800); }
}
function crSay(t, ms){ mgHint(t); setTimeout(() => { if(CR && mgHintEl.textContent === t) mgHint(''); }, ms); }
function crBoost(two){
  CR.boost = two ? CR_BT : CR_BT*0.6; sfx.boost();
  for(const p of crPals()) floatText(two ? L('Дай лапу! 💗', 'Paws together! 💗') : L('Вжух!', 'Whoosh!'), crAt(CR.z, p.x, 1.6), '#D9527E');
  if(two){ CR.paws++; burst(TEX.heart, crAt(CR.z, (CR.me.x + CR.pal.x)/2, 1.1), 12, 2, 0.3); sfx.hug(); }
  crHud();
}
function crGatePass(g, who){
  g.who.add(who);
  const two = crPals().length > 1;
  if(!two){ if(!g.used){ g.used = true; crBoost(false); } return; }
  if(!g.used && g.who.has('me') && g.who.has('pal')){ g.used = true; crBoost(true); }
}

/* ---------- Туча: улетает вперёд и кидает снежки ---------- */
function crSnow(tz, ln){
  const o = addOutline(new THREE.Mesh(SMALL, toon(0xFFFFFF)), 1.1); o.scale.setScalar(0.32);
  const from = CR.cloud.position.clone().add(new V3(0, -0.6, 0.6)), to = crAt(tz, crLx(ln), 0.1);
  o.position.copy(from); CR.grp.add(o);
  const sh = new THREE.Mesh(SHADOW_GEO, new THREE.MeshBasicMaterial({color:0x3E6F9E, transparent:true, opacity:0.35, depthWrite:false}));
  sh.rotation.x = -Math.PI/2; sh.position.copy(crAt(tz, crLx(ln), 0.03)); sh.scale.setScalar(0.3); CR.grp.add(sh);
  CR.snow.push({o, sh, from, to, tz, ln, t:0, T:1.05});
  sfx.whoosh();
}
function crThrow(){
  const tgt = crPals()[Math.floor(Math.random()*crPals().length)], ln = Math.random() < 0.75 ? tgt.ln : Math.floor(Math.random()*4);
  let tz = CR.z + 10;
  const busy = z => CR.L.ridges.some(d => Math.abs(d.z - z) < 3) || CR.L.gates.some(g => Math.abs(g.z - z) < 3) || CR.L.drifts.some(d => Math.abs(d.z - z) < 2.5 && d.ln === ln);
  for(let i = 0; i < 4 && busy(tz); i++) tz += 2;
  if(busy(tz) || tz > CR_LEN - 8) return;
  crSnow(tz, ln);
  if(CR.mode === 'net') netSend({t:'crs', tz:+tz.toFixed(2), ln});
}
function crSnowStep(dt){
  CR.snow = CR.snow.filter(sb => {
    sb.t += dt; const k = Math.min(1, sb.t/sb.T);
    sb.o.position.lerpVectors(sb.from, sb.to, k); sb.o.position.y += Math.sin(k*Math.PI)*1.6;
    sb.sh.scale.setScalar(0.3 + k*0.7);
    if(k < 1) return true;
    CR.grp.remove(sb.o); CR.grp.remove(sb.sh); sfx.plop(); burst(TEX.puff, sb.to.clone().add(new V3(0, 0.3, 0)), 8, 1.3, 0.4);
    const d = makeDrift(); d.position.copy(crAt(sb.tz, crLx(sb.ln))); CR.grp.add(d);
    tween(0.25, k => d.scale.set(0.5*k, 0.72*k, 0.75*k), ease.out);
    CR.L.drifts.push({z:sb.tz, ln:sb.ln, o:d, hit:new Set()});
    return false;
  });
}

/* ---------- Пинг: уворачивается, прыгает, идёт в ворота рядом с тобой ---------- */
function crAI(p, dt){
  if(p.tumble > 0) return;
  const z = CR.z, me = CR.me;
  // прыжок: валик или сугроб на своей полосе совсем рядом
  const need = CR.L.ridges.some(r => r.z - z > 1.1 && r.z - z < 2.1) || CR.L.drifts.some(d => d.ln === p.ln && d.z - z > 1.1 && d.z - z < 2.0 && !d.hit.has('pal'));
  if(need && !p.air && Math.random() < 0.93) crJump(p);
  if((p.aiT -= dt) > 0) return;
  p.aiT = 0.28 + Math.random()*0.12;
  const score = l => {
    let s = 0;
    for(const d of CR.L.drifts) if(d.ln === l && d.z - z > 0.5 && d.z - z < 7) s -= 10;
    for(const sb of CR.snow) if(sb.ln === l && sb.tz - z < 8) s -= 8;
    const g = CR.L.gates.find(g => !g.used && g.z - z > 1 && g.z - z < 14);
    if(g && (l === g.a || l === g.a + 1)){ s += 4; if(me.ln === g.a || me.ln === g.a + 1) s += me.ln === l ? -6 : 5; }
    if(Math.abs(l - me.ln) === 1) s += 2; if(l === me.ln) s -= 3;
    for(const sh of CR.L.shells) if(!sh.got && sh.ln === l && sh.z - z > 0 && sh.z - z < 6) s += 0.6;
    return s - Math.abs(l - p.ln)*0.8;
  };
  let best = p.ln, bs = -1e9;
  for(let l = 0; l < 4; l++){ const s = score(l); if(s > bs){ bs = s; best = l; } }
  if(best !== p.ln) crLane(p, Math.sign(best - p.ln));
}

/* ---------- кадр ---------- */
function crStep(dt){
  if(!CR) return;
  const go = CR.st === 'go';
  if(go || CR.st === 'end'){
    if(CR.boost > 0) CR.boost -= dt;
    const want = CR.st === 'end' ? 0 : CR_SPEED*(CR.boost > 0 ? CR_BOOST : 1);
    CR.sp += (want - CR.sp)*Math.min(1, dt*(CR.st === 'end' ? 1.8 : CR.boost > 0 ? 4 : 1.4));
    const z0 = CR.z; CR.z += CR.sp*dt;
    if(go){
      // свои тюлени: полосы, прыжки, столкновения
      for(const p of [CR.me, CR.pal]){
        if(!p || p.gone || p.kind === 'net') continue;
        if(p.kind === 'ping') crAI(p, dt);
        crBody(p, dt, z0);
      }
      // ракушки: берёт любой свой тюлень
      for(let i = 0; i < CR.L.shells.length; i++){
        const sh = CR.L.shells[i]; if(sh.got) continue;
        for(const p of [CR.me, CR.pal]){
          if(!p || p.gone || p.kind === 'net' || sh.z < z0 - 0.7 || sh.z > CR.z + 0.7 || Math.abs(crLx(sh.ln) - p.x) > 0.6 || p.y > 1.1) continue;
          crShell(i); if(CR.mode === 'net') netSend({t:'crk', i}); break;
        }
      }
      // Туча кидает снежки (решает хозяин комнаты)
      if(CR.host && (CR.snowT -= dt) <= 0 && CR.z > 30){ CR.snowT = CR_SNOW_T*(0.85 + Math.random()*0.3); crThrow(); }
      if(CR.z >= CR_LEN) crFinish();
    }
  }
  crSnowStep(dt);
  // напарник по сети — плавно к тому, что прислал
  const pal = CR.pal;
  if(pal && pal.kind === 'net' && !pal.gone){ pal.x += (pal.nx - pal.x)*Math.min(1, dt*12); pal.y += (pal.ny - pal.y)*Math.min(1, dt*14); pal.tumble = pal.nt ? Math.max(pal.tumble, 0.05) : Math.max(0, pal.tumble - dt); }
  if(CR.mode === 'net'){
    if((CR.sendT -= dt) <= 0){ CR.sendT = 0.08; netSend({t:'crp', x:+CR.me.x.toFixed(2), y:+CR.me.y.toFixed(2), tb:CR.me.tumble > 0}); }
    if(CR.host && (CR.zT -= dt) <= 0){ CR.zT = 0.5; netSend({t:'crz', z:+CR.z.toFixed(2), b:+Math.max(0, CR.boost).toFixed(2)}); }
  }
  // Туча впереди
  const c = CR.cloud;
  if(CR.st !== 'end') CR.cx = Math.sin(now*0.6)*1.3; else CR.cx *= Math.max(0, 1 - dt*2);
  c.position.copy(crAt(CR.z + (CR.st === 'end' ? CR.endGap : 19), CR.cx, (CR.st === 'end' ? 2.6 : 4.4) + Math.sin(now*1.7)*0.2));
  c.rotation.y = Math.PI*0 + Math.sin(now*0.8)*0.15;
  // тюлени на экране
  for(const p of [CR.me, CR.pal]) if(p) crDraw(p, dt);
  for(const g of CR.L.gates) if(g.o) g.o.userData.h.position.y = 2.35 + Math.sin(now*3 + g.z)*0.08;
  for(const sh of CR.L.shells) if(sh.o && !sh.got) sh.o.rotation.y += dt*3;
  // вода и камера едут следом; на узком экране — дальше, чтобы видеть все 4 полосы
  crWater.position.set(CR_POS.x, -0.05, CR_POS.z - CR.z - 30);
  const far = Math.max(1, Math.min(1.5, 0.62/camera.aspect)), zoom = Math.max(0, CR.sp/CR_SPEED - 1)*1.5;
  runCam.pos.copy(crAt(CR.z - 9.6*far - zoom, 0.25, 4.6*far**1.7 - 0.25));
  runCam.look.copy(crAt(CR.z + 6 + (far - 1)*6, 0, 0.6));
  if(CR.st === 'end'){   // догнали: камера опускается — видно обоих и Тучу
    CR.endK = Math.min(1, CR.endK + dt*0.7); const k = ease.io(CR.endK);
    runCam.pos.lerp(crAt(CR.z - 8.5, 0.4, 3.0), k); runCam.look.lerp(crAt(CR.z + CR.endGap*0.5, 0, 1.5), k);
  }
  crHud();
}
function crBody(p, dt, z0){
  const wx = crLx(p.ln); p.x += (wx - p.x)*Math.min(1, dt*11);
  if(p.bump > 0) p.bump -= dt;
  if(p.tumble > 0) p.tumble = Math.max(0, p.tumble - dt);
  if(p.air){
    p.y += p.vy*dt - CR_G*dt*dt/2; p.vy -= CR_G*dt;
    if(p.y <= 0 && p.vy < 0){ p.y = 0; p.air = false; if(p === CR.me) sfx.plop(); burst(TEX.puff, crAt(CR.z, p.x, 0.1), 4, 0.8, 0.3); }
  }
  const who = p === CR.me ? 'me' : 'pal', near = z => z > z0 - 0.5 && z < CR.z + 0.5;
  for(const r of CR.L.ridges) if(!r.hit.has(who) && near(r.z) && p.y < 0.42){ r.hit.add(who); crBonk(p, r); }
  for(const d of CR.L.drifts) if(!d.hit.has(who) && near(d.z) && p.y < 0.5 && Math.abs(crLx(d.ln) - p.x) < 0.7){ d.hit.add(who); crBonk(p, d); }
  for(const g of CR.L.gates) if(!g.who.has(who) && near(g.z) && p.x > crLx(g.a) - 0.55 && p.x < crLx(g.a + 1) + 0.55){
    crGatePass(g, who);
    if(CR.mode === 'net') netSend({t:'crgt', i:CR.L.gates.indexOf(g)});
  }
}
function crShell(i){
  const sh = CR.L.shells[i]; if(!sh || sh.got) return;
  sh.got = true; CR.shells++; CR.grp.remove(sh.o); sfx.coin();
  emit(TEX.star, sh.o.position, {v:new V3(0, 1, 0), life:0.45, size:0.22, spin:4});
}
function crDraw(p, dt){
  const s = p.m;
  s.root.visible = !p.gone && !(p.lost && Math.floor(now*2) % 2);
  s.root.position.copy(crAt(CR.z, p.x, p.y));
  const lean = (crLx(p.ln) - p.x)*0.35;
  s.root.rotation.set(0, Math.PI, p.kind === 'net' ? 0 : lean + (p.bump > 0 ? Math.sin(p.bump*40)*0.08 : 0));
  s.inner.rotation.x = p.tumble > 0 ? -(1 - p.tumble/0.7)*Math.PI*2 : p.air ? -0.2 : 0;
  s.inner.position.y = p.tumble > 0 ? Math.sin((1 - p.tumble/0.7)*Math.PI)*0.5 : 0;
  s.flap = p.air ? 0.8 : CR.boost > 0 ? 0.6 : 0.15;
  s.wobble = p.air ? 0 : Math.sin(now*9 + p.x)*0.03;
  p.puffT -= dt;
  if(p.puffT < 0 && !p.air && CR.sp > 1 && !p.gone){ p.puffT = CR.boost > 0 ? 0.05 : 0.1; emit(TEX.puff, crAt(CR.z - 0.1, p.x + (Math.random() - 0.5)*0.4, 0.1), {v:new V3(0, 0.4, 1.4 + (CR.boost > 0 ? 3 : 0)), life:0.45, size:0.28, grow:1}); }
  updateSeal(s, now, dt);
}
function crHud(){
  const h = CR && CR.hud; if(!h) return;
  h.querySelector('.sh').textContent = CR.shells;
  h.querySelector('.pw').textContent = CR.paws;
  h.querySelector('.bar i').style.width = Math.max(0, Math.min(1, CR.z/CR_LEN))*100 + '%';
}
async function crFinish(){
  if(CR.st !== 'go') return;
  CR.st = 'end'; CR.endGap = 19; CR.endK = 0; CR.boost = 0;
  for(const sb of CR.snow){ CR.grp.remove(sb.o); CR.grp.remove(sb.sh); } CR.snow = [];
  if(CR.mode === 'net' && CR.host) netSend({t:'crf'});
  sfx.good();
  tween(1.4, k => { CR.endGap = 19 - k*10; }, ease.out);
  for(const p of crPals()){ p.ln = Math.min(3, Math.max(0, p.ln)); floatText('💪', crAt(CR.z, p.x, 1.3)); }
  mgHint(L('Догнали! ☁️', 'Caught up! ☁️'));
  await wait(1.5); if(!CR) return;
  sfx.grr(); mgHint(L('«Ах, догнали?! Ну держитесь — сейчас засыплю!» ☁️', '“Oh, you caught me?! Hold on — here comes the snow!” ☁️'));
  const c = CR.cloud;
  await tween(1.2, k => { c.rotation.z = Math.sin(k*Math.PI*8)*0.1*(1 - k); c.scale.setScalar(0.9 + k*0.5); }, ease.lin);
  await wait(1); if(!CR) return;
  CR.end = 'win';
}

/* ---------- сеть ---------- */
function crNetWire(){
  netOn('crp', m => { const p = CR && CR.pal; if(!p || p.kind !== 'net') return; p.nx = m.x; p.ny = m.y; p.nt = !!m.tb; });
  netOn('crz', m => { if(!CR || CR.host) return; const d = m.z - CR.z; if(Math.abs(d) > 4) CR.z = m.z; else CR.z += d*0.5; if(m.b > 0 && CR.boost <= 0) CR.boost = m.b; });
  netOn('crs', m => { if(CR && !CR.host && CR.st === 'go') crSnow(m.tz, m.ln); });
  netOn('crk', m => { if(CR) crShell(m.i); });
  netOn('crgt', m => { const g = CR && CR.L.gates[m.i]; if(g) crGatePass(g, 'pal'); });
  netOn('crf', () => { if(CR) crFinish(); });
  netOn('emo', () => { if(CR && CR.pal){ burst(TEX.heart, crAt(CR.z, CR.pal.x, 1.2), 8, 1.6, 0.3); sfx.purr(); } });
  netOn('bye', () => { if(!CR || !CR.pal) return; CR.pal.gone = true; toast(L('Напарник уплыл домой 👋', 'Your partner went home 👋')); if(CR.onBye) CR.onBye(); });
  net.onLost = () => { if(CR && CR.pal){ CR.pal.lost = true; mgHint(L('Связь пропала… бежим дальше 🌊', 'Lost the connection… keep going 🌊')); } };
  net.onBack = () => { if(CR && CR.pal){ CR.pal.lost = false; mgHint(''); toast(L('Снова вместе! 💗', 'Together again! 💗')); } };
}

/* ---------- управление: как в забеге ---------- */
function crControls(){
  let g = null;
  const ok = () => CR && CR.st === 'go';
  mgOn(mgRoot, 'pointerdown', e => { if(e.target.closest('button')) return; e.preventDefault(); g = ok() ? {id:e.pointerId, x:e.clientX, y:e.clientY, used:false} : null; });
  mgOn(mgRoot, 'pointermove', e => {
    if(!g || g.used || e.pointerId !== g.id || !ok()) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if(Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)){ g.used = true; crLane(CR.me, Math.sign(dx)); }
    else if(dy < -34 && -dy > Math.abs(dx)){ g.used = true; crJump(CR.me); }
  });
  mgOn(mgRoot, 'pointerup', e => { if(!g || e.pointerId !== g.id) return; const t = g; g = null; if(!t.used && ok()) crJump(CR.me); });
  mgOn(mgRoot, 'pointercancel', () => g = null);
  mgOn(window, 'keydown', e => {
    if(!ok() || e.repeat) return;
    if(e.key === 'ArrowLeft'){ e.preventDefault(); crLane(CR.me, -1); }
    else if(e.key === 'ArrowRight'){ e.preventDefault(); crLane(CR.me, 1); }
    else if(e.key === 'ArrowUp' || e.key === ' '){ e.preventDefault(); crJump(CR.me); }
  });
}

/* ---------- сама дорога: возвращает {shells, paws} или null (ушли домой) ---------- */
async function cloudRoad(mode, pal0){
  crBuild();
  sfx.whoosh(); flash();
  const fog = scene.fog; scene.fog = null;
  crRoot.visible = true; runCam.on = true; HEMI.intensity = 0.62; sun.intensity = 0.58;
  document.body.classList.add('run-on');
  const homeB = document.createElement('button'); homeB.id = 'btnRunHome'; homeB.className = 'round home';
  homeB.innerHTML = '<span aria-hidden="true">🏠</span>'; homeB.setAttribute('aria-label', L('Домой', 'Home')); $('#btnSound').after(homeB);
  let done; const fin = new Promise(r => done = r);
  homeB.addEventListener('click', () => { sfx.tap(); done('quit'); });
  const host = mode !== 'net' || net.host;
  CR = {mode, host, st:'ready', z:0, sp:0, boost:0, shells:0, paws:0, bonks:0, snow:[], snowT:2, sendT:0, zT:0, cx:0, endGap:15, endK:0,
    grp:new THREE.Group(), L:null, me:null, pal:null, cloud:null, hud:null, end:null, onBye:null};
  crRoot.add(CR.grp);
  // старт по сети: хозяин придумывает трассу и шлёт seed, гость ждёт
  let seed = Math.floor(Math.random()*1e9);
  if(mode === 'net'){
    crNetWire();
    if(net.host){ await Promise.race([new Promise(r => netOn('crready', r)), wait(8), fin]); netSend({t:'crgo', seed}); }
    else {
      const g = new Promise(r => netOn('crgo', m => r(m))), iv = setInterval(() => netSend({t:'crready'}), 400);
      netSend({t:'crready'}); const m = await Promise.race([g, fin]); clearInterval(iv);
      if(m && m.seed != null) seed = m.seed;
    }
  }
  CR.L = crLayout(seed);
  for(const d of CR.L.drifts){ d.hit = new Set(); d.o = makeDrift(); d.o.scale.set(0.5, 0.72, 0.75); d.o.position.copy(crAt(d.z, crLx(d.ln))); CR.grp.add(d.o); }
  for(const r of CR.L.ridges){ r.hit = new Set(); r.o = crRidge(); r.o.position.copy(crAt(r.z, 0, 0.1)); CR.grp.add(r.o); }
  for(const g of CR.L.gates){ g.who = new Set(); g.o = crGate(); g.o.position.copy(crAt(g.z, (crLx(g.a) + crLx(g.a + 1))/2)); CR.grp.add(g.o); }
  for(const sh of CR.L.shells){ sh.o = makeShell(0xFFC2D1); sh.o.scale.multiplyScalar(0.8); sh.o.rotation.x = 0.9; sh.o.position.copy(crAt(sh.z, crLx(sh.ln), 0.35)); CR.grp.add(sh.o); }
  const fl = makeFinish(); fl.scale.set(CR_W/RUN_W, 1, 1); fl.position.copy(crAt(CR_LEN)); CR.grp.add(fl);
  // тюлени: хозяин слева, гость справа
  const meLn = host ? 1 : 2, palLn = host ? 2 : 1;
  CR.me = crSeal(coSealOf(coPetDesc()), save.pet ? save.pet.name : L('Ты', 'You'), 'me', meLn);
  if(mode === 'ping'){ const m = makePenguin(PENG); CR.pal = crSeal(m, L('Пинг', 'Ping'), 'ping', palLn); m.root.scale.setScalar(CR_SC*0.95); }
  if(mode === 'net') CR.pal = crSeal(coSealOf(pal0), (pal0 && pal0.name) || L('Папа', 'Dad'), 'net', palLn);
  const c = makeCloud(); cloudKind(c, false); c.scale.setScalar(0.8); CR.grp.add(c); CR.cloud = c;
  CR.onBye = null;
  mgOpen('', {hintBottom:true});
  CR.hud = mgNode('div', 'run-hud', `<span class="pill">🐚 <b class="sh">0</b></span><span class="pill">💗 <b class="pw">0</b></span><span class="bar"><i></i><span class="flag" aria-hidden="true">☁️</span></span>`);
  const btns = mgNode('div', 'co-btns', `${mode !== 'solo' ? `<button class="round co-heart" aria-label="${L('Сердечко напарнику', 'A heart for your partner')}">💗</button>` : ''}`);
  const hb = btns.querySelector('.co-heart');
  if(hb) mgOn(hb, 'pointerdown', e => {
    e.stopPropagation(); burst(TEX.heart, crAt(CR.z, CR.me.x, 1.2), 8, 1.6, 0.3); sfx.purr();
    if(mode === 'net') netSend({t:'emo'});
    else if(CR.pal) setTimeout(() => { if(CR && CR.pal){ burst(TEX.heart, crAt(CR.z, CR.pal.x, 1.2), 8, 1.6, 0.3); floatText(L('Кря! 💙', 'Quack! 💙'), crAt(CR.z, CR.pal.x, 1.6)); } }, 700);
  });
  crControls(); crHud();
  mgTick(dt => { crStep(dt); if(CR && CR.end) done(CR.end); });
  mgHint(L('Большая Туча улетает! Догоните её по ледяной дороге ☁️', 'The Big Cloud is flying away! Chase it down the ice road ☁️')); sfx.grr();
  const tick = t => Promise.race([wait(t), fin]);
  await tick(2.6);
  if(!save.coop.road){
    mgHint(L('Проведи пальцем ⬅️ ➡️ — полоса, коснись — прыжок', 'Swipe ⬅️ ➡️ to change lane, tap to jump')); await tick(2.4);
    if(mode !== 'solo'){ mgHint(L('💗 Двойные ворота — проходите вместе, рядышком: вжух!', '💗 Double gates — go through side by side: whoosh!')); await tick(2.6); }
  }
  for(const n of ['3', '2', '1']){ mgHint(n); sfx.tick(); await tick(0.5); }
  let how = null;
  if(!CR.end){ CR.st = 'go'; mgHint(L('Бежим! 🐾', 'Run! 🐾')); sfx.arf(); setTimeout(() => { if(CR && mgHintEl.textContent.includes('🐾')) mgHint(''); }, 1100); }
  how = await fin;
  const res = how === 'win' ? {shells:CR.shells, paws:CR.paws, pal:CR.pal && CR.pal.gone} : null;
  if(how === 'quit' && mode === 'net') netSend({t:'bye'});
  if(res){ save.coop.road = (save.coop.road || 0) + 1; persist(); }
  mgHint(''); mgClose();
  crRoot.remove(CR.grp);
  for(const p of [CR.me, CR.pal]) if(p) crRoot.remove(p.m.root);
  CR = null;
  homeB.remove(); document.body.classList.remove('run-on');
  crRoot.visible = false; runCam.on = false; homeLights(false); scene.fog = fog;
  return res;
}
// дорога → бой. Ракушки с дороги — вместе с наградой за бой (в те же первые две победы за день)
async function roadGame(mode, pal0 = null){
  const r = await cloudRoad(mode, pal0);
  if(!r){ if(mode === 'net') netClose(); return null; }
  if(r.pal && mode === 'net'){ netClose(); mode = 'solo'; }   // напарник ушёл по дороге — бой без него
  if(r.shells && coWinsToday() < CO_DAILY) coRoadShells = Math.min(30, r.shells);
  return coopFight(mode, pal0);
}
