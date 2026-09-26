/* ---------------- «Остров в гостях» (Спринт 3, задача 4½) ----------------
   Играть вместе начинается там, где Сабрина сейчас: в уголке малыша. Папа (или друг) подключается по коду
   и приплывает к ней на льдину своим тюленем, а уже оттуда вместе выбирают игру — без меню «Вместе».
   Хозяйка острова — та, кто позвала (создала комнату): её уголок, её малыш и уход — всё как обычно,
   рядом стоит гость с именем над головой; коснись гостя — обнимешь 💗.
   Гость видит её малыша (копия по описанию из coHello) и её льдину: касание по льду — идёт туда,
   по малышу — гладит (💗 дружба малышу), 🐟 — угощает рыбкой (сытость), ⚽ — мяч туда-обратно (веселье).
   Угощений и мячей — по VS_MAX за визит; можно ли сейчас, решает хозяйка (малыш спит, сыт, она занята).
   🎮 «Играем!» у любого: выбираешь игру → второму приходит приглашение → оба сразу в игре (без комнаты и кода),
   а после игры — снова на острове: net.keep — игры в конце зовут netClose(), но ниточка остаётся (net.js).
   Сеть: гость шлёт 'vp' (где его тюлень), хозяйка — 'vh' (где малыш и где она сама: pet|sleep|home|away|game).
   'vpat', 'vfish', 'vball' — гость просит; 'vfx' — хозяйка отвечает, и оба показывают; 'vhug' — хозяйка обняла гостя;
   'vask' / 'vyes' / 'vno' — приглашение в игру; 'vbye' — визит окончен (👋 два раза).
   Вход: 🏝️ «В гости» в уголке малыша и вкладка 🏝️ в «Вместе»; кто вошёл по коду через любую игру «По сети»,
   а его позвали в гости, — сразу попадает на остров (coopNetGo в coop.js).
   Фото «В гостях» — в альбом хозяйке (раз в день). Сохранение: save.coop.visit = {n — визитов, d — день фото}.
   Подключается после dive.js и gloom.js (нужны все игры) и до game.js. */
const VS_SPOT = new V3(-1.45, 0.25, 0.2);    // где гость встаёт на льдине (от PET_POS)
const VS_CAM = new V3(-0.6, 0.15, 0.9);      // пока гость рядом, камера чуть отъезжает: видно обоих
const VS_SC = 0.66;                          // в гостях все — малыши: взрослый тюлень папы не заслоняет её малыша
const VS_EDGE = new V3(-2.75, -0.55, 0.95);  // край льдины в воде: отсюда запрыгивает
const VS_SEA = new V3(-5.4, -0.55, 1.5);     // откуда приплывает
const VS_MAX = 3;                            // угощений и мячей за визит
const VS_PAT_XP = 6;                         // столько 💗 малышу за поглаживания гостя за визит
if(!save.coop.visit) save.coop.visit = {n:0, d:''};   // Pages мог отдать старый data.js
let V = null;   // идёт визит: {role:'host'|'guest', ...}
const vsW = p => PET_POS.clone().add(p);   // льдина → мир
const vsSc = d => Math.min(VS_SC, d && d.coat ? STAGES[Math.min(SHINY, Math.max(0, d.stage | 0))].sc : VS_SC);
const vsGames = () => ['dive', 'road', 'fight', 'rescue'].filter(g => CO_GAMES[g] && coGamesOn().includes(g));
const vsAng = (a, b) => ((b - a + Math.PI*3) % (Math.PI*2)) - Math.PI;   // кратчайший поворот от a к b
function vsSeal(d, name){
  const s = coSealOf(d && d.coat ? d : null); s.root.scale.setScalar(vsSc(d)); if(s.bubble) s.bubble.visible = false;
  scene.add(s.root);
  if(name){ s.lbl = textSprite(name, '#3E8DB8'); s.lbl.scale.set(0.85, 0.32, 1); s.lbl.visible = false; scene.add(s.lbl); }
  return s;
}
function vsLabel(s){ if(s.lbl){ s.lbl.visible = s.root.visible; s.lbl.position.copy(headTop(s)).add(new V3(0, 0.12, 0)); } }
function vsDrop(s){ if(!s) return; scene.remove(s.root); if(s.lbl) scene.remove(s.lbl); }

