import test from 'node:test';
import assert from 'node:assert/strict';
import { weeklyRanking, aggregateAllTime, activityScore, logScore } from '../scripts/lib/scoring.mjs';
import { previousWeek, isoWeek, isBoundaryWindow } from '../scripts/lib/calendar.mjs';
import { relevance } from '../scripts/lib/discovery.mjs';
import { messages } from '../src/i18n.js';
import { demoData } from '../scripts/lib/demo.mjs';
const row=(name,stars,delta,forks=0)=>({full_name:name,stars,stars_delta:delta,forks:10,forks_delta:forks,activity:50});
test('60/15/15/10 scoring is bounded; strong new growth beats a large stagnant repo',()=>{
 const result=weeklyRanking([row('x/old',1000000,20),row('x/new',10000,5000,100)]);
 assert.equal(result.rows[0].full_name,'x/new');
 for(const r of result.rows){assert.ok(r.heat_score>=0&&r.heat_score<=100);const c=r.components;assert.equal(r.heat_score,Math.round((c.stars*.6+c.forks*.15+c.activity*.15+c.size*.1)*10)/10);}
});
test('tiny absolute growth does not saturate, negative deltas stay visible, missing samples excluded',()=>{
 const result=weeklyRanking([row('x/tiny',2,1),row('x/negative',100,-7,-2),{...row('x/missing',100,10),activity:undefined}]);
 assert.equal(result.rows.length,2);assert.ok(result.rows.find(r=>r.full_name==='x/tiny').components.stars<20);
 const n=result.rows.find(r=>r.full_name==='x/negative');assert.equal(n.stars_delta,-7);assert.equal(n.components.stars,0);assert.equal(n.components.forks,0);
});
test('anomalous forks are capped for scoring but raw growth stays available',()=>{
 const result=weeklyRanking([row('x/a',100,20,1000000),row('x/b',100,20,20)]);
 assert.equal(result.rows[0].heat_score,result.rows[1].heat_score);assert.equal(result.rows[0].forks_delta,1000000);
});
test('stable tie breaking and rank movement',()=>{
 const rows=weeklyRanking([row('x/b',100,20),row('x/a',100,20)],[{full_name:'x/a',rank:3}]).rows;
 assert.equal(rows[0].full_name,'x/a');assert.equal(rows[0].rank_change,2);assert.equal(rows[1].rank_change,null);
});
test('activity normalization handles empty, saturated, and invalid inputs',()=>{
 assert.equal(activityScore(0,0),0);assert.equal(activityScore(1000,7),100);assert.equal(logScore(-1,100),0);assert.ok(Number.isFinite(logScore(NaN,1)));
});
test('all-time keeps more than five weeks and does not double count rebuilds',()=>{
 const weeks=Array.from({length:8},(_,i)=>({start:new Date(Date.UTC(2026,0,5+i*7)).toISOString().slice(0,10),end:new Date(Date.UTC(2026,0,12+i*7)).toISOString().slice(0,10),rows:[{full_name:'x/a',heat_score:80,rank:1}]}));
 const all=aggregateAllTime(weeks);assert.equal(all[0].weekly_scores.length,8);assert.equal(all[0].weeks_ranked,8);assert.equal(all[0].current_streak,8);assert.deepEqual(aggregateAllTime(weeks),all);assert.ok(all[0].total_heat>aggregateAllTime(weeks.slice(-5))[0].total_heat);
 weeks.push({start:'2026-03-02',end:'2026-03-09',rows:[{full_name:'x/b',rank:1,heat_score:90}]});assert.equal(aggregateAllTime(weeks).find(r=>r.full_name==='x/a').current_streak,0);
});
test('UTC calendar handles Monday, Sunday, year boundaries and late runs',()=>{
 assert.deepEqual(previousWeek('2026-09-14T00:17:00Z'),{start:'2026-09-07',end:'2026-09-14'});
 assert.deepEqual(previousWeek('2026-09-13T23:59:59Z'),{start:'2026-08-31',end:'2026-09-07'});
 assert.equal(isoWeek('2020-12-28'),'2020-W53');assert.equal(isoWeek('2021-01-04'),'2021-W01');assert.equal(isoWeek('2026-09-07'),'2026-W37');
 assert.equal(isBoundaryWindow('2026-09-14T05:59:59Z'),true);assert.equal(isBoundaryWindow('2026-09-14T06:00:01Z'),false);
});
test('discovery needs real structure or topic, not a repository name or generic skill',()=>{
 assert.equal(relevance({description:'Football skill training',readme:'Skills for life'}).structural,false);
 const mention=relevance({description:'Claude Code skills',readme:'Install SKILL.md for Codex'});assert.equal(mention.structural,false);
 const real=relevance({description:'Agent skills',readme:'Install SKILL.md for Claude Code',paths:['skills/demo/SKILL.md']});assert.ok(real.score>=65);assert.equal(real.structural,true);
 assert.equal(relevance({paths:['docs/SKILL.md.backup']}).score,0);
});
test('translations have identical keys and demo is isolated with five complete TOP 10 weeks',()=>{
 assert.deepEqual(Object.keys(messages.zh).sort(),Object.keys(messages.en).sort());const demo=demoData();assert.equal(demo.demo,true);assert.equal(demo.weeks.length,5);assert.ok(demo.weeks.every(w=>w.rows.length===10));assert.ok(demo.repositories.every(r=>r.full_name.startsWith('demo/')&&r.url===null));
});
