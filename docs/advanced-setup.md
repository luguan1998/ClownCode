# OpenClaude Advanced Setup

This guide is for users who want source builds, Bun workflows, provider profiles, diagnostics, or more control over runtime behavior.

## Install Options

### Option A: npm

```bash
npm install -g @gitlawb/openclaude
```

### Option B: From source with Bun

Use Bun `1.3.11` or newer for source builds on Windows. Older Bun versions can fail during `bun run build`.

```bash
git clone https://node.gitlawb.com/z6MkqDnb7Siv3Cwj7pGJq4T5EsUisECqR8KpnDLwcaZq5TPr/openclaude.git
cd openclaude

bun install
bun run build
npm link
```

### Option C: Run directly with Bun

```bash
git clone https://node.gitlawb.com/z6MkqDnb7Siv3Cwj7pGJq4T5EsUisECqR8KpnDLwcaZq5TPr/openclaude.git
cd openclaude

bun install
bun run dev
```

## Endpoint Configuration

OpenClaude is an intranet build: it talks to one OpenAI-compatible endpoint and
has no provider wizard, profile files, or login commands.

Recommended: put the configuration in `~/.claude/settings.json`:

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "http://gateway.internal/v1",
    "ANTHROPIC_AUTH_TOKEN": "your-token",
    "ANTHROPIC_MODEL": "internal-model"
  }
}
```

Environment variables work too:

```bash
export ANTHROPIC_BASE_URL=http://gateway.internal/v1
export ANTHROPIC_AUTH_TOKEN=your-token
export ANTHROPIC_MODEL=internal-model
openclaude
```

### Resolution order

- Base URL: `ANTHROPIC_BASE_URL` → `OPENAI_BASE_URL` → `OPENAI_API_BASE`
- Credential: `ANTHROPIC_AUTH_TOKEN` → `ANTHROPIC_API_KEY` → `OPENAI_API_KEY`
- Model: `OPENAI_MODEL` → `ANTHROPIC_MODEL`

There is no hardcoded public default endpoint. If no base URL is configured,
OpenClaude exits with an actionable error.

### Native Anthropic transport

Set `CLAUDE_CODE_USE_OPENAI=0` to use the Anthropic SDK instead of the
OpenAI-compatible shim. A static credential and `ANTHROPIC_BASE_URL` are still
required; OAuth login is not available.

### Local servers

Ollama, LM Studio, and other local OpenAI-compatible servers work through the
same variables:

```bash
export OPENAI_BASE_URL=http://localhost:11434/v1
export OPENAI_MODEL=llama3.3:70b
export OPENAI_API_KEY=ollama   # optional for local endpoints
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_BASE_URL` | Yes* | Preferred endpoint (`*` fallbacks: `OPENAI_BASE_URL`, `OPENAI_API_BASE`) |
| `ANTHROPIC_AUTH_TOKEN` | No* | Bearer token; falls back to `ANTHROPIC_API_KEY`, then `OPENAI_API_KEY` (`*` optional for local/intranet endpoints) |
| `ANTHROPIC_MODEL` / `OPENAI_MODEL` | Yes | Model name; `OPENAI_MODEL` takes priority |
| `CLAUDE_CODE_USE_OPENAI` | No | Unset/`1` uses the shim (default); `0` uses the native Anthropic SDK |
| `OPENAI_API_FORMAT` | No | `chat_completions` (default) or `responses` |
| `OPENAI_AUTH_HEADER` / `_VALUE` / `OPENAI_AUTH_SCHEME` | No | Custom auth header instead of Bearer |
| `OPENCLAUDE_DISABLE_CO_AUTHORED_BY` | No | Suppress the default `Co-Authored-By` trailer in generated git commits |
| `OPENCLAUDE_LOG_TOKEN_USAGE` | No | When truthy (e.g. `verbose`), emits one JSON line on stderr per API request with input/output/cache tokens and the resolved provider. **User-facing debug output** — complements the REPL display controlled by `/config showCacheStats`. Distinct from `CLAUDE_CODE_ENABLE_TOKEN_USAGE_ATTACHMENT`, which is **model-facing** (injects context usage info into the prompt itself). Both can run together. |

`ANTHROPIC_MODEL` is accepted as a compatibility fallback. `OPENAI_MODEL` takes priority.

## Runtime Hardening

Use these commands to validate your setup and catch mistakes early:

```bash
# quick startup sanity check
bun run smoke

# validate provider env + reachability
bun run doctor:runtime

# print machine-readable runtime diagnostics
bun run doctor:runtime:json

# persist a diagnostics report to reports/doctor-runtime.json
bun run doctor:report

# full local hardening check (smoke + runtime doctor)
bun run hardening:check

# strict hardening (includes project-wide typecheck)
bun run hardening:strict
```

Notes:

- `doctor:runtime` fails fast when no endpoint is configured, or when a remote endpoint has no credential.
- Local/intranet endpoints (private IPs, `.internal`, `.lan`, single-label hosts) can run without an API key.
- `OPENAI_API_FORMAT=responses` probes `POST /responses` instead of `POST /chat/completions`.