/* ---------- вход ---------- */
// из «Вместе» → 🏝️ или с пилюли в уголке: 'vhost' — позвать к себе, 'vjoin' — поплыть в гости.
// Хозяйка возвращается сразу (визит идёт сам, уголок живёт как обычно), гость — когда визит кончится.
async function visitGo(mode){
  if(V) return false;
  if(mode === 'vhost'){
    if(!save.pet || await netLobby('host') !== 'ok') return false;
    mgOpen(L('Здороваемся… 👋', 'Saying hello… 👋'));
    const pal = await coHello('visit'); mgClose();
    if(pal && pal.want === 'run' && typeof gullFly === 'function') return gullFly(pal);   // напарник в забеге — летим к нему чайкой
    if(!pal || !pal.want || pal.want === 'visit'){ toast(L('Не получилось поздороваться. Попробуйте ещё раз 🌊', 'Could not say hello. Try again 🌊')); netClose(true); return false; }
    visitHost(pal);
    return false;
  }
  if(await netLobby('join') !== 'ok') return false;
  mgOpen(L('Здороваемся… 👋', 'Saying hello… 👋'));
  const pal = await coHello('visitor'); mgClose();
  const w = pal && pal.want;
  if(w === 'visit' || w === 'run' || (w && CO_GAMES[w] && w !== 'code')) return coopNetGo(w, pal);   // позвали в гости — на остров; ждут в игре — в игру
  toast(L('Не получилось поздороваться. Попробуйте ещё раз 🌊', 'Could not say hello. Try again 🌊')); netClose(true);
  return false;
}
// пилюля 🏝️ «В гости» в уголке малыша
async function vsMenu(){
  if(V || busy || !mgRoot.hidden || !petMode) return;
  sfx.tap(); setBusy(true);
  mgOpen('');
  const panel = mgNode('div', 'mg-panel fun-pick vs-menu', `
    <p class="ttl display">🏝️ ${L('Остров в гостях', 'Island visit')}</p>
    <p class="got">${L('Позови папу или друга: он приплывёт к тебе на льдину, поможет с малышом — а потом выберете игру вместе.', 'Invite Dad or a friend: they swim over to your ice floe, help with your pup — and then you pick a game together.')}</p>
    <div class="picks">
      <button data-k="vhost" class="wide"><span class="ic">🏝️</span><b>${L('Позвать к себе', 'Invite over')}</b><small>${L('создать комнату — и сказать код', 'make a room and tell the code')}</small></button>
      <button data-k="vjoin" class="wide"><span class="ic">⛵</span><b>${L('Поплыть в гости', 'Go visiting')}</b><small>${L('у меня есть код', 'I have a code')}</small></button>
    </div>
    <button class="btn ghost small" data-k="no">${L('Потом', 'Later')}</button>`);
  const k = await new Promise(r => panel.querySelectorAll('[data-k]').forEach(b => mgOn(b, 'click', () => { sfx.tap(); r(b.dataset.k); })));
  panel.classList.add('away'); await wait(0.2); mgClose();
  if(k !== 'no') await visitGo(k);
  setBusy(false); if(save.pet) petRefresh();
}
function vsBtnState(){
  let b = $('#visitBtn');
  const want = !V && netAvail() && !!save.pet && !(typeof GL !== 'undefined' && GL && GL.home);
  if(!b){
    if(!want) return;
    b = document.createElement('button'); b.id = 'visitBtn'; b.className = 'vs-btn';
    b.innerHTML = `<span aria-hidden="true">🏝️</span> ${L('В гости', 'Visit')}`;
    b.setAttribute('aria-label', L('Позвать в гости или поплыть в гости', 'Invite a friend or go visiting'));
    b.addEventListener('click', vsMenu); document.body.appendChild(b);
  }
  b.hidden = !want;
}

