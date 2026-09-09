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
- GitHub Pages 和 Actions 的远端结果，以实际发布记录为准；本地 build 不能代替远端部署成功。
- 现有个人浏览器连接器在建立会话前退出，报 `trusted Node process exited unexpectedly`。本地网站验收使用独立测试浏览器，不代表已连接用户登录的 GitHub 会话。

## 小红书

用户已取消小红书交付要求。本项目是可联网的普通网页，不输出小红书合规声明。原下载 skill 位于被 Git 忽略的 `.codex/`，不进入网站产物、源码包或仓库。
