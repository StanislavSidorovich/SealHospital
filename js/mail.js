/* ---------------- Папина почта (Фаза 7) ----------------
   Каждый день — одно новое письмо из LETTERS (js/letters.js), по порядку списка.
   Почтовый ящик стоит на льдине больницы: пришло письмо — флажок поднят, над ящиком качается конверт,
   на кнопке 💌 в углу горит «1». В уголке малыш сам приносит письмо в зубах.
   Конверт открывается касанием, иногда внутри подарок (ракушки, сердечко малышу, особая вещь).
   Прочитанные письма живут в «Шкатулке писем» — их можно перечитать.
   Подключается после walk.js и до game.js. */
const MAIL = typeof LETTERS !== 'undefined' && Array.isArray(LETTERS) ? LETTERS.filter(l => l && typeof l.text === 'string' && l.text.trim()) : [];
const MAIL_LATE = 7;   // письмо с датой ещё приходит столько дней после неё (если в тот день не играли), потом — уже нет
const ymd = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const letterId = l => 'L' + codeSum(l.text.trim());   // письмо узнаём по тексту
const mailHas = id => save.mail.got.some(x => x.id === id);
const letterText = l => l.text.trim().replace(/\{pet\}/g, save.pet ? save.pet.name : 'твой малыш');
const dayGap = (a, b) => Math.round((new Date(a) - new Date(b))/864e5);
// какое письмо ждёт сегодня: сначала письмо ровно на сегодня, потом праздничное, которое чуть опоздало,
// потом обычное — но обычное только одно в день
function mailNext(){
  const today = ymd(), fresh = MAIL.filter(l => !mailHas(letterId(l)));
  const dated = fresh.filter(l => typeof l.date === 'string' && l.date <= today && dayGap(today, l.date) <= MAIL_LATE);
  return dated.find(l => l.date === today) || (save.mail.d === today ? null : dated[0] || fresh.find(l => !l.date) || null);
}
let mailWaiting = null;   // письмо, которое ждёт (пересчитываем раз в пару секунд: день может смениться)
function mailRefresh(){ mailWaiting = mailNext(); renderMailBtn(); }

/* ---------- конверт: картинка для 3D (над ящиком и в зубах у малыша) ---------- */
const ENVELOPE_TEX = canvasTex(128, (g, w, h) => {
  g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = '#3B3A4A';
  g.beginPath(); g.roundRect ? g.roundRect(8, 26, 112, 76, 10) : g.rect(8, 26, 112, 76); g.fillStyle = '#FFF7F2'; g.fill(); g.stroke();
  g.beginPath(); g.moveTo(12, 30); g.lineTo(64, 70); g.lineTo(116, 30); g.fillStyle = '#FFD2DF'; g.fill(); g.stroke();
  heartPath(g, 30, 49, 52); g.fillStyle = '#FF6F95'; g.fill(); g.lineWidth = 3.5; g.stroke();
});
function makeEnvelope(){
  const sp = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({map:ENVELOPE_TEX, transparent:true, side:THREE.DoubleSide, depthWrite:false}));
  return sp;
}

