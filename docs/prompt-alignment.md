# 系统提示词对齐方案：ClownCode ↔ 本机 Claude Code 2.1.288

> 状态：已落地（2026-11-09）。`src/constants/prompts.ts` 已切换为 lean 主提示词。
> 目标：把当前 fork 的系统提示词整理成与本机 Claude Code 2.1.288 相同的骨架，同时保留 ClownCode 的身份、内网零外发约束和现有功能保护项。

## 0. 结论摘要

- **基准**：本机 Claude Code `2.1.288`，`entrypoint=cli` 的 `prompt_snapshot`，系统提示词 5,901 字符 / 10 个 block / 约 1.5k tokens。
- **现状**：ClownCode 当前系统提示词约 **17.6 KB / 10 个 section**（`--dump-system-prompt` 实测，不含 CLI 前缀、工具描述、session guidance），约为基准的 **3 倍**。
- **主要差距不是“少了什么”，而是“多了四个大段”**：`# Doing tasks`、`# Executing actions with care`、`# Tone and style`、`# Text output`，合计约 9.1 KB；基准把其中少量规则压进了 `# Harness` 的 5 条 bullet + 3 个短段落。
- **已经对齐的部分**：`# Context management` 基本逐字一致；`# Memory` 的前端格式（frontmatter、`[[name]]`、save guard、recall note）已经按上游 2.1.288 移植，不需要重写。
- **已落地**：直接改默认提示词，不引入 profile 开关。静态段只剩 intro + `# Harness`，六个旧 section 已删除；`LATEST_CLAUDE_MODELS_LINE` 已删除。
- **落地后尺寸**：`--dump-system-prompt` 实测 **7,549 字符**（含动态 `# Memory`），仍在 lean 目标区间内。

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

### 2.2 改动前的 section 与体积

> 本节记录改动前的基线，用于回看差异；落地后的结构见 §2.2.1。

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

### 2.2.1 改动后的 section 与体积

| section | 字符数 | 代码位置 |
| --- | ---: | --- |
| intro（身份 + 安全段 + URL 规则） | 847 | `getIntroSection()` |
| `# Harness` | 1,646 | `HARNESS_SECTION` |
| `# Memory` | 3,622 | `loadMemoryPrompt()` |
| `# Environment` | 379 | `computeSimpleEnvInfo()` |
| `# Context management` | 1,055 | `CONTEXT_MANAGEMENT_SECTION` + 两个动态段 |
| **合计** | **7,549** | |

静态段（intro + `# Harness`）约 2.5 KB，与基准的 2.2 KB 基本同量级；差额主要来自 `# Memory` 的 team/搜索/上限扩展。

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

本次对齐 **主系统提示词 + 7 个核心工具**（Bash / Read / Write / Edit / AskUserQuestion / Grep / Glob）。其余工具描述的对齐放在后续阶段。

## 3. 逐块差异与处理结果

| 基准 block | ClownCode 对应 | 现状 | 处理结果 |
| --- | --- | --- | --- |
| intro | `getIntroSection()` | 原首句是 2.1.319 的“You are an agent working toward their goals...”；ClownCode 多一条 URL 规则 | 已换成 2.1.288 首句并保留 `OpenClaude` 身份；URL 规则保留在 intro |
| `# Harness` | `# System` + `# Using your tools` + `# Tone and style` + `# Text output` + `# Executing actions with care` | 基准 1,646 字符；原五段合计 8,122 字符 | 已合并成一节：5 条 bullet + 代码风格 + 代词 + 高风险动作/如实汇报 |
| `# Session-specific guidance` | `session_guidance` 动态段 | 基准 2 条；ClownCode 按工具启用情况动态生成（AskUserQuestion / Agent / Explore / Skill） | 保留动态；不把工具专属规则塞回系统提示词 |
| `# Memory` | `memory` 动态段 | 前端格式、save guard、recall note 已与基准一致；ClownCode 多 team 双目录、`## Searching past context`、4 KB 上限、`memory-types` skill 指针 | 不重写；保持现状 |
| `# Environment` | `computeSimpleEnvInfo()` | 基准只有模型/产品/快跑模式；ClownCode 是 cwd + git + platform + shell + OS + 模型 | 已删除 `LATEST_CLAUDE_MODELS_LINE`，保留精简 env；cwd/git/shell/OS 迁移暂不做 |
| `# Context management` | `context_management` + `summarize_tool_results` + `token_budget` | 首两段与基准逐字一致；ClownCode 额外有“记录工具结果”和“token 目标” | 保留 `context_management` 原文；另外两段留在动态段 |
| — | `# Doing tasks` | 基准没有；原 3,313 字符，13 条 | 已删除 |
| — | `# Executing actions with care` | 基准把核心压成 `# Harness` 的一个段落 | 已用基准段落替换，删除示例列表和长解释 |
| — | `# Tone and style` | 基准只保留 `file_path:line_number` 一条 | 已删除该节，`file_path:line_number` 并入 `# Harness` |
| — | `# Text output` | 基准只有“文本会展示给用户”一条 | 已删除 |
| — | Language / Output Style / MCP / Scratchpad | 基准没有，属于 fork/运行时特性 | 保留动态段，放在边界之后，不参与静态缓存 |

