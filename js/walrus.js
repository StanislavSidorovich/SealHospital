/* ---------------- 🤫 Финал Метели «Тихонько мимо моржа» (28.10, вместо «Сугроб-урагана» — финалы «Потеряшки» не повторяют глагол, DESIGN.md §3) ----------------
   Мама Пипы нашлась — «Наш лагерь за ущельем. Только у выхода спит Морж-Соня… Тихонько!» Вспышка — все в ущелье,
   мама и Пипа сидят на санках, санки привязаны к Силачу. Морж спит у самой тропинки и дышит по кругу:
     😴 храпит (Хр-р-р, 💤, пузырь из носа) — можно идти → 👃 усы дёрнулись (ещё можно, но пора замирать) →
     😪 ворочается — замри! Кто идёт или топает при приземлении, тот шумит; шум — это глаза моржа и полоска наверху.
   💪 Силач тянет санки (с санками — медленнее и шумнее), без него санки не едут.
   🦘 Прыгун идёт рядом с санками: Пипа от холода икает — надувается 😣 (кружок над ней сходится), и если рядом Прыгун
      жмёт 🤫 (кнопка или касание по экрану) — «Шшш…», ик пропал. Прозевали — «ИК!»: шум, а следующий ик скорее.
   Шум до конца — морж просыпается: «Хм?.. Кто тут?.. А-а-апчхи!» — всех сдувает на WL_BACK назад, и он снова храпит.
   Проиграть нельзя. Санки за выходом — Пипа кричит «Ура!», морж просыпается по-настоящему… и оказывается добрым:
   «Мне снилась рыбка… Спокойной ночи!» — и снова храпит. Фото.
   Без напарника (🔄): ведёшь Силача, Прыгун сам идёт рядом с санками, 🤫 — твоя кнопка.
   Пинг «в ногу»: Силач тянет, только пока храпит и только если ты рядом с Пипой; Прыгун идёт с санками и шикает.
   Сеть: морж, шум и ик считает хозяин — qwt {p — фаза, n — шум, h — надувается} 7 раз/с; ик — qwh, апчхи — qwz,
   гость шикнул — qwsh (хозяин решает), что вышло — qwshx {ok}; доехали — qwend. Санки у каждого считаются от Силача.
   Оборачивает хуки RS_LVS.snow (blizzard.js), подключается после festival.js. */
const WL_S0 = 77.4, WL_P0 = 78.9, WL_J0 = 77.9;     // старт: санки, Силач, Прыгун
const WL_END = 95.2, WL_PMIN = 76.4, WL_JMIN = 75.1; // санки доехали — выход; дальше влево не сдувает
const WL_ROPE = 1.5, WL_PUSH = 0.95, WL_SZ = -0.55, WL_NEAR = 1.9;   // верёвка, санки упёрлись в Силача, санки позади тропинки, «рядом с Пипой»
const WL_PH = {s:[2.6, 3.4], s1:3.8, w:0.8, q:[1.5, 2.1]};          // храпит (первый раз дольше), усы, ворочается
const WL_NS = 0.85, WL_NJ = 0.4, WL_NLAND = 0.2, WL_GRACE = 0.2, WL_GRACE_NET = 0.5;   // шум в секунду: Силач с санками, Прыгун; приземлился; не сразу (гостю — подольше)
const WL_DEC = {s:0.15, w:0.1, q:0.04};                             // шум сам тихнет
const WL_HIC = {first:6, gap:[3.4, 5.0], fast:[2.0, 2.5], swell:1.5, swell1:2.4, swellF:1.0, ns:0.5, nq:1.0};   // ик Пипы
const WL_BACK = 3.6, WL_BREATH = 1.6;
const WL_POS = {x:88.6, z:-2.75, ry:0.75};
// ущелье за правой скалой Метели: земля и правый край (на старте уровня сюда не попасть — стенка BZ.walls[0])
BZ.ground.push([74, 104, -3.2, 0]); BZ.walls.push([101.6, 103, 0, 9]);
let WL = null;

/* ---------- звуки (Web Audio, audio.js) ---------- */
const wlSnd = {
  snore(){ tone(68, 1.0, {type:'triangle', vol:0.09, to:84, att:0.35, vib:0.2, vibHz:22}); noise(1.0, {vol:0.05, freq:220, to:340, type:'lowpass', att:0.4}); },
  out(){ noise(0.8, {vol:0.04, freq:1300, to:700, att:0.25}); tone(150, 0.5, {type:'triangle', vol:0.025, to:110, att:0.2}); },
  hic(){ squeak(900, 1500, 0.07, {vol:0.07}); squeak(1100, 1600, 0.05, {vol:0.04, delay:0.06}); },
  shh(){ noise(0.6, {vol:0.06, freq:4200, to:3000, att:0.12}); },
  mumble(){ tone(130, 0.35, {type:'triangle', vol:0.07, to:115, vib:0.05, vibHz:8}); tone(118, 0.4, {type:'triangle', vol:0.06, delay:0.38, to:100, vib:0.05, vibHz:8}); },
  achoo(){ squeak(300, 520, 0.35, {vol:0.07}); noise(0.6, {vol:0.2, freq:1800, to:500, delay:0.4, att:0.01}); tone(160, 0.3, {type:'triangle', vol:0.12, to:70, delay:0.4}); }
};

/* ---------- постройка (один раз) ---------- */
const wlRoot = new THREE.Group(); bzRoot.add(wlRoot);
const WLW = {};
const WL_MAT = {body:toon(0x8E6656), snout:toon(0xA88E80), fin:toon(0x7A5547), tusk:toon(0xE4DED2), cap:toon(0xE07A9A), pom:toon(0xFFFDF8),
  nose:toon(0x9A4A5E), blush:new THREE.MeshBasicMaterial({color:0xFFB3C7}), bub:new THREE.MeshBasicMaterial({color:0xCFEFFF, transparent:true, opacity:0.55, depthWrite:false}),
  rope:toon(0x9A7A58), run:toon(0xD9527E), blank:toon(0xE58DA8)};
