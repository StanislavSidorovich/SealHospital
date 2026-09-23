/* ---------------- state ---------------- */
let S = null, busy = false, started = false;

/* ---------------- UI ---------------- */
let toastTimer = 0;
function toast(msg, ms = 2600){
  const el = $('#toast'); el.textContent = msg; el.hidden = false;
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.hidden = true, ms);
}
function buildTools(){
  const nav = $('#tools'); nav.innerHTML = '';
  for(const k of ORDER){
    const b = document.createElement('button'); b.className = 'tool'; b.dataset.tool = k; b.id = 'tool-' + k;
    b.innerHTML = `<span class="face" aria-hidden="true">${TOOLS[k].icon}</span><span class="name">${TOOLS[k].name}</span>`;
    b.addEventListener('click', () => { sfx.tap(); useTool(k); });
    nav.appendChild(b);
  }
}
function renderCard(){
  if(!S) return;
  $('#pNo').textContent = save.album.length + 1;
  $('#pName').textContent = S.p.name;
  $('#pText').textContent = S.p.text;
  const ul = $('#pNeeds'); ul.innerHTML = '';
  if(S.stage === 'arriving' || S.stage === 'diagnose'){   // осмотр: симптомы открываются по мере находок лупой
    for(const a of S.p.ail){
      const li = document.createElement('li'), found = S.found.has(a);
      li.className = found ? 'found' : 'lock';
      li.innerHTML = found ? `<span class="ic" aria-hidden="true">${SYMPTOMS[a].ic}</span><span class="lbl">${SYMPTOMS[a].name(S.p.f)}</span>`
        : '<span class="ic" aria-hidden="true">🔍</span><span class="lbl">???</span>';
      ul.appendChild(li);
    }
    return;
  }
  for(const n of S.needs){
    const li = document.createElement('li'); if(S.done.has(n)) li.className = 'done';
    li.innerHTML = `<span class="ic" aria-hidden="true">${TOOLS[n].icon}</span><span class="lbl">${TOOLS[n].task}</span>`;
    ul.appendChild(li);
  }
  const li = document.createElement('li');
  const hugNow = S.stage === 'hug', hugDone = S.stage === 'cured';
  if(hugNow){
    const b = document.createElement('button'); b.className = 'now'; b.id = 'hugBtn';
    b.innerHTML = '<span class="ic" aria-hidden="true">♡</span><span class="lbl">Обнять!</span>';
    b.addEventListener('click', hug); li.style.cssText = 'border:0;padding:0;background:none'; li.appendChild(b);
  } else {
    li.className = hugDone ? 'done' : 'lock';
    li.innerHTML = '<span class="ic" aria-hidden="true">♡</span><span class="lbl">Обнять</span>';
  }
  ul.appendChild(li);
  document.querySelectorAll('.tool').forEach(b => b.classList.toggle('used', S.done.has(b.dataset.tool)));
}
function setBusy(v){ busy = v; $('#tools').setAttribute('aria-busy', v ? 'true' : 'false'); }
// до трёх рыбок лежат сверху в ведре
const bucketFish = [];
function renderBucket(){
  const n = Math.min(3, save.fish);
  while(bucketFish.length < n){
    const i = bucketFish.length, f = makeFish(); f.scale.setScalar(0.45);
    f.rotation.set(0, (i - 1)*0.45, 0.35 - i*0.35); f.position.set((i - 1)*0.08, 0.25 + i*0.06, 0.04);   // боком к камере: видно глаз и хвост
    bucket.add(f); bucketFish.push(f);
  }
}
function renderAlbumCount(){ $('#albumCount').textContent = save.album.length; }
function openAlbum(){
  const grid = $('#albumGrid'); grid.innerHTML = '';
  $('#albumSub').textContent = save.album.length ? `Вылечено: ${save.album.length}` : '';
  if(!save.album.length) grid.innerHTML = '<p class="empty">Пока пусто. Вылечи первого пациента!</p>';
  for(const a of save.album.slice().reverse()){
    const f = document.createElement('figure');
    const img = document.createElement('img'); img.src = a.img; img.alt = a.name;
    const cap = document.createElement('figcaption'); cap.textContent = a.name;
    f.append(img, cap); grid.appendChild(f);
  }
  $('#album').hidden = false;
}