### 3.1 与 `.dsh-dump` 的关系

仓库里的 `.dsh-dump/` 是 **DSH（DeepSeek Harness）** 的提示词，不是 Claude Code：

- 7.8 KB / 23 段 / 39 个工具；
- 大量内容是工具专属规则（后台 job、team task、schedule、goal、workflow、Web GUI）；
- 没有 `# Memory`、`# Environment`、`# Context management` 这类 Claude Code 骨架；
- 它的价值是佐证一个原则：**工具操作规则应该下沉到工具描述**，系统提示词只保留跨工具的共性。

本次不以 DSH 为对齐目标，避免把 DSH 的团队/后台任务语义带进 ClownCode。

## 4. 目标稿：已落地骨架

下面给出 lean profile 的建议文本。`<...>` 是运行时占位；`[keep]` 表示沿用现有文本。

### 4.1 静态段（已落地）

```text
You are OpenClaude, an interactive agent that helps users with software engineering tasks. Use the instructions below and the tools available to you to assist the user.

IMPORTANT: Assist with authorized security testing, defensive security, CTF challenges, and educational contexts. Refuse requests for destructive techniques, DoS attacks, mass targeting, supply chain compromise, or detection evasion for malicious purposes. Dual-use security tools (C2 frameworks, credential testing, exploit development) require clear authorization context: pentesting engagements, CTF competitions, security research, or defensive use cases.

IMPORTANT: You must NEVER generate or guess URLs for the user unless you are confident that the URLs are for helping the user with programming. You may use URLs provided by the user in their messages or local files.

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

### 4.3 fork 专用护栏（未采用）

评估过把 `# Working style` 作为独立、可关闭的 profile，但用户明确要求直接改、不加开关，因此**没有落地**：

```text
# Working style
 - Prefer editing existing files to creating new ones.
 - Don't add features, refactors, or abstractions beyond what the task requires. Don't leave half-finished implementations.
 - Don't add error handling, fallbacks, or validation for scenarios that can't happen. Validate at system boundaries only.
 - For UI or frontend changes, test the feature before reporting it complete; if you couldn't test it, say so explicitly.
```

如果需要回补，优先考虑把这类“工作方式”规则下沉到工具描述或项目 `CLAUDE.md`，而不是重新把系统提示词拉长。

### 4.4 删除/替换清单（已执行）

| 当前内容 | 处理 |
| --- | --- |
| `getIntroSection()` 的“You are an agent working with the user toward their goals...” | 已换成基准首句 + `OpenClaude` 身份 |
| `getSystemSection()` 6 条 bullet | 已合并进 `# Harness`；`<system-reminder>` 压成“System turns are system-controlled” |
| `getDoingTasksSection()` 13 条 | 已删除 |
| `ACTIONS_SECTION` 全文 + 示例列表 | 已用 `# Harness` 的高风险动作段落替换 |
| `getUsingYourToolsSection()` | 已删除；`file/search tools` + `parallel` 已进 `# Harness` |
| `getToneAndStyleSection()` | 已删除；只保留 `file_path:line_number`（已进 `# Harness`） |
| `TEXT_OUTPUT_SECTION` | 已删除 |
| `computeSimpleEnvInfo()` 的 `LATEST_CLAUDE_MODELS_LINE` | 已删除；内网 fork 不再推荐公网 Claude 模型 |
| `# Environment` 的 cwd/git/platform/shell/OS | 第一阶段保留在动态段；第二阶段迁移暂不做 |
| `SUMMARIZE_TOOL_RESULTS_SECTION` | 保留在动态段（与 compact 行为相关） |
| `TOKEN_BUDGET_SECTION` | 保留在动态段 |