function wlWalrus(){   // Морж-Соня: свой каваи-морж — круглый, с клыками, в ночном колпаке, нос с пузырём
  const W = new THREE.Group(), B = new THREE.Group(); W.add(B);
  const body = addOutline(new THREE.Mesh(SPH, WL_MAT.body), 1.035); body.scale.set(2.3, 1.05, 1.15); body.position.y = 1.0; B.add(body);
  const fins = [];
  for(const [x, z, s] of [[-1.0, 1.0, 1], [-1.0, -1.0, 1], [2.3, 0.4, 0.8], [2.3, -0.4, 0.8]]){
    const f = addOutline(new THREE.Mesh(SPH, WL_MAT.fin), 1.08); f.scale.set(0.5*s, 0.12, 0.3*s); f.position.set(x, 0.14, z); f.rotation.y = x > 0 ? 0.4*Math.sign(z) : -0.3*Math.sign(z); B.add(f); fins.push(f);
  }
  const H = new THREE.Group(); H.position.set(-2.0, 1.35, 0); B.add(H);
  const head = addOutline(new THREE.Mesh(SPH, WL_MAT.body), 1.04); head.scale.setScalar(1.0); H.add(head);
  const snout = [];
  for(const sd of [-1, 1]){
    const m = addOutline(new THREE.Mesh(SPH, WL_MAT.snout), 1.06); m.scale.set(0.42, 0.36, 0.4); m.position.set(-0.85, -0.3, sd*0.3); H.add(m); snout.push(m);
    for(const [dy, dz] of [[0.05, 0.12], [-0.08, 0.2], [0.0, 0.3]]){ const d = new THREE.Mesh(SMALL, inkMat); d.scale.setScalar(0.028); d.position.set(-1.24, -0.3 + dy, sd*dz); H.add(d); }
    const t = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.62, 8), WL_MAT.tusk), 1.12); t.rotation.x = Math.PI; t.position.set(-0.92, -0.78, sd*0.2); H.add(t);
    const b = new THREE.Mesh(SMALL, WL_MAT.blush); b.scale.set(0.1, 0.06, 0.13); b.position.set(-0.62, 0.12, sd*0.72); H.add(b);
  }
  const nose = addOutline(new THREE.Mesh(SMALL, WL_MAT.nose), 1.1); nose.scale.set(0.14, 0.11, 0.17); nose.position.set(-1.14, -0.04, 0); H.add(nose);
  const eyes = [-1, 1].map(sd => { const e = new THREE.Mesh(SPH, inkMat); e.scale.set(0.035, 0.022, 0.15); e.position.set(-0.74, 0.42, sd*0.42); H.add(e); return e; });
  const shine = [-1, 1].map(sd => { const s = new THREE.Mesh(SMALL, new THREE.MeshBasicMaterial({color:0xFFFFFF})); s.scale.setScalar(0.035); s.position.set(-0.8, 0.47, sd*0.42 + 0.04); s.visible = false; H.add(s); return s; });
  const bub = new THREE.Mesh(SPH, WL_MAT.bub); bub.position.set(-1.32, -0.12, 0.14); bub.scale.setScalar(0.1); H.add(bub);
  const cap = new THREE.Group(); cap.position.set(0.05, 0.82, 0); cap.rotation.z = -0.6; H.add(cap);
  const cone = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.35, 14), WL_MAT.cap), 1.05); cone.position.y = 0.55; cap.add(cone);
  const band = addOutline(new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.1, 8, 20), WL_MAT.pom), 1.05); band.rotation.x = Math.PI/2; band.position.y = -0.08; cap.add(band);
  const pom = addOutline(new THREE.Mesh(SPH, WL_MAT.pom), 1.08); pom.scale.setScalar(0.2); pom.position.y = 1.28; cap.add(pom);
  // пледик на спине
  const bl = addOutline(new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10, 0, Math.PI*2, 0, 1.0), WL_MAT.blank), 1.03); bl.scale.set(1.5, 0.95, 1.2); bl.position.set(0.6, 1.12, 0); B.add(bl);
  W.userData = {B, H, eyes, shine, bub, cap, snout, fins};
  return W;
}
function wlBuild(){
  if(WLW.wal) return;
  const R = rsRand(77);
  // даль: снежные холмы, как в начале Метели
  for(let x = 72; x < 114; x += 5 + R()*4){
    const s = 2.2 + R()*2.6, b = addOutline(new THREE.Mesh(new THREE.ConeGeometry(s, s*1.3, 7), BZ_MAT.hill), 1.03); b.position.copy(rsAt(x, s*0.4, -16 - R()*14)); wlRoot.add(b);
  }
  // ущелье: скала позади с зубцами, сосульки, сугробы
  rsBox(74, 101.6, 0, 4.6, RS_MAT.cliff, 1.0, wlRoot).position.z -= 4.4;
  rsBox(74.02, 101.58, 4.58, 4.8, RS_MAT.snow, 1.04, wlRoot).position.z -= 4.4;
  for(let x = 74.6; x < 101.4; x += 1.6 + R()*1.8){
    const h = 0.8 + R()*1.6, c = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.7 + R()*0.6, h, 5), RS_MAT.cliff), 1.04); c.position.copy(rsAt(x, 4.7 + h/2, -4.6)); wlRoot.add(c);
    const t = new THREE.Mesh(new THREE.ConeGeometry(0.3, h*0.35, 5), RS_MAT.snow); t.position.copy(rsAt(x, 4.7 + h*0.83, -4.6)); wlRoot.add(t);
  }
  for(let x = 75; x < 101; x += 1.1 + R()*1.4){
    const h = 0.4 + R()*0.7, ic = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.12 + R()*0.08, h, 6), RS_MAT.gate), 1.1);
    ic.rotation.x = Math.PI; ic.position.copy(rsAt(x, 4.6 - h/2, -3.8 + R()*0.3)); wlRoot.add(ic);
  }
  for(const [x, s] of [[80.4, 0.8], [83.4, 0.6], [93.0, 0.9], [99.6, 0.7]]){ const d = makeDrift(); d.scale.setScalar(s); d.position.copy(rsAt(x, 0, -1.4 - R()*0.6)); wlRoot.add(d); }
  // Морж-Соня у тропинки
  const W = wlWalrus(); W.position.copy(rsAt(WL_POS.x, 0, WL_POS.z)); W.rotation.y = WL_POS.ry; wlRoot.add(W); WLW.wal = W;
  // выход: снежные столбы и лагерь пингвинов
  for(const z of [-1.1, 0.9]){ const c = rsBox(96.1, 96.6, 0, 2.5, RS_MAT.snow, 0.5, wlRoot); c.position.z += z; }
  const top = rsBox(95.9, 96.8, 2.4, 2.75, RS_MAT.snow, 2.6, wlRoot); top.position.z -= 0.1;
  if(typeof smIgloo === 'function'){ const ig = smIgloo(0.9); ig.position.copy(rsAt(99.2, 0, -1.7)); ig.rotation.y = -0.5; wlRoot.add(ig); }
  const tent = addOutline(new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.3, 4), BZ_MAT.tent), 1.04); tent.rotation.y = Math.PI/4; tent.position.copy(rsAt(97.4, 0.65, -2.4)); wlRoot.add(tent);
  const fire = bzFire(); fire.position.copy(rsAt(98.0, 0, -0.6)); wlRoot.add(fire); WLW.fire = fire;
  // санки с пледиком и верёвка
  const sl = new THREE.Group(); sl.visible = false; wlRoot.add(sl); WLW.sled = sl;
  const seat = addOutline(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 0.78), RS_MAT.wood), 1.06); seat.position.y = 0.34; sl.add(seat);
  const blank = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.05, 0.8), WL_MAT.blank); blank.position.set(-0.15, 0.43, 0); sl.add(blank);
  const back = addOutline(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.42, 0.78), RS_MAT.wood), 1.06); back.position.set(-0.72, 0.58, 0); sl.add(back);
  for(const sd of [-1, 1]){
    const r = addOutline(new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 0.07), WL_MAT.run), 1.1); r.position.set(0, 0.05, sd*0.34); sl.add(r);
    const tip = addOutline(new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.035, 6, 12, Math.PI), WL_MAT.run), 1.1); tip.rotation.z = -Math.PI/2; tip.position.set(0.85, 0.2, sd*0.34); sl.add(tip);
    for(const px of [-0.5, 0.5]){ const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.26, 0.06), RS_MAT.wood); leg.position.set(px, 0.2, sd*0.34); sl.add(leg); }
  }
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 6), WL_MAT.rope); rope.visible = false; wlRoot.add(rope); WLW.rope = rope;
}
function wlReset(){
  if(!WLW.wal) return;
  WLW.sled.visible = false; WLW.rope.visible = false;
  const U = WLW.wal.userData; U.B.rotation.set(0, 0, 0); U.B.scale.setScalar(1); U.H.rotation.set(0, 0, 0); U.cap.position.set(0.05, 0.82, 0); U.cap.rotation.set(0, 0, -0.6);
  WLW.wal.rotation.set(0, WL_POS.ry, 0);
}

