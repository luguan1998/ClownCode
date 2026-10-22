#!/bin/bash

set -euo pipefail

DIST="dist/cli.mjs"

if [ ! -f "$DIST" ]; then
  echo "ERROR: $DIST not found. Run 'bun run build' first."
  exit 1
fi

EXIT=0

BANNED=(
  "datadoghq.com"
  "api/event_logging/batch"
  "api/claude_code/metrics"
  "getKubernetesNamespace"
  "/var/run/secrets/kubernetes"
  "/proc/self/mountinfo"
  "tengu_internal_record_permission_context"
  "anthropic-serve"
  "infra.ant.dev"
  "claude-code-feedback"
  "C07VBSHV7EV"
  "api.openai.com"
  "chatgpt.com"
  "auth.openai.com"
  "api.deepseek.com"
  "generativelanguage.googleapis.com"
  "api.mistral.ai"
  "models.github.ai"
  "api.githubcopilot.com"
  "api.x.ai"
  "api.minimax.io"
  "integrate.api.nvidia.com"
  "llm.bankr.bot"
  "api.z.ai"
  "api.moonshot.ai"
  "api.moonshot.cn"
  "api.kimi.com"
  "downloads.claude.ai"
  "raw.githubusercontent.com/anthropics/claude-plugins-official"
)

echo "Checking $DIST for banned patterns..."
echo ""

for pattern in "${BANNED[@]}"; do
  COUNT=$(grep -F -c "$pattern" "$DIST" 2>/dev/null || true)
  COUNT=${COUNT:-0}
  if [ "$COUNT" -gt 0 ]; then
    echo "  FAIL: '$pattern' found ($COUNT occurrences)"
    EXIT=1
  else
    echo "  PASS: '$pattern' not found"
  fi
done

echo ""

if [ "$EXIT" -eq 0 ]; then
  echo "✓ All checks passed — no banned patterns in build output"
else
  echo "✗ FAILED — banned patterns found in build output"
fi

exit $EXIT