/* ---------- общее: сердечки, микрофон, игры, приглашения ---------- */
function vsWire(){
  const host = V.role === 'host';
  netOn('emo', () => { const s = V && (host ? V.s : V.me.root.visible && V.me); if(s && s.root.visible){ burst(TEX.heart, headTop(s), 8, 1.6, 0.3); sfx.purr(); } });
  netOn('vask', m => vsAsked(m.g));
  netOn('vyes', m => { if(V && V.ask === m.g){ V.ask = null; vsStart(m.g); } });
  netOn('vno', () => { if(V && V.ask){ V.ask = null; toast(L(`${V.name}: давай чуть позже 🙂`, `${V.name}: a bit later 🙂`)); } });
  netOn('vbye', () => vsEnd('bye'));
  if(host){
    netOn('vp', vsHostPos);
    netOn('vpat', vsHostPat);
    netOn('vfish', () => vsHostFx('fish'));
    netOn('vball', () => vsHostFx('ball'));
  } else {
    netOn('vh', m => { if(V) V.h = m; });
    netOn('vfx', vsGuestFx);
    netOn('vhug', () => {
      if(!V || !V.view) return;
      burst(TEX.heart, headTop(V.me), 12, 2, 0.3); sfx.purr(); squash(V.me, 0.15, 0.35);
      if(!V.hugged){ V.hugged = true; toast(L('Тебя обнимают! 💗', 'You got a hug! 💗')); }
    });
  }
  net.onLost = () => { if(V) toast(L('Связь потерялась… Ждём 🌊', 'Lost the connection… Waiting 🌊')); };
  net.onBack = () => { if(V) toast(L('Снова вместе! 💗', 'Together again! 💗')); };
}
function vsMic(btn){   // 🎤 — как в парных играх, только кнопка живёт вне мини-игры
  if(net.mic){ btn.classList.add('on'); btn.textContent = '🎙️'; }
  btn.addEventListener('pointerdown', e => e.stopPropagation());
  btn.addEventListener('click', async e => {
    e.stopPropagation(); sfx.tap();
    if(net.mic){ netMicOff(false); btn.classList.remove('on'); btn.textContent = '🎤'; return; }
    const ok = await netMicOn();
    if(ok){ btn.classList.add('on'); btn.textContent = '🎙️'; toast(L('Микрофон включён — вас слышно 🎙️', 'Microphone on — you can be heard 🎙️')); }
    else toast(L('Микрофон не разрешён. Можно созвониться по телефону 📞', 'The microphone is not allowed. You can call each other on the phone 📞'));
  });
}
function vsHeart(){ const s = V && (V.role === 'host' ? petSeal : V.me); if(!s) return; burst(TEX.heart, headTop(s), 8, 1.6, 0.3); sfx.purr(); netSend({t:'emo'}); }
function vsByeTap(){   // 👋 — два раза: случайно не уйти
  if(!V) return; sfx.tap();
  if(now - (V.byeT || -9) < 3) return vsEnd('me');
  V.byeT = now; toast(L('Нажми 👋 ещё раз — и попрощаемся', 'Tap 👋 again to say goodbye'), 2800);
}
const vsCanUi = () => V && (V.role === 'guest' ? V.view && !V.panel : petMode && !homeMode && !busy && mgRoot.hidden) && !V.game;
// 🎮 выбрать игру и позвать второго
async function vsPick(){
  if(!V || V.game || V.panel) return;
  if(V.ask) return toast(L('Уже позвали — ждём ответ ✨', 'Already asked — waiting for an answer ✨'));
  if(!vsCanUi()) return toast(L('Сначала закончи то, что начала 🙂', 'Finish what you started first 🙂'));
  sfx.tap();
  const g = await vsPanel(`<p class="ttl display">🎮 ${L('Во что играем вместе?', 'What shall we play together?')}</p>
    <div class="picks">${vsGames().map((g, i, a) => `<button data-k="${g}"${a.length % 2 && i === a.length - 1 ? ' class="wide"' : ''}><span class="ic">${CO_GAMES[g].ic}</span><b>${CO_GAMES[g].name()}</b></button>`).join('')}</div>
    <button class="btn ghost small" data-k="">${L('Потом', 'Later')}</button>`);
  if(!g || !V || V.game) return;
  if(V.inv){ netSend({t:'vyes', g:V.inv}); return vsStart(V.inv); }   // пока выбирали, второй позвал сам — идём к нему
  V.ask = g; V.askT = now; netSend({t:'vask', g});
  toast(L(`Позвали: ${CO_GAMES[g].ic} ${CO_GAMES[g].name()}! Ждём ответ…`, `Invited: ${CO_GAMES[g].ic} ${CO_GAMES[g].name()}! Waiting for an answer…`), 3000);
}
// панель поверх уголка (хозяйка) или острова (гость); ответ — data-k нажатой кнопки
async function vsPanel(html){
  const host = V.role === 'host';
  V.panel = true;
  if(host){ setBusy(true); mgOpen(''); }
  const panel = mgNode('div', 'mg-panel fun-pick vs-pick', html);
  const k = await new Promise(r => { panel.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); sfx.tap(); r(b.dataset.k); })); if(V) V.panelOff = () => r(''); });
  panel.classList.add('away'); await wait(0.2); panel.remove();
  if(host){ mgClose(); setBusy(false); }
  if(V){ V.panel = false; V.panelOff = null; }
  return k;
}
function vsAsked(g){
  if(!V || !CO_GAMES[g] || V.game) return;
  if(V.ask){ if(V.role === 'host') return; V.ask = null; }   // позвали одновременно — играем в то, что выбрала хозяйка
  V.inv = g; V.invShown = false;
  if(!vsCanUi() && !V.panel) toast(L(`${V.name} зовёт играть: ${CO_GAMES[g].ic} ${CO_GAMES[g].name()}!${V.role === 'host' && !petMode ? ' Загляни к малышу 🦭' : ''}`, `${V.name} asks you to play: ${CO_GAMES[g].ic} ${CO_GAMES[g].name()}!${V.role === 'host' && !petMode ? ' Pop over to your pup 🦭' : ''}`), 3600);
}
async function vsInvite(){
  const g = V.inv; V.invShown = true; sfx.ding();
  const k = await vsPanel(`<p class="ttl display">${CO_GAMES[g].ic} ${L('Играем?', 'Let\'s play?')}</p>
    <p class="got">${L(`${V.name} зовёт играть: ${CO_GAMES[g].name()}!`, `${V.name} asks you to play: ${CO_GAMES[g].name()}!`)}</p>
    <p class="got small-note">${CO_GAMES[g].say()}</p>
    <div class="row col"><button class="btn" data-k="yes">${L('Поехали! ✨', 'Let\'s go! ✨')}</button><button class="btn ghost" data-k="no">${L('Не сейчас', 'Not now')}</button></div>`);
  if(!V || V.inv !== g) return;
  V.inv = null;
  if(k === 'yes'){ netSend({t:'vyes', g}); vsStart(g); } else netSend({t:'vno'});
}
// оба в игре: по сети уже соединены, просто здороваемся (coopNet) — после игры снова на острове
async function vsStart(g){
  const v = V; if(!v || v.game) return;
  if(v.panelOff) v.panelOff();
  v.game = g; v.inv = null; v.ask = null;
  const host = v.role === 'host';
  if(host){
    if(!mgRoot.hidden) mgClose();
    setBusy(true); v.s.root.visible = false; if(v.s.lbl) v.s.lbl.visible = false; vsSendHost();
  } else vsGuestView(false);
  await wait(0.1);
  coGame = g;
  try{ await coopNet(g); }catch(e){ console.error(e); }
  if(host){
    const s = petSeal; if(s){ s.root.position.copy(PET_SPOT); s.happyUntil = now + 3; setMood(s, 'happy'); }
    setBusy(false); if(save.pet) petRefresh();
  }
  if(V !== v){ if(v.done) v.done(); return; }   // пока играли, визит кончился
  v.game = null;
  if(!net.peer || net.peer.destroyed || !net.conn) return vsEnd('lost');
  vsWire();
  if(!host) vsGuestView(true);
}
function vsEnd(why){
  const v = V; if(!v) return;
  V = null;
  if(v.panelOff) v.panelOff();
  if(why === 'me'){ netSend({t:'vbye'}); netSend({t:'bye'}); netSend({t:'dbye'}); }   // и из игры, если второй ещё там
  net.keep = false;
  setTimeout(() => { if(!V) netClose(true); }, why === 'me' ? 400 : 0);   // даём «пока» долететь
  if(v.role === 'host'){
    vsChip(false);
    if(petMode && !homeMode && !runCam.on) camOffWant.copy(PET_POS).add(petView());
    if(v.s.root.visible && !v.sw) vsSwimAway(v.s); else vsDrop(v.s);
  } else {
    if(v.view) vsGuestView(false, v);
    vsDrop(v.me); vsDrop(v.pup);
    if(!v.game && v.done) v.done();
  }
  toast(why === 'bye' ? L(`${v.name} ${v.went} домой. Приплывай ещё! 👋`, `${v.name} went home. Come again! 👋`)
    : why === 'lost' ? L('Связь потерялась… Можно позвать ещё раз 🌊', 'Lost the connection… You can invite again 🌊') : L('Пока-пока! 👋', 'Bye-bye! 👋'), 3200);
}
async function vsSwimAway(s){
  if(s.lbl) s.lbl.visible = false;
  const p0 = s.root.position.clone(), e = vsW(VS_EDGE), sea = vsW(VS_SEA);
  s.flap = 0.6; floatText(L('Пока-пока!', 'Bye-bye!'), headTop(s), '#3E8DB8');
  await tween(0.4, k => { s.root.rotation.y = -Math.PI/2*k; });
  await tween(0.75, k => { s.root.position.lerpVectors(p0, e, k); s.root.position.y += Math.sin(k*Math.PI)*1.1; }, ease.lin);
  sfx.splash(); burst(TEX.puff, e.clone().setY(0.1), 10, 1.6, 0.45); s.swimming = true;
  await tween(1.4, k => { s.root.position.lerpVectors(e, sea, k); s.inner.position.y = Math.sin(now*4)*0.06; }, ease.io);
  vsDrop(s);
}
// кадр (зовёт frame() в game.js)
function visitTick(t, dt){
  vsBtnState();
  if(!V) return;
  if(net.lost) V.lostT = (V.lostT || 0) + dt; else V.lostT = 0;
  if(V.lostT > 30 || (!V.game && !net.conn)) return vsEnd('lost');
  if(V.ask && now - V.askT > 30){ V.ask = null; toast(L('Ответа нет — позови ещё раз 🎮', 'No answer — ask again 🎮')); }
  if(V.inv && !V.invShown && vsCanUi()) vsInvite();
  V.role === 'host' ? vsHostTick(dt) : vsGuestTick(dt);
}