## 5. 实施记录

### 5.1 已完成

1. 重写 `getIntroSection()` 首句为 2.1.288 版本，保留 `OpenClaude` 身份、安全段和 URL 规则。
2. 新增 `HARNESS_SECTION`：5 条 bullet + 代码风格 + 代词 + 高风险动作/如实汇报。
3. `getSystemPrompt()` 静态段改为 `intro + # Harness`，删除 `# System`、`# Doing tasks`、`# Executing actions with care`、`# Using your tools`、`# Tone and style`、`# Text output`。
4. 清理不再使用的 imports（FileWrite/FileRead/FileEdit/TodoWrite/TaskCreate 工具名、`isReplModeEnabled`）。
5. 删除 `LATEST_CLAUDE_MODEL_IDS` / `LATEST_CLAUDE_MODELS_LINE`。
6. `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` 位置未动，动态段顺序未动。
7. 新增 `src/constants/promptAlignment.test.ts`：section 白名单/黑名单、体积上限、模型身份行。

### 5.2 未做（第二阶段）

1. 把 cwd/git/platform/shell/OS 移到 `getUserContext()` 或新 attachment，系统提示词只留模型身份与内网说明。
2. 同步更新 `/context` 的统计口径（`src/utils/analyzeContext.ts`）。
3. 工具描述对齐（`BashTool/prompt.ts`、`AgentTool/prompt.ts` 等）。

### 5.3 验证命令与结果

```bash
bun run typecheck
bun test src/constants/promptIdentity.test.ts src/constants/promptAlignment.test.ts
bun test
bun run build
node dist/cli.mjs --dump-system-prompt --model <internal-model>
```

结果：

- `typecheck` 通过；
- 两个提示词测试 8 pass / 0 fail；
- 全量测试 1079 pass / 2 fail，失败项为 `openclaudePaths.test.ts` 与 `platformStorage.test.ts` 的 `CLAUDE_CONFIG_DIR` 用例，单独运行 22 pass，属于全量运行时的环境变量串扰，与本次改动无关；
- build 通过；
- dump 输出 **7,549 字符**，section 为 `# Harness`、`# Memory`、`# Environment`、`# Context management`。

`--dump-system-prompt` 的输出用于人工对比，不要直接把它作为测试快照（路径、时间、team 状态会导致抖动）。

### 5.4 后续行为评估

用 3–5 个代表性任务抽查：

- 多步 bug 修复（看是否过度设计、是否漏测试）；
- 只读代码解释（看是否啰嗦、是否乱改文件）；
- 高风险操作（git push / 删除文件，看是否先确认）；
- UI 改动（看是否声称“已验证”但没跑起来）；
- 长上下文压缩后续跑（看是否重复推导、是否丢失状态）。

## 6. 风险与取舍

| 风险 | 说明 | 缓解 |
| --- | --- | --- |
| 弱模型行为退化 | 内部模型可能依赖 `# Doing tasks` / `# Text output` 的显式规则 | 已直接切 lean；用 §5.4 的任务抽查观察，必要时把规则下沉到工具描述或项目 `CLAUDE.md` |
| 身份测试失败 | 首句改动会影响 `promptIdentity.test.ts` | 已同步更新测试；保留 `OpenClaude` 和模型身份行 |
| 缓存边界被破坏 | 把动态 env 放进静态段会导致缓存失效 | 保持 `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` 位置；env 放边界之后 |
| Memory 回退 | 误删 team/索引/搜索段会破坏记忆功能 | Memory 不动 |
| 工具行为变化 | 系统提示词删掉“用 Read 不用 cat”等规则后，模型可能改用 Bash | 已保留 `# Harness` 的“prefer dedicated tools”一条；后续在工具描述里重复关键约束 |
| 公网模型推荐 | `LATEST_CLAUDE_MODELS_LINE` 与内网定位冲突 | 已删除 |
| 版权/合规 | 基准文本来自 Anthropic 的 Claude Code | 只提取“结构与短规则”做内部对齐，不把整份原文作为公开仓库文档提交 |

