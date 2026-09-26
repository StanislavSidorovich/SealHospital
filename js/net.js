/* ---------------- Сеть (Фаза 13): папа и Сабрина играют вместе из разных мест ----------------
   Телефоны соединяются напрямую (WebRTC) через библиотеку PeerJS (vendor/peerjs.min.js).
   Бесплатный сервер PeerJS только «знакомит» телефоны, дальше сообщения идут напрямую;
   если сети не пускают напрямую (разные роутеры, мобильный интернет) — через ретранслятор TURN.
   Свой TURN у PeerJS пропал (2026, серверы *.turn.peerjs.com больше не отвечают), поэтому TURN берём у Metered (аккаунт папы) — см. NET_TURN.
   Комната — код из трёх картинок (🐟🦀🐙): один создаёт, второй вводит. Чужих нет, текстового чата нет.
   По сети идут только ходы игры (маленькие JSON), сохранения у каждого свои.
   Голос: кнопка 🎤 (микрофон включается только по нажатию, эхо гасит браузер).
   Сеть работает на GitHub Pages и на localhost; в Artifact и с file:// режим «по сети» прячем.
   Подключается после neighbors.js и до boss.js. */
const NET_EMO = ['🐟', '🦀', '🐙', '🐳', '🐧', '⭐', '🍓', '🌈'];
const NET_PREFIX = 'sealhosp-v1-';
const netAvail = () => typeof Peer === 'function' && (location.protocol === 'https:' || /^(localhost|127\.)/.test(location.hostname))
  && window.top === window && !/claude|anthropic/.test(location.hostname);   // Artifact живёт во фрейме — там сеть не пускают
// Ретранслятор TURN от Metered (аккаунт папы, бесплатно 0,5 ГБ в месяц: ходы игры — крошки, голос — несколько часов).
// Логин и пароль — dashboard.metered.ca → TURN Server → TURN Credentials (папа решил держать их открыто, 25.09.2026).
// Пустой логин — только напрямую (STUN).
const NET_TURN = {user:'28869e4dbdec027198bc8687', pass:'i99j8h8y2lNNxuVq'};
const NET_STUN = [{urls:'stun:stun.l.google.com:19302'}, {urls:'stun:stun.cloudflare.com:3478'}, {urls:'stun:stun.relay.metered.ca:80'}];
const NET_ICE = NET_STUN.concat(NET_TURN.user ? [{
  urls:['turn:global.relay.metered.ca:80', 'turn:global.relay.metered.ca:80?transport=tcp', 'turn:global.relay.metered.ca:443', 'turns:global.relay.metered.ca:443?transport=tcp'],
  username:NET_TURN.user, credential:NET_TURN.pass}] : []);
const netPeer = id => Promise.resolve().then(() => { const o = {config:{iceServers:NET_ICE}}; return id ? new Peer(id, o) : new Peer(o); });
// keep — «Остров в гостях» (js/visit.js): игры в конце зовут netClose(), но соединение остаётся — после игры все снова на острове
const net = {gen:0, peer:null, conn:null, host:false, code:'', on:{}, lastIn:0, hb:null, mic:null, call:null, audio:null, lost:false, onLost:null, onBack:null, keep:false};

