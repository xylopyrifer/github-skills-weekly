export function classifyTags(repo,readme,paths,taxonomy){
 const sources=[['description',repo.description||''],['topics',(repo.topics||[]).join(' ')],['skill-paths',paths.join(' ')],['readme',readme]];
 return taxonomy.filter(t=>sources.some(([,v])=>new RegExp(t.pattern,'i').test(v))).map(t=>({id:t.id,evidence:sources.filter(([,v])=>new RegExp(t.pattern,'i').test(v)).map(([k])=>k)}));
}
export function mergeTags(system,submissions,name,taxonomy){
 const allowed=new Set(taxonomy.map(t=>t.id)),counts=new Map();
 for(const tag of system||[])if(allowed.has(tag.id))counts.set(tag.id,1);
 const latest=new Map();
 for(const s of submissions||[])if(s.repository.toLowerCase()===name.toLowerCase()){
 const old=latest.get(s.user_id);if(!old||s.issue>old.issue)latest.set(s.user_id,s);
 }
 for(const s of latest.values())if(s.active)for(const id of new Set(s.tags))if(allowed.has(id))counts.set(id,(counts.get(id)||0)+1);
 return [...counts].map(([id,count])=>({id,count})).sort((a,b)=>b.count-a.count||a.id.localeCompare(b.id));
}

// Reviewed capability corrections stay separate from scraped evidence and community votes.
export function validateTagOverrides(overrides,taxonomy){
 const allowed=new Set(taxonomy.map(t=>t.id));
 if(!overrides||Array.isArray(overrides)||typeof overrides!=='object')throw new Error('Invalid tag overrides');
 for(const [name,rule] of Object.entries(overrides)){
  if(!/^[a-z0-9_.-]+\/[a-z0-9_.-]+$/.test(name))throw new Error('Override names must be lowercase repository names');
  if(!rule||!Array.isArray(rule.add)||!Array.isArray(rule.remove))throw new Error('Override add/remove must be arrays');
  for(const ids of [rule.add,rule.remove])if(new Set(ids).size!==ids.length||ids.some(id=>!allowed.has(id)))throw new Error('Invalid override tag for '+name);
  if(rule.add.some(id=>rule.remove.includes(id)))throw new Error('Conflicting override tags for '+name);
  if(!rule.reason?.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(rule.reviewed_at)||!rule.sources?.length||rule.sources.some(url=>typeof url!=='string'||!url.startsWith('https://github.com/')))throw new Error('Override requires review evidence for '+name);
 }
}
export function applyTagOverrides(system,name,overrides={}){
 const rule=overrides[name.toLowerCase()];
 if(!rule)return system||[];
 const result=(system||[]).filter(t=>!rule.remove.includes(t.id)).map(t=>({...t}));
 for(const id of rule.add)if(!result.some(t=>t.id===id))result.push({id,evidence:['editorial-review']});
 return result;
}
