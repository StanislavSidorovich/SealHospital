#!/usr/bin/env node
/* Автотест «все режимы» (headless Edge, playwright-core).
   Открывает каждый режим игры в чистом браузере на 375×812, какое-то время играет (случайные касания и свайпы)
   и ловит ошибки: pageerror, console.error, непойманные промисы. Заодно замеряет время до первого экрана и память.
   Запуск:  node tools/smoke.js [--only=slide,storm] [--sec=8] [--jobs=3] [--all] [--lang=en] [--gender=m] [--no-taps]
   --all — два прохода подряд: 🇷🇺 девочка и 🇬🇧 мальчик (так ловятся ошибки в шаблонах строк обоих языков и родов).
   Нужен playwright-core: сам ищется в %LOCALAPPDATA%/npm-cache/_npx/<хеш>/node_modules (см. TESTING.md) или через `npm i playwright-core`.
   Код возврата 1, если хоть один режим упал — можно повесить на pre-push. */
const { ROOT, findPlaywright, serve, launch } = require('./lib');

const arg = (k, d) => { const a = process.argv.find(x => x === '--' + k || x.startsWith('--' + k + '=')); return a ? (a.includes('=') ? a.split('=')[1] : true) : d; };
const SEC = +arg('sec', 8), JOBS = +arg('jobs', 3), ONLY = arg('only', '') ? String(arg('only')).split(',') : null, TAPS = !arg('no-taps', false);

/* Что открыть. run — выражение, которое выполняется на странице через 1,5 с после загрузки (без await: игры живут до конца).
   pet: сначала зайти в уголок малыша. clicks: нажать по селекторам после старта (ждём, пока появятся; кнопки в углу под затемнением, поэтому `.click()` из JS);
   taps:false — без случайных касаний (в ⚙️ они попали бы в «Новый игрок» и перезагрузили страницу). */
