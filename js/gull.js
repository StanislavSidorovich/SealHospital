/* ---------------- Чайка-помощник (Фаза 13, Спринт 3, задача 2) ----------------
   Сабрина бежит свой забег, а папа (или друг) подключается по сети и летает над ней чайкой — второй игрок-помощник,
   как в Mario Galaxy и Kirby. Чайка ничего не может испортить, только помогает. Касание у чайки:
     • по льду впереди — роняет ракушку (GULL_SHELLS за забег);
     • по пузырю с рыбкой — у Сабрины пузырь мигает, чайка кричит «Тут рыбка!»;
     • по золотой секретной ракушке (чайке она светится издалека) — у Сабрины искры и подсказка, как достать;
     • по трещине — бросает спасательный круг 🛟: малыш отскакивает от него вместо «Плюх!»;
     • по снежку Тучки или сугробу из снежка — клюёт, снег рассыпается (первые разы — ракушкой);
     • по Тучке — щекочет её клювом.
   💗 — сердечко, 🎤 — голос (как в бою с Тучей).
   Сеть: бегущий — главный. Он рассылает, что случилось на дорожке (gEv в adventure.js): 'rs' — где малыш (10 раз в секунду),
   'rp' — взял ракушку, 'rb' — спас рыбку, 'rc' — врезался, 'rsb'/'rsl' — снежок кинут / упал, 'rdr' — ракушки рассыпались,
   'rgo' — старт, 'rres' — итоги, 'bye' — ушёл домой. Чайка строит у себя тот же трек дня (runBuild с днём бегущего)
   и только просит: 'gc' — команда, 'gp' — где летит. Номера ракушек и сугробов совпадают, потому что новые появляются
   только по событиям бегущего.
   Вход: бегущий — «🐦 Позвать чайку-помощника» на карте приключений; чайка — «Вместе» → «По сети» (coopFight видит want:'run').
   Подключается после coop.js и до game.js. */
const GULL_SHELLS = 5;                     // ракушек чайка может уронить за забег
const GULL_PECK_GIFT = 3;                  // столько клевков по снегу дают ракушку
const GULL_CD = 0.6;                       // пауза между командами чайки, с
const GULL_IDLE = {x:1.5, y:2.5, z:3.2};   // где чайка висит без дела: справа, выше и впереди малыша
const GULL_GIFT = 5, GULL_DAILY = 2;       // чайке — ракушки за первые два чужих забега в день
const gTrack = w => new V3(w.x - RUN_POS.x, w.y - 0.25, RUN_POS.z - w.z);   // точка мира → дорожка (x, высота, z от старта)
const gWorld = t => runAt(t.z, t.x, t.y);