/* ---------- кто где ---------- */
const wlOn = () => !!(WL && WL.q === Q);
const wlHost = () => Q.mode !== 'net' || net.host;
const wlStrong = () => rsBoth().find(p => p.role === 'strong');
const wlJumper = () => rsBoth().find(p => p.role === 'jump');
const wlPipaX = () => WL.sx + 0.4;
const wlRnd = a => Array.isArray(a) ? a[0] + Math.random()*(a[1] - a[0]) : a;
function wlHead(dy = 0){ const v = WLW.wal.userData.H.getWorldPosition(new V3()); v.y += dy; return v; }
function wlNose(){ return WLW.wal.userData.bub.getWorldPosition(new V3()); }

/* ---------- начало: мама просит проводить в лагерь ---------- */
async function wlBoard(){
  const q = Q, m = Q.moms.find(o => o.ok);
  if(!m){ Q.end = 'win'; return; }
  floatText(L('Наш лагерь — за ущельем!', 'Our camp is past the gorge!'), rsAt(m.x, 2.4), '#D9527E');
  mgHint(L('Мама: «Наш лагерь — за ущельем. Только у выхода спит Морж-Соня… Тихонько! 🤫»', 'Mum: “Our camp is past the gorge. But Sleepy Walrus naps by the way out… Shh! 🤫”'));
  await wait(2.6); if(Q !== q) return;
  flash(); sfx.whoosh();
  wlStart(m);
}
function wlStart(m){
  WL = {q:Q, mom:m, ph:'s', pt:WL_PH.s1, qt:0, n:0, hT:WL_HIC.first, hS:WL_HIC.swell1, h:0, br:0, bi:-1, bo:-1, sx:WL_S0, sv:0,
    home:false, wake:0, zk:0, gust:0, pj:0, calm:0, sendT:0, sayT:-9, shT:-9, hics:0, shh:0, sneezes:0, ui:null, hic:null, said:new Set(), uiPh:''};
  Q.st = 'go'; Q.asked = false; Q.photoX = null; Q.photoY = null; Q.momAsk = 0;
  const P = Q.pipa;   // Пипа ещё на спине у Силача (если пришли не через маму) — снимаем
  if(P && P.on){ if(P.s.root.parent) P.s.root.parent.remove(P.s.root); bzRoot.add(P.s.root); P.s.root.scale.setScalar(RS_SC*0.62); P.on = null; }
  m.s.root.scale.setScalar(RS_SC*1.15); setMood(m.s, 'ok');
  for(const p of [Q.me, Q.pal]){
    if(!p) continue;
    p.auto = null; p.wlB = null;
    if(!rsLocal(p)) continue;   // тюлень по сети придёт сам (его ждёт wlWaitPal)
    if(p.bub) rsRevive(p);
    const x = p.role === 'strong' ? WL_P0 : WL_J0;
    p.x = p.nx = p.wlPx = x; p.y = p.ny = 0; p.vx = p.vy = 0; p.air = false; p.face = 1; p.inW = false; p.ground = null; p.wlB = null; p.climb = false; p.hold = false;
  }
  if(Q.mode === 'solo' && Q.me.role === 'jump' && Q.pal){ const a = Q.me; Q.me = Q.pal; Q.pal = a; Q.me.kind = 'me'; Q.pal.kind = 'idle'; }   // без напарника ведёшь Силача, Прыгун идёт сам
  WLW.sled.visible = true; WLW.rope.visible = true;
  Q.cx = 82; Q.cy = 0.4;
  WL.ui = mgNode('div', 'wl-st', '<b></b><span></span><i><u></u></i>');
  WL.hic = mgNode('div', 'wl-hic', '<i></i><b>😣</b>'); WL.hic.hidden = true;
  for(const k of ['60', '62']) for(const r of ['jump', 'strong']) Q.said.delete('s' + k + r);
  Q.hintT = 0; rsHintNow(true);
  if(Q.mode === 'net' && wlHost()) wlSend();
}