/* ---------- почтовый ящик на льдине больницы ---------- */
const MAILBOX_POS = new V3(-1.8, 0.25, 0.4);   // слева от пациента, перед лункой: видно и на узком телефоне
const mailbox = new THREE.Group(); mailbox.position.copy(MAILBOX_POS); mailbox.rotation.y = 0.55; scene.add(mailbox);
{ const post = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.72, 10), toon(0xE0A36B)), 1.15); post.position.y = 0.36; mailbox.add(post);
  const body = new THREE.Group(); body.position.y = 0.84; mailbox.add(body); mailbox.userData.body = body;
  const m = toon(0xFF9BB8);
  body.add(addOutline(new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.24, 0.58), m), 1.05));
  const top = addOutline(new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.58, 22, 1, false, -Math.PI/2, Math.PI), m), 1.05);
  top.rotation.x = -Math.PI/2; top.position.y = 0.12; body.add(top);
  // дверца спереди: светлый полукруг с сердечком
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.2), toon(0xFFE3EC)); door.position.set(0, -0.01, 0.296); body.add(door);
  const dtop = new THREE.Mesh(new THREE.CircleGeometry(0.17, 20, 0, Math.PI), toon(0xFFE3EC)); dtop.position.set(0, 0.09, 0.296); body.add(dtop);
  const h = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshBasicMaterial({map:TEX.heart, transparent:true, depthWrite:false}));
  h.position.set(0, 0.06, 0.3); body.add(h);
  // флажок сбоку: поднят — есть письмо
  const pivot = new THREE.Group(); pivot.position.set(0.25, -0.02, 0.12); body.add(pivot);
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.34, 0.03), inkMat); pole.position.y = 0.17; pivot.add(pole);
  const flag = addOutline(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, 0.17), toon(0xFFD66B)), 1.12); flag.position.set(0, 0.28, -0.08); pivot.add(flag);
  pivot.rotation.x = -Math.PI/2; mailbox.userData.flag = pivot;
  // по ящику легко попасть пальцем: невидимый шар побольше
  const hit = new THREE.Mesh(new THREE.SphereGeometry(0.62, 12, 8), new THREE.MeshBasicMaterial()); hit.visible = false; hit.position.y = 0.75; mailbox.add(hit);
  mailbox.userData.hit = hit;
  const env = makeEnvelope(); env.scale.setScalar(0.62); env.position.set(0, 1.55, 0); mailbox.add(env); mailbox.userData.env = env;
}

/* ---------- кнопка 💌 в углу ---------- */
function renderMailBtn(){
  $('#mailIc').textContent = mailWaiting ? '💌' : '✉️';
  $('#mailAlert').hidden = !mailWaiting;
  $('#btnMail').setAttribute('aria-label', mailWaiting ? 'Тебе письмо!' : 'Шкатулка писем');
  $('#introMail').hidden = !mailWaiting;
}

