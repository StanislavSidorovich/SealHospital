#!/usr/bin/env node
/* 🧱 Проверка «стройки вдвоём» (js/buildduo.js) без интернета: два headless Edge — хозяйка (Сабрина) и гость (папа),
   сообщения сети пересылает сам скрипт (как tools/duo.js). Сценарий: визит на льдине → Сабрина идёт на площадку → папа приходит сам,
   видит её полку и подсказывает уровень → «▶» на полке — бегут оба → у финиша кто сколько, ✅ только её, ракушки папе →
   ✏️ строить: папа ставит кусок — у неё он появился и ✅ снят, она ↩️ отменяет — у папы тоже; правка «вдогонку» отскакивает →
   «Побежали?» → 🏠 домой — папа снова на льдине → остров: папа у знака 🧱 зовёт → она «Поехали!» → оба на площадке → назад на остров →
   папа прощается прямо на площадке.
   Запуск:  node tools/bdduo.js   (скриншоты bdduo-*.png — во временной папке) */
const { findPlaywright, serve, launch } = require('./lib');
const os = require('os'), path = require('path');
const shot = n => path.join(os.tmpdir(), `bdduo-${n}.png`);
let fails = 0;
const ok = (c, msg, info) => { console.log(`${c ? '✓' : '✗'} ${msg}${!c && info !== undefined ? ' — ' + JSON.stringify(info) : ''}`); if(!c) fails++; };
(async () => {
  const pw = findPlaywright(), { srv, port } = await serve(), base = `http://localhost:${port}`;
  const browser = await launch(pw);
  const mk = async (save, tag) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true });
    await ctx.addInitScript(s => { try{ localStorage.setItem('sh.save', JSON.stringify(s)); }catch(e){} }, save);
    const page = await ctx.newPage();
    page.on('pageerror', e => { console.log(`${tag} PAGEERROR`, e.message); fails++; });
    page.on('console', c => { if(c.type() === 'error' && !/Failed to load|fonts|favicon|peerjs|AudioContext/i.test(c.text())) console.log(`${tag} CONSOLE`, c.text().slice(0, 200)); });
    await page.goto(base + '/?test=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof $ === 'function' && !$('#intro').hidden, null, { timeout: 30000 });
    await page.evaluate(() => { $('#btnIntroPet').click(); });
    await page.waitForTimeout(1500);
    return page;
  };
  const lv = { name: 'Уровень 1', ic: '🐧', p: [['f', 0, -1.5, 0], ['st', 0, -4, 0], ['g', 0, -6.5, 0]], ok: true, bt: 4.2, bs: 1 };
  const sab = { version: 2, free: true, progress: 12, shifts: 6, shells: 300, who: { name: 'Сабрина', g: 'f', asked: true },
    pet: { name: 'Тюпа', f: true, coat: 'pink', stage: 3, played: true, finds: ['a'] }, story: { open: 8, fest: [], seen: 8, sa: true }, storm: { st: 4 },
    adv: { tips: ['ch1', 'isle', 'bd'] }, lv: { my: [lv], n: 1, day: { d: '', n: 0 } } };
  const dad = { version: 2, free: true, progress: 3, shifts: 1, shells: 50, who: { name: 'Папа', g: 'm', asked: true },
    pet: { name: 'Пух', f: false, coat: 'sky', stage: 2, played: true, finds: [] }, story: { open: 2, fest: [], seen: 2, sa: false }, adv: { tips: ['ch1', 'isle', 'bd'] } };
  const host = await mk(sab, 'host'), guest = await mk(dad, 'guest');
  const wire = async (from, to, isHost) => {
    await from.exposeFunction('__relay', s => to.evaluate(m => { const f = net.on[m.t]; if(f) f(m); }, JSON.parse(s)).catch(() => {}));
    await from.evaluate(h => { net.conn = {open:true, send:m => window.__relay(JSON.stringify(m))}; net.peer = {destroyed:false, disconnected:false, destroy(){}, reconnect(){}}; net.host = h; }, isHost);
  };
  await wire(host, guest, true); await wire(guest, host, false);
  await host.evaluate(() => { visitHost({name:'Пух', coat:'sky', stage:2, f:false, want:'visitor'}); });
  await guest.evaluate(() => { visitGuest({name:'Тюпа', coat:'pink', stage:3, f:true, want:'visit'}); });
  await host.waitForTimeout(4000);
  ok(await host.evaluate(() => V.landed), 'визит на льдине: гость запрыгнул');
  const until = (pg, f, a, ms = 15000) => pg.waitForFunction(f, a, { timeout: ms }).then(() => true, () => false);

  // 🧱 Сабрина идёт на площадку (🎮 → 🧱) — у неё полка, папа приходит сам
  ok(await host.evaluate(() => vsGames()[0] === 'build') && await guest.evaluate(() => vsGames().includes('build')), '🧱 есть в 🎮 у обоих');
  ok(await host.evaluate(() => !coGamesOn().includes('build')), 'в «Вместе» вкладки 🧱 нет');
  await host.evaluate(() => { bdVisitGo(); });
  ok(await until(host, () => BD && BD.mode === 'shelf' && !!$('.bd-shelf')), 'хозяйка на площадке, полка');
  ok(await until(guest, () => typeof BD !== 'undefined' && BD && BD.guest && BD.mode === 'shelf' && document.querySelectorAll('.bd-shelf [data-i]').length === 1), 'папа сам пришёл и видит её полку');
  await host.waitForTimeout(800);
  ok(await host.evaluate(() => V.s.root.visible && !!BD.du) && await guest.evaluate(() => V.pup.root.visible && !!BD.du), 'видят друг друга на льдине старта');
  await guest.click('.bd-shelf [data-i="0"]'); await host.waitForTimeout(400);
  ok(await host.evaluate(() => !!document.querySelector('.bd-shelf [data-i="0"].bd-want')), 'папа коснулся уровня — у неё он мигает');
  await guest.screenshot({ path: shot('guest-shelf') });

  // ▶ на полке — бегут оба
  await host.click('.bd-shelf .bd-run', { force: true });
  ok(await until(host, () => BD.mode === 'play' && BD.run === 1), 'хозяйка: ▶ — забег');
  ok(await until(guest, () => BD.mode === 'play' && BD.run === 1 && BD.p.length === 3), 'папа бежит тоже, по её уровню');
  const run = async pg => {
    await pg.keyboard.down('ArrowUp');
    await until(pg, () => BD.R.pos.z < -2.3, null, 8000);
    await pg.keyboard.press(' ');
    const f = await until(pg, () => BD && BD.mode === 'done', null, 8000);
    await pg.keyboard.up('ArrowUp');
    return f;
  };
  ok(await run(guest), 'папа добежал первым');
  await host.waitForTimeout(300);
  ok(await host.evaluate(() => !!BD.du.pal && /🏁/.test(BD.hud.textContent)), 'у неё: «папа у флажка» и 🏁 в шапке');
  await host.screenshot({ path: shot('host-run') });
  ok(await run(host), 'Сабрина добежала');
  await host.waitForTimeout(600);
  const res = await host.evaluate(() => ({ t: ($('.bd-duo-res') || {}).textContent || '', ok: save.lv.my[0].ok, run: save.lv.n }));
  ok(/Тюпа/.test(res.t) && /Пух/.test(res.t) && !/бежит/.test(res.t), 'у финиша — кто сколько (оба)', res);
  ok(await guest.evaluate(() => /Тюпа/.test(($('.bd-duo-res') || {}).textContent || '') && !/бежит/.test($('.bd-duo-res').textContent)), 'у папы тоже оба');
  const gs = await guest.evaluate(() => ({ shells: save.shells, lv: save.lv.my.length, day: save.lv.day.n }));
  ok(gs.shells === 53 && gs.lv === 0 && gs.day === 1, 'папе +3 🐚, своих уровней у него не появилось', gs);
  await host.screenshot({ path: shot('host-done') }); await guest.screenshot({ path: shot('guest-done') });

  // ✏️ строим вдвоём
  await host.click('#btnRunHome');
  ok(await until(host, () => BD.mode === 'edit' && !!$('.bd-bar')), 'хозяйка: ✏️ строить');
  ok(await until(guest, () => BD.mode === 'edit' && !!$('.bd-bar') && !$('.bd-bar [data-a="shelf"]')), 'папа тоже строит (без 📚)');
  await guest.click('.bd-bar [data-t="F"]');
  ok(await until(host, () => BD.p.length === 4 && BD.p[3][0] === 'F' && !save.lv.my[0].ok), 'папа поставил 🧊 — у неё появилась, ✅ снят');
  await host.waitForTimeout(500);
  ok(await guest.evaluate(() => BD.p.length === 4 && !BD.du.pend && BD.sid === '' + BD.sid), 'у папы правка подтвердилась');
  await host.screenshot({ path: shot('host-coedit') });
  // она тащит свой кусок — у папы он переезжает
  await host.evaluate(() => { edPush(BD_A.save()); BD_A.set('p0', {x:2, z:-1.5, r:0}); });
  ok(await until(guest, () => BD.p[0][1] === 2), 'Сабрина передвинула — у папы тоже');
  await host.click('.bd-bar [data-a="undo"]'); await host.waitForTimeout(200); await host.click('.bd-bar [data-a="undo"]');
  ok(await until(guest, () => BD.p.length === 3 && BD.p[0][1] === 0), '↩️ ↩️ у неё — папин кусок убран и у него');
  // правка «вдогонку» (по старой версии) отскакивает
  await guest.evaluate(() => { BD.sid = 'stale'; BD_A.set('p0', {x:-3, z:-1.5, r:0}); });
  await host.waitForTimeout(1200);
  ok(await host.evaluate(() => BD.p[0][1] === 0) && await guest.evaluate(() => BD.p[0][1] === 0), 'устаревшая правка папы отскочила — у обоих как у неё');
  // видно, что второй выбрал и тащит (bdg): кольцо с именем, кусок едет за пальцем, отпустил — на месте
  await guest.evaluate(() => { edSelect('p1'); }); await host.waitForTimeout(600);
  ok(await host.evaluate(() => BDU_RING.visible && BD.du.gl && BD.du.gl.visible), 'папа выбрал кусок — у неё голубое кольцо и «💙 Пух»');
  await guest.evaluate(() => { ED.drag = {key:'p1', from:BD_A.get('p1'), snap:BD_A.save(), p:{x:3, z:-4, r:0}, ok:true}; }); await host.waitForTimeout(600);
  const dr = await host.evaluate(() => ({x:BD.items[1].position.x, y:BD.items[1].position.y, p:BD.p[1][1]}));
  ok(dr.x === 3 && dr.p === 0, 'папа тащит — у неё кусок едет за его пальцем (только вид)', dr);
  await host.screenshot({ path: shot('host-seedrag') });
  await guest.evaluate(() => { ED.drag = null; edSelect(null); }); await host.waitForTimeout(800);
  ok(await host.evaluate(() => !BDU_RING.visible && BD.items[1].position.x === BD.p[1][1]), 'отпустил без правки — кусок на месте, кольца нет');
  await host.evaluate(() => { edSelect('p0'); ED.drag = {key:'p0', from:BD_A.get('p0'), snap:BD_A.save(), p:{x:-2.5, z:-1.5, r:0}, ok:true}; }); await guest.waitForTimeout(600);
  ok(await guest.evaluate(() => BDU_RING.visible && BD.items[0].position.x === -2.5), 'и наоборот: Сабрина тащит — папа видит');
  await host.evaluate(() => { ED.drag = null; edSelect(null); }); await guest.waitForTimeout(700);
  await guest.click('.bd-bar [data-a="play"]'); await host.waitForTimeout(300);
  ok(await host.evaluate(() => !!document.querySelector('.bd-bar [data-a="play"].bd-want')), '«▶ Побежали?» — у неё мигает ▶');

  // 🏠 Сабрина уходит с площадки — папа снова на льдине
  await host.evaluate(() => { bdShelf(); }); await host.waitForTimeout(300);
  ok(await until(guest, () => BD && BD.mode === 'shelf'), 'папа видит, что она на полке');
  await host.evaluate(() => { BD.done(); });
  ok(await until(guest, () => !BD && V && V.view, null, 8000), 'она дома — папа снова на льдине');
  ok(await host.evaluate(() => !BD && !document.body.classList.contains('bd-on')), 'у неё площадка закрыта');

  // 🗺️ на острове: папа у знака 🧱 зовёт — она соглашается — оба на площадке, потом снова на острове
  await host.waitForFunction(() => !busy && mgRoot.hidden, null, { timeout: 15000 }).catch(() => {});
  await host.evaluate(() => { funPre = 'isle'; petDo('fun'); });
  ok(await until(guest, () => typeof ISL !== 'undefined' && ISL && ISL.guest, null, 20000), 'оба на острове');
  await guest.waitForTimeout(1500);
  await guest.evaluate(() => { const p = islRoot.userData.pl.build.pos; ISL.R.pos.set(p.x, 0, p.z + 2.2); ISL.near = null; });
  await guest.waitForTimeout(800);
  const sign = await guest.evaluate(() => { const e = document.querySelector('.isl-go:not([hidden])'); return e ? e.textContent : ''; });
  ok(/Уровни/.test(sign), 'у гостя у знака — «🧱 Уровни Тюпа ▶»', sign);
  if(/Уровни/.test(sign)) await guest.click('.isl-go button', { force: true });
  ok(await until(host, () => !!document.querySelector('.vs-pick [data-k="yes"]'), null, 8000), 'у неё приглашение «Играем?»');
  await host.click('.vs-pick [data-k="yes"]');
  ok(await until(host, () => typeof BD !== 'undefined' && BD && !BD.guest, null, 20000), 'она пошла на площадку через знак');
  ok(await until(guest, () => typeof BD !== 'undefined' && BD && BD.guest, null, 20000), 'папа пришёл туда же прямо с острова');
  await host.waitForTimeout(800);
  await host.evaluate(() => { BD.done(); });
  ok(await until(host, () => typeof ISL !== 'undefined' && ISL && !ISL.guest, null, 20000), 'после площадки она снова на острове у знака');
  ok(await until(guest, () => typeof ISL !== 'undefined' && ISL && ISL.guest, null, 20000), 'и папа снова на острове');

  // папа прощается прямо на площадке — у неё всё продолжается
  await host.evaluate(() => { ISL.done('build'); });
  ok(await until(guest, () => typeof BD !== 'undefined' && BD && BD.guest, null, 20000), 'снова вдвоём на площадке');
  await host.waitForTimeout(1000);
  await guest.evaluate(() => { vsByeTap(); vsByeTap(); });
  await host.waitForTimeout(1500);
  ok(await guest.evaluate(() => !V && !BD), 'папа ушёл домой');
  ok(await host.evaluate(() => !V && !!BD && !BD.du && !document.querySelector('.bd-duo')), 'у неё площадка открыта, без гостя');
  await host.screenshot({ path: shot('host-end') });
  console.log(fails ? `\n✗ ошибок: ${fails}` : '\n✓ всё работает', '— скриншоты:', shot('*'));
  await browser.close(); srv.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
