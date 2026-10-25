# ClownCode 长期路线图

本文件是项目的长期演进计划，CLAUDE.md 是宪章（规则），本文是日程（阶段、批次、出口标准）。两者冲突时以 CLAUDE.md 的铁律为准。

**北极星目标**：从一个"Claude Code 去遥测 fork"演进为内网自有的编码代理产品，满足四条可验证的标准——

1. 零外发可被机器验证（`verify:privacy` 覆盖全部已知外发宿主，产物扫描必过）；
2. 核心功能零回归（功能保护清单见 CLAUDE.md）；
3. **可扩展性**：新增一个工具/斜杠命令/子代理/传输格式，各只需一个新文件 + 一行注册，不碰核心代码；
4. **上游跟踪**：能以"周"为单位吸收 Claude Code 的新功能（阶段 2 的 seam 越干净，阶段 4 的移植越便宜——这是"先简洁架构"与"跟上上游"的统一之处）。

预估节奏按单人/小团队业余带宽给出，宁可拉长也不跳过门禁。

---

## 阶段 0：门禁先行（1~2 个工作日）

在动任何清理之前，先把安全网织好。此后每个阶段、每个批次都活在门禁之下。

- **0.1 补漏禁用清单**：`scripts/verify-no-phone-home.ts` 增加 `storage.googleapis.com`、`duckduckgo.com`、`api.tavily.com`、`api.exa.ai`、`s.jina.ai`、`api.bing.microsoft.com`、`www.mojeek.com`、`api.linkup.so`、`api.ydc-index.io`、`1.1.1.1`。注意：加完当前产物必然 FAIL（DDG 与 GCS 还在），必须与 0.2 在同一提交修掉。
- **0.2 封掉三个 P0 外发点**：
  - 原生安装器轮询：把 `utils/nativeInstaller` 纳入 `no-telemetry-plugin.ts` 桩清单（`updateLatest`/`installLatest` no-op），`openclaude update` 改为提示"请通过内部渠道更新"。
  - DuckDuckGo 兜底：`providers/duckduckgo.ts` 删除"always available"，WebSearch 无已配置源时工具保留但返回"未配置内网搜索源"（功能位不缺，只是不再默认出公网）。
  - WebFetch：保留（内网 URL 抓取有真实用途），预批准域名清单改为可配置的内网白名单，新增统一 kill-switch。
- **0.3 统一门禁**：新增 `verify:all` = `typecheck + hardening:check + build:verified`，此后每批次收尾必跑。
- **0.4 测试基线**：全量 `bun test` 记录通过/失败/跳过清单（提交到 docs 或直接作为后续 PR 的对照说明），后续每批清理对照此基线，不允许新增失败。

**出口标准**：`build:verified`（含新增禁用模式）通过；测试基线记录在案。

## 阶段 1：减法清理（2~4 周，四个独立批次）

删掉所有 Claude Code 内部尸体。每批一个或多个独立 commit，可随时暂停。红线：CLAUDE.md 的功能保护清单 + 保留清单（文末附录 A）。行号是 2026-10 基线，动手前核对。

- **1a 零耦合直删**：16 个 .js stub 命令目录（`ant-trace` `autofix-pr` `backfill-sessions` `break-cache` `bughunter` `ctx_viz` `debug-tool-call` `env` `good-claude` `issue` `mock-limits` `onboarding` `perf-issue` `reset-limits` `share` `summary`，同步删 `commands.ts` 的 import/数组项与 `BRIDGE_SAFE_COMMANDS` 里的 `summary`）；孤儿文件（`commands/benchmark.ts`、`constants/github-app.ts`、`components/Passes/`、`skills/bundled/claudeInChrome.ts`）；`components/grove/` + `interactiveHelpers.tsx` 引用块；营销命令 `thinkback*`、`stickers`；无引用依赖 `@anthropic-ai/bedrock-sdk`、`foundry-sdk`、`vertex-sdk`、`@growthbook/growthbook`；`release-please` 两文件；`src/moreright/`；`utils/env.ts` 的 `hasInternetAccess()`；`commands/insights.ts` 的 Google Fonts link；`python/smart_router.py` 公网 ping_url。
- **1b 营销/订阅件**：`components/FeedbackSurvey/` 整目录（含 `submitTranscriptShare.ts:88` 硬编码 POST `api.anthropic.com`，源码里最后一处真实外发端点；REPL.tsx 4 处 import + 3 处渲染）；LogoV2 营销件（`GuestPassesUpsell` `OverageCreditUpsell` `ChannelsNotice` `VoiceModeNotice` `DesktopUpsell`）；Chrome 扩展残留（`useChromeExtensionNotification`、`usePromptsFromClaudeInChrome`、`utils/claudeInChrome/`、`--chrome-native-host`）；voice 源码（flag 已关，`useVoice*`、`voiceStreamSTT`、settings `voiceEnabled` 键）。
- **1c 上游内部机制**：`src/buddy/` 桌宠（6 处耦合：commands/REPL/AppStateStore/attachments/config/messages + build.ts `BUDDY` flag）；`/fast` + `fastMode.ts` + settings 两键；`/advisor` + `utils/advisor.ts` + `advisorModel` 键；`/btw` `/heapdump` `/cache-probe` `/cache-stats`（后者带 2 个测试文件）；AWS/GCP auth 死路径（`utils/aws.ts`、`awsAuthStatusManager`、`AwsAuthStatusBox`、`auth.ts` 相关段、`google-auth-library` 依赖）；`INTERNAL_ONLY_COMMANDS` 与 `USER_TYPE === 'ant'` 分支机制本身；bridge/remote 过滤配套（`REMOTE_SAFE_COMMANDS`、`BRIDGE_SAFE_COMMANDS`，视 1c 进度保留 `/session` 或一并清理）。
- **1d 搜索架构收敛**：WebSearch 保留 provider 接口，删公网适配器（ddg/firecrawl/tavily/exa/jina/bing/mojeek/linkup/you）与 `duck-duck-scrape`、`@mendable/firecrawl-js` 依赖，为阶段 3.1 的内网源留好接口。

