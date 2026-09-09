import { createHash } from 'node:crypto';
export const normalizeLabel = value => typeof value==='string'?value.normalize('NFKC').trim().replace(/\s+/gu,' ').toLowerCase():'';
export function customTag(value,taxonomy=[]){
 const text=typeof value==='string'?value.normalize('NFKC').trim().replace(/\s+/gu,' '):'';
 if([...text].length<2||[...text].length>32||!/[\p{L}\p{N}]/u.test(text)||/[<>\p{Cc}\p{Cf}]/u.test(text)||/https?:\/\/|www\./i.test(text))throw new Error('Custom tags must be 2–32 characters, without links or markup');
 const canonical=normalizeLabel(text),existing=taxonomy.find(t=>[t.id,...Object.values(t.label||{})].some(v=>normalizeLabel(v)===canonical));
 return existing||{id:'custom-'+createHash('sha256').update(canonical).digest('hex').slice(0,20),label:{zh:text,en:text},custom:true};
}
export function latestVotes(submissions,name){const latest=new Map();for(const s of submissions||[])if(s.repository.toLowerCase()===name.toLowerCase()){const old=latest.get(s.user_id);if(!old||s.issue>old.issue)latest.set(s.user_id,s);}return [...latest.values()].filter(s=>s.active);}
export const reviewKey=(name,id)=>name.toLowerCase()+'|'+id;
export function customDefinitions(submissions,reviews={decisions:[]}){const defs=new Map();for(const s of submissions||[])for(const t of s.custom_tags||[])defs.set(t.id,t);for(const d of reviews.decisions||[])if(d.tag)defs.set(d.tag.id,d.tag);return [...defs.values()];}
export function publicCommunityTags(system,submissions,name,taxonomy,reviews={decisions:[]}){
 const definitions=[...taxonomy,...customDefinitions(submissions,reviews)],allowed=new Set(definitions.map(t=>t.id)),counts=new Map();
 const decisions=new Map((reviews.decisions||[]).filter(d=>d.repository.toLowerCase()===name.toLowerCase()).map(d=>[d.tag.id,d]));
 for(const t of system||[])if(allowed.has(t.id))counts.set(t.id,1);
 for(const s of latestVotes(submissions,name))for(const id of new Set([...s.tags,...(s.custom_tags||[]).map(t=>t.id)]))if(allowed.has(id)&&decisions.get(id)?.status!=='rejected')counts.set(id,(counts.get(id)||0)+1);
 for(const [id,d]of decisions)if(d.status==='accepted'&&!counts.has(id))counts.set(id,1);
 return [...counts].map(([id,count])=>({id,count})).sort((a,b)=>b.count-a.count||a.id.localeCompare(b.id));
}
export function reviewCandidates(submissions,taxonomy,reviews={decisions:[]}){
 const names=new Set([...submissions.map(s=>s.repository),...(reviews.decisions||[]).map(d=>d.repository)]),defs=customDefinitions(submissions,reviews),result=[];
 for(const name of names){const votes=latestVotes(submissions,name),counts=new Map();for(const s of votes)for(const t of s.custom_tags||[])counts.set(t.id,(counts.get(t.id)||0)+1);
 for(const tag of defs){const previous=(reviews.decisions||[]).find(d=>reviewKey(d.repository,d.tag.id)===reviewKey(name,tag.id));if(counts.has(tag.id)||previous?.status==='accepted')result.push({repository:name,tag,supporters:counts.get(tag.id)||0,previous:previous?.status||'pending'});}}
 return result.sort((a,b)=>reviewKey(a.repository,a.tag.id).localeCompare(reviewKey(b.repository,b.tag.id)));
}
