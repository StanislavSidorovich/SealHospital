#!/usr/bin/env node
/* 🤫 Проверка финала Метели «Тихонько мимо моржа» (js/walrus.js): headless Edge, игру шагаем своим циклом (60 шагов на игровую секунду).
   Уровень до мамы проходим быстро (маяк → мама по приметам), дальше — сам финал.
   1) Прыгун (бот вместо тебя) + Пинг-Силач: вышли из ущелья, победа, без «апчхи».
   2) Силач (бот) + Пинг-Прыгун: то же.
   3) Без напарника: ведёшь Силача, Прыгун идёт сам, 🤫 — твоя кнопка.
   4) «В ногу»: ты Прыгун и стоишь — Пинг-Силач без тебя санки не тянет; Пипа икает — морж просыпается, «апчхи», игра идёт.
   5) Ты Силач и идёшь, не глядя на моржа: «апчхи!», всех сдувает назад, проиграть нельзя; потом как надо — вышли.
   6) По сети: хозяйка — Прыгун, гость — Силач, и наоборот (сообщения пересылает сам скрипт).
   Запуск:  node tools/walrus.js [--shots] [--net — только по сети]   (снимки — в tools/out/walrus-*.png) */
const { findPlaywright, serve, launch } = require('./lib');
const path = require('path'), fs = require('fs');
const SHOTS = process.argv.includes('--shots'), NET = process.argv.includes('--net'), OUT = path.join(__dirname, 'out');
let fails = 0;
const ok = (c, msg) => { console.log(`${c ? '✓' : '✗'} ${msg}`); if(!c) fails++; };
const save = { version: 1, free: true, progress: 12, shifts: 6, shells: 300, who: { name: 'Сабрина', g: 'f', asked: true },
  pet: { name: 'Тюпа', f: true, coat: 'snow', stage: 3, played: true, finds: [] }, story: { open: 8, fest: [], seen: 8, sa: true },
  coop: { wins: 3, resc: { wins: 3, lv: { bay: 1, grot: 1 } } }, adv: { tips: ['ch1', 'isle'] } };

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
      // opt.idle — «ты» ничего не делаешь (Пинг — как обычно); opt.rush — идёшь вправо, не глядя на моржа
      window.__run = async (sec, opt = {}) => {
        if(window.__t === undefined) window.__t = now;
        const ticks = [...mgTicks]; mgTicks.clear();
        const inbox = window.__inbox || [];
        const dt = 1/60, n = Math.round(sec*60), log = window.__log || (window.__log = {sneezes:0, hics:0});
        try{
          for(let i = 0; i < n && Q && !Q.end; i++){
            while(inbox.length){ const m = inbox.shift(); if(net.on[m.t]) net.on[m.t](m); }   // по сети: что пришло от второго окна
            __t += dt; now = __t; updateTweens();
            Q.in.dir = 0; Q.in.dive = false;
            if(Q.st === 'go' && WL && WL.q === Q && !opt.idle){
              if(opt.rush) Q.in.dir = 1;
              else { const me = Q.me, pal = Q.pal; Q.me = pal; Q.pal = me; const r = rsAI(me, dt); Q.me = me; Q.pal = pal; Q.in.dir = r.dir; }
              if(opt.solo && WL.h > 0.45) wlShush(Q.me);
            }

            ticks.forEach(f => f(dt));
            Q && (Q.in.dir = 0);
            if(WL) log.sneezes = Math.max(log.sneezes, WL.sneezes);
            if(WL && WL.q === Q && !log.ride) log.ride = +__t.toFixed(1);
            if(WL && WL.home && !log.home) log.home = +__t.toFixed(1);
            if(WL){ log.hics = WL.hics; log.shh = WL.shh; log.maxX = Math.max(log.maxX || 0, WL.sx); log.minBack = Math.min(log.minBack ?? 999, WL.sx); }
            if(opt.until && opt.until()) break;
            await null;
          }
        } finally { ticks.forEach(f => mgTicks.add(f)); }
        return Q ? {end:Q.end, st:Q.st, sx:WL ? +WL.sx.toFixed(2) : null, ph:WL && WL.ph, n:WL ? +WL.n.toFixed(2) : null, log} : {end:'closed', log};
      };
      // до мамы — быстро: маяк, приметы, правильная мама
      window.__toMom = async () => {
        bzBeacon();
        await __run(5, {idle:true, until:() => Q.asked});
        bzMom(Q.moms.findIndex(m => m.ok));
        return __run(10, {idle:true, until:() => WL && WL.q === Q});
      };
    });
    return page;
  };
  const start = async (mode, role, tag) => {
    const page = await open(tag);
    await page.evaluate(m => { $('#intro').hidden = true; started = true; rsLvAuto = true; rsLvPick = 'snow'; rescueGame(m); }, mode);
    await page.waitForSelector(`.rs-roles [data-r="${role}"]`, { state: 'attached', timeout: 8000 });
    await page.evaluate(r => document.querySelector(`.rs-roles [data-r="${r}"]`).click(), role);
    await page.waitForFunction(() => typeof Q !== 'undefined' && Q && Q.st === 'go', null, { timeout: 15000 });
    return page;
  };
  const shot = async (page, n) => { if(SHOTS){ await page.waitForTimeout(150); await page.screenshot({ path: path.join(OUT, `walrus-${n}.png`) }); } };

  // 1–3: пройти мимо моржа
  for(const [mode, role, opt] of NET ? [] : [['ping', 'jump', {}], ['ping', 'strong', {}], ['solo', 'jump', {solo:true}]]){
    const tag = `${mode}/${role}`, page = await start(mode, role, tag);
    await page.evaluate(() => __toMom());
    const st = await page.evaluate(() => ({ on: !!(WL && WL.q === Q), st: Q.st, act: Q.actB.dataset.k, sled: WLW.sled.visible }));
    ok(st.on && st.st === 'go' && st.sled, `${tag}: мама нашлась — санки в ущелье (кнопка: «${st.act}»)`);
    await page.evaluate(o => __run(4, o), opt);
    await shot(page, tag.replace('/', '-') + '-go');
    const r = await page.evaluate(o => __run(150, o), opt);
    console.log(`   ${tag}:`, JSON.stringify(r));
    const L = r.log;
    ok(L.home > 0, `${tag}: вышли из ущелья (${(L.home - L.ride).toFixed(1)} с, иков: ${L.hics}, шикнули: ${L.shh}, апчхи: ${L.sneezes})`);
    ok(r.end === 'win' || r.end === 'closed', `${tag}: победа`);
    ok(L.home - L.ride < 75, `${tag}: недолго (< 75 с)`);
    ok(L.sneezes === 0, `${tag}: боты тихие — морж не просыпался`);
    ok(L.shh >= 1, `${tag}: на Пипу шикали`);
    await shot(page, tag.replace('/', '-') + '-win');
    await page.context().close();
  }

  // 4: ты Прыгун и стоишь — Пинг-Силач без тебя не уходит; Пипа икает → апчхи, игра идёт
  if(!NET){
    const page = await start('ping', 'jump', 'pace-j');
    await page.evaluate(() => __toMom());
    await page.evaluate(() => { Q.me.x = 76; });   // отошла от санок
    const r = await page.evaluate(() => __run(30, {idle:true}));
    console.log('   стою:', JSON.stringify(r));
    ok(r.log.maxX < 79.5, `Пинг-Силач без меня санки не тянет (санки не дальше ${r.log.maxX.toFixed(2)})`);
    ok(r.log.hics >= 1 && r.log.sneezes >= 1 && r.st === 'go', `Пипа икает без меня — морж чихнул, игра идёт (иков ${r.log.hics}, апчхи ${r.log.sneezes})`);
    await shot(page, 'pace-j');
    const r2 = await page.evaluate(() => __run(120));
    ok(r2.log.home > 0, 'потом иду рядом и шикаю — вышли');
    await page.context().close();
  }
  // 5: ты Силач и прёшь вперёд — апчхи, сдувает назад; потом аккуратно — вышли
  if(!NET){
    const page = await start('ping', 'strong', 'rush');
    await page.evaluate(() => __toMom());
    const r = await page.evaluate(() => __run(12, {rush:true, until:() => __log.sneezes > 0 && WL.ph === 's'}));
    const back = await page.evaluate(() => ({ sx: WL.sx, max: __log.maxX, st: Q.st }));
    console.log('   пру вперёд:', JSON.stringify(r), JSON.stringify(back));
    ok(r.log.sneezes >= 1, `шумлю, пока ворочается — «апчхи!» (${r.log.sneezes})`);
    ok(back.max - back.sx > 2 && back.st === 'go', `сдуло назад на ${(back.max - back.sx).toFixed(1)} м, игра идёт`);
    const r2 = await page.evaluate(() => __run(150));
    ok(r2.log.home > 0 && (r2.end === 'win' || r2.end === 'closed'), 'потом тихонько — вышли');
    await shot(page, 'rush');
    await page.context().close();
  }
  // 6: по сети — хозяйка Прыгун и гость Силач, потом наоборот; сообщения пересылаем сами (вместо PeerJS)
  for(const hr of ['jump', 'strong']){
    const A = await open('host'), B = await open('guest');
    for(const [pg, host] of [[A, true], [B, false]]) await pg.evaluate(h => {
      window.__inbox = []; window.__out = [];
      net.host = h; net.conn = {open:true, send:m => __out.push(JSON.parse(JSON.stringify(m)))};
      $('#intro').hidden = true; started = true; rsLvAuto = true; rsLvPick = 'snow';
    }, host);
    const relay = async () => {
      const a = await A.evaluate(() => __out.splice(0)), b = await B.evaluate(() => __out.splice(0));
      if(a.length) await B.evaluate(ms => __inbox.push(...ms), a);
      if(b.length) await A.evaluate(ms => __inbox.push(...ms), b);
    };
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
    await A.evaluate(() => bzBeacon()); await relay();
    await both(4, {idle:true});
    await A.evaluate(() => bzMom(Q.moms.findIndex(m => m.ok))); await relay();
    await both(11, {idle:true});
    const s0 = await Promise.all([A, B].map(pg => pg.evaluate(() => ({ on: !!(WL && WL.q === Q), role: Q.me.role }))));
    ok(s0[0].on && s0[1].on, `по сети: оба в ущелье с санками (хозяйка — ${s0[0].role}, гость — ${s0[1].role})`);
    let sync = 0, phOk = 0, phN = 0;
    for(let i = 0; i < 80; i++){
      await both(1);
      const [a, b] = await Promise.all([A, B].map(pg => pg.evaluate(() => WL && WL.q === Q ? { sx: WL.sx, ph: WL.ph, home: WL.home, end: Q.end } : { end: Q && Q.end, gone: true })));
      if(a.sx != null && b.sx != null){ sync = Math.max(sync, Math.abs(a.sx - b.sx)); phN++; if(a.ph === b.ph) phOk++; }
      if((a.home || a.end) && (b.home || b.end)) break;
    }
    await both(10);
    const fin = await Promise.all([A, B].map(pg => pg.evaluate(() => ({ end: Q && Q.end, home: !!(WL && WL.home), sn: (window.__log || {}).sneezes, shh: WL && WL.shh, hic: WL && WL.hics }))));
    console.log('   по сети:', JSON.stringify(fin), 'санки расходятся до', sync.toFixed(2), 'м, фаза совпала', phOk + '/' + phN);
    ok(fin.every(f => f.end === 'win' || f.home), `по сети: вышли у обоих (хозяйка — ${hr})`);
    ok(sync < 1.5, `по сети: санки у гостя там же, где у хозяйки (расхождение ≤ ${sync.toFixed(2)} м)`);
    ok(phOk >= phN - 2, `по сети: морж у обоих храпит и ворочается одинаково (${phOk}/${phN})`);
    await shot(B, 'net-guest-' + hr);
    await A.context().close(); await B.context().close();
  }
  console.log(fails ? `\n✗ ошибок: ${fails}` : '\n✓ всё работает');
  await browser.close(); srv.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
