/**
 * OpenClaude: `[[name]]` memory links.
 *
 * Memory files reference each other by slug in the body:
 *
 *     ... 相关背景见 [[openclaude-intranet-agent-base-goal]]。
 *
 * The write-side convention lives in the memory prompt (memoryTypes.ts
 * MEMORY_LINK_CONVENTION). This module is the read side: it pulls the links
 * out of an already-read memory body and resolves them to sibling files, so
 * the recall path can bring one hop of linked memories along with a file the
 * selector picked directly. A memory that points at its own background then
 * arrives with that background instead of leaving the model to guess at a
 * filename from a slug.
 *
 * Resolution is by slug only — the file's `name:` field, which the convention
 * ties to the filename stem. A link that resolves to nothing is not an error:
 * the prompt explicitly allows forward references to memories worth writing
 * later.
 *
 * Resolution probes the filesystem per slug rather than indexing the whole
 * directory: recall runs every turn, memory directories reach 200 files, and
 * the links in a handful of surfaced memories are at most a few dozen names.
 */

import { existsSync } from 'fs'
import { readdir } from 'fs/promises'
import { basename, join } from 'path'
import { parseFrontmatter } from '../utils/frontmatterParser.js'
import { readFileInRange } from '../utils/readFileInRange.js'

/**
 * Matches `[[slug]]` and `[[slug|alias]]`, capturing the slug. The slug
 * character set is what the frontmatter `name:` field allows
 * (`short-kebab-case-slug`), so a link can never name a path.
 */
const WIKILINK_RE = /\[\[([a-z0-9][a-z0-9._-]*)(?:\|[^[\]]*)?\]\]/gi

/** Lines read from a candidate file when its stem does not match the slug. */
const NAME_LOOKUP_LINES = 30

/**
 * Slugs referenced from a memory body, in first-seen order, de-duplicated.
 * Frontmatter is skipped — a `[[...]]` inside a description is prose, not a
 * link edge.
 */
export function extractMemoryLinks(content: string): string[] {
  const { content: body } = parseFrontmatter(content)
  const seen = new Set<string>()
  const out: string[] = []
  for (const match of body.matchAll(WIKILINK_RE)) {
    const slug = match[1] ?? ''
    if (slug === '' || slug.includes('..') || seen.has(slug)) continue
    seen.add(slug)
    out.push(slug)
  }
  return out
}

/**
 * Map a slug to a file in `memoryDir`, or undefined when nothing matches.
 *
 * The conventional case — `name:` equal to the filename stem — is a single
 * existsSync. Only when that misses do we look through the directory for a
 * file whose frontmatter `name:` is the slug, which is the hand-written case
 * where the two diverge.
 */
async function resolveSlug(
  memoryDir: string,
  slug: string,
): Promise<string | undefined> {
  const direct = join(memoryDir, `${slug}.md`)
  if (existsSync(direct)) {
    return direct
  }

  let entries: string[]
  try {
    entries = await readdir(memoryDir)
  } catch {
    return undefined
  }
  for (const entry of entries) {
    if (!entry.endsWith('.md') || entry === 'MEMORY.md') continue
    if (basename(entry, '.md') === slug) return join(memoryDir, entry)
  }
  for (const entry of entries) {
    if (!entry.endsWith('.md') || entry === 'MEMORY.md') continue
    const filePath = join(memoryDir, entry)
    try {
      const { content } = await readFileInRange(filePath, 0, NAME_LOOKUP_LINES)
      const { frontmatter } = parseFrontmatter(content, filePath)
      if (typeof frontmatter.name === 'string' && frontmatter.name === slug) {
        return filePath
      }
    } catch {
      // Unreadable candidate: skip it, the stem pass already had its chance.
    }
  }
  return undefined
}

/**
 * Resolve one hop of `[[name]]` links out of memories that were just read.
 *
 * Returns absolute paths for linked files inside `memoryDir` that are not
 * already in `skip`, in first-seen order. Depth is deliberately one hop:
 * following transitively would let a densely cross-linked memory directory
 * pull its whole contents into a single turn's budget.
 */
export async function resolveLinkedMemoryPaths(params: {
  memoryDir: string
  sources: ReadonlyArray<{ path: string; content: string }>
  skip: ReadonlySet<string>
  limit: number
  signal?: AbortSignal
}): Promise<string[]> {
  const { memoryDir, sources, skip, limit, signal } = params
  const taken = new Set(skip)
  // Slugs repeat across sources (a shared background is linked from many
  // memories), and several slugs can miss entirely. Cache both outcomes so a
  // directory of N linked files costs N resolutions, not one per link.
  const resolved = new Map<string, string | undefined>()
  const out: string[] = []

  for (const source of sources) {
    if (out.length >= limit) break
    for (const slug of extractMemoryLinks(source.content)) {
      if (out.length >= limit) break
      if (signal?.aborted) return out

      let target: string | undefined
      if (resolved.has(slug)) {
        target = resolved.get(slug)
      } else {
        target = await resolveSlug(memoryDir, slug)
        resolved.set(slug, target)
      }
      if (target === undefined || taken.has(target)) continue
      taken.add(target)
      out.push(target)
    }
  }

  return out
}
