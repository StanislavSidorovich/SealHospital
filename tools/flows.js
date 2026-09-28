#!/usr/bin/env node
/* Сценарные проверки логики (headless Edge): то, что «все режимы» не ловит, потому что тут важен результат, а не отсутствие ошибок.
   Запуск: node tools/flows.js [--only=players,legacy]      Код возврата 1 — что-то не сошлось.
   Сейчас: игроки на устройстве (смена, чужое сохранение не портится), код сохранения туда-обратно, старые ключи sh.album/…,
   битое сохранение, «новое устройство» спрашивает имя, а у Сабрины со старым сохранением — не спрашивает, род игрока в pg(). */
const { findPlaywright, serve, launch } = require('./lib');
const arg = (k, d) => { const a = process.argv.find(x => x === '--' + k || x.startsWith('--' + k + '=')); return a ? (a.includes('=') ? a.split('=')[1] : true) : d; };
const ONLY = arg('only', '') ? String(arg('only')).split(',') : null;

/* сохранение кладём только при первой загрузке страницы (при перезагрузке оно уже в localStorage) */
const seed = kv => { try{ if(sessionStorage.getItem('__seeded')) return; sessionStorage.setItem('__seeded', '1'); for(const [k, v] of Object.entries(kv)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); }catch(e){} };
const SABRINA = { version: 1, progress: 12, shells: 40, shifts: 3, who: { name: 'Сабрина', g: 'f', asked: true }, album: [] };

const ready = page => page.waitForFunction(() => typeof $ === 'function' && typeof save !== 'undefined' && document.getElementById('intro'), null, { timeout: 30000 });
const visible = (page, sel) => page.evaluate(s => !document.querySelector(s).hidden, sel);

