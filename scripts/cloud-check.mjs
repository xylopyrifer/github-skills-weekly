import {execFileSync} from 'node:child_process';
import {readFile,appendFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
export function recoveryKind({valid,fresh,warnings,liveMatches}){return !valid||!fresh||warnings>0?'weekly.yml':!liveMatches?'deploy.yml':null;}
export const beijingDay=date=>new Date(+new Date(date)+8*3600000).toISOString().slice(0,10);
const repo='xylopyrifer/github-skills-weekly';
const gh=(args)=>execFileSync(process.env.GH_PATH||'gh',args,{encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']});
const api=route=>JSON.parse(gh(['api','repos/'+repo+route]));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitForPublications(){
 for(let attempt=0;attempt<40;attempt++){
  const runs=(await Promise.all(['weekly.yml','deploy.yml','community-tags.yml'].map(async w=>api('/actions/workflows/'+w+'/runs?branch=main&per_page=10').workflow_runs))).flat();
  if(!runs.some(r=>r.status!=='completed'))return;
  console.log('Publication is active; waiting without dispatching a duplicate.');await sleep(30000);
 }throw new Error('Publication did not finish within 20 minutes. No duplicate was started.');
}
async function inspect(){
 execFileSync('git',['pull','--ff-only','origin','main'],{stdio:'pipe'});
 let valid=true;try{execFileSync(process.execPath,['scripts/validate-data.mjs','--fresh'],{stdio:'pipe'});}catch{valid=false;}
 const report=JSON.parse(await readFile('data/update-report.json','utf8'));
 const fresh=Number.isFinite(Date.parse(report.updated_at))&&beijingDay(report.updated_at)===beijingDay(new Date());
 let liveMatches=false;
 if(valid){execFileSync(process.execPath,['scripts/build.mjs'],{stdio:'pipe'});const expected=await readFile('dist/assets/data.json');const response=await fetch('https://xylopyrifer.github.io/github-skills-weekly/assets/data.json?check='+Date.now(),{signal:AbortSignal.timeout(30000),cache:'no-store'});if(response.ok){const actual=Buffer.from(await response.arrayBuffer());const hash=b=>createHash('sha256').update(b).digest('hex');liveMatches=hash(expected)===hash(actual);}}
 return {valid,fresh,warnings:Array.isArray(report.warnings)?report.warnings.length:1,liveMatches};
}
export async function run(){
 await waitForPublications();let state;try{state=await inspect();}catch(e){throw new Error('Could not safely inspect repository/live data: '+e.message);}
 console.log('Cloud data check: '+JSON.stringify(state));const workflow=recoveryKind(state);
 if(workflow){console.log('Starting one recovery run: '+workflow);gh(['workflow','run',workflow,'--repo',repo,'--ref','main']);await sleep(20000);await waitForPublications();state=await inspect();if(recoveryKind(state))throw new Error('Recovery did not restore all checks: '+JSON.stringify(state));}
 const message=workflow?'Recovery completed and stored/live data verified.':'Stored and live data verified; no recovery needed.';console.log(message);if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,message+'\n');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await run();