/* =================== у хозяйки острова =================== */
function visitHost(pal){
  const name = (pal && pal.name) || L('Папа', 'Dad');
  V = {role:'host', pal, name, went:pal && pal.f ? 'уплыла' : 'уплыл', s:vsSeal(pal, name), p:VS_SEA.clone(), r:Math.PI/2, sw:true, hy:0,
    seen:-9, fish:0, ball:0, xp:0, sendT:0, photoT:0, photo:false, hugCd:0, landed:false};
  V.s.root.visible = false; V.s.swimming = true;
  net.keep = true;
  vsWire(); vsChip(true);
  save.coop.visit.n++; persist();
  toast(L(`${name} плывёт к тебе в гости! 🏝️`, `${name} is swimming over to visit you! 🏝️`), 3400);
}
function vsHostPos(m){
  if(!V || V.role !== 'host') return;
  const fresh = now - V.seen > 2;
  V.p.set(+m.x || 0, +m.y || 0, +m.z || 0); V.r = +m.r || 0; V.hy = +m.h || 0;
  if(fresh){ V.s.root.position.copy(vsW(V.p)); V.s.root.rotation.y = V.r; }
  if(V.sw && !m.sw && !fresh){   // запрыгнул на льдину
    sfx.thud(); burst(TEX.puff, vsW(V.p).setY(0.3), 8, 1.4, 0.4); squash(V.s, 0.2, 0.35);
    if(!V.landed){ V.landed = true; sfx.arf();
      toast(L(`${V.name} в гостях! Нажми на гостя — обнимешь 💗 А 🎮 внизу — выбрать игру вместе`, `${V.name} is visiting! Tap your guest for a hug 💗 And 🎮 below picks a game together`), 4200); }
  }
  V.sw = !!m.sw; V.s.swimming = V.sw; V.seen = now;
}
function vsHostTick(dt){
  const s = V.s, here = !V.game && now - V.seen < 2 && !net.lost;
  s.root.visible = here;
  if(here){
    s.root.position.lerp(vsW(V.p), Math.min(1, dt*10)); s.inner.position.y = V.hy;
    s.root.rotation.y += vsAng(s.root.rotation.y, V.r)*Math.min(1, dt*8);
    updateSeal(s, now, dt);
  }
  vsLabel(s);
  if(petMode && !homeMode && !runCam.on){ camOffWant.copy(PET_POS).add(petView()); if(here) camOffWant.add(VS_CAM); }
  V.hugCd -= dt;
  // фото «В гостях» — когда оба на льдине, раз в день
  if(here && !V.sw && !V.photo && petSeal && petSeal.root.visible && !petSeal.sleeping && vsCanUi()){ if((V.photoT += dt) > 2.5){ V.photo = true; vsPhoto(); } }
  if((V.sendT -= dt) <= 0){ V.sendT = 0.2; vsSendHost(); }
  const chip = $('#visitChip');
  if(chip){ chip.classList.toggle('ask', !!V.ask); chip.classList.toggle('inv', !!V.inv); }
}
function vsWhere(){ return !petMode ? 'away' : homeMode ? 'home' : V.game ? 'game' : petSeal && petSeal.sleeping ? 'sleep' : 'pet'; }
function vsSendHost(){
  const s = petSeal, w = vsWhere(), r = x => Math.round(x*100)/100;
  const q = s ? s.root.position.clone().sub(PET_POS) : new V3(0, 0.25, 0.2);
  netSend({t:'vh', x:r(q.x), y:r(q.y), z:r(q.z), r:s ? r(s.root.rotation.y) : 0, sc:s ? r(s.root.scale.x) : 0.62,
    v:!!s && s.root.visible && q.length() < 4 && ['pet', 'sleep', 'game'].includes(w), w, md:s && now < s.happyUntil ? 1 : 0});
}
function vsPhoto(){
  const c = save.coop.visit, today = new Date().toDateString();
  if(c.d === today) return;
  c.d = today;
  const k = petSeal.root.scale.x, mid = petSeal.root.position.clone().lerp(V.s.root.position, 0.5);
  const img = snapshot({root:{position:mid, scale:{x:k}}}, 1.1 + petSeal.root.position.distanceTo(V.s.root.position)*0.55/k);
  albumAdd({name:L('В гостях', 'Visiting'), img, d:Date.now()}); renderAlbumCount(); persist();
  sfx.star(); toast(L('📷 Фото «В гостях» — в альбоме!', '📷 A “Visiting” photo is in the album!'), 3000);
}
// гость гладит малыша
function vsHostPat(){
  const s = petSeal; if(!V || !s || !petMode || homeMode) return;
  if(s.sleeping){ floatText('z-z…', headTop(s), '#8E99C9'); return netSend({t:'vfx', k:'no', why:'sleep'}); }
  burst(TEX.heart, headTop(s), 8, 1.6, 0.3); sfx.purr();
  if(!busy){ s.happyUntil = now + 2.5; setMood(s, 'happy'); squash(s, 0.12, 0.3); }
  if(!V.patSaid){ V.patSaid = true; floatText(L(`${V.name} гладит!`, `${V.name} pats!`), headTop(s).add(new V3(0, 0.4, 0)), '#3E8DB8'); }
  if(V.xp < VS_PAT_XP && !busy){ V.xp++; petGive(1); }
}
// гость просит: 🐟 или ⚽ — решает хозяйка
async function vsHostFx(k){
  const s = petSeal, p = save.pet; if(!V || !s || !p) return;
  const need = k === 'fish' ? 'food' : 'fun', n = k === 'fish' ? V.fish : V.ball;
  const why = !petMode || homeMode ? 'away' : s.sleeping ? 'sleep' : busy || !mgRoot.hidden || !s.root.visible ? 'busy' : n >= VS_MAX ? 'max' : p.needs[need] >= 0.95 ? (k === 'fish' ? 'full' : 'fun') : '';
  if(why) return netSend({t:'vfx', k:'no', why});
  if(k === 'fish') V.fish++; else V.ball++;
  netSend({t:'vfx', k});
  setBusy(true); s.bubble.visible = false;
  if(k === 'fish') await vsFish(V.s, s); else await vsBall(V.s, s);
  if(p !== save.pet) return setBusy(false);
  p.needs[need] = Math.min(1, p.needs[need] + 0.25); s.happyUntil = now + 3; setMood(s, 'happy');
  petGive(2); persist(); renderPetBar();
  toast(k === 'fish' ? L(`${V.name} ${V.pal && V.pal.f ? 'угостила' : 'угостил'} рыбкой! 🐟`, `${V.name} gave a fish! 🐟`) : L(`Мяч с гостем — вот весело! ⚽`, 'Ball with a guest — such fun! ⚽'), 2600);
  setBusy(false); petRefresh();
}
// касание хозяйки по гостю — обнять (зовёт petTap в pet.js)
function visitTap(e){
  if(!V || V.role !== 'host' || !V.s.root.visible || V.hugCd > 0) return false;
  const q = toScreen(worldOf(V.s, new V3(0, 0.1, 0.3)));
  if(Math.hypot(q.x - e.clientX, q.y - e.clientY) > 70) return false;
  V.hugCd = 0.8; burst(TEX.heart, headTop(V.s), 10, 1.8, 0.3); sfx.purr(); squash(V.s, 0.15, 0.35);
  netSend({t:'vhug'});
  return true;
}
// плашка хозяйки: гость рядом — 🎮 💗 🎤 👋
function vsChip(on){
  let el = $('#visitChip');
  if(!on){ if(el) el.remove(); return; }
  if(el) return;
  el = document.createElement('div'); el.id = 'visitChip'; el.className = 'vs-chip';
  el.innerHTML = `<span class="ic" aria-hidden="true">🏝️</span><span class="nm"></span>
    <button class="round vs-play" aria-label="${L('Играем вместе', 'Play together')}">🎮</button>
    <button class="round co-heart" aria-label="${L('Сердечко гостю', 'A heart for your guest')}">💗</button>
    <button class="round co-mic" aria-label="${L('Микрофон', 'Microphone')}">🎤</button>
    <button class="round vs-bye" aria-label="${L('Попрощаться', 'Say goodbye')}">👋</button>`;
  el.querySelector('.nm').textContent = V.name;
  document.body.appendChild(el);
  el.querySelector('.vs-play').addEventListener('click', () => { if(V && V.inv && !V.panel){ sfx.tap(); return vsInvite(); } vsPick(); });
  el.querySelector('.co-heart').addEventListener('click', vsHeart);
  vsMic(el.querySelector('.co-mic'));
  el.querySelector('.vs-bye').addEventListener('click', vsByeTap);
}

