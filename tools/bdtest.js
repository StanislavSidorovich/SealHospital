/* Проверка 🧱 конструктора полосы (js/builder.js) в headless Edge: новый уровень из заготовки → кусок из панели → тащить →
   ▶ Пройти (стрелки и пробел) → прыжок через воду за звёздочкой → 🏁 «✅ Проверено» и ракушки → поменяла кусок — снова не проверен →
   упала в воду — вынырнула на льдинке → пингвин толкается → полка: новый, убрать → домой. Снимки в tools/out/ (с --shots).
   Запуск: node tools/bdtest.js [--shots] */
const fs = require('fs'), path = require('path');
const { ROOT, findPlaywright, serve, launch } = require('./lib');
const SHOTS = process.argv.includes('--shots'), OUT = path.join(ROOT, 'tools', 'out');

const SAVE = {
  version: 2, free: true, progress: 12, shifts: 6, shells: 100,
  who: { name: 'Сабрина', g: 'f', asked: true },
  pet: { name: 'Тюпа', f: true, coat: 'snow', stage: 3, played: true, finds: ['a'] },
  story: { open: 8, fest: [], seen: [], sa: true }, storm: { st: 4 }
};

(async () => {
  const pw = findPlaywright(), { srv, port } = await serve(), browser = await launch(pw);
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, deviceScaleFactor: 1 });
  await ctx.addInitScript(s => { try{ if(!sessionStorage.getItem('x')){ sessionStorage.setItem('x', 1); localStorage.setItem('sh.save', JSON.stringify(s)); } }catch(e){} }, SAVE);
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', c => { if(c.type() === 'error' && !/Failed to load|fonts|favicon|peerjs|AudioContext/i.test(c.text())) errors.push('console: ' + c.text().slice(0, 200)); });
  if(SHOTS) fs.mkdirSync(OUT, { recursive: true });
  const shot = async n => { if(SHOTS) await page.screenshot({ path: path.join(OUT, n + '.png') }); };
  const ev = (f, a) => page.evaluate(f, a);
  const ok = [], bad = [];
  const check = (name, cond, info) => (cond ? ok : bad).push(name + (info !== undefined ? ' — ' + JSON.stringify(info) : ''));
  const until = (f, a, ms = 15000) => page.waitForFunction(f, a, { timeout: ms }).then(() => true, () => false);
  const tapSel = async sel => { const b = await page.$(sel); if(!b) return false; await b.click(); await page.waitForTimeout(250); return true; };
  await page.goto(`http://127.0.0.1:${port}/?test=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof $ === 'function' && !$('#intro').hidden, null, { timeout: 30000 });
  await page.waitForTimeout(1000);
  await ev(() => { $('#btnIntroPet').click(); });
  await page.waitForTimeout(3000);
  // «Поиграть» → плитка 🧱
  await ev(() => { petDo('fun'); });
  check('плитка 🧱 в «Поиграть»', await until(() => !!document.querySelector('.fun-pick [data-k="build"]')));
  await tapSel('.fun-pick [data-k="build"]');
  check('стройка открылась сразу (уровней ещё нет)', await until(() => BD && BD.mode === 'edit' && save.lv.my.length === 1));
  await page.waitForTimeout(900);
  const t0 = await ev(() => ({ p: BD.p.map(q => q[0]).join(''), bar: !!$('.bd-bar'), shells: save.shells }));
  check('заготовка: льдинка, звёздочка, финиш', t0.p === 'fstg' && t0.bar, t0);
  await shot('bd1-edit');
  // кусок из панели: высокая льдина
  await tapSel('.bd-bar [data-t="F"]');
  const add = await ev(() => ({ n: BD.p.length, sel: ED.sel, q: BD.p[BD.p.length - 1] }));
  check('кусок встал и выбран', add.n === 4 && add.sel === 'p3' && add.q[0] === 'F', add);
  // тащим его пальцем влево-вперёд
  const at = await ev(() => toScreen(BD.items[3].getWorldPosition(new V3()).add(new V3(0, 1.1, 0))));
  await page.mouse.move(at.x, at.y); await page.mouse.down();
  for(let i = 1; i <= 10; i++){ await page.mouse.move(at.x - i*6, at.y - i*4); await page.waitForTimeout(30); }
  await shot('bd2-drag');
  await page.mouse.up(); await page.waitForTimeout(400);
  const mv = await ev(() => BD.p[3]);
  check('кусок переехал', mv[1] !== add.q[1] || mv[2] !== add.q[2], [add.q, mv]);
  // поворот горки: добавить и коснуться ещё раз
  await tapSel('.bd-bar [data-t="s"]');
  const s0 = await ev(() => BD.p[4]);
  await ev(() => { edTurn(); }); await page.waitForTimeout(500);
  const s1 = await ev(() => BD.p[4]);
  check('горка повернулась', Math.abs(s1[3] - s0[3]) > 1, [s0, s1]);
  // ↩️ отменить
  await tapSel('.bd-bar [data-a="undo"]'); await page.waitForTimeout(500);
  check('↩️ вернул поворот', await ev(r => Math.abs(BD.p[4][3] - r) < 0.01, s0[3]));
  // пингвин на пути, чтобы проверить толчок: ставим прямо в программе
  // ▶ Пройти: идём вперёд и прыгаем через воду
  await ev(() => { BD.p.splice(3, 2); bdRebuild(); });
  await tapSel('.bd-bar [data-a="play"]');
  check('▶ — малыш на старте', await until(() => BD && BD.mode === 'play' && BD.R));
  await shot('bd3-play');
  await page.keyboard.down('ArrowUp');
  await until(() => BD.R.pos.z < -2.3, null, 8000);
  await page.keyboard.press(' ');
  const fin = await until(() => BD && BD.mode === 'done', null, 8000);
  await page.keyboard.up('ArrowUp');
  if(!fin) await ev(() => console.log('где малыш', JSON.stringify(BD.R.pos), BD.falls));
  check('дошла до флажка', fin, await ev(() => ({ z: BD.R && BD.R.pos.z, falls: BD.falls })));
  await page.waitForTimeout(800);
  const r1 = await ev(() => ({ ok: save.lv.my[0].ok, bs: save.lv.my[0].bs, bt: save.lv.my[0].bt, shells: save.shells, n: save.lv.n, panel: !!$('.bd-done') }));
  check('✅ проверен, звёздочка, ракушки', r1.ok && r1.bs === 1 && r1.bt > 0 && r1.shells === t0.shells + 3 && r1.n === 1 && r1.panel, r1);
  await shot('bd4-done');
  // ещё раз — ракушек больше не дают
  await tapSel('.bd-done [data-k="again"]');
  check('🔁 снова на старте', await until(() => BD.mode === 'play' && BD.R.pos.z > 0));
  // в воду сбоку: вынырнет на старте
  await page.keyboard.down('ArrowLeft');
  check('плюх в воду', await until(() => BD.R.water || BD.sink > 0, null, 6000));
  await page.keyboard.up('ArrowLeft');
  check('вынырнула на льдинке', await until(() => BD.falls === 1 && !BD.R.water && BD.R.pos.y > 0.2, null, 4000), await ev(() => ({ falls: BD.falls, p: BD.R.pos })));
  // пингвин толкается
  await ev(() => { BD.p.push(['pg', 0, -1, 0]); bdRebuild(); BD.R.pos.set(0, 0.3, -1); BD.R.vel.set(0, 0, 0); });
  check('пингвин толкнул', await until(() => BD.bumpT > 0, null, 5000));
  await ev(() => { BD.p.pop(); bdRebuild(); });
  // ✏️ назад строить: кнопка в углу
  await tapSel('#btnRunHome');
  check('✏️ назад на стройку', await until(() => BD.mode === 'edit' && !BD.R && !!$('.bd-bar')));
  check('проверен, пока не трогали', await ev(() => save.lv.my[0].ok));
  await ev(() => { const k = 'p0'; BD_A.set(k, {x:1, z:-1, r:0}); });
  check('поменяла кусок — снова не проверен', await ev(() => !save.lv.my[0].ok && save.lv.my[0].p[0][1] === 1));
  // нет финиша — не пускает
  await ev(() => { const i = BD.p.findIndex(q => q[0] === 'g'); BD.p.splice(i, 1); bdRebuild(); });
  await tapSel('.bd-bar [data-a="play"]');
  check('без 🏁 не пускает', await ev(() => BD.mode === 'edit'));
  // полка: новый, убрать
  await tapSel('.bd-bar [data-a="shelf"]');
  check('📚 полка', await until(() => BD.mode === 'shelf' && !!$('.bd-shelf')));
  await shot('bd5-shelf');
  await tapSel('.bd-shelf [data-k="new"]');
  check('➕ второй уровень', await until(() => BD.mode === 'edit' && save.lv.my.length === 2 && BD.i === 1));
  await tapSel('.bd-bar [data-a="shelf"]');
  await tapSel('.bd-shelf [data-del="1"]');
  await tapSel('.bd-shelf [data-k="yes"]');
  check('🗑️ уровень убран', await ev(() => save.lv.my.length === 1 && BD.mode === 'shelf'));
  // перезагрузка: уровень на месте
  await ev(() => persist());
  // домой
  await tapSel('#btnRunHome');
  check('🏠 домой', await until(() => !BD && petMode && mgRoot.hidden && !document.body.classList.contains('bd-on'), null, 8000));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof $ === 'function' && !$('#intro').hidden, null, { timeout: 30000 });
  const re = await ev(() => save.lv);
  check('после перезагрузки уровень цел', re.my.length === 1 && re.my[0].p.length === 2 && re.n >= 1, re);
  // в книге и на острове
  check('🧱 на карте книги и на острове', await ev(() => !!ST_PLACES.build && !!ISL_PL.build && ST_GATE.build === 1));
  check('медаль «Строитель»', await ev(() => TR_MEDALS.some(m => m.ic === '🧱')));
  check('без ошибок в консоли', !errors.length, errors);
  console.log(ok.map(x => '✓ ' + x).join('\n'));
  if(bad.length) console.log(bad.map(x => '✗ ' + x).join('\n'));
  console.log(`\n${ok.length} ✓, ${bad.length} ✗`);
  await browser.close(); srv.close();
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
