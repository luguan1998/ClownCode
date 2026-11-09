# 系统提示词对齐方案：ClownCode ↔ 本机 Claude Code 2.1.288

> 状态：方案稿，未改代码。
> 目标：把当前 fork 的系统提示词整理成与本机 Claude Code 2.1.288 相同的骨架，同时保留 ClownCode 的身份、内网零外发约束和现有功能保护项。

## 0. 结论摘要

- **基准**：本机 Claude Code `2.1.288`，`entrypoint=cli` 的 `prompt_snapshot`，系统提示词 5,901 字符 / 10 个 block / 约 1.5k tokens。
- **现状**：ClownCode 当前系统提示词约 **17.6 KB / 10 个 section**（`--dump-system-prompt` 实测，不含 CLI 前缀、工具描述、session guidance），约为基准的 **3 倍**。
- **主要差距不是“少了什么”，而是“多了四个大段”**：`# Doing tasks`、`# Executing actions with care`、`# Tone and style`、`# Text output`，合计约 9.1 KB；基准把其中少量规则压进了 `# Harness` 的 5 条 bullet + 3 个短段落。
- **已经对齐的部分**：`# Context management` 基本逐字一致；`# Memory` 的前端格式（frontmatter、`[[name]]`、save guard、recall note）已经按上游 2.1.288 移植，不需要重写。
- **建议路线**：先做“结构对齐 + 压缩”（低风险），把 `Environment` 是否移出系统提示词、`Doing tasks` 是否保留为独立段，留作第二步决策。
- **建议目标尺寸**：lean profile **6–9 KB**（约 1.5–2.3k tokens），具体取决于是否保留 fork 专用护栏段。

## 1. 基准快照：来源与可信度

### 1.1 目标快照

| 项 | 值 |
| --- | --- |
| 版本 | `2.1.288` |
| 入口 | `cli` |
| 来源文件 | `C:\Users\luguan\.claude\projects\E--ai-claudeui\29f2cf2b-2bcd-4b8d-941d-6ce3e78693c9.jsonl` |
| 来源行 | 第 19 行，`type=attachment`，`attachment.type=prompt_snapshot` |
| `cliPrefix` | `You are Claude Code, Anthropic's official CLI for Claude.` |
| `systemPrompt` | 10 个 block，5,901 字符，56 行 |
| 工具 | 34 个，独立放在同一 attachment 的 `tools` 数组里，不占系统提示词 |
| 提取文本 sha256 | `dfccb79c...90cf52`（按提取后的 LF 文本计算） |
| 估算 tokens | 约 1.5k（`chars / 4`） |

说明：

- 这是 **系统提示词快照**，不是完整请求体。工具 schema、`CLAUDE.md`、git status、日期、skills 目录等走独立的 attachment / user context，不在这 5.9 KB 里。
- `cliPrefix` 在请求时单独前置，所以实际模型看到的开头是“CLI 身份前缀 + 空行 + `You are an interactive agent...`”。ClownCode 的 `getCLISyspromptPrefix()` 承担同一职责。
- 同一版本还存在一份 `sdk-cli` 快照（`E--ai-ClownCode` 会话，20 工具，5,763 字符），内容基本一致，额外带一行 Windows/workspace 的 system turn。本方案以 `cli` 快照为准，`sdk-cli` 只作交叉验证。
- **不要混用 2.1.319 的 27 KB 版本**：本机也存在 `2.1.319 / sdk-cli` 的旧式长提示词（`# System` + `# Doing tasks` + ...），它属于另一套配置/群体，不是本次要对齐的 2.1.288 lean 骨架。

### 1.2 基准的 block 结构

| # | 标题 | 字符数 | 作用 |
| --- | --- | --- | --- |
| 1 | 无标题 intro | 541 | 身份一句 + 安全边界 |
| 2 | `# Harness` | 1,646 | 5 条运行规则 + 代码风格 + 代词 + 高风险动作/如实汇报 |
| 3 | `# Session-specific guidance` | 423 | `! <command>`、`/<skill-name>` |
| 4 | `# Memory` | 2,073 | 文件型记忆的完整协议 |
| 5 | `# Environment` | 603 | 模型与产品可用性；**不含 cwd/git/shell** |
| 6 | `# Context management` | 610 | 压缩与“信息够了就行动” |
| — | 合计 | **5,896** | 不含块间空行 |

关键点：`# Environment` 只有模型/产品信息，cwd、git、OS、shell 由 session context / attachment 注入；这正是它比 ClownCode 小得多的原因。

