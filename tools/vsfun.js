#!/usr/bin/env node
/* 👫 «Поиграть» у малыша во время визита (js/visit.js: vsFunMark/vsFunAsk/vsAfterFun): значки на играх вдвоём,
   «Вдвоём или сама?», приглашение гостю, «Сама» — игра как обычно. Два headless Edge, сеть пересылает скрипт (как tools/duo.js).
   Запуск:  node tools/vsfun.js */
const { findPlaywright, serve, launch } = require('./lib');
const os = require('os'), path = require('path');
const shot = n => path.join(os.tmpdir(), `duo-${n}.png`);
let fails = 0;
const ok = (c, msg) => { console.log(`${c ? '✓' : '✗'} ${msg}`); if(!c) fails++; };
(async () => {
  const pw = findPlaywright(), { srv, port } = await serve(), base = `http://localhost:${port}`;
  const browser = await launch(pw);
  const mk = async (save, tag) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true });
    await ctx.addInitScript(s => { try{ localStorage.setItem('sh.save', JSON.stringify(s)); }catch(e){} }, save);
    const page = await ctx.newPage();
    page.on('pageerror', e => { console.log(`${tag} PAGEERROR`, e.message); fails++; });
    page.on('console', c => { if(c.type() === 'error') console.log(`${tag} CONSOLE`, c.text().slice(0, 200)); });
    await page.goto(base + '/?test=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof $ === 'function' && !$('#intro').hidden, null, { timeout: 30000 });
    await page.evaluate(() => { $('#btnIntroPet').click(); });
    await page.waitForTimeout(1500);
    return page;
  };
  const sab = { version: 1, progress: 12, shifts: 6, shells: 300, who: { name: 'Сабрина', g: 'f', asked: true },
    pet: { name: 'Тюпа', f: true, coat: 'pink', stage: 3, played: true, finds: ['a'] }, story: { open: 4, fest: [], seen: 4, sa: false }, adv: { tips: ['ch1', 'isle'] } };
  const dad = { version: 1, progress: 3, shifts: 1, shells: 50, who: { name: 'Папа', g: 'm', asked: true },
    pet: { name: 'Пух', f: false, coat: 'sky', stage: 2, played: true, finds: [] }, story: { open: 2, fest: [], seen: 2, sa: false }, adv: { tips: ['ch1', 'isle'] } };
  const host = await mk(sab, 'host'), guest = await mk(dad, 'guest');
  // сеть-заглушка: что шлёт один — скрипт отдаёт другому
  const wire = async (from, to, isHost) => {
    await from.exposeFunction('__relay', s => to.evaluate(m => { const f = net.on[m.t]; if(f) f(m); }, JSON.parse(s)).catch(() => {}));
    await from.evaluate(h => { net.conn = {open:true, send:m => window.__relay(JSON.stringify(m))}; net.peer = {destroyed:false, disconnected:false, destroy(){}, reconnect(){}}; net.host = h; }, isHost);
  };
  await wire(host, guest, true); await wire(guest, host, false);
  await host.evaluate(() => { visitHost({name:'Пух', coat:'sky', stage:2, f:false, want:'visitor'}); });
  await guest.evaluate(() => { visitGuest({name:'Тюпа', coat:'pink', stage:3, f:true, want:'visit'}); });
  await host.waitForTimeout(3000);
  const pick = async () => { await host.evaluate(() => { petDo('fun'); }); await host.waitForTimeout(900); };
  await pick();
  const tiles = await host.evaluate(() => [...document.querySelectorAll('.fun-pick .picks [data-k]')].map(b => b.dataset.k + (b.querySelector('.vs-duo') ? '👫' : '')));
  console.log(tiles.join(' '));
  ok(tiles.includes('slide👫') && tiles.includes('isle👫') && tiles.includes('ball'), '👫 на играх вдвоём, нет на мяче');
  ok(await host.evaluate(() => document.querySelector('.fun-pick [data-k="coop"] b').textContent) === 'Играем вдвоём', 'плитка «Вместе» → «Играем вдвоём»');
  await host.evaluate(() => document.querySelector('.fun-pick [data-k="slide"]').click()); await host.waitForTimeout(400);
  await host.screenshot({ path: shot('fun-ask') });
  ok(await host.evaluate(() => !!document.querySelector('.fun-pick [data-k="duo"]')), 'вопрос «Вдвоём или сама?»');
  await host.evaluate(() => document.querySelector('.fun-pick [data-k="duo"]').click()); await host.waitForTimeout(2500);
  ok(await guest.evaluate(() => V && V.inv === 'slide'), 'гостю пришло приглашение на горку');
  ok(await host.evaluate(() => V && V.ask === 'slide' && !busy), 'хозяйка ждёт ответ, уголок свободен');
  await guest.evaluate(() => { netSend({t:'vno'}); V.inv = null; }); await host.waitForTimeout(800);
  // сама: игра начинается как обычно
  await host.evaluate(() => { V.ask = null; }); await pick();
  await host.evaluate(() => document.querySelector('.fun-pick [data-k="chase"]').click()); await host.waitForTimeout(400);
  await host.evaluate(() => document.querySelector('.fun-pick [data-k="solo"]').click()); await host.waitForTimeout(2500);
  ok(await host.evaluate(() => funKind === 'chase' && !V.ask), '«Сама» — салки без приглашения');
  console.log(fails ? `✗ ошибок: ${fails}` : '✓ всё хорошо'); await browser.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
