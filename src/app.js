import { messages } from './i18n.js';
const main=document.getElementById('main'), modal=document.getElementById('modal');
let language='zh';
try{language=localStorage.getItem('skills-language')||(navigator.language.startsWith('zh')?'zh':'en');}catch(_){}
if(!messages[language])language='zh';
let liveData,data,selectedWeek=0,demo=false,modalTrigger;
function isBackfill(){return !!(data&&!demo&&weekSlots()[selectedWeek]&&weekSlots()[selectedWeek].week&&weekSlots()[selectedWeek].week.source_kind==='backfill');}
const t=k=>{
 if(data&&!demo&&data.all_time_kind==='backfill')k=({alltime:'backfillCumulative',alltimeNote:'backfillCumulativeNote'})[k]||k;
 if(isBackfill())k=({periodNote:'backfillPeriod',starGrowth:'backfillStars',forkGrowth:'backfillForks',stars:'snapshotStars',forks:'snapshotForks',historicalData:'backfillDetails'})[k]||k;
 return messages[language][k]||k;
};
const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Number.isFinite(n)?new Intl.NumberFormat(language==='zh'?'zh-CN':'en-US').format(n):'—';
const short=n=>!Number.isFinite(n)?'—':n>=1000000?(n/1000000).toFixed(1)+'M':n>=1000?(n/1000).toFixed(1)+'k':String(n);
const signed=n=>Number.isFinite(n)?(n>0?'+':'')+fmt(n):'—';
const localized=v=>v&&(v[language]||v.en||v.zh);
const repoName=n=>n.split('/').slice(1).join('/'),owner=n=>n.split('/')[0];
const icon=n=>`<span class="project-icon" aria-hidden="true">${esc(repoName(n).slice(0,2).toUpperCase())}</span>`;
const href=n=>'#skill/'+encodeURIComponent(n);
const repo=n=>data.repositories.find(r=>r.full_name.toLowerCase()===n.toLowerCase());
const allStats=n=>data.all_time.find(r=>r.full_name.toLowerCase()===n.toLowerCase());
function monday(date){const d=new Date(date);d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d;}
function weekSlots(){const latest=data.weeks[0],start=latest?new Date(latest.start+'T00:00:00Z'):new Date(+monday(new Date())-7*86400000);return Array.from({length:5},(_,i)=>{const key=new Date(+start-i*7*86400000).toISOString().slice(0,10);return{start:key,week:data.weeks.find(w=>w.start===key)};});}
const period=w=>w.start.replace(/-/g,'.')+' — '+new Date(+new Date(w.end+'T00:00:00Z')-86400000).toISOString().slice(0,10).replace(/-/g,'.');
const description=r=>localized(r.editorial&&r.editorial.description)||r.description||t('empty');
const dateTime=v=>v?new Date(v).toISOString().replace('T',' ').slice(0,16)+' UTC':'—';
function movement(r){if(!r||!r.rank)return'';const n=r.rank_change;return`<span class="movement ${n>0?'up':n<0?'down':''}" title="${esc(n===null?t('noPrevious'):t('movement'))}">${n===null?'NEW':n>0?'↑ '+n:n<0?'↓ '+Math.abs(n):'—'}</span>`;}
function notice(){
 if(demo)return`<aside class="notice demo"><div><strong>${t('demoTitle')}</strong><p>${t('demoBody')}</p></div><button type="button" data-action="live">${t('live')}</button></aside>`;
 if(isBackfill())return `<aside class="notice backfill"><div><strong>${t('backfillTitle')}</strong><p>${t('backfillBody')}</p></div></aside>`;
 if(!data.weeks.length&&data.repositories.length)return`<aside class="notice"><div><strong>${t('baselineTitle')}</strong><p>${t('baselineBody')}</p></div><button type="button" data-action="demo">${t('sample')}</button></aside>`;
 return'';
}
function podiumCard(s,i){
 if(!s)return`<div class="podium-card placeholder"><div class="podium-number"><span>0${i+1}</span> / ALL TIME</div><div><h3>${t('awaiting')}</h3><p>${t('pendingAlltime')}</p></div></div>`;
 return`<a class="podium-card ${i===0?'first':''}" href="${href(s.full_name)}"><div class="podium-top"><span class="podium-number"><span>0${i+1}</span> / ALL TIME</span>${icon(s.full_name)}</div><h3>${esc(repoName(s.full_name))}</h3><span class="subtle">${esc(owner(s.full_name))}</span><div class="podium-bottom"><span>${fmt(s.weeks_ranked)} ${t('weeks')} · TOP 10</span><strong class="podium-score">${fmt(s.total_heat)}</strong></div></a>`;
}
function repoCard(r,row){
 const s=row||r;
 return`<a class="rank-card" href="${href(r.full_name)}" aria-label="${esc(t('detail')+' '+r.full_name)}"><div class="rank-position">${row?String(row.rank).padStart(2,'0'):'·'}${movement(row)}</div>${icon(r.full_name)}<div class="project-copy"><h3>${esc(r.name||repoName(r.full_name))}</h3><span class="owner">${esc(owner(r.full_name))}</span><p>${esc(description(r))}</p><div class="project-meta"><span><i class="language-dot"></i>${esc(r.language||t('unknown'))}</span><span class="mini-tag">SKILL</span></div></div><div class="metrics"><div title="${t('stars')}"><div class="metric-value"><span class="metric-symbol">☆</span>${short(s.stars)}</div><div class="metric-growth ${!row?'pending':row.stars_delta<0?'negative':''}">${row?signed(row.stars_delta):t('awaiting')}</div></div><div title="${t('forks')}"><div class="metric-value"><span class="metric-symbol">⑂</span>${short(s.forks)}</div><div class="metric-growth ${!row?'pending':row.forks_delta<0?'negative':''}">${row?signed(row.forks_delta):t('awaiting')}</div></div></div><div class="heat"><strong>${row?fmt(row.heat_score):'—'}</strong><span>${language==='zh'?'周热度':'HEAT'}</span><div class="heat-bar"><i style="width:${row?Math.max(0,Math.min(100,row.heat_score)):0}%"></i></div></div></a>`;
}
function emptyState(title,body,action){return`<div class="empty-state"><div class="empty-icon" aria-hidden="true">[·]</div><h3>${t(title)}</h3><p>${t(body)}</p>${action?`<button class="secondary-button" type="button" data-action="${action}">${t(action==='retry'?'retry':'sample')} →</button>`:''}</div>`;}
function renderHome(){
 const slots=weekSlots(),slot=slots[selectedWeek]||slots[0],week=slot.week;
 let c=`<section class="hero"><div><div class="eyebrow">${t('eyebrow')}</div><h1>${t('headline')}</h1><p>${t('subtitle')}</p></div><div class="hero-stats"><div><strong>${fmt(data.repositories.length)}</strong><small>${t('tracked')}</small></div><div><strong>${fmt(data.total_weeks)}</strong><small>${t('published')}</small></div><div class="update-stat"><span><i class="status-dot"></i>${t('monday')}</span><span>${esc(data.updated_at?data.updated_at.slice(0,10):'—')}</span></div></div></section>${notice()}`;
 if(!demo&&data.updated_at&&Date.now()-Date.parse(data.updated_at)>8*86400000)c+=`<div class="stale-banner">${t('stale')}</div>`;
 if(!demo&&data.warning_count)c+=`<div class="stale-banner">${t('warnings')}</div>`;
 c+=`<section aria-labelledby="alltime-title"><div class="section-heading"><div class="heading-title"><h2 id="alltime-title">${t('alltime')}</h2><span class="tag">TOP 3</span></div><p class="section-caption">${t('alltimeNote')}</p></div><div class="podium">${[0,1,2].map(i=>podiumCard(data.all_time[i],i)).join('')}</div></section>`;
 c+=`<section aria-labelledby="weekly-title"><div class="section-heading weekly-heading"><div class="heading-title"><h2 id="weekly-title">${t('weekly')} <span class="tag">TOP 10</span></h2><p class="section-caption">${t('weeklySub')}</p></div><span class="period-chip">${week?esc(week.week):t('baselineBadge')}</span></div><div class="week-tabs" role="tablist" aria-label="${t('selectedPeriod')}">${slots.map((s,i)=>`<button class="week-tab ${i===selectedWeek?'active':''}" id="week-tab-${i}" role="tab" aria-selected="${i===selectedWeek}" aria-controls="week-panel" tabindex="${i===selectedWeek?'0':'-1'}" data-week="${i}">${i===0?t('latest'):i===1?t('previous'):language==='zh'?i+t('weekAgo'):i+' '+t('weekAgo')}<small>${s.start.slice(5).replace('-','.')}</small></button>`).join('')}</div><div id="week-panel" role="tabpanel" aria-labelledby="week-tab-${selectedWeek}">`;
 if(week)c+=`<div class="week-period"><span>${period(week)}</span><span>${week.source_kind==='backfill'?'GITHUB CALENDAR':'UTC'} · ${Math.min(10,week.rows.length)} SKILLS</span></div><div class="rank-list">${week.rows.slice(0,10).map(row=>repoCard(repo(row.full_name)||row,row)).join('')}</div><p class="small-note">${t('periodNote')}</p>`;
 else c+=emptyState(data.weeks.length?'noWeek':'waiting',data.weeks.length?'noWeekBody':'baselineBody');
 c+='</div></section>';
 if(!data.weeks.length)c+=`<section style="margin-top:30px"><div class="section-heading"><div class="heading-title"><h2>${t('catalog')}</h2></div><p class="section-caption">${t('catalogSub')}</p></div>${data.repositories.length?`<div class="rank-list">${data.repositories.map(r=>repoCard(r)).join('')}</div>`:emptyState('noDataTitle','noDataBody','demo')}</section>`;
 main.innerHTML=c;document.title='GitHub Skills Weekly — AI Agent Skills Trending';
}
const stat=(label,value,accent=false)=>`<div class="detail-stat ${accent?'accent':''}"><small>${t(label)}</small><strong>${value}</strong></div>`;
const pair=(label,value)=>`<div class="key-value"><span>${t(label)}</span><strong>${value}</strong></div>`;
function renderDetail(name){
 const r=repo(name);
 if(!r){main.innerHTML=`<a class="detail-back" href="#">← ${t('back')}</a>`+emptyState('noMatch','noMatchBody');return;}
 const slots=weekSlots(),week=slots[selectedWeek].week,row=week&&week.rows.find(w=>w.full_name.toLowerCase()===r.full_name.toLowerCase()),s=row||r,all=allStats(r.full_name);
 const highlights=localized(r.editorial&&r.editorial.highlights)||[t('genericHighlight')],audience=localized(r.editorial&&r.editorial.audience)||t('genericAudience');
 const evidence=r.relevance?r.relevance.evidence.map(e=>`<span>${esc(t(e))}</span>`).join(''):'';
 const history=slots.slice().reverse().map(slot=>{const p=slot.week&&slot.week.rows.find(w=>w.full_name.toLowerCase()===r.full_name.toLowerCase());return`<div class="trend-row"><div class="trend-label">${slot.start.slice(5).replace('-','.')}<small>${p?'#'+p.rank+(slot.week.source_kind==='backfill'?' *':''):t('missing')}</small></div><div class="trend-track"><div class="trend-fill" style="width:${p?p.heat_score:0}%"></div></div><span class="trend-value">${p?fmt(p.heat_score):'—'}</span></div>`;}).join('');
 main.innerHTML=`<a class="detail-back" href="#">← ${t('back')}</a>${notice()}<article><div class="detail-hero"><div class="source-label">${t(row?'historicalData':'currentData')}${row?' · '+esc(week.week):''}</div><div class="detail-title-row">${icon(r.full_name)}<div><h1>${esc(r.name||repoName(r.full_name))}</h1><p>${esc(r.full_name)}</p></div></div><p class="detail-description">${esc(description(r))}</p><div class="detail-actions">${!demo?`<a class="primary-button" href="https://github.com/${esc(r.full_name)}" target="_blank" rel="noopener noreferrer">${t('github')} ↗</a>`:`<span class="period-chip">${t('sampleRepo')}</span>`}<span class="period-chip">${esc(r.language||t('unknown'))}</span></div><div class="detail-stats">${stat('heat',row?fmt(row.heat_score):'—',true)}${stat('stars',fmt(s.stars))}${stat('starGrowth',row?signed(row.stars_delta):'—',true)}${stat('forks',fmt(s.forks))}${stat('forkGrowth',row?signed(row.forks_delta):'—',true)}</div></div><div class="detail-grid"><div><section class="panel"><div class="section-heading"><h2>${t('history')}</h2><span class="subtle">${t('historySub')}</span></div><div class="trend">${history}</div>${data.weeks.some(w=>w.source_kind==='backfill')?`<p class="small-note">${t('historySourceNote')}</p>`:''}<p class="small-note">${t('periodNote')}</p></section><section class="panel"><h2>${t('why')}</h2><ul>${highlights.map(h=>`<li>${esc(h)}</li>`).join('')}</ul><h2 style="margin-top:25px">${t('audience')}</h2><p>${esc(audience)}</p></section>${r.description?`<section class="panel raw-description"><h2>${t('repoDescription')}</h2><p>${esc(r.description)}</p><small class="subtle">${t('original')}</small></section>`:''}</div><aside><section class="panel"><h2>${t('alltime')}</h2>${pair('alltimeRank',all?'#'+all.current_rank:'—')}${pair('totalHeat',all?fmt(all.total_heat):'—')}${pair('appearances',all?fmt(all.weeks_ranked):'0')}${pair('bestRank',all?'#'+all.best_rank:'—')}${pair('streak',all?all.current_streak+' '+t('weeks'):'—')}</section><section class="panel"><h2>${t('evidence')}</h2><div class="evidence-list">${evidence}${r.manual?`<span>${t('manual')}</span>`:''}</div><p class="small-note">${t('relevance')} ${r.relevance?fmt(r.relevance.score):'—'}/100</p></section><section class="panel"><h2>${t('scoreParts')}</h2>${pair('methodStars','60%'+(row?' · '+row.components.stars.toFixed(1):''))}${pair('methodForks','15%'+(row?' · '+row.components.forks.toFixed(1):''))}${pair('methodActivity','15%'+(row?' · '+row.components.activity.toFixed(1):''))}${pair('methodSize','10%'+(row?' · '+row.components.size.toFixed(1):''))}<p class="small-note">${t('componentsNote')}</p></section></aside></div><p class="source-time">${t('snapshot')}: ${dateTime(row&&row.totals_as_of||r.last_updated)}</p>${row&&row.source_kind!=='backfill'?`<p class="source-time">${t('observed')}: ${dateTime(row.observed_from)} → ${dateTime(row.observed_to)}</p>`:''}${row&&row.activity_capped?`<p class="small-note">${t('activityCapped')}</p>`:''}</article>`;
 document.title=(r.name||repoName(r.full_name))+' — GitHub Skills Weekly';
}
function footer(){document.getElementById('footer').innerHTML=`<div><strong>Skills Weekly</strong><p>${t('source')} · ${t('updated')}: ${dateTime(data&&data.updated_at)}</p><p>${t('freshness')}</p></div><div class="footer-right"><p>${t('privacy')}</p><p>© 2026 <a href="https://github.com/xylopyrifer" target="_blank" rel="noopener noreferrer">若蘅 Xylopyrifer</a> · <a href="./LICENSE" target="_blank" rel="noopener">MIT</a></p><p>${t('attribution')}</p>${!demo&&data&&data.weeks.length?`<button type="button" class="text-button" data-action="demo">${t('sample')}</button>`:''}</div>`;}
function render(){
 document.documentElement.lang=language==='zh'?'zh-CN':'en';document.getElementById('method-button').textContent=t('method');document.querySelectorAll('[data-lang]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.lang===language)));
 if(!data)return;
 let name='';try{name=location.hash.startsWith('#skill/')?decodeURIComponent(location.hash.slice(7)):'';}catch(_){name='!invalid';}
 if(name)renderDetail(name);else renderHome();footer();
}
function openMethod(trigger){
 modalTrigger=trigger;modal.innerHTML=`<section class="modal-box" role="dialog" aria-modal="true" aria-labelledby="method-title"><div class="modal-top"><span>THE METHODOLOGY / V1</span><button class="close-button" type="button" data-action="close" aria-label="${t('close')}">×</button></div><h2 id="method-title">${t('methodTitle')}</h2><p>${t('methodIntro')}</p><div class="weight-grid">${[['60%','methodStars'],['15%','methodForks'],['15%','methodActivity'],['10%','methodSize']].map(([n,k])=>`<div><strong>${n}</strong><span>${t(k)}</span></div>`).join('')}</div><p>${t('methodNormalize')}</p><p>${t('methodActivityBody')}</p><h3>${t('selectedPeriod')}</h3><p>${t('methodTime')}</p><h3>${t('alltime')}</h3><p>${t('methodAlltime')}</p><h3>${t('backfillDetails')}</h3><p>${t('backfillMethod')}</p><p>${t('methodDisclaimer')}</p></section>`;
 modal.hidden=false;document.body.style.overflow='hidden';modal.querySelector('button').focus();
}
function closeMethod(){modal.hidden=true;document.body.style.overflow='';if(modalTrigger&&modalTrigger.isConnected)modalTrigger.focus();}
async function switchDemo(){try{const response=await fetch(new URL('./demo.json',import.meta.url));if(!response.ok)throw new Error();const sample=await response.json();if(!sample.demo)throw new Error();data=sample;demo=true;selectedWeek=0;location.hash='';render();window.scrollTo(0,0);}catch(_){main.innerHTML=emptyState('loadError','loadErrorBody','retry');}}
async function load(){try{const response=await fetch(new URL('./data.json',import.meta.url),{cache:'no-cache'});if(!response.ok)throw new Error();const result=await response.json();if(result.demo||!Array.isArray(result.repositories)||!Array.isArray(result.weeks)||!Array.isArray(result.all_time))throw new Error();liveData=result;data=result;demo=false;render();}catch(_){main.innerHTML=emptyState('loadError','loadErrorBody','retry');footer();}}
document.addEventListener('click',e=>{
 const lang=e.target.closest('[data-lang]');if(lang){language=lang.dataset.lang;try{localStorage.setItem('skills-language',language);}catch(_){}render();return;}
 const tab=e.target.closest('[data-week]');if(tab){selectedWeek=Number(tab.dataset.week);render();document.getElementById('week-tab-'+selectedWeek).focus();return;}
 const b=e.target.closest('[data-action]');if(b){if(b.dataset.action==='demo')switchDemo();if(b.dataset.action==='live'){demo=false;data=liveData;selectedWeek=0;location.hash='';render();}if(b.dataset.action==='retry')load();if(b.dataset.action==='close')closeMethod();}
 if(e.target===modal)closeMethod();
});
document.addEventListener('keydown',e=>{if(!modal.hidden){if(e.key==='Escape')closeMethod();if(e.key==='Tab'){e.preventDefault();modal.querySelector('button').focus();}return;}if(e.target.matches('[role=tab]')&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();selectedWeek=e.key==='Home'?0:e.key==='End'?4:(selectedWeek+(e.key==='ArrowRight'?1:4))%5;render();document.getElementById('week-tab-'+selectedWeek).focus();}});
document.getElementById('method-button').addEventListener('click',e=>openMethod(e.currentTarget));
window.addEventListener('hashchange',()=>{render();window.scrollTo(0,0);main.focus();});
render();load();