/* ---------------- game flow ---------------- */
function headTop(s){ return worldOf(s, new V3(0, 1.0, 0.2)); }
async function arrive(s){
  const r = s.root; r.position.set(-7.5, -0.55, 0.6); r.rotation.y = Math.PI/2; s.swimming = true; scene.add(r);
  await tween(1.8, k => { r.position.x = -7.5 + k*4.1; }, ease.out);
  sfx.splash(); burst(TEX.puff, new V3(-3.4, 0.1, 0.6), 10, 1.6, 0.45);
  s.swimming = false; s.inner.position.y = 0;
  await tween(0.75, k => { r.position.x = -3.4 + 3.4*k; r.position.y = -0.55 + 0.8*k + Math.sin(k*Math.PI)*1.3; }, ease.lin);
  r.position.set(0, 0.25, 0); await squash(s);
  await tween(0.45, k => { r.rotation.y = Math.PI/2*(1 - k); });
}
async function leave(s){
  const r = s.root; s.flap = 0.6;
  await tween(0.4, k => { r.rotation.y = k*Math.PI/2; });
  await tween(0.75, k => { r.position.x = 3.5*k; r.position.y = 0.25 - 0.8*k + Math.sin(k*Math.PI)*1.3; }, ease.lin);
  sfx.splash(); burst(TEX.puff, new V3(3.5, 0.1, 0), 10, 1.6, 0.45);
  s.swimming = true; s.flap = 0;
  await tween(1.4, k => { r.position.x = 3.5 + k*6; }, ease.io);
  scene.remove(r);
}
function squash(s, amt = 0.2, dur = 0.35){
  return tween(dur, k => { const q = Math.sin(k*Math.PI)*amt; s.inner.scale.set(1 + q*0.6, 1 - q, 1 + q*0.6); }, ease.lin);
}
async function hop(s, h = 0.3, dur = 0.4){
  await tween(dur, k => { s.inner.position.y = Math.sin(k*Math.PI)*h; }, ease.lin);
  s.inner.position.y = 0;
}
async function spawnPatient(){
  const p = patientFor(save.progress);
  const seal = makeSeal(p);
  S = {p, seal, needs:needsFor(p.ail), done:new Set(), found:new Set(), ail:Object.fromEntries(p.ail.map(a => [a, true])), stage:'arriving'};
  applyAilments(seal, S.ail); setMood(seal, 'sad');
  $('#card').hidden = false; renderCard();
  setBusy(true); await arrive(seal); setBusy(false);
  S.stage = 'diagnose'; renderCard();
  setBusy(true);
  await mgLupa(seal, p.ail, a => { S.found.add(a); renderCard(); });
  unfocusCam(); setBusy(false);
  S.stage = 'treat'; renderCard();
  toast('Всё нашла! Теперь лечи — выбирай внизу');
}