**每批出口标准**：`verify:all` 通过 + `bun test` 对照基线零新增失败。阶段总出口：src 文件数较基线（约 1992）下降 30% 上下，模块图可读。

## 阶段 2：架构收敛——简洁可扩展（4~8 周）

用户点名的基础。目标：把"加东西"的成本降到"一个目录 + 一行注册"，把构建魔法清零。

- **2.1 配置统一**：所有读写统一 `.openclaude/`（`~/.claude` 读兼容保留一个大版本，之后发迁移说明）：skills/agents/CLAUDE.md/cron/memory 目前仍读 `.claude/` 的点全部收拢（`loadSkillsDir`、`agents/types.ts` 的 `FOLDER_NAME`、`claudemd.ts`、`cronTasks.ts`、`AgentTool/agentMemory.ts`、备份目录）；settings schema 收敛为单一真相源；`.env.example`、README、init 模板同步。
- **2.2 feature flag 机制退役**：阶段 1 完成后逐个 flag 定生死——恒真的删条件留代码，恒假的整段删——最终删除 `build.ts` 的 `feature()` 字符串预处理，构建脚本变薄；运行时开关只保留本地 `feature-flags.json`（经 no-telemetry 桩）；`MACRO.VERSION='99.0.0'` 伪装 hack 随第一方版本守卫一起移除或文档化。
- **2.3 Provider 传输层重构**（核心工程，风险最高、回报最大）：把 1863 行的 `openaiShim.ts` 拆成——
  - `Transport` 接口：Anthropic 风格请求 → `AsyncIterable<AnthropicSSE 事件>`；
  - 适配器：`ChatCompletionsAdapter` / `ResponsesAdapter`（拆自 codexShim）/ `NativeAnthropicAdapter`；
  - 中间件管线：think-tag 剥离、工具参数规整、历史压缩、错误分类、auth 头定制——按端点可组合启停。
  新 API 格式 = 新适配器文件；新端点怪癖 = 新中间件。动刀前先补齐 vcr 回放用例，`openaiShim.test.ts`（3174 行）全程护体。
- **2.4 注册表声明式化**：`tools.ts:getAllBaseTools()` 与 `commands.ts:COMMANDS()` 从条件 if 树改为"清单 + 启用谓词"，删除可达性存疑的条件 require 死代码区。
- **2.5 遥测调用点清扫**：`tengu_*` 的 no-op `logEvent` 调用（约 1191 处引用）脚本化批量删除，源码噪音归零。
- **2.6 品牌与文案统一**：用户可见字符串去 Anthropic 化——`MACRO.ISSUES_EXPLAINER` 改内网 issue 通道（当前会进系统提示词）、`/bug` 反馈组件、cost 的 overage 文案、`commands/init.ts` 生成的模板（现在还在推荐官方插件市场）、帮助链接、启动画面。统一用 ClownCode 内网语境。
- **2.7 开发者扩展文档**：`docs/extending.md`——如何加工具/命令/agent/传输适配器/搜索源/MCP 服务器，各需动哪些文件；把 CLAUDE.md 架构节展开成教程，配最小示例。

