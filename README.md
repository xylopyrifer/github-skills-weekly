# GitHub Skills Weekly

[在线访问](https://xylopyrifer.github.io/github-skills-weekly/) · [GitHub 仓库](https://github.com/xylopyrifer/github-skills-weekly)

中英文 AI Agent Skills 周榜。静态网页 + GitHub REST API 采集 + JSON 历史 + GitHub Actions；零生产依赖、无需数据库，可部署到 GitHub Pages、Nginx 或任何静态托管。

**作者：若蘅 Xylopyrifer · MIT License**。使用、修改、分发和商用时须保留版权及许可声明。被收录的第三方仓库仍遵循各自许可证。

## 现在可以做什么

- 中文 / English 即时切换并记住偏好。
- 最近 5 个日历周 Tab、Weekly TOP 10、All-Time TOP 3。
- 项目详情、Star/Fork 总量和周增长、评分构成、5 周历史、GitHub 外链。
- 自动发现与人工 include/exclude 项目池。
- API 超时、重试、限流、单仓库故障隔离和更新状态提示。
- 每周一自动采集并发布；支持手动运行。
- 独立演示模式：所有 `demo/*` 项目和数字都是虚构样例，只有用户点击后才载入，不进入真实统计。

**没有伪造历史数据。** 首次抓取只有真实仓库元数据。只有相邻两个周一都采到数据的仓库才有周增长和热度。初始网页显示项目池和“建立基线”，而不是伪造 TOP 10 / TOP 3。首次采集在 2026-09-09（周三），若 9 月 14 日和 21 日定时采集成功，第一份完整真实周榜将于 **9 月 21 日** 发布。

## 本地运行

要求 Node.js 22 或更新版本，内置 npm 即可。

```sh
npm install
npm run dev
```

打开终端输出的地址，默认 `http://127.0.0.1:4173`。修改源文件后自动重新构建，刷新网页查看；不会安装庞大的前端依赖。

```sh
npm test                 # 核心算法、发现、API、管线测试
npm run build            # 输出 dist/
npm run preview          # 预览生产产物
npm run package          # release/github-skills-weekly-web.zip
npm run update           # 实际采集公共仓库
npm run update -- --no-discovery  # 只更新已跟踪和手工指定项目
```

不要双击 HTML；ES 模块和 JSON 需要通过 HTTP 服务加载。

本地无 Token 可访问公开 API，但共享的未认证额度很小。需要时复制 `.env.example` 为 `.env`，填入自己的 Token（不要提交），运行：

```sh
node --env-file=.env scripts/update.mjs
```

GitHub Actions 自动提供 `GITHUB_TOKEN`，不需要购买服务或在前端设置 Token。脚本不会把 Token 放进 URL、日志或浏览器产物。私有仓库不在本项目收录范围。

## 发布到 GitHub Pages

推荐仓库名 `github-skills-weekly`，默认分支 `main`，公开仓库。首次发布步骤：

1. 将本项目源码上传/推送到自己的 GitHub 仓库（包括 `.github/workflows`、`data`，不含 `.codex`、`.env`、`node_modules` 和 `release`）。
2. 仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
3. 仓库 **Actions → Publish website to GitHub Pages → Run workflow**。
4. 成功后 Pages / workflow 会给出网站网址。若使用建议仓库名，预期地址为 `https://xylopyrifer.github.io/github-skills-weekly/`，必须等部署成功才能访问。
5. 检查 **Settings → Actions → General → Workflow permissions** 允许工作流写入仓库。组织策略或分支保护阻止机器人推送时，应针对这个仓库配置允许的数据更新方式。

后续 `main` 的普通推送触发 `deploy.yml`。`weekly.yml` 每周一 **00:17 UTC / 北京时间 08:17** 自动更新数据、提交并在同一工作流内部署。不能仅依靠机器人 push 再触发另一个工作流：GitHub 的 `GITHUB_TOKEN` 提交通常不会触发新的 push 工作流。

`weekly.yml` 也支持手动 **Run workflow**。周一窗口外手动运行只更新仓库目录，不把不满一周的增长冒充周榜。即使没有启用 Pages，采集仍可运行，并输出可下载的网站 artifact。

两个发布工作流共用并发锁，不会互相取消。数据写回只在 `git diff --staged` 检测到变更后提交；每次成功观察产生的新采样时间属于数据变化。工作流只暂存 `data/`。

## 部署到小型服务器

静态方案：`npm run build` 后将 **dist 目录内的内容** 放到站点根目录即可。详情采用 hash 路由，无需后端路由重写，也适用于 GitHub 项目子路径。

Docker 方案：

```sh
docker build -t skills-weekly .
docker run -d --name skills-weekly -p 8080:80 --restart unless-stopped skills-weekly
```

访问服务器的 8080 端口；正式环境可由已有反向代理提供 HTTPS。Docker 镜像是静态快照，每周须重新构建/部署，或挂载更新后的 `dist` 到 `/usr/share/nginx/html:ro`。

服务器独立更新：使用系统调度器在 **UTC 周一 00:17** 执行 `npm run update && npm run build`，并让 Nginx 指向该目录，或将新的 dist 原子替换到站点目录。Token 由服务端环境变量提供。不要同时让服务器和 Actions 修改同一份数据目录；选择一个采集源即可。

## 时间、缺失与数据模型

统一使用 **UTC 自然周 [周一 00:00, 下一周一 00:00)**。展示日期为周一至周日。GitHub 当前总量无法还原任意过去时刻，因此增长是相邻周一的**实际采样差值**，不是精确午夜事件总量。

- 每个仓库分别记录 `observed_at`；详情展示 `observed_from` / `observed_to`。
- 允许周一 00:00–06:00 UTC 内的定时偏移；相邻观察需相隔 162–174 小时。错过窗口的运行不补造边界。
- 首次收录、上周采集失败、跨周中断、活跃度请求失败：该仓库不参加当周热度排名。
- 同一边界重跑保留已经采到的计数，补充失败的仓库或活跃度；不会让重复运行重复累计 All-Time。
- 部分仓库失败时保留最近成功元数据并记录 warning；全部失败时失败退出，保留既有文件，Actions 不会发布空榜覆盖好数据。

| 文件 | 职责 |
| --- | --- |
| `data/catalog.json` | 当前真实仓库目录、语言、总量、采集时间、收录证据 |
| `data/boundaries/YYYY-MM-DD.json` | 每周一的计数与观测时刻；永久保存 |
| `data/weeks/YYYY-MM-DD.json` | 该 UTC 周全部可比较仓库的归一化、热度和排名；永久保存 |
| `data/all-time.json` | 由全部周档案确定性重算的累计分、周得分、上榜次数、连榜和最佳排名 |
| `data/update-report.json` | 最近采集状态和警告 |
| `dist/assets/data.json` | 浏览器数据：仅最近 5 个日历周 + 精简 All-Time + 仓库目录 |
| `dist/assets/demo.json` | 与生产数据分离的虚构样例 |

长期历史从不因前端裁剪而删除。All-Time 每次从所有周档案重算，避免重复计分，可连续保存多年。若最新成功周距当前时间较久，页面明确显示数据时间；超过 8 天没有采集会提示过期。

## Weekly Heat 算法（weekly-v1）

独立实现位于 `scripts/lib/scoring.mjs`。

```text
star_delta = current_stars - previous_stars
fork_delta = current_forks - previous_forks

positive(x) = max(0, x)
effective_forks = min(positive(fork_delta), max(20, 0.5 × positive(star_delta)))
star_anchor = max(100, P90(pool positive star deltas))
fork_anchor = max(20, P90(pool effective forks))
normalize(x, anchor) = min(100, 100 × ln(1 + positive(x)) / ln(1 + anchor))

stars_score = normalize(star_delta, star_anchor)
forks_score = normalize(effective_forks, fork_anchor)
activity_score = 70% × normalize(commits, 20) + 30% × min(active_days, 7) / 7 × 100
size_score = normalize(total_stars, 100000)

weekly_heat = 60% × stars_score + 15% × forks_score
            + 15% × activity_score + 10% × size_score
```

最终热度保留一位小数，范围 0–100。同分按 Star 增长降序、仓库全名升序，保证重算稳定。上期排名必须来自相邻周，不将很久以前的排名当成上周。无上期记录标 `NEW`；这表示首次出现在可比周榜，不一定是新建仓库。

绝对增长 + 最低参考量避免从 1 Star 涨到 2 Star 的 100% 相对增幅虚高；对数降低大型爆发项目的支配力；Star 总量只有 10% 权重。负增长仍展示原始负值，但评分最低为 0。异常 Fork 增长只限制计分，不改写原始数据。

活跃度只取默认分支最多 100 条提交的 committer 日期样本；每周 20 条提交已达到提交子分上限。极活跃仓库的活跃天数可能因样本截断被低估，详情会标注。P90 基于当周可比较池，分数适合周内排序，不代表跨周相同单位的绝对热度。

## All-Time Heat

每个有效周：

```text
rank_bonus = (11 - rank) / 50  if rank <= 10, otherwise 0
streak = 连续进入 TOP 10 的周数（缺周或未进入 TOP 10 会中断）
contribution = weekly_heat × (1 + rank_bonus) + min(streak, 12) × 0.5
total_heat = 所有历史 contribution 的总和
```

周热度已包含体量、增长和活跃度；TOP 10 位置和持续上榜再给予温和奖励。累计排名本身没有 100 分上限。`weeks_ranked` 只统计 TOP 10 次数，`best_rank` 取所有有效周的最佳位置。

## Skill Discovery 与人工维护

`config/repositories.json`：

- `include`：人工指定项目，允许绕过自动相关性门槛，但仍抓取证据；拒绝已归档、fork、disabled 或 private 仓库。
- `exclude`：大小写不敏感，优先于 include、自动发现与已有池；排除项不会显示。历史档案保留以供审计。
- 自动搜索覆盖 Agent Skills topics、Claude Code / Codex / Cursor + SKILL.md 的 README 查询，不把仓库名包含 skill 当条件。
- 先更新原有池，再发现新候选；每次最多检查 12 个新候选，自动池上限 100，人工 include 和已收录项目不会因上限被丢弃。
- 文件树截断时记录警告；相关性证据每 28 天重新检查。

相关性分数：

| 信号 | 加分 |
| --- | ---: |
| 文件树中存在真实 `SKILL.md` 路径 | 50 |
| `agent-skills` 等明确的技能 topic | 20 |
| 简介同时包含智能体上下文与 skill | 15 |
| README 同时包含智能体上下文与 skill | 15 |
| README 含 `SKILL.md` 与安装指引 | 10 |

满分封顶 100。自动项目需 **≥65 分且有 SKILL.md 或明确技能 topic**。这是可解释的规则发现，不执行第三方代码，也不能保证发现所有高质量项目；可通过 include/exclude 修正。

`config/editorial.json` 提供人工维护的中文/英文简介、亮点和适用人群。没有人工翻译的仓库保留 GitHub 原始简介并明确标注原文，不伪装为自动翻译；界面、状态、评分解释均有中英文。

## 工程结构与验证

- `index.html`：语义 HTML、SEO、Open Graph、favicon 和入口。
- `src/app.js`：首页、详情、周切换、语言、加载/错误/演示状态、键盘操作。
- `src/i18n.js`：完整双语界面字典。
- `src/style.css`：响应式桌面/手机布局、焦点和减少动态效果支持。
- `scripts/lib/`：时间、评分、发现、API、存储、采集管线及隔离 demo。
- `scripts/build.mjs`：生成精简公开数据和可部署静态目录。
- `scripts/serve.mjs`：开发和预览服务。
- `scripts/package.mjs`：普通网站 ZIP，**不是小红书离线包**。
- `.github/workflows/`：每周更新、Pages 发布、PR 验证。
- `test/`：核心自动化测试（无生产依赖）。
- `Dockerfile` / `deploy/nginx.conf`：轻量服务器部署。

可选浏览器验收（需自备 Playwright 和 Chromium，或设置 `BROWSER_EXECUTABLE` 指向本机浏览器）：启动 `npm run dev` 后运行 `node scripts/browser-check.mjs`。若 Playwright 不在项目里，可用 `PLAYWRIGHT_MODULE` 指向其安装目录。该脚本使用临时、未登录的独立浏览器，不连接个人浏览器会话。结果和截图写入 `release/qa/`。

已验证结果见 `docs/VALIDATION.md`。不是所有运行环境都一样：GitHub Actions 实际远端部署结果须以账号里的运行记录为准，Docker 与真实 iOS/Android 设备未实测。项目不再遵循小红书离线包约束。

## 参考

- [GitHub REST rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)
- [GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GITHUB_TOKEN 触发限制](https://docs.github.com/en/actions/concepts/security/github_token)
- [定时任务事件和延迟](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
- [MIT License](https://choosealicense.com/licenses/mit/)
