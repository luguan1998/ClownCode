/**
 * Prompt templates for the background memory extraction agent.
 *
 * The extraction agent runs as a perfect fork of the main conversation — same
 * system prompt, same message prefix. The main agent's system prompt always
 * has full save instructions; when the main agent writes memories itself,
 * extractMemories.ts skips that turn (hasMemoryWritesSince). This prompt
 * fires only when the main agent didn't write, so the save-criteria here
 * overlap the system prompt's harmlessly.
 *
 * OpenClaude: rewritten onto the compact taxonomy fragment set, so this prompt
 * and the main system prompt state the same rules (one-line type glosses +
 * `memory-types` skill pointer, nested `metadata.type` frontmatter, `[[name]]`
 * wikilinks, the save guard). `skipIndex` picks the index-pointer vs per-file
 * cap variant, and the combined variant adds the private/team scope split.
 */

import { feature } from 'bun:bundle'
import {
  MEMORY_FRONTMATTER_EXAMPLE,
  MEMORY_LINK_CONVENTION,
  MEMORY_SAVE_GUARD,
  memoryFileCapLine,
  memoryIndexPointerLine,
  typesSection,
} from '../../memdir/memoryTypes.js'
import { BASH_TOOL_NAME } from '../../tools/BashTool/toolName.js'
import { FILE_EDIT_TOOL_NAME } from '../../tools/FileEditTool/constants.js'
import { FILE_READ_TOOL_NAME } from '../../tools/FileReadTool/prompt.js'
import { FILE_WRITE_TOOL_NAME } from '../../tools/FileWriteTool/prompt.js'
import { GLOB_TOOL_NAME } from '../../tools/GlobTool/prompt.js'
import { GREP_TOOL_NAME } from '../../tools/GrepTool/prompt.js'

/**
 * Shared opener for both extract-prompt variants.
 */
function opener(newMessageCount: number, existingMemories: string): string {
  const manifest =
    existingMemories.length > 0
      ? `\n\n## Existing memory files\n\n${existingMemories}\n\nCheck this list before writing — update an existing file rather than creating a duplicate.`
      : ''
  return [
    `You are now acting as the memory extraction subagent. Analyze the most recent ~${newMessageCount} messages above and use them to update your persistent memory systems.`,
    '',
    `Available tools: ${FILE_READ_TOOL_NAME}, ${GREP_TOOL_NAME}, ${GLOB_TOOL_NAME}, read-only ${BASH_TOOL_NAME} (ls/find/cat/stat/wc/head/tail and similar), and ${FILE_EDIT_TOOL_NAME}/${FILE_WRITE_TOOL_NAME} for paths inside the memory directory only. ${BASH_TOOL_NAME} rm is not permitted. All other tools — MCP, Agent, write-capable ${BASH_TOOL_NAME}, etc — will be denied.`,
    '',
    `You have a limited turn budget. ${FILE_EDIT_TOOL_NAME} requires a prior ${FILE_READ_TOOL_NAME} of the same file, so the efficient strategy is: turn 1 — issue all ${FILE_READ_TOOL_NAME} calls in parallel for every file you might update; turn 2 — issue all ${FILE_WRITE_TOOL_NAME}/${FILE_EDIT_TOOL_NAME} calls in parallel. Do not interleave reads and writes across multiple turns.`,
    '',
    `You MUST only use content from the last ~${newMessageCount} messages to update your persistent memories. Do not waste any turns attempting to investigate or verify that content further — no grepping source files, no reading code to confirm a pattern exists, no git commands.` +
      manifest,
  ].join('\n')
}

/**
 * Shared "how to save" block. The index variant names the entrypoint the
 * pointer line should go into; the read-only variant states the per-file cap
 * instead, since nothing is being indexed.
 */
function howToSave(options: {
  skipIndex: boolean
  indexPointer?: string
}): string[] {
  const writeLine = options.skipIndex
    ? 'Write each memory to its own file (e.g., `user_role.md`, `feedback_testing.md`) using this frontmatter format:'
    : 'Saving a memory is a two-step process:\n\n**Step 1** — write the memory to its own file (e.g., `user_role.md`, `feedback_testing.md`) using this frontmatter format:'

  return [
    '## How to save memories',
    '',
    writeLine,
    '',
    ...MEMORY_FRONTMATTER_EXAMPLE,
    '',
    MEMORY_LINK_CONVENTION,
    '',
    ...(options.skipIndex
      ? [memoryFileCapLine()]
      : [
          `**Step 2** — ${options.indexPointer}`,
          '',
          '- Keep the name, description, and type fields in memory files up-to-date with the content',
          '- Organize memory semantically by topic, not chronologically',
          '- Update or remove memories that turn out to be wrong or outdated',
          '- Do not write duplicate memories. First check if there is an existing memory you can update before writing a new one.',
        ]),
  ]
}

/**
 * Build the extraction prompt for auto-only memory (no team memory).
 * Four-type taxonomy, no scope guidance (single directory).
 */
export function buildExtractAutoOnlyPrompt(
  newMessageCount: number,
  existingMemories: string,
  skipIndex = false,
): string {
  return [
    opener(newMessageCount, existingMemories),
    '',
    'If the user explicitly asks you to remember something, save it immediately as whichever type fits best. If they ask you to forget something, find and remove the relevant entry.',
    '',
    ...typesSection(false),
    MEMORY_SAVE_GUARD,
    '',
    ...howToSave({
      skipIndex,
      indexPointer: `add a pointer to that file in \`MEMORY.md\` (\`- [Title](file.md) — hook\`). \`MEMORY.md\` is the index loaded into context each session — one line per memory, no frontmatter, never put memory content there.`,
    }),
  ].join('\n')
}

/**
 * Build the extraction prompt for combined auto + team memory.
 * Same fragments as the main prompt's combined variant.
 */
export function buildExtractCombinedPrompt(
  newMessageCount: number,
  existingMemories: string,
  skipIndex = false,
): string {
  if (!feature('TEAMMEM')) {
    return buildExtractAutoOnlyPrompt(
      newMessageCount,
      existingMemories,
      skipIndex,
    )
  }

  return [
    opener(newMessageCount, existingMemories),
    '',
    'If the user explicitly asks you to remember something, save it immediately as whichever type fits best. If they ask you to forget something, find and remove the relevant entry.',
    '',
    ...typesSection(true),
    MEMORY_SAVE_GUARD,
    '',
    ...howToSave({
      skipIndex,
      indexPointer: memoryIndexPointerLine({
        entrypointName: 'MEMORY.md',
        teamPrefixes: ['team/'],
      }),
    }),
  ].join('\n')
}
