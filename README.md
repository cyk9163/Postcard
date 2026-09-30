# 漫邮 · Postcard

把旅行变成可收藏、可分享的明信片。面向 iPhone Safari / 主屏幕 PWA，电脑也可浏览和手动记录。

## 版本与入口

- 正式内测网址：https://manyou-melbourne.pages.dev/
- 代码版本：**0.6.2**。已发布 196 个景点的新主背景，以及各 196 张夜晚和雨天背景；旧版卡面和历史收藏保留。
- 已包含完整素材下载、城市足迹、简化地图、按旅人整理的信箱和场景主题选择。历史发布记录见 RELEASE 文档。
- 真实 iPhone / 多人测试结果尚待反馈，不能以自动测试通过代替验收。

## 本地制作与验证工具

素材审核台已覆盖 588 张卡；独立空数据库恢复演练通过；整理了 8 城 13 个后续候选。使用方法见 [本地工具说明](OPERATIONS_IMPROVEMENTS.zh-CN.md)。这些工具不进入线上网页。

## 当前功能范围

- 100 个城市、196 个地点、588 张地点卡面；每个地点三类背景。部分卡面仍待美术定稿。
- 登录、注册、恢复码；各账号独立记录，跨设备需完成云同步。
- 游客仅当前页面体验，刷新或退出即清空，不能持久保存、导出或寄信。历史版本留下的游客数据不自动上传。
- 离线简绘世界地图地点图钉、手动到访记录；iPhone 主动定位，电脑不显示定位到访按钮。
- 制作、编辑、收藏、导出明信片；六位人物、两只宠物、基础与积分动作、自定义透明角色导入。
- 人物按卡面锚点合影；水面、俯视或特写背景可限定为纯风景。已有卡片保留保存时的构图。
- 宠物按区域出游、倒计时和归来领取；宠物卡不增加本人足迹。
- 好友与自愿随机站内慢信、文件寄送与回信；前台散步与探索奖励。
- 首次进入完整下载所有素材、暂停续传与自动补全；离线编辑、恢复联网后同步。
- 多设备逐条解决同步冲突、处理前备份、导出与合并恢复记录。
- 新手三步体验、小屋首页；预览版增加反馈预览、复制与用户主动分享；地图按需初始化、收藏按可见范围绘制，并优化窄屏阅读。成就 / 足迹页增加城市分类与到访进度。

## 运行与数据

网页及账号接口使用现有 Cloudflare Pages + D1 配置，本轮没有新增收费服务。基础网页不依赖开发电脑在线。

专属角色任务由用户主动提交后交给本机 RTX 5080 处理，依赖制作电脑和工作端在线；不承诺全天可用，未接付费生图 API。已制作的背景随代码包含在 `app/public`；生成模型和原始制作文件不随仓库分发。

本机保存不等于云同步成功。换设备前检查同步状态；重要记录仍建议导出备份。Safari 与主屏幕入口可能使用不同的本地空间。备份含私人记录，请勿作为普通问题反馈直接转发。

## 本地开发

先安装 Git、Node.js 24 和 pnpm 10，然后：

```sh
git clone https://github.com/cyk9163/Postcard.git
cd Postcard/app
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm dev
```

打开终端显示的本地地址可体验游客界面。需要本地注册、登录与同步接口时，停止 Vite，使用刚构建好的完整版本：

```sh
pnpm exec wrangler d1 migrations apply manyou-data --local
pnpm exec wrangler pages dev dist
```

上述数据库命令只操作本地数据库。生产部署需要单独的 Cloudflare 权限；不要在日常开发中执行远程数据库迁移。`app/wrangler.jsonc` 保留现有项目的公开资源标识，但不含授权凭据。

## 朋友协作

仓库所有者需在 GitHub 仓库的 Settings → Collaborators 添加朋友的 GitHub 账号，朋友接受邀请后才能直接推送。开发时建议每个功能单独开分支：

```sh
git switch main
git pull --ff-only
git switch -c feature/my-change
# 修改代码，运行测试和构建
git add .
git commit -m "Describe the change"
git push -u origin feature/my-change
```

然后在 GitHub 创建 Pull Request，审核后合并。提交到 GitHub 本身不代表已经发布到正式网站。

仓库包含前后端、测试、数据库迁移、内容配置和网页所需素材（约 450 MB，首次克隆需要一些时间）。不包含账号数据库、恢复码、密钥、本地模型、依赖缓存、临时文件、历史发布包或生图原始工作目录。`tools` 中的素材生产工具可能依赖未分发的 `production`／`output` 文件和本机路径；日常网页开发及构建不需要这些工具。

## 开发补充

使用 Node.js 24，在 `app` 安装锁文件对应依赖，然后运行 `pnpm test`、`pnpm build`、`pnpm dev`。Vite 仅提供静态页面，完整账号接口需使用 Wrangler 本地 D1 和 Pages 开发环境。不要把真实生产账户或数据库导入测试。

为避免覆盖既有发布产物，可从 `app` 运行：

```powershell
pnpm exec tsc --noEmit
pnpm exec vite build --outDir ../tmp/preview-060-release
node ../tools/build-manifest.mjs ../tmp/preview-060-release
node ../tools/build-worker.mjs ../tmp/preview-060-release
```

本地美术对照页：启动开发服务后打开 `/layout-review.html`，切换动作与调整前后。该页不进入发布包。预览构建不等于已部署；未经核对不要把 `tmp`、模型、备份或原始参考照片整体上传。

## 当前说明与历史资料

| 文档 | 用途 |
|---|---|
| PREVIEW_0.6.0.zh-CN.md | 本轮改动、验证与未发布边界 |
| CURATED_LAYOUTS.zh-CN.md | 构图审核范围 |
| ONBOARDING.zh-CN.md | 新手体验规则 |
| CITY_OFFLINE.zh-CN.md | 单城离线机制 |
| SYNC_RELIABILITY.zh-CN.md / RECORD_CONFLICTS.zh-CN.md | 云同步与冲突处理 |
| IPHONE_TEST.zh-CN.md / TEST_RESULTS.zh-CN.md | 真机测试步骤与实际结果 |
| output/pdf/漫邮_朋友内测操作手册_详细版.pdf | 可直接转发朋友的 14 页说明，基于 0.5.10 |
| content/production-policy.json | 当前图片制作范围 |

早期 PROJECT_PLAN、FREE_MVP_PIPELINE、v0.1–v0.4 更新及 IMPLEMENTATION_STATUS 中的历史功能数量、账号和游客规则不代表当前状态。它们保留用于回溯。

素材出处见网页 `/content-sources.json`。构图审核不等于建筑准确性、地理范围和素材许可全部最终验收。


