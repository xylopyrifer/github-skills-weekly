import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const require=createRequire(import.meta.url);
const { chromium }=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const base=process.env.TEST_URL||'http://127.0.0.1:4173';
await mkdir('release/qa',{recursive:true});
const browser=await chromium.launch({headless:true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath:process.env.BROWSER_EXECUTABLE} : {})});
const results=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},locale:'zh-CN'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.waitForSelector('.rank-card');
 assert.equal(await page.locator('html').getAttribute('lang'),'zh-CN');
 assert.equal(await page.locator('.week-tab').count(),5);
 assert.ok((await page.locator('.rank-card').count())>=6);
 assert.equal(await page.locator('.notice.demo').count(),0);
 await page.screenshot({path:'release/qa/desktop-real.png',fullPage:true});
 results.push('Real data loads with five calendar tabs and clearly marked baseline');
 await page.locator('.rank-card').first().click();await page.waitForSelector('.detail-hero');
 const github=page.locator('a.primary-button');assert.match(await github.getAttribute('href'),/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/);assert.equal(await page.locator('.trend-row').count(),5);
 await page.locator('[data-lang=en]').click();assert.equal(await page.locator('html').getAttribute('lang'),'en');assert.equal(await github.textContent(),'View on GitHub ↗');
 await page.reload();await page.waitForSelector('.detail-hero');assert.equal(await page.locator('html').getAttribute('lang'),'en');
 results.push('Project detail, GitHub link, five-week history, language persistence and deep-link reload work');
 await page.locator('.detail-back').click();await page.waitForSelector('.rank-card');
 await page.locator('[data-action=demo]').first().click();await page.waitForSelector('.notice.demo');
 assert.equal(await page.locator('.rank-card').count(),10);assert.equal(await page.locator('a.podium-card').count(),3);
 const titles=[];
 for(let i=0;i<5;i++){
  await page.locator('[data-week="'+i+'"]').click();assert.equal(await page.locator('.rank-card').count(),10);titles.push(await page.locator('.week-period').innerText());
 }
 assert.equal(new Set(titles).size,5);
 await page.locator('[data-week="0"]').click();await page.locator('[data-lang=zh]').click();
 await page.screenshot({path:'release/qa/desktop-demo.png',fullPage:true});
 results.push('Fictional demo has TOP 3, TOP 10, five distinct weekly rankings and rank movement');
 await page.locator('[data-week="0"]').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('[data-week="1"]').getAttribute('aria-selected'),'true');
 await page.locator('#method-button').click();assert.equal(await page.locator('[role=dialog]').count(),1);await page.keyboard.press('Escape');assert.equal(await page.locator('#modal').isHidden(),true);
 results.push('Keyboard tabs, methodology dialog, Escape and focus restoration work');
 for(const width of [320,375,390,768]){
  await page.setViewportSize({width,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Horizontal overflow at '+width);
  await page.locator('.rank-card').first().click();await page.waitForSelector('.detail-hero');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Detail overflow at '+width);
  await page.locator('.detail-back').click();await page.waitForSelector('.rank-card');
 }
 await page.setViewportSize({width:390,height:844});await page.locator('[data-week="0"]').click();await page.screenshot({path:'release/qa/mobile-demo.png',fullPage:true});
 results.push('Homepage and detail have no horizontal overflow at 320, 375, 390 and 768 pixels');
 await page.locator('[data-action=live]').click();await page.waitForSelector('.rank-card');assert.equal(await page.locator('.notice.demo').count(),0);
 const failed=await browser.newPage();await failed.route('**/assets/data.json',route=>route.fulfill({status:503,body:'unavailable'}));await failed.goto(base);await failed.waitForSelector('[data-action=retry]');
 await failed.unroute('**/assets/data.json');await failed.locator('[data-action=retry]').click();await failed.waitForSelector('.rank-card');
 results.push('Network error state recovers using Retry');
 const denied=await browser.newPage();await denied.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('storage denied');}}));await denied.goto(base);await denied.waitForSelector('.rank-card');await denied.locator('[data-lang=en]').click();assert.equal(await denied.locator('html').getAttribute('lang'),'en');
 results.push('Language switching remains usable when local storage is unavailable');
 assert.deepEqual(errors,[]);results.push('No browser runtime errors');
 await writeFile('release/qa/browser-results.json',JSON.stringify({passed:results.length,results},null,2));console.log(results.join('\n'));
}finally{await browser.close();}