## 7. 已确认决策

1. 不引入 `CLAUDE_CODE_PROMPT_PROFILE`；默认提示词直接切 lean。
2. `# Environment` 第一阶段保留 cwd/git/platform/shell/OS，只删除公网模型推荐；第二阶段迁移暂不做。
3. 不增加独立 `# Working style` / `# Text output` 段；`# Text output` 的整体行为规则由 `# Harness` 的“report faithfully”承接。
4. `# Memory` 的 team 双目录、`## Searching past context`、4 KB 上限保持现状。
5. `# Environment` 暂不增加内网零外发说明（如需，后续单加一行）。
6. `LATEST_CLAUDE_MODELS_LINE` 已删除，不改成中性表述。
7. URL 规则保留在 intro 内。

## 8. 核心工具提示词 / schema 对齐（已落地）

### 8.1 基准来源

主提示词快照（第 19 行）不带工具定义；同一会话第 31 行还有一份完整 `prompt_snapshot`：

| 项 | 值 |
| --- | --- |
| 版本 | `2.1.288` |
| 来源行 | `29f2cf2b-...jsonl` 第 31 行 |
| 工具数 | 34 |
| 提取方式 | `attachment.tools[].schema.input_schema` |

### 8.2 结果

| 工具 | 描述 | input schema |
| --- | --- | --- |
| Bash | 逐字一致（1,431 字符） | 一致；`dangerouslyDisableSandbox` 按安全策略不向模型暴露 |
| Read | 逐字一致（790 字符） | 一致 |
| Write | 逐字一致（240 字符） | 一致 |
| Edit | 逐字一致（360 字符） | 一致 |
| AskUserQuestion | 逐字一致（1,786 字符，含 markdown preview 段） | 一致 |
| Grep | 逐字一致（477 字符） | 一致；补齐 `-o` 参数及 rg 调用 |
| Glob | 逐字一致（140 字符） | 一致 |

### 8.3 保留的合理化差异

- Bash 的平台说明按 `process.platform` 生成：Windows 用 Git Bash/POSIX sh 文案，其他平台用 POSIX shell 文案；超时默认值/上限仍由 `getDefaultBashTimeoutMs()` / `getMaxBashTimeoutMs()` 动态生成。
- Bash 在启用 sandbox 时追加 `## Command sandbox`；`CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` 时省略 `run_in_background` 说明。
- Bash 的 `dangerouslyDisableSandbox` 仍只接受内部可信来源，不进入模型可见 schema（防止模型自行越权逃逸 sandbox）。
- AskUserQuestion 的 preview 段按会话渲染格式拼接；未启用 preview 的 SDK 场景不附加。
- 已删除 Bash 旧版内联的完整 commit/PR 流程，改为 2.1.288 的 4 条 `# Git` 规则。

### 8.4 保护测试

`src/tools/coreToolAlignment.test.ts` 覆盖 7 个核心工具的关键措辞和 schema 行为，防止后续回退。

尚未对齐：`Agent`、`WebFetch`、`WebSearch`、`NotebookEdit`、`Skill` 等工具描述与 schema。

## 附录 A：基准与落地的体积对照

| 维度 | Claude Code 2.1.288 | ClownCode 落地后 | 差异 |
| --- | ---: | ---: | ---: |
| 系统提示词字符数 | 5,901 | 7,549 | +1,648 |
| 系统提示词 section 数 | 6（含 intro） | 5（含 intro） | -1 |
| 静态行为段 | 1 个 `# Harness`（1.6 KB） | 1 个 `# Harness`（1.6 KB） | 持平 |
| Memory | 2.1 KB | 3.6 KB | 已对齐协议，差额来自 team/搜索/上限 |
| Environment | 0.6 KB（无 cwd） | 0.4 KB（含 cwd/git/OS） | 结构不同 |
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
| `src/constants/promptAlignment.test.ts` | lean 骨架、section 黑白名单、体积上限测试 |
| `src/tools/coreToolAlignment.test.ts` | 7 个核心工具提示词与 schema 对齐测试 |
| `src/tools/*/prompt.ts` | 工具描述；已对齐 Bash / Read / Write / Edit / AskUserQuestion / Grep / Glob |
| `.dsh-dump/` | DSH 参考 dump，不是本次对齐目标 |