/* ---------- чайка: белая, серые крылья, жёлтый клюв, папина кепка ---------- */
function makeGull(){
  const g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);
  const white = toon(0xFFFFFF), grey = toon(0xB9C6D6);
  const body = addOutline(new THREE.Mesh(SMALL, white), 1.07); body.scale.set(0.34, 0.3, 0.44); inner.add(body);
  const tail = addOutline(new THREE.Mesh(SMALL, grey), 1.1); tail.scale.set(0.15, 0.05, 0.17); tail.position.set(0, 0.06, -0.42); inner.add(tail);
  const head = new THREE.Group(); head.position.set(0, 0.3, 0.24); inner.add(head);
  head.add(addOutline(new THREE.Mesh(SMALL, white), 1.07)); head.children[0].scale.setScalar(0.25);
  for(const sd of [-1, 1]){
    const e = new THREE.Mesh(SMALL, inkMat); e.scale.set(0.035, 0.045, 0.02); e.position.set(sd*0.1, 0.04, 0.225); head.add(e);
    const hl = new THREE.Mesh(SMALL, new THREE.MeshBasicMaterial({color:0xffffff})); hl.scale.setScalar(0.012); hl.position.set(sd*0.1 + 0.012, 0.058, 0.24); head.add(hl);
    const bl = new THREE.Mesh(new THREE.CircleGeometry(0.045, 14), new THREE.MeshBasicMaterial({color:0xFF9BB8, transparent:true, opacity:0.8})); bl.position.set(sd*0.16, -0.035, 0.2); bl.rotation.y = sd*0.5; head.add(bl);
  }
  const beak = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.2, 10), toon(0xFFC94D)), 1.12); beak.rotation.x = Math.PI/2; beak.position.set(0, -0.04, 0.3); head.add(beak);
  // кепка: голубая шапочка с козырьком
  const cap = addOutline(new THREE.Mesh(new THREE.SphereGeometry(0.26, 18, 8, 0, Math.PI*2, 0, Math.PI/2), toon(0x7FB3E6)), 1.06); cap.position.y = 0.05; head.add(cap);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 18), toon(0x5E97CF)); brim.scale.z = 0.7; brim.position.set(0, 0.07, 0.22); head.add(brim);
  const wings = [];
  for(const sd of [-1, 1]){
    const pv = new THREE.Group(); pv.position.set(sd*0.24, 0.1, 0); inner.add(pv);
    const w = addOutline(new THREE.Mesh(SMALL, grey), 1.08); w.scale.set(0.36, 0.05, 0.19); w.position.x = sd*0.3; pv.add(w);
    wings.push({pv, sd});
  }
  for(const sd of [-1, 1]){ const f = new THREE.Mesh(SMALL, toon(0xFF9F5A)); f.scale.set(0.05, 0.03, 0.07); f.position.set(sd*0.1, -0.29, 0.04); inner.add(f); }
  g.userData = {inner, wings};
  g.scale.setScalar(0.95);
  return g;
}
function gullAnim(g, t, fast){
  const u = g.userData;
  u.wings.forEach(w => w.pv.rotation.z = w.sd*(0.25 + Math.sin(t*(fast ? 20 : 12))*0.65));
  u.inner.position.y = Math.sin(t*3)*0.08;
  u.inner.rotation.x = 0.18;
}
// спасательный круг: белый с розово-красными полосками, лежит на воде в трещине
function makeBuoy(){
  const g = new THREE.Group(), ring = new THREE.TorusGeometry(0.42, 0.14, 10, 28);
  g.add(addOutline(new THREE.Mesh(ring, toon(0xFFFFFF)), 1.08));
  const red = toon(0xFF6F86);
  for(let i = 0; i < 4; i++){ const a = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.146, 10, 8, Math.PI/4), red); a.rotation.z = i*Math.PI/2; g.add(a); }
  g.rotation.x = -Math.PI/2;
  return g;
}
function gullBuoy(c, from){   // чайка бросает круг в трещину (у обоих)
  const b = makeBuoy(), to = runAt((c.z0 + c.z1)/2, 0, -0.22); c.buoy = b; c.buoyY = to.y;
  b.position.copy(from); R.grp.add(b);
  tween(0.55, k => { b.position.lerpVectors(from, to, k); b.position.y += Math.sin(k*Math.PI)*0.8; b.rotation.z = k*4; }, ease.lin)
    .then(() => { b.landed = true; sfx.plop(); burst(TEX.puff, to.clone().add(new V3(0, 0.2, 0)), 6, 1, 0.35); });
  floatText(L('Круг!', 'Life ring!'), to.clone().add(new V3(0, 1, 0)), '#D9527E');
}
// малыш падает в трещину, где лежит круг: отскакивает и летит дальше (вызывает runSplash в adventure.js)
function runBuoy(c){
  R.air = true; R.vy = RUN_VY*0.95; R.y = Math.max(0, R.y); R.sp = Math.max(R.sp, RUN_SPEED*0.8);
  sfx.boing(); floatText(L('Держу!', 'Got you!'), headTop(petSeal), '#D9527E');
  const b = c.buoy; tween(0.3, k => b.scale.setScalar(1 + Math.sin(k*Math.PI)*0.3), ease.lin);
  gEv('rfx', {k:'buoy', i:R.cracks.indexOf(c)});
}
function gullBuoyBob(r){
  for(const c of r.cracks) if(c.buoy && c.buoy.landed){ c.buoy.position.y = c.buoyY + Math.sin(now*3 + c.z0)*0.05; c.buoy.rotation.z += 0.004; }
}
function gullPuff(p){ sfx.pop(); burst(TEX.puff, p, 8, 1.4, 0.4); emit(TEX.star, p, {v:new V3(0, 1, 0), life:0.5, size:0.25, spin:4}); }
function gullMic(btn){
  mgOn(btn, 'pointerdown', e => e.stopPropagation());
  mgOn(btn, 'click', async e => {
    e.stopPropagation(); sfx.tap();
    if(net.mic){ netMicOff(false); btn.classList.remove('on'); btn.textContent = '🎤'; return; }
    const ok = await netMicOn();
    if(ok){ btn.classList.add('on'); btn.textContent = '🎙️'; toast(L('Микрофон включён — вас слышно 🎙️', 'Microphone on — you can be heard 🎙️')); }
    else toast(L('Микрофон не разрешён. Можно созвониться по телефону 📞', 'The microphone is not allowed. You can call each other on the phone 📞'));
  });
}

