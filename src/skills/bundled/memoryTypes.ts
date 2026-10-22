import { MEMORY_TYPES_SKILL_NAME } from '../../memdir/memoryTypes.js'
import { registerBundledSkill } from '../bundledSkills.js'

/**
 * The `memory-types` skill.
 *
 * Upstream kept the full four-type taxonomy (scope, when_to_save, how_to_use,
 * body_structure, examples) out of the always-on system prompt and moved it
 * here: the memory prompt only carries the one-line glosses and points at this
 * skill, which the model reads once it has already decided to save something.
 *
 * `disableModelInvocation: false` on purpose — the memory prompt tells the
 * model to invoke it by name, and it is only useful when the model can reach
 * for it unprompted.
 */
export function registerMemoryTypesSkill(): void {
  registerBundledSkill({
    name: MEMORY_TYPES_SKILL_NAME,
    description:
      'Reference for the memory system: what each memory `type:` means, which scope (private vs team) it belongs in, how to structure the body, and worked examples. Read this after deciding to save a memory and before writing the file.',
    whenToUse:
      'When you have decided to save, update, or reorganize a memory file and need the taxonomy, scope rules, body structure, or examples.',
    userInvocable: true,
    async getPromptForCommand() {
      return [{ type: 'text', text: MEMORY_TYPES_SKILL_BODY }]
    },
  })
}

const MEMORY_TYPES_SKILL_BODY = `# Memory types

Four types, and only four. Pick the one that matches what you learned; the \`type:\` field goes under \`metadata:\` in the file's frontmatter.

A memory is worth saving only when it captures something NOT derivable from the current project state. Code patterns, architecture, file paths, git history, and anything already in CLAUDE.md are all derivable — those are not memories.

## \`user\`

**Scope:** always private.

**What it holds:** the user's role, goals, responsibilities, and knowledge. Great user memories let you tailor your behavior to this person's preferences and perspective. You would collaborate with a senior software engineer differently from someone writing their first line of code.

**When to save:** whenever you learn about their role, preferences, responsibilities, or knowledge.

**How to use it:** when your answer should be shaped by who they are or how much they already know — e.g. explaining a part of the code in terms they already have a mental model for.

Keep it kind: never write a memory about the user that reads as a negative judgement, and skip anything irrelevant to the work you are doing together.

**Examples**

- user: "I'm a data scientist investigating what logging we have in place"
  → *(private user)* data scientist, currently focused on observability/logging
- user: "I've been writing Go for ten years but this is my first time touching the React side of this repo"
  → *(private user)* deep Go expertise, new to React and to this project's frontend — frame frontend explanations in terms of backend analogues

## \`feedback\`

**Scope:** default to private. Save as team only when the guidance is clearly a project-wide convention every contributor should follow (a testing policy, a build invariant) — not a personal style preference.

**What it holds:** guidance about *how to approach work*, both what to avoid and what to keep doing. Record from failure AND success: if you only save corrections you will avoid past mistakes but drift away from approaches the user already validated, and grow overly cautious. Before saving a private feedback memory, check it does not contradict a team feedback memory — if it does, either do not save it or note the override explicitly.

**When to save:** any time the user corrects your approach ("no not that", "don't", "stop doing X") OR confirms a non-obvious approach worked ("yes exactly", "perfect, keep doing that", accepting an unusual choice without pushback). Corrections are easy to notice; confirmations are quieter — watch for them. In both cases save what applies to future conversations, especially when it is surprising or not obvious from the code. Include *why* so you can judge edge cases later.

**Body structure:** lead with the rule itself, then a \`**Why:**\` line (the reason the user gave — often a past incident or a strong preference) and a \`**How to apply:**\` line (when and where this guidance kicks in). Knowing *why* lets you judge edge cases instead of following the rule blindly.

If the correction was about a repeatable step — how you verified, committed, opened a PR, or used a project skill — fold it into the project skill that drives that step too (\`.claude/skills/<name>/SKILL.md\`): a terse, general edit, so the next session gets it right unprompted. Edit existing skill files only; never create one.

**Examples**

- user: "don't mock the database in these tests — we got burned last quarter when mocked tests passed but the prod migration failed"
  → *(team feedback)* integration tests must hit a real database, not mocks. Why: prior incident where mock/prod divergence masked a broken migration.
- user: "stop summarizing what you just did at the end of every response, I can read the diff"
  → *(private feedback)* this user wants terse responses with no trailing summaries. Private because it is a communication preference, not a project convention.
- user: "yeah the single bundled PR was the right call here, splitting this one would've just been churn"
  → *(private feedback)* for refactors in this area, user prefers one bundled PR over many small ones. Confirmed after you chose this approach — a validated judgment call, not a correction.

## \`project\`

**Scope:** private or team, but strongly bias toward team.

**What it holds:** ongoing work, goals, initiatives, bugs, or incidents that are not derivable from the code or git history. These give you the motivation behind the work: who is doing what, why, and by when.

**When to save:** when you learn who is doing what, why, or by when. These change quickly, so keep your understanding current. Always convert relative dates to absolute ones when saving ("Thursday" → "2026-03-05") so the memory stays interpretable later.

**Body structure:** lead with the fact or decision, then a \`**Why:**\` line (the motivation — often a constraint, deadline, or stakeholder ask) and a \`**How to apply:**\` line (how it should shape your suggestions). Project memories decay fast; the why is what lets a future session judge whether it is still load-bearing.

**Examples**

- user: "we're freezing all non-critical merges after Thursday — mobile team is cutting a release branch"
  → *(team project)* merge freeze begins 2026-03-05 for the mobile release cut. Flag non-critical PR work scheduled after that date.
- user: "the reason we're ripping out the old auth middleware is that legal flagged it for storing session tokens in a way that doesn't meet the new compliance requirements"
  → *(team project)* the auth middleware rewrite is driven by legal/compliance requirements around session token storage, not tech-debt cleanup — scope decisions should favor compliance over ergonomics.

## \`reference\`

**Scope:** usually team.

**What it holds:** pointers to where information lives in external systems, so you know where to look for up-to-date answers outside the project directory.

**When to save:** when you learn about an external resource and its purpose — that bugs are tracked in a specific Linear project, or that feedback arrives in a specific Slack channel.

**How to use it:** when the user mentions an external system, or when the answer probably lives in one.

**Examples**

- user: "check the Linear project "INGEST" if you want context on these tickets, that's where we track all pipeline bugs"
  → *(team reference)* pipeline bugs are tracked in Linear project "INGEST".
- user: "the Grafana board at grafana.internal/d/api-latency is what oncall watches — if you're touching request handling, that's the thing that'll page someone"
  → *(team reference)* grafana.internal/d/api-latency is the oncall latency dashboard — check it when editing request-path code.

## Linking memories

Link related memories from the body with \`[[name]]\`, where \`name\` is the other file's \`name:\` slug. Link liberally: a \`[[name]]\` that does not resolve yet is fine — it marks something worth writing later, not an error.

## Not memories

- Code patterns, conventions, architecture, file paths, project structure — read the project instead.
- Git history, recent changes, who-changed-what — \`git log\` / \`git blame\` are authoritative.
- Debugging fixes or recipes — the fix is in the code and the commit message has the context.
- Anything already documented in CLAUDE.md.
- Ephemeral task state — in-progress work, temporary context, this conversation only.
`