const HIDE = `$('#intro').hidden = true; started = true;`;
const PET = `$('#btnIntroPet').click();`;
const RS = lv => ({ run: `${HIDE} rsLvPick = '${lv}'; rescueGame('ping');`, clicks: ['.rs-roles [data-r="jump"]'] });
const MODES = {
  hospital: { run: `$('#btnStart').click()` },
  pet: { run: PET },
  home: { pet: 1, run: `homeEnter()`, wait: 3 },
  ocean: { pet: 1, run: `save.home.rooms = {ocean: 2}; homeEnter().then(() => ocGo())`, wait: 5 },
  games: { pet: 1, run: `save.home.rooms = {games: 2}; homeEnter().then(() => rmGo('games'))`, wait: 5 },
  trophy: { pet: 1, run: `save.home.rooms = {trophy: 2}; homeEnter().then(() => rmGo('trophy'))`, wait: 5 },
  homewalk: { pet: 1, run: `save.home.rooms = {games: 2, trophy: 2, ocean: 2}; homeEnter().then(() => hwToggle())`, wait: 5 },
  ball: { pet: 1, run: `funPre = 'ball'; petDo('fun')`, wait: 3 },
  walk: { pet: 1, run: `funPre = 'walk'; petDo('fun')`, wait: 3 },
  tricks: { pet: 1, run: `funPre = 'tricks'; petDo('fun')`, wait: 3 },
  run: { pet: 1, run: `funPre = 'run'; petDo('fun')`, wait: 3, clicks: ['.adv-map .isle.on'] },
  run3: { pet: 1, run: `funPre = 'run'; petDo('fun')`, wait: 3, clicks: ['.adv-map [data-lv="bay3"]'] },
  dive: { pet: 1, run: `funPre = 'dive'; petDo('fun')`, wait: 3 },
  isle: { pet: 1, run: `funPre = 'isle'; petDo('fun')`, wait: 3 },
  'isle-gear': { pet: 1, run: `save.owned.push('gball', 'gsled', 'gfins'); funPre = 'isle'; petDo('fun'); setTimeout(() => { ISL.R.pos.set(10, 6, -18); }, 2500)`, wait: 3 },
  'shop-gear': { pet: 1, run: `shopTab = 'gear'; $('#btnShop').click()` },
  hunt: { pet: 1, run: `petFeed(petSeal)`, wait: 3 },
  cave: { pet: 1, run: `save.owned.push('gball'); save.isl.cave.keys = ['r', 'b', 'y']; funPre = 'isle'; petDo('fun'); setTimeout(() => cvEnter(), 2500)`, wait: 3 },
  'isle-fish': { pet: 1, run: `funPre = 'isle'; petDo('fun'); setTimeout(() => { const o = islRoot.userData.fish[1]; ISL.R.pos.copy(o.pos); setTimeout(() => islFish(o), 600); }, 2500)`, wait: 3 },
  chase: { pet: 1, run: `funPre = 'chase'; petDo('fun')`, wait: 3 },
  'slide-race': { run: `${HIDE} slideGame('race')` },
  'slide-time': { run: `${HIDE} slideGame('time')` },
  road: { run: `${HIDE} roadGame('solo')` },
  boss: { run: `${HIDE} coopFight('ping')` },
  bay: RS('bay'), grotto: RS('grot'), blizzard: RS('snow'), glow: RS('glow'), kelp: RS('kelp'), festival: RS('fest'),
  'storm-1': { run: `${HIDE} stormRun('ping', null, 0)` },
  'storm-2': { run: `${HIDE} stormRun('ping', null, 1)` },
  'storm-3': { run: `${HIDE} stormRun('ping', null, 2)` },
  'storm-4': { run: `${HIDE} stormRun('ping', null, 3)` },
  icecode: { run: `${HIDE} iceGame('rand')` },
  memo: { run: `${HIDE} bgGame('memo', 'ping', {size:12})` },
  finale: { pet: 1, run: `fnGo()`, wait: 3 },
  book: { run: `stOpen('today')` },
  settings: { run: `openSettings()`, taps: false },
  album: { run: `0`, clicks: ['#btnBag', '#btnAlbum'] },
  shop: { run: `$('#btnShop').click()` },
  mail: { run: `$('#btnMail').click()` },
  holiday: { url: '?holiday=halloween', pet: 1, run: `0`, wait: 3 }
};

/* Чистый браузер: сохранение кладём до загрузки страницы (addInitScript), sanitize() достроит недостающее. */
function makeSave(lang, g){
  return {
    version: 1, free: true, progress: 12, shifts: 6, shells: 300,
    who: { name: g === 'm' ? 'Тимур' : 'Сабрина', g, asked: true },
    pet: { name: 'Тюпа', f: g !== 'm', coat: 'snow', stage: 3, played: true, finds: ['a'] },
    story: { open: 8, fest: [], seen: [], sa: true },
    storm: { st: 4 }, dive: { n: 5, seen: [] }, coop: { wins: 3, resc: { wins: 3, lv: { bay: 1, grot: 1, snow: 1, glow: 1, kelp: 1, fest: 1 } } },
    pt: { blot: true, bear: true }
  };
}

const IGNORE = [/vibrate/i, /Failed to load resource/i, /fonts\.g(oogleapis|static)/i, /net::ERR_(INTERNET_DISCONNECTED|NAME_NOT_RESOLVED|CONNECTION|ADDRESS)/i, /peerjs|0\.peerjs\.com|WebSocket/i, /AudioContext was not allowed/i, /favicon/i];
const bad = t => !IGNORE.some(r => r.test(t));

