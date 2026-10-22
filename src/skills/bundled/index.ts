import { isAutoMemoryEnabled } from '../../memdir/paths.js'
import { registerBatchSkill } from './batch.js'
import { registerDebugSkill } from './debug.js'
import { registerKeybindingsSkill } from './keybindings.js'
import { registerLoopSkill } from './loop.js'
import { registerMemoryTypesSkill } from './memoryTypes.js'
import { registerSimplifySkill } from './simplify.js'
import { registerUpdateConfigSkill } from './updateConfig.js'

/**
 * Initialize all bundled skills.
 * Called at startup to register skills that ship with the CLI.
 *
 * To add a new bundled skill:
 * 1. Create a new file in src/skills/bundled/ (e.g., myskill.ts)
 * 2. Export a register function that calls registerBundledSkill()
 * 3. Import and call that function here
 */
export function initBundledSkills(): void {
  registerUpdateConfigSkill()
  registerKeybindingsSkill()
  registerDebugSkill()
  registerSimplifySkill()
  registerBatchSkill()
  // OpenClaude: the memory prompt points at this skill instead of carrying the
  // full four-type taxonomy inline, so it must be registered whenever memory is
  // on.
  if (isAutoMemoryEnabled()) {
    registerMemoryTypesSkill()
  }
  // /loop's isEnabled delegates to isKairosCronEnabled() — registered
  // unconditionally so the static import is bundled; visibility is gated
  // at runtime by the isEnabled callback.
  registerLoopSkill()
}
