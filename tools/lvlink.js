/* Проверка 🔗 уровня ссылкой (js/builder.js: bdPack/bdUnpack, bdFromUrl, полка «📬 Мне прислали», bdGotPlay) в headless Edge:
   код туда-обратно (все куски и повороты) → 📤 только у ✅ → открыть ссылку в «чужом» браузере → уровень на полке «Мне прислали»,
   адрес очищен → пройти (финиш, ракушки, свои уровни не тронуты) → тот же уровень второй раз не дублируется → испорченная ссылка — тост.
   Запуск: node tools/lvlink.js */
const { findPlaywright, serve, launch } = require('./lib');

const LV = { name: 'Папин', ic: '🐳', ok: true, bt: 12, bs: 1,
  p: [['f', 0, -1.5, 0], ['st', 0, -4, 0], ['F', -3.5, -8, 0], ['l', 2, -10.5, Math.PI/2], ['s', 0, -14, Math.PI], ['b', 4.5, -18, 0],
      ['p', -5, 2.5, 0], ['w', 1, -22, Math.PI*1.5], ['pg', 0.5, -25.5, Math.PI/2], ['g', 0, -32.5, 0]] };
const mkSave = (name, g, lv) => ({ version: 2, free: true, progress: 12, shifts: 6, shells: 100, who: { name, g, asked: true },
  pet: { name: 'Тюпа', f: true, coat: 'snow', stage: 3, played: true, finds: ['a'] }, story: { open: 8, fest: [], seen: [], sa: true }, storm: { st: 4 },
  lv: { my: lv ? [lv] : [], n: 0, day: { d: '', n: 0 } } });