**出口标准（可验证的"简洁"）**：新增最小工具、命令各只需 1 个新目录 + 1 行注册；新增传输格式只需 1 个适配器文件；`build.ts` 无 `feature()` 预处理；`verify:privacy` 模式清单覆盖全部已知外发宿主；`verify:all` + 全量测试通过。

## 阶段 3：内网能力增强（阶段 2 后半起并行，需求拉动）

- **3.1 内网搜索/抓取**：WebSearch provider 接口对接内网 ES / 知识库 / 自建代理；WebFetch 域名白名单策略化。
- **3.2 记忆/知识体系深化**：memdir、`/dream` `/knowledge` `/wiki`——本仓自有特色，持续投入。
- **3.3 Windows 体验打磨**：PowerShell 工具、路径处理、终端兼容（团队主力环境是 Windows）。
- **3.4 gRPC/SDK 集成面**：面向内网系统（CI、内部平台）的稳定集成。
- **3.5 内网插件分发**：本地 marketplace 目录或内网 git 仓库作为插件源，替代公网 github 安装路径。

优先级由实际使用反馈决定，不预先排满。

## 阶段 4：上游跟踪循环（阶段 2 完成后启动，月度常态化）

跟上 Claude Code 最新功能的机制。事实基础：claude-code 本体源码不开源（npm 混淆发布，但 CHANGELOG 公开）；`gitlawb/openclaude` 是本仓源头的重构源码 fork。**当前环境无法核实上游活跃度，机制设计为不依赖单一移植源。**

- **4.1 雷达**：每月读 anthropics/claude-code 的 CHANGELOG，新功能按「移植 / 跳过 / 观察」分类。
- **4.2 移植源**（按优先级回退）：① `git remote add openclaude` 拉取对应实现——本仓已大幅分叉，**不做 merge，做"读上游实现 → 按 seam 重实现"的定向移植**；② 上游不可用/未移植时，按 CHANGELOG + 官方混淆包的实际行为直接实现。
- **4.3 分类规则**：新工具/命令/agent → 走注册 seam；协议/provider 变化 → 走 Transport 适配器；Anthropic 云专属（订阅、claude.ai 连接器、遥测、营销）→ 跳过；安全修复 → 最高优先。
- **4.4 分叉账本 `PORTING.md`**：记录"上游路径 ↔ 本仓路径"映射、已移植功能与版本、刻意不分叉项。这是防止"越走越远、想抄找不到"的保险。**配套纪律：少做纯改名/搬目录的重构，保留与上游可 diff 的布局**，除非该区域已完全自有。
- **4.5 节奏**：月度小移植、季度大功能，每次移植过全部门禁并记入账本。

---

## 里程碑与版本

| 版本 | 内容 |
| --- | --- |
| v0.8 | 阶段 0 + 1：纯内网、零尸体、门禁完备 |
| v0.9 | 阶段 2：简洁架构 + extending 文档，seam 冻结 |
| v1.0 | 阶段 3 首批 + 上游跟踪跑通一轮；承诺配置与扩展 API 稳定 |
| 1.x | 常态化上游移植 + 内网增强 |

## 风险与对策

| 风险 | 对策 |
| --- | --- |
| 清理引发功能回归 | 门禁 + 测试基线对照 + 小批次可回滚 |
| openaiShim 重构伤及请求层 | 先补 vcr 用例再动刀；3174 行测试护体；单独分支慢做 |
| 与上游渐行渐远无法吸收新功能 | PORTING.md 账本 + 保留可 diff 布局 + seam 化移植 |
| 单人带宽不足 | 每批独立 commit 可随时暂停；阶段 3 需求拉动不预铺 |
| verify 清单滞后于新外发形式 | 每次发现新外发宿主即加模式（铁律：只加严） |
| Windows 环境差异 | doctor:runtime 逐步增加检查项 |

## 不做清单（non-goals）

恢复多厂商 provider 动物园；任何登录/订阅/额度体系；云同步与云端会话；崩溃上报与"匿名统计"；默认启用公网插件市场；任何形式的"免费兜底"公网请求。

---

## 附录 A：必须保留（清理时的保护清单）

`@anthropic-ai/sdk`（shim 的类型与请求模型基础）、`src/services/oauth/client.ts`（MCP 自身授权）、memdir/`/dream` 记忆体系、`src/migrations/`、`src/native-ts/`、`src/vim/` + `src/keybindings/`、`sharp`/`marked`/`xss`/`ws`、gRPC + proto、`no-telemetry-plugin` + `verify-no-phone-home` 双闸、`/insights`（本地分析）。另见 CLAUDE.md「功能保护清单」。
