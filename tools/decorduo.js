#!/usr/bin/env node
/* 🛋️ Проверка «Обустроить вдвоём» (js/decorduo.js) без интернета: два headless Edge — хозяйка (Сабрина) и гость (папа),
   сообщения сети пересылает сам скрипт (как tools/bdduo.js). Сценарий: визит → Сабрина в иглу → папа заходит следом →
   она «Обустроить» → у папы редактор и её коробка → папа тащит вещь пальцем — у неё вещь переехала (с 💙), у обоих одинаково →
   у неё голубое кольцо на том, что выбрал папа → её ↩️ отменяет папину правку → папина правка «вдогонку» на занятое место отскакивает →
   папа ставит вещь из её коробки и убирает вещь в коробку → она «Готово» — у папы редактор закрылся → свой иглу папы не тронут.
   Запуск:  node tools/decorduo.js   (скриншоты decorduo-*.png — во временной папке) */
const { findPlaywright, serve, launch } = require('./lib');
const os = require('os'), path = require('path');
const shot = n => path.join(os.tmpdir(), `decorduo-${n}.png`);
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
  const sab = { version: 2, free: true, progress: 12, shifts: 6, shells: 300, who: { name: 'Сабрина', g: 'f', asked: true },
    owned: ['rug_heart', 'lamp_star', 'tank_bowl'],
    pet: { name: 'Тюпа', f: true, coat: 'pink', stage: 3, played: true, finds: ['a'] }, story: { open: 8, fest: [], seen: 8, sa: true }, storm: { st: 4 },
    adv: { tips: ['ch1', 'isle', 'bd', 'home'] } };
  const dad = { version: 2, free: true, progress: 3, shifts: 1, shells: 50, who: { name: 'Папа', g: 'm', asked: true },
    pet: { name: 'Пух', f: false, coat: 'sky', stage: 2, played: true, finds: [] }, story: { open: 2, fest: [], seen: 2, sa: false }, adv: { tips: ['ch1', 'isle', 'bd', 'home'] } };
  const host = await mk(sab, 'host'), guest = await mk(dad, 'guest');
  const wire = async (from, to, isHost) => {
    await from.exposeFunction('__relay', s => to.evaluate(m => { const f = net.on[m.t]; if(f) f(m); }, JSON.parse(s)).catch(() => {}));
    await from.evaluate(h => { net.conn = {open:true, send:m => window.__relay(JSON.stringify(m))}; net.peer = {destroyed:false, disconnected:false, destroy(){}, reconnect(){}}; net.host = h; }, isHost);
  };
  await wire(host, guest, true); await wire(guest, host, false);
  // у Сабрины: коврик и лампа стоят, аквариум — в коробке
  await host.evaluate(() => { save.home.f.rug_heart = ['hall']; save.home.f.lamp_star = ['hall']; delete save.home.f.tank_bowl; persist(); });
  await host.evaluate(() => { visitHost({name:'Пух', coat:'sky', stage:2, f:false, want:'visitor'}); });
  await guest.evaluate(() => { visitGuest({name:'Тюпа', coat:'pink', stage:3, f:true, want:'visit'}); });
  await host.waitForTimeout(4000);
  ok(await host.evaluate(() => V.landed), 'визит на льдине: гость запрыгнул');
  const until = (pg, f, a, ms = 15000) => pg.waitForFunction(f, a, { timeout: ms }).then(() => true, () => false);
  const gHome0 = await guest.evaluate(() => JSON.stringify(save.home));

  // 🏠 Сабрина в иглу — папа следом; «Обустроить» — у папы редактор
  await host.evaluate(() => { homeEnter(); });
  ok(await until(guest, () => V.inH && homeRoot.visible), 'хозяйка в иглу — гость зашёл следом');
  ok(await guest.evaluate(() => !V.hde && !document.querySelector('.hd-bar')), 'пока она не обустраивает — у папы редактора нет');
  await until(host, () => !busy && homeMode, null, 20000);   // малыш зашёл и огляделся
  await host.evaluate(() => { heToggle(); });
  ok(await until(guest, () => !!V.hde && edOn() && !!$('.hd-bar') && document.body.classList.contains('hd-edit')), 'она «Обустроить» — у папы редактор и панель');
  ok(await until(host, () => !!V.hdeD), 'у неё: «папа помогает обустраивать»');
  const box = await guest.evaluate(() => [...document.querySelectorAll('.hd-bar .ed-card')].map(b => b.dataset.id));
  ok(box.includes('tank_bowl') && !box.includes('lamp_star'), 'в папиной панели — её коробка (аквариум, а не то, что стоит)', box);
  await guest.waitForTimeout(1500);
  await guest.screenshot({ path: shot('guest-edit') });

  // папа тащит лампу пальцем
  const ID = 'lamp_star';
  const from = await host.evaluate(id => save.home.f[id].slice(), ID);
  const pts = await guest.evaluate(id => {
    const g = HD_A.get(id), fr = hdWith(() => heFree(id, 'hall', [-g.x, 1.6], 0));
    const a = toScreen(homeItems[id].getWorldPosition(new V3()).add(new V3(0, 0.3, 0))), b0 = toScreen(HOME_POS.clone().add(new V3(fr[0], 0.55, fr[1])));
    return {a, b:{x:b0.x, y:b0.y}, fr};
  }, ID);
  await guest.mouse.move(pts.a.x, pts.a.y); await guest.mouse.down();
  for(let i = 1; i <= 12; i++){ await guest.mouse.move(pts.a.x + (pts.b.x - pts.a.x)*i/12, pts.a.y + (pts.b.y - pts.a.y)*i/12); await guest.waitForTimeout(40); }
  ok(await until(host, id => HDE_RING.visible && !!V.hdeD.gDrag, ID, 3000), 'у неё видно, как папа тащит (голубое кольцо, вещь едет)');
  await host.screenshot({ path: shot('host-sees-drag') });
  await guest.mouse.up();
  ok(await until(host, (a) => { const P = save.home.f[a.id]; return P && (P[1] !== a.from[1] || P[2] !== a.from[2]); }, {id:ID, from}, 4000), 'папа передвинул лампу — у неё переехала', from);
  await host.waitForTimeout(600);
  const same = async id => { const h = await host.evaluate(i => JSON.stringify(save.home.f[i] || null), id), g = await guest.evaluate(i => JSON.stringify(V.hh.f[i] || null), id); return h === g ? h : [h, g]; };
  let s = await same(ID); ok(typeof s === 'string' && s !== 'null', 'у обоих одинаково', s);
  ok(await guest.evaluate(id => { const P = V.hh.f[id], o = homeItems[id]; return o && Math.abs(o.position.x - P[1]) < 0.01 && Math.abs(o.position.z - P[2]) < 0.01; }, ID), 'у папы лампа стоит, где отпустил');
  ok(await guest.evaluate(() => ED.sel === 'lamp_star') && await until(host, () => HDE_RING.visible, null, 3000), 'папа выбрал лампу — у неё голубое кольцо');

  // её ↩️ отменяет папину правку
  await host.evaluate(() => { edUndo(); });
  ok(await until(host, a => JSON.stringify(save.home.f[a.id]) === JSON.stringify(a.from), {id:ID, from}, 2000), 'её ↩️ вернула лампу');
  ok(await until(guest, a => JSON.stringify(V.hh.f[a.id]) === JSON.stringify(a.from), {id:ID, from}, 3000), 'у папы тоже вернулась');

  // правка «вдогонку» на занятое место отскакивает
  await guest.evaluate(() => { edSelect(null); });
  const rug = await host.evaluate(() => save.home.f.rug_heart.slice());
  const busyAt = await host.evaluate(() => { const b = save.home.f.bed_basic; return b ? b.slice() : null; });
  await host.waitForTimeout(500);
  await guest.evaluate(b => { HD_A.set('lamp_star', {x:b[1], z:b[2], r:0}); }, busyAt);
  await host.waitForTimeout(800);
  ok(await host.evaluate(a => JSON.stringify(save.home.f.lamp_star) === JSON.stringify(a), from), 'на занятое место — у неё не встала');
  ok(await until(guest, a => JSON.stringify(V.hh.f.lamp_star) === JSON.stringify(a) && !V.hde.pend, from, 3000), 'у папы отскочила назад');

  // из её коробки — в прихожую; и в коробку
  await guest.click('.hd-bar .ed-card[data-id="tank_bowl"]');
  ok(await until(host, () => save.home.f.tank_bowl && save.home.f.tank_bowl[0] === 'hall' && !!homeItems.tank_bowl, null, 4000), 'папа поставил аквариум из её коробки — у неё стоит');
  ok(await until(guest, () => !document.querySelector('.hd-bar .ed-card[data-id="tank_bowl"]'), null, 3000), 'аквариума в папиной коробке больше нет');
  await host.waitForTimeout(500);
  await guest.evaluate(() => { edSelect('rug_heart'); edBox(); });
  ok(await until(host, () => !save.home.f.rug_heart && !homeItems.rug_heart, null, 4000), 'папа убрал коврик в коробку — у неё тоже');
  ok(await host.evaluate(() => heMine().some(f => f.id === 'rug_heart')), 'у неё коврик в «Мои вещи»');
  await host.waitForTimeout(600);
  await guest.screenshot({ path: shot('guest-after') }); await host.screenshot({ path: shot('host-after') });
  s = await same('tank_bowl'); ok(typeof s === 'string', 'аквариум у обоих в одном месте', s);
  ok(await host.evaluate(r => JSON.stringify(save.home.f.rug_heart) !== JSON.stringify(r), rug), 'коврик убран (не на прежнем месте)');

  // она тащит сама — у папы видно
  const hp = await host.evaluate(() => { const g = HE_A.get('lamp_star'), a = toScreen(homeItems.lamp_star.getWorldPosition(new V3()).add(new V3(0, 0.3, 0))); return {a}; });
  await host.mouse.move(hp.a.x, hp.a.y); await host.mouse.down();
  for(let i = 1; i <= 8; i++){ await host.mouse.move(hp.a.x + i*6, hp.a.y + i*4); await host.waitForTimeout(40); }
  const hk = await host.evaluate(() => ED.drag && ED.drag.key);
  ok(!!hk && await until(guest, k => HDE_RING.visible && V.hde.gDrag === k, hk, 3000), 'она тащит вещь — у папы вещь едет за её пальцем', hk);
  await host.mouse.up();
  await host.waitForTimeout(1200);
  s = await same(hk || 'lamp_star'); ok(typeof s === 'string', 'после её перестановки у обоих одинаково', s);

  // «Готово» — у папы редактор закрылся, он снова гуляет по прихожей
  await host.evaluate(() => { heStop(true); });
  ok(await until(guest, () => !V.hde && !edOn() && !$('.hd-bar') && !document.body.classList.contains('hd-edit')), 'она «Готово» — у папы редактор закрылся');
  ok(await guest.evaluate(s0 => JSON.stringify(save.home) === s0, gHome0), 'свой иглу папы не тронут');
  await host.evaluate(() => { homeLeave(); });
  ok(await until(guest, () => !V.inH && !Object.keys(homeItems).length), 'она вышла — папа на льдине');

  console.log(fails ? `\n✗ ошибок: ${fails}` : '\n✓ всё работает');
  await browser.close(); srv.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
