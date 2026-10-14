#!/usr/bin/env node
/* 🌊 Проверка финала Грота «Побег от прилива» (js/grotto.js): headless Edge, игру шагаем своим циклом (60 шагов на игровую секунду).
   1) Прыгун (бот вместо тебя) + Пинг-Силач — весь уровень от старта: Пипа → прилив → два люка → наверху → победа.
   2) Силач (бот) + Пинг-Прыгун — то же.
   3) «В ногу»: ты (Прыгун) стоишь без дела у второго люка — Пинг-Силач не уходит наверх один, вода не выше твоих лап.
   4) Упала в люк обратно — вода держит.
   Запуск:  node tools/grtide.js [--shots]   (снимки — в tools/out/grtide-*.png) */
const { findPlaywright, serve, launch } = require('./lib');
const path = require('path'), fs = require('fs');
const SHOTS = process.argv.includes('--shots'), OUT = path.join(__dirname, 'out');
let fails = 0;
const ok = (c, msg) => { console.log(`${c ? '✓' : '✗'} ${msg}`); if(!c) fails++; };
const save = { version: 1, free: true, progress: 12, shifts: 6, shells: 300, who: { name: 'Сабрина', g: 'f', asked: true },
  pet: { name: 'Тюпа', f: true, coat: 'snow', stage: 3, played: true, finds: [] }, story: { open: 8, fest: [], seen: 8, sa: true },
  coop: { wins: 3, resc: { wins: 3, lv: { bay: 1, grot: 1 } } }, adv: { tips: ['ch1', 'isle'] } };