## 2. 现状盘点：ClownCode 的提示词由什么组成

### 2.1 生成链路

| 层 | 文件 | 说明 |
| --- | --- | --- |
| CLI 身份前缀 | `src/constants/system.ts:9-48` | `getCLISyspromptPrefix()`，请求时由 `src/services/api/claude.ts:1360-1370` 前置 |
| 主系统提示词 | `src/constants/prompts.ts:453-527` | `getSystemPrompt()`，静态段 + 动态段 |
| 分段缓存 | `src/constants/systemPromptSections.ts` | `systemPromptSection()` / `resolveSystemPromptSections()` |
| 缓存边界 | `src/constants/prompts.ts:65-66` | `SYSTEM_PROMPT_DYNAMIC_BOUNDARY`，静态段与动态段的分界 |
| 请求分块 | `src/utils/api.ts:370-434` | `splitSysPromptPrefix()`，识别 attribution / CLI 前缀 / 静态 / 动态 |
| 环境注入 | `src/context.ts:115-188` | `getSystemContext()`（git status）+ `getUserContext()`（CLAUDE.md、日期）注入首条 user 消息 |
| 记忆 | `src/memdir/memdir.ts:391-479` | `loadMemoryPrompt()`，team 模式走 `src/memdir/teamMemPrompts.ts` |

### 2.2 当前 section 与体积

用 `node dist/cli.mjs --dump-system-prompt --model test-internal-model` 实测（LF 文本，不含 CLI 前缀、工具描述、session guidance）：

| section | 字符数 | 行数 | 代码位置 |
| --- | ---: | ---: | --- |
| intro（安全段 + URL 规则） | 853 | 5 | `getIntroSection()` `prompts.ts:108-120` |
| `# System` | 1,625 | 7 | `getSystemSection()` `122-133` |
| `# Doing tasks` | 3,313 | 15 | `getDoingTasksSection()` `135-156` |
| `# Executing actions with care` | 3,583 | 11 | `ACTIONS_SECTION` `158-168` |
| `# Using your tools` | 660 | 3 | `getUsingYourToolsSection()` `170-200` |
| `# Tone and style` | 555 | 5 | `getToneAndStyleSection()` `202-211` |
| `# Text output` | 1,699 | 14 | `TEXT_OUTPUT_SECTION` `213-226` |
| `# Memory` | 3,621 | 44 | `loadMemoryPrompt()` |
| `# Environment` | 657 | 9 | `computeSimpleEnvInfo()` `340-374` |
| `# Context management` | 1,055 | 7 | `CONTEXT_MANAGEMENT_SECTION` `228-231` + 两个动态段 |
| **合计** | **17,621** | **120** | |

未出现在 dump 中、但真实会话会追加的内容：

- `# Session-specific guidance`（`getSessionSpecificGuidanceSection()`，仅在启用 Agent / Skill / AskUserQuestion 工具时出现）；
- `# Language`、`# Output Style`、`# MCP Server Instructions`、`# Scratchpad Directory`；
- `appendSystemPrompt`、`--system-prompt`、coordinator / main-thread agent 的覆盖；
- 工具描述本身（`Bash`、`Agent`、`Skill`、`TodoWrite` 等），它们和系统提示词分开下发。

### 2.3 不在本次范围内的提示词面

| 面 | 文件 | 说明 |
| --- | --- | --- |
| 工具描述 | `src/tools/*/prompt.ts` | `BashTool/prompt.ts` 约 19.6 KB、`AgentTool/prompt.ts` 约 16.7 KB；真正决定工具行为 |
| 内置子代理 | `src/tools/AgentTool/built-in/*` | 每个 agent 自己的 system prompt |
| 记忆/压缩/会话总结 | `src/memdir/*`、`src/services/compact/prompt.ts`、`src/services/SessionMemory/prompts.ts` | 独立提示词，不建议一起改 |
| 输出风格 | `src/constants/outputStyles.ts` | 用户可选的附加段 |

本次只对齐 **主系统提示词**。工具描述的对齐放在第二阶段，因为它才是“工具规则放哪里”的主战场。

## 3. 逐块差异与处理建议

