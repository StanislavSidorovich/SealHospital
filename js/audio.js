/* ---------------- sound ---------------- */
// Все звуки идут в одну цепочку: BUS (громкость) → мягкий фильтр верхов → компрессор → динамики.
// Так звуки не «хрипят», когда совпали, и громкость ровнее. Ноты — до-мажорная пентатоника (C D E G A):
// любые два звука вместе звучат как аккорд, а не фальшиво.
let AC = null, BUS = null;
function ac(){
  if(!AC){
    try{ AC = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ return null; }
    try{
      BUS = AC.createGain(); BUS.gain.value = 0.9;
      const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000; lp.Q.value = 0.5;
      const cmp = AC.createDynamicsCompressor();
      cmp.threshold.value = -20; cmp.knee.value = 14; cmp.ratio.value = 4; cmp.attack.value = 0.004; cmp.release.value = 0.2;
      BUS.connect(lp).connect(cmp).connect(AC.destination);
    }catch(e){ BUS = AC.destination; }
  }
  if(AC.state === 'suspended') AC.resume();
  return AC;
}
// нота пентатоники: 0 = до второй октавы (C5), 5 = C6, −5 = C4
const PENTA = [0, 2, 4, 7, 9];
function pn(n){ const o = Math.floor(n/5), i = n - o*5; return 523.25 * Math.pow(2, o + PENTA[i]/12); }
// разброс, чтобы сотый раз звучало чуть иначе
const jit = (x, k = 0.04) => x * (1 + (Math.random()*2 - 1)*k);
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
// огибающая: мягкий вход за att, затухание к концу d (без щелчков)
function env(g, t, vol, att, d){
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + att);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
}
function tone(f, d, {type='sine', vol=0.12, to=null, delay=0, att=0.012, vib=0, vibHz=6} = {}){
  const a = ac(); if(!a || save.muted) return;
  const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if(to) o.frequency.exponentialRampToValueAtTime(to, t + d);
  if(vib){ const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = vibHz; lg.gain.value = f*vib; l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + d + 0.05); }
  env(g, t, vol, Math.min(att, d*0.5), d);
  o.connect(g).connect(BUS); o.start(t); o.stop(t + d + 0.05);
}
function noise(d, {vol=0.2, freq=1000, to=null, type='bandpass', q=0.8, delay=0, att=0.01} = {}){
  const a = ac(); if(!a || save.muted) return;
  const t = a.currentTime + delay, len = Math.floor(a.sampleRate * d);
  const buf = a.createBuffer(1, len, a.sampleRate), ch = buf.getChannelData(0);
  for(let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if(to) f.frequency.exponentialRampToValueAtTime(to, t + d);
  const g = a.createGain(); env(g, t, vol, Math.min(att, d*0.5), d);
  src.connect(f).connect(g).connect(BUS); src.start(t);
}
// «инструменты»
// маримба: деревянный удар — синус и короткий обертон сверху
function marimba(f, {vol=0.1, delay=0, d=0.35} = {}){
  tone(f, d, {vol, delay, att:0.004});
  tone(f*4, 0.06, {vol:vol*0.22, delay, att:0.002});
}
// музыкальная шкатулка / колокольчик: долгий хвост и лёгкий «звон» сверху
function bell(f, {vol=0.07, delay=0, d=0.9} = {}){
  tone(f, d, {vol, delay, att:0.004});
  tone(f*3, d*0.35, {vol:vol*0.12, delay, att:0.003});
}
// голос-пищалка: треугольник с вибрацией и глиссандо, как резиновая игрушка
function squeak(f0, f1, d, {vol=0.08, delay=0} = {}){
  tone(f0, d, {type:'triangle', vol, delay, to:f1, att:0.02, vib:0.03, vibHz:7});
  tone(f0*2, d*0.8, {vol:vol*0.15, delay, to:f1*2, att:0.02});
}
// капелька: короткий синус вверх
function drop(f, delay = 0, vol = 0.05){ tone(f, 0.07, {vol, delay, to:f*1.9, att:0.004}); }
const sfx = {
  tap(){ marimba(jit(pick([pn(7), pn(8), pn(9)]), 0.01), {vol:0.09, d:0.16}); },
  good(){ [0, 2, 3, 5].forEach((n,i) => marimba(pn(n), {vol:0.06, delay:i*0.09, d:0.4})); },
  // «хм-м»: не «неправильно!», а «давай иначе» — две мягкие деревянные ноты вниз
  bad(){ marimba(pn(-1), {vol:0.06, d:0.3}); marimba(pn(-2), {vol:0.055, delay:0.16, d:0.45}); },
  // «уи?» — голосок тюленя, каждый раз чуть другой
  arf(){ const k = jit(1, 0.06); squeak(560*k, 760*k, 0.13, {vol:0.06}); squeak(640*k, 900*k, 0.16, {vol:0.06, delay:0.16}); },
  // «ма-ма!» — тоненький голосок потеряшки: две ноты вниз, тише обычного
  mama(){ const k = jit(1, 0.05); squeak(980*k, 900*k, 0.14, {vol:0.035}); squeak(900*k, 700*k, 0.24, {vol:0.035, delay:0.2}); },
  // «щёлк» рычага: деревянный стук и колокольчик
  lever(){ marimba(pn(2), {vol:0.07, d:0.08}); bell(pn(9), {vol:0.04, delay:0.08, d:0.35}); },
  beep(long){ bell(pn(10), {vol:0.06, d:long ? 0.6 : 0.14}); },
  tick(){ marimba(pn(8), {vol:0.03, d:0.06}); },
  ding(){ bell(pn(7), {vol:0.05, d:0.4}); bell(pn(9), {vol:0.045, delay:0.09, d:0.6}); },
  // «бульк»: пузырёк
  plop(){ const f = jit(380); tone(f, 0.14, {vol:0.12, to:f*0.42, att:0.006}); noise(0.14, {vol:0.035, freq:500, type:'lowpass', delay:0.02}); },
  // «топ» на льдину: глухо и мягко, как подушка
  thud(){ const f = jit(115, 0.06); tone(f, 0.2, {vol:0.22, to:58, att:0.006}); tone(f*2, 0.1, {vol:0.05, to:f, att:0.006}); noise(0.1, {vol:0.05, freq:260, type:'lowpass'}); },
  rub(){ noise(0.08, {vol:0.14, freq:jit(2400, 0.1), att:0.02}); },
  pour(){ noise(0.35, {vol:0.08, freq:650, type:'lowpass', att:0.05}); tone(520, 0.28, {vol:0.04, to:300, delay:0.05}); drop(pn(5), 0.2, 0.03); },
  chomp(){ tone(jit(190, 0.08), 0.08, {vol:0.16, to:120, att:0.004}); noise(0.06, {vol:0.16, freq:jit(800, 0.1), att:0.004}); },
  sneezeSoft(){ squeak(620, 900, 0.16, {vol:0.05}); noise(0.18, {vol:0.07, freq:600, type:'lowpass', delay:0.18, att:0.02}); },
  sneeze(){ squeak(620, 1000, 0.2, {vol:0.06}); noise(0.3, {vol:0.1, freq:2000, to:900, delay:0.2, att:0.02}); },
  // плюх в воду: «бульк» вниз + пузырьки-капельки + тихий всплеск с плавным началом
  splash(){
    const f = jit(520, 0.06);
    tone(f, 0.2, {vol:0.14, to:f*0.33, att:0.008});
    noise(0.45, {vol:0.06, freq:1100, to:400, type:'lowpass', att:0.06, delay:0.02});
    const n = 3 + Math.floor(Math.random()*2);
    for(let i = 0; i < n; i++) drop(jit(pick([pn(5), pn(7), pn(8), pn(10)]), 0.02), 0.12 + i*0.07 + Math.random()*0.04, 0.04);
  },
  // отряхнулся: капельки во все стороны
  drip(){ for(let i = 0; i < 6; i++) drop(jit(pick([pn(7), pn(8), pn(9), pn(10), pn(12)]), 0.02), i*0.05 + Math.random()*0.03, 0.035); },
  boost(){ tone(380, 0.4, {type:'triangle', vol:0.07, to:1400, att:0.03}); noise(0.35, {vol:0.04, freq:1200, to:3200, delay:0.05, att:0.08}); },
  // ворчание Тучки: мягкое «бу-бу», без пилы
  grr(){ tone(147, 0.28, {type:'triangle', vol:0.075, to:131, att:0.03, vib:0.04, vibHz:9}); tone(131, 0.34, {type:'triangle', vol:0.07, to:110, delay:0.3, att:0.03, vib:0.04, vibHz:9}); },
  // чайка-помощник (Фаза 13): «кьяу-кьяу» — высокое, с переливом, не резкое
  caw(){ [0, 0.16].forEach((d, i) => { tone(1180 - i*90, 0.12, {type:'triangle', vol:0.055, to:820 - i*60, delay:d, att:0.01, vib:0.04, vibHz:22}); tone(2300 - i*150, 0.08, {vol:0.012, to:1600, delay:d, att:0.01}); }); },
  // спасательный круг в забеге: «бдынь» вверх
  boing(){ tone(200, 0.3, {type:'triangle', vol:0.1, to:560, att:0.01, vib:0.06, vibHz:14}); bell(pn(9), {vol:0.03, delay:0.1, d:0.3}); },
  // «кря» пингвина Пинга: гнусавое и смешное, два раза
  quack(){ [0, 0.17].forEach((d, i) => { tone(760 - i*60, 0.13, {type:'triangle', vol:0.08, to:520 - i*40, delay:d, att:0.01, vib:0.05, vibHz:28}); tone(1500 - i*120, 0.1, {vol:0.02, to:1040, delay:d, att:0.01}); }); },
  siren(){ [7, 5, 7, 5, 7, 5].forEach((n, i) => bell(pn(n), {vol:0.04, delay:i*0.26, d:0.3})); },   // «скорая»: ти-ду, ти-ду — колокольчики, не вой
  giggle(){ [7, 8, 7, 9, 8].forEach((n,i) => squeak(pn(n), pn(n)*1.12, 0.08, {vol:0.05, delay:i*0.085})); },
  whoosh(){ noise(0.4, {vol:0.2, freq:600, to:2200, att:0.12}); },
  pop(){ const f = jit(440); tone(f, 0.09, {vol:0.16, to:f*2.1, att:0.004}); },
  hug(){ [2, 3, 5, 7, 8].forEach((n,i) => bell(pn(n), {vol:0.045, delay:i*0.08, d:0.7})); },
  coin(){ const hi = Math.random() < 0.5; bell(pn(hi ? 7 : 6), {vol:0.06, d:0.2}); bell(pn(hi ? 10 : 9), {vol:0.05, delay:0.06, d:0.35}); },
  star(){ [5, 7, 8].forEach((n,i) => bell(pn(n), {vol:0.045, delay:i*0.07, d:0.5})); },
  buy(){ [3, 5, 6, 8, 10].forEach((n,i) => bell(pn(n), {vol:0.04, delay:i*0.06, d:0.45})); },
  yawn(){ tone(520, 0.7, {vol:0.06, to:260, att:0.08, vib:0.02, vibHz:5}); },
  grow(){ musDuck(1.6); for(let i = 0; i < 10; i++) bell(pn(i), {vol:0.03 + i*0.002, delay:i*0.15, d:0.6}); },
  sparkle(){ bell(pick([pn(10), pn(11), pn(12)]), {vol:0.025, d:0.3}); bell(pick([pn(12), pn(13), pn(14)]), {vol:0.02, delay:0.06, d:0.35}); },
  // мурчание: низкий треугольник с быстрым дрожанием
  purr(){ tone(jit(170, 0.08), 0.4, {type:'triangle', vol:0.06, to:140, att:0.06, vib:0.08, vibHz:24}); },
  paper(){ noise(0.22, {vol:0.13, freq:3200, att:0.03}); noise(0.16, {vol:0.1, freq:2400, delay:0.14, att:0.03}); },
  letter(){ musDuck(1.2); [3, 5, 6, 5, 7].forEach((n,i) => bell(pn(n), {vol:0.04, delay:i*0.12, d:0.8})); },
  lullaby(){ musDuck(1.8); [3, 2, 1, -1, 0].forEach((n,i) => bell(pn(n), {vol:0.035, delay:i*0.34, d:1.1})); }
};
function renderMute(){
  $('#waves').toggleAttribute('hidden', save.muted);
  $('#cross').toggleAttribute('hidden', !save.muted);
  $('#btnSound').setAttribute('aria-label', save.muted ? L('Включить звук', 'Sound on') : L('Выключить звук', 'Sound off'));
}

/* ---------------- фоновая музыка ---------------- */
// Тихая «шкатулка» под игрой. Свой регулятор MUS (стоит перед BUS, поэтому проходит через тот же компрессор),
// свой переключатель save.music (⚙️), а 🔇 в углу выключает всё. Ноты ставит планировщик на setInterval
// с запасом 0,4 с — музыка не зависит от кадров и не спотыкается, когда телефон тормозит.
// Где мы — там и мелодия (musicMood): больница, уголок малыша, иглу, забег, карта островов, ночь — колыбельная.
// Мелодии в той же пентатонике pn(n), что и звуки: совпадение с «динь» даёт аккорд, а не фальшь.
let musForce = null;   // пульт sounds.html: включить мелодию вручную
let MUS = null, musMood = null, musPart = 0, musStep = 0, musT = 0, musWait = 0, NOISE = null;
// аккорды: [бас, три ноты аккорда]; «си» в G есть только в аккорде, в мелодии его нет
const CHORD = {C:[130.81, 261.63, 329.63, 392.00], Am:[110.00, 220.00, 261.63, 329.63], F:[87.31, 174.61, 220.00, 261.63], G:[98.00, 196.00, 246.94, 293.66]};
// часть мелодии: аккорды по тактам и ноты по восьмушкам (число — ступень pn, «.» — пауза, «|» — такт); без mel — такты без мелодии
const mp = (ch, mel) => ({ch:ch.split(' '), mel:mel ? mel.split('|').map(b => b.trim().split(/\s+/).map(x => x === '.' ? null : +x)) : null});
const TUNE_HOSP = {
  A:mp('C Am F G C Am F C', '2 . 3 . 4 . 3 2 | 0 . . 2 1 . . . | -1 . 0 . 1 . 2 . | 3 . . . 1 . . . | 2 . 3 . 4 . 5 . | 4 . 3 . 2 . 0 . | -1 . 0 1 2 . 1 . | 0 . . . . . . .'),
  B:mp('F C F G C Am G C', '4 . 5 . 4 . 3 . | 2 . 3 . 2 . 0 . | 4 . 5 . 6 . 5 . | 3 . . . . . 1 . | 2 . . 3 4 . . 3 | 2 . 0 . -1 . 0 . | 1 . 2 . 3 . 1 . | 0 . . . . . . .'),
  R:mp('C Am F G')};
const TUNE_PET = {   // вальс на три четверти
  A:mp('C Am F G C Am G C', '2 . . . 3 . | 4 . . . 2 . | 0 . 1 . 2 . | 1 . . . . . | 2 . . . 3 . | 4 . 5 . 4 . | 3 . 1 . 2 . | 0 . . . . .'),
  B:mp('F C Am G F C G C', '4 . . . 5 . | 3 . . . 2 . | 2 . 3 . 4 . | 3 . . . . . | 4 . . . 3 . | 2 . . . 0 . | 1 . 2 . 1 . | 0 . . . . .'),
  R:mp('C Am F G')};
const TUNE_RUN = {
  A:mp('C C F G C Am G C', '0 . 2 . 3 . 2 . | 3 . 4 3 2 . 0 . | -1 . 0 . 2 . 0 . | 1 . 1 . 3 . . . | 0 . 2 . 3 . 5 . | 4 . 3 . 2 . 0 . | 1 . 2 . 3 . 1 . | 0 . 0 . 0 . . .'),
  B:mp('F C F G C Am G C', '5 . 4 . 5 . 4 . | 3 . 2 . 3 . . . | 5 . 4 . 5 . 6 . | 5 . . . 3 . . . | 2 3 4 . 2 3 4 . | 5 . 4 . 2 . 0 . | 1 . 3 . 1 . 3 . | 5 . . . 0 . . .')};
const TUNE_NIGHT = {   // колыбельная — родня звука sfx.lullaby
  A:mp('C F C G C F G C', '2 . 1 . 0 . | -1 . . . 0 . | 2 . 1 . 0 . | -2 . . . . . | 0 . 1 . 2 . | 3 . 2 . 0 . | 1 . . . -2 . | 0 . . . . .'),
  R:mp('C F G C')};
// bpm — четверти в минуту, bar — восьмушек в такте, style — аккомпанемент, inst — чем играет мелодия, shift — сдвиг ступеней, vol — громкость MUS
const TUNES = {
  hosp: {parts:TUNE_HOSP,  seq:'ABAR', bpm:84,  bar:8, style:'box',   inst:'box', shift:0,  vol:0.28},
  pet:  {parts:TUNE_PET,   seq:'ABAR', bpm:96,  bar:6, style:'waltz', inst:'box', shift:0,  vol:0.25},
  home: {parts:TUNE_PET,   seq:'BARA', bpm:84,  bar:6, style:'waltz', inst:'mar', shift:-5, vol:0.28},
  run:  {parts:TUNE_RUN,   seq:'AABA', bpm:128, bar:8, style:'run',   inst:'mar', shift:0,  vol:0.3},
  map:  {parts:TUNE_RUN,   seq:'ABAB', bpm:100, bar:8, style:'box',   inst:'box', shift:0,  vol:0.24},
  night:{parts:TUNE_NIGHT, seq:'ARAR', bpm:58,  bar:6, style:'waltz', inst:'box', shift:-5, vol:0.24}
};
function musicMood(){
  if(musForce) return musForce;
  const b = document.body.classList;
  if(b.contains('run-on')) return R && R.paused ? 'map' : 'run';
  if(b.contains('map-on')) return 'map';
  if(petMode) return petSeal && petSeal.sleeping ? 'night' : homeMode ? 'home' : 'pet';
  return 'hosp';
}
function mNote(f, t, d, vol, type = 'sine', att = 0.006){
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.value = f; env(g, t, vol, att, d);
  o.connect(g).connect(MUS); o.start(t); o.stop(t + d + 0.05);
}
const MINST = {
  box(f, t, v){ mNote(f, t, 1.4, v); mNote(f*3, t, 0.45, v*0.12, 'sine', 0.003); },       // шкатулка: долгий звон
  mar(f, t, v){ mNote(f, t, 0.4, v, 'sine', 0.004); mNote(f*4, t, 0.06, v*0.2, 'sine', 0.002); },   // маримба: деревянный удар
  pad(f, t, v, d){ mNote(f, t, d, v, 'triangle', 0.04); },                                  // аккорд: мягко, без удара
  bass(f, t, v, d){ mNote(f, t, d, v, 'triangle', 0.02); mNote(f*2, t, d*0.7, v*0.4, 'sine', 0.02); },   // обертон — чтобы бас был слышен в динамике телефона
  // шорох-«тик» (в забеге) и бубенчики (на Новый год) из одного кусочка шума
  shh(t, v, d, freq){
    const s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = NOISE; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2; env(g, t, v, 0.003, d);
    s.connect(f).connect(g).connect(MUS); s.start(t, Math.random()*0.2); s.stop(t + d + 0.02);
  }
};
function musPlay(T, t){
  const part = T.parts[T.seq[musPart]], bar = Math.floor(musStep / T.bar), i = musStep % T.bar;
  const ch = CHORD[part.ch[bar]], e = 60 / T.bpm / 2, hum = () => t + (Math.random() - 0.5)*0.01;
  // аккомпанемент
  if(T.style === 'run'){
    if(i % 2 === 0) MINST.bass(i % 4 ? ch[0]*1.5 : ch[0], hum(), 0.075, e*1.6);
    else MINST.shh(hum(), i === 3 || i === 7 ? 0.018 : 0.012, 0.05, 7000);
  } else if(T.style === 'waltz'){
    if(i === 0) MINST.bass(ch[0], hum(), 0.07, e*T.bar*0.9);
    if(i === 2 || i === 4) [ch[2], ch[3]].forEach(f => MINST.pad(f, hum(), 0.018, e*1.8));
  } else {
    if(i === 0) MINST.bass(ch[0], hum(), 0.07, e*T.bar*0.9);
    if(i === 2 || i === 6) MINST.pad(ch[2], hum(), 0.02, e*1.8);
    if(i === 4) MINST.pad(ch[3], hum(), 0.02, e*1.8);
  }
  if(HOL && HOL.id === 'newyear' && T.style !== 'run' && i % 2 === 0) MINST.shh(hum(), 0.01, 0.12, 9000);   // бубенчики
  // мелодия: первая доля чуть громче
  const n = part.mel && part.mel[bar][i];
  if(n !== null && n !== undefined) MINST[T.inst](pn(n + T.shift), hum(), (i === 0 ? 0.075 : 0.062) * (T.inst === 'mar' ? 1.1 : 1));
  if(++musStep >= part.ch.length * T.bar){ musStep = 0; musPart = (musPart + 1) % T.seq.length; }
  return e;
}
function musFadeTo(v, s){
  const t = AC.currentTime, g = MUS.gain;
  g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(v, t + s);
}
function musTick(){
  if(!AC || !MUS) return;
  const t0 = AC.currentTime;
  const want = !save.muted && save.music && !document.hidden && AC.state === 'running' ? musicMood() : null;
  if(want !== musMood){
    // сменилось место: старая мелодия тихо уходит, короткая пауза, новая начинается сначала
    if(musMood){ musFadeTo(0, 0.7); musMood = null; musWait = t0 + 0.9; return; }
    if(!want || t0 < musWait) return;
    musMood = want; musPart = 0; musStep = 0; musT = t0 + 0.15;
    musFadeTo(TUNES[want].vol, 1.5);
  }
  if(!musMood) return;
  if(musT < t0) musT = t0 + 0.05;   // вкладка спала — пропущенные ноты не догоняем
  while(musT < t0 + 0.4) musT += musPlay(TUNES[musMood], musT);
}
// большой звук (письмо, рост, колыбельная) — музыка ненадолго притихает, чтобы не спорить с ним
function musDuck(s){
  if(!MUS || !musMood) return;
  const v = TUNES[musMood].vol, t = AC.currentTime, g = MUS.gain;
  g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(v*0.2, t + 0.2); g.setValueAtTime(v*0.2, t + s); g.linearRampToValueAtTime(v, t + s + 1.5);
}
function musInit(){
  if(MUS || !AC) return;
  try{
    MUS = AC.createGain(); MUS.gain.value = 0; MUS.connect(BUS);
    const len = Math.floor(AC.sampleRate * 0.4); NOISE = AC.createBuffer(1, len, AC.sampleRate);
    const ch = NOISE.getChannelData(0); for(let i = 0; i < len; i++) ch[i] = Math.random()*2 - 1;
  }catch(e){ MUS = null; }
}
setInterval(() => { try{ if(AC && !MUS) musInit(); musTick(); }catch(e){} }, 120);
// переключатель в ⚙️: «Музыка: Вкл | Выкл»
function renderMusic(){
  for(const b of document.querySelectorAll('#musicSeg button')){
    const on = (b.dataset.m === '1') === !!save.music;
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
}
