/* ---------------- sound ---------------- */
let AC = null;
function ac(){
  if(!AC){ try{ AC = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ return null; } }
  if(AC.state === 'suspended') AC.resume();
  return AC;
}
function tone(f, d, {type='sine', vol=0.12, to=null, delay=0} = {}){
  const a = ac(); if(!a || save.muted) return;
  const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if(to) o.frequency.exponentialRampToValueAtTime(to, t + d);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + d + 0.05);
}
function noise(d, {vol=0.2, freq=1000, type='bandpass', q=0.8, delay=0} = {}){
  const a = ac(); if(!a || save.muted) return;
  const t = a.currentTime + delay, len = Math.floor(a.sampleRate * d);
  const buf = a.createBuffer(1, len, a.sampleRate), ch = buf.getChannelData(0);
  for(let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = a.createGain(); g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination); src.start(t);
}
const sfx = {
  tap(){ tone(700, 0.07, {type:'triangle', vol:0.08}); },
  good(){ [523,659,784,1047].forEach((f,i) => tone(f, 0.22, {type:'triangle', vol:0.11, delay:i*0.09})); },
  bad(){ tone(330, 0.16, {type:'square', vol:0.04, to:250}); tone(250, 0.2, {type:'square', vol:0.04, to:200, delay:0.17}); },
  arf(){ tone(640, 0.11, {type:'square', vol:0.045, to:360}); tone(700, 0.12, {type:'square', vol:0.045, to:380, delay:0.15}); },
  beep(long){ tone(1760, long ? 0.35 : 0.07, {vol:0.07}); },
  tick(){ tone(1320, 0.035, {vol:0.035}); },
  ding(){ tone(1319, 0.16, {vol:0.08}); tone(1760, 0.24, {vol:0.07, delay:0.09}); },
  plop(){ tone(360, 0.14, {vol:0.1, to:140}); noise(0.18, {vol:0.1, freq:900, delay:0.03}); },
  rub(){ noise(0.07, {vol:0.06, freq:3200}); },
  pour(){ noise(0.35, {vol:0.12, freq:650, type:'lowpass'}); tone(520, 0.28, {vol:0.05, to:300, delay:0.05}); },
  chomp(){ noise(0.07, {vol:0.3, freq:700}); },
  sneeze(){ tone(700, 0.18, {type:'triangle', vol:0.06, to:1100}); noise(0.3, {vol:0.18, freq:2600, delay:0.2}); },
  splash(){ noise(0.6, {vol:0.25, freq:700, type:'lowpass'}); },
  whoosh(){ noise(0.4, {vol:0.14, freq:1500}); },
  pop(){ tone(420, 0.1, {vol:0.12, to:900}); },
  hug(){ [659,784,988,1319,1568].forEach((f,i) => tone(f, 0.3, {vol:0.09, delay:i*0.08})); }
};
function renderMute(){
  $('#waves').toggleAttribute('hidden', save.muted);
  $('#cross').toggleAttribute('hidden', !save.muted);
  $('#btnSound').setAttribute('aria-label', save.muted ? 'Включить звук' : 'Выключить звук');
}