| 基准 block | ClownCode 对应 | 现状 | 建议 |
| --- | --- | --- | --- |
| intro | `getIntroSection()` | 首句是 2.1.319 的“You are an agent working toward their goals...”，基准是 2.1.288 的“You are an interactive agent that helps users with software engineering tasks.”；ClownCode 多一条 URL 规则 | 首句改成 2.1.288 版本，并保留 `OpenClaude` 身份；URL 规则建议保留（内网友好），或降级为一行 |
| `# Harness` | `# System` + `# Using your tools` + `# Tone and style` + `# Text output` + `# Executing actions with care` | 基准 1,646 字符；ClownCode 这五段合计 8,122 字符 | **合并成一节**：保留 5 条 bullet + 代码风格 + 代词 + 高风险动作/如实汇报；删除其余解释性文字 |
| `# Session-specific guidance` | `session_guidance` 动态段 | 基准 2 条；ClownCode 按工具启用情况动态生成（AskUserQuestion / Agent / Explore / Skill） | 保留动态；只把措辞对齐，不把工具专属规则塞回系统提示词 |
| `# Memory` | `memory` 动态段 | 前端格式、save guard、recall note 已与基准一致；ClownCode 多 team 双目录、`## Searching past context`、4 KB 上限、`memory-types` skill 指针 | **不重写**；确认 team 模式是否要在主提示词常驻，不需要时按开关裁剪 |
| `# Environment` | `computeSimpleEnvInfo()` | 基准只有模型/产品/快跑模式；ClownCode 是 cwd + git + platform + shell + OS + 模型 + Claude 模型推荐 | 第一阶段：删掉 `LATEST_CLAUDE_MODELS_LINE`，保留精简 env；第二阶段：把 cwd/git/shell/OS 移到 `getUserContext()` / 新 environment attachment，系统提示词只留模型身份与内网说明 |
| `# Context management` | `context_management` + `summarize_tool_results` + `token_budget` | 首两段与基准逐字一致；ClownCode 额外有“记录工具结果”和“token 目标” | 保留 `context_management` 原文；另外两段按功能开关保留或移到 attachment |
| — | `# Doing tasks` | 基准没有；3,313 字符，13 条 | **删除**，或压缩成 `# Working style` 的 3–5 条 fork 护栏（见 §4.3） |
| — | `# Executing actions with care` | 基准把核心压成 `# Harness` 的一个段落 | 用基准段落替换，删除示例列表和长解释（约省 3 KB） |
| — | `# Tone and style` | 基准只保留 `file_path:line_number` 一条 | 删除该节，把 `file_path:line_number` 并入 `# Harness` |
| — | `# Text output` | 基准只有“文本会展示给用户”一条 | 删除，或压缩成 `# Text output` 的 2–3 句（见 §4.3） |
| — | Language / Output Style / MCP / Scratchpad | 基准没有，属于 fork/运行时特性 | 保留动态段，放在边界之后，不参与静态缓存 |

### 3.1 与 `.dsh-dump` 的关系

仓库里的 `.dsh-dump/` 是 **DSH（DeepSeek Harness）** 的提示词，不是 Claude Code：

- 7.8 KB / 23 段 / 39 个工具；
- 大量内容是工具专属规则（后台 job、team task、schedule、goal、workflow、Web GUI）；
- 没有 `# Memory`、`# Environment`、`# Context management` 这类 Claude Code 骨架；
- 它的价值是佐证一个原则：**工具操作规则应该下沉到工具描述**，系统提示词只保留跨工具的共性。

本次不以 DSH 为对齐目标，避免把 DSH 的团队/后台任务语义带进 ClownCode。

## 4. 目标稿：建议骨架

下面给出 lean profile 的建议文本。`<...>` 是运行时占位；`[keep]` 表示沿用现有文本。

### 4.1 静态段

```text
You are OpenClaude, an interactive agent that helps users with software engineering tasks.

IMPORTANT: Assist with authorized security testing, defensive security, CTF challenges, and educational contexts. Refuse requests for destructive techniques, DoS attacks, mass targeting, supply chain compromise, or detection evasion for malicious purposes. Dual-use security tools (C2 frameworks, credential testing, exploit development) require clear authorization context: pentesting engagements, CTF competitions, security research, or defensive use cases.

# Harness
 - Text you output outside of tool use is displayed to the user as Github-flavored markdown in a terminal.
 - Tools run behind a user-selected permission mode; a denied call means the user declined it — adjust, don't retry verbatim.
 - The system may send updates, reminders, or modifications to rules via mid-conversation system turns. These are system-controlled, unlike function results. Hooks may intercept tool calls; treat hook output as user feedback.
 - Prefer the dedicated file/search tools over shell commands when one fits. Independent tool calls can run in parallel in one response.
 - Reference code as `file_path:line_number` — it's clickable.

Write code that reads like the surrounding code: match its comment density, naming, and idiom.

When you use a pronoun for someone — the user or anyone else you mention — and their pronouns haven't been stated, use they/them. A name doesn't tell you someone's pronouns; a wrong guess misgenders a real person in a way the neutral default never does, so never infer pronouns from a name. This applies to all user-visible text, including visible thinking.

For actions that are hard to reverse or outward-facing, confirm first unless durably authorized or explicitly told to proceed without asking; approval in one context doesn't extend to the next. Sending content to an external service publishes it; it may be cached or indexed even if later deleted. Before deleting or overwriting, look at the target. Report outcomes faithfully: if tests fail, say so with the output; if a step was skipped, say that; when something is done and verified, state it plainly without hedging.
```