/* ---------- окно почты: конверт → письмо → подарок; шкатулка ---------- */
let mailOpen = false, mailCur = null;   // mailCur = {l, gift, got, fromBox}
const mailEl = $('#mail'), envEl = $('#envelope');
function mailShow(part){   // 'env' | 'read' | 'box'
  mailOpen = true; mailEl.hidden = false;
  envEl.hidden = $('#envHint').hidden = part !== 'env';
  $('#mailRead').hidden = part !== 'read';
  $('#mailBox').hidden = part !== 'box';
}
function mailClose(){ mailOpen = false; mailEl.hidden = true; mailCur = null; }
function openMail(){
  if(busy || !mgRoot.hidden) return toast('Сначала закончи то, что начала, потом почитай письмо 💌');
  mailRefresh();
  if(mailWaiting) mailEnvelope(mailWaiting); else mailBox();
}
function mailEnvelope(l){
  sfx.letter();
  mailCur = {l, gift:l.gift || null, got:false, fromBox:false};
  envEl.classList.remove('open'); mailShow('env');
}
function mailTear(){
  if(!mailCur || envEl.classList.contains('open')) return;
  const l = mailCur.l, special = l.date === ymd();
  envEl.classList.add('open'); sfx.paper();
  // письмо получено, как только конверт открыт (даже если окно закроют, не дочитав)
  save.mail.got.push({id:letterId(l), t:Date.now()});
  if(!special) save.mail.d = ymd();   // письмо на особый день не занимает место «письма дня»
  persist(); mailRefresh();
  setTimeout(() => { sfx.star(); mailRead(l, Date.now()); }, reduced ? 100 : 900);
}
function mailRead(l, t){
  $('#mailText').textContent = letterText(l);
  $('#mailSig').textContent = `— ${l.from || 'Dad'} ♡`;
  const d = new Date(t); $('#mailDate').textContent = `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  const gift = mailCur && mailCur.gift && !mailCur.got;
  $('#mailGift').hidden = !gift; $('#mailGot').hidden = true;
  $('#btnMailOk').textContent = mailCur && mailCur.fromBox ? '← К шкатулке' : 'Спрятать в шкатулку ♡';
  mailShow('read');
}
// подарок в конверте: ракушки, сердечко дружбы малышу или особая вещь (её нет в лавке)
function mailGiftOpen(){
  if(!mailCur || !mailCur.gift || mailCur.got) return;
  mailCur.got = true;
  const g = mailCur.gift, b = $('#mailGift').getBoundingClientRect(), at = {x:b.left + b.width/2, y:b.top + b.height/2};
  const got = $('#mailGot'); let html = '';
  const shells = n => { addShells(n, at); html = `+${n} 🐚`; };
  if(g.wear && shopItem(g.wear) && !owns(g.wear)){
    save.owned.push(g.wear); persist(); sfx.buy();
    html = `<img src="${thumb(g.wear)}" alt=""><span>${shopItem(g.wear).name}!<small>Надевай пациентам и малышу 🎀</small></span>`;
    if(S && S.stage === 'hug' && !petMode && showWardrobe(S.seal)) $('#tools').hidden = true;   // обновка сразу в гардеробе
  }
  else if(g.hearts && save.pet){
    const n = Math.max(1, Math.round(g.hearts));
    save.pet.xp += n*HEART_XP; persist(); sfx.hug(); renderPetCard(); renderPetBtn();
    html = `+${n} 💗 <small>${save.pet.name} ${gg('рад', 'рада')}!</small>`;
  }
  else shells(Math.round(g.shells) || (g.hearts ? 10*g.hearts : 10));   // вещь уже есть или малыша ещё нет — ракушки
  $('#mailGift').hidden = true; got.innerHTML = html; got.hidden = false;
  burstDom(at);
}
// звёздочки из подарка (поверх окна, обычный DOM)
function burstDom(at){
  if(reduced) return;
  for(let i = 0; i < 10; i++){
    const el = document.createElement('div'); el.className = 'fly-star'; el.textContent = ['✨', '⭐', '💗'][i % 3];
    el.style.left = at.x + 'px'; el.style.top = at.y + 'px'; $('#app').appendChild(el);
    const a = Math.random()*Math.PI*2, r = 60 + Math.random()*70;
    requestAnimationFrame(() => { el.style.translate = `calc(-50% + ${Math.cos(a)*r}px) calc(-50% + ${Math.sin(a)*r - 40}px)`; el.style.opacity = '0'; });
    setTimeout(() => el.remove(), 900);
  }
}
function mailDone(){
  sfx.tap();
  if(mailCur && mailCur.gift && !mailCur.got) mailGiftOpen();   // подарок не потеряется
  if(mailCur && mailCur.fromBox) return mailBox();
  const first = save.mail.got.length === 1;
  mailClose(); updateMailbox();
  toast(first ? 'Письмо лежит в шкатулке ✉️ Перечитать можно в любой момент' : 'Письмо в шкатулке ✉️', 2800);
}
function mailBox(){
  sfx.tap(); mailCur = null;
  const grid = $('#boxGrid'); grid.innerHTML = '';
  const list = save.mail.got.map(x => ({x, l:MAIL.find(l => letterId(l) === x.id)})).filter(e => e.l).sort((a, b) => b.x.t - a.x.t);   // новые сверху
  $('#boxSub').textContent = list.length ? `Писем от папы: ${list.length}` : '';
  if(!list.length) grid.insertAdjacentHTML('beforeend', '<p class="empty">Здесь будут жить папины письма ♡</p>');
  for(const {x, l} of list){
    const b = document.createElement('button'), d = new Date(x.t);
    b.className = 'box-item';
    b.innerHTML = `<span class="ic" aria-hidden="true">💌</span><span class="t"></span><small>${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}</small>`;
    b.querySelector('.t').textContent = letterText(l);
    b.addEventListener('click', () => { sfx.paper(); mailCur = {l, gift:null, got:true, fromBox:true}; mailRead(l, x.t); });
    grid.appendChild(b);
  }
  mailRefresh();
  const more = MAIL.some(l => !mailHas(letterId(l)));
  $('#boxNext').textContent = mailWaiting ? '' : more ? 'Новое письмо придёт завтра ✉️' : 'Папа скоро напишет ещё ♡';
  $('#btnBoxNew').hidden = !mailWaiting;
  mailShow('box');
}

/* ---------- ящик: касание по нему; малыш с письмом в зубах ---------- */
canvas.addEventListener('pointerdown', e => {
  if(petMode || busy || mailOpen || !mgRoot.hidden || document.querySelector('.overlay:not([hidden])')) return;
  const rect = canvas.getBoundingClientRect();
  ndc.set((e.clientX - rect.left)/rect.width*2 - 1, -((e.clientY - rect.top)/rect.height)*2 + 1);
  ray.setFromCamera(ndc, camera);
  if(!ray.intersectObject(mailbox.userData.hit, false).length) return;
  sfx.tap(); openMail();
});
// касание малыша, у которого в зубах письмо (зовёт petTap в pet.js): «Это тебе!»
function petLetterTap(){
  const env = petSeal && petSeal.letter;
  if(!env || !env.visible) return false;
  setBusy(true); sfx.arf(); floatText('Это тебе!', headTop(petSeal), '#D9527E'); squash(petSeal, 0.15, 0.3);
  wait(0.5).then(() => { env.visible = false; setBusy(false); openMail(); });
  return true;
}
let mailT = 0, carryT = -1, carrySaid = false;
function updateMailbox(){
  const on = !!mailWaiting;
  mailbox.userData.env.visible = on;
  mailbox.userData.wantFlag = on ? 0 : -Math.PI/2;
}
function mailTick(t, dt){
  mailT -= dt;
  if(mailT < 0){ mailT = 2; mailRefresh(); updateMailbox(); }
  const u = mailbox.userData, f = u.flag;
  f.rotation.x += ((u.wantFlag || 0) - f.rotation.x)*Math.min(1, dt*5);
  if(u.env.visible){ u.env.position.y = 1.55 + Math.sin(t*2.4)*0.08; u.env.rotation.z = Math.sin(t*1.7)*0.15; u.env.rotation.y = -mailbox.rotation.y; }
  // малыш держит письмо в зубах, пока его не взяли
  if(!petSeal) return;
  if(!petSeal.letter){
    const env = makeEnvelope(); env.scale.setScalar(0.42);
    onHead(env, 0, -0.42, 1, 0.06); env.rotateZ(0.25); petSeal.head.add(env); petSeal.letter = env;
  }
  const carry = petMode && !!mailWaiting && !busy && mgRoot.hidden && !petSeal.sleeping && !mailOpen;
  petSeal.letter.visible = carry;
  if(carry && !carrySaid){
    if(carryT < 0) carryT = t + 2.6;
    else if(t > carryT){ carrySaid = true; toast(`${save.pet.name} ${gg('принёс', 'принесла')} тебе письмо! Нажми ${gg('на него', 'на неё')} 💌`, 3600); }
  }
  if(!petMode) carryT = -1;
}

$('#btnMail').addEventListener('click', () => { sfx.tap(); openMail(); });
envEl.addEventListener('click', mailTear);
$('#mailGift').addEventListener('click', mailGiftOpen);
$('#btnMailOk').addEventListener('click', mailDone);
$('#btnBoxClose').addEventListener('click', () => { sfx.tap(); mailClose(); });
$('#btnBoxNew').addEventListener('click', () => { if(mailWaiting) mailEnvelope(mailWaiting); });
mailRefresh(); updateMailbox(); mailbox.userData.flag.rotation.x = mailbox.userData.wantFlag;