const TREAT = {
  thermo: s => mgThermo(s),
  async medicine(s){
    await mgMedicine(s);
    floatText('Ам!', headTop(s)); burst(TEX.star, headTop(s), 8, 1.8, 0.3); sfx.pop();
    S.ail.fever = false; S.ail.sneeze = false; applyAilments(s, S.ail);
  },
  async bandage(s){
    await mgBandage(s);
    S.ail.scratch = false; applyAilments(s, S.ail); floatText('Не больно!', headTop(s));
  },
  async fish(s){
    await mgFishing(s);
    for(let i = 0; i < 2; i++){ sfx.chomp(); await tween(0.2, k => { s.head.scale.set(1, 1 - Math.sin(k*Math.PI)*0.1, 1); }, ease.lin); }
    s.head.scale.set(1, 1, 1);
    S.ail.hungry = false; applyAilments(s, S.ail); floatText('Ням!', headTop(s));
  },
  async scarf(s){
    await mgScarf(s);
    S.ail.cold = false; applyAilments(s, S.ail); floatText('Тепло!', headTop(s));
  }
};
async function wrong(s, msg){
  sfx.bad(); toast(msg); setBusy(true);
  floatText('?', headTop(s));
  await tween(0.7, k => { s.shake = Math.sin(k*Math.PI*4)*0.4*(1 - k); }, ease.lin); s.shake = 0;
  setBusy(false);
}
async function useTool(k){
  if(!S || S.stage !== 'treat' || busy) {
    if(S && S.stage === 'hug') toast('Лечение закончено. Теперь обними пациента: нажми на тюленя!');
    return;
  }
  const s = S.seal;
  if(S.done.has(k)) return toast('Это уже сделано!');
  if(!S.needs.includes(k)){
    return wrong(s, k === 'thermo' ? 'Температуры нет, лоб холодный. Посмотри карту пациента!' : 'Этому пациенту это не нужно. Посмотри карту!');
  }
  if(k === 'medicine' && S.needs.includes('thermo') && !S.done.has('thermo')) return wrong(s, 'Сначала измерь температуру 🌡️');
  setBusy(true);
  await TREAT[k](s);
  unfocusCam();
  S.done.add(k); sfx.good(); hop(s);
  if(S.done.size === S.needs.length){
    S.stage = 'hug'; setMood(s, 'ok');
    await wait(0.5); sfx.arf();
    toast(`${S.p.name} ${S.p.f ? 'здорова' : 'здоров'}! Осталось обнять — нажми на тюленя ♡`, 3600);
  }
  renderCard(); setBusy(false);
}
async function hug(){
  if(!S || S.stage !== 'hug' || busy) return;
  const s = S.seal; setBusy(true); S.stage = 'cured'; renderCard();
  setMood(s, 'happy'); sfx.hug(); s.flap = 1;
  burst(TEX.heart, headTop(s), 18, 2.4, 0.38);
  await tween(0.9, k => { s.inner.position.y = Math.sin(k*Math.PI)*1.1; s.inner.rotation.y = k*Math.PI*2; }, ease.io);
  s.inner.position.y = 0; s.inner.rotation.y = 0;
  sfx.arf(); await squash(s, 0.25);
  burst(TEX.heart, headTop(s), 10, 2, 0.32);
  await wait(0.45);
  const img = snapshot();
  save.album.push({name:s.p.name, img, d:Date.now(), scarf:S.scarf}); if(save.album.length > 40) save.album = save.album.slice(-40);
  save.progress++; persist();
  renderAlbumCount();
  s.flap = 0.35;
  $('#curedImg').src = img;
  $('#curedTitle').textContent = `${s.p.name} ${s.p.f ? 'здорова' : 'здоров'}!`;
  $('#curedThanks').textContent = `${s.p.name}: «Спасибо, доктор Сабрина!»`;
  $('#cured').hidden = false; setBusy(false);
}
async function nextPatient(){
  $('#cured').hidden = true;
  if(!S || busy) return;
  setBusy(true); const old = S.seal;
  await leave(old);
  await spawnPatient();
}
function snapshot(){
  renderer.render(scene, camera);
  const src = renderer.domElement, W = src.width, H = src.height;
  const c = S.seal.root.position;
  const p1 = new V3(c.x, 1.25, c.z).project(camera), p2 = new V3(c.x + 1.75, 1.25, c.z).project(camera);
  const cx = (p1.x + 1)/2*W, cy = (1 - p1.y)/2*H, r = Math.abs(p2.x - p1.x)/2*W;
  const out = document.createElement('canvas'); out.width = out.height = 200;
  const g = out.getContext('2d'), grd = g.createLinearGradient(0, 0, 0, 200);
  grd.addColorStop(0, '#C6E8F5'); grd.addColorStop(1, '#F2FAFD'); g.fillStyle = grd; g.fillRect(0, 0, 200, 200);
  try{ g.drawImage(src, cx - r, cy - r*1.05, 2*r, 2*r, 0, 0, 200, 200); return out.toDataURL('image/jpeg', 0.82); }
  catch(e){ return out.toDataURL('image/jpeg', 0.8); }
}

/* ---------------- input ---------------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
canvas.addEventListener('pointerdown', e => {
  if(!S || busy) return;
  const rect = canvas.getBoundingClientRect();
  ndc.set((e.clientX - rect.left)/rect.width*2 - 1, -((e.clientY - rect.top)/rect.height)*2 + 1);
  ray.setFromCamera(ndc, camera);
  if(!ray.intersectObjects(S.seal.hits, false).length) return;
  if(S.stage === 'hug') return hug();
  if(S.stage === 'treat'){
    const s = S.seal; sfx.arf();
    floatText(['Ар!','Ур-р','Хи-хи','Ар-ар!'][Math.floor(Math.random()*4)], headTop(s));
    squash(s, 0.15, 0.3);
  }
});
$('#btnSound').addEventListener('click', () => { save.muted = !save.muted; persist(); renderMute(); if(!save.muted) sfx.tap(); });
$('#btnAlbum').addEventListener('click', () => { sfx.tap(); openAlbum(); });
$('#btnCuredAlbum').addEventListener('click', () => { sfx.tap(); $('#cured').hidden = true; openAlbum(); });
$('#btnAlbumClose').addEventListener('click', () => {
  sfx.tap(); $('#album').hidden = true;
  if(S && S.stage === 'cured') $('#cured').hidden = false;
});
$('#btnNext').addEventListener('click', () => { sfx.tap(); nextPatient(); });
$('#btnStart').addEventListener('click', async () => {
  ac(); sfx.good(); $('#intro').hidden = true;
  if(started) return; started = true;
  $('#tools').hidden = false;
  try{ await document.fonts.load('40px Pangolin'); }catch(e){}
  spawnPatient();
});

/* ---------------- camera & loop ---------------- */
const camBase = new V3(), camTarget = new V3();
// Приближение для мини-игр: камера плавно наезжает на center так, чтобы влез предмет размером size.
// lift > 0 поднимает предмет выше середины экрана (когда внизу панель мини-игры).
const camFocus = {k:0, want:0, center:new V3(), size:3, lift:0};
function focusCam(center, size = 3, lift = 0){ camFocus.center.copy(center); camFocus.size = size; camFocus.lift = lift; camFocus.want = 1; }
function unfocusCam(){ camFocus.want = 0; }
const _camPos = new V3(), _camLook = new V3(), _focusLook = new V3();
function resize(){
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false); camera.aspect = w/h; camera.updateProjectionMatrix();
  const portrait = w < h, tv = Math.tan(THREE.MathUtils.degToRad(camera.fov)/2), th = tv*camera.aspect;
  const d = Math.max((portrait ? 4.3 : 7.5)/2/th, (portrait ? 7 : 5.6)/2/tv);
  camBase.set(0, 1.2 + d*0.3, d); camTarget.set(0, portrait ? 1.7 : 1.3, 0);
}
window.addEventListener('resize', resize); resize();