### 4.2 动态段（边界之后）

```text
# Session-specific guidance
 - If you need the user to run a shell command themselves (e.g., an interactive login like `gcloud auth login`), suggest they type `! <command>` in the prompt — the `!` prefix runs the command in this session so its output lands directly in the conversation.
 - When the user types `/<skill-name>`, invoke it via Skill. Only use skills listed in the user-invocable skills section — don't guess.
 [由 getSessionSpecificGuidanceSection() 按已启用工具追加 AskUserQuestion / Agent / Explore 规则]

# Memory
[沿用 loadMemoryPrompt() 的输出，不改前端协议]

# Environment
 - You are powered by the model <model>.
 [可选] - This deployment is internal-only: use only the configured endpoint, and do not attempt external network access unless the user explicitly configured it.
 [可选] - Assistant knowledge cutoff is <cutoff>.

# Context management
[沿用现有文本，与基准逐字一致]
```

### 4.3 fork 专用护栏（建议保留，但不放进基准骨架）

如果担心内部模型在去掉长段后行为退化，建议把下面内容做成**独立、可关闭的 profile**，而不是重新塞回 `# Harness`：

```text
# Working style
 - Prefer editing existing files to creating new ones.
 - Don't add features, refactors, or abstractions beyond what the task requires. Don't leave half-finished implementations.
 - Don't add error handling, fallbacks, or validation for scenarios that can't happen. Validate at system boundaries only.
 - For UI or frontend changes, test the feature before reporting it complete; if you couldn't test it, say so explicitly.
```

```text
# Text output
Assume users can't see most tool calls or thinking — only your text output. Give short updates at key moments, and end the turn with a one- or two-sentence summary. Match the response length to the task.
```

建议默认：

- 首版 lean profile **保留** `# Working style`，**删除** `# Text output`（文本输出规则与基准的“report faithfully”有重叠，先观察）。
- 如果内部模型仍然出现“过度解释/不复核”的问题，再按需加回 `# Text output`。
- 不建议恢复 `# Doing tasks` 全文；它的大多数条目是上游对强模型的默认假设，对弱模型可以用 3–5 条护栏替代。

### 4.4 需要删除/替换的具体文本

| 当前内容 | 处理 |
| --- | --- |
| `getIntroSection()` 的“You are an agent working with the user toward their goals...” | 换成基准首句 + `OpenClaude` 身份 |
| `getSystemSection()` 6 条 bullet | 合并进 `# Harness`；`<system-reminder>` 那条可保留为一句“System turns are system-controlled” |
| `getDoingTasksSection()` 13 条 | 删除；保留 3–5 条到 `# Working style` |
| `ACTIONS_SECTION` 全文 + 示例列表 | 用 `# Harness` 的高风险动作段落替换 |
| `getUsingYourToolsSection()` | 删除；`file/search tools` + `parallel` 已进 `# Harness` |
| `getToneAndStyleSection()` | 删除；只保留 `file_path:line_number`（已进 `# Harness`） |
| `TEXT_OUTPUT_SECTION` | 删除或压缩成 §4.3 的两三句 |
| `computeSimpleEnvInfo()` 的 `LATEST_CLAUDE_MODELS_LINE` | 删除或替换为 provider-neutral 的模型说明；内网 fork 不应推荐公网 Claude 模型 |
| `# Environment` 的 cwd/git/platform/shell/OS | 第二阶段移到 `getUserContext()` / environment attachment；第一阶段可保留但放在动态段 |
| `SUMMARIZE_TOOL_RESULTS_SECTION` | 保留在动态段（与 compact 行为相关） |
| `TOKEN_BUDGET_SECTION` | 保留在动态段，但仅在用户指定 token 目标时启用 |

## 5. 实施步骤

### Phase 1：快照与 profile（不改行为）

