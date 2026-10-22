import {
  buildSearchingPastContextSection,
  DIRS_EXIST_GUIDANCE,
  ENTRYPOINT_NAME,
} from './memdir.js'
import {
  MEMORY_FRONTMATTER_EXAMPLE,
  MEMORY_LINK_CONVENTION,
  MEMORY_RECALL_CONTEXT_NOTE,
  MEMORY_SAVE_GUARD,
  MEMORY_SCOPE_LINE_COMBINED,
  MEMORY_TYPE_GLOSSES,
  memoryFileCapLine,
  memoryIndexPointerLine,
} from './memoryTypes.js'
import { getAutoMemPath } from './paths.js'
import { getTeamMemPath } from './teamMemPaths.js'

/**
 * OpenClaude: build the combined prompt when both auto memory and team memory
 * are enabled.
 *
 * Same shape as the single-directory prompt (see memdir.ts buildMemoryLines):
 * compact taxonomy, one-line glosses, and the index pointer naming the private
 * index that covers both directories. Scope routing is a single line rather
 * than per-type <scope> blocks — the detail lives in the `memory-types` skill.
 */
export function buildCombinedMemoryPrompt(
  extraGuidelines?: string[],
  skipIndex = false,
): string {
  const autoDir = getAutoMemPath()
  const teamDir = getTeamMemPath()

  // The private index indexes both directories, so a team memory is
  // referenced there under a `team/` prefix.
  const indexPointer = skipIndex
    ? undefined
    : memoryIndexPointerLine({
        entrypointName: ENTRYPOINT_NAME,
        teamPrefixes: ['team/'],
      })

  const lines = [
    '# Memory',
    '',
    `You have a persistent file-based memory with two directories: a private directory at \`${autoDir}\` and a shared team directory at \`${teamDir}\`. ${DIRS_EXIST_GUIDANCE} Each memory is one file holding one fact, with frontmatter:`,
    '',
    ...MEMORY_FRONTMATTER_EXAMPLE,
    '',
    MEMORY_LINK_CONVENTION,
    '',
    MEMORY_TYPE_GLOSSES,
    '',
    '## Memory scope',
    '',
    `- private: memories that are private between you and the current user, stored at the root \`${autoDir}\`. They persist across conversations with only this specific user.`,
    `- team: memories shared with and contributed by everyone who works in this project directory, stored at \`${teamDir}\`. Team memories are synced at the beginning of every session.`,
    '',
    MEMORY_SCOPE_LINE_COMBINED,
    '',
    ...(indexPointer ? [indexPointer, ''] : []),
    `${MEMORY_SAVE_GUARD} ${MEMORY_RECALL_CONTEXT_NOTE}`,
    '',
    ...(skipIndex ? [memoryFileCapLine(), ''] : []),
    ...(extraGuidelines ?? []),
    '',
    ...buildSearchingPastContextSection(autoDir),
  ]

  return lines.join('\n')
}