/* ---------- морж: храпит → усы → ворочается (у хозяина) ---------- */
function wlPhase(ph, remote){
  const T = WL; if(!T) return;
  T.ph = ph; T.qt = 0;
  if(!remote) T.pt = ph === 's' ? wlRnd(WL_PH.s) : ph === 'w' ? WL_PH.w : ph === 'q' ? wlRnd(WL_PH.q) : 0;
  if(ph === 's'){ T.br = 0; T.bi = -1; T.bo = -1; }
  if(ph === 'w'){
    sfx.tick(); floatText('❕', wlHead(1.6), '#E0A21B');
    if(!T.said.has('w')){ T.said.add('w'); mgHint(L('Усы дёрнулись — сейчас заворочается. Приготовься замереть!', 'His whiskers twitch — he\'s about to stir. Get ready to freeze!')); Q.hintT = now + 3; }
  }
  if(ph === 'q'){
    wlSnd.mumble(); floatText(L('Ням-ням…', 'Nom-nom…'), wlHead(1.4), '#6B6A7E');
    if(!T.said.has('q')){ T.said.add('q'); mgHint(L('Замри! 🤫 Пока он ворочается — ни шагу', 'Freeze! 🤫 Not a step while he stirs')); Q.hintT = now + 3; }
  }
  if(!remote && Q.mode === 'net') wlSend();
}
const wlSend = () => { WL.sendT = 0.15; netSend({t:'qwt', p:WL.ph, n:+WL.n.toFixed(2), h:+WL.h.toFixed(2)}); };
// шум: кто идёт или приземлился, пока морж ворочается
function wlNoise(dt){
  const T = WL;
  let add = 0;
  for(const p of rsBoth()){
    const v = Math.abs(p.x - (p.wlPx ?? p.x))/Math.max(dt, 1e-3), land = p.wlAir && !p.air;
    p.wlPx = p.x; p.wlAir = p.air;
    if(T.ph !== 'q' || T.qt < (p.kind === 'net' ? WL_GRACE_NET : WL_GRACE) || p.wlB) continue;   // гость узнаёт «замри» с задержкой сети
    let a = 0;
    if(v > 0.4 && v < 6 && p.x > 74.4) a += (p.role === 'strong' ? WL_NS : WL_NJ)*dt;   // быстрее — это не шаги, а перелёт (гость ещё не дошёл до ущелья)
    if(land) a += WL_NLAND;
    if(a){ add += a; if(now - (p.wlSay || 0) > 1.6){ p.wlSay = now; floatText(L('Тссс!', 'Shh!'), rsAt(p.x, p.y + 1.5), '#D9527E'); } }
  }
  if(T.ph !== 'z') T.n = Math.max(0, T.n + add - (add ? 0 : WL_DEC[T.ph]*dt));
  if(T.n >= 1 && T.ph !== 'z') wlSneeze();
}
// разбудили: «Хм? Кто тут?.. А-а-апчхи!» — всех сдувает назад
async function wlSneeze(remote){
  const T = WL; if(!T || T.ph === 'z' || T.home) return;
  T.ph = 'z'; T.qt = 0; T.n = 1; T.h = 0; T.sneezes++; T.zk = 0;
  if(!remote && Q.mode === 'net') netSend({t:'qwz'});
  wlSnd.mumble(); floatText(L('Хм?.. Кто тут?..', 'Hmm?.. Who\'s there?..'), wlHead(1.5), '#6B6A7E');
  await wait(1.0); if(WL !== T) return;
  T.zk = 1; floatText(L('А-а-а…', 'Ah… ah…'), wlHead(1.7), '#6B6A7E');
  await wait(0.7); if(WL !== T) return;
  T.zk = 2; T.gust = 0.9; wlSnd.achoo(); sfx.whoosh();
  floatText(L('АПЧХИ!', 'ACHOO!'), wlHead(1.9), '#D9527E');
  const nz = wlNose();
  burst(TEX.puff, nz, 16, 2.6, 0.5);
  for(let i = 0; i < 14; i++) emit(TEX.puff, nz.clone().add(new V3(0, Math.random()*0.8 - 0.3, Math.random()*1.4 - 0.4)), {v:new V3(-5 - Math.random()*3, 0.6 + Math.random(), 0.8), life:1.0, size:0.45, grow:0.9});
  for(const p of [Q.me, Q.pal]) if(p && rsLocal(p) && !p.gone) wlBlow(p);
  if(!T.said.has('z')){ T.said.add('z'); mgHint(L('Апчхи! Разбудили — нас сдуло назад. Ничего: ещё раз, тихонько 🤫', 'Achoo! We woke him — and got blown back. That\'s ok: again, quietly 🤫')); Q.hintT = now + 4; }
  await wait(1.4); if(WL !== T) return;
  T.zk = 0; floatText(L('Хр-р-р…', 'Zzz…'), wlHead(1.5), '#6B6A7E');
  T.n = 0;
  if(wlHost()){ T.hT = Math.max(T.hT, 3); wlPhase('s'); }
}
function wlBlow(p){
  const min = p.role === 'strong' ? WL_PMIN : WL_JMIN;
  p.wlB = {x0:p.x, x1:Math.max(min, Math.min(p.x, p.x - WL_BACK)), k:0}; p.climb = true; p.hold = false;
  floatText(L('Уууух!', 'Wheee!'), rsAt(p.x, p.y + 1.4));
}
function wlSlide(p, dt){   // летим кувырком назад (вместо физики, как льдина в Бухте)
  const B = p.wlB; if(!B) return false;
  B.k = Math.min(1, B.k + dt/0.9);
  const e = 1 - (1 - B.k)*(1 - B.k);
  p.x = B.x0 + (B.x1 - B.x0)*e; p.y = Math.sin(B.k*Math.PI)*0.7; p.vx = p.vy = 0; p.face = 1; p.air = true; p.ground = null;
  if(B.k >= 1){ p.wlB = null; p.y = 0; p.wlPx = p.x; if(p === Q.me && Q.mode === 'net') rsSendMe(); return false; }
  return true;
}