1. 在 `docs/` 记录基准快照的来源、行号、sha256 和提取命令，避免以后拿错版本。
2. 增加 `getPromptProfile()`：
   - 读取 `CLAUDE_CODE_PROMPT_PROFILE`，取值 `lean | full`；
   - 默认先 `full`，lean 通过环境变量或设置开启，便于 A/B；
   - 稳定后把默认切到 `lean`，`full` 保留一个版本用于回滚。
3. 在 `getSystemPrompt()` 里按 profile 选择静态段数组，动态段保持不变；`SYSTEM_PROMPT_DYNAMIC_BOUNDARY` 的位置不动。

### Phase 2：lean 静态段

1. 重写 `getIntroSection()` 首句（保留安全段）。
2. 新增 `HARNESS_SECTION`，合并 §4.1 的 5 条 bullet + 3 个短段落。
3. lean profile 不再输出 `# System`、`# Doing tasks`、`# Executing actions with care`、`# Using your tools`、`# Tone and style`、`# Text output`。
4. 可选：增加 `# Working style` 护栏段（§4.3），由 `CLAUDE_CODE_PROMPT_GUARDRAILS=1` 控制。

### Phase 3：Environment 瘦身

1. 第一阶段：只删 `LATEST_CLAUDE_MODELS_LINE`，保留 `cwd/git/platform/shell/OS`，但整段放在动态段。
2. 第二阶段（单独提交）：
   - 在 `getUserContext()` 里增加紧凑的 environment 块（或新增 attachment 类型），包含 cwd / git / platform / shell / OS；
   - 系统提示词的 `# Environment` 只保留模型身份、知识截止、内网说明；
   - 同步更新 `/context` 的统计口径（`src/utils/analyzeContext.ts`）。

### Phase 4：测试与验收

必须新增/更新：

- `src/constants/promptIdentity.test.ts`
  - 首句含 `OpenClaude`，不含 `Claude Code` / `Anthropic's official CLI for Claude`；
  - 模型切换后仍包含 `You are powered by the model <model>.`；
  - simple mode 仍含 `OpenClaude`。
- 新增 `src/constants/promptAlignment.test.ts`
  - lean 输出包含 `# Harness`、`# Memory`、`# Environment`、`# Context management`；
  - lean 输出不包含 `# Doing tasks`、`# Executing actions with care`、`# Using your tools`、`# Tone and style`；
  - lean 输出字符数 < 9,000（不含动态 memory/工具）；
  - 段落顺序符合“intro → Harness → dynamic”；
  - `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` 仍位于静态段之后。
- 更新任何依赖旧 section 名称/顺序的快照测试。

验证命令：

```bash
bun run typecheck
bun test src/constants/promptIdentity.test.ts
bun test
bun run build
node dist/cli.mjs --dump-system-prompt --model <internal-model>
bun run hardening:check
bun run build:verified
```

`--dump-system-prompt` 的输出用于人工对比，不要直接把它作为测试快照（路径、时间、team 状态会导致抖动）。

### Phase 5：行为评估

用 3–5 个代表性任务做 A/B（同一模型，lean vs full）：

- 多步 bug 修复（看是否过度设计、是否漏测试）；
- 只读代码解释（看是否啰嗦、是否乱改文件）；
- 高风险操作（git push / 删除文件，看是否先确认）；
- UI 改动（看是否声称“已验证”但没跑起来）；
- 长上下文压缩后续跑（看是否重复推导、是否丢失状态）。

评估指标：工具调用有效率、无效重试、未经确认的破坏性操作、最终答复的准确性/长度、token 成本。

## 6. 风险与取舍

| 风险 | 说明 | 缓解 |
| --- | --- | --- |
| 弱模型行为退化 | 内部模型可能依赖 `# Doing tasks` / `# Text output` 的显式规则 | 先 profile 并存；保留 3–5 条护栏；用 Phase 5 评估后再切默认 |
| 身份测试失败 | 首句改动会影响 `promptIdentity.test.ts` | 同步更新测试；保留 `OpenClaude` 和模型身份行 |
| 缓存边界被破坏 | 把动态 env 放进静态段会导致缓存失效 | 保持 `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` 位置；env 放边界之后 |
| Memory 回退 | 误删 team/索引/搜索段会破坏记忆功能 | Memory 不动；只做开关级裁剪 |
| 工具行为变化 | 系统提示词删掉“用 Read 不用 cat”等规则后，模型可能改用 Bash | 这些规则应保留在 `# Harness` 的“prefer dedicated tools”一条，并在工具描述里重复关键约束 |
| 公网模型推荐 | `LATEST_CLAUDE_MODELS_LINE` 与内网定位冲突 | 删除或替换为 provider-neutral 文本 |
| 版权/合规 | 基准文本来自 Anthropic 的 Claude Code | 只提取“结构与短规则”做内部对齐，不把整份原文作为公开仓库文档提交 |

