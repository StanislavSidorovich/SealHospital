#!/usr/bin/env node
/* 🗺️ Проверка «острова вдвоём» (js/isleduo.js) без интернета: два headless Edge — хозяйка (Сабрина) и гость (папа),
   сообщения сети пересылает сам скрипт (net.conn у обоих — заглушка). Сценарий: визит на льдине → хозяйка идёт гулять →
   гость сам приплывает на остров → видят друг друга → салки → спинка в воде → гость показывает звёздочку →
   пещера и рыбалка только у хозяйки (гость ждёт) → игра вдвоём прямо с острова и обратно на остров → гость прощается.
   Запуск:  node tools/duo.js   (скриншоты duo-*.png — во временной папке) */
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
  await host.waitForTimeout(4000);
  ok(await host.evaluate(() => V.landed), 'визит на льдине: гость запрыгнул');

  // хозяйка идёт гулять по острову — гость за ней
  await host.evaluate(() => { funPre = 'isle'; petDo('fun'); });
  await guest.waitForFunction(() => typeof ISL !== 'undefined' && ISL && ISL.guest, null, { timeout: 15000 }).catch(() => {});
  ok(await guest.evaluate(() => !!(ISL && ISL.guest)), 'гость сам пришёл на остров');
  await host.waitForTimeout(2500);
  const see = async () => ({
    h: await host.evaluate(() => ({ me: ISL.R.pos.toArray().map(x => +x.toFixed(1)), pal: V.s.root.visible, palAt: V.s.root.position.clone().sub(ISL_POS).toArray().map(x => +x.toFixed(1)) })),
    g: await guest.evaluate(() => ({ me: ISL.R.pos.toArray().map(x => +x.toFixed(1)), pal: V.pup.root.visible, palAt: V.pup.root.position.clone().sub(ISL_POS).toArray().map(x => +x.toFixed(1)) }))
  });
  let s = await see(); console.log('  ', JSON.stringify(s));
  ok(s.h.pal && s.g.pal, 'видят друг друга');
  // хозяйка идёт вправо — у гостя её малыш идёт следом
  await host.evaluate(() => { ISL.R.key.set(1, 0, 0); });
  await host.waitForTimeout(1200);
  await host.evaluate(() => { ISL.R.key.set(0, 0, 0); });
  await host.waitForTimeout(600);
  s = await see(); console.log('  ', JSON.stringify(s));
  ok(Math.hypot(s.h.me[0] - s.g.palAt[0], s.h.me[2] - s.g.palAt[2]) < 0.6, 'у гостя малыш хозяйки там же, где у неё');
  await host.screenshot({ path: shot('host-isle') }); await guest.screenshot({ path: shot('guest-isle') });

  // 🏃 салки: гость нажал — гость водит; подбежал вплотную — осалил
  await guest.click('.idu-tag');
  await host.waitForTimeout(500);
  ok(await host.evaluate(() => V.tag && V.tag.it === 'g') && await guest.evaluate(() => V.tag && V.tag.it === 'g'), 'салки: гость водит (у обоих)');
  await host.waitForTimeout(2300);
  await guest.evaluate(() => { const q = V.ip.p; ISL.R.pos.set(q.x + 0.4, q.y, q.z); });
  await host.waitForTimeout(1000);
  ok(await host.evaluate(() => V.tag && V.tag.it === 'h' && V.tag.n === 1) && await guest.evaluate(() => V.tag && V.tag.it === 'h'), 'салки: осалил — теперь водит хозяйка');
  console.log('   hint у хозяйки:', await host.evaluate(() => mgHintEl.textContent));
  await host.click('.idu-tag');
  await host.waitForTimeout(500);
  ok(!(await guest.evaluate(() => V.tag)), 'салки кончились у обоих');

  // 🐢 спинка: оба в воде рядом → гость «На спинку» → хозяйка плывёт и везёт
  await host.evaluate(() => { ISL.R.pos.set(-27, -0.5, 36); ISL.R.vel.set(0, 0, 0); });
  await guest.evaluate(() => { ISL.R.pos.set(-26, -0.5, 36.5); ISL.R.vel.set(0, 0, 0); });
  await host.waitForTimeout(1200);
  const rideBtn = await guest.evaluate(() => { const b = document.querySelector('.isl-go:not([hidden]) button'); return b ? b.textContent : ''; });
  console.log('   кнопка у гостя:', rideBtn);
  ok(/спинк/i.test(rideBtn), 'в воде рядом — «На спинку»');
  if(rideBtn) await guest.click('.isl-go button');
  await host.waitForTimeout(500);
  ok(await host.evaluate(() => V.ride === 'pal') && await guest.evaluate(() => V.ride === 'me'), 'гость катается на спинке');
  await host.evaluate(() => { ISL.R.key.set(0, 0, 1); });
  await host.waitForTimeout(1000);
  await host.evaluate(() => { ISL.R.key.set(0, 0, 0); });
  await host.waitForTimeout(400);
  s = await see(); console.log('  ', JSON.stringify(s));
  ok(Math.hypot(s.g.me[0] - s.h.me[0], s.g.me[2] - s.h.me[2]) < 0.8, 'гостя везут: он там же, где хозяйка');
  await host.screenshot({ path: shot('host-ride') }); await guest.screenshot({ path: shot('guest-ride') });
  await guest.evaluate(() => { roamJump(ISL.R); });
  await host.waitForTimeout(600);
  ok(!(await host.evaluate(() => V.ride)) && !(await guest.evaluate(() => V.ride)), '⤴ — спрыгнул');

  // 🌟 гость коснулся звёздочки хозяйки → у неё розовый луч, звёздочка не взята
  const star = await host.evaluate(() => { const st = islRoot.userData.stars.find(x => x.sp.visible && x.y < 3); return st ? {i:st.i, p:st.sp.position.toArray()} : null; });
  if(star){
    await guest.evaluate(p => { ISL.R.pos.set(p[0], p[1] - 0.6, p[2]); ISL.R.vel.set(0, 0, 0); }, star.p);
    await host.waitForTimeout(800);
    ok(await host.evaluate(i => ISL.duo.beams.some(b => b.i === i) && !save.isl.got.includes(i), star.i), `звёздочка №${star.i}: у хозяйки луч, взять — ей самой`);
  }

  // 🗝️ пещера — только у себя: у гостя ключей нет; хозяйка в пещере — у гостя над входом 🗝️, стрелка туда, у входа «подожди»
  ok(await guest.evaluate(() => islRoot.userData.keys.every(o => !o.g.visible)), 'у гостя ключей от пещеры не видно');
  await host.evaluate(() => { cvEnter(); });
  await host.waitForTimeout(1500);
  ok(await guest.evaluate(() => ISL.duo.waitK === 'cave' && ISL.duo.waitSp.visible && !V.pup.root.visible), 'хозяйка в пещере — у гостя 🗝️ над входом');
  await guest.evaluate(() => { const c = islRoot.userData.cave.pos; ISL.R.pos.set(c.x + 0.5, c.y, c.z + 0.8); ISL.R.vel.set(0, 0, 0); });
  await host.waitForTimeout(800);
  const caveTxt = await guest.evaluate(() => { const e = document.querySelector('.isl-go:not([hidden])'); return e ? e.textContent : ''; });
  console.log('   у входа у гостя:', caveTxt);
  ok(/подожди/i.test(caveTxt) && !/В пещеру/.test(caveTxt), 'у входа — «подожди здесь», войти нельзя');
  await guest.screenshot({ path: shot('guest-cave-wait') });
  await host.evaluate(() => { cvExit(); });
  await host.waitForTimeout(1200);
  ok(await guest.evaluate(() => ISL.duo.waitK === '' && V.pup.root.visible), 'хозяйка вышла — гость снова её видит');

  // 🎮 игра вдвоём прямо с острова: гость зовёт, хозяйка «Поехали!» → оба в бою с Тучей → хозяйка 🏠 → снова на острове
  await guest.evaluate(() => { iduAsk('fight'); });
  await host.waitForSelector('.vs-pick [data-k="yes"]', { timeout: 8000 }).catch(() => {});
  const inv = await host.$('.vs-pick [data-k="yes"]');
  ok(!!inv, 'у хозяйки на острове — «Играем?»');
  if(inv){
    await inv.click();
    await host.waitForFunction(() => typeof CO !== 'undefined' && CO && CO.st === 'go', null, { timeout: 20000 }).catch(() => {});
    ok(await host.evaluate(() => !!(CO && !ISL)) && await guest.evaluate(() => !!(CO && !ISL)), 'оба в бою с Тучей, остров закрыт');
    await host.waitForTimeout(1500);
    await host.click('#btnRunHome');
    await guest.waitForTimeout(800); await guest.click('#btnRunHome').catch(() => {});   // напарник ушёл — гость доигрывает один, выходит сам (как в любой игре вдвоём)
    await host.waitForFunction(() => typeof ISL !== 'undefined' && ISL && !ISL.guest, null, { timeout: 20000 }).catch(() => {});
    ok(await host.evaluate(() => !!ISL), 'после игры хозяйка снова на острове');
    await guest.waitForFunction(() => typeof ISL !== 'undefined' && ISL && ISL.guest, null, { timeout: 20000 }).catch(() => {});
    ok(await guest.evaluate(() => !!ISL), 'и гость за ней');
  }

  // 🎣 хозяйка рыбачит — у гостя она видна у лунки с 🎣 (islStep стоит, шлёт iduFishBeat)
  await host.evaluate(() => { islFish(islRoot.userData.fish[0]); });
  await host.waitForTimeout(3500);
  ok(await guest.evaluate(() => ISL.duo && ISL.duo.waitK === 'fish' && V.pup.root.visible), 'хозяйка рыбачит — гость видит её с 🎣');
  await guest.screenshot({ path: shot('guest-fish-wait') });

  // 👋 гость прощается: у хозяйки прогулка идёт дальше
  await guest.evaluate(() => { vsByeTap(); vsByeTap(); });
  await host.waitForTimeout(1500);
  ok(await host.evaluate(() => !V && !!ISL && (!ISL.duo || ISL.fishing)), 'гость ушёл — хозяйка гуляет дальше (рыбачит — уберёт второго после охоты)');
  ok(await guest.evaluate(() => !V && !ISL), 'гость дома');
  await host.screenshot({ path: shot('host-end') });
  console.log(fails ? `\n✗ ошибок: ${fails}` : '\n✓ всё работает', '— скриншоты:', shot('*'));
  await browser.close(); srv.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
