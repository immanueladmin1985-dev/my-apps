// 화면 점검: node tools/check.js <스크린샷 폴더>
const { chromium, devices } = require('playwright');
const path = require('path');
const out = process.argv[2] || '.';
const url = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const sizes = [['phone', devices['Pixel 7']], ['phone-land', { viewport: { width: 915, height: 412 }, hasTouch: true, isMobile: true }], ['tablet', devices['iPad (gen 7)']], ['tablet-land', devices['iPad (gen 7) landscape']]];
  for (const [name, dev] of sizes) {
    const ctx = await browser.newContext({ ...dev });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(name + ': ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(name + ' console: ' + m.text()); });
    await page.goto(url);
    await page.screenshot({ path: `${out}/${name}-home.png` });
    await page.click('#hNew'); await page.click('[data-m=classic]');
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/${name}-how.png` });
    await page.click('.dim [data-close]');
    // 사람처럼 몇 수 눌러 보기 (애니메이션 포함)
    for (let i = 0; i < 14; i++) {
      const m = await page.evaluate(() => __garden.best());
      if (m.swap) await page.click('#gBasket');
      await page.click(`.cell[data-i="${m.cell}"]`);
      await page.waitForFunction(() => !__garden.busy);
    }
    await page.screenshot({ path: `${out}/${name}-game.png` });
    if (name === 'phone') {
      // 컴퓨터가 끝까지 진행 (애니메이션 생략)
      await page.evaluate(() => __garden.setFast(true));
      let guard = 0;
      while (guard++ < 2000) {
        const done = await page.evaluate(async () => {
          const st = __garden.st; if (!st || st.over) return true;
          const dim = document.querySelector('.dim');
          if (dim) { const g = dim.querySelector('[data-a=glove]'); const end = dim.querySelector('[data-a=end]');
            if (g) { g.click(); const c = st.board.findIndex(k => k === 'w1' || k === 's1' || k === 'p1'); document.querySelector(`.cell[data-i="${c < 0 ? 0 : c}"]`).click(); return false; }
            if (end) { end.click(); return false; } return true; }
          const m = __garden.best(); if (!m) return true;
          if (m.swap) document.getElementById('gBasket').click();
          await __garden.place(m.cell); return false;
        });
        if (done) break;
      }
      await page.evaluate(() => __garden.setFast(false));
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${out}/${name}-over.png` });
      const info = await page.evaluate(() => ({ games: __garden.P.games, xp: __garden.P.xp, ach: Object.keys(__garden.P.ach), hist: __garden.P.hist[0] }));
      console.log('auto game', JSON.stringify(info));
      await page.click('[data-a=home]');
      await page.click('#hBook'); await page.waitForTimeout(200); await page.screenshot({ path: `${out}/${name}-book.png` }); await page.click('.dim [data-close]');
      await page.click('#hBadge'); await page.click('.dim [data-close]');
      await page.click('#hRec'); await page.waitForTimeout(200); await page.screenshot({ path: `${out}/${name}-rec.png` }); await page.click('.dim [data-close]');
      await page.click('#hSet'); await page.waitForTimeout(200); await page.screenshot({ path: `${out}/${name}-set.png` }); await page.click('.dim .sbtn.primary[data-close]');
      await page.click('#hDaily'); await page.waitForTimeout(200);
      const d = await page.evaluate(() => __garden.st.mode + ' ' + __garden.st.seed);
      console.log('daily', d);
      await page.reload(); await page.waitForTimeout(200);
      console.log('continue visible', await page.isVisible('#hCont'));
      await page.screenshot({ path: `${out}/${name}-home2.png` });
    }
    await ctx.close();
  }
  await browser.close();
  console.log(errors.length ? 'ERRORS\n' + errors.join('\n') : 'no errors');
})();
