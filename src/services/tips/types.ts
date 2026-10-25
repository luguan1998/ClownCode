/** Spinner tip types. */

import type { FileStateCache } from '../../utils/fileStateCache.js'
import type { ThemeName } from '../../utils/theme.js'

export interface Tip {
  id: string
  content: (ctx: { theme: ThemeName }) => string | Promise<string>
  /** Minimum number of sessions between showings of this tip. */
  cooldownSessions: number
  isRelevant: (context?: TipContext) => boolean | Promise<boolean>
}

export interface TipContext {
  readFileState?: FileStateCache
  bashTools?: Set<unknown>
  theme?: ThemeName
}
