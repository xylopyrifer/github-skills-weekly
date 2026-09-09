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