/* =================== у бегущего (Сабрина) =================== */
async function gullCall(){   // с карты приключений: позвать чайку по сети
  if(await netLobby() !== 'ok') return;
  mgOpen(L('Здороваемся… 👋', 'Saying hello… 👋'));
  const pal = await coHello('run'); mgClose();
  if(pal && pal.want === 'run'){   // оба позвали чайку — кто-то один должен быть чайкой
    toast(L('Вы оба в забеге! Пусть один войдёт через «Вместе» → «По сети»', 'You are both dashing! One of you should join via “Together” → “Online”'), 4200);
    netSend({t:'bye'}); netClose(); return;
  }
  GL = {role:'run', pal:pal || {}, g:null, pos:new V3(GULL_IDLE.x, GULL_IDLE.y, 0), tgt:null, left:GULL_SHELLS, helps:0, pecks:0,
    hl:new Map(), secT:0, acc:0, z0:0, gone:false, goneT:0, lost:false, said:{}};
  gullRunWire();
  sfx.caw();
}
function gullRunWire(){
  netOn('gp', m => { if(GL) GL.tgt = new V3(m.x, m.y, m.z); });
  netOn('gc', m => gullCmd(m));
  netOn('emo', () => { if(GL && GL.g && R){ burst(TEX.heart, GL.g.position, 8, 1.6, 0.3); sfx.purr(); } });
  netOn('gbye', () => {
    if(!GL) return;
    toast(L('Чайка улетела домой 👋', 'The gull flew home 👋'));
    if(!R || !GL.g){ netClose(); GL = null; return; }
    GL.gone = true; floatText(L('Пока-пока!', 'Bye-bye!'), GL.g.position.clone().add(new V3(0, 0.7, 0)), '#3E8DB8');
  });
  net.onLost = () => { if(GL && !GL.gone){ GL.lost = true; toast(L('Чайка потерялась в тумане… 🌫️', 'The gull got lost in the fog… 🌫️')); } };
  net.onBack = () => { if(GL && !GL.gone){ GL.lost = false; toast(L('Чайка вернулась! 🐦', 'The gull is back! 🐦')); } };
}
function gullRunStart(){   // новый забег (и «Ещё раз»): чайке — тот же трек дня
  if(GL.gone) return;
  if(!GL.g){ GL.g = makeGull(); runRoot.add(GL.g); }
  GL.pos.set(GULL_IDLE.x, GULL_IDLE.y + 1.5, R.z + GULL_IDLE.z); GL.tgt = null; GL.g.visible = true;
  GL.left = GULL_SHELLS; GL.helps = 0; GL.pecks = 0; GL.hl.clear(); GL.secT = 0; GL.z0 = R.z; GL.acc = 0;
  netSend({t:'rgo', id:R.id, day:advDayKey(), stars:R.stars, pet:coPetDesc(), left:GULL_SHELLS});
  const btns = mgNode('div', 'co-btns gull-btns', `<button class="round co-mic" aria-label="${L('Микрофон', 'Microphone')}">🎤</button>
    <button class="round co-heart" aria-label="${L('Сердечко чайке', 'A heart for the gull')}">💗</button>`);
  gullMic(btns.querySelector('.co-mic'));
  const hb = btns.querySelector('.co-heart');
  mgOn(hb, 'pointerdown', e => e.stopPropagation());
  mgOn(hb, 'click', e => { e.stopPropagation(); burst(TEX.heart, headTop(petSeal), 8, 1.6, 0.3); sfx.purr(); netSend({t:'emo'}); });
  floatText(L('Я с тобой!', 'I\'m with you!'), gWorld(GL.pos).add(new V3(0, 0.8, 0)), '#3E8DB8');
}
function gullRunTick(dt){
  const r = R; if(!r || !GL || !GL.g) return;
  // где малыш — чайке 10 раз в секунду (скорость считаем по пройденному: в замедлении подсказки она тоже медленнее)
  GL.acc += dt;
  if(GL.acc >= 0.1 && !GL.gone){
    const v = r.paused ? 0 : (r.z - GL.z0)/GL.acc; GL.z0 = r.z; GL.acc = 0;
    netSend({t:'rs', z:+r.z.toFixed(2), x:+r.x.toFixed(2), y:+r.y.toFixed(2), v:+v.toFixed(2), st:r.state, sh:r.shells, fi:r.fish, ps:!!r.paused,
      gap:r.cloud ? +r.gap.toFixed(2) : 0, cx:r.cloud ? +r.cx.toFixed(2) : 0});
  }
  if(r.paused) return;
  // чайка летит туда, куда её ведёт напарник; нет связи — висит рядом с малышом
  const idle = new V3(GULL_IDLE.x, GULL_IDLE.y + r.y*0.4, r.z + GULL_IDLE.z);
  const want = GL.gone ? GL.pos.clone().add(new V3(3, 6, -6)) : GL.tgt && !GL.lost ? GL.tgt : idle;
  GL.pos.lerp(want, Math.min(1, dt*(GL.gone ? 1.5 : 6)));
  GL.g.position.copy(gWorld(GL.pos)); gullAnim(GL.g, now, GL.gone);
  GL.g.visible = !GL.lost;
  if(GL.gone && (GL.goneT += dt) > 1.6){ runRoot.remove(GL.g); netClose(); GL = null; return; }
  // подсвеченные пузыри мигают
  for(const [i, until] of GL.hl){
    const b = r.bubbles[i];
    if(!b || b.free || now > until){ GL.hl.delete(i); if(b) b.o.scale.setScalar(1); continue; }
    b.o.scale.setScalar(1 + Math.abs(Math.sin(now*7))*0.28);
    if(Math.random() < dt*8) emit(TEX.star, b.o.position.clone().add(new V3((Math.random() - 0.5)*1.2, (Math.random() - 0.5)*1.2, 0.3)), {v:new V3(0, 0.6, 0), life:0.5, size:0.18, spin:4});
  }
  // секрет: дорожка из искр от чайки к золотой ракушке
  if(GL.secT > now){
    const p = r.pick.find(p => p.secret && !p.got);
    if(p && Math.random() < dt*20) emit(TEX.star, p.o.position.clone().add(new V3((Math.random() - 0.5)*0.8, Math.random()*0.8, 0)), {v:new V3(0, 1.2, 0), life:0.7, size:0.26, spin:4});
  }
  gullBuoyBob(r);
}
function gullCmd(m){   // просьба чайки: проверяем у себя, делаем и рассылаем, что вышло
  const r = R; if(!r || !GL || GL.gone || r.state !== 'go' || r.paused) return;
  const from = GL.g ? GL.g.position.clone() : runPupAt().add(new V3(0, 2.5, 0));
  let ok = false;
  if(m.k === 'drop' && GL.left > 0){
    const z = Math.max(r.z + 3, Math.min(r.z + 28, +m.z || 0)), x = Math.max(-1, Math.min(1, Math.round((+m.x || 0)/LANE)))*LANE;
    GL.left--; runDropAt(from, [[z, x]]); netSend({t:'gl', left:GL.left}); ok = true;
    if(!GL.said.drop){ GL.said.drop = true; runSayHint(L('Чайка роняет ракушки — лови! 🐚', 'The gull drops shells — catch them! 🐚'), 2000); }
  }
  if(m.k === 'hl'){
    const b = r.bubbles[m.i];
    if(b && !b.free && b.z > r.z - 1){
      GL.hl.set(m.i, now + 3.5); ok = true;
      floatText(L('Тут рыбка!', 'A fish here!'), b.o.position.clone().add(new V3(0, 0.9, 0)), '#3E8DB8');
      if(!GL.said.fish){ GL.said.fish = true; runSayHint(L('Чайка показывает рыбку — нажми на пузырь 🫧', 'The gull shows a fish — tap the bubble 🫧'), 2200); }
    }
  }
  if(m.k === 'sec'){
    const p = r.pick.find(p => p.secret && !p.got);
    if(p && p.z > r.z - 1){ GL.secT = now + 5; ok = true; sfx.sparkle(); runSayHint('🐦 ' + L('Чайка нашла секрет! ', 'The gull found the secret! ') + (SECRET_TIP[r.id] || ''), 3400); }
  }
  if(m.k === 'buoy'){
    const c = r.cracks[m.i];
    if(c && !c.buoy && c.z1 > r.z + 0.5){ gullBuoy(c, from); gEv('rbu', {i:m.i}); ok = true;
      if(!GL.said.buoy){ GL.said.buoy = true; runSayHint(L('Чайка бросила круг 🛟 — если упадёшь, он подбросит!', 'The gull threw a life ring 🛟 — if you fall, it bounces you up!'), 2400); } }
  }
  // снежок: ещё летит — рассыпаем; уже упал (сеть опоздала) — клюём его сугроб
  const peckDrift = (d, i) => {
    if(!d || !d.snow || d.hit || d.z < r.z + 0.5) return false;
    d.hit = true; r.grp.remove(d.o); gullPuff(d.o.position.clone().add(new V3(0, 0.3, 0))); gEv('rpd', {i});
    if(GL.pecks++ < GULL_PECK_GIFT) runDropAt(d.o.position.clone().add(new V3(0, 0.5, 0)), [[d.z + 1.5, d.ln*LANE]]);
    return true;
  };
  if(m.k === 'peck'){
    const sb = r.snowballs[m.i];
    if(sb && !sb.done){
      sb.done = true; r.grp.remove(sb.o); r.grp.remove(sb.sh); gullPuff(sb.o.position.clone()); gEv('rsp', {i:m.i}); ok = true;
      if(GL.pecks++ < GULL_PECK_GIFT) runDropAt(sb.o.position.clone(), [[Math.max(sb.tz, r.z + 4), sb.ln*LANE]]);
    } else if(sb){ const i = r.drifts.findIndex(d => d.snow && d.z === sb.tz && d.ln === sb.ln); ok = peckDrift(r.drifts[i], i); }
    if(ok) floatText(L('Клюк!', 'Peck!'), from.clone().add(new V3(0, 0.6, 0)), '#3E8DB8');
  }
  if(m.k === 'peckd'){ ok = peckDrift(r.drifts[m.i], m.i); if(ok) floatText(L('Клюк!', 'Peck!'), from.clone().add(new V3(0, 0.6, 0)), '#3E8DB8'); }
  if(m.k === 'tickle' && r.cloud && r.tickleT <= 0){ cloudTickle(); ok = true; }
  if(ok){ GL.helps++; sfx.caw(); }
}
function gullRunRes(res){
  if(GL.gone) return;
  netSend({t:'rres', stars:res.stars, shells:res.shells, total:res.total, fish:res.fish, fishTotal:res.fishTotal, helps:GL.helps, starRun:res.starRun, friend:res.friend});
}
function gullRunEnd(){   // бегущий ушёл домой: прощаемся
  if(!GL) return;
  if(!GL.gone) netSend({t:'bye'});
  if(GL.g) runRoot.remove(GL.g);
  netClose(); GL = null;
}

