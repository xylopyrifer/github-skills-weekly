import assert from 'node:assert/strict';import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE});
try{
 const page=await browser.newPage({locale:'zh-CN',viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:4182');await page.waitForSelector('.newcomer-card');assert.equal(await page.locator('.newcomer-card').count(),10);
 assert.match(await page.locator('.newcomers').innerText(),/本周首次收录/);
 await page.locator('.newcomer-card').first().click();await page.waitForSelector('.detail-hero');assert.match(await page.locator('a.primary-button').getAttribute('href'),/^https:\/\/github.com\//);assert.equal(await page.locator('#tag-form').count(),1);
 await page.locator('[data-lang=en]').click();await page.locator('.detail-back').click();await page.waitForSelector('.newcomer-card');assert.match(await page.locator('#newcomers-title').innerText(),/New skills/);
 for(const width of [320,375,768]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await page.screenshot({path:'release/qa/newcomers-mobile.png',fullPage:false});assert.deepEqual(errors,[]);
 console.log('Newcomers UI passed: TOP 10, discovery label, detail/tag form, bilingual display, mobile widths and no runtime errors.');
}finally{await browser.close();}
