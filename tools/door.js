#!/usr/bin/env node
/* 🚪 Проверка «двери для папы» (js/visit.js) по-настоящему — через интернет и сервер PeerJS, два headless Edge:
   хозяйка (Сабрина) с открытой дверью в уголке малыша + гость (папа) по постоянной ссылке ?room=КОД&g=visit.
   Запуск:  node tools/door.js [код из 5 цифр 0–7] [yes|no|isle]   (yes — «Пустить!», no — «Не сейчас», isle — «Пустить!», и хозяйка идёт гулять по острову: гость за ней, js/isleduo.js)
   Что видно: «Постучаться в гости?» у гостя, «Тук-тук!… Пустить?» у хозяйки, визит у обоих, после визита дверь снова открыта.
   Скриншоты — во временной папке (door-host.png, door-guest.png). Нужен интернет; во встроенном браузере WebRTC не работает. */
const { findPlaywright, serve, launch } = require('./lib');
const CODE = process.argv[2] || Array.from({length:5}, () => Math.floor(Math.random()*8)).join('');
const ANSWER = process.argv[3] || 'yes';   // yes | no
(async () => {
  const pw = findPlaywright(), { srv, port } = await serve(), base = `http://localhost:${port}`;
  const browser = await launch(pw);
  const mk = async (save, door) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true });
    await ctx.addInitScript(([s, d]) => { try{ localStorage.setItem('sh.save', JSON.stringify(s)); if(d) localStorage.setItem('sh.door', JSON.stringify(d)); }catch(e){} }, [save, door]);
    const page = await ctx.newPage();
    page.on('pageerror', e => console.log('PAGEERROR', e.message));
    page.on('console', c => { if(c.type() === 'error') console.log('CONSOLE', c.text().slice(0, 200)); });
    return page;
  };
  const sab = { version: 1, progress: 12, shifts: 6, shells: 300, who: { name: 'Сабрина', g: 'f', asked: true },
    pet: { name: 'Тюпа', f: true, coat: 'pink', stage: 3, played: true, finds: ['a'] }, story: { open: 3, fest: [], seen: 3, sa: false } };
  const dad = { version: 1, progress: 3, shifts: 1, shells: 50, who: { name: 'Папа', g: 'm', asked: true },
    pet: { name: 'Пух', f: false, coat: 'sky', stage: 2, played: true, finds: [] }, story: { open: 2, fest: [], seen: 2, sa: false } };
  const host = await mk(sab, { p1: { on: true, code: CODE } });
  await host.goto(base + '/', { waitUntil: 'domcontentloaded' });
  await host.waitForFunction(() => typeof $ === 'function' && !$('#intro').hidden, null, { timeout: 30000 });
  await host.evaluate(() => { $('#btnIntroPet').click(); });
  // ждём, пока дверь откроется на сервере
  await host.waitForFunction(() => DR.peer && DR.peer.open, null, { timeout: 30000 });
  console.log('host: door open', await host.evaluate(() => DR.peer.id));
  const guest = await mk(dad, null);
  await guest.goto(base + `/?room=${CODE}&g=visit`, { waitUntil: 'domcontentloaded' });
  await guest.waitForSelector('.net-lobby [data-k="go"]', { timeout: 30000 });
  console.log('guest panel:', (await guest.textContent('.net-lobby')).replace(/\s+/g, ' ').slice(0, 160));
  await guest.click('.net-lobby [data-k="go"]');
  // у хозяйки — «Тук-тук! … Пустить?»
  await host.waitForFunction(() => !document.getElementById('talk').hidden && !document.querySelector('#talk .tk-btns').hidden, null, { timeout: 40000 });
  console.log('host talk:', (await host.textContent('#talk .tk-text')));
  console.log('guest toast:', await guest.evaluate(() => $('#toast').hidden ? '' : $('#toast').textContent));
  await host.click(`#talk .tk-btns [data-k="${ANSWER === 'no' ? 'no' : 'yes'}"]`);
  if(ANSWER !== 'no'){
    await host.waitForFunction(() => typeof V !== 'undefined' && V && V.role === 'host', null, { timeout: 30000 });
    await guest.waitForFunction(() => typeof V !== 'undefined' && V && V.role === 'guest', null, { timeout: 30000 });
    await host.waitForTimeout(6000);
    console.log('host V:', await host.evaluate(() => ({ name: V.name, landed: V.landed, seen: now - V.seen < 2 })));
    console.log('guest V:', await guest.evaluate(() => ({ name: V.name, view: !!V.view })));
    if(ANSWER === 'isle'){   // через настоящий интернет: хозяйка на острове — гость приходит, позиции доходят
      await host.evaluate(() => { funPre = 'isle'; petDo('fun'); });
      await guest.waitForFunction(() => typeof ISL !== 'undefined' && ISL && ISL.guest, null, { timeout: 20000 }).catch(() => {});
      await host.evaluate(() => { ISL.R.key.set(1, 0, 0); }); await host.waitForTimeout(1500); await host.evaluate(() => { ISL.R.key.set(0, 0, 0); }); await host.waitForTimeout(1000);
      console.log('isle host:', await host.evaluate(() => ({ me: ISL.R.pos.toArray().map(x => +x.toFixed(1)), guestSeen: V.s.root.visible })));
      console.log('isle guest:', await guest.evaluate(() => ({ onIsle: !!(ISL && ISL.guest), hostAt: V.pup.root.position.clone().sub(ISL_POS).toArray().map(x => +x.toFixed(1)), seen: V.pup.root.visible })));
    }
    await host.screenshot({ path: require('os').tmpdir() + '/door-host.png' });
    await guest.screenshot({ path: require('os').tmpdir() + '/door-guest.png' });
    // хозяйка прощается — дверь снова открывается
    await host.evaluate(() => { vsEnd('me'); });
    await host.waitForTimeout(3000);
    await host.waitForFunction(() => DR.peer && DR.peer.open, null, { timeout: 60000 }).catch(() => console.log('door did not reopen in 60 s'));
    console.log('host door after visit:', await host.evaluate(() => !!(DR.peer && DR.peer.open)));
  } else {
    await guest.waitForTimeout(3000);
    console.log('guest after nope:', await guest.evaluate(() => ({ toast: $('#toast').textContent, conn: !!net.conn })));
  }
  await browser.close(); srv.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