/* ---------- Пипа икает, Прыгун шикает ---------- */
function wlHicStep(dt){
  const T = WL;
  if(T.ph === 'z'){ T.h = 0; return; }
  T.hT -= dt;
  T.h = T.hT < T.hS ? Math.max(0, Math.min(1, 1 - T.hT/T.hS)) : 0;
  if(T.h > 0 && !T.said.has('h')){
    T.said.add('h');
    const J = Q.me.role === 'jump' || Q.mode === 'solo', n = Q.pal && !Q.pal.gone && Q.mode !== 'solo' ? Q.pal.name : '';
    mgHint(J ? L('Пипа надувается 😣 — сейчас икнёт! Будь рядом и жми 🤫', 'Pipa is puffing up 😣 — she\'s about to hiccup! Stay close and press 🤫')
      : L(`Пипа надувается 😣 — ${n || 'Прыгун'} шикнет на неё 🤫`, `Pipa is puffing up 😣 — ${n || 'the jumper'} will shush her 🤫`));
    Q.hintT = now + 4;
  }
  if(T.hT <= 0) wlHic();
}
function wlHic(remote){
  const T = WL; if(!T || T.home) return;
  if(!remote){
    T.n += T.ph === 'q' ? WL_HIC.nq : WL_HIC.ns;
    T.hT = wlRnd(WL_HIC.fast); T.hS = WL_HIC.swellF; T.h = 0;   // прозевали — следующий ик скорее
    if(Q.mode === 'net') netSend({t:'qwh'});
  }
  T.hics++; T.pj = 0.4;
  wlSnd.hic(); floatText(L('ИК!', 'HIC!'), rsAt(wlPipaX(), 1.3, WL_SZ), '#D9527E');
  if(!T.said.has('hic')){
    T.said.add('hic');
    const J = Q.me.role === 'jump' || Q.mode === 'solo';
    mgHint(J ? L('Ик! Морж услышал… Когда Пипа надувается 😣 — жми 🤫', 'Hic! The walrus heard… When Pipa puffs up 😣 — press 🤫') : L('Ик! Морж услышал… Прыгун, шикни на Пипу 🤫', 'Hic! The walrus heard… Jumper, shush Pipa 🤫'));
    Q.hintT = now + 4;
  }
  if(!remote && wlHost() && T.n >= 1) wlSneeze();
  else if(T.n > 0.4) floatText(L('Хм?..', 'Hmm?..'), wlHead(1.5), '#6B6A7E');
}
function wlShush(p, remote){
  const T = WL; if(!T || T.home || T.ph === 'z' || Q.st !== 'go') return;
  const J = wlJumper();
  if(!remote){
    if(!p || (p.role !== 'jump' && Q.mode !== 'solo')){
      if(p === Q.me && now - T.sayT > 3){ T.sayT = now; floatText(L('На Пипу шикает Прыгун 🤫 — а ты тяни санки', 'The jumper shushes Pipa 🤫 — you pull the sled'), rsAt(p.x, p.y + 1.5)); }
      return;
    }
    if(!J || Math.abs(J.x - wlPipaX()) > WL_NEAR){ if(J && now - T.sayT > 1.5){ T.sayT = now; floatText(L('Подойди к Пипе 🤫', 'Get close to Pipa 🤫'), rsAt(J.x, J.y + 1.5)); } return; }
    if(now - T.shT < 0.35) return;
    T.shT = now;
    if(!wlHost()){ netSend({t:'qwsh'}); return; }   // решает хозяин, ответ — qwshx
  }
  const ok = T.h > 0 || T.hT < T.hS + 0.4;   // надувается (или вот-вот)
  if(ok){ T.hT = wlRnd(WL_HIC.gap); T.hS = WL_HIC.swell; T.h = 0; T.shh++; }
  wlShushFx(ok);
  if(Q.mode === 'net') netSend({t:'qwshx', ok:ok ? 1 : 0});
}
function wlShushFx(ok){
  const T = WL, J = wlJumper();
  if(J){ J.m.flap = 1; floatText(L('Шшш… 🤫', 'Shhh… 🤫'), rsAt(J.x, J.y + 1.5), '#3E8DB8'); }
  wlSnd.shh();
  if(ok){ T.h = 0; T.calm = 1.2; burst(TEX.heart, rsAt(wlPipaX(), 0.9, WL_SZ), 5, 1.0, 0.18); }
}

