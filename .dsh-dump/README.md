# DSH 提示词 / 工具上下文 dump

这个目录里是**本次会话（`session-043b1571-8bce-4faf-b008-4dce54cde648`）模型实际拿到的输入**的可复现 dump：
系统提示词、39 个工具的 JSON Schema、以及随请求注入的上下文（工作区 CLAUDE.md、runtime context、skills 目录、时间上下文）。

dump 由 `dump-dsh-session.mjs` 从 DSH 自己落盘的会话日志解出来，不是凭记忆复写。

## 原理

DSH 把每个会话的完整事件流持久化到：

```
C:\Users\luguan\.dsh\sessions\<项目路径编码>\session-<id>\
    session.v4.jsonl.zstd
```

- 它**不是**一个普通 `zstd` 流，而是**多帧拼接容器**：每个帧（frame）独立压缩一段 JSONL 文本（header 一帧、之后每批 durable 事件一帧），最后可能还有一帧正在写的 torn frame。
- 所以不能直接 `zstd -d` / 一次性 `zstdDecompressSync`（只会解出第一帧 = 196 字节的 session header）。脚本按 zstd frame 结构逐帧扫描边界，再逐帧 `zstdDecompressSync`，对残帧用 `ZSTD_e_flush` 尽量恢复。
- 解出来的事件里，模型输入的关键来源：
  - `system/message`（本次 seq 7）——组装好的系统提示词原文；
  - `request/header`（seq 13）——模型配置 + 完整 `tools` 数组（39 个工具的 name/description/parameters）；
  - `request/context`——provider / model / contextWindow；
  - `user/message`——真实用户消息，以及注入的上下文：
    `source.kind = agent-instructions`（工作区 CLAUDE.md）、`runtime-context`（工作目录/文件策略/审批策略/Team 身份/checkout/Web GUI URL）、`skill-catalog`、`time-context`、`user-approval`。

## 产物

| 文件 | 内容 |
| --- | --- |
| `system-prompt.txt` | **组装后的系统提示词原文**（7,832 字节 / 45 行） |
| `model-input-turn-1.md` | 把第 1 轮模型输入拼起来的可读版：系统提示词 + 全部注入上下文 + 用户消息 |
| `tools.json` | 请求 header 里的 39 个工具定义（完整 JSON Schema，45 KB） |
| `tools-summary.md` | 工具名 + 描述首行的表格 |
| `request-header.json` | `request/header` 原始事件（config + adapterDefaults + tools） |
| `context/agent-instructions-1.txt` | 注入的 `<system-reminder>` 工作区指令（CLAUDE.md 全文，15 KB） |
| `context/runtime-context-1.txt` | 第 1 轮 runtime context 快照（当时 policy = workspace-write） |
| `context/runtime-context-2.txt` | 最新一份 runtime context 快照（切到 danger-full-access 后） |
| `context/skill-catalog-1.txt` | 本次会话的 available skills 目录 |
| `context/time-context-1.txt` | 时间上下文 |
| `context/user-approval-1.txt` | 审批策略变更通知（ask → never ask） |
| `session.v4.jsonl` | 解压后的完整事件流（截至 dump 时刻，约 38 万事件字节） |
| `manifest.json` | 会话元信息、模型配置、事件统计、每个文件的 sha256 |
| `dump-dsh-session.mjs` | 可复用脚本（下面有用法） |

## 本次会话的模型配置

- agentPreset: `standard`
- provider: `deepseek-official`
- model: `deepseek-v4-flash`
- reasoningEffort: `high`
- maxTokens: `256000`
- contextWindow: `1,000,000`
- tools: 39 个

## 复现 / 刷新

用 DSH 自带的 Node（v24，支持 `node:zlib` 的 zstd）：

```powershell
$node = 'E:\ai\dsharness\resources\runtime\primary-runtime\dependencies\node\bin\node.exe'
& $node 'E:\ai\claudeui\.dsh-dump\dump-dsh-session.mjs' `
    'C:\Users\luguan\.dsh\sessions\--E-ai-claudeui--\session-043b1571-8bce-4faf-b008-4dce54cde648' `
    'E:\ai\claudeui\.dsh-dump'
```

- 第 1 个参数也可只传 session id（脚本在 `$env:DSH_HOME\sessions\*` 下搜），省略则用当前 `$env:DSH_SESSION_ID`。
- 第 2 个参数省略时输出到 `./.dsh-dump`。
- 会话日志在持续追加，重跑即可拿到更新后的快照（事件数会变，system prompt / tools 除非配置变了否则不变）。

## 注意

- 磁盘上只持久化了系统提示词、注入上下文和**第一次请求的 header**；每步请求的完整 body（messages 数组）不整体落盘。所以此处 dump 的"工具上下文"是 request header 里实际下发的 tools 数组，系统提示词是 `system/message` 事件原文。
- `runtime-context` 有 2 份：turn 1 时是 `workspace-write`，之后用户切到 `danger-full-access`，第二份覆盖第一份。
- 本会话第一次 `pwsh` 全部失败（`SetNamedSecurityInfoW failed (Win32 5): grantWrite(E:\ai\claudeui)`），是 DSH 沙箱给工作区做 ACL 授权失败，不是命令本身的问题；切到完全权限后可正常执行。若切回 `workspace-write` 仍失败，需用 `diagnose-windows-sandbox-acl` skill 修复 `E:\ai\claudeui` 的 Windows 文件权限。
