/* Проверка редактора иглу (js/editor.js, js/homeedit.js) в headless Edge: старое сохранение (версия 1, мебель по местам) →
   миграция → «Обустроить» → вещь из коробки → тащить → повернуть → в коробку → ↩️ → краска → снимки в tools/out/.
   Запуск: node tools/edtest.js [--shots] */
const fs = require('fs'), path = require('path');
const { ROOT, findPlaywright, serve, launch } = require('./lib');
const SHOTS = process.argv.includes('--shots'), OUT = path.join(ROOT, 'tools', 'out');

const OLD = {   // сохранение до Спринта 8: мебель по местам
  version: 1, free: true, progress: 12, shifts: 6, shells: 300,
  who: { name: 'Сабрина', g: 'f', asked: true },
  pet: { name: 'Тюпа', f: true, coat: 'snow', stage: 3, played: true, finds: ['a'] },
  owned: ['rug_heart', 'lamp_star', 'tank_big', 'pouf_cloud'],
  home: { s: { bed: 'bed_basic', window: 'win_basic', shelf: 'shelf', rug: 'rug_heart', lamp: 'lamp_star', tank: 'tank_big', gm1: 'pouf_heart' }, v: true, rooms: { games: 2, trophy: 2, ocean: 2 } },
  story: { open: 8, fest: [], seen: [], sa: true }, storm: { st: 4 }
};

