# 验收记录

## 新榜采集恢复验证（2026-11-07）

11 月 6–7 日采集在 50 项新榜容量校验处失败。已核对 [11 月 7 日运行日志](https://github.com/xylopyrifer/github-skills-weekly/actions/runs/42347016894)：元数据采集成功，新榜没有新增发现，但仓库改名后旧键未移除，候选数超限。当前两处规范名称变化为 wesammustafa/Claude-Code-Everything-You-Need-to-Know → wesammustafa/Claude-Code-Quest、NVIDIA/nvcf → dsx-ai-factory/nvcf。

- 修复规范名称替换，并保留最早首次收录日期与旧 seen 别名；不提高 50 项上限。
- 新增 4 项回归：满池改名、规范名碰撞、已收录身份不重复入新榜、检查失败保留旧记录。
- 本机 49 项测试、构建、既有存储数据校验通过；修复本身不修改 data/ 或历史周榜。
- [Node.js 22/24 CI](https://github.com/xylopyrifer/github-skills-weekly/actions/runs/42383592660) 在 ubuntu-24.04 实际通过。
- [恢复采集与发布](https://github.com/xylopyrifer/github-skills-weekly/actions/runs/42384052778) 成功：数据更新至 2026-11-07 14:58 UTC，97 个来源成功，3 个既有不可访问来源保留旧数据；新榜去重后补入 1 个项目，保留 50 条候选，0 警告。
- 最终数据提交 2f36ba3a22589412f96c86f85010e10d855cfd95 再次通过 49 项测试和 --fresh 校验；已结算周榜、累计得分和边界快照无改动。线上 JSON 与本机构建 SHA-256 完全一致，三套线上浏览器回归通过。
- [云巡检](https://github.com/xylopyrifer/github-skills-weekly/actions/runs/42384422458) 实际返回 valid=true、fresh=true、warnings=0、liveMatches=true，无需再次恢复。

## 内容与 Actions 兼容性验收（2026-11-07）

基线：64e1826049f2e51f73574797d407608d0b3957b2（2026-11-05 采集提交）。本机 Windows、Node.js 24.15.0、独立 Chrome/Playwright。此前验收记录见后文，不能视为本轮远端验证。

- npm ci 成功；生产依赖仍为 0。
- npm run check 成功：45 项测试全部通过，并构建 192 个公开项目、最近 5 周数据。
- node scripts/validate-data.mjs 成功：100 个追踪仓库、13 个已结算周、96 个本周行、50 个当周新榜候选，采集警告为 0。该检查验证既有数据一致性，不代表本轮重新采集或通过 --fresh 检查。
- data/ 全目录相对基线无改动；历史评分、累计排名和原始采样未重写。人工标签修订每次构建生效，保持社区票数独立。
- scripts/browser-editorial-check.mjs 通过：弃用提示、中英切换、后继链接、原仓库身份与历史、刷新及前进后退、视觉设计/金融分析筛选、320px 布局、非法后继标识拒绝，无运行时错误。
- scripts/browser-check.mjs 与 scripts/browser-newcomers-check.mjs 通过：常规首页/详情、5 周切换、演示、键盘与弹窗、错误恢复、禁用存储降级、新榜及多尺寸布局。
- 五个工作流 YAML 解析通过；逐项核对官方 Action release manifests、配置 inputs、Node 24 运行时及 Pages 上传步骤的组合依赖；均固定 ubuntu-24.04。静态检查不等于实际 Actions 运行。
- git diff --check 通过。回归输出与截图保存在 release/qa/，不进入仓库。

上述本地验收未覆盖远端 Actions、实际 Ubuntu runner、Node.js 22 本机测试、全量重新采集或第三方技能执行。CI 的 Node.js 22/24 矩阵与实际 Pages 发布须在推送后单独核验。

## 初始验收

日期：2026-09-09。平台：Windows，Node.js 24.15.0；CI 目标 Node.js 22。

## 已实际执行

- `npm install` 成功；生产依赖为 0。
- `npm run build` 成功，生成标准静态网站 `dist/`。
- `npm test`：18 项全部通过，覆盖归一化、异常 fork、负增长、UTC 跨年、发现证据、完整周边界、首次 baseline、单仓库失败恢复、API 重试/限流、重复运行幂等、exclude 和长期历史。
- `npm run update -- --no-discovery`：6 个真实仓库成功。
- `npm run update`：16 个真实仓库成功，0 warnings。
- 本地 HTTP 入口返回 200。
- 独立 Edge / Playwright 浏览器验收：真实数据首页、详情、GitHub 链接结构、刷新深链接、中英文偏好持久化、演示 TOP 3 / TOP 10、5 周切换、键盘切换、评分弹窗关闭与焦点恢复、错误重试、存储禁用降级，全部通过，无浏览器运行时异常。
- 320、375、390、768 像素宽度下，首页和详情均无横向溢出。
- 独立演示数据只按显式按钮加载，生产数据默认 `demo:false`，没有真实历史伪造。

截图与浏览器检查输出：`release/qa/`（不进入 Git 仓库）。

## 必须区分的未实测项

- 浏览器窗口宽度模拟通过，不等于真机 Android / iOS WebView 实测。
- 18 项测试中的历史周数据是隔离测试 fixture，不是公开历史数据。
- Docker 配置已提供，但本机没有执行 Docker 容器验收。
- GitHub Pages 与完整云端更新已通过实际验收，见下方记录；未来每周运行仍需以 Actions 记录为准。
- 现有个人浏览器连接器在建立会话前退出，报 `trusted Node process exited unexpectedly`。本地网站验收使用独立测试浏览器，不代表已连接用户登录的 GitHub 会话。

## 小红书

用户已取消小红书交付要求。本项目是可联网的普通网页，不输出小红书合规声明。原下载 skill 位于被 Git 忽略的 `.codex/`，不进入网站产物、源码包或仓库。

## 远端发布验收（已完成）

- 网站：https://xylopyrifer.github.io/github-skills-weekly/
- 仓库：https://github.com/xylopyrifer/github-skills-weekly
- 首次发布：[34303290420](https://github.com/xylopyrifer/github-skills-weekly/actions/runs/34303290420)，build/deploy 均成功。
- 完整更新：[34303321376](https://github.com/xylopyrifer/github-skills-weekly/actions/runs/34303321376)，采集、提交数据、构建和 Pages 部署均成功。
- 云端更新结果：25 个真实仓库，0 warnings；仍为真实 baseline，没有伪造周榜。
- 正式域名首页 HTTP 200，data.json 可读取，demo=false。
- 对正式 GitHub Pages 子路径执行相同的独立浏览器验收，全部通过，无运行时异常。
- GitHub 已识别许可证为 MIT，默认分支 main，仓库主页链接已设置。

## 五周官方历史回溯验收（2026-09-09）

- 成功回溯 2026-W32 至 W36（8 月 3 日至 9 月 6 日），5 周可比较仓库数分别为 23、24、24、25、25，每周可显示完整 TOP 10。
- Star 来自 GitHub 官方聚合历史接口；未采用被标为 degraded 的第三方事件数据。
- `data/backfill/2026-09-07.json` 保存 25 个仓库的真实来源记录。没有创建伪造的历史 boundary 快照。
- `npm test`：23 项全部通过，包括周日桶重组、缺失日桶拒绝、源总和核对、UTC 偏移拒绝、创建前数据及正式/回溯累计隔离。
- 本地独立 Edge 验收通过：5 个真实周 TOP 10、回溯说明、独立累计、双语、详情、手机布局、错误恢复，无运行时异常。
- 前端公开 JSON 约 85 KB；完整审计档案不加载到浏览器。
- 精度限制：Star 日界限不保证 UTC；Fork 仅含仍存在的分支；总量与体量分取采集时值。页面及 README 已明确标注。

## 连续周榜验收（2026-09-18）

- 9 月 7—13 日补齐 100 个项目，原始来源保存在 `data/backfill/2026-09-14.json`，采集告警为 0；原有五周记录保持不变。
- 所有六周统一计入累计分数，9 月 7 日榜单与 8 月 31 日比较排名变化。后续采集周延续相同累计与排名逻辑，来源元数据保留在存储中。
- `npm test`：36 项通过；持久化数据校验通过，覆盖六周的分数、排名变化、累计值与数据完整性。
- 独立 Edge 检查通过：9 月 7 日 TOP 10、双语统一展示、详情、手机布局、日历空缺状态、键盘交互、错误恢复，无浏览器运行时异常。
- 首页展示最近五个完整日历周；历史总计六周。公开数据约 231 KB，完整来源审计档案保留在仓库中。

## 本周动态榜单验收（2026-09-18）

- Latest week 显示 9 月 14 日开始的本周，状态为进行中，并显示最近采集截止时间；前一栏为 9 月 7 日完整周榜。
- 本次采集 100 个项目，无告警；66 个项目具备本周一基线并进入本周计算。缺少基线的项目不伪造增长。
- 本周文件每天覆盖；完整六周记录保持不变。本周分数在周一成功结算后计入累计一次。
- 37 项测试通过，覆盖周日进行中、周一结算、重复更新不重复累计、日历跨周及空缺状态。存储校验通过，核对本周原始计数、基线差值、排名、分数和采集时间。
- Edge 检查通过：本周 TOP 10、统计截止时间、中英文、手机布局、上一周、详情、键盘和错误恢复。

## 本周新 Skill 榜（2026-09-27）

- 新榜按本周首次收录筛选，并按当前 Stars、Forks、仓库名称稳定排序，公开 TOP 10。首次收录日期不等同于仓库创建时间。
- `scripts/newcomers.mjs` 独立发现候选，主追踪池满额不影响新榜。每次最多检查 30 个新候选、本周最多保存 50 个项目；此前四周各保留 TOP 10，长期保存首次收录索引。
- 每日云端采集先刷新主榜，再刷新新榜；校验覆盖首次收录日期、周归属、唯一性、排序、保留上限及采集新鲜度。候选目录截断时跳过；网络错误保存旧数据并由云检查补跑。
- 首轮收录 24 个项目，1 个候选因目录截断跳过，无网络告警。39 项测试通过，包含主池满额继续发现、跨周去重、每日刷新和保留上限。
- 浏览器验证通过：10 个新榜卡片，中英文、320/375/768 像素宽度、详情、标签提交入口，无运行时异常。新项目进入现有功能搜索和社区标签流程。