/* ---------- кадр ---------- */
function wlPre(h){
  const S = wlStrong(); if(S && rsLocal(S)) S.push = true;   // с санками Силач идёт медленнее
  // без напарника: Прыгун сам идёт рядом с санками
  const pal = Q.pal;
  if(Q.mode === 'solo' && pal && pal.kind === 'idle' && pal.role === 'jump' && !pal.wlB && !pal.air){
    const d = WL.sx + 0.7 - pal.x;
    if(Math.abs(d) > 0.05){ pal.x += Math.sign(d)*Math.min(Math.abs(d), 2.2*h); pal.face = 1; }
  }
}
function wlSled(dt){   // санки на верёвке за Силачом (у каждого — от своего Силача)
  const T = WL, S = wlStrong(), x0 = T.sx;
  if(S) T.sx = Math.max(75.0, Math.min(S.x - WL_PUSH, Math.max(T.sx, S.x - WL_ROPE)));
  T.sv = (T.sx - x0)/Math.max(dt, 1e-3);
}
// по сети напарник ещё не в ущелье (у него сцена с мамой идёт дольше) — морж спит, Пипа не икает, ждём
const wlWaitPal = () => Q.mode === 'net' && rsBoth().some(p => p.kind === 'net' && p.x < 74.4);
function wlStep(dt){
  const T = WL;
  T.qt += dt; T.br += dt; T.pj = Math.max(0, T.pj - dt); T.calm = Math.max(0, T.calm - dt); T.gust = Math.max(0, T.gust - dt);
  wlSled(dt);
  if(T.home || Q.st !== 'go') return;
  if(!wlHost()) return;
  if(wlWaitPal()){ for(const p of rsBoth()) p.wlPx = p.x; if(Q.mode === 'net' && (T.sendT -= dt) <= 0) wlSend(); return; }
  if(T.ph !== 'z' && (T.pt -= dt) <= 0) wlPhase(T.ph === 's' ? 'w' : T.ph === 'w' ? 'q' : 's');
  wlNoise(dt);
  wlHicStep(dt);
  if(T.ph !== 'z' && T.sx >= WL_END && rsBoth().every(p => p.x > WL_END - 1.4 && !p.wlB)) wlHome();
  else if(Q.mode === 'net' && (T.sendT -= dt) <= 0) wlSend();
}
// санки за выходом: Пипа кричит «Ура!» — морж просыпается… и он добрый
async function wlHome(remote){
  const T = WL; if(!T || T.home) return;
  T.home = true; Q.st = 'end'; T.h = 0;
  if(!remote && Q.mode === 'net') netSend({t:'qwend'});
  const q = Q, m = T.mom;
  if(T.ui) T.ui.hidden = true; if(T.hic) T.hic.hidden = true;
  for(const p of [Q.me, Q.pal]) if(p && rsLocal(p)) p.auto = null;
  sfx.giggle(); T.pj = 0.5;
  floatText(L('Ура! Мы дома!', 'Yay! We\'re home!'), rsAt(wlPipaX(), 1.6, WL_SZ), '#D9527E');
  mgHint(L('Ой… Пипа крикнула «Ура!» 😳', 'Oops… Pipa shouted “Yay!” 😳'));
  await wait(1.0); if(Q !== q) return;
  T.wake = 1; T.ph = 'q'; wlSnd.mumble();
  floatText('?!', wlHead(1.8), '#D9527E');
  for(const p of [Q.me, Q.pal]) if(p && !p.gone) floatText('😳', rsAt(p.x, p.y + 1.4));
  await wait(1.3); if(Q !== q) return;
  floatText(L('Ммм… Малыши? Это вы так тихонько шли?', 'Mmm… Little ones? Was that you tiptoeing?'), wlHead(1.8), '#6B6A7E');
  mgHint(L('Морж: «Ммм… Это вы так тихонько шли? Молодцы, что не разбудили…»', 'Walrus: “Mmm… Was that you tiptoeing? Thanks for not waking me…”'));
  await wait(2.2); if(Q !== q) return;
  sfx.yawn(); floatText(L('Мне снилась рыбка… 🐟 Спокойной ночи!', 'I was dreaming of a fish… 🐟 Good night!'), wlHead(1.8), '#6B6A7E');
  await wait(1.8); if(Q !== q) return;
  T.wake = 0; T.ph = 's'; T.br = 0;
  burst(TEX.heart, wlHead(1.2), 10, 1.6, 0.3); sfx.lullaby();
  setMood(m.s, 'happy'); if(Q.pipa) setMood(Q.pipa.s, 'happy');
  burst(TEX.heart, rsAt(T.sx, 1.0, WL_SZ), 16, 2.2, 0.32); sfx.hug();
  floatText(L('Спасибо, спасатели! ✋', 'Thank you, rescuers! ✋'), rsAt(T.sx, 2.0, WL_SZ), '#D9527E');
  mgHint(L('Тссс… Морж снова спит 💤 А Пипа с мамой — дома! 💗', 'Shh… The walrus is asleep again 💤 And Pipa and mum are home! 💗'));
  for(const p of [Q.me, Q.pal]) if(p && !p.gone){ p.m.flap = 1; setMood(p.m, 'happy'); }
  Q.photoX = 91.6; Q.photoY = 0.9;
  await wait(2.4); if(Q !== q) return;
  Q.end = 'win';
}