/* =================== у гостя =================== */
// pal — малыш хозяйки (из coHello): у себя строим такой же, свой малыш уступает ему место
function visitGuest(pal){
  if(V) return;
  const name = (pal && pal.name) || L('Малыш', 'The pup');
  V = {role:'guest', pal, name, went:pal && pal.f ? 'ушла' : 'ушёл', me:vsSeal(coPetDesc(), ''), pup:vsSeal(pal, ''), pos:VS_SEA.clone(), tgt:null, yaw:Math.PI/2,
    sw:true, walkT:0, hy:0, sendT:0, h:null, hp:new V3(0, 0.25, 0.2), hv:false, w:'pet', cd:0, fxCd:0, view:false, arr:null, arrK:0, done:null, said:''};
  V.me.root.visible = V.pup.root.visible = false;
  net.keep = true;
  vsWire();
  save.coop.visit.n++; persist();
  const fin = new Promise(r => V.done = r);
  vsGuestView(true);
  return fin;   // вернёмся, когда визит кончится
}
function vsView(){ const sc = Math.max(V.h ? +V.h.sc || 0.62 : 0.62, V.me.root.scale.x*0.9), q = 1 - 0.75*(sc - STAGES[0].sc)/(STAGES[3].sc - STAGES[0].sc);
  return PET_POS.clone().add(new V3(0, -0.75*q, -2.2*q)).add(VS_CAM); }