(async () => {
  const pw = findPlaywright(), { srv, port } = await serve(), browser = await launch(pw);
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, deviceScaleFactor: 1 });
  await ctx.addInitScript(s => { try{ if(!sessionStorage.getItem('x')){ sessionStorage.setItem('x', 1); localStorage.setItem('sh.save', JSON.stringify(s)); } }catch(e){} }, OLD);
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', c => { if(c.type() === 'error' && !/Failed to load|fonts|favicon|peerjs|AudioContext/i.test(c.text())) errors.push('console: ' + c.text().slice(0, 200)); });
  if(SHOTS) fs.mkdirSync(OUT, { recursive: true });
  const shot = async n => { if(SHOTS) await page.screenshot({ path: path.join(OUT, n + '.png') }); };
  const ev = (f, a) => page.evaluate(f, a);
  const ok = [], bad = [];
  const check = (name, cond, info) => (cond ? ok : bad).push(name + (info !== undefined ? ' — ' + JSON.stringify(info) : ''));
  await page.goto(`http://127.0.0.1:${port}/?test=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof $ === 'function' && !$('#intro').hidden, null, { timeout: 30000 });
  await page.waitForTimeout(1200);
  // миграция: home.s → home.f
  const mig = await ev(() => ({ v: save.version, f: save.home.f, s: save.home.s }));
  check('миграция 1→2', mig.v === 2 && !mig.s && mig.f.bed_basic && mig.f.bed_basic[0] === 'hall' && mig.f.pouf_heart && mig.f.pouf_heart[0] === 'games', mig);
  await ev(() => { $('#btnIntroPet').click(); });
  await page.waitForTimeout(3000);
  await ev(() => homeEnter());
  await page.waitForFunction(() => homeMode && !busy, null, { timeout: 15000 });
  await ev(() => { homeIdleT = 999; });
  const spots = await ev(() => ({ bed: save.home.f.bed_basic, rug: save.home.f.rug_heart, tank: save.home.f.tank_big, win: save.home.f.win_basic, n: Object.keys(homeItems).length }));
  check('старые места сохранились', spots.bed[1] === -1.95 && spots.bed[2] === -0.95 && spots.tank[1] === 2.35 && spots.win[1] === -0.62, spots);
  await shot('ed1-hall');
  // в «Обустроить»
  await ev(() => $('#homeEditBtn').click());
  await page.waitForTimeout(900);
  check('редактор открылся', await ev(() => homeEdit && edOn() && !$('#edBar').hidden && getComputedStyle($('#edBar')).display !== 'none'));
  await shot('ed2-edit');
  // тащим коврик пальцем
  const rugAt = await ev(() => { const q = toScreen(homeItems.rug_heart.getWorldPosition(new V3())); return q; });
  await page.mouse.move(rugAt.x, rugAt.y); await page.mouse.down();
  for(let i = 1; i <= 8; i++){ await page.mouse.move(rugAt.x - i*8, rugAt.y + i*6); await page.waitForTimeout(30); }
  await shot('ed3-drag');
  await page.mouse.up(); await page.waitForTimeout(300);
  const rug2 = await ev(() => save.home.f.rug_heart);
  check('коврик переехал', rug2[1] !== 0.15 || rug2[2] !== 0.35, rug2);
  // коснуться коврика ещё раз — повернётся (он выбран после перетаскивания)
  const rugAt2 = await ev(() => toScreen(homeItems.rug_heart.getWorldPosition(new V3())));
  await page.mouse.click(rugAt2.x, rugAt2.y); await page.waitForTimeout(600);
  const rug3 = await ev(() => save.home.f.rug_heart);
  check('коврик повернулся', Math.abs(rug3[3] - rug2[3]) > 0.5, [rug2[3], rug3[3]]);
  await shot('ed4-turn');
  // лампу тащим к кровати — тесно: вернётся
  const lamp0 = await ev(() => save.home.f.lamp_star.slice());
  const la = await ev(() => toScreen(homeItems.lamp_star.getWorldPosition(new V3()).add(new V3(0, 0.3, 0))));
  const bd = await ev(() => toScreen(homeItems.bed_basic.getWorldPosition(new V3()).add(new V3(0, 0.3, 0))));
  await page.mouse.move(la.x, la.y); await page.mouse.down();
  for(let i = 1; i <= 12; i++){ await page.mouse.move(la.x + (bd.x - la.x)*i/12, la.y + (bd.y - la.y)*i/12); await page.waitForTimeout(25); }
  const red = await ev(() => ED.drag && !ED.drag.ok);
  await shot('ed5-tight');
  await page.mouse.up(); await page.waitForTimeout(500);
  const lamp1 = await ev(() => save.home.f.lamp_star);
  check('на кровать нельзя: кольцо красное и лампа вернулась', red && lamp1[1] === lamp0[1] && lamp1[2] === lamp0[2], { red, lamp0, lamp1 });
  // выбрать лампу и убрать в коробку
  await ev(() => edSelect('lamp_star')); await page.waitForTimeout(200);
  await ev(() => $('#edTb [data-a="box"]').click()); await page.waitForTimeout(300);
  check('лампа в коробке', await ev(() => !save.home.f.lamp_star && !homeItems.lamp_star && heMine().some(f => f.id === 'lamp_star')));
  // ↩️ вернёт
  await ev(() => $('#edUndo').click()); await page.waitForTimeout(300);
  check('↩️ вернул лампу', await ev(() => !!save.home.f.lamp_star && !!homeItems.lamp_star));
  // пуфик из Игровой — в прихожую
  await ev(() => { HE.tab = 'mine'; heBarRender(); });
  await shot('ed6-mine');
  await ev(() => $('#edBar .ed-card[data-id="pouf_heart"]').click()); await page.waitForTimeout(500);
  const pouf = await ev(() => save.home.f.pouf_heart);
  check('пуфик переехал в прихожую', pouf && pouf[0] === 'hall' && pouf.length === 4, pouf);
  // окно по стене
  const wa = await ev(() => toScreen(homeItems.win_basic.getWorldPosition(new V3())));
  await page.mouse.move(wa.x, wa.y); await page.mouse.down();
  for(let i = 1; i <= 8; i++){ await page.mouse.move(wa.x + i*3, wa.y - i); await page.waitForTimeout(25); }
  const wdbg = await ev(() => ({ key: ED.dn && ED.dn.key, drag: ED.drag && {p:ED.drag.p, ok:ED.drag.ok} }));
  await page.mouse.up(); await page.waitForTimeout(300);
  const win = await ev(() => save.home.f.win_basic);
  if(win[1] === -0.62) console.log('окно:', JSON.stringify(wdbg), JSON.stringify(wa));
  check('окно поехало по стене', win[1] !== -0.62, win);
  // купить в редакторе
  await ev(() => { HE.tab = 'shop'; heBarRender(); });
  await shot('ed7-shop');
  const sh0 = await ev(() => save.shells);
  await ev(() => $('#edBar .ed-card[data-id="bed_shell"]').click()); await page.waitForTimeout(300);
  await shot('ed8-ask');
  await ev(() => $('#edBar [data-y]').click()); await page.waitForTimeout(600);
  const buy = await ev(() => ({ sh: save.shells, own: owns('bed_shell'), at: save.home.f.bed_shell }));
  check('купили и поставили ракушку', buy.own && buy.sh === sh0 - 40 && buy.at, buy);
  // краска
  await ev(() => { HE.tab = 'paint'; heBarRender(); });
  await ev(() => $('#edBar .ed-sw[data-k="w"][data-id="pink"]').click()); await page.waitForTimeout(300);
  await ev(() => $('#edBar [data-y]').click()); await page.waitForTimeout(300);
  await ev(() => $('#edBar .ed-sw[data-k="f"][data-id="mint"]').click()); await page.waitForTimeout(300);
  await ev(() => $('#edBar [data-y]').click()); await page.waitForTimeout(500);
  const pt = await ev(() => ({ p: save.home.paint.hall, map: HOME_ROOMS.hall.mat.wall.map === heTex('w', 'pink') }));
  check('стены розовые, пол мятный', pt.p && pt.p.w === 'pink' && pt.p.f === 'mint' && pt.map, pt);
  await shot('ed9-paint');
  // готово → малыш играет с вещью, которая переехала
  await ev(() => $('#edDone').click()); await page.waitForTimeout(900);
  check('вышли из редактора', await ev(() => !homeEdit && !edOn()));
  await shot('ed10-done');
  await ev(() => homePlay('bed_shell')); await page.waitForTimeout(5000);
  check('малыш поиграл с кроватью', await ev(() => !busy));
  // Игровая: пуфика там больше нет, ➕ места gm1 нет (пуфик есть в прихожей)
  await ev(() => rmGo('games')); await page.waitForFunction(() => homeRoom === 'games' && !busy, null, { timeout: 15000 });
  await ev(() => { homeIdleT = 999; });
  check('в Игровой нет пуфика', await ev(() => !homeIn('games').includes('pouf_heart')));
  await ev(() => $('#homeEditBtn').click()); await page.waitForTimeout(900);
  await shot('ed11-games');
  await ev(() => $('#edDone').click()); await page.waitForTimeout(500);
  await ev(() => rmBack()); await page.waitForFunction(() => homeRoom === 'hall' && !busy, null, { timeout: 15000 });
  await ev(() => ocGo()); await page.waitForFunction(() => homeRoom === 'ocean' && !busy, null, { timeout: 15000 });
  await ev(() => { homeIdleT = 999; $('#homeEditBtn').click(); }); await page.waitForTimeout(900);
  check('океанариум: краски нет', await ev(() => $('#edBar [data-t="paint"]').hidden));
  await shot('ed12-ocean');
  await ev(() => $('#edDone').click()); await page.waitForTimeout(500);
  // перезагрузка: всё на месте
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof $ === 'function' && !$('#intro').hidden, null, { timeout: 30000 });
  const after = await ev(() => ({ rug: save.home.f.rug_heart, pouf: save.home.f.pouf_heart, paint: save.home.paint.hall }));
  check('после перезагрузки всё на месте', after.rug[1] === rug3[1] && after.pouf[0] === 'hall' && after.paint.w === 'pink', after);
  // код сохранения старой версии переносит мебель
  const code = await ev(() => { const d = JSON.parse(JSON.stringify(save)); d.version = 1; d.home = {...d.home, s:{bed:'bed_cloud', rug:'rug_round'}}; delete d.home.f; const u = upgrade(d); return u.home.f; });
  check('старый код сохранения → f', code.bed_cloud && code.bed_cloud[0] === 'hall' && code.rug_round, code);
  console.log(ok.map(s => '✓ ' + s).join('\n'));
  console.log(bad.map(s => '✗ ' + s).join('\n'));
  if(errors.length) console.log('ОШИБКИ:\n' + [...new Set(errors)].join('\n'));
  await browser.close(); srv.close();
  process.exit(bad.length || errors.length ? 1 : 0);
})();
