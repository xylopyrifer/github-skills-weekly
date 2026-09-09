import { weeklyRanking, aggregateAllTime } from './scoring.mjs';
import { isoWeek, DAY } from './calendar.mjs';
// Intentionally fictional projects, separate from production data.
export function demoData() {
  const names=['flowcraft','context-kit','review-pilot','design-lens','docsmith','test-forge','research-map','release-mate','data-scout','terminal-garden'];
  const zh=['组织规划、执行与检查的多步骤工作流。','让智能体快速理解项目上下文。','把代码审查要点变成可复用技能。','将界面设计规范用于开发流程。','为技术文档建立清晰的写作结构。','让测试设计成为开发流程的一部分。','组织研究任务、来源与结论。','简化版本发布前的检查流程。','为数据探索任务提供分析指引。','将常见命令行任务组织成技能。'];
  const en=['Multi-step workflows for planning, execution, and verification.','Help agents understand a project’s context.','Reusable skills for structured code review.','Bring interface design guidance into development.','Clear writing structures for technical documentation.','Make test design part of the development process.','Organize research tasks, sources, and findings.','Simplify the checks before a version release.','Analysis guidance for data exploration tasks.','Common terminal workflows organized into skills.'];
  const repositories=names.map((name,i)=>({ full_name:'demo/'+name,owner:'demo',name,url:null,description:'Fictional demo project / 虚构演示项目',language:['TypeScript','Python','Shell','JavaScript','Markdown'][i%5],stars:2000+i*3100,forks:100+i*150,last_updated:'2026-09-07T00:17:00Z',manual:false,relevance:{score:90,evidence:['skill-file','readme','install-guide']},editorial:{description:{zh:zh[i],en:en[i]},highlights:{zh:[zh[i],'仅用于展示交互，不是实际项目。'],en:[en[i],'An interface example, not a real project.']},audience:{zh:'体验周榜功能的访客',en:'Visitors exploring the ranking interface'}}}));
  const weeks=[];
  for(let w=0;w<5;w++){
    const start=new Date(Date.UTC(2026,7,3)+w*7*DAY).toISOString().slice(0,10),end=new Date(Date.UTC(2026,7,10)+w*7*DAY).toISOString().slice(0,10);
    const rows=repositories.map((r,i)=>({full_name:r.full_name,stars:r.stars+(w+1)*700,forks:r.forks+w*90,stars_delta:Math.round(180+((i*37+w*23)%101)*40),forks_delta:20+((i*13+w*17)%81),activity:25+((i*11+w*7)%70),observed_from:start+'T00:17:00Z',observed_to:end+'T00:17:00Z'}));
    const ranked=weeklyRanking(rows,weeks.at(-1)?.rows||[]);
    weeks.push({schema_version:1,week:isoWeek(start),start,end,timezone:'UTC',algorithm:'weekly-v1',anchors:ranked.anchors,rows:ranked.rows});
  }
  return{schema_version:1,demo:true,updated_at:'2026-09-07T00:17:00Z',total_weeks:5,repositories,weeks:weeks.reverse(),all_time:aggregateAllTime(weeks),warning_count:0};
}