function netCodeText(code){ return [...code].map(d => NET_EMO[+d]).join(''); }
function netRandomCode(){ return [0, 1, 2].map(() => Math.floor(Math.random()*NET_EMO.length)).join(''); }
function netSend(m){ try{ if(net.conn && net.conn.open) net.conn.send(m); }catch(e){} }
function netOn(type, fn){ net.on[type] = fn; }
function netWire(conn){
  const old = net.conn;
  net.conn = conn; net.lastIn = performance.now();
  if(old && old !== conn) try{ old.close(); }catch(e){}   // переподключились — старую ниточку обрезаем
  conn.on('data', m => {
    if(net.conn !== conn) return;
    net.lastIn = performance.now();
    if(net.lost){ net.lost = false; netRecall(); if(net.onBack) net.onBack(); }
    if(m && m.t === 'hb') return;
    const f = m && net.on[m.t]; if(f) f(m);
  });
  conn.on('close', () => { if(net.conn === conn && !net.lost){ net.lost = true; if(net.onLost) net.onLost(); } });
  clearInterval(net.hb);
  let tick = 0;
  net.hb = setInterval(() => {
    netSend({t:'hb'});
    if(!net.lost && performance.now() - net.lastIn > 5000){ net.lost = true; if(net.onLost) net.onLost(); }
    if(net.lost && ++tick % 3 === 0) netRetry();   // связь пропала — каждые 3 с стучимся снова
  }, 1000);
  netRelayCheck(conn);
}
// переподключение с тем же кодом: гость стучится в ту же комнату, хозяин ждёт; оба возвращаются на сервер-«знакомщик»
function netRetry(){
  const p = net.peer; if(!p || p.destroyed) return;
  if(p.disconnected){ try{ p.reconnect(); }catch(e){} return; }
  if(net.host) return;
  const c = p.connect(NET_PREFIX + net.code, {reliable:true});
  c.on('open', () => { if(net.lost && net.conn !== c) netWire(c); else if(net.conn !== c) c.close(); });
}
// голос после переподключения: звонит гость со своим микрофоном; хозяин — если гость не позвонил сам
function netRecall(){
  if(!net.mic || !net.peer || !net.conn) return;
  const before = net.call;
  const call = () => {
    if(!net.mic || !netLive() || (net.host && net.call !== before)) return;
    if(net.call) try{ net.call.close(); }catch(e){}
    net.call = net.peer.call(net.conn.peer, net.mic); net.call.on('stream', netPlay);
  };
  if(net.host) setTimeout(call, 1500); else call();
}
// 🛰️ в углу — связь идёт через ретранслятор (тратит бесплатный лимит Metered), без значка — напрямую
function netRelayCheck(conn){
  const pc = conn.peerConnection; if(!pc || !pc.getStats) return;
  const look = () => pc.getStats().then(st => {
    if(net.conn !== conn) return;
    let pair = null;
    st.forEach(r => { if(r.type === 'transport' && r.selectedCandidatePairId) pair = st.get(r.selectedCandidatePairId); });
    if(!pair) st.forEach(r => { if(r.type === 'candidate-pair' && r.state === 'succeeded' && (r.nominated || r.selected)) pair = r; });
    const loc = pair && st.get(pair.localCandidateId), rem = pair && st.get(pair.remoteCandidateId);
    netSat(!!((loc && loc.candidateType === 'relay') || (rem && rem.candidateType === 'relay')));
  }).catch(() => {});
  look(); setTimeout(look, 4000);
}
function netSat(on){
  let el = document.getElementById('netSat');
  if(on && !el){ el = document.createElement('div'); el.id = 'netSat'; el.textContent = '🛰️'; el.title = L('Связь через ретранслятор', 'Connected via relay'); document.body.appendChild(el); }
  if(el) el.hidden = !on;
}
// создать комнату: ждём, пока подключится второй (cb(ok, why))
function netHost(cb){
  netClose(true); net.host = true;
  const gen = net.gen;
  const tryCode = async left => {
    const code = netRandomCode(), p = await netPeer(NET_PREFIX + code);
    if(gen !== net.gen){ p.destroy(); return; }   // пока ждали ретранслятор, ушли с экрана
    net.peer = p; net.code = code;
    p.on('open', () => cb('code', code));
    p.on('connection', c => {
      if(net.conn && net.conn.open && !net.lost){ c.close(); return; }   // в комнате только двое (но потерявшегося пускаем обратно)
      c.on('open', () => { const first = !net.conn; netWire(c); if(first) cb('joined'); });
    });
    p.on('call', call => netAnswer(call));
    p.on('error', e => {
      if(e.type === 'unavailable-id' && left > 0){ p.destroy(); return tryCode(left - 1); }   // такой код уже занят — берём другой
      if(!net.conn) cb('fail', e.type);
    });
  };
  tryCode(4);
}
// войти по коду
function netJoin(code, cb){
  netClose(true); net.host = false; net.code = code;
  const gen = net.gen;
  let done = false;
  const fail = why => { if(done) return; done = true; cb('fail', why); };   // после входа ошибки молчат — обрыв чинит netRetry
  netPeer().then(p => {
    if(gen !== net.gen){ p.destroy(); return; }
    net.peer = p;
    p.on('open', () => {
      const c = p.connect(NET_PREFIX + code, {reliable:true});
      c.on('open', () => { if(done) return; done = true; netWire(c); cb('joined'); });
      setTimeout(() => fail('timeout'), 15000);
    });
    p.on('call', call => netAnswer(call));
    p.on('error', e => fail(e.type));   // peer-unavailable — такой комнаты нет
  });
}
// force — закрыть по-настоящему; без него в гостях (net.keep) только снимаем обработчики игры, а ниточка остаётся
function netClose(force){
  if(net.keep && !force){ net.on = {}; net.onLost = net.onBack = null; return; }
  net.keep = false;
  net.gen++;
  clearInterval(net.hb); net.hb = null;
  netMicOff(true);
  try{ if(net.conn) net.conn.close(); }catch(e){}
  try{ if(net.peer) net.peer.destroy(); }catch(e){}
  net.peer = net.conn = null; net.on = {}; net.lost = false; net.onLost = net.onBack = null;
  netSat(false);
}
const netLive = () => !!(net.conn && net.conn.open && !net.lost);