// на остров (on) и обратно — к себе
function vsGuestView(on, v = V){
  if(on){
    v.view = true; v.hid = [];
    document.body.classList.add('visit-on');
    if(typeof petSeal !== 'undefined' && petSeal && petSeal.root.visible){ petSeal.root.visible = false; v.hid.push(petSeal.root); }   // Пинга-соседа прячет сам nbTick (runCam.on)
    mgOpen(L(`🏝️ Ты в гостях у малыша ${v.name}! Нажми на льдину — пойдёшь туда, на малыша — погладишь 💗`, `🏝️ You are visiting ${v.name}! Tap the ice to walk there, tap the pup to pat it 💗`), {hintBottom:false});
    setTimeout(() => { if(V && V.view && mgHintEl.textContent.startsWith('🏝️')) mgHint(''); }, 6500);
    const bar = mgNode('div', 'vs-bar', `
      <button class="round vs-fish" aria-label="${L('Угостить рыбкой', 'Give a fish')}">🐟</button>
      <button class="round vs-ball" aria-label="${L('Поиграть в мяч', 'Play ball')}">⚽</button>
      <button class="round vs-play" aria-label="${L('Играем вместе', 'Play together')}">🎮</button>
      <button class="round co-heart" aria-label="${L('Сердечко', 'A heart')}">💗</button>
      <button class="round co-mic" aria-label="${L('Микрофон', 'Microphone')}">🎤</button>`);
    bar.querySelectorAll('button').forEach(b => mgOn(b, 'pointerdown', e => e.stopPropagation()));
    mgOn(bar.querySelector('.vs-fish'), 'click', () => vsAskFx('vfish'));
    mgOn(bar.querySelector('.vs-ball'), 'click', () => vsAskFx('vball'));
    mgOn(bar.querySelector('.vs-play'), 'click', () => { if(V && V.inv && !V.panel){ sfx.tap(); return vsInvite(); } vsPick(); });
    mgOn(bar.querySelector('.co-heart'), 'click', vsHeart);
    vsMic(bar.querySelector('.co-mic'));
    mgOn(mgRoot, 'pointerdown', e => { if(e.target.closest('button, .mg-panel')) return; e.preventDefault(); vsGuestTap(e.clientX, e.clientY); });
    const homeB = document.createElement('button'); homeB.id = 'btnRunHome'; homeB.className = 'round home';
    homeB.innerHTML = '<span aria-hidden="true">👋</span>'; homeB.setAttribute('aria-label', L('Домой', 'Home')); $('#btnSound').after(homeB);
    homeB.addEventListener('click', vsByeTap); v.homeB = homeB;
    runCam.on = true; homeLights(false);
    const p0 = save.pet; save.pet = {name:v.name}; try{ drawSign(); }finally{ save.pet = p0; }   // на табличке — имя её малыша
    v.pos.copy(VS_SEA); v.sw = true; v.arr = 'swim'; v.tgt = null; v.yaw = Math.PI/2; v.said = '';
    v.me.root.visible = true; v.me.swimming = true; v.me.inner.rotation.set(0, 0, 0);
    const off = vsView(); runCam.pos.copy(camBase).add(off); runCam.look.copy(camTarget).add(off);
    flash(); sfx.splash();
    return;
  }
  v.view = false;
  if(v.homeB) v.homeB.remove(); v.homeB = null;
  mgClose(); document.body.classList.remove('visit-on');
  for(const o of v.hid || []) o.visible = true; v.hid = [];
  v.me.root.visible = v.pup.root.visible = false;
  runCam.on = false; homeLights(false); drawSign();
}
function vsGuestTap(cx, cy){
  if(!V || !V.view || V.arr || V.panel) return;
  const P = V.pup;
  if(P.root.visible && V.w !== 'home'){
    const q = toScreen(worldOf(P, new V3(0, 0.1, 0.3)));
    if(Math.hypot(q.x - cx, q.y - cy) < 80){
      if(V.cd > 0) return;
      V.cd = 1; netSend({t:'vpat'});
      burst(TEX.heart, headTop(P), 8, 1.6, 0.3); sfx.purr(); squash(P, 0.12, 0.3);
      const side = Math.sign(V.pos.x - V.hp.x) || -1;
      V.tgt = vsClamp(new V3(V.hp.x + side*0.95, 0.25, V.hp.z + 0.1));   // подходит поближе
      return;
    }
  }
  const nd = new THREE.Vector2(cx/innerWidth*2 - 1, -(cy/innerHeight)*2 + 1), ray = new THREE.Raycaster(), hit = new V3();
  ray.setFromCamera(nd, camera);
  if(ray.ray.intersectPlane(new THREE.Plane(new V3(0, 1, 0), -0.25), hit)){ V.tgt = vsClamp(hit.sub(PET_POS)); sfx.tap(); }
}
function vsClamp(p){   // по льдине, не на малыша и не в иглу
  p.x = Math.max(-2.4, Math.min(2.4, p.x)); p.z = Math.max(-0.9, Math.min(1.7, p.z));
  const l = Math.hypot(p.x, p.z); if(l > 2.45){ p.x *= 2.45/l; p.z *= 2.45/l; }
  if(V.hv){ const d = new V3(p.x - V.hp.x, 0, p.z - V.hp.z), dl = d.length(); if(dl < 0.9){ if(dl < 0.01) d.set(-1, 0, 0); d.setLength(0.9); p.x = V.hp.x + d.x; p.z = V.hp.z + d.z; } }
  p.y = 0.25; return p;
}
function vsAskFx(k){
  if(!V || !V.view || V.arr) return;
  sfx.tap();
  if(V.fxCd > 0) return;
  V.fxCd = 2; netSend({t:k});
}
async function vsGuestFx(m){
  if(!V || !V.view) return;
  V.fxCd = 0;
  if(m.k === 'no'){
    const n = V.name, f = V.pal && V.pal.f;
    toast(m.why === 'sleep' ? L(`Тсс! ${n} спит 💤`, `Shh! ${n} is asleep 💤`) : m.why === 'full' ? L(`${n} уже ${f ? 'сыта' : 'сыт'}! 🐟`, `${n} is full already! 🐟`)
      : m.why === 'fun' ? L(`${n} уже ${f ? 'наигралась' : 'наигрался'} — давай попозже ⚽`, `${n} has played enough — a bit later ⚽`)
      : m.why === 'max' ? L('На сегодня хватит — спасибо! 💗', 'That\'s enough for today — thank you! 💗')
      : m.why === 'away' ? L(`${n} сейчас не на льдине — подожди 🌊`, `${n} is not on the ice right now — wait a bit 🌊`) : L('Сейчас заняты — чуть позже 🙂', 'Busy right now — a bit later 🙂'), 2800);
    return;
  }
  if(m.k === 'fish') await vsFish(V.me, V.pup); else await vsBall(V.me, V.pup);
  if(V && !V.thx){ V.thx = true; addShells(2, toScreen(headTop(V.me))); floatText(L('Спасибо за помощь!', 'Thanks for helping!'), headTop(V.me), '#D9527E'); }
}
function vsGuestTick(dt){
  const v = V; if(!v.view) return;
  v.cd -= dt; v.fxCd -= dt;
  const me = v.me, h = v.h;
  // малыш хозяйки — там, где у неё
  if(h){
    const vis = !!h.v, P = v.pup;
    v.hp.set(+h.x || 0, +h.y || 0.25, +h.z || 0.2);
    if(vis && !P.root.visible) P.root.position.copy(vsW(v.hp));
    P.root.visible = vis; v.hv = vis;
    P.root.position.lerp(vsW(v.hp), Math.min(1, dt*8)); P.root.rotation.y += vsAng(P.root.rotation.y, +h.r || 0)*Math.min(1, dt*8);
    if(+h.sc) P.root.scale.setScalar(+h.sc);
    const md = h.w === 'sleep' ? 'sleep' : h.md ? 'happy' : 'ok';
    if(P.md !== md){ P.md = md; setMood(P, md); }
    if(md === 'sleep' && (v.zT = (v.zT || 0) - dt) < 0){ v.zT = 1.2; floatText('z', worldOf(P, new V3(0.85, 0.35, 0.3)), '#8E99C9'); }
    if(v.w !== h.w){ v.w = h.w; vsGuestSay(); }
  }
  updateSeal(v.pup, now, dt);
  // свой тюлень: приплывает, запрыгивает, ходит
  if(v.arr === 'swim'){
    const d = VS_EDGE.clone().sub(v.pos), l = d.length();
    if(l < 0.08){ v.arr = 'hop'; v.arrK = 0; v.yaw = 0; }
    else { v.pos.addScaledVector(d, Math.min(l, 2.6*dt)/l); v.yaw = Math.atan2(d.x, d.z); }
  } else if(v.arr === 'hop'){
    v.arrK = Math.min(1, v.arrK + dt/0.75);
    v.pos.lerpVectors(VS_EDGE, VS_SPOT, v.arrK); v.pos.y += Math.sin(v.arrK*Math.PI)*1.2;
    if(v.arrK >= 1){ v.arr = null; v.sw = false; me.swimming = false; me.inner.position.y = 0; sfx.thud(); squash(me, 0.2, 0.35); burst(TEX.puff, vsW(v.pos).setY(0.3), 8, 1.4, 0.4); }
  } else if(v.tgt){
    const d = v.tgt.clone().sub(v.pos); d.y = 0; const l = d.length();
    if(l > 0.05){ v.pos.addScaledVector(d, Math.min(l, 1.7*dt)/l); v.yaw = Math.atan2(d.x, d.z); v.walkT += dt; }
    else v.tgt = null;
  }
  const walking = !v.arr && !!v.tgt;
  v.hy = walking ? Math.abs(Math.sin(v.walkT*9))*0.12 : 0;
  if(!walking && !v.arr && !v.sw){ const look = v.hv ? Math.atan2(v.hp.x - v.pos.x, v.hp.z - v.pos.z)*0.5 : 0; v.yaw += vsAng(v.yaw, look)*Math.min(1, dt*3); }   // стоит — повернулся к малышу и к нам
  me.root.position.copy(vsW(v.pos)); me.inner.position.y = v.sw ? Math.sin(now*4)*0.06 : v.hy;
  me.root.rotation.y += vsAng(me.root.rotation.y, v.yaw)*Math.min(1, dt*8);
  me.flap = walking || v.arr ? 0.4 : 0;
  updateSeal(me, now, dt);
  // камера — как в уголке у хозяйки
  const off = vsView(); runCam.pos.lerp(camBase.clone().add(off), Math.min(1, dt*2)); runCam.look.lerp(camTarget.clone().add(off), Math.min(1, dt*2));
  if((v.sendT -= dt) <= 0){
    v.sendT = 0.125; const r = x => Math.round(x*100)/100;
    netSend({t:'vp', x:r(v.pos.x), y:r(v.pos.y), z:r(v.pos.z), r:r(me.root.rotation.y), sw:v.sw ? 1 : 0, h:r(v.hy)});
  }
}
function vsGuestSay(){   // где хозяйка: на льдине, в домике, в больнице, в игре, малыш спит
  const n = V.name, w = V.w;
  const say = w === 'home' ? L(`${n} в домике 🏠 Подожди — скоро выйдут`, `${n} is in the igloo 🏠 Wait — they will come out soon`)
    : w === 'away' ? L('Все ушли в больницу 🏥 Подожди на льдине 🌊', 'Everyone went to the hospital 🏥 Wait on the ice 🌊')
    : w === 'game' ? L('Там играют… Скоро вернутся 🎮', 'They are playing… Back soon 🎮')
    : w === 'sleep' ? L(`${n} спит 💤 Тсс!`, `${n} is asleep 💤 Shh!`) : '';
  if(say) mgHint(say); else if(V.said) mgHint('');
  V.said = say;
}

