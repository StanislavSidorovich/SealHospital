/* Общее для tools/smoke.js и tools/flows.js: поиск playwright-core и маленький статический сервер. */
const fs = require('fs'), path = require('path'), http = require('http');
const ROOT = path.resolve(__dirname, '..');

function findPlaywright(){
  try{ return require('playwright-core'); }catch(e){}
  const bases = [process.env.PLAYWRIGHT_CORE, path.join(process.env.LOCALAPPDATA || '', 'npm-cache', '_npx'), path.join(process.env.HOME || '', '.npm', '_npx')].filter(Boolean);
  for(const b of bases){
    if(b.endsWith('playwright-core') && fs.existsSync(b)) return require(b);
    if(!fs.existsSync(b)) continue;
    for(const d of fs.readdirSync(b)){
      const p = path.join(b, d, 'node_modules', 'playwright-core');
      if(fs.existsSync(p)) return require(p);
    }
  }
  throw new Error('playwright-core не найден: npm i playwright-core (или PLAYWRIGHT_CORE=путь)');
}

function serve(){
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if(p === '/') p = '/index.html';
    const f = path.join(ROOT, p);
    if(!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(ok => srv.listen(0, '127.0.0.1', () => ok({ srv, port: srv.address().port })));
}

const launch = pw => pw.chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });

module.exports = { ROOT, findPlaywright, serve, launch };