/* ---------- голос: 🎤 включает свой микрофон и звонит второму; второй слышит и может включить свой ---------- */
function netPlay(stream){
  if(!net.audio){ net.audio = document.createElement('audio'); net.audio.autoplay = true; net.audio.playsInline = true; document.body.appendChild(net.audio); }
  net.audio.srcObject = stream; net.audio.play().catch(() => {});
}
function netAnswer(call){
  if(net.call && net.call !== call) try{ net.call.close(); }catch(e){}
  net.call = call;
  call.answer(net.mic || undefined);   // без своего микрофона — только слушаем
  call.on('stream', netPlay);
}
async function netMicOn(){
  if(net.mic) return true;
  try{ net.mic = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true, noiseSuppression:true, autoGainControl:true}}); }
  catch(e){ return false; }
  if(net.peer && net.conn){
    if(net.call) try{ net.call.close(); }catch(e){}
    const call = net.peer.call(net.conn.peer, net.mic); net.call = call;
    call.on('stream', netPlay);
  }
  return true;
}
function netMicOff(all){
  if(net.mic){ net.mic.getTracks().forEach(t => t.stop()); net.mic = null; }
  if(all){
    if(net.call) try{ net.call.close(); }catch(e){}
    net.call = null;
    if(net.audio){ net.audio.srcObject = null; net.audio.remove(); net.audio = null; }
  }
}

// 📤 ссылка-приглашение: …/?room=КОД&g=игра — напарник нажимает в WhatsApp и сразу входит в комнату (js/coop.js, coopFromLink)
function netInviteUrl(code){
  const u = new URL(location.href); u.search = ''; u.hash = '';
  u.searchParams.set('room', code); if(typeof coGame === 'string') u.searchParams.set('g', coGame);
  return u.href;
}
async function netShare(code){
  const url = netInviteUrl(code), text = L(`Поиграем вместе? 🦭 Комната ${netCodeText(code)} — нажми на ссылку:`, `Let's play together! 🦭 Room ${netCodeText(code)} — tap the link:`);
  try{ if(navigator.share){ await navigator.share({title:L('Тюленья больница', 'Seal Hospital'), text, url}); return; } }catch(e){ if(e && e.name === 'AbortError') return; }
  try{ await navigator.clipboard.writeText(`${text} ${url}`); toast(L('Ссылка скопирована — вставь её в WhatsApp 📋', 'Link copied — paste it into WhatsApp 📋'), 3200); }
  catch(e){ prompt(L('Скопируй ссылку:', 'Copy the link:'), url); }
}

// мелкая подпись с причиной — папе, чтобы понять, что сломалось
const netWhy = why => why ? `<br><small class="net-why">(${String(why).replace(/[^\w-]/g, '')}${NET_TURN.user ? '' : ', no turn'})</small>` : '';

/* ---------- экран «Играем вместе»: создать комнату или войти по коду ----------
   Возвращает 'ok' (соединились), или null (передумали). only — 'host' | 'join': сразу создать комнату или ввести код (без выбора). */
