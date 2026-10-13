#!/usr/bin/env node
/* 🏊 Заплыв по сети (js/swimrace.js, режим net): визит → хозяйка зовёт в заплыв → гость соглашается → оба плывут одну трассу,
   видят друг друга, финиш у обоих, у каждого в итогах второй, «Домой» → снова в визите. Два headless Edge, сеть пересылает скрипт.
   Запуск:  node tools/swimduo.js */
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
  await host.waitForTimeout(2500);
  await host.evaluate(() => { save.free = true; vsAskGame('swim'); });
  await guest.waitForTimeout(800);
  ok(await guest.evaluate(() => V && V.inv === 'swim'), 'гостю пришло приглашение в заплыв');
  await guest.evaluate(() => { const g = V.inv; V.inv = null; netSend({t:'vyes', g}); vsStart(g); });
  await host.waitForFunction(() => SW && SW.st === 'go', null, { timeout: 40000 });
  await guest.waitForFunction(() => SW && SW.st === 'go', null, { timeout: 10000 });
  const same = await Promise.all([host, guest].map(p => p.evaluate(() => [SW.seed, SW.T.name, SW.L0.fin])));
  ok(JSON.stringify(same[0]) === JSON.stringify(same[1]), `одна трасса у обоих (${same[0].join(', ')})`);
  ok(await host.evaluate(() => SW.pal && SW.pal.kind === 'net' && SW.pal.name === 'Пух' && !SW.bots.length), 'у хозяйки напарник — Пух, ботов нет');
  // гребём в такт и плывём: у гостя — в глубину
  const row = p => p.evaluate(() => { window.__iv = setInterval(() => { if(SW && SW.st === 'go') swTap(); }, 800); });
  await row(host); await row(guest); await guest.evaluate(() => { SW.me.yt = -2.6; });
  await host.waitForTimeout(6000);
  const seen = await host.evaluate(() => ({d:Math.abs(SW.pal.s - SW.me.s), pal:SW.pal.s, y:SW.pal.y, vis:SW.pal.root.visible || SW.pal.s < SW.me.s}));
  const gs = await guest.evaluate(() => ({s:SW.me.s, y:SW.me.y}));
  ok(seen.pal > 10 && Math.abs(seen.pal - gs.s) < 3 && seen.y < -1, `хозяйка видит гостя там, где он (${seen.pal.toFixed(1)} ≈ ${gs.s.toFixed(1)}, глубина ${seen.y.toFixed(1)})`);
  await host.screenshot({ path: shot('swim-race') });
  await host.waitForFunction(() => document.querySelector('.sl-end'), null, { timeout: 150000 });
  await guest.waitForFunction(() => document.querySelector('.sl-end'), null, { timeout: 30000 });
  await host.screenshot({ path: shot('swim-end') });
  const pod = await Promise.all([host, guest].map(p => p.evaluate(() => document.querySelector('.sl-podium') ? document.querySelector('.sl-podium').textContent : '')));
  ok(pod[0].includes('Пух') && pod[1].includes('Тюпа'), `в итогах оба: «${pod[0]}» / «${pod[1]}»`);
  ok(await guest.evaluate(() => !document.querySelector('.sl-end [data-k="again"]') && !document.querySelector('.sl-end .co-wait').hidden), 'у гостя «Ещё раз» решает хозяйка');
  await host.evaluate(() => document.querySelector('.sl-end [data-k="home"]').click());
  await host.waitForTimeout(4000);
  ok(await host.evaluate(() => !SW && V && !V.game), 'хозяйка дома, визит идёт');
  ok(await guest.evaluate(() => !SW && V && !V.game), 'гость тоже вернулся в визит');
  console.log(fails ? `✗ ошибок: ${fails}` : '✓ всё хорошо'); await browser.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