(async () => {
  const pw = findPlaywright(), { srv, port } = await serve(), base = `http://127.0.0.1:${port}`;
  const browser = await launch(pw);
  if(SHOTS) fs.mkdirSync(OUT, { recursive: true });
  const start = async (role, tag) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true });
    await ctx.addInitScript(s => { try{ localStorage.setItem('sh.save', JSON.stringify(s)); }catch(e){} }, save);
    const page = await ctx.newPage();
    page.on('pageerror', e => { console.log(`  ${tag} PAGEERROR`, (e.stack || e.message).split('\n').slice(0, 3).join(' | ')); fails++; });
    page.on('console', c => { if(c.type() === 'error' && !/favicon|fonts|Failed to load/.test(c.text())) console.log(`  ${tag} CONSOLE`, c.text().slice(0, 200)); });
    await page.goto(base + '/?test=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof $ === 'function' && !$('#intro').hidden, null, { timeout: 30000 });
    await page.waitForTimeout(800);
    await page.evaluate(() => { $('#intro').hidden = true; started = true; rsLvAuto = true; rsLvPick = 'grot'; rescueGame('ping'); });
    await page.waitForSelector(`.rs-roles [data-r="${role}"]`, { state: 'attached', timeout: 8000 });
    await page.evaluate(r => document.querySelector(`.rs-roles [data-r="${r}"]`).click(), role);
    await page.waitForFunction(() => typeof Q !== 'undefined' && Q && Q.st === 'go', null, { timeout: 15000 });
    // свой цикл: кадры игры шагаем сами (бот ведёт и «тебя»), микрозадачи успевают между шагами
    await page.evaluate(() => {
      window.__t = now;
      window.__run = async (sec, opt = {}) => {
        const ticks = [...mgTicks]; mgTicks.clear();
        const dt = 1/60, n = Math.round(sec*60), log = window.__log || (window.__log = {});
        try{
          for(let i = 0; i < n && Q && !Q.end; i++){
            __t += dt; now = __t; updateTweens();
            if(Q.st === 'go' && !opt.idle){ const me = Q.me; Q.me = Q.pal; const r = rsAI(me, dt); Q.me = me; Q.in.dir = r.dir; Q.in.dive = r.dive; }
            else { Q.in.dir = 0; Q.in.dive = false; }
            ticks.forEach(f => f(dt));
            if(Q && Q.cage && !log.cage) log.cage = +__t.toFixed(1);
            if(Q && GRW.tide.on && !log.tide) log.tide = +__t.toFixed(1);
            if(Q && GRW.hatch && GRW.hatch[0].open && !log.h0) log.h0 = +__t.toFixed(1);
            if(Q && GRW.hatch && GRW.hatch[1].open && !log.h1) log.h1 = +__t.toFixed(1);
            if(Q && GRW.tide.top && !log.top) log.top = +__t.toFixed(1);
            if(Q && GRW.tide.on && !GRW.tide.top) log.wOver = Math.max(log.wOver || -9, GRW.tide.W - Math.min(...rsBoth().map(p => p.y)));
            if(opt.until && opt.until()) break;
            await null;
          }
        } finally { ticks.forEach(f => mgTicks.add(f)); }
        return Q ? {end:Q.end, st:Q.st, me:[+Q.me.x.toFixed(2), +Q.me.y.toFixed(2)], pal:[+Q.pal.x.toFixed(2), +Q.pal.y.toFixed(2)], W:+GRW.tide.W.toFixed(2),
          blocks:GRW.blocks.map(b => +b.x.toFixed(2)), hatch:GRW.hatch.map(h => h.open), log} : {end:'closed', log};
      };
    });
    return page;
  };
  const shot = async (page, n) => { if(SHOTS){ await page.waitForTimeout(150); await page.screenshot({ path: path.join(OUT, `grtide-${n}.png`) }); } };

  // 1–2: весь уровень ботами в обеих ролях
  for(const role of ['jump', 'strong']){
    const page = await start(role, role);
    let r = await page.evaluate(() => __run(120, {until:() => GRW.tide.on && GRW.tide.W > 2}));
    await shot(page, role + '-tide');
    r = await page.evaluate(() => __run(30, {until:() => GRW.hatch[0].open && Q.me.y > 4.7 && Q.pal.y > 4.7}));
    await shot(page, role + '-floor1');
    r = await page.evaluate(() => __run(120));
    console.log(`   ${role}:`, JSON.stringify(r));
    const L = r.log || {};
    ok(L.cage > 0, `${role}: Пипу нашли (${L.cage} с)`);
    ok(L.tide > L.cage, `${role}: начался прилив (${L.tide} с)`);
    ok(L.h0 > L.tide && L.h1 > L.h0, `${role}: оба люка открыты (${L.h0} с, ${L.h1} с)`);
    ok(L.top > 0, `${role}: оба наверху (${L.top} с)`);
    ok(r.end === 'win' || r.end === 'closed', `${role}: победа`);
    ok((L.wOver ?? -9) <= 0.05, `${role}: вода ни разу не выше лап (макс. ${(L.wOver ?? 0).toFixed(2)})`);
    await shot(page, role + '-win');
    await page.context().close();
  }

  // 3: «в ногу» — ты Прыгун и стоишь у второго люка; Пинг-Силач ставит глыбы, но наверх один не уходит
  {
    const page = await start('jump', 'pace');
    await page.evaluate(() => __run(120, {until:() => GRW.tide.on && Q.me.y > 4.7 && Q.pal.y > 4.7}));
    const r = await page.evaluate(() => __run(25, {idle:true}));
    console.log('   в ногу:', JSON.stringify(r));
    ok(!r.hatch[1], 'ты не дёрнула кольцо — второй люк закрыт');
    ok(r.pal[1] < 8.8, `Пинг-Силач наверх один не ушёл (y = ${r.pal[1]})`);
    ok(Math.abs(r.blocks[2] - 75.1) < 0.06 && Math.abs(r.blocks[3] - 71.3) < 0.06, `Пинг поставил глыбы ступенькой и под люк (${r.blocks[2]}, ${r.blocks[3]})`);
    ok(r.W <= Math.min(r.me[1], r.pal[1]) + 0.01, `вода ждёт под лапами (W = ${r.W})`);
    // 4: падаем обратно в люк — вода держит
    // сначала постоит на этаже — вода поднимется под него (выше глыбы под люком), потом шаг в люк
    await page.evaluate(() => { const p = Q.me; p.x = 77.2; p.y = 4.8; p.vx = 0; p.vy = 0; p.air = false; });
    await page.evaluate(() => __run(4, {idle:true}));
    await page.evaluate(() => { const p = Q.me; p.x = 79.3; p.y = 4.95; p.vx = 0; p.vy = 0; p.air = true; });
    const r2 = await page.evaluate(() => __run(2, {idle:true}));
    const g = await page.evaluate(() => ({ k: Q.me.ground && Q.me.ground.k, y: +Q.me.y.toFixed(2), W: +GRW.tide.W.toFixed(2) }));
    console.log('   упала в люк:', JSON.stringify(g));
    ok(g.k === 'tide' && Math.abs(g.y - g.W) < 0.05, 'упала в люк — вода держит, как льдина');
    await shot(page, 'fall');
    // дальше сама: дёрнула кольцо — и все наверху
    const r3 = await page.evaluate(() => __run(90));
    ok(r3.log.top > 0, 'потом пошла сама — выбрались наверх');
    await page.context().close();
  }
  console.log(fails ? `\n✗ ошибок: ${fails}` : '\n✓ всё работает');
  await browser.close(); srv.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