let last = performance.now(), t = 0;
const TEST = /test/.test(location.search);
const DT_CAP = TEST ? 5 : 0.05;
function loop(ts){ frame(ts); requestAnimationFrame(loop); }
function frame(ts){
  const dt = Math.min(DT_CAP, Math.max(0, ts - last)/1000); last = ts; t += dt; now = t;
  updateTweens();
  updateWater(t);
  mgTicks.forEach(f => f(dt));
  const sway = reduced ? 0 : 1;
  _camPos.set(camBase.x + Math.sin(t*0.25)*0.3*sway, camBase.y + Math.sin(t*0.4)*0.06*sway, camBase.z);
  _camLook.copy(camTarget);
  camFocus.k += (camFocus.want - camFocus.k)*Math.min(1, dt*3.5);
  if(camFocus.k > 0.001){
    const tv = Math.tan(THREE.MathUtils.degToRad(camera.fov)/2), fd = Math.max(camFocus.size/2/(tv*camera.aspect), camFocus.size/2/tv);
    _focusLook.copy(camFocus.center); _focusLook.y -= camFocus.lift;
    const k = ease.io(camFocus.k);
    _camLook.lerp(_focusLook, k);
    _camPos.lerp(_focusLook.clone().add(new V3(0, fd*0.35, fd)), k);
  }
  camera.position.copy(_camPos);
  camera.lookAt(_camLook);
  for(let i = 0; i < SN; i++){
    snowPos[i*3+1] -= dt*(0.35 + (i % 5)*0.08); snowPos[i*3] += Math.sin(t + i)*dt*0.12;
    if(snowPos[i*3+1] < -0.2) snowPos[i*3+1] = 12;
  }
  snowGeo.attributes.position.needsUpdate = true;
  chunks.forEach((c, i) => { c.position.y = 0.05 + Math.sin(t*1.2 + i)*0.05; c.rotation.y += dt*0.05; });

  if(S){
    const s = S.seal; updateSeal(s, t, dt);
    if(S.stage === 'treat' && !busy){
      if(S.ail.sneeze){
        s.sneezeT -= dt;
        if(s.sneezeT < 0){
          s.sneezeT = 4.5 + Math.random()*2;
          tween(0.35, k => s.sneezeNod = -0.22*k).then(() => {
            sfx.sneeze(); const nz = worldOf(s, s.noseLocal);
            for(let i = 0; i < 6; i++) emit(TEX.puff, nz, {v:new V3((Math.random()-0.5)*1.2, Math.random()*0.6, 1 + Math.random()), life:0.8, size:0.35, grow:1.5});
            floatText('Апчхи!', headTop(s));
            return tween(0.15, k => s.sneezeNod = -0.22 + 0.55*k);
          }).then(() => tween(0.4, k => s.sneezeNod = 0.33*(1 - k)));
        }
      }
      if(S.ail.hungry){
        s.rumbleT -= dt;
        if(s.rumbleT < 0){ s.rumbleT = 5 + Math.random()*2; floatText('урр...', worldOf(s, new V3(0.9, -0.9, 0.3)), '#6B6A7E');
          tween(0.6, k => s.wobble = Math.sin(k*Math.PI*5)*0.04*(1 - k), ease.lin); }
      }
    }
  }
  updateParts(dt);
  renderer.render(scene, camera);
}

buildTools(); renderMute(); renderAlbumCount(); renderBucket();
if(save.album.length){ const st = $('#introStat'); st.textContent = `Ты уже вылечила пациентов: ${save.album.length}`; st.hidden = false; $('#btnStart').textContent = 'Продолжить приём'; }
requestAnimationFrame(loop);
// ?test=1: скрытая вкладка почти не даёт кадров, поэтому подталкиваем кадры таймером
if(TEST) setInterval(() => { if(performance.now() - last > 120) frame(performance.now()); }, 60);
