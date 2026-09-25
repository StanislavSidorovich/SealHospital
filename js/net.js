/* ---------------- Сеть (Фаза 13): папа и Сабрина играют вместе из разных мест ----------------
   Телефоны соединяются напрямую (WebRTC) через библиотеку PeerJS (vendor/peerjs.min.js).
   Бесплатный сервер PeerJS только «знакомит» телефоны, дальше сообщения идут напрямую;
   если сети не пускают напрямую — через ретранслятор TURN (он тоже есть в PeerJS по умолчанию).
   Комната — код из трёх картинок (🐟🦀🐙): один создаёт, второй вводит. Чужих нет, текстового чата нет.
   По сети идут только ходы игры (маленькие JSON), сохранения у каждого свои.
   Голос: кнопка 🎤 (микрофон включается только по нажатию, эхо гасит браузер).
   Сеть работает на GitHub Pages и на localhost; в Artifact и с file:// режим «по сети» прячем.
   Подключается после neighbors.js и до boss.js. */
const NET_EMO = ['🐟', '🦀', '🐙', '🐳', '🐧', '⭐', '🍓', '🌈'];
const NET_PREFIX = 'sealhosp-v1-';
const netAvail = () => typeof Peer === 'function' && (location.protocol === 'https:' || /^(localhost|127\.)/.test(location.hostname))
  && window.top === window && !/claude|anthropic/.test(location.hostname);   // Artifact живёт во фрейме — там сеть не пускают
const net = {peer:null, conn:null, host:false, code:'', on:{}, lastIn:0, hb:null, mic:null, call:null, audio:null, lost:false, onLost:null, onBack:null};

function netCodeText(code){ return [...code].map(d => NET_EMO[+d]).join(''); }
function netRandomCode(){ return [0, 1, 2].map(() => Math.floor(Math.random()*NET_EMO.length)).join(''); }
function netSend(m){ try{ if(net.conn && net.conn.open) net.conn.send(m); }catch(e){} }
function netOn(type, fn){ net.on[type] = fn; }
function netWire(conn){
  net.conn = conn; net.lastIn = performance.now();
  conn.on('data', m => {
    net.lastIn = performance.now();
    if(net.lost){ net.lost = false; if(net.onBack) net.onBack(); }
    if(m && m.t === 'hb') return;
    const f = m && net.on[m.t]; if(f) f(m);
  });
  conn.on('close', () => { if(net.conn === conn && !net.lost){ net.lost = true; if(net.onLost) net.onLost(); } });
  clearInterval(net.hb);
  net.hb = setInterval(() => {
    netSend({t:'hb'});
    if(!net.lost && performance.now() - net.lastIn > 5000){ net.lost = true; if(net.onLost) net.onLost(); }
  }, 1000);
}
// создать комнату: ждём, пока подключится второй (cb(ok, why))
function netHost(cb){
  netClose(); net.host = true;
  const tryCode = left => {
    const code = netRandomCode(), p = new Peer(NET_PREFIX + code);
    net.peer = p; net.code = code;
    p.on('open', () => cb('code', code));
    p.on('connection', c => {
      if(net.conn && net.conn.open){ c.close(); return; }   // в комнате только двое
      c.on('open', () => { netWire(c); cb('joined'); });
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
  netClose(); net.host = false; net.code = code;
  const p = new Peer(); net.peer = p;
  let done = false;
  const fail = why => { if(done) return; done = true; cb('fail', why); };
  p.on('open', () => {
    const c = p.connect(NET_PREFIX + code, {reliable:true});
    c.on('open', () => { if(done) return; done = true; netWire(c); cb('joined'); });
    setTimeout(() => fail('timeout'), 15000);
  });
  p.on('call', call => netAnswer(call));
  p.on('error', e => fail(e.type));   // peer-unavailable — такой комнаты нет
}
function netClose(){
  clearInterval(net.hb); net.hb = null;
  netMicOff(true);
  try{ if(net.conn) net.conn.close(); }catch(e){}
  try{ if(net.peer) net.peer.destroy(); }catch(e){}
  net.peer = net.conn = null; net.on = {}; net.lost = false; net.onLost = net.onBack = null;
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

/* ---------- экран «Играем вместе»: создать комнату или войти по коду ----------
   Возвращает 'ok' (соединились), или null (передумали). */
async function netLobby(){
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
    const k = await pick();
    if(k === 'no'){ netClose(); mgClose(); return null; }
    if(k === 'host'){
      set(`<p class="ttl display">${L('Комната', 'Room')}</p><p class="net-code" aria-live="polite">…</p>
        <p class="got net-say">${L('Подключаемся…', 'Connecting…')}</p><button class="btn ghost small" data-k="no">${L('Назад', 'Back')}</button>`);
      const ok = await new Promise(r => {
        netHost((st, v) => {
          if(st === 'code'){ panel.querySelector('.net-code').textContent = netCodeText(v); panel.querySelector('.net-say').textContent = L('Скажи этот код папе — и ждём его ✨', 'Tell this code to your partner — and wait ✨'); sfx.good(); }
          if(st === 'joined') r(true);
          if(st === 'fail'){ panel.querySelector('.net-say').textContent = L('Не получилось подключиться. Проверь интернет и попробуй ещё.', 'Could not connect. Check the internet and try again.'); }
        });
        panel.querySelector('[data-k="no"]').onclick = () => { sfx.tap(); r(false); };
      });
      if(ok){ mgClose(); return 'ok'; }
      netClose(); mgClose(); return netLobby();
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
            panel.querySelector('.net-say').textContent = why === 'peer-unavailable' ? L('Такой комнаты нет. Проверь картинки!', 'There is no such room. Check the pictures!') : L('Не получилось подключиться. Попробуй ещё.', 'Could not connect. Try again.');
            sfx.bad(); code = ''; show();
          });
        };
        panel.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { if(code.length >= 3) return; sfx.tap(); code += b.dataset.e; show(); if(code.length === 3) go(); });
        panel.querySelector('[data-k="back"]').onclick = () => { sfx.tap(); code = code.slice(0, -1); show(); };
        panel.querySelector('[data-k="no"]').onclick = () => { sfx.tap(); r(false); };
      });
      if(res){ sfx.good(); mgClose(); return 'ok'; }
      netClose(); mgClose(); return netLobby();
    }
  }
}