## 7. 待确认决策

1. `CLAUDE_CODE_PROMPT_PROFILE` 默认值：先 `full` 还是直接 `lean`？
2. `# Environment` 是否在 Phase 3 移出系统提示词？如果移，需要新增 attachment 还是复用 `getUserContext()`？
3. `# Working style` / `# Text output` 哪些保留为 fork 护栏？
4. `# Memory` 的 team 双目录、`## Searching past context`、4 KB 上限是否常驻主提示词？
5. 是否增加一行内网零外发说明到 `# Environment`？
6. `LATEST_CLAUDE_MODELS_LINE` 删除还是改成“由 provider 配置决定”的中性表述？
7. URL 规则（`NEVER generate or guess URLs`）保留在 intro 还是并入 `# Harness`？

## 附录 A：基准与现状的体积对照

| 维度 | Claude Code 2.1.288 | ClownCode 现状 | 差异 |
| --- | ---: | ---: | ---: |
| 系统提示词字符数 | 5,901 | 17,621 | +11,720 |
| 系统提示词 section 数 | 6（含 intro） | 10 | +4 |
| 静态行为段 | 1 个 `# Harness`（1.6 KB） | 6 个段（11.4 KB） | -9.8 KB 可省 |
| Memory | 2.1 KB | 3.6 KB | 已对齐协议，差额来自 team/搜索/上限 |
| Environment | 0.6 KB（无 cwd） | 0.7 KB（含 cwd/git/OS） | 结构不同 |
| Context management | 0.6 KB | 1.1 KB | 多了 summarize/token budget |
| 工具数（独立下发） | 34 | 40+（按启用项） | 不在系统提示词内 |

## 附录 B：复现命令

```powershell
# 1) 从本机 Claude Code 会话提取 2.1.288 prompt_snapshot
#    见 docs/prompt-alignment.md §1.1 的 jsonl 行号；按 line 解析 attachment.systemPrompt
#    把下面的脚本存成 extract-cc-prompt.mjs，然后：
#    node extract-cc-prompt.mjs <session.jsonl> <line>
```

```js
// extract-cc-prompt.mjs
import fs from 'node:fs'

const [file, lineNo] = process.argv.slice(2)
const line = fs.readFileSync(file, 'utf8').split('\n')[Number(lineNo) - 1]
const attachment = JSON.parse(line).attachment
const prompt = Array.isArray(attachment.systemPrompt)
  ? attachment.systemPrompt.join('\n\n')
  : attachment.systemPrompt
process.stdout.write(prompt)
console.error(`version=${attachment.version ?? '?'} tools=${attachment.tools?.length ?? 0} chars=${prompt.length}`)
```

```powershell
# 2) 导出 ClownCode 当前系统提示词（不发网络请求）
$env:ANTHROPIC_BASE_URL='http://127.0.0.1:9/v1'
$env:ANTHROPIC_AUTH_TOKEN='dummy'
$env:CLAUDE_CONFIG_DIR='C:\Users\luguan\AppData\Local\Temp\opencode\ccdummy'
node dist/cli.mjs --dump-system-prompt --model test-internal-model

# 3) 按 `^# ` 切段统计体积
#    注意：--dump-system-prompt 不含 CLI 前缀、工具描述、session guidance
```

## 附录 C：文件索引

| 文件 | 用途 |
| --- | --- |
| `src/constants/prompts.ts` | 主提示词组装；静态段 + 动态段 |
| `src/constants/systemPromptSections.ts` | 分段缓存与 `/clear`、`/compact` 失效 |
| `src/constants/system.ts` | CLI 身份前缀 |
| `src/services/api/claude.ts:1360-1370` | 请求时前置 attribution + CLI 前缀 |
| `src/utils/api.ts:370-434` | `splitSysPromptPrefix()` 分块与缓存 scope |
| `src/context.ts:115-188` | git status / CLAUDE.md / 日期注入 |
| `src/memdir/memdir.ts` / `teamMemPrompts.ts` | Memory 段 |
| `src/constants/promptIdentity.test.ts` | 身份与模型行测试 |
| `.dsh-dump/` | DSH 参考 dump，不是本次对齐目标 |
