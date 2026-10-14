#!/usr/bin/env node
/* 🛶 Проверка финала Бухты «Льдина домой» (js/bayride.js): headless Edge, игру шагаем своим циклом (60 шагов на игровую секунду).
   Уровень до мамы проходим быстро (rsCage → мама по приметам), дальше — сама льдина.
   1) Прыгун (бот вместо тебя) + Пинг-Силач: доплыли, победа, фото.
   2) Силач (бот) + Пинг-Прыгун: то же.
   3) Без напарника: обе кнопки твои (🚣 — Силач, ⬆️ — Прыгун).
   4) «В ногу»: ты Прыгун и не рулишь — Пинг гребёт до первого айсберга и ждёт (не бьётся без конца).
   5) «В ногу»: ты Силач и не гребёшь — льдина стоит.
   6) Не рулим совсем — «Бум!», льдину отталкивает, проиграть нельзя.
   7) По сети: хозяйка — Прыгун, гость — Силач (сообщения пересылает сам скрипт).
   Запуск:  node tools/bayride.js [--shots] [--net — только по сети]   (снимки — в tools/out/bayride-*.png) */
const { findPlaywright, serve, launch } = require('./lib');
const path = require('path'), fs = require('fs');
const SHOTS = process.argv.includes('--shots'), NET = process.argv.includes('--net'), OUT = path.join(__dirname, 'out');
let fails = 0;
const ok = (c, msg) => { console.log(`${c ? '✓' : '✗'} ${msg}`); if(!c) fails++; };
const save = { version: 1, free: true, progress: 12, shifts: 6, shells: 300, who: { name: 'Сабрина', g: 'f', asked: true },
  pet: { name: 'Тюпа', f: true, coat: 'snow', stage: 3, played: true, finds: [] }, story: { open: 8, fest: [], seen: 8, sa: true },
  coop: { wins: 3, resc: { wins: 3, lv: { bay: 1 } } }, adv: { tips: ['ch1', 'isle'] } };