async function netLobby(only){
  const direct = !!only;
  mgOpen('');
  const panel = mgNode('div', 'mg-panel net-lobby', `
    <p class="ttl display">${L('Играем по сети 🌐', 'Play online 🌐')}</p>
    <p class="got">${L('Один создаёт комнату, второй вводит её код из трёх картинок.', 'One of you makes a room, the other types in its code of three pictures.')}</p>
    <div class="row col"><button class="btn" data-k="host">${L('Создать комнату', 'Make a room')}</button>
    <button class="btn ghost" data-k="join">${L('У меня есть код', 'I have a code')}</button></div>
    <button class="btn ghost small" data-k="no">${L('Назад', 'Back')}</button>`);
  const pick = () => new Promise(r => panel.querySelectorAll('[data-k]').forEach(b => { b.onclick = () => { sfx.tap(); r(b.dataset.k); }; }));
  const set = html => { panel.innerHTML = html; };
  for(;;){
    const k = only || await pick(); only = null;
    if(k === 'no'){ netClose(true); mgClose(); return null; }
    if(k === 'host'){
      set(`<p class="ttl display">${L('Комната', 'Room')}</p><p class="net-code" aria-live="polite">…</p>
        <p class="got net-say">${L('Подключаемся…', 'Connecting…')}</p>
        <button class="btn net-share" data-k="share" hidden>📤 ${L('Позвать ссылкой', 'Invite with a link')}</button>
        <button class="btn ghost small" data-k="no">${L('Назад', 'Back')}</button>`);
      const ok = await new Promise(r => {
        netHost((st, v) => {
          if(st === 'code'){
            panel.querySelector('.net-code').textContent = netCodeText(v); sfx.good();
            panel.querySelector('.net-say').textContent = L('Скажи этот код напарнику или отправь ссылку — и ждём ✨', 'Tell this code to your partner or send a link — and wait ✨');
            const sb = panel.querySelector('[data-k="share"]'); sb.hidden = false; sb.onclick = () => { sfx.tap(); netShare(v); };
          }
          if(st === 'joined') r(true);
          if(st === 'fail'){ panel.querySelector('.net-say').innerHTML = L('Не получилось подключиться. Проверь интернет и попробуй ещё.', 'Could not connect. Check the internet and try again.') + netWhy(v); }
        });
        panel.querySelector('[data-k="no"]').onclick = () => { sfx.tap(); r(false); };
      });
      if(ok){ mgClose(); return 'ok'; }
      netClose(true); mgClose(); return direct ? null : netLobby();
    }
    if(k === 'join'){
      let code = '';
      set(`<p class="ttl display">${L('Введи код', 'Enter the code')}</p><p class="net-code">${'<i>?</i>'.repeat(3)}</p>
        <div class="net-emo">${NET_EMO.map((e, i) => `<button data-e="${i}" aria-label="${e}">${e}</button>`).join('')}</div>
        <p class="got net-say"></p>
        <div class="row"><button class="btn ghost small" data-k="back">⌫</button><button class="btn ghost small" data-k="no">${L('Назад', 'Back')}</button></div>`);
      const show = () => { panel.querySelector('.net-code').innerHTML = [0, 1, 2].map(i => code[i] !== undefined ? NET_EMO[+code[i]] : '<i>?</i>').join(''); };
      const res = await new Promise(r => {
        const go = () => {
          panel.querySelector('.net-say').textContent = L('Стучимся в комнату…', 'Knocking on the room…');
          netJoin(code, (st, why) => {
            if(st === 'joined') return r(true);
            panel.querySelector('.net-say').innerHTML = why === 'peer-unavailable' ? L('Такой комнаты нет. Проверь картинки!', 'There is no such room. Check the pictures!') : L('Не получилось подключиться. Попробуй ещё.', 'Could not connect. Try again.') + netWhy(why);
            sfx.bad(); code = ''; show();
          });
        };
        panel.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { if(code.length >= 3) return; sfx.tap(); code += b.dataset.e; show(); if(code.length === 3) go(); });
        panel.querySelector('[data-k="back"]').onclick = () => { sfx.tap(); code = code.slice(0, -1); show(); };
        panel.querySelector('[data-k="no"]').onclick = () => { sfx.tap(); r(false); };
      });
      if(res){ sfx.good(); mgClose(); return 'ok'; }
      netClose(true); mgClose(); return direct ? null : netLobby();
    }
  }
}
