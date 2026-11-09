import { expect, test } from 'bun:test'

// MACRO is replaced at build time by Bun.define but not in test mode.
;(globalThis as Record<string, unknown>).MACRO = {
  VERSION: '99.0.0',
  DISPLAY_VERSION: '0.0.0-test',
  BUILD_TIME: new Date().toISOString(),
  ISSUES_EXPLAINER: 'report the issue at https://github.com/anthropics/claude-code/issues',
  PACKAGE_URL: '@gitlawb/openclaude',
  NATIVE_PACKAGE_URL: undefined,
}

import { getSimplePrompt } from './BashTool/prompt.js'
import { getReadToolPrompt } from './FileReadTool/prompt.js'
import { getWriteToolDescription } from './FileWriteTool/prompt.js'
import { getEditToolDescription } from './FileEditTool/prompt.js'
import {
  ASK_USER_QUESTION_TOOL_PROMPT,
  PREVIEW_FEATURE_PROMPT,
} from './AskUserQuestionTool/prompt.js'
import { getDescription as getGrepDescription } from './GrepTool/prompt.js'
import { DESCRIPTION as GLOB_DESCRIPTION } from './GlobTool/prompt.js'

test('Bash prompt matches the 2.1.288 wording', () => {
  const prompt = getSimplePrompt()

  expect(prompt).toStartWith('Executes a bash command and returns its output.')
  expect(prompt).toContain('This tool runs Git Bash (POSIX sh)')
  expect(prompt).toContain(
    '- IMPORTANT: Avoid using this tool to run `find`, `grep`, `cat`, `head`, `tail`, `sed`, `awk`, or `echo` commands',
  )
  expect(prompt).toContain(
    '- `run_in_background` runs the command detached: it keeps running across turns and re-invokes you when it exits. No `&` needed.',
  )
  expect(prompt).toContain('# Git')
  expect(prompt).toContain(
    "- End git commit messages and PR bodies with the attribution lines given in the conversation's system-reminder, when one is present.",
  )
})

test('Read prompt matches the 2.1.288 wording', () => {
  const prompt = getReadToolPrompt()

  expect(prompt).toStartWith('Reads a file from the local filesystem.')
  expect(prompt).toContain('- `file_path` must be an absolute path.')
  expect(prompt).toContain('Reads up to 2000 lines by default.')
  expect(prompt).toContain(
    '- Do NOT re-read a file you just edited to verify',
  )
})

test('Write and Edit prompts match the 2.1.288 wording', () => {
  expect(getWriteToolDescription()).toStartWith(
    'Writes a file to the local filesystem, overwriting if one exists.',
  )
  expect(getWriteToolDescription()).toContain(
    "For partial changes, use Edit instead.",
  )

  expect(getEditToolDescription()).toStartWith(
    'Performs exact string replacement in a file.',
  )
  expect(getEditToolDescription()).toContain(
    '- `old_string` must match the file exactly, including indentation, and be unique',
  )
})

test('AskUserQuestion prompt matches the 2.1.288 wording', () => {
  expect(ASK_USER_QUESTION_TOOL_PROMPT).toStartWith(
    "Use this tool only when you are blocked on a decision that is genuinely the user's to make",
  )
  expect(ASK_USER_QUESTION_TOOL_PROMPT).toContain(
    'Reserve this for decisions where the user\'s answer changes what you do next',
  )
  expect(PREVIEW_FEATURE_PROMPT.markdown).toContain(
    'Preview content is rendered as markdown in a monospace box.',
  )
})

test('Grep and Glob prompts match the 2.1.288 wording', () => {
  expect(getGrepDescription()).toStartWith(
    'Content search built on ripgrep. Prefer this over `grep`/`rg` via Bash',
  )
  expect(getGrepDescription()).toContain(
    '- `multiline: true` for patterns that span lines.',
  )
  expect(GLOB_DESCRIPTION).toBe(
    'Fast file pattern matching. Supports glob patterns like "**/*.js" or "src/**/*.ts". Returns matching file paths sorted by modification time.',
  )
})