(async () => {
  const pw = findPlaywright(), { srv, port } = await serve(), base = `http://127.0.0.1:${port}`;
  const browser = await launch(pw);
  if(SHOTS) fs.mkdirSync(OUT, { recursive: true });
  const open = async tag => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true });
    await ctx.addInitScript(s => { try{ localStorage.setItem('sh.save', JSON.stringify(s)); }catch(e){} }, save);
    const page = await ctx.newPage();
    page.on('pageerror', e => { console.log(`  ${tag} PAGEERROR`, (e.stack || e.message).split('\n').slice(0, 3).join(' | ')); fails++; });
    page.on('console', c => { if(c.type() === 'error' && !/favicon|fonts|Failed to load/.test(c.text())) console.log(`  ${tag} CONSOLE`, c.text().slice(0, 200)); });
    await page.goto(base + '/?test=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof $ === 'function' && !$('#intro').hidden, null, { timeout: 30000 });
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      // opt.idle — «ты» ничего не делаешь (Пинг — как обычно); opt.solo — бот жмёт за обе роли
      window.__run = async (sec, opt = {}) => {
        if(window.__t === undefined) window.__t = now;
        const ticks = [...mgTicks]; mgTicks.clear();
        const inbox = window.__inbox || [];
        const dt = 1/60, n = Math.round(sec*60), log = window.__log || (window.__log = {bumps:0});
        try{
          for(let i = 0; i < n && Q && !Q.end; i++){
            while(inbox.length){ const m = inbox.shift(); if(net.on[m.t]) net.on[m.t](m); }   // по сети: что пришло от второго окна
            __t += dt; now = __t; updateTweens();
            Q.in.dir = 0; Q.in.dive = false;
            if(Q.st === 'go' && BR && BR.q === Q && !opt.idle){
              if(opt.solo){ for(const p of [Q.me, Q.pal]){ const r = brAI(p); if(r.act) brRow(Q.me); if(r.jump) brKey(Q.me); } }
              else { const me = Q.me; Q.me = Q.pal; const r = rsAI(me, dt); Q.me = me; }
            }
            const b0 = BR && BR.bumpT;
            ticks.forEach(f => f(dt));
            if(BR && BR.bumpT > 0.55 && !(b0 > 0.55)) log.bumps++;
            if(BR && BR.q === Q && !log.ride) log.ride = +__t.toFixed(1);
            if(BR && BR.home && !log.home) log.home = +__t.toFixed(1);
            if(BR) log.maxX = Math.max(log.maxX || 0, BR.x);
            if(opt.until && opt.until()) break;
            await null;
          }
        } finally { ticks.forEach(f => mgTicks.add(f)); }
        return Q ? {end:Q.end, st:Q.st, x:BR ? +BR.x.toFixed(2) : null, z:BR ? +BR.z.toFixed(2) : null, side:BR && BR.side, log} : {end:'closed', log};
      };
      // до мамы — быстро: решётка открыта, малыш дошёл, правильная мама
      window.__toMom = async () => {
        rsCage();
        await __run(4, {idle:true, until:() => Q.asked});
        rsMom(Q.moms.findIndex(m => m.ok));
        return __run(9, {idle:true, until:() => BR && BR.q === Q});
      };
    });
    return page;
  };
  const start = async (mode, role, tag) => {
    const page = await open(tag);
    await page.evaluate(m => { $('#intro').hidden = true; started = true; rsLvAuto = true; rsLvPick = 'bay'; rescueGame(m); }, mode);
    await page.waitForSelector(`.rs-roles [data-r="${role}"]`, { state: 'attached', timeout: 8000 });
    await page.evaluate(r => document.querySelector(`.rs-roles [data-r="${r}"]`).click(), role);
    await page.waitForFunction(() => typeof Q !== 'undefined' && Q && Q.st === 'go', null, { timeout: 15000 });
    return page;
  };
  const shot = async (page, n) => { if(SHOTS){ await page.waitForTimeout(150); await page.screenshot({ path: path.join(OUT, `bayride-${n}.png`) }); } };

  // 1–3: доплыть
  for(const [mode, role, opt] of NET ? [] : [['ping', 'jump', {}], ['ping', 'strong', {}], ['solo', 'jump', {solo:true}]]){
    const tag = `${mode}/${role}`, page = await start(mode, role, tag);
    await page.evaluate(() => __toMom());
    const st = await page.evaluate(() => ({ ride: !!(BR && BR.q === Q), st: Q.st, act: Q.actB.dataset.k, x: BR.x }));
    ok(st.ride && st.st === 'go', `${tag}: мама нашлась — плывём на льдине`);
    await page.evaluate(o => __run(5, o), opt);
    await shot(page, tag.replace('/', '-') + '-ride');
    const r = await page.evaluate(o => __run(150, o), opt);
    console.log(`   ${tag}:`, JSON.stringify(r));
    const L = r.log;
    ok(L.home > 0, `${tag}: доплыли домой (${(L.home - L.ride).toFixed(1)} с на льдине, ударов: ${L.bumps})`);
    ok(r.end === 'win' || r.end === 'closed', `${tag}: победа`);
    ok(L.home - L.ride < 70, `${tag}: плыть недолго (< 70 с)`);
    if(mode !== 'solo') ok(L.bumps === 0, `${tag}: боты отворачивают от айсбергов`);
    await shot(page, tag.replace('/', '-') + '-win');
    await page.context().close();
  }

  // 4: ты Прыгун и не рулишь — Пинг-Силач гребёт до айсберга и ждёт
  if(!NET){
    const page = await start('ping', 'jump', 'pace-j');
    await page.evaluate(() => __toMom());
    const r = await page.evaluate(() => __run(30, {idle:true}));
    console.log('   не рулю:', JSON.stringify(r));
    ok(r.x > 74 && r.x < 77.1, `Пинг догрёб до первого айсберга и ждёт (x = ${r.x})`);
    ok(r.log.bumps <= 1, `не бьётся об айсберг без конца (ударов: ${r.log.bumps})`);
    await shot(page, 'pace-j');
    const r2 = await page.evaluate(() => __run(120));
    ok(r2.log.home > 0, 'потом сама рулю — доплыли');
    await page.context().close();
  }
  // 5: ты Силач и не гребёшь — льдина стоит
  if(!NET){
    const page = await start('ping', 'strong', 'pace-s');
    await page.evaluate(() => __toMom());
    const x0 = await page.evaluate(() => BR.x);
    const r = await page.evaluate(() => __run(15, {idle:true}));
    ok(Math.abs(r.x - x0) < 0.05, `не гребу — льдина стоит (x ${x0.toFixed(2)} → ${r.x})`);
    // 6: гребу, но Пинга-Прыгуна нет: рулить некому — «Бум!» и отталкивает
    await page.evaluate(() => { Q.pal.role = 'none'; });
    for(let i = 0; i < 30; i++) await page.evaluate(() => __run(0.8, {idle:true, until:() => false}).then(() => brRow(Q.me)));
    const r3 = await page.evaluate(() => ({ x: BR.x, bumps: __log.bumps, st: Q.st, end: Q.end }));
    console.log('   не рулим:', JSON.stringify(r3));
    ok(r3.bumps >= 1 && r3.x < 77.1 && r3.st === 'go', `не рулим — «Бум!», льдину отталкивает, игра идёт (x = ${r3.x.toFixed(2)})`);
    await page.context().close();
  }
  // 7: по сети — хозяйка Прыгун и гость Силач, потом наоборот; сообщения пересылаем сами (вместо PeerJS)
  for(const hr of ['jump', 'strong']){
    const A = await open('host'), B = await open('guest');
    for(const [pg, host] of [[A, true], [B, false]]) await pg.evaluate(h => {
      window.__inbox = []; window.__out = [];
      net.host = h; net.conn = {open:true, send:m => __out.push(JSON.parse(JSON.stringify(m)))};
      $('#intro').hidden = true; started = true; rsLvAuto = true; rsLvPick = 'bay';
    }, host);
    const relay = async () => {
      const a = await A.evaluate(() => __out.splice(0)), b = await B.evaluate(() => __out.splice(0));
      if(a.length) await B.evaluate(ms => __inbox.push(...ms), a);
      if(b.length) await A.evaluate(ms => __inbox.push(...ms), b);
    };
    // пока выбирают роли и ждут друг друга — настоящие кадры, сообщения разносим сразу
    await B.evaluate(() => { rescueGame('net', null); });
    await A.evaluate(() => { rescueGame('net', null); });
    const pump = setInterval(() => { relay().catch(() => {}); }, 40);
    for(const pg of [A, B]) await pg.evaluate(() => { const iv = setInterval(() => { while(__inbox.length){ const m = __inbox.shift(); if(net.on[m.t]) net.on[m.t](m); } }, 20); window.__liveIv = iv; });
    await A.waitForSelector(`.rs-roles [data-r="${hr}"]`, { state: 'attached', timeout: 8000 });
    await A.evaluate(r => document.querySelector(`.rs-roles [data-r="${r}"]`).click(), hr);
    for(const pg of [A, B]) await pg.waitForFunction(() => typeof Q !== 'undefined' && Q && Q.st === 'go', null, { timeout: 15000 });
    clearInterval(pump);
    for(const pg of [A, B]) await pg.evaluate(() => clearInterval(__liveIv));
    const both = async (sec, opt = {}) => { for(let t = 0; t < sec; t += 0.1){ await A.evaluate(o => __run(0.1, o), opt); await relay(); await B.evaluate(o => __run(0.1, o), opt); await relay(); } };
    await A.evaluate(() => rsCage()); await relay();
    await both(4, {idle:true});
    await A.evaluate(() => rsMom(Q.moms.findIndex(m => m.ok))); await relay();
    await both(7, {idle:true});
    const s0 = await Promise.all([A, B].map(pg => pg.evaluate(() => ({ ride: !!(BR && BR.q === Q), role: Q.me.role }))));
    ok(s0[0].ride && s0[1].ride, `по сети: оба на льдине (хозяйка — ${s0[0].role}, гость — ${s0[1].role})`);
    let sync = 0;
    for(let i = 0; i < 70; i++){
      await both(1);
      const [a, b] = await Promise.all([A, B].map(pg => pg.evaluate(() => BR && BR.q === Q ? { x: BR.x, z: BR.z, home: BR.home, end: Q.end } : { end: Q && Q.end, gone: true })));
      if(a.x != null && b.x != null) sync = Math.max(sync, Math.abs(a.x - b.x));
      if((a.home || a.end) && (b.home || b.end)) break;
    }
    await both(5);
    const fin = await Promise.all([A, B].map(pg => pg.evaluate(() => ({ end: Q && Q.end, home: !!(BR && BR.home), bumps: (window.__log || {}).bumps }))));
    console.log('   по сети:', JSON.stringify(fin), 'расхождение льдины до', sync.toFixed(2), 'м');
    ok(fin.every(f => f.end === 'win' || f.home), `по сети: доплыли у обоих (хозяйка — ${hr})`);
    ok(sync < 1.5, `по сети: льдина у гостя там же, где у хозяйки (расхождение ≤ ${sync.toFixed(2)} м)`);
    await shot(B, 'net-guest-' + hr);
    await A.context().close(); await B.context().close();
  }
  console.log(fails ? `\n✗ ошибок: ${fails}` : '\n✓ всё работает');
  await browser.close(); srv.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
