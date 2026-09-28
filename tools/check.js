#!/usr/bin/env node
/* Быстрая статическая проверка (1–2 с, без браузера): чтобы файлы, документация и сервис-воркер не расходились.
   Запуск:  node tools/check.js [--strict]      Код возврата 1 — есть ошибки (с --strict — и предупреждения).
   Что смотрит:
   1) каждый js/*.js и sw.js разбирается без синтаксических ошибок;
   2) набор <script> в index.html = список CORE в sw.js = файлы в js/ (новый файл — во все места сразу; порядок в index.html важен, в CORE — нет);
   3) поля сохранения: ключи sanitize() в data.js записаны и в шапке data.js, и в списке `sh.save` в CLAUDE.md;
   4) иконки и файлы из manifest.json и sw.js существуют;
   5) в CLAUDE.md нет устаревших утверждений (список — STALE ниже: дописывай сюда то, что уже исправляли);
   6) (предупреждения) функции и переменные, названные в `CLAUDE.md` / `TESTING.md` как `имя(`, — есть ли они в коде;
   7) (предупреждения) «Ты нашла» и подобное без pg() — род игрока (Фаза 11). */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const STRICT = process.argv.includes('--strict');
const errors = [], warns = [];
const err = m => errors.push(m), warn = m => warns.push(m);

const jsFiles = fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js')).sort();
const code = {};
for(const f of jsFiles) code[f] = rd('js/' + f);

/* 1. синтаксис */
for(const f of [...jsFiles.map(f => 'js/' + f), 'sw.js']){
  try{ new vm.Script(rd(f), { filename: f }); }catch(e){ err(`синтаксис ${f}: ${e.message}`); }
}

/* 2. порядок скриптов */
const html = rd('index.html'), sw = rd('sw.js');
const htmlOrder = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
const coreBlock = (sw.match(/const CORE = \[([\s\S]*?)\];/) || [, ''])[1];
const swAll = [...coreBlock.matchAll(/'\.\/([^']+)'/g)].map(m => m[1]);
const swScripts = swAll.filter(x => /^(js|vendor)\/.+\.js$/.test(x));
{   // порядок в CORE не важен (это набор для кеша), главное — те же файлы, что в index.html
  const a = new Set(htmlOrder), b = new Set(swScripts);
  const miss = htmlOrder.filter(x => !b.has(x)), extra = swScripts.filter(x => !a.has(x));
  if(miss.length || extra.length) err(`файлы в index.html и в sw.js (CORE) разные${miss.length ? '; нет в sw.js: ' + miss.join(', ') : ''}${extra.length ? '; лишние в sw.js: ' + extra.join(', ') : ''}`);
}
for(const f of jsFiles) if(!htmlOrder.includes('js/' + f)) err(`js/${f} лежит в папке, но не подключён в index.html`);
for(const s of htmlOrder) if(!fs.existsSync(path.join(ROOT, s))) err(`index.html ссылается на ${s}, а файла нет`);