/* =================== у чайки (папа) =================== */
async function gullFly(pal){
  const name = (pal && pal.name) || L('Малыш', 'The pup');
  GL = {role:'fly', pal, name, went:pal && pal.f ? 'ушла' : 'ушёл', g:makeGull(), pup:null, pos:new V3(GULL_IDLE.x, GULL_IDLE.y, 0), want:null, wantT:0, left:GULL_SHELLS,
    cd:0, sendT:0, P:null, tu:0, lost:false, done:null, flights:0, tipT:0};
  runRoot.add(GL.g);
  // малыш бегущего — такой же, как у него (окрас, стадия, наряд)
  const pup = coSealOf(pal && pal.coat ? pal : null); pup.root.scale.setScalar(STAGES[Math.min(SHINY, Math.max(0, (pal && pal.stage) | 0))].sc);
  pup.root.rotation.y = Math.PI; pup.root.visible = false; runRoot.add(pup.root); GL.pup = pup;
  sfx.whoosh(); flash();
  runRoot.visible = true; runCam.on = true; HEMI.intensity = 0.62; sun.intensity = 0.58;
  runCam.pos.set(RUN_POS.x + 0.3, 5.5, RUN_POS.z + 11); runCam.look.set(RUN_POS.x, 1, RUN_POS.z - 8);
  document.body.classList.add('run-on');
  const homeB = document.createElement('button'); homeB.id = 'btnRunHome'; homeB.className = 'round home';
  homeB.innerHTML = '<span aria-hidden="true">🏠</span>'; homeB.setAttribute('aria-label', L('Домой', 'Home')); $('#btnSound').after(homeB);
  const fin = new Promise(r => GL.done = r);
  homeB.addEventListener('click', () => { sfx.tap(); if(GL && GL.done) GL.done('quit'); });
  gullFlyWire();
  gullWaitPanel();
  const how = await fin;
  if(how === 'quit') netSend({t:'gbye'});
  // домой
  mgClose(); netClose();
  if(R){ runRoot.remove(R.grp); R = null; }
  runRoot.remove(GL.g); runRoot.remove(GL.pup.root); runHudEl = null;
  const flights = GL.flights; GL = null;
  homeB.remove(); document.body.classList.remove('run-on');
  flash();
  runRoot.visible = false; runCam.on = false; homeLights(false);
  return flights > 0 ? {gull:flights} : null;
}
function gullWaitPanel(){   // ждём, пока бегущий выберет уровень; заодно — как помогать
  mgOpen('');
  mgTick(gullFlyTick);
  const panel = mgNode('div', 'mg-panel gull-wait', `
    <p class="ttl display">🐦 ${L('Ты — чайка!', 'You are the gull!')}</p>
    <p class="got">${L(`${GL.name} выбирает, куда бежать…`, `${GL.name} is choosing where to dash…`)}</p>
    <ul class="gull-how">
      <li><b>🐚</b>${L('Нажми на лёд впереди — уронишь ракушку', 'Tap the ice ahead — drop a shell')}</li>
      <li><b>🫧</b>${L('На пузырь — покажешь рыбку', 'A bubble — point out a fish')}</li>
      <li><b>✨</b>${L('На золотую ракушку — подскажешь секрет', 'The golden shell — hint the secret')}</li>
      <li><b>🛟</b>${L('На трещину — бросишь круг', 'A crack — throw a life ring')}</li>
      <li><b>☁️</b>${L('На снежок или Тучку — клюнешь', 'A snowball or the Cloud — peck it')}</li>
    </ul>
    <button class="btn ghost small" data-k="home">${L('Домой', 'Home')}</button>`);
  mgOn(panel.querySelector('[data-k="home"]'), 'click', () => { sfx.tap(); GL.done('quit'); });
}
function gullFlyWire(){
  const P = () => GL && GL.P, Rok = () => GL && R && GL.P;
  netOn('rgo', m => gullFlyGo(m));
  netOn('rs', m => {
    const p = P(); if(!p) return;
    Object.assign(p, {rz:m.z + m.v*0.05, v:m.v, x:m.x, y:m.y, st:m.st, sh:m.sh, fi:m.fi, ps:m.ps, gap:m.gap, cx:m.cx});
    if(R) R.state = m.st === 'end' ? 'end' : R.state === 'end' ? 'end' : m.st;
  });
  netOn('rp', m => { if(!Rok()) return; const p = R.pick[m.i]; if(!p || p.got) return;
    p.got = true; R.grp.remove(p.o); sfx.coin();
    if(p.secret){ sfx.sparkle(); burst(TEX.star, p.o.position, 18, 2.4, 0.3); floatText(L('Секрет! ✨', 'A secret! ✨'), p.o.position.clone().add(new V3(0, 0.8, 0)), '#E0A21B'); }
    else emit(TEX.star, p.o.position, {v:new V3(0, 1, 0), life:0.45, size:0.22, spin:4});
  });
  netOn('rb', m => { if(!Rok()) return; const b = R.bubbles[m.i]; if(!b || b.free) return;
    b.free = true; R.grp.remove(b.o); sfx.pop(); burst(TEX.star, b.o.position, 10, 1.8, 0.26);
    floatText(b.fd ? L(`${b.fd.name} спасена!`, `${b.fd.name} is free!`) : L('Спасена!', 'Free!'), b.o.position.clone().add(new V3(0, 0.6, 0)), '#2F9E72');
  });
  netOn('rc', m => { if(!Rok()) return; const d = R.drifts[m.i]; GL.tu = 0.7; sfx.plop();
    floatText(L('Бух!', 'Bonk!'), gullPupTop(), '#6B6A7E');
    if(d && !d.hit){ d.hit = true; const s0 = d.o.scale.clone(); burst(TEX.puff, d.o.position.clone().add(new V3(0, 0.4, 0)), 10, 1.6, 0.5); tween(0.3, k => d.o.scale.set(s0.x*(1 + k*0.3), s0.y*(1 - k*0.75), s0.z*(1 + k*0.2))); }
  });
  netOn('rsb', m => { if(Rok() && R.cloud) snowSpawn(m.tz, m.ln); });
  netOn('rsl', m => { if(!Rok()) return; const sb = R.snowballs[m.i]; if(sb && !sb.done){ sb.done = true; snowLand(sb); } });
  netOn('rsp', m => { if(!Rok()) return; const sb = R.snowballs[m.i]; if(sb && !sb.done){ sb.done = true; R.grp.remove(sb.o); R.grp.remove(sb.sh); gullPuff(sb.o.position.clone()); } });
  netOn('rpd', m => { if(!Rok()) return; const d = R.drifts[m.i]; if(d && !d.hit){ d.hit = true; R.grp.remove(d.o); gullPuff(d.o.position.clone().add(new V3(0, 0.3, 0))); } });
  netOn('rdr', m => { if(Rok()) runDropAt(new V3(m.f[0], m.f[1], m.f[2]), m.ps); });
  netOn('rbu', m => { if(!Rok()) return; const c = R.cracks[m.i]; if(c && !c.buoy) gullBuoy(c, GL.g.position.clone()); });
  netOn('rtk', () => { if(!Rok() || !R.cloud) return; const c = R.cloud; sfx.giggle();
    floatText(L('Хи-хи-хи!', 'Hee-hee!'), c.position.clone().add(new V3(0, 1.1, 0)), '#D9527E');
    tween(0.6, k => c.rotation.z = Math.sin(k*Math.PI*6)*0.18*(1 - k), ease.lin);
  });
  netOn('rfx', m => { if(!Rok()) return;
    const at = gullPupTop();
    if(m.k === 'spl'){ sfx.splash(); burst(TEX.puff, at.clone().setY(0.1), 10, 1.6, 0.45); floatText(L('Плюх!', 'Splash!'), at, '#3E8DB8'); }
    if(m.k === 'boost'){ sfx.boost(); floatText(L('Вжух!', 'Whoosh!'), at, '#D9527E'); }
    if(m.k === 'buoy'){ sfx.boing(); floatText(L('Держу!', 'Got you!'), at, '#D9527E'); const c = R.cracks[m.i]; if(c && c.buoy){ const b = c.buoy; tween(0.3, k => b.scale.setScalar(1 + Math.sin(k*Math.PI)*0.3), ease.lin); } }
    if(m.k === 'fin') gullFlyFinish();
  });
  netOn('gl', m => { if(GL){ GL.left = m.left; gullLeftPill(); } });
  netOn('emo', () => { if(GL && GL.pup.root.visible){ burst(TEX.heart, gullPupTop(), 8, 1.6, 0.3); sfx.purr(); } });
  netOn('rres', m => gullFlyRes(m));
  netOn('bye', () => gullFlyBye());
  net.onLost = () => { if(GL){ GL.lost = true; mgHint(L('Связь пропала… подождём 🌊', 'Lost the connection… let\'s wait 🌊')); } };
  net.onBack = () => { if(GL){ GL.lost = false; mgHint(''); toast(L('Снова вместе! 💗', 'Together again! 💗')); } };
}
const gullPupTop = () => GL.pup.root.position.clone().add(new V3(0, 1.1*GL.pup.root.scale.x + 0.3, 0));
function gullFlyGo(m){   // бегущий стартует — строим тот же трек дня
  if(!GL) return;
  const d0 = advDayKey; advDayKey = () => m.day;
  try{ runBuild(m.id, {stars:m.stars}); } finally { advDayKey = d0; }
  const r = R;
  // глаза чайки: золотую ракушку видно издалека
  for(const p of r.pick) if(p.secret){ const e = glow(0xFFE27A, 3.6); p.o.add(e); p.eye = e; }
  GL.P = {rz:r.z, v:0, x:0, y:0, st:'ready', sh:0, fi:0, ps:false, gap:r.gap || 14, cx:0};
  GL.left = m.left; GL.tu = 0; GL.want = null; GL.cd = 0; GL.flights++; GL.fin = false;
  GL.pos.set(GULL_IDLE.x, GULL_IDLE.y, r.z + GULL_IDLE.z);
  GL.pup.root.visible = true;
  mgClose(); mgOpen('', {hintBottom:true});
  runHudEl = mgNode('div', 'run-hud', `<span class="pill"><i class="pic">🐚</i> <b class="sh">0</b></span><span class="pill">🐟 <b class="fi">0/0</b></span><span class="bar"><i></i><span class="flag" aria-hidden="true">🏁</span></span>`);
  const btns = mgNode('div', 'co-btns gull-btns', `<span class="pill gull-left" aria-label="${L('Ракушки у чайки', 'Shells the gull has')}">🐦 🐚 <b></b></span>
    <button class="round co-mic" aria-label="${L('Микрофон', 'Microphone')}">🎤</button>
    <button class="round co-heart" aria-label="${L('Сердечко', 'A heart')}">💗</button>`);
  gullMic(btns.querySelector('.co-mic'));
  const hb = btns.querySelector('.co-heart');
  mgOn(hb, 'pointerdown', e => e.stopPropagation());
  mgOn(hb, 'click', e => { e.stopPropagation(); if(GL && GL.g){ burst(TEX.heart, GL.g.position, 8, 1.6, 0.3); sfx.purr(); netSend({t:'emo'}); } });
  gullLeftPill(); runHud();
  mgTick(gullFlyTick);
  gullFlyControls();
  mgHint(L(`${GL.name} бежит — помогай! 🐦`, `${GL.name} is dashing — help out! 🐦`));
  GL.tipT = now + 3;
  sfx.caw();
}
function gullLeftPill(){ const b = document.querySelector('.gull-left b'); if(b && GL) b.textContent = GL.left; }
function gullFlyTick(dt){
  if(!GL) return;
  const r = R, P = GL.P, t = now;
  GL.cd -= dt;
  if(!r || !P){   // ждём старта: чайка кружит над началом дорожки
    GL.pos.set(Math.sin(t*0.7)*1.4, GULL_IDLE.y + 0.6, 4 + Math.cos(t*0.7)*1.2);
    GL.g.position.copy(gWorld(GL.pos)); gullAnim(GL.g, t); return;
  }
  // малыш: догоняем присланное место, между сообщениями едем с присланной скоростью
  if(!P.ps && !GL.lost) P.rz += P.v*dt;
  r.z += (P.rz - r.z)*Math.min(1, dt*8);
  r.x += (P.x - r.x)*Math.min(1, dt*10);
  r.y += (P.y - r.y)*Math.min(1, dt*14);
  const pos = new V3(RUN_POS.x + r.x, 0.25 + r.y, RUN_POS.z - r.z), s = GL.pup;
  s.root.position.copy(pos); s.root.rotation.set(0, Math.PI, (P.x - r.x)*0.35);
  if(GL.tu > 0) GL.tu = Math.max(0, GL.tu - dt);
  s.inner.rotation.x = GL.tu > 0 ? -(1 - GL.tu/0.7)*Math.PI*2 : r.y > 0.05 ? -0.25 : 0;
  s.inner.position.y = GL.tu > 0 ? Math.sin((1 - GL.tu/0.7)*Math.PI)*0.5 : 0;
  s.flap = r.y > 0.05 ? 0.8 : 0.15; s.wobble = r.y > 0.05 ? 0 : Math.sin(t*9)*0.03;
  // дорожка живёт: ракушки крутятся, пузыри качаются, стрелки бегут
  for(const p of r.pick) if(!p.got && !p.flying){ p.o.rotation.y += dt*(p.secret ? -1.5 : 3); if(p.eye) p.eye.scale.setScalar(3.2 + Math.sin(t*4)*0.5); }
  for(const b of r.bubbles) if(!b.free) b.o.position.y = 0.25 + BUB_Y + Math.sin(t*2 + b.ph)*0.12;
  BOOST_TEX.offset.y = (BOOST_TEX.offset.y - dt*1.6) % 1;
  gullBuoyBob(r);
  // Тучка
  if(r.cloud){
    const c = r.cloud;
    if(!GL.fin){
      r.gap += (P.gap - r.gap)*Math.min(1, dt*6); r.cx += (P.cx - r.cx)*Math.min(1, dt*6);
      c.position.copy(runAt(r.z + r.gap, r.cx, 4.1 + Math.sin(t*1.6)*0.18));
    } else c.position.lerp(pos.clone().add(new V3(0, 1.4 + 1.2*s.root.scale.x, -0.6)), Math.min(1, dt*2));
    for(const sb of r.snowballs){
      if(sb.done) continue;
      sb.t += dt; const k = Math.min(1, sb.t/sb.T);
      sb.o.position.lerpVectors(sb.from, sb.to, k); sb.o.position.y += Math.sin(k*Math.PI)*1.0;
      sb.sh.scale.setScalar(0.3 + 0.7*k); sb.sh.material.opacity = 0.2 + 0.3*k;
    }
  }
  // чайка: куда показали — туда и летит, потом возвращается к малышу
  const idle = new V3(GULL_IDLE.x, GULL_IDLE.y + r.y*0.4, r.z + GULL_IDLE.z);
  const want = GL.want && GL.wantT > t ? GL.want : idle;
  GL.pos.lerp(want, Math.min(1, dt*5));
  GL.g.position.copy(gWorld(GL.pos)); gullAnim(GL.g, t, GL.wantT > t);
  if((GL.sendT -= dt) <= 0){ GL.sendT = 0.1; netSend({t:'gp', x:+GL.pos.x.toFixed(2), y:+GL.pos.y.toFixed(2), z:+GL.pos.z.toFixed(2)}); }
  // камера: выше, чем у бегущего (чайка смотрит сверху), — малыш не закрывает дорожку впереди
  const far = Math.max(1, Math.min(1.4, 0.6/camera.aspect)), ck = s.root.scale.x/STAGES[0].sc - 1;
  if(!GL.fin){
    runCam.pos.set(RUN_POS.x + r.x*0.4 + 0.3, (7.6 + ck*4)*far**1.8, pos.z + (10 + ck*5)*far);
    runCam.look.set(RUN_POS.x + r.x*0.5, 0.6, pos.z - 10 - (far - 1)*5);
  }
  // прогресс и подсказки
  r.shells = P.sh; r.fish = P.fi; runHud();
  if(GL.lost) return;
  if(P.ps) mgHint(L('Пауза ⏸ — ждём', 'Paused ⏸ — waiting'));
  else if(mgHintEl.textContent.includes('⏸')) mgHint('');
  if(GL.tipT && t > GL.tipT && P.st === 'go' && !P.ps){
    GL.tipT = 0;
    mgHint(GL.flights > 1 ? '' : L('Нажми на лёд впереди — уронишь ракушку 🐚', 'Tap the ice ahead to drop a shell 🐚'));
    if(GL.flights <= 1) setTimeout(() => { if(GL && mgHintEl.textContent.includes('🐚')) mgHint(''); }, 3500);
  }
}
const gRay = new THREE.Raycaster(), gNdc = new THREE.Vector2(), gIce = new THREE.Plane(new V3(0, 1, 0), -0.25), gHit = new V3();
function gullFlyControls(){
  mgOn(mgRoot, 'pointerdown', e => {
    if(e.target.closest('button, .mg-panel')) return;
    e.preventDefault();
    if(!GL || !R || !GL.P || GL.P.st !== 'go' || GL.P.ps || GL.lost || GL.cd > 0) return;
    gullTap(e.clientX, e.clientY);
  });
}
function gullTap(cx, cy){
  // из всего, что под пальцем, берём ближайшее (с учётом размера: Тучка большая, снежок маленький)
  const r = R;
  let cmd = null, fly = null, best = 1;
  const cand = (v, rad, c, f) => { const q = toScreen(v), k = Math.hypot(q.x - cx, q.y - cy)/rad; if(k < best){ best = k; cmd = c; fly = f; } };
  r.snowballs.forEach((sb, i) => { if(!sb.done) cand(sb.o.position, 75, {k:'peck', i}, sb.o.position.clone()); });
  if(r.cloud && !GL.fin) cand(r.cloud.position, 110, {k:'tickle'}, r.cloud.position.clone().add(new V3(0.8, 0.2, 0.6)));
  r.bubbles.forEach((b, i) => { if(!b.free && b.z > r.z - 1) cand(b.o.position, 80, {k:'hl', i}, b.o.position.clone().add(new V3(0, 0.7, 0))); });
  r.pick.forEach(p => { if(p.secret && !p.got && p.z > r.z && p.z < r.z + 45) cand(p.o.position, 85, {k:'sec'}, p.o.position.clone().add(new V3(0, 0.8, 0))); });
  r.drifts.forEach((d, i) => { if(d.snow && !d.hit && d.z > r.z + 0.5) cand(d.o.position, 70, {k:'peckd', i}, d.o.position.clone().add(new V3(0, 0.6, 0))); });
  if(!cmd){
    gNdc.set(cx/innerWidth*2 - 1, -(cy/innerHeight)*2 + 1); gRay.setFromCamera(gNdc, camera);
    if(gRay.ray.intersectPlane(gIce, gHit)){
      const z = RUN_POS.z - gHit.z, x = gHit.x - RUN_POS.x;
      if(Math.abs(x) < RUN_W/2 + 0.4 && z > r.z + 1 && z < r.z + 60){
        const ci = r.cracks.findIndex(c => z > c.z0 - 1 && z < c.z1 + 1 && c.z1 > r.z + 0.5);
        if(ci >= 0 && !r.cracks[ci].buoy){ const c = r.cracks[ci]; cmd = {k:'buoy', i:ci}; fly = runAt((c.z0 + c.z1)/2, 0, 1.2); }
        else if(z > r.z + 3 && GL.left > 0){ cmd = {k:'drop', z:+Math.min(z, r.z + 28).toFixed(2), x:+x.toFixed(2)}; fly = runAt(Math.min(z, r.z + 28), x, 1.4); }
        else if(z > r.z + 3){ toast(L('Ракушки у чайки кончились. Зато можно показывать рыбок и секреты!', 'The gull is out of shells. But you can still point out fish and secrets!')); }
      }
      if(!fly && gHit.distanceTo(gullPupTop()) < 60) fly = gHit.clone().setY(2.2);   // просто полетать
    }
  }
  if(fly){ GL.want = gTrack(fly); GL.wantT = now + 1.3; }
  if(cmd){
    netSend({t:'gc', ...cmd}); GL.cd = GULL_CD; sfx.caw();
    if(cmd.k === 'drop'){ GL.left--; gullLeftPill(); }
    if(fly) emit(TEX.star, fly, {v:new V3(0, 0.8, 0), life:0.5, size:0.3, spin:4});
  } else if(fly) sfx.whoosh();
}
async function gullFlyFinish(){   // финиш у бегущего: фейерверк, Тучка мирится
  if(!R || GL.fin) return;
  GL.fin = true; R.state = 'end';
  const r = R, p = r.finish.position.clone().add(new V3(0, 2.6, 0));
  sfx.good(); sfx.hug(); mgHint('');
  for(let i = 0; i < 3; i++) setTimeout(() => { burst(TEX.star, p, 14, 2.6, 0.32); burst(TEX.heart, p, 6, 2, 0.28); }, i*250);
  floatText(L('Финиш!', 'Finish!'), gullPupTop(), '#D9527E');
  if(r.cloud){
    await wait(1.1); if(R !== r) return;
    sfx.sneeze(); floatText(L('Апчхи!', 'Achoo!'), r.cloud.position.clone().add(new V3(0, 1.2, 0)));
    cloudKind(r.cloud, true); burst(TEX.heart, r.cloud.position, 12, 2, 0.3);
  }
}
function gullFlyRes(m){   // итоги бегущего — и спасибо чайке
  if(!GL || !R) return;
  const today = new Date().toDateString(), g = save.coop.gull || (save.coop.gull = {d:'', n:0});
  const n = g.d === today ? g.n : 0, paid = n < GULL_DAILY;
  if(paid){ save.coop.gull = {d:today, n:n + 1}; persist(); setTimeout(() => addShells(GULL_GIFT, {x:innerWidth/2, y:innerHeight*0.4}), 900); }
  const st = Math.max(1, Math.min(3, m.stars | 0));
  const panel = mgNode('div', 'mg-panel run-end gull-end', `
    <p class="ttl display">${L('Финиш! 🏁', 'Finish! 🏁')}</p>
    <p class="gull-stars" aria-label="${L('звёзды', 'stars')}">${'★'.repeat(st)}<i>${'☆'.repeat(3 - st)}</i></p>
    <p class="got">${GL.name}: ${m.starRun ? '⭐' : '🐚'} ${m.shells} ${L('из', 'of')} ${m.total} · 🐟 ${m.fish} ${L('из', 'of')} ${m.fishTotal}</p>
    ${m.helps ? `<p class="got">🐦 ${L('Чайка помогла', 'The gull helped')}: ${m.helps} ${plural(m.helps, 'раз', 'раза', 'раз', 'time', 'times')}</p>` : ''}
    ${m.friend ? `<p class="got cup">☁️ ${L('Тучка подружилась!', 'The Cloud became a friend!')}</p>` : ''}
    <p class="earned display">${paid ? `+${GULL_GIFT} 🐚` : ''}</p>
    <p class="got co-wait">${L(`${GL.name}: ещё раз или домой?..`, `${GL.name}: again or home?..`)}</p>
    <div class="row"><button class="btn" data-k="home">${L('Домой 🏠', 'Home 🏠')}</button></div>`);
  sfx.hug();
  mgOn(panel.querySelector('[data-k="home"]'), 'click', () => { sfx.tap(); if(GL) GL.done('quit'); });
}
function gullFlyBye(){   // бегущий ушёл домой
  if(!GL) return;
  GL.P = null;
  const w = document.querySelector('.gull-end .co-wait');
  if(w){ w.textContent = L(`${GL.name} ${GL.went} домой. Спасибо, чайка! 👋`, `${GL.name} went home. Thank you, gull! 👋`); return; }
  mgClose(); mgOpen(''); mgTick(gullFlyTick);
  if(R){ runRoot.remove(R.grp); R = null; }
  GL.pup.root.visible = false;
  const panel = mgNode('div', 'mg-panel gull-wait', `
    <p class="ttl display">👋 ${L('Забег окончен', 'The dash is over')}</p>
    <p class="got">${L(`${GL.name} ${GL.went} домой. Спасибо, чайка! 🐦`, `${GL.name} went home. Thank you, gull! 🐦`)}</p>
    <button class="btn" data-k="home">${L('Домой 🏠', 'Home 🏠')}</button>`);
  mgOn(panel.querySelector('[data-k="home"]'), 'click', () => { sfx.tap(); if(GL) GL.done('bye'); });
}