/* ---------- рисуем ---------- */
function wlDraw(dt){
  const T = WL, S = wlStrong(), U = WLW.wal.userData;
  // санки, мама и Пипа
  const wob = Math.min(1, Math.abs(T.sv)/1.5);
  WLW.sled.position.copy(rsAt(T.sx, 0, WL_SZ)); WLW.sled.rotation.z = Math.sin(now*16)*0.02*wob;
  if(S){
    const A = rsAt(T.sx + 0.8, 0.3, WL_SZ), Bp = rsAt(S.x - 0.28, S.y + 0.42, 0), d = Bp.clone().sub(A), len = Math.max(0.05, d.length());
    WLW.rope.position.copy(A).addScaledVector(d, 0.5); WLW.rope.scale.set(1, len, 1); WLW.rope.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize());
  }
  const m = T.mom.s, bob = Math.abs(Math.sin(now*9))*0.03*wob;
  m.root.position.copy(rsAt(T.sx - 0.3, 0.4 + bob, WL_SZ)); m.root.rotation.y = 0.7;
  const P = Q.pipa;
  if(P){
    const pr = P.s.root, puff = T.h > 0 ? 1 + T.h*0.18 + Math.abs(Math.sin(now*14))*0.05*T.h : 1;
    pr.position.copy(rsAt(wlPipaX(), 0.44 + bob + Math.sin(Math.min(1, T.pj/0.4)*Math.PI)*0.35, WL_SZ + 0.1));
    pr.rotation.y = T.home ? 0.2 : 0.9; pr.scale.set(RS_SC*0.62*puff, RS_SC*0.62*(2 - puff), RS_SC*0.62*puff);
    P.s.flap = T.home || T.pj > 0 ? 1 : 0;
  }
  // кувырок, когда сдуло
  for(const p of [Q.me, Q.pal]) if(p && p.wlB) p.m.root.rotation.z = p.wlB.k*Math.PI*2;
  // морж дышит
  const B = U.B, H = U.H;
  let breath = 0, bub = 0.06, eye = 0.022 + Math.min(1, T.n)*0.07;
  if(T.ph === 's' && !T.home){
    const k = (T.br % WL_BREATH)/WL_BREATH, i = Math.floor(T.br/WL_BREATH);
    breath = k < 0.55 ? Math.sin(k/0.55*Math.PI/2) : Math.cos((k - 0.55)/0.45*Math.PI/2);
    bub = 0.08 + breath*0.32;
    if(i !== T.bi){ T.bi = i; wlSnd.snore(); }
    if(k > 0.55 && T.bo !== i){ T.bo = i; wlSnd.out(); floatText(Math.random() < 0.3 ? L('Хр-р-р…', 'Zzz…') : '💤', wlHead(1.4).add(new V3(0.4, 0, 0)), '#6B6A7E'); }
  } else if(T.home && T.ph === 's'){ const k = (T.br % WL_BREATH)/WL_BREATH; breath = Math.sin(k*Math.PI); bub = 0.08 + breath*0.3; if(Math.floor(T.br/WL_BREATH) !== T.bi){ T.bi = Math.floor(T.br/WL_BREATH); floatText('💤', wlHead(1.4)); } }
  B.scale.set(1 + breath*0.03, 1 + breath*0.06, 1 + breath*0.03);
  U.bub.scale.setScalar(Math.max(0.01, bub)); U.bub.visible = T.ph === 's';
  // ворочается: перекатывается с боку на бок, ластой чешет пузо
  const roll = T.ph === 'q' && !T.wake ? Math.sin(T.qt*2.6)*0.09 : 0;
  B.rotation.x += (roll - B.rotation.x)*Math.min(1, dt*6);
  U.fins[0].rotation.z = T.ph === 'q' ? Math.sin(now*9)*0.4 : 0;
  // усы дёргаются
  const tw = T.ph === 'w' ? Math.sin(now*42)*0.07 : 0;
  for(const s of U.snout) s.scale.set(0.42 + tw, 0.36 - tw*0.5, 0.4);
  // апчхи: голова назад, потом вперёд
  const hz = T.ph === 'z' ? (T.zk === 1 ? -0.35 : T.zk === 2 ? 0.25 : -0.1) : T.wake ? -0.12 : 0;
  H.rotation.z += (hz - H.rotation.z)*Math.min(1, dt*(T.zk === 2 ? 14 : 4));
  if(T.ph === 'z' || T.wake) eye = 0.11;
  for(const e of U.eyes) e.scale.y += (eye - e.scale.y)*Math.min(1, dt*8);
  for(const s of U.shine) s.visible = U.eyes[0].scale.y > 0.07;
  U.cap.rotation.z = -0.6 + Math.sin(now*1.3)*0.06 + (T.ph === 'z' && T.zk === 2 ? 0.5 : 0);
  if(WLW.fire) WLW.fire.userData.f.forEach((f, i) => f.scale.set(1 + Math.sin(now*9 + i)*0.08, 1 + Math.sin(now*11 + i*2)*0.14, 1));
  wlUi();
}
const WL_UI = {s:['😴', () => L('Храпит — иди!', 'Snoring — go!')], w:['👃', () => L('Усы дёрнулись…', 'Whiskers twitch…')],
  q:['😪', () => L('Ворочается — замри!', 'Stirring — freeze!')], z:['😲', () => L('Проснулся!', 'Woke up!')]};
function wlUi(){
  const T = WL, el = T.ui; if(!el || T.home) return;
  if(T.uiPh !== T.ph){ T.uiPh = T.ph; const u = WL_UI[T.ph]; el.dataset.p = T.ph; el.querySelector('b').textContent = u[0]; el.querySelector('span').textContent = u[1](); wiggle(el); }
  el.style.setProperty('--n', Math.min(1, T.n).toFixed(3));
  const h = T.hic; if(!h) return;
  h.hidden = !(T.h > 0) || Q.st !== 'go';
  if(!h.hidden){ const q = toScreen(rsAt(wlPipaX(), 1.45, WL_SZ)); h.style.transform = `translate(${q.x}px, ${q.y}px)`; h.style.setProperty('--r', (1 + 1.3*(1 - T.h)).toFixed(3)); }
}

/* ---------- Пинг «в ногу» ---------- */
function wlAI(p, dt){
  const T = WL;
  if(T.home) return {tx:p.x, far:true};
  const go = T.ph === 's' && !p.wlB;
  if(p.role === 'strong'){
    if(!go) return {tx:p.x, far:true};
    // тянет, только если Прыгун рядом с Пипой (не уходит без тебя)
    const J = rsBoth().find(o => o !== p && o.role === 'jump');
    if(J && Math.abs(J.x - wlPipaX()) > 2.4){
      if(J === Q.me && Q.mode !== 'solo' && now - (T.waitSay || 0) > 5){ T.waitSay = now; floatText(L('Иди рядом с Пипой 🤫', 'Walk by Pipa 🤫'), rsAt(p.x, p.y + 1.6), '#3E8DB8'); }
      return {tx:p.x, far:true};
    }
    return {tx:WL_END + WL_ROPE + 0.4, far:true};
  }
  const act = T.h > 0.45 && Math.abs(p.x - wlPipaX()) <= WL_NEAR ? 'shh' : null;
  if(!go) return {tx:p.x, act, far:true};
  return {tx:Math.min(T.sx + 0.7, WL_END + 0.9), act, far:true};   // рядом с санками
}