/* 3. поля сохранения */
const san = (code['data.js'].match(/function sanitize\(d\)\{[\s\S]*?return \{\.\.\.d,([\s\S]*?)\)\};/) || [, ''])[1];
const saveKeys = ['version', ...[...san.matchAll(/^\s+([a-z]+):/gm)].map(m => m[1])];
if(saveKeys.length < 10) err('не смог прочитать ключи sanitize() в data.js (изменился формат? поправь регулярку в tools/check.js)');
const dataHead = (code['data.js'].match(/сохранение живёт под одним ключом sh\.save: \{([^}]*)\}/) || [, ''])[1];
const claude = rd('CLAUDE.md');
const claudeKeys = (claude.match(/`sh\.save` = `\{([^}]*)\}/) || [, ''])[1];
for(const [where, list] of [['шапке data.js', dataHead], ['CLAUDE.md («sh.save» = …)', claudeKeys]]){
  const have = new Set(list.split(/[,\s]+/).filter(Boolean));
  const miss = saveKeys.filter(k => !have.has(k)), extra = [...have].filter(k => !saveKeys.includes(k));
  if(!have.size) err(`не нашёл список полей сохранения в ${where}`);
  else{ if(miss.length) err(`поля сохранения есть в sanitize(), но не описаны в ${where}: ${miss.join(', ')}`); if(extra.length) err(`в ${where} есть поля, которых нет в sanitize(): ${extra.join(', ')}`); }
}

/* 4. файлы из manifest.json и sw.js */
try{
  const man = JSON.parse(rd('manifest.json'));
  for(const i of man.icons || []) if(!fs.existsSync(path.join(ROOT, i.src))) err(`manifest.json: нет файла ${i.src}`);
}catch(e){ err('manifest.json: ' + e.message); }
for(const x of swAll) if(!fs.existsSync(path.join(ROOT, x))) err(`sw.js (CORE): нет файла ${x}`);

/* 5. устаревшие утверждения в документации */
const STALE = [
  [/service worker пока нет|service worker.{0,10}пока не/i, 'CLAUDE.md говорит, что service worker нет, а sw.js уже есть'],
  [/Игра обязана работать с `file:\/\/`.*(?!Artifact)$/m, null]
];
for(const [re, msg] of STALE){ if(msg && re.test(claude) && fs.existsSync(path.join(ROOT, 'sw.js'))) err(msg); }

/* 6. имена из документации есть в коде? (предупреждения) */
const toolsCode = fs.readdirSync(__dirname).filter(f => f.endsWith('.js')).map(f => fs.readFileSync(path.join(__dirname, f), 'utf8')).join('\n');   // makeSave() и MODES живут в tools/
const all = Object.values(code).join('\n') + '\n' + html + '\n' + toolsCode;
const defined = name => new RegExp(`(?:function\\s+${name}\\b|(?:const|let|var|class)\\s+${name}\\b|[\\s,{(]${name}\\s*[:=]|\\b${name}\\s*\\([^)]*\\)\\s*\\{|\\b${name}\\s*=>|\\b${name}\\b\\s*,\\s*\\w+\\s*\\)?\\s*=>)`).test(all) || new RegExp(`[{,]\\s*${name}\\s*[,}]`).test(all);
const seen = new Set();
for(const doc of ['CLAUDE.md', 'TESTING.md']){
  const text = rd(doc).replace(/```[\s\S]*?```/g, '');
  for(const m of text.matchAll(/`([A-Za-z_$][\w$]*)\(/g)){
    const n = m[1]; if(seen.has(n)) continue; seen.add(n);
    if(/^(L|\$|Math|JSON|Object|Array|Promise|navigator|document|window|console|Date|Set|Map|String|Number|THREE|Error|if|for|while|toDateString|connect|navigate|click|reload|fetch|setTimeout|dispatchEvent|PointerEvent|render|toDataURL|getContext)$/.test(n)) continue;
    if(!defined(n)) warn(`${doc}: «${n}()» не найдено в коде — переименовано или устарело?`);
  }
}

/* 7. (предупреждения) женская форма про игрока без pg(): «Ты нашла» — мальчик увидит неправильно.
   Ищем «ты + (пара слов) + …ла/…лась» в русских строках. Про малыша и героев пишут через gg() или называют по имени — их эта проверка не трогает. */
const FEM = /(?<![а-яёА-ЯЁ])[Тт]ы\s+(?:уже\s+|всё\s+|сегодня\s+|тоже\s+|опять\s+|снова\s+)?[а-яё]+(?:ла|лась)(?![а-яё])/;
for(const f of jsFiles){
  if(f === 'letters.js') continue;   // письма папы — только для Сабрины
  let inBlock = false;
  code[f].split(/\r?\n/).forEach((ln, i) => {
    const wasIn = inBlock;
    if(!inBlock && ln.includes('/*') && !ln.slice(ln.indexOf('/*')).includes('*/')) inBlock = true; else if(inBlock && ln.includes('*/')) inBlock = false;
    if(wasIn || /^\s*\/\//.test(ln)) return;   // комментарии не смотрим
    const m = FEM.exec(ln); if(!m) return;
    const before = ln.slice(0, m.index);
    if(/pg\([^)]*$/.test(before)) return;
    warn(`js/${f}:${i + 1} женская форма про игрока без pg(): «${m[0]}»`);
  });
}

for(const m of errors) console.log('✗ ' + m);
for(const m of warns) console.log('! ' + m);
console.log(errors.length || warns.length ? `\nошибок: ${errors.length}, предупреждений: ${warns.length}` : `✓ всё сходится (${jsFiles.length} файлов js, ${saveKeys.length} полей сохранения)`);
process.exit(errors.length || (STRICT && warns.length) ? 1 : 0);