(async () => {
  const pw = findPlaywright(), { srv, port } = await serve(), browser = await launch(pw), base = `http://127.0.0.1:${port}/`;
  const ok = [], bad = [], errors = [];
  const check = (name, cond, info) => (cond ? ok : bad).push(name + (info !== undefined ? ' — ' + JSON.stringify(info) : ''));
  const open = async (save, q = '') => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true });
    await ctx.addInitScript(s => { try{ if(!sessionStorage.getItem('x')){ sessionStorage.setItem('x', 1); localStorage.setItem('sh.save', JSON.stringify(s)); } }catch(e){} }, save);
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', c => { if(c.type() === 'error' && !/Failed to load|fonts|favicon|peerjs|AudioContext/i.test(c.text())) errors.push('console: ' + c.text().slice(0, 200)); });
    await page.goto(base + '?test=1' + q, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof $ === 'function' && !$('#intro').hidden, null, { timeout: 30000 });
    page.toast = /lv=/.test(q) && await page.waitForFunction(() => /📬|не читается/.test(document.body.innerText), null, { timeout: 6000 }).then(() => true, () => false);
    await page.evaluate(() => { $('#btnIntroPet').click(); }); await page.waitForTimeout(2500);
    return page;
  };
  // 1. папа: код туда-обратно и 📤
  const dad = await open(mkSave('Папа', 'm', LV));
  const rt = await dad.evaluate(() => { const p = save.lv.my[0].p, c = bdPack(p), back = bdUnpack(c);
    const same = back && back.length === p.length && back.every((q, i) => q[0] === p[i][0] && q[1] === p[i][1] && q[2] === p[i][2] && Math.abs(Math.cos(q[3] - p[i][3]) - 1) < 1e-6);
    return { c, len: c.length, same, link: bdLink(save.lv.my[0]) }; });
  check('код туда-обратно — те же куски и повороты', rt.same, rt.c);
  check('код короткий: 3 знака на кусок', rt.len === 2 + LV.p.length*3, rt.len);
  check('ссылка с именем, значком и от кого', /\?lv=1[\w-]+&n=%D0%9F%D0%B0%D0%BF%D0%B8%D0%BD&i=.+&from=%D0%9F%D0%B0%D0%BF%D0%B0/.test(rt.link), rt.link);
  check('опечатка в коде — не примем', await dad.evaluate(c => bdUnpack(c.slice(0, 5) + (c[5] === 'A' ? 'B' : 'A') + c.slice(6)) === null, rt.c));
  await dad.evaluate(() => { save.lv.my.push({ name: 'Черновик', ic: '🌟', p: [['f', 0, -1.5, 0], ['g', 0, -5, 0]], ok: false, bt: 0, bs: 0 }); petDo('fun'); });
  await dad.waitForTimeout(800);
  await dad.evaluate(() => document.querySelector('.fun-pick [data-k="build"]').click());
  await dad.waitForFunction(() => BD && BD.mode === 'shelf', null, { timeout: 10000 });
  const sends = await dad.evaluate(() => [...document.querySelectorAll('.bd-shelf [data-send]')].map(e => e.dataset.send));
  check('📤 только у ✅ уровня', sends.join() === '0', sends);
  await dad.screenshot({ path: require('path').join(require('os').tmpdir(), 'lv-dad.png') });
  // 2. Сабрина открывает ссылку
  const q = rt.link.slice(rt.link.indexOf('?') + 1).replace(/&lang=en/, '');
  const sab = await open(mkSave('Сабрина', 'f', null), '&' + q);
  const got = await sab.evaluate(() => ({ n: save.lv.got.length, g: save.lv.got[0], url: location.search, my: save.lv.my.length }));
  check('уровень на полке «Мне прислали»', got.n === 1 && got.g.name === 'Папин' && got.g.from === 'Папа' && got.g.ic === '🐳' && got.g.nw && !got.g.ok && got.g.p.length === LV.p.length, got.g && { name: got.g.name, from: got.g.from });
  check('адрес очищен, свои уровни не тронуты', !/lv=/.test(got.url) && got.my === 0, got.url);
  check('тост «📬 Уровень от Папа»', sab.toast);
  await sab.evaluate(() => { petDo('fun'); }); await sab.waitForTimeout(800);
  await sab.evaluate(() => document.querySelector('.fun-pick [data-k="build"]').click());
  await sab.waitForFunction(() => BD && BD.mode, null, { timeout: 10000 }); await sab.waitForTimeout(500);
  await sab.evaluate(() => { if(BD.mode !== 'shelf') bdShelf(); });
  const tile = await sab.evaluate(() => { const b = document.querySelector('.bd-shelf [data-g="0"]'); return b && { nw: b.classList.contains('new'), t: b.textContent }; });
  await sab.screenshot({ path: require('path').join(require('os').tmpdir(), 'lv-sab.png') });
  check('плитка присланного уровня с ✨', tile && tile.nw && /Папа/.test(tile.t), tile);
  await sab.evaluate(() => document.querySelector('.bd-shelf [data-g="0"]').click()); await sab.waitForTimeout(600);
  const pl = await sab.evaluate(() => ({ m: BD.mode, gi: BD.gi, lv: bdLv() === save.lv.got[0], nw: save.lv.got[0].nw, n: BD.p.length }));
  check('▶ сразу бежим по присланному', pl.m === 'play' && pl.gi === 0 && pl.lv && !pl.nw && pl.n === LV.p.length, pl);
  const sh0 = await sab.evaluate(() => save.shells);
  await sab.evaluate(() => { BD.t = 9.4; bdFinish(); }); await sab.waitForTimeout(900);
  const fin = await sab.evaluate(() => ({ ok: save.lv.got[0].ok, bt: save.lv.got[0].bt, my: save.lv.my.length, h: document.querySelector('.bd-done h3').textContent, ed: document.querySelector('.bd-done [data-k="edit"]').textContent, sh: save.shells }));
  check('финиш: «Пройдено!», рекорд, ракушки', fin.ok && fin.bt === 9.4 && /Пройдено/.test(fin.h) && fin.sh > sh0, fin);
  check('после финиша — к полке, а не строить; свои уровни не появились', /Уровни/.test(fin.ed) && fin.my === 0, fin.ed);
  await sab.evaluate(() => document.querySelector('.bd-done [data-k="edit"]').click()); await sab.waitForTimeout(500);
  check('вернулись на полку', await sab.evaluate(() => BD.mode === 'shelf' && BD.gi === -1));
  // 3. та же ссылка ещё раз — не дублируется; испорченная — тост
  const sab2 = await open({ ...mkSave('Сабрина', 'f', null), lv: await sab.evaluate(() => save.lv) }, '&' + q);
  check('та же ссылка — не дубль', await sab2.evaluate(() => save.lv.got.length === 1));
  const bad1 = await open(mkSave('Маша', 'f', null), '&lv=1ABCDEF&n=x');
  check('испорченная ссылка — тост, на полку не легло', bad1.toast && await bad1.evaluate(() => !save.lv.got.length));
  for(const e of errors) bad.push(e);
  ok.forEach(s => console.log('✓', s)); bad.forEach(s => console.log('✗', s));
  console.log(bad.length ? `✗ ошибок: ${bad.length}` : `✓ всё хорошо (${ok.length})`);
  await browser.close(); srv.close(); process.exit(bad.length ? 1 : 0);
})();
