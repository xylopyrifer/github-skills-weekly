# 验收记录

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
