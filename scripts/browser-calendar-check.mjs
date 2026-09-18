import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE});
try {
 const page=await browser.newPage({locale:'zh-CN',viewport:{width:375,height:900}});
 await page.clock.install({time:new Date('2026-09-18T12:00:00Z')});
 await page.route('**/assets/data.json',async route=>{const response=await route.fetch();const data=await response.json();data.weeks=data.weeks.filter(w=>w.start!=='2026-09-14');await route.fulfill({response,json:data});});
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:4181');
 await page.waitForSelector('.search-result');
 assert.equal(await page.locator('#week-tab-0 small').innerText(),'09.14');
 assert.equal(await page.locator('.rank-card').count(),0);
 assert.match(await page.locator('#week-panel').innerText(),/尚未就绪/);
 await page.locator('button.secondary-button[data-week]').click();
 assert.equal(await page.locator('.rank-card').count(),10);
 assert.equal(await page.locator('#week-tab-1').getAttribute('aria-selected'),'true');
 await page.locator('[data-lang=en]').click();
 await page.locator('#week-tab-0').click();
 assert.match(await page.locator('#week-tab-0').innerText(),/Latest week/);
 assert.match(await page.locator('#week-panel').innerText(),/No complete ranking/);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log('Calendar regression passed: September period, missing week explanation, historical ranking access, English and mobile layout.');
} finally {await browser.close();}