async function runMode(browser, base, name, m, lang, g){
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, deviceScaleFactor: 1 });
  const errors = [];
  await ctx.addInitScript(([s, l]) => { try{ localStorage.setItem('sh.save', JSON.stringify(s)); localStorage.setItem('sh.lang', l); }catch(e){} }, [makeSave(lang, g), lang]);
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('pageerror: ' + (e.stack || e.message).split('\n').slice(0, 2).join(' | ')));
  page.on('console', c => { if(c.type() === 'error' && bad(c.text())) errors.push('console: ' + c.text().slice(0, 240)); });
  const t0 = Date.now(), info = { name };
  try{
    await page.goto(base + (m.url || '/'), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof $ === 'function' && document.getElementById('intro') && !document.getElementById('intro').hidden, null, { timeout: 30000 });
    info.load = Date.now() - t0;
    await page.waitForTimeout(1500);
    if(m.pet){ await page.evaluate(() => { $('#btnIntroPet').click(); }); await page.waitForTimeout((m.wait || 3) * 1000); }
    await page.evaluate(`(() => { ${m.run}; })()`);
    // кадры считаем сами: если за время игры их почти не было — режим завис
    await page.evaluate(() => { window.__fr = 0; const f = () => { window.__fr++; requestAnimationFrame(f); }; requestAnimationFrame(f); });
    const t1 = Date.now();
    for(const sel of m.clicks || []){ await page.waitForSelector(sel, { state: 'attached', timeout: 6000 }).then(() => page.evaluate(q => document.querySelector(q).click(), sel)).catch(() => errors.push('нет кнопки ' + sel)); await page.waitForTimeout(300); }
    while(Date.now() - t1 < SEC * 1000){
      if(TAPS && m.taps !== false){
        const x = 20 + Math.random() * 335, y = 120 + Math.random() * 600;
        if(Math.random() < 0.3){ await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + (Math.random() - 0.5) * 160, y + (Math.random() - 0.5) * 160, { steps: 4 }); await page.mouse.up(); }
        else await page.mouse.click(x, y);
      }
      await page.waitForTimeout(250);
    }
    info.fps = Math.round((await page.evaluate(() => window.__fr || 0)) / SEC);
    info.heap = await page.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0);
    info.tex = await page.evaluate(() => typeof renderer !== 'undefined' ? renderer.info.memory.textures + '/' + renderer.info.memory.geometries : '');
    if(info.fps < 3) errors.push('завис: ' + info.fps + ' кадров/с');
  }catch(e){ errors.push('runner: ' + e.message.split('\n')[0]); }
  await ctx.close();
  info.errors = [...new Set(errors)];
  return info;
}

(async () => {
  const pw = findPlaywright();
  const { srv, port } = await serve(), base = `http://127.0.0.1:${port}`;
  const browser = await launch(pw);
  const passes = arg('all', false) ? [['ru', 'f'], ['en', 'm']] : [[arg('lang', 'ru'), arg('gender', 'f')]];
  const names = Object.keys(MODES).filter(n => !ONLY || ONLY.includes(n));
  let failed = 0;
  for(const [lang, g] of passes){
    console.log(`\n== ${lang.toUpperCase()} · ${g === 'm' ? 'мальчик' : 'девочка'} · ${names.length} режимов по ${SEC} с ==`);
    const queue = names.slice(), out = [];
    await Promise.all(Array.from({ length: JOBS }, async () => {
      while(queue.length){
        const n = queue.shift(), r = await runMode(browser, base, n, MODES[n], lang, g);
        out.push(r);
        console.log(`${r.errors.length ? '✗' : '✓'} ${n.padEnd(11)} load ${String(r.load || '?').padStart(5)} мс · ${String(r.fps ?? '?').padStart(2)} к/с · heap ${String(r.heap ?? '?').padStart(3)} МБ · tex/geo ${r.tex || '-'}`);
        for(const e of r.errors) console.log('    ' + e);
      }
    }));
    failed += out.filter(r => r.errors.length).length;
  }
  await browser.close(); srv.close();
  console.log(failed ? `\nУПАЛО режимов: ${failed}` : '\nВсе режимы прошли ✓');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