const FLOWS = {
  async players(page, ok){
    await ready(page);
    await page.evaluate(() => { openSettings(); });
    ok(await page.evaluate(() => document.querySelectorAll('#playersList button').length) === 1, 'в ⚙️ один игрок');
    await Promise.all([page.waitForNavigation(), page.evaluate(() => { document.getElementById('btnPlayerAdd').click(); })]);
    await ready(page);
    ok(await page.evaluate(() => PLAYERS.cur) === 'p2', 'новый игрок — p2');
    ok(await visible(page, '#who') && !(await visible(page, '#intro')), 'новый игрок: спрашивает «Кто играет?», первый экран ждёт');
    ok(await page.evaluate(() => save.progress) === 0, 'у нового игрока пустое сохранение');
    await page.evaluate(() => { document.getElementById('btnWhoOther').click(); });
    await page.fill('#whoName', 'Аня');
    await page.evaluate(() => { document.getElementById('btnWhoGo').click(); });
    ok(await page.evaluate(() => pname() + ':' + save.who.g) === 'Аня:f', 'имя и род сохранились');
    ok(await visible(page, '#intro'), 'после имени открылся первый экран');
    const ls = await page.evaluate(() => ({ p1: JSON.parse(localStorage.getItem('sh.save')).progress, p2: !!localStorage.getItem('sh.save.p2'), list: JSON.parse(localStorage.getItem('sh.players')) }));
    ok(ls.p1 === 12 && ls.p2, 'сохранение Сабрины не тронуто, у Ани своё');
    ok(ls.list.map(p => p.name).join() === 'Сабрина,Аня', 'имена в списке: ' + ls.list.map(p => p.name).join());
    await page.evaluate(() => { openSettings(); });
    const names = await page.evaluate(() => [...document.querySelectorAll('#playersList button')].map(b => b.textContent));
    ok(names.length === 2 && /Аня/.test(names[1]) && /Сабрина/.test(names[0]), 'в ⚙️ оба игрока: ' + names.join(' | '));
    await Promise.all([page.waitForNavigation(), page.evaluate(() => { document.querySelector('#playersList button[data-id="p1"]').click(); })]);
    await ready(page);
    ok(await page.evaluate(() => PLAYERS.cur + ':' + save.progress + ':' + pname()) === 'p1:12:Сабрина', 'вернулись к Сабрине: всё на месте');
  },
  async code(page, ok){
    await ready(page);
    const r = await page.evaluate(() => { const d = readCode(makeCode()); return d ? { same: Object.keys(d).sort().join() === Object.keys(save).sort().join(), progress: d.progress, shells: d.shells, name: d.who.name } : null; });
    ok(r && r.same && r.progress === 12 && r.shells === 40 && r.name === 'Сабрина', 'код сохранения читается обратно: ' + JSON.stringify(r));
    ok(await page.evaluate(() => readCode(makeCode().slice(0, -3)) === null), 'обрезанный код не принимается');
    ok(await page.evaluate(() => readCode('SEAL1.abc.def') === null && readCode('') === null), 'мусор вместо кода не принимается');
  },
  async legacy(page, ok){
    await ready(page);
    ok(await page.evaluate(() => save.progress === 7 && save.album[0] === 'x' && save.muted === true), 'старые ключи sh.album / sh.progress / sh.muted подхвачены');
    ok(await page.evaluate(() => save.who.asked === true && pname() === 'Сабрина'), 'с историей — это Сабрина, переспрашивать не надо');
    ok(!(await visible(page, '#who')), 'экран «Кто играет?» не показан');
  },
  async broken(page, ok){
    await ready(page);
    ok(await page.evaluate(() => save.progress === 0 && save.version === SAVE_VERSION && !!save.pet === false), 'битое сохранение превратилось в чистое');
    ok(await visible(page, '#who'), 'чистое сохранение спрашивает имя');
  },
  async fresh(page, ok){
    await ready(page);
    ok(await visible(page, '#who') && !(await visible(page, '#intro')), 'новое устройство: сначала «Кто играет?»');
    await page.evaluate(() => { document.getElementById('btnWhoMe').click(); });
    ok(await page.evaluate(() => isSabrinaPlayer() && pg('он', 'она') === 'она'), '«Я Сабрина» — девочка');
    ok(await visible(page, '#intro'), 'после выбора открылся первый экран');
  },
  async gender(page, ok){
    await ready(page);
    ok(await page.evaluate(() => pg('он', 'она') === 'он' && !isSabrinaPlayer()), 'мальчик: pg даёт мужской род, папиных записок нет');
    ok(await page.evaluate(() => { const t = document.getElementById('introText').textContent; return /Тимур/.test(t); }), 'первый экран называет по имени');
  }
};
const SETUP = {
  players: { LS: { 'sh.save': SABRINA } },
  code: { LS: { 'sh.save': SABRINA } },
  legacy: { LS: { 'sh.album': ['x'], 'sh.progress': 7, 'sh.muted': true } },
  broken: { LS: { 'sh.save': 'это не json{{' } },
  fresh: { LS: {} },
  gender: { LS: { 'sh.save': { ...SABRINA, who: { name: 'Тимур', g: 'm', asked: true } } } }
};

(async () => {
  const pw = findPlaywright(), { srv, port } = await serve(), browser = await launch(pw);
  let failed = 0;
  for(const name of Object.keys(FLOWS).filter(n => !ONLY || ONLY.includes(n))){
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 } }), page = await ctx.newPage();
    const errs = [], results = [];
    page.on('pageerror', e => errs.push(e.message.split('\n')[0]));
    await ctx.addInitScript(seed, SETUP[name].LS);
    const ok = (cond, msg) => results.push([!!cond, msg]);
    try{
      await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
      await FLOWS[name](page, ok);
    }catch(e){ results.push([false, 'сценарий упал: ' + e.message.split('\n')[0]]); }
    for(const e of errs) results.push([false, 'ошибка на странице: ' + e]);
    const bad = results.filter(r => !r[0]); failed += bad.length;
    console.log(`${bad.length ? '✗' : '✓'} ${name}`);
    for(const [good, msg] of results) if(!good || process.argv.includes('--verbose')) console.log(`    ${good ? '·' : '✗'} ${msg}`);
    await ctx.close();
  }
  await browser.close(); srv.close();
  console.log(failed ? `\nне сошлось проверок: ${failed}` : '\nВсе сценарии прошли ✓');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