/* ---------- подсказки ---------- */
function wlHint(sec, role){
  const solo = Q.mode === 'solo', J = role === 'jump', n = Q.pal && !Q.pal.gone && !solo ? Q.pal.name : '';
  if(sec === 62) return L('Почти выход! Тихо-тихо… 🤫', 'Almost out! Quietly now… 🤫');
  if(solo) return L('Тихонько мимо моржа! ▶ Силач тянет санки — иди, только пока морж храпит 😴, ворочается — замри. Пипа надувается 😣 — жми 🤫', 'Tiptoe past the walrus! ▶ The strong one pulls the sled — go only while he snores 😴, freeze when he stirs. Pipa puffs up 😣 — press 🤫');
  return J ? L('Тсс, морж спит! Иди рядом с санками, пока он храпит 😴, ворочается — замри. Пипа надувается 😣 — жми 🤫, а то икнёт!', 'Shh, the walrus is asleep! Walk by the sled while he snores 😴, freeze when he stirs. Pipa puffs up 😣 — press 🤫 or she\'ll hiccup!')
    : L(`Тсс, морж спит! Тяни санки ▶, только пока он храпит 😴. Ворочается — замри! ${n || 'Прыгун'} шикнет на Пипу 🤫`, `Shh, the walrus is asleep! Pull the sled ▶ only while he snores 😴. He stirs — freeze! ${n || 'The jumper'} will shush Pipa 🤫`);
}

/* ---------- сеть ---------- */
function wlWire(){
  netOn('qwt', m => { const T = WL; if(!wlOn() || wlHost() || T.home) return;
    T.n = +m.n || 0; T.h = +m.h || 0;
    if(m.p && m.p !== T.ph){ if(m.p === 'z') wlSneeze(true); else if(WL_UI[m.p]) wlPhase(m.p, true); }
  });
  netOn('qwh', () => { if(wlOn() && !wlHost()) wlHic(true); });
  netOn('qwz', () => { if(wlOn() && !wlHost()) wlSneeze(true); });
  netOn('qwsh', () => { if(wlOn() && wlHost()) wlShush(null, true); });
  netOn('qwshx', m => { if(wlOn() && !wlHost()) wlShushFx(!!m.ok); });
  netOn('qwend', () => { if(wlOn()) wlHome(true); });
}
function wlClean(){
  if(WL && WL.ui) WL.ui.remove(); if(WL && WL.hic) WL.hic.remove();
  WL = null;
  if(WLW.sled){ WLW.sled.visible = false; WLW.rope.visible = false; }
}

/* ---------- оборачиваем Метель ---------- */
{
  const Lv = RS_LVS.snow;
  const o = {build:Lv.build, reset:Lv.reset, step:Lv.step, ai:Lv.ai, sec:Lv.sec, hint:Lv.hint, cam:Lv.cam, draw:Lv.draw, wire:Lv.wire, clean:Lv.clean,
    tap:Lv.tap, act:Lv.act, doAct:Lv.doAct, pre:Lv.pre, say:Lv.say};
  Lv.build = function(){ o.build.call(this); wlBuild(); };
  Lv.reset = function(...a){ const r = o.reset.apply(this, a); wlClean(); wlReset(); return r; };
  Lv.won = wlBoard;   // bzMom: мама нашлась — дальше тихонько мимо моржа
  Lv.climb = (p, dt) => wlOn() ? wlSlide(p, dt) : false;
  Lv.pre = h => wlOn() ? wlPre(h) : o.pre(h);
  Lv.act = me => wlOn() ? (!WL.home && !me.bub && (me.role === 'jump' || Q.mode === 'solo') ? {k:'shh', ic:'🤫', aria:L('Тише!', 'Shush!')} : null) : o.act(me);
  Lv.doAct = (p, k) => { if(wlOn()){ if(k === 'shh') wlShush(p); return; } o.doAct(p, k); };
  Lv.step = function(dt, go){ o.step.call(this, dt, go); if(wlOn()) wlStep(dt); };
  Lv.ai = (p, dt) => wlOn() ? wlAI(p, dt) : o.ai(p, dt);
  Lv.sec = p => wlOn() ? (WL.sx > WL_END - 5 ? 62 : 60) : o.sec(p);
  Lv.hint = (sec, role) => sec >= 60 && wlOn() ? wlHint(sec, role) : o.hint(sec, role);
  Lv.cam = () => {
    if(!wlOn()) return o.cam();
    if(WL.home) return [Q.photoX ?? 91.6, 0.9, 1.15];
    const S = wlStrong(), x = S ? (WL.sx + S.x)/2 : WL.sx;
    return [Math.max(81.5, Math.min(92.5, x + 2.4)), 0.4, 1.15, 0.6];   // видно и санки, и голову моржа
  };
  Lv.draw = function(dt){ o.draw.call(this, dt); if(wlOn()) wlDraw(dt); };
  Lv.wire = () => { if(o.wire) o.wire(); wlWire(); };
  Lv.clean = () => { wlClean(); if(o.clean) o.clean(); };
  Lv.tap = near => {   // касание по экрану: Пипа надувается — шикнуть
    if(wlOn()){ if(!WL.home && Q.st === 'go' && WL.h > 0 && (Q.me.role === 'jump' || Q.mode === 'solo')){ wlShush(Q.me); return true; } return false; }
    return o.tap(near);
  };
  Lv.say = () => o.say() + ' ' + L('А в конце — 🤫 тихонько мимо спящего моржа!', 'And at the end — 🤫 tiptoe past a sleeping walrus!');
  Lv.photo = () => L('Пипа, мама и Морж-Соня', 'Pipa, mum and Sleepy Walrus');
}
