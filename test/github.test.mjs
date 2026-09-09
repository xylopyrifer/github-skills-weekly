import test from 'node:test';
import assert from 'node:assert/strict';
import { githubClient } from '../scripts/lib/github.mjs';
test('HTTP 500 retries and succeeds without putting token in URL',async()=>{
 let calls=0;const waits=[];
 const get=githubClient({token:'test-only-value',sleep:async ms=>waits.push(ms),fetchImpl:async(url,options)=>{calls++;assert.equal(url,'https://api.github.com/repos/a/b');assert.equal(options.headers.Authorization,'Bearer test-only-value');return calls===1?new Response('',{status:502}):Response.json({ok:true});}});
 assert.deepEqual(await get('/repos/a/b'),{ok:true});assert.equal(calls,2);assert.deepEqual(waits,[1000]);
});
test('404 does not retry and rate limits stop further network requests',async()=>{
 let calls=0;const get=githubClient({fetchImpl:async()=>{calls++;return new Response('',{status:404});}});await assert.rejects(get('/repos/a/b'),{status:404});assert.equal(calls,1);
 const limited=githubClient({fetchImpl:async()=>new Response('',{status:403,headers:{'x-ratelimit-remaining':'0','x-ratelimit-reset':String(Math.floor(Date.now()/1000)+3600)}})});
 await assert.rejects(limited('/repos/a/b'),{rateLimited:true});await assert.rejects(limited('/repos/c/d'),/budget exhausted/);
});
test('network errors retry three times, request budget is bounded',async()=>{
 let calls=0;const get=githubClient({sleep:async()=>{},fetchImpl:async()=>{calls++;throw new TypeError('network');}});await assert.rejects(get('/repos/a/b'),/request failed/);assert.equal(calls,3);
 const budget=githubClient({maxRequests:1,fetchImpl:async()=>Response.json({ok:true})});await budget('/repos/a/b');await assert.rejects(budget('/repos/a/b'),/budget exhausted/);
});
