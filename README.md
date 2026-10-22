# OpenClaude

OpenClaude is an open-source coding-agent CLI for cloud and local model providers.

Use OpenAI-compatible APIs, Gemini, GitHub Models, Codex OAuth, Codex, Ollama, Atomic Chat, and other supported backends while keeping one terminal-first workflow: prompts, tools, agents, MCP, slash commands, and streaming output.

[![PR Checks](https://github.com/Gitlawb/openclaude/actions/workflows/pr-checks.yml/badge.svg?branch=main)](https://github.com/Gitlawb/openclaude/actions/workflows/pr-checks.yml)
[![Release](https://img.shields.io/github/v/tag/Gitlawb/openclaude?label=release&color=0ea5e9)](https://github.com/Gitlawb/openclaude/tags)
[![Discussions](https://img.shields.io/badge/discussions-open-7c3aed)](https://github.com/Gitlawb/openclaude/discussions)
[![Security Policy](https://img.shields.io/badge/security-policy-0f766e)](SECURITY.md)
[![License](https://img.shields.io/badge/license-MIT-2563eb)](LICENSE)

OpenClaude is also mirrored to GitLawb:
[gitlawb.com/node/repos/z6MkqDnb/openclaude](https://gitlawb.com/node/repos/z6MkqDnb/openclaude)

[Quick Start](#quick-start) | [Setup Guides](#setup-guides) | [Providers](#supported-providers) | [Source Build](#source-build-and-local-development) | [VS Code Extension](#vs-code-extension) | [Sponsors](#sponsors) | [Community](#community)

## Sponsors

<p align="center">
  <a href="https://gitlawb.com">
    <img src="https://gitlawb.com/logo.png" alt="GitLawb logo" width="96">
  </a>
  &nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://bankr.bot">
    <img src="https://bankr.bot/favicon.svg" alt="Bankr.bot logo" width="96">
  </a>
</p>

<p align="center">
  <a href="https://gitlawb.com"><strong>GitLawb</strong></a>
  &nbsp;&nbsp;&nbsp;&nbsp;
  <a href="https://bankr.bot"><strong>Bankr.bot</strong></a>
</p>

## Star History

[![Star History Chart](https://api.star-history.com/chart?repos=gitlawb/openclaude&type=date&legend=top-left)](https://www.star-history.com/?repos=gitlawb%2Fopenclaude&type=date&legend=top-left)

## Why OpenClaude

- Run against a single internal OpenAI-compatible endpoint
- Configure everything from `settings.json`; no login or provider wizard
- Optionally switch to the native Anthropic SDK with `CLAUDE_CODE_USE_OPENAI=0`
- Keep coding-agent workflows in one place: bash, file tools, grep, glob, agents, tasks, MCP, and web tools
- Use the bundled VS Code extension for launch integration and theme support

## Quick Start

### Install

```bash
npm install -g @gitlawb/openclaude
```

If the install later reports `ripgrep not found`, install ripgrep system-wide and confirm `rg --version` works in the same terminal before starting OpenClaude.

### Start

```bash
openclaude
```

OpenClaude is configured through `settings.json` only. There is no `/provider`
wizard, profile file, or login command.

### Minimal setup

Add the endpoint and model to `~/.claude/settings.json` (or
`~/.openclaude/settings.json`):

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "http://gateway.internal/v1",
    "ANTHROPIC_AUTH_TOKEN": "your-token",
    "ANTHROPIC_MODEL": "internal-model"
  }
}
```

The OpenAI-compatible shim is the default. `ANTHROPIC_BASE_URL` is preferred;
`OPENAI_BASE_URL` and `OPENAI_API_BASE` are accepted as fallbacks. Credentials
resolve as `ANTHROPIC_AUTH_TOKEN` → `ANTHROPIC_API_KEY` → `OPENAI_API_KEY`.

Set `CLAUDE_CODE_USE_OPENAI=0` to use the native Anthropic SDK instead. In
that mode `ANTHROPIC_BASE_URL` and a static credential are still required;
there is no OAuth login.

If no base URL is configured, OpenClaude exits with an actionable error rather
than contacting a public default endpoint.

## Setup Guides

Beginner-friendly guides:

- [Non-Technical Setup](docs/non-technical-setup.md)
- [Windows Quick Start](docs/quick-start-windows.md)
- [macOS / Linux Quick Start](docs/quick-start-mac-linux.md)

Advanced and source-build guides:

- [Advanced Setup](docs/advanced-setup.md)
- [Android Install](ANDROID_INSTALL.md)

## Supported Transports

| Transport | Selection | Notes |
| --- | --- | --- |
| OpenAI-compatible shim | default | Uses `ANTHROPIC_BASE_URL` → `OPENAI_BASE_URL` → `OPENAI_API_BASE`; supports `chat_completions` and optional `responses` format |
| Native Anthropic SDK | `CLAUDE_CODE_USE_OPENAI=0` | Static credentials only; no OAuth login |

## What Works

- **Tool-driven coding workflows**: Bash, file read/write/edit, grep, glob, agents, tasks, MCP, and slash commands
- **Streaming responses**: Real-time token output and tool progress
- **Tool calling**: Multi-step tool loops with model calls, tool execution, and follow-up responses
- **Images**: URL and base64 image inputs for models that support vision
- **Single-endpoint configuration**: All settings live in `settings.json` env

## Provider Notes

- Tool quality depends heavily on the selected model
- Smaller local models can struggle with long multi-step tool flows
- Some endpoints impose lower output caps than the CLI defaults, and OpenClaude adapts where possible

For best results, use models with strong tool/function calling support.

## Agent Routing

OpenClaude can route different agents to different models through settings-based routing. This is useful for cost optimization or splitting work by model strength.

Add to `~/.claude/settings.json`:

```json
{
  "agentModels": {
    "fast-internal": {
      "base_url": "http://gateway.internal/v1",
      "api_key": "your-token"
    },
    "strong-internal": {
      "base_url": "http://gateway.internal/v1",
      "api_key": "your-token"
    }
  },
  "agentRouting": {
    "Explore": "fast-internal",
    "Plan": "strong-internal",
    "general-purpose": "strong-internal",
    "frontend-dev": "strong-internal",
    "default": "strong-internal"
  }
}
```

When no routing match is found, the global provider remains the fallback.

> **Note:** `api_key` values in `settings.json` are stored in plaintext. Keep this file private and do not commit it to version control.

## Web Search and Fetch

By default, `WebSearch` works on non-Anthropic models using DuckDuckGo. This gives GPT-4o, DeepSeek, Gemini, Ollama, and other OpenAI-compatible providers a free web search path out of the box.

> **Note:** DuckDuckGo fallback works by scraping search results and may be rate-limited, blocked, or subject to DuckDuckGo's Terms of Service. If you want a more reliable supported option, configure Firecrawl.

For Anthropic-native backends and Codex responses, OpenClaude keeps the native provider web search behavior.

`WebFetch` works, but its basic HTTP plus HTML-to-markdown path can still fail on JavaScript-rendered sites or sites that block plain HTTP requests.

Set a [Firecrawl](https://firecrawl.dev) API key if you want Firecrawl-powered search/fetch behavior:

```bash
export FIRECRAWL_API_KEY=your-key-here
```

With Firecrawl enabled:

- `WebSearch` can use Firecrawl's search API while DuckDuckGo remains the default free path for non-Claude models
- `WebFetch` uses Firecrawl's scrape endpoint instead of raw HTTP, handling JS-rendered pages correctly

Free tier at [firecrawl.dev](https://firecrawl.dev) includes 500 credits. The key is optional.

---

## Headless gRPC Server

OpenClaude can be run as a headless gRPC service, allowing you to integrate its agentic capabilities (tools, bash, file editing) into other applications, CI/CD pipelines, or custom user interfaces. The server uses bidirectional streaming to send real-time text chunks, tool calls, and request permissions for sensitive commands.

### 1. Start the gRPC Server

Start the core engine as a gRPC service on `localhost:50051`:

```bash
npm run dev:grpc
```

#### Configuration

| Variable | Default | Description |
|-----------|-------------|------------------------------------------------|
| `GRPC_PORT` | `50051` | Port the gRPC server listens on |
| `GRPC_HOST` | `localhost` | Bind address. Use `0.0.0.0` to expose on all interfaces (not recommended without authentication) |

### 2. Run the Test CLI Client

We provide a lightweight CLI client that communicates exclusively over gRPC. It acts just like the main interactive CLI, rendering colors, streaming tokens, and prompting you for tool permissions (y/n) via the gRPC `action_required` event.

In a separate terminal, run:

```bash
npm run dev:grpc:cli
```

*Note: The gRPC definitions are located in `src/proto/openclaude.proto`. You can use this file to generate clients in Python, Go, Rust, or any other language.*

---

## Source Build And Local Development

```bash
bun install
bun run build
node dist/cli.mjs
```

Helpful commands:

- `bun run dev`
- `bun test`
- `bun run test:coverage`
- `bun run security:pr-scan -- --base origin/main`
- `bun run smoke`
- `bun run doctor:runtime`
- `bun run verify:privacy`
- focused `bun test ...` runs for the areas you touch

## Testing And Coverage

OpenClaude uses Bun's built-in test runner for unit tests.

Run the full unit suite:

```bash
bun test
```

Generate unit test coverage:

```bash
bun run test:coverage
```

Open the visual coverage report:

```bash
open coverage/index.html
```

If you already have `coverage/lcov.info` and only want to rebuild the UI:

```bash
bun run test:coverage:ui
```

Use focused test runs when you only touch one area:

- `bun run test:provider`
- `bun run test:provider-recommendation`
- `bun test path/to/file.test.ts`

Recommended contributor validation before opening a PR:

- `bun run build`
- `bun run smoke`
- `bun run test:coverage` for broader unit coverage when your change affects shared runtime or provider logic
- focused `bun test ...` runs for the files and flows you changed

Coverage output is written to `coverage/lcov.info`, and OpenClaude also generates a git-activity-style heatmap at `coverage/index.html`.
## Repository Structure

- `src/` - core CLI/runtime
- `scripts/` - build, verification, and maintenance scripts
- `docs/` - setup, contributor, and project documentation
- `python/` - standalone Python helpers and their tests
- `vscode-extension/openclaude-vscode/` - VS Code extension
- `.github/` - repo automation, templates, and CI configuration
- `bin/` - CLI launcher entrypoints

## VS Code Extension

The repo includes a VS Code extension in [`vscode-extension/openclaude-vscode`](vscode-extension/openclaude-vscode) for OpenClaude launch integration, provider-aware control-center UI, and theme support.

## Security

If you believe you found a security issue, see [SECURITY.md](SECURITY.md).

## Community

- Use [GitHub Discussions](https://github.com/Gitlawb/openclaude/discussions) for Q&A, ideas, and community conversation
- Use [GitHub Issues](https://github.com/Gitlawb/openclaude/issues) for confirmed bugs and actionable feature work

## Contributing

Contributions are welcome.

For larger changes, open an issue first so the scope is clear before implementation. Helpful validation commands include:

- `bun run build`
- `bun run test:coverage`
- `bun run smoke`
- focused `bun test ...` runs for files and flows you changed


## Disclaimer

OpenClaude is an independent community project and is not affiliated with, endorsed by, or sponsored by Anthropic.

OpenClaude originated from the Claude Code codebase and has since been substantially modified to support multiple providers and open use. "Claude" and "Claude Code" are trademarks of Anthropic PBC. See [LICENSE](LICENSE) for details.

## License

See [LICENSE](LICENSE).
