// бот охоты (sealHunt): проходит все 4 шага через playwright-page; shots — префикс для скриншотов шагов. require('./huntbot')(page)
module.exports = async function huntBot(page, shots){
  const st = () => page.evaluate(() => {
    const u = document.querySelector('.hunt'); if(!u) return null;
    const b = u.querySelector('.hunt-btns button'), r = b && b.getBoundingClientRect();
    return { cls: u.className, txt: b ? b.textContent : '', x: r ? r.x + r.width/2 : 0, y: r ? r.y + r.height/2 : 0,
      arrow: u.querySelector('.hunt-arrow').textContent, ok: u.querySelector('.hunt-ring').classList.contains('ok'),
      lr: [...u.querySelectorAll('.hunt-lr')].map(e => { const q = e.getBoundingClientRect(); return [q.x + q.width/2, q.y + q.height/2]; }) };
  });
  const seen = new Set(); let miss = 0;
  for(let i = 0; i < 400; i++){
    const s = await st();
    if(!s){ if(seen.size) return true; await page.waitForTimeout(100); continue; }
    const step = s.cls.includes('caught') ? 'caught' : s.cls.includes('snap') ? 'snap' : s.lr.length ? 'chase' : s.cls.includes('dark') ? 'dark' : s.cls.includes('under') ? 'wait' : 'dive';
    if(!seen.has(step)){ seen.add(step); if(shots) await page.screenshot({ path: `${shots}-${seen.size}-${step}.png` }); }
    if(step === 'dive'){ await page.mouse.click(s.x, s.y); }
    else if(step === 'dark'){ await page.mouse.move(s.x, s.y); await page.mouse.down(); for(let k = 0; k < 60; k++){ await page.waitForTimeout(100); const t = await st(); if(!t || !t.cls.includes('dark')) break; if(k === 8 && shots) await page.screenshot({ path: `${shots}-feel.png` }); } await page.mouse.up(); }
    else if(step === 'chase'){ if(i % 5 === 0 && miss < 1){ miss++; const w = s.arrow === '◀' ? s.lr[1] : s.lr[0]; await page.mouse.click(...w); } else { const w = s.arrow === '◀' ? s.lr[0] : s.lr[1]; await page.mouse.click(...w); } await page.waitForTimeout(250); }
    else if(step === 'snap'){
      await page.mouse.move(s.x, s.y); await page.mouse.down();
      let shot = false;
      for(let k = 0; k < 100; k++){ await page.waitForTimeout(30); const t = await st(); if(!t) break; if(!shot && k === 15 && shots){ shot = true; await page.screenshot({ path: `${shots}-ring.png` }); } if(t.ok) break; }
      await page.waitForTimeout(40); await page.mouse.up(); await page.waitForTimeout(300);
    }
    await page.waitForTimeout(80);
  }
  return false;
};
