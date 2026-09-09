import fs from 'node:fs/promises';
import {githubClient} from './lib/github.mjs';
import {readJson,writeJson} from './lib/storage.mjs';
export function parseIssue(issue,catalog,taxonomy){
 if(issue.pull_request||!issue.body?.startsWith('<!-- skills-weekly-tags-v1 -->'))return null;
 try{const p=JSON.parse(issue.body.slice('<!-- skills-weekly-tags-v1 -->'.length));
 if(p.version!==1||typeof p.repository!=='string'||!Array.isArray(p.tags)||p.tags.length>taxonomy.length||!p.tags.length||!p.tags.every(id=>taxonomy.some(t=>t.id===id)))return null;
 const repo=catalog.find(r=>r.full_name.toLowerCase()===p.repository.toLowerCase());if(!repo||!Number.isSafeInteger(issue.user?.id)||!Number.isSafeInteger(issue.number))return null;
 return {issue:issue.number,user_id:issue.user.id,repository:repo.full_name,tags:[...new Set(p.tags)],active:issue.state==='open'&&!issue.locked,updated_at:issue.updated_at};
 }catch{return null;}
}
export async function syncCommunity(get=githubClient()){
 const catalog=await readJson('data/catalog.json'),taxonomy=await readJson('config/tags.json');const submissions=[];
 for(let page=1;page<=100;page++){const issues=await get('/repos/xylopyrifer/github-skills-weekly/issues?state=all&per_page=100&page='+page);for(const issue of issues){const s=parseIssue(issue,catalog.repositories,taxonomy.tags);if(s)submissions.push(s);}if(issues.length<100){await writeJson('data/community-tags.json',{schema_version:1,submissions:submissions.sort((a,b)=>a.issue-b.issue)});return;} }
 throw new Error('Issue pagination limit reached; previous community data preserved');
}
if(process.argv[1]?.endsWith('community-tags.mjs'))await syncCommunity();