/* ---------- угощение и мяч: одинаково у обоих ---------- */
async function vsFish(vis, pup){
  const f = makeFish(); f.scale.setScalar(0.5); scene.add(f);
  sfx.whoosh();
  await tween(0.75, k => { const a = headTop(vis), c = worldOf(pup, new V3(0, 0.1, 0.7)); f.position.lerpVectors(a, c, k); f.position.y += Math.sin(k*Math.PI)*1.0; f.rotation.z = k*Math.PI*2; }, ease.lin);
  scene.remove(f);
  sfx.chomp(); setTimeout(() => sfx.chomp(), 180);
  floatText(L('Ням!', 'Nom!'), headTop(pup), '#D9527E'); burst(TEX.heart, headTop(pup), 6, 1.4, 0.26); squash(pup, 0.15, 0.3);
}
let vsBallM = null;
async function vsBall(vis, pup){
  if(!vsBallM){ const m = toon(0xFFFFFF); m.map = BALL_TEX; vsBallM = addOutline(new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), m), 1.07); }
  const b = vsBallM; scene.add(b);
  const top = s => headTop(s).add(new V3(0, 0.1, 0));
  for(let i = 0; i < 4; i++){
    const A = i % 2 ? pup : vis, B = i % 2 ? vis : pup;
    await tween(0.8, k => { b.position.lerpVectors(top(A), top(B), k); b.position.y += Math.sin(k*Math.PI)*1.1; b.rotation.z -= 0.15; }, ease.lin);
    sfx.boing(); squash(B, 0.14, 0.3);
  }
  scene.remove(b);
  burst(TEX.heart, top(pup), 8, 1.6, 0.28); floatText(L('Ура!', 'Yay!'), top(pup), '#D9527E'); sfx.giggle();
}

/* ---------- вкладка 🏝️ в «Вместе» (js/coop.js) ---------- */
if(typeof CO_GAMES !== 'undefined') CO_GAMES.visit = {ic:'🏝️', name:() => L('В гости', 'Visit'),
  say:() => L('Позови к себе на льдину — или поплыви в гости сам! Там вместе ухаживаете за малышом и оттуда выбираете игру.', 'Invite someone to your ice floe — or go visiting yourself! Look after the pup together and pick a game from there.'),
  wins:() => save.coop.visit.n ? `🏝️ ${L(`Встреч в гостях: ${save.coop.visit.n}`, `Visits: ${save.coop.visit.n}`)}` : '',
  picks:() => `${save.pet ? `<button data-k="vhost" class="wide"><span class="ic">🏝️</span><b>${L('Позвать к себе', 'Invite over')}</b><small>${L('на льдину к малышу', 'to your pup\'s ice floe')}</small></button>` : ''}
    <button data-k="vjoin" class="wide"><span class="ic">⛵</span><b>${L('Поплыть в гости', 'Go visiting')}</b><small>${L('у меня есть код', 'I have a code')}</small></button>`};
